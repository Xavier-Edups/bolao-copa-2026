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
    // Busca os dados no football-data.org (WC = World Cup)
    const res = await fetch('https://api.football-data.org/v4/competitions/WC/matches', {
      method: 'GET',
      headers: {
        'X-Auth-Token': apiKey ?? ''
      },
      // Evita que o Next.js guarde os resultados no cache da Vercel
      cache: 'no-store' 
    })
    
    if (!res.ok) {
      throw new Error(`Erro na API: ${res.status}`)
    }

    const data = await res.json()

    // Transforma os dados da v4 do football-data para a tabela do nosso Supabase
    const partidasFormatadas = data.matches.map((jogo: any) => ({
      fixture_id: jogo.id,
      time_casa: jogo.homeTeam?.name || 'A Definir',
      time_fora: jogo.awayTeam?.name || 'A Definir',
      bandeira_casa: jogo.homeTeam?.crest || null,
      bandeira_fora: jogo.awayTeam?.crest || null,
      // Na API deles, gols ficam dentro de score.fullTime
      gols_casa: jogo.score?.fullTime?.home ?? null,
      gols_fora: jogo.score?.fullTime?.away ?? null,
      data_hora: jogo.utcDate,
      fase: jogo.stage,
      
      // Traduzindo os status da API nova para o nosso padrão de 2 letras
      // TIMED/SCHEDULED = NS (Not Started), FINISHED = FT (Full Time)
      status: jogo.status === 'FINISHED' ? 'FT' : 
             (jogo.status === 'TIMED' || jogo.status === 'SCHEDULED' ? 'NS' : 
              jogo.status === 'IN_PLAY' || jogo.status === 'PAUSED' ? 'LIVE' : jogo.status)
    }))

    // Faz o UPSERT no Supabase
    const { error } = await supabase
      .from('partidas')
      .upsert(partidasFormatadas, { onConflict: 'fixture_id' })

    if (error) throw error

    return NextResponse.json({ success: true, atualizados: partidasFormatadas.length })
    
  } catch (error) {
    console.error('Erro ao sincronizar:', error)
    return NextResponse.json({ error: 'Erro interno na sincronização' }, { status: 500 })
  }
}
