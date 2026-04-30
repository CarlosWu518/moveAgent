import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { runMigrateBackend } from './migrateBackend.js'
import { runMigrateFrontend } from './migrateFrontend.js'
import { runDiffTable } from './diffTable.js'
import { log } from '../utils/log.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
// AGENT/src/commands -> AGENT/.. = repo root
const repoRoot = path.resolve(__dirname, '../../..')

export async function runDemo() {
  log.step('Running full demo: company-entity (legacy junma -> new ERP)')
  const oldController = path.join(
    repoRoot,
    '2.0Old/junma-backend/yudao-module-data/yudao-module-data-biz/src/main/java/cn/iocoder/yudao/module/data/controller/admin/companyentity/CompanyEntityController.java'
  )
  const oldDO = path.join(
    repoRoot,
    '2.0Old/junma-backend/yudao-module-data/yudao-module-data-biz/src/main/java/cn/iocoder/yudao/module/data/dal/dataobject/companyentity/CompanyEntityDO.java'
  )
  const newDO = path.join(
    repoRoot,
    'erp-backend/yudao-module-erp-base/yudao-module-erp-base-biz/src/main/java/cn/iocoder/yudao/module/erp/base/dal/dataobject/CompanyEntityDO.java'
  )
  const oldVue = path.join(
    repoRoot,
    '2.0Old/junma-frontend/src/views/data/companyentity/index.vue'
  )
  const oldApi = path.join(
    repoRoot,
    '2.0Old/junma-frontend/src/api/data/companyentity/index.ts'
  )
  const outBase = path.resolve(__dirname, '../../demo-output')

  await runMigrateBackend(oldController, {
    module: 'erp-base',
    routeBase: '/erp/company-entity',
    permPrefix: 'erp:company-entity',
    tablePrefix: 'erp_',
    basePackage: 'cn.iocoder.yudao.module.erp.base',
    outDir: path.join(outBase, 'backend'),
    zhName: '公司主体',
    doFile: oldDO
  })

  await runMigrateFrontend(oldVue, {
    routeBase: '/erp/company-entity',
    permPrefix: 'erp:company-entity',
    outDir: path.join(outBase, 'frontend'),
    apiFile: oldApi,
    entityName: 'CompanyEntity',
    zhName: '公司主体'
  })

  await runDiffTable(oldDO, newDO, {
    newTable: 'erp_company_entity',
    out: path.join(outBase, 'sql/company-entity-diff.sql')
  })

  log.ok(`Demo finished. See: ${outBase}`)
}
