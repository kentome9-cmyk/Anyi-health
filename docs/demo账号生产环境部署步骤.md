# demo账号生产环境部署步骤

适用场景：生产环境已经有真实业务数据，需要上线 demo admin、demo 数据隔离、演示数据导入功能。

## 重要原则

1. 生产已有数据，必须先备份数据库。
2. 不要在生产环境直接执行清空或重置命令。
3. 本次数据库变更理论上只新增字段和索引，不应删除真实数据。
4. 真实 admin 只看真实数据，demo admin 只看演示数据。
5. 演示数据导入只允许真实 admin 操作。
6. demo 账号不能写入、删除、导入、修改设置或访问敏感 API。

## 一、上线前准备

### 1. 确认当前生产目录

当前 PM2 配置中的项目目录为：

```bash
/www/wwwroot/anyiai
```

进入服务器项目目录：

```bash
cd /www/wwwroot/anyiai
```

### 2. 备份生产数据库

上线前必须完整备份生产数据库。

建议备份整库，不只备份三张表。

当前 Prisma 配置使用 PostgreSQL：

```prisma
provider = "postgresql"
```

#### 方式 A：使用 DATABASE_URL 备份，推荐

进入项目目录：

```bash
cd /www/wwwroot/anyiai
```

创建备份目录：

```bash
mkdir -p /www/backup/anyiai-db
```

从 `.env` 读取 `DATABASE_URL` 并备份为 PostgreSQL 自定义格式：

```bash
set -a
source .env
set +a
pg_dump "$DATABASE_URL" -Fc -f "/www/backup/anyiai-db/anyiai_$(date +%F_%H%M%S).dump"
```

说明：

- `-Fc` 是 PostgreSQL custom 格式，适合后续用 `pg_restore` 恢复。
- 文件示例：`/www/backup/anyiai-db/anyiai_2026-07-24_153000.dump`
- 这是推荐格式，体积相对小，恢复更灵活。

#### 方式 B：备份为普通 SQL 文件

如果你更习惯 SQL 文件，可以执行：

```bash
set -a
source .env
set +a
pg_dump "$DATABASE_URL" -f "/www/backup/anyiai-db/anyiai_$(date +%F_%H%M%S).sql"
```

SQL 文件恢复更直观，但大库体积会更大。

#### 方式 C：用主机、端口、账号单独备份

如果服务器无法直接用 `DATABASE_URL`，可以用下面格式：

```bash
PGPASSWORD='数据库密码' pg_dump \
  -h 127.0.0.1 \
  -p 5432 \
  -U 数据库用户名 \
  -d 数据库名 \
  -Fc \
  -f "/www/backup/anyiai-db/anyiai_$(date +%F_%H%M%S).dump"
```

把下面内容替换成真实值：

- `数据库密码`
- `数据库用户名`
- `数据库名`
- `127.0.0.1`
- `5432`

#### 验证备份文件

备份后检查文件是否生成：

```bash
ls -lh /www/backup/anyiai-db/
```

如果是 `.dump` 文件，可以查看备份内容：

```bash
pg_restore -l /www/backup/anyiai-db/你的备份文件.dump | head
```

#### 恢复命令示例

如果使用 `.dump` 文件恢复：

```bash
pg_restore --clean --if-exists --no-owner --dbname "$DATABASE_URL" /www/backup/anyiai-db/你的备份文件.dump
```

如果使用 `.sql` 文件恢复：

```bash
psql "$DATABASE_URL" -f /www/backup/anyiai-db/你的备份文件.sql
```

注意：

- 恢复命令会影响当前数据库，生产环境不要随便执行。
- 真要恢复前，先停止应用或进入维护窗口。
- 最好先把备份恢复到测试库验证备份可用。

至少需要确认以下数据可恢复：

- 真实 admin
- 真实门店
- 真实门店账号
- 真实客户
- 客户报告
- 调理方案
- 身体记录
- AI 分析
- 聊天会话
- 短视频选题/脚本
- 系统设置

备份完成后，记录：

- 备份文件路径
- 备份时间
- 数据库名
- 恢复方式

### 3. 不要执行危险命令

生产环境上线前不要执行：

```bash
npm run demo:reset
```

也不要手动删除 demo 或真实业务表。

`demo:reset` 只应在确认 demo 字段已经存在，并且明确只清理 demo 批次时使用。

## 二、建议先在测试库演练

如果条件允许，先把生产数据库备份恢复到测试库。

在测试环境执行：

```bash
npm install
npx prisma generate
npx prisma db push
npm run build
```

测试通过后再上生产。

测试环境需要重点确认：

- 真实 admin 登录正常。
- 真实门店列表正常。
- 真实客户列表正常。
- 报告、方案、身体记录、AI 分析等页面正常。
- 新增、编辑、删除真实数据正常。
- demo admin 只能看到 demo 数据。

## 三、用 GitHub 仓库更新代码

如果生产环境是 GitHub 仓库形式，推荐用 `git pull` 更新代码，不建议手动覆盖文件。

生产目录：

```bash
/www/wwwroot/anyiai
```

### 1. 如果生产目录已经是 Git 仓库

进入生产目录：

```bash
cd /www/wwwroot/anyiai
```

查看当前分支和远程仓库：

```bash
git branch
git remote -v
```

查看当前是否有未提交改动：

```bash
git status
```

如果生产服务器目录有未提交改动，先不要直接 `git pull`，需要确认这些改动是否要保留。正常生产目录应该保持干净：

```text
working tree clean
```

拉取最新代码，假设生产分支是 `main`：

```bash
git fetch origin
git pull origin main
```

如果你的生产分支不是 `main`，例如 `master` 或 `prod`，把命令里的 `main` 改成真实分支：

```bash
git pull origin master
```

或：

```bash
git pull origin prod
```

建议拉取后记录当前 commit：

```bash
git rev-parse --short HEAD
git log -1 --oneline
```

如果需要固定部署某个版本，可以先在本地合并好并打 tag，生产环境拉 tag 或指定 commit。普通上线建议使用稳定分支。

### 2. 如果生产目录还不是 Git 仓库

先不要覆盖已有生产目录。建议先改名保留旧目录：

```bash
mv /www/wwwroot/anyiai /www/wwwroot/anyiai_backup_$(date +%F_%H%M%S)
```

然后重新 clone GitHub 仓库：

```bash
git clone 你的GitHub仓库地址 /www/wwwroot/anyiai
cd /www/wwwroot/anyiai
```

例如：

```bash
git clone git@github.com:你的账号/你的仓库.git /www/wwwroot/anyiai
```

如果服务器没有配置 SSH Key，也可以用 HTTPS 地址：

```bash
git clone https://github.com/你的账号/你的仓库.git /www/wwwroot/anyiai
```

clone 后切换到生产分支：

```bash
git checkout main
```

如果生产分支不是 `main`，换成真实分支名。

然后把旧目录里的 `.env` 复制回来：

```bash
cp /www/wwwroot/anyiai_backup_时间戳/.env /www/wwwroot/anyiai/.env
```

注意：

- `.env` 一般不要提交到 GitHub。
- 旧目录不要马上删除，确认新版本运行稳定后再清理。
- 如果生产目录里有 `.uploads`、上传资源、日志等本地文件，也要按实际情况迁移。

需要确保以下新增或修改内容已上传：

```text
prisma/schema.prisma
middleware.ts
app/admin/layout.tsx
app/admin/page.tsx
app/admin/demo-data/
app/api/admin/demo-data/
app/api/admin/stats/route.ts
app/api/auth/login/route.ts
app/api/auth/me/route.ts
src/lib/auth.ts
src/lib/auth-cookie.ts
src/lib/session.ts
src/lib/demo-dashboard.ts
src/services/auth.service.ts
src/stores/auth.store.ts
src/hooks/use-auth-guard.ts
scripts/seed-demo-data.ts
scripts/reset-demo-data.ts
scripts/demo-data/
package.json
```

## 四、配置环境变量

检查生产 `.env`。

必须有：

```env
DATABASE_URL=你的生产数据库连接
SESSION_SECRET=至少32位随机字符串
```

建议新增：

```env
DEMO_BATCH_ID=DEMO_INVESTOR_V1
DEMO_ADMIN_USERNAME=admin003
DEMO_ADMIN_PASSWORD=请改成生产安全密码
```

如果不配置 `DEMO_ADMIN_PASSWORD`，默认密码是：

```text
Demo@123456
```

生产环境建议不要使用默认密码。

## 五、安装依赖并生成 Prisma Client

在生产项目目录执行：

```bash
cd /www/wwwroot/anyiai
npm install
npx prisma generate
```

## 六、同步数据库结构

本项目当前没有 `prisma/migrations` 目录，因此这次通常使用：

```bash
npx prisma db push
```

执行前必须确认已经备份数据库。

本次期望的数据库变化是：

- `admin` 表新增：
  - `isDemo`
  - `demoBatchId`
- `store_user` 表新增：
  - `isDemo`
  - `demoBatchId`
- `store` 表新增：
  - `isDemo`
  - `demoBatchId`
- 增加对应索引

已有真实数据应保持：

- `isDemo = false`
- `demoBatchId = null`

执行后建议检查数据库字段是否存在。

## 七、构建项目

执行：

```bash
npm run build
```

如果构建成功，再继续重启。

如果构建失败，不要重启生产服务，先回滚代码或修复问题。

## 八、重启服务

当前项目 PM2 应用名为：

```text
anyi-health
```

重启：

```bash
pm2 restart anyi-health
```

如果是首次启动：

```bash
npm run start:pm2
```

查看日志：

```bash
pm2 logs anyi-health
```

或查看配置中的日志文件：

```text
/www/wwwlogs/anyiai-error.log
/www/wwwlogs/anyiai-out.log
```

## 九、导入 demo 数据

推荐使用后台页面导入。

操作账号：真实 admin。

步骤：

1. 真实 admin 登录后台。
2. 进入 `系统管理 -> 演示数据导入`。
3. 先确认当前没有误操作真实数据。
4. 上传门店表。
5. 上传客户表。
6. 上传服务记录表。
7. 上传短视频文案表。
8. 填写首页模拟总览数据。
9. 填写 7 日趋势数据。
10. 点击保存或导入。

demo 账号 `admin003` 登录后：

- 看不到“演示数据导入”入口。
- 直接访问 `/admin/demo-data` 会跳回 `/admin`。

## 十、可选：命令行导入 demo 数据

如果不用后台页面，也可以用命令导入。

先把 CSV 文件放到：

```text
scripts/demo-data/
```

正式文件名：

```text
stores.csv
customers.csv
service-records.csv
video-scripts.csv
```

再执行轻量导入。

Linux 写法：

```bash
DEMO_GENERATE_MISSING=false DEMO_CREATE_LOGS=false npm run demo:seed
```

如果服务器 shell 不支持这种写法，可先设置环境变量，或直接使用后台导入页面。

注意：

- 生产环境不要随意执行 `npm run demo:reset`。
- 如果需要清空 demo 数据，优先在后台页面由真实 admin 操作，并确认只影响 demo 批次。

## 十一、上线后验收

### 1. 真实 admin 验收

真实 admin 登录后检查：

- 首页统计是生产真实数据。
- 门店管理只显示真实门店。
- 客户管理只显示真实客户。
- 报告、方案、身体记录、AI 分析正常。
- 新增、编辑、删除正常。
- 可以看到“演示数据导入”入口。
- 可以进入演示数据导入页面。

### 2. demo admin 验收

用 demo 账号登录：

```text
admin003
```

检查：

- 不显示“演示模式”四个字。
- 不显示“演示数据导入”入口。
- 直接访问 `/admin/demo-data` 会跳回首页。
- 首页显示模拟总览和 7 日趋势。
- 门店管理只显示 demo 门店。
- 客户管理只显示 demo 客户。
- 访问真实数据 ID 应返回 403 或 404。
- 新增、编辑、删除、导入、上传、修改设置等操作提示“无权限”。
- 不泄露 AI Key、系统配置、管理员列表、备份数据。

### 3. 数据库验收

检查真实数据：

- 真实门店 `isDemo=false`
- 真实门店不带 demo batch
- 真实客户仍关联真实门店

检查 demo 数据：

- demo admin `isDemo=true`
- demo store user `isDemo=true`
- demo store `isDemo=true`
- demo 数据 `demoBatchId=DEMO_INVESTOR_V1`

## 十二、回滚方案

如果上线后出现问题：

1. 先停止继续导入 demo 数据。
2. 回滚代码到上一版。
3. 重新构建：

```bash
npm run build
pm2 restart anyi-health
```

4. 如果数据库结构导致问题，根据上线前备份恢复数据库。

注意：

- 新增字段通常不会影响旧代码读取。
- 如果只是页面或权限逻辑问题，优先回滚代码，不一定需要恢复数据库。
- 如果真实数据被误改，必须使用上线前备份恢复。

## 十三、上线检查清单

上线前：

- [ ] 已完整备份生产数据库
- [ ] 已记录备份文件路径
- [ ] 已在测试库演练
- [ ] `.env` 已配置 `SESSION_SECRET`
- [ ] `.env` 已配置 demo 账号密码
- [ ] 最新代码已上传

上线中：

- [ ] `npm install` 成功
- [ ] `npx prisma generate` 成功
- [ ] `npx prisma db push` 成功
- [ ] `npm run build` 成功
- [ ] `pm2 restart anyi-health` 成功

上线后：

- [ ] 真实 admin 登录正常
- [ ] 真实数据正常显示
- [ ] demo admin 登录正常
- [ ] demo 数据隔离正常
- [ ] demo 写操作提示“无权限”
- [ ] demo 看不到“演示数据导入”
- [ ] 服务器日志无明显错误
