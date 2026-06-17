'use client'

import { useState } from 'react'
import RankingModal from './RankingModal'

interface JogadorRanking {
  id: string
  nomeUsuario: string
  nomeBolao: string
  pontuacao_total: number
  posicaoReal: number // O Front-end agora EXIGE essa variável
}

interface PainelTabelaClientProps {
  listaRanking: JogadorRanking[]
  bolaoAtivoId?: string
}

export default function PainelTabelaClient({ listaRanking, bolaoAtivoId }: PainelTabelaClientProps) {
  const [isModalTabelaOpen, setIsModalTabelaOpen] = useState(false)

  return (
    <>
      <div className="bg-white/5 border border-emerald-600 rounded-3xl p-6 backdrop-blur-xl flex flex-col group transition-all relative overflow-hidden">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <span>👑</span> Ranking
          </h2>
          <span className="text-[10px] font-bold text-emerald-400 border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 rounded-full uppercase tracking-wider">
            Ao Vivo
          </span>
        </div>
        
        <div className="flex-1 relative flex flex-col mt-2">
          <div className="flex flex-col gap-2">
            {/* O map agora NÃO usa mais o 'index', apenas a 'posicaoReal' do jogador */}
            {listaRanking?.slice(0, 5).map((jogador) => (
              <div key={jogador.id} className="flex justify-between items-center bg-black/40 p-3 rounded-xl border border-white/5">
                <div className="flex items-center gap-3 min-w-0">
                  <span className={`font-black text-sm w-5 text-center ${jogador.posicaoReal === 1 ? 'text-amber-400' : jogador.posicaoReal === 2 ? 'text-gray-300' : jogador.posicaoReal === 3 ? 'text-amber-700' : 'text-gray-600'}`}>
                    {jogador.posicaoReal}º
                  </span>
                  <div className="flex flex-col truncate">
                    <span className="font-bold text-white text-xs sm:text-sm truncate">
                      {jogador.nomeUsuario} <span className="text-gray-500 font-normal">/ {jogador.nomeBolao}</span>
                    </span>
                  </div>
                </div>
                <div className="font-black text-emerald-400 text-sm shrink-0 ml-2">
                  {jogador.pontuacao_total} <span className="text-[10px] font-normal opacity-70">pts</span>
                </div>
              </div>
            ))}

            {listaRanking?.length === 0 && (
              <div className="text-center text-sm text-gray-500 py-4">Nenhum dado disponível</div>
            )}
          </div>

          <div className="absolute bottom-0 left-0 right-0 h-16 bg-gradient-to-t from-[#0a0a0a] to-transparent pointer-events-none rounded-b-2xl"></div>
        </div>

        <button 
          onClick={() => setIsModalTabelaOpen(true)}
          className="mt-4 w-full py-3 rounded-xl font-bold text-sm transition-all border border-white/10 bg-white/5 hover:bg-white/10 text-gray-300 hover:text-white"
        >
          Abrir Ranking
        </button>
      </div>

      <RankingModal 
        isOpen={isModalTabelaOpen} 
        onClose={() => setIsModalTabelaOpen(false)} 
        listaRanking={listaRanking}
        bolaoAtivoId={bolaoAtivoId}
      />
    </>
  )
}
