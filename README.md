# EmbyKey — Emby 自助注册系统

基于 Cloudflare Workers 的 Emby 媒体服务器自助注册系统。用户可通过邀请码自助注册账号，管理员可在后台管理邀请码和用户。

## 功能

### 用户端
- **首页注册** — 填写用户名、密码、邮箱，输入邀请码完成注册
- **人机验证** — 集成 Cloudflare Turnstile 验证
- **成功页** — 注册成功后显示服务器连接信息和客户端下载指引
- **邀请码快捷填入** — 支持 URL 参数 `?code=XXXX-XXXX` 自动填入邀请码
- **媒体库统计** — 首页展示电影、剧集、音乐等媒体数量

### 管理端
- **管理员登录** — 使用 Emby 管理员账号密码登录
- **邀请码管理** — 生成、删除邀请码，查看使用状态
- **模板用户** — 设置模板用户，新注册用户自动复制其权限策略
- **用户管理** — 查看用户列表，启用/禁用、删除用户

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

#### 2. 设置环境变量

通过 Cloudflare Dashboard 或 `wrangler secret` 设置以下变量：

```bash
# 必填
npx wrangler secret put EMBY_SERVER_URL      # Emby 服务器地址，如 https://emby.example.com
npx wrangler secret put EMBY_API_KEY         # Emby API 密钥

# Turnstile（可选，不设置则跳过人机验证）
npx wrangler secret put TURNSTILE_SITE_KEY   # Turnstile 站点密钥
npx wrangler secret put TURNSTILE_SECRET_KEY # Turnstile 密钥

# 管理会话（可选）
npx wrangler secret put ADMIN_SESSION_SECRET # 管理会话密钥
```

#### 3. 部署

```bash
npm run deploy
```

#### 4. 首次使用

1. 访问 `/admin` 使用 Emby 管理员账号登录
2. 在后台生成邀请码，并设置模板用户（可选）
3. 将注册页面链接（`/?code=XXXX-XXXX`）分发给用户

## 本地开发

```bash
npm install
npm run dev
```

配合 `.dev.vars` 文件设置本地环境变量（参考 `wrangler.toml` 中的变量列表）。

## 项目结构

```
src/
├── index.ts                 # Worker 入口，路由分发
├── types.ts                 # TypeScript 类型定义
├── handlers/
│   ├── register.ts          # 注册页面和注册请求处理
│   └── admin.ts             # 管理员登录、后台管理、用户操作
├── services/
│   └── emby.ts              # Emby API 客户端
└── views/
    ├── register.ts          # 注册页面 HTML
    ├── success.ts           # 注册成功页 HTML
    ├── admin-login.ts       # 管理员登录页 HTML
    └── admin-dashboard.ts   # 管理后台仪表盘 HTML
```

## 技术栈

- **运行时** — Cloudflare Workers
- **存储** — Workers KV（邀请码、会话、模板用户设置、服务器名称缓存）
- **语言** — TypeScript
- **构建** — Wrangler + TypeScript
