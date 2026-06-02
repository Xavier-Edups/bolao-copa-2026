import { login } from '../auth/actions'
import Link from 'next/link'

export default function LoginPage({
  searchParams,
}: {
  searchParams: { error?: string }
}) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-4 bg-gray-50">
      <div className="w-full max-w-md p-6 bg-white rounded-lg shadow-md">
        <h1 className="text-2xl font-bold text-center mb-6 text-gray-800">
          Bolão Copa 2026 🏆
        </h1>
        
        <form className="flex flex-col gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              E-mail
            </label>
            <input
              id="email"
              name="email"
              type="email"
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Senha
            </label>
            <input
              id="password"
              name="password"
              type="password"
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {searchParams.error && (
            <p className="text-sm text-red-600 text-center">{searchParams.error}</p>
          )}

          <div className="flex flex-col gap-2 mt-2">
            <button
              formAction={login}
              className="w-full py-3 px-4 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-md transition"
            >
              Entrar
            </button>
            <Link
              href={"/cadastro"}
              className="w-full py-3 px-4 bg-gray-50 hover:bg-gray-100 text-gray-700 font-bold rounded-lg transition-colors text-center border border-gray-200"
            >
              Criar Conta
            </Link>
          </div>
        </form>
      </div>
    </div>
  )
}
