<!-- BEGIN:nextjs-agent-rules -->
# Project Brief: AnYi Health

## Framework & Dependencies
- **Next.js**: 15.5.19 (App Router)
- **React**: 19.2.4
- **TypeScript**: ^5
- **Prisma**: ^6.0.0 (ORM)
- **Tailwind CSS**: 4.3.0 (@tailwindcss/postcss)
- **shadcn/ui**: ^4.11.0 (UI components)
- **Zustand**: ^5.0.0 (state management)
- **Lucide React**: ^0.400.0 (icons)

## Project Structure
```
app/
├── (auth)/           # Authentication routes
│   └── login/        # Login pages (admin & store)
├── admin/            # Admin dashboard
│   ├── ai-qa/        # AI问答管理
│   ├── ai-scripts/   # AI脚本管理
│   ├── customers/    # 客户管理
│   ├── knowledge-base/ # 知识库管理
│   ├── plan-records/ # 方案记录
│   ├── prompts/      # 提示词管理
│   └── stores/       # 门店管理
├── store/            # Store dashboard
│   ├── ai-analysis/  # AI分析
│   ├── ai-content/   # AI内容创作
│   ├── ai-identity/  # 创作者身份
│   ├── ai-qa/        # 问答查询
│   ├── ai-scripts/   # 脚本库
│   ├── ai-topics/    # 选题策划
│   ├── ai-topic-library/ # 选题库
│   ├── customers/    # 客户列表
│   └── report-submit/ # 报告提交
└── api/              # API routes
    ├── admin/        # Admin APIs
    └── store/        # Store APIs
```

## Key Path Aliases
- `@/*` → `./src/*`

## Icon Library
- Icons are exported from `src/lib/icons.ts` (local re-export of lucide-react)
- **DO NOT** import icons directly from `lucide-react` - use `@/lib/icons` instead
- Available icons: LayoutDashboard, Store, Users, User, BookOpen, Settings, FileText, ScrollText, Search, Plus, Eye, EyeOff, Trash2, Copy, Pencil, Edit, Phone, Lock, MessageSquare, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, ChevronDown, Send, Bot, Sparkles, Heart, Leaf, Upload, Download, RefreshCw, FileSpreadsheet, CheckCircle, CheckCheck, Database, Play, Loader2, Save, X, XIcon, Calendar, BrainCircuit, Printer, Star, Check, Target, ClipboardList, CalendarClock, Utensils, Moon, Dumbbell, ArrowLeft, Wand2, Zap, MessageCircle, Briefcase, Library, Menu, Home, MessageCircleQuestion, Clapperboard, LogOut, Lightbulb, Link, Filter, SlidersHorizontal

## Important Notes
1. **App Router**: This project uses Next.js 15 with the App Router pattern. Page components are server/client components as defined.
2. **Authentication**: Uses Zustand store (`src/stores/auth.store.ts`) for auth state. Two roles: `admin` and `store_user`.
3. **Database**: Prisma ORM with SQLite. Run `npm run db:push` to set up database schema.
4. **UI Components**: Uses shadcn/ui components from `src/components/ui/`.
5. **AI Integration**: OpenAI API integration in `src/lib/openai.ts`.
6. **State Management**: Zustand stores in `src/stores/`.

## Scripts
- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run db:generate` - Generate Prisma client
- `npm run db:push` - Push schema to database
- `npm run db:migrate` - Run migrations
- `npm run db:seed` - Seed database with sample data

## Security
- Passwords are hashed using bcryptjs
- API routes validate authentication via auth store
- Never expose API keys or secrets in client-side code

## Best Practices
1. Use `useAuthStore()` for authentication state
2. Follow Next.js App Router conventions
3. Use shadcn/ui components for consistency
4. Keep API keys in environment variables
5. Validate all user inputs
6. Use TypeScript strict mode

## Coding Principles (Ponytail - Lazy Senior Dev Mode)
You are a lazy senior developer. Lazy means efficient, not careless. Before writing any code, stop at the first rung that holds:
1. **Does this need to exist at all?** (YAGNI) - Skip speculative features
2. **Already in this codebase?** Reuse existing helpers, utils, or patterns instead of rewriting
3. **Stdlib does it?** Use standard library instead of custom code
4. **Native platform feature covers it?** Use `<input type="date">` over a picker lib, CSS over JS, DB constraint over app code
5. **Already-installed dependency solves it?** Use it - never add new dependencies for what a few lines can do
6. **Can it be one line?** Make it one line
7. **Only then:** Write the minimum code that works

### Rules
- No unrequested abstractions (no interface with one implementation, no factory for one product)
- No boilerplate "for later" - later can scaffold for itself
- Deletion over addition. Boring over clever. Fewest files possible.
- Shortest working diff wins, but only once you understand the problem
- Mark deliberate simplifications with `// ponytail: [reason]` comments naming the ceiling and upgrade path
- Bug fix = root cause, not symptom - fix at the shared function level

### When NOT to be lazy
- Input validation at trust boundaries
- Error handling that prevents data loss
- Security measures
- Accessibility basics
- Anything explicitly requested by the user

### Output Style
Code first. Then at most three short lines explaining what was skipped and when to add it.
Pattern: `[code] → skipped: [X], add when [Y].`
<!-- END:nextjs-agent-rules -->