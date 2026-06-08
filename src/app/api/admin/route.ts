import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// Inicializa o cliente com super-poderes de escrita e leitura global
const adminSecret = process.env.ADMIN_SECRET
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.NEXT_SECRET_SUPABASE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  throw new Error("Missing Supabase environment variables");
}

if (!adminSecret) {
  throw new Error("Missing ADMIN_SECRET environment variable");
}

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey)

// Função auxiliar para validar o token secreto idêntico aos mecanismos de sync
const validarSecret = (req: NextRequest) => {
  const secretHeader = req.headers.get('x-admin-secret')
  return secretHeader === adminSecret
}

// GET: Lista todos os usuários e pagamentos
export async function GET(req: NextRequest) {
  if (!validarSecret(req)) {
    return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 })
  }

  const { data, error } = await supabaseAdmin
    .from('pagamentos_usuarios')
    .select('*')
    .order('email', { ascending: true })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

// POST: Altera o valor pago de um usuário específico
export async function POST(req: NextRequest) {
  if (!validarSecret(req)) {
    return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 })
  }

  try {
    const { userId, novoValor } = await req.json()

    if (!userId || novoValor === undefined) {
      return NextResponse.json({ error: 'Parâmetros incompletos.' }, { status: 400 })
    }

    const { error } = await supabaseAdmin
      .from('pagamentos_usuarios')
      .update({ 
        valor_pago: parseFloat(novoValor),
        updated_at: new Date().toISOString()
      })
      .eq('user_id', userId)

    if (error) throw error

    return NextResponse.json({ success: true })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
