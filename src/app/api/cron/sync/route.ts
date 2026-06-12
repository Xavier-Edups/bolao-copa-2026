import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const adminSecret = process.env.ADMIN_SECRET!
const cronSecret = process.env.CRON_SECRET!
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.NEXT_SECRET_SUPABASE_KEY!
const footballApiKey = process.env.API_FOOTBALL_KEY!
const publicUrl = process.env.NEXT_PUBLIC_APP_URL!

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey)

export async function GET(req: NextRequest) {
  // Proteção nativa da Vercel para garantir que apenas o Cron do sistema chame esta rota
  const authHeader = req.headers.get('authorization')
  if (authHeader !== `Bearer ${cronSecret}`) {
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

    // [OTIMIZAÇÃO] Se não tem jogo rolando nem prestes a começar, encerra com 0 chamadas de API
    if (!partidasCriticas || partidasCriticas.length === 0) {
      return NextResponse.json({ 
        success: true, 
        message: 'Nenhum jogo em andamento ou próximo. API poupada.' 
      })
    }

    // 2. Se chegou aqui, significa que precisamos atualizar! Fazemos 1 chamada na API de futebol
    // Substitua pela URL real da sua competição ou endpoint do football-data
    const resFootball = await fetch('https://api.football-data.org/v4/matches', {
      headers: { 'X-Auth-Token': footballApiKey },
      next: { revalidate: 0 } // Garante dados frescos, sem cache
    })

    if (!resFootball.ok) throw new Error('Falha ao consultar football-data')
    const dadosFutebol = await resFootball.json()
    const jogosDaApi = dadosFutebol.matches || []

    // 3. Puxa do banco os jogos internos para cruzar os dados
    const { data: partidasBanco } = await supabaseAdmin.from('partidas').select('*')

    let houveJogoFinalizado = false

    // 4. Atualiza os placares no Supabase
    for (const jogoBanco of partidasBanco || []) {
      // Encontra o jogo correspondente vindo da API externa (via fixture_id ou ID equivalente)
      const jogoApi = jogosDaApi.find((m: any) => m.id === jogoBanco.fixture_id)
      if (!jogoApi) continue

      // Mapeia o status da API para o seu padrão de banco de dados
      let novoStatus = jogoBanco.status
      if (jogoApi.status === 'FINISHED') novoStatus = 'FT'
      else if (jogoApi.status === 'IN_PLAY' || jogoApi.status === 'PAUSED') novoStatus = 'LIVE'
      else if (jogoApi.status === 'TIMED' || jogoApi.status === 'SCHEDULED') novoStatus = 'NS'

      const novosGolsCasa = jogoApi.score?.fullTime?.home ?? jogoBanco.gols_casa
      const novosGolsFora = jogoApi.score?.fullTime?.away ?? jogoBanco.gols_fora

      // Detecta a virada de chave: o jogo estava LIVE no banco, mas a API avisou que terminou (FINISHED -> FT)
      if (jogoBanco.status === 'LIVE' && novoStatus === 'FT') {
        houveJogoFinalizado = true
      }

      // Se mudou o placar ou o status, atualiza a linha da partida no banco
      if (
        jogoBanco.status !== novoStatus || 
        jogoBanco.gols_casa !== novosGolsCasa || 
        jogoBanco.gols_fora !== novosGolsFora
      ) {
        await supabaseAdmin
          .from('partidas')
          .update({
            status: novoStatus,
            gols_casa: novosGolsCasa,
            gols_fora: novosGolsFora
          })
          .eq('id', jogoBanco.id)
      }
    }

    // 5. SE ALGUM JOGO ACABOU DE TERMINAR: Dispara o cálculo de ranking do Bolão automaticamente!
    if (houveJogoFinalizado) {
      // Faz uma chamada interna para a rota de pontos que criamos anteriormente
      // O 'process.env.NEXT_PUBLIC_APP_URL' guarda a URL base do seu site (ex: https://seu-bolao.vercel.app)
      await fetch(`${publicUrl}/api/admin/processar-pontos`, {
        method: 'POST',
        headers: {
          'x-admin-secret': adminSecret,
        },
      })
      
      return NextResponse.json({ 
        success: true, 
        message: 'Placares sincronizados e novo ranking calculado com sucesso!' 
      })
    }

    return NextResponse.json({ 
      success: true, 
      message: 'Placares sincronizados. Nenhum jogo novo finalizado nesta janela.' 
    })

  } catch (err: any) {
    console.error('Erro no Cron de Sincronização:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
