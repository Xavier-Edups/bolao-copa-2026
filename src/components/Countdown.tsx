'use client'
import { useState, useEffect } from 'react'

export default function Countdown() {
  const [timeLeft, setTimeLeft] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0 })
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    // O grande jogo de abertura: México x África do Sul no Estádio Azteca
    // Horário oficial: 11 de Junho de 2026 às 21:00 (Horário de Brasília)
    const targetDate = new Date('2026-06-11T21:00:00-03:00').getTime()

    const updateTimer = () => {
      const now = new Date().getTime()
      const difference = targetDate - now

      if (difference > 0) {
        setTimeLeft({
          days: Math.floor(difference / (1000 * 60 * 60 * 24)),
          hours: Math.floor((difference % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)),
          minutes: Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60)),
          seconds: Math.floor((difference % (1000 * 60)) / 1000)
        })
      }
    }

    updateTimer()
    const interval = setInterval(updateTimer, 1000)
    return () => clearInterval(interval)
  }, [])

  // Isso evita o erro de hidratação do Next.js (só renderiza o relógio no navegador)
  if (!mounted) {
    return <div className="h-24 flex items-center justify-center animate-pulse opacity-50"><div className="w-64 h-20 bg-white/10 rounded-2xl"></div></div>
  }

  return (
    <div className="flex gap-2 sm:gap-4 justify-center text-white">
      <TimeBox value={timeLeft.days} label="DIAS" />
      <span className="text-3xl sm:text-5xl font-black text-white/30 self-start mt-2 sm:mt-4">:</span>
      <TimeBox value={timeLeft.hours} label="HORAS" />
      <span className="text-3xl sm:text-5xl font-black text-white/30 self-start mt-2 sm:mt-4">:</span>
      <TimeBox value={timeLeft.minutes} label="MIN" />
      <span className="text-3xl sm:text-5xl font-black text-white/30 self-start mt-2 sm:mt-4">:</span>
      <TimeBox value={timeLeft.seconds} label="SEG" />
    </div>
  )
}

function TimeBox({ value, label }: { value: number, label: string }) {
  return (
    <div className="flex flex-col items-center">
      <div className="bg-white/5 backdrop-blur-md border border-white/10 w-16 h-16 sm:w-24 sm:h-24 flex items-center justify-center rounded-xl sm:rounded-2xl shadow-xl">
        <span className="text-2xl sm:text-5xl font-black tabular-nums tracking-tighter">
          {value.toString().padStart(2, '0')}
        </span>
      </div>
      <span className="text-[10px] sm:text-xs font-bold text-teal-400 mt-2 tracking-widest">{label}</span>
    </div>
  )
}
