# 🕷️ Spider-Man x Zootopia AI Flip Clock 🐰

> **一款融合了机械美学、AI 角色扮演与物理互动的次世代翻页时钟应用。**
> 
> *A next-gen flip clock featuring mechanical aesthetics, AI roleplay, and interactive physics.*

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![React](https://img.shields.io/badge/React-18-blue)
![Gemini](https://img.shields.io/badge/AI-Google%20Gemini-orange)
![Vite](https://img.shields.io/badge/Build-Vite-yellow)

## 🌟 核心亮点 (Highlights)

这款应用不仅仅是一个时钟，它是一个沉浸式的 AI 桌面伴侣：

*   **🎨 极致视觉体验**: 经典的翻页钟动画 (Flip Clock) 结合动态背景与天气效果。
*   **🤖 疯狂动物城 AI 宇宙**: 内置朱迪 (Judy)、尼克 (Nick)、闪电 (Flash) 等角色，每个角色拥有独特的性格、语调和 UI 主题。
*   **✨ AI 角色生成器**: 想要更多角色？输入名字（如 "教父"、"钢铁侠"），Gemini AI 会自动生成角色的**性格、头像、配色方案和专属语录**。
*   **🕸️ 蜘蛛侠物理互动**: 屏幕上方悬挂着基于物理引擎 (Verlet Integration) 的蜘蛛侠，支持拖拽互动，增加趣味性。
*   **⏰ 智能自然语言闹钟**: 
    *   通过聊天设置闹钟（例如："明天早上8点叫醒我，要大自然的声音"）。
    *   **聊天止闹**: 闹钟响时，你可以打字让 AI 闭嘴（例如："我知道了，快停下！"），AI 会识别意图并关闭闹钟。
*   **📱 全平台适配**: 完美支持移动端触摸、PWA 安装及桌面端全屏屏保模式。

---

## 🛠️ 技术栈 (Tech Stack)

*   **Frontend**: React 18, TypeScript, Tailwind CSS
*   **Build Tool**: Vite
*   **AI Engine**: Google Gemini API (`@google/genai` SDK)
*   **Animations**: Custom CSS Keyframes, RequestAnimationFrame Physics
*   **Deployment**: Vercel Ready

---

## 🚀 快速开始 (Getting Started)

### 1. 克隆项目
```bash
git clone https://github.com/your-username/spiderman-flip-clock.git
cd spiderman-flip-clock
```

### 2. 安装依赖
```bash
npm install
# 或者
yarn install
```

### 3. 配置环境变量
在项目根目录创建一个 `.env` 文件，并填入您的 Google Gemini API Key：

```env
API_KEY=your_google_gemini_api_key_here
```
> 💡 **提示**: 您可以在 [Google AI Studio](https://aistudio.google.com/) 免费获取 API Key。

### 4. 本地运行
```bash
npm run dev
```
打开浏览器访问 `http://localhost:5173`。

---

## 📦 部署指南 (Deployment)

本项目已针对 **Vercel** 进行了深度优化。

### 部署步骤：

1.  将代码推送到 GitHub。
2.  登录 [Vercel](https://vercel.com/) 并导入该仓库。
3.  在 Vercel 的 **Environment Variables** 设置中添加：
    *   **Key**: `API_KEY`
    *   **Value**: `您的_Google_Gemini_API_Key`
4.  点击 **Deploy**。

---

## 🎮 功能操作指南 (Usage)

### 切换与生成角色
*   点击顶部的头像栏切换当前 AI 伴侣。
*   点击右侧的 **`+`** 按钮，输入任何角色名称，AI 将为您实时生成全新的主题界面。

### 设置闹钟
*   在聊天框输入："设置一个 5 分钟后的闹钟" 或 "Set an alarm for 08:30"。
*   闹钟响起时，屏幕会出现全屏覆盖层。点击按钮或告诉 AI "Stop the alarm" 即可关闭。

### 屏幕保护模式
*   无操作 10 秒后，UI 会自动简化，进入沉浸式时钟屏保模式。
*   移动鼠标或触摸屏幕即可唤醒。

---

## 📂 项目结构 (Structure)

```
.
├── src/
│   ├── components/      # UI 组件 (FlipCard, ChatWidget, Spiderman...)
│   ├── services/        # Gemini AI 服务集成
│   ├── utils/           # 音频合成与工具函数
│   ├── types.ts         # TypeScript 类型定义
│   ├── constants.ts     # 预设主题配置
│   ├── App.tsx          # 主应用逻辑
│   └── main.tsx         # 入口文件
├── public/              # 静态资源
├── index.html           # HTML 模板
├── vite.config.ts       # Vite 配置
└── tailwind.config.js   # 样式配置
```

---

## 📄 License

MIT License. Free to use and modify.

---

Designed with ❤️ for Flip Clock Fans & Zootopia Lovers.
