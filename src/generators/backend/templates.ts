import type { BackendGenerateOptions } from '../../types.js'
import { toCamelCase } from '../../utils/naming.js'

const FIELD_BLACKLIST = new Set(['id', 'createTime', 'updateTime', 'creator', 'updater', 'deleted', 'tenantId'])

export function renderController(o: BackendGenerateOptions): string {
  const cn = o.entityName
  const cnVar = toCamelCase(cn)
  return `package ${o.basePackage}.controller.admin;

import cn.iocoder.yudao.framework.common.pojo.CommonResult;
import cn.iocoder.yudao.framework.common.pojo.PageResult;
import cn.iocoder.yudao.framework.common.util.object.BeanUtils;
import ${o.basePackage}.controller.admin.vo.*;
import ${o.basePackage}.dal.dataobject.${cn}DO;
import ${o.basePackage}.service.${cn}Service;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.annotation.Resource;
import jakarta.validation.Valid;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.*;

import static cn.iocoder.yudao.framework.common.pojo.CommonResult.success;

@Tag(name = "ERP - ${o.zhName}管理")
@RestController
@RequestMapping("${o.routeBase}")
@Validated
public class ${cn}Controller {

    @Resource
    private ${cn}Service ${cnVar}Service;

    @PostMapping("/create")
    @Operation(summary = "创建${o.zhName}")
    @PreAuthorize("@ss.hasPermission('${o.permPrefix}:create')")
    public CommonResult<Long> create${cn}(@Valid @RequestBody ${cn}SaveReqVO createReqVO) {
        return success(${cnVar}Service.create${cn}(createReqVO));
    }

    @PutMapping("/update")
    @Operation(summary = "更新${o.zhName}")
    @PreAuthorize("@ss.hasPermission('${o.permPrefix}:update')")
    public CommonResult<Boolean> update${cn}(@Valid @RequestBody ${cn}SaveReqVO updateReqVO) {
        ${cnVar}Service.update${cn}(updateReqVO);
        return success(true);
    }

    @DeleteMapping("/delete")
    @Operation(summary = "删除${o.zhName}")
    @Parameter(name = "id", description = "编号", required = true)
    @PreAuthorize("@ss.hasPermission('${o.permPrefix}:delete')")
    public CommonResult<Boolean> delete${cn}(@RequestParam("id") Long id) {
        ${cnVar}Service.delete${cn}(id);
        return success(true);
    }

    @GetMapping("/get")
    @Operation(summary = "获取${o.zhName}")
    @Parameter(name = "id", description = "编号", required = true)
    @PreAuthorize("@ss.hasPermission('${o.permPrefix}:query')")
    public CommonResult<${cn}RespVO> get${cn}(@RequestParam("id") Long id) {
        ${cn}DO entity = ${cnVar}Service.get${cn}(id);
        return success(BeanUtils.toBean(entity, ${cn}RespVO.class));
    }

    @GetMapping("/page")
    @Operation(summary = "获取${o.zhName}分页")
    @PreAuthorize("@ss.hasPermission('${o.permPrefix}:query')")
    public CommonResult<PageResult<${cn}RespVO>> get${cn}Page(@Valid ${cn}PageReqVO pageReqVO) {
        PageResult<${cn}DO> pageResult = ${cnVar}Service.get${cn}Page(pageReqVO);
        return success(BeanUtils.toBean(pageResult, ${cn}RespVO.class));
    }
}
`
}

export function renderService(o: BackendGenerateOptions): string {
  const cn = o.entityName
  return `package ${o.basePackage}.service;

import cn.iocoder.yudao.framework.common.pojo.PageResult;
import ${o.basePackage}.controller.admin.vo.${cn}PageReqVO;
import ${o.basePackage}.controller.admin.vo.${cn}SaveReqVO;
import ${o.basePackage}.dal.dataobject.${cn}DO;
import jakarta.validation.Valid;

public interface ${cn}Service {
    Long create${cn}(@Valid ${cn}SaveReqVO createReqVO);
    void update${cn}(@Valid ${cn}SaveReqVO updateReqVO);
    void delete${cn}(Long id);
    ${cn}DO get${cn}(Long id);
    PageResult<${cn}DO> get${cn}Page(${cn}PageReqVO pageReqVO);
}
`
}

export function renderServiceImpl(o: BackendGenerateOptions): string {
  const cn = o.entityName
  const cnVar = toCamelCase(cn)
  const errCode = `${cn.replace(/([a-z0-9])([A-Z])/g, '$1_$2').toUpperCase()}_NOT_EXISTS`
  return `package ${o.basePackage}.service;

import cn.iocoder.yudao.framework.common.pojo.PageResult;
import cn.iocoder.yudao.framework.common.util.object.BeanUtils;
import ${o.basePackage}.controller.admin.vo.${cn}PageReqVO;
import ${o.basePackage}.controller.admin.vo.${cn}SaveReqVO;
import ${o.basePackage}.dal.dataobject.${cn}DO;
import ${o.basePackage}.dal.mysql.${cn}Mapper;
import jakarta.annotation.Resource;
import org.springframework.stereotype.Service;
import org.springframework.validation.annotation.Validated;

import static cn.iocoder.yudao.framework.common.exception.util.ServiceExceptionUtil.exception;
import static ${o.basePackage}.enums.ErrorCodeConstants.${errCode};

@Service
@Validated
public class ${cn}ServiceImpl implements ${cn}Service {

    @Resource
    private ${cn}Mapper ${cnVar}Mapper;

    @Override
    public Long create${cn}(${cn}SaveReqVO createReqVO) {
        ${cn}DO entity = BeanUtils.toBean(createReqVO, ${cn}DO.class);
        ${cnVar}Mapper.insert(entity);
        return entity.getId();
    }

    @Override
    public void update${cn}(${cn}SaveReqVO updateReqVO) {
        validate${cn}Exists(updateReqVO.getId());
        ${cn}DO entity = BeanUtils.toBean(updateReqVO, ${cn}DO.class);
        ${cnVar}Mapper.updateById(entity);
    }

    @Override
    public void delete${cn}(Long id) {
        validate${cn}Exists(id);
        ${cnVar}Mapper.deleteById(id);
    }

    @Override
    public ${cn}DO get${cn}(Long id) {
        return ${cnVar}Mapper.selectById(id);
    }

    @Override
    public PageResult<${cn}DO> get${cn}Page(${cn}PageReqVO pageReqVO) {
        return ${cnVar}Mapper.selectPage(pageReqVO);
    }

    private void validate${cn}Exists(Long id) {
        if (${cnVar}Mapper.selectById(id) == null) {
            throw exception(${errCode});
        }
    }
}
`
}

export function renderDO(o: BackendGenerateOptions): string {
  const cn = o.entityName
  const fieldsCode = o.fields
    .filter(f => f.name !== 'serialVersionUID')
    .map(f => {
      const cmt = f.comment ? `    /** ${f.comment} */\n` : ''
      const tableId = f.name === 'id' ? '    @TableId\n' : ''
      return `${cmt}${tableId}    private ${f.type} ${f.name};`
    })
    .join('\n')
  return `package ${o.basePackage}.dal.dataobject;

import cn.iocoder.yudao.framework.mybatis.core.dataobject.BaseDO;
import com.baomidou.mybatisplus.annotation.KeySequence;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import lombok.*;

@TableName("${o.tableName}")
@KeySequence("${o.tableName}_seq")
@Data
@EqualsAndHashCode(callSuper = true)
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ${cn}DO extends BaseDO {

${fieldsCode}
}
`
}

export function renderMapper(o: BackendGenerateOptions): string {
  const cn = o.entityName
  const filterFields = o.fields.filter(f => !FIELD_BLACKLIST.has(f.name))
  const lambdaFilters = filterFields
    .map(f => {
      const op = f.type === 'String' ? 'likeIfPresent' : 'eqIfPresent'
      return `                .${op}(${cn}DO::get${cap(f.name)}, reqVO.get${cap(f.name)}())`
    })
    .join('\n')
  return `package ${o.basePackage}.dal.mysql;

import cn.iocoder.yudao.framework.common.pojo.PageResult;
import cn.iocoder.yudao.framework.mybatis.core.mapper.BaseMapperX;
import cn.iocoder.yudao.framework.mybatis.core.query.LambdaQueryWrapperX;
import ${o.basePackage}.controller.admin.vo.${cn}PageReqVO;
import ${o.basePackage}.dal.dataobject.${cn}DO;
import org.apache.ibatis.annotations.Mapper;

import java.util.List;

@Mapper
public interface ${cn}Mapper extends BaseMapperX<${cn}DO> {

    default List<${cn}DO> selectSimpleList() {
        return selectList(new LambdaQueryWrapperX<${cn}DO>()
                .orderByDesc(${cn}DO::getId));
    }

    default PageResult<${cn}DO> selectPage(${cn}PageReqVO reqVO) {
        return selectPage(reqVO, new LambdaQueryWrapperX<${cn}DO>()
${lambdaFilters || '                // TODO: add filters'}
                .orderByDesc(${cn}DO::getId));
    }
}
`
}

export function renderSaveReqVO(o: BackendGenerateOptions): string {
  const cn = o.entityName
  const fieldsCode = o.fields
    .filter(f => f.name !== 'serialVersionUID')
    .map(f => {
      const isString = f.type === 'String'
      const required = ['name', 'code'].some(k => f.name.toLowerCase().includes(k))
      const desc = f.comment ?? f.name
      let block = ''
      if (required && isString) {
        block += `    @NotBlank(message = "${desc}不能为空")\n`
        block += `    @Schema(description = "${desc}", requiredMode = Schema.RequiredMode.REQUIRED)\n`
      } else {
        block += `    @Schema(description = "${desc}")\n`
      }
      block += `    private ${f.type} ${f.name};`
      return block
    })
    .join('\n')
  return `package ${o.basePackage}.controller.admin.vo;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Schema(description = "ERP - ${o.zhName}创建/更新 Request VO")
@Data
public class ${cn}SaveReqVO {
${fieldsCode}
}
`
}

export function renderRespVO(o: BackendGenerateOptions): string {
  const cn = o.entityName
  const fieldsCode = o.fields
    .filter(f => f.name !== 'serialVersionUID')
    .map(f => {
      const desc = f.comment ?? f.name
      return `    @Schema(description = "${desc}")\n    private ${f.type} ${f.name};`
    })
    .join('\n')
  return `package ${o.basePackage}.controller.admin.vo;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Data;

import java.time.LocalDateTime;

@Schema(description = "ERP - ${o.zhName} Response VO")
@Data
public class ${cn}RespVO {
${fieldsCode}
    @Schema(description = "创建时间")
    private LocalDateTime createTime;
}
`
}

export function renderPageReqVO(o: BackendGenerateOptions): string {
  const cn = o.entityName
  const filterFields = o.fields.filter(f => !FIELD_BLACKLIST.has(f.name)).slice(0, 5)
  const fieldsCode = filterFields
    .map(f => `    @Schema(description = "${f.comment ?? f.name}")\n    private ${f.type} ${f.name};`)
    .join('\n')
  return `package ${o.basePackage}.controller.admin.vo;

import cn.iocoder.yudao.framework.common.pojo.PageParam;
import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Data;
import lombok.EqualsAndHashCode;

@Schema(description = "ERP - ${o.zhName}分页 Request VO")
@Data
@EqualsAndHashCode(callSuper = true)
public class ${cn}PageReqVO extends PageParam {
${fieldsCode}
}
`
}

export function renderErrorCodeSnippet(o: BackendGenerateOptions): string {
  const cn = o.entityName
  const errCode = `${cn.replace(/([a-z0-9])([A-Z])/g, '$1_$2').toUpperCase()}_NOT_EXISTS`
  return `// 请把以下常量添加到 ${o.basePackage}.enums.ErrorCodeConstants
ErrorCode ${errCode} = new ErrorCode(1_000_000_000, "${o.zhName}不存在");
`
}

function cap(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1)
}
