#!/usr/bin/env node
import { Command } from 'commander'
import { runMigrateBackend } from './commands/migrateBackend.js'
import { runMigrateFrontend } from './commands/migrateFrontend.js'
import { runDiffTable } from './commands/diffTable.js'
import { runDemo } from './commands/demo.js'
import { log } from './utils/log.js'

const program = new Command()
program
  .name('refactor-agent')
  .description('Generate new ERP scaffolds from legacy yudao module sources')
  .version('0.1.0')

program
  .command('migrate:backend <controllerPath>')
  .description('Generate new ERP backend 8-piece scaffold from legacy Controller (and DO).')
  .option('--module <name>', 'logical module name', 'erp-base')
  .option('--route <path>', 'base route, e.g. /erp/company-entity', '/erp/example')
  .option('--perm-prefix <prefix>', 'permission prefix, e.g. erp:company-entity', 'erp:example')
  .option('--table-prefix <prefix>', 'table prefix, e.g. erp_', 'erp_')
  .option(
    '--base-package <pkg>',
    'java base package',
    'cn.iocoder.yudao.module.erp.base'
  )
  .option('--zh-name <name>', 'Chinese display name')
  .option('--do-file <path>', 'explicit path to old DO java file')
  .option('--out <dir>', 'output directory', './output/backend')
  .action(async (controllerPath: string, opts: any) => {
    try {
      await runMigrateBackend(controllerPath, {
        module: opts.module,
        routeBase: opts.route,
        permPrefix: opts.permPrefix,
        tablePrefix: opts.tablePrefix,
        basePackage: opts.basePackage,
        outDir: opts.out,
        zhName: opts.zhName,
        doFile: opts.doFile
      })
    } catch (e: any) {
      log.error(e?.stack ?? String(e))
      process.exit(1)
    }
  })

program
  .command('migrate:frontend <vuePath>')
  .description('Generate new erp-web Vue3 <script setup> page + api/erp/xxx.ts from legacy Vue page.')
  .option('--route <path>', 'base route, e.g. /erp/company-entity', '/erp/example')
  .option('--perm-prefix <prefix>', 'permission prefix', 'erp:example')
  .option('--api <path>', 'explicit path to old api/*.ts file')
  .option('--form <path>', 'path to legacy *Form.vue (auto: same-folder *Form.vue)')
  .option('--entity <name>', 'PascalCase entity name (auto-inferred if omitted)')
  .option('--zh-name <name>', 'Chinese display name')
  .option('--out <dir>', 'output directory', './output/frontend')
  .action(async (vuePath: string, opts: any) => {
    try {
      await runMigrateFrontend(vuePath, {
        routeBase: opts.route,
        permPrefix: opts.permPrefix,
        outDir: opts.out,
        apiFile: opts.api,
        formVue: opts.form,
        entityName: opts.entity,
        zhName: opts.zhName
      })
    } catch (e: any) {
      log.error(e?.stack ?? String(e))
      process.exit(1)
    }
  })

program
  .command('diff:table <oldDOPath> <newDOPath>')
  .description('Diff two DO files (old vs new) and emit SQL Server idempotent migration script.')
  .requiredOption('--new-table <name>', 'target SQL Server table name, e.g. erp_company_entity')
  .option('--out <file>', 'output sql file path', './output/diff.sql')
  .action(async (oldDO: string, newDO: string, opts: any) => {
    try {
      await runDiffTable(oldDO, newDO, { newTable: opts.newTable, out: opts.out })
    } catch (e: any) {
      log.error(e?.stack ?? String(e))
      process.exit(1)
    }
  })

program
  .command('demo')
  .description('Run end-to-end demo using company-entity from this repo.')
  .action(async () => {
    try {
      await runDemo()
    } catch (e: any) {
      log.error(e?.stack ?? String(e))
      process.exit(1)
    }
  })

program.parseAsync(process.argv)
