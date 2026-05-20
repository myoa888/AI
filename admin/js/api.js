// 管理员API配置
const ADMIN_API_BASE = '/api';

const ADMIN_STORAGE_KEYS = {
  ADMIN: 'ai_article_admin',
  ADMIN_TOKEN: 'ai_article_admin_token'
};

async function adminRequest(url, options = {}) {
  const token = localStorage.getItem(ADMIN_STORAGE_KEYS.ADMIN_TOKEN);
  const defaultOptions = {
    headers: {
      'Content-Type': 'application/json',
      ...(token && { 'Authorization': `Bearer ${token}` }),
      ...options.headers
    }
  };
  const response = await fetch(`${ADMIN_API_BASE}${url}`, {
    ...defaultOptions,
    ...options,
    headers: { ...defaultOptions.headers, ...options.headers }
  });
  const data = await response.json();
  if (!response.ok) {
    if (response.status === 401) {
      localStorage.removeItem(ADMIN_STORAGE_KEYS.ADMIN);
      localStorage.removeItem(ADMIN_STORAGE_KEYS.ADMIN_TOKEN);
      window.location.href = '/admin/login.html';
    }
    throw new Error(data.error || '请求失败');
  }
  return data;
}

const AdminAPI = {
  auth: {
    async login(username, password) {
      return adminRequest('/admin/login', { method: 'POST', body: JSON.stringify({ username, password }) });
    },
    logout() {
      localStorage.removeItem(ADMIN_STORAGE_KEYS.ADMIN);
      localStorage.removeItem(ADMIN_STORAGE_KEYS.ADMIN_TOKEN);
      window.location.href = '/admin/login.html';
    }
  },
  stats: { async get() { return adminRequest('/admin/stats'); } },
  users: {
    async list(params = {}) {
      const query = new URLSearchParams(params).toString();
      return adminRequest(`/admin/users${query ? '?' + query : ''}`);
    },
    async get(id) { return adminRequest(`/admin/users/${id}`); },
    async delete(id) { return adminRequest(`/admin/users/${id}`, { method: 'DELETE' }); }
  },
  articles: {
    async list(params = {}) {
      const query = new URLSearchParams(params).toString();
      return adminRequest(`/admin/articles${query ? '?' + query : ''}`);
    },
    async delete(id) { return adminRequest(`/admin/articles/${id}`, { method: 'DELETE' }); }
  },
  async exportAll() {
    const token = localStorage.getItem(ADMIN_STORAGE_KEYS.ADMIN_TOKEN);
    const response = await fetch(`${ADMIN_API_BASE}/admin/export`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    return response.blob();
  },
  getCurrentAdmin() {
    const adminStr = localStorage.getItem(ADMIN_STORAGE_KEYS.ADMIN);
    return adminStr ? JSON.parse(adminStr) : null;
  },
  isLoggedIn() { return !!localStorage.getItem(ADMIN_STORAGE_KEYS.ADMIN_TOKEN); }
};

const AdminUtils = {
  toast(message, duration = 2000) {
    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.textContent = message;
    document.body.appendChild(toast);
    setTimeout(() => toast.classList.add('show'), 10);
    setTimeout(() => { toast.classList.remove('show'); setTimeout(() => toast.remove(), 300); }, duration);
  },
  formatDate(dateStr) { return dateStr ? new Date(dateStr).toLocaleDateString('zh-CN') : '-'; },
  escapeHtml(str) { const div = document.createElement('div'); div.textContent = str; return div.innerHTML; }
};
