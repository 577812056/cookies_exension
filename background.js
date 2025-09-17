/**
 * Chrome扩展的后台脚本
 * 负责处理Cookie的提取和注入逻辑
 */

// 监听来自popup的消息
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  switch (message.action) {
    case 'extractCookies':
      extractCookies(message.url).then(cookies => {
        sendResponse({ success: true, cookies });
      }).catch(error => {
        sendResponse({ success: false, error: error.message });
      });
      return true; // 保持消息通道开放，以便异步响应
      
    case 'injectCookies':
      injectCookies(message.url, message.cookies).then(() => {
        sendResponse({ success: true });
      }).catch(error => {
        sendResponse({ success: false, error: error.message });
      });
      return true; // 保持消息通道开放，以便异步响应
      
    case 'saveCookies':
      saveCookies(message.name, message.cookies).then(() => {
        sendResponse({ success: true });
      }).catch(error => {
        sendResponse({ success: false, error: error.message });
      });
      return true;
      
    case 'loadCookies':
      loadCookies(message.name).then(cookies => {
        sendResponse({ success: true, cookies });
      }).catch(error => {
        sendResponse({ success: false, error: error.message });
      });
      return true;
      
    case 'getSavedCookieNames':
      getSavedCookieNames().then(names => {
        sendResponse({ success: true, names });
      }).catch(error => {
        sendResponse({ success: false, error: error.message });
      });
      return true;
      
    case 'deleteCookies':
      deleteCookies(message.name).then(() => {
        sendResponse({ success: true });
      }).catch(error => {
        sendResponse({ success: false, error: error.message });
      });
      return true;
  }
});

/**
 * 从指定URL提取所有Cookie
 * @param {string} url - 要提取Cookie的URL
 * @returns {Promise<Array>} - Cookie数组
 */
async function extractCookies(url) {
  try {
    console.log('extractCookies', url);
    const cookies = await chrome.cookies.getAll({ url });
    if (cookies.length === 0) {
      return 'No cookies found';
    }
    return cookies;
  } catch (error) {
    console.error('提取Cookie失败:', error);
    throw error;
  }
}

/**
 * 向指定URL注入Cookie
 * @param {string} url - 要注入Cookie的URL
 * @param {Array} cookies - 要注入的Cookie数组
 * @returns {Promise<void>}
 */
async function injectCookies(url, cookies) {
  try {
    const domain = new URL(url).hostname;
    let failedCookies = [];
    
    // 遍历所有Cookie并注入，对每个Cookie单独处理错误
    for (const cookie of cookies) {
      try {
        // 构建Cookie参数
        const cookieParams = {
          url: url,
          name: cookie.name,
          value: cookie.value,
          domain: domain,
          path: cookie.path || '/',
          secure: cookie.secure || false,
          httpOnly: cookie.httpOnly || false,
          sameSite: cookie.sameSite || 'unspecified'
        };
        
        // 如果Cookie有过期时间，添加到参数中
        if (cookie.expirationDate) {
          cookieParams.expirationDate = cookie.expirationDate;
        }
        
        // 单独处理每个Cookie的注入
        await chrome.cookies.set(cookieParams);
      } catch (error) {
        // 记录失败的Cookie，但继续处理其他Cookie
        console.warn(`注入Cookie ${cookie.name || '未知名称'} 失败:`, error);
        failedCookies.push({
          name: cookie.name || '未知名称',
          error: error.message
        });
      }
    }
    
    // 如果有Cookie注入失败，抛出错误信息
    if (failedCookies.length > 0) {
      const totalSuccess = cookies.length - failedCookies.length;
      const failedNames = failedCookies.map(c => c.name).join(', ');
      throw new Error(`成功注入 ${totalSuccess} 个Cookie，但有 ${failedCookies.length} 个注入失败: ${failedNames}`);
    }
  } catch (error) {
    console.error('注入Cookie过程中出现错误:', error);
    throw error;
  }
}

/**
 * 保存Cookie到本地存储
 * @param {string} name - 保存的Cookie集名称
 * @param {Array} cookies - Cookie数组
 * @returns {Promise<void>}
 */
async function saveCookies(name, cookies) {
  try {
    // 获取现有的保存Cookie列表
    const savedCookies = await chrome.storage.local.get('savedCookies');
    const cookiesMap = savedCookies.savedCookies || {};
    
    // 添加或更新Cookie集
    cookiesMap[name] = {
      cookies: cookies,
      timestamp: new Date().getTime()
    };
    
    await chrome.storage.local.set({ savedCookies: cookiesMap });
  } catch (error) {
    console.error('保存Cookie失败:', error);
    throw error;
  }
}

/**
 * 从本地存储加载Cookie
 * @param {string} name - 要加载的Cookie集名称
 * @returns {Promise<Array>} - Cookie数组
 */
async function loadCookies(name) {
  try {
    const savedCookies = await chrome.storage.local.get('savedCookies');
    const cookiesMap = savedCookies.savedCookies || {};
    
    if (!cookiesMap[name]) {
      throw new Error('未找到指定名称的Cookie集');
    }
    
    return cookiesMap[name].cookies;
  } catch (error) {
    console.error('加载Cookie失败:', error);
    throw error;
  }
}

/**
 * 获取所有保存的Cookie集名称
 * @returns {Promise<Array>} - Cookie集名称数组
 */
async function getSavedCookieNames() {
  try {
    const savedCookies = await chrome.storage.local.get('savedCookies');
    const cookiesMap = savedCookies.savedCookies || {};
    
    return Object.keys(cookiesMap);
  } catch (error) {
    console.error('获取保存的Cookie名称失败:', error);
    throw error;
  }
}

/**
 * 从本地存储删除Cookie集
 * @param {string} name - 要删除的Cookie集名称
 * @returns {Promise<void>}
 */
async function deleteCookies(name) {
  try {
    const savedCookies = await chrome.storage.local.get('savedCookies');
    const cookiesMap = savedCookies.savedCookies || {};
    
    if (!cookiesMap[name]) {
      throw new Error('未找到指定名称的Cookie集');
    }
    
    // 删除指定的Cookie集
    delete cookiesMap[name];
    
    await chrome.storage.local.set({ savedCookies: cookiesMap });
  } catch (error) {
    console.error('删除Cookie失败:', error);
    throw error;
  }
}