import { z } from 'zod'

export const ClassCreateSchema = z.object({
  name: z.string().min(2).max(80),
  code: z.string().min(4).max(10).optional(),
})
export type ClassCreate = z.infer<typeof ClassCreateSchema>

export const ClassUpdateSchema = z.object({
  name: z.string().min(2).max(80).optional(),
  archived: z.boolean().optional(),
})
export type ClassUpdate = z.infer<typeof ClassUpdateSchema>

export const ClassMembersAddSchema = z.object({
  userIds: z.array(z.string()).min(1),
})
export type ClassMembersAdd = z.infer<typeof ClassMembersAddSchema>
