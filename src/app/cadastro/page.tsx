import { signup } from '../auth/actions'
import Link from 'next/link'

export default function CadastroPage({
  searchParams,
}: {
  searchParams: { error?: string }
}) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-4 bg-gray-50">
      <div className="w-full max-w-md p-8 bg-white rounded-xl shadow-lg border border-gray-100">
        <h1 className="text-3xl font-black text-center mb-2 text-green-600">
          Bolão 2026 🏆
        </h1>
        <p className="text-center text-gray-500 mb-8">
          Crie sua conta para participar
        </p>
        
        <form className="flex flex-col gap-5">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">
              Seu melhor E-mail
            </label>
            <input
              id="email"
              name="email"
              type="email"
              placeholder="exemplo@email.com"
              required
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">
              Crie uma Senha
            </label>
            <input
              id="password"
              name="password"
              type="password"
              placeholder="Mínimo 6 caracteres"
              required
              minLength={6}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all"
            />
          </div>

          {/* Área para exibir erros que vêm da Server Action */}
          {searchParams.error && (
            <div className="p-3 bg-red-50 text-red-700 text-sm rounded-lg border border-red-200">
              {searchParams.error}
            </div>
          )}

          <button
            formAction={signup}
            className="w-full py-3 px-4 bg-green-600 hover:bg-green-700 text-white font-bold rounded-lg transition-colors mt-2"
          >
            Criar minha conta
          </button>
        </form>

        <div className="mt-6 text-center text-sm text-gray-600">
          Já tem uma conta?{' '}
          <Link href="/login" className="text-green-600 font-bold hover:underline">
            Faça login aqui
          </Link>
        </div>
      </div>
    </div>
  )
}
