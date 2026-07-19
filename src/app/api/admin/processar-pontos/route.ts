import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { calcularPontosPartida } from '@/utils/calculadoraPontos'

// ============================================================================
// INJEÇÃO MANUAL DA GRANDE FINAL
// Digite o nome EXATO em inglês (como está no banco, ex: "Brazil", "France").
// Deixe como null se a final ainda não tiver acontecido.
// ============================================================================
const FINAL_MANUAL = {
  CAMPEAO: "Espanha", // Ex: "Argentina"
  VICE: "Argentina"        // Ex: "France"
}

// CONFIGURAÇÃO DAS REGRAS E PESOS DE PONTUAÇÃO DO BOLÃO
const REGRAS = {
  GRUPO_ACERTO: 3,
  R32_ACERTO: 1,
  R32_BONUS: 8,
  R16_ACERTO: 2,
  R16_BONUS: 8,
  QF_ACERTO: 5,
  QF_BONUS: 10,
  SF_ACERTO: 10,
  SF_BONUS: 10,
  VICE_ACERTO: 30,
  CAMPEAO_ACERTO: 40
}

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
    const boloes = await buscarTodosOsRegistros('boloes')
    if (!boloes || boloes.length === 0) return NextResponse.json({ message: 'Nenhum bolão ativo.' })

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
    // ETAPA 1: PLACARES DOS JOGOS TERMINADOS (FT)
    // ========================================================================
    const updatesJogos = []
    for (const jogo of partidasFT) {
      const placarReal = { casa: Number(jogo.gols_casa), fora: Number(jogo.gols_fora) }
      const palpitesDesteJogo = palpitesJogos.filter(p => 
        String(p.partida_id) === String(jogo.fixture_id) || String(p.partida_id) === String(jogo.id)
      )

      for (const palpite of palpitesDesteJogo) {
        if (palpite.gols_casa === null || palpite.gols_casa === '' || palpite.gols_fora === null || palpite.gols_fora === '') continue;

        const pontosGanhos = calcularPontosPartida({ casa: Number(palpite.gols_casa), fora: Number(palpite.gols_fora) }, placarReal)
        if (rankingBoloes[palpite.bolao_id] !== undefined) rankingBoloes[palpite.bolao_id] += pontosGanhos

        updatesJogos.push({
          id: palpite.id, bolao_id: palpite.bolao_id, partida_id: palpite.partida_id,
          gols_casa: palpite.gols_casa, gols_fora: palpite.gols_fora, pontos: pontosGanhos
        })
      }
    }

    // ========================================================================
    // ETAPA 2: COLOCAÇÕES DOS GRUPOS (3 PTS POR ACERTO)
    // ========================================================================
    const updatesGrupos = []
    const mapaTimesColocacao = new Map<number, number>()
    timesCopa.forEach(t => {
      if (t.colocacao !== null && t.colocacao !== undefined) mapaTimesColocacao.set(Number(t.id), Number(t.colocacao))
    })

    for (const palpite of palpitesGrupos) {
      const colocacaoReal = mapaTimesColocacao.get(Number(palpite.time_id))
      let pontosGanhos = 0
      if (colocacaoReal !== undefined) {
        pontosGanhos = Number(palpite.posicao) === colocacaoReal ? REGRAS.GRUPO_ACERTO : 0
      }
      if (rankingBoloes[palpite.bolao_id] !== undefined) rankingBoloes[palpite.bolao_id] += pontosGanhos

      updatesGrupos.push({
        id: palpite.id, bolao_id: palpite.bolao_id, time_id: palpite.time_id,
        posicao: palpite.posicao, pontos: pontosGanhos
      })
    }

    // ========================================================================
    // ETAPA 3: MAPEAMENTO COMPLETO DE SELEÇÕES REAIS CLASSIFICADAS NO MATA-MATA
    // ========================================================================
    const reaisR32 = new Set<number>()
    const reaisR16 = new Set<number>()
    const reaisQF = new Set<number>()
    const reaisSF = new Set<number>()
    
    let realCampeaoId: number | null = null
    let realViceId: number | null = null

    const obterTimeIdPorNome = (nome: string) => {
      if (!nome || nome === 'A Definir' || nome === 'TBD') return null
      return timesCopa.find(t => t.nome === nome)?.id || null
    }

    todasPartidas.forEach(j => {
      const idCasa = obterTimeIdPorNome(j.time_casa)
      const idFora = obterTimeIdPorNome(j.time_fora)

      if (j.fase === 'LAST_32') {
        if (idCasa) reaisR32.add(Number(idCasa))
        if (idFora) reaisR32.add(Number(idFora))
      } else if (j.fase === 'LAST_16') {
        if (idCasa) reaisR16.add(Number(idCasa))
        if (idFora) reaisR16.add(Number(idFora))
      } else if (j.fase === 'QUARTER_FINALS') {
        if (idCasa) reaisQF.add(Number(idCasa))
        if (idFora) reaisQF.add(Number(idFora))
      } else if (j.fase === 'SEMI_FINALS') {
        if (idCasa) reaisSF.add(Number(idCasa))
        if (idFora) reaisSF.add(Number(idFora))
      }
      // REMOVIDO: A lógica automática falha que tentava adivinhar a final pelos gols
    })

    // INJEÇÃO DOS IDs DO CAMPEÃO E VICE BASEADO NA CONSTANTE MANUAL NO TOPO DO ARQUIVO
    if (FINAL_MANUAL.CAMPEAO) {
      const tCamp = timesCopa.find(t => t.nome.toLowerCase() === FINAL_MANUAL.CAMPEAO?.toLowerCase())
      if (tCamp) realCampeaoId = Number(tCamp.id)
    }

    if (FINAL_MANUAL.VICE) {
      const tVice = timesCopa.find(t => t.nome.toLowerCase() === FINAL_MANUAL.VICE?.toLowerCase())
      if (tVice) realViceId = Number(tVice.id)
    }

    // ========================================================================
    // ETAPA 4: PROCESSAMENTO DE TODAS AS FASES DO MATA-MATA (COM BÔNUS)
    // ========================================================================
    const updatesMata: any[] = []

    const configuracaoFases = [
      { key: 'r32', reais: reaisR32, acertoPeso: REGRAS.R32_ACERTO, bonusPeso: REGRAS.R32_BONUS, limite: 32 },
      { key: 'r16', reais: reaisR16, acertoPeso: REGRAS.R16_ACERTO, bonusPeso: REGRAS.R16_BONUS, limite: 16 },
      { key: 'qf',  reais: reaisQF,  acertoPeso: REGRAS.QF_ACERTO,  bonusPeso: REGRAS.QF_BONUS,  limite: 8 },
      { key: 'sf',  reais: reaisSF,  acertoPeso: REGRAS.SF_ACERTO,  bonusPeso: REGRAS.SF_BONUS,  limite: 4 }
    ]

    for (const bolao of boloes) {
      const palpitesDoBolao = palpitesMata.filter(p => p.bolao_id === bolao.id)

      // A. Processa as Fases de Listas (r32, r16, qf, sf)
      configuracaoFases.forEach(fase => {
        const palpitesDaFase = palpitesDoBolao.filter(p => p.fase === fase.key)
        
        let totalAcertos = 0
        palpitesDaFase.forEach(p => {
          if (fase.reais.has(Number(p.time_id))) totalAcertos++
        })

        const gabaritou = (totalAcertos === fase.limite && fase.reais.size >= fase.limite)
        const pontosBonus = gabaritou ? fase.bonusPeso : 0

        palpitesDaFase.forEach((p) => {
          const acertou = fase.reais.has(Number(p.time_id))
          let pontosPalpite = acertou ? fase.acertoPeso : 0

          if (acertou && p.posicao_index === 0 && gabaritou) {
            pontosPalpite += pontosBonus
          }

          if (rankingBoloes[bolao.id] !== undefined) rankingBoloes[bolao.id] += pontosPalpite

          updatesMata.push({
            id: p.id, bolao_id: p.bolao_id, fase: p.fase,
            posicao_index: p.posicao_index, time_id: p.time_id, pontos: pontosPalpite
          })
        })
      })

      // B. Processa as Fases Finais Absolutas (Campeão e Vice)
      const palpiteCampeao = palpitesDoBolao.find(p => p.fase === 'campeao')
      const palpiteVice = palpitesDoBolao.find(p => p.fase === 'vice')

      if (palpiteCampeao) {
        const acertouCampeao = realCampeaoId !== null && Number(palpiteCampeao.time_id) === realCampeaoId
        const ptsC = acertouCampeao ? REGRAS.CAMPEAO_ACERTO : 0
        if (rankingBoloes[bolao.id] !== undefined) rankingBoloes[bolao.id] += ptsC
        updatesMata.push({
          id: palpiteCampeao.id, bolao_id: palpiteCampeao.bolao_id, fase: 'campeao',
          posicao_index: 0, time_id: palpiteCampeao.time_id, pontos: ptsC
        })
      }

      if (palpiteVice) {
        const acertouVice = realViceId !== null && Number(palpiteVice.time_id) === realViceId
        const ptsV = acertouVice ? REGRAS.VICE_ACERTO : 0
        if (rankingBoloes[bolao.id] !== undefined) rankingBoloes[bolao.id] += ptsV
        updatesMata.push({
          id: palpiteVice.id, bolao_id: palpiteVice.bolao_id, fase: 'vice',
          posicao_index: 0, time_id: palpiteVice.time_id, pontos: ptsV
        })
      }
    }

    // ========================================================================
    // ETAPA 5: PERSISTÊNCIA COMPLETA EM LOTE
    // ========================================================================
    const promessasUpsert = []
    if (updatesJogos.length > 0) promessasUpsert.push(supabaseAdmin.from('palpites_jogos').upsert(updatesJogos, { onConflict: 'id' }))
    if (updatesGrupos.length > 0) promessasUpsert.push(supabaseAdmin.from('palpites_grupos').upsert(updatesGrupos, { onConflict: 'id' }))
    if (updatesMata.length > 0) promessasUpsert.push(supabaseAdmin.from('palpites_matamata').upsert(updatesMata, { onConflict: 'id' }))

    await Promise.all(promessasUpsert)

    for (const bolao of boloes) {
      const pontosFinais = rankingBoloes[bolao.id] || 0
      const { error: erroUpdateBolao } = await supabaseAdmin
        .from('boloes')
        .update({ pontuacao_total: pontosFinais })
        .eq('id', bolao.id)

      if (erroUpdateBolao) console.error(`Erro ao atualizar ranking do bolão ${bolao.id}:`, erroUpdateBolao)
    }

    return NextResponse.json({ 
      success: true, 
      message: 'Cálculo e pontuação de todas as etapas do funil do bolão processados com sucesso!' 
    })

  } catch (err: any) {
    console.error("Erro no processamento de pontos:", err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
