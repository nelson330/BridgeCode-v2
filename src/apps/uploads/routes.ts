import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { extname, join } from 'node:path'
import { Hono } from 'hono'
import { customAlphabet } from 'nanoid'
import { getConfig } from '../../core/config'
import { AppError } from '../../core/errors'
import { requireAuth } from '../../core/security/session'

const generateFileId = customAlphabet('abcdefghijklmnopqrstuvwxyz0123456789', 12)

export const uploadRoutes = new Hono()

const ALLOWED_MIME_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
  'image/svg+xml',
  'application/pdf',
])

// 1. Upload File (Protected - Teachers, Webmasters, Students)
uploadRoutes.post('/uploads', requireAuth(), async (c) => {
  const config = getConfig()
  const uploadDir = join(config.DATA_DIR, 'uploads')
  if (!existsSync(uploadDir)) {
    mkdirSync(uploadDir, { recursive: true, mode: 0o755 })
  }

  const body = await c.req.parseBody()
  const file = body.file

  if (!file || typeof file === 'string') {
    throw AppError.badRequest('No se proporcionó ningún archivo válido')
  }

  const mimeType = file.type || 'application/octet-stream'
  if (!ALLOWED_MIME_TYPES.has(mimeType)) {
    throw AppError.badRequest(`Tipo de archivo no permitido: ${mimeType}. Solo se permiten imágenes y PDFs.`)
  }

  // Max 25 MB
  const maxBytes = 25 * 1024 * 1024
  const arrayBuffer = await file.arrayBuffer()
  const buffer = Buffer.from(arrayBuffer)

  if (buffer.length > maxBytes) {
    throw AppError.badRequest('El archivo excede el límite máximo de 25 MB')
  }

  const rawExt = extname(file.name || '').toLowerCase()
  const safeExt = rawExt && rawExt.length <= 5 ? rawExt : mimeType === 'application/pdf' ? '.pdf' : '.png'
  const filename = `${Date.now()}_${generateFileId()}${safeExt}`
  const filePath = join(uploadDir, filename)

  writeFileSync(filePath, buffer)

  const fileUrl = `/api/uploads/${filename}`

  return c.json(
    {
      url: fileUrl,
      filename,
      originalName: file.name || 'archivo',
      mimeType,
      size: buffer.length,
    },
    201
  )
})

// 2. Serve Uploaded File (Public / Authenticated with safe headers)
uploadRoutes.get('/uploads/:filename', async (c) => {
  const filename = c.req.param('filename')
  // Path traversal prevention
  const safeFilename = filename.replace(/[^a-zA-Z0-9_.-]/g, '')
  if (!safeFilename || safeFilename.includes('..')) {
    throw AppError.badRequest('Nombre de archivo inválido')
  }

  const config = getConfig()
  const filePath = join(config.DATA_DIR, 'uploads', safeFilename)

  if (!existsSync(filePath)) {
    throw AppError.notFound('Archivo no encontrado')
  }

  const fileBuffer = readFileSync(filePath)
  const ext = extname(safeFilename).toLowerCase()

  let contentType = 'application/octet-stream'
  if (ext === '.pdf') contentType = 'application/pdf'
  else if (ext === '.jpg' || ext === '.jpeg') contentType = 'image/jpeg'
  else if (ext === '.png') contentType = 'image/png'
  else if (ext === '.webp') contentType = 'image/webp'
  else if (ext === '.gif') contentType = 'image/gif'
  else if (ext === '.svg') contentType = 'image/svg+xml'

  return new Response(fileBuffer, {
    status: 200,
    headers: {
      'Content-Type': contentType,
      'Content-Disposition': `inline; filename="${safeFilename}"`,
      'Cache-Control': 'public, max-age=31536000, immutable',
    },
  })
})
