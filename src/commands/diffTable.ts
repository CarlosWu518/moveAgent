import { parseJavaDO } from '../parsers/javaParser.js'
import { generateSqlServerDiff } from '../generators/sql/sqlserverDiff.js'
import { writeFileSafe } from '../utils/fs.js'
import { log } from '../utils/log.js'

export interface DiffTableOptions {
  newTable: string
  out: string
}

export async function runDiffTable(oldDO: string, newDO: string, opts: DiffTableOptions) {
  log.step(`diff:table ${oldDO} <-> ${newDO}`)
  const oldInfo = await parseJavaDO(oldDO)
  const newInfo = await parseJavaDO(newDO)
  log.info(`old: ${oldInfo.className} fields=${oldInfo.fields.length}`)
  log.info(`new: ${newInfo.className} fields=${newInfo.fields.length}`)

  const sql = generateSqlServerDiff({
    newTable: opts.newTable,
    oldFields: oldInfo.fields,
    newFields: newInfo.fields
  })

  await writeFileSafe(opts.out, sql)
  log.ok(`SQL diff written to ${opts.out}`)
}
