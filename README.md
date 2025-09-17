# Cookie Maker - Chrome扩展

一个用于跨标签页提取和注入Cookie的Chrome扩展工具。

## 功能特性

- 从当前页面提取Cookie
- 向指定URL注入Cookie
- 保存Cookie集到本地存储
- 加载已保存的Cookie集
- 格式化JSON数据
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

1. 点击Chrome浏览器工具栏中的Cookie Maker图标打开扩展面板
2. 默认会显示当前标签页的URL
3. **提取Cookie**：点击 "提取当前页面Cookie" 按钮，扩展会自动提取当前页面的所有Cookie
4. **注入Cookie**：在 "目标URL" 输入框中输入目标网站地址，确保Cookie数据已正确填写，然后点击 "向目标URL注入Cookie" 按钮
5. **保存Cookie集**：输入Cookie集名称，点击 "保存Cookie集" 按钮
6. **加载Cookie集**：输入要加载的Cookie集名称，点击 "加载Cookie集" 按钮
7. **已保存的Cookie集**：扩展面板下方会显示所有已保存的Cookie集，可以直接点击 "加载" 或 "使用" 按钮进行操作

## 权限说明

该扩展需要以下权限：

- `cookies`：用于读取和修改Cookie
- `activeTab`：用于获取当前活动标签页信息
- `storage`：用于在本地存储保存的Cookie集
- `scripting`：用于在页面中执行脚本
- `<all_urls>`：允许扩展操作所有网站的Cookie

## 注意事项

1. 请谨慎使用此扩展，不要向不信任的网站注入Cookie
2. 注入Cookie可能会导致您的账号安全风险，请确保您了解操作的后果
3. 扩展仅在本地存储Cookie数据，不会上传到任何服务器

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