# 奇门 Golden Fixture 交叉验证

## 目的

验证 3 套奇门遁甲实现（JS/C++/Go）产生一致的结果。

## 实现

| 实现 | 路径 | 语言 |
|------|------|------|
| qimen-master | `qimen/qimen-master/` | JavaScript (Node.js) |
| ZhouYiLab | `ZhouYiLab/` | C++20 |
| qimen-go | `qimen-go/` | Go |

## 测试用例

`cases.json` 包含 10 个已知日期的测试用例，覆盖 24 节气中的关键节点：

- 春分/秋分/夏至/冬至（四正）
- 立春/立夏/立秋/立冬（四立）
- 清明/春节/元旦（特殊日期）

每个用例验证：
1. 四柱（年/月/日/时干支）
2. 局数（阳遁/阴遁 + 局数）
3. 元（上元/中元/下元）

## 运行

```bash
# JS 实现验证
cd qimen/qimen-master
npm install
node ../../golden-fixture/verify.js

# C++ 实现验证（需要 CMake + C++20 编译器）
cd ZhouYiLab
cmake -B build && cmake --build build
# 运行 example_qi_men 对比输出

# Go 实现验证
cd qimen-go
go test ./qimen/ -v
```

## 状态

- [x] 10 个测试用例已创建
- [x] JS 验证脚本已创建
- [ ] JS 实现首次验证通过
- [ ] C++ 实现交叉验证
- [ ] Go 实现交叉验证

## 文件

```
golden-fixture/
├── README.md     ← 本文件
├── cases.json    ← 10 个测试用例
└── verify.js     ← JS 验证脚本
```