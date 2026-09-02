import React from 'react'

interface MarkdownTextProps {
  content: string | null | undefined
  className?: string
}

/**
 * Parses inline markdown tokens: **bold**, *italic*, `code`, ~~strikethrough~~
 */
function parseInlineMarkdown(text: string): React.ReactNode[] {
  // Regex splitting by inline markdown tokens: links [text](url), bold, code, italic, strikethrough
  const tokenRegex = /(\[[^\]]+\]\([^)]+\)|\*\*.*?\*\*|__.*?__|`.*?`|\*.*?\*|_.*?_|~~.*?~~)/g
  const parts = text.split(tokenRegex)

  return parts.map((part, idx) => {
    if (!part) return null

    // Markdown Link: [text](url)
    const linkMatch = part.match(/^\[([^\]]+)\]\(([^)]+)\)$/)
    if (linkMatch?.[1] && linkMatch[2]) {
      return (
        <a
          key={idx}
          href={linkMatch[2]}
          target="_blank"
          rel="noopener noreferrer"
          className="text-indigo-400 hover:text-indigo-300 underline font-medium inline-flex items-center gap-0.5"
        >
          {linkMatch[1]}
        </a>
      )
    }

    // Bold: **text** or __text__
    if ((part.startsWith('**') && part.endsWith('**')) || (part.startsWith('__') && part.endsWith('__'))) {
      const inner = part.slice(2, -2)
      return (
        <strong key={idx} className="font-bold text-white tracking-wide">
          {parseInlineMarkdown(inner)}
        </strong>
      )
    }

    // Inline Code: `code`
    if (part.startsWith('`') && part.endsWith('`')) {
      const code = part.slice(1, -1)
      return (
        <code
          key={idx}
          className="px-1.5 py-0.5 mx-0.5 rounded-md bg-indigo-950/80 border border-indigo-500/40 text-indigo-200 font-mono text-[0.9em] font-semibold"
        >
          {code}
        </code>
      )
    }

    // Italic: *text* or _text_
    if ((part.startsWith('*') && part.endsWith('*')) || (part.startsWith('_') && part.endsWith('_'))) {
      const inner = part.slice(1, -1)
      return (
        <em key={idx} className="italic text-indigo-100">
          {parseInlineMarkdown(inner)}
        </em>
      )
    }

    // Strikethrough: ~~text~~
    if (part.startsWith('~~') && part.endsWith('~~')) {
      const inner = part.slice(2, -2)
      return (
        <del key={idx} className="line-through text-slate-400">
          {parseInlineMarkdown(inner)}
        </del>
      )
    }

    return <React.Fragment key={idx}>{part}</React.Fragment>
  })
}

/**
 * MarkdownText Component: renders block & inline Markdown cleanly
 */
export function MarkdownText({ content, className = '' }: MarkdownTextProps) {
  if (!content) return null

  const rawLines = content.split('\n')
  const blocks: React.ReactNode[] = []
  let inCodeBlock = false
  let codeBlockBuffer: string[] = []

  rawLines.forEach((line, lineIdx) => {
    // Fenced code block toggle: ```
    if (line.trim().startsWith('```')) {
      if (inCodeBlock) {
        // Close code block
        blocks.push(
          <pre
            key={`code-${lineIdx}`}
            className="my-2 p-3 rounded-xl bg-slate-950 border border-slate-800 text-indigo-300 font-mono text-xs overflow-x-auto text-left"
          >
            <code>{codeBlockBuffer.join('\n')}</code>
          </pre>
        )
        codeBlockBuffer = []
        inCodeBlock = false
      } else {
        inCodeBlock = true
      }
      return
    }

    if (inCodeBlock) {
      codeBlockBuffer.push(line)
      return
    }

    const trimmed = line.trim()

    // Empty line
    if (!trimmed) {
      blocks.push(<div key={`empty-${lineIdx}`} className="h-1.5" />)
      return
    }

    // Heading 1: #
    if (trimmed.startsWith('# ')) {
      blocks.push(
        <h3 key={`h1-${lineIdx}`} className="text-xl sm:text-2xl font-black text-white my-1">
          {parseInlineMarkdown(trimmed.slice(2))}
        </h3>
      )
      return
    }

    // Heading 2: ##
    if (trimmed.startsWith('## ')) {
      blocks.push(
        <h4 key={`h2-${lineIdx}`} className="text-lg sm:text-xl font-extrabold text-white my-1">
          {parseInlineMarkdown(trimmed.slice(3))}
        </h4>
      )
      return
    }

    // Heading 3: ###
    if (trimmed.startsWith('### ')) {
      blocks.push(
        <h5 key={`h3-${lineIdx}`} className="text-base sm:text-lg font-bold text-white my-0.5">
          {parseInlineMarkdown(trimmed.slice(4))}
        </h5>
      )
      return
    }

    // Blockquote: >
    if (trimmed.startsWith('> ')) {
      blocks.push(
        <blockquote
          key={`quote-${lineIdx}`}
          className="my-1.5 pl-3 border-l-2 border-indigo-400 text-slate-300 italic text-sm"
        >
          {parseInlineMarkdown(trimmed.slice(2))}
        </blockquote>
      )
      return
    }

    // Bullet List item: - or *
    if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
      blocks.push(
        <div key={`li-${lineIdx}`} className="flex items-start gap-2 my-0.5 text-left">
          <span className="text-indigo-400 font-black">•</span>
          <span className="flex-1">{parseInlineMarkdown(trimmed.slice(2))}</span>
        </div>
      )
      return
    }

    // Numbered List item: 1. 2. etc
    const numMatch = trimmed.match(/^(\d+)\.\s+(.*)/)
    if (numMatch) {
      blocks.push(
        <div key={`nli-${lineIdx}`} className="flex items-start gap-2 my-0.5 text-left">
          <span className="text-indigo-400 font-bold text-xs">{numMatch[1]}.</span>
          <span className="flex-1">{parseInlineMarkdown(numMatch[2] || '')}</span>
        </div>
      )
      return
    }

    // Normal Paragraph line
    blocks.push(
      <p key={`p-${lineIdx}`} className="leading-relaxed break-words">
        {parseInlineMarkdown(line)}
      </p>
    )
  })

  // Flush remaining unclosed code block if any
  if (inCodeBlock && codeBlockBuffer.length > 0) {
    blocks.push(
      <pre
        key="code-end"
        className="my-2 p-3 rounded-xl bg-slate-950 border border-slate-800 text-indigo-300 font-mono text-xs overflow-x-auto text-left"
      >
        <code>{codeBlockBuffer.join('\n')}</code>
      </pre>
    )
  }

  return <div className={`space-y-1 break-words whitespace-pre-wrap ${className}`}>{blocks}</div>
}
