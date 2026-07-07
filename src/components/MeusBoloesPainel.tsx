
'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@/utils/supabase/client'
import { useRouter } from 'next/navigation'

interface Bolao {
  id: string
  nome: string
  pontuacao_total: number
}

interface Partida {
  id: string
  fixture_id: number
  time_casa: string
  time_fora: string
  bandeira_casa: string
  bandeira_fora: string
  data_hora: string
  fase: string
  status: string
  gols_casa: number
  gols_fora: number
}

interface TimeCopa {
  id: number
  nome: string
  bandeira: string
  grupo: string
}

interface Jogador {
  id: number
  nome: string
  time_id: number
  posicao: string
}

export default function setMeusBoloesPainel({ partidas1f, partidas2f, times, jogadores, username, listaRanking }: { partidas1f: Partida[], partidas2f: Partida[], times: TimeCopa[], jogadores: Jogador[], username: string, listaRanking: any[] }) {
  const router = useRouter()
  const supabase = createClient()
  const [isLoading, setIsLoading] = useState(true)
  const [isInscricoesEncerradas, setIsInscricoesEncerradas] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [boloes, setBoloes] = useState<Bolao[]>([])
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [bolaoAtivo, setBolaoAtivo] = useState<Bolao | null>(null)
  const [abaAtiva, setAbaAtiva] = useState('1a_fase')
  const [palpitesGrupos, setPalpitesGrupos] = useState<Record<string, Record<number, { posicao: string, pontos: number }>>>({})
  const [palpites1aFase, setPalpites1aFase] = useState<Record<string, Record<string, { casa: string, fora: string, pontos: string }>>>({})
  const [palpites2aFase, setPalpites2aFase] = useState<Record<string, Record<string, { casa: string, fora: string, pontos: string }>>>({})
  const [palpitesMataMata, setPalpitesMataMata] = useState<Record<string, {
    r32: Record<number, string>;
    r16: Record<number, string>;
    qf: Record<number, string>;
    sf: Record<number, string>;
    campeao: string;
    vice: string;
  }>>({})
  const [palpitesPremios, setPalpitesPremios] = useState<Record<string, {
    bolaDeOuro: { timeId: string, jogador: string };
    chuteiraDeOuro: { timeId: string, jogador: string };
    luvaDeOuro: { timeId: string, jogador: string };
  }>>({})

  useEffect(() => {
    const DATA_LIMITE = new Date('2026-06-11T16:00:00-03:00')
    
    const checarPrazo = () => {
      if (new Date() >= DATA_LIMITE) {
        setIsInscricoesEncerradas(true)
      }
    }

    checarPrazo()
    const interval = setInterval(checarPrazo, 1000)
    
    // O return (cleanup) SEMPRE deve ser a última instrução de um useEffect
    return () => clearInterval(interval)
  }, []) // Array vazio: roda apenas 1 vez quando a tela abre

  const verificarBloqueioPartida = (dataHoraPartida: string) => {
    // Se a partida não tem data (ex: 'TBD'), bloqueia por segurança
    if (!dataHoraPartida || dataHoraPartida === 'TBD') return true;

    const horaJogo = new Date(dataHoraPartida).getTime();
    const horaAtual = new Date().getTime();
    
    // Retorna TRUE se faltar menos de 30 minutos (1800000 ms) ou se já passou
    return (horaJogo - horaAtual) <= 1800000;
  }


  // =========================================================
  // EFFECT 2: Carregamento dos Dados do Supabase
  // =========================================================

  useEffect(() => {
    const carregarDadosSalvos = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      
      if (!user) {
        setIsLoading(false) // Desliga se não estiver logado
        return 
      }

      try {
        // 1. Busca APENAS os Bolões do usuário logado
        const { data: boloesDB } = await supabase
          .from('boloes')
          .select('*')
          .eq('user_id', user.id) // <-- O FILTRO SALVADOR AQUI

        if (boloesDB) {
          setBoloes(boloesDB)
        }
        
        // Se o usuário ainda não tem bolões, podemos encerrar a busca aqui e poupar o banco
        if (!boloesDB || boloesDB.length === 0) {
          return // O bloco 'finally' vai rodar e desligar o loading mesmo com esse return!
        }

        // Extrai a lista de IDs dos bolões para filtrar as tabelas pesadas de palpites
        const meusBoloesIds = boloesDB.map(b => b.id)

        // 2. Busca apenas os palpites atrelados aos bolões deste usuário
        const [resJogos, resGrupos, resMata, resPremios] = await Promise.all([
          supabase.from('palpites_jogos').select('*').in('bolao_id', meusBoloesIds),
          supabase.from('palpites_grupos').select('*').in('bolao_id', meusBoloesIds),
          supabase.from('palpites_matamata').select('*').in('bolao_id', meusBoloesIds),
          supabase.from('palpites_premios').select('*').in('bolao_id', meusBoloesIds)
        ])

        // A) Jogos 
        const rec1aFase: Record<string, Record<string, { casa: string, fora: string, pontos: string }>> = {}
        const rec2aFase: Record<string, Record<string, { casa: string, fora: string, pontos: string }>> = {}
        const todasAsPartidas = [...partidas1f, ...partidas2f] // Junta as duas props
        
        resJogos.data?.forEach(p => {
          // O banco salva o fixture_id (número), precisamos achar o ID original (UUID)
          const jogoOriginal = todasAsPartidas.find(j => j.fixture_id === p.partida_id)
          
          if (jogoOriginal) {
            const is1aFase = partidas1f.some(j => j.id === jogoOriginal.id)
            const target = is1aFase ? rec1aFase : rec2aFase
            
            if (!target[p.bolao_id]) target[p.bolao_id] = {}
            target[p.bolao_id][jogoOriginal.id] = { casa: p.gols_casa.toString(), fora: p.gols_fora.toString(), pontos: p.pontos.toString() }
          }
        })
        setPalpites1aFase(rec1aFase)
        setPalpites2aFase(rec2aFase)

        // B) Grupos
        const recGrupos: Record<string, Record<number, { posicao: string, pontos: number }>> = {}
        resGrupos.data?.forEach(p => {
          if (!recGrupos[p.bolao_id]) recGrupos[p.bolao_id] = {}
          
          // Agora salvamos um objeto contendo a posição e os pontos calculados pelo banco
          recGrupos[p.bolao_id][p.time_id] = {
            posicao: p.posicao.toString(),
            pontos: Number(p.pontos) || 0
          }
        })
        
        // Mantivemos o nome setPalpitesGrupos (se você criou outro state, troque o nome aqui)
        setPalpitesGrupos(recGrupos) 

        // C) Mata-Mata
        const recMata: any = {}
        resMata.data?.forEach(p => {
          if (!recMata[p.bolao_id]) {
            recMata[p.bolao_id] = { r32: {}, r16: {}, qf: {}, sf: {}, campeao: '', vice: '' }
          }
          
          const objSalvo = {
            timeId: p.time_id.toString(),
            pontos: Number(p.pontos) || 0
          }

          if (p.fase === 'campeao' || p.fase === 'vice') {
            recMata[p.bolao_id][p.fase] = objSalvo
          } else {
            recMata[p.bolao_id][p.fase][p.posicao_index] = objSalvo
          }
        })
        setPalpitesMataMata(recMata) 

        // D) Prêmios (Fazemos a engenharia reversa para achar o NOME do jogador pelo ID)
        const recPremios: any = {}
        resPremios.data?.forEach(p => {
          if (!recPremios[p.bolao_id]) {
            recPremios[p.bolao_id] = {
              bolaDeOuro: { timeId: '', jogador: '' },
              chuteiraDeOuro: { timeId: '', jogador: '' },
              luvaDeOuro: { timeId: '', jogador: '' }
            }
          }
          const jogador = jogadores.find(j => j.id === p.jogador_id)
          if (jogador) {
            recPremios[p.bolao_id][p.premio] = { timeId: p.time_id.toString(), jogador: jogador.nome }
          }
        })
        setPalpitesPremios(recPremios)

      } catch (error) {
        console.error("Erro ao carregar dados salvos da nuvem:", error)
      } finally {
        setIsLoading(false) // <-- DESLIGA A ANIMAÇÃO DE LOADING AQUI, INDEPENDENTE DE SUCESSO OU ERRO
      }
    }

    carregarDadosSalvos()
  }, [partidas1f, jogadores])
  
   const handleSalvarBolao = async () => {
    if (!bolaoAtivo) return
    setIsSaving(true)

    try {
      const bolaoId = bolaoAtivo.id

      // ==========================================
      // 0. SALVAR O BOLÃO PAI PRIMEIRO
      // ==========================================
      const { data: { user } } = await supabase.auth.getUser()
      
      if (!user) {
        alert('Você precisa estar logado para salvar.')
        setIsSaving(false)
        return
      }

      const { error: erroBolao } = await supabase
        .from('boloes')
        .upsert({
          id: bolaoId,
          user_id: user.id,
          nome: bolaoAtivo.nome
        })

      if (erroBolao) throw erroBolao

      // ==========================================
      // 1. PREPARANDO OS JOGOS (Trava Inteligente)
      // ==========================================
      const p1 = palpites1aFase[bolaoId] || {}
      const p2 = palpites2aFase[bolaoId] || {}
      const jogosParaSalvar: any[] = []
      const todasAsPartidas = [...partidas1f, ...partidas2f]
      
      // MÁGICA: Descobre EXATAMENTE quais jogos estão desbloqueados agora
      const partidasDesbloqueadasIds = todasAsPartidas
        .filter(j => !verificarBloqueioPartida(j.data_hora))
        .map(j => j.fixture_id)

      ;[...Object.entries(p1), ...Object.entries(p2)].forEach(([partidaId, placar]) => {
        if (placar.casa !== '' && placar.fora !== '') {
          const jogoOriginal = todasAsPartidas.find(j => j.id === partidaId)
          
          // SÓ INCLUI NA LISTA DE SALVAMENTO SE ESTIVER DESBLOQUEADO
          if (jogoOriginal && partidasDesbloqueadasIds.includes(jogoOriginal.fixture_id)) {
            jogosParaSalvar.push({
              bolao_id: bolaoId,
              partida_id: jogoOriginal.fixture_id, 
              gols_casa: parseInt(placar.casa),
              gols_fora: parseInt(placar.fora)
            })
          }
        }
      })

      // ==========================================
      // 2. EXECUTANDO NO SUPABASE (COM PROTEÇÃO DE HISTÓRICO)
      // ==========================================

      // A) ATUALIZA APENAS OS JOGOS LIBERADOS
      if (partidasDesbloqueadasIds.length > 0) {
        // Deleta APENAS os jogos desbloqueados (mantém o histórico antigo intacto e seguro!)
        await supabase
          .from('palpites_jogos')
          .delete()
          .eq('bolao_id', bolaoId)
          .in('partida_id', partidasDesbloqueadasIds)
          .throwOnError()

        // Insere os novos palpites apenas desses jogos abertos
        if (jogosParaSalvar.length > 0) {
          await supabase.from('palpites_jogos').insert(jogosParaSalvar).throwOnError()
        }
      }

      // B) ATUALIZA AS OUTRAS ABAS (SÓ SE AS INSCRIÇÕES GLOBAIS AINDA ESTIVEREM ABERTAS)
      // Como o prazo (11/06) já passou, este bloco será ignorado e não vai mexer em nada!
      if (!isInscricoesEncerradas) {
        // Classificação dos Grupos
        const pGrupos = palpitesGrupos[bolaoId] || {}
        const gruposParaSalvar = Object.entries(pGrupos)
          .filter(([_, item]) => {
            const pos = typeof item === 'string' ? item : item?.posicao;
            return pos !== undefined && pos !== '';
          })
          .map(([timeId, item]) => {
            const pos = typeof item === 'string' ? item : item?.posicao;
            return {
              bolao_id: bolaoId, 
              time_id: parseInt(timeId), 
              posicao: parseInt(pos as string)
            }
          }) 

        // Mata-Mata
        const pMata = palpitesMataMata[bolaoId] || { r32: {}, r16: {}, qf: {}, sf: {}, campeao: '', vice: '' }
        const mataMataParaSalvar: any[] = []
        const fasesArr = ['r32', 'r16', 'qf', 'sf'] as const
        
        fasesArr.forEach(fase => {
          Object.entries(pMata[fase]).forEach(([index, timeId]) => {
            if (timeId) mataMataParaSalvar.push({ bolao_id: bolaoId, fase: fase, posicao_index: parseInt(index), time_id: parseInt(timeId) })
          })
        })
        if (pMata.campeao) mataMataParaSalvar.push({ bolao_id: bolaoId, fase: 'campeao', posicao_index: 0, time_id: parseInt(pMata.campeao) })
        if (pMata.vice) mataMataParaSalvar.push({ bolao_id: bolaoId, fase: 'vice', posicao_index: 0, time_id: parseInt(pMata.vice) })

        // Prêmios Individuais
        const pPremios = palpitesPremios[bolaoId] || {}
        const premiosParaSalvar: any[] = []
        const chavesPremios = ['bolaDeOuro', 'chuteiraDeOuro', 'luvaDeOuro'] as const
        
        chavesPremios.forEach(premio => {
          const p = pPremios[premio]
          if (p && p.timeId && p.jogador) {
            const jogadorObj = jogadores.find(j => j.nome === p.jogador && j.time_id.toString() === p.timeId)
            if (jogadorObj) {
              premiosParaSalvar.push({ bolao_id: bolaoId, premio: premio, time_id: parseInt(p.timeId), jogador_id: jogadorObj.id })
            }
          }
        })

        // Deleta os antigos e insere os novos
        await Promise.all([
          supabase.from('palpites_grupos').delete().eq('bolao_id', bolaoId).throwOnError(),
          supabase.from('palpites_matamata').delete().eq('bolao_id', bolaoId).throwOnError(),
          supabase.from('palpites_premios').delete().eq('bolao_id', bolaoId).throwOnError()
        ])

        const promessasInsertExtra: any[] = []
        if (gruposParaSalvar.length > 0) promessasInsertExtra.push(supabase.from('palpites_grupos').insert(gruposParaSalvar).throwOnError())
        if (mataMataParaSalvar.length > 0) promessasInsertExtra.push(supabase.from('palpites_matamata').insert(mataMataParaSalvar).throwOnError())
        if (premiosParaSalvar.length > 0) promessasInsertExtra.push(supabase.from('palpites_premios').insert(premiosParaSalvar).throwOnError())
        
        await Promise.all(promessasInsertExtra)
      }

      // Fecha o Modal e reseta o bolão ativo
      setBolaoAtivo(null) 
      
    } catch (error) {
      console.error("Erro ao salvar bolão:", error)
      alert('Ops! Tivemos um erro ao salvar seus palpites. Tente novamente.')
    } finally {
      setIsSaving(false)
    }
  } 

  const handleFecharBolao = async () => {
    setBolaoAtivo(null)
  }
  
 // NOVA FUNÇÃO ATUALIZADA: Criar Bolão
  const handleCriarBolao = async () => {
    // Pega o usuário para poder salvar no banco
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return alert('Faça login para criar um bolão.')

    const numerosUtilizados = boloes.map(b => {
      const match = b.nome.match(/BOLÃO (\d+)/)
      return match ? parseInt(match[1]) : 0
    })

    let proximoNumero = 1
    while (numerosUtilizados.includes(proximoNumero)) {
      proximoNumero++
    }

    // Objeto completo para o banco de dados
    const novoBolaoDB = {
      id: crypto.randomUUID(), 
      nome: `BOLÃO ${proximoNumero}`,
      user_id: user.id,
      pontuacao_total: 0
    }

    try {
      // 1. Salva no Supabase na mesma hora
      const { error } = await supabase.from('boloes').insert(novoBolaoDB)
      if (error) throw error

      // 2. Atualiza a tela local (Omitindo o user_id para respeitar sua Interface)
      const novoBolaoLocal: Bolao = { id: novoBolaoDB.id, nome: novoBolaoDB.nome, pontuacao_total: novoBolaoDB.pontuacao_total }
      setBoloes([...boloes, novoBolaoLocal])

      // 3. A MÁGICA: Manda o page.tsx atualizar o preço sem dar F5!
      router.refresh()
      
    } catch (error) {
      console.error("Erro ao criar bolão no banco:", error)
      alert('Ops! Tivemos um erro ao criar o bolão.')
    }
  } 

const handleAbrirBolao = (bolao: Bolao) => {
    setBolaoAtivo(bolao)
    setAbaAtiva('1a_fase') 
    setIsModalOpen(true)
  }

  // NOVA FUNÇÃO: Editar Nome do Bolão
  const handleEditarBolao = (id: string, nomeAtual: string) => {
    const novoNome = window.prompt('Renomear bolão:', nomeAtual)
    if (novoNome && novoNome.trim() !== '') {
      setBoloes(boloes.map(b => b.id === id ? { ...b, nome: novoNome.trim() } : b))
      // Atualiza o bolão ativo também caso o modal esteja aberto
      if (bolaoAtivo?.id === id) {
        setBolaoAtivo({ ...bolaoAtivo, nome: novoNome.trim() })
      }
    }
  }

 // NOVA FUNÇÃO: Excluir Bolão (Agora integrada com o Supabase)
  const handleExcluirBolao = async (id: string) => {
    const confirmacao = window.confirm('Tem certeza que deseja excluir este bolão? Todos os palpites salvos nele serão perdidos para sempre.')
    
    if (confirmacao) {
      try {
        // 1. Manda o Supabase deletar no banco de dados
        const { error } = await supabase
          .from('boloes')
          .delete()
          .eq('id', id)

        if (error) throw error

        // 2. Se o banco deletou com sucesso, nós removemos da tela instantaneamente
        setBoloes(boloes.filter(b => b.id !== id))
        
        // Se o bolão excluído era o que estava aberto no momento, fecha o modal
        if (bolaoAtivo?.id === id) {
          setBolaoAtivo(null)
          setIsModalOpen(false)
        }

        router.refresh()

      } catch (error) {
        console.error("Erro ao excluir bolão do banco:", error)
        alert('Ops! Tivemos um problema de conexão ao excluir o bolão. Tente novamente.')
      }
    }
  } 

  const handlePremioChange = (premio: 'bolaDeOuro' | 'chuteiraDeOuro' | 'luvaDeOuro', campo: 'timeId' | 'jogador', valor: string) => {
    if (!bolaoAtivo) return

    setPalpitesPremios(prev => {
      // Puxa o estado atual deste bolão (ou cria um zerado)
      const bolao = prev[bolaoAtivo.id] || {
        bolaDeOuro: { timeId: '', jogador: '' },
        chuteiraDeOuro: { timeId: '', jogador: '' },
        luvaDeOuro: { timeId: '', jogador: '' }
      }

      return {
        ...prev,
        [bolaoAtivo.id]: {
          ...bolao,
          [premio]: {
            ...bolao[premio],
            [campo]: valor
          }
        }
      }
    })
  }

  const handleMataMataChange = (fase: 'r32' | 'r16' | 'qf' | 'sf' | 'campeao' | 'vice', index: number, timeId: string) => {
    if (!bolaoAtivo) return

    setPalpitesMataMata(prev => {
      // Puxa o estado atual deste bolão (ou cria um vazio)
      const bolao = prev[bolaoAtivo.id] || { r32: {}, r16: {}, qf: {}, sf: {}, campeao: '', vice: '' }
      const newState = { ...bolao }

      // Atualiza o valor que o usuário acabou de selecionar
      if (fase === 'campeao' || fase === 'vice') {
        newState[fase] = timeId
      } else {
        newState[fase] = { ...newState[fase] }
        if (!timeId) delete newState[fase][index]
        else newState[fase][index] = timeId
      }

      // ==== MÁGICA DA LIMPEZA EM CASCATA ====
      // Pega todos os times que estão válidos nos 16-avos e deleta das Oitavas quem não estiver nessa lista
      const validsR32 = Object.values(newState.r32)
      Object.keys(newState.r16).forEach(k => { if (!validsR32.includes(newState.r16[Number(k)])) delete newState.r16[Number(k)] })

      // Mesmo processo para Oitavas -> Quartas
      const validsR16 = Object.values(newState.r16)
      Object.keys(newState.qf).forEach(k => { if (!validsR16.includes(newState.qf[Number(k)])) delete newState.qf[Number(k)] })

      // Quartas -> Semis
      const validsQf = Object.values(newState.qf)
      Object.keys(newState.sf).forEach(k => { if (!validsQf.includes(newState.sf[Number(k)])) delete newState.sf[Number(k)] })

      // Semis -> Finalistas
      const validsSf = Object.values(newState.sf)
      if (!validsSf.includes(newState.campeao)) newState.campeao = ''
      if (!validsSf.includes(newState.vice)) newState.vice = ''

      return { ...prev, [bolaoAtivo.id]: newState }
    })
  }

  const handlePosicaoChange = (timeId: number, posicao: string) => {
    if (!bolaoAtivo) return // Trava de segurança

    setPalpitesGrupos(prev => {
      const palpitesDoBolao = prev[bolaoAtivo.id] || {}

      // Se o usuário selecionou o tracinho "-", deleta o palpite daquele time
      if (!posicao) {
        const { [timeId]: _, ...resto } = palpitesDoBolao
        return {
          ...prev,
          [bolaoAtivo.id]: resto
        }
      }

      // Pega os pontos que já estavam lá (ou zera se for palpite novo) e atualiza a posição
      const palpiteAnterior = palpitesDoBolao[timeId] || { posicao: '', pontos: 0 }

      return {
        ...prev,
        [bolaoAtivo.id]: {
          ...palpitesDoBolao,
          [timeId]: {
            ...palpiteAnterior,
            posicao: posicao
          }
        }
      }
    }) 
  }

  const handlePalpite2aFase = (partidaId: string, time: 'casa' | 'fora', valor: string) => {
    if (!bolaoAtivo) return
    const apenasNumeros = valor.replace(/\D/g, '')

    setPalpites2aFase(prev => {
      const palpitesDoBolao = prev[bolaoAtivo.id] || {}
      const palpitePartida = palpitesDoBolao[partidaId] || { casa: '', fora: '' }

      return {
        ...prev,
        [bolaoAtivo.id]: {
          ...palpitesDoBolao,
          [partidaId]: { ...palpitePartida, [time]: apenasNumeros }
        }
      }
    })
  }

  const handlePalpite1aFase = (partidaId: string, time: 'casa' | 'fora', valor: string) => {
    if (!bolaoAtivo) return
    
    const apenasNumeros = valor.replace(/\D/g, '')

    setPalpites1aFase(prev => {
      const palpitesDoBolao = prev[bolaoAtivo.id] || {}
      const palpitePartida = palpitesDoBolao[partidaId] || { casa: '', fora: '' }

      return {
        ...prev,
        [bolaoAtivo.id]: {
          ...palpitesDoBolao,
          [partidaId]: {
            ...palpitePartida,
            [time]: apenasNumeros
          }
        }
      }
    })
  }

  const formatarData = (dataIso: string) => {
    const dataObj = new Date(dataIso)
    const diaMes = dataObj.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })
    const hora = dataObj.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }).replace(':', 'h')
    return { diaMes, hora }
  }

  // =======================================================================
  // VERIFICAÇÃO DE STATUS DO BOLÃO (100% PREENCHIDO OU PENDENTE)
  // =======================================================================
  const verificarBolaoCompleto = (bolaoId: string) => {
    // Previne falsos positivos enquanto a tela ainda está carregando do banco
    if (partidas1f.length === 0 || times.length === 0) return false

    // Cria uma lista com os nomes oficiais dos países (ex: ['Brasil', 'Alemanha', ...])
    const nomesDosPaises = times.map(t => t.nome)

    // Filtra a 2ª Fase: O jogo SÓ é exigido se os dois times já forem países definidos
    const partidas2fDefinidas = partidas2f.filter(p => 
      nomesDosPaises.includes(p.time_casa) && nomesDosPaises.includes(p.time_fora)
    )

    // 1. Verifica Partidas (1ª Fase Inteira + 2ª Fase Definida)
    const p1 = palpites1aFase[bolaoId] || {}
    const p2 = palpites2aFase[bolaoId] || {}
    
    const totalPartidasExigidas = partidas1f.length + partidas2fDefinidas.length
    let partidasPreenchidas = 0
    
    // Conta os palpites da 1ª Fase
    partidas1f.forEach(p => {
      const palpite = p1[p.id]
      if (palpite && palpite.casa !== '' && palpite.fora !== '') partidasPreenchidas++
    })

    // Conta os palpites APENAS das partidas válidas da 2ª Fase
    partidas2fDefinidas.forEach(p => {
      const palpite = p2[p.id]
      if (palpite && palpite.casa !== '' && palpite.fora !== '') partidasPreenchidas++
    })

    // Se a soma dos palpites preenchidos for menor que o exigido, barra a tag verde
    if (partidasPreenchidas < totalPartidasExigidas) return false

    // 2. Verifica Grupos (Todos os times devem ter posição)
    const pGrupos = palpitesGrupos[bolaoId] || {}
    const gruposPreenchidos = Object.values(pGrupos).filter(item => item && item.posicao !== '').length
    if (gruposPreenchidos < times.length) return false

    // 3. Verifica Mata-Mata (Funil completo)
    const pMata = palpitesMataMata[bolaoId] || { r32: {}, r16: {}, qf: {}, sf: {}, campeao: '', vice: '' }
    const r32Count = Object.values(pMata.r32 || {}).filter(v => v !== '').length
    const r16Count = Object.values(pMata.r16 || {}).filter(v => v !== '').length
    const qfCount = Object.values(pMata.qf || {}).filter(v => v !== '').length
    const sfCount = Object.values(pMata.sf || {}).filter(v => v !== '').length
    
    if (r32Count < 32 || r16Count < 16 || qfCount < 8 || sfCount < 4 || !pMata.campeao || !pMata.vice) return false

    // 4. Verifica Prêmios
    const pPremios = palpitesPremios[bolaoId] || {}
    if (!pPremios.bolaDeOuro?.jogador || !pPremios.chuteiraDeOuro?.jogador || !pPremios.luvaDeOuro?.jogador) return false

    // Se o código sobreviveu a todos os 'return false' acima, a cartela está perfeita!
    return true
  }

  return (
    <>
      <div className="bg-white/[0.02] border border-emerald-600 rounded-3xl p-6 backdrop-blur-xl md:col-span-2 flex flex-col justify-between group transition-all">
        <div>
          <div className="flex justify-between items-start mb-4">
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <span></span> Meus Bolões
            </h2>
            <span className="text-[10px] font-bold bg-teal-500/10 text-teal-400 px-2.5 py-1 rounded-full uppercase tracking-wider">
              {boloes.length} Ativos
            </span>
          </div>

          <div className="grid gap-3 my-4 sm:grid-cols-2 min-h-[120px]">
            {isLoading ? (
              // -----------------------------------
              // ANIMAÇÃO DE LOADING (Spinner Premium)
              // -----------------------------------
              // col-span-1 sm:col-span-2 faz o loading ocupar a tela toda, não só meia coluna
              <div className="col-span-1 sm:col-span-2 flex flex-col items-center justify-center py-12 space-y-4 bg-black/20 rounded-2xl border border-white/5">
                <div className="relative flex justify-center items-center">
                  <div className="w-10 h-10 border-4 border-teal-500/20 rounded-full absolute"></div>
                  <div className="w-10 h-10 border-4 border-teal-500 border-t-transparent rounded-full animate-spin"></div>
                </div>
                <span className="text-xs font-black text-teal-400/70 uppercase tracking-widest animate-pulse">
                  Sincronizando Dados...
                </span>
              </div>
            ) : (
              // -----------------------------------
              // LISTA DE BOLÕES CARREGADA
              // -----------------------------------
              <>
                {/* O MAP entra AQUI, depois de confirmar que já carregou */}
                {boloes.map((bolao) => {
                  const isCompleto = verificarBolaoCompleto(bolao.id)

                  return (
                    <div 
                      key={bolao.id} 
                      className="max-h-[60px] flex items-center justify-between p-2 sm:p-3 pl-3 sm:pl-4 bg-white/5 border border-white/10 rounded-xl hover:bg-gradient-to-br from-teal-900/30 to-emerald-900/10 hover:border-teal-500/30 transition-all group/item"
                    >
                      {/* Área do Nome do Bolão */}
                      <button
                        onClick={() => handleAbrirBolao(bolao)}
                        className="flex-1 text-left outline-none truncate mr-2"
                      >
                        <span className="truncate text-emerald-400 hover:text-emerald-300 font-bold text-sm min-[400px]:text-base sm:text-lg md:text-xl transition-all">
                          {bolao.nome} ▸
                        </span>
                      </button>

                      {/* Grupo de Ações (Tag + Lixeira) */}
                      <div className="flex items-center gap-2 sm:gap-3 shrink-0">
                        {/* TAG DE STATUS VISUAL */}
                        {isCompleto ? (
                          <span className="inline-flex items-center gap-1 px-2 sm:px-3 py-1 rounded-full text-[8px] min-[400px]:text-[9px] sm:text-[10px] font-black uppercase tracking-widest bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 shadow-[0_0_15px_rgba(16,185,129,0.15)] whitespace-nowrap">
                            <span className="text-[10px] sm:text-xs">✓</span> Completo
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 sm:px-3 py-1 rounded-full text-[8px] min-[400px]:text-[9px] sm:text-[10px] font-black uppercase tracking-widest bg-amber-500/10 text-amber-400 border border-amber-500/20 shadow-[0_0_10px_rgba(245,158,11,0.1)] whitespace-nowrap">
                            <span className="text-[10px] sm:text-xs">⚠️</span> Faltam Palpites
                          </span>
                        )}
                        
                        {isInscricoesEncerradas ? (
                          <></>
                        ) : (
                          <button
                            onClick={() => handleExcluirBolao(bolao.id)}
                            title="Excluir"
                            className="p-1.5 sm:p-2 text-gray-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors shrink-0"
                          >
                            <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        )}
                      </div>
                    </div>
                  )
                })}

                {/* Mensagem caso não tenha bolões - Ocupa as duas colunas do grid */}
                {boloes.length === 0 && (
                  <div className="col-span-1 sm:col-span-2 text-center text-sm text-gray-500 py-6">
                    Você ainda não tem nenhum bolão.
                  </div>
                )}
              </>
            )}
          </div>
        </div>

        {/* BOTÃO CRIAR BOLÃO (Renderizado fora da lista) */}
        {isInscricoesEncerradas || isLoading ? (
          <></>
        ) : (
          <button 
            onClick={handleCriarBolao}
            className="w-full sm:w-auto self-end mt-4 py-3 px-6 bg-gradient-to-r from-teal-500 to-emerald-500 hover:from-teal-400 hover:to-emerald-400 text-white font-black uppercase text-xs tracking-wider rounded-xl transition-all shadow-md transform hover:-translate-y-0.5"
          >
            + Criar Novo Bolão
          </button>
        )}
      </div>

      {/* MODAL DE PALPITES (Mantido igualzinho) */}
      {isModalOpen && bolaoAtivo && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-0 sm:p-4 bg-black/90 backdrop-blur-sm">
          <div className="bg-[#0a0a0a] border-0 sm:border border-white/10 w-full sm:max-w-4xl h-full sm:h-[85vh] flex flex-col justify-between sm:rounded-3xl shadow-2xl relative overflow-hidden">
            
            {/* CABEÇALHO DO MODAL (Corrigido para Mobile) */}
            <div className="p-4 sm:p-6 border-b border-white/5 flex justify-between items-start bg-black/40 backdrop-blur-md">
              
              {/* Coluna da Esquerda (Textos e Tags com espaço flexível) */}
              <div className="flex-1 min-w-0 pr-3 sm:pr-4">
                <span className="text-[10px] sm:text-xs font-bold uppercase tracking-[0.2em] text-teal-400 block mb-1">
                  Cartela de Palpites
                </span>
                
                {/* NOME COMPLETO: Sem truncate, quebra linha naturalmente */}
                <h3 className="text-base sm:text-xl font-black text-white uppercase leading-tight break-words">
                  {username} <span className="text-gray-500 font-bold text-sm sm:text-lg">/ {bolaoAtivo.nome}</span>
                </h3>

                {/* CONTAINER DAS TAGS: Empilhadas embaixo no mobile, lado a lado com wrap */}
                <div className="flex flex-wrap items-center gap-2 mt-3 sm:mt-3">
                  
                  {/* TAG DE PONTOS */}
                  <div className="bg-gradient-to-r from-amber-500/20 to-orange-500/20 border border-amber-500/30 text-amber-400 px-2.5 py-1 sm:py-0.5 rounded-lg text-xs sm:text-sm font-black tracking-wide flex items-center gap-1.5 shadow-[0_0_10px_rgba(245,158,11,0.1)]">
                    🏆 {bolaoAtivo.pontuacao_total || 0} pts
                  </div>
                  
                  {/* TAG DE POSIÇÃO */}
                  <div className="bg-gradient-to-r from-emerald-500/20 to-teal-500/20 border border-emerald-500/30 text-emerald-400 px-2.5 py-1 sm:py-0.5 rounded-lg text-xs sm:text-sm font-black tracking-wide flex items-center gap-1.5 shadow-[0_0_10px_rgba(16,185,129,0.1)]">
                    🏅 {listaRanking?.find(r => String(r.id) === String(bolaoAtivo.id))?.posicaoReal || '-'}º Lugar
                  </div>

                </div>
              </div> 

              {/* Botão Fechar/Salvar (Ancorado à direita, não encolhe) */}
              <button 
                onClick={handleSalvarBolao}
                disabled={isSaving}
                className={`shrink-0 px-4 py-2 sm:py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all border border-white/10 ${
                  isSaving 
                    ? 'bg-teal-500 text-white cursor-wait opacity-80' 
                    : 'bg-white/5 hover:bg-white/10 text-gray-300 hover:text-white'
                }`}
              >
              {isSaving ? (
                <span className="flex items-center gap-2">
                  <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                  Salvando...
                </span>
              ) : (
                isInscricoesEncerradas ? 'Fechar' : 'Salvar'
              )} 
              </button>
            </div> 

            <div className="flex-1 overflow-y-auto p-0 text-gray-400">
              
              {/* ======================================= */}
              {/* ABA 1A FASE (BLOQUEIA APÓS O PRAZO) */}
              {/* ======================================= */}
              {abaAtiva === '1a_fase' && (
                <div className="animate-fade-in pb-8">
                  <div className="px-3 py-4 sm:px-6 border-b border-white/5 sticky top-0 bg-[#0a0a0a] z-10 flex text-[10px] sm:text-xs font-bold uppercase tracking-widest text-gray-500">
                    <div className="w-12 sm:w-16 text-center">Data</div>
                    <div className="flex-1 text-center">Jogo</div>
                    <div className="w-12 sm:w-16 text-center">Pts</div>
                  </div>

                  <div className="flex flex-col">
                    {partidas1f.length === 0 ? (
                      <p className="p-6 text-center text-sm">Nenhuma partida agendada ainda.</p>
                    ) : (
                      partidas1f.map((jogo) => {
                        const { diaMes, hora } = formatarData(jogo.data_hora)
                        const palpite = palpites1aFase[bolaoAtivo.id]?.[jogo.id]
                        const palpiteCasa = palpite?.casa ?? ''
                        const palpiteFora = palpite?.fora ?? ''
                        const pontosGanhos = palpite?.pontos ?? 0
                        return (
                          <div key={jogo.id} className="flex items-center justify-between px-3 py-4 sm:px-6 border-b border-white/5 hover:bg-white/[0.02] transition-colors">
                            
                            <div className="w-12 sm:w-16 flex flex-col items-center justify-center text-gray-400 shrink-0">
                              <span className="text-xs sm:text-sm font-bold text-white">{diaMes}</span>
                              <span className="text-[9px] sm:text-[11px]">{hora}</span>
                            </div>

                            <div className="flex-1 flex items-center justify-center gap-1 sm:gap-6 min-w-0">
                              
                              <div className="flex flex-col items-center gap-1 w-16 sm:w-28 overflow-hidden shrink-0">
                                <img src={jogo.bandeira_casa || '/placeholder-flag.png'} alt={jogo.time_casa} className="w-6 h-6 sm:w-10 sm:h-10 rounded-full object-cover shadow-[0_0_15px_rgba(0,0,0,0.5)] border border-white/10 bg-white/5" />
                                <span className="text-[8px] sm:text-[10px] font-bold uppercase text-gray-300 text-center leading-tight truncate w-full">
                                  {jogo.time_casa}
                                </span>
                              </div>
                              <div className="flex flex-col items-center justify-center shrink-0">
                             {/* PALPITE DO USUÁRIO */}
                                <div className="flex items-center gap-1 sm:gap-4">
                                  {isInscricoesEncerradas ? (
                                    <>
                                      <div className={`w-8 h-10 sm:w-12 sm:h-14 flex items-center justify-center border rounded-lg sm:rounded-xl text-base sm:text-xl font-black shadow-inner ${jogo.status === 'FT' ? 'bg-black/80 border-white/5 text-gray-400' : 'bg-black/50 border-white/10 text-white'}`}>
                                        {palpiteCasa !== '' ? palpiteCasa : '-'}
                                      </div>
                                      <span className="text-gray-600 font-bold text-xs sm:text-sm">X</span>
                                      <div className={`w-8 h-10 sm:w-12 sm:h-14 flex items-center justify-center border rounded-lg sm:rounded-xl text-base sm:text-xl font-black shadow-inner ${jogo.status === 'FT' ? 'bg-black/80 border-white/5 text-gray-400' : 'bg-black/50 border-white/10 text-white'}`}>
                                        {palpiteFora !== '' ? palpiteFora : '-'}
                                      </div>
                                    </>
                                  ) : (
                                    <>
                                      <input 
                                        type="text" 
                                        inputMode="numeric"
                                        pattern="[0-9]*"
                                        maxLength={2}
                                        value={palpiteCasa}
                                        onChange={(e) => handlePalpite1aFase(jogo.id, 'casa', e.target.value)}
                                        className="w-8 h-10 sm:w-12 sm:h-14 p-0 bg-black border border-white/40 rounded-lg sm:rounded-xl text-center text-base sm:text-xl font-black text-white focus:outline-none focus:border-teal-400 focus:ring-1 focus:ring-teal-400 transition-all shadow-inner"
                                      />
                                      <span className="text-gray-500 font-bold text-xs sm:text-sm">X</span>
                                      <input 
                                        type="text" 
                                        inputMode="numeric"
                                        pattern="[0-9]*"
                                        maxLength={2}
                                        value={palpiteFora}
                                        onChange={(e) => handlePalpite1aFase(jogo.id, 'fora', e.target.value)}
                                        className="w-8 h-10 sm:w-12 sm:h-14 p-0 bg-black border border-white/40 rounded-lg sm:rounded-xl text-center text-base sm:text-xl font-black text-white focus:outline-none focus:border-teal-400 focus:ring-1 focus:ring-teal-400 transition-all shadow-inner"
                                      />
                                    </>
                                  )}
                                </div>

                                {/* PLACAR OFICIAL (Aparece centralizado embaixo apenas quando finalizado) */}
                                {jogo.status === 'FT' && (
                                  <div className="mt-1 sm:mt-1.5 flex flex-col items-center leading-none">
                                    <span className="font-black text-[10px] sm:text-xs text-gray-300 tracking-[0.15em]">
                                      {jogo.gols_casa} x {jogo.gols_fora}
                                    </span>
                                    <span className="text-[7px] sm:text-[8px] uppercase tracking-widest text-gray-500 mt-1">
                                      Oficial
                                    </span>
                                  </div>
                                )}

                              </div> 
                              
                              <div className="flex flex-col items-center gap-1 w-16 sm:w-28 overflow-hidden shrink-0">
                                <img src={jogo.bandeira_fora || '/placeholder-flag.png'} alt={jogo.time_fora} className="w-6 h-6 sm:w-10 sm:h-10 rounded-full object-cover shadow-[0_0_15px_rgba(0,0,0,0.5)] border border-white/10 bg-white/5" />
                                <span className="text-[8px] sm:text-[10px] font-bold uppercase text-gray-300 text-center leading-tight truncate w-full">
                                  {jogo.time_fora}
                                </span>
                              </div>

                            </div>

                            <div className="w-12 sm:w-16 flex items-center justify-center shrink-0">
                              {jogo.status === 'FT' ? (
                                // Renderiza o selo brilhante se o jogo já terminou
                                <div 
                                  className={`flex items-baseline gap-0.5 px-2 py-1 rounded border font-black text-[10px] sm:text-xs transition-colors ${
                                    pontosGanhos === '10' ? 'bg-amber-400/10 border-amber-400/30 text-amber-400 shadow-[0_0_10px_rgba(245,158,11,0.25)]' :
                                    pontosGanhos === '7'  ? 'bg-green-500/10 border-green-500/30 text-green-400 shadow-[0_0_8px_rgba(34,197,94,0.15)]' :
                                    pontosGanhos === '5'  ? 'bg-white/10 border-white/20 text-white shadow-[0_0_8px_rgba(255,255,255,0.1)]' :
                                    pontosGanhos === '2'  ? 'bg-orange-500/10 border-orange-500/30 text-orange-500 shadow-[0_0_8px_rgba(253,224,71,0.1)]' :
                                    'bg-red-500/10 border-red-500/30 text-red-500 shadow-[0_0_8px_rgba(239,68,68,0.15)]'
                                  }`}
                                >
                                  {pontosGanhos} <span className="text-[8px] font-normal opacity-70">pts</span>
                                </div>
                              ) : (
                                // Mantém o traço se o jogo ainda vai acontecer
                                <span className="text-[9px] sm:text-[11px] font-bold text-teal-500/50 flex gap-1">
                                  <span className="text-amber-400/50">-</span> pts
                                </span>
                              )}
                             </div> 

                          </div>
                        )
                      })
                    )}
                  </div>
                </div>
              )}

              {/* ======================================= */}
              {/* ABA 2A FASE (DIVISÓRIA POR ETAPA E BLOQUEIO) */}
              {/* ======================================= */}
              {abaAtiva === '2a_fase' && (() => {
                
                // Tradutor inteligente de códigos da API/Banco para português limpo
                const obterNomeFase = (faseRaw: string) => {
                  if (!faseRaw) return 'Mata-Mata';
                  const f = faseRaw.toUpperCase();
                  if (f.includes('32') || f === 'R32') return 'Eliminatórias';
                  if (f.includes('16') || f === 'R16' || f.includes('OITAVAS')) return 'Oitavas de Final';
                  if (f.includes('QUARTER') || f === 'QF' || f.includes('QUARTAS')) return 'Quartas de Final';
                  if (f.includes('SEMI') || f === 'SF') return 'Semifinais';
                  if (f.includes('THIRD') || f.includes('3RD') || f.includes('3º')) return 'Disputa pelo 3º Lugar';
                  if (f.includes('FINAL') || f === 'CAMPEAO') return '🏆 Grande Final 🏆';
                  return faseRaw;
                };

                return (
                  <div className="animate-fade-in pb-8">
                    <div className="px-3 py-4 sm:px-6 border-b border-white/5 sticky top-0 bg-[#0a0a0a] z-30 flex text-[10px] sm:text-xs font-bold uppercase tracking-widest text-gray-500 shadow-md">
                      <div className="w-12 sm:w-16 text-center">Data</div>
                      <div className="flex-1 text-center">Jogo</div>
                      <div className="w-12 sm:w-16 text-center">Pts</div>
                    </div>

                    <div className="flex flex-col">
                      {partidas2f.length === 0 ? (
                        <p className="p-6 text-center text-sm text-gray-500 border border-white/5 mx-6 mt-6 rounded-2xl bg-white/[0.02]">
                          A tabela do mata-mata ainda não foi disponibilizada pela FIFA.
                        </p>
                      ) : (
                        partidas2f.map((jogo, index) => {
                          const { diaMes, hora } = formatarData(jogo.data_hora)
                          const isIndefinido = jogo.time_casa === 'A Definir' || jogo.time_fora === 'A Definir'
                          const palpiteCasa = palpites2aFase[bolaoAtivo.id]?.[jogo.id]?.casa ?? ''
                          const palpiteFora = palpites2aFase[bolaoAtivo.id]?.[jogo.id]?.fora ?? ''
                          const pontosGanhos = palpites2aFase[bolaoAtivo.id]?.[jogo.id]?.pontos ?? 0

                          // LÓGICA DA DIVISÓRIA: Verifica se a fase mudou em relação à partida anterior
                          const faseAtual = jogo.fase || 'mata_mata';
                          const faseAnterior = index > 0 ? (partidas2f[index - 1].fase || 'mata_mata') : null;
                          const mostrarDivisoria = faseAtual !== faseAnterior;
                          const nomeFaseFormatado = obterNomeFase(faseAtual);

                          return (
                            <div key={jogo.id} className="flex flex-col">
                              
                              {/* BANNER DA ETAPA (Renderiza apenas na virada de fase) */}
                              {mostrarDivisoria && (
                                <div className="bg-gradient-to-r from-teal-950/40 via-black/90 to-transparent border-y border-teal-500/20 px-4 py-2.5 sm:px-6 flex items-center gap-2.5 mt-4 first:mt-0">
                                  <span className="w-2 h-2 rounded-full bg-teal-400 shadow-[0_0_8px_#2dd4bf] shrink-0"></span>
                                  <span className="text-xs sm:text-sm font-black tracking-widest uppercase text-teal-400">
                                    {nomeFaseFormatado}
                                  </span>
                                </div>
                              )}

                              {/* LINHA DO JOGO */}
                              <div className={`flex items-center justify-between px-3 py-4 sm:px-6 border-b border-white/5 transition-colors ${isIndefinido ? 'opacity-80 bg-black/20' : 'hover:bg-white/[0.02]'}`}>
                                
                                <div className="w-12 sm:w-16 flex flex-col items-center justify-center text-gray-400 shrink-0">
                                  <span className="text-xs sm:text-sm font-bold text-white">{diaMes}</span>
                                  <span className="text-[9px] sm:text-[11px]">{hora}</span>
                                </div>

                                <div className="flex-1 flex items-center justify-center gap-2 sm:gap-6 min-w-0">
                                  
                                  <div className="flex flex-col items-center gap-1.5 w-16 sm:w-28 overflow-hidden shrink-0">
                                    {isIndefinido || !jogo.bandeira_casa ? (
                                      <div className="w-6 h-6 sm:w-10 sm:h-10 rounded-full flex items-center justify-center bg-white/5 border border-white/10 shadow-md">
                                        <span className="text-gray-500 text-[10px] sm:text-sm font-black">?</span>
                                      </div>
                                    ) : (
                                      <img src={jogo.bandeira_casa} alt={jogo.time_casa} className="w-6 h-6 sm:w-10 sm:h-10 rounded-full object-cover shadow-md border border-white/10 bg-white/5" />
                                    )}
                                    <span className={`text-[8px] sm:text-[10px] font-bold uppercase text-center leading-tight truncate w-full ${isIndefinido ? 'text-gray-600' : 'text-gray-300'}`}>
                                      {jogo.time_casa}
                                    </span>
                                  </div>

                                  <div className="flex flex-col items-center justify-center shrink-0">
                                    <div className="flex items-center gap-1 sm:gap-4 shrink-0">
                                      {/* TRAVA DINÂMICA */}
                                      {jogo.status === 'FT' || jogo.status === 'LIVE' || verificarBloqueioPartida(jogo.data_hora) ? (
                                        <>
                                          <div className={`w-8 h-10 sm:w-12 sm:h-14 flex items-center justify-center border rounded-lg sm:rounded-xl text-base sm:text-xl font-black shadow-inner ${jogo.status === 'FT' ? 'bg-black/80 border-white/5 text-gray-400' : 'bg-black/50 border-white/10 text-white'}`}>
                                            {palpiteCasa !== '' ? palpiteCasa : '-'}
                                          </div>
                                          <span className="text-gray-600 font-bold text-xs sm:text-sm">X</span>
                                          <div className={`w-8 h-10 sm:w-12 sm:h-14 flex items-center justify-center border rounded-lg sm:rounded-xl text-base sm:text-xl font-black shadow-inner ${jogo.status === 'FT' ? 'bg-black/80 border-white/5 text-gray-400' : 'bg-black/50 border-white/10 text-white'}`}>
                                            {palpiteFora !== '' ? palpiteFora : '-'}
                                          </div>
                                        </>
                                      ) : isIndefinido ? ( 
                                        <div className="flex items-center justify-center w-20 sm:w-28 bg-black/60 border border-white/10 rounded-lg sm:rounded-xl px-2 sm:px-4 py-1.5 sm:py-2.5 shadow-inner">
                                          <span className="text-xs sm:text-sm mr-1 sm:mr-1.5">🔒</span>
                                        </div>
                                      ) : (
                                        <>
                                          <input 
                                            type="text" 
                                            inputMode="numeric"
                                            pattern="[0-9]*"
                                            maxLength={2}
                                            value={palpiteCasa}
                                            onChange={(e) => handlePalpite2aFase(jogo.id, 'casa', e.target.value)}
                                            className="w-8 h-10 sm:w-12 sm:h-14 p-0 bg-black/60 border border-white/10 rounded-lg sm:rounded-xl text-center text-base sm:text-xl font-black text-white focus:outline-none focus:border-teal-400 focus:ring-1 focus:ring-teal-400 transition-all shadow-inner"
                                          />
                                          <span className="text-gray-500 font-bold text-xs sm:text-sm">X</span>
                                          <input 
                                            type="text" 
                                            inputMode="numeric"
                                            pattern="[0-9]*"
                                            maxLength={2}
                                            value={palpiteFora}
                                            onChange={(e) => handlePalpite2aFase(jogo.id, 'fora', e.target.value)}
                                            className="w-8 h-10 sm:w-12 sm:h-14 p-0 bg-black/60 border border-white/10 rounded-lg sm:rounded-xl text-center text-base sm:text-xl font-black text-white focus:outline-none focus:border-teal-400 focus:ring-1 focus:ring-teal-400 transition-all shadow-inner"
                                          />
                                        </>
                                      )}
                                    </div>
                                    
                                    {/* PLACAR OFICIAL */}
                                    {jogo.status === 'FT' && (
                                      <div className="mt-1 sm:mt-1.5 flex flex-col items-center leading-none">
                                        <span className="font-black text-[10px] sm:text-xs text-gray-300 tracking-[0.15em]">
                                          {jogo.gols_casa} x {jogo.gols_fora}
                                        </span>
                                        <span className="text-[7px] sm:text-[8px] uppercase tracking-widest text-gray-500 mt-1">
                                          Oficial
                                        </span>
                                      </div>
                                    )}
                                  </div>

                                  <div className="flex flex-col items-center gap-1.5 w-16 sm:w-28 overflow-hidden shrink-0">
                                    {isIndefinido || !jogo.bandeira_fora ? (
                                      <div className="w-6 h-6 sm:w-10 sm:h-10 rounded-full flex items-center justify-center bg-white/5 border border-white/10 shadow-md">
                                        <span className="text-gray-500 text-[10px] sm:text-sm font-black">?</span>
                                      </div>
                                    ) : (
                                      <img src={jogo.bandeira_fora} alt={jogo.time_fora} className="w-6 h-6 sm:w-10 sm:h-10 rounded-full object-cover shadow-md border border-white/10 bg-white/5" />
                                    )}
                                    <span className={`text-[8px] sm:text-[10px] font-bold uppercase text-center leading-tight truncate w-full ${isIndefinido ? 'text-gray-600' : 'text-gray-300'}`}>
                                      {jogo.time_fora}
                                    </span>
                                  </div>

                                </div>

                                <div className="w-12 sm:w-16 flex items-center justify-center shrink-0">
                                  {jogo.status === 'FT' ? (
                                    <div 
                                      className={`flex items-baseline gap-0.5 px-2 py-1 rounded border font-black text-[10px] sm:text-xs transition-colors ${
                                        pontosGanhos === '10' ? 'bg-amber-400/10 border-amber-400/30 text-amber-400 shadow-[0_0_10px_rgba(245,158,11,0.25)]' :
                                        pontosGanhos === '7'  ? 'bg-green-500/10 border-green-500/30 text-green-400 shadow-[0_0_8px_rgba(34,197,94,0.15)]' :
                                        pontosGanhos === '5'  ? 'bg-white/10 border-white/20 text-white shadow-[0_0_8px_rgba(255,255,255,0.1)]' :
                                        pontosGanhos === '2'  ? 'bg-orange-500/10 border-orange-500/30 text-orange-500 shadow-[0_0_8px_rgba(253,224,71,0.1)]' :
                                        'bg-red-500/10 border-red-500/30 text-red-500 shadow-[0_0_8px_rgba(239,68,68,0.15)]'
                                      }`}
                                    >
                                      {pontosGanhos} <span className="text-[8px] font-normal opacity-70">pts</span>
                                    </div>
                                  ) : (
                                    <span className="text-[9px] sm:text-[11px] font-bold text-teal-500/50 flex gap-1">
                                      <span className="text-amber-400/50">-</span> pts
                                    </span>
                                  )}
                                </div>

                              </div>
                            </div>
                          )
                        })
                      )}
                    </div>
                  </div>
                )
              })()} 

              {/* ======================================= */}
              {/* ABA GRUPOS (FEEDBACK DE PONTOS) */}
              {/* ======================================= */}
              {abaAtiva === 'grupos' && (
                <div className="animate-fade-in p-4 sm:p-6 pb-12">
                  <div className="mb-6">
                    <h4 className="text-white font-bold text-lg">Classificação dos Grupos</h4>
                    <p className="text-xs text-gray-400">Defina a ordem do 1º ao 4º lugar de cada chave.</p>
                  </div>

                  {times.length === 0 ? (
                    <div className="p-6 text-center text-sm border border-white/5 rounded-2xl bg-white/[0.02]">
                      Os grupos oficiais ainda não foram definidos.
                    </div>
                  ) : (
                    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                      {Object.keys(
                        times.reduce((acc, time) => {
                          if (!acc[time.grupo]) acc[time.grupo] = []
                          acc[time.grupo].push(time)
                          return acc
                        }, {} as Record<string, TimeCopa[]>)
                      ).sort().map(nomeDoGrupo => {
                        
                        const timesDoGrupo = times.filter(t => t.grupo === nomeDoGrupo)
                        
                        // Calcula a pontuação total apenas deste grupo
                        const pontosDoGrupo = timesDoGrupo.reduce((soma, time) => {
                          // CORRIGIDO: Usando palpitesGrupos
                          const pts = palpitesGrupos?.[bolaoAtivo.id]?.[time.id]?.pontos || 0;
                          return soma + pts;
                        }, 0);

                        return (
                          <div key={nomeDoGrupo} className="bg-black/40 border border-white/5 rounded-2xl p-4 shadow-xl relative overflow-hidden group/card hover:border-teal-500/30 transition-all">
                            <div className="absolute top-0 right-0 w-24 h-24 bg-teal-500/5 blur-3xl rounded-full pointer-events-none"></div>
                            
                            <div className="flex items-center justify-between mb-4">
                              <h5 className="text-teal-400 font-black tracking-widest text-sm uppercase flex items-center gap-2">
                                {nomeDoGrupo.replace('GROUP', 'GRUPO')}
                              </h5>
                              
                              {/* TAG DE PONTUAÇÃO DO GRUPO */}
                              {isInscricoesEncerradas && (
                                <div className={`flex items-baseline gap-1 px-2.5 py-1 rounded-lg border font-black text-xs transition-colors ${
                                  pontosDoGrupo > 0 
                                    ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400 shadow-[0_0_10px_rgba(16,185,129,0.15)]' 
                                    : 'bg-white/5 border-white/10 text-gray-500'
                                }`}>
                                  {pontosDoGrupo} <span className="text-[9px] font-normal opacity-70 uppercase tracking-wider">pts</span>
                                </div>
                              )}
                            </div>
                            
                            <div className="flex flex-col gap-2">
                              {timesDoGrupo.map(time => {
                                // CORRIGIDO: Usando palpitesGrupos
                                const palpiteObj = palpitesGrupos?.[bolaoAtivo.id]?.[time.id] || { posicao: "", pontos: 0 }
                                const palpiteAtual = palpiteObj.posicao
                                const pontosGanhos = palpiteObj.pontos
                                const acertouNaMosca = pontosGanhos > 0

                                // CORRIGIDO: Usando palpitesGrupos
                                const posicoesOcupadas = timesDoGrupo
                                  .map(t => palpitesGrupos?.[bolaoAtivo.id]?.[t.id]?.posicao)
                                  .filter(Boolean)

                                return (
                                  <div 
                                    key={time.id} 
                                    className={`flex items-center justify-between border rounded-xl p-2 px-3 transition-colors ${
                                      acertouNaMosca 
                                        ? 'bg-gradient-to-r from-emerald-500/10 to-transparent border-emerald-500/30' 
                                        : 'bg-white/5 border-white/5 hover:bg-white/10'
                                    }`}
                                  >
                                    
                                    <div className="flex items-center gap-3 overflow-hidden">
                                      <img src={time.bandeira || '/placeholder-flag.png'} alt={time.nome} className="w-6 h-6 rounded-full object-cover shadow-md bg-white/5 shrink-0" />
                                      <span className={`text-[10px] sm:text-xs font-bold uppercase truncate ${acertouNaMosca ? 'text-emerald-400' : 'text-gray-200'}`}>
                                        {time.nome}
                                      </span>
                                    </div>

                                    {/* BLOQUEIO CONDICIONAL: GRUPOS */}
                                    {isInscricoesEncerradas ? (
                                      <div className={`border rounded-lg font-black text-xs p-1.5 text-center shrink-0 w-12 shadow-inner ${
                                        acertouNaMosca 
                                          ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-400' 
                                          : 'bg-black/40 border-white/5 text-white'
                                      }`}>
                                        {palpiteAtual ? `${palpiteAtual}º` : '-'}
                                      </div>
                                    ) : (
                                      <select 
                                        value={palpiteAtual}
                                        onChange={(e) => handlePosicaoChange(time.id, e.target.value)}
                                        className="bg-black/60 border border-white/10 rounded-lg text-white font-bold text-xs p-1.5 focus:border-teal-400 focus:ring-1 focus:ring-teal-400 focus:outline-none appearance-none text-center cursor-pointer hover:bg-black shrink-0 w-12 shadow-inner transition-all"
                                      >
                                        <option value="" className="bg-gray-900 text-gray-500">-</option>
                                        {[1, 2, 3, 4].map(pos => {
                                          const posString = pos.toString()
                                          const isOcupada = posicoesOcupadas.includes(posString) && palpiteAtual !== posString

                                          return (
                                            <option 
                                              key={pos} 
                                              value={pos} 
                                              disabled={isOcupada}
                                              className={`bg-gray-900 ${isOcupada ? 'text-gray-700' : 'text-white'}`}
                                            >
                                              {pos}º
                                            </option>
                                          )
                                        })}
                                      </select>
                                    )}

                                  </div>
                                )
                              })}
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>
              )} 

              {/* ======================================= */}
              {/* ABA MATA-MATA (FEEDBACK E CAIXA DOURADA) */}
              {/* ======================================= */}
              {abaAtiva === 'classificados' && (() => {
                
                const state = palpitesMataMata[bolaoAtivo.id] || { r32: {}, r16: {}, qf: {}, sf: {}, campeao: '', vice: '' }
                
                // Helper seguro: extrai apenas os IDs seja de strings antigas ou objetos novos { timeId, pontos }
                const getIds = (faseObj: any) => Object.values(faseObj || {}).map((val: any) => typeof val === 'string' ? val : (val?.timeId || ""))

                const opcoesR16 = times.filter(t => getIds(state.r32).includes(t.id.toString()))
                const opcoesQf = times.filter(t => getIds(state.r16).includes(t.id.toString()))
                const opcoesSf = times.filter(t => getIds(state.qf).includes(t.id.toString()))
                const opcoesFinal = times.filter(t => getIds(state.sf).includes(t.id.toString()))

                const blocosMataMata: Array<{ key: 'r32' | 'r16' | 'qf' | 'sf', label: string, count: number, opcoes: TimeCopa[] }> = [
                  { key: 'r32', label: 'Eliminatórias (32 Seleções)', count: 32, opcoes: times },
                  { key: 'r16', label: 'Oitavas de Final (16 Seleções)', count: 16, opcoes: opcoesR16 },
                  { key: 'qf', label: 'Quartas de Final (8 Seleções)', count: 8, opcoes: opcoesQf },
                  { key: 'sf', label: 'Semifinais (4 Seleções)', count: 4, opcoes: opcoesSf },
                ]

                // Helpers para Grande Final
                const objCampeao = state.campeao || { timeId: '', pontos: 0 }
                const idCampeao = typeof objCampeao === 'string' ? objCampeao : (objCampeao.timeId || '')
                const ptsCampeao = typeof objCampeao === 'string' ? 0 : (objCampeao.pontos || 0)

                const objVice = state.vice || { timeId: '', pontos: 0 }
                const idVice = typeof objVice === 'string' ? objVice : (objVice.timeId || '')
                const ptsVice = typeof objVice === 'string' ? 0 : (objVice.pontos || 0)

                const ptsTotalFinal = ptsCampeao + ptsVice
                const gabaritouFinal = isInscricoesEncerradas && (ptsCampeao > 0 && ptsVice > 0)

                return (
                  <div className="animate-fade-in p-4 sm:p-6 pb-12">
                    <div className="mb-6">
                      <h4 className="text-white font-bold text-lg">Classificados por Fase</h4>
                      <p className="text-xs text-gray-400">Escolha os times que avançam. As rodadas finais só aceitarão times escolhidos nas anteriores.</p>
                    </div>

                    {times.length === 0 ? (
                      <div className="p-6 text-center text-sm border border-white/5 rounded-2xl bg-white/[0.02]">
                        Os times oficiais ainda não foram sincronizados.
                      </div>
                    ) : (
                      <div className="flex flex-col gap-8">
                        
                        {blocosMataMata.map(fase => {
                          const slotsFase = Object.values(state[fase.key] || {})
                          const valuesOcupados = getIds(state[fase.key])

                          // Soma os pontos e conta acertos da etapa
                          const pontosTotalEtapa = slotsFase.reduce((acc: number, item: any) => acc + (typeof item === 'string' ? 0 : (item?.pontos || 0)), 0)
                          const acertosCount = slotsFase.filter((item: any) => (typeof item === 'string' ? 0 : (item?.pontos || 0)) > 0).length
                          
                          // REGRA DE OURO: Se acertou 100% das vagas da etapa, vira CAIXA DOURADA!
                          const isGabarito = isInscricoesEncerradas && (acertosCount === fase.count && fase.count > 0)

                          return (
                            <div 
                              key={fase.key} 
                              className={`p-4 sm:p-5 rounded-2xl transition-all relative overflow-hidden ${
                                isGabarito 
                                  ? 'bg-gradient-to-br from-amber-500/15 via-black/80 to-[#0a0a0a] border border-amber-500/60 shadow-[0_0_30px_rgba(245,158,11,0.2)]' 
                                  : 'bg-black/20 border border-white/5 shadow-lg'
                              }`}
                            >
                              {/* Efeito de brilho de fundo para caixa dourada */}
                              {isGabarito && <div className="absolute -top-10 -right-10 w-40 h-40 bg-amber-500/10 blur-3xl rounded-full pointer-events-none"></div>}

                              <div className="flex items-center justify-between mb-4 gap-2">
                                <h5 className={`font-black tracking-widest text-xs sm:text-sm uppercase flex items-center gap-2 ${isGabarito ? 'text-amber-400' : 'text-teal-400'}`}>
                                  <span className={`w-2 h-2 rounded-full shrink-0 ${isGabarito ? 'bg-amber-400 shadow-[0_0_8px_#fbbf24]' : 'bg-teal-500 shadow-[0_0_8px_#14b8a6]'}`}></span>
                                  {fase.label}
                                </h5>

                                {/* TAG DE PONTUAÇÃO DA ETAPA */}
                                {isInscricoesEncerradas && (
                                  <div className={`flex items-baseline gap-1 px-2.5 py-1 rounded-lg border font-black text-xs shrink-0 transition-all ${
                                    isGabarito
                                      ? 'bg-amber-500/20 border-amber-500/50 text-amber-300 shadow-[0_0_12px_rgba(245,158,11,0.3)]'
                                      : pontosTotalEtapa > 0
                                        ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                                        : 'bg-white/5 border-white/10 text-gray-500'
                                  }`}>
                                    {isGabarito && <span className="mr-1 tracking-normal">★ BÔNUS</span>}
                                    {pontosTotalEtapa} <span className="text-[9px] font-normal opacity-70 uppercase tracking-wider">pts</span>
                                  </div>
                                )}
                              </div>

                              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3">
                                {Array.from({ length: fase.count }).map((_, i) => {
                                  const slotObj: any = state[fase.key][i] || ""
                                  const valueAtual = typeof slotObj === 'string' ? slotObj : (slotObj.timeId || "")
                                  const pontosGanhos = typeof slotObj === 'string' ? 0 : (slotObj.pontos || 0)
                                  const acertou = pontosGanhos > 0

                                  const timeSelecionado = times.find(t => t.id.toString() === valueAtual)

                                  return (
                                    <div key={i} className="relative flex items-center w-full">
                                      {timeSelecionado && (
                                        <img 
                                          src={timeSelecionado.bandeira || '/placeholder-flag.png'} 
                                          alt={timeSelecionado.nome} 
                                          className="absolute left-2 sm:left-3 w-4 h-4 sm:w-5 sm:h-5 rounded-full object-cover shadow-sm pointer-events-none z-10"
                                        />
                                      )}

                                      {isInscricoesEncerradas ? (
                                        <div className={`w-full border rounded-lg font-bold text-[10px] sm:text-xs py-2 sm:py-2.5 pr-2 truncate transition-colors ${
                                          acertou 
                                            ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-300 shadow-inner' 
                                            : 'bg-black/40 border-white/5 text-white'
                                        } ${timeSelecionado ? 'pl-8 sm:pl-10 text-left' : 'pl-2 text-center text-gray-600'}`}>
                                          {timeSelecionado ? timeSelecionado.nome : '—'}
                                        </div>
                                      ) : (
                                        <select 
                                          value={valueAtual}
                                          onChange={(e) => handleMataMataChange(fase.key, i, e.target.value)}
                                          className={`w-full bg-black/60 border border-white/10 rounded-lg text-white font-bold text-[10px] sm:text-xs py-2 sm:py-2.5 pr-2 focus:border-teal-400 focus:ring-1 focus:ring-teal-400 focus:outline-none appearance-none cursor-pointer hover:bg-black/80 focus:bg-zinc-900 transition-all truncate [color-scheme:dark] ${timeSelecionado ? 'pl-8 sm:pl-10 text-left' : 'pl-2 text-center'}`}
                                        >
                                          <option value="" className="text-gray-400 bg-zinc-900">- Vaga {i + 1} -</option>
                                          {fase.opcoes.map(time => {
                                            const isOcupada = valuesOcupados.includes(time.id.toString()) && valueAtual !== time.id.toString()
                                            return (
                                              <option 
                                                key={time.id} 
                                                value={time.id} 
                                                disabled={isOcupada} 
                                                className={isOcupada ? 'text-gray-600 bg-zinc-900' : 'text-white bg-zinc-900'}
                                              >
                                                {time.nome}
                                              </option>
                                            )
                                          })}
                                        </select>
                                      )}
                                    </div>
                                  )
                                })}
                              </div>
                            </div>
                          )
                        })}

                        {/* ======================================= */}
                        {/* GRANDE FINAL (CAMPEÃO E VICE) */}
                        {/* ======================================= */}
                        <div className={`p-5 rounded-2xl shadow-xl mt-4 border transition-all relative overflow-hidden ${
                          gabaritouFinal
                            ? 'bg-gradient-to-br from-amber-500/25 via-amber-950/40 to-black border-amber-400 shadow-[0_0_30px_rgba(245,158,11,0.3)]'
                            : 'bg-gradient-to-br from-amber-900/20 to-black border-amber-500/20'
                        }`}>
                          
                          <div className="flex items-center justify-between mb-4">
                            <div className="w-12 sm:w-16 hidden sm:block"></div> {/* Espaçador visual */}
                            <h5 className="text-amber-400 font-black tracking-widest text-sm uppercase text-center flex-1">
                              🏆 Grande Final 🏆
                            </h5>
                            
                            {isInscricoesEncerradas && (
                              <div className={`flex items-baseline gap-1 px-2.5 py-1 rounded-lg border font-black text-xs shrink-0 ${
                                ptsTotalFinal > 0 
                                  ? 'bg-amber-500/20 border-amber-500/50 text-amber-300' 
                                  : 'bg-white/5 border-white/10 text-gray-500'
                              }`}>
                                {ptsTotalFinal} <span className="text-[9px] font-normal opacity-70 uppercase tracking-wider">pts</span>
                              </div>
                            )}
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            
                            {/* CAMPEÃO */}
                            <div className="flex flex-col gap-1.5">
                              <label className="text-[10px] text-gray-400 font-bold uppercase ml-1">Campeão</label>
                              <div className="relative flex items-center w-full">
                                {idCampeao && (() => {
                                  const timeCampeao = times.find(t => t.id.toString() === idCampeao)
                                  return timeCampeao ? (
                                    <img src={timeCampeao.bandeira || '/placeholder-flag.png'} alt={timeCampeao.nome} className="absolute left-3 w-6 h-6 rounded-full object-cover shadow-sm pointer-events-none z-10" />
                                  ) : null
                                })()}
                                
                                {isInscricoesEncerradas ? (
                                  <div className={`w-full border rounded-lg font-bold text-[10px] sm:text-xs py-2 sm:py-2.5 pr-2 truncate transition-colors ${
                                    ptsCampeao > 0 ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-300' : 'bg-black/40 border-white/5 text-white'
                                  } ${idCampeao ? 'pl-11 text-left' : 'pl-2 text-center text-gray-600'}`}>
                                    {idCampeao ? times.find(t => t.id.toString() === idCampeao)?.nome : '—'}
                                  </div>
                                ) : (
                                  <select
                                    value={idCampeao}
                                    onChange={(e) => handleMataMataChange('campeao', 0, e.target.value)}
                                    className={`w-full bg-black/60 border border-white/10 rounded-lg text-white font-bold text-[10px] sm:text-xs py-2 sm:py-2.5 pr-2 focus:border-teal-400 focus:ring-1 focus:ring-teal-400 focus:outline-none appearance-none cursor-pointer hover:bg-black/80 focus:bg-zinc-900 transition-all truncate [color-scheme:dark] ${idCampeao ? 'pl-11 text-left' : 'pl-2 text-center'}`}
                                  >
                                    <option value="" className="text-gray-500">- Escolher Campeão -</option>
                                    {opcoesFinal.map(time => (
                                      <option key={time.id} value={time.id} disabled={idVice === time.id.toString()}>{time.nome}</option>
                                    ))}
                                  </select>
                                )}
                              </div>
                            </div>

                            {/* VICE-CAMPEÃO */}
                            <div className="flex flex-col gap-1.5">
                              <label className="text-[10px] text-gray-400 font-bold uppercase ml-1">Vice-Campeão</label>
                              <div className="relative flex items-center w-full">
                                {idVice && (() => {
                                  const timeVice = times.find(t => t.id.toString() === idVice)
                                  return timeVice ? (
                                    <img src={timeVice.bandeira || '/placeholder-flag.png'} alt={timeVice.nome} className="absolute left-3 w-6 h-6 rounded-full object-cover shadow-sm pointer-events-none z-10" />
                                  ) : null
                                })()}

                                {isInscricoesEncerradas ? (
                                  <div className={`w-full border rounded-lg font-bold text-[10px] sm:text-xs py-2 sm:py-2.5 pr-2 truncate transition-colors ${
                                    ptsVice > 0 ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-300' : 'bg-black/40 border-white/5 text-white'
                                  } ${idVice ? 'pl-11 text-left' : 'pl-2 text-center text-gray-600'}`}>
                                    {idVice ? times.find(t => t.id.toString() === idVice)?.nome : '—'}
                                  </div>
                                ) : (
                                  <select
                                    value={idVice}
                                    onChange={(e) => handleMataMataChange('vice', 0, e.target.value)}
                                    className={`w-full bg-black/60 border border-white/10 rounded-lg text-white font-bold text-[10px] sm:text-xs py-2 sm:py-2.5 pr-2 focus:border-teal-400 focus:ring-1 focus:ring-teal-400 focus:outline-none appearance-none cursor-pointer hover:bg-black/80 focus:bg-zinc-900 transition-all truncate [color-scheme:dark] ${idVice ? 'pl-11 text-left' : 'pl-2 text-center'}`}
                                  >
                                    <option value="" className="text-gray-500">- Escolher Vice -</option>
                                    {opcoesFinal.map(time => (
                                      <option key={time.id} value={time.id} disabled={idCampeao === time.id.toString()}>{time.nome}</option>
                                    ))}
                                  </select>
                                )}
                              </div>
                            </div>

                          </div>
                        </div>

                      </div>
                    )}
                  </div>
                )
              })()} 

              {/* ======================================= */}
              {/* ABA PRÊMIOS (BLOQUEIA APÓS O PRAZO) */}
              {/* ======================================= */}
              {abaAtiva === 'premios_individuais' && (() => {
                
                const state = palpitesPremios[bolaoAtivo.id] || {
                  bolaDeOuro: { timeId: '', jogador: '' },
                  chuteiraDeOuro: { timeId: '', jogador: '' },
                  luvaDeOuro: { timeId: '', jogador: '' }
                }

                const premios = [
                  {
                    key: 'bolaDeOuro',
                    label: 'Bola de Ouro (Melhor Jogador)',
                    icon: '🏆',
                    theme: { bg: 'from-amber-900/20', border: 'border-amber-500/30', text: 'text-amber-400', focus: 'focus:border-amber-400 focus:ring-1 focus:ring-amber-400' }
                  },
                  {
                    key: 'chuteiraDeOuro',
                    label: 'Chuteira de Ouro (Artilheiro)',
                    icon: '⚽',
                    theme: { bg: 'from-teal-900/20', border: 'border-teal-500/30', text: 'text-teal-400', focus: 'focus:border-teal-400 focus:ring-1 focus:ring-teal-400' }
                  },
                  {
                    key: 'luvaDeOuro',
                    label: 'Luva de Ouro (Melhor Goleiro)',
                    icon: '🧤',
                    theme: { bg: 'from-emerald-900/20', border: 'border-emerald-500/30', text: 'text-emerald-400', focus: 'focus:border-emerald-400 focus:ring-1 focus:ring-emerald-400' }
                  },
                ] as const;

                return (
                  <div className="animate-fade-in p-4 sm:p-6 pb-12">
                    <div className="mb-6">
                      <h4 className="text-white font-bold text-lg">Prêmios Individuais</h4>
                      <p className="text-xs text-gray-400">Escolha a seleção e digite o nome do jogador que vai faturar a premiação.</p>
                    </div>

                    <div className="flex flex-col gap-6">
                      {premios.map(premio => {
                        const valorAtual = state[premio.key];
                        const timeSelecionado = times.find(t => t.id.toString() === valorAtual.timeId);

                        return (
                          <div key={premio.key} className={`bg-gradient-to-br ${premio.theme.bg} to-black/40 border ${premio.theme.border} p-5 rounded-2xl shadow-xl transition-all`}>
                            <h5 className={`${premio.theme.text} font-black tracking-widest text-sm mb-4 uppercase flex items-center gap-2`}>
                              <span className="text-xl drop-shadow-md">{premio.icon}</span> {premio.label}
                            </h5>

                            <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
                              
                              <div className="relative flex items-center w-full sm:w-2/5">
                                {timeSelecionado && (
                                  <img 
                                    src={timeSelecionado.bandeira || '/placeholder-flag.png'} 
                                    alt={timeSelecionado.nome} 
                                    className="absolute left-3 w-6 h-6 rounded-full object-cover shadow-sm pointer-events-none z-10" 
                                  />
                                )}
                                
                                {/* BLOQUEIO CONDICIONAL: PREMIOS (TIME) */}
                                {isInscricoesEncerradas ? (
                                  <div className={`w-full bg-black/40 border border-white/5 rounded-xl text-white font-bold text-xs py-3.5 pr-3 truncate ${timeSelecionado ? 'pl-11 text-left' : 'pl-4 text-left text-gray-600'}`}>
                                    {timeSelecionado ? timeSelecionado.nome : '—'}
                                  </div>
                                ) : (
                                  <select
                                    value={valorAtual.timeId}
                                    onChange={(e) => {
                                      handlePremioChange(premio.key, 'timeId', e.target.value)
                                      handlePremioChange(premio.key, 'jogador', '')
                                    }}
                                    className={`w-full bg-black/60 border border-white/10 rounded-xl text-white font-bold text-xs py-3.5 pr-3 ${premio.theme.focus} outline-none appearance-none cursor-pointer truncate transition-all ${timeSelecionado ? 'pl-11 text-left' : 'pl-4 text-left'}`}
                                  >
                                    <option value="" className="text-gray-500">- Escolher Seleção -</option>
                                    {[...times].sort((a, b) => a.nome.localeCompare(b.nome)).map(time => (
                                      <option key={time.id} value={time.id} className="text-white bg-gray-900">{time.nome}</option>
                                    ))}
                                  </select>
                                )}
                              </div>

                              <div className="w-full sm:w-3/5">
                                {/* BLOQUEIO CONDICIONAL: PREMIOS (JOGADOR) */}
                                {isInscricoesEncerradas ? (
                                  <div className="w-full bg-black/40 border border-white/5 rounded-xl text-white font-bold text-sm p-3.5 truncate">
                                    {valorAtual.jogador ? valorAtual.jogador : <span className="text-gray-600">—</span>}
                                  </div>
                                ) : (
                                  <select
                                    value={valorAtual.jogador}
                                    onChange={(e) => handlePremioChange(premio.key, 'jogador', e.target.value)}
                                    disabled={!valorAtual.timeId}
                                    className={`w-full bg-black/60 border border-white/10 rounded-xl text-white font-bold text-sm p-3.5 focus:outline-none ${premio.theme.focus} transition-all appearance-none cursor-pointer ${!valorAtual.timeId ? 'opacity-50 cursor-not-allowed' : ''}`}
                                  >
                                    <option value="" className="text-gray-500">
                                      {!valorAtual.timeId ? '← Escolha a seleção primeiro' : '- Escolha o jogador -'}
                                    </option>
                                    
                                    {jogadores
                                      .filter(j => {
                                        const mesmoTime = j.time_id.toString() === valorAtual.timeId
                                        const isGoleiro = premio.key === 'luvaDeOuro' 
                                          ? j.posicao && j.posicao.toLowerCase().includes('goalkeeper') 
                                          : true
                                        
                                        return mesmoTime && isGoleiro
                                      })
                                      .map(jogador => (
                                        <option key={jogador.id} value={jogador.nome} className="bg-gray-900 text-white">
                                          {jogador.nome}
                                        </option>
                                      ))
                                    }
                                  </select>
                                )}
                              </div>
                              
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )
              })()}
            </div>

            <div className="border-t border-white/5 bg-black/60 backdrop-blur-md px-2 py-3 overflow-x-auto flex gap-1 scrollbar-none justify-start sm:justify-center">
              <AbaButton id="1a_fase" label="1ª Fase" ativo={abaAtiva === '1a_fase'} onClick={setAbaAtiva} />
              <AbaButton id="2a_fase" label="2ª Fase" ativo={abaAtiva === '2a_fase'} onClick={setAbaAtiva} />
              <AbaButton id="grupos" label="Grupos" ativo={abaAtiva === 'grupos'} onClick={setAbaAtiva} />
              <AbaButton id="classificados" label="Classificados" ativo={abaAtiva === 'classificados'} onClick={setAbaAtiva} />
              <AbaButton id="premios_individuais" label="Prêmios Individuais" ativo={abaAtiva === 'premios_individuais'} onClick={setAbaAtiva} />
            </div>
          </div>
        </div>
      )}
    </>
  )
}

function AbaButton({ id, label, ativo, onClick }: { id: string, label: string, ativo: boolean, onClick: (id: string) => void }) {
  return (
    <button
      onClick={() => onClick(id)}
      className={`px-4 py-2 text-xs font-bold uppercase tracking-wider rounded-xl transition-all whitespace-nowrap ${
        ativo 
          ? 'bg-gradient-to-r from-teal-500 to-emerald-500 text-black shadow-md' 
          : 'text-gray-400 hover:text-white hover:bg-white/5'
      }`}
    >
      {label}
    </button>
  )
}
