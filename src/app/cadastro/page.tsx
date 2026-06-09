'use client'
import { signup } from '../auth/actions'
import { useTransition, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'

function CadastroContent() {
  // 1. Lemos os parâmetros da URL pelo hook do cliente em vez de usar 'await'
  const searchParams = useSearchParams()
  const errorMessage = searchParams.get('error')

  // 2. Hook do React perfeito para criar "Loading" com Server Actions
  const [isPending, startTransition] = useTransition()

  // 3. Função que aciona a sua Action de forma protegida
  const handleAction = (formData: FormData) => {
    // startTransition liga o 'isPending' automaticamente até a Action terminar
    startTransition(() => {
      signup(formData)
    })
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-4 relative overflow-hidden">
      
      <div 
        className="absolute inset-0 -z-20 bg-cover bg-center bg-no-repeat scale-250 sm:scale-135 transform-gpu"
        style={{ backgroundImage: "url('/bg-wc-2026-2.svg')" }}
      ></div>
      
      {/* Botão de Voltar */}
      <div className="absolute top-8 left-8 z-20">
        <Link href="/" className="text-white hover:text-gray-200 transition-colors flex items-center gap-2 text-sm font-bold drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]">
          ← Voltar ao Início
        </Link>
      </div>

      {/* CAIXA GLASSMORPHISM */}
      <div className="w-[90vw] sm:w-full max-w-md p-10 bg-white/75 border border-white rounded-3xl  relative z-10 transform scale-[0.85] sm:scale-100 origin-center">
        
        {/* Cabeçalho do Cadastro */}
        <div className="text-center mb-8">
          <div className="flex justify-center mb-4 drop-shadow-lg">
            <Image 
              src="/logo-wc-2026-vert2.png" 
              alt="Logo Copa do Mundo 2026" 
              width={200} 
              height={200} 
              className="object-contain"
            />
          </div>
        </div>
        
        {/* Formulário: Agora usando a nossa função handleAction */}
        <form action={handleAction} noValidate className="flex flex-col gap-5">
          
          {/* Campo: Nome Completo */}
          <div>
            <label className="block text-xs font-black text-gray-600 uppercase tracking-widest mb-2 drop-shadow-md">
              Nome Completo
            </label>
            <input
              id="nome"
              name="nome"
              type="text"
              placeholder="Ex: Ronaldo Fenômeno"
              required
              className="w-full px-4 py-3.5 bg-white/70  border border-white/10 rounded-xl text-gray-600 placeholder:text-gray-350 focus:bg-white/90 focus:outline-none focus:border-gray-400 focus:ring-1 focus:ring-gray-400 transition-all backdrop-blur-sm"
            />
          </div>

          {/* Campo de E-mail */}
          <div>
            <label className="block text-xs font-black text-gray-600 uppercase tracking-widest mb-2 drop-shadow-md">
              Email
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
              Crie uma Senha
            </label>
            <input
              id="password"
              name="password"
              type="password"
              placeholder="Mínimo de 6 caracteres"
              required
              className="w-full px-4 py-3.5 bg-white/70 border border-white/10 rounded-xl text-gray-600 placeholder:text-gray-350 focus:outline-none focus:border-gray-400 focus:ring-1 focus:ring-gray-400 transition-all backdrop-blur-sm"
            />
          </div>

          {/* Exibição de Erros */}
          {errorMessage && (
            <div className="p-4 bg-red-500/90 border border-red-500/100 text-white text-sm rounded-xl text-center font-bold backdrop-blur-md mt-1 shadow-lg">
              {errorMessage}
            </div>
          )}

          {/* Botões */}
          <div className="mt-3">
            <button 
              type="submit" 
              disabled={isPending}
              className={`w-full py-3 px-4 font-bold text-sm uppercase tracking-wider rounded-xl transition-all ${
                isPending 
                  ? 'bg-emerald-500/50 text-white/50 cursor-not-allowed' 
                  : 'bg-emerald-500 hover:bg-emerald-400 text-white'
              }`}
            >
              {isPending ? 'Cadastrando...' : 'Confirma inscrição'}
            </button>

            <div className="mt-5 text-center text-sm">
              <span className="text-gray-600 font-medium drop-shadow-lg">Já faz parte do bolão? </span>
              <Link
                href="/login"
                className="text-gray-600 font-black hover:text-emerald-500 transition-colors underline decoration-gray-600/40 underline-offset-4 drop-shadow-lg"
              >
                Faça login aqui
              </Link>
            </div>
          </div>
        </form>
      </div>

      <div className="mt-2 text-center text-xs text-white/70 font-medium relative z-10 drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]">
        <p>Este bolão destina-se exclusivamente à participação de amigos.</p>
      </div>
    </div>
  )
}

export default function CadastroPage() {
  return (
    // O fallback pode ser uma tela de carregamento genérica ou vazia
    <Suspense fallback={<div className="min-h-screen bg-black" />}>
      <CadastroContent />
    </Suspense>
  )
}
