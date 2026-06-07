import Link from 'next/link'
import { createClient } from '@/utils/supabase/server'
import Countdown from '@/components/Countdown'
import Image from 'next/image'

export default async function LandingPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  return (
    <div className="min-h-screen text-white font-sans overflow-hidden selection:bg-teal-500 selection:text-white">
      {/*
      <div 
        className="fixed inset-0 -z-20 bg-[42%_center] bg-no-repeat scale-250 sm:scale-335 transform-gpu"
        style={{ backgroundImage: "url('/bg-wc-2026.svg')" }}
      ></div>
      */}
      {/* Luz de Fundo (Glow Effect) */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-4xl h-[600px] bg-gradient-to-b from-teal-900/40 via-emerald-900/10 to-transparent blur-3xl pointer-events-none -z-10"></div>

      {/* Navbar Transparente */}
      <nav className="relative z-10 w-full border-b border-white/10 bg-black/50 backdrop-blur-lg">
        <div className="max-w-7xl mx-auto px-6 py-4 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <span className="text-sm sm:text-lg font-black tracking-wider text-white uppercase">
              Bolão <span className="text-transparent bg-clip-text bg-gradient-to-r from-teal-400 to-emerald-400">World Cup 2026</span>
            </span>
          </div>
          <div>
            {user ? (
              <Link href="/dashboard" className="px-2 sm:px-6 py-2 text-xs sm:text-sm font-bold bg-white/10 hover:bg-white/20 border border-white/5 rounded-full transition-all">
                Meu Painel →
              </Link>
            ) : (
              <Link href="/login" className="px-6 py-2 text-sm font-bold text-gray-300 hover:text-white transition-colors">
                Entrar
              </Link>
            )}
          </div>
        </div>
      </nav>

      {/* Seção Principal (Hero) */}
      <main className="relative z-10 flex flex-col items-center justify-center px-4 pt-16 pb-24 text-center">
        
        {/* Emblema da Marca Estilizado */}
          <div className="flex justify-center mb-15 drop-shadow-lg">
            <Image 
              src="/logo-wc-2026-vert2.png" 
              alt="Logo Copa do Mundo 2026" 
              width={250} 
              height={250} 
              className="object-contain"
            />
          </div>

        <h1 className="text-5xl sm:text-7xl md:text-6xl font-black tracking-tighter mb-6 max-w-5xl leading-tight">
          A COPA CHEGOU . . .<br />
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-teal-400 via-emerald-400 to-teal-200">
            FAÇA JÁ SUAS APOSTAS!
          </span>
        </h1>
        
        <div className="text-lg sm:text-xl text-gray-400 mb-12 max-w-2xl">
          Faltam poucos dias para a bola rolar! Junte-se ao <span className="text-white font-semibold">Bolão World Cup 2026</span>, monte sua estratégia, preencha seus palpites e seja o vencedor!
        </div>

        {/* Cronômetro */}
        <div className="mb-14 w-full">
          <p className="text-sm font-bold uppercase tracking-[0.2em] mb-1 text-gray-400">
            Abertura da Copa:</p>
          <p className="text-sm font-bold uppercase tracking-[0.2em] mb-1 text-gray-400">
            México <span className="text-white">vs</span> África do Sul
          </p>
          <p className="text-sm tracking-[0.01em] mb-6 text-gray-400">
            (Prazo para envio dos palpites: <strong>2 horas antes da partida</strong>)
          </p>
          <Countdown />
        </div>

        {/* Botões de Ação */}
        <div className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto px-4">
          {user ? (
             <Link 
              href="/dashboard" 
              className="px-10 py-4 bg-teal-500 hover:bg-teal-400 text-black font-black rounded-full text-white text-lg transition-all hover:scale-105 shadow-[0_0_40px_-10px_rgba(20,184,166,0.6)]"
            >
              Acessar Meus Palpites
            </Link>
          ) : (
            <>
              <Link 
                href="/cadastro" 
                className="px-10 py-4 bg-gradient-to-r from-teal-500 to-emerald-500 hover:from-teal-400 hover:to-emerald-400 text-white font-black rounded-full text-lg transition-all hover:scale-105 shadow-[0_0_40px_-10px_rgba(20,184,166,0.5)]"
              >
                Participar do Bolão
              </Link>
              <Link 
                href="/login" 
                className="px-10 py-4 bg-white/5 border border-white/10 hover:bg-white/10 text-white font-bold rounded-full text-lg transition-colors"
              >
                Já tenho conta
              </Link>
            </>
          )}
        </div>
      </main>

      {/* Seção de Regras e Recursos */}
      <div className="relative z-10 max-w-6xl mx-auto px-6 py-20 border-t border-white/5">
        <div className="grid md:grid-cols-3 gap-6">
          <div className="bg-gradient-to-br from-teal-900/30 to-emerald-900/10 border border-emerald-600 rounded-3xl p-8 relative overflow-hidden shadow-[0_0_30px_-10px_rgba(20,184,166,0.2)]">
              <div className="text-5xl mb-6">🔮</div>
              <h3 className="text-2xl font-bold text-white mb-3">Previsões Completas</h3>
              <p className="text-gray-400 leading-relaxed">
                Faça seus palpites para todos os jogos da copa, seleções classificadas, Campeão e Vice, e muito mais!
              </p>
            </div>
            <div className="bg-gradient-to-br from-teal-900/30 to-emerald-900/10 border border-emerald-600 rounded-3xl p-8 relative overflow-hidden shadow-[0_0_30px_-10px_rgba(20,184,166,0.2)]">
              <div className="text-5xl mb-6">⚖️</div>
              <h3 className="text-2xl font-bold text-white mb-3">Transparência e Credibilidade</h3>
              <p className="text-gray-400 leading-relaxed">
                Antes do início da Copa, os palpites de todos os participantes serão enviados por email para registro das apostas, permitindo a conferência por todos!
              </p>
            </div>
            <div className="bg-gradient-to-br from-teal-900/30 to-emerald-900/10 border border-emerald-600 rounded-3xl p-8 relative overflow-hidden shadow-[0_0_30px_-10px_rgba(20,184,166,0.2)]">
              <div className="text-5xl mb-6">🏆</div>
              <h3 className="text-2xl font-bold text-white mb-3">Ranking em tempo real</h3>
              <p className="text-gray-400 leading-relaxed">
                Acompanhe sua posição e a dos seus amigos na tabela de classificação imediatamente após o término das partidas!
              </p>
            </div>
        </div>
      </div>
      {/*
      <div className="relative z-10 max-w-6xl mx-auto px-6 py-20">
        <div className="text-center mb-16">
          <h2 className="text-3xl sm:text-5xl font-black text-white tracking-tight uppercase mb-4">
            Como <span className="text-transparent bg-clip-text bg-gradient-to-r from-teal-400 to-emerald-400">Pontuar</span>
          </h2>
          <p className="text-gray-400 text-lg max-w-2xl mx-auto">
            Regras simples para você focar no que importa: acertar os resultados e dominar o ranking.
          </p>
        </div>

        <div className="grid lg:grid-cols-3 gap-8">
          
          <div className="bg-white/[0.02] border border-white/5 rounded-3xl p-8 relative overflow-hidden group hover:border-teal-500/30 transition-colors duration-300">
            <div className="absolute top-0 right-0 w-32 h-32 bg-teal-500/10 blur-3xl rounded-full group-hover:bg-teal-500/20 transition-all"></div>
            <h3 className="text-2xl font-bold text-white mb-6 flex items-center gap-3">
              <span className="text-3xl">🎯</span> Nos Jogos
            </h3>
            <ul className="space-y-4 text-gray-400">
              <li className="flex justify-between items-center border-b border-white/5 pb-3">
                <span>Placar exato (Na mosca!)</span>
                <span className="font-black text-teal-400 text-xl">10 pts</span>
              </li>
              <li className="flex justify-between items-center border-b border-white/5 pb-3">
                <span>Acertar o vencedor (ou empate)</span>
                <span className="font-black text-emerald-400 text-xl">5 pts</span>
              </li>
              <li className="flex justify-between items-center border-b border-white/5 pb-3">
                <span>Acertar os gols de um dos times</span>
                <span className="font-black text-emerald-400/70 text-lg">+2 pts</span>
              </li>
            </ul>
            <div className="mt-6 p-3 rounded-xl bg-white/1 border border-white/10 text-xs text-gray-400 flex items-start gap-2">
              <p className="font-bold">Válido apenas para os 90 minutos (não conta prorrogação ou pênaltis).</p>
            </div>
          </div>

          <div className="bg-white/[0.02] border border-white/5 rounded-3xl p-8 relative overflow-hidden group hover:border-emerald-500/30 transition-colors duration-300">
            <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/10 blur-3xl rounded-full group-hover:bg-emerald-500/20 transition-all"></div>
            <h3 className="text-2xl font-bold text-white mb-6 flex items-center gap-3">
              <span className="text-3xl">🔥</span> Classificação
            </h3>
            <ul className="space-y-4 text-gray-400">
              <li className="flex justify-between items-center border-b border-white/5 pb-3">
                <span>Posição exata nos Grupos</span>
                <span className="font-black text-teal-400 text-xl">3 pts</span>
              </li>
              <li className="flex flex-col border-b border-white/5 pb-3">
                <div className="flex justify-between items-center mb-1">
                  <span>Passar na 2ª Fase / Oitavas</span>
                  <span className="font-black text-emerald-400 text-xl">1 a 2 pts</span>
                </div>
                <span className="text-xs font-semibold text-teal-300 tracking-wide uppercase">Bônus de +40 pts se gabaritar a fase!</span>
              </li>
              <li className="flex flex-col border-b border-white/5 pb-3">
                <div className="flex justify-between items-center mb-1">
                  <span>Quartas e Semifinais</span>
                  <span className="font-black text-emerald-400 text-xl">5 a 10 pts</span>
                </div>
                <span className="text-xs font-semibold text-teal-300 tracking-wide uppercase">Bônus de +50 pts se gabaritar a fase!</span>
              </li>
            </ul>
          </div>

          <div className="bg-gradient-to-br from-teal-900/30 to-emerald-900/10 border border-teal-500/40 rounded-3xl p-8 relative overflow-hidden shadow-[0_0_30px_-10px_rgba(20,184,166,0.2)]">
            <div className="absolute top-0 right-0 w-32 h-32 bg-teal-400/20 blur-3xl rounded-full"></div>
            <h3 className="text-2xl font-bold text-white mb-6 flex items-center gap-3">
              <span className="text-3xl">👑</span> Premiação Final
            </h3>
            <ul className="space-y-5 text-gray-300">
              <li className="flex justify-between items-center border-b border-white/10 pb-3">
                <span className="font-medium text-lg">Campeão do Mundo</span>
                <span className="font-black text-teal-300 text-3xl drop-shadow-md">40 pts</span>
              </li>
              <li className="flex justify-between items-center border-b border-white/10 pb-3">
                <span className="font-medium text-lg">Artilheiro da Copa</span>
                <span className="font-black text-emerald-300 text-2xl drop-shadow-md">35 pts</span>
              </li>
              <li className="flex justify-between items-center pb-1">
                <span className="font-medium text-lg">Vice-campeão</span>
                <span className="font-black text-teal-400/80 text-xl">30 pts</span>
              </li>
            </ul>
            <div className="mt-8 pt-4 border-t border-teal-500/30 text-center">
              <span className="text-sm text-teal-200 font-medium">Faça a sua aposta antes do 1º jogo!</span>
            </div>
          </div>

        </div>
      </div>
    */}

      <div> 
          {/* Card 1: A Arrecadação */}
          <div className="relative z-10 max-w-6xl mx-auto px-6 py-20 border-t border-white/5">
            <h2 className="text-3xl sm:text-5xl font-black text-white tracking-tight uppercase mb-3 relative z-10 text-center">
              A <span className="text-emerald-400">Participação</span>
            </h2>
              <p className="text-gray-400 text-lg max-w-2xl mx-auto relative z-10 mb-4 text-center">
                Pagamento via PIX, fácil e rápido!
              </p>
            <div className="w-[90%] md:w-[50%] lg:w-[28%] mx-auto">
              <div className="flex flex-col items-center justify-center p-6 bg-white/5 border border-emerald-600 rounded-2xl mb-6">
                <span className="text-sm font-bold uppercase tracking-widest mb-1">Valor por Bolão</span>
                <span className="text-4xl font-black text-emerald-400 drop-shadow-md">R$ 30,00</span>
              </div>
            </div>
          </div>
      </div>
      {/* Seção de Premiação (O Pote de Ouro) */}
      <div className="relative z-10 max-w-6xl mx-auto px-6 py-20 border-t border-white/5">
        <div className="text-center mb-16 relative">
          {/* Brilho dourado no fundo do título */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-32 bg-amber-500/20 blur-[100px] pointer-events-none"></div>
          
          <h2 className="text-3xl sm:text-5xl font-black text-white tracking-tight uppercase mb-4 relative z-10">
            A <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-300 to-orange-500">Premiação</span>
          </h2>
          <p className="text-gray-400 text-lg max-w-2xl mx-auto relative z-10">
            Do total arrecadado, 65% serão destinados ao prêmio e os 35% restantes, para cobrir os custos da organização.
          </p>
        </div>
        {/* Container Flexível que força o conteúdo para o exato centro da tela */}
<div className="w-full flex justify-center my-8">
  
  {/* A div que controla a largura de 30% */}
  <div className="w-[90%] md:w-[50%] lg:w-[35%]">
    
    {/* Card 2: O Pódio */}
    <div className="bg-gradient-to-br from-amber-900/20 to-orange-900/10 border border-amber-500/40 rounded-3xl p-8 relative overflow-hidden shadow-[0_0_30px_-10px_rgba(245,158,11,0.15)] group hover:shadow-[0_0_40px_-10px_rgba(245,158,11,0.3)] transition-all duration-300 transform hover:-translate-y-1">
      <div className="absolute top-0 right-0 w-32 h-32 bg-amber-400/20 blur-3xl rounded-full"></div>
      <h3 className="text-2xl font-bold text-white mb-8 flex justify-center items-center gap-3">
        <span className="text-3xl">🏆</span> O Pódio
      </h3>
      
      <ul className="space-y-6 text-gray-300 relative z-10">
        <li className="flex justify-between items-center border-b border-amber-500/20 pb-4">
          <div className="flex items-center gap-3">
            <span className="text-2xl">🥇</span>
            <span className="font-bold text-xl">1º Lugar</span>
          </div>
          <span className="font-black text-amber-400 text-4xl drop-shadow-[0_2px_10px_rgba(245,158,11,0.5)]">50%</span>
        </li>
        <li className="flex justify-between items-center border-b border-amber-500/10 pb-4">
          <div className="flex items-center gap-3">
            <span className="text-2xl">🥈</span>
            <span className="font-bold text-lg text-gray-200">2º Lugar</span>
          </div>
          <span className="font-black text-gray-300 text-2xl">30%</span>
        </li>
        <li className="flex justify-between items-center pb-2">
          <div className="flex items-center gap-3">
            <span className="text-2xl">🥉</span>
            <span className="font-bold text-lg text-orange-200/80">3º Lugar</span>
          </div>
          <span className="font-black text-orange-300/80 text-xl">20%</span>
        </li>
      </ul>
    </div>
    </div> 
  </div>
</div>

      {/* Footer */}
      <footer className="bg-black/80 text-gray-500 py-8 text-center text-sm border-t border-white/5">
        <p>Plataforma independente de entretenimento • Bolão World Cup 2026 🌎</p>
      </footer>
    </div>
  )
}
