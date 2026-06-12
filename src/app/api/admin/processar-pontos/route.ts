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

    // 3. Busca todos os palpites do sistema
    const todosPalpites = await buscarTodosOsRegistros('palpites_jogos')

    // Arrays para guardar as atualizações que enviaremos em lote pro banco
    const palpitesAtualizados = []
    const rankingBoloes: Record<string, number> = {} // Dicionário para somar os pontos de cada bolão

    // Inicializa todos os bolões com zero para a contagem
    boloes.forEach(b => rankingBoloes[b.id] = 0)

    // ========================================================================
    // 4. O CÁLCULO
    // ========================================================================
    for (const jogo of partidasFT) {
      // Placar real cravado na tabela de partidas (convertido para número por segurança)
      const placarReal = { 
        casa: Number(jogo.gols_casa), 
        fora: Number(jogo.gols_fora) 
      }

      // Filtra os palpites que pertencem exclusivamente a este jogo
      const palpitesDesteJogo = todosPalpites.filter(p => 
        p.partida_id === jogo.fixture_id || p.partida_id?.toString() === jogo.id?.toString()
      )

      for (const palpite of palpitesDesteJogo) {
        // Ignora caso o usuário tenha deixado o placar em branco
        if (palpite.gols_casa === null || palpite.gols_casa === '' || palpite.gols_fora === null || palpite.gols_fora === '') {
          continue;
        }

        const placarUsuario = { 
          casa: Number(palpite.gols_casa), 
          fora: Number(palpite.gols_fora) 
        }

        // CHAMA A SUA ENGINE DE PONTUAÇÃO
        const pontosGanhos = calcularPontosPartida(placarUsuario, placarReal)

        // Acumula o ponto ganho na carteira do Bolão correspondente
        if (rankingBoloes[palpite.bolao_id] !== undefined) {
          rankingBoloes[palpite.bolao_id] += pontosGanhos
        }

        // Guarda o palpite com o novo campo "pontos" para dar o Update no banco
        palpitesAtualizados.push({
          ...palpite, // Mantém id, bolao_id, partida_id, etc...
          pontos: pontosGanhos
        })
      }
    }

    // ========================================================================
    // 5. ATUALIZA O BANCO DE DADOS EM LOTE (UPSERT)
    // ========================================================================
    
    // Atualiza os pontos individuais de cada palpite
    if (palpitesAtualizados.length > 0) {
      const { error: erroPalpites } = await supabaseAdmin
        .from('palpites_jogos')
        .upsert(palpitesAtualizados, { onConflict: 'id' }) // Sobrescreve apenas as linhas existentes pelo ID
        
      if (erroPalpites) throw new Error(`Erro ao atualizar palpites: ${erroPalpites.message}`)
    }

    // Atualiza a pontuação total do Ranking de cada Bolão
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
