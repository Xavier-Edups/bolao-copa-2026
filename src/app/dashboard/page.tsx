import { createClient } from '@/utils/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { redirect } from 'next/navigation'
import { logout } from '../auth/actions'
import Link from 'next/link'
import RegulamentoModal from '@/components/RegulamentoModal'
import MeusBoloesPainel from '@/components/MeusBoloesPainel'
import PainelTabelaClient from '@/components/PainelTabelaClient'
import PainelTabelaGeral from '@/components/PainelTabelaGeral' 

export default async function DashboardPage() {
  const supabase = await createClient()

  // Recupera o usuário logado
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const supabaseAdmin = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_SECRET_SUPABASE_KEY!
  )

  let qtdBoloes = 0
  let valorPago = 0

  const { count } = await supabase
    .from('boloes')
    .select('*', { count: 'exact', head: true }) 
    .eq('user_id', user.id)
  qtdBoloes = count || 0

  const { data: pagData } = await supabase
    .from('pagamentos_usuarios')
    .select('valor_pago')
    .eq('user_id', user.id)
    .single()
  valorPago = pagData?.valor_pago || 0

  const valorTotal = qtdBoloes * 30
  const saldoDevedor = Math.max(0, valorTotal - valorPago)
  const temCredito = valorPago > valorTotal
  const isPago = (qtdBoloes > 0 && saldoDevedor === 0) || temCredito
  
  // Pega o nome completo salvo nos metadados do cadastro (ou usa 'Craque' como fallback)
  const nomeUsuario = user.user_metadata?.full_name || 'Craque'

  // Busca as partidas da fase de grupos
  const { data: partidas1f } = await supabase
    .from('partidas')
    .select('*')
    .eq('fase', 'GROUP_STAGE')
    .order('data_hora', { ascending: true })

  // Busca as partidas do mata-mata
  const { data: partidas2f } = await supabase
    .from('partidas')
    .select('*')
    .neq('fase', 'GROUP_STAGE')
    .order('data_hora', { ascending: true })

  // BUSCA OS TIMES E GRUPOS
  const { data: times } = await supabase
    .from('times_copa')
    .select('*')
    .order('grupo', { ascending: true })

  const { data: jogadores } = await supabase
    .from('jogadores')
    .select('id, nome, time_id, posicao')
    .order('nome', { ascending: true })
    .limit(3000)

  const { data: pagantes } = await supabaseAdmin
    .from('pagamentos_usuarios')
    .select('user_id')
    .gt('valor_pago', 0) // Exige que o valor pago seja estritamente maior que 0.00

  // Cria um array só com os UUIDs de quem pagou (ex: ['id-1', 'id-2'])
  const pagantesIds = pagantes?.map(p => p.user_id) || []

  // 2. BUSCA O RANKING: Puxa os bolões apenas dos pagantes
  let boloesRanking: any[] = []
  
  if (pagantesIds.length > 0) {
    const { data } = await supabase
      .from('boloes')
      .select('id, nome, user_id, pontuacao_total')
      .in('user_id', pagantesIds) // O pulo do gato: filtra os bolões cruzando com a lista acima
      .order('pontuacao_total', { ascending: false })
      
    boloesRanking = data || []
  } 

  // 1. Contorna a paginação do Supabase buscando lotes de 1000 usuários
  let listaUsuariosAuth: any[] = []
  let paginaAuth = 1
  let temMaisUsuarios = true

  while (temMaisUsuarios) {
    const { data: resAuth } = await supabaseAdmin.auth.admin.listUsers({
      page: paginaAuth,
      perPage: 1000
    })

    if (resAuth && resAuth.users && resAuth.users.length > 0) {
      listaUsuariosAuth = listaUsuariosAuth.concat(resAuth.users)
      if (resAuth.users.length < 1000) {
        temMaisUsuarios = false // Chegou na última página
      } else {
        paginaAuth++ // Puxa a próxima página
      }
    } else {
      temMaisUsuarios = false
    }
  }

  // 2. Cria um dicionário super rápido { "id_do_usuario": "Nome Completo" } com TODOS os usuários
  const mapaNomes = new Map(
    listaUsuariosAuth.map(u => [
      u.id, 
      u.user_metadata?.full_name || u.user_metadata?.nome || 'Craque'
    ])
  )

  // 3. Monta a lista bruta cruzando o banco público com os nomes da Auth
  const listaRankingBruta = boloesRanking?.map((b) => ({
    id: b.id,
    nomeBolao: b.nome,
    nomeUsuario: b.user_id === user.id ? nomeUsuario : (mapaNomes.get(b.user_id) || "Craque"),
    pontuacao_total: b.pontuacao_total || 0
  })) || []

  listaRankingBruta.sort((a, b) => {
    // Regra 1: Quem tem mais pontos fica na frente
    if (b.pontuacao_total !== a.pontuacao_total) {
      return b.pontuacao_total - a.pontuacao_total;
    }
    // Regra 2: Empatou nos pontos? Ordem alfabética no nome do usuário
    const nomeCompare = a.nomeUsuario.localeCompare(b.nomeUsuario);
    if (nomeCompare !== 0) return nomeCompare;
    
    // Regra 3: Se a mesma pessoa tiver dois bolões empatados, desempata pelo nome do bolão
    return a.nomeBolao.localeCompare(b.nomeBolao);
  });

  // 4. LÓGICA DE EMPATE calculada no servidor
  let rankParaMostrar = 1;

  const listaRanking = listaRankingBruta.map((jogador, index) => {
    if (index > 0) {
      const jogadorAnterior = listaRankingBruta[index - 1];
      
      // Se a pontuação for menor que a do cara de cima, a posição vira o índice atual + 1
      if (jogador.pontuacao_total < jogadorAnterior.pontuacao_total) {
        rankParaMostrar = index + 1;
      }
      // Se for igual, ele pula o 'if' e mantém o mesmo 'rankParaMostrar' do cara de cima
    }
    
    return { ...jogador, posicaoReal: rankParaMostrar };
  }); 

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
      <main className="relative z-10 max-w-7xl mx-auto px-6 grid gap-6 md:grid-cols-2 lg:grid-cols-2">
        
        {/* Painel 1: Meus Bolões */}
        <MeusBoloesPainel
          username={nomeUsuario ?? ''}
          partidas1f={partidas1f || []}
          partidas2f={partidas2f || []}
          times={times || []}
          jogadores={jogadores || []}
          listaRanking={listaRanking || []}
        /> 

        {/* Painel 2: Tabela (Agora isolado e rodando limpo) */}
        <PainelTabelaClient listaRanking={listaRanking} bolaoAtivoId={undefined} />

        {/* Painel 3: Tabela Geral de Palpites (Comunidade) */}
        <PainelTabelaGeral 
          partidas1f={partidas1f || []} 
          partidas2f={partidas2f || []} 
          listaRanking={listaRanking || []}
          times={times || []}
        /> 

        {/* Painel 4: Status do Pagamento Dinâmico */}
        <div className={`bg-white/[0.02] border rounded-3xl p-6 backdrop-blur-xl flex flex-col justify-between group transition-all duration-500 ${
          isPago ? 'border-emerald-600/50 shadow-[0_0_20px_rgba(16,185,129,0.1)]' : 'border-emerald-600'
        }`}>
          <div>
            {/* Cabeçalho com Título e Valor Pago Alinhados */}
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                <span>💳</span> Pagamento
              </h2>
              
              <div className="text-[10px] text-gray-400 bg-white/5 border border-white/10 px-3 py-1.5 rounded-lg">
                Já pago: <span className="text-white font-bold ml-1 tracking-wider">{valorPago.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
              </div>
            </div>

            <p className="text-xs text-gray-400 leading-relaxed">
              Cada bolão tem o valor de R$30,00. Garanta já a sua participação!
            </p>
            
            {/* Box Informativo Inteligente */}
            <div className={`rounded-2xl p-4 mt-4 flex items-center justify-between border transition-colors duration-500 ${
              isPago 
                ? 'bg-emerald-500/10 border-emerald-500/20' 
                : 'bg-amber-500/5 border-amber-500/10'
            }`}>
              <div>
                <span className={`text-[10px] font-bold uppercase tracking-widest block transition-colors ${
                  isPago ? 'text-emerald-400' : 'text-amber-400'
                }`}>
                  {temCredito ? 'Crédito Disponível' : isPago ? 'Pagamento Concluído' : 'Total a pagar'}
                </span>
                
                <span className="text-xl font-black text-white">
                  {temCredito 
                    ? (valorPago - valorTotal).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
                    : isPago 
                    ? valorTotal.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
                    : saldoDevedor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
                  }
                </span>
              </div>

              <span className={`text-xs font-bold px-3 py-1 rounded-full uppercase transition-colors ${
                isPago 
                  ? 'text-emerald-400 bg-emerald-500/10' 
                  : 'text-amber-400 bg-amber-500/10'
              }`}>
                {temCredito ? 'Crédito' : isPago ? 'Pago' : 'Pendente'}
              </span>
            </div>
          </div>

          {/* Botão Condicional */}
          {!isPago ? (
            <Link 
              href={`https://wa.me/5531983315182?text=${encodeURIComponent(`Olá! Sou ${nomeUsuario}. Gostaria de realizar o pagamento da minha participação. O saldo pendente é de R$ ${saldoDevedor.toFixed(2).replace('.', ',')}.`)}`} 
              target="_blank"
              className="w-full mt-6 py-3 px-4 bg-white/5 border border-white/10 hover:bg-white/10 text-amber-300 font-bold text-xs uppercase tracking-wider rounded-xl transition-colors text-center"
            >
              Solicitar pagamento
            </Link>
          ) : (
            <div className="w-full mt-6 py-3 px-4 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 font-bold text-xs uppercase tracking-wider rounded-xl text-center flex items-center justify-center gap-2">
              <span>{temCredito ? 'Crédito liberado para jogar!' : 'Tudo Certo!'}</span>
            </div>
          )}
        </div>

        {/* Painel 5: Regulamento (Componente de Cliente) */}
        <RegulamentoModal />

      </main>
    </div>
  )
}
