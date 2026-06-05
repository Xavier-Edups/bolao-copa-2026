import { signup } from '../auth/actions'
import Link from 'next/link'
import Image from 'next/image'

export default async function CadastroPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>
}) {
  // Resolvemos a Promise da URL para o Next.js 15+
  const resolvedParams = await searchParams

  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-4 bg-[#0a0a0a] selection:bg-teal-500 selection:text-white relative overflow-hidden">
      
      {/* Efeitos de Luz de Fundo (Glow - usando uma cor levemente mais esmeralda para diferenciar do login) */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-emerald-900/20 blur-[120px] pointer-events-none rounded-full"></div>
      
      {/* Botão de Voltar */}
      <div className="absolute top-8 left-8 z-20">
        <Link href="/" className="text-gray-400 hover:text-white transition-colors flex items-center gap-2 text-sm font-semibold">
          ← Voltar ao Início
        </Link>
      </div>

      <div className="w-full max-w-md p-8 sm:p-10 bg-white/[0.02] border border-white/5 rounded-3xl shadow-2xl backdrop-blur-xl relative z-10 my-8">
        
        {/* Cabeçalho do Cadastro */}
        <div className="text-center mb-8">
          <h1 className="text-2xl font-black text-white tracking-tight uppercase mb-1">
            Entre para o <span className="text-transparent bg-clip-text bg-gradient-to-r from-teal-400 to-emerald-400">Jogo</span>
          </h1>
          <p className="text-gray-400 text-sm">Crie sua conta e faça seus palpites.</p>
        </div>
        
        {/* Adicionamos action e noValidate */}
        <form action={signup} noValidate className="flex flex-col gap-5">
          
          {/* Novo Campo: Nome Completo */}
          <div>
            <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">
              Nome completo
            </label>
            <input
              id="nome"
              name="nome"
              type="text"
              placeholder="Ex: Ronaldo Fenômeno"
              required
              className="w-full px-4 py-3.5 bg-black/50 border border-white/10 rounded-xl text-white placeholder:text-gray-600 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all"
            />
          </div>

          {/* Campo de E-mail */}
          <div>
            <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">
              E-mail
            </label>
            <input
              id="email"
              name="email"
              type="email"
              placeholder="camisa10@email.com"
              required
              className="w-full px-4 py-3.5 bg-black/50 border border-white/10 rounded-xl text-white placeholder:text-gray-600 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all"
            />
          </div>

          {/* Campo de Senha */}
          <div>
            <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">
              Crie uma Senha
            </label>
            <input
              id="password"
              name="password"
              type="password"
              placeholder="Mínimo de 6 caracteres"
              required
              className="w-full px-4 py-3.5 bg-black/50 border border-white/10 rounded-xl text-white placeholder:text-gray-600 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all"
            />
          </div>

          {/* Exibição de Erros */}
          {resolvedParams.error && (
            <div className="p-4 bg-red-500/10 border border-red-500/20 text-red-400 text-sm rounded-xl text-center font-medium backdrop-blur-sm mt-1">
              {resolvedParams.error}
            </div>
          )}

          {/* Botões */}
          <div className="mt-3">
            <button
              type="submit"
              className="w-full py-4 px-4 bg-gradient-to-r from-teal-500 to-emerald-500 hover:from-teal-400 hover:to-emerald-400 text-black font-black uppercase tracking-wide rounded-xl transition-all shadow-[0_0_20px_-5px_rgba(16,185,129,0.4)] hover:shadow-[0_0_30px_-5px_rgba(16,185,129,0.6)] transform hover:-translate-y-0.5"
            >
              Confirmar Inscrição
            </button>
            
            <div className="mt-5 text-center text-sm text-gray-400">
              Já faz parte do bolão?{' '}
              <Link
                href="/login"
                className="text-white font-bold hover:text-emerald-400 transition-colors underline decoration-white/20 underline-offset-4"
              >
                Faça login aqui
              </Link>
            </div>
          </div>
        </form>
      </div>

      <div className="mt-4 text-center text-xs text-gray-600 relative z-10 mb-8">
        <p>Ao se cadastrar, leia atentamente o regulamento.</p>
      </div>
    </div>
  )
}
