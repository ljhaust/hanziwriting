# 汉字书写与古诗背诵平台

本仓库只保留两个用户入口：

- 管理端：Vue 3 + Vite + Element Plus，用于用户、汉字、古诗、任务和练习记录管理。
- 微信小程序端：原生微信小程序，用于学生查看任务、练字、背诗和查看练习记录。

两端均通过 Spring Boot REST API 访问 MySQL。前端不包含 mock 集合、失败本地兜底或本地业务记录；接口失败会显示错误，练习记录只有在后端持久化成功后才会显示。笔顺轨迹也由后端从 MySQL 读取，小程序不会直接请求第三方 CDN。

## 架构与数据链路

```text
管理端浏览器 ── HTTP/JSON ──┐
                            ├── Spring Boot API ── JPA ── MySQL
原生微信小程序 ─ HTTP/JSON ──┘
```

主要数据链路：

1. 管理端或小程序启动后请求 `GET /api/bootstrap`。
2. 后端通过 JPA 查询用户、汉字、古诗、任务和练习记录表并返回聚合 JSON。
3. 管理端的新增、状态修改和删除操作调用对应写接口，成功响应来自已持久化实体。
4. 小程序提交练字或背诗结果时调用 `POST /api/records`，仅在接口成功后更新记录页。
5. 小程序演示或校验笔顺时调用 `GET /api/hanzi/{characterText}/strokes`，轨迹来自 `hanzi_character` 表中的 JSON 字段。

## 调用链路与代码位置

一次「前端 → 后台 → 数据库」的请求在各层都有明确的代码入口，便于排查与扩展。

**管理端读取数据**

```text
AdminDashboard.vue                     展示 platform.users / hanziDb 等响应式集合
   └─ usePlatformState.js#reload       调用 fetchBootstrapData；失败时清空集合并写入 loadError
        └─ src/api/client.js#request   拼接 VITE_API_BASE_URL + /api/bootstrap，统一超时与错误归一
             └─ HTTP GET /api/bootstrap
                  └─ PlatformController#bootstrap
                       └─ PlatformService#bootstrap   @Transactional(readOnly = true)
                            └─ 五个 JpaRepository#findAll
                                 └─ MySQL：user_account / hanzi_character / poem / practice_task / practice_record
```

**小程序读取数据**

```text
pages/index/index.js#loadBootstrapData      设置 bootstrapLoading，成功后 syncDerivedState
   └─ utils/api.js#fetchBootstrapData       GET /api/bootstrap 后 normalizeBootstrapData 归一字段
        └─ utils/api.js#requestJson         wx.request，地址取 app.js 的 globalData.apiBaseUrl
             └─ HTTP GET /api/bootstrap
                  └─ 同一后端控制器 → JPA → MySQL
```

**三条主链路时序**

- **首屏加载**：两端启动 → `GET /api/bootstrap` → 五集合 → 渲染列表。
- **写操作**（新增 / 状态切换 / 删除）：前端调用对应写接口 → 后端持久化 → 返回已保存实体 → 前端以响应更新本地集合，不本地造数。
- **笔顺演示 / 纠错**：小程序 `utils/api.js#fetchStrokeGuide` → `GET /api/hanzi/{字}/strokes` → 后端解析数据库三列 JSON → 小程序 Canvas 绘制。

## 目录结构

```text
.
├── backend/                         Spring Boot 后端
│   └── src/main/
│       ├── java/com/example/hanzi/  控制器、服务、实体、仓储和配置
│       └── resources/
│           ├── application.yml      公共配置
│           ├── application-local.yml 本地 profile 配置
│           └── db/mysql/             MySQL 建表与可选种子数据
├── frontend/                        Vue 管理端
│   ├── src/api/                     管理端 REST 请求封装
│   ├── src/modules/admin/           管理端页面
│   └── wechat-miniprogram/          微信开发者工具原生小程序工程
└── README.md
```

`frontend/src` 只承载管理端，访问根路径或未知路径都会进入 `/admin`。学生侧只使用 `frontend/wechat-miniprogram`，不再提供 PC 学习端或浏览器版小程序。

## 环境要求

- JDK 8
- Maven 3.8+
- MySQL 8.0+
- Node.js 20+ 与 npm
- 微信开发者工具（建议使用项目配置中的最新基础库）

可先检查本机版本：

```bash
java -version
mvn -version
mysql --version
node --version
npm --version
```

## 1. 初始化 MySQL

建表脚本会创建并选择 `hanzi_writing` 数据库：

```bash
mysql -u root -p < backend/src/main/resources/db/mysql/schema.sql
```

如需一套用于本地联调的数据，可选择导入种子脚本。种子数据会真正写入 MySQL，不是前端 mock：

```bash
mysql -u root -p hanzi_writing < backend/src/main/resources/db/mysql/seed.sql
```

生产环境不要导入 `seed.sql`。后端不会在启动时自动写入演示数据；如果数据库结构升级，应重新核对 `schema.sql` 中的新增字段后执行迁移，不要依赖前端构造缺失字段。

笔顺功能要求每个可练习汉字在 `hanzi_character` 表中同时配置以下三列：

- `strokes_json`：Hanzi Writer SVG 笔画路径 JSON 数组；
- `medians_json`：与笔画顺序对应的中线坐标 JSON 数组；
- `rad_strokes_json`：部首笔画索引 JSON 数组。

三列必须是合法 JSON 数组，并且 `strokes_json` 与 `medians_json` 的笔画数量及顺序一致。任一列为空、JSON 无效或汉字不存在时，笔顺接口会返回错误，不会请求 CDN 或构造轨迹兜底。应通过受控的数据导入脚本或管理流程写入这些列，不要把大段轨迹重新硬编码到小程序。

## 2. 配置并启动后端

不要把数据库密码写入仓库。首次本地调试时复制配置示例，并只在被 Git 忽略的
`backend/.env.local` 中填写本机连接信息：

```bash
cd backend
cp .env.local.example .env.local
# 编辑 .env.local，替换数据库账号、密码以及需要使用的微信 Secret
```

`local` profile 会在每次启动时自动读取该文件，不需要重复执行 `export`。从
`backend` 目录启动或从仓库根目录使用 `mvn -f backend/pom.xml ...` 启动均可加载。
系统环境变量的优先级更高，仍可用于临时覆盖本地文件中的同名配置。

启动后端：

```bash
cd backend
MAVEN_OPTS='-Dfile.encoding=UTF-8' mvn spring-boot:run
```

默认端口为 `8080`。如需长期修改，直接调整 `backend/.env.local` 中的
`SERVER_PORT`；如需单次覆盖，也可在启动前设置同名环境变量。

常用环境变量：

| 环境变量 | 用途 | 建议 |
| --- | --- | --- |
| `HANZI_DB_URL` | MySQL JDBC 地址 | 明确数据库名、时区和字符集 |
| `HANZI_DB_USERNAME` | MySQL 用户名 | 使用最小权限账号 |
| `HANZI_DB_PASSWORD` | MySQL 密码 | 只写入被 Git 忽略的本地配置、环境变量或密钥服务 |
| `HANZI_CORS_ALLOWED_ORIGINS` | 管理端浏览器来源白名单 | 多个来源用英文逗号分隔 |
| `SERVER_PORT` | 后端监听端口 | 默认 `8080` |

后端启动后可先验证聚合接口：

```bash
curl -i http://127.0.0.1:8080/api/bootstrap
```

正常情况下应返回 HTTP 200 和 JSON；空库应返回空集合，不应由前端补演示数据。

## 3. 启动管理端

安装依赖：

```bash
cd frontend
npm install
```

首次使用时从示例创建仅用于本机的 `frontend/.env.local`，后续启动会由 Vite 自动读取：

```bash
cd frontend
cp .env.local.example .env.local
```

启动开发服务：

```bash
npm run dev
```

浏览器访问 `http://localhost:5173/admin`。管理端请求封装位于 `frontend/src/api/client.js`：

- 配置 `VITE_API_BASE_URL` 时，请求发送到该后端根地址。
- 未配置时使用同源地址，例如页面请求 `/api/bootstrap`；生产环境可由 Nginx 将 `/api` 反向代理到 Spring Boot。
- 接口超时、非 2xx 或无效 JSON 都会抛出明确错误，页面不会切换到 mock 数据。

若管理端与后端不同源，后端的 `HANZI_CORS_ALLOWED_ORIGINS` 必须包含管理端的完整来源（协议、域名和端口）。

## 4. 配置并运行微信小程序

在微信开发者工具中导入以下目录：

```text
frontend/wechat-miniprogram
```

小程序 API 地址按以下优先级读取：发行环境 `ext.json`、被 Git 忽略的本地
`local-config.js`、`app.js` 的 `globalData.apiBaseUrl`。微信开发者工具模拟器
可能不会注入 `ext.json`，因此本地联调应首次复制 `local-config.example.js`：

```bash
cd frontend/wechat-miniprogram
cp local-config.example.js local-config.js
```

`local-config.js` 已被 Git 忽略，后续打开开发者工具会自动沿用。发行环境仍可
使用 `ext.json` 覆盖该地址，示例结构如下：

```json
{
  "ext": {
    "apiBaseUrl": "http://127.0.0.1:8080"
  }
}
```

真机调试时不能使用 `localhost` 或 `127.0.0.1` 指向开发电脑，应改为电脑局域网地址，例如 `http://192.168.x.x:8080`，并确保：

- 手机与电脑位于可互通的同一网络；
- 操作系统防火墙允许后端端口入站；
- Spring Boot 监听的网卡可被局域网访问；
- 开发者工具的“详情 → 本地设置”可在本地联调阶段临时关闭合法域名校验。

正式发布必须使用已备案且支持 HTTPS 的后端域名，并在微信公众平台“开发管理 → 开发设置 → 服务器域名”中将其加入 `request` 合法域名。不要在小程序源码、`ext.json` 或项目配置中保存数据库密码、令牌或私钥。

小程序请求封装位于 `frontend/wechat-miniprogram/utils/api.js`：

- 首屏调用 `GET /api/bootstrap`，初始业务集合均为空。
- 保存练习调用 `POST /api/records`，失败时不写入本地业务列表。
- 笔顺调用 `GET /api/hanzi/{characterText}/strokes`，数据从后台数据库取得。
- 加载失败会显示 Toast 或错误卡片，并提供重新加载入口。

## REST API 清单

所有接口前缀均为 `/api`，请求和响应使用 JSON；删除成功返回 HTTP 204。

| 方法 | 路径 | 调用端 | 说明 |
| --- | --- | --- | --- |
| `GET` | `/api/bootstrap` | 管理端、小程序 | 查询用户、汉字、古诗、任务和练习记录聚合数据 |
| `POST` | `/api/auth/login` | 管理端 | 使用数据库账号及密码摘要校验管理端登录 |
| `GET` | `/api/users` | 管理端 | 查询用户列表 |
| `POST` | `/api/users` | 管理端 | 创建用户 |
| `PUT` | `/api/users/{id}/status` | 管理端 | 修改用户启用/停用状态 |
| `GET` | `/api/hanzi` | 管理端 | 查询汉字字库 |
| `POST` | `/api/hanzi` | 管理端 | 创建汉字资源 |
| `PUT` | `/api/hanzi/{id}/recommended` | 管理端 | 修改汉字推荐状态 |
| `GET` | `/api/hanzi/{characterText}/strokes` | 小程序 | 从数据库读取指定汉字笔顺轨迹；缺字或轨迹未配置返回 404 |
| `GET` | `/api/poems` | 管理端 | 查询古诗资源 |
| `GET` | `/api/tasks` | 管理端 | 查询任务 |
| `POST` | `/api/tasks` | 管理端 | 创建任务 |
| `DELETE` | `/api/tasks/{id}` | 管理端 | 删除任务 |
| `GET` | `/api/records` | 管理端 | 查询练习记录 |
| `POST` | `/api/records` | 小程序 | 保存练字或背诗记录 |
| `DELETE` | `/api/records/{id}` | 管理端 | 删除练习记录 |

接口使用示例：

```bash
curl -i http://127.0.0.1:8080/api/hanzi
curl -i http://127.0.0.1:8080/api/hanzi/%E4%B9%A6/strokes
curl -i -X POST http://127.0.0.1:8080/api/records \
  -H 'Content-Type: application/json' \
  -d '{"user_id":"数据库中的学生 ID","item_type":"hanzi","item_id":"数据库中的汉字 ID","item_name":"书","complete_status":"completed","stroke_total":4,"stroke_completed":4,"mistake_count":0,"hint_count":0,"duration_seconds":60,"practice_time":"2026-07-21 10:00"}'
```

## 接口字段速查

以下为关键接口的请求体与响应体示例（字段命名遵循 `snake_case`）。完整接口见上方「REST API 清单」。

### GET /api/bootstrap

响应顶层固定五个数组，前端据此填充首屏：

```json
{
  "users":   [ { "id": "U101", "username": "admin", "nickname": "张系统管理员", "user_type": "admin", "status": "enabled", "join_date": "2026-01-01" } ],
  "hanzi":   [ { "id": "H001", "character_text": "书", "pinyin": "shū", "radical": "乛", "stroke_count": 4, "grade_level": "一年级", "is_recommended": true, "tags": ["基础生字"], "strokes_desc": ["横折","横折钩","竖","点"], "compounds": ["书本","书写"] } ],
  "poems":   [ { "id": "P001", "title": "静夜思", "author": "李白", "dynasty": "唐", "content": "床前明月光……", "translation": "……", "grade_level": "一年级", "keywords": ["思乡"], "sentences": [ { "id": "S101", "sentence_text": "床前明月光", "sort_no": 1, "key_characters": ["明","月"] } ] } ],
  "tasks":   [ { "id": "T501", "task_name": "今日生字", "task_type": "hanzi", "target_type": "all", "target_id": "", "start_time": "2026-07-21 09:00", "end_time": "2026-07-22 09:00", "status": "active", "items": [ { "id": "TI50101", "item_type": "hanzi", "item_id": "H001", "sort_no": 1 } ] } ],
  "records": [ { "id": "R901", "user_id": "U104", "user_name": "李梓轩", "task_name": "今日生字", "item_type": "hanzi", "item_id": "H001", "item_name": "书", "complete_status": "completed", "stroke_total": 4, "stroke_completed": 4, "mistake_count": 0, "hint_count": 0, "score_level": "A+", "duration_seconds": 60, "practice_time": "2026-07-21 10:00" } ]
}
```

> 笔顺轨迹列 `strokes_json` / `medians_json` / `rad_strokes_json` 标注了 `@JsonIgnore`，不会出现在 bootstrap 响应里，只能通过下方笔顺接口获取。

### POST /api/auth/login

请求体：

```json
{ "username": "admin", "password": "明文密码（仅用于本次 BCrypt 比对）" }
```

成功响应（HTTP 200，不含 `password_hash`）：

```json
{ "id": "U101", "username": "admin", "nickname": "张系统管理员", "user_type": "admin", "status": "enabled", "join_date": "2026-01-01" }
```

账号、密码、角色或状态任一不符返回 HTTP 401，响应体为 `账号或密码不正确`，不区分具体失败原因。

### POST /api/users

请求体（主键、状态、注册日期可省略，由后端生成）：

```json
{ "username": "student_xuan", "nickname": "李梓轩", "phone": "18655556666", "user_type": "student" }
```

### POST /api/records

请求体（小程序提交练字或背诗结果）：

```json
{ "user_id": "U104", "user_name": "李梓轩", "item_type": "hanzi", "item_id": "H001", "item_name": "书", "task_name": "今日生字", "complete_status": "completed", "stroke_total": 4, "stroke_completed": 4, "mistake_count": 0, "hint_count": 0, "score_level": "A+", "duration_seconds": 60, "practice_time": "2026-07-21 10:00" }
```

成功后返回持久化后的完整记录（含服务端生成的主键）。

### GET /api/hanzi/{characterText}/strokes

响应（轨迹均来自数据库三列 JSON）：

```json
{ "character_text": "书", "strokes": ["M 364 ... Z"], "medians": [[[350,260],[400,260]]], "radStrokes": [0] }
```

汉字不存在或三列任一未配置返回 HTTP 404；列内容不是合法 JSON 数组返回 HTTP 500。

## 构建与验证

管理端构建：

```bash
cd frontend
npm run build
```

后端测试与打包：

```bash
cd backend
MAVEN_OPTS='-Dfile.encoding=UTF-8' mvn test
MAVEN_OPTS='-Dfile.encoding=UTF-8' mvn -q -DskipTests package
```

原生小程序 JavaScript 静态语法检查：

```bash
find frontend/wechat-miniprogram -name '*.js' -print0 | xargs -0 -n1 node --check
```

建议联调验收：

1. 停止后端后打开两端，确认页面明确报错且没有演示业务数据。
2. 启动空库后端，确认列表为空且页面显示空状态。
3. 从管理端创建用户、汉字和任务，刷新小程序后确认数据来自 `/api/bootstrap`。
4. 为汉字导入数据库笔顺轨迹，确认小程序笔顺演示只请求后台域名。
5. 提交一条练习，确认 `POST /api/records` 成功、MySQL 存在记录且页面随后显示。
6. 模拟保存接口失败，确认记录页没有新增未持久化记录。

## 常见故障排查

### 通用排查命令速查

定位问题前先逐条执行，多数联调故障可在这一步定位：

```bash
# 1. 后端进程与端口
lsof -i:8080 | grep LISTEN                       # 后端是否在监听 8080
curl -i http://127.0.0.1:8080/api/bootstrap      # 聚合接口是否返回 200

# 2. 数据库连通与数据
mysql -u 用户名 -p -e "SELECT 1;"                 # MySQL 是否可连
mysql -u 用户名 -p hanzi_writing -e "SHOW TABLES;"            # 表是否已建
mysql -u 用户名 -p hanzi_writing -e "SELECT id, character_text, stroke_count FROM hanzi_character;"

# 3. 笔顺轨迹三列是否齐全（任一为 NULL 即笔顺接口会 404）
mysql -u 用户名 -p hanzi_writing -e "SELECT character_text, LENGTH(strokes_json) AS s, LENGTH(medians_json) AS m, LENGTH(rad_strokes_json) AS r FROM hanzi_character WHERE character_text='书';"

# 4. 小程序 JS 语法检查
find frontend/wechat-miniprogram -name '*.js' -print0 | xargs -0 -n1 node --check
```

浏览器联调时打开 DevTools → Network，确认管理端实际请求的是 `VITE_API_BASE_URL` 拼出的完整 `/api/...` 地址：若 404 多为地址拼接错误，若 CORS 报错多为 `HANZI_CORS_ALLOWED_ORIGINS` 未包含当前来源（跨域预检 `OPTIONS` 被拒）。微信开发者工具在「详情 → 本地设置」可临时勾选「不校验合法域名、web-view（业务域名）、TLS 版本以及 HTTPS 证书」用于本地联调，正式发布前必须在公众平台「开发管理 → 开发设置 → 服务器域名」配置 `request` 合法域名。

### 管理端提示无法连接后台

依次检查：

```bash
curl -i http://127.0.0.1:8080/api/bootstrap
```

- 后端是否启动、端口是否与 `VITE_API_BASE_URL` 一致；
- 修改 `.env.local` 后是否重启 Vite；
- 浏览器 Network 面板中的实际请求 URL；
- 后端 `HANZI_CORS_ALLOWED_ORIGINS` 是否包含当前管理端来源；
- 反向代理是否正确转发 `/api` 且没有重复拼接路径。

### 后端无法连接 MySQL

- 确认 MySQL 已启动，数据库 `hanzi_writing` 已创建；
- 核对 `HANZI_DB_URL`、账号和密码；
- 确认账号拥有目标库的读写权限；
- 检查 JDBC URL 的时区、`utf8mb4` 和 MySQL 8 公钥参数；
- 执行 `mysql -u 用户名 -p -h 主机 hanzi_writing` 单独验证连接。

### 小程序提示未配置后端地址

在 `app.js` 的 `globalData.apiBaseUrl` 或发行环境 `ext.json` 中配置后端根地址，然后重新编译。地址只包含协议、主机和端口，不要附加 `/api`，请求层会自行拼接接口路径。

### 开发者工具能请求，真机不能请求

- 真机不能通过 `localhost` 访问电脑；改用可达的局域网 IP 或 HTTPS 域名；
- 用手机浏览器验证后端地址是否可达；
- 正式环境检查 HTTPS 证书链和微信 `request` 合法域名；
- 检查后端端口、防火墙、路由器 AP 隔离和代理设置。

### 小程序笔顺加载失败

先直接请求：

```bash
curl -i http://127.0.0.1:8080/api/hanzi/%E4%B9%A6/strokes
```

- HTTP 404：数据库不存在对应 `character_text`，或该汉字的 `strokes_json`、`medians_json`、`rad_strokes_json` 任一列尚未配置；
- HTTP 500：轨迹列不是合法 JSON 数组，应修复数据库导入数据；
- 小程序请求失败：检查 API 基地址、网络和合法域名；
- 不要通过恢复 CDN 请求或前端内置轨迹掩盖数据库缺失。

### 页面数据为空

空集合表示数据库当前没有对应数据，不是前端故障。可直接查询 MySQL 表或先调用 `GET /api/bootstrap` 核对响应。需要联调数据时将 `seed.sql` 导入数据库；不要在 Vue 或小程序页面中添加常量列表。

## 数据与安全约束

- 管理端与小程序的用户、汉字、古诗、任务、记录和笔顺均以后台接口响应为唯一业务数据来源。
- 本地存储只允许保存笔顺纠错开关、演示速度等纯 UI 偏好，不保存业务列表或伪造记录。
- 请求失败必须显示错误或允许重试，不允许静默返回样例数据，也不允许把失败操作提示为成功。
- 仓库中不得提交真实数据库密码、管理员密码、访问令牌、私钥或 `.env.local`。
- 生产环境应使用 HTTPS、受限 CORS 白名单、最小权限数据库账号，并关闭自动种子数据。

### 验证「数据全部来自数据库」

可通过以下步骤确认前端没有内置或兜底业务数据：

1. **停后端**：关闭 Spring Boot 进程后刷新两端。管理端应显示「后台数据加载失败」红色提示且表格为空；小程序应显示「后台数据加载失败」卡片与「重新加载」按钮，不出现任何任务、汉字或记录。
2. **空库**：仅执行 `schema.sql`、不导入 `seed.sql`，`curl http://127.0.0.1:8080/api/bootstrap` 应返回五个空数组，两端列表均为空状态。
3. **核对数据源**：直接查 MySQL 并与接口响应对比，记录数与字段值应一致：

   ```bash
   mysql -u 用户名 -p hanzi_writing -e "SELECT id, character_text, stroke_count FROM hanzi_character;"
   curl -s http://127.0.0.1:8080/api/bootstrap | python3 -m json.tool
   ```

4. **写操作校验**：在管理端新增用户后，`SELECT * FROM user_account WHERE username='...'` 应立即出现该行；小程序提交记录后，`practice_record` 表应出现对应行。若界面显示了数据库中不存在的数据，说明前端引入了兜底或写死数据，需要回退修复。
