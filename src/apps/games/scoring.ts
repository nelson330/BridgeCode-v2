export function calculateScore(
  basePoints: number,
  timeSec: number,
  latencyMs: number,
  currentStreak: number,
  isCorrect: boolean,
  mode: 'classic' | 'race' = 'classic',
  pointsMultiplier = 1
): { pointsEarned: number; newStreak: number; multiplier: number } {
  if (!isCorrect) {
    return { pointsEarned: 0, newStreak: 0, multiplier: 1.0 }
  }

  const responseTimeSec = Math.min(latencyMs / 1000, timeSec)
  const timeRatio = responseTimeSec / timeSec

  // Speed factor: from 1.0 down to 0.5
  const speedFactor = Math.max(0.5, 1 - timeRatio / 2)

  const newStreak = currentStreak + 1

  let streakMultiplier = 1.0
  if (mode === 'classic') {
    if (newStreak === 2) streakMultiplier = 1.2
    else if (newStreak === 3) streakMultiplier = 1.4
    else if (newStreak === 4) streakMultiplier = 1.6
    else if (newStreak >= 5) streakMultiplier = 2.0
  }
  // Race mode: no streak bonus, pure speed

  const totalMultiplier = streakMultiplier * pointsMultiplier
  const pointsEarned = Math.round(basePoints * 100 * speedFactor * totalMultiplier)

  return { pointsEarned, newStreak, multiplier: totalMultiplier }
}

export { isAnswerCorrect } from '@shared/contracts/exercises'
