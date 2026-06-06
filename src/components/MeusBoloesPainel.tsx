'use client'
import { useState } from 'react'

interface Bolao {
  id: string
  nome: string
}

export default function MeusBoloesPainel() {
  const [boloes, setBoloes] = useState<Bolao[]>([])
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [bolaoAtivo, setBolaoAtivo] = useState<Bolao | null>(null)
  const [abaAtiva, setAbaAtiva] = useState('1a_fase')

  // Cria o Bolão X (Sendo X o menor número natural > 0 ainda não utilizado)
  const handleCriarBolao = () => {
    const numerosUtilizados = boloes.map(b => {
      const match = b.nome.match(/Bolão (\d+)/)
      return match ? parseInt(match[1]) : 0
    })

    let proximoNumero = 1
    while (numerosUtilizados.includes(proximoNumero)) {
      proximoNumero++
    }

    const novoBolao: Bolao = {
      id: crypto.randomUUID(), // No futuro, isso virá do INSERT no Supabase
      nome: `Bolão ${proximoNumero}`
    }

    setBoloes([...boloes, novoBolao])
  }

  const handleAbrirBolao = (bolao: Bolao) => {
    setBolaoAtivo(bolao)
    setAbaAtiva('1a_fase') // Reseta para a primeira aba
    setIsModalOpen(true)
  }

  return (
    <>
      {/* Substitui o bloco estático no Grid do Dashboard */}
      <div className="bg-white/[0.02] border border-white/5 rounded-3xl p-6 backdrop-blur-xl md:col-span-2 flex flex-col justify-between group hover:border-teal-500/20 transition-all">
        <div>
          <div className="flex justify-between items-start mb-4">
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <span>🎟️</span> Meus Bolões
            </h2>
            <span className="text-[10px] font-bold bg-teal-500/10 text-teal-400 px-2.5 py-1 rounded-full uppercase tracking-wider">
              {boloes.length} Ativos
            </span>
          </div>
          
          {boloes.length === 0 ? (
            /* Estado Vazio */
            <div className="border-2 border-dashed border-white/5 rounded-2xl p-8 text-center my-4 bg-black/20">
              <span className="text-3xl mb-2 block">🔮</span>
              <p className="text-sm font-semibold text-gray-300">Você ainda não tem nenhum palpite salvo</p>
              <p className="text-xs text-gray-500 mt-1 max-w-xs mx-auto">Crie seu bilhete de apostas e garanta sua vaga antes da abertura da Copa.</p>
            </div>
          ) : (
            /* Lista de Bolões Criados */
            <div className="grid gap-3 my-4 sm:grid-cols-2">
              {boloes.map((bolao) => (
                <button
                  key={bolao.id}
                  onClick={() => handleAbrirBolao(bolao)}
                  className="p-4 bg-white/5 border border-white/10 rounded-xl text-left text-white font-bold hover:bg-white/10 hover:border-teal-500/30 transition-all flex justify-between items-center group/item"
                >
                  <span>{bolao.nome}</span>
                  <span className="text-xs text-teal-400 opacity-0 group-hover/item:opacity-100 transition-opacity">Preencher Palpites →</span>
                </button>
              ))}
            </div>
          )}
        </div>

        <button 
          onClick={handleCriarBolao}
          className="w-full sm:w-auto self-end mt-4 py-3 px-6 bg-gradient-to-r from-teal-500 to-emerald-500 hover:from-teal-400 hover:to-emerald-400 text-black font-black uppercase text-xs tracking-wider rounded-xl transition-all shadow-md transform hover:-translate-y-0.5"
        >
          + Criar Novo Bolão
        </button>
      </div>

      {/* MODAL DE PALPITES (A ARCA DOS JOGOS) */}
      {isModalOpen && bolaoAtivo && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-0 sm:p-4 bg-black/90 backdrop-blur-sm">
          
          {/* Container do Modal */}
          <div className="bg-[#0a0a0a] border-0 sm:border border-white/10 w-full sm:max-w-4xl h-full sm:h-[85vh] flex flex-col justify-between sm:rounded-3xl shadow-2xl relative overflow-hidden">
            
            {/* TOPO: Nome do Bolão Ativo */}
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

            {/* CENTRO: Área de Conteúdo Dinâmico com os Formulários */}
            <div className="flex-1 overflow-y-auto p-6 text-gray-400">
              {abaAtiva === '1a_fase' && <div className="animate-fade-in"><h4 className="text-white font-bold mb-4">Palpites — 1ª Fase (72 Jogos)</h4><p className="text-xs">Insira os placares das partidas da fase de grupos.</p>{/* <FormPrimeiraFase /> */}</div>}
              {abaAtiva === '2a_fase' && <div className="animate-fade-in"><h4 className="text-white font-bold mb-4">Palpites — 2ª Fase (Mata-Mata)</h4><p className="text-xs">Disponível após o encerramento da fase de grupos.</p></div>}
              {abaAtiva === 'grupos' && <div className="animate-fade-in"><h4 className="text-white font-bold mb-4">Classificação dos Grupos (A ao L)</h4><p className="text-xs">Defina a ordem do 1º ao 4º lugar de cada chave.</p></div>}
              {abaAtiva === 'classificados' && <div className="animate-fade-in"><h4 className="text-white font-bold mb-4">Times Classificados por Fase</h4><p className="text-xs">Escolha quem avança para as Oitavas, Quartas, Semis e Grande Final.</p></div>}
              {abaAtiva === 'premios_individuais' && <div className="animate-fade-in"><h4 className="text-white font-bold mb-4">Prêmios Individuais de Fim de Copa</h4><p className="text-xs">Digite seus palpites para o craque do gol e o artilheiro do campeonato.</p></div>}
            </div>

            {/* RODAPÉ: Abas de Navegação (Fixo embaixo) */}
            <div className="border-t border-white/5 bg-black/60 backdrop-blur-md px-2 py-3 overflow-x-auto flex gap-1 scrollbar-none justify-start sm:justify-center">
              <AbaButton id="1a_fase" label="1ª Fase" ativo={abaAtiva === '1a_fase'} onClick={setAbaAtiva} />
              <AbaButton id="2a_fase" label="2ª Fase" ativo={abaAtiva === '2a_fase'} onClick={setAbaAtiva} />
              <AbaButton id="grupos" label="Grupos" ativo={abaAtiva === 'grupos'} onClick={setAbaAtiva} />
              <AbaButton id="classificados" label="Classificados" ativo={abaAtiva === 'classificados'} onClick={setAbaAtiva} />
              {/* Artilheiro e Luva de ouro agrupados aqui 👇 */}
              <AbaButton id="premios_individuais" label="Prêmios Individuais" ativo={abaAtiva === 'premios_individuais'} onClick={setAbaAtiva} />
            </div>

          </div>
        </div>
      )}
    </>
  )
}

/* Sub-componente de botão de aba para manter o código limpo */
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
