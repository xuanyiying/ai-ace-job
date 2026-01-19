# Interview AI Frontend

React + Vite 前端应用，为 Interview AI 平台提供用户界面。

## 🛠️ 技术栈

| 技术          | 版本 | 用途        |
| ------------- | ---- | ----------- |
| React         | 18.x | UI 框架     |
| TypeScript    | 5.x  | 类型安全    |
| Vite          | 7.x  | 构建工具    |
| Ant Design    | 6.x  | UI 组件库   |
| Zustand       | 4.x  | 状态管理    |
| React Router  | 6.x  | 路由        |
| Axios         | 1.x  | HTTP 客户端 |
| Socket.io     | 4.x  | 实时通信    |
| Framer Motion | 12.x | 动画        |

## 📁 项目结构

```
src/
├── components/           # 可复用组件
│   ├── MyResumes/        # 简历管理组件
│   ├── ResumeBuilder/    # 简历编辑器
│   ├── *Card.tsx         # 功能卡片组件
│   └── *Dialog.tsx       # 对话框组件
├── config/               # 配置文件
│   ├── axios.ts          # HTTP 客户端配置
│   └── theme.ts          # Ant Design 主题
├── hooks/                # 自定义 Hooks
├── layouts/              # 布局组件
├── locales/              # 国际化资源
├── pages/                # 页面组件
│   ├── ChatPage/         # AI 对话页面
│   ├── InterviewPage     # 面试模拟
│   ├── ProfilePage       # 个人中心
│   └── *ManagementPage   # 管理后台
├── router/               # 路由配置
├── services/             # API 服务层
├── stores/               # Zustand 状态
└── types/                # TypeScript 类型
```

## 🗂️ 状态管理

### Stores 说明

| Store               | 文件                   | 职责         |
| ------------------- | ---------------------- | ------------ |
| `authStore`         | `authStore.ts`         | 用户认证状态 |
| `resumeStore`       | `resumeStore.ts`       | 简历列表管理 |
| `jobStore`          | `jobStore.ts`          | 职位信息     |
| `optimizationStore` | `optimizationStore.ts` | 优化结果     |
| `conversationStore` | `conversationStore.ts` | 对话历史     |
| `interviewStore`    | `interviewStore.ts`    | 面试会话     |
| `generateStore`     | `generateStore.ts`     | PDF 生成     |
| `uiStore`           | `uiStore.ts`           | UI 状态      |

## 📄 主要页面

### 用户端

| 页面 | 路径         | 说明          |
| ---- | ------------ | ------------- |
| 登录 | `/login`     | 用户登录      |
| 注册 | `/register`  | 用户注册      |
| 对话 | `/chat/:id?` | AI 对话主界面 |
| 简历 | `/resumes`   | 简历管理      |
| 面试 | `/interview` | 模拟面试      |
| 定价 | `/pricing`   | 订阅方案      |
| 设置 | `/settings`  | 用户设置      |

### 管理后台

| 页面        | 路径                  | 说明        |
| ----------- | --------------------- | ----------- |
| 用户管理    | `/admin/users`        | 用户列表    |
| 模型管理    | `/admin/models`       | AI 模型配置 |
| Prompt 管理 | `/admin/prompts`      | 提示词模板  |
| 邀请码      | `/admin/invite-codes` | 邀请码管理  |
| 系统设置    | `/admin/settings`     | 系统配置    |

## 🚀 快速开始

### 安装依赖

```bash
pnpm install
```

### 配置环境

```bash
cp .env.example .env
# 编辑 .env 设置 API 地址
```

### 启动开发服务

```bash
pnpm dev
# 访问 http://localhost:5173
```

### 构建生产版本

```bash
pnpm build
pnpm preview
```

## 🧪 测试

```bash
# 运行测试
pnpm test

# 监视模式
pnpm test:watch

# 测试覆盖率
pnpm test:coverage
```

## 🎨 关键组件

### ChatPage (`pages/ChatPage/`)

AI 对话主界面，使用自定义 Hooks 管理复杂状态：

- `useResumeUpload` - 简历上传
- `useJobActions` - 职位操作
- `useOptimization` - 优化流程
- `useChatItems` - 消息渲染

### 功能卡片组件

- `SuggestionCard` - 优化建议展示
- `InterviewQuestionsCard` - 面试题卡片
- `MatchAnalysisCard` - 匹配分析
- `PDFGenerationCard` - PDF 生成

## 🌐 国际化

支持中英文切换：

- `locales/en.json` - 英文
- `locales/zh.json` - 中文

使用方式：

```tsx
import { useTranslation } from 'react-i18next';
const { t } = useTranslation();
<span>{t('common.submit')}</span>;
```

## 📱 PWA 支持

通过 `vite-plugin-pwa` 提供 PWA 功能，支持离线访问。
