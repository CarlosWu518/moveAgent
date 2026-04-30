import { readFileText } from '../utils/fs.js'
import type { JavaControllerEndpoint, JavaControllerInfo, JavaDOInfo, JavaField } from '../types.js'

const PRIMITIVE_LINE =
  /^\s*(?:@\w+(?:\([^)]*\))?\s*)*\s*(?:private|protected|public)\s+([\w<>,?\s.]+?)\s+(\w+)\s*;/

export async function parseJavaDO(filePath: string): Promise<JavaDOInfo> {
  const text = await readFileText(filePath)
  const packageMatch = text.match(/^\s*package\s+([\w.]+)\s*;/m)
  const classMatch = text.match(/class\s+(\w+)\s+extends\s+\w+/)
  const tableMatch = text.match(/@TableName\s*\(\s*"([^"]+)"\s*\)/)

  const fields: JavaField[] = []
  const lines = text.split(/\r?\n/)
  let pendingComment: string | undefined
  for (const line of lines) {
    const javadocMatch = line.match(/\*\s+(.+?)\s*$/)
    if (line.trim().startsWith('*') && javadocMatch && !line.includes('*/')) {
      const c = javadocMatch[1].trim()
      if (c && !c.startsWith('@')) pendingComment = c
      continue
    }
    if (line.trim().startsWith('//')) {
      pendingComment = line.trim().replace(/^\/\/\s*/, '')
      continue
    }
    const m = line.match(PRIMITIVE_LINE)
    if (m) {
      const type = m[1].trim()
      const name = m[2]
      if (name === 'serialVersionUID') continue
      fields.push({ type, name, comment: pendingComment })
      pendingComment = undefined
    } else if (line.trim() && !line.trim().startsWith('*') && !line.trim().startsWith('//')) {
      pendingComment = undefined
    }
  }

  return {
    packageName: packageMatch?.[1] ?? '',
    className: classMatch?.[1] ?? '',
    tableName: tableMatch?.[1],
    fields
  }
}

const HTTP_ANNOS = ['GetMapping', 'PostMapping', 'PutMapping', 'DeleteMapping'] as const
type HttpAnno = (typeof HTTP_ANNOS)[number]
const HTTP_TO_METHOD: Record<HttpAnno, 'GET' | 'POST' | 'PUT' | 'DELETE'> = {
  GetMapping: 'GET',
  PostMapping: 'POST',
  PutMapping: 'PUT',
  DeleteMapping: 'DELETE'
}

/**
 * Robust controller scanner: picks @GetMapping/@PostMapping/... blocks and resolves multi-line signatures
 * like `public void foo(\n HttpServletResponse r)`.
 */
export async function parseJavaController(filePath: string): Promise<JavaControllerInfo> {
  const text = await readFileText(filePath)
  const packageMatch = text.match(/^\s*package\s+([\w.]+)\s*;/m)
  const classMatch = text.match(/class\s+(\w+)\b/)
  const baseRouteMatch = text.match(/@RequestMapping\s*\(\s*"([^"]+)"\s*\)/)
  const tagMatch = text.match(/@Tag\s*\(\s*name\s*=\s*"([^"]+)"/)

  const lines = text.split(/\r?\n/)
  const endpoints: JavaControllerEndpoint[] = []

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    const http = matchHttpMappingLine(line)
    if (!http) continue

    const blockStart = i
    const blockEnd = findMappingBlockEnd(lines, blockStart)
    const block = lines.slice(blockStart, blockEnd + 1).join('\n')

    const summary = pickFirstMatch(block, /@Operation\s*\(\s*summary\s*=\s*"([^"]+)"/)
    const permission = pickFirstMatch(
      block,
      /@PreAuthorize\s*\(\s*"@ss\.hasPermission\(\s*'([^']+)'\s*\)"\s*\)/
    )

    const sigStart = blockEnd + 1
    const sig = collectMethodSignature(lines, sigStart)
    if (!sig) continue

    const methodName = extractMethodNameFromSignature(sig.signature)
    if (!methodName || methodName === 'if' || methodName === 'class') continue

    endpoints.push({
      httpMethod: HTTP_TO_METHOD[http.anno],
      path: http.path ?? '',
      methodName,
      summary: summary ?? undefined,
      permission: permission ?? undefined
    })

    i = sig.endLine
  }

  return {
    packageName: packageMatch?.[1] ?? '',
    className: classMatch?.[1] ?? '',
    baseRoute: baseRouteMatch?.[1],
    tag: tagMatch?.[1],
    endpoints
  }
}

function matchHttpMappingLine(
  line: string
): { anno: HttpAnno; path?: string } | null {
  const trimmed = line.trim()
  for (const anno of HTTP_ANNOS) {
    const re = new RegExp(`^@${anno}\\s*(?:\\(\\s*(?:"([^"]*)")?\\s*\\))?`)
    const m = trimmed.match(re)
    if (m) {
      return { anno, path: m[1] }
    }
  }
  return null
}

/**
 * Last line index belonging to annotations / comments before method signature.
 */
function findMappingBlockEnd(lines: string[], start: number): number {
  let end = start
  for (let k = start + 1; k < lines.length; k++) {
    const raw = lines[k]
    const t = raw.trim()
    if (t === '') continue
    if (t.startsWith('@') && !t.startsWith('@Override')) {
      end = k
      continue
    }
    if (t.startsWith('//') || t.startsWith('*')) {
      end = k
      continue
    }
    if (/\b(public|protected|private)\b/.test(raw)) break
    end = k
  }
  return end
}

function pickFirstMatch(text: string, re: RegExp): string | null {
  const m = text.match(re)
  return m?.[1] ?? null
}

/**
 * From first line containing `public|protected|private`, collect until `) {` or `) throws ... {`.
 */
function collectMethodSignature(
  lines: string[],
  startLine: number
): { signature: string; endLine: number } | null {
  let j = startLine
  while (j < lines.length && !/\b(public|protected|private)\b/.test(lines[j])) j++
  if (j >= lines.length) return null

  const buf: string[] = []
  let k = j
  for (; k < lines.length && k < j + 40; k++) {
    buf.push(lines[k])
    const joined = buf.join('\n')
    if (/\)\s*(?:throws\b[^({]*)?\s*\{/.test(joined)) {
      return { signature: joined, endLine: k }
    }
  }
  return null
}

/**
 * Method name is the last Java identifier before the first `(` of the parameter list
 * (handles `public CommonResult<X> foo(` and `public void foo(`).
 */
function extractMethodNameFromSignature(signatureBlock: string): string | null {
  const oneLine = signatureBlock.replace(/\s+/g, ' ').trim()
  const paren = oneLine.indexOf('(')
  if (paren < 0) return null
  const before = oneLine.slice(0, paren).trim()
  const m = before.match(/(\w+)\s*$/)
  return m?.[1] ?? null
}
