import { NextRequest, NextResponse } from 'next/server'
import { google } from 'googleapis'
import { createClient } from '@supabase/supabase-js'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL, 
  process.env.NEXT_SECRET_SUPABASE_KEY
)

export async function POST(req: NextRequest) {
  const secretHeader = req.headers.get('x-admin-secret')
  if (secretHeader !== process.env.ADMIN_SECRET) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
  }

  try {
    // =========================================================================
    // 1. BUSCA TODOS OS DADOS EM PARALELO (SEM FILTROS QUE QUEBREM A CONSULTA)
    // =========================================================================
    const [
      { data: boloes, error: errorBoloes },
      { data: palpitesJogos, error: errorJogos },
      { data: palpitesGrupos },
      { data: palpitesMataMata },
      { data: palpitesPremios },
      { data: times },
      { data: partidas },    
      { data: jogadores },   
      resUsuarios            
    ] = await Promise.all([
      supabaseAdmin.from('boloes').select('id, user_id, nome'),
      supabaseAdmin.from('palpites_jogos').select('*'), // CORREÇÃO: Removido o filtro .eq() que esvaziava a consulta
      supabaseAdmin.from('palpites_grupos').select('*'),
      supabaseAdmin.from('palpites_matamata').select('*'),
      supabaseAdmin.from('palpites_premios').select('*'),
      supabaseAdmin.from('times_copa').select('id, nome, grupo'),
      supabaseAdmin.from('partidas').select('id, fixture_id, time_casa, time_fora'),
      supabaseAdmin.from('jogadores').select('id, nome'),
      supabaseAdmin.auth.admin.listUsers() 
    ])

    if (errorBoloes) throw new Error(errorBoloes.message)
    if (errorJogos) throw new Error(errorJogos.message)
    if (!boloes || boloes.length === 0) throw new Error("Nenhum bolão encontrado no banco.")

    // =========================================================================
    // 2. CONSTRUÇÃO DOS DICIONÁRIOS DE TRADUÇÃO (MAPS)
    // =========================================================================
    const mapaTimes = new Map(times?.map(t => [t.id.toString(), t.nome]))

    const mapaUsuarios = new Map(resUsuarios.data?.users?.map(u => [
      u.id, 
      u.user_metadata?.nome || u.user_metadata?.full_name || u.email || 'Usuário Anônimo'
    ]))

    const mapaJogadores = new Map(jogadores?.map(j => [j.id.toString(), j.nome]))

    // CORREÇÃO: Identifica as partidas da 1ª fase cruzando com o nome das seleções oficiais da 'times_copa'
    const nomesTimesCopa = new Set(times?.map(t => t.nome) || [])
    const partidas1fReal = (partidas || [])
      .filter(p => nomesTimesCopa.has(p.time_casa) && nomesTimesCopa.has(p.time_fora))
      .sort((a, b) => (a.fixture_id || a.id) - (b.fixture_id || b.id))

    const timesIds = [...new Set(palpitesGrupos?.map(p => p.time_id))].sort()

    const fasesMataMata = [
      { key: 'r32', count: 32 },
      { key: 'r16', count: 16 },
      { key: 'qf', count: 8 },
      { key: 'sf', count: 4 }
    ]

    // =========================================================================
    // 3. MONTAGEM DOS CABEÇALHOS COM NOMES AMIGÁVEIS
    // =========================================================================
    const headerRow = ['Participante', 'Nome do Bolão']

    // Cria dinamicamente o par de colunas (Casa/Fora) para cada jogo mapeado da 1ª Fase
    partidas1fReal.forEach(jogo => {
      const textoConfronto = `${jogo.time_casa} x ${jogo.time_fora}`
      headerRow.push(`${textoConfronto} (Casa)`, `${textoConfronto} (Fora)`)
    })

    timesIds.forEach(tId => {
      const nomeTime = mapaTimes.get(tId.toString()) || `Time ${tId}`
      headerRow.push(`Grupo: ${nomeTime}`)
    })

    fasesMataMata.forEach(fase => {
      for (let i = 0; i < fase.count; i++) {
        headerRow.push(`Mata-Mata: ${fase.key.toUpperCase()} (Vaga ${i + 1})`)
      }
    })
    headerRow.push('Mata-Mata: CAMPEÃO', 'Mata-Mata: VICE')
    headerRow.push('Prêmio: Bola de Ouro', 'Prêmio: Chuteira de Ouro', 'Prêmio: Luva de Ouro')

    // =========================================================================
    // 4. PROCESSAMENTO E TRADUÇÃO DAS LINHAS DE DADOS
    // =========================================================================
    const rows: any[][] = [headerRow]

    boloes.forEach((bolao: any) => {
      const rowData = []
      
      const nomeDoParticipante = mapaUsuarios.get(bolao.user_id) || 'ID: ' + bolao.user_id
      rowData.push(nomeDoParticipante)
      rowData.push(bolao.nome)

      // CORREÇÃO: Varre as partidas mapeadas buscando os palpites pelo fixture_id correspondente
      partidas1fReal.forEach(jogo => {
        const palpite = palpitesJogos?.find(p => p.bolao_id === bolao.id && p.partida_id === jogo.fixture_id)
        rowData.push(palpite ? palpite.gols_casa : '')
        rowData.push(palpite ? palpite.gols_fora : '')
      })

      timesIds.forEach(tId => {
        const palpite = palpitesGrupos?.find(p => p.bolao_id === bolao.id && p.time_id === tId)
        rowData.push(palpite ? `${palpite.posicao}º` : '')
      })

      fasesMataMata.forEach(fase => {
        for (let i = 0; i < fase.count; i++) {
          const palpite = palpitesMataMata?.find(p => p.bolao_id === bolao.id && p.fase === fase.key && p.posicao_index === i)
          rowData.push(palpite ? (mapaTimes.get(palpite.time_id.toString()) || palpite.time_id) : '')
        }
      })
      
      const campeao = palpitesMataMata?.find(p => p.bolao_id === bolao.id && p.fase === 'campeao')
      rowData.push(campeao ? (mapaTimes.get(campeao.time_id.toString()) || campeao.time_id) : '')
      
      const vice = palpitesMataMata?.find(p => p.bolao_id === bolao.id && p.fase === 'vice')
      rowData.push(vice ? (mapaTimes.get(vice.time_id.toString()) || vice.time_id) : '')

      const bolaOuro = palpitesPremios?.find(p => p.bolao_id === bolao.id && p.premio === 'bolaDeOuro')
      rowData.push(bolaOuro ? (mapaJogadores.get(bolaOuro.jogador_id?.toString()) || bolaOuro.jogador || '') : '')

      const chuteiraOuro = palpitesPremios?.find(p => p.bolao_id === bolao.id && p.premio === 'chuteiraDeOuro')
      rowData.push(chuteiraOuro ? (mapaJogadores.get(chuteiraOuro.jogador_id?.toString()) || chuteiraOuro.jogador || '') : '')

      const luvaOuro = palpitesPremios?.find(p => p.bolao_id === bolao.id && p.premio === 'luvaDeOuro')
      rowData.push(luvaOuro ? (mapaJogadores.get(luvaOuro.jogador_id?.toString()) || luvaOuro.jogador || '') : '')

      rows.push(rowData)
    })

    // =========================================================================
    // 5. ENVIO EM LOTE PARA O GOOGLE SHEETS
    // =========================================================================
    const auth = new google.auth.GoogleAuth({
      credentials: JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_KEY!),
      scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    })

    const sheets = google.sheets({ version: 'v4', auth })
    
    await sheets.spreadsheets.values.update({
      spreadsheetId: process.env.GOOGLE_SHEET_ID,
      range: 'Palpites',
      valueInputOption: 'RAW',
      requestBody: { values: rows },
    })

    return NextResponse.json({ success: true, message: 'Planilha nominal gerada com sucesso!' })

  } catch (err: any) {
    console.error("Erro no export", err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
