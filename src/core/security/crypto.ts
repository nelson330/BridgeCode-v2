import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { hash, verify } from '@node-rs/argon2'
import { getConfig } from '../config'
import { logger } from '../logger'

let appKeyCache: Buffer | null = null

export async function hashPassword(password: string): Promise<string> {
  return hash(password, {
    memoryCost: 65536, // 64 MiB
    timeCost: 3,
    parallelism: 1,
  })
}

export async function verifyPassword(password: string, hashStr: string): Promise<boolean> {
  try {
    return await verify(hashStr, password)
  } catch {
    return false
  }
}

export function generateRandomToken(bytes = 32): string {
  return randomBytes(bytes).toString('hex')
}

export function getOrCreateAppKey(): Buffer {
  if (appKeyCache) return appKeyCache

  const config = getConfig()
  const keysDir = join(config.DATA_DIR, '.keys')
  const keyFile = join(keysDir, 'app.key')

  if (existsSync(keyFile)) {
    appKeyCache = readFileSync(keyFile)
    return appKeyCache
  }

  if (!existsSync(keysDir)) {
    mkdirSync(keysDir, { recursive: true, mode: 0o700 })
  }

  const newKey = randomBytes(32)
  writeFileSync(keyFile, newKey, { mode: 0o600 })
  logger.warn('🔑 Generated new APP_KEY in data/.keys/app.key (permissions 600)')

  appKeyCache = newKey
  return appKeyCache
}

export function encryptApiKey(plainText: string): string {
  const key = getOrCreateAppKey()
  const iv = randomBytes(12) // 96-bit IV for GCM
  const cipher = createCipheriv('aes-256-gcm', key, iv)

  const config = getConfig()
  cipher.setAAD(Buffer.from(config.AI_KEYS_AES_AAD, 'utf8'))

  const encrypted = Buffer.concat([cipher.update(plainText, 'utf8'), cipher.final()])
  const tag = cipher.getAuthTag()

  // Format: iv:tag:encrypted (hex encoded)
  return `${iv.toString('hex')}:${tag.toString('hex')}:${encrypted.toString('hex')}`
}

export function decryptApiKey(encryptedPayload: string): string {
  const parts = encryptedPayload.split(':')
  if (parts.length !== 3) {
    throw new Error('Invalid encrypted payload format')
  }

  const ivHex = parts[0]
  const tagHex = parts[1]
  const dataHex = parts[2]

  if (!ivHex || !tagHex || !dataHex) {
    throw new Error('Missing component in encrypted payload')
  }

  const iv = Buffer.from(ivHex, 'hex')
  const tag = Buffer.from(tagHex, 'hex')
  const encrypted = Buffer.from(dataHex, 'hex')

  const key = getOrCreateAppKey()
  const decipher = createDecipheriv('aes-256-gcm', key, iv)

  const config = getConfig()
  decipher.setAAD(Buffer.from(config.AI_KEYS_AES_AAD, 'utf8'))
  decipher.setAuthTag(tag)

  const decrypted = Buffer.concat([decipher.update(encrypted), decipher.final()])
  return decrypted.toString('utf8')
}
