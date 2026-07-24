# demo账号开发

日期：2026-07-24

## 背景

本次开发目标是在同一套系统、同一个数据库中增加“投资人演示模式”。真实 admin 登录后只看真实数据；demo admin 登录后只看虚拟演示数据，并且不能修改真实业务数据或敏感系统配置。

演示账号最终确定为：

- 管理员账号：`admin003`
- 默认密码：`Demo@123456`
- 默认批次：`DEMO_INVESTOR_V1`

## 方案原则

1. 不拆分数据库，不新建独立演示系统。
2. 使用 `isDemo` 和 `demoBatchId` 标识演示数据。
3. 真实 admin 和 demo admin 在同一套 admin 端登录，但数据范围隔离。
4. demo admin 只读，禁止写操作、导入、上传、密码重置、系统设置修改、备份导出等敏感能力。
5. 首页展示数字可用模拟配置，不依赖真实明细数量。
6. CSV 明细只用于支撑列表和详情页，允许一张一张分批导入。

## 数据库变更

在 Prisma schema 中新增 demo 标识字段：

- `Admin`
  - `isDemo Boolean @default(false)`
  - `demoBatchId String?`
  - 增加 `isDemo`、`demoBatchId` 索引
- `StoreUser`
  - `isDemo Boolean @default(false)`
  - `demoBatchId String?`
  - 增加 `isDemo`、`demoBatchId` 索引
- `Store`
  - `isDemo Boolean @default(false)`
  - `demoBatchId String?`
  - 增加 `isDemo`、`demoBatchId` 索引

核心文件：

- `prisma/schema.prisma`

## 登录与 Session

admin 登录链路增加 demo 信息传递：

- 登录成功后把 `isDemo`、`demoBatchId` 写入 session/cookie。
- `/api/auth/me` 返回 `isDemo`、`demoBatchId`。
- 前端 auth store、auth guard、auth service 同步扩展 demo 字段。
- admin 端可基于 `isDemo` 显示“演示模式”标签，并控制菜单与访问权限。

核心文件：

- `app/api/auth/login/route.ts`
- `app/api/auth/me/route.ts`
- `src/lib/session.ts`
- `src/lib/auth-cookie.ts`
- `src/services/auth.service.ts`
- `src/stores/auth.store.ts`
- `src/hooks/use-auth-guard.ts`
- `src/components/login/LoginForm.tsx`

## 权限隔离

新增后端 demo 权限 helper：

- 判断当前 admin 是否为 demo admin。
- 给 store 相关查询自动加 demo 数据范围。
- demo admin 只能访问 `Store.isDemo = true` 且同 `demoBatchId` 的数据。
- 真实 admin 默认过滤掉 demo 数据，只看真实数据。
- demo admin 的写操作统一拒绝，返回 403。

中间件和 API 规则：

- demo admin 访问 `/admin/demo-data` 会被重定向或禁止。
- demo admin 对 `/api/admin/*` 的非 GET 请求被阻止。
- 敏感 API 对 demo admin 禁止访问或禁止写入。

核心文件：

- `src/lib/auth.ts`
- `middleware.ts`

## Admin 数据范围收口

对 admin 端多类接口增加真实/admin 与 demo/admin 的数据范围隔离：

- 门店管理
- 门店用户可用性
- 客户列表与客户详情
- 客户报告
- 调理方案
- 身体记录
- AI 分析
- 月经助手会话与消息
- 短视频选题/脚本
- 登录日志
- 操作日志
- 首页统计
- 管理员账号等敏感模块

核心文件：

- `app/api/admin/stores/route.ts`
- `app/api/admin/stores/[id]/route.ts`
- `app/api/admin/store-users/available/route.ts`
- `app/api/admin/customers/route.ts`
- `app/api/admin/customers/[id]/route.ts`
- `app/api/admin/reports/route.ts`
- `app/api/admin/reports/[id]/route.ts`
- `app/api/admin/reports/customer/[customerId]/route.ts`
- `app/api/admin/plans/route.ts`
- `app/api/admin/plans/[id]/route.ts`
- `app/api/admin/plan-records/customer/[customerId]/route.ts`
- `app/api/admin/body-records/route.ts`
- `app/api/admin/body-records/[id]/route.ts`
- `app/api/admin/ai-analysis/route.ts`
- `app/api/admin/menstrual-chat/sessions/route.ts`
- `app/api/admin/menstrual-chat/sessions/[sessionId]/route.ts`
- `app/api/admin/ai-scripts/route.ts`
- `app/api/admin/login-logs/route.ts`
- `app/api/admin/operation-logs/route.ts`
- `app/api/admin/admins/route.ts`

## Admin 菜单与页面

admin 端侧边栏增加“演示数据导入”入口，只给真实 admin 使用。

demo admin 侧：

- 隐藏敏感菜单。
- 禁止进入演示数据导入页。
- 系统设置、AI Key、管理员账号、备份导出等敏感模块不开放。

核心文件：

- `app/admin/layout.tsx`

## Demo 首页模拟数据

demo admin 首页不再依赖真实明细数量，而是读取模拟看板配置。

新增配置文件逻辑：

- 配置文件路径：`scripts/demo-data/dashboard-config.json`
- 管理页面可填写首页总览数字：
  - 门店总数
  - 客户总数
  - 方案总数
  - 进行中方案
  - 客户报告
  - AI 分析
  - 脚本记录
  - 选题
  - 知识库
  - 问答库
  - 提示词
  - 学习资源
  - 月经会话
  - 月经消息
- 管理页面可填写 7 日数据趋势总量：
  - 登录次数
  - 操作次数
  - AI 分析次数
  - 聊天消息
- 系统会把趋势总量自动分布到最近 7 天。

真实 admin 首页仍按真实数据库统计。

核心文件：

- `src/lib/demo-dashboard.ts`
- `app/api/admin/stats/route.ts`
- `app/admin/page.tsx`
- `app/admin/demo-data/page.tsx`

## CSV 导入页面

新增 admin 端演示数据导入页：

- 页面路径：`/admin/demo-data`
- API 路径：`/api/admin/demo-data/import`
- 上传文件保存路径：`scripts/demo-data/`
- 页面只允许真实 admin 访问。
- demo admin 看不到该入口，也不能调用导入 API。

页面支持四张表分别导入，每张表一个独立导入按钮：

- `stores.csv`：门店表
- `customers.csv`：客户表
- `service-records.csv`：服务记录表
- `video-scripts.csv`：短视频文案表

也保留“导入全部已选择表”按钮，方便一次性上传多张。

表头已改为中文，便于直接在 Excel 中编辑。

核心文件：

- `app/admin/demo-data/page.tsx`
- `app/api/admin/demo-data/import/route.ts`
- `scripts/demo-data/README.md`
- `scripts/demo-data/stores-template.csv`
- `scripts/demo-data/customers-template.csv`
- `scripts/demo-data/service-records-template.csv`
- `scripts/demo-data/video-scripts-template.csv`

## CSV 编码处理

导入 API 增加 CSV 编码兼容：

- 支持 UTF-8。
- 支持 Excel 常见的 ANSI/GBK/GB18030。
- 上传后统一保存为 UTF-8。
- 会校验关键表头，表头识别失败时返回明确错误。

修复过的问题：

- 使用 `XLSX.read(buffer)` 读取 UTF-8 CSV 时，中文表头可能被解析成乱码，导致无法匹配 `门店编号`、`门店名称`，最终走了“xx演示店”的兜底生成逻辑。
- 已改成先按 UTF-8 文本读取，再用 `XLSX.read(content, { type: 'string' })` 解析。

## Seed 与 Reset 脚本

新增脚本：

- `scripts/seed-demo-data.ts`
- `scripts/reset-demo-data.ts`

新增 package 命令：

- `npm run demo:seed`
- `npm run demo:reset`

seed 默认能力：

- 创建 demo admin：`admin003`
- 创建 demo store user
- 创建 demo store
- 可生成客户、报告、调理方案、身体记录、AI 分析、聊天会话、聊天消息、短视频选题、脚本记录、登录日志、操作日志
- 可读取 `scripts/demo-data` 下 CSV 文件，优先用 CSV 内容

新增轻量模式：

- `generateMissing: false`
- `createLogs: false`

后台导入页现在使用轻量模式：

- 上传哪张表，就按当前已上传 CSV 处理哪类数据。
- 不再因为缺少客户表、服务记录表、短视频文案表而自动生成大量默认数据。
- 当前适合用户“一张一张补数据、分批导入、需要时一次清空”的使用方式。

CLI 仍可通过环境变量控制：

```bash
DEMO_GENERATE_MISSING=false DEMO_CREATE_LOGS=false npm run demo:seed
```

## 清空演示数据

新增“一次清空”能力：

- 页面按钮：`清空演示数据`
- API 路径：`/api/admin/demo-data/reset`
- 只删除当前 demo batch：
  - demo admin
  - demo store user
  - demo store
  - 关联客户、报告、方案、身体记录、AI 分析、聊天会话、短视频选题、脚本等级联数据
  - demo 登录日志、demo 操作日志
- 不影响真实 admin、真实门店、真实客户。

核心文件：

- `app/api/admin/demo-data/reset/route.ts`
- `scripts/reset-demo-data.ts`
- `app/admin/demo-data/page.tsx`

## 当前导入状态

本轮最终已把用户上传的门店 CSV 重新导入。

当前文件：

- `scripts/demo-data/stores.csv`

当前验证结果：

- demo 门店数量：`550`
- demo 客户数量：`0`
- 前几条 demo 门店已正确变为用户 CSV 内容：
  - 骄阳兰多大邑店
  - 骄阳兰多广安店
  - 骄阳兰多合江店
  - 骄阳兰多叙永店
  - 骄阳兰多广汉店

说明：

- 当前客户、服务记录、短视频文案尚未导入，所以相关数量为 0。
- 后续按页面顺序继续导入客户表、服务记录表、短视频文案表即可。

## 门店列表 100 条限制修正

后续检查发现：demo 门店实际已经导入 550 家，但 admin 门店管理页只能看到 100 家。

原因：

- `app/api/admin/stores/route.ts` 中接口把 `pageSize` 限制为最大 100。
- `app/admin/stores/page.tsx` 中前端固定请求 `/api/admin/stores?pageSize=100`。
- 门店页前端再做本地分页，因此只能分页展示已拉取到的前 100 家。

处理：

- 将门店接口最大 `pageSize` 放大到 `5000`。
- 将门店管理页请求改为 `/api/admin/stores?pageSize=5000`。
- 当前 550 家 demo 门店可全部拉取，再由页面现有分页组件分多页展示。

说明：

- 这个改动解决当前“门店数据有限，需要全部生成/全部展示”的场景。
- 如果未来门店数量达到几万级，建议改成真正的服务端分页和服务端搜索，而不是一次性拉取全部门店。

## demo 账号界面弱提示调整

后续要求 demo 账号登录后不要显示“演示模式”四个字。admin 端大部分页面入口保留，但“演示数据导入”只给真实 admin 使用，demo 账号需要隐藏。

处理：

- 移除 admin 侧边栏顶部的“演示模式”标签。
- demo 账号侧边栏只隐藏“演示数据导入”入口，其他 admin 页面入口继续显示。
- middleware 对 demo 账号直接访问 `/admin/demo-data` 做重定向，跳回 `/admin`。
- 保留后端 API 权限限制：
  - demo 账号非 GET 写操作仍返回 403。
  - 敏感 admin API 仍返回 403。
  - 写操作和敏感误点统一返回“无权限”。
- 演示数据导入页说明文案从 `demo admin 首页` 调整为更中性的“演示首页”。

说明：

- 该调整只改变前端可见性和错误文案，不放开真实写权限。
- 演示数据导入页和导入 API 仍然只允许真实 admin 使用。
- 真实 admin / demo admin 的数据隔离规则保持不变。

## 使用流程

推荐操作流程：

1. 真实 admin 登录。
2. 进入系统管理下的“演示数据导入”。
3. 先点“清空演示数据”，清掉上一批 demo 数据。
4. 上传并导入门店表。
5. 上传并导入客户表。
6. 上传并导入服务记录表。
7. 上传并导入短视频文案表。
8. 在同一页面填写首页模拟总览和 7 日趋势次数。
9. 点击“保存首页模拟数据”。
10. 使用 `admin003` 登录检查 demo 首页、列表和详情。

## 验证记录

本轮执行过的验证：

- `npx tsc --noEmit`：通过。
- `npm run build`：通过。
- demo 导入轻量模式执行成功。
- 数据库抽查 demo 门店，确认已使用用户上传 CSV 内容，不再是兜底演示店名称。
- 本地 dev server 保持运行在 `http://localhost:3001`。

构建备注：

- `npm run build` 时存在 `formidable` 相关 warning，来源于 `wechatpay-node-v3` 动态依赖提示，不是本次 demo 功能引入的问题。

## 注意事项

1. 后台导入页不会长期保存上传文件副本到 uploads 目录，而是把四张标准 CSV 固定保存到 `scripts/demo-data/`。
2. 如果上传 `stores-template.csv`，系统会把内容保存为正式文件 `stores.csv`。
3. 客户表里的 `门店编号` 必须能对应门店表里的 `门店编号`，例如 `JYLD001`。
4. 服务记录表里的 `客户编号` 必须能对应客户表里的 `客户编号`。
5. 短视频文案表里的 `门店编号` 必须能对应门店表里的 `门店编号`。
6. demo 首页数字由 `dashboard-config.json` 控制，不代表明细表真实条数。
7. demo admin 首页、列表和详情只看 demo 数据；真实 admin 只看真实数据。
8. 对投资人演示时，口径建议使用“模拟运营沙盘/演示数据”，不要声明为真实用户量。

## 后续可选优化

- 给导入结果增加更细的错误行提示。
- 每张 CSV 导入后返回新增、跳过、无关联数量。
- 支持导入时不清空已有 demo 数据，改为追加或 upsert。
- 为门店、客户、服务、短视频分别增加单独清空按钮。
- 增加 CSV 模板下载按钮。
- 给 demo admin 页面加更明显的“演示模式”视觉标记。
