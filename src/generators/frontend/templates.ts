import type { FrontendGenerateOptions } from '../../types.js'
import { toKebabCase, toCamelCase } from '../../utils/naming.js'

export function renderApiTs(o: FrontendGenerateOptions): string {
  const apiObj = `${o.entityName}Api`
  return `import request from '@/config/axios'

export const ${apiObj} = {
  getPage: (params: any) => {
    return request.get({ url: '${o.routeBase}/page', params })
  },
  get: (id: number) => {
    return request.get({ url: '${o.routeBase}/get?id=' + id })
  },
  create: (data: any) => {
    return request.post({ url: '${o.routeBase}/create', data })
  },
  update: (data: any) => {
    return request.put({ url: '${o.routeBase}/update', data })
  },
  delete: (id: number) => {
    return request.delete({ url: '${o.routeBase}/delete?id=' + id })
  },
  export: (params: any) => {
    return request.download({ url: '${o.routeBase}/export-excel', params })
  }
}
`
}

export function renderIndexVue(o: FrontendGenerateOptions): string {
  const apiObj = `${o.entityName}Api`
  const formCmp = `${o.entityName}Form`
  const componentName = `Erp${o.entityName}`
  const apiImportPath = `@/api/erp/${toCamelCase(o.entityName)}`

  const queryItems = o.queryFields
    .map(
      f => `      <el-form-item label="${f.label}" prop="${f.prop}">
        <el-input
          v-model="queryParams.${f.prop}"
          placeholder="请输入${f.label}"
          clearable
          @keyup.enter="handleQuery"
          class="!w-200px"
        />
      </el-form-item>`
    )
    .join('\n')

  const queryParamFields = o.queryFields.map(f => `  ${f.prop}: undefined`).join(',\n')

  const tableColumns = o.columns
    .map(c => {
      const w = c.width ? ` width="${c.width}"` : ''
      return `      <el-table-column label="${c.label}" align="center" prop="${c.prop}"${w} />`
    })
    .join('\n')

  return `<template>
  <div>
    <ContentWrap>
    <el-form
      class="-mb-15px"
      :model="queryParams"
      ref="queryFormRef"
      :inline="true"
      label-width="80px"
    >
${queryItems}
      <el-form-item>
        <el-button @click="handleQuery"><Icon icon="ep:search" class="mr-5px" />搜索</el-button>
        <el-button @click="resetQuery"><Icon icon="ep:refresh" class="mr-5px" />重置</el-button>
        <el-button
          type="primary"
          plain
          @click="openForm('create')"
          v-hasPermi="['${o.permPrefix}:create']"
        >
          <Icon icon="ep:plus" class="mr-5px" />新增
        </el-button>
      </el-form-item>
    </el-form>
    </ContentWrap>

    <ContentWrap>
    <el-table v-loading="loading" :data="list" :stripe="true" :show-overflow-tooltip="true">
${tableColumns}
      <el-table-column
        label="创建时间"
        align="center"
        prop="createTime"
        :formatter="dateFormatter"
        width="180"
      />
      <el-table-column label="操作" align="center" fixed="right" width="180">
        <template #default="{ row }">
          <div class="flex items-center justify-center gap-8px">
            <el-button
              link
              type="primary"
              @click="openForm('update', row.id)"
              v-hasPermi="['${o.permPrefix}:update']"
            >
              编辑
            </el-button>
            <el-button
              link
              type="danger"
              @click="handleDelete(row.id)"
              v-hasPermi="['${o.permPrefix}:delete']"
            >
              删除
            </el-button>
          </div>
        </template>
      </el-table-column>
    </el-table>
    <Pagination
      :total="total"
      v-model:page="queryParams.pageNo"
      v-model:limit="queryParams.pageSize"
      @pagination="getList"
    />
    </ContentWrap>

    <${formCmp} ref="formRef" @success="getList" />
  </div>
</template>

<script setup lang="ts">
import { dateFormatter } from '@/utils/formatTime'
import { ${apiObj} } from '${apiImportPath}'
import ${formCmp} from './${formCmp}.vue'

defineOptions({ name: '${componentName}' })

const message = useMessage()
const { t } = useI18n()

const loading = ref(true)
const total = ref(0)
const list = ref<any[]>([])
const queryParams = reactive({
  pageNo: 1,
  pageSize: 10,
${queryParamFields}
})
const queryFormRef = ref()

const getList = async () => {
  loading.value = true
  try {
    const data = await ${apiObj}.getPage(queryParams)
    list.value = data.list
    total.value = data.total
  } finally {
    loading.value = false
  }
}

const handleQuery = () => {
  queryParams.pageNo = 1
  getList()
}

const resetQuery = () => {
  queryFormRef.value?.resetFields()
  handleQuery()
}

const formRef = ref()
const openForm = (type: string, id?: number) => {
  formRef.value.open(type, id)
}

const handleDelete = async (id: number) => {
  try {
    await message.delConfirm()
    await ${apiObj}.delete(id)
    message.success(t('common.delSuccess'))
    await getList()
  } catch {}
}

onMounted(() => {
  getList()
})
</script>
`
}

export function renderFormVue(o: FrontendGenerateOptions): string {
  const apiObj = `${o.entityName}Api`
  const formCmp = `${o.entityName}Form`
  const apiImportPath = `@/api/erp/${toCamelCase(o.entityName)}`

  const formItems = o.formFields
    .map(
      f => `        <el-col :span="12">
          <el-form-item label="${f.label}" prop="${f.prop}">
            <el-input v-model="formData.${f.prop}" placeholder="请输入${f.label}" />
          </el-form-item>
        </el-col>`
    )
    .join('\n')

  const formDataFields = o.formFields.map(f => `  ${f.prop}: undefined`).join(',\n')

  const ruleCandidates = o.formFields.filter(
    f => f.required
  ).length
    ? o.formFields.filter(f => f.required)
    : o.formFields.filter(f => ['name', 'code'].some(k => f.prop.toLowerCase().includes(k)))
  const rules = ruleCandidates.map(
      f =>
        `  ${f.prop}: [{ required: true, message: '${f.label.replace(/'/g, "\\'")}不能为空', trigger: 'blur' }]`
    ).join(',\n')

  const resetFields = o.formFields.map(f => `    ${f.prop}: undefined`).join(',\n')

  return `<template>
  <Dialog :title="dialogTitle" v-model="dialogVisible">
    <el-form
      ref="formRef"
      :model="formData"
      :rules="formRules"
      label-width="100px"
      v-loading="formLoading"
    >
      <el-row :gutter="20">
${formItems}
      </el-row>
    </el-form>
    <template #footer>
      <el-button @click="submitForm" type="primary" :disabled="formLoading">确 定</el-button>
      <el-button @click="dialogVisible = false">取 消</el-button>
    </template>
  </Dialog>
</template>

<script setup lang="ts">
import { ${apiObj} } from '${apiImportPath}'

defineOptions({ name: '${formCmp}' })

const { t } = useI18n()
const message = useMessage()

const dialogVisible = ref(false)
const dialogTitle = ref('')
const formLoading = ref(false)
const formType = ref('')

const formData = ref<any>({
  id: undefined,
${formDataFields}
})
const formRules = reactive({
${rules}
})
const formRef = ref()

const open = async (type: string, id?: number) => {
  dialogVisible.value = true
  dialogTitle.value = t('action.' + type)
  formType.value = type
  resetForm()
  if (id) {
    formLoading.value = true
    try {
      const data = await ${apiObj}.get(id)
      formData.value = { ...formData.value, ...data }
    } finally {
      formLoading.value = false
    }
  }
}
defineExpose({ open })

const emit = defineEmits(['success'])

const submitForm = async () => {
  await formRef.value?.validate()
  formLoading.value = true
  try {
    const data = { ...formData.value }
    if (formType.value === 'create') {
      await ${apiObj}.create(data)
      message.success(t('common.createSuccess'))
    } else {
      await ${apiObj}.update(data)
      message.success(t('common.updateSuccess'))
    }
    dialogVisible.value = false
    emit('success')
  } finally {
    formLoading.value = false
  }
}

const resetForm = () => {
  formData.value = {
    id: undefined,
${resetFields}
  }
  formRef.value?.resetFields()
}
</script>
`
}

export function entityKebab(name: string): string {
  return toKebabCase(name)
}
