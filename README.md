# Cookie Maker

一个用于跨标签页提取和注入Cookie的Chrome扩展工具，提供直观的Cookie管理界面和数据持久化功能。

## 功能特性

- 从当前页面提取Cookie
- 向指定URL注入Cookie
- 保存Cookie集到本地存储
- 加载已保存的Cookie集
- 格式化JSON数据
- 支持JSON视图和表格视图切换
- 表格视图支持Cookie勾选和筛选
- 自动缓存Cookie数据，切换标签页不丢失
- 支持跨标签页操作Cookie

## 安装方法

### 从Chrome应用商店安装
（未来可能会发布到Chrome应用商店）

### 从源代码安装

1. 克隆或下载本项目代码到本地
2. 打开Chrome浏览器，访问 `chrome://extensions/`
3. 开启右上角的 "开发者模式"
4. 点击 "加载已解压的扩展程序"
5. 选择本项目的根目录
6. 扩展将被添加到Chrome浏览器中

## 使用说明

### 基本操作
1. 点击Chrome浏览器工具栏中的Cookie Maker图标打开扩展面板
2. 默认会显示当前标签页的URL
3. **提取Cookie**：点击 "提取当前页面Cookie" 按钮，扩展会自动提取当前页面的所有Cookie
4. **注入Cookie**：在 "目标URL" 输入框中输入目标网站地址，确保Cookie数据已正确填写，然后点击 "向目标URL注入Cookie" 按钮
5. **保存Cookie集**：输入Cookie集名称，点击 "保存Cookie集" 按钮
6. **加载Cookie集**：输入要加载的Cookie集名称，点击 "加载Cookie集" 按钮
7. **格式化JSON**：点击 "格式化JSON" 按钮，使JSON数据更易于阅读

### 视图切换功能
1. **JSON视图**：显示原始的JSON格式Cookie数据，支持手动编辑
2. **表格视图**：以表格形式展示Cookie数据，更直观易读
   - 表格视图会默认勾选 `access_token` 和 `refresh_token` 类型的Cookie
   - 在表格视图下，点击 "向目标URL注入Cookie" 只会注入勾选的Cookie

### 数据缓存功能
- 扩展会自动缓存您正在编辑的Cookie数据到 `chrome.storage.local`
- 缓存功能在后台脚本(`background.js`)中实现，确保数据持久化
- 即使关闭或切换标签页后重新打开扩展，之前的数据也能被正确恢复
- 所有可能修改Cookie数据的操作（提取、加载、格式化、输入）都会自动触发缓存更新

### 已保存Cookie集管理
- 扩展面板下方会显示所有已保存的Cookie集列表
- 点击 "使用" 按钮可直接加载对应Cookie集
- 点击 "删除" 按钮可移除不需要的Cookie集

## 权限说明

该扩展需要以下权限：

- `cookies`：用于读取和修改Cookie
- `activeTab`：用于获取当前活动标签页信息
- `storage`：用于在本地存储保存的Cookie集和缓存数据
- `scripting`：用于在页面中执行脚本
- `<all_urls>`：允许扩展操作所有网站的Cookie

## 注意事项

1. 请谨慎使用此扩展，不要向不信任的网站注入Cookie
2. 注入Cookie可能会导致您的账号安全风险，请确保您了解操作的后果
3. 扩展仅在本地存储Cookie数据，不会上传到任何服务器
4. 缓存数据存储在浏览器的本地存储中，清除浏览器数据可能会导致缓存丢失

## 开发指南

如果您想参与开发或修改此扩展，请按照以下步骤：

1. 确保已安装Node.js和npm
2. 克隆项目代码
3. 在项目目录下进行开发
4. 修改完成后，重新加载扩展进行测试

## 技术栈

- HTML5
- CSS3
- JavaScript
- Chrome Extension API