import { z } from 'zod'

export const StudentCreateSchema = z.object({
  username: z
    .string()
    .min(3)
    .max(24)
    .regex(/^[a-z0-9._-]+$/i, 'Solo caracteres alfanuméricos, puntos o guiones'),
  displayName: z.string().min(2).max(60),
  password: z.string().min(4).optional(),
})
export type StudentCreate = z.infer<typeof StudentCreateSchema>

export const StudentBatchCreateSchema = z.object({
  students: z.array(StudentCreateSchema).min(1).max(100),
})
export type StudentBatchCreate = z.infer<typeof StudentBatchCreateSchema>

export const StudentUpdateSchema = z.object({
  displayName: z.string().min(2).max(60).optional(),
  username: z
    .string()
    .min(3)
    .max(24)
    .regex(/^[a-z0-9._-]+$/i, 'Solo caracteres alfanuméricos, puntos o guiones')
    .optional(),
  password: z.string().min(4).optional(),
  status: z.enum(['active', 'inactive']).optional(),
})
export type StudentUpdate = z.infer<typeof StudentUpdateSchema>

export const StudentPasswordResetSchema = z.object({
  newPassword: z.string().min(4).optional(),
})
export type StudentPasswordReset = z.infer<typeof StudentPasswordResetSchema>
