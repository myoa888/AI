# AI文章管理系统

基于 Cloudflare Workers + D1 + Pages 的自媒体内容生产工具。

## 功能特性

- 用户认证：账号密码注册登录，文章数据隔离
- 创意管理：分类管理创意话题，根据创意生成文章
- AI生成：支持文章AI和图片AI配置，Markdown + 图片混排
- 文章审核：草稿 → 待发布 → 已发布
- 评论反馈：评论后AI自动修改
- 管理后台：用户管理、统计导出
- 图片上传：支持手动发文章时上传图片

## 技术栈

- **后端**: Cloudflare Workers + D1
- **前端**: 原生 HTML/CSS/JS
- **部署**: Cloudflare Pages

## 部署步骤

### 1. 创建D1数据库

```bash
wrangler d1 create ai-article-db
```

### 2. 初始化数据库

```bash
wrangler d1 execute ai-article-db --file=schema.sql
```

### 3. 更新wrangler.toml

将 `database_id` 替换为实际的D1数据库ID。

### 4. 本地开发

```bash
wrangler pages dev public
```

### 5. 部署

```bash
wrangler pages deploy public
```

## 默认账号

| 类型 | 用户名 | 密码 |
|------|--------|------|
| 管理员 | admin | admin123 |
| 普通用户 | 注册即可 | - |

## 项目结构

```
├── schema.sql              # 数据库表结构
├── wrangler.toml          # Cloudflare配置
├── public/                 # 前端页面
│   ├── css/               # 公共样式
│   ├── js/                # API封装
│   ├── mobile/            # 手机端页面
│   └── admin/             # 管理后台
└── functions/             # Cloudflare Workers API
```

## 许可证

MIT
