import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import { logout } from '../auth/actions'
import Link from 'next/link'
import RegulamentoModal from '@/components/RegulamentoModal'

export default async function DashboardPage() {
  const supabase = await createClient()

  // Recupera o usuário logado
  const { data: { user } } = await supabase.auth.getUser()

  // Proteção: Se não estiver logado, joga para a tela de login
  if (!user) {
    redirect('/login')
  }

  // Pega o nome completo salvo nos metadados do cadastro (ou usa 'Craque' como fallback)
  const nomeUsuario = user.user_metadata?.full_name || 'Craque'

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white font-sans relative overflow-hidden pb-12 selection:bg-teal-500 selection:text-white">
      
      {/* Luzes de Fundo (Glows) */}
      <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-teal-900/10 blur-[150px] pointer-events-none rounded-full"></div>
      <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-emerald-900/10 blur-[150px] pointer-events-none rounded-full"></div>

      {/* Topbar/Navbar do Dashboard */}
      <nav className="relative z-10 w-full border-b border-white/5 bg-black/40 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-6 py-4 flex justify-between items-center">
          <Link href="/" className="text-sm font-black tracking-wider uppercase hover:opacity-80 transition-opacity">
            Bolão <span className="text-transparent bg-clip-text bg-gradient-to-r from-teal-400 to-emerald-400">World Cup 2026</span>
          </Link>
          <form action={logout}>
            <button type="submit" className="px-4 py-1.5 text-xs font-bold text-red-400 bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 rounded-full transition-colors">
              Sair
            </button>
          </form>
        </div>
      </nav>

      {/* Header com Boas-Vindas */}
      <header className="relative z-10 max-w-7xl mx-auto px-6 pt-10 pb-6">
        <span className="text-xs font-bold uppercase tracking-[0.3em] text-teal-400">Painel Geral</span>
        <h1 className="text-3xl sm:text-4xl font-black text-white tracking-tight mt-1">
          Fala, <span className="text-transparent bg-clip-text bg-gradient-to-r from-teal-300 to-emerald-400">{nomeUsuario}</span>! ⚽
        </h1>
        <p className="text-gray-400 text-sm mt-1">Acompanhe seus bolões, regulamento e status da competição.</p>
      </header>

      {/* Grid Principal dos Painéis */}
      <main className="relative z-10 max-w-7xl mx-auto px-6 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        
        {/* Painel 1: Meus Bolões */}
        <div className="bg-white/[0.02] border border-white/5 rounded-3xl p-6 backdrop-blur-xl md:col-span-2 flex flex-col justify-between group hover:border-teal-500/20 transition-all">
          <div>
            <div className="flex justify-between items-start mb-4">
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                <span>🎟️</span> Meus Bolões
              </h2>
              <span className="text-[10px] font-bold bg-teal-500/10 text-teal-400 px-2.5 py-1 rounded-full uppercase tracking-wider">
                Ativos
              </span>
            </div>
            
            {/* Estado Vazio (Ainda não criou bolão) */}
            <div className="border-2 border-dashed border-white/5 rounded-2xl p-8 text-center my-4 bg-black/20">
              <span className="text-3xl mb-2 block">🔮</span>
              <p className="text-sm font-semibold text-gray-300">Você ainda não tem nenhum palpite salvo</p>
              <p className="text-xs text-gray-500 mt-1 max-w-xs mx-auto">Crie seu bilhete de apostas e garanta sua vaga antes da abertura da Copa.</p>
            </div>
          </div>

          <button className="w-full sm:w-auto self-end mt-4 py-3 px-6 bg-gradient-to-r from-teal-500 to-emerald-500 hover:from-teal-400 hover:to-emerald-400 text-black font-black uppercase text-xs tracking-wider rounded-xl transition-all shadow-md transform hover:-translate-y-0.5">
            + Criar Novo Palpite
          </button>
        </div>

        {/* Painel 2: Status do Pagamento */}
        <div className="bg-white/[0.02] border border-white/5 rounded-3xl p-6 backdrop-blur-xl flex flex-col justify-between group hover:border-amber-500/20 transition-all">
          <div>
            <h2 className="text-xl font-bold text-white flex items-center gap-2 mb-4">
              <span>💳</span> Pagamento
            </h2>
            <p className="text-xs text-gray-400 leading-relaxed">
              Cada bolão criado necessita da validação da taxa de inscrição para poder concorrer à premiação financeira oficial do pódio.
            </p>
            
            {/* Box Informativo de PIX */}
            <div className="bg-amber-500/5 border border-amber-500/10 rounded-2xl p-4 mt-4 flex items-center justify-between">
              <div>
                <span className="text-[10px] font-bold text-amber-400 uppercase tracking-widest block">Taxa de Validação</span>
                <span className="text-xl font-black text-white">R$ 30,00</span>
              </div>
              <span className="text-xs font-bold text-amber-400 bg-amber-500/10 px-3 py-1 rounded-full uppercase">Pendente</span>
            </div>
          </div>

          <button className="w-full mt-6 py-3 px-4 bg-white/5 border border-white/10 hover:bg-white/10 text-amber-300 font-bold text-xs uppercase tracking-wider rounded-xl transition-colors text-center">
            Ver Chave Copia e Cola (PIX)
          </button>
        </div>

        {/* Painel 3: Tabela */}
        <div className="bg-white/[0.02] border border-white/5 rounded-3xl p-6 backdrop-blur-xl flex flex-col group hover:border-emerald-500/20 transition-all">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <span>📈</span> Tabela
            </h2>
            <span className="text-[10px] font-bold text-gray-500 border border-gray-600/30 px-2 py-0.5 rounded-full uppercase tracking-wider">
              Bloqueado
            </span>
          </div>
          
          <div className="flex-1 flex flex-col items-center justify-center p-6 mt-2 bg-black/20 border border-white/5 rounded-2xl text-center">
            <span className="text-3xl mb-3 opacity-40">⏳</span>
            <p className="text-sm font-bold text-gray-300">Aguardando Início</p>
            <p className="text-xs text-gray-500 mt-1">A classificação estará disponível após o começo do campeonato.</p>
          </div>
        </div>

        {/* Painel 4: Palpites (Antigas Estatísticas) */}
        <div className="bg-white/[0.02] border border-white/5 rounded-3xl p-6 backdrop-blur-xl flex flex-col group hover:border-purple-500/20 transition-all">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <span>📊</span> Palpites
            </h2>
            <span className="text-[10px] font-bold text-gray-500 border border-gray-600/30 px-2 py-0.5 rounded-full uppercase tracking-wider">
              Oculto
            </span>
          </div>
          
          <div className="flex-1 flex flex-col items-center justify-center p-6 mt-2 bg-black/20 border border-white/5 rounded-2xl text-center">
            <span className="text-3xl mb-3 opacity-40">🔒</span>
            <p className="text-sm font-bold text-gray-300">Palpites Ocultos</p>
            <p className="text-xs text-gray-500 mt-1">As escolhas dos outros competidores estarão disponíveis após o começo do campeonato.</p>
          </div>
        </div>

        {/* Painel 5: Regulamento (Componente de Cliente) */}
        <RegulamentoModal />

      </main>
    </div>
  )
}
