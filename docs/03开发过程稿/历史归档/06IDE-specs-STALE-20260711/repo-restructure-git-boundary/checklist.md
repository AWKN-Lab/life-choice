# Checklist

## 目录结构
- [x] 顶层只存在 6 类主目录（apps/、knowledge/、references/、scripts/、docs/、_archive/）和元文件
- [x] 顶层无散落 .py/.ps1/.zip/.tar.gz/.txt/.json 临时文件
- [x] apps/ 下只有 AWKN-LABlife/（或后续新增的运行项目）

## 主线项目
- [x] apps/AWKN-LABlife/ 目录完整存在
- [x] apps/AWKN-LABlife/.git 存在且 git log 可查看历史
- [x] 前端启动路径 apps/AWKN-LABlife/app 可达
- [x] 后端启动路径 apps/AWKN-LABlife/awkn-life-backend 可达

## 旧项目
- [x] references/projects/xuanxue-app/ 完整存在
- [x] references/projects/xuanxue-backend/ 完整存在
- [x] references/projects/bazi-master/ 完整存在
- [x] references/projects/AW-life/ 完整存在
- [x] references/projects/legacy-unknown/ 完整存在（原 无法判断/）
- [x] references/projects/coze-skills/ 完整存在（原 projects/ 内容）
- [x] 旧项目 .git 保留（xuanxue-app、xuanxue-backend、legacy-unknown）

## 知识资产
- [x] knowledge/knowledge-base/ 完整存在
- [x] knowledge/eastern-metaphysics/ 完整存在（原 东方术数/）
- [x] knowledge/qimen-suite/ 完整存在（原 奇门遁甲/）
- [x] knowledge/processed/ 目录存在
- [x] knowledge/eastern-metaphysics/ 包含从 其它/ 迁入的术数相关子目录

## 参考资料与归档
- [x] references/materials/ 包含原 references/ 下网站抓取目录
- [x] references/materials/misc/ 包含非术数内容
- [x] _archive/packages/ 包含压缩包
- [x] _archive/data-dumps/ 包含一次性转换结果
- [x] _archive/tmp/ 包含临时文件

## 脚本与文档
- [x] scripts/ocr/ 包含所有 OCR/转换脚本
- [x] scripts/deploy/ 包含所有部署脚本
- [x] docs/audits/ 包含审核报告

## Git 边界
- [x] git rev-parse --show-toplevel 返回 人生决策宗师 自身路径
- [x] .gitignore 排除 .cursor/、.trae/、.mineru-env/、.ruff_cache/、.uploads/、.deploy/、_archive/
- [x] .gitignore 排除 *.tar.gz、*.zip
- [x] .gitignore 排除 node_modules/、dist/、.env.*
- [x] references/projects/ 下嵌套 .git 不被主仓库追踪
- [x] git status 无意外未跟踪文件

## 文档一致性
- [x] REPO-MAP.md 存在且描述当前目录结构
- [x] README.md 项目结构与实际一致
- [x] README.md 主线入口写 apps/AWKN-LABlife
- [x] ONBOARDING.md 路径已同步更新
- [x] README.md、ONBOARDING.md、REPO-MAP.md 三者描述一致
- [x] docs/ENGINEERING-目录重构与Git收口-20260607.md 存在
