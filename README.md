# EmbyKey — Emby 自助注册系统

基于 Cloudflare Workers + Hono 的 Emby 媒体服务器自助注册系统。用户可通过邀请码自助注册账号，管理员可在后台管理邀请码和用户。

## 功能

### 用户端
- **首页注册** — 填写用户名、密码、邮箱，输入邀请码完成注册
- **人机验证** — 集成 Cloudflare Turnstile 验证（可选，不配置则跳过）
- **成功页** — 注册成功后显示服务器连接信息，提供 Emby 官方及第三方客户端（Infuse、VidHub、Hills）下载链接
- **邀请码快捷填入** — 支持 URL 参数 `?code=XXXX-XXXX` 自动填入邀请码
- **媒体库统计** — 首页展示电影、剧集、音乐等媒体数量
- **忘记密码** — 通过 Emby API 向注册邮箱发送重置 PIN（需 Emby 服务器已配置邮箱）

### 管理端
- **管理员登录** — 使用 Emby 管理员账号密码登录，带速率限制（每 IP 每 60 秒最多 5 次尝试）
- **会话管理** — Cookie + CSRF Token 双重防护，24 小时会话有效期
- **邀请码管理** — 生成、删除、分享邀请码（含二维码），支持设置最大使用次数（可设为无限次）
- **模板用户** — 设置模板用户，新注册用户自动复制其权限策略和显示配置
- **用户管理** — 查看用户列表（含头像、角色、状态、最后活跃/登录时间、继续观看数），启用/禁用、删除用户
- **用户活跃统计** — 概览卡片显示本周活跃、本月活跃用户数
- **服务器名称缓存** — 自动获取 Emby 服务器名称并缓存至 KV（1 小时 TTL）

### 安全特性
- **CSRF 防护** — 所有管理操作需携带 CSRF Token
- **速率限制** — 基于 KV 的每 IP 分钟级请求限制（注册 10 次/分，登录 5 次/分，忘记密码 3 次/分）
- **邀请码原子计数** — 通过 Durable Object 保证并发场景下邀请码使用次数精确
- **请求来源校验** — 注册和忘记密码请求校验 Origin/Referer 头
- **人机验证** — 注册和忘记密码均集成 Turnstile 验证

## 技术栈

| 组件 | 技术 |
|------|------|
| **运行时** | Cloudflare Workers |
| **Web 框架** | [Hono](https://honojs.dev/) |
| **存储** | Workers KV（邀请码、会话、模板用户配置、服务器名称缓存） |
| **原子计数器** | Durable Object (SQLite) |
| **语言** | TypeScript |
| **构建工具** | Wrangler + TypeScript |
| **人机验证** | Cloudflare Turnstile（可选） |

## 部署

### 前置条件

1. 一个 Cloudflare 账号
2. 一个 Emby 媒体服务器（可从公网访问）
3. Cloudflare Turnstile 站点密钥（可选，用于人机验证）

### 步骤

#### 1. 创建 KV 命名空间

```bash
npx wrangler kv:namespace create "INVITE_CODES"
```

将输出中的 ID 填入 `wrangler.toml` 的 `[[kv_namespaces]]` 中。

#### 2. 创建 Durable Object

项目已内置 Durable Object 配置（`wrangler.toml` 中的 `[[durable_objects.bindings]]` 和 `[[migrations]]`），部署时会自动创建 SQLite 存储。

#### 3. 设置环境变量

通过 Cloudflare Dashboard 或 `wrangler secret` 设置以下变量：

```bash
# 必填
npx wrangler secret put EMBY_SERVER_URL      # Emby 服务器地址，如 https://emby.example.com
npx wrangler secret put EMBY_API_KEY         # Emby API 密钥

# Turnstile（可选，不设置则跳过人机验证）
npx wrangler secret put TURNSTILE_SITE_KEY   # Turnstile 站点密钥
npx wrangler secret put TURNSTILE_SECRET_KEY # Turnstile 密钥

# 管理会话（可选，不设置则随机生成）
npx wrangler secret put ADMIN_SESSION_SECRET # 管理会话密钥
```

#### 4. 部署

```bash
npm run deploy
```

> `wrangler.toml` 已配置 `keep_vars = true`（保留环境变量绑定）和 `[observability.logs]`（日志观测），部署后无需重复配置。

#### 5. 首次使用

1. 访问 `/admin` 使用 Emby 管理员账号登录
2. 在后台生成邀请码，并设置模板用户（可选）
3. 将注册页面链接（`/?code=XXXX-XXXX`）分发给用户

## 本地开发

```bash
npm install
npm run dev
```

配合 `.dev.vars` 文件设置本地环境变量：

```
EMBY_SERVER_URL=https://emby.example.com
EMBY_API_KEY=your-api-key
TURNSTILE_SITE_KEY=your-site-key
TURNSTILE_SECRET_KEY=your-secret-key
ADMIN_SESSION_SECRET=your-secret
```

## 项目结构

```
src/
├── index.ts                          # Worker 入口，路由分发（Hono）
├── types.ts                          # TypeScript 类型定义
├── handlers/
│   ├── register.ts                   # 注册页面和注册请求处理（含速率限制、Turnstile 验证、原子计数）
│   ├── admin.ts                      # 管理员登录、后台管理、用户操作
│   └── forgot-password.ts            # 忘记密码流程处理
├── services/
│   └── emby.ts                       # Emby API 客户端（用户创建/策略复制/信息查询/忘记密码）
├── utils/
│   └── rate-limit.ts                 # 基于 KV 的速率限制中间件
├── views/
│   ├── helpers.ts                    # HTML 转义等视图辅助函数
│   ├── register.ts                   # 注册页面 HTML
│   ├── success.ts                    # 注册成功页 HTML
│   ├── forgot-password.ts            # 忘记密码页 HTML
│   ├── admin-login.ts                # 管理员登录页 HTML
│   └── admin-dashboard.ts            # 管理后台仪表盘 HTML
└── durable-objects/
    └── invite-counter.ts             # Durable Object — 邀请码原子计数器
```

## 路由一览

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/` | 注册首页（含媒体库统计） |
| POST | `/register` | 提交注册 |
| GET | `/success?username=` | 注册成功页 |
| GET | `/forgot-password` | 忘记密码页 |
| POST | `/forgot-password` | 发送重置 PIN |
| GET | `/admin` | 管理员登录页 |
| POST | `/admin` | 管理员登录 |
| GET | `/admin/dashboard` | 管理后台仪表盘 |
| GET | `/admin/logout` | 管理员退出 |
| POST | `/admin/invite-codes` | 生成邀请码 |
| DELETE | `/admin/invite-codes/:code` | 删除邀请码 |
| POST | `/admin/template-user` | 设置模板用户 |
| POST | `/admin/users/:id/toggle-disable` | 切换用户禁用状态 |
| POST | `/admin/users/:id/delete` | 删除用户 |
| GET | `/favicon.svg` | 站点图标 |

## API 环境变量说明

| 变量 | 必填 | 说明 |
|------|------|------|
| `EMBY_SERVER_URL` | ✅ | Emby 服务器地址（如 `https://emby.example.com`） |
| `EMBY_API_KEY` | ✅ | Emby API 密钥 |
| `TURNSTILE_SITE_KEY` | ❌ | Turnstile 站点密钥 |
| `TURNSTILE_SECRET_KEY` | ❌ | Turnstile 密钥 |
| `ADMIN_SESSION_SECRET` | ❌ | 管理会话签名密钥 |
| `EMBY_SERVER_NAME` | ❌ | 服务器显示名称（不设置则自动从 API 获取） |
