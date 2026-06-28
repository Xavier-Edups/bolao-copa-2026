import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { calcularPontosPartida } from '@/utils/calculadoraPontos' // Ajuste o caminho se necessário

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!, 
  process.env.NEXT_SECRET_SUPABASE_KEY!
)

// Função auxiliar de paginação para contornar o limite de 1000 linhas
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
    // 1. Busca todos os bolões ativos
    const boloes = await buscarTodosOsRegistros('boloes')
    if (!boloes || boloes.length === 0) return NextResponse.json({ message: 'Nenhum bolão ativo.' })

    // 2. Busca apenas as partidas que já terminaram (Full Time)
    const partidasFT = await buscarTodosOsRegistros('partidas', (q) => q.eq('status', 'FT'))
    if (!partidasFT || partidasFT.length === 0) {
      return NextResponse.json({ message: 'Nenhuma partida finalizada para processar.' })
    }

    // 3. Busca os registros adicionais necessários para o novo cálculo
    const [todasPartidas, timesCopa, todosPalpites, palpitesGrupos, palpitesMata] = await Promise.all([
      buscarTodosOsRegistros('partidas'),
      buscarTodosOsRegistros('times_copa'),
      buscarTodosOsRegistros('palpites_jogos'),
      buscarTodosOsRegistros('palpites_grupos'),
      buscarTodosOsRegistros('palpites_matamata', (q) => q.eq('fase', 'r32'))
    ])

    // Arrays para guardar as atualizações que enviaremos em lote pro banco
    const palpitesAtualizados = []
    const updatesGrupos = []
    const updatesMata: any[] = []
    
    const rankingBoloes: Record<string, number> = {} // Dicionário para somar os pontos de cada bolão

    // Inicializa todos os bolões com zero para a contagem
    boloes.forEach(b => rankingBoloes[b.id] = 0)

    // ========================================================================
    // 4. O CÁLCULO - ETAPA A: PLACARES DOS JOGOS (MANTIDO ORIGINAL)
    // ========================================================================
    for (const jogo of partidasFT) {
      const placarReal = { 
        casa: Number(jogo.gols_casa), 
        fora: Number(jogo.gols_fora) 
      }

      const palpitesDesteJogo = todosPalpites.filter(p => 
        p.partida_id === jogo.fixture_id || p.partida_id?.toString() === jogo.id?.toString()
      )

      for (const palpite of palpitesDesteJogo) {
        if (palpite.gols_casa === null || palpite.gols_casa === '' || palpite.gols_fora === null || palpite.gols_fora === '') {
          continue;
        }

        const placarUsuario = { 
          casa: Number(palpite.gols_casa), 
          fora: Number(palpite.gols_fora) 
        }

        const pontosGanhos = calcularPontosPartida(placarUsuario, placarReal)

        if (rankingBoloes[palpite.bolao_id] !== undefined) {
          rankingBoloes[palpite.bolao_id] += pontosGanhos
        }

        palpitesAtualizados.push({
          ...palpite,
          pontos: pontosGanhos
        })
      }
    }

    // ========================================================================
    // 4. O CÁLCULO - ETAPA B: COLOCAÇÃO DE GRUPOS (3 PTS POR ACERTO)
    // ========================================================================
    const mapaTimesColocacao = new Map<number, number>()
    timesCopa.forEach(t => {
      if (t.colocacao !== null && t.colocacao !== undefined) {
        mapaTimesColocacao.set(Number(t.id), Number(t.colocacao))
      }
    })

    for (const palpite of palpitesGrupos) {
      const colocacaoReal = mapaTimesColocacao.get(Number(palpite.time_id))
      let pontosGanhos = 0

      if (colocacaoReal !== undefined) {
        pontosGanhos = Number(palpite.posicao) === colocacaoReal ? 3 : 0
      }

      if (rankingBoloes[palpite.bolao_id] !== undefined) {
        rankingBoloes[palpite.bolao_id] += pontosGanhos
      }

      updatesGrupos.push({
        ...palpite,
        pontos: pontosGanhos
      })
    }

    // ========================================================================
    // 4. O CÁLCULO - ETAPA C: SELEÇÕES CLASSIFICADAS PARA O MATA-MATA (LAST_32)
    // Regra: 1 pt por acerto + bônus de 8 pts se gabaritar as 32 seleções
    // ========================================================================
    const jogosLAST32 = todasPartidas.filter(p => p.fase === 'LAST_32')
    const nomesOficiaisLAST32 = new Set<string>()

    jogosLAST32.forEach(j => {
      if (j.time_casa && j.time_casa !== 'A Definir' && j.time_casa !== 'TBD') nomesOficiaisLAST32.add(j.time_casa)
      if (j.time_fora && j.time_fora !== 'A Definir' && j.time_fora !== 'TBD') nomesOficiaisLAST32.add(j.time_fora)
    })

    const idsOficiaisLAST32 = new Set(
      timesCopa
        .filter(t => nomesOficiaisLAST32.has(t.nome))
        .map(t => Number(t.id))
    )

    for (const bolao of boloes) {
      const palpitesDesteBolao = palpitesMata.filter(p => p.bolao_id === bolao.id)
      
      let totalAcertos = 0
      palpitesDesteBolao.forEach(p => {
        if (idsOficiaisLAST32.has(Number(p.time_id))) {
          totalAcertos++
        }
      })

      const gabaritou = (totalAcertos === 32)
      const bonusGabarito = gabaritou ? 8 : 0

      palpitesDesteBolao.forEach((p, idx) => {
        const acertou = idsOficiaisLAST32.has(Number(p.time_id))
        let pontosDestePalpite = acertou ? 1 : 0

        // Atribui o bônus de +8 na primeira linha de palpite caso tenha acertado todas as 32
        if (acertou && idx === 0 && gabaritou) {
          pontosDestePalpite += bonusGabarito
        }

        if (rankingBoloes[bolao.id] !== undefined) {
          rankingBoloes[bolao.id] += pontosDestePalpite
        }

        updatesMata.push({
          ...p,
          pontos: pontosDestePalpite
        })
      })
    }

    // ========================================================================
    // 5. ATUALIZA O BANCO DE DADOS EM LOTE (UPSERT)
    // ========================================================================
    
    // A. Atualiza palpites de jogos
    if (palpitesAtualizados.length > 0) {
      const { error: erroPalpites } = await supabaseAdmin
        .from('palpites_jogos')
        .upsert(palpitesAtualizados, { onConflict: 'id' })
        
      if (erroPalpites) throw new Error(`Erro ao atualizar palpites_jogos: ${erroPalpites.message}`)
    }

    // B. Atualiza palpites de posições de grupos
    if (updatesGrupos.length > 0) {
      const { error: erroGrupos } = await supabaseAdmin
        .from('palpites_grupos')
        .upsert(updatesGrupos, { onConflict: 'id' })

      if (erroGrupos) throw new Error(`Erro ao atualizar palpites_grupos: ${erroGrupos.message}`)
    }

    // C. Atualiza palpites de classificados do mata-mata
    if (updatesMata.length > 0) {
      const { error: erroMata } = await supabaseAdmin
        .from('palpites_matamata')
        .upsert(updatesMata, { onConflict: 'id' })

      if (erroMata) throw new Error(`Erro ao atualizar palpites_matamata: ${erroMata.message}`)
    }

    // D. Atualiza a pontuação total consolidada no Ranking de cada Bolão
    const boloesParaAtualizar = boloes.map(b => ({
      ...b,
      pontuacao_total: rankingBoloes[b.id] || 0
    }))

    if (boloesParaAtualizar.length > 0) {
      const { error: erroBoloes } = await supabaseAdmin
        .from('boloes')
        .upsert(boloesParaAtualizar, { onConflict: 'id' })
        
      if (erroBoloes) throw new Error(`Erro ao atualizar ranking dos bolões: ${erroBoloes.message}`)
    }

    return NextResponse.json({ 
      success: true, 
      message: `Pontuação processada com sucesso! ${partidasFT.length} jogo(s) encerrado(s) avaliado(s).` 
    })

  } catch (err: any) {
    console.error("Erro ao calcular pontos", err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
