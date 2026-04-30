import path from 'node:path'
import { parseJavaController, parseJavaDO } from '../parsers/javaParser.js'
import {
  renderController,
  renderDO,
  renderErrorCodeSnippet,
  renderMapper,
  renderPageReqVO,
  renderRespVO,
  renderSaveReqVO,
  renderService,
  renderServiceImpl
} from '../generators/backend/templates.js'
import { writeFileSafe } from '../utils/fs.js'
import { log } from '../utils/log.js'
import type { BackendGenerateOptions } from '../types.js'
import { exists } from '../utils/fs.js'

export interface MigrateBackendOptions {
  module: string
  routeBase: string
  permPrefix: string
  tablePrefix: string
  basePackage: string
  outDir: string
  zhName?: string
  doFile?: string
}

export async function runMigrateBackend(controllerPath: string, opts: MigrateBackendOptions) {
  log.step(`migrate:backend ${controllerPath}`)
  const ctrl = await parseJavaController(controllerPath)
  log.info(`Controller: ${ctrl.className}, baseRoute=${ctrl.baseRoute}, endpoints=${ctrl.endpoints.length}`)

  // entityName: strip "Controller" suffix
  const entityName = ctrl.className.replace(/Controller$/, '')

  // try to locate DO automatically if not specified
  let doPath = opts.doFile
  if (!doPath) {
    const guess = guessDOPath(controllerPath, entityName)
    if (guess && (await exists(guess))) doPath = guess
  }
  if (!doPath || !(await exists(doPath))) {
    throw new Error(`Could not locate DO file. Please pass --do-file <path>. Guess: ${doPath}`)
  }
  log.info(`DO file: ${doPath}`)
  const doInfo = await parseJavaDO(doPath)
  log.info(`DO ${doInfo.className} fields: ${doInfo.fields.length}`)

  const tableName =
    doInfo.tableName ?? `${opts.tablePrefix}${camelToSnake(entityName)}`

  const renderOpts: BackendGenerateOptions = {
    module: opts.module,
    routeBase: opts.routeBase,
    permPrefix: opts.permPrefix,
    tablePrefix: opts.tablePrefix,
    basePackage: opts.basePackage,
    outDir: opts.outDir,
    entityName,
    tableName,
    fields: doInfo.fields,
    zhName: opts.zhName ?? entityName
  }

  const files: { rel: string; content: string }[] = [
    { rel: `controller/admin/${entityName}Controller.java`, content: renderController(renderOpts) },
    { rel: `controller/admin/vo/${entityName}SaveReqVO.java`, content: renderSaveReqVO(renderOpts) },
    { rel: `controller/admin/vo/${entityName}RespVO.java`, content: renderRespVO(renderOpts) },
    { rel: `controller/admin/vo/${entityName}PageReqVO.java`, content: renderPageReqVO(renderOpts) },
    { rel: `service/${entityName}Service.java`, content: renderService(renderOpts) },
    { rel: `service/${entityName}ServiceImpl.java`, content: renderServiceImpl(renderOpts) },
    { rel: `dal/dataobject/${entityName}DO.java`, content: renderDO(renderOpts) },
    { rel: `dal/mysql/${entityName}Mapper.java`, content: renderMapper(renderOpts) },
    { rel: `__snippets__/ErrorCode.snippet.txt`, content: renderErrorCodeSnippet(renderOpts) }
  ]

  for (const f of files) {
    const abs = path.join(opts.outDir, f.rel)
    await writeFileSafe(abs, f.content)
    log.ok(`wrote ${abs}`)
  }

  log.ok(`backend scaffold generated under ${opts.outDir}`)
}

function camelToSnake(s: string): string {
  return s.replace(/([a-z0-9])([A-Z])/g, '$1_$2').toLowerCase()
}

function guessDOPath(controllerPath: string, entityName: string): string | undefined {
  // Old project layout: .../controller/admin/<module>/XxxController.java -> .../dal/dataobject/<module>/XxxDO.java
  const norm = controllerPath.replace(/\\/g, '/')
  const m = norm.match(/^(.*?)\/controller\/admin\/([^/]+)\/[^/]+Controller\.java$/)
  if (m) {
    return path.join(m[1], 'dal', 'dataobject', m[2], `${entityName}DO.java`)
  }
  // New erp layout: .../controller/admin/XxxController.java -> .../dal/dataobject/XxxDO.java
  const m2 = norm.match(/^(.*?)\/controller\/admin\/[^/]+Controller\.java$/)
  if (m2) {
    return path.join(m2[1], 'dal', 'dataobject', `${entityName}DO.java`)
  }
  return undefined
}
