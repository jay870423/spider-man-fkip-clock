
# 🕷️ Spider-Man x Zootopia AI Flip Clock 🐰

> **一款融合了机械翻页美学、物理引擎交互与生成式 AI 的次世代桌面时钟。**
> 
> *A next-gen flip clock blending mechanical aesthetics, physics-based interaction, and Generative AI.*

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![React](https://img.shields.io/badge/React-19-blue)
![Gemini](https://img.shields.io/badge/AI-Google%20Gemini-orange)
![DeepSeek](https://img.shields.io/badge/AI-DeepSeek-blueviolet)
![Vite](https://img.shields.io/badge/Build-Vite-yellow)

## 🌟 核心亮点 (Highlights)

这款应用不仅是一个看时间的工具，它是您桌面上**有生命力**的智能伴侣：

### 1. 🎨 沉浸式视觉体验
*   **极致翻页动效**: 还原经典的机械翻页钟质感，配合动态光影与呼吸背景。
*   **物理引擎蜘蛛侠**: 屏幕中悬挂的蜘蛛侠基于 **Verlet Integration** 物理算法，支持拖拽、摆动，具有真实的重力与空气阻力反馈。
*   **实时环境感知**: 集成 Geolocation 与 Open-Meteo API，自动定位并显示当地天气，背景随角色主题变换。

### 2. 🤖 双模 AI 智能大脑 (Gemini + DeepSeek)
*   **多模型支持**: 内置 **Google Gemini** (默认) 与 **DeepSeek** 两种 AI 驱动模式，可在设置中自由切换。
*   **疯狂动物城宇宙**: 预设朱迪 (Judy)、尼克 (Nick)、闪电 (Flash) 等角色，每个角色拥有独特的性格提示词 (System Prompt) 和 UI 主题色。
*   **✨ 无限角色生成**: 点击 `+` 号，输入任何名字（如 "钢铁侠"、"艾莎公主"），AI 会实时生成该角色的**性格设定、专属配色方案、CSS 渐变背景及头像**。

### 3. ⏰ 智能自然语言闹钟
告别繁琐的设置界面，只需像聊天一样说话：
*   **自然语言设置**: "明天早上8点叫我" 或 "Set an alarm for 9:30 PM"。
*   **🎵 智能音乐映射**: 
    *   想听周杰伦？输入 "设置闹钟，要周杰伦的歌" 或 "来点好听的音乐"。
    *   AI 会自动识别意图，将闹钟铃声切换为 **"Classical (Music Box)"** 模式，播放一段基于五声音阶生成的优美旋律（无版权风险的合成音效）。
*   **连续对话能力**: 设置完闹钟后，AI 会确认结果，你可以继续修改："换个更有活力的声音"，无需重复时间。
*   **聊天止闹**: 闹钟响时，输入 "知道了"、"别吵了" 或 "Stop"，AI 即可关闭闹钟。

---

## 🛠️ 技术栈 (Tech Stack)

*   **Framework**: React 19, TypeScript
*   **Styling**: Tailwind CSS (with Custom Animations)
*   **Build Tool**: Vite
*   **AI SDK**: `@google/genai` (Official SDK) & Native Fetch for DeepSeek
*   **Audio**: Web Audio API (Real-time Synthesis, no external mp3 files)
*   **Physics**: Custom Hook based Verlet Integration

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
在项目根目录创建一个 `.env` 文件，并填入您的 Google Gemini API Key（DeepSeek Key 可在网页端设置）：

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

## 🎮 操作指南 (Usage Guide)

### 切换 AI 模型
1.  点击聊天框右上角的 **⚙️ (设置)** 按钮。
2.  选择 **Gemini** 或 **DeepSeek**。
3.  如果是 DeepSeek，请输入您的 API Key（密钥仅存储在本地浏览器 LocalStorage 中，安全无虞）。

### 生成新角色
1.  点击顶部角色列表右侧的圆型 **`+`** 按钮。
2.  输入角色名（例如："Batman"）。
3.  等待几秒，AI 将为您创造一个全新的主题界面。

### 闹钟与音乐指令示例
试着对 AI 说：
*   *"Set an alarm for 10 seconds."* (测试闹钟)
*   *"把闹钟声音改成鸟叫声。"* (切换为 Nature 音效)
*   *"我想明天早上 7 点听着周杰伦的歌醒来。"* (触发 Classical 旋律音效)
*   *"Shut up!"* (闹钟响起时关闭闹钟)

### 屏幕保护模式
*   无操作 10 秒后，UI 会自动淡出，进入沉浸式时钟屏保模式。
*   移动鼠标、点击或按键即可唤醒界面。
*   点击右上角的 **⤢** 按钮可进入全屏模式。

---

## 📂 项目结构 (Structure)

```
src/
├── components/
│   ├── FlipCard.tsx        # 机械翻页动画核心组件
│   ├── ChatWidget.tsx      # AI 聊天与工具调用逻辑
│   ├── Spiderman.tsx       # 物理引擎蜘蛛侠组件
│   ├── AlarmOverlay.tsx    # 全屏闹钟覆盖层
│   └── ...
├── services/
│   └── geminiService.ts    # 统一的 AI 服务层 (含 Gemini 流式传输与 DeepSeek 兼容逻辑)
├── utils/
│   └── soundUtils.ts       # Web Audio API 合成器 (鸟叫、数字音、八音盒旋律)
├── types.ts                # TypeScript 类型定义
└── App.tsx                 # 主入口与全局状态管理
```

---

## 📄 License

MIT License. 

---

Made with ❤️ by a Developer who loves Zootopia & Coding.
