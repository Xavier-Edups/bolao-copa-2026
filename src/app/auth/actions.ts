'use server'

import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

export async function login(formData: FormData) {
  const supabase = await createClient()

  const email = formData.get('email') as string
  const password = formData.get('password') as string

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  if (!email || !emailRegex.test(email)) {
    return redirect(`/login?error=${encodeURIComponent('Por favor, insira um e-mail válido.')}`)
  }

  const { error } = await supabase.auth.signInWithPassword({
    email,
    password,
  })

  if (error) {
    return redirect(`/login?error=${encodeURIComponent('Email ou senha inválidos.')}`)
  }

  revalidatePath('/', 'layout')
  redirect('/dashboard') // Redireciona para a área logada do bolão
}

export async function signup(formData: FormData) {
  const DATA_LIMITE = new Date('2026-06-11T14:00:00-03:00');
  console.log(new Date(), DATA_LIMITE)

  if (new Date() >= DATA_LIMITE) {
    return redirect(`/cadastro?error=${encodeURIComponent('As inscrições foram encerradas!')}`);
  }

  const supabase = await createClient()

  const nome = formData.get('nome') as string
  const email = formData.get('email') as string
  const password = formData.get('password') as string

  // Validação: Nome
  const partesNome = nome ? nome.trim().split(/\s+/) : []
  if (partesNome.length < 2 || partesNome[0].length < 2 || partesNome[1].length < 2) {
    return redirect(`/cadastro?error=${encodeURIComponent('Por favor, insira seu nome completo.')}`)
  }

  // Validação: E-mail
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  if (!email || !emailRegex.test(email)) {
    return redirect(`/cadastro?error=${encodeURIComponent('Por favor, insira um e-mail válido.')}`)
  }

  // Validação: Senha
  if (!password || password.length < 6) {
    return redirect(`/cadastro?error=${encodeURIComponent('A senha deve ter pelo menos 6 caracteres.')}`)
  }

  // Envia para o Supabase incluindo os metadados do usuário
  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        full_name: nome, // Salva o nome na conta do Supabase
      },
    },
  })

  if (error) {
    // Se o erro acontecer, geralmente é porque o e-mail já existe ou a senha é muito fraca
    return redirect(`/cadastro?error=${encodeURIComponent('Erro ao criar conta. Este e-mail já pode estar em uso.')}`)
  }

  revalidatePath('/', 'layout')
  redirect('/dashboard')
}

export async function logout() {
  const supabase = await createClient()

  const { error } = await supabase.auth.signOut()

  if (!error) {
    revalidatePath('/', 'layout')
    redirect('/login')
  }
}
