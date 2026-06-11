import { NextRequest, NextResponse } from 'next/server'
import { google } from 'googleapis'
import { createClient } from '@supabase/supabase-js'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!, 
  process.env.NEXT_SECRET_SUPABASE_KEY!
)

async function buscarTodosOsRegistros(tabela: string, filtros?: (query: any) => any) {
  let todosDados: any[] = []
  let de = 0
  let ate = 999
  let carregando = true

  while (carregando) {
    let query = supabaseAdmin.from(tabela).select('*').range(de, ate)
    
    if (filtros) {
      query = filtros(query)
    }

    const { data, error } = await query

    if (error) throw error

    if (data && data.length > 0) {
      todosDados = todosDados.concat(data)
      if (data.length < 1000) {
        carregando = false 
      } else {
        de += 1000
        ate += 1000
      }
    } else {
      carregando = false
    }
  }
  return todosDados
}

export async function POST(req: NextRequest) {
  const secretHeader = req.headers.get('x-admin-secret')
  if (secretHeader !== process.env.ADMIN_SECRET) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
  }

  try {
    // =========================================================================
    // 1. BUSCA USUÁRIOS CONTORNANDO A PAGINAÇÃO DA AUTH
    // =========================================================================
    let listaUsuariosAuth: any[] = []
    let paginaAuth = 1
    let temMaisUsuarios = true

    while (temMaisUsuarios) {
      const { data: resAuth, error: errorAuth } = await supabaseAdmin.auth.admin.listUsers({
        page: paginaAuth,
        perPage: 1000
      })
      if (errorAuth) throw errorAuth

      if (resAuth && resAuth.users && resAuth.users.length > 0) {
        listaUsuariosAuth = listaUsuariosAuth.concat(resAuth.users)
        if (resAuth.users.length < 1000) temMaisUsuarios = false
        else paginaAuth++
      } else {
        temMaisUsuarios = false
      }
    }

    // =========================================================================
    // 2. BUSCA AS TABELAS DO BANCO DE DADOS EM LOTES SEGUROS
    // =========================================================================
    const [
      boloes,
      palpitesJogos,
      palpitesGrupos,
      palpitesMataMata,
      palpitesPremios,
      times,
      partidas,
      jogadores
    ] = await Promise.all([
      buscarTodosOsRegistros('boloes'),
      buscarTodosOsRegistros('palpites_jogos'),
      buscarTodosOsRegistros('palpites_groups' in supabaseAdmin ? 'palpites_groups' : 'palpites_grupos'), 
      buscarTodosOsRegistros('palpites_matamata'),
      buscarTodosOsRegistros('palpites_premios'),
      buscarTodosOsRegistros('times_copa'),
      buscarTodosOsRegistros('partidas'),
      buscarTodosOsRegistros('jogadores')
    ])

    if (!boloes || boloes.length === 0) throw new Error("Nenhum bolão encontrado no banco.")

    // =========================================================================
    // 3. CONSTRUÇÃO DOS DICIONÁRIOS DE TRADUÇÃO (MAPS)
    // =========================================================================
    const mapaTimes = new Map(times?.map(t => [t.id.toString(), t.nome]))
    const mapaJogadores = new Map(jogadores?.map(j => [j.id.toString(), j.nome]))

    const mapaUsuarios = new Map(listaUsuariosAuth.map(u => [
      u.id, 
      u.user_metadata?.nome || u.user_metadata?.full_name || u.email || 'Usuário Anônimo'
    ]))

    const nomesTimesCopa = new Set(times?.map(t => t.nome) || [])
    const partidas1fReal = (partidas || [])
      .filter(p => nomesTimesCopa.has(p.time_casa) && nomesTimesCopa.has(p.time_fora))
      .sort((a, b) => new Date(a.data_hora).getTime() - new Date(b.data_hora).getTime())


    // =========================================================================
    // DICIONÁRIO OFICIAL DA FIFA: ORDENAÇÃO EXATA ESTABELECIDA (A1 ATÉ L4)
    // =========================================================================
    const ordemFifa = [
      // GRUPO A
      "Tchéquia", "México", "África do Sul", "Coreia do Sul",
      // GRUPO B
      "Bósnia e Herzegovina", "Canadá", "Catar", "Suíça",
      // GRUPO C
      "Brasil", "Marrocos", "Haiti", "Escócia",
      // GRUPO D
      "Turquia", "Estados Unidos", "Paraguai", "Austrália", 
      // GRUPO E
      "Alemanha", "Curaçao", "Costa do Marfim", "Equador",
      // GRUPO F
      "Suécia", "Holanda", "Japão", "Tunísia",
      // GRUPO G
      "Bélgica", "Egito", "Irã", "Nova Zelândia",
      // GRUPO H
      "Espanha", "Cabo Verde", "Arábia Saudita", "Uruguai",
      // GRUPO I
      "Iraque", "França", "Senegal", "Noruega",
      // GRUPO J
      "Argentina", "Argélia", "Áustria", "Jordânia",
      // GRUPO K
      "República Democrática do Congo", "Portugal", "Uzbequistão", "Colômbia",
      // GRUPO L
      "Inglaterra", "Croácia", "Gana", "Panamá"
    ];

    const mapaOrdemFifa = new Map(ordemFifa.map((nome, index) => [nome, index]));

    // =========================================================================
    // 4. ORDENAÇÃO DOS GRUPOS COM BASE NO DICIONÁRIO CORRIGIDO
    // =========================================================================
    const timesOrdenadosPorGrupo = [...(times || [])].sort((a, b) => {
      const grupoA = a.grupo || ''
      const grupoB = b.grupo || ''
      
      const compGrupo = grupoA.localeCompare(grupoB)
      if (compGrupo !== 0) return compGrupo

      const ordemA = mapaOrdemFifa.get(a.nome) ?? 999
      const ordemB = mapaOrdemFifa.get(b.nome) ?? 999
      
      return ordemA - ordemB
    })

    const fasesMataMata = [
      { key: 'r32', count: 32 },
      { key: 'r16', count: 16 },
      { key: 'qf', count: 8 },
      { key: 'sf', count: 4 }
    ]

    // =========================================================================
    // 5. MONTAGEM DOS CABEÇALHOS
    // =========================================================================
    const headerRow = ['Participante', 'Nome do Bolão']

    partidas1fReal.forEach(jogo => {
      const textoConfronto = `${jogo.time_casa} x ${jogo.time_fora}`
      headerRow.push(`${textoConfronto} (Casa)`, `${textoConfronto} (Fora)`)
    })

    timesOrdenadosPorGrupo.forEach(time => {
      headerRow.push(`Grupo: ${time.nome}`)
    })

    fasesMataMata.forEach(fase => {
      for (let i = 0; i < fase.count; i++) {
        headerRow.push(`Mata-Mata: ${fase.key.toUpperCase()} (Vaga ${i + 1})`)
      }
    })
    headerRow.push('Mata-Mata: CAMPEÃO', 'Mata-Mata: VICE')
    headerRow.push('Prêmio: Bola de Ouro', 'Prêmio: Chuteira de Ouro', 'Prêmio: Luva de Ouro')

    // =========================================================================
    // 6. PROCESSAMENTO DAS LINHAS
    // =========================================================================
    const rows: any[][] = [headerRow]

    boloes.forEach((bolao: any) => {
      const rowData = []
      
      const nomeDoParticipante = mapaUsuarios.get(bolao.user_id) || 'ID: ' + bolao.user_id
      rowData.push(nomeDoParticipante)
      rowData.push(bolao.nome)

      partidas1fReal.forEach(jogo => {
        const palpite = palpitesJogos?.find(p => 
          p.bolao_id === bolao.id && 
          (p.partida_id === jogo.fixture_id || p.partida_id?.toString() === jogo.id?.toString())
        )
        rowData.push(palpite ? palpite.gols_casa : '')
        rowData.push(palpite ? palpite.gols_fora : '')
      })

      timesOrdenadosPorGrupo.forEach(time => {
        const palpite = palpitesGrupos?.find(p => p.bolao_id === bolao.id && p.time_id === time.id)
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
    // 7. ENVIO PARA O GOOGLE SHEETS
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

    return NextResponse.json({ success: true, message: 'Planilha nominal organizada cronologicamente por jogos e grupos gerada!' })

  } catch (err: any) {
    console.error("Erro no export", err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
