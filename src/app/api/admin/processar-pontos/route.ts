import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { calcularPontosPartida } from '@/utils/calculadoraPontos'

// ============================================================================
// INJEÇÃO MANUAL DA GRANDE FINAL E PRÊMIOS INDIVIDUAIS
// ============================================================================
const FINAL_MANUAL = {
  CAMPEAO: "Espanha",
  VICE: "Argentina"
}

const PREMIOS_MANUAIS = {
  bolaDeOuro: 3199,
  chuteiraDeOuro: 3374,
  luvaDeOuro: 32570
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
  CAMPEAO_ACERTO: 40,
  
  PREMIO_BOLA_OURO: 30,
  PREMIO_CHUTEIRA_OURO: 25,
  PREMIO_LUVA_OURO: 20
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

    // Adicionamos a busca da tabela `palpites_premios`
    const [partidasFT, todasPartidas, timesCopa, palpitesJogos, palpitesGrupos, palpitesMata, palpitesPremios] = await Promise.all([
      buscarTodosOsRegistros('partidas', (q) => q.eq('status', 'FT')),
      buscarTodosOsRegistros('partidas'),
      buscarTodosOsRegistros('times_copa'),
      buscarTodosOsRegistros('palpites_jogos'),
      buscarTodosOsRegistros('palpites_grupos'),
      buscarTodosOsRegistros('palpites_matamata'),
      buscarTodosOsRegistros('palpites_premios') 
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
    })

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
    // ETAPA 5: PRÊMIOS INDIVIDUAIS (MANTENDO OS IDs)
    // ========================================================================
    const updatesPremios: any[] = []

    for (const palpite of palpitesPremios) {
      let pontosGanhos = 0

      // Mantemos a verificação rigorosa por ID Numérico
      if (palpite.premio === 'bolaDeOuro' && PREMIOS_MANUAIS.bolaDeOuro !== null) {
        if (Number(palpite.jogador_id) === PREMIOS_MANUAIS.bolaDeOuro) pontosGanhos = REGRAS.PREMIO_BOLA_OURO
      } 
      else if (palpite.premio === 'chuteiraDeOuro' && PREMIOS_MANUAIS.chuteiraDeOuro !== null) {
        if (Number(palpite.jogador_id) === PREMIOS_MANUAIS.chuteiraDeOuro) pontosGanhos = REGRAS.PREMIO_CHUTEIRA_OURO
      } 
      else if (palpite.premio === 'luvaDeOuro' && PREMIOS_MANUAIS.luvaDeOuro !== null) {
        if (Number(palpite.jogador_id) === PREMIOS_MANUAIS.luvaDeOuro) pontosGanhos = REGRAS.PREMIO_LUVA_OURO
      }

      // Adiciona a pontuação no ranking geral do bolão
      if (palpite.bolao_id && rankingBoloes[palpite.bolao_id] !== undefined) {
        rankingBoloes[palpite.bolao_id] += pontosGanhos
      }

      // Monta o objeto para o Supabase usando o nome correto da coluna (bolao_id)
      updatesPremios.push({
        id: palpite.id, 
        bolao_id: palpite.bolao_id, 
        premio: palpite.premio,
        time_id: palpite.time_id,
        jogador_id: palpite.jogador_id, 
        pontos: pontosGanhos
      })
    } 

    // ========================================================================
    // ETAPA 6: PERSISTÊNCIA COMPLETA EM LOTE (Evitando sobrecarga de rede)
    // ========================================================================
    const promessasUpsert: Promise<any>[] = []

    const upsertSeguro = async (tabela: string, dados: any[]) => {
      const { error } = await supabaseAdmin.from(tabela).upsert(dados, { onConflict: 'id' })
      if (error) {
        console.error(`Erro CRÍTICO no upsert da tabela ${tabela}:`, error)
        throw new Error(`Falha no upsert da tabela ${tabela}: ${error.message}`)
      }
    }

    if (updatesJogos.length > 0) promessasUpsert.push(upsertSeguro('palpites_jogos', updatesJogos))
    if (updatesGrupos.length > 0) promessasUpsert.push(upsertSeguro('palpites_grupos', updatesGrupos))
    if (updatesMata.length > 0) promessasUpsert.push(upsertSeguro('palpites_matamata', updatesMata))

    // 1. Aguarda as tabelas pesadas fazerem o upsert de lote único
    await Promise.all(promessasUpsert)

    // 2. SOLUÇÃO: Atualiza os Prêmios em lotes menores para não causar "fetch failed"
    if (updatesPremios.length > 0) {
      const tamanhoLote = 50; // Limite seguro de requisições simultâneas
      
      for (let i = 0; i < updatesPremios.length; i += tamanhoLote) {
        const lote = updatesPremios.slice(i, i + tamanhoLote);
        
        await Promise.all(
          lote.map(premio => 
            supabaseAdmin.from('palpites_premios')
              .update({ pontos: premio.pontos })
              .eq('id', premio.id)
              .then(({ error }) => {
                if (error) throw new Error(`Falha no update do prêmio ${premio.id}: ${error.message}`)
              })
          )
        );
      }
    }

    // 3. Atualiza a pontuação total dos bolões
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
      message: 'Cálculo e pontuação de todas as etapas (incluindo prêmios) processados com sucesso!' 
    }) 

  } catch (err: any) {
    console.error("Erro no processamento de pontos:", err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
