# 产后健康管理系统 (Postpartum Health Management)

基于 Next.js 15 + Tailwind CSS + shadcn/ui 构建的产后健康管理系统前端。

## 功能模块

### 门店管理端 (`/store`)
- **AI 健康分析** (`/store/ai-analysis`) - AI 驱动的产后健康分析
- **客户管理** (`/store/customers`) - 客户信息管理与健康档案
- **报告提交** (`/store/report-submit`) - 健康报告在线提交
- **报告查看** (`/store/report/view`) - 查看健康报告详情
- **方案预览** (`/store/plan/preview`) - 健康方案预览

### 后台管理端 (`/admin`)
- **仪表盘** (`/admin`) - 数据统计概览
- **客户管理** (`/admin/customers`) - 客户列表与详情管理
- **门店管理** (`/admin/stores`) - 门店信息管理
- **方案管理** (`/admin/plans`) - 健康方案管理
- **方案记录** (`/admin/plan-records`) - 客户方案执行记录
- **知识库** (`/admin/knowledge-base`) - 知识库管理与 Excel 导入
- **AI 设置** (`/admin/ai-settings`) - AI 分析参数配置

## 技术栈

- **框架**: Next.js 15 (App Router)
- **UI**: Tailwind CSS 4 + shadcn/ui + Radix UI
- **状态管理**: Zustand
- **数据库**: Prisma ORM + SQLite
- **构建工具**: Tailwind CSS PostCSS

## 快速开始

```bash
# 安装依赖
npm install

# 初始化数据库
npm run db:push      # 推送 schema 到数据库
npm run db:seed      # 填充初始数据

# 开发模式
npm run dev

# 构建生产版本
npm run build

# ESLint 检查
npm run lint
```

## 项目结构

```
nextjs-blog/
├── app/                    # Next.js App Router 页面
│   ├── (auth)/            # 认证相关页面
│   ├── admin/             # 后台管理页面
│   ├── api/               # API 路由
│   ├── customer/          # 客户页面
│   └── store/             # 门店管理页面
├── prisma/                # Prisma 数据库 schema
├── src/
│   ├── components/        # React 组件
│   │   ├── ui/           # shadcn/ui 基础组件
│   │   └── login/        # 登录相关组件
│   ├── hooks/             # 自定义 Hooks
│   ├── lib/               # 工具库
│   └── stores/            # Zustand 状态管理
└── public/                # 静态资源
```

## 注意事项

- `postpartum-health/` 是本项目重构前的旧版本，请忽略
- `.env` 文件包含数据库和 API 配置，参考 `.env.example`
