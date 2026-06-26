'use client'

interface JogadorRanking {
  id: string
  nomeUsuario: string
  nomeBolao: string
  pontuacao_total: number
  posicaoReal: number 
  isMeuBolao?: boolean
}

interface RankingModalProps {
  isOpen: boolean
  onClose: () => void
  listaRanking: JogadorRanking[]
  bolaoAtivoId?: string
}

export default function RankingModal({ isOpen, onClose, listaRanking, bolaoAtivoId }: RankingModalProps) {
  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-0 sm:p-4 bg-black/90 backdrop-blur-sm animate-fade-in">
      <div className="bg-[#0a0a0a] border-0 sm:border border-white/10 w-full sm:max-w-3xl h-full sm:h-[85vh] flex flex-col justify-between sm:rounded-3xl shadow-2xl relative overflow-hidden">
        
        <div className="p-4 sm:p-6 border-b border-white/5 flex justify-between items-center bg-black/40 backdrop-blur-md shrink-0">
          <div>
            <span className="text-xs font-bold uppercase tracking-[0.2em] text-emerald-400">Ranking Geral</span>
            <h3 className="text-lg sm:text-xl font-black text-white uppercase mt-0.5">Classificação do Bolão</h3>
          </div>
          <button 
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-sm font-bold transition-all border border-white/10 bg-white/5 hover:bg-white/10 text-gray-300 hover:text-white"
          >
            Fechar
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 sm:p-6 flex flex-col gap-2 bg-white/5">
          {listaRanking?.map((jogador) => {
            const isMeu = jogador.isMeuBolao || String(jogador.id) === String(bolaoAtivoId)

            // Hierarquia de Estilos: Pódio (Ouro/Prata/Bronze) -> Meu Bolão -> Padrão
            let containerClasses = 'bg-black/40 border-white/5 hover:bg-white/[0.02]'
            let nameColor = 'text-white'
            let scoreColor = 'text-emerald-400'

            if (jogador.posicaoReal === 1) {
              containerClasses = 'bg-gradient-to-r from-amber-500/25 via-yellow-500/10 to-transparent border-amber-500/50 shadow-[0_0_15px_rgba(245,158,11,0.15)] scale-[1.01] z-10'
              nameColor = 'text-amber-300'
              scoreColor = 'text-amber-400'
            } else if (jogador.posicaoReal === 2) {
              containerClasses = 'bg-gradient-to-r from-slate-400/25 via-gray-400/10 to-transparent border-slate-400/50 shadow-[0_0_15px_rgba(148,163,184,0.15)] scale-[1.01] z-10'
              nameColor = 'text-slate-200'
              scoreColor = 'text-slate-300'
            } else if (jogador.posicaoReal === 3) {
              containerClasses = 'bg-gradient-to-r from-amber-700/35 via-orange-800/10 to-transparent border-amber-700/50 shadow-[0_0_15px_rgba(180,83,9,0.15)] scale-[1.01] z-10'
              nameColor = 'text-orange-400'
              scoreColor = 'text-orange-400'
            } else if (isMeu) {
              containerClasses = 'bg-gradient-to-r from-emerald-600/20 to-teal-500/10 border-emerald-500/50 shadow-[0_0_15px_rgba(16,185,129,0.15)] scale-[1.01] z-10'
              nameColor = 'text-emerald-300'
              scoreColor = 'text-emerald-400'
            }

            return (
              <div 
                key={jogador.id} 
                className={`flex justify-between items-center p-4 rounded-2xl border transition-all duration-300 ${containerClasses}`}
              >
                <div className="flex items-center gap-4 min-w-0">
                  <div className="w-8 flex justify-center shrink-0">
                    {jogador.posicaoReal === 1 ? <span className="text-2xl drop-shadow-[0_0_10px_rgba(251,191,36,0.6)]">🥇</span> :
                     jogador.posicaoReal === 2 ? <span className="text-2xl drop-shadow-[0_0_10px_rgba(156,163,175,0.6)]">🥈</span> :
                     jogador.posicaoReal === 3 ? <span className="text-2xl drop-shadow-[0_0_10px_rgba(180,83,9,0.6)]">🥉</span> :
                     <span className={`font-black text-lg ${isMeu ? 'text-emerald-400' : 'text-gray-600'}`}>{jogador.posicaoReal}º</span>}
                  </div>

                  <div className="flex flex-col truncate">
                    <span className={`font-bold text-sm sm:text-base truncate ${nameColor}`}>
                      {jogador.nomeUsuario}
                    </span>
                    <span className="text-xs text-gray-500 uppercase tracking-wider truncate mt-0.5">
                      {jogador.nomeBolao}
                    </span>
                  </div>
                </div>

                <div className="flex flex-col items-end shrink-0 ml-4">
                  <span className={`font-black text-lg sm:text-xl leading-none ${scoreColor}`}>
                    {jogador.pontuacao_total}
                  </span>
                  <span className="text-[10px] uppercase font-bold text-gray-500 mt-1 tracking-widest">
                    Pontos
                  </span>
                </div>
              </div>
            )
          })}

          {listaRanking?.length === 0 && (
            <div className="text-center text-gray-500 py-10 text-sm">
              Nenhum bolão encontrado.
            </div>
          )}
        </div>

      </div>
    </div>
  )
}
