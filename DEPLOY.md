# AgiliX 部署

前后端合并部署到 Cloudflare Pages，后端 API 通过 Pages Functions 运行。

## 首次部署

```bash
wrangler login
wrangler d1 create agilix-db       # 将 database_id 填入 packages/frontend/wrangler.toml
pnpm db:migrate:remote             # 远程建表
pnpm ship                          # 构建 + 部署
```

## 日常更新

```bash
pnpm ship
```

## 线上地址

- 应用: https://agilix-8fm.pages.dev
- API: https://agilix-8fm.pages.dev/api/health
