import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import { logout } from '../auth/actions'
import Link from 'next/link'
import RegulamentoModal from '@/components/RegulamentoModal'
import MeusBoloesPainel from '@/components/MeusBoloesPainel'

export default async function DashboardPage() {
  const supabase = await createClient()

  // Recupera o usuário logado
  const { data: { user } } = await supabase.auth.getUser()

  let qtdBoloes = 0
  if (user) {
    const { count } = await supabase
      .from('boloes')
      .select('*', { count: 'exact', head: true }) // head: true diz pro Supabase não baixar os dados, só contar as linhas!
      .eq('user_id', user.id)

    qtdBoloes = count || 0
  }

  // Proteção: Se não estiver logado, joga para a tela de login
  if (!user) {
    redirect('/login')
  }

  // Pega o nome completo salvo nos metadados do cadastro (ou usa 'Craque' como fallback)
  const nomeUsuario = user.user_metadata?.full_name || 'Craque'

  // Busca as partidas da fase de gupos
  const { data: partidas1f, error: error1f } = await supabase
    .from('partidas')
    .select('*')
    .eq('fase', 'GROUP_STAGE')
    .order('data_hora', { ascending: true })

  // Busca as partidas do mata-mata
  const { data: partidas2f, error: error2f } = await supabase
    .from('partidas')
    .select('*')
    .neq('fase', 'GROUP_STAGE')
    .order('data_hora', { ascending: true })

  // BUSCA OS TIMES E GRUPOS
  const { data: times, error: errorTimes } = await supabase
    .from('times_copa')
    .select('*')
    .order('grupo', { ascending: true })

  const { data: jogadores } = await supabase
    .from('jogadores')
    .select('id, nome, time_id, posicao')
    .order('nome', { ascending: true })
    .limit(3000)

  console.log(qtdBoloes)


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
        </div>{/* Painel 2: Status do Pagamento */}
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
      <main className="relative z-10 max-w-7xl mx-auto px-6 grid gap-6 md:grid-cols-2 lg:grid-cols-2">
        
        {/* Painel 1: Meus Bolões */}
        <MeusBoloesPainel
          username={nomeUsuario ?? ''}
          partidas1f={partidas1f || []}
          partidas2f={partidas2f || []}
          times={times || []}
          jogadores={jogadores || []}
        /> 

        
        {/*
        {/* Painel 3: Tabela /}
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

        {/* Painel 4: Palpites (Antigas Estatísticas) /}
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
        */}

        {/* Painel 2: Status do Pagamento */}
        <div className="bg-white/[0.02] border border-emerald-600 rounded-3xl p-6 backdrop-blur-xl flex flex-col justify-between group transition-all">
          <div>
            <h2 className="text-xl font-bold text-white flex items-center gap-2 mb-4">
              <span>💳</span> Pagamento
            </h2>
            <p className="text-xs text-gray-400 leading-relaxed">
              Cada bolão tem o valor de R$30,00. Garanta já a sua participação!
            </p>
            
            {/* Box Informativo de PIX */}
            <div className="bg-amber-500/5 border border-amber-500/10 rounded-2xl p-4 mt-4 flex items-center justify-between">
              <div>
                <span className="text-[10px] font-bold text-amber-400 uppercase tracking-widest block">Total a pagar</span>
                <span className="text-xl font-black text-white">R$ {30*qtdBoloes},00</span>
              </div>
              <span className="text-xs font-bold text-amber-400 bg-amber-500/10 px-3 py-1 rounded-full uppercase">Pendente</span>
            </div>
          </div>

          <Link href={`https://wa.me/5531983315182?text='${encodeURIComponent(`Olá, sou ${nomeUsuario}`)}!'`} className="w-full mt-6 py-3 px-4 bg-white/5 border border-white/10 hover:bg-white/10 text-amber-300 font-bold text-xs uppercase tracking-wider rounded-xl transition-colors text-center">
            Solicitar pagamento
          </Link>
        </div>


        {/* Painel 5: Regulamento (Componente de Cliente) */}
        <RegulamentoModal />

      </main>
    </div>
  )
}
