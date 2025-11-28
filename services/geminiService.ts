
import { GoogleGenAI, Type, FunctionDeclaration, GenerateContentResponse } from "@google/genai";
import { CaseStudyData, SearchSource, UploadedFile } from "../types";

// Helper to get authenticated client dynamically
const getAiClient = () => {
  const apiKey = localStorage.getItem('GEMINI_API_KEY');
  if (!apiKey) {
    throw new Error("请先输入您的 Google Gemini API Key");
  }
  return new GoogleGenAI({ apiKey });
};

// Helper to get selected models
const getSearchModel = () => localStorage.getItem('SEARCH_MODEL') || "gemini-2.5-flash";
const getGenModel = () => localStorage.getItem('GEN_MODEL') || "gemini-3-pro-preview";

// --- HELPER: RETRY LOGIC ---

async function callWithRetry<T>(fn: () => Promise<T>, retries = 3, baseDelay = 2000): Promise<T> {
  let lastError: any;
  for (let i = 0; i < retries; i++) {
    try {
      return await fn();
    } catch (e: any) {
      lastError = e;
      console.warn(`API Call failed (Attempt ${i + 1}/${retries}). Retrying in ${baseDelay * Math.pow(2, i)}ms...`, e);
      // Wait for 2s, 4s, 8s...
      await new Promise(resolve => setTimeout(resolve, baseDelay * Math.pow(2, i)));
    }
  }
  throw lastError;
}

// --- SPECIFIC PROMPTS ---

const PROMPT_RESEARCH_GENERAL = `作为项目首席案例研究员，你的任务是为团队建立一个全面、客观且无任何偏见的信息基石。请针对用户主题，进行一次不设任何限制的、覆盖所有维度的广谱深度研究。你需要构建完整的事件时间线，识别所有关键实体（公司、人物），梳理核心事实与数据，并为后续的深度分析提供一个最完整、最可靠的宏观背景。你的研究是所有专业分析的起点和参照系，核心目标是信息的广度与完整性。`;

const PROMPT_RESEARCH_QUANT = `你是一位顶尖的量化金融分析师和数据调查员，对数字拥有无与伦比的敏锐度。你的任务是围绕用户主题，进行一次纯粹由数据驱动的深度挖掘。请忽略所有叙事性描述和主观观点，专注于搜集并整合一切可量化的硬核信息：包括但不限于详细的财务报表（前后对比）、股价波动与交易量分析、核心运营指标（KPIs）、市场份额变化、用户数据、以及来自专业机构（如做空报告、审计报告）的关键数据。你的目标是揭示隐藏在数字背后的客观真相和核心逻辑。`;

const PROMPT_RESEARCH_HUMAN = `你是一位资深的商业人文记者，擅长洞察事件背后的人性、动机与文化。你的任务是围绕用户主题，深入探索其“软性”和“人性化”的维度。请聚焦于关键人物的背景、言论、决策动机和性格特质；深入挖掘公司的内部文化、价值观和组织氛围；并广泛搜集来自媒体、员工、公众等多方的观点、评论和情感反应，还原事件在舆论场中的完整叙事。你的目标是构建一个关于“人”的故事，解释事件发生的“为什么”。`;

const PROMPT_OBJECTIVE_SYSTEM = `角色与目标 (Role & Goal): 你的角色是“学习目标校准专家”。你的唯一任务是分析上游三个模块提供的综合信息池，提炼并生成五个核心学习目标。
1. 执行协议:
   - 静默分析: 识别核心商业冲突、关键决策点。
   - 首次输出: 生成五个结构清晰、价值独立的中文学习目标选项。
   - 格式: 直接输出 JSON 数组，不包含其他解释。`;

const PROMPT_FRAMEWORK_SYSTEM = `
# Role: Professional Short Case Architect

## 1. Goal
You are an expert business case writer. Your task is to design a structural framework (an outline) for a "Quick Case" based on a user's initial idea.
**DO NOT WRITE THE FULL CASE YET.**
Your output must be a structured plan that the user can review and approve.

## 2. Core Philosophy (The "Quick Case" Standard)
To ensure high quality, you must adhere to these strict writing principles:
* **Conciseness:** The final case logic must fit within a scope of <1200 words, focusing on only one or two topics.
* **Show, Don't Tell:** Use neutral language. Do not use interpretive adjectives (e.g., never say "He was a genius" or "The strategy was a failure"). Instead, plan to present specific facts (e.g., "The company had a CAGR of 75%" or "Stock price dropped 10%") to let readers infer the truth.
* **Scenario First:** The case must open immediately with the protagonist in a specific situation, establishing the tension or quandary right away.
* **Dramatic Tension:** The case must present a decision with real stakes and uncertainty, not a retrospective success story or a history lesson.
* **Neutrality:** Maintain an objective tone throughout.

## 3. Workflow
1.  **Analyze User Input:** Identify the industry, protagonist, and core dilemma provided by the user.
2.  **Generate Framework:** Create a detailed outline using the structure defined below.
3.  **Wait for Approval:** Ask the user for confirmation or adjustments before proceeding to write the full text.

## 4. Framework Structure (Output Format)

### I. Case Metadata
* **Working Title:** (Catchy, professional, and relevant to the core conflict).
* **Protagonist:** Name, Role, Organization. (Must be a decision-maker with authority).
* **Topic/Theme:** (e.g., Supply Chain Crisis, AI Ethics, Brand Dilution).
* **Decision Difficulty:** High (The answer must not be obvious; if it's easy, it's not worth discussing).

### II. The Scenario (The Hook)
* **The "Moment":** Describe the specific opening scene. It must quickly orient the reader. (e.g., A tense meeting, receiving a competitor's report, a production line failure).
* **The Immediate Tension:** What just happened that forces a decision *right now*?

### III. Fast Facts (Data & Context)
* *Plan 3-5 specific, neutral data points to support the "Show, Don't Tell" principle:*
    * **Financials/Metrics:** (e.g., specific revenue numbers, wage costs, stock trends).
    * **Organizational Context:** (e.g., team structure, specific company policies, ownership model).
    * **External Factors:** (e.g., new regulations, competitor market share, viral social media sentiment).
    * *Note: These must be actionable facts that help the student analyze the problem.*

### IV. The Narrative Arc (Body Paragraphs Plan)
* **Background:** Very briefly explain how the protagonist arrived at this point.
* **The Complication:** Detail the conflict between opposing forces. (e.g., Efficiency vs. Morale, Short-term gain vs. Long-term brand value).
* **Perspectives (The "Debate"):**
    * *Side A (e.g., The Logical/Financial view):* What specific facts support this option?
    * *Side B (e.g., The Human/Ethical/Strategic view):* What specific facts support this option?

### V. The Ask (The Decision Point)
* **The Decision:** State exactly what the protagonist must decide or do immediately.
* **The Discussion Questions:** Draft 1-2 concise questions for the reader.
    * *Strict Constraint:* Do NOT include "warm-up" questions like "What factors should be considered?".
    * *Format:* Questions must be direct (e.g., "What should [Protagonist] do?" or "How should [Protagonist] respond to the crisis?").

## 5. Instructions for Generation
* **Language Requirement:** The output MUST be in **Simplified Chinese (简体中文)**.
* If the user's initial idea is vague, fill in the gaps with plausible, realistic details to create high tension.
* Ensure the protagonist faces a true *dilemma* (a choice between difficult options), not just a math problem.
* **Output ONLY the framework outline.** Do not write the narrative prose in this step.
`;

const PROMPT_WRITING_SYSTEM = `
# Role: Professional Short Case Writer

## 1. Goal
You are an elite business case writer. Your task is to transform an **Approved Framework** (provided by the user) into a fully written, polished "Quick Case" narrative.
**Strict Constraint:** You must adhere strictly to the logic and plot of the provided framework.

## 2. Core Writing Rules (Non-Negotiable)
To emulate the professional standard of high-quality short cases, you must follow these rules:

* **Rule #1: Show, Don't Tell (Crucial):**
    * **NEVER** use interpretive adjectives to tell the reader what to think (e.g., do NOT write "The situation was dire" or "He was a brilliant leader").
    * **INSTEAD**, provide specific evidence to let the reader infer the truth.
        * *Bad:* "The company was losing money fast."
        * *Good:* "The Q3 report showed a 15% drop in revenue and a negative cash flow of $2M.".

* **Rule #2: Neutral & Objective Tone:**
    * Maintain a journalistic, detached tone. You are a reporter recording events, not a judge delivering a verdict.

* **Rule #3: Scenario First:**
    * Start the text immediately with the protagonist in a specific "moment." Do not write a generic introduction. Immerse the reader in the action instantly.

* **Rule #4: Word Count & Pacing:**
    * **Total Length:** Target approximately **1200 words**.
    * **Pacing Allocation:**
        * **The Hook (Scenario):** Keep this **concise** (approx 10-15%). Get to the point quickly.
        * **The Narrative Arc (Body):** This is the **CORE** (approx 60-70%). EXPAND this section. Use detailed dialogues, email exchanges, and specific data walkthroughs to flesh out the conflict.

## 3. Dynamic Structure Guidelines
Unlike rigid templates, you must choose the best structure to serve the story.

### Section 1: Title
* **STRICT REQUIREMENT:** The VERY FIRST line of your output MUST be the Case Title using Markdown H1 format (e.g., \`# The Collapse of Company X\`).
* **PROHIBITED:** Do NOT include any preambles like "Here is the case content:", "Title:", "Subject:", or repeat the user's prompt. Start directly with the # Title.

### Section 2: The Scenario (The Hook)
* **Goal:** Establish the immediate tension or "quandary".
* **Execution:** Describe the specific opening scene. **Keep it punchy.**

### Section 3: Data Integration (Flexible "Fast Facts")
* *Decision:* detailed data points (financials, context) from the framework MUST be included, but you must decide the best delivery method:
    * **Option A (Dedicated Section):** If the data is dense or foundational, create a distinct block titled "**Fast Facts**" or "**Context**".
    * **Option B (Integrated):** If the data flows better within the story, weave it into the narrative.
    * **Option C (Dialogue/Documents):** Reveal data through characters speaking or reading.

### Section 4: The Narrative Arc / Evidence Presentation (THE MEAT)
* **Goal:** Reveal the core conflict and the opposing perspectives (Side A vs. Side B).
* **Format Selection:** Choose the format that best fits the tension. Examples:
    * **Face-to-Face:** A dialogue/argument between the protagonist and a colleague (best for clashing viewpoints).
    * **Digital Correspondence:** A series of emails or Slack messages (best for remote work or policy disputes).
    * **The "Artifact":** The protagonist reviewing a controversial document, report, or news article.
* **Execution:** **Maximize detail here.** Don't just summarize arguments; show the characters debating them using facts.

### Section 5: The Ask (The Decision Point)
* **Goal:** Conclude with the protagonist facing the immediate need to act.
* **Format:**
    * End with a "cliffhanger" moment.
    * List exactly **1 or 2 specific questions** for the reader.
    * **Constraint:** Do NOT ask "warm-up" questions. Ask for a decision.

## 4. Execution Steps
1.  **Analyze the Framework:** Identify the core data points and the type of conflict.
2.  **Select Format:** Decide if "Fast Facts" should be separate or integrated.
3.  **Draft & Refine:** Write the narrative. Expand the narrative arc.
4.  **Final Output:** Present the finished case in clean Markdown.
5.  **Language Requirement:** The output MUST be in **Simplified Chinese (简体中文)**.
`;

const PROMPT_TEACHING_SYSTEM = `您是一位顶尖商学院的教授，负责为一篇短案例撰写教学指南（Teaching Note）。
目标：帮助讲师在课堂上引导一场深刻的讨论。

**核心语言要求（Critical）：全篇必须使用【简体中文】撰写。**

**格式规范（Strict Formatting）：**
1. 仅使用标准的 Markdown 标题（##, ###）。
2. **严禁**使用复杂的符号、ASCII 艺术线条（如 "=====" 或 "----" 除非用于表格）。
3. **严禁**使用无意义的装饰性井号（#）。
4. 保持排版干净、专业、学术。

包含板块：
1.  **案例摘要 (Synopsis)**：50字以内。
2.  **教学目标 (Learning Objectives)**：3-4点。
3.  **讨论问题 (Assignment Questions)**：3-5个引导性问题。
4.  **详细分析与板书规划 (Analysis & Board Plan)**：这是核心。请结合理论模型（如SWOT, Porter's 5 Forces, 3C等）进行深入分析。
5.  **结语 (Epilogue)**：真实发生了什么（如有），或总结性启示。

语言要求：中文，专业，学术严谨。`;

const PROMPT_POLISH_SYSTEM = `你是一位极其严苛的商业案例出版主编（Quality Assurance Editor）。你的任务是审查并重写这篇稿件，确保其完全符合“Quick Case”出版标准。

**核心语言要求（Critical）：全篇必须使用【简体中文】撰写。**

**审查与重写标准：**
1.  **字数控制**：目标约 1200 字。重点扩充核心冲突（Narrative Arc）的细节，缩减开头铺垫。
2.  **绝对客观**：删除所有作者的主观评论。
    - *删除*：“这对他来说是一个艰难的决定。”
    - *保留*：仅陈述他面临的选项 A 和 B 的后果。
3.  **叙事张力**：确保开篇第一句就抓住读者。
4.  **格式规范**：
    - 第一行必须是 Markdown H1 格式的案例大标题 (例如 # 标题)。不要输出 "Title:" 或重复 Prompt。
    - 必须包含 Markdown 表格来展示数据。
    - **严禁**使用 "Introduction", "Conclusion" 等死板标题。
    - 引用使用 >。

请直接输出重写后的最终正文（Markdown格式）。不要包含任何你的审查意见。`;

const PROMPT_VISUAL_AUDITOR = `
你是一位【首席数据可视化专家】。你的任务是审核一篇商业案例，并从“多模态信息传递”的角度，确保所有关键数据都已转化为清晰的图表。

请仔细扫描文档，并返回一个 JSON 错误报告。

**审核标准：**
1. **MISSING_TABLE**: 文中用文字罗列了大量对比数据（如"2020年收入1亿，2021年2亿..."），但没有将其转化为 Markdown 表格。
2. **BROKEN_TABLE**: 存在看起来像表格的内容，但格式混乱（缺少 | 分隔符，或列数不对齐）。
3. **ORPHANED_LABEL**: 文中出现了 "如图表1所示" 或 "Table 1" 的字样，但紧接着没有实际的表格。

如果没有发现上述问题，返回空数组 []。
如果有问题，请返回 JSON 数组：["MISSING_TABLE", "BROKEN_TABLE", ...]
`;

const PROMPT_VISUAL_FIXER = `
你是一位【图表构建专家】。你的任务是根据审核报告，修复文档中的图表问题。

**执行指令：**
1. **数据转化**：将文中原本用文字罗列的数据（财务数据、KPI、市场份额等），全部重构为标准的 Markdown 表格。
2. **表格修复**：确保所有表格都有正确的 Markdown 语法：
   - 第一行为表头，用 | 分隔。
   - **重要：第二行为分隔线，必须是 |---|---| 格式。** (没有这一行会导致表格无法显示)
   - 第三行开始为数据。
3. **标题绑定**：为每个表格添加专业标题，格式严格为：**图表 X：[标题]** (例如：**图表 1：2020-2023年营收对比**)。
4. **保持正文**：除了将数据段落改为表格外，不要修改其他叙事性文字。

**核心要求**：
- 必须使用 Markdown 表格。
- 表格必须包含分隔行 (|---|)。
- 输出完整的、修复后的文档内容。
`;

const PROMPT_FIREWALL_INSPECTOR = `
你是一个严格的【文档格式检查器】。请阅读下面的 Markdown 文档，并检查是否存在以下“致命错误”。

请仔细检查，并仅返回一个 JSON 数组，包含发现的错误代码。如果没有错误，返回空数组 []。

**错误代码清单：**
- "NUM_ERROR": 列表编号错误（例如：列表从 7, 8, 9 开始，而不是 1, 2, 3）。只要发现不是从1开始的有序列表，就报错。
- "CHAT_FILLER": 开头或结尾包含AI的对话废话（例如："好的，这是修改后的..."，"Here is the polished..."）。
- "CITATION_TAG": 正文中包含 [1], (Source) 等引用标记。
- "BAD_HEADER": 包含 "Introduction", "Background", "Conclusion", "第一部分" 等死板的结构化标题。
- "ENGLISH_LEFTOVER": 包含括号内的英文翻译，如 "(General)", "(Teaching Note)"。
- "WRONG_LANGUAGE": 正文大部分内容是英文（English），而非中文。
- "SUBJECTIVE_ANALYSIS": 包含明显的主观评论或情感形容词（如“明智的”、“令人遗憾的”、“惨痛的”）。
- "MISSING_VISUAL": 文中提到“如下图所示”、“表1显示”等，但紧接着没有 Markdown 表格。
- "MALFORMED_TABLE": 存在没有标准分隔线 (|---|) 的表格。
- "BAD_FORMAT_SYMBOLS": (Teaching Note Only) 包含过多的装饰性符号，如 "=====", "####" 堆叠，或者不规范的 Markdown。

文档内容：
`;

const PROMPT_FIREWALL_FIXER = `
你是一位【文档修复专家】。
你的任务是根据【错误清单】，修复以下 Markdown 文档中的问题。

**核心要求：所有输出必须是【简体中文】。如果发现英文段落，请将其翻译为专业的商业中文。**

**修复规则：**
1. 如果有 "NUM_ERROR" -> 强制将所有有序列表的编号重置为 1. 2. 3. ...
2. 如果有 "CHAT_FILLER" -> 删除所有开头结尾的废话，只保留正文。
3. 如果有 "CITATION_TAG" -> 删除所有 [1] 等标记。
4. 如果有 "BAD_HEADER" -> 将其修改为具有商业洞察力的叙事性标题，或直接删除。
5. 如果有 "ENGLISH_LEFTOVER" -> 删除无用的英文括号。
6. 如果有 "WRONG_LANGUAGE" -> 将英文内容翻译为高水准的商业中文。
7. 如果有 "SUBJECTIVE_ANALYSIS" -> 删除主观评论，改写为客观事实陈述。
8. 如果有 "MISSING_VISUAL" -> 根据上下文数据，生成一个标准的 Markdown 表格插入对应位置。
9. 如果有 "MALFORMED_TABLE" -> 修复表格格式，确保包含 |---|---| 分隔行。
10. 如果有 "BAD_FORMAT_SYMBOLS" -> 移除多余的装饰符号，还原为干净的标准 Markdown 标题和列表。

请直接输出修复后的完整 Markdown 内容。不要解释。
`;

// --- HELPERS ---

const cleanText = (text: string | undefined) => text || "";

// --- TOOLS DEFINITION (UPDATED FOR REFINEMENT REQUESTS) ---

const toolRequestRefinement: FunctionDeclaration = {
  name: "request_refinement",
  description: "Triggers a rigorous, multi-step refinement process to update the document. Use this when the user wants to MODIFY, ADD, or REWRITE content.",
  parameters: {
    type: Type.OBJECT,
    properties: {
      target: { 
          type: Type.STRING, 
          enum: ["case_content", "teaching_notes"],
          description: "Which part of the document to update." 
      },
      instruction: { 
          type: Type.STRING, 
          description: "Precise instructions on what to change (e.g., 'Add a table comparing Q1 and Q2 revenue', 'Make the tone more aggressive')." 
      }
    },
    required: ["target", "instruction"]
  }
};

// --- MAIN FUNCTIONS ---

export const gatherInformation = async (
  topic: string,
  uploadedFiles: UploadedFile[],
  onProgress: (msg: string) => void
): Promise<{ context: string; sources: SearchSource[] }> => {
  
  const sources: SearchSource[] = [];
  const model = getSearchModel(); 

  const searchAndCollect = async (rolePrompt: string, type: string) => {
    onProgress(`正在进行 ${type} 维度的深度研究...`);
    try {
        // Construct the parts for the model
        const parts: any[] = [];
        
        let systemText = `${rolePrompt}\n\n研究主题: ${topic}\n\n请进行【全球范围】内的信息搜集（包括中文和英文来源）。\n\n**核心指令：**\n请不要写成一篇通顺的总结报告！\n请以【原始情报档案 (Raw Information Dossier)】的格式输出。\n- 罗列具体的**数据表格**、**关键财务指标**。\n- 摘录**原文直接引用 (Direct Quotes)**。\n- 记录**详细的时间线**和**事件经过**。\n- 保留信息的**高颗粒度**，不要过度概括。\n- 最终输出语言必须为【简体中文】。`;

        // If files are uploaded, inject priority instructions
        if (uploadedFiles.length > 0) {
            systemText += `\n\n**CRITICAL INSTRUCTION: PRIORITY SOURCE**\nI have uploaded ${uploadedFiles.length} local documents/files (Knowledge Base). \nYou **MUST** use the information in these uploaded documents as your **PRIMARY SOURCE OF TRUTH (Ground Truth)**. \n\n1. Extract ALL relevant facts, data, and quotes from the attached files first. \n2. Use the Google Search tool ONLY to supplement information that is completely missing from the uploaded files. \n3. If there is a conflict between the web search and the uploaded files, **the uploaded files PREVAIL**.\n4. When referencing data from files, explicitly mention "From Internal Database/Uploaded File".`;
        }

        parts.push({ text: systemText });

        // Append uploaded files as parts
        uploadedFiles.forEach(f => {
            if (f.isText) {
                // For text/md/csv, append as text part with delimiters
                parts.push({ text: `\n\n--- BEGIN UPLOADED DOCUMENT: ${f.name} ---\n${f.data}\n--- END UPLOADED DOCUMENT ---\n` });
            } else {
                // For PDF, append as inlineData
                parts.push({ inlineData: { mimeType: f.mimeType, data: f.data } });
            }
        });

        // Call API
        const response = await callWithRetry<GenerateContentResponse>(() => getAiClient().models.generateContent({
            model,
            contents: [{ role: 'user', parts: parts }],
            config: { tools: [{ googleSearch: {} }] },
        }));

        const chunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks;
        if (chunks) {
            chunks.forEach((chunk: any) => {
                if (chunk.web) {
                    sources.push({ 
                        title: chunk.web.title, 
                        uri: chunk.web.uri,
                        snippet: "" 
                    });
                }
            });
        }
        return `\n\n### 【${type} 原始情报档案】 ###\n${response.text}\n\n`;
    } catch (e) {
        console.error(`Error in ${type} research:`, e);
        return ""; 
    }
  };

  const general = await searchAndCollect(PROMPT_RESEARCH_GENERAL, "综合");
  const quant = await searchAndCollect(PROMPT_RESEARCH_QUANT, "量化");
  const human = await searchAndCollect(PROMPT_RESEARCH_HUMAN, "人文");

  const uniqueSources: SearchSource[] = [];
  const seenUris = new Set<string>();
  sources.forEach(s => {
      if (s.uri && !seenUris.has(s.uri)) {
          seenUris.add(s.uri);
          uniqueSources.push(s);
      }
  });

  return {
    context: general + quant + human,
    sources: uniqueSources
  };
};

export const generateLearningObjectives = async (context: string): Promise<string[]> => {
  const prompt = `
    基于以下【原始情报档案】，提炼 5 个核心学习目标。
    【情报档案】：${context.substring(0, 200000)} 
    请只返回一个 JSON 字符串数组。
  `;

  const response = await callWithRetry<GenerateContentResponse>(() => getAiClient().models.generateContent({
    model: getGenModel(), 
    contents: prompt,
    config: {
      systemInstruction: PROMPT_OBJECTIVE_SYSTEM,
      responseMimeType: "application/json",
      responseSchema: { type: Type.ARRAY, items: { type: Type.STRING } }
    }
  }));

  try {
    return JSON.parse(response.text || "[]");
  } catch (e) {
    return ["无法解析目标，请重试。"];
  }
};

export const refineLearningObjectives = async (context: string, direction: string): Promise<string[]> => {
  const prompt = `
    用户希望学习目标聚焦于以下方向：
    "${direction}"
    基于这个方向和以下【原始情报档案】，请重新生成 5 个更具体的、符合该方向的中文学习目标。
    【情报档案】：${context.substring(0, 200000)} 
    请只返回一个 JSON 字符串数组。
  `;

  const response = await callWithRetry<GenerateContentResponse>(() => getAiClient().models.generateContent({
    model: getGenModel(),
    contents: prompt,
    config: {
      systemInstruction: PROMPT_OBJECTIVE_SYSTEM,
      responseMimeType: "application/json",
      responseSchema: { type: Type.ARRAY, items: { type: Type.STRING } }
    }
  }));

  try {
    return JSON.parse(response.text || "[]");
  } catch (e) {
    return ["生成失败，请重试"];
  }
};

export const generateFramework = async (context: string, objective: string, feedback?: string, currentFramework?: string): Promise<string> => {
  // Map inputs to the "Architect" prompts requirements
  let userPrompt = `
  **Input Data for Architect:**
  - **Core Dilemma / Theme (Provided by User):** ${objective}
  - **Raw Information Dossier (Background Context):**
  ${context.substring(0, 200000)}
  `;

  if (feedback && currentFramework) {
      userPrompt += `\n\n**Current Draft Framework:**\n${currentFramework}\n\n**User Feedback / Adjustments:** ${feedback}\n\nPlease modify the framework based on the user's feedback while maintaining the "Quick Case" structure.`;
  } else {
      userPrompt += `\n\nPlease generate the "Quick Case" Framework Outline.`;
  }

  const response = await callWithRetry<GenerateContentResponse>(() => getAiClient().models.generateContent({
    model: getGenModel(),
    contents: userPrompt,
    config: { systemInstruction: PROMPT_FRAMEWORK_SYSTEM }
  }));

  return cleanText(response.text);
};

export const generateCaseContent = async (context: string, objective: string, framework: string): Promise<string> => {
  const prompt = `
    Please write the full "Quick Case" narrative based on the approved framework.
    
    【Approved Framework】:
    ${framework}
    
    【Core Dilemma / Objective】:
    ${objective}
    
    【Raw Information Dossier】:
    ${context.substring(0, 200000)}
  `;

  const response = await callWithRetry<GenerateContentResponse>(() => getAiClient().models.generateContent({
    model: getGenModel(),
    contents: prompt,
    config: { systemInstruction: PROMPT_WRITING_SYSTEM }
  }));

  return cleanText(response.text);
};

// --- CHAT WITH EDITOR (UPDATED) ---

export interface ChatResponse {
    text: string;
    refinementRequest?: {
        target: 'case_content' | 'teaching_notes';
        instruction: string;
    };
}

export const chatWithEditor = async (
    currentCaseContent: string, 
    currentTeachingNotes: string, 
    chatHistory: {role: string, parts: {text: string}[]}[],
    userMessage: string
): Promise<ChatResponse> => {
    
    const systemPrompt = `
You are an expert Commercial Case Study Editor (Copilot).
Your goal is to help the user refine, edit, and perfect their business case study and teaching notes.

**Current Document Context:**
--- BEGIN CASE CONTENT ---
${currentCaseContent}
--- END CASE CONTENT ---

--- BEGIN TEACHING NOTES ---
${currentTeachingNotes}
--- END TEACHING NOTES ---

**Instructions:**
1. Answer user questions about the content concisely.
2. **CRITICAL:** If the user asks to **modify**, **change**, **rewrite**, or **add** content (e.g. "change tone", "add table", "fix error"), you MUST use the tool \`request_refinement\`.
3. **DO NOT** attempt to write the full new document content yourself. Just pass the precise *instructions* to the tool. The system will handle the generation and formatting.
4. Always communicate in **Chinese (Simplified)** unless the user speaks English.
    `;

    const contents = [
        ...chatHistory,
        { role: 'user', parts: [{ text: userMessage }] }
    ];

    try {
        const response = await callWithRetry<GenerateContentResponse>(() => getAiClient().models.generateContent({
            model: getGenModel(),
            contents: contents,
            config: {
                systemInstruction: systemPrompt,
                tools: [{ functionDeclarations: [toolRequestRefinement] }]
            }
        }));

        let result: ChatResponse = { text: "" };

        const toolCalls = response.candidates?.[0]?.content?.parts?.filter(p => p.functionCall);
        const textPart = response.candidates?.[0]?.content?.parts?.find(p => p.text);
        
        if (textPart) {
            result.text = textPart.text || "";
        }

        if (toolCalls && toolCalls.length > 0) {
            for (const toolCallPart of toolCalls) {
                const fc = toolCallPart.functionCall;
                if (fc && fc.name === 'request_refinement') {
                    const args = fc.args as any;
                    result.refinementRequest = {
                        target: args.target,
                        instruction: args.instruction
                    };
                    // Override text to indicate action
                    if (!result.text) result.text = "收到，正在调动深度编辑引擎进行修改...";
                }
            }
        }

        return result;

    } catch (e) {
        console.error("Chat Error", e);
        return { text: "抱歉，编辑器遇到了一些问题，请稍后再试。" };
    }
};

// --- FIREWALL LOGIC (INSPECTOR + FIXER LOOP) ---

const firewallInspect = async (text: string): Promise<string[]> => {
    const response = await callWithRetry<GenerateContentResponse>(() => getAiClient().models.generateContent({
        model: getGenModel(),
        contents: PROMPT_FIREWALL_INSPECTOR + `\n${text.substring(0, 100000)}`,
        config: { 
            responseMimeType: "application/json",
            responseSchema: { type: Type.ARRAY, items: { type: Type.STRING } }
        }
    }));
    try {
        return JSON.parse(response.text || "[]");
    } catch {
        return [];
    }
};

const firewallFix = async (text: string, errors: string[]): Promise<string> => {
    const response = await callWithRetry<GenerateContentResponse>(() => getAiClient().models.generateContent({
        model: getGenModel(),
        contents: `${PROMPT_FIREWALL_FIXER}\n\n【发现的错误】：${JSON.stringify(errors)}\n\n【待修复文档】：\n${text.substring(0, 100000)}`,
    }));
    return cleanText(response.text);
};

const runStrictFirewall = async (draft: string, onStatus?: (msg: string) => void, checkStop?: () => boolean): Promise<string> => {
    let currentText = draft;
    let attempt = 0;
    const MAX_ATTEMPTS = 4; 

    while (attempt < MAX_ATTEMPTS) {
        if (checkStop && checkStop()) throw new Error("STOPPED");

        attempt++;
        if (onStatus) onStatus(`防火墙审查中 (第 ${attempt} 轮)...`);
        
        const errors = await firewallInspect(currentText);
        
        if (errors.length === 0) {
            if (onStatus) onStatus("审查通过，格式完美。");
            break; 
        }

        if (checkStop && checkStop()) throw new Error("STOPPED");

        if (onStatus) onStatus(`发现 ${errors.length} 个问题 (${errors.join(", ")})，正在修复...`);
        currentText = await firewallFix(currentText, errors);
    }
    
    return currentText;
};

// --- VISUAL AUDIT MODULE (DEDICATED CHART BUILDER) ---

const auditVisuals = async (text: string): Promise<string[]> => {
    const response = await callWithRetry<GenerateContentResponse>(() => getAiClient().models.generateContent({
        model: getGenModel(),
        contents: PROMPT_VISUAL_AUDITOR + `\n${text.substring(0, 100000)}`,
        config: { 
            responseMimeType: "application/json",
            responseSchema: { type: Type.ARRAY, items: { type: Type.STRING } }
        }
    }));
    try {
        return JSON.parse(response.text || "[]");
    } catch {
        return [];
    }
};

const fixVisuals = async (text: string, errors: string[]): Promise<string> => {
    const response = await callWithRetry<GenerateContentResponse>(() => getAiClient().models.generateContent({
        model: getGenModel(),
        contents: `${PROMPT_VISUAL_FIXER}\n\n【发现的视觉问题】：${JSON.stringify(errors)}\n\n【文档内容】：\n${text.substring(0, 100000)}`,
    }));
    return cleanText(response.text);
};

export const generateAndAuditVisuals = async (text: string, onStatus?: (msg: string) => void, checkStop?: () => boolean): Promise<string> => {
    let currentText = text;
    let attempt = 0;
    const MAX_ATTEMPTS = 3;

    while (attempt < MAX_ATTEMPTS) {
        if (checkStop && checkStop()) throw new Error("STOPPED");

        attempt++;
        if (onStatus) onStatus(`图表与数据可视化构建中 (第 ${attempt} 轮)...`);
        
        const errors = await auditVisuals(currentText);
        
        if (errors.length === 0) {
             if (onStatus) onStatus("所有图表构建完成，数据展示完美。");
             break;
        }

        if (checkStop && checkStop()) throw new Error("STOPPED");

        if (onStatus) onStatus(`发现 ${errors.length} 处数据可视化优化点，正在重新绘图...`);
        currentText = await fixVisuals(currentText, errors);
    }
    return currentText;
};

// --- ORCHESTRATORS ---

export const polishCaseContent = async (draft: string, onStatus?: (msg: string) => void): Promise<string> => {
  const prompt = `
    请作为【阅读编辑 (Quality Assurance Editor)】严格审查并重写以下草稿。
    ${draft.substring(0, 100000)}
  `;

  const response = await callWithRetry<GenerateContentResponse>(() => getAiClient().models.generateContent({
    model: getGenModel(),
    contents: prompt,
    config: { systemInstruction: PROMPT_POLISH_SYSTEM }
  }));

  const polished = cleanText(response.text);
  return runStrictFirewall(polished, onStatus);
};

export const generateTeachingNotes = async (context: string, objective: string, caseDraft: string): Promise<string> => {
  const prompt = `
    请为以下案例撰写教学指南 (Teaching Note)。
    【案例正文】：${caseDraft.substring(0, 50000)}
    【学习目标】：${objective}
  `;

  const response = await callWithRetry<GenerateContentResponse>(() => getAiClient().models.generateContent({
    model: getGenModel(),
    contents: prompt,
    config: { systemInstruction: PROMPT_TEACHING_SYSTEM }
  }));

  return cleanText(response.text);
};

export const polishTeachingNotes = async (draft: string, onStatus?: (msg: string) => void): Promise<string> => {
    const prompt = `
      请润色以下教学指南，确保格式清晰，板书计划结构合理。
      ${draft.substring(0, 60000)}
    `;
  
    const response = await callWithRetry<GenerateContentResponse>(() => getAiClient().models.generateContent({
      model: getGenModel(),
      contents: prompt,
      config: { systemInstruction: "你是一位资深教授。请润色这份教学指南。必须使用简体中文。请保持Markdown格式干净，避免花哨的符号。" }
    }));
  
    const polished = cleanText(response.text);
    return runStrictFirewall(polished, onStatus);
  };

// --- SELECTION REFINEMENT (UPDATED) ---

export const refineTextBySelection = async (
  fullText: string,
  selection: string,
  instruction: string
): Promise<string> => {
  const prompt = `
    Role: Document Editor.
    Task: The user wants to modify a specific part of the document based on a selection.

    [Document Content]:
    ${fullText.substring(0, 100000)}

    [User Selected Text]:
    "${selection}"

    [User Instruction]:
    "${instruction}"

    Directives:
    1. Locate the section in the [Document Content] that corresponds to the [User Selected Text].
    2. Rewrite ONLY that specific section to satisfy the [User Instruction].
    3. Keep the rest of the document EXACTLY unchanged.
    4. Output the COMPLETE, updated document.
    5. Maintain Simplified Chinese.
  `;

  const response = await callWithRetry<GenerateContentResponse>(() => getAiClient().models.generateContent({
    model: getGenModel(),
    contents: prompt
  }));

  return cleanText(response.text);
};

export const refineContent = async (
  fullMarkdown: string,
  instruction: string,
  selectedText?: string,
  onProgress?: (msg: string) => void,
  checkStop?: () => boolean
): Promise<string> => {
  
  if (onProgress) onProgress("正在根据意见重写内容...");

  let prompt = '';
  
  if (selectedText) {
    // PARTIAL REWRITE
    prompt = `
      Role: Document Editor.
      Task: The user wants to modify a specific part of the document based on a selection.

      [Document Content (Markdown)]:
      ${fullMarkdown}

      [User Selected Text (Visual Representation)]:
      "${selectedText}"

      [User Instruction]:
      "${instruction}"

      Directives:
      1. Locate the section in the [Document Content] that corresponds to the [User Selected Text].
      2. Rewrite ONLY that specific section to satisfy the [User Instruction].
      3. Keep the rest of the document EXACTLY unchanged.
      4. Output the COMPLETE, updated Markdown document.
      5. Maintain Simplified Chinese.
    `;
  } else {
    // GLOBAL REWRITE
    prompt = `
      Role: Senior Editor.
      Task: The user wants to GLOBALLY refine the entire document.

      [Document Content (Markdown)]:
      ${fullMarkdown}

      [Global Instruction]:
      "${instruction}"

      Directives:
      1. Rewrite the document to fully implement the [Global Instruction].
      2. Ensure all data tables and key facts are preserved unless the instruction says to remove them.
      3. Maintain professional structure (Headers, Tables).
      4. Output the COMPLETE, updated Markdown document.
      5. Maintain Simplified Chinese.
    `;
  }

  if (checkStop && checkStop()) throw new Error("STOPPED");

  const response = await callWithRetry<GenerateContentResponse>(() => getAiClient().models.generateContent({
    model: getGenModel(),
    contents: prompt
  }));

  const rewrittenDraft = cleanText(response.text);

  // --- CHANGED: Skip Strict Pipeline Automatically ---
  // The user wants to manually trigger the firewall later to save time.
  // We just return the raw draft here.
  
  return rewrittenDraft;
};

export const runFinalPolish = async (
  content: string,
  onProgress?: (msg: string) => void,
  checkStop?: () => boolean
): Promise<string> => {
  if (onProgress) onProgress("正在进行格式合规审查...");
  const firewalled = await runStrictFirewall(content, onProgress, checkStop);

  if (onProgress) onProgress("正在检查并修复图表数据...");
  const finalContent = await generateAndAuditVisuals(firewalled, onProgress, checkStop);

  return finalContent;
};
