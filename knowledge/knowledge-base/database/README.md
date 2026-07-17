# 命理数据库

## 项目简介

本目录包含命理数据库相关文件，包括数据库脚本、导出数据和测试文件。

## 目录结构

- `export/` - 导出的数据文件
- `scripts/` - 数据库操作脚本

## 数据库文件

- `mingli.db` - 命理数据库
- `liuren.db` - 六壬数据库
- `shensha.db` - 神煞数据库
- `ziwei_cases.db` - 紫微斗数案例数据库

## 核心脚本

1. `create_db.py` - 创建数据库表结构
2. `batch_import_mingli.py` - 批量导入命理数据
3. `export_to_excel.py` - 导出数据到 Excel
4. `query_examples.py` - 查询示例数据
5. `validate_data.py` - 验证数据完整性

## 如何使用

1. 运行 `create_db.py` 创建数据库表结构
2. 运行 `batch_import_mingli.py` 导入命理数据
3. 使用 `query_examples.py` 查询数据
4. 使用 `export_to_excel.py` 导出数据

## 数据结构

### 命理数据库表

- `mingli_examples` - 命理案例表
- `patterns` - 命理格局表
- `rules` - 命理法则表

### 六壬数据库表

- `liuren_cases` - 六壬案例表
- `liuren_patterns` - 六壬格局表

## 注意事项

- 数据库文件较大，请确保有足够的磁盘空间
- 导入数据时可能需要较长时间
- 建议定期备份数据库文件