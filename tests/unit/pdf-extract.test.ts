import { afterAll, beforeAll, describe, expect, it } from 'bun:test'
import { copyFileSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { extractPdfText } from '../../src/apps/agents/pdf-extract'
import { loadConfig } from '../../src/core/config'

// Use a real PDF shipped by pdf-parse's own test fixtures (CC0/MIT).
// This avoids us shipping a binary in the repo.
const SAMPLE_PDF = join(
  import.meta.dir,
  '..',
  '..',
  'node_modules',
  'pdf-parse',
  'test',
  'data',
  '01-valid.pdf'
)

describe('extractPdfText', () => {
  let tmpDir: string

  beforeAll(() => {
    tmpDir = mkdtempSync(join(tmpdir(), 'aulaplay-pdf-'))
    mkdirSync(join(tmpDir, 'uploads'), { recursive: true })
    loadConfig({ DATA_DIR: tmpDir })
  })

  afterAll(() => {
    rmSync(tmpDir, { recursive: true, force: true })
  })

  it('rejects an empty URL', async () => {
    await expect(extractPdfText('')).rejects.toThrow(/URL de archivo vacía/)
  })

  it('rejects a non-PDF URL', async () => {
    await expect(extractPdfText('/api/uploads/photo.png')).rejects.toThrow(/no apunta a un PDF/)
  })

  it('throws a clear error when the file does not exist on disk', async () => {
    await expect(extractPdfText('/api/uploads/missing.pdf')).rejects.toThrow(
      /Archivo PDF no encontrado en disco/
    )
  })

  it('throws when the file is not a real PDF (garbage bytes)', async () => {
    const filename = 'garbage.pdf'
    writeFileSync(join(tmpDir, 'uploads', filename), Buffer.from('not a pdf'))
    await expect(extractPdfText(`/api/uploads/${filename}`)).rejects.toThrow(/No se pudo parsear el PDF/)
  })

  it('extracts text from a valid PDF', async () => {
    const filename = 'sample.pdf'
    copyFileSync(SAMPLE_PDF, join(tmpDir, 'uploads', filename))

    const r = await extractPdfText(`/api/uploads/${filename}`)

    expect(r.source).toBe('pdf-parse')
    expect(r.pages).toBeGreaterThan(0)
    expect(r.text.length).toBeGreaterThan(50)
    // Real text content from the fixture file
    expect(r.text).toMatch(/PDF|specification|Adobe|version/i)
  })

  it('returns source: "empty" or throws when the PDF cannot yield selectable text', async () => {
    // Truncate the real PDF to its header — pdf-parse will either fail to
    // parse it (throws) or return very little text. Either outcome is a
    // valid signal that the pipeline aborts without fabricating questions.
    const filename = 'empty-text.pdf'
    const { readFileSync } = await import('node:fs')
    const original = readFileSync(SAMPLE_PDF)
    const truncated = Buffer.concat([original.subarray(0, Math.min(original.length, 256))])
    writeFileSync(join(tmpDir, 'uploads', filename), truncated)

    let outcome: 'empty' | 'pdf-parse' | 'throw' = 'throw'
    try {
      const r = await extractPdfText(`/api/uploads/${filename}`)
      outcome = r.source
    } catch {
      outcome = 'throw'
    }
    expect(['empty', 'throw']).toContain(outcome)
    // Sanity: file should not produce a successful 'pdf-parse' with real text
    expect(outcome).not.toBe('pdf-parse')
  })
})
