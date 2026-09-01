import { existsSync, readFileSync } from 'node:fs'
import { basename, join } from 'node:path'
// Import the implementation module directly to avoid pdf-parse's top-level
// debug self-test which runs when the package is the entry point and breaks
// under bun:test (it tries to read ./test/data/05-versions-space.pdf).
import pdfParse from 'pdf-parse/lib/pdf-parse.js'
import { getConfig } from '../../core/config'
import { logger } from '../../core/logger'

export interface PdfExtractionResult {
  text: string
  pages: number
  source: 'pdf-parse' | 'empty'
}

const MAX_CHARS = 50000
const MIN_TEXT_THRESHOLD = 50

/**
 * Extract plain text from a PDF uploaded via /api/uploads. The lesson stores
 * `materialFile` as a URL like `/api/uploads/12345_abc.pdf`. We resolve it
 * relative to DATA_DIR/uploads, then run pdf-parse.
 *
 * Returns:
 * - `{ text, pages, source: 'pdf-parse' }` when the PDF has selectable text.
 * - `{ text: '', pages, source: 'empty' }` when the PDF is a scanned image,
 *   has no extractable text, or returned text below MIN_TEXT_THRESHOLD.
 *
 * Throws a descriptive Error when the file is missing, unreadable, encrypted
 * or otherwise unreadable by pdf-parse.
 */
export async function extractPdfText(fileUrl: string): Promise<PdfExtractionResult> {
  if (!fileUrl) {
    throw new Error('URL de archivo vacía')
  }

  // Extract the basename from the URL, guarding against traversal.
  const filename = basename(fileUrl.split('?')[0] || '')
  if (!filename || !filename.toLowerCase().endsWith('.pdf')) {
    throw new Error(`URL inválida o no apunta a un PDF: ${fileUrl}`)
  }

  const config = getConfig()
  const filePath = join(config.DATA_DIR, 'uploads', filename)

  if (!existsSync(filePath)) {
    throw new Error(`Archivo PDF no encontrado en disco: ${filename}`)
  }

  const buffer = readFileSync(filePath)
  if (buffer.length === 0) {
    throw new Error('El archivo PDF está vacío')
  }

  let rawText = ''
  let pages = 0
  try {
    const parsed = await pdfParse(buffer)
    rawText = (parsed.text || '').trim()
    pages = parsed.numpages || 0
  } catch (err: any) {
    // pdf-parse throws on encrypted/unsupported PDFs.
    throw new Error(`No se pudo parsear el PDF: ${err?.message || 'archivo corrupto o protegido'}`)
  }

  if (rawText.length < MIN_TEXT_THRESHOLD) {
    logger.warn(
      { filename, pages, length: rawText.length },
      'PDF yielded no extractable text (likely scanned image)'
    )
    return { text: '', pages, source: 'empty' }
  }

  let text = rawText
  if (text.length > MAX_CHARS) {
    logger.warn(
      { filename, pages, original: text.length, truncated: MAX_CHARS },
      'PDF text exceeded MAX_CHARS; truncating for AI prompt'
    )
    text = text.slice(0, MAX_CHARS)
  }

  return { text, pages, source: 'pdf-parse' }
}
