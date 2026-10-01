import { WsClientMessageSchema } from '@shared/contracts/games'
import type { ServerWebSocket } from 'bun'
import { and, eq, gt } from 'drizzle-orm'
import { getDb } from '../../core/db/client'
import { liveSessions, sessions, users } from '../../core/db/schema'
import { logger } from '../../core/logger'
import { type ClientSocket, RoomManager } from './room'

export interface WsSocketData {
  authenticatedUserId?: string
  pin?: string
  participantId?: string
  sessionId?: string
  isHost?: boolean
  clientSocket?: ClientSocket
}

export function getSocketUser(request: Request): string | undefined {
  const token = request.headers
    .get('cookie')
    ?.split(';')
    .map((part) => part.trim())
    .find((part) => part.startsWith('session='))
    ?.slice(8)
  if (!token) return
  const found = getDb()
    .select({ id: users.id })
    .from(sessions)
    .innerJoin(users, eq(sessions.userId, users.id))
    .where(and(eq(sessions.id, token), gt(sessions.expiresAt, new Date()), eq(users.status, 'active')))
    .get()
  return found?.id
}

export async function handleWsMessage(ws: ServerWebSocket<WsSocketData>, rawMessage: string | Buffer) {
  try {
    const text = typeof rawMessage === 'string' ? rawMessage : rawMessage.toString('utf8')
    const parsed = WsClientMessageSchema.safeParse(JSON.parse(text))
    if (!parsed.success) {
      ws.send(JSON.stringify({ type: 'ERROR', message: 'Mensaje de sala no válido' }))
      return
    }
    const message = parsed.data

    switch (message.type) {
      case 'HOST_JOIN': {
        const room = message.pin
          ? RoomManager.getRoomByPin(message.pin)
          : message.sessionId
            ? RoomManager.getRoomById(message.sessionId)
            : undefined

        if (!room) {
          ws.send(JSON.stringify({ type: 'ERROR', message: 'Sala no encontrada' }))
          return
        }

        const owner = getDb()
          .select({ teacherId: liveSessions.teacherId })
          .from(liveSessions)
          .where(eq(liveSessions.id, room.sessionId))
          .get()
        if (!owner || owner.teacherId !== ws.data.authenticatedUserId) {
          ws.send(
            JSON.stringify({ type: 'ERROR', message: 'Debes iniciar sesión como docente de esta sala' })
          )
          return
        }
        if (ws.data.clientSocket) return
        const clientSocket = {
          send: (data: string) => ws.send(data),
          close: () => ws.close(),
        }

        room.addHostSocket(clientSocket)
        ws.data = {
          authenticatedUserId: ws.data.authenticatedUserId,
          pin: room.pin,
          sessionId: room.sessionId,
          isHost: true,
          clientSocket,
        }
        break
      }

      case 'JOIN': {
        const room = RoomManager.getRoomByPin(message.pin)
        if (!room) {
          ws.send(JSON.stringify({ type: 'ERROR', message: 'Código PIN no válido o sala cerrada' }))
          return
        }

        const clientSocket = {
          send: (data: string) => ws.send(data),
          close: () => ws.close(),
        }

        if (ws.data.clientSocket) return
        const participantId = room.addParticipant(
          clientSocket,
          message.displayName,
          ws.data.authenticatedUserId
        )
        ws.data = {
          authenticatedUserId: ws.data.authenticatedUserId,
          pin: message.pin,
          participantId,
          sessionId: room.sessionId,
          isHost: false,
          clientSocket,
        }
        break
      }

      case 'SUBMIT_ANSWER': {
        if (!ws.data.pin || !ws.data.participantId) return
        const room = RoomManager.getRoomByPin(ws.data.pin)
        if (room) {
          await room.submitAnswer(ws.data.participantId, message.answerJson, message.latencyMs || 0)
        }
        break
      }

      case 'SPIN_ROULETTE': {
        if (!ws.data.pin || !ws.data.isHost) return
        const room = RoomManager.getRoomByPin(ws.data.pin)
        if (room) {
          room.spinRoulette()
        }
        break
      }

      case 'FOCUS_CHANGE': {
        if (!ws.data.pin || !ws.data.participantId) return
        const room = RoomManager.getRoomByPin(ws.data.pin)
        if (room) {
          room.recordFocusEvent(ws.data.participantId, message.hasFocus === true)
        }
        break
      }

      default:
        break
    }
  } catch (err: any) {
    logger.warn({ err }, 'Error handling WebSocket message')
    ws.send(
      JSON.stringify({
        type: 'ERROR',
        message: 'No se pudo completar la operación de la sala. Inténtalo de nuevo.',
      })
    )
  }
}

export function handleWsClose(ws: ServerWebSocket<WsSocketData>) {
  const clientSocket = ws.data.clientSocket

  if (ws.data.pin) {
    const room = RoomManager.getRoomByPin(ws.data.pin)
    if (room) {
      if (ws.data.isHost) {
        if (clientSocket) room.removeHostSocket(clientSocket)
      } else if (ws.data.participantId) {
        room.removeParticipant(ws.data.participantId)
      }
    }
  }
}
