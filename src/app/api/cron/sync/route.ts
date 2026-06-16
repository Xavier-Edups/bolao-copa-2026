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

    // 1. Procura no banco estritamente as partidas que precisamos ficar vigiando
    const { data: partidasCriticas, error: erroPartidas } = await supabaseAdmin
      .from('partidas')
      .select('*') // Puxa todos os campos para usarmos no loop
      .or(`status.eq.LIVE,and(status.eq.NS,data_hora.lte.${dezMinutosDepois.toISOString()})`)

    if (erroPartidas) throw erroPartidas

    // Se não tem jogo rolando, encerra e poupa a API (Isso previne sobrescrever status antigos!)
    if (!partidasCriticas || partidasCriticas.length === 0) {
      return NextResponse.json({ 
        success: true, 
        message: 'Nenhum jogo em andamento ou próximo. API poupada.' 
      })
    }

    // 2. Consulta a API externa limitando a Copa do Mundo (2000) e janela segura de datas
    const dataOntem = new Date(agora)
    dataOntem.setDate(dataOntem.getDate() - 1)
    const strOntem = dataOntem.toISOString().split('T')[0]

    const dataAmanha = new Date(agora)
    dataAmanha.setDate(dataAmanha.getDate() + 1)
    const strAmanha = dataAmanha.toISOString().split('T')[0]

    const apiUrl = `https://api.football-data.org/v4/matches?competitions=2000&dateFrom=${strOntem}&dateTo=${strAmanha}`

    const resFootball = await fetch(apiUrl, {
      headers: { 'X-Auth-Token': process.env.API_FOOTBALL_KEY! },
      cache: 'no-store'
    })

    if (!resFootball.ok) {
      const erroTexto = await resFootball.text()
      console.error(`[Cron] Erro API Football-Data (${resFootball.status}):`, erroTexto)
      throw new Error(`Falha ao consultar football-data: ${resFootball.status} - ${erroTexto}`)
    }

    const dadosFutebol = await resFootball.json()
    const jogosDaApi = dadosFutebol.matches || []

    let houveJogoFinalizado = false

    // 3. Atualiza APENAS as partidas críticas (e não o banco todo)
    for (const jogoBanco of partidasCriticas) {
      const jogoApi = jogosDaApi.find((m: any) => m.id === jogoBanco.fixture_id)
      
      // Se a API não mandou o jogo de hoje (delay deles), a gente pula e tenta na próxima rodada do cron
      if (!jogoApi) continue

      let novoStatus = jogoBanco.status
      if (jogoApi.status === 'FINISHED') novoStatus = 'FT'
      else if (jogoApi.status === 'IN_PLAY' || jogoApi.status === 'PAUSED') novoStatus = 'LIVE'
      else if (jogoApi.status === 'TIMED' || jogoApi.status === 'SCHEDULED') novoStatus = 'NS'

      // Leitura robusta dos gols da API
      const novosGolsCasa = jogoApi.score?.fullTime?.home ?? jogoBanco.gols_casa
      const novosGolsFora = jogoApi.score?.fullTime?.away ?? jogoBanco.gols_fora

      if (jogoBanco.status === 'LIVE' && novoStatus === 'FT') {
        houveJogoFinalizado = true
      }

      // Se algo mudou, envia o update
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

        if (updateError) {
          console.error(`Erro ao atualizar partida ${jogoBanco.id}:`, updateError)
        }
      }
    }

    // 4. SE ALGUM JOGO ACABOU DE TERMINAR: Dispara o cálculo de ranking
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
          cache: 'no-store'
        })
        
        if (!resProcessar.ok) {
          const erroTexto = await resProcessar.text()
          console.error('[Cron] Ocorreu um erro na rota processar-pontos:', erroTexto)
        }
      } catch (internalErr) {
        console.error('[Cron] Falha de conexão ao acionar processar-pontos:', internalErr)
      }

      return NextResponse.json({ 
        success: true, 
        message: 'Placares sincronizados e ranking disparado com sucesso!' 
      })
    }

    return NextResponse.json({ 
      success: true, 
      message: 'Placares sincronizados. Monitoramento em andamento.' 
    })

  } catch (err: any) {
    console.error('Erro Fatal no Cron de Sincronização:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
