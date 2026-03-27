/**
 * Chrome扩展的popup脚本
 */

document.addEventListener('DOMContentLoaded', async () => {
  document.getElementById('extract-cookies').addEventListener('click', extractCookies);
  document.getElementById('inject-cookies').addEventListener('click', injectCookies);
  document.getElementById('save-cookies').addEventListener('click', saveCookies);
  document.getElementById('load-saved-cookies').addEventListener('click', loadSavedCookies);
  document.getElementById('refresh-saved-cookies').addEventListener('click', refreshSavedCookiesList);
  document.getElementById('load-url').addEventListener('click', loadCurrentTabUrl);
  document.getElementById('format-json').addEventListener('click', formatJson);
  document.getElementById('json-view-btn').addEventListener('click', () => switchView('json'));
  document.getElementById('table-view-btn').addEventListener('click', () => switchView('table'));
  document.getElementById('copy-cookies').addEventListener('click', copyCookies);
  document.getElementById('copy-localstorage').addEventListener('click', () => copyStorage('local'));
  document.getElementById('copy-sessionstorage').addEventListener('click', () => copyStorage('session'));

  document.getElementById('cookies-json').addEventListener('input', function () {
    updateTableFromJson();
    cacheCookieData();
  });

  document.getElementById('select-all-cookies').addEventListener('click', function () {
    const isChecked = this.checked;
    document.querySelectorAll('#cookies-table-body input[type="checkbox"]').forEach(cb => {
      cb.checked = isChecked;
    });
  });

  await loadCurrentTabUrl();
  await refreshSavedCookiesList();
  await loadCachedCookieData();
  switchView('table');
});

// ── Toast ──────────────────────────────────────────────────────────────────

let toastTimer = null;

/**
 * 显示 toast 提示
 * @param {string} text
 * @param {'success'|'error'|'warn'} type
 */
function showMessage(text, type = 'success') {
  // 兼容旧调用：第二个参数为 boolean
  if (typeof type === 'boolean') {
    type = type ? 'success' : 'error';
  }
  const toast = document.getElementById('toast');
  toast.textContent = text;
  toast.className = `show ${type}`;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => {
    toast.className = '';
  }, 3000);
}

// ── Cookie 缓存 ────────────────────────────────────────────────────────────

async function cacheCookieData() {
  const cookiesJson = document.getElementById('cookies-json').value.trim();
  try {
    await chrome.runtime.sendMessage({ action: 'cacheCookieData', cookiesJson });
  } catch (e) {
    console.warn('缓存Cookie数据失败:', e);
  }
}

async function loadCachedCookieData() {
  try {
    const res = await chrome.runtime.sendMessage({ action: 'loadCachedCookieData' });
    if (res && res.success && res.cachedData) {
      document.getElementById('cookies-json').value = res.cachedData;
      updateTableFromJson();
    }
  } catch (e) {
    console.error('加载缓存Cookie失败:', e);
  }
}

// ── URL ────────────────────────────────────────────────────────────────────

async function loadCurrentTabUrl() {
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    const url = new URL(tab.url);
    document.getElementById('current-url').value = url.origin;
    document.getElementById('target-url').value = url.origin;
  } catch (e) {
    showMessage(`加载URL失败: ${e.message}`, 'error');
  }
}

// ── 提取 Cookie ────────────────────────────────────────────────────────────

async function extractCookies() {
  const url = document.getElementById('current-url').value.trim();
  if (!url) { showMessage('请输入URL', 'error'); return; }

  try {
    const res = await chrome.runtime.sendMessage({ action: 'extractCookies', url });
    if (res.success) {
      document.getElementById('cookies-json').value = JSON.stringify(res.cookies, null, 2);
      updateTableFromJson();
      await cacheCookieData();
      showMessage(`成功提取 ${res.cookies.length} 个 Cookie`, 'success');
    } else {
      showMessage(`提取失败: ${res.error}`, 'error');
    }
  } catch (e) {
    showMessage(`提取失败: ${e.message}`, 'error');
  }
}

// ── 注入 Cookie ────────────────────────────────────────────────────────────

async function injectCookies() {
  const url = document.getElementById('target-url').value.trim();
  const cookiesJson = document.getElementById('cookies-json').value.trim();

  if (!url) { showMessage('请输入目标URL', 'error'); return; }
  if (!cookiesJson) { showMessage('请输入Cookie数据', 'error'); return; }

  try {
    const cookies = JSON.parse(cookiesJson);
    const cookiesToInject = filterCookiesBySelection(cookies);
    const res = await chrome.runtime.sendMessage({ action: 'injectCookies', url, cookies: cookiesToInject });
    if (res.success) {
      showMessage('Cookie 注入成功', 'success');
    } else {
      showMessage(`注入失败: ${res.error}`, 'error');
    }
  } catch (e) {
    showMessage(`解析Cookie失败: ${e.message}`, 'error');
  }
}

// ── 复制 Cookie ────────────────────────────────────────────────────────────

async function copyCookies() {
  const cookiesJson = document.getElementById('cookies-json').value.trim();

  // 判断是否获取到 Cookie 信息
  if (!cookiesJson) {
    showMessage('暂无 Cookie 数据，请先提取或输入 Cookie', 'warn');
    return;
  }

  let cookies;
  try {
    cookies = JSON.parse(cookiesJson);
  } catch (e) {
    showMessage('Cookie 数据格式错误，请检查 JSON', 'error');
    return;
  }

  if (!Array.isArray(cookies) || cookies.length === 0) {
    showMessage('Cookie 列表为空，请先提取 Cookie', 'warn');
    return;
  }

  const cookiesToCopy = filterCookiesBySelection(cookies);
  if (!cookiesToCopy || cookiesToCopy.length === 0) {
    showMessage('请至少勾选一个 Cookie', 'warn');
    return;
  }

  const format = document.getElementById('copy-format').value;
  const outputText = format === 'json'
    ? buildJsonCopyText(cookiesToCopy)
    : buildPlainCopyText(cookiesToCopy);

  if (!outputText) {
    showMessage('无法生成复制内容', 'error');
    return;
  }

  try {
    await copyTextToClipboard(outputText);
    showMessage('已复制到剪贴板', 'success');
  } catch (e) {
    showMessage(`复制失败: ${e.message}`, 'error');
  }
}

function filterCookiesBySelection(cookies) {
  if (!Array.isArray(cookies)) return [];
  const tableViewBtn = document.getElementById('table-view-btn');
  if (!tableViewBtn || !tableViewBtn.classList.contains('active')) return cookies;

  const checked = document.querySelectorAll('#cookies-table-body input[type="checkbox"]:checked');
  if (checked.length === 0) return cookies;

  const indices = Array.from(checked)
    .map(cb => parseInt(cb.id.replace('cookie-', ''), 10))
    .filter(i => !Number.isNaN(i));

  return cookies.filter((_, i) => indices.includes(i));
}

function buildJsonCopyText(cookies) {
  const payload = {};
  cookies.forEach(c => { if (c && c.name) payload[c.name] = c.value ?? ''; });
  return Object.keys(payload).length ? JSON.stringify(payload, null, 2) : '';
}

function buildPlainCopyText(cookies) {
  const parts = cookies.filter(c => c && c.name).map(c => `${c.name}=${c.value ?? ''}`);
  return parts.length ? `${parts.join(';')};` : '';
}

async function copyTextToClipboard(text) {
  if (navigator.clipboard && navigator.clipboard.writeText) {
    await navigator.clipboard.writeText(text);
    return;
  }
  const el = document.createElement('textarea');
  el.value = text;
  el.style.cssText = 'position:fixed;opacity:0';
  document.body.appendChild(el);
  el.focus(); el.select();
  const ok = document.execCommand('copy');
  document.body.removeChild(el);
  if (!ok) throw new Error('浏览器不支持复制命令');
}

// ── 保存 / 加载 Cookie 集 ──────────────────────────────────────────────────

async function saveCookies() {
  const name = document.getElementById('cookie-set-name').value.trim();
  const cookiesJson = document.getElementById('cookies-json').value.trim();
  if (!name) { showMessage('请输入Cookie集名称', 'error'); return; }
  if (!cookiesJson) { showMessage('请输入Cookie数据', 'error'); return; }

  try {
    const cookies = JSON.parse(cookiesJson);
    const res = await chrome.runtime.sendMessage({ action: 'saveCookies', name, cookies });
    if (res.success) {
      showMessage(`已保存: ${name}`, 'success');
      await refreshSavedCookiesList();
    } else {
      showMessage(`保存失败: ${res.error}`, 'error');
    }
  } catch (e) {
    showMessage(`保存失败: ${e.message}`, 'error');
  }
}

async function loadSavedCookies() {
  const name = document.getElementById('cookie-set-name').value.trim();
  if (!name) { showMessage('请输入要加载的Cookie集名称', 'error'); return; }

  try {
    const res = await chrome.runtime.sendMessage({ action: 'loadCookies', name });
    if (res.success) {
      document.getElementById('cookies-json').value = JSON.stringify(res.cookies, null, 2);
      updateTableFromJson();
      await cacheCookieData();
      showMessage(`已加载: ${name}`, 'success');
    } else {
      showMessage(`加载失败: ${res.error}`, 'error');
    }
  } catch (e) {
    showMessage(`加载失败: ${e.message}`, 'error');
  }
}

async function refreshSavedCookiesList() {
  try {
    const res = await chrome.runtime.sendMessage({ action: 'getSavedCookieNames' });
    const list = document.getElementById('saved-cookies-list');
    list.innerHTML = '';

    if (res.success && res.names && res.names.length > 0) {
      res.names.forEach(name => {
        const item = document.createElement('div');
        item.className = 'saved-item';

        const nameEl = document.createElement('span');
        nameEl.className = 'saved-item-name';
        nameEl.textContent = name;
        nameEl.title = name;

        const actions = document.createElement('div');
        actions.className = 'saved-item-actions';

        const useBtn = document.createElement('button');
        useBtn.className = 'btn btn-ghost btn-sm';
        useBtn.textContent = '使用';
        useBtn.addEventListener('click', async () => {
          const r = await chrome.runtime.sendMessage({ action: 'loadCookies', name });
          if (r.success) {
            document.getElementById('cookies-json').value = JSON.stringify(r.cookies, null, 2);
            updateTableFromJson();
            await cacheCookieData();
            showMessage(`已加载: ${name}`, 'success');
          }
        });

        const delBtn = document.createElement('button');
        delBtn.className = 'btn btn-danger btn-sm';
        delBtn.textContent = '删除';
        delBtn.addEventListener('click', async () => {
          if (!confirm(`确定删除 Cookie 集「${name}」？`)) return;
          const r = await chrome.runtime.sendMessage({ action: 'deleteCookies', name });
          if (r.success) {
            showMessage(`已删除: ${name}`, 'success');
            refreshSavedCookiesList();
          } else {
            showMessage(`删除失败: ${r.error}`, 'error');
          }
        });

        actions.appendChild(useBtn);
        actions.appendChild(delBtn);
        item.appendChild(nameEl);
        item.appendChild(actions);
        list.appendChild(item);
      });
    } else {
      list.innerHTML = '<div class="empty-state">暂无保存的 Cookie 集</div>';
    }
  } catch (e) {
    showMessage(`刷新列表失败: ${e.message}`, 'error');
  }
}

// ── JSON 格式化 ────────────────────────────────────────────────────────────

async function formatJson() {
  const el = document.getElementById('cookies-json');
  if (!el.value.trim()) return;
  try {
    el.value = JSON.stringify(JSON.parse(el.value), null, 2);
    updateTableFromJson();
    await cacheCookieData();
    showMessage('格式化成功', 'success');
  } catch (e) {
    showMessage(`格式化失败: ${e.message}`, 'error');
  }
}

// ── 视图切换 ───────────────────────────────────────────────────────────────

function switchView(view) {
  const jsonBtn = document.getElementById('json-view-btn');
  const tableBtn = document.getElementById('table-view-btn');
  const jsonEl = document.getElementById('cookies-json');
  const tableEl = document.getElementById('cookies-table-container');

  if (view === 'json') {
    jsonBtn.classList.add('active');
    tableBtn.classList.remove('active');
    jsonEl.style.display = 'block';
    tableEl.classList.remove('active');
  } else {
    tableBtn.classList.add('active');
    jsonBtn.classList.remove('active');
    jsonEl.style.display = 'none';
    tableEl.classList.add('active');
    updateTableFromJson();
  }
}

// ── 表格更新 ───────────────────────────────────────────────────────────────

function updateTableFromJson() {
  const jsonText = document.getElementById('cookies-json').value.trim();
  const tbody = document.getElementById('cookies-table-body');
  const countBadge = document.getElementById('cookie-count');
  tbody.innerHTML = '';

  const makeEmpty = (msg, isError = false) => {
    const tr = document.createElement('tr');
    const td = document.createElement('td');
    td.colSpan = 8;
    td.textContent = msg;
    td.style.cssText = `text-align:center;padding:16px;color:${isError ? '#dc2626' : '#9ca3af'}`;
    tr.appendChild(td);
    tbody.appendChild(tr);
    countBadge.textContent = '0';
  };

  if (!jsonText) { makeEmpty('暂无 Cookie 数据'); return; }

  let cookies;
  try {
    cookies = JSON.parse(jsonText);
  } catch (e) {
    makeEmpty(`JSON 解析错误: ${e.message}`, true);
    return;
  }

  if (!Array.isArray(cookies)) { makeEmpty('数据格式错误，需要数组格式', true); return; }
  if (cookies.length === 0) { makeEmpty('暂无 Cookie 数据'); return; }

  countBadge.textContent = cookies.length;

  cookies.forEach((cookie, index) => {
    const tr = document.createElement('tr');

    const cbTd = document.createElement('td');
    const cb = document.createElement('input');
    cb.type = 'checkbox';
    cb.id = `cookie-${index}`;
    if (cookie.name === 'access_token' || cookie.name === 'refresh_token') cb.checked = true;
    cbTd.appendChild(cb);

    tr.appendChild(cbTd);
    tr.appendChild(makeCell(cookie.name || ''));
    tr.appendChild(makeCell(cookie.value || '', true));
    tr.appendChild(makeCell(cookie.domain || ''));
    tr.appendChild(makeCell(cookie.path || ''));
    tr.appendChild(makeCell(formatExpiry(cookie.expirationDate)));
    tr.appendChild(makeCell(cookie.secure ? '✓' : ''));
    tr.appendChild(makeCell(cookie.httpOnly ? '✓' : ''));

    tbody.appendChild(tr);
  });
}

function makeCell(content, isValue = false) {
  const td = document.createElement('td');
  if (typeof content === 'string' && content.length > 50) {
    const span = document.createElement('span');
    span.className = 'truncate';
    span.textContent = content;
    span.title = content;
    td.appendChild(span);
  } else {
    td.textContent = content;
    if (isValue && content) td.title = content;
  }
  return td;
}

function formatExpiry(ts) {
  if (!ts) return '会话';
  try { return new Date(ts * 1000).toLocaleString('zh-CN'); }
  catch { return '无效'; }
}

// ── LocalStorage / SessionStorage ─────────────────────────────────────────

/**
 * 读取当前标签页的 localStorage 或 sessionStorage 并复制到剪贴板
 * @param {'local'|'session'} storageType
 */
async function copyStorage(storageType) {
  const label = storageType === 'local' ? 'LocalStorage' : 'SessionStorage';

  let tab;
  try {
    [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  } catch (e) {
    showMessage('无法获取当前标签页', 'error');
    return;
  }

  if (!tab || !tab.id) {
    showMessage('无法获取当前标签页', 'error');
    return;
  }

  // chrome-extension:// / chrome:// 等页面无法注入脚本
  if (!tab.url || !/^https?:\/\//.test(tab.url)) {
    showMessage(`当前页面不支持读取 ${label}`, 'warn');
    return;
  }

  try {
    const res = await chrome.runtime.sendMessage({
      action: 'extractStorage',
      tabId: tab.id,
      storageType
    });

    if (!res.success) {
      showMessage(`读取 ${label} 失败: ${res.error}`, 'error');
      return;
    }

    const data = res.data;
    const keys = Object.keys(data);

    if (keys.length === 0) {
      showMessage(`${label} 为空`, 'warn');
      renderStoragePreview({});
      return;
    }

    // 更新预览表格
    renderStoragePreview(data);

    // 复制 JSON 到剪贴板
    const text = JSON.stringify(data, null, 2);
    await copyTextToClipboard(text);

    document.getElementById('storage-count').textContent = keys.length;
    showMessage(`已复制 ${label}（${keys.length} 条）`, 'success');
  } catch (e) {
    showMessage(`操作失败: ${e.message}`, 'error');
  }
}

/**
 * 渲染存储数据预览表格
 * @param {Object} data
 */
function renderStoragePreview(data) {
  const preview = document.getElementById('storage-preview');
  const tbody = document.getElementById('storage-table-body');
  const helper = document.getElementById('storage-helper');
  tbody.innerHTML = '';

  const keys = Object.keys(data);

  if (keys.length === 0) {
    preview.style.display = 'none';
    helper.textContent = '该存储为空';
    document.getElementById('storage-count').textContent = '0';
    return;
  }

  keys.forEach(key => {
    const tr = document.createElement('tr');
    tr.appendChild(makeCell(key));
    tr.appendChild(makeCell(data[key] ?? '', true));
    tbody.appendChild(tr);
  });

  preview.style.display = 'block';
  helper.textContent = `共 ${keys.length} 条数据，已复制为 JSON 格式`;
}
