'use client'
import { useState } from 'react'

export default function RegulamentoModal() {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <>
      {/* Botão no Dashboard */}
      <div className="bg-white/[0.02] border border-white/5 rounded-3xl p-6 backdrop-blur-xl flex flex-col justify-between group hover:border-gray-500/20 transition-all">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2 mb-4">
            <span>📜</span> Regulamento
          </h2>
          <p className="text-xs text-gray-400 leading-relaxed">
            Consulte as regras oficiais de funcionamento, prazos de bloqueio, tabela detalhada de pontuação e divisão da premiação.
          </p>
        </div>
        
        <button 
          onClick={() => setIsOpen(true)}
          className="w-full mt-6 py-3 px-4 bg-white/5 border border-white/10 hover:bg-white/10 text-white font-bold text-xs uppercase tracking-wider rounded-xl transition-colors text-center"
        >
          Ler Regulamento Completo
        </button>
      </div>

      {/* Caixa Flutuante (Modal Overlay) */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
          
          <div className="bg-[#0a0a0a]/95 border border-white/10 w-full max-w-3xl max-h-[85vh] overflow-y-auto rounded-3xl p-6 sm:p-8 shadow-2xl relative text-gray-300 selection:bg-teal-500 selection:text-white backdrop-blur-xl scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent">
            
            {/* Botão de Fechar */}
            <button 
              onClick={() => setIsOpen(false)}
              className="absolute top-6 right-6 text-gray-400 hover:text-white text-xs font-bold bg-white/5 hover:bg-white/10 px-3 py-1.5 rounded-full transition-colors z-10"
            >
              Fechar ✕
            </button>

            {/* Cabeçalho do Modal */}
            <div className="mb-8 pr-12">
              <span className="text-xs font-bold uppercase tracking-[0.2em] text-teal-400">Documento Oficial</span>
              <h3 className="text-2xl font-black text-white uppercase mt-1">Regulamento do Bolão</h3>
            </div>

            {/* Corpo do Texto */}
            <div className="space-y-8 text-sm leading-relaxed border-t border-white/5 pt-6 text-gray-400">
              
              {/* Box de Aviso Importante */}
              <div className="bg-amber-500/10 border border-amber-500/20 p-4 rounded-xl text-amber-300 flex items-start gap-3">
                <span className="text-xl">⚠️</span>
                <div>
                  <h4 className="font-bold text-amber-400 uppercase tracking-wide text-xs mb-1">Importante!</h4>
                  <p>Este bolão não possui fins lucrativos e destina-se exclusivamente à participação de amigos.</p>
                </div>
              </div>

              {/* Seção: Funcionamento */}
              <section>
                <h4 className="text-lg font-bold text-white mb-3 flex items-center gap-2"><span className="text-teal-400">#</span> Funcionamento</h4>
                <p>Para participar, é necessário realizar o cadastro com o nome completo e um email válido. Feito o cadastro, clique em CRIAR NOVO BOLÃO. Será liberado o BOLÃO 1 para preenchimento dos palpites.</p>
                <ul className="list-decimal pl-5 mt-3 space-y-1 text-gray-300">
                  <li>A aceitação do cadastro está condicionada ao participante ser <strong>maior de 18 anos</strong>.</li>
                  <li><strong>Não há limite</strong> para o número de bolões de um mesmo participante.</li>
                </ul>
              </section>

              {/* Seção: Palpites e Cronograma */}
              <section>
                <h4 className="text-lg font-bold text-white mb-3 flex items-center gap-2"><span className="text-teal-400">#</span> Palpites & Prazos</h4>
                <p>Os palpites estão divididos em 6 etapas: <strong>1ª Fase</strong>, <strong>Grupos</strong>, <strong>Classificados</strong>, <strong>2ª Fase</strong>, <strong>Bola de Ouro</strong> (melhor jogador da copa), <strong>Chuteira de Ouro</strong> (Artilheiro) e <strong>Luva de Ouro</strong> (melhor goleiro).</p>
                
                <div className="space-y-3 mt-4 text-gray-300">
                  <p><strong>1ª Fase:</strong> Preenchimento dos resultados das 72 partidas iniciais.</p>
                  <p><strong>Grupos:</strong> Definir a colocação das seleções em cada grupo. A escolha independe dos resultados apostados na 1ª Fase.</p>
                  <p><strong>Classificados:</strong> Escolher as 32 seleções classificadas para a 2ª fase, as 16 classificadas para as oitavas, as 8 classificadas para as quartas, as 4 classificadas para as semifinais e as seleções Campeã e Vice-Campeã. A escolha independe das fases anteriores e não se limita a três seleções por grupo.</p>
                  <p><strong>2ª Fase:</strong> Resultados dos jogos eliminatórios (disponíveis após a definição das seleções classificadas).</p>
                  <p><strong>Prêmios Individuais:</strong> Apontar o <em>Bola de Ouro</em> (melhor jogador, eleito pela FIFA), <em>Chuteira de Ouro</em> (mais gols) e o <em>Luva de Ouro</em> (melhor goleiro, eleito pela FIFA).</p>
                </div>

                <div className="bg-white/5 border border-white/10 p-4 rounded-xl mt-4">
                  <h5 className="font-bold text-white mb-2 uppercase text-xs tracking-wider">Cronograma de Prazos</h5>
                  <ul className="space-y-2">
                    <li><strong className="text-teal-400">1ª Fase, Grupos, Classificados e Prêmios Individuais:</strong> Os palpites serão bloqueados 2 horas antes do 1º jogo da Copa (11 de Junho de 2026 às 14h).</li>
                    <li><strong className="text-teal-400">2ª Fase:</strong> Os palpites serão bloqueados para cada partida 30 minutos antes do seu início.</li>
                  </ul>
                </div>
              </section>

              {/* Seção: Pontuação */}
              <section>
                <h4 className="text-lg font-bold text-white mb-3 flex items-center gap-2"><span className="text-teal-400">#</span> Pontuação</h4>
                
                <div className="grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="bg-white/[0.02] border border-white/5 p-4 rounded-xl">
                    <h5 className="font-bold text-white mb-2">Partidas (1ª e 2ª Fase)</h5>
                    <ul className="space-y-1">
                      <li>Acertar placar exato: <strong className="text-teal-400">10 pts</strong> <span className="text-xs text-teal-400">(pontuação máxima por jogo)</span></li>
                      <li>Acertar vencedor/empate: <strong className="text-teal-400">5 pts</strong></li>
                      <li>Acertar gols de um time: <strong className="text-teal-400">2 pts</strong></li>
                    </ul>
                    <p className="text-[10px] mt-2 text-amber-400/80 leading-tight">Válido apenas os 90 min (sem prorrogação/pênaltis).</p>
                  </div>

                  <div className="bg-white/[0.02] border border-white/5 p-4 rounded-xl">
                    <h5 className="font-bold text-white mb-2">Grupos</h5>
                    <p>Acertar colocação exata da seleção no grupo: <strong className="text-teal-400">3 pts</strong> <span className="text-xs text-teal-400">(para cada acerto)</span></p>
                  </div>

                  <div className="bg-white/[0.02] border border-white/5 p-4 rounded-xl sm:col-span-2">
                    <h5 className="font-bold text-white mb-2">Classificados (Eliminatórias)</h5>
                    <ul className="space-y-2 grid sm:grid-cols-1 gap-x-4">
                      <li>Acertar seleção classificada para as  Eliminatórias: <strong className="text-teal-400">1 pt</strong> <span className="text-xs text-teal-400">(bônus: +8 pts se acertar as 32 seleções)</span></li>
                      <li>Acertar seleção classificada para as Oitavas de Final: <strong className="text-teal-400">2 pts</strong> <span className="text-xs text-teal-400">(bônus: +8 pts se acertar as 16 seleções)</span></li>
                      <li>Acertar seleção classificada para as Quartas de Final: <strong className="text-teal-400">5 pts</strong> <span className="text-xs text-teal-400">(bônus: +10 pts se acertar as 8 seleções)</span></li>
                      <li>Acertar seleção classificada para as Semifinais: <strong className="text-teal-400">10 pts</strong> <span className="text-xs text-teal-400">(bônus: +10 pts se acertar as 4 seleções)</span></li>
                      <li>Acertar seleção Vice-Campeã: <strong className="text-teal-400">30 pts</strong></li>
                      <li>Acertar seleção Campeã: <strong className="text-teal-400">40 pts</strong></li>
                    </ul>
                  </div>

                  <div className="bg-white/[0.02] border border-white/5 p-4 rounded-xl sm:col-span-2 flex justify-between items-center">
                    <div>
                      <h5 className="font-bold text-white mb-2">Prêmios Individuais</h5>
                      <ul className="space-y-2 grid sm:grid-cols-1 gap-x-4">
                        <li>
                          Acertar Luva de Ouro (melhor goleiro, eleito pela FIFA): <strong className="text-teal-400">20 pts</strong> 
                        </li>
                        <li>
                          Acertar Chuteira de Ouro (Artilheiro): <strong className="text-teal-400">25 pts</strong> 
                        </li>
                        <li>
                          Acertar Bola de Ouro (melhor jogador, eleito pela FIFA): <strong className="text-teal-400">30 pts</strong> 
                        </li>
                      </ul>
                    </div>
                  </div>
                </div>
              </section>

              {/* Seção: Premiação */}
              <section>
                <h4 className="text-lg font-bold text-white mb-3 flex items-center gap-2"><span className="text-amber-400">#</span> Premiação</h4>
                <p>Arrecadação (R$ 30 por bolão) será dividida em: <strong className="text-white">65% para o prêmio</strong> e 35% para cobrir os custos da organização.</p>
                <div className="flex gap-4 mt-3 mb-4">
                  <span className="bg-amber-500/10 text-amber-400 px-3 py-1 rounded-lg font-bold">1º Lugar: 50%</span>
                  <span className="bg-gray-400/10 text-gray-300 px-3 py-1 rounded-lg font-bold">2º Lugar: 30%</span>
                  <span className="bg-orange-500/10 text-orange-300 px-3 py-1 rounded-lg font-bold">3º Lugar: 20%</span>
                </div>
                <div className="text-xs text-gray-400 space-y-2 bg-white/[0.02] p-4 rounded-xl border border-white/5">
                  <p><strong className="text-gray-300">Empate no 1º Lugar:</strong> 2 pessoas dividem 80% (1º + 2º) do prêmio e o 3º leva 20%. Se 3 ou mais empatarem, dividem igualmente 100% do prêmio.</p>
                  <p><strong className="text-gray-300">Empate no 2º Lugar:</strong> Dividem 50% (2º + 3º) do prêmio. O 1º colocado leva seus 50% normalmente.</p>
                  <p><strong className="text-gray-300">Empate no 3º Lugar:</strong> Dividem os 20% do prêmio.</p>
                </div>
              </section>

              {/* Seção: Contato e Transparência */}
              <section className="pb-6">
                <h4 className="text-lg font-bold text-white mb-3 flex items-center gap-2"><span className="text-teal-400">#</span> Transparência & Contato</h4>
                <p>Antes do início da copa, uma planilha com os palpites de todos os participantes para a 1ª Fase, Grupos, Classificados e Prêmios Individuais será enviada por email para fins de registro das apostas. O ranking e os palpites de todos os competidores estarão disponíveis a qualquer momento no menu <span className="text-teal-400">Tabela/Palpites</span>.</p>
                <p className="mt-2">Após o término de cada partida, a pontuação e classificação geral dos apostadores serão atualizadas.</p>
                <p className="mt-2">E, por fim, a organização entrará em contato com os ganhadores após o término da contagem dos pontos e conferência de todas as apostas.</p>
                <p className="mt-2">Em caso de dúvidas, envie um email para: <a href="mailto:contato@bolaoworldcup2026.com.br" className="text-teal-400 hover:underline font-bold">contato@bolaoworldcup2026.com.br</a></p>
                
                <p className="mt-8 text-center text-lg font-black text-white uppercase tracking-widest drop-shadow-md">
                  Seja bem-vindo e <span className="text-transparent bg-clip-text bg-gradient-to-r from-teal-400 to-emerald-400">Boa Sorte!</span> ⚽
                </p>
              </section>

            </div>
          </div>
        </div>
      )}
    </>
  )
}
