import { promises as fs } from 'node:fs'
import path from 'node:path'

export async function ensureDir(dir: string): Promise<void> {
  await fs.mkdir(dir, { recursive: true })
}

export async function writeFileSafe(filePath: string, content: string): Promise<void> {
  await ensureDir(path.dirname(filePath))
  await fs.writeFile(filePath, content, { encoding: 'utf8' })
}

export async function readFileText(filePath: string): Promise<string> {
  return fs.readFile(filePath, { encoding: 'utf8' })
}

export async function exists(p: string): Promise<boolean> {
  try {
    await fs.access(p)
    return true
  } catch {
    return false
  }
}
