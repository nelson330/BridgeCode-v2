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

export function isAnswerCorrect(
  exerciseType: string,
  submittedAnswerJson: string,
  correctAnswerJson: string
): boolean {
  try {
    const submitted =
      typeof submittedAnswerJson === 'string' ? JSON.parse(submittedAnswerJson) : submittedAnswerJson
    const correct = typeof correctAnswerJson === 'string' ? JSON.parse(correctAnswerJson) : correctAnswerJson

    switch (exerciseType) {
      case 'mc': {
        const subIdx =
          typeof submitted?.correctIndex === 'number'
            ? submitted.correctIndex
            : typeof submitted?.selectedIndex === 'number'
              ? submitted.selectedIndex
              : typeof submitted === 'number'
                ? submitted
                : null

        const corrIdx =
          typeof correct?.correctIndex === 'number'
            ? correct.correctIndex
            : typeof correct === 'number'
              ? correct
              : null

        return subIdx !== null && corrIdx !== null && subIdx === corrIdx
      }

      case 'tf': {
        const subVal =
          typeof submitted?.isTrue === 'boolean'
            ? submitted.isTrue
            : typeof submitted?.selected === 'boolean'
              ? submitted.selected
              : typeof submitted === 'boolean'
                ? submitted
                : null

        const corrVal =
          typeof correct?.isTrue === 'boolean'
            ? correct.isTrue
            : typeof correct?.selected === 'boolean'
              ? correct.selected
              : typeof correct === 'boolean'
                ? correct
                : null

        return subVal !== null && corrVal !== null && subVal === corrVal
      }

      case 'fill':
      case 'type_answer': {
        const sub = String(
          submitted?.text ??
            submitted?.value ??
            submitted?.answer ??
            (typeof submitted === 'string' ? submitted : '')
        ).trim()

        if (!sub) return false

        const caseSensitive = correct?.caseSensitive === true
        const normalizedSub = caseSensitive ? sub : sub.toLowerCase()

        if (Array.isArray(correct?.validAnswers)) {
          return correct.validAnswers.some((ans: any) => {
            const normalizedAns = caseSensitive ? String(ans).trim() : String(ans).trim().toLowerCase()
            return normalizedAns === normalizedSub
          })
        }

        const expected = String(correct?.text ?? correct?.validAnswer ?? correct?.answer ?? '').trim()
        const normalizedExpected = caseSensitive ? expected : expected.toLowerCase()

        return normalizedSub === normalizedExpected
      }

      case 'slider': {
        const value = typeof submitted?.value === 'number' ? submitted.value : Number(submitted?.value)
        const correctValue = correct?.correctValue ?? correct?.value
        const tolerance = correct?.tolerance ?? 1
        if (Number.isNaN(value) || correctValue === undefined) return false
        return Math.abs(value - correctValue) <= tolerance
      }

      case 'pin_drop': {
        const subX = submitted?.x ?? submitted?.correctX
        const subY = submitted?.y ?? submitted?.correctY
        const corrX = correct?.correctX
        const corrY = correct?.correctY
        const tolerancePx = correct?.tolerancePx ?? 50
        if (subX === undefined || subY === undefined || corrX === undefined || corrY === undefined)
          return false
        const dist = Math.sqrt((subX - corrX) ** 2 + (subY - corrY) ** 2)
        return dist <= tolerancePx
      }

      case 'word_cloud': {
        // Word cloud is non-competitive, always counts as "answered"
        return true
      }

      case 'order': {
        const subOrder = Array.isArray(submitted?.correctOrder)
          ? submitted.correctOrder
          : Array.isArray(submitted?.order)
            ? submitted.order
            : Array.isArray(submitted)
              ? submitted
              : []

        const expOrder = Array.isArray(correct?.correctOrder)
          ? correct.correctOrder
          : Array.isArray(correct?.order)
            ? correct.order
            : Array.isArray(correct)
              ? correct
              : []

        if (subOrder.length === 0 || expOrder.length === 0 || subOrder.length !== expOrder.length) {
          return false
        }

        return subOrder.every((val: any, idx: number) => val === expOrder[idx])
      }

      case 'match': {
        const subPairs = submitted?.pairs || submitted
        const expPairs = correct?.pairs || correct

        if (!Array.isArray(subPairs) || !Array.isArray(expPairs)) return false
        if (subPairs.length !== expPairs.length) return false

        const serializePair = (p: any) => `${p.left || p.term}->${p.right || p.definition}`
        const subSet = new Set(subPairs.map(serializePair))
        const expSet = new Set(expPairs.map(serializePair))

        for (const item of expSet) {
          if (!subSet.has(item)) return false
        }
        return true
      }

      case 'open':
      case 'short': {
        const text = String(
          submitted?.text ?? submitted?.answer ?? (typeof submitted === 'string' ? submitted : '')
        ).trim()

        if (!text) return false

        if (Array.isArray(correct?.keywords) && correct.keywords.length > 0) {
          const lower = text.toLowerCase()
          return correct.keywords.some((kw: any) => lower.includes(String(kw).toLowerCase()))
        }

        return text.length >= 3
      }

      case 'slide': {
        // Slides are informational, always "correct"
        return true
      }

      default:
        return true
    }
  } catch {
    return false
  }
}
