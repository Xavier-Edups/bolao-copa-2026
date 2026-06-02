import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import { logout } from '../auth/actions'

export default async function DashboardPage() {
  const supabase = await createClient()

  // Busca os dados do usuário logado no servidor do Supabase
  const { data: { user } } = await supabase.auth.getUser()

  // Proteção a nível de página: Se não houver usuário, redireciona para o login
  if (!user) {
    redirect('/login')
  }

  return (
    <div className="min-h-screen bg-gray-100 p-4 md:p-8">
      {/* Cabeçalho do Painel */}
      <header className="max-w-5xl mx-auto bg-white rounded-xl shadow-sm p-6 flex flex-col md:flex-row justify-between items-center gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-black text-gray-800">Meu Painel do Bolão ⚽</h1>
          <p className="text-sm text-gray-500 mt-1">
            Logado como: <span className="font-semibold text-gray-700">{user.email}</span>
          </p>
        </div>

        {/* Formulário seguro para deslogar usando a Server Action */}
        <form action={logout}>
          <button
            type="submit"
            className="px-4 py-2 text-sm font-semibold text-red-600 bg-red-50 hover:bg-red-100 rounded-lg transition-colors border border-red-200"
          >
            Sair da Conta
          </button>
        </form>
      </header>

      {/* Conteúdo Principal (Onde ficarão os palpites futuramente) */}
      <main className="max-w-5xl mx-auto grid gap-6 md:grid-cols-2">
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <h2 className="text-lg font-bold text-gray-800 mb-3">🏆 Palpites Pré-Copa</h2>
          <p className="text-gray-600 text-sm mb-4">
            Defina quem será o Campeão, Vice, Artilheiro e a classificação dos grupos antes do primeiro jogo!
          </p>
          <button className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white font-medium text-sm rounded-lg transition-colors">
            Configurar Palpites
          </button>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <h2 className="text-lg font-bold text-gray-800 mb-3">📅 Próximos Jogos</h2>
          <p className="text-gray-600 text-sm mb-4">
            Acompanhe o calendário de partidas e altere seus palpites até o horário de início de cada jogo.
          </p>
          <button className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium text-sm rounded-lg transition-colors">
            Ver Partidas
          </button>
        </div>
      </main>
    </div>
  )
}
