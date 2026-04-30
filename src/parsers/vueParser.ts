import { parse as parseSfc } from '@vue/compiler-sfc'
import { readFileText } from '../utils/fs.js'
import type { VuePageInfo } from '../types.js'

export async function parseVuePage(filePath: string, formFilePath?: string): Promise<VuePageInfo> {
  const raw = await readFileText(filePath)
  const { descriptor } = parseSfc(raw)
  const templateRaw = descriptor.template?.content ?? ''
  const scriptRaw = descriptor.scriptSetup?.content ?? descriptor.script?.content ?? ''
  const styleRaw = descriptor.styles?.[0]?.content
  const scriptLang = descriptor.scriptSetup?.lang ?? descriptor.script?.lang

  const componentNameMatch =
    scriptRaw.match(/name\s*:\s*['"]([\w-]+)['"]/) ||
    scriptRaw.match(/defineOptions\s*\(\s*\{\s*name\s*:\s*['"]([\w-]+)['"]/)

  const columns = extractTableColumns(templateRaw)
  const queryFields = extractQueryFields(templateRaw)
  let formFields = extractFormFieldsForModel(templateRaw, 'formData')

  if (formFilePath) {
    try {
      const formRaw = await readFileText(formFilePath)
      const formSfc = parseSfc(formRaw)
      const formTpl = formSfc.descriptor.template?.content ?? ''
      const formScriptRaw =
        formSfc.descriptor.scriptSetup?.content ?? formSfc.descriptor.script?.content ?? ''
      let merged = extractFormFieldsForModel(formTpl, 'formData')
      if (merged.length > 0) {
        const requiredProps = extractRequiredPropsFromRulesScript(formScriptRaw)
        formFields = merged.map(f => ({
          ...f,
          required: requiredProps.has(f.prop)
        }))
      }
    } catch {
      // ignore missing/unreadable sibling form file
    }
  }

  // Dedupe query props appearing in unrelated forms
  if (formFields.length === 0) {
    formFields = extractFormFieldsGeneric(templateRaw)
  }

  const requiredFromIndexRules = extractRequiredPropsFromRulesScript(scriptRaw)
  formFields = formFields.map(f => ({
    ...f,
    required: f.required || requiredFromIndexRules.has(f.prop)
  }))

  return {
    componentName: componentNameMatch?.[1],
    templateRaw,
    scriptRaw,
    scriptLang: scriptLang ?? undefined,
    styleRaw,
    columns,
    queryFields,
    formFields
  }
}

function extractFormFieldsGeneric(tpl: string): { label: string; prop: string; required: boolean }[] {
  return extractFormFieldsForModel(tpl, 'queryParams').length
    ? []
    : genericFormItems(tpl)
}

function genericFormItems(tpl: string): { label: string; prop: string; required: boolean }[] {
  const out: { label: string; prop: string; required: boolean }[] = []
  const itemRe =
    /<el-form-item\b[^>]*?\blabel="([^"]+)"[^>]*?\bprop="([^"]+)"/g
  let m: RegExpExecArray | null
  while ((m = itemRe.exec(tpl))) out.push({ label: m[1], prop: m[2], required: false })
  return out
}

/**
 * Only el-form-item inside the first <el-form> bound to :model="<modelName>"
 */
function extractFormFieldsForModel(
  tpl: string,
  modelName: string
): { label: string; prop: string; required: boolean }[] {
  const out: { label: string; prop: string; required: boolean }[] = []
  const formRe = new RegExp(`<el-form[\\s\\S]*?:model="${modelName}"[\\s\\S]*?<\\/el-form>`)
  const block = tpl.match(formRe)?.[0] ?? ''
  const itemRe = /<el-form-item\b[^>]*?\blabel="([^"]+)"[^>]*?\bprop="([^"]+)"/g
  let m: RegExpExecArray | null
  while ((m = itemRe.exec(block))) out.push({ label: m[1], prop: m[2], required: false })
  return out
}

function extractTableColumns(tpl: string): { label: string; prop: string; width?: string }[] {
  const out: { label: string; prop: string; width?: string }[] = []
  const re = /<el-table-column\b[^>]*?\blabel="([^"]+)"[^>]*?\bprop="([^"]+)"([^>]*)\/?>/g
  let m: RegExpExecArray | null
  while ((m = re.exec(tpl))) {
    const widthMatch = m[3].match(/\bwidth="([^"]+)"/)
    out.push({ label: m[1], prop: m[2], width: widthMatch?.[1] })
  }
  return out
}

function extractQueryFields(tpl: string): { label: string; prop: string }[] {
  const out: { label: string; prop: string }[] = []
  const formRe = /<el-form[\s\S]*?:model="queryParams"[\s\S]*?<\/el-form>/
  const block = tpl.match(formRe)?.[0] ?? ''
  const itemRe = /<el-form-item\b[^>]*?\blabel="([^"]+)"[^>]*?\bprop="([^"]+)"/g
  let m: RegExpExecArray | null
  while ((m = itemRe.exec(block))) out.push({ label: m[1], prop: m[2] })
  return out
}

export function extractRequiredPropsFromRulesScript(script: string): Set<string> {
  const req = new Set<string>()
  if (!script.trim()) return req

  /**
   * `foo: [{ required: true, ... }]` on one line — typical Vue3 + Element Plus.
   */
  const lineRe =
    /\b(\w+)\s*:\s*\[\s*\{[^\r\n]{0,1000}?\brequired\s*:\s*true[^\r\n]*/gm
  let m: RegExpExecArray | null
  while ((m = lineRe.exec(script))) {
    if (!['computed', 'ref', 'watch'].includes(m[1]!)) req.add(m[1]!)
  }
  return req
}