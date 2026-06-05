import { login } from '../auth/actions'
import Link from 'next/link'

export default async function LoginPage({
  searchParams,
}: {
  // 1. Atualizamos a tipagem para indicar que é uma Promise
  searchParams: Promise<{ error?: string }>
}) {
  // 2. Aguardamos a resolução dos parâmetros da URL
  const resolvedParams = await searchParams

  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-4 bg-[#0a0a0a] selection:bg-teal-500 selection:text-white relative overflow-hidden">
      
      {/* Efeitos de Luz de Fundo (Glow) */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-teal-900/20 blur-[120px] pointer-events-none rounded-full"></div>
      
      {/* Botão de Voltar */}
      <div className="absolute top-8 left-8 z-20">
        <Link href="/" className="text-gray-400 hover:text-white transition-colors flex items-center gap-2 text-sm font-semibold">
          ← Voltar ao Início
        </Link>
      </div>

      <div className="w-full max-w-md p-8 sm:p-10 bg-white/[0.02] border border-white/5 rounded-3xl shadow-2xl backdrop-blur-xl relative z-10">
        
        {/* Cabeçalho do Login */}
        <div className="text-center mb-10">
          <h1 className="text-2xl font-black text-white tracking-tight uppercase mb-1">
            Bolão <span className="text-transparent bg-clip-text bg-gradient-to-r from-teal-400 to-emerald-400">World Cup 2026</span> 
          </h1>
          <p className="text-gray-400 text-sm">Acesse seu painel para gerenciar seus palpites</p>
        </div>
        
        <form className="flex flex-col gap-6">
          
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
              className="w-full px-4 py-3.5 bg-black/50 border border-white/10 rounded-xl text-white placeholder:text-gray-600 focus:outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500 transition-all"
            />
          </div>

          {/* Campo de Senha */}
          <div>
            <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">
              Senha
            </label>
            <input
              id="password"
              name="password"
              type="password"
              placeholder="••••••••"
              required
              className="w-full px-4 py-3.5 bg-black/50 border border-white/10 rounded-xl text-white placeholder:text-gray-600 focus:outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500 transition-all"
            />
          </div>

          {/* 3. Usamos a variável resolvida aqui para exibir erros */}
          {resolvedParams.error && (
            <div className="p-4 bg-red-500/10 border border-red-500/20 text-red-400 text-sm rounded-xl text-center font-medium backdrop-blur-sm">
              {resolvedParams.error}
            </div>
          )}

          {/* Botões */}
          <div className="mt-4">
            <button
              formAction={login}
              className="w-full py-4 px-4 bg-gradient-to-r from-teal-500 to-emerald-500 hover:from-teal-400 hover:to-emerald-400 text-black font-black uppercase tracking-wide rounded-xl transition-all shadow-[0_0_20px_-5px_rgba(20,184,166,0.4)] hover:shadow-[0_0_30px_-5px_rgba(20,184,166,0.6)] transform hover:-translate-y-0.5"
            >
              Entrar no Jogo
            </button>
            
            <Link
              href="/cadastro"
              className="w-full py-4 px-4 bg-white/5 hover:bg-white/10 border border-white/5 hover:border-white/10 text-white font-bold rounded-xl transition-all text-center block mt-3"
            >
              Criar Conta Nova
            </Link>
          </div>
        </form>
      </div>

      {/* Rodapé Simples */}
      <div className="mt-8 text-center text-xs text-gray-600 relative z-10">
        <p>Acesso restrito a participantes do Bolão World Cup 2026</p>
      </div>
    </div>
  )
}
