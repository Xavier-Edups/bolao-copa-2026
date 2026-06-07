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
  if (searchParams.get('secret') !== cronSecret) {
    return NextResponse.json({ error: 'Acesso negado' }, { status: 401 })
  }

  try {
    // Busca os times da Copa (Esse endpoint traz a chave "squad" com os jogadores)
    const res = await fetch('https://api.football-data.org/v4/competitions/WC/teams', {
      headers: { 'X-Auth-Token': apiKey ?? ''},
      cache: 'no-store' 
    })
    
    if (!res.ok) throw new Error(`Erro API: ${res.status}`)
    const data = await res.json()

    const jogadoresFormatados: any[] = []

    // Varre os times e depois varre os jogadores de cada time
    data.teams?.forEach((time: any) => {
      time.squad?.forEach((jogador: any) => {
        jogadoresFormatados.push({
          id: jogador.id,
          nome: jogador.name,
          time_id: time.id,
          posicao: jogador.position
        })
      })
    })

    // Salva tudo no Supabase
    const { error } = await supabase
      .from('jogadores')
      .upsert(jogadoresFormatados, { onConflict: 'id' })

    if (error) throw error

    return NextResponse.json({ success: true, total: jogadoresFormatados.length })
    
  } catch (error) {
    console.error('Erro elencos:', error)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
