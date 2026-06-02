import Link from 'next/link'
import { createClient } from '@/utils/supabase/server'

export default async function LandingPage() {
  const supabase = await createClient()
  
  // Verifica silenciosamente se existe uma sessão ativa
  const { data: { user } } = await supabase.auth.getUser()

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col font-sans">
      
      {/* Navbar Básica */}
      <nav className="w-full bg-white border-b border-gray-200 p-4">
        <div className="max-w-6xl mx-auto flex justify-between items-center">
          <div className="text-xl font-black text-green-600 tracking-tight">
            Bolão2026 🏆
          </div>
          <div>
            {user ? (
              <Link href="/dashboard" className="text-sm font-semibold text-blue-600 hover:text-blue-800">
                Meu Painel →
              </Link>
            ) : (
              <Link href="/login" className="text-sm font-semibold text-gray-600 hover:text-gray-900">
                Entrar
              </Link>
            )}
          </div>
        </div>
      </nav>

      {/* Hero Section (Apresentação Principal) */}
      <main className="flex-1 flex flex-col items-center justify-center text-center px-4 py-16 sm:py-24">
        <h1 className="text-4xl sm:text-6xl font-black text-gray-900 tracking-tight mb-6 max-w-3xl">
          Mostre que você entende de futebol e <span className="text-green-600">domine o ranking.</span>
        </h1>
        
        <p className="text-lg sm:text-xl text-gray-600 mb-10 max-w-2xl">
          Participe do bolão mais completo da Copa do Mundo 2026. Dê seus palpites para a fase de grupos, escolha os campeões e acerte os placares de cada partida.
        </p>

        <div className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto">
          {user ? (
             <Link 
              href="/dashboard" 
              className="px-8 py-4 bg-green-600 hover:bg-green-700 text-white font-bold rounded-full text-lg transition-transform hover:scale-105 shadow-lg"
            >
              Acessar Meu Painel
            </Link>
          ) : (
            <>
              <Link 
                href="/cadastro" 
                className="px-8 py-4 bg-green-600 hover:bg-green-700 text-white font-bold rounded-full text-lg transition-transform hover:scale-105 shadow-lg"
              >
                Participar Agora
              </Link>
              <Link 
                href="/login" 
                className="px-8 py-4 bg-white border-2 border-gray-200 hover:border-gray-300 text-gray-800 font-bold rounded-full text-lg transition-colors"
              >
                Já tenho uma conta
              </Link>
            </>
          )}
        </div>
      </main>

      {/* Seção de Funcionalidades (Explicando as regras) */}
      <section className="bg-white py-16 px-4 border-t border-gray-100">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-2xl sm:text-3xl font-bold text-center text-gray-800 mb-12">
            Como funciona a pontuação?
          </h2>
          
          <div className="grid sm:grid-cols-3 gap-8">
            {/* Card 1 */}
            <div className="bg-gray-50 p-6 rounded-2xl border border-gray-100">
              <div className="text-4xl mb-4">🔮</div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">Palpites Pré-Copa</h3>
              <p className="text-gray-600 leading-relaxed">
                Antes de a bola rolar para o primeiro jogo, defina quem será o Campeão, Vice, Artilheiro e as posições de cada grupo. Acertou? Ganhou pontos extras valiosos!
              </p>
            </div>

            {/* Card 2 */}
            <div className="bg-gray-50 p-6 rounded-2xl border border-gray-100">
              <div className="text-4xl mb-4">⚽</div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">Jogo a Jogo</h3>
              <p className="text-gray-600 leading-relaxed">
                Deixe seus palpites para os placares exatos de cada partida. Você tem até 1 minuto antes do apito inicial para alterar sua aposta e garantir os pontos da rodada.
              </p>
            </div>

            {/* Card 3 */}
            <div className="bg-gray-50 p-6 rounded-2xl border border-gray-100">
              <div className="text-4xl mb-4">📈</div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">Ranking em Tempo Real</h3>
              <p className="text-gray-600 leading-relaxed">
                Assim que as partidas acabam, o sistema calcula tudo automaticamente. Acompanhe a tabela de classificação e veja quem está na liderança do grupo.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Footer Simples */}
      <footer className="bg-gray-900 text-gray-400 py-8 text-center text-sm">
        <p>Desenvolvido para a Copa do Mundo de 2026 🌎</p>
      </footer>
    </div>
  )
}
