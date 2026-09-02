import { z } from 'zod'

export const ExerciseTypeSchema = z.enum([
  'mc',
  'tf',
  'fill',
  'order',
  'match',
  'open',
  'audio',
  'image',
  'type_answer',
  'slider',
  'pin_drop',
  'word_cloud',
  'slide',
])
export type ExerciseType = z.infer<typeof ExerciseTypeSchema>

export const ExerciseCreateSchema = z.object({
  type: ExerciseTypeSchema,
  prompt: z.string().min(2).max(1000),
  mediaUrl: z.string().url().optional().or(z.literal('')).nullable(),
  optionsJson: z.string().optional().nullable(), // Array of options or pairs
  answerJson: z.string().min(1), // Expected correct answer format
  explanation: z.string().max(1000).optional().nullable(),
  points: z.number().int().min(1).max(100).default(1),
  timeSec: z.number().int().min(5).max(300).default(30),
  sortOrder: z.number().int().default(0),
  pointsMultiplier: z.number().int().min(1).max(5).default(1),
})
export type ExerciseCreate = z.infer<typeof ExerciseCreateSchema>

export const ExerciseBatchItemSchema = z.object({
  type: ExerciseTypeSchema.default('mc'),
  prompt: z.string().min(2).max(1000),
  mediaUrl: z.string().url().optional().or(z.literal('')).nullable(),
  optionsJson: z
    .union([z.string(), z.array(z.any()), z.record(z.string(), z.any())])
    .optional()
    .nullable(),
  answerJson: z.union([z.string(), z.record(z.string(), z.any()), z.number()]),
  explanation: z.string().max(1000).optional().nullable(),
  points: z.number().int().min(1).max(100).default(1),
  timeSec: z.number().int().min(5).max(300).default(30),
  sortOrder: z.number().int().default(0),
  pointsMultiplier: z.number().int().min(1).max(5).default(1),
})
export type ExerciseBatchItem = z.infer<typeof ExerciseBatchItemSchema>

export const ExerciseBatchCreateSchema = z.object({
  exercises: z.array(ExerciseBatchItemSchema).min(1),
})
export type ExerciseBatchCreate = z.infer<typeof ExerciseBatchCreateSchema>

export const ExerciseResponseSchema = ExerciseCreateSchema.extend({
  id: z.string(),
  lessonId: z.string(),
  createdAt: z.date(),
  updatedAt: z.date(),
})
export type ExerciseResponse = z.infer<typeof ExerciseResponseSchema>

/**
 * Validates whether a submitted answer matches the expected answer for any exercise type.
 * Usable on both server and client.
 */
export function isAnswerCorrect(
  exerciseType: string,
  submittedAnswerJson: string | Record<string, any> | any,
  correctAnswerJson: string | Record<string, any> | any
): boolean {
  try {
    const submitted =
      typeof submittedAnswerJson === 'string' ? JSON.parse(submittedAnswerJson) : submittedAnswerJson
    const correct = typeof correctAnswerJson === 'string' ? JSON.parse(correctAnswerJson) : correctAnswerJson

    switch (exerciseType) {
      case 'mc':
      case 'poll': {
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
        const corrX = correct?.correctX ?? correct?.x
        const corrY = correct?.correctY ?? correct?.y
        const tolerancePx = correct?.tolerancePx ?? correct?.tolerance ?? 50
        if (subX === undefined || subY === undefined || corrX === undefined || corrY === undefined)
          return false
        const dist = Math.sqrt((subX - corrX) ** 2 + (subY - corrY) ** 2)
        return dist <= tolerancePx
      }

      case 'word_cloud': {
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

        return subOrder.every((val: any, idx: number) => String(val) === String(expOrder[idx]))
      }

      case 'match': {
        const subPairs = submitted?.pairs || submitted
        const expPairs = correct?.pairs || correct

        if (!Array.isArray(subPairs) || !Array.isArray(expPairs)) return false
        if (subPairs.length !== expPairs.length) return false

        const normalize = (s: any) =>
          String(s ?? '')
            .trim()
            .toLowerCase()

        // Handle case where subPairs is an array of matched numbers/indices: [0, 1, 2]
        if (typeof subPairs[0] === 'number') {
          return subPairs.every((val: any, idx: number) => val === idx)
        }

        const serializePair = (p: any) => {
          if (typeof p === 'object' && p !== null) {
            const left = p.left ?? p.term ?? p.concept ?? ''
            const right = p.right ?? p.definition ?? ''
            return `${normalize(left)}->${normalize(right)}`
          }
          return normalize(p)
        }

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

        return text.length >= 2
      }

      case 'slide': {
        return true
      }

      default:
        return true
    }
  } catch {
    return false
  }
}
