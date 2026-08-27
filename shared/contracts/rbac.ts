import { z } from 'zod'

export const UserRoleSchema = z.enum(['teacher', 'student', 'webmaster'])
export type UserRole = z.infer<typeof UserRoleSchema>

export const UserStatusSchema = z.enum(['active', 'inactive', 'banned'])
export type UserStatus = z.infer<typeof UserStatusSchema>

export interface SessionUser {
  id: string
  username: string
  displayName: string
  role: UserRole
  status: UserStatus
  mustChangePassword: boolean
  adminLocal?: boolean
}
