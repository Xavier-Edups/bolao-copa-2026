'use client'
import { useState } from 'react'

interface UsuarioPagamento {
  user_id: string
  nome_completo: string
  email: string
  valor_pago: number
  updated_at: string
}

export default function AdminPagamentos() {
  const [secret, setSecret] = useState('')
  const [isAutenticado, setIsAutenticado] = useState(false)
  const [usuarios, setUsuarios] = useState<UsuarioPagamento[]>([])
  const [loading, setLoading] = useState(false)
  const [valoresEditados, setValoresEditados] = useState<Record<string, string>>({})
  const [processandoId, setProcessandoId] = useState<string | null>(null)
  
  // NOVO ESTADO: Controle do Botão de Pânico
  const [isSyncing, setIsSyncing] = useState(false)

  // Carrega a listagem chamando a nossa API interna protegida
  const buscarDadosUsuarios = async (chaveSecreta: string) => {
    setLoading(true)
    try {
      const res = await fetch('/api/admin', {
        method: 'GET',
        headers: { 'x-admin-secret': chaveSecreta },
        cache: 'no-store' // <- ADICIONADO: Garante que a lista de usuários venha sempre atualizada do banco
      })

      if (!res.ok) throw new Error('Chave inválida ou erro no servidor.')

      const dados: UsuarioPagamento[] = await res.json()
      setUsuarios(dados)
      setIsAutenticado(true)
      
      // Inicializa o mapa de inputs locais com os valores atuais do banco
      const inputsIniciais: Record<string, string> = {}
      dados.forEach(u => {
        inputsIniciais[u.user_id] = u.valor_pago.toString()
      })
      setValoresEditados(inputsIniciais)
    } catch (err) {
      alert('Falha na validação do token secreto.')
      setIsAutenticado(false)
    } finally {
      setLoading(false)
    }
  }

  // Executa a atualização do valor
  const handleAtualizarValor = async (userId: string) => {
    const valor = valoresEditados[userId]
    if (!valor || isNaN(parseFloat(valor))) return alert('Insira um número válido.')

    setProcessandoId(userId)
    try {
      const res = await fetch('/api/admin', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'x-admin-secret': secret 
        },
        body: JSON.stringify({ userId, novoValor: parseFloat(valor) })
      })

      if (!res.ok) throw new Error('Erro ao salvar alteração.')

      alert('Pagamento atualizado com sucesso! 💳')
      // Atualiza o estado visual local
      setUsuarios(usuarios.map(u => u.user_id === userId ? { ...u, valor_pago: parseFloat(valor) } : u))
    } catch (err) {
      alert('Não foi possível salvar o novo valor.')
    } finally {
      setProcessandoId(null)
    }
  }

  // NOVO MÉTODO: Dispara o Cron Job e o Cálculo Manualmente
  const handleSincronizacaoManual = async () => {
    const confirmacao = window.confirm('⚠️ ATENÇÃO: Isso vai forçar uma chamada na API do Football-Data e recalcular o ranking de todo mundo.\n\nDeseja continuar?')
    if (!confirmacao) return

    // Pede o CRON_SECRET na hora (já que é diferente da senha do Admin)
    const cronSecret = window.prompt('🔒 Para confirmar, digite o CRON_SECRET do sistema:')
    if (!cronSecret) return // Se cancelar ou deixar vazio, aborta a missão

    setIsSyncing(true)
    try {
      // 1. Chama a rota de Sincronização de Partidas (usando o CRON_SECRET)
      const resPartidas = await fetch(`/api/sync-partidas?secret=${cronSecret}`, {
        method: 'GET',
        cache: 'no-store' // Obrigatório
      })
      
      if (!resPartidas.ok) {
        const erroPartidas = await resPartidas.text()
        throw new Error(`Falha ao buscar partidas: ${erroPartidas}`)
      }

      // 2. Chama a rota de Processamento de Pontos (usando a senha do Admin que já estava logada)
      const resPontos = await fetch('/api/admin/processar-pontos', {
        method: 'POST',
        headers: { 
          'x-admin-secret': secret 
        },
        cache: 'no-store' // <- ADICIONADO: Faltava nesta chamada para não correr risco de falhar silenciosamente
      })

      if (!resPontos.ok) {
        const erroPontos = await resPontos.text()
        throw new Error(`Falha ao calcular pontos: ${erroPontos}`)
      }

      alert('✅ Sincronização completa! Partidas atualizadas e pontos recalculados.')
    } catch (err: any) {
      console.error(err)
      alert(`❌ Erro na Sincronização Manual:\n\n${err.message}`)
    } finally {
      setIsSyncing(false)
    }
  }

  // Formulário de Bloqueio por Token Secreto
  if (!isAutenticado) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center p-4">
        <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-6 w-full max-w-md shadow-2xl">
          <h1 className="text-xl font-black text-white flex items-center gap-2 mb-2">
            <span>🔒</span> Área Restrita: Admin
          </h1>
          <p className="text-xs text-gray-400 mb-6">Insira o token de validação de sincronia para acessar as credenciais financeiras.</p>
          
          <div className="space-y-4">
            <input 
              type="password" 
              placeholder="Digite o ADMIN_SECRET"
              value={secret}
              onChange={(e) => setSecret(e.target.value)}
              className="w-full h-12 bg-black border border-zinc-800 rounded-xl px-4 text-sm text-white focus:border-teal-500 focus:outline-none transition-colors"
            />
            <button 
              onClick={() => buscarDadosUsuarios(secret)}
              disabled={loading}
              className="w-full h-12 bg-teal-500 hover:bg-teal-400 disabled:opacity-50 text-black font-bold text-sm rounded-xl uppercase tracking-wider transition-all"
            >
              {loading ? 'Validando...' : 'Acessar Painel'}
            </button>
          </div>
        </div>
      </div>
    )
  }

  // Painel Administrativo Ativo
  return (
    <div className="min-h-screen bg-black text-gray-100 p-6 sm:p-12">
      <div className="max-w-5xl mx-auto">
        <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8 border-b border-zinc-800 pb-6">
          <div>
            <h1 className="text-2xl font-black text-white flex items-center gap-2">
              <span>⚙️</span> Painel Administrativo
            </h1>
            <p className="text-xs text-gray-400 mt-1">Gerenciamento financeiro e controles de sistema.</p>
          </div>
          
          {/* GRUPO DE BOTÕES DO HEADER */}
          <div className="flex items-center gap-3 w-full sm:w-auto">
            {/* BOTÃO DE PÂNICO */}
            <button 
              onClick={handleSincronizacaoManual}
              disabled={isSyncing}
              className={`flex-1 sm:flex-none flex items-center justify-center gap-2 text-xs font-bold px-4 py-2 rounded-xl transition-all border ${
                isSyncing 
                  ? 'bg-amber-500/20 text-amber-500 border-amber-500/20 cursor-wait' 
                  : 'bg-amber-500/10 text-amber-500 border-amber-500/30 hover:bg-amber-500 hover:text-black'
              }`}
            >
              {isSyncing ? (
                <>
                  <div className="w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin"></div>
                  Sincronizando...
                </>
              ) : (
                <>
                  <span>🚨</span> Forçar Sincronia
                </>
              )}
            </button>

            <button 
              onClick={() => { setIsAutenticado(false); setSecret(''); }}
              className="flex-1 sm:flex-none text-xs font-bold bg-zinc-900 border border-zinc-800 hover:border-red-500/30 hover:text-red-400 px-4 py-2 rounded-xl transition-colors"
            >
              Bloquear
            </button>
          </div>
        </header>

        {/* Tabela de Usuários */}
        <div className="bg-zinc-950 border border-zinc-900 rounded-2xl overflow-hidden shadow-xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-zinc-900/50 border-b border-zinc-900 text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                  <th className="p-4">Identificação do Usuário</th>
                  <th className="p-4 text-center">Última Modificação</th>
                  <th className="p-4 text-right">Ajustar Saldo (R$)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-900/50 text-sm">
                {usuarios.length === 0 ? (
                  <tr>
                    <td colSpan={3} className="p-8 text-center text-gray-500 text-xs">Nenhum usuário registrado no ecossistema ainda.</td>
                  </tr>
                ) : (
                  usuarios.map((user) => (
                    <tr key={user.user_id} className="hover:bg-zinc-900/20 transition-colors">
                      <td className="p-4 font-medium text-white max-w-[300px] truncate">
                        <span className="text-white font-bold capitalize">{user.nome_completo}</span>
                        <span className="text-white font-black mx-2">/</span>
                        <span className="text-white text-xs">{user.email}</span>
                      </td>
                      <td className="p-4 text-center text-xs text-gray-500">
                        {new Date(user.updated_at).toLocaleDateString('pt-BR')} às {new Date(user.updated_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                      </td>
                      <td className="p-4 flex items-center justify-end gap-3">
                        <div className="relative">
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-gray-500 font-bold">R$</span>
                          <input 
                            type="text"
                            value={valoresEditados[user.user_id] || ''}
                            onChange={(e) => setValoresEditados({ ...valoresEditados, [user.user_id]: e.target.value })}
                            className="w-24 h-9 bg-black border border-zinc-800 rounded-lg pl-8 pr-2 text-right text-sm text-white font-bold focus:border-teal-500 focus:outline-none transition-colors"
                          />
                        </div>
                        <button 
                          onClick={() => handleAtualizarValor(user.user_id)}
                          disabled={processandoId === user.user_id}
                          className="h-9 px-4 bg-teal-500/10 hover:bg-teal-500 text-teal-400 hover:text-black font-bold text-xs uppercase tracking-wider rounded-lg transition-all disabled:opacity-30"
                        >
                          {processandoId === user.user_id ? 'Salvando' : 'Salvar'}
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
}
