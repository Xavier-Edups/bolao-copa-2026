import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.NEXT_SECRET_SUPABASE_KEY
const cronSecret = process.env.CRON_SECRET
const apiKey = process.env.API_FOOTBALL_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  throw new Error("Missing Supabase environment variables");
}

if (!apiKey) {
  throw new Error("Missing API_FOOTBALL_KEY environment variable");
}

if (!cronSecret) {
  throw new Error("Missing CRON_SECRET environment variable");
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const secret = searchParams.get('secret')
  
  if (secret !== cronSecret) {
    return NextResponse.json({ error: 'Acesso negado' }, { status: 401 })
  }

  try {
    const res = await fetch('https://api.football-data.org/v4/competitions/WC/matches', {
      method: 'GET',
      headers: {
        'X-Auth-Token': apiKey ?? ''
      },
      cache: 'no-store' 
    })
    
    if (!res.ok) {
      throw new Error(`Erro na API: ${res.status}`)
    }

    const data = await res.json()

    // 1. Otimização: Lista de IDs que vieram da API
    const fixtureIdsApi = data.matches.map((m: any) => m.id)
    
    // 2. BLINDAGEM DE DADOS: Busca as partidas no banco com todos os campos críticos
    const { data: partidasExistentes, error: erroBusca } = await supabase
      .from('partidas')
      .select('fixture_id, data_hora, time_casa, time_fora, bandeira_casa, bandeira_fora')
      .in('fixture_id', fixtureIdsApi)

    if (erroBusca) throw erroBusca

    const mapaPartidasExistentes = new Map()
    partidasExistentes?.forEach(p => mapaPartidasExistentes.set(p.fixture_id, p))

    // 3. Mesclagem inteligente
    const partidasParaUpsert = data.matches.map((jogo: any) => {
      // Pega o que já está salvo no Supabase (se existir)
      const dbPartida = mapaPartidasExistentes.get(jogo.id)
      
      const nomeCasaApi = jogo.homeTeam?.name
      const nomeForaApi = jogo.awayTeam?.name

      // Inicia assumindo que vamos usar o que já está no banco, 
      // ou 'A Definir' caso seja um jogo novinho que acabou de ser criado.
      let timeCasaFinal = dbPartida?.time_casa || 'A Definir'
      let timeForaFinal = dbPartida?.time_fora || 'A Definir'
      let bandeiraCasaFinal = dbPartida?.bandeira_casa || null
      let bandeiraForaFinal = dbPartida?.bandeira_fora || null

      // REGRA DE OURO (CASA): Se no banco está "A Definir" e a API trouxe um nome novo, nós atualizamos.
      // Se no banco JÁ TEM um time (ex: "Suíça"), ele ignora a API e protege a sua tradução!
      if (nomeCasaApi && (timeCasaFinal === 'A Definir' || timeCasaFinal === 'TBD')) {
        timeCasaFinal = nomeCasaApi
        bandeiraCasaFinal = jogo.homeTeam?.crest || null
      }

      // REGRA DE OURO (FORA)
      if (nomeForaApi && (timeForaFinal === 'A Definir' || timeForaFinal === 'TBD')) {
        timeForaFinal = nomeForaApi
        bandeiraForaFinal = jogo.awayTeam?.crest || null
      }

      // REGRA DA DATA (Protege a sua data manual)
      const dataHoraFinal = dbPartida?.data_hora ?? jogo.utcDate

      return {
        fixture_id: jogo.id,
        time_casa: timeCasaFinal,
        time_fora: timeForaFinal,
        bandeira_casa: bandeiraCasaFinal,
        bandeira_fora: bandeiraForaFinal,
        gols_casa: jogo.score?.fullTime?.home ?? null,
        gols_fora: jogo.score?.fullTime?.away ?? null,
        data_hora: dataHoraFinal,
        fase: jogo.stage,
        
        status: jogo.status === 'FINISHED' ? 'FT' : 
               (jogo.status === 'TIMED' || jogo.status === 'SCHEDULED' ? 'NS' : 
                jogo.status === 'IN_PLAY' || jogo.status === 'PAUSED' ? 'LIVE' : jogo.status)
      }
    })

    // 4. Faz o UPSERT no Supabase
    const { error } = await supabase
      .from('partidas')
      .upsert(partidasParaUpsert, { onConflict: 'fixture_id' })

    if (error) throw error

    return NextResponse.json({ success: true, atualizados: partidasParaUpsert.length })
    
  } catch (error) {
    console.error('Erro ao sincronizar:', error)
    return NextResponse.json({ error: 'Erro interno na sincronização' }, { status: 500 })
  }
}
