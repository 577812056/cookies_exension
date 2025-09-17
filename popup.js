/**
 * Chrome扩展的popup脚本
 * 负责处理用户界面交互和与后台脚本的通信
 */

// 等待DOM加载完成
document.addEventListener('DOMContentLoaded', async () => {
  // 绑定事件监听器
  document.getElementById('extract-cookies').addEventListener('click', extractCookies);
  document.getElementById('inject-cookies').addEventListener('click', injectCookies);
  document.getElementById('save-cookies').addEventListener('click', saveCookies);
  document.getElementById('load-saved-cookies').addEventListener('click', loadSavedCookies);
  document.getElementById('refresh-saved-cookies').addEventListener('click', refreshSavedCookiesList);
  document.getElementById('load-url').addEventListener('click', loadCurrentTabUrl);
  document.getElementById('format-json').addEventListener('click', formatJson);
  document.getElementById('json-view-btn').addEventListener('click', () => switchView('json'));
  document.getElementById('table-view-btn').addEventListener('click', () => switchView('table'));
  
  // 监听JSON文本变化，自动更新表格视图和缓存
  document.getElementById('cookies-json').addEventListener('input', function() {
    updateTableFromJson();
    cacheCookieData();
  });
  
  // 全选/取消全选功能
  document.getElementById('select-all-cookies').addEventListener('click', function() {
    const isChecked = this.checked;
    document.querySelectorAll('#cookies-table-body input[type="checkbox"]').forEach(checkbox => {
      checkbox.checked = isChecked;
    });
  });
  
  // 初始化页面
  await loadCurrentTabUrl();
  await refreshSavedCookiesList();
  
  // 加载缓存的Cookie数据
  await loadCachedCookieData();
  
  switchView('table')
});

/**
 * 缓存Cookie数据到background.js
 */
async function cacheCookieData() {
  const cookiesJson = document.getElementById('cookies-json').value.trim();
  try {
    await chrome.runtime.sendMessage({
      action: 'cacheCookieData',
      cookiesJson
    });
  } catch (error) {
    console.warn('缓存Cookie数据失败:', error);
  }
}

/**
 * 从background.js加载缓存的Cookie数据
 */
async function loadCachedCookieData() {
  try {
    const response = await chrome.runtime.sendMessage({
      action: 'loadCachedCookieData'
    });
    if (response && response.success && response.cachedData) {
      document.getElementById('cookies-json').value = response.cachedData;
      updateTableFromJson();
    }
  } catch (error) {
    console.error('加载缓存的Cookie数据失败:', error);
  }
}

/**
 * 显示消息
 * @param {string} text - 消息文本
 * @param {boolean} isSuccess - 是否为成功消息
 */
function showMessage(text, isSuccess = true) {
  const messageElement = document.getElementById('message');
  messageElement.textContent = text;
  messageElement.className = `message ${isSuccess ? 'success' : 'error'}`;
  
  // 3秒后自动隐藏消息
  setTimeout(() => {
    messageElement.style.display = 'none';
  }, 3000);
}

/**
 * 加载当前标签页的URL
 */
async function loadCurrentTabUrl() {
  try {
    let [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      const currentUrlInput = document.getElementById('current-url');
      const targetUrlInput = document.getElementById('target-url');
      let url = new URL(tab.url);
      currentUrlInput.value = url.origin;
      targetUrlInput.value = url.origin;
  } catch (error) {
    showMessage(`加载URL失败: ${error.message}`, false);
  }
}

/**
 * 从当前页面提取Cookie
 */
async function extractCookies() {
  const url = document.getElementById('current-url').value.trim();
  
  if (!url) {
    showMessage('请输入URL', false);
    return;
  }
  
  try {
    const response = await chrome.runtime.sendMessage({
      action: 'extractCookies',
      url
    });
    
    if (response.success) {
      document.getElementById('cookies-json').value = JSON.stringify(response.cookies, null, 2);
      updateTableFromJson(); // 更新表格视图
      await cacheCookieData(); // 缓存Cookie数据
      showMessage(`成功提取 ${response.cookies.length} 个Cookie`);
    } else {
      showMessage(`提取Cookie失败: ${response.error}`, false);
    }
  } catch (error) {
    showMessage(`提取Cookie失败: ${error.message}`, false);
  }
}

/**
 * 向目标URL注入Cookie
 */
async function injectCookies() {
  const url = document.getElementById('target-url').value.trim();
  const cookiesJson = document.getElementById('cookies-json').value.trim();
  
  if (!url) {
    showMessage('请输入目标URL', false);
    return;
  }
  
  if (!cookiesJson) {
    showMessage('请输入Cookie数据', false);
    return;
  }
  
  try {
    const cookies = JSON.parse(cookiesJson);
    
    // 如果当前是表格视图，检查勾选状态
    let cookiesToInject = cookies;
    const tableViewBtn = document.getElementById('table-view-btn');
    
    if (tableViewBtn.classList.contains('active')) {
      const checkedCheckboxes = document.querySelectorAll('#cookies-table-body input[type="checkbox"]:checked');
      
      if (checkedCheckboxes.length > 0) {
        // 只注入勾选的Cookie
        const checkedIndices = Array.from(checkedCheckboxes).map(checkbox => 
          parseInt(checkbox.id.replace('cookie-', ''))
        );
        
        cookiesToInject = cookies.filter((_, index) => checkedIndices.includes(index));
      }
    }
    
    const response = await chrome.runtime.sendMessage({
      action: 'injectCookies',
      url,
      cookies: cookiesToInject
    });
    
    if (response.success) {
      showMessage('成功注入Cookie');
    } else {
      showMessage(`注入Cookie失败: ${response.error}`, false);
    }
  } catch (error) {
    showMessage(`解析Cookie失败: ${error.message}`, false);
  }
}

/**
 * 保存Cookie集到本地存储
 */
async function saveCookies() {
  const name = document.getElementById('cookie-set-name').value.trim();
  const cookiesJson = document.getElementById('cookies-json').value.trim();
  
  if (!name) {
    showMessage('请输入Cookie集名称', false);
    return;
  }
  
  if (!cookiesJson) {
    showMessage('请输入Cookie数据', false);
    return;
  }
  
  try {
    const cookies = JSON.parse(cookiesJson);
    
    const response = await chrome.runtime.sendMessage({
      action: 'saveCookies',
      name,
      cookies
    });
    
    if (response.success) {
      showMessage(`成功保存Cookie集: ${name}`);
      await refreshSavedCookiesList();
    } else {
      showMessage(`保存Cookie集失败: ${response.error}`, false);
    }
  } catch (error) {
    showMessage(`保存Cookie集失败: ${error.message}`, false);
  }
}

/**
 * 从本地存储加载Cookie集
 */
async function loadSavedCookies() {
  const name = document.getElementById('cookie-set-name').value.trim();
  
  if (!name) {
    showMessage('请输入要加载的Cookie集名称', false);
    return;
  }
  
  try {
    const response = await chrome.runtime.sendMessage({
      action: 'loadCookies',
      name
    });
    
    if (response.success) {
      document.getElementById('cookies-json').value = JSON.stringify(response.cookies, null, 2);
      updateTableFromJson(); // 更新表格视图
      await cacheCookieData(); // 缓存Cookie数据
      showMessage(`成功加载Cookie集: ${name}`);
    } else {
      showMessage(`加载Cookie集失败: ${response.error}`, false);
    }
  } catch (error) {
    showMessage(`加载Cookie集失败: ${error.message}`, false);
  }
}

/**
 * 刷新已保存的Cookie集列表
 */
async function refreshSavedCookiesList() {
  try {
    const response = await chrome.runtime.sendMessage({
      action: 'getSavedCookieNames'
    });
    
    const listElement = document.getElementById('saved-cookies-list');
    listElement.innerHTML = '';
    
    if (response.success && response.names && response.names.length > 0) {
      response.names.forEach(name => {
        const itemElement = document.createElement('div');
        itemElement.className = 'saved-cookie-item';
        
        const nameElement = document.createElement('span');
        nameElement.textContent = name;
        
        const actionsElement = document.createElement('div');
        actionsElement.className = 'saved-cookie-actions';
        
        const useButton = document.createElement('button');
        useButton.textContent = '使用';
        useButton.addEventListener('click', async () => {
          const loadResponse = await chrome.runtime.sendMessage({
            action: 'loadCookies',
            name
          });
          
          if (loadResponse.success) {
            document.getElementById('cookies-json').value = JSON.stringify(loadResponse.cookies, null, 2);
            updateTableFromJson(); // 更新表格视图
            await cacheCookieData(); // 缓存Cookie数据
            showMessage(`已加载Cookie集: ${name}`);
          }
        });
        
        const deleteButton = document.createElement('button');
        deleteButton.textContent = '删除';
        deleteButton.className = 'delete';
        deleteButton.addEventListener('click', async () => {
          if (confirm(`确定要删除Cookie集: ${name}吗？`)) {
            const deleteResponse = await chrome.runtime.sendMessage({
              action: 'deleteCookies',
              name
            });
            
            if (deleteResponse.success) {
              showMessage(`已删除Cookie集: ${name}`);
              refreshSavedCookiesList(); // 刷新列表
            } else {
              showMessage(`删除Cookie集失败: ${deleteResponse.error}`, false);
            }
          }
        });
        
        actionsElement.appendChild(useButton);
        actionsElement.appendChild(deleteButton);
        itemElement.appendChild(nameElement);
        itemElement.appendChild(actionsElement);
        listElement.appendChild(itemElement);
      });
    } else {
      const emptyElement = document.createElement('div');
      emptyElement.className = 'saved-cookie-item';
      emptyElement.textContent = '暂无保存的Cookie集';
      listElement.appendChild(emptyElement);
    }
  } catch (error) {
    showMessage(`刷新Cookie集列表失败: ${error.message}`, false);
  }
}

/**
 * 格式化JSON文本
 */
async function formatJson() {
  const jsonInput = document.getElementById('cookies-json');
  const jsonText = jsonInput.value.trim();
  
  if (!jsonText) {
    return;
  }
  
  try {
    const parsedJson = JSON.parse(jsonText);
    jsonInput.value = JSON.stringify(parsedJson, null, 2);
    updateTableFromJson(); // 更新表格视图
    await cacheCookieData(); // 缓存Cookie数据
    showMessage('JSON格式化成功');
  } catch (error) {
    showMessage(`JSON格式化失败: ${error.message}`, false);
  }
}

/**
 * 切换Cookie视图模式
 * @param {string} view - 视图类型 ('json' 或 'table')
 */
function switchView(view) {
  const jsonViewBtn = document.getElementById('json-view-btn');
  const tableViewBtn = document.getElementById('table-view-btn');
  const cookiesJson = document.getElementById('cookies-json');
  const cookiesTableContainer = document.getElementById('cookies-table-container');
  
  if (view === 'json') {
    jsonViewBtn.classList.add('active');
    tableViewBtn.classList.remove('active');
    cookiesJson.style.display = 'block';
    cookiesTableContainer.classList.remove('active');
  } else if (view === 'table') {
    jsonViewBtn.classList.remove('active');
    tableViewBtn.classList.add('active');
    cookiesJson.style.display = 'none';
    cookiesTableContainer.classList.add('active');
    updateTableFromJson(); // 确保表格内容是最新的
  }
}

/**
 * 从JSON文本更新表格视图
 */
function updateTableFromJson() {
  const jsonText = document.getElementById('cookies-json').value.trim();
  const tableBody = document.getElementById('cookies-table-body');
  
  // 清空表格内容
  tableBody.innerHTML = '';
  
  if (!jsonText) {
    const emptyRow = document.createElement('tr');
    const emptyCell = document.createElement('td');
    emptyCell.colSpan = 7;
    emptyCell.textContent = '暂无Cookie数据';
    emptyCell.style.textAlign = 'center';
    emptyRow.appendChild(emptyCell);
    tableBody.appendChild(emptyRow);
    return;
  }
  
  try {
    const cookies = JSON.parse(jsonText);
    
    // 检查是否是数组
    if (!Array.isArray(cookies)) {
      const errorRow = document.createElement('tr');
      const errorCell = document.createElement('td');
      errorCell.colSpan = 8;  // 增加了一列，所以colspan也增加
      errorCell.textContent = '无效的Cookie数据格式，请确保是数组格式';
      errorCell.style.textAlign = 'center';
      errorCell.style.color = '#c62828';
      errorRow.appendChild(errorCell);
      tableBody.appendChild(errorRow);
      return;
    }
    
    // 如果没有Cookie数据
    if (cookies.length === 0) {
      const emptyRow = document.createElement('tr');
      const emptyCell = document.createElement('td');
      emptyCell.colSpan = 8;  // 增加了一列，所以colspan也增加
      emptyCell.textContent = '暂无Cookie数据';
      emptyCell.style.textAlign = 'center';
      emptyRow.appendChild(emptyCell);
      tableBody.appendChild(emptyRow);
      return;
    }
    
    // 遍历Cookie数组，创建表格行
    cookies.forEach((cookie, index) => {
      const row = document.createElement('tr');
      row.dataset.cookieIndex = index;
      
      // 创建勾选框单元格
      const checkboxCell = document.createElement('td');
      const checkbox = document.createElement('input');
      checkbox.type = 'checkbox';
      checkbox.className = 'cookie-checkbox';
      checkbox.id = `cookie-${index}`;
      
      // 默认勾选name为access_token和refresh_token的cookie
      if (cookie.name === 'access_token' || cookie.name === 'refresh_token') {
        checkbox.checked = true;
      }
      
      checkboxCell.appendChild(checkbox);
      
      // 创建各列单元格
      const nameCell = createTableCell(cookie.name || '');
      const valueCell = createTableCell(cookie.value || '', true);
      const domainCell = createTableCell(cookie.domain || '');
      const pathCell = createTableCell(cookie.path || '');
      const expirationCell = createTableCell(formatExpirationDate(cookie.expirationDate));
      const secureCell = createTableCell(cookie.secure ? '✓' : '');
      const httpOnlyCell = createTableCell(cookie.httpOnly ? '✓' : '');
      
      // 添加单元格到行
      row.appendChild(checkboxCell);
      row.appendChild(nameCell);
      row.appendChild(valueCell);
      row.appendChild(domainCell);
      row.appendChild(pathCell);
      row.appendChild(expirationCell);
      row.appendChild(secureCell);
      row.appendChild(httpOnlyCell);
      
      // 添加行到表格
      tableBody.appendChild(row);
    });
  } catch (error) {
    const errorRow = document.createElement('tr');
    const errorCell = document.createElement('td');
    errorCell.colSpan = 8;  // 增加了一列，所以colspan也增加
    errorCell.textContent = `JSON解析错误: ${error.message}`;
    errorCell.style.textAlign = 'center';
    errorCell.style.color = '#c62828';
    errorRow.appendChild(errorCell);
    tableBody.appendChild(errorRow);
  }
}

/**
 * 创建表格单元格
 * @param {string} content - 单元格内容
 * @param {boolean} isValue - 是否为Cookie值（需要特殊处理）
 * @returns {HTMLElement} - td元素
 */
function createTableCell(content, isValue = false) {
  const cell = document.createElement('td');
  
  // 如果内容较长，添加截断处理和工具提示
  if (typeof content === 'string' && content.length > 50) {
    const span = document.createElement('span');
    span.className = 'truncate';
    span.textContent = content;
    span.title = content;
    cell.appendChild(span);
  } else {
    cell.textContent = content;
    
    // 为Cookie值添加工具提示
    if (isValue && content) {
      cell.title = content;
    }
  }
  
  return cell;
}

/**
 * 格式化过期时间
 * @param {number} timestamp - Unix时间戳
 * @returns {string} - 格式化后的时间字符串
 */
function formatExpirationDate(timestamp) {
  if (!timestamp) {
    return '会话结束';
  }
  
  try {
    const date = new Date(timestamp * 1000);
    return date.toLocaleString('zh-CN');
  } catch (error) {
    return '无效时间';
  }
}