import path from 'node:path'
import { readdir } from 'node:fs/promises'
import { parseVuePage } from '../parsers/vueParser.js'
import { parseApiTs } from '../parsers/apiTsParser.js'
import {
  renderApiTs,
  renderFormVue,
  renderIndexVue,
  entityKebab
} from '../generators/frontend/templates.js'
import { writeFileSafe, exists } from '../utils/fs.js'
import { log } from '../utils/log.js'
import { toCamelCase, toPascalCase } from '../utils/naming.js'
import type { FrontendGenerateOptions } from '../types.js'

export interface MigrateFrontendOptions {
  routeBase: string
  permPrefix: string
  outDir: string
  apiFile?: string
  entityName?: string
  zhName?: string
  /** Explicit path to legacy *Form.vue; if omitted, tries same-dir ${PascalEntity}Form.vue */
  formVue?: string
}

export async function runMigrateFrontend(vuePath: string, opts: MigrateFrontendOptions) {
  log.step(`migrate:frontend ${vuePath}`)

  const inferredEntity = opts.entityName ?? inferEntityFromPath(vuePath)
  const entityName = toPascalCase(inferredEntity)

  let formPath = opts.formVue
  if (!formPath) {
    const guess = path.join(path.dirname(vuePath), `${entityName}Form.vue`)
    if (await exists(guess)) {
      formPath = guess
      log.info(`auto-detected form: ${formPath}`)
    } else {
      const anyForm = await findAnyFormVue(path.dirname(vuePath))
      if (anyForm) {
        formPath = anyForm
        log.info(`auto-detected form (glob): ${formPath}`)
      }
    }
  } else {
    log.info(`form Vue: ${formPath}`)
  }

  const page = await parseVuePage(vuePath, formPath)
  log.info(
    `columns=${page.columns.length}, queryFields=${page.queryFields.length}, formFields=${page.formFields.length}`
  )
  log.info(`entityName=${entityName}`)

  if (opts.apiFile) {
    const apis = await parseApiTs(opts.apiFile)
    log.info(`old api endpoints: ${apis.map(a => a.funcName + ':' + a.url).join(', ') || '(none)'}`)
  }

  // 列表查询条件常与编辑表单共用 prop（如 entityCode）；不得从表单字段中剔除。
  const formFields = page.formFields

  const genOpts: FrontendGenerateOptions = {
    routeBase: opts.routeBase,
    permPrefix: opts.permPrefix,
    outDir: opts.outDir,
    entityName,
    zhName: opts.zhName ?? entityName,
    columns: page.columns,
    queryFields: page.queryFields,
    formFields
  }

  const kebab = entityKebab(entityName)
  const camel = toCamelCase(entityName)

  const files: { rel: string; content: string }[] = [
    { rel: `views/erp/${kebab}/index.vue`, content: renderIndexVue(genOpts) },
    { rel: `views/erp/${kebab}/${entityName}Form.vue`, content: renderFormVue(genOpts) },
    { rel: `api/erp/${camel}.ts`, content: renderApiTs(genOpts) }
  ]

  for (const f of files) {
    const abs = path.join(opts.outDir, f.rel)
    await writeFileSafe(abs, f.content)
    log.ok(`wrote ${abs}`)
  }

  log.ok(`frontend scaffold generated under ${opts.outDir}`)
}

function inferEntityFromPath(p: string): string {
  const norm = p.replace(/\\/g, '/')
  const m = norm.match(/\/views\/[^/]+\/([^/]+)\/index\.vue$/)
  if (m) return m[1]
  return path.basename(path.dirname(p))
}

async function findAnyFormVue(dir: string): Promise<string | undefined> {
  try {
    const files = await readdir(dir)
    const hit = files.find(
      f => /form\.vue$/i.test(f) && !/^index\.vue$/i.test(f)
    )
    return hit ? path.join(dir, hit) : undefined
  } catch {
    return undefined
  }
}
