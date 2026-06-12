import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!, 
  process.env.NEXT_SECRET_SUPABASE_KEY!
)

export async function GET(req: NextRequest) {
  // Proteção da Rota via Header
  const secretHeader = req.headers.get('x-admin-secret')
  if (secretHeader !== process.env.ADMIN_SECRET) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
  }

  try {
    const agora = new Date()
    const dezMinutosDepois = new Date(agora.getTime() + 10 * 60 * 1000)

    // 1. Procura no banco se há jogos rolando ('LIVE') ou prestes a começar (NS)
    const { data: partidasCriticas, error: erroPartidas } = await supabaseAdmin
      .from('partidas')
      .select('id, status, data_hora')
      .or(`status.eq.LIVE,and(status.eq.NS,data_hora.lte.${dezMinutosDepois.toISOString()})`)

    if (erroPartidas) throw erroPartidas

    // Se não tem jogo rolando, encerra e poupa a API
    if (!partidasCriticas || partidasCriticas.length === 0) {
      return NextResponse.json({ 
        success: true, 
        message: 'Nenhum jogo em andamento ou próximo. API poupada.' 
      })
    }

    // 2. Consulta a API externa
    const resFootball = await fetch('https://api.football-data.org/v4/matches', {
      headers: { 'X-Auth-Token': process.env.FOOTBALL_DATA_API_KEY! },
      next: { revalidate: 0 } 
    })

    if (!resFootball.ok) throw new Error('Falha ao consultar football-data')
    const dadosFutebol = await resFootball.json()
    const jogosDaApi = dadosFutebol.matches || []

    // 3. Puxa do banco os jogos internos
    const { data: partidasBanco } = await supabaseAdmin.from('partidas').select('*')

    let houveJogoFinalizado = false

    // 4. Atualiza os placares no Supabase
    for (const jogoBanco of partidasBanco || []) {
      const jogoApi = jogosDaApi.find((m: any) => m.id === jogoBanco.fixture_id)
      if (!jogoApi) continue

      let novoStatus = jogoBanco.status
      if (jogoApi.status === 'FINISHED') novoStatus = 'FT'
      else if (jogoApi.status === 'IN_PLAY' || jogoApi.status === 'PAUSED') novoStatus = 'LIVE'
      else if (jogoApi.status === 'TIMED' || jogoApi.status === 'SCHEDULED') novoStatus = 'NS'

      // Leitura robusta dos gols da API (garantindo que se vier vazio, preserva o banco)
      const novosGolsCasa = jogoApi.score?.fullTime?.home ?? jogoBanco.gols_casa
      const novosGolsFora = jogoApi.score?.fullTime?.away ?? jogoBanco.gols_fora

      if (jogoBanco.status === 'LIVE' && novoStatus === 'FT') {
        houveJogoFinalizado = true
      }

      // Se algo mudou, envia para o banco
      if (
        jogoBanco.status !== novoStatus || 
        jogoBanco.gols_casa !== novosGolsCasa || 
        jogoBanco.gols_fora !== novosGolsFora
      ) {
        const { error: updateError } = await supabaseAdmin
          .from('partidas')
          .update({
            status: novoStatus,
            gols_casa: novosGolsCasa,
            gols_fora: novosGolsFora
          })
          .eq('id', jogoBanco.id)

        // Se falhar de salvar a linha específica, avisa no log mas não derruba a aplicação
        if (updateError) {
          console.error(`Erro ao atualizar partida ${jogoBanco.id}:`, updateError)
        }
      }
    }

    // 5. SE ALGUM JOGO ACABOU DE TERMINAR: Dispara o cálculo de ranking
    if (houveJogoFinalizado) {
      try {
        const protocol = req.headers.get('x-forwarded-proto') || 'https'
        const host = req.headers.get('host')
        const baseUrl = `${protocol}://${host}`

        console.log(`[Cron] Jogo finalizado detectado! Chamando: ${baseUrl}/api/admin/processar-pontos`)

        const resProcessar = await fetch(`${baseUrl}/api/admin/processar-pontos`, {
          method: 'POST',
          headers: {
            'x-admin-secret': process.env.ADMIN_SECRET!,
          },
        })
        
        if (!resProcessar.ok) {
          const erroTexto = await resProcessar.text()
          console.error('[Cron] Ocorreu um erro na rota processar-pontos:', erroTexto)
        }
      } catch (internalErr) {
        // Se a chamada de pontos falhar por timeout de rede ou URL maluca, 
        // ele cai AQUI, e NÃO derruba o fato de que a partida já foi gravada como 'FT'.
        console.error('[Cron] Falha de conexão ao acionar processar-pontos:', internalErr)
      }

      return NextResponse.json({ 
        success: true, 
        message: 'Placares sincronizados e ranking disparado com sucesso!' 
      })
    }

    return NextResponse.json({ 
      success: true, 
      message: 'Placares sincronizados. Jogo continua LIVE.' 
    })

  } catch (err: any) {
    console.error('Erro Fatal no Cron de Sincronização:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
