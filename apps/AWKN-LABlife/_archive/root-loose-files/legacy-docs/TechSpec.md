# 人生决策宗师 - 技术规格文档

## 组件清单

### shadcn/ui 组件
- `button` - 主要/次要按钮
- `input` - 表单输入
- `textarea` - 多行文本输入
- `card` - 服务卡片、会员卡片
- `dialog` - 弹窗、登录弹窗
- `tabs` - 切换标签
- `select` - 下拉选择
- `switch` - 开关组件
- `label` - 表单标签
- `separator` - 分隔线
- `scroll-area` - 滚动区域
- `avatar` - 用户头像
- `badge` - 标签徽章
- `tooltip` - 提示工具

### 自定义组件
| 组件名 | 用途 | 位置 |
|--------|------|------|
| `GoldenParticles` | 金色粒子背景效果 | `src/components/GoldenParticles.tsx` |
| `MagneticButton` | 磁性吸引按钮 | `src/components/MagneticButton.tsx` |
| `AnimatedText` | 文字拆分动画 | `src/components/AnimatedText.tsx` |
| `ServiceCard` | 服务卡片(3D翻转) | `src/components/ServiceCard.tsx` |
| `MembershipCard` | 会员套餐卡片 | `src/components/MembershipCard.tsx` |
| `LanguageSwitcher` | 语言切换器 | `src/components/LanguageSwitcher.tsx` |
| `ConsultInput` | 咨询输入框 | `src/components/ConsultInput.tsx` |
| `ResultDisplay` | 结果展示组件 | `src/components/ResultDisplay.tsx` |
| `AuthModal` | 登录/注册弹窗 | `src/components/AuthModal.tsx` |

## 动画实现规划

| 动画 | 库 | 实现方式 | 复杂度 |
|------|-----|----------|--------|
| 主视觉H1 3D翻转下落 | GSAP + SplitType | 字符拆分，stagger动画，rotateX变换 | 高 |
| 金色粒子背景 | Three.js / React-Three-Fiber | 粒子系统，响应鼠标 | 高 |
| 磁性按钮效果 | 自定义Hook | 鼠标位置追踪，transform偏移 | 中 |
| 服务卡片3D翻转 | GSAP Flip | 布局变换，3D旋转 | 中 |
| 滚动视差效果 | GSAP ScrollTrigger | scrub模式，多速度层级 | 中 |
| 时间线路径绘制 | GSAP DrawSVG | stroke-dashoffset动画 | 中 |
| 输入框金色下划线 | CSS + GSAP | scaleX变换，transform-origin | 低 |
| 评价轮播旋转 | GSAP | 3D旋转，自动播放 | 中 |
| 页面过渡 | Framer Motion | AnimatePresence | 中 |
| 数字计数器 | GSAP | 数值插值动画 | 低 |

## 项目文件结构

```
src/
├── components/           # 可复用组件
│   ├── ui/              # shadcn/ui 组件
│   ├── GoldenParticles.tsx
│   ├── MagneticButton.tsx
│   ├── AnimatedText.tsx
│   ├── ServiceCard.tsx
│   ├── MembershipCard.tsx
│   ├── LanguageSwitcher.tsx
│   ├── ConsultInput.tsx
│   ├── ResultDisplay.tsx
│   ├── AuthModal.tsx
│   └── Navigation.tsx
├── sections/            # 页面区块
│   ├── HeroSection.tsx
│   ├── ServicesSection.tsx
│   ├── AboutSection.tsx
│   ├── ProcessSection.tsx
│   ├── TestimonialsSection.tsx
│   ├── ContactSection.tsx
│   └── FooterSection.tsx
├── pages/               # 页面组件
│   ├── HomePage.tsx
│   ├── ConsultPage.tsx
│   ├── InfoPage.tsx
│   ├── ResultPage.tsx
│   ├── MembershipPage.tsx
│   ├── HistoryPage.tsx
│   └── ProfilePage.tsx
├── hooks/               # 自定义Hooks
│   ├── useMousePosition.ts
│   ├── useMagneticEffect.ts
│   ├── useLanguage.ts
│   └── useAuth.ts
├── store/               # 状态管理
│   ├── authStore.ts
│   ├── consultStore.ts
│   └── languageStore.ts
├── lib/                 # 工具函数
│   ├── utils.ts
│   ├── i18n.ts          # 国际化配置
│   └── aiAgent.ts       # AI智能体模拟
├── types/               # TypeScript类型
│   └── index.ts
├── styles/              # 样式文件
│   └── globals.css
├── App.tsx
└── main.tsx
```

## 依赖项

### 核心依赖
```bash
# 动画库
npm install gsap @gsap/react
npm install framer-motion
npm install @studio-freight/lenis

# 3D效果
npm install three @react-three/fiber @react-three/drei

# 国际化
npm install react-i18next i18next i18next-browser-languagedetector

# 状态管理
npm install zustand

# 工具
npm install clsx tailwind-merge
npm install split-type
```

## 路由结构

| 路径 | 页面 | 说明 |
|------|------|------|
| `/` | 首页 | 主视觉 + 服务介绍 |
| `/consult` | 咨询页 | 单入口问题输入 |
| `/info` | 补充信息页 | 断事线/命理线信息收集 |
| `/result` | 结果页 | 初步结果 + 会员承接区 |
| `/membership` | 会员中心 | 套餐展示与购买 |
| `/history` | 历史记录 | 过往咨询记录 |
| `/profile` | 个人中心 | 用户信息管理 |

## 多语言支持

### 支持语言
- 简体中文 (zh-CN)
- 繁体中文 (zh-TW)
- 英语 (en)
- 泰语 (th)
- 越南语 (vi)
- 印尼语 (id)
- 马来语 (ms)

### 翻译文件结构
```
public/locales/
├── zh-CN/
│   └── translation.json
├── en/
│   └── translation.json
├── th/
│   └── translation.json
└── ...
```

## AI智能体接口设计

### 自动分流逻辑
```typescript
interface ConsultRequest {
  question: string;
  timestamp: number;
}

type ConsultType = 'divination' | 'destiny' | 'clarification';

function analyzeConsultType(question: string): ConsultType {
  // 关键词匹配
  const divinationKeywords = ['要不要', '能不能', '适合', '签约', '见面', '谈判', '合作'];
  const destinyKeywords = ['运势', '今年', '本周', '最近', '整体', '趋势'];
  
  // 返回判断结果
}
```

### 模拟响应生成
```typescript
interface ConsultResponse {
  type: ConsultType;
  summary: string;      // 一句准话
  analysis: string;     // 简版判断
  risks: string[];      // 风险提示
  actions: string[];    // 行动建议
  followUp: string[];   // 后续问题
}
```

## 会员系统设计

### 会员等级
| 等级 | 权益 | 价格 |
|------|------|------|
| 免费 | 1次初步判断 | ¥0 |
| 月卡 | 完整结果 + 多轮追问 + 提醒 | ¥68/月 |
| 年卡 | 月卡全部 + 宗师推演 + 深推 | ¥588/年 |
| 单次 | 单次宗师推演 | ¥128/次 |

### 额度控制
- 月卡: 每月10次完整咨询
- 年卡: 每月20次完整咨询 + 4次宗师推演
- 单次: 1次宗师推演

## 响应式断点

| 断点 | 宽度 | 说明 |
|------|------|------|
| sm | 640px | 小屏手机 |
| md | 768px | 平板 |
| lg | 1024px | 小型桌面 |
| xl | 1280px | 标准桌面 |
| 2xl | 1536px | 大屏桌面 |

## 性能优化

### 图片优化
- 使用WebP格式
- 响应式图片srcset
- 懒加载非首屏图片

### 动画优化
- 使用transform和opacity
- will-change仅在动画元素
- 减少动效模式支持

### 代码优化
- 路由懒加载
- 组件按需加载
- Tree-shaking
