import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { calcularPontosPartida } from '@/utils/calculadoraPontos' 

// PESOS DE PONTUAÇÃO (Fácil de calibrar)
const PONTOS_ACERTO_GRUPO = 5;
const PONTOS_ACERTO_R32 = 3;

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
    if (filtros) query = filtros(query)
    
    const { data, error } = await query
    if (error) throw error

    if (data && data.length > 0) {
      todosDados = todosDados.concat(data)
      if (data.length < 1000) carregando = false 
      else { de += 1000; ate += 1000 }
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
    // 1. Busca os bolões ativos
    const boloes = await buscarTodosOsRegistros('boloes')
    if (!boloes || boloes.length === 0) return NextResponse.json({ message: 'Nenhum bolão ativo.' })

    // 2. Busca todas as bases necessárias em paralelo para máxima velocidade
    const [partidasFT, todasPartidas, timesCopa, palpitesJogos, palpitesGrupos, palpitesMata] = await Promise.all([
      buscarTodosOsRegistros('partidas', (q) => q.eq('status', 'FT')),
      buscarTodosOsRegistros('partidas'),
      buscarTodosOsRegistros('times_copa'),
      buscarTodosOsRegistros('palpites_jogos'),
      buscarTodosOsRegistros('palpites_grupos'),
      buscarTodosOsRegistros('palpites_matamata')
    ])

    const rankingBoloes: Record<string, number> = {}
    boloes.forEach(b => rankingBoloes[b.id] = 0)

    // ========================================================================
    // ETAPA A: CÁLCULO DE PARTIDAS FINALIZADAS (Mantido igual)
    // ========================================================================
    const updatesJogos = []
    
    for (const jogo of partidasFT) {
      const placarReal = { casa: Number(jogo.gols_casa), fora: Number(jogo.gols_fora) }
      const palpitesDesteJogo = palpitesJogos.filter(p => p.partida_id === jogo.fixture_id || p.partida_id?.toString() === jogo.id?.toString())

      for (const palpite of palpitesDesteJogo) {
        if (palpite.gols_casa === null || palpite.gols_casa === '' || palpite.gols_fora === null || palpite.gols_fora === '') continue;

        const pontosGanhos = calcularPontosPartida({ casa: Number(palpite.gols_casa), fora: Number(palpite.gols_fora) }, placarReal)
        if (rankingBoloes[palpite.bolao_id] !== undefined) rankingBoloes[palpite.bolao_id] += pontosGanhos

        updatesJogos.push({ ...palpite, pontos: pontosGanhos })
      }
    }

    // ========================================================================
    // ETAPA B: CÁLCULO DE COLOCAÇÕES DOS GRUPOS
    // ========================================================================
    const updatesGrupos = []
    // Filtra apenas times onde você já preencheu a coluna 'colocacao' no banco
    const timesComColocacaoDefinida = timesCopa.filter(t => t.colocacao !== null && t.colocacao !== undefined)

    for (const time of timesComColocacaoDefinida) {
      const palpitesDesteTime = palpitesGrupos.filter(p => p.time_id === time.id)

      for (const palpite of palpitesDesteTime) {
        // Se a posição que o cara palpitou for igual à colocação oficial do time
        const pontosGanhos = Number(palpite.posicao) === Number(time.colocacao) ? PONTOS_ACERTO_GRUPO : 0;
        
        if (rankingBoloes[palpite.bolao_id] !== undefined) rankingBoloes[palpite.bolao_id] += pontosGanhos
        updatesGrupos.push({ ...palpite, pontos: pontosGanhos })
      }
    }

    // ========================================================================
    // ETAPA C: CÁLCULO DE CLASSIFICADOS PARA AS ELIMINATÓRIAS (LAST_32)
    // ========================================================================
    const updatesMata = []
    
    // Descobre os nomes oficiais de todos os times que estão na fase LAST_32
    const jogosR32 = todasPartidas.filter(p => p.fase === 'LAST_32')
    const nomesClassificadosR32 = new Set<string>()
    
    jogosR32.forEach(j => {
      if (j.time_casa && j.time_casa !== 'A Definir' && j.time_casa !== 'TBD') nomesClassificadosR32.add(j.time_casa)
      if (j.time_fora && j.time_fora !== 'A Definir' && j.time_fora !== 'TBD') nomesClassificadosR32.add(j.time_fora)
    })

    // Converte os nomes em IDs usando a tabela times_copa
    const idsClassificadosR32 = timesCopa
      .filter(t => nomesClassificadosR32.has(t.nome))
      .map(t => t.id)

    // Filtra os palpites da fase r32
    const palpitesR32 = palpitesMata.filter(p => p.fase === 'r32')

    for (const palpite of palpitesR32) {
      const acertouClassificado = idsClassificadosR32.includes(Number(palpite.time_id))
      const pontosGanhos = acertouClassificado ? PONTOS_ACERTO_R32 : 0;

      if (rankingBoloes[palpite.bolao_id] !== undefined) rankingBoloes[palpite.bolao_id] += pontosGanhos
      updatesMata.push({ ...palpite, pontos: pontosGanhos })
    }

    // ========================================================================
    // 5. ATUALIZAÇÃO EM LOTE NO BANCO DE DADOS
    // ========================================================================
    const promessasUpsert = []

    if (updatesJogos.length > 0) promessasUpsert.push(supabaseAdmin.from('palpites_jogos').upsert(updatesJogos, { onConflict: 'id' }))
    if (updatesGrupos.length > 0) promessasUpsert.push(supabaseAdmin.from('palpites_grupos').upsert(updatesGrupos, { onConflict: 'id' }))
    if (updatesMata.length > 0) promessasUpsert.push(supabaseAdmin.from('palpites_matamata').upsert(updatesMata, { onConflict: 'id' }))

    await Promise.all(promessasUpsert)

    // Atualiza o Ranking Geral dos Bolões
    const boloesParaAtualizar = boloes.map(b => ({
      ...b,
      pontuacao_total: rankingBoloes[b.id] || 0
    }))

    if (boloesParaAtualizar.length > 0) {
      const { error: erroBoloes } = await supabaseAdmin.from('boloes').upsert(boloesParaAtualizar, { onConflict: 'id' })
      if (erroBoloes) throw new Error(`Erro ao atualizar ranking dos bolões: ${erroBoloes.message}`)
    }

    return NextResponse.json({ 
      success: true, 
      message: `Cálculo completo! Avaliados: ${partidasFT.length} jogos, ${timesComColocacaoDefinida.length} colocações de grupos e ${idsClassificadosR32.length} classificados para os 32-avos.` 
    })

  } catch (err: any) {
    console.error("Erro ao calcular pontos", err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
