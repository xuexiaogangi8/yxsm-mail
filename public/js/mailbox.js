/**
 * 邮箱用户专用页面逻辑 - Enhanced
 */

// 全局状态
let currentUser = null;
let currentMailbox = null;
let emails = [];
let currentPage = 1;
const pageSize = 20;
let autoRefreshTimer = null;
let progressTimer = null;
let keyword = '';
let selectedEmailId = null;

// DOM 元素引用
let elements = {};

// 初始化
document.addEventListener('DOMContentLoaded', function() {
  initializeElements();
  initializeTheme();
  initializeAuth();
  bindEvents();
});

/**
 * 初始化DOM元素引用
 */
function initializeElements() {
  elements = {
    // 主题
    themeToggle: document.getElementById('theme-toggle'),
    iconSun: document.querySelector('.icon-sun'),
    iconMoon: document.querySelector('.icon-moon'),

    // 基础
    toast: document.getElementById('toast'),
    
    // 邮箱信息
    currentMailbox: document.getElementById('current-mailbox'),
    copyMailboxBtn: document.getElementById('copy-mailbox'),
    refreshEmailsBtn: document.getElementById('refresh-emails'),
    
    // 邮件列表
    emailListContainer: document.getElementById('email-list-container'),
    emailList: document.getElementById('email-list'),
    listLoading: document.getElementById('list-loading'),
    listEmpty: document.getElementById('list-empty'),
    totalCount: document.getElementById('total-count'),
    unreadBadge: document.getElementById('unread-badge'),
    unreadCount: document.getElementById('unread-count'),
    
    // 详情视图 (Desktop)
    detailEmpty: document.getElementById('detail-empty'),
    detailContent: document.getElementById('detail-content'),
    detailSubject: document.getElementById('detail-subject'),
    detailFrom: document.getElementById('detail-from'),
    detailDate: document.getElementById('detail-date'),
    detailBody: document.getElementById('detail-body'),
    detailAvatar: document.getElementById('detail-avatar'),
    
    // 移动端详情模态框
    emailModal: document.getElementById('email-modal'),
    modalCloseBtn: document.getElementById('modal-close'),
    modalDetailContainer: document.getElementById('modal-detail-container'),
    
    // 密码修改
    passwordModal: document.getElementById('password-modal'),
    passwordForm: document.getElementById('password-form'),
    passwordClose: document.getElementById('password-close'),
    passwordCancel: document.getElementById('password-cancel'),
    changePasswordBtn: document.getElementById('change-password'),
    
    // 导航/工具栏
    logoutBtn: document.getElementById('logout'),
    autoRefresh: document.getElementById('auto-refresh'),
    progressBar: document.getElementById('auto-refresh-bar'),
    searchBox: document.getElementById('search-box'),
  };
}

/**
 * 初始化主题
 */
function initializeTheme() {
  const savedTheme = localStorage.getItem('theme') || 'light';
  document.documentElement.setAttribute('data-theme', savedTheme);
  updateThemeIcon(savedTheme);
  
  elements.themeToggle?.addEventListener('click', () => {
    const current = document.documentElement.getAttribute('data-theme');
    const next = current === 'light' ? 'dark' : 'light';
    document.documentElement.setAttribute('data-theme', next);
    localStorage.setItem('theme', next);
    updateThemeIcon(next);
  });
}

function updateThemeIcon(theme) {
  if (theme === 'dark') {
    elements.iconMoon.classList.add('hidden');
    elements.iconSun.classList.remove('hidden');
  } else {
    elements.iconMoon.classList.remove('hidden');
    elements.iconSun.classList.add('hidden');
  }
}

/**
 * 初始化认证状态
 */
async function initializeAuth() {
  try {
    const response = await fetch('/api/session');
    const data = await response.json();
    
    if (!data.authenticated || data.role !== 'mailbox') {
      location.replace('/');
      return;
    }
    
    currentUser = data;
    currentMailbox = data.mailbox || data.username;
    
    // 更新UI
    if(elements.currentMailbox) elements.currentMailbox.textContent = currentMailbox;
    
    // 加载邮件
    await loadEmails();
    
    // 启动自动刷新
    startAutoRefresh();
    
  } catch (error) {
    console.error('认证检查失败:', error);
    showToast('认证检查失败', 'error');
  }
}

/**
 * 绑定事件监听器
 */
function bindEvents() {
  // 复制邮箱地址
  elements.copyMailboxBtn?.addEventListener('click', () => {
    if (!currentMailbox) return;
    navigator.clipboard.writeText(currentMailbox).then(() => {
      showToast('邮箱地址已复制', 'success');
      // 简单的动画反馈
      const originalText = elements.copyMailboxBtn.innerHTML;
      elements.copyMailboxBtn.innerHTML = '<span>✓</span> 已复制';
      setTimeout(() => elements.copyMailboxBtn.innerHTML = originalText, 2000);
    });
  });
  
  // 刷新邮件
  elements.refreshEmailsBtn?.addEventListener('click', () => {
    loadEmails();
    startAutoRefresh(); // 重置计时器
  });

  // 自动刷新开关
  elements.autoRefresh?.addEventListener('change', (e) => {
    if (e.target.checked) {
      startAutoRefresh();
    } else {
      stopAutoRefresh();
    }
  });

  // 搜索
  elements.searchBox?.addEventListener('input', (e) => {
    keyword = e.target.value.trim().toLowerCase();
    renderEmailList();
  });
  
  // 退出登录
  elements.logoutBtn?.addEventListener('click', async () => {
    try {
      await fetch('/api/logout', { method: 'POST' });
      location.replace('/');
    } catch (e) {
      location.replace('/');
    }
  });
  
  // 修改密码模态框
  elements.changePasswordBtn?.addEventListener('click', () => {
    elements.passwordModal.classList.add('active');
  });
  
  [elements.passwordClose, elements.passwordCancel].forEach(btn => {
    btn?.addEventListener('click', () => {
      elements.passwordModal.classList.remove('active');
    });
  });

  elements.passwordForm?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const currentPass = document.getElementById('current-password').value;
    const newPass = document.getElementById('new-password').value;
    const confirmPass = document.getElementById('confirm-password').value;
    
    if (newPass !== confirmPass) {
      showToast('两次输入的新密码不一致', 'error');
      return;
    }
    
    try {
      const res = await fetch('/api/mailbox/password', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentPassword: currentPass, newPassword: newPass })
      });
      const data = await res.json();
      if (data.success) {
        showToast('密码修改成功', 'success');
        elements.passwordModal.classList.remove('active');
        elements.passwordForm.reset();
      } else {
        showToast(data.error || '修改失败', 'error');
      }
    } catch (e) {
      showToast('网络错误', 'error');
    }
  });
  
  // 移动端详情模态框关闭
  elements.modalCloseBtn?.addEventListener('click', () => {
    elements.emailModal.classList.remove('active');
  });
}

/**
 * 加载邮件列表
 */
async function loadEmails() {
  // 仅在首次或列表为空时显示加载中
  if (emails.length === 0) {
    showListState('loading');
  }
  
  try {
    const res = await fetch(`/api/emails?mailbox=${encodeURIComponent(currentMailbox)}&limit=${pageSize}`);
    const data = await res.json();
    
    emails = Array.isArray(data) ? data : (data?.emails || []);
    renderEmailList();
    updateStats();
  } catch (error) {
    console.error('加载邮件失败', error);
    showToast('加载邮件失败', 'error');
  }
}

/**
 * 渲染邮件列表
 */
function renderEmailList() {
  const listEl = elements.emailList;
  if (!listEl) return;
  
  listEl.innerHTML = '';
  
  let filteredEmails = emails;
  if (keyword) {
    filteredEmails = emails.filter(e => 
      (e.sender && e.sender.toLowerCase().includes(keyword)) || 
      (e.subject && e.subject.toLowerCase().includes(keyword))
    );
  }
  
  if (filteredEmails.length === 0) {
    showListState('empty');
    return;
  }
  
  showListState('list');
  
  filteredEmails.forEach(email => {
    const el = document.createElement('div');
    el.className = `email-item ${selectedEmailId === email.id ? 'active' : ''}`;
    el.onclick = () => selectEmail(email);
    
    // 头像颜色
    const senderName = email.sender || '';
    const avatarColor = getAvatarColor(senderName);
    const initials = getInitials(senderName);
    const dateStr = formatTime(email.received_at);
    
    el.innerHTML = `
      <div class="email-avatar" style="background: ${avatarColor}">${initials}</div>
      <div class="email-preview">
        <div class="email-sender">${escapeHtml(senderName)}</div>
        <div class="email-subject">${escapeHtml(email.subject || '无主题')}</div>
        <div class="email-meta">
          <span>${dateStr}</span>
        </div>
      </div>
    `;
    
    listEl.appendChild(el);
  });
}

/**
 * 选择邮件
 */
function selectEmail(email) {
  selectedEmailId = email.id;
  
  // 标记选中状态
  const items = document.querySelectorAll('.email-item');
  items.forEach(el => el.classList.remove('active'));
  // 重新渲染列表以更新选中态（稍微低效但简单）
  renderEmailList(); 
  
  const isMobile = window.innerWidth <= 768;
  
  if (isMobile) {
    // 移动端：打开模态框
    renderDetailToContainer(elements.modalDetailContainer, email);
    elements.emailModal.classList.add('active');
  } else {
    // 桌面端：右侧显示
    elements.detailEmpty.classList.add('hidden');
    elements.detailContent.classList.remove('hidden');
    
    elements.detailSubject.textContent = email.subject || '无主题';
    elements.detailFrom.textContent = email.sender || '';
    elements.detailDate.textContent = new Date(email.received_at).toLocaleString();
    
    const senderName = email.sender || '';
    const avatarColor = getAvatarColor(senderName);
    elements.detailAvatar.style.background = avatarColor;
    elements.detailAvatar.textContent = getInitials(senderName);
    
    elements.detailBody.innerHTML = email.html_content || email.content || email.preview || '<p class="text-muted">无内容</p>';
  }
}

function renderDetailToContainer(container, email) {
  if (!container) return;
  
  const senderName = email.sender || '';
  const avatarColor = getAvatarColor(senderName);
  const initials = getInitials(senderName);
  const bodyContent = email.html_content || email.content || email.preview || '';
  
  container.innerHTML = `
    <div class="email-detail-header">
      <h2 class="detail-subject">${escapeHtml(email.subject || '无主题')}</h2>
      <div class="detail-meta">
        <div class="email-avatar" style="background: ${avatarColor}">${initials}</div>
        <div class="detail-sender-info">
          <div class="detail-from">${escapeHtml(senderName)}</div>
          <div class="detail-time">${new Date(email.received_at).toLocaleString()}</div>
        </div>
      </div>
    </div>
    <div class="email-detail-body">
      ${bodyContent || '<p class="text-muted">无内容</p>'}
    </div>
  `;
}

/**
 * 辅助功能
 */
function showListState(state) {
  elements.listLoading.style.display = state === 'loading' ? 'flex' : 'none';
  elements.listEmpty.style.display = state === 'empty' ? 'flex' : 'none';
  elements.emailList.style.display = state === 'list' ? 'block' : 'none';
}

function updateStats() {
  if (elements.totalCount) elements.totalCount.textContent = `${emails.length} 封邮件`;
  // 假设未读逻辑（目前简单处理，实际可能需要后端支持状态）
  // 这里暂时隐藏未读数，除非有明确的已读状态字段
  if (elements.unreadBadge) elements.unreadBadge.style.display = 'none';
}

function startAutoRefresh() {
  stopAutoRefresh();
  if (!elements.autoRefresh?.checked) return;
  
  const interval = 10000; // 10秒
  let progress = 0;
  const step = 100 / (interval / 100);
  
  // 进度条动画
  progressTimer = setInterval(() => {
    progress += step;
    if (elements.progressBar) elements.progressBar.style.width = `${Math.min(progress, 100)}%`;
    
    if (progress >= 100) {
      loadEmails();
      progress = 0;
    }
  }, 100);
  
  // 实际的定时器由 progressTimer 控制循环调用 loadEmails
}

function stopAutoRefresh() {
  if (progressTimer) clearInterval(progressTimer);
  progressTimer = null;
  if (elements.progressBar) elements.progressBar.style.width = '0%';
}

// 颜色生成器
function getAvatarColor(name) {
  const colors = [
    '#ef4444', '#f97316', '#f59e0b', '#84cc16', '#10b981',
    '#06b6d4', '#3b82f6', '#6366f1', '#8b5cf6', '#d946ef', '#f43f5e'
  ];
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return colors[Math.abs(hash) % colors.length];
}

function getInitials(name) {
  if (!name) return '?';
  // 尝试获取名称部分 (e.g. "Google <no-reply@google.com>")
  const match = name.match(/^"?([^"<@]+)"?/);
  const cleanName = match ? match[1].trim() : name;
  return cleanName.charAt(0).toUpperCase();
}

function formatTime(dateStr) {
  const date = new Date(dateStr);
  const now = new Date();
  const isToday = date.toDateString() === now.toDateString();
  
  if (isToday) {
    return date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
  }
  return date.toLocaleDateString('zh-CN', { month: '2-digit', day: '2-digit' });
}

function escapeHtml(text) {
  if (!text) return '';
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

function showToast(message, type = 'info') {
  // 复用 toast-utils.js 或自定义
  if (window.ToastUtils) {
    window.ToastUtils.show(message, type);
  } else {
    // Fallback
    const toast = elements.toast;
    toast.textContent = message;
    toast.className = `toast toast-${type} show`;
    setTimeout(() => toast.classList.remove('show'), 3000);
  }
}
