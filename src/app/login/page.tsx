import { login } from '../auth/actions'
import Link from 'next/link'
import Image from 'next/image'

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>
}) {
  const resolvedParams = await searchParams

  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-4 relative overflow-hidden selection:bg-teal-500 selection:text-white">
      
      {/* 
        DIV DE BACKGROUND DA COPA (SVG) 
        Ajuste o scale-150 se precisar de mais ou menos zoom na imagem
      */}
      <div 
        className="absolute inset-0 -z-20 bg-cover bg-center bg-no-repeat scale-250 sm:scale-135 transform-gpu"
        style={{ backgroundImage: "url('/bg-wc-2026.svg')" }}
      ></div>

      {/* Botão de Voltar (Com drop-shadow para não sumir no fundo colorido) */}
      <div className="absolute top-8 left-8 z-20">
        <Link href="/" className="text-white hover:text-gray-200 transition-colors flex items-center gap-2 text-sm font-bold drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]">
          ← Voltar ao Início
        </Link>
      </div>

      {/* CAIXA GLASSMORPHISM (Fundo de vidro transparente) */}
      <div className="w-[90vw] sm:w-full max-w-md p-10 bg-white/75 border border-white rounded-3xl  relative z-10 transform scale-[0.85] sm:scale-100 origin-center">
        
        {/* Cabeçalho do Login */}
        <div className="text-center mb-8">
          <div className="flex justify-center mb-4 drop-shadow-lg">
            <Image 
              src="/logo-wc-2026-vert.png" 
              alt="Logo Copa do Mundo 2026" 
              width={200} 
              height={200} 
              className="object-contain"
            />
          </div>
        </div>

        <form action={login} noValidate className="flex flex-col gap-6">
          
          {/* Campo de E-mail */}
          <div>
            <label className="block text-xs font-black text-gray-600 uppercase tracking-widest mb-2 drop-shadow-md">
              E-mail
            </label>
            <input
              id="email"
              name="email"
              type="email"
              placeholder="camisa10@email.com"
              required
              className="w-full px-4 py-3.5 bg-white/70  border border-white/10 rounded-xl text-gray-600 placeholder:text-gray-350 focus:bg-white/90 focus:outline-none focus:border-gray-400 focus:ring-1 focus:ring-gray-400 transition-all backdrop-blur-sm"
            />
          </div>

          {/* Campo de Senha */}
          <div>
            <label className="block text-xs font-black text-gray-600 uppercase tracking-widest mb-2 drop-shadow-md">
              Senha
            </label>
            <input
              id="password"
              name="password"
              type="password"
              placeholder="••••••••"
              required
              className="w-full px-4 py-3.5 bg-white/70  border border-white/10 rounded-xl text-gray-600 placeholder:text-gray-350 focus:bg-white/90 focus:outline-none focus:border-gray-400 focus:ring-1 focus:ring-gray-400 transition-all backdrop-blur-sm"
            />
          </div>

          {/* Exibir erros com visual de vidro vermelho */}
          {resolvedParams.error && (
            <div className="p-4 bg-red-500/90 border border-red-500/100 text-white text-sm rounded-xl text-center font-bold backdrop-blur-md mt-1 shadow-lg">
              {resolvedParams.error}
            </div>
          )}

          {/* Botões */}
          <div className="mt-4">
            <button
              type="submit"
              className="w-full py-4 px-4 bg-gradient-to-r from-teal-500 to-emerald-600 hover:from-teal-400 hover:to-emerald-500 text-white font-black uppercase tracking-wide rounded-xl transition-all shadow-[0_4px_15px_rgba(16,185,129,0.5)] hover:shadow-[0_6px_20px_rgba(16,185,129,0.7)] transform hover:-translate-y-0.5"
            >
              Entrar no Jogo
            </button>
            
            <Link
              href="/cadastro"
              className="w-full py-4 px-4 bg-blue-600 hover:bg-blue-400 border border-white/20 hover:border-white/30 text-white font-bold rounded-xl transition-all text-center block mt-3 backdrop-blur-md drop-shadow-md"
            >
              Criar Conta Nova
            </Link>
          </div>
        </form>
      </div>

      {/* Rodapé Simples */}
      <div className="mt-2 text-center text-xs text-white/70 font-medium relative z-10 drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]">
        <p>Acesso restrito a participantes do Bolão World Cup 2026.</p>
      </div>
    </div>
  )
}
