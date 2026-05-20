-- =============================================
-- AI文章管理系统 - 数据库表结构
-- =============================================

-- 用户表
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT NOT NULL UNIQUE,
  password TEXT NOT NULL,
  nickname TEXT,
  avatar TEXT,
  is_admin INTEGER DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- AI配置表（文章AI和图片AI分离）
CREATE TABLE IF NOT EXISTS ai_configs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL REFERENCES users(id),
  name TEXT NOT NULL,
  type TEXT NOT NULL,              -- 'text' = 文章AI, 'image' = 图片AI
  model TEXT NOT NULL,
  api_key TEXT NOT NULL,
  api_endpoint TEXT,
  is_default INTEGER DEFAULT 0,
  is_active INTEGER DEFAULT 1,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 分类表（话题）
CREATE TABLE IF NOT EXISTS categories (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL REFERENCES users(id),
  name TEXT NOT NULL,
  icon TEXT,
  sort_order INTEGER DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 创意表
CREATE TABLE IF NOT EXISTS ideas (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL REFERENCES users(id),
  category_id INTEGER REFERENCES categories(id),
  content TEXT NOT NULL,
  status TEXT DEFAULT 'pending',  -- pending, generated, published
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 文章表
CREATE TABLE IF NOT EXISTS articles (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL REFERENCES users(id),
  idea_id INTEGER REFERENCES ideas(id),
  title TEXT NOT NULL,
  content TEXT NOT NULL,          -- Markdown格式
  cover_image TEXT,               -- 封面图
  source TEXT DEFAULT 'ai',       -- 'ai' = AI生成, 'manual' = 手动
  status TEXT DEFAULT 'draft',    -- draft, pending, published
  published_at DATETIME,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 文章图片表
CREATE TABLE IF NOT EXISTS article_images (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  article_id INTEGER NOT NULL REFERENCES articles(id),
  filename TEXT NOT NULL,
  mime_type TEXT NOT NULL,
  size INTEGER,
  url TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 评论表
CREATE TABLE IF NOT EXISTS comments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  article_id INTEGER NOT NULL REFERENCES articles(id),
  user_id INTEGER NOT NULL REFERENCES users(id),
  content TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- AI日志表
CREATE TABLE IF NOT EXISTS ai_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL REFERENCES users(id),
  type TEXT NOT NULL,             -- 'text', 'image'
  model TEXT,
  prompt TEXT,
  response TEXT,
  status TEXT DEFAULT 'success',  -- success, failed
  error_message TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 索引
CREATE INDEX IF NOT EXISTS idx_articles_user ON articles(user_id);
CREATE INDEX IF NOT EXISTS idx_articles_status ON articles(status);
CREATE INDEX IF NOT EXISTS idx_ideas_user ON ideas(user_id);
CREATE INDEX IF NOT EXISTS idx_comments_article ON comments(article_id);
CREATE INDEX IF NOT EXISTS idx_ai_configs_user ON ai_configs(user_id);

-- =============================================
-- 默认数据
-- =============================================

-- 默认管理员账号 (密码: admin123)
INSERT INTO users (username, password, nickname, is_admin) 
VALUES ('admin', 'admin123', '管理员', 1);

-- 默认分类
INSERT INTO categories (name, icon, sort_order) VALUES
('科技', '&#x1F4BB;', 1),
('生活', '&#x1F3E0;', 2),
('美食', '&#x1F354;', 3),
('旅行', '&#x2708;', 4),
('情感', '&#x2764;', 5),
('职场', '&#x1F4BC;', 6);
