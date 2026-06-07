'use client'
import { useState } from 'react'

interface Bolao {
  id: string
  nome: string
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

export default function MeusBoloesPainel({ partidas1f, partidas2f, times, jogadores }: { partidas1f: Partida[], partidas2f: Partida[], times: TimeCopa[], jogadores: Jogador[] }) {
  const [boloes, setBoloes] = useState<Bolao[]>([])
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [bolaoAtivo, setBolaoAtivo] = useState<Bolao | null>(null)
  const [abaAtiva, setAbaAtiva] = useState('1a_fase')
  const [palpitesGrupos, setPalpitesGrupos] = useState<Record<string, Record<number, string>>>({})
  const [palpites1aFase, setPalpites1aFase] = useState<Record<string, Record<string, { casa: string, fora: string }>>>({})
  const [palpites2aFase, setPalpites2aFase] = useState<Record<string, Record<string, { casa: string, fora: string }>>>({})
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

  const handleCriarBolao = () => {
    const numerosUtilizados = boloes.map(b => {
      const match = b.nome.match(/BOLÃO (\d+)/)
      return match ? parseInt(match[1]) : 0
    })

    let proximoNumero = 1
    while (numerosUtilizados.includes(proximoNumero)) {
      proximoNumero++
    }

    const novoBolao: Bolao = {
      id: crypto.randomUUID(), 
      nome: `BOLÃO ${proximoNumero}`
    }

    setBoloes([...boloes, novoBolao])
  }

  // Abre a cartela
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

  // NOVA FUNÇÃO: Excluir Bolão
  const handleExcluirBolao = (id: string) => {
    const confirmacao = window.confirm('Tem certeza que deseja excluir este bolão? Todos os palpites salvos nele serão perdidos.')
    if (confirmacao) {
      setBoloes(boloes.filter(b => b.id !== id))
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
      const palpitesDoBolao = prev[bolaoAtivo.id] || {} // Pega só os palpites deste bolão
      
      if (!posicao) {
        const newState = { ...palpitesDoBolao }
        delete newState[timeId]
        return { ...prev, [bolaoAtivo.id]: newState }
      }
      
      return { 
        ...prev, 
        [bolaoAtivo.id]: { ...palpitesDoBolao, [timeId]: posicao } 
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

  return (
    <>
      <div className="bg-white/[0.02] border border-emerald-600 rounded-3xl p-6 backdrop-blur-xl md:col-span-2 flex flex-col justify-between group  transition-all">
        <div>
          <div className="flex justify-between items-start mb-4">
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <span></span> Meus Bolões
            </h2>
            <span className="text-[10px] font-bold bg-teal-500/10 text-teal-400 px-2.5 py-1 rounded-full uppercase tracking-wider">
              {boloes.length} Ativos
            </span>
          </div>
            {/* Lista de Bolões Atualizada com Ícones */}
            <div className="grid gap-3 my-4 sm:grid-cols-2 min-h-[120px]">
              {boloes.map((bolao) => (
                <div 
                  key={bolao.id} 
                  className=" max-h-[60px] flex items-center justify-between p-2 pl-4 bg-white/5 border border-white/10 rounded-xl hover:bg-gradient-to-br from-teal-900/30 to-emerald-900/10 hover:border-teal-500/30 transition-all group/item"
                >
                  {/* Área Clicável para abrir o bolão (Ocupa o máximo de espaço) */}
                  <button
                    onClick={() => handleAbrirBolao(bolao)}
                    className="flex-1 text-left text-white font-bold flex flex-col justify-center outline-none"
                  >
                    <span className="truncate text-emerald-400 hover:text-emerald-300 text-xl">{bolao.nome}</span>
                  </button>

                  {/* Grupo de Ações (Excluir) */}
                  <div className="flex items-center gap-1 ml-2">
                      <span className="text-[35px] text-emerald-400">▸</span>
                    <button
                      onClick={() => handleExcluirBolao(bolao.id)}
                      title="Excluir"
                      className="p-2 text-gray-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                    >
                      {/* Ícone de Lixeira (SVG) */}
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                </div>
              ))}
            </div>
        </div>

        <button 
          onClick={handleCriarBolao}
          className="w-full sm:w-auto self-end mt-4 py-3 px-6 bg-gradient-to-r from-teal-500 to-emerald-500 hover:from-teal-400 hover:to-emerald-400 text-white font-black uppercase text-xs tracking-wider rounded-xl transition-all shadow-md transform hover:-translate-y-0.5"
        >
          + Criar Novo Bolão
        </button>
      </div>

      {/* MODAL DE PALPITES (Mantido igualzinho) */}
      {isModalOpen && bolaoAtivo && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-0 sm:p-4 bg-black/90 backdrop-blur-sm">
          <div className="bg-[#0a0a0a] border-0 sm:border border-white/10 w-full sm:max-w-4xl h-full sm:h-[85vh] flex flex-col justify-between sm:rounded-3xl shadow-2xl relative overflow-hidden">
            
            <div className="p-6 border-b border-white/5 flex justify-between items-center bg-black/40 backdrop-blur-md">
              <div>
                <span className="text-xs font-bold uppercase tracking-[0.2em] text-teal-400">Cartela de Palpites</span>
                <h3 className="text-xl font-black text-white uppercase mt-0.5">{bolaoAtivo.nome}</h3>
              </div>
              <button 
                onClick={() => setIsModalOpen(false)}
                className="text-gray-400 hover:text-white text-xs font-bold bg-white/5 hover:bg-white/10 px-3 py-1.5 rounded-full transition-colors"
              >
                Salvar e Fechar
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-0 text-gray-400">
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
                        return (
                          <div key={jogo.id} className="flex items-center justify-between px-3 py-4 sm:px-6 border-b border-white/5 hover:bg-white/[0.02] transition-colors">
                            
                            {/* Coluna 1: Data e Hora */}
                            <div className="w-12 sm:w-16 flex flex-col items-center justify-center text-gray-400 shrink-0">
                              <span className="text-xs sm:text-sm font-bold text-white">{diaMes}</span>
                              <span className="text-[9px] sm:text-[11px]">{hora}</span>
                            </div>

                            {/* Coluna 2: Jogo (Casa x Fora) */}
                            {/* min-w-0 impede que o flex central estoure a largura da tela no mobile */}
                            <div className="flex-1 flex items-center justify-center gap-1 sm:gap-6 min-w-0">
                              
                              {/* Time Casa */}
                              <div className="flex flex-col items-center gap-1 w-16 sm:w-28 overflow-hidden shrink-0">
                                <img src={jogo.bandeira_casa || '/placeholder-flag.png'} alt={jogo.time_casa} className="w-6 h-6 sm:w-10 sm:h-10 rounded-full object-cover shadow-[0_0_15px_rgba(0,0,0,0.5)] border border-white/10 bg-white/5" />
                                <span className="text-[8px] sm:text-[10px] font-bold uppercase text-gray-300 text-center leading-tight truncate w-full">
                                  {jogo.time_casa}
                                </span>
                              </div>

                              {/* Placar Inputs */}
                              <div className="flex items-center gap-1 sm:gap-4 shrink-0">
                                <input 
                                  type="text" 
                                  inputMode="numeric"
                                  pattern="[0-9]*"
                                  maxLength={2}
                                  /* Atualizado para ler a camada do bolaoAtivo.id */
                                  value={palpites1aFase[bolaoAtivo.id]?.[jogo.id]?.casa ?? ''}
                                  onChange={(e) => handlePalpite1aFase(jogo.id, 'casa', e.target.value)}
                                  className="w-8 h-10 sm:w-12 sm:h-14 p-0 bg-black/60 border border-white/10 rounded-lg sm:rounded-xl text-center text-base sm:text-xl font-black text-white focus:outline-none focus:border-teal-400 focus:ring-1 focus:ring-teal-400 transition-all shadow-inner"
                                />
                                <span className="text-gray-500 font-bold text-xs sm:text-sm">X</span>
                                <input 
                                  type="text" 
                                  inputMode="numeric"
                                  pattern="[0-9]*"
                                  maxLength={2}
                                  /* Atualizado para ler a camada do bolaoAtivo.id */
                                  value={palpites1aFase[bolaoAtivo.id]?.[jogo.id]?.fora ?? ''}
                                  onChange={(e) => handlePalpite1aFase(jogo.id, 'fora', e.target.value)}
                                  className="w-8 h-10 sm:w-12 sm:h-14 p-0 bg-black/60 border border-white/10 rounded-lg sm:rounded-xl text-center text-base sm:text-xl font-black text-white focus:outline-none focus:border-teal-400 focus:ring-1 focus:ring-teal-400 transition-all shadow-inner"
                                />
                              </div>
                              <div className="flex flex-col items-center gap-1 w-16 sm:w-28 overflow-hidden shrink-0">
                                <img src={jogo.bandeira_fora || '/placeholder-flag.png'} alt={jogo.time_fora} className="w-6 h-6 sm:w-10 sm:h-10 rounded-full object-cover shadow-[0_0_15px_rgba(0,0,0,0.5)] border border-white/10 bg-white/5" />
                                <span className="text-[8px] sm:text-[10px] font-bold uppercase text-gray-300 text-center leading-tight truncate w-full">
                                  {jogo.time_fora}
                                </span>
                              </div>

                            </div>

                            {/* Coluna 3: Pontos */}
                            <div className="w-12 sm:w-16 flex items-center justify-center shrink-0">
                              <span className="text-[9px] sm:text-[11px] font-bold text-teal-500/50 flex gap-1">
                                <span className="text-amber-400/50">-</span> pts
                              </span>
                            </div>

                          </div>
                        )
                      })
                    )}
                  </div>
                </div>
              )}
               {abaAtiva === '2a_fase' && (
                <div className="animate-fade-in pb-8">
                  
                  {/* CORREÇÃO 1: z-30 adicionado para garantir que o cabeçalho fique sempre no topo */}
                  <div className="px-3 py-4 sm:px-6 border-b border-white/5 sticky top-0 bg-[#0a0a0a] z-30 flex text-[10px] sm:text-xs font-bold uppercase tracking-widest text-gray-500">
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
                      partidas2f.map((jogo) => {
                        const { diaMes, hora } = formatarData(jogo.data_hora)
                        const isIndefinido = jogo.time_casa === 'A Definir' || jogo.time_fora === 'A Definir'

                        return (
                          <div key={jogo.id} className={`flex items-center justify-between px-3 py-4 sm:px-6 border-b border-white/5 transition-colors ${isIndefinido ? 'opacity-80 bg-black/20' : 'hover:bg-white/[0.02]'}`}>
                            
                            <div className="w-12 sm:w-16 flex flex-col items-center justify-center text-gray-400 shrink-0">
                              <span className="text-xs sm:text-sm font-bold text-white">{diaMes}</span>
                              <span className="text-[9px] sm:text-[11px]">{hora}</span>
                            </div>

                            <div className="flex-1 flex items-center justify-center gap-2 sm:gap-6 min-w-0">
                              
                              {/* Time Casa */}
                              <div className="flex flex-col items-center gap-1.5 w-16 sm:w-28 overflow-hidden shrink-0">
                                {/* CORREÇÃO 2: Ícone minimalista para times Indefinidos */}
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

                              {/* CORREÇÃO 3: A tag agora substitui os inputs físicos, impedindo o overlap! */}
                              {isIndefinido ? (
                                <div className="flex items-center justify-center shrink-0 w-20 sm:w-auto bg-black/60 border border-white/10 rounded-lg sm:rounded-xl px-2 sm:px-4 py-1.5 sm:py-2.5 shadow-inner">
                                  <span className="text-xs sm:text-sm mr-1 sm:mr-1.5">🔒</span>
                                </div>
                              ) : (
                                <div className="flex items-center gap-1 sm:gap-4 shrink-0">
                                  <input 
                                    type="text" 
                                    inputMode="numeric"
                                    pattern="[0-9]*"
                                    maxLength={2}
                                    value={palpites2aFase[bolaoAtivo.id]?.[jogo.id]?.casa ?? ''}
                                    onChange={(e) => handlePalpite2aFase(jogo.id, 'casa', e.target.value)}
                                    className="w-8 h-10 sm:w-12 sm:h-14 p-0 bg-black/60 border border-white/10 rounded-lg sm:rounded-xl text-center text-base sm:text-xl font-black text-white focus:outline-none focus:border-teal-400 focus:ring-1 focus:ring-teal-400 transition-all shadow-inner"
                                  />
                                  <span className="text-gray-500 font-bold text-xs sm:text-sm">X</span>
                                  <input 
                                    type="text" 
                                    inputMode="numeric"
                                    pattern="[0-9]*"
                                    maxLength={2}
                                    value={palpites2aFase[bolaoAtivo.id]?.[jogo.id]?.fora ?? ''}
                                    onChange={(e) => handlePalpite2aFase(jogo.id, 'fora', e.target.value)}
                                    className="w-8 h-10 sm:w-12 sm:h-14 p-0 bg-black/60 border border-white/10 rounded-lg sm:rounded-xl text-center text-base sm:text-xl font-black text-white focus:outline-none focus:border-teal-400 focus:ring-1 focus:ring-teal-400 transition-all shadow-inner"
                                  />
                                </div>
                              )}

                              {/* Time Fora */}
                              <div className="flex flex-col items-center gap-1.5 w-16 sm:w-28 overflow-hidden shrink-0">
                                {/* CORREÇÃO 2: Ícone minimalista para times Indefinidos */}
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
                              <span className="text-[9px] sm:text-[11px] font-bold text-teal-500/50 flex gap-1">
                                <span className="text-amber-400/50">-</span> pts
                              </span>
                            </div>

                          </div>
                        )
                      })
                    )}
                  </div>
                </div>
              )}
              {/* ABA GRUPOS */}
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
                        
                        // Descobre quais posições (1, 2, 3 ou 4) já foram escolhidas por ALGUM time DENTRO DESTE GRUPO
                        const posicoesOcupadas = timesDoGrupo.map(t => palpitesGrupos[t.id]).filter(Boolean)

                        return (
                          <div key={nomeDoGrupo} className="bg-black/40 border border-white/5 rounded-2xl p-4 shadow-xl relative overflow-hidden group/card hover:border-teal-500/30 transition-all">
                            <div className="absolute top-0 right-0 w-24 h-24 bg-teal-500/5 blur-3xl rounded-full pointer-events-none"></div>
                            
                            <h5 className="text-teal-400 font-black tracking-widest text-sm mb-4 uppercase flex items-center gap-2">
                              {nomeDoGrupo.replace('GROUP', 'GRUPO')}
                            </h5>
                            
                            <div className="flex flex-col gap-2">
                              {timesDoGrupo.map(time => {
                                // Pega o palpite específico do time no bolão atual
                                const palpiteAtual = palpitesGrupos[bolaoAtivo.id]?.[time.id] || ""
                                
                                // Posições ocupadas APENAS neste bolão específico
                                const posicoesOcupadas = timesDoGrupo
                                  .map(t => palpitesGrupos[bolaoAtivo.id]?.[t.id])
                                  .filter(Boolean)

                                return (
                                  <div key={time.id} className="flex items-center justify-between bg-white/5 border border-white/5 rounded-xl p-2 px-3 hover:bg-white/10 transition-colors">
                                    
                                    <div className="flex items-center gap-3 overflow-hidden">
                                      <img src={time.bandeira || '/placeholder-flag.png'} alt={time.nome} className="w-6 h-6 rounded-full object-cover shadow-md bg-white/5 shrink-0" />
                                      <span className="text-[10px] sm:text-xs font-bold text-gray-200 uppercase truncate">
                                        {time.nome}
                                      </span>
                                    </div>

                                    {/* Dropdown de Posição Inteligente */}
                                    <select 
                                      value={palpiteAtual}
                                      onChange={(e) => handlePosicaoChange(time.id, e.target.value)}
                                      className="bg-black/60 border border-white/10 rounded-lg text-white font-bold text-xs p-1.5 focus:border-teal-400 focus:ring-1 focus:ring-teal-400 focus:outline-none appearance-none text-center cursor-pointer hover:bg-black shrink-0 w-12 shadow-inner transition-all"
                                    >
                                      <option value="" className="bg-gray-900 text-gray-500">-</option>
                                      
                                      {[1, 2, 3, 4].map(pos => {
                                        const posString = pos.toString()
                                        // Verifica se ocupada considerando o escopo deste bolão
                                        const isOcupada = posicoesOcupadas.includes(posString) && palpiteAtual !== posString

                                        return (
                                          <option 
                                            key={pos} 
                                            value={pos} 
                                            disabled={isOcupada}
                                            className={`bg-gray-900 ${
                                              isOcupada ? 'text-gray-700' : 
                                              pos === 1 ? 'text-teal-400' : 
                                              pos === 2 ? 'text-emerald-400' : 'text-white'
                                            }`}
                                          >
                                            {pos}º
                                          </option>
                                        )
                                      })}
                                    </select>

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
              {abaAtiva === 'classificados' && (() => {
                
                // Extraímos os dados do bolão atual para gerar o funil de opções
                const state = palpitesMataMata[bolaoAtivo.id] || { r32: {}, r16: {}, qf: {}, sf: {}, campeao: '', vice: '' }
                
                // O funil: Cada fase filtra as opções disponíveis baseada nos times escolhidos na fase anterior!
                const opcoesR16 = times.filter(t => Object.values(state.r32).includes(t.id.toString()))
                const opcoesQf = times.filter(t => Object.values(state.r16).includes(t.id.toString()))
                const opcoesSf = times.filter(t => Object.values(state.qf).includes(t.id.toString()))
                const opcoesFinal = times.filter(t => Object.values(state.sf).includes(t.id.toString()))

                // Matriz para desenhar os layouts em grade magicamente
                const blocosMataMata: Array<{ key: 'r32' | 'r16' | 'qf' | 'sf', label: string, count: number, opcoes: TimeCopa[] }> = [
                  { key: 'r32', label: '16-avos de Final (32 Times)', count: 32, opcoes: times }, // Na copa de 2026 passam 32
                  { key: 'r16', label: 'Oitavas de Final (16 Times)', count: 16, opcoes: opcoesR16 },
                  { key: 'qf', label: 'Quartas de Final (8 Times)', count: 8, opcoes: opcoesQf },
                  { key: 'sf', label: 'Semifinais (4 Times)', count: 4, opcoes: opcoesSf },
                ]

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
                        
                        {/* RENDERIZA TODAS AS FASES (DE 32 ATÉ AS SEMIS) */}
                        {blocosMataMata.map(fase => {
                          const valuesOcupados = Object.values(state[fase.key])

                          return (
                            <div key={fase.key} className="bg-black/20 border border-white/5 p-4 rounded-2xl shadow-lg">
                              <h5 className="text-teal-400 font-black tracking-widest text-xs sm:text-sm mb-4 uppercase flex items-center gap-2">
                                <span className="w-2 h-2 rounded-full bg-teal-500 shadow-[0_0_8px_#14b8a6]"></span>
                                {fase.label}
                              </h5>
                              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3">
                                {Array.from({ length: fase.count }).map((_, i) => {
                                  const valueAtual = state[fase.key][i] || ""
                                  
                                  // NOVA LÓGICA: Encontra o objeto do time selecionado para puxar a bandeira
                                  const timeSelecionado = times.find(t => t.id.toString() === valueAtual)

                                  return (
                                    <div key={i} className="relative flex items-center w-full">
                                      
                                      {/* A BANDEIRA SOBREPOSTA */}
                                      {timeSelecionado && (
                                        <img 
                                          src={timeSelecionado.bandeira || '/placeholder-flag.png'} 
                                          alt={timeSelecionado.nome} 
                                          className="absolute left-2 sm:left-3 w-4 h-4 sm:w-5 sm:h-5 rounded-full object-cover shadow-sm pointer-events-none"
                                        />
                                      )}

                                      <select
                                        value={valueAtual}
                                        onChange={(e) => handleMataMataChange(fase.key, i, e.target.value)}
                                        // A classe pl-8 ou pl-10 afasta o texto para a direita abrindo espaço para a bandeira!
                                        className={`w-full bg-black/60 border border-white/10 rounded-lg text-white font-bold text-[10px] sm:text-xs py-2 sm:py-2.5 pr-2 focus:border-teal-400 focus:ring-1 focus:ring-teal-400 focus:outline-none appearance-none cursor-pointer hover:bg-white/5 transition-all truncate ${timeSelecionado ? 'pl-8 sm:pl-10 text-left' : 'pl-2 text-center'}`}
                                      >
                                        <option value="" className="text-gray-500">- Vaga {i + 1} -</option>
                                        {fase.opcoes.map(time => {
                                          const isOcupada = valuesOcupados.includes(time.id.toString()) && valueAtual !== time.id.toString()
                                          return (
                                            <option key={time.id} value={time.id} disabled={isOcupada} className={isOcupada ? 'text-gray-700' : 'text-white'}>
                                              {time.nome}
                                            </option>
                                          )
                                        })}
                                      </select>
                                    </div>
                                  )
                                })}
                              </div>
                            </div>
                          )
                        })}

                        {/* RENDERIZA A GRANDE FINAL SEPARADA COM ESTÉTICA DOURADA */}
                        <div className="bg-gradient-to-br from-amber-900/20 to-black border border-amber-500/20 p-5 rounded-2xl shadow-xl mt-4">
                          <h5 className="text-amber-400 font-black tracking-widest text-sm mb-4 uppercase text-center">🏆 Grande Final 🏆</h5>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            
                            {/* CAMPEÃO */}
                            <div className="flex flex-col gap-1.5">
                              <label className="text-[10px] text-gray-400 font-bold uppercase ml-1">Campeão</label>
                              <div className="relative flex items-center w-full">
                                {state.campeao && (() => {
                                  const timeCampeao = times.find(t => t.id.toString() === state.campeao)
                                  return timeCampeao ? (
                                    <img src={timeCampeao.bandeira || '/placeholder-flag.png'} alt={timeCampeao.nome} className="absolute left-3 w-6 h-6 rounded-full object-cover shadow-sm pointer-events-none" />
                                  ) : null
                                })()}
                                <select
                                  value={state.campeao}
                                  onChange={(e) => handleMataMataChange('campeao', 0, e.target.value)}
                                  className={`w-full bg-amber-500/10 border border-amber-500/30 rounded-xl text-amber-400 font-black text-sm py-3 pr-3 focus:border-amber-400 focus:outline-none appearance-none cursor-pointer truncate ${state.campeao ? 'pl-11 text-left' : 'pl-3 text-center'}`}
                                >
                                  <option value="" className="text-gray-500">- Escolher Campeão -</option>
                                  {opcoesFinal.map(time => (
                                    <option key={time.id} value={time.id} disabled={state.vice === time.id.toString()}>{time.nome}</option>
                                  ))}
                                </select>
                              </div>
                            </div>

                            {/* VICE-CAMPEÃO */}
                            <div className="flex flex-col gap-1.5">
                              <label className="text-[10px] text-gray-400 font-bold uppercase ml-1">Vice-Campeão</label>
                              <div className="relative flex items-center w-full">
                                {state.vice && (() => {
                                  const timeVice = times.find(t => t.id.toString() === state.vice)
                                  return timeVice ? (
                                    <img src={timeVice.bandeira || '/placeholder-flag.png'} alt={timeVice.nome} className="absolute left-3 w-6 h-6 rounded-full object-cover shadow-sm pointer-events-none" />
                                  ) : null
                                })()}
                                <select
                                  value={state.vice}
                                  onChange={(e) => handleMataMataChange('vice', 0, e.target.value)}
                                  className={`w-full bg-gray-500/10 border border-gray-500/30 rounded-xl text-gray-300 font-black text-sm py-3 pr-3 focus:border-gray-400 focus:outline-none appearance-none cursor-pointer truncate ${state.vice ? 'pl-11 text-left' : 'pl-3 text-center'}`}
                                >
                                  <option value="" className="text-gray-500">- Escolher Vice -</option>
                                  {opcoesFinal.map(time => (
                                    <option key={time.id} value={time.id} disabled={state.campeao === time.id.toString()}>{time.nome}</option>
                                  ))}
                                </select>
                              </div>
                            </div>

                          </div>
                        </div>

                      </div>
                    )}
                  </div>
                )
              })()}
              {abaAtiva === 'premios_individuais' && (() => {
                
                // Extrai o estado do bolão atual
                const state = palpitesPremios[bolaoAtivo.id] || {
                  bolaDeOuro: { timeId: '', jogador: '' },
                  chuteiraDeOuro: { timeId: '', jogador: '' },
                  luvaDeOuro: { timeId: '', jogador: '' }
                }

                // Configuração visual de cada card (O Tailwind exige a string completa para não apagar a classe)
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
                        // Procura a seleção escolhida para pegar a bandeira
                        const timeSelecionado = times.find(t => t.id.toString() === valorAtual.timeId);

                        return (
                          <div key={premio.key} className={`bg-gradient-to-br ${premio.theme.bg} to-black/40 border ${premio.theme.border} p-5 rounded-2xl shadow-xl transition-all`}>
                            <h5 className={`${premio.theme.text} font-black tracking-widest text-sm mb-4 uppercase flex items-center gap-2`}>
                              <span className="text-xl drop-shadow-md">{premio.icon}</span> {premio.label}
                            </h5>

                            <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
                              
                              {/* SELETOR DA SELEÇÃO */}
                              <div className="relative flex items-center w-full sm:w-2/5">
                                {timeSelecionado && (
                                  <img 
                                    src={timeSelecionado.bandeira || '/placeholder-flag.png'} 
                                    alt={timeSelecionado.nome} 
                                    className="absolute left-3 w-6 h-6 rounded-full object-cover shadow-sm pointer-events-none" 
                                  />
                                )}
                                <select
                                  value={valorAtual.timeId}
                                  onChange={(e) => {
                                    // Quando troca o time, limpa o jogador escolhido anteriormente
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
                              </div>

                              {/* SELETOR DO JOGADOR */}
                              <div className="w-full sm:w-3/5">
                                <select
                                  value={valorAtual.jogador}
                                  onChange={(e) => handlePremioChange(premio.key, 'jogador', e.target.value)}
                                  disabled={!valorAtual.timeId}
                                  className={`w-full bg-black/60 border border-white/10 rounded-xl text-white font-bold text-sm p-3.5 focus:outline-none ${premio.theme.focus} transition-all appearance-none cursor-pointer ${!valorAtual.timeId ? 'opacity-50 cursor-not-allowed' : ''}`}
                                >
                                  <option value="" className="text-gray-500">
                                    {!valorAtual.timeId ? '← Escolha a seleção primeiro' : '- Escolha o jogador -'}
                                  </option>
                                  
                                  {/* Filtro Duplo: Filtra por time e, SE for Luva de Ouro, exige que seja Goalkeeper */}
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
