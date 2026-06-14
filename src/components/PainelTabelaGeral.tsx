'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/utils/supabase/client'

interface Partida {
  id: string
  fixture_id: number
  time_casa: string
  time_fora: string
  bandeira_casa: string
  bandeira_fora: string
  data_hora: string
}

interface JogadorRanking {
  id: string
  nomeUsuario: string
  nomeBolao: string
}

interface Time {
  id: any
  nome: string
  bandeira: string
  grupo: string // Ex: "A", "B", "C"...
}

interface PainelTabelaGeralProps {
  partidas1f: Partida[]
  partidas2f: Partida[]
  listaRanking: JogadorRanking[]
  times: Time[] // Nova propriedade contendo os países
}

export default function PainelTabelaGeral({ partidas1f, partidas2f, listaRanking, times }: PainelTabelaGeralProps) {
  // Estados Gerais
  const [modalAberto, setModalAberto] = useState<'1a_fase' | '2a_fase' | 'grupos' | 'classificados' | 'premios' | null>(null)
  
  // Estados da 1ª Fase / Partidas
  const [partidaSelecionada, setPartidaSelecionada] = useState<Partida | null>(null)
  const [palpitesDaPartida, setPalpitesDaPartida] = useState<any[]>([])
  const [isLoadingPalpites, setIsLoadingPalpites] = useState(false)
  
  // Estados dos Grupos
  const [grupoSelecionado, setGrupoSelecionado] = useState<string | null>(null)
  const [palpitesDoGrupo, setPalpitesDoGrupo] = useState<any[]>([])
  const [isLoadingGrupos, setIsLoadingGrupos] = useState(false)

  // Estados do Mata-Mata / Classificados
  const [etapaMataAbertura, setEtapaMataAbertura] = useState<'r32' | 'r16' | 'qf' | 'sf' | 'final' | null>(null)
  const [palpitesMata, setPalpitesMata] = useState<any[]>([])
  const [isLoadingMata, setIsLoadingMata] = useState(false)

  // Estados dos Prêmios Individuais
  const [palpitesPremios, setPalpitesPremios] = useState<any[]>([])
  const [categoriasPremios, setCategoriasPremios] = useState<string[]>([])
  const [isLoadingPremios, setIsLoadingPremios] = useState(false)
  
  const supabase = createClient()

  // Extrai a lista de letras de grupos únicos salvos no banco (Ex: ['A', 'B', 'C'...])
  const letrasDosGrupos = Array.from(new Set(times?.map(t => t.grupo).filter(Boolean))).sort()

  const formatarData = (dataIso: string) => {
    const d = new Date(dataIso)
    const dia = d.getDate().toString().padStart(2, '0')
    const mes = (d.getMonth() + 1).toString().padStart(2, '0')
    const hora = d.getHours().toString().padStart(2, '0')
    const min = d.getMinutes().toString().padStart(2, '0')
    return `${dia}/${mes} - ${hora}h${min}`
  }

  // ==========================================
  // EFFECT 1: BUSCA PALPITES DE UMA PARTIDA
  // ==========================================
  useEffect(() => {
    const buscarPalpites = async () => {
      if (!partidaSelecionada) {
        setPalpitesDaPartida([])
        return
      }
      setIsLoadingPalpites(true)
      try {
        const { data, error } = await supabase
          .from('palpites_jogos')
          .select('bolao_id, gols_casa, gols_fora')
          .eq('partida_id', partidaSelecionada.fixture_id)

        if (error) throw error

        if (data) {
          const palpitesComNomes = data.map((palpite) => {
            const donoDoBolao = listaRanking?.find(r => String(r.id) === String(palpite.bolao_id))
            return {
              ...palpite,
              nomeUsuario: donoDoBolao?.nomeUsuario || 'Usuário Desconhecido',
              nomeBolao: donoDoBolao?.nomeBolao || 'Bolão Desconhecido'
            }
          })
          palpitesComNomes.sort((a, b) => a.nomeUsuario.localeCompare(b.nomeUsuario))
          setPalpitesDaPartida(palpitesComNomes)
        }
      } catch (error) {
        console.error("Erro ao buscar palpites da partida:", error)
      } finally {
        setIsLoadingPalpites(false)
      }
    }
    buscarPalpites()
  }, [partidaSelecionada, listaRanking, supabase])


  // ==========================================
  // EFFECT 2: BUSCA E ORDENA OS PALPITES DE UM GRUPO
  // ==========================================
  useEffect(() => {
    const buscarPalpitesDoGrupo = async () => {
      if (!grupoSelecionado) {
        setPalpitesDoGrupo([])
        return
      }
      setIsLoadingGrupos(true)
      try {
        const timesDoGrupo = times.filter(t => t.grupo === grupoSelecionado)
        const idsTimes = timesDoGrupo.map(t => t.id)

        const { data, error } = await supabase
          .from('palpites_grupos')
          .select('bolao_id, time_id, posicao')
          .in('time_id', idsTimes)

        if (error) throw error

        if (data) {
          const agrupadoPorBolao: Record<string, any[]> = {}
          data.forEach(p => {
            if (!agrupadoPorBolao[p.bolao_id]) agrupadoPorBolao[p.bolao_id] = []
            agrupadoPorBolao[p.bolao_id].push(p)
          })

          const listaFinal = Object.keys(agrupadoPorBolao).map(bolaoId => {
            const dono = listaRanking?.find(r => String(r.id) === String(bolaoId))
            const palpitesOrdenados = agrupadoPorBolao[bolaoId].sort((a, b) => Number(a.posicao) - Number(b.posicao))
            
            const ordemDosPaises = palpitesOrdenados.map(p => {
              const infoTime = timesDoGrupo.find(t => String(t.id) === String(p.time_id))
              return {
                nome: infoTime?.nome || 'Desconhecido',
                bandeira: infoTime?.bandeira || '',
                posicao: p.posicao
              }
            })

            return {
              bolaoId,
              nomeUsuario: dono?.nomeUsuario || 'Usuário Desconhecido',
              nomeBolao: dono?.nomeBolao || 'Bolão Desconhecido',
              classificacao: ordemDosPaises
            }
          })

          listaFinal.sort((a, b) => a.nomeUsuario.localeCompare(b.nomeUsuario))
          setPalpitesDoGrupo(listaFinal)
        }
      } catch (err) {
        console.error("Erro ao processar palpites do grupo:", err)
      } finally {
        setIsLoadingGrupos(false)
      }
    }
    buscarPalpitesDoGrupo()
  }, [grupoSelecionado, times, listaRanking, supabase])


  // ==========================================
  // EFFECT 3: BUSCA OS PALPITES DE MATA-MATA E FINAL
  // ==========================================
  useEffect(() => {
    const buscarMataMata = async () => {
      if (!etapaMataAbertura) {
        setPalpitesMata([])
        return
      }
      setIsLoadingMata(true)
      try {
        const fasesParaBuscar = etapaMataAbertura === 'final' ? ['campeao', 'vice'] : [etapaMataAbertura]

        const { data, error } = await supabase
          .from('palpites_matamata')
          .select('bolao_id, fase, time_id')
          .in('fase', fasesParaBuscar)

        if (error) throw error

        if (data) {
          const agrupado: Record<string, any> = {}
          data.forEach(p => {
            if (!agrupado[p.bolao_id]) agrupado[p.bolao_id] = { times: [], campeao: '', vice: '' }
            
            if (p.fase === 'campeao') agrupado[p.bolao_id].campeao = String(p.time_id)
            else if (p.fase === 'vice') agrupado[p.bolao_id].vice = String(p.time_id)
            else agrupado[p.bolao_id].times.push(String(p.time_id))
          })

          const listaFinal = Object.keys(agrupado).map(bolaoId => {
            const dono = listaRanking?.find(r => String(r.id) === String(bolaoId))
            
            const timeCamp = times.find(t => String(t.id) === agrupado[bolaoId].campeao)
            const timeVice = times.find(t => String(t.id) === agrupado[bolaoId].vice)
            
            const timesEscolhidos = agrupado[bolaoId].times.map((id: string) => {
              const t = times.find(x => String(x.id) === id)
              return { nome: t?.nome || '', bandeira: t?.bandeira || '' }
            })
            timesEscolhidos.sort((a: any, b: any) => a.nome.localeCompare(b.nome))

            return {
              bolaoId,
              nomeUsuario: dono?.nomeUsuario || 'Usuário Desconhecido',
              nomeBolao: dono?.nomeBolao || 'Bolão Desconhecido',
              campeao: { nome: timeCamp?.nome || '', bandeira: timeCamp?.bandeira || '' },
              vice: { nome: timeVice?.nome || '', bandeira: timeVice?.bandeira || '' },
              times: timesEscolhidos
            }
          })

          listaFinal.sort((a, b) => a.nomeUsuario.localeCompare(b.nomeUsuario))
          setPalpitesMata(listaFinal)
        }
      } catch (err) {
        console.error("Erro ao buscar palpites mata-mata:", err)
      } finally {
        setIsLoadingMata(false)
      }
    }
    buscarMataMata()
  }, [etapaMataAbertura, times, listaRanking, supabase])

 // ==========================================
  // EFFECT 4: BUSCA OS PALPITES DE PRÊMIOS
  // ==========================================
  useEffect(() => {
    const buscarPremios = async () => {
      if (modalAberto !== 'premios') return
      setIsLoadingPremios(true)
      try {
        // O Supabase faz um JOIN automático pela Foreign Key.
        // Se a sua tabela/coluna de jogadores for diferente, ajuste 'jogadores ( nome )'
        const { data, error } = await supabase
          .from('palpites_premios')
          .select(`
            bolao_id, 
            premio, 
            time_id, 
            jogador_id,
            jogadores ( nome )
          `)

        if (error) throw error

        if (data) {
          const categoriasUnicas = Array.from(new Set(data.map(d => d.premio).filter(Boolean))).sort()
          setCategoriasPremios(categoriasUnicas as string[])

          const agrupado: Record<string, any> = {}
          data.forEach(p => {
            if (!agrupado[p.bolao_id]) agrupado[p.bolao_id] = {}
            
            const timeDoJogador = times.find(t => String(t.id) === String(p.time_id))
            
           // Tenta ler o nome vindo do JOIN. Fallback pro ID caso o JOIN falhe.
            let nomeReal = p.jogador_id 
            
            // Usamos 'as any' para o TypeScript não encrencar com o formato do retorno do Supabase
            const dadosJogador = p.jogadores as any
            if (dadosJogador) {
              nomeReal = Array.isArray(dadosJogador) ? dadosJogador[0]?.nome : dadosJogador.nome
            }

            agrupado[p.bolao_id][p.premio] = {
              jogador: nomeReal, 
              bandeira: timeDoJogador?.bandeira || null
            }
          })

          const listaFinal = Object.keys(agrupado).map(bolaoId => {
            const dono = listaRanking?.find(r => String(r.id) === String(bolaoId))
            return {
              bolaoId,
              nomeUsuario: dono?.nomeUsuario || 'Usuário Desconhecido',
              nomeBolao: dono?.nomeBolao || 'Bolão Desconhecido',
              premios: agrupado[bolaoId]
            }
          })

          listaFinal.sort((a, b) => a.nomeUsuario.localeCompare(b.nomeUsuario))
          setPalpitesPremios(listaFinal)
        }
      } catch (err) {
        console.error("Erro ao buscar prêmios:", err)
      } finally {
        setIsLoadingPremios(false)
      }
    }
    buscarPremios()
  }, [modalAberto, times, listaRanking, supabase])

  return (
    <>
      {/* PAINEL PRINCIPAL (DASHBOARD) */}
      <div className="bg-white/[0.02] border border-white/5 rounded-3xl p-6 backdrop-blur-xl flex flex-col group hover:border-purple-500/20 transition-all">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <span>👁️</span> Tabela
          </h2>
        </div>

        <div className="flex-1 flex flex-col gap-2 mt-2">
          <p className="text-xs text-gray-400 mb-2">Veja os palpites de todos os competidores:</p>
          
          <button onClick={() => setModalAberto('1a_fase')} className="w-full text-left px-4 py-3 rounded-xl text-sm font-bold transition-all border border-white/5 bg-black/40 hover:bg-purple-500/10 hover:border-purple-500/30 hover:text-purple-300 text-gray-300 flex justify-between items-center">
            1ª Fase <span>▸</span>
          </button>
          <button onClick={() => setModalAberto('2a_fase')} className="w-full text-left px-4 py-3 rounded-xl text-sm font-bold transition-all border border-white/5 bg-black/40 hover:bg-purple-500/10 hover:border-purple-500/30 hover:text-purple-300 text-gray-300 flex justify-between items-center">
            2ª Fase <span>▸</span>
          </button>
          <button onClick={() => setModalAberto('grupos')} className="w-full text-left px-4 py-3 rounded-xl text-sm font-bold transition-all border border-white/5 bg-black/40 hover:bg-purple-500/10 hover:border-purple-500/30 hover:text-purple-300 text-gray-300 flex justify-between items-center">
            Grupos <span>▸</span>
          </button>
          <button onClick={() => setModalAberto('classificados')} className="w-full text-left px-4 py-3 rounded-xl text-sm font-bold transition-all border border-white/5 bg-black/40 hover:bg-purple-500/10 hover:border-purple-500/30 hover:text-purple-300 text-gray-300 flex justify-between items-center">
            Classificados <span>▸</span>
          </button>
          <button onClick={() => setModalAberto('premios')} className="w-full text-left px-4 py-3 rounded-xl text-sm font-bold transition-all border border-white/5 bg-black/40 hover:bg-purple-500/10 hover:border-purple-500/30 hover:text-purple-300 text-gray-300 flex justify-between items-center">
            Prêmios Individuais <span>▸</span>
          </button>
        </div>
      </div>

      {/* MODAL 1: LISTA DE JOGOS DA 1ª FASE */}
      {modalAberto === '1a_fase' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-sm animate-fade-in">
          <div className="bg-[#0a0a0a] border border-white/10 w-full max-w-3xl h-[85vh] flex flex-col rounded-3xl shadow-2xl overflow-hidden relative">
            <div className="p-6 border-b border-white/5 flex justify-between items-center bg-black/40 shrink-0">
              <div>
                <span className="text-xs font-bold uppercase tracking-[0.2em] text-purple-400">Palpites da Galera</span>
                <h3 className="text-xl font-black text-white uppercase mt-1">Jogos da 1ª Fase</h3>
              </div>
              <button onClick={() => setModalAberto(null)} className="px-4 py-2 rounded-xl text-sm font-bold border border-white/10 bg-white/5 hover:bg-white/10 text-gray-300">
                Fechar
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 sm:p-6 flex flex-col gap-3">
              {partidas1f?.map((jogo) => (
                <div key={jogo.id} className="flex flex-col sm:flex-row justify-between items-center bg-white/[0.03] p-4 rounded-2xl border border-white/5 hover:border-purple-500/20 transition-colors gap-4">
                  <div className="flex flex-col sm:flex-row items-center flex-1 w-full gap-3 sm:gap-0">
                    <div className="flex items-center justify-center gap-1.5 text-[10px] sm:text-xs font-bold text-gray-500 shrink-0 leading-tight bg-white/5 px-3 py-1 sm:px-4 sm:py-1.5 rounded-full w-max whitespace-nowrap">
                      <span>{formatarData(jogo.data_hora).split(' - ')[0]}</span>
                      <span className="text-gray-600">•</span>
                      <span className="text-gray-400">{formatarData(jogo.data_hora).split(' - ')[1]}</span>
                    </div>
                    
                    <div className="flex flex-1 items-center justify-center gap-2 sm:gap-3 w-full px-1">
                      <div className="flex flex-1 items-center gap-2 justify-end">
                        <span className="font-bold text-white text-xs sm:text-sm text-right leading-tight break-words">{jogo.time_casa}</span>
                        <img src={jogo.bandeira_casa} alt={jogo.time_casa} className="w-5 h-5 sm:w-6 sm:h-6 rounded-full object-cover shrink-0" />
                      </div>
                      <span className="text-gray-600 font-black text-xs shrink-0 mx-1">X</span>
                      <div className="flex flex-1 items-center gap-2 justify-start">
                        <img src={jogo.bandeira_fora} alt={jogo.time_fora} className="w-5 h-5 sm:w-6 sm:h-6 rounded-full object-cover shrink-0" />
                        <span className="font-bold text-white text-xs sm:text-sm text-left leading-tight break-words">{jogo.time_fora}</span>
                      </div>
                    </div>
                    <div className="hidden sm:block w-16 shrink-0"></div>
                  </div>

                  <button onClick={() => setPartidaSelecionada(jogo)} className="w-full sm:w-auto px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold uppercase tracking-wider rounded-lg transition-colors shrink-0">
                    Ver Palpites
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* SUBMODAL 1: PALPITES DE UMA PARTIDA */}
      {partidaSelecionada && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/95 backdrop-blur-md animate-fade-in">
          <div className="bg-[#111] border border-purple-500/30 w-full max-w-lg max-h-[80vh] flex flex-col rounded-3xl shadow-[0_0_50px_rgba(168,85,247,0.1)] overflow-hidden">
            <div className="p-6 border-b border-white/5 flex flex-col items-center bg-gradient-to-b from-purple-900/20 to-transparent relative">
              <button onClick={() => setPartidaSelecionada(null)} className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center rounded-full bg-white/5 hover:bg-white/10 text-gray-400">✕</button>
              <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-4">{formatarData(partidaSelecionada.data_hora)}</span>
            {/* CABEÇALHO DO JOGO CENTRALIZADO À PROVA DE FALHAS */}
              <div className="flex items-start justify-center w-full max-w-md mx-auto px-2 mt-2">
                
                {/* Time da Casa (Ganha exatos 50% do espaço restante) */}
                <div className="flex flex-1 flex-col items-center gap-2">
                  <img src={partidaSelecionada.bandeira_casa} alt={partidaSelecionada.time_casa} className="w-10 h-10 sm:w-12 sm:h-12 rounded-full shadow-lg object-cover" />
                  <span className="font-black text-white uppercase text-[10px] sm:text-xs tracking-wider text-center leading-tight break-words px-1">
                    {partidaSelecionada.time_casa}
                  </span>
                </div>

                {/* O "X" travado no centro da tela */}
                <span className="text-xl sm:text-2xl font-black text-gray-700 mx-3 sm:mx-6 shrink-0 mt-2">
                  X
                </span>

                {/* Time de Fora (Ganha exatos 50% do espaço restante) */}
                <div className="flex flex-1 flex-col items-center gap-2">
                  <img src={partidaSelecionada.bandeira_fora} alt={partidaSelecionada.time_fora} className="w-10 h-10 sm:w-12 sm:h-12 rounded-full shadow-lg object-cover" />
                  <span className="font-black text-white uppercase text-[10px] sm:text-xs tracking-wider text-center leading-tight break-words px-1">
                    {partidaSelecionada.time_fora}
                  </span>
                </div>

              </div> 
            </div>

            <div className="flex-1 overflow-y-auto p-4 bg-[#0a0a0a]">
              <div className="flex flex-col gap-2">
                {isLoadingPalpites ? (
                  <div className="flex flex-col items-center justify-center py-10 space-y-4">
                    <div className="w-8 h-8 border-4 border-purple-500/20 border-t-purple-500 rounded-full animate-spin"></div>
                    <span className="text-xs font-black text-purple-400/70 uppercase tracking-widest animate-pulse">Carregando Palpites...</span>
                  </div>
                ) : palpitesDaPartida.length === 0 ? (
                  <div className="text-center text-sm text-gray-500 py-10">Nenhum palpite registrado para este jogo.</div>
                ) : (
                  palpitesDaPartida.map((palpite, index) => (
                    <div key={`${palpite.bolao_id}-${index}`} className="flex justify-between items-center p-3 rounded-xl bg-white/[0.02] border border-white/5">
                      <div className="flex flex-col min-w-0 pr-4">
                        <span className="text-sm font-bold text-gray-300 truncate">{palpite.nomeUsuario}</span>
                        <span className="text-[10px] text-gray-500 uppercase tracking-wider truncate">{palpite.nomeBolao}</span>
                      </div>
                      <div className="flex items-center gap-2 bg-black/50 px-3 py-1.5 rounded-lg border border-white/5 shrink-0">
                        <span className="text-purple-400 font-black text-base">{palpite.gols_casa}</span>
                        <span className="text-gray-600 text-[10px]">x</span>
                        <span className="text-purple-400 font-black text-base">{palpite.gols_fora}</span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      )}

     {/* ========================================== */}
      {/* MODAL 1B: LISTA DE JOGOS DA 2ª FASE (MATA-MATA) */}
      {/* ========================================== */}
      {modalAberto === '2a_fase' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-sm animate-fade-in">
          <div className="bg-[#0a0a0a] border border-white/10 w-full max-w-3xl h-[85vh] flex flex-col rounded-3xl shadow-2xl overflow-hidden relative">
            <div className="p-6 border-b border-white/5 flex justify-between items-center bg-black/40 shrink-0">
              <div>
                <span className="text-xs font-bold uppercase tracking-[0.2em] text-purple-400">Palpites da Galera</span>
                <h3 className="text-xl font-black text-white uppercase mt-1">Jogos da 2ª fase</h3>
              </div>
              <button onClick={() => setModalAberto(null)} className="px-4 py-2 rounded-xl text-sm font-bold border border-white/10 bg-white/5 hover:bg-white/10 text-gray-300">
                Fechar
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 sm:p-6 flex flex-col gap-3">
              {(() => {
                // 1. Filtra a lista: Só permite jogos que tem times reais definidos.
                // Ajuste as strings ('TBD', 'A Definir', etc) conforme o que sua API/banco salva quando não há time.
                const jogosDefinidos = partidas2f?.filter(jogo => 
                  jogo.time_casa && 
                  jogo.time_fora && 
                  jogo.time_casa !== 'TBD' && 
                  jogo.time_fora !== 'TBD' &&
                  jogo.time_casa !== 'A Definir' &&
                  jogo.time_fora !== 'A Definir'
                ) || []

                // 2. Se a lista filtrada estiver vazia, mostra a mensagem.
                if (jogosDefinidos.length === 0) {
                  return (
                    <div className="flex flex-col items-center justify-center h-full py-20 text-center animate-fade-in">
                      <div className="w-16 h-16 bg-white/5 border border-white/10 rounded-2xl flex items-center justify-center mb-6 shadow-inner">
                        <span className="text-3xl grayscale opacity-50">⏳</span>
                      </div>
                      <h4 className="text-white font-black uppercase tracking-widest mb-2">Confrontos em Formação</h4>
                      <p className="text-gray-500 text-sm max-w-sm">
                        Os jogos desta fase aparecerão aqui assim que as seleções classificadas forem definidas oficialmente.
                      </p>
                    </div>
                  )
                }

                // 3. Se houver jogos definidos, renderiza a lista normalmente.
                return jogosDefinidos.map((jogo) => (
                  <div key={jogo.id} className="flex flex-col sm:flex-row justify-between items-center bg-white/[0.03] p-4 rounded-2xl border border-white/5 hover:border-purple-500/20 transition-colors gap-4">
                    <div className="flex flex-col sm:flex-row items-center flex-1 w-full gap-3 sm:gap-0">
                      <div className="flex items-center justify-center gap-1.5 text-[10px] sm:text-xs font-bold text-gray-500 shrink-0 leading-tight bg-white/5 px-3 py-1 sm:px-4 sm:py-1.5 rounded-full w-max whitespace-nowrap">
                        <span>{formatarData(jogo.data_hora).split(' - ')[0]}</span>
                        <span className="text-gray-600">•</span>
                        <span className="text-gray-400">{formatarData(jogo.data_hora).split(' - ')[1]}</span>
                      </div>
                      
                      <div className="flex flex-1 items-center justify-center gap-2 sm:gap-3 w-full px-1">
                        <div className="flex flex-1 items-center gap-2 justify-end">
                          <span className="font-bold text-white text-xs sm:text-sm text-right leading-tight break-words">{jogo.time_casa}</span>
                          {/* Verifica se a bandeira existe antes de tentar carregar imagem quebrada */}
                          {jogo.bandeira_casa ? (
                             <img src={jogo.bandeira_casa} alt={jogo.time_casa} className="w-5 h-5 sm:w-6 sm:h-6 rounded-full object-cover shrink-0" />
                          ) : (
                             <div className="w-5 h-5 sm:w-6 sm:h-6 rounded-full bg-white/10 shrink-0"></div>
                          )}
                        </div>
                        <span className="text-gray-600 font-black text-xs shrink-0 mx-1">X</span>
                        <div className="flex flex-1 items-center gap-2 justify-start">
                           {jogo.bandeira_fora ? (
                             <img src={jogo.bandeira_fora} alt={jogo.time_fora} className="w-5 h-5 sm:w-6 sm:h-6 rounded-full object-cover shrink-0" />
                          ) : (
                             <div className="w-5 h-5 sm:w-6 sm:h-6 rounded-full bg-white/10 shrink-0"></div>
                          )}
                          <span className="font-bold text-white text-xs sm:text-sm text-left leading-tight break-words">{jogo.time_fora}</span>
                        </div>
                      </div>
                      <div className="hidden sm:block w-16 shrink-0"></div>
                    </div>

                    <button onClick={() => setPartidaSelecionada(jogo)} className="w-full sm:w-auto px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold uppercase tracking-wider rounded-lg transition-colors shrink-0">
                      Ver Palpites
                    </button>
                  </div>
                ))
              })()}
            </div>
          </div>
        </div>
      )} 

      {/* MODAL 2: TABELA DE GRUPOS DA COMUNIDADE */}
      {modalAberto === 'grupos' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-sm animate-fade-in">
          <div className="bg-[#0a0a0a] border border-white/10 w-full max-w-4xl h-[85vh] flex flex-col rounded-3xl shadow-2xl overflow-hidden relative">
            <div className="p-6 border-b border-white/5 flex justify-between items-center bg-black/40 shrink-0">
              <div>
                <span className="text-xs font-bold uppercase tracking-[0.2em] text-purple-400">Palpites da Galera</span>
                <h3 className="text-xl font-black text-white uppercase mt-1">Colocações nos Grupos</h3>
              </div>
              <button onClick={() => setModalAberto(null)} className="px-4 py-2 rounded-xl text-sm font-bold border border-white/10 bg-white/5 hover:bg-white/10 text-gray-300">
                Fechar
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 sm:p-6 grid gap-4 sm:grid-cols-2">
              {letrasDosGrupos.map((letraGrupo) => {
                const paisesDoGrupo = times.filter(t => t.grupo === letraGrupo)

                return (
                  <div key={letraGrupo} className="bg-white/[0.02] border border-white/5 rounded-2xl p-4 flex flex-col justify-between hover:border-purple-500/20 transition-all">
                    <div>
                      <h4 className="text-sm font-black text-purple-400 uppercase tracking-widest mb-3">
                        {letraGrupo.toUpperCase().includes('GRUPO') ? letraGrupo : `Grupo ${letraGrupo}`}
                      </h4>
                      
                      <div className="grid grid-cols-2 gap-2 mb-5 bg-black/30 p-3 rounded-xl border border-white/5">
                        {paisesDoGrupo.map((pais) => (
                          <div key={pais.id} className="flex items-center gap-2 bg-white/5 px-2 py-1.5 sm:px-2.5 sm:py-2 rounded-lg border border-white/5 min-w-0" title={pais.nome}>
                            <img src={pais.bandeira} alt={pais.nome} className="w-4 h-4 sm:w-5 sm:h-5 rounded-full object-cover shrink-0" />
                            <span className="text-[9px] sm:text-[10px] font-bold text-white uppercase truncate">{pais.nome}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    <button 
                      onClick={() => setGrupoSelecionado(letraGrupo)}
                      className="w-full py-2.5 bg-purple-600/10 border border-purple-500/20 hover:bg-purple-600 text-purple-400 hover:text-white text-xs font-bold uppercase tracking-wider rounded-xl transition-all"
                    >
                      Ver Palpites do Grupo
                    </button>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      )}

      {/* SUBMODAL 2: RANKING INTERNO DE PALPITES DO GRUPO */}
      {grupoSelecionado && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/95 backdrop-blur-md animate-fade-in">
          <div className="bg-[#111] border border-purple-500/30 w-full max-w-md h-[75vh] flex flex-col rounded-3xl shadow-[0_0_50px_rgba(168,85,247,0.1)] overflow-hidden">
            
            {/* CABEÇALHO DO SUBMODAL 2 COM BOTÃO "X" */}
            <div className="p-4 sm:p-6 border-b border-white/5 flex items-start bg-gradient-to-b from-purple-900/10 to-transparent shrink-0 relative">
              
              <button 
                onClick={() => setGrupoSelecionado(null)} 
                className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center rounded-full bg-white/5 hover:bg-white/10 text-gray-400 transition-colors z-10"
              >
                ✕
              </button>
              
              <div className="flex-1 pr-10">
                <span className="text-[10px] sm:text-xs font-bold uppercase tracking-[0.2em] text-gray-500 block break-words leading-tight mb-1">
                  Apostas Consolidadas
                </span>
                <h3 className="text-base sm:text-xl font-black text-white uppercase break-words leading-tight">
                  {grupoSelecionado.toUpperCase().includes('GRUPO') ? `${grupoSelecionado}` : `GRUPO ${grupoSelecionado}`}
                </h3>
              </div>
              
            </div> 

            {/* CORPO DO SUBMODAL (Nomes acima das colocações) */}
            <div className="flex-1 overflow-y-auto overflow-x-hidden bg-[#0a0a0a] relative">
              {isLoadingGrupos ? (
                <div className="flex flex-col items-center justify-center py-20 space-y-4">
                  <div className="w-8 h-8 border-4 border-purple-500/20 border-t-purple-500 rounded-full animate-spin"></div>
                  <span className="text-xs font-black text-purple-400/70 uppercase tracking-widest animate-pulse">Sincronizando...</span>
                </div>
              ) : palpitesDoGrupo.length === 0 ? (
                <div className="text-center text-sm text-gray-500 py-12">Nenhum palpite registrado para esta chave.</div>
              ) : (
                <div className="w-full h-full align-top">
                  <table className="w-full sm:max-w-md mx-auto text-left border-collapse table-fixed">
                    
                    {/* CABEÇALHO GLOBAL (Apenas as 4 colunas dos países com 25% de largura cada) */}
                    <thead>
                      <tr>
                        {times.filter(t => t.grupo === grupoSelecionado).map(pais => (
                          <th key={pais.id} className="w-[25%] px-1 py-3 text-center sticky top-0 bg-[#111] z-20 border-b border-white/10 shadow-sm align-top">
                            <div className="flex flex-col items-center justify-start gap-1.5 overflow-hidden h-full">
                              <img src={pais.bandeira} alt={pais.nome} className="w-6 h-6 sm:w-8 sm:h-8 rounded-full object-cover shrink-0" />
                              <span className="text-[8px] sm:text-[10px] font-bold text-gray-400 uppercase leading-tight text-center w-full break-all">
                                {pais.nome}
                              </span>
                            </div>
                          </th>
                        ))}
                      </tr>
                    </thead>
                    
                    {/* RENDERIZAÇÃO DOS USUÁRIOS (Um <tbody> por usuário para agrupar as duas linhas) */}
                    {palpitesDoGrupo.map((item) => (
                      <tbody key={item.bolaoId} className="border-b border-white/5 hover:bg-white/[0.02] transition-colors group">
                        
                       {/* Linha 1: Nome do Competidor (Mescla as 4 colunas e fica centralizado) */}
                        <tr>
                          <td colSpan={4} className="px-2 pt-4 pb-2">
                            {/* Removido o sm:mx-0 para manter mx-auto em todas as telas */}
                            <div className="flex items-center justify-center gap-2 overflow-hidden bg-white/[0.03] w-max max-w-full px-4 py-1.5 sm:py-2 rounded-xl border border-white/5 mx-auto">
                              <span className="text-[11px] sm:text-sm font-black text-purple-400 truncate">{item.nomeUsuario}</span>
                              <span className="text-[9px] sm:text-[10px] text-gray-500 uppercase tracking-wider shrink-0">• {item.nomeBolao}</span>
                            </div>
                          </td>
                        </tr> 

                        {/* Linha 2: Posições Apostadas */}
                        <tr>
                          {times.filter(t => t.grupo === grupoSelecionado).map(pais => {
                            const palpite = item.classificacao.find((c: any) => c.nome === pais.nome)
                            const posicao = palpite ? palpite.posicao : null

                            return (
                              <td key={pais.id} className="w-[25%] p-2 pb-4 text-center align-middle relative z-0">
                                {posicao ? (
                                  <span className={`inline-flex items-center justify-center w-6 h-6 sm:w-8 sm:h-8 rounded-full text-[11px] sm:text-xs font-black mx-auto shadow-sm ${
                                    Number(posicao) === 1 ? 'bg-amber-500/10 text-amber-400 border border-amber-500/30' :
                                    Number(posicao) === 2 ? 'bg-zinc-400/10 text-zinc-300 border border-zinc-400/30' :
                                    'bg-black text-gray-600 border border-white/5'
                                  }`}>
                                    {posicao}º
                                  </span>
                                ) : (
                                  <span className="text-gray-700">-</span>
                                )}
                              </td>
                            )
                          })}
                        </tr>

                      </tbody>
                    ))}
                  </table>
                </div>
              )}
            </div>

          </div>
        </div>
      )}

      {/* ========================================== */}
      {/* MODAL 3: ETAPAS DOS CLASSIFICADOS (MATA-MATA) */}
      {/* ========================================== */}
      {modalAberto === 'classificados' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-sm animate-fade-in">
          <div className="bg-[#0a0a0a] border border-white/10 w-full max-w-xl rounded-3xl shadow-2xl overflow-hidden relative">
            <div className="p-6 border-b border-white/5 flex justify-between items-center bg-black/40 shrink-0">
              <div>
                <span className="text-xs font-bold uppercase tracking-[0.2em] text-purple-400">Palpites da Galera</span>
                <h3 className="text-xl font-black text-white uppercase mt-1">Seleções Classificadas</h3>
              </div>
              <button onClick={() => setModalAberto(null)} className="px-4 py-2 rounded-xl text-sm font-bold border border-white/10 bg-white/5 hover:bg-white/10 text-gray-300">
                Fechar
              </button>
            </div>
            <div className="p-6 flex flex-col gap-3 bg-[#0a0a0a]">
              <p className="text-xs text-gray-400 mb-1">Escolha uma etapa para espiar as apostas do mata-mata:</p>
              <button onClick={() => setEtapaMataAbertura('r32')} className="w-full text-left px-4 py-3.5 bg-white/[0.02] border border-white/5 hover:border-purple-500/30 hover:bg-purple-600/10 rounded-xl text-sm font-black uppercase tracking-wider text-gray-300 hover:text-purple-300 flex justify-between items-center transition-all">
                Eliminatórias<span>▸</span>
              </button>
              <button onClick={() => setEtapaMataAbertura('r16')} className="w-full text-left px-4 py-3.5 bg-white/[0.02] border border-white/5 hover:border-purple-500/30 hover:bg-purple-600/10 rounded-xl text-sm font-black uppercase tracking-wider text-gray-300 hover:text-purple-300 flex justify-between items-center transition-all">
                Oitavas de Final <span>▸</span>
              </button>
              <button onClick={() => setEtapaMataAbertura('qf')} className="w-full text-left px-4 py-3.5 bg-white/[0.02] border border-white/5 hover:border-purple-500/30 hover:bg-purple-600/10 rounded-xl text-sm font-black uppercase tracking-wider text-gray-300 hover:text-purple-300 flex justify-between items-center transition-all">
                Quartas de Final <span>▸</span>
              </button>
              <button onClick={() => setEtapaMataAbertura('sf')} className="w-full text-left px-4 py-3.5 bg-white/[0.02] border border-white/5 hover:border-purple-500/30 hover:bg-purple-600/10 rounded-xl text-sm font-black uppercase tracking-wider text-gray-300 hover:text-purple-300 flex justify-between items-center transition-all">
                Semifinal <span>▸</span>
              </button>
              <button onClick={() => setEtapaMataAbertura('final')} className="w-full text-left px-4 py-3.5 bg-gradient-to-r from-amber-900/20 to-transparent border border-amber-500/30 hover:border-amber-500 hover:bg-amber-600/20 rounded-xl text-sm font-black uppercase tracking-wider text-amber-400 hover:text-amber-300 flex justify-between items-center transition-all">
                👑 Final <span>▸</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* SUBMODAL 3: TABELA DINÂMICA (PLANILHA DE FINAL OU MATA-MATA) */}
      {etapaMataAbertura && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/95 backdrop-blur-md animate-fade-in">
          <div className="bg-[#111] border border-purple-500/30 w-full max-w-4xl h-[85vh] flex flex-col rounded-3xl shadow-[0_0_50px_rgba(168,85,247,0.1)] overflow-hidden">
            {/* CABEÇALHO (Com quebra de linha permitida em vez de reticências) */}
             {/* CABEÇALHO DO SUBMODAL 3 */}
            <div className="p-4 sm:p-6 border-b border-white/5 flex items-start bg-gradient-to-b from-purple-900/10 to-transparent shrink-0 relative">
              <button 
                onClick={() => setEtapaMataAbertura(null)} 
                className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center rounded-full bg-white/5 hover:bg-white/10 text-gray-400 transition-colors z-10"
              >
                ✕
              </button>
              <div className="flex-1 pr-10">
                <span className="text-[10px] sm:text-xs font-bold uppercase tracking-[0.2em] text-gray-500 block break-words leading-tight mb-1">
                  Palpites dos Classificados
                </span>
                <h3 className="text-base sm:text-xl font-black text-white uppercase break-words leading-tight">
                  {etapaMataAbertura === 'r32' ? 'Eliminatórias' :
                   etapaMataAbertura === 'r16' ? 'Oitavas de Final' :
                   etapaMataAbertura === 'qf' ? 'Quartas de Final' :
                   etapaMataAbertura === 'sf' ? 'Semifinal' : 'Grande Final'}
                </h3>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto overflow-x-hidden bg-[#0a0a0a] relative">
              {isLoadingMata ? (
                <div className="flex flex-col items-center justify-center py-20 space-y-4">
                  <div className="w-8 h-8 border-4 border-purple-500/20 border-t-purple-500 rounded-full animate-spin"></div>
                  <span className="text-xs font-black text-purple-400/70 uppercase tracking-widest animate-pulse">Buscando Palpites...</span>
                </div>
              ) : palpitesMata.length === 0 ? (
                <div className="text-center text-sm text-gray-500 py-12">Nenhum palpite registrado para esta fase.</div>
              ) : (
                <div className="w-full h-full align-top">
                  <table className="w-full text-left border-collapse table-fixed">
                    
                    {/* CABEÇALHO GLOBAL (Aparece apenas na Grande Final) */}
                    {etapaMataAbertura === 'final' && (
                      <thead>
                        <tr>
                          <th className="w-[50%] p-3 text-center sticky top-0 bg-[#111] z-20 border-b border-white/10 text-[10px] sm:text-xs font-black text-amber-400 uppercase tracking-widest shadow-sm">🥇 Campeão</th>
                          <th className="w-[50%] p-3 text-center sticky top-0 bg-[#111] z-20 border-b border-white/10 text-[10px] sm:text-xs font-black text-zinc-400 uppercase tracking-widest shadow-sm">🥈 Vice</th>
                        </tr>
                      </thead>
                    )}

                    {/* CORPO DA TABELA: Um <tbody> exclusivo por usuário */}
                    {palpitesMata.map((item) => (
                      <tbody key={item.bolaoId} className="border-b border-white/5 hover:bg-white/[0.02] transition-colors group">
                        
                        {/* Linha 1: Nome do Competidor Centralizado (Mágica do colSpan dinâmico) */}
                        <tr>
                          <td colSpan={etapaMataAbertura === 'final' ? 2 : 1} className="px-2 pt-4 pb-2">
                            <div className="flex items-center justify-center gap-2 overflow-hidden bg-white/[0.03] w-max max-w-full px-4 py-1.5 sm:py-2 rounded-xl border border-white/5 mx-auto">
                              <span className="text-[11px] sm:text-sm font-black text-purple-400 truncate">{item.nomeUsuario}</span>
                              <span className="text-[9px] sm:text-[10px] text-gray-500 uppercase tracking-wider shrink-0">• {item.nomeBolao}</span>
                            </div>
                          </td>
                        </tr>

                        {/* Linha 2: O Conteúdo dos Palpites */}
                        <tr>
                          {etapaMataAbertura === 'final' ? (
                            <>
                              {/* Layout de Campeão e Vice (2 Colunas) */}
                              <td className="w-[50%] p-2 pb-4 align-middle text-center relative z-0">
                                <div className="flex flex-col items-center justify-center gap-1.5 w-full overflow-hidden">
                                  {item.campeao.bandeira && <img src={item.campeao.bandeira} alt="" className="w-6 h-6 sm:w-8 sm:h-8 rounded-full object-cover shrink-0 shadow-md" />}
                                  <span className="text-[10px] sm:text-[11px] font-bold text-amber-400 uppercase text-center break-words w-full px-1 leading-tight">{item.campeao.nome || '-'}</span>
                                </div>
                              </td>
                              <td className="w-[50%] p-2 pb-4 align-middle text-center relative z-0">
                                <div className="flex flex-col items-center justify-center gap-1.5 w-full overflow-hidden">
                                  {item.vice.bandeira && <img src={item.vice.bandeira} alt="" className="w-6 h-6 sm:w-8 sm:h-8 rounded-full object-cover shrink-0 shadow-md" />}
                                  <span className="text-[10px] sm:text-[11px] font-bold text-zinc-400 uppercase text-center break-words w-full px-1 leading-tight">{item.vice.nome || '-'}</span>
                                </div>
                              </td>
                            </>
                          ) : (
                            /* Layout das Fases Anteriores (Tags de países organizadas e centralizadas) */
                            <td className="w-full p-2 sm:p-3 pb-5 align-top relative z-0">
                              <div className="flex flex-wrap justify-center gap-2 sm:gap-2.5 max-w-2xl mx-auto">
                                {item.times.map((time: any, idx: number) => (
                                  <div key={idx} className="flex items-center gap-1.5 bg-white/[0.04] border border-white/10 px-2.5 py-1.5 sm:px-3 sm:py-2 rounded-lg max-w-full hover:bg-white/10 transition-colors">
                                    {time.bandeira && <img src={time.bandeira} alt="" className="w-4 h-4 sm:w-5 sm:h-5 rounded-full object-cover shrink-0 shadow-sm" />}
                                    <span className="text-[10px] sm:text-xs font-bold text-gray-300 uppercase truncate">{time.nome || '-'}</span>
                                  </div>
                                ))}
                              </div>
                            </td>
                          )}
                        </tr>

                      </tbody>
                    ))}
                  </table>
                </div> 
              )}
            </div>

          </div>
        </div>
      )}

      {/* ========================================== */}
      {/* MODAL 4: PRÊMIOS INDIVIDUAIS */}
      {/* ========================================== */}
      {modalAberto === 'premios' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-sm animate-fade-in">
          <div className="bg-[#111] border border-purple-500/30 w-full max-w-5xl h-[85vh] flex flex-col rounded-3xl shadow-[0_0_50px_rgba(168,85,247,0.1)] overflow-hidden relative">
            
            <div className="p-6 border-b border-white/5 flex justify-between items-center bg-gradient-to-b from-purple-900/10 to-transparent shrink-0">
              <div>
                <span className="text-xs font-bold uppercase tracking-[0.2em] text-purple-400">Palpites da Galera</span>
                <h3 className="text-xl font-black text-white uppercase mt-1">Prêmios Individuais</h3>
              </div>
              <button onClick={() => setModalAberto(null)} className="px-4 py-2 rounded-xl text-sm font-bold border border-white/10 bg-white/5 hover:bg-white/10 text-gray-300">
                Fechar
              </button>
            </div>

            <div className="flex-1 overflow-y-auto overflow-x-hidden bg-[#0a0a0a] relative">
              {isLoadingPremios ? (
                <div className="flex flex-col items-center justify-center py-20 space-y-4">
                  <div className="w-8 h-8 border-4 border-purple-500/20 border-t-purple-500 rounded-full animate-spin"></div>
                  <span className="text-xs font-black text-purple-400/70 uppercase tracking-widest animate-pulse">Buscando Prêmios...</span>
                </div>
              ) : palpitesPremios.length === 0 ? (
                <div className="text-center text-sm text-gray-500 py-12">Nenhum palpite de prêmio registrado ainda.</div>
              ) : (
                <div className="w-full h-full align-top">
                  <table className="w-full text-left border-collapse table-fixed">
                    <thead>
                      <tr>
                        {/* Colunas Geradas Dinamicamente dividindo 100% do espaço */}
                        {categoriasPremios.map(cat => {
                          const titulosPremios: Record<string, string> = {
                            bolaDeOuro: '⚽ Bola de Ouro',
                            chuteiraDeOuro: '👟 Chuteira de Ouro',
                            luvaDeOuro: '🧤 Luva de Ouro'
                          }
                          
                          return (
                            <th 
                              key={cat} 
                              className="p-3 text-center sticky top-0 bg-[#111] z-20 border-b border-white/10 text-[9px] sm:text-xs font-black text-amber-400 uppercase tracking-widest shadow-sm"
                              style={{ width: `${100 / (categoriasPremios.length || 1)}%` }}
                            >
                              {titulosPremios[cat] || cat.replace(/_/g, ' ')}
                            </th>
                          )
                        })}
                      </tr>
                    </thead>

                    {/* CORPO DA TABELA: Um <tbody> exclusivo por usuário */}
                    {palpitesPremios.map((item) => (
                      <tbody key={item.bolaoId} className="border-b border-white/5 hover:bg-white/[0.02] transition-colors group">
                        
                        {/* Linha 1: Nome do Competidor Centralizado */}
                        <tr>
                          <td colSpan={categoriasPremios.length || 1} className="px-2 pt-4 pb-2">
                            <div className="flex items-center justify-center gap-2 overflow-hidden bg-white/[0.03] w-max max-w-full px-4 py-1.5 sm:py-2 rounded-xl border border-white/5 mx-auto">
                              <span className="text-[11px] sm:text-sm font-black text-purple-400 truncate">{item.nomeUsuario}</span>
                              <span className="text-[9px] sm:text-[10px] text-gray-500 uppercase tracking-wider shrink-0">• {item.nomeBolao}</span>
                            </div>
                          </td>
                        </tr>

                        {/* Linha 2: Os Jogadores Escolhidos */}
                        <tr>
                          {categoriasPremios.map(cat => {
                            const palpite = item.premios[cat]
                            
                            return (
                              <td key={cat} className="p-2 pb-4 align-top text-center relative z-0">
                                {palpite ? (
                                  <div className="flex flex-col items-center justify-start gap-1.5 w-full overflow-hidden">
                                    {palpite.bandeira && <img src={palpite.bandeira} alt="" className="w-6 h-6 sm:w-8 sm:h-8 rounded-full object-cover shrink-0 shadow-md" />}
                                    <span className="text-[10px] sm:text-[11px] font-bold text-gray-300 uppercase text-center break-words w-full px-1 leading-tight">
                                      {palpite.jogador || '-'}
                                    </span>
                                  </div>
                                ) : (
                                  <span className="text-gray-700">-</span>
                                )}
                              </td>
                            )
                          })}
                        </tr>

                      </tbody>
                    ))}
                  </table>
                </div>
              )}
            </div>

          </div>
        </div>
      )}
    </>
  )
}
