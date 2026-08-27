import { z } from 'zod'

export const GameModeSchema = z.enum(['trivia', 'roulette', 'battle', 'race'])
export type GameMode = z.infer<typeof GameModeSchema>

export const SessionStatusSchema = z.enum(['lobby', 'active', 'finished', 'closed'])
export type SessionStatus = z.infer<typeof SessionStatusSchema>

export const CreateSessionRequestSchema = z.object({
  classId: z.string(),
  lessonId: z.string(),
  mode: GameModeSchema.default('trivia'),
})
export type CreateSessionRequest = z.infer<typeof CreateSessionRequestSchema>

export const ParticipantStateSchema = z.object({
  userId: z.string().optional(),
  displayName: z.string(),
  score: z.number().int().default(0),
  streak: z.number().int().default(0),
  team: z.enum(['red', 'blue', 'green', 'yellow']).optional(),
  hasAnswered: z.boolean().default(false),
  lastAnswerCorrect: z.boolean().nullable().optional(),
})
export type ParticipantState = z.infer<typeof ParticipantStateSchema>

export const WsClientMessageSchema = z.discriminatedUnion('type', [
  z.object({
    type: z.literal('JOIN'),
    pin: z.string(),
    displayName: z.string().min(1).max(30),
    userId: z.string().optional(),
  }),
  z.object({
    type: z.literal('HOST_JOIN'),
    pin: z.string().optional(),
    sessionId: z.string().optional(),
  }),
  z.object({
    type: z.literal('START_GAME'),
  }),
  z.object({
    type: z.literal('NEXT_EXERCISE'),
  }),
  z.object({
    type: z.literal('SUBMIT_ANSWER'),
    exerciseId: z.string(),
    answerJson: z.string(),
    latencyMs: z.number().int().min(0),
  }),
  z.object({
    type: z.literal('FOCUS_CHANGE'),
    hasFocus: z.boolean(),
  }),
  z.object({
    type: z.literal('SPIN_ROULETTE'),
  }),
])
export type WsClientMessage = z.infer<typeof WsClientMessageSchema>

export const WsServerMessageSchema = z.discriminatedUnion('type', [
  z.object({
    type: z.literal('ROOM_JOINED'),
    participantId: z.string(),
    mode: GameModeSchema,
    status: SessionStatusSchema,
    participants: z.array(ParticipantStateSchema),
    currentExercise: z.any().optional(),
    exerciseIndex: z.number().optional(),
    totalExercises: z.number().optional(),
    timeSec: z.number().optional(),
    remainingSec: z.number().optional(),
  }),
  z.object({
    type: z.literal('PARTICIPANT_LIST'),
    participants: z.array(ParticipantStateSchema),
  }),
  z.object({
    type: z.literal('ANSWER_STATS'),
    totalParticipants: z.number(),
    answeredCount: z.number(),
  }),
  z.object({
    type: z.literal('GAME_STARTED'),
    exerciseIndex: z.number(),
    totalExercises: z.number(),
    currentExercise: z.any(),
    timeSec: z.number(),
  }),
  z.object({
    type: z.literal('TIMER_TICK'),
    remainingSec: z.number(),
  }),
  z.object({
    type: z.literal('EXERCISE_RESULT'),
    correctAnswerJson: z.string(),
    explanation: z.string().nullable().optional(),
    leaderboard: z.array(ParticipantStateSchema),
  }),
  z.object({
    type: z.literal('ROULETTE_SPIN_RESULT'),
    selectedIndex: z.number(),
    selectedParticipant: z.string(),
  }),
  z.object({
    type: z.literal('GAME_FINISHED'),
    podium: z.array(ParticipantStateSchema),
  }),
  z.object({
    type: z.literal('ERROR'),
    message: z.string(),
  }),
])
export type WsServerMessage = z.infer<typeof WsServerMessageSchema>
