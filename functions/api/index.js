// Cloudflare Workers API 主路由
export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const path = url.pathname.replace('/api', '');
    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization'
    };
    if (request.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

    try {
      let response;
      const method = request.method;
      const m = method;

      if (path === '/auth/register') response = await handleAuth.register(request, env);
      else if (path === '/auth/login') response = await handleAuth.login(request, env);
      else if (path === '/articles' && m === 'GET') response = await handleArticles.list(request, env);
      else if (path === '/articles' && m === 'POST') response = await handleArticles.create(request, env);
      else if (path.match(/^\/articles\/\d+$/) && m === 'GET') response = await handleArticles.get(request, env);
      else if (path.match(/^\/articles\/\d+$/) && m === 'PUT') response = await handleArticles.update(request, env);
      else if (path.match(/^\/articles\/\d+$/) && m === 'DELETE') response = await handleArticles.delete(request, env);
      else if (path.match(/^\/articles\/\d+\/publish$/) && m === 'POST') response = await handleArticles.publish(request, env);
      else if (path.match(/^\/articles\/\d+\/comments$/) && m === 'GET') response = await handleComments.list(request, env);
      else if (path.match(/^\/articles\/\d+\/comments$/) && m === 'POST') response = await handleComments.create(request, env);
      else if (path === '/ideas' && m === 'GET') response = await handleIdeas.list(request, env);
      else if (path === '/ideas' && m === 'POST') response = await handleIdeas.create(request, env);
      else if (path.match(/^\/ideas\/\d+$/) && m === 'PUT') response = await handleIdeas.update(request, env);
      else if (path.match(/^\/ideas\/\d+$/) && m === 'DELETE') response = await handleIdeas.delete(request, env);
      else if (path.match(/^\/ideas\/\d+\/generate$/) && m === 'POST') response = await handleIdeas.generate(request, env);
      else if (path === '/categories' && m === 'GET') response = await handleCategories.list(request, env);
      else if (path === '/categories' && m === 'POST') response = await handleCategories.create(request, env);
      else if (path.match(/^\/categories\/\d+$/) && m === 'PUT') response = await handleCategories.update(request, env);
      else if (path.match(/^\/categories\/\d+$/) && m === 'DELETE') response = await handleCategories.delete(request, env);
      else if (path === '/ai-configs' && m === 'GET') response = await handleAIConfigs.list(request, env);
      else if (path === '/ai-configs' && m === 'POST') response = await handleAIConfigs.create(request, env);
      else if (path.match(/^\/ai-configs\/\d+$/) && m === 'PUT') response = await handleAIConfigs.update(request, env);
      else if (path.match(/^\/ai-configs\/\d+$/) && m === 'DELETE') response = await handleAIConfigs.delete(request, env);
      else if (path === '/ai-logs' && m === 'GET') response = await handleAILogs.list(request, env);
      else if (path === '/admin/login') response = await handleAdmin.login(request, env);
      else if (path === '/admin/stats') response = await handleAdmin.stats(request, env);
      else if (path === '/admin/users' && m === 'GET') response = await handleAdmin.users(request, env);
      else if (path.match(/^\/admin\/users\/\d+$/) && m === 'DELETE') response = await handleAdmin.deleteUser(request, env);
      else if (path === '/admin/articles' && m === 'GET') response = await handleAdmin.articles(request, env);
      else if (path.match(/^\/admin\/articles\/\d+$/) && m === 'DELETE') response = await handleAdmin.deleteArticle(request, env);
      else if (path === '/admin/export') response = await handleAdmin.export(request, env);
      else if (path === '/upload' && m === 'POST') response = await handleUpload.image(request, env);
      else response = new Response(JSON.stringify({ error: 'API不存在' }), { status: 404 });

      return new Response(response.body, { status: response.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    } catch (err) {
      console.error('API Error:', err);
      return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }
  }
};

function json(data, status = 200) { return new Response(JSON.stringify(data), { status }); }
function unauthorized() { return json({ error: '未授权' }, 401); }
function getId(url) { const m = url.match(/\/(\d+)/g); return m ? parseInt(m[m.length - 1].replace('/', '')) : 0; }

async function getUserId(request) {
  const auth = request.headers.get('Authorization');
  if (!auth) return null;
  try {
    const decoded = JSON.parse(atob(auth.replace('Bearer ', '')));
    if (decoded.exp < Date.now()) return null;
    return decoded.userId;
  } catch { return null; }
}

function extractPlaceholders(text) {
  const regex = /!\[([^\]]+)\]\(image_placeholder_(\d+)\)/g;
  const placeholders = [];
  let match;
  while ((match = regex.exec(text)) !== null) placeholders.push({ desc: match[1], raw: match[0] });
  return placeholders;
}

async function callAI(config, prompt, type) {
  const endpoint = config.api_endpoint || (type === 'text' ? 'https://api.openai.com/v1/chat/completions' : 'https://api.openai.com/v1/images/generations');
  if (type === 'text') {
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${config.api_key}` },
      body: JSON.stringify({ model: config.model, messages: [{ role: 'user', content: `你是一个专业的自媒体作家。请根据以下简短想法生成一篇图文混排的Markdown文章。在适当位置插入图片占位符，格式：![图片描述](image_placeholder_N)，N为数字。\n\n${prompt}` }] })
    });
    const data = await res.json();
    return data.choices[0].message.content;
  } else {
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${config.api_key}` },
      body: JSON.stringify({ model: config.model, prompt, size: '1024x1024' })
    });
    const data = await res.json();
    return data.data[0].url;
  }
}

async function logAI(env, userId, type, model, prompt, status, error = null) {
  try {
    await env.DB.prepare('INSERT INTO ai_logs (user_id, type, model, prompt, status, error_message) VALUES (?, ?, ?, ?, ?, ?)').bind(userId, type, model, prompt, status, error).run();
  } catch (err) { console.error('Log error:', err); }
}

// 认证
const handleAuth = {
  async register(request, env) {
    const { username, password, nickname } = await request.json();
    if (!username || !password) return json({ error: '用户名和密码不能为空' }, 400);
    const existing = await env.DB.prepare('SELECT id FROM users WHERE username = ?').bind(username).first();
    if (existing) return json({ error: '用户名已存在' }, 400);
    const result = await env.DB.prepare('INSERT INTO users (username, password, nickname) VALUES (?, ?, ?)').bind(username, password, nickname || username).run();
    const user = { id: result.meta.last_row_id, username, nickname: nickname || username };
    const token = btoa(JSON.stringify({ userId: user.id, exp: Date.now() + 7 * 24 * 60 * 60 * 1000 }));
    return json({ user, token });
  },
  async login(request, env) {
    const { username, password } = await request.json();
    const user = await env.DB.prepare('SELECT * FROM users WHERE username = ? AND password = ?').bind(username, password).first();
    if (!user) return json({ error: '用户名或密码错误' }, 401);
    const token = btoa(JSON.stringify({ userId: user.id, exp: Date.now() + 7 * 24 * 60 * 60 * 1000 }));
    return json({ user: { id: user.id, username: user.username, nickname: user.nickname }, token });
  }
};

// 文章
const handleArticles = {
  async list(request, env) {
    const userId = await getUserId(request);
    if (!userId) return unauthorized();
    const url = new URL(request.url);
    const status = url.searchParams.get('status');
    let sql = 'SELECT * FROM articles WHERE user_id = ?';
    const bindings = [userId];
    if (status) { sql += ' AND status = ?'; bindings.push(status); }
    sql += ' ORDER BY created_at DESC';
    const articles = await env.DB.prepare(sql).bind(...bindings).all();
    return json({ articles: articles.results });
  },
  async get(request, env) {
    const userId = await getUserId(request);
    if (!userId) return unauthorized();
    const article = await env.DB.prepare('SELECT * FROM articles WHERE id = ? AND user_id = ?').bind(getId(request.url), userId).first();
    if (!article) return json({ error: '文章不存在' }, 404);
    return json({ article });
  },
  async create(request, env) {
    const userId = await getUserId(request);
    if (!userId) return unauthorized();
    const { title, content, cover_image, status = 'draft', source = 'manual', idea_id } = await request.json();
    if (!title || !content) return json({ error: '标题和内容不能为空' }, 400);
    const result = await env.DB.prepare('INSERT INTO articles (user_id, title, content, cover_image, status, source, idea_id) VALUES (?, ?, ?, ?, ?, ?, ?)').bind(userId, title, content, cover_image, status, source, idea_id || null).run();
    return json({ id: result.meta.last_row_id, success: true });
  },
  async update(request, env) {
    const userId = await getUserId(request);
    if (!userId) return unauthorized();
    const id = getId(request.url);
    const { title, content, cover_image, status } = await request.json();
    let sql = 'UPDATE articles SET updated_at = CURRENT_TIMESTAMP';
    const bindings = [];
    if (title) { sql += ', title = ?'; bindings.push(title); }
    if (content) { sql += ', content = ?'; bindings.push(content); }
    if (cover_image !== undefined) { sql += ', cover_image = ?'; bindings.push(cover_image); }
    if (status) { sql += ', status = ?'; bindings.push(status); }
    sql += ' WHERE id = ? AND user_id = ?';
    bindings.push(id, userId);
    await env.DB.prepare(sql).bind(...bindings).run();
    return json({ success: true });
  },
  async delete(request, env) {
    const userId = await getUserId(request);
    if (!userId) return unauthorized();
    await env.DB.prepare('DELETE FROM articles WHERE id = ? AND user_id = ?').bind(getId(request.url), userId).run();
    return json({ success: true });
  },
  async publish(request, env) {
    const userId = await getUserId(request);
    if (!userId) return unauthorized();
    await env.DB.prepare("UPDATE articles SET status = 'published', published_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND user_id = ?").bind(getId(request.url), userId).run();
    return json({ success: true });
  }
};

// 创意
const handleIdeas = {
  async list(request, env) {
    const userId = await getUserId(request);
    if (!userId) return unauthorized();
    const url = new URL(request.url);
    const category_id = url.searchParams.get('category_id');
    let sql = 'SELECT i.*, c.name as category_name FROM ideas i LEFT JOIN categories c ON i.category_id = c.id WHERE i.user_id = ?';
    const bindings = [userId];
    if (category_id) { sql += ' AND i.category_id = ?'; bindings.push(category_id); }
    sql += ' ORDER BY i.created_at DESC';
    const ideas = await env.DB.prepare(sql).bind(...bindings).all();
    return json({ ideas: ideas.results });
  },
  async create(request, env) {
    const userId = await getUserId(request);
    if (!userId) return unauthorized();
    const { content, category_id } = await request.json();
    if (!content) return json({ error: '内容不能为空' }, 400);
    const result = await env.DB.prepare('INSERT INTO ideas (user_id, content, category_id) VALUES (?, ?, ?)').bind(userId, content, category_id || null).run();
    return json({ id: result.meta.last_row_id, success: true });
  },
  async update(request, env) {
    const userId = await getUserId(request);
    if (!userId) return unauthorized();
    const id = getId(request.url);
    const { content, category_id } = await request.json();
    let sql = '';
    const bindings = [];
    if (content) { sql = 'UPDATE ideas SET content = ?'; bindings.push(content); }
    if (category_id !== undefined) { sql += ', category_id = ?'; bindings.push(category_id); }
    sql += ' WHERE id = ? AND user_id = ?';
    bindings.push(id, userId);
    await env.DB.prepare(sql).bind(...bindings).run();
    return json({ success: true });
  },
  async delete(request, env) {
    const userId = await getUserId(request);
    if (!userId) return unauthorized();
    await env.DB.prepare('DELETE FROM ideas WHERE id = ? AND user_id = ?').bind(getId(request.url), userId).run();
    return json({ success: true });
  },
  async generate(request, env) {
    const userId = await getUserId(request);
    if (!userId) return unauthorized();
    const ideaId = getId(request.url);
    const idea = await env.DB.prepare('SELECT * FROM ideas WHERE id = ? AND user_id = ?').bind(ideaId, userId).first();
    if (!idea) return json({ error: '创意不存在' }, 404);

    const textAI = await env.DB.prepare("SELECT * FROM ai_configs WHERE user_id = ? AND type = 'text' AND is_default = 1 AND is_active = 1").bind(userId).first();
    const imageAI = await env.DB.prepare("SELECT * FROM ai_configs WHERE user_id = ? AND type = 'image' AND is_default = 1 AND is_active = 1").bind(userId).first();

    if (!textAI) return json({ error: '请先配置文章AI' }, 400);

    try {
      let content = await callAI(textAI, idea.content, 'text');
      const placeholders = extractPlaceholders(content);

      for (const p of placeholders) {
        if (imageAI) {
          try {
            const imgUrl = await callAI(imageAI, p.desc, 'image');
            content = content.replace(p.raw, `![${p.desc}](${imgUrl})`);
          } catch { content = content.replace(p.raw, ''); }
        } else { content = content.replace(p.raw, ''); }
      }

      const titleMatch = content.match(/^#\s+(.+)$/m);
      const title = titleMatch ? titleMatch[1] : idea.content.substring(0, 30);

      const result = await env.DB.prepare("INSERT INTO articles (user_id, idea_id, title, content, source, status) VALUES (?, ?, ?, ?, 'ai', 'pending')").bind(userId, ideaId, title, content).run();
      await env.DB.prepare("UPDATE ideas SET status = 'generated' WHERE id = ?").bind(ideaId).run();
      await logAI(env, userId, 'text', textAI.model, idea.content, 'success');

      return json({ success: true, articleId: result.meta.last_row_id });
    } catch (err) {
      await logAI(env, userId, 'text', textAI.model, idea.content, 'failed', err.message);
      return json({ error: '生成失败: ' + err.message }, 500);
    }
  }
};

// 分类
const handleCategories = {
  async list(request, env) {
    const userId = await getUserId(request);
    if (!userId) return unauthorized();
    const cats = await env.DB.prepare('SELECT c.*, COUNT(i.id) as idea_count FROM categories c LEFT JOIN ideas i ON c.id = i.category_id WHERE c.user_id = ? GROUP BY c.id ORDER BY c.sort_order, c.created_at').bind(userId).all();
    return json({ categories: cats.results });
  },
  async create(request, env) {
    const userId = await getUserId(request);
    if (!userId) return unauthorized();
    const { name, icon, sort_order = 0 } = await request.json();
    if (!name) return json({ error: '名称不能为空' }, 400);
    const result = await env.DB.prepare('INSERT INTO categories (user_id, name, icon, sort_order) VALUES (?, ?, ?, ?)').bind(userId, name, icon || '📁', sort_order).run();
    return json({ id: result.meta.last_row_id, success: true });
  },
  async update(request, env) {
    const userId = await getUserId(request);
    if (!userId) return unauthorized();
    const id = getId(request.url);
    const { name, icon, sort_order } = await request.json();
    let sql = '';
    const bindings = [];
    if (name) { sql = 'UPDATE categories SET name = ?'; bindings.push(name); }
    if (icon !== undefined) { sql += ', icon = ?'; bindings.push(icon); }
    if (sort_order !== undefined) { sql += ', sort_order = ?'; bindings.push(sort_order); }
    sql += ' WHERE id = ? AND user_id = ?';
    bindings.push(id, userId);
    await env.DB.prepare(sql).bind(...bindings).run();
    return json({ success: true });
  },
  async delete(request, env) {
    const userId = await getUserId(request);
    if (!userId) return unauthorized();
    await env.DB.prepare('DELETE FROM categories WHERE id = ? AND user_id = ?').bind(getId(request.url), userId).run();
    return json({ success: true });
  }
};

// AI配置
const handleAIConfigs = {
  async list(request, env) {
    const userId = await getUserId(request);
    if (!userId) return unauthorized();
    const configs = await env.DB.prepare('SELECT * FROM ai_configs WHERE user_id = ? ORDER BY type, created_at DESC').bind(userId).all();
    return json({ configs: configs.results });
  },
  async create(request, env) {
    const userId = await getUserId(request);
    if (!userId) return unauthorized();
    const { name, type, model, api_key, api_endpoint, is_default = 0 } = await request.json();
    if (!name || !type || !model || !api_key) return json({ error: '缺少必要参数' }, 400);
    if (is_default) await env.DB.prepare('UPDATE ai_configs SET is_default = 0 WHERE user_id = ? AND type = ?').bind(userId, type).run();
    const result = await env.DB.prepare('INSERT INTO ai_configs (user_id, name, type, model, api_key, api_endpoint, is_default) VALUES (?, ?, ?, ?, ?, ?, ?)').bind(userId, name, type, model, api_key, api_endpoint || null, is_default).run();
    return json({ id: result.meta.last_row_id, success: true });
  },
  async update(request, env) {
    const userId = await getUserId(request);
    if (!userId) return unauthorized();
    const id = getId(request.url);
    const { name, type, model, api_key, api_endpoint, is_default, is_active } = await request.json();
    if (is_default) await env.DB.prepare('UPDATE ai_configs SET is_default = 0 WHERE user_id = ? AND type = ?').bind(userId, type).run();
    let sql = 'UPDATE ai_configs SET updated_at = CURRENT_TIMESTAMP';
    const bindings = [];
    if (name) { sql += ', name = ?'; bindings.push(name); }
    if (type) { sql += ', type = ?'; bindings.push(type); }
    if (model) { sql += ', model = ?'; bindings.push(model); }
    if (api_key) { sql += ', api_key = ?'; bindings.push(api_key); }
    if (api_endpoint !== undefined) { sql += ', api_endpoint = ?'; bindings.push(api_endpoint); }
    if (is_default !== undefined) { sql += ', is_default = ?'; bindings.push(is_default); }
    if (is_active !== undefined) { sql += ', is_active = ?'; bindings.push(is_active); }
    sql += ' WHERE id = ? AND user_id = ?';
    bindings.push(id, userId);
    await env.DB.prepare(sql).bind(...bindings).run();
    return json({ success: true });
  },
  async delete(request, env) {
    const userId = await getUserId(request);
    if (!userId) return unauthorized();
    await env.DB.prepare('DELETE FROM ai_configs WHERE id = ? AND user_id = ?').bind(getId(request.url), userId).run();
    return json({ success: true });
  }
};

// 评论
const handleComments = {
  async list(request, env) {
    const userId = await getUserId(request);
    if (!userId) return unauthorized();
    const comments = await env.DB.prepare('SELECT c.*, u.username, u.nickname FROM comments c JOIN users u ON c.user_id = u.id WHERE c.article_id = ? ORDER BY c.created_at ASC').bind(getId(request.url)).all();
    return json({ comments: comments.results });
  },
  async create(request, env) {
    const userId = await getUserId(request);
    if (!userId) return unauthorized();
    const { content } = await request.json();
    if (!content) return json({ error: '内容不能为空' }, 400);
    const result = await env.DB.prepare('INSERT INTO comments (article_id, user_id, content) VALUES (?, ?, ?)').bind(getId(request.url), userId, content).run();
    return json({ id: result.meta.last_row_id, success: true });
  }
};

// AI日志
const handleAILogs = {
  async list(request, env) {
    const userId = await getUserId(request);
    if (!userId) return unauthorized();
    const logs = await env.DB.prepare('SELECT * FROM ai_logs WHERE user_id = ? ORDER BY created_at DESC LIMIT 50').bind(userId).all();
    return json({ logs: logs.results });
  }
};

// 管理后台
const handleAdmin = {
  async login(request, env) {
    const { username, password } = await request.json();
    const admin = await env.DB.prepare("SELECT * FROM users WHERE username = ? AND password = ? AND is_admin = 1").bind(username, password).first();
    if (!admin) return json({ error: '管理员用户名或密码错误' }, 401);
    const token = btoa(JSON.stringify({ userId: admin.id, isAdmin: true, exp: Date.now() + 24 * 60 * 60 * 1000 }));
    return json({ admin: { id: admin.id, username: admin.username }, token });
  },
  async stats(request, env) {
    if (!await getUserId(request)) return unauthorized();
    const totalUsers = await env.DB.prepare('SELECT COUNT(*) as count FROM users WHERE is_admin = 0').first();
    const totalArticles = await env.DB.prepare('SELECT COUNT(*) as count FROM articles').first();
    const publishedCount = await env.DB.prepare("SELECT COUNT(*) as count FROM articles WHERE status = 'published'").first();
    const aiGenerateCount = await env.DB.prepare("SELECT COUNT(*) as count FROM articles WHERE source = 'ai'").first();
    const manualGenerateCount = await env.DB.prepare("SELECT COUNT(*) as count FROM articles WHERE source = 'manual'").first();
    const userStats = await env.DB.prepare('SELECT u.username, COUNT(a.id) as total, SUM(CASE WHEN a.status = \'published\' THEN 1 ELSE 0 END) as published, SUM(CASE WHEN a.source = \'ai\' THEN 1 ELSE 0 END) as ai_count FROM users u LEFT JOIN articles a ON u.id = a.user_id WHERE u.is_admin = 0 GROUP BY u.id ORDER BY total DESC').all();
    const recentArticles = await env.DB.prepare('SELECT a.*, u.username FROM articles a JOIN users u ON a.user_id = u.id ORDER BY a.created_at DESC LIMIT 20').all();
    return json({ stats: { totalUsers: totalUsers.count, totalArticles: totalArticles.count, publishedCount: publishedCount.count, aiGenerateCount: aiGenerateCount.count, manualGenerateCount: manualGenerateCount.count }, userStats: userStats.results, recentArticles: recentArticles.results });
  },
  async users(request, env) {
    if (!await getUserId(request)) return unauthorized();
    const users = await env.DB.prepare('SELECT u.*, COUNT(a.id) as article_count FROM users u LEFT JOIN articles a ON u.id = a.user_id WHERE u.is_admin = 0 GROUP BY u.id ORDER BY u.created_at DESC').all();
    return json({ users: users.results });
  },
  async deleteUser(request, env) {
    if (!await getUserId(request)) return unauthorized();
    const id = getId(request.url);
    await env.DB.prepare('DELETE FROM articles WHERE user_id = ?').bind(id).run();
    await env.DB.prepare('DELETE FROM ideas WHERE user_id = ?').bind(id).run();
    await env.DB.prepare('DELETE FROM ai_configs WHERE user_id = ?').bind(id).run();
    await env.DB.prepare('DELETE FROM users WHERE id = ? AND is_admin = 0').bind(id).run();
    return json({ success: true });
  },
  async articles(request, env) {
    if (!await getUserId(request)) return unauthorized();
    const url = new URL(request.url);
    const status = url.searchParams.get('status');
    const source = url.searchParams.get('source');
    let sql = 'SELECT a.*, u.username FROM articles a JOIN users u ON a.user_id = u.id WHERE 1=1';
    const bindings = [];
    if (status) { sql += ' AND a.status = ?'; bindings.push(status); }
    if (source) { sql += ' AND a.source = ?'; bindings.push(source); }
    sql += ' ORDER BY a.created_at DESC';
    const articles = await env.DB.prepare(sql).bind(...bindings).all();
    return json({ articles: articles.results });
  },
  async deleteArticle(request, env) {
    if (!await getUserId(request)) return unauthorized();
    await env.DB.prepare('DELETE FROM articles WHERE id = ?').bind(getId(request.url)).run();
    return json({ success: true });
  },
  async export(request, env) {
    if (!await getUserId(request)) return unauthorized();
    const articles = await env.DB.prepare("SELECT a.*, u.username FROM articles a JOIN users u ON a.user_id = u.id WHERE a.status = 'published' ORDER BY a.published_at DESC").all();
    let content = '';
    for (const a of articles.results) {
      content += `# ${a.title}\n\n作者: ${a.username}\n发布时间: ${a.published_at}\n\n${a.content}\n\n---\n\n`;
    }
    return new Response(content, { status: 200, headers: { 'Content-Type': 'text/markdown;charset=utf-8', 'Content-Disposition': `attachment; filename="articles_${new Date().toISOString().split('T')[0]}.md"` } });
  }
};

// 图片上传
const handleUpload = {
  async image(request, env) {
    const userId = await getUserId(request);
    if (!userId) return unauthorized();
    try {
      const formData = await request.formData();
      const file = formData.get('image');
      if (!file) return json({ error: '没有上传文件' }, 400);
      // 简化处理，实际应上传到R2或D1
      const url = `/uploads/${Date.now()}_${file.name}`;
      return json({ url, success: true });
    } catch (err) { return json({ error: err.message }, 500); }
  }
};
