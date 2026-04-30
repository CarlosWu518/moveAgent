import { readFileText } from '../utils/fs.js'
import type { ApiTsEndpoint } from '../types.js'

export async function parseApiTs(filePath: string): Promise<ApiTsEndpoint[]> {
  const text = await readFileText(filePath)
  return extractRequestEndpoints(text)
}

/**
 * Find all axios-style `request.get/post({ url: ..., ... })` calls; supports multi-line blocks and template literals.
 */
export function extractRequestEndpoints(text: string): ApiTsEndpoint[] {
  const out: ApiTsEndpoint[] = []

  let pos = 0
  while (pos < text.length) {
    const idx = text.indexOf('request.', pos)
    if (idx === -1) break

    const afterDot = idx + 'request.'.length
    const m = text.slice(afterDot).match(/^(get|post|put|delete|download)\s*\(/)
    if (!m) {
      pos = idx + 1
      continue
    }
    const httpMethod = m[1] as ApiTsEndpoint['httpMethod']

    let paren = afterDot + m[0].length - 1 // position of '('
    const braceAt = skipWsTo(text, paren + 1, '{')
    if (braceAt === null) {
      pos = idx + 10
      continue
    }

    const block = sliceBalancedCurly(text, braceAt)
    if (!block) {
      pos = braceAt + 1
      continue
    }

    const urlRaw = extractUrlProperty(block.inner)
    const url = normalizeUrlForDisplay(urlRaw)
    const alias = inferObjectMethodAlias(text, idx)

    if (url) {
      out.push({ funcName: alias ?? 'unknown', httpMethod, url })
    }

    pos = block.end
  }

  return dedupeByFuncAndUrl(out)
}

function inferObjectMethodAlias(text: string, requestIdx: number): string | undefined {
  const prior = text.slice(Math.max(0, requestIdx - 1500), requestIdx)
  const re = /\b(\w+)\s*:\s*(?:async\s*)?\([^)]*\)\s*=>\s*\{/g
  let last: RegExpExecArray | undefined
  let m: RegExpExecArray | null
  while ((m = re.exec(prior))) last = m
  return last?.[1]
}

function skipWsTo(text: string, from: number, ch: string): number | null {
  let i = from
  while (i < text.length && /\s/.test(text[i]!)) i++
  return text[i] === ch ? i : null
}

function sliceBalancedCurly(text: string, braceStart: number): { inner: string; end: number } | null {
  if (text[braceStart] !== '{') return null
  let depth = 0
  for (let i = braceStart; i < text.length; i++) {
    const c = text[i]!
    if (c === "'" || c === '"') {
      i = skipString(text, i, c)
      continue
    }
    if (c === '`') {
      i = skipTemplateLiteral(text, i)
      continue
    }
    if (c === '{') depth++
    else if (c === '}') {
      depth--
      if (depth === 0) {
        const inner = text.slice(braceStart + 1, i)
        return { inner, end: i + 1 }
      }
    }
  }
  return null
}

function skipString(text: string, start: number, quote: string): number {
  let i = start + 1
  while (i < text.length) {
    const ch = text[i]!
    if (ch === '\\') {
      i += 2
      continue
    }
    if (ch === quote) return i
    i++
  }
  return start
}

function skipTemplateLiteral(text: string, start: number): number {
  let i = start + 1
  while (i < text.length) {
    const ch = text[i]!
    if (ch === '\\') {
      i += 2
      continue
    }
    if (ch === '`') return i
    if (ch === '$' && text[i + 1] === '{') {
      const brace = text.indexOf('}', i)
      i = brace === -1 ? text.length : brace + 1
      continue
    }
    i++
  }
  return start
}

/**
 * Prefer first `url:` value (string/template/concat pattern).
 */
function extractUrlProperty(objBody: string): string | undefined {
  const trimmed = objBody.replace(/^\s*\/\/.*$/gm, '')
  const fm = trimmed.match(/\burl\s*:\s*/)
  if (!fm || fm.index === undefined) return undefined
  let i = fm.index + fm[0].length
  while (i < trimmed.length && /\s/.test(trimmed[i]!)) i++

  if (trimmed[i] === '`') {
    return extractBacktick(trimmed, i)
  }
  if (trimmed[i] === "'" || trimmed[i] === '"') return extractQuoted(trimmed, i, trimmed[i]!)
  const rest = trimmed.slice(i).match(/^([^,}\n]{1,200})/)?.[1]
  return rest?.trim()?.replace(/^["'`]|["'`]$/g, '')
}

function extractQuoted(body: string, start: number, q: string): string {
  let i = start + 1
  let buf = ''
  while (i < body.length) {
    const ch = body[i]!
    if (ch === '\\') {
      buf += body[i + 1] ?? ''
      i += 2
      continue
    }
    if (ch === q) break
    buf += ch
    i++
  }
  return buf
}

function extractBacktick(body: string, start: number): string {
  let i = start + 1
  let buf = ''
  while (i < body.length) {
    const ch = body[i]!
    if (ch === '\\') {
      buf += body[i + 1] ?? ''
      i += 2
      continue
    }
    if (ch === '`') break
    if (ch === '$' && body[i + 1] === '{') {
      buf += '${...}'
      const end = body.indexOf('}', i + 2)
      i = end === -1 ? body.length : end + 1
      continue
    }
    buf += ch
    i++
  }
  return buf
}

/** Collapse concatenation placeholders for readability. */
function normalizeUrlForDisplay(u: string | undefined): string | undefined {
  if (!u) return undefined
  return u.trim()
}

function dedupeByFuncAndUrl(list: ApiTsEndpoint[]): ApiTsEndpoint[] {
  const seen = new Set<string>()
  const out: ApiTsEndpoint[] = []
  for (const e of list) {
    const k = `${e.funcName}::${e.httpMethod}::${e.url}`
    if (seen.has(k)) continue
    seen.add(k)
    out.push(e)
  }
  return out
}
