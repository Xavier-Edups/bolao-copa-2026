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
                <p className="mt-3">A cada palpite feito, clique em SALVAR. Ainda será possível alterá-los até o prazo daquele tipo de palpite. Em seguida, realize o pagamento via PIX pela aba PAGAMENTO no menu principal. O valor é de <strong className="text-emerald-400">R$ 30,00 por bolão</strong>.</p>
              </section>

              {/* Seção: Palpites e Cronograma */}
              <section>
                <h4 className="text-lg font-bold text-white mb-3 flex items-center gap-2"><span className="text-teal-400">#</span> Palpites & Prazos</h4>
                <p>Os palpites estão divididos em 6 etapas: 1ª Fase, Grupos, Classificados, 2ª Fase, Artilheiro e Luva de Ouro.</p>
                
                <div className="space-y-3 mt-4 text-gray-300">
                  <p><strong>1ª Fase:</strong> Preenchimento dos resultados das 72 partidas iniciais.</p>
                  <p><strong>Grupos:</strong> Definir a colocação em cada grupo. A escolha independe dos resultados apostados na 1ª Fase.</p>
                  <p><strong>Classificados:</strong> Escolher 32 para o mata-mata, 16 para as oitavas, 8 para as quartas, 4 para as semifinais, Campeão e Vice. <em>A escolha independe das fases anteriores e não se limita a duas seleções por grupo</em>.</p>
                  <p><strong>2ª Fase:</strong> Resultados dos jogos eliminatórios (disponíveis após a definição dos times).</p>
                  <p><strong>Prêmios Individuais:</strong> Apontar o <em>Artilheiro</em> (mais gols) e o <em>Luva de Ouro</em> (melhor goleiro, eleito pela FIFA).</p>
                </div>

                <div className="bg-white/5 border border-white/10 p-4 rounded-xl mt-4">
                  <h5 className="font-bold text-white mb-2 uppercase text-xs tracking-wider">Cronograma de Prazos</h5>
                  <ul className="space-y-2">
                    <li><strong className="text-teal-400">1ª e 2ª Fase:</strong> Bloqueia individualmente antes do início de cada jogo.</li>
                    <li><strong className="text-teal-400">Grupos, Classificados, Artilheiro e Luva de Ouro:</strong> Bloqueiam juntas antes do 1º jogo da Copa (África do Sul x México - 11 de Junho de 2026 às 16:00).</li>
                  </ul>
                </div>
              </section>

              {/* Seção: Pontuação */}
              <section>
                <h4 className="text-lg font-bold text-white mb-3 flex items-center gap-2"><span className="text-teal-400">#</span> Pontuação</h4>
                
                <div className="grid sm:grid-cols-2 gap-4">
                  <div className="bg-white/[0.02] border border-white/5 p-4 rounded-xl">
                    <h5 className="font-bold text-white mb-2">Partidas (1ª e 2ª Fase)</h5>
                    <ul className="space-y-1">
                      <li>Placar Exato: <strong className="text-teal-400">10 pts</strong></li>
                      <li>Acertar Vencedor/Empate: <strong className="text-emerald-400">5 pts</strong></li>
                      <li>Acertar gols de um time: <strong className="text-emerald-400">+2 pts</strong></li>
                    </ul>
                    <p className="text-[10px] mt-2 text-amber-400/80 leading-tight">Válido apenas os 90 min (sem prorrogação/pênaltis).</p>
                  </div>

                  <div className="bg-white/[0.02] border border-white/5 p-4 rounded-xl">
                    <h5 className="font-bold text-white mb-2">Grupos</h5>
                    <p>Colocação exata da seleção no grupo: <strong className="text-teal-400">3 pts</strong> por acerto.</p>
                  </div>

                  <div className="bg-white/[0.02] border border-white/5 p-4 rounded-xl sm:col-span-2">
                    <h5 className="font-bold text-white mb-2">Classificados (Mata-Mata)</h5>
                    <ul className="space-y-2 grid sm:grid-cols-2 gap-x-4">
                      <li>Acertar time no Mata-Mata: <strong className="text-white">1 pt</strong> <span className="text-xs text-teal-400">(Bônus: +8 pts se acertar os 32)</span></li>
                      <li>Acertar time nas Oitavas: <strong className="text-white">2 pts</strong> <span className="text-xs text-teal-400">(Bônus: +8 pts se acertar os 16)</span></li>
                      <li>Acertar time nas Quartas: <strong className="text-white">5 pts</strong> <span className="text-xs text-teal-400">(Bônus: +10 pts se acertar os 8)</span></li>
                      <li>Acertar time nas Semis: <strong className="text-white">10 pts</strong> <span className="text-xs text-teal-400">(Bônus: +10 pts se acertar os 4)</span></li>
                      <li>Acertar o Campeão: <strong className="text-amber-400">40 pts</strong></li>
                      <li>Acertar o Vice-Campeão: <strong className="text-gray-300">30 pts</strong></li>
                    </ul>
                  </div>

                  <div className="bg-white/[0.02] border border-white/5 p-4 rounded-xl sm:col-span-2 flex justify-between items-center">
                    <div>
                      <h5 className="font-bold text-white">Artilheiro & Luva de Ouro</h5>
                      <p className="text-xs mt-1">Acertar o jogador específico (acertar só o país não pontua).</p>
                    </div>
                    <strong className="text-teal-400 text-xl text-right shrink-0">35 pts <span className="text-sm font-normal">cada</span></strong>
                  </div>
                </div>
              </section>

              {/* Seção: Premiação */}
              <section>
                <h4 className="text-lg font-bold text-white mb-3 flex items-center gap-2"><span className="text-amber-400">#</span> Premiação</h4>
                <p>Arrecadação (R$ 30 por bolão) será dividida em: <strong className="text-white">65% para o prêmio</strong> e 35% para os custos.</p>
                <div className="flex gap-4 mt-3 mb-4">
                  <span className="bg-amber-500/10 text-amber-400 px-3 py-1 rounded-lg font-bold">1º Lugar: 50%</span>
                  <span className="bg-gray-400/10 text-gray-300 px-3 py-1 rounded-lg font-bold">2º Lugar: 30%</span>
                  <span className="bg-orange-500/10 text-orange-300 px-3 py-1 rounded-lg font-bold">3º Lugar: 20%</span>
                </div>
                <div className="text-xs text-gray-400 space-y-2 bg-white/[0.02] p-4 rounded-xl border border-white/5">
                  <p><strong className="text-gray-300">Empate no 1º Lugar:</strong> 2 pessoas dividem 80% (1º + 2º) e o 3º leva 20%. Se 3 ou mais empatarem, dividem 100%.</p>
                  <p><strong className="text-gray-300">Empate no 2º Lugar:</strong> Dividem 50% (2º + 3º). O 1º leva seus 50% normalmente.</p>
                  <p><strong className="text-gray-300">Empate no 3º Lugar:</strong> Dividem os 20%.</p>
                </div>
              </section>

              {/* Seção: Contato e Transparência */}
              <section className="pb-6">
                <h4 className="text-lg font-bold text-white mb-3 flex items-center gap-2"><span className="text-teal-400">#</span> Transparência & Contato</h4>
                <p>Após o início de cada etapa, uma planilha com todos os palpites será enviada por email. O ranking e as escolhas de todos os competidores ficarão públicos no endereço <a href="https://www.bolaoworldcup2026.com.br" className="text-teal-400 hover:underline">www.bolaoworldcup2026.com.br</a>.</p>
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
