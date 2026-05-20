// API 配置
const API_BASE = '/api';

// 存储键
const STORAGE_KEYS = {
  USER: 'ai_article_user',
  TOKEN: 'ai_article_token'
};

// 通用请求封装
async function request(url, options = {}) {
  const token = localStorage.getItem(STORAGE_KEYS.TOKEN);
  
  const defaultOptions = {
    headers: {
      'Content-Type': 'application/json',
      ...(token && { 'Authorization': `Bearer ${token}` }),
      ...options.headers
    }
  };

  const response = await fetch(`${API_BASE}${url}`, {
    ...defaultOptions,
    ...options,
    headers: {
      ...defaultOptions.headers,
      ...options.headers
    }
  });

  const data = await response.json();

  if (!response.ok) {
    if (response.status === 401) {
      localStorage.removeItem(STORAGE_KEYS.USER);
      localStorage.removeItem(STORAGE_KEYS.TOKEN);
      window.location.href = '/mobile/login.html';
    }
    throw new Error(data.error || '请求失败');
  }

  return data;
}

// API 方法
const API = {
  auth: {
    async register(username, password, nickname) {
      return request('/auth/register', {
        method: 'POST',
        body: JSON.stringify({ username, password, nickname })
      });
    },
    async login(username, password) {
      return request('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ username, password })
      });
    },
    logout() {
      localStorage.removeItem(STORAGE_KEYS.USER);
      localStorage.removeItem(STORAGE_KEYS.TOKEN);
      window.location.href = '/mobile/login.html';
    }
  },
  articles: {
    async list(params = {}) {
      const query = new URLSearchParams(params).toString();
      return request(`/articles${query ? '?' + query : ''}`);
    },
    async get(id) {
      return request(`/articles/${id}`);
    },
    async create(data) {
      return request('/articles', {
        method: 'POST',
        body: JSON.stringify(data)
      });
    },
    async update(id, data) {
      return request(`/articles/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data)
      });
    },
    async delete(id) {
      return request(`/articles/${id}`, { method: 'DELETE' });
    },
    async publish(id) {
      return request(`/articles/${id}/publish`, { method: 'POST' });
    }
  },
  ideas: {
    async list(params = {}) {
      const query = new URLSearchParams(params).toString();
      return request(`/ideas${query ? '?' + query : ''}`);
    },
    async create(data) {
      return request('/ideas', { method: 'POST', body: JSON.stringify(data) });
    },
    async generate(id) {
      return request(`/ideas/${id}/generate`, { method: 'POST' });
    },
    async delete(id) {
      return request(`/ideas/${id}`, { method: 'DELETE' });
    }
  },
  categories: {
    async list() {
      return request('/categories');
    },
    async create(data) {
      return request('/categories', { method: 'POST', body: JSON.stringify(data) });
    },
    async update(id, data) {
      return request(`/categories/${id}`, { method: 'PUT', body: JSON.stringify(data) });
    },
    async delete(id) {
      return request(`/categories/${id}`, { method: 'DELETE' });
    }
  },
  aiConfigs: {
    async list() {
      return request('/ai-configs');
    },
    async create(data) {
      return request('/ai-configs', { method: 'POST', body: JSON.stringify(data) });
    },
    async update(id, data) {
      return request(`/ai-configs/${id}`, { method: 'PUT', body: JSON.stringify(data) });
    },
    async delete(id) {
      return request(`/ai-configs/${id}`, { method: 'DELETE' });
    }
  },
  comments: {
    async list(articleId) {
      return request(`/articles/${articleId}/comments`);
    },
    async add(articleId, content) {
      return request(`/articles/${articleId}/comments`, {
        method: 'POST',
        body: JSON.stringify({ content })
      });
    }
  },
  upload: {
    async image(file) {
      const formData = new FormData();
      formData.append('image', file);
      const token = localStorage.getItem(STORAGE_KEYS.TOKEN);
      const response = await fetch(`${API_BASE}/upload`, {
        method: 'POST',
        headers: { ...(token && { 'Authorization': `Bearer ${token}` }) },
        body: formData
      });
      return response.json();
    }
  },
  user: {
    getCurrentUser() {
      const userStr = localStorage.getItem(STORAGE_KEYS.USER);
      return userStr ? JSON.parse(userStr) : null;
    },
    isLoggedIn() {
      return !!localStorage.getItem(STORAGE_KEYS.TOKEN);
    }
  }
};

// 工具函数
const Utils = {
  toast(message, duration = 2000) {
    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.textContent = message;
    document.body.appendChild(toast);
    setTimeout(() => toast.classList.add('show'), 10);
    setTimeout(() => {
      toast.classList.remove('show');
      setTimeout(() => toast.remove(), 300);
    }, duration);
  },
  confirm(message) {
    return new Promise((resolve) => {
      const overlay = document.createElement('div');
      overlay.className = 'modal-overlay';
      overlay.innerHTML = `
        <div class="modal-content">
          <p>${message}</p>
          <div class="modal-buttons">
            <button class="btn-cancel">取消</button>
            <button class="btn-confirm">确定</button>
          </div>
        </div>
      `;
      document.body.appendChild(overlay);
      overlay.querySelector('.btn-cancel').onclick = () => { overlay.remove(); resolve(false); };
      overlay.querySelector('.btn-confirm').onclick = () => { overlay.remove(); resolve(true); };
    });
  },
  formatDate(dateStr) {
    const date = new Date(dateStr);
    const now = new Date();
    const diff = now - date;
    if (diff < 60000) return '刚刚';
    if (diff < 3600000) return Math.floor(diff / 60000) + '分钟前';
    if (diff < 86400000) return Math.floor(diff / 3600000) + '小时前';
    if (diff < 604800000) return Math.floor(diff / 86400000) + '天前';
    return date.toLocaleDateString('zh-CN');
  },
  formatFullDate(dateStr) {
    const date = new Date(dateStr);
    return date.toLocaleDateString('zh-CN', {
      year: 'numeric', month: 'long', day: 'numeric',
      hour: '2-digit', minute: '2-digit'
    });
  },
  escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  },
  parseMarkdown(text) {
    // 简单Markdown解析
    return text
      .replace(/^### (.+)$/gm, '<h3>$1</h3>')
      .replace(/^## (.+)$/gm, '<h2>$1</h2>')
      .replace(/^# (.+)$/gm, '<h1>$1</h1>')
      .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.+?)\*/g, '<em>$1</em>')
      .replace(/!\[([^\]]*)\]\(([^)]+)\)/g, '<img src="$2" alt="$1" loading="lazy">')
      .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank">$1</a>')
      .replace(/\n\n/g, '</p><p>')
      .replace(/\n/g, '<br>');
  }
};
