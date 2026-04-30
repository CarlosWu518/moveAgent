export interface JavaField {
  name: string
  type: string
  comment?: string
}

export interface JavaDOInfo {
  packageName: string
  className: string
  tableName?: string
  fields: JavaField[]
}

export interface JavaControllerEndpoint {
  httpMethod: 'GET' | 'POST' | 'PUT' | 'DELETE'
  path: string
  summary?: string
  permission?: string
  methodName: string
}

export interface JavaControllerInfo {
  packageName: string
  className: string
  baseRoute?: string
  tag?: string
  endpoints: JavaControllerEndpoint[]
}

export interface VuePageInfo {
  componentName?: string
  templateRaw: string
  scriptLang?: string
  scriptRaw: string
  styleRaw?: string
  columns: { label: string; prop: string; width?: string }[]
  queryFields: { label: string; prop: string }[]
  formFields: { label: string; prop: string; required: boolean }[]
}

export interface ApiTsEndpoint {
  funcName: string
  httpMethod: 'get' | 'post' | 'put' | 'delete' | 'download'
  url: string
}

export interface BackendGenerateOptions {
  module: string // erp-base
  routeBase: string // /erp/company-entity
  permPrefix: string // erp:company-entity
  tablePrefix: string // erp_
  basePackage: string // cn.iocoder.yudao.module.erp.base
  outDir: string
  entityName: string // PascalCase, e.g. CompanyEntity
  tableName: string // erp_company_entity
  fields: JavaField[]
  zhName: string // 公司主体
}

export interface FrontendGenerateOptions {
  routeBase: string
  permPrefix: string
  outDir: string
  entityName: string
  zhName: string
  columns: { label: string; prop: string; width?: string }[]
  queryFields: { label: string; prop: string }[]
  formFields: { label: string; prop: string; required: boolean }[]
}
