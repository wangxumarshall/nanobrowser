# 「活着么」(Still Alive) APP 端到端开发规格书 (Spec) v1.0

**文档状态**: Draft
**负责人**: Jules (Top Expert)
**最后更新**: 2024-05-22

---

## 1. 产品愿景与核心理念 (Product Vision)

### 1.1 背景 (Background)
基于对「死了么」APP火爆现象的深度解构，我们发现现代社会（特别是独居青年群体）普遍存在“原子化”生存带来的孤独死焦虑。然而，单纯的“死亡确认”机制利用的是负面恐惧。

### 1.2 核心价值 (Core Value)
「活着么」(Still Alive) 旨在将这种负面恐惧转化为**正向的生命激励**。它不仅仅是一个倒计时工具，更是一个**“数字化的灵魂天平”**。
*   **从“怕死”到“活好”**：通过可视化的生命倒计时，产生适度的生存紧迫感。
*   **生命量化与反馈**：利用 AI 评估每日行为对生命质量的影响，将抽象的“意义”转化为具象的“时间增减”。

### 1.3 用户画像 (Target Audience)
*   **都市独居青年 (20-35岁)**：焦虑、迷茫，渴望通过量化工具获得掌控感。
*   **自我提升追求者**：习惯使用 To-Do List、习惯养成类 APP 的人群。
*   **存在主义思考者**：对生命意义有探索欲，喜欢独特、深邃、略带黑色幽默风格的用户。

---

## 2. 功能需求说明 (Functional Requirements)

### FR-01: 沉浸式入场 (Immersive Onboarding)
*   **输入**：用户出生日期 (DOB)、性别（可选，用于更精准的预期寿命数据）。
*   **处理**：
    *   基于世界卫生组织数据或默认值（78岁 = 2,460,384,000 秒）计算 `Initial_Life_Seconds`。
    *   公式：`Remaining = (Life_Expectancy_Years * 31536000) - (Current_Time - DOB)`。
*   **输出**：全屏粒子汇聚动画，最终定格为巨大的倒计时数字。

### FR-02: 生命时钟 (The Life Clock)
*   **展示**：毫秒级倒计时，格式 `YY Years DD Days HH:MM:SS.ms`。
*   **视觉**：
    *   **呼吸感**：数字随每一秒的流逝有微小的“心跳”动效。
    *   **深空背景**：黑色背景中漂浮着代表“已逝时间”的尘埃粒子。

### FR-03: AI 灵魂日记 (AI Soul Diary)
*   **输入**：用户每日提交一段文本（日记/反思）。
*   **AI 逻辑 (Mock/Real)**：
    *   分析文本的情感极性 (Sentiment) 和 内容类别 (Category)。
    *   **积极行为**（健身、学习、冥想）：奖励时间 `+TimeDelta` (e.g., +2 hours)。
    *   **消极行为**（熬夜、酗酒、无意义焦虑）：扣除时间 `-TimeDelta` (e.g., -2 hours)。
*   **反馈**：
    *   **加时**：屏幕泛起冰川蓝 (Glacier Blue) 辉光，数字滚动增加。
    *   **减时**：屏幕边缘闪烁暗红/灰色，数字加速倒扣。

### FR-04: 意义清单 (Meaning List)
*   **功能**：一个特殊的 To-Do List，记录“死前必做的事”。
*   **奖励**：每勾选一项，生命倒计时显著增加（如 +3 天），作为对达成人生里程碑的奖励。

### FR-05: 多语言支持 (I18n)
*   支持 **简体中文** 与 **English** 实时切换。

---

## 3. 技术架构 (Technical Architecture)

### 3.1 前端 (Frontend)
*   **框架**: React 18 + Vite (SPA)
*   **语言**: TypeScript
*   **状态管理**: Zustand (轻量级，适合本地状态)
*   **路由**: React Router (可选，单页应用可能只需要条件渲染)
*   **样式**: Tailwind CSS (Utility-first) + Framer Motion (复杂动画)
*   **持久化**: LocalStorage (MVP 阶段，模拟数据库)

### 3.2 后端与 AI (Backend & AI)
*   **MVP 阶段**: Client-side logic only (Serverless Architecture ready).
*   **AI Service**:
    *   抽象层 `AIService`。
    *   实现 1: `MockAIService` (基于关键词匹配的本地逻辑)。
    *   实现 2: `GoogleGeminiService` (预留接口，调用 Google AI SDK)。

### 3.3 数据模型 (Data Schema - JSON)

```json
interface UserState {
  profile: {
    birthDate: string; // ISO 8601
    lifeExpectancy: number; // default 78
    name: string;
  };
  appState: {
    isOnboarded: boolean;
    language: 'en' | 'zh';
  };
  data: {
    remainingSeconds: number; // The Source of Truth
    lastSyncTime: number; // Timestamp to calculate elapsed time while closed
    diaryEntries: DiaryEntry[];
    bucketList: BucketItem[];
  };
}

interface DiaryEntry {
  id: string;
  content: string;
  timestamp: number;
  aiAnalysis: {
    sentiment: 'positive' | 'negative' | 'neutral';
    timeDelta: number; // seconds added or removed
    reason: string;
  };
}

interface BucketItem {
  id: string;
  content: string;
  isCompleted: boolean;
  rewardSeconds: number;
}
```

---

## 4. UI/UX 设计规范 (Visual Identity)

### 4.1 色彩系统 (Color Palette)
*   **Deep Space (背景)**: `#0C0A14` (接近黑色的深紫/深灰)
*   **Starlight (主文本)**: `#EAEAEA` (柔和的白)
*   **Glacier Glow (正向反馈)**: `#7DF9FF` (冰川蓝，高亮)
*   **Void (负向反馈)**: `#4A4A4A` (深灰，压抑感) 或 `#FF4D4D` (警示红，仅少量使用)

### 4.2 排版 (Typography)
*   **中文字体**: Noto Sans SC, PingFang SC
*   **英文字体**: Inter, Roboto Mono (用于数字/倒计时)
*   **风格**: 极简，大留白，数字作为视觉主体。

---

## 5. 接口定义 (API Definition - Conceptual)

若迁移至云端 (Cloud Functions)，API 设计如下：

*   `POST /api/analyze-life`
    *   Request: `{ content: string, userId: string }`
    *   Response: `{ timeDelta: number, reason: string, sentiment: string }`
*   `POST /api/sync-state`
    *   Request: `{ remainingSeconds: number, lastSyncTime: number }`

---

## 6. 开发路线图 (Roadmap)

1.  **Phase 1 (MVP)**: 本地运行，基础倒计时，模拟 AI，本地存储。
2.  **Phase 2 (Cloud)**: Firebase 集成，真实 LLM 接入，多端同步。
3.  **Phase 3 (Social)**: “遗愿清单”社交分享，寻找同频的“幸存者”。
