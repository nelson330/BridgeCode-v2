import { z } from 'zod'
import { UserRoleSchema, UserStatusSchema } from './rbac'

export const LoginRequestSchema = z.object({
  username: z.string().min(3).max(50),
  password: z.string().min(1),
})
export type LoginRequest = z.infer<typeof LoginRequestSchema>

export const AuthUserSchema = z.object({
  id: z.string(),
  username: z.string(),
  displayName: z.string(),
  role: UserRoleSchema,
  status: UserStatusSchema,
  mustChangePassword: z.boolean(),
  adminLocal: z.boolean().optional(),
})
export type AuthUser = z.infer<typeof AuthUserSchema>

export const LoginResponseSchema = z.object({
  user: AuthUserSchema,
})
export type LoginResponse = z.infer<typeof LoginResponseSchema>

export const ChangePasswordSchema = z.object({
  currentPassword: z.string().min(1),
  nextPassword: z.string().min(6).max(100),
})
export type ChangePasswordRequest = z.infer<typeof ChangePasswordSchema>

export const RegisterTeacherRequestSchema = z.object({
  name: z.string().min(3).max(100),
  username: z
    .string()
    .min(3)
    .max(30)
    .regex(/^[a-z0-9._-]+$/i, 'Solo caracteres alfanuméricos, puntos o guiones'),
  email: z.string().email(),
  password: z.string().min(6),
  reason: z.string().min(10).max(500),
})
export type RegisterTeacherRequest = z.infer<typeof RegisterTeacherRequestSchema>
