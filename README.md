# moveAgent

老 yudao 模块（`2.0Old/`）→ 新 ERP（`erp-backend/` + `erp-web/`）骨架生成工具。
独立 Node + TypeScript CLI，**不会**写入业务工程目录，所有产物默认放到 `AGENT/output/` 或 `AGENT/demo-output/`。

## 能力

1. **后端 8 件套生成** —— 输入老 Controller 路径（自动定位同模块 DO），生成新 ERP 风格的 Controller / Service / ServiceImpl / DO / Mapper / SaveReqVO / RespVO / PageReqVO，外加 ErrorCodeConstants 常量片段。
2. **前端 3 件套生成** —— 输入老 Vue **列表页** `index.vue`。同目录若有 `*Form.vue`（或 `${Entity}Form.vue`）会自动合并完整表单字段，也可用 `--form` 指定。可选 `--api` 仅用于控制台日志对齐。产出 `index.vue` + `XxxForm.vue` + `api/erp/xxx.ts`，Vue3 `<script setup lang="ts">` + Element Plus。
3. **SQL Server 幂等表 diff** —— 对比老/新 DO 字段，产出可重复执行的 `ALTER TABLE` 脚本（含默认约束、扩展属性清理）。

## 环境要求

- Node 18+
- 仓库根目录就是 `e:\work\jm-management-gitLab3.0\`，本工具位于 `AGENT/`。
- Windows / PowerShell 友好。

## 安装

```powershell
cd AGENT
npm install
```

## 命令

### 1) 后端骨架

```powershell
npx tsx src/index.ts migrate:backend `
  ../2.0Old/junma-backend/yudao-module-data/yudao-module-data-biz/src/main/java/cn/iocoder/yudao/module/data/controller/admin/companyentity/CompanyEntityController.java `
  --module erp-base `
  --route /erp/company-entity `
  --perm-prefix erp:company-entity `
  --table-prefix erp_ `
  --base-package cn.iocoder.yudao.module.erp.base `
  --zh-name 公司主体 `
  --out ./output/company-entity-backend
```

### 2) 前端骨架

```powershell
npx tsx src/index.ts migrate:frontend `
  ../2.0Old/junma-frontend/src/views/data/companyentity/index.vue `
  --api ../2.0Old/junma-frontend/src/api/data/companyentity/index.ts `
  --route /erp/company-entity `
  --perm-prefix erp:company-entity `
  --entity CompanyEntity `
  --zh-name 公司主体 `
  --out ./output/company-entity-frontend
```

表单页：默认同目录自动查找 `CompanyEntityForm.vue` 或任一 `*Form.vue`（非 `index.vue`）。也可用 `--form ../2.0Old/.../FooForm.vue` 指定。

### 3) 老/新表字段 diff（SQL Server）

```powershell
npx tsx src/index.ts diff:table `
  ../2.0Old/junma-backend/yudao-module-data/yudao-module-data-biz/src/main/java/cn/iocoder/yudao/module/data/dal/dataobject/companyentity/CompanyEntityDO.java `
  ../erp-backend/yudao-module-erp-base/yudao-module-erp-base-biz/src/main/java/cn/iocoder/yudao/module/erp/base/dal/dataobject/CompanyEntityDO.java `
  --new-table erp_company_entity `
  --out ./output/company-entity-diff.sql
```

### 4) 一键 demo（公司主体全套）

```powershell
npm run demo
# 或
./demo/run-demo.ps1
```

输出目录：`AGENT/demo-output/`
- `demo-output/backend/...`：8 件套 + ErrorCode 片段
- `demo-output/frontend/...`：`index.vue` / `Form.vue` / `api/erp/companyEntity.ts`
- `demo-output/sql/company-entity-diff.sql`

## 输出示例

```
demo-output/
├─ backend/
│  ├─ controller/admin/CompanyEntityController.java
│  ├─ controller/admin/vo/CompanyEntitySaveReqVO.java
│  ├─ controller/admin/vo/CompanyEntityRespVO.java
│  ├─ controller/admin/vo/CompanyEntityPageReqVO.java
│  ├─ service/CompanyEntityService.java
│  ├─ service/CompanyEntityServiceImpl.java
│  ├─ dal/dataobject/CompanyEntityDO.java
│  ├─ dal/mysql/CompanyEntityMapper.java
│  └─ __snippets__/ErrorCode.snippet.txt
├─ frontend/
│  ├─ views/erp/company-entity/index.vue
│  ├─ views/erp/company-entity/CompanyEntityForm.vue
│  └─ api/erp/companyEntity.ts
└─ sql/
   └─ company-entity-diff.sql
```

## 已知改进

- **Java Controller**：正确处理 `CommonResult<X>`、`void`、参数换行的方法签名，`migrate:backend` 日志里 **endpoints** 与源码一致（公司主体示例为 **7**）。
- **`api/*.ts` 扫描**：用大括号配对 + 字符串跳过解析 `request.get/post({ url })`，识别模板字符串、`'...' + id` 等，`migrate:frontend --api` 日志中的 URL 与函数名更准确。
- **Vue**：从 ``:model="formData"`` 的 `<el-form>` 抽表单项；合并同目录 `*Form.vue`；从表单脚本中行级规则 `xxx: [{ required: true, ...}]` 识别必填。**不再**按「搜索项与编辑项同名」剔除表单字段（避免漏掉 entityCode / entityName 等）。

## 设计约束（仍适用）

- **不调用 LLM**，确定性输出，可在内网/无密钥环境跑。
- 生成物**不直接覆盖** `erp-backend` / `erp-web`；你看完 diff 再人工搬运，避免误删。
- 字段类型映射默认值：`String→nvarchar(255)`、`Long→bigint`、`Integer→int`、`Boolean→bit`、`BigDecimal→decimal(18,4)`、`LocalDateTime/Date→datetime2(3)`、`LocalDate→date`，需调整就改 `src/generators/sql/sqlserverDiff.ts`。
- **`formRules` 回填**：能从老 `*Form.vue` 的脚本中抽取必填项；若没有规则则回退为「字段名含 name/code」（见 `templates.ts` 中生成逻辑）。
- 老前端如果是**选项式 + Element UI 旧版**，模板提取仍按 `el-table-column[label][prop]` / `el-form-item[label][prop]` 抽取，足以覆盖 95% 的 CRUD 列表页；其它（图表、富文本、向导）需要人工补。

## 快速排查

- `Could not locate DO file`：用 `--do-file` 显式指定老 DO 路径。
- 字段全部 `private String xxx;`：老 DO 用了 lombok 之外的写法，可改 `src/parsers/javaParser.ts` 的 `PRIMITIVE_LINE` 正则。
- 中文乱码：本工具按 UTF-8 写入，请确认编辑器以 UTF-8 打开。
