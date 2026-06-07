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
    // Busca a classificação dos grupos
    const res = await fetch('https://api.football-data.org/v4/competitions/WC/standings', {
      method: 'GET',
      headers: { 'X-Auth-Token': apiKey ?? ''},
      cache: 'no-store' 
    })
    
    if (!res.ok) throw new Error(`Erro na API: ${res.status}`)
    const data = await res.json()

    const timesFormatados: any[] = []

    // A API retorna vários tipos de classificação. O 'TOTAL' é a fase de grupos.
    data.standings?.forEach((standing: any) => {
      if (standing.type === 'TOTAL') {
        standing.table.forEach((row: any) => {
          timesFormatados.push({
            id: row.team.id,
            nome: row.team.name,
            bandeira: row.team.crest,
            grupo: standing.group // Retorna algo como "GROUP A"
          })
        })
      }
    })

    // Faz o UPSERT no Supabase
    const { error } = await supabase
      .from('times_copa')
      .upsert(timesFormatados, { onConflict: 'id' })

    if (error) throw error

    return NextResponse.json({ success: true, timesAtualizados: timesFormatados.length })
    
  } catch (error) {
    console.error('Erro ao sincronizar grupos:', error)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
