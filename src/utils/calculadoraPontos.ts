// ============================================================================
// TIPAGENS GERAIS
// ============================================================================
export interface Placar {
  casa: number
  fora: number
}

export interface PalpiteMataMata {
  r32: string[]   // Array com os IDs dos 32 times
  r16: string[]   // Array com os IDs dos 16 times
  qf: string[]    // Array com os IDs dos 8 times
  sf: string[]    // Array com os IDs dos 4 times
  campeao: string // ID do campeão
  vice: string    // ID do vice
}

// ============================================================================
// 1. CÁLCULO DE PARTIDAS (1ª e 2ª Fase)
// Retorna: 0, 2, 5, 7 ou 10 pontos.
// ============================================================================
export function calcularPontosPartida(palpite: Placar, real: Placar): number {
  // 1. Acerto por completo (Gabarito Exato) -> 10 pontos máximos e encerra a conta
  if (palpite.casa === real.casa && palpite.fora === real.fora) {
    return 10
  }

  let pontos = 0

  // 2. Verifica se acertou o vencedor ou o empate
  const palpiteVencedor = palpite.casa > palpite.fora ? 'CASA' : palpite.casa < palpite.fora ? 'FORA' : 'EMPATE'
  const realVencedor = real.casa > real.fora ? 'CASA' : real.casa < real.fora ? 'FORA' : 'EMPATE'

  if (palpiteVencedor === realVencedor) {
    pontos += 5
  }

  // 3. Verifica se acertou o número de gols de QUALQUER UMA das equipes
  if (palpite.casa === real.casa || palpite.fora === real.fora) {
    pontos += 2
  }

  // O resultado final baterá exatamente com as suas regras:
  // Acertou Vencedor + 1 Placar = 7 pts
  // Acertou Vencedor + 0 Placar = 5 pts
  // Errou Vencedor + 1 Placar = 2 pts
  // Errou Tudo = 0 pts
  return pontos
}

// ============================================================================
// 2. CÁLCULO DE GRUPOS
// Retorna: 0, 3, 6 ou 12 pontos por grupo (Assumindo grupos de 4 seleções)
// ============================================================================
export function calcularPontosGrupo(
  palpitesDoGrupo: Record<string, string>, // Ex: { "id_brasil": "1", "id_servia": "2" }
  gabaritoDoGrupo: Record<string, string>
): number {
  let acertos = 0

  for (const timeId in gabaritoDoGrupo) {
    // Se a posição cravada pelo usuário bater com o gabarito oficial da FIFA
    if (palpitesDoGrupo[timeId] === gabaritoDoGrupo[timeId]) {
      acertos++
    }
  }

  return acertos * 3
}

// ============================================================================
// 3. CÁLCULO DO MATA-MATA (Classificados)
// Avalia todas as fases, calculando pontos individuais e os "Bônus de Perfeição"
// ============================================================================
export function calcularPontosMataMata(palpite: PalpiteMataMata, real: PalpiteMataMata): number {
  let pontosTotais = 0

  // Função auxiliar para cruzar os arrays e contar quantos times estão corretos
  const contarAcertosFase = (palpitesArray: string[], reaisArray: string[]) => {
    return palpitesArray.filter(timeId => reaisArray.includes(timeId)).length
  }

  // A) R32 (Eliminatórios - 32 Seleções)
  const acertosR32 = contarAcertosFase(palpite.r32, real.r32)
  pontosTotais += acertosR32 === 32 ? 40 : acertosR32 * 1

  // B) Oitavas de Final (16 Seleções)
  const acertosR16 = contarAcertosFase(palpite.r16, real.r16)
  pontosTotais += acertosR16 === 16 ? 40 : acertosR16 * 2

  // C) Quartas de Final (8 Seleções)
  const acertosQF = contarAcertosFase(palpite.qf, real.qf)
  pontosTotais += acertosQF === 8 ? 50 : acertosQF * 5

  // D) Semifinais (4 Seleções)
  const acertosSF = contarAcertosFase(palpite.sf, real.sf)
  pontosTotais += acertosSF === 4 ? 50 : acertosSF * 10

  // E) Campeão (Adivinhar país campeão)
  if (palpite.campeao === real.campeao) {
    pontosTotais += 40
  }

  // F) Vice-Campeão
  if (palpite.vice === real.vice) {
    pontosTotais += 30
  }

  return pontosTotais
}
