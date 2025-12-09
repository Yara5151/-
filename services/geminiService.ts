import { GoogleGenAI, Type, Schema } from "@google/genai";
import { EssayType, GradingResult, HistoryRecord, ChatMessage } from "../types";

const genAI = new GoogleGenAI({ apiKey: process.env.API_KEY });

const revisionAnalysisSchema: Schema = {
  type: Type.OBJECT,
  description: "Comparison with previous drafts",
  properties: {
    isRevision: { type: Type.BOOLEAN, description: "True if this looks like a revision of the provided previous drafts" },
    scoreChange: { type: Type.STRING, description: "Score difference string (e.g. '+2', '-1.5', '0')" },
    improvements: { type: Type.ARRAY, items: { type: Type.STRING }, description: "List of improvements compared to previous draft" },
    persistentErrors: { type: Type.ARRAY, items: { type: Type.STRING }, description: "Errors that persist from previous drafts" },
    weaknessSummary: { type: Type.STRING, description: "Summary of user's recurring bad habits/weaknesses" },
  },
  required: ["isRevision", "scoreChange", "improvements", "persistentErrors", "weaknessSummary"]
};

const bigEssaySchema: Schema = {
  type: Type.OBJECT,
  properties: {
    totalScore: { type: Type.NUMBER, description: "Total score out of 20 (Strict Beijing Standard)" },
    maxScore: { type: Type.NUMBER, description: "Should be 20" },
    breakdown: {
      type: Type.OBJECT,
      properties: {
        languageAccuracy: { type: Type.NUMBER, description: "Score out of 5" },
        contentCompleteness: { type: Type.NUMBER, description: "Score out of 5" },
        languageAuthenticity: { type: Type.NUMBER, description: "Score out of 5" },
        structureCoherence: { type: Type.NUMBER, description: "Score out of 4" },
        neatness: { type: Type.NUMBER, description: "Score out of 1 (Presentation/Handwriting impact)" }
      },
      required: ["languageAccuracy", "contentCompleteness", "languageAuthenticity", "structureCoherence", "neatness"],
    },
    topicAnalysis: {
      type: Type.OBJECT,
      properties: {
        corePoints: { type: Type.ARRAY, items: { type: Type.STRING }, description: "Key scoring points identified in the topic (in Chinese)" },
        impliedMeaning: { type: Type.STRING, description: "The central theme or implied meaning of the prompt (in Chinese)" },
      },
      required: ["corePoints", "impliedMeaning"],
    },
    wordCountAnalysis: {
      type: Type.OBJECT,
      properties: {
        count: { type: Type.NUMBER, description: "Estimated word count" },
        comment: { type: Type.STRING, description: "Comment on length (e.g. 'Standard', 'Too short - penalty')" },
        isAcceptable: { type: Type.BOOLEAN, description: "Is the length within exam range?" },
        pruningAdvice: { type: Type.STRING, description: "If word count is too high, specifically suggest which sentences/sections can be removed or shortened. If standard, leave empty." }
      },
      required: ["count", "comment", "isAcceptable"]
    },
    userOutline: { type: Type.STRING, description: "A brief summary of the student's actual essay structure/logic (in Chinese). Show that you understood what they wrote." },
    brightSpots: { type: Type.ARRAY, items: { type: Type.STRING }, description: "3-4 positive aspects or strengths of the student's essay (MUST find something good)." },
    generalComments: { type: Type.STRING, description: "Overall strict feedback based on Beijing standards (in Chinese)" },
    handwritingComments: { type: Type.STRING, description: "Feedback on handwriting cleanliness, scratches, and legibility (in Chinese)." },
    suggestions: { type: Type.ARRAY, items: { type: Type.STRING }, description: "Specific actionable advice for improvement (in Chinese)" },
    corrections: {
      type: Type.ARRAY,
      description: "Fixing objective errors (grammar, spelling)",
      items: {
        type: Type.OBJECT,
        properties: {
          original: { type: Type.STRING },
          correction: { type: Type.STRING },
          explanation: { type: Type.STRING, description: "Explanation in Chinese" },
          type: { type: Type.STRING, enum: ["grammar", "spelling", "vocabulary", "structure"] },
        },
        required: ["original", "correction", "explanation", "type"],
      },
    },
    improvements: {
      type: Type.ARRAY,
      description: "Upgrading valid but simple language to 'Kaoyan' high-level standard (Advanced vocabulary/Sentence variety)",
      items: {
        type: Type.OBJECT,
        properties: {
          original: { type: Type.STRING },
          improved: { type: Type.STRING, description: "The B2/C1 level replacement" },
          reason: { type: Type.STRING, description: "Why this is better (e.g. 'More academic', 'Passive voice') in Chinese" },
          type: { type: Type.STRING, enum: ["vocabulary", "sentence_structure"] },
        },
        required: ["original", "improved", "reason", "type"],
      },
    },
    polishedVersion: { type: Type.STRING, description: "A rewritten high-scoring version. MUST be written from the perspective of a top-tier student in an exam (Standard High-Frequency Academic English), NOT a native speaker or novelist." },
    exercises: {
      type: Type.ARRAY,
      description: "3-5 targeted exercises based on the student's errors to help them improve (in Chinese)",
      items: {
        type: Type.OBJECT,
        properties: {
          question: { type: Type.STRING, description: "The exercise question (e.g. fill in the blank or multiple choice)" },
          options: { type: Type.ARRAY, items: { type: Type.STRING }, description: "Options for multiple choice (optional)" },
          answer: { type: Type.STRING, description: "The correct answer" },
          explanation: { type: Type.STRING, description: "Why this is the correct answer (in Chinese)" },
        },
        required: ["question", "answer", "explanation"]
      }
    },
    revisionAnalysis: revisionAnalysisSchema,
  },
  required: ["totalScore", "maxScore", "breakdown", "topicAnalysis", "wordCountAnalysis", "userOutline", "brightSpots", "generalComments", "handwritingComments", "suggestions", "corrections", "improvements", "polishedVersion", "exercises", "revisionAnalysis"],
};

const smallEssaySchema: Schema = {
  ...bigEssaySchema,
  properties: {
    ...bigEssaySchema.properties,
    totalScore: { type: Type.NUMBER, description: "Total score out of 10" },
    maxScore: { type: Type.NUMBER, description: "Should be 10" },
    breakdown: {
      type: Type.OBJECT,
      properties: {
        languageAccuracy: { type: Type.NUMBER, description: "Score out of 3" },
        contentCompleteness: { type: Type.NUMBER, description: "Score out of 3" },
        languageAuthenticity: { type: Type.NUMBER, description: "Score out of 2" },
        structureCoherence: { type: Type.NUMBER, description: "Score out of 1" },
        neatness: { type: Type.NUMBER, description: "Score out of 1 (Presentation)" }
      },
      required: ["languageAccuracy", "contentCompleteness", "languageAuthenticity", "structureCoherence", "neatness"],
    },
  }
};

export const gradeEssay = async (
  essayType: EssayType,
  topicText: string,
  topicImageBase64: string | null,
  essayText: string,
  essayImageBase64: string | null,
  previousDrafts: HistoryRecord[] = []
): Promise<GradingResult> => {
  
  const model = "gemini-2.5-flash";
  const parts: any[] = [];

  let gradingStandards = "";

  if (essayType === EssayType.BIG) {
    gradingStandards = `
    **英语一大作文（图画作文）北京地区（旱区）严苛评分标准（20分）：**
    1. **字数硬性要求:** 建议 160-200 词。
       - **字数过少 (Below 160):** 严格扣分（每少10词扣1分）。
       - **字数过多 (Above 220):** **不扣分**。但是必须在 feedback 中明确指出文章过长，并具体建议删除哪些冗余、重复或无关的句子来精炼文章 (Pruning Advice)。
    2. **评分原则:** “扣分制”与“奖励分”结合。起步分较低，需靠亮点提分。
    3. **卷面书写 (Neatness 0-1分影响):** 极其重视卷面。涂改超过3处、字体潦草、难以辨认者，卷面分直接为0，总分降档。
    4. **语言标准:** 拒绝“初中词汇”。句式必须多样（倒装、强调、虚拟、定语从句）。
    5. **逻辑结构:** 严格的三段式。
    `;
  } else {
    gradingStandards = `
    **英语一小作文（应用文）北京地区（旱区）严苛评分标准（10分）：**
    1. **字数硬性要求:** 建议 100 词左右。
       - **字数过少 (Below 80):** 严重扣分。
       - **字数过多 (Above 130):** **不扣分**。但需在 feedback 中指出冗余部分，建议如何精简。
    2. **格式与语域:** 格式错误每处扣0.5-1分。语域必须恰当。
    3. **内容覆盖:** 题目要求的3个要点缺一不可，缺一个要点扣2分。
    `;
  }

  // Construct history context string
  let historyContext = "";
  if (previousDrafts.length > 0) {
    historyContext = `
    **历史提交记录 (Previous Drafts):**
    我将提供该学生之前的作文版本。请你对比本次提交与历史版本：
    1. 识别这是否是针对同一题目的修改（Revision）。
    2. 只有当它是修改版时，才在 result.revisionAnalysis 中填写对比数据。如果不相关，isRevision 设为 false，其他填空。
    
    Previous Version 1 (Score: ${previousDrafts[0].result.totalScore}):
    ${previousDrafts[0].essayText}
    `;
  }

  const systemInstruction = `
    你是由教育部考试中心聘请的**北京地区**考研英语阅卷组长。
    
    **核心角色设定:**
    你需要模拟真实阅卷人的心态：既严格把关（压分），又要发现学生的潜力（提分）。
    
    **任务要求:**
    
    1. **平衡反馈 (Balanced Feedback):**
       - **Crush (找茬):** 严抓低级错误、中式英语、逻辑跳跃、卷面脏乱、字数不达标。
       - **Encourage (鼓励):** 必须在 'brightSpots' 中找出考生的亮点（如：使用了某个高级词汇，结构尝试清晰，或者即使语言一般但卷面很棒）。
       - **Summarize (总结):** 在 'userOutline' 中概括考生的行文逻辑，证明你读懂了TA的文章。

    2. **满分范文 (The Polished Version):**
       - **重要:** 范文**不应该**写得像《纽约时报》或母语作家的文章，那样太假，学生学不来。
       - **范文标准:** 必须是一篇**“完美的考场作文”**。
         - 使用考研英语大纲内的核心高频词汇 (Core Vocabulary)。
         - 使用经典的考研句型模版 (Standard Sentence Structures)。
         - 逻辑严密，无语法错误，字数精准控制。
         - 这是一篇学生经过努力**可以写出来**的文章。
    
    3. **卷面与涂改 (Handwriting):** 
       - 凡是被划掉、涂黑的内容，**绝不**计入内容，但严厉惩罚卷面分。
       
    4. **历史对比 (Revision Analysis):**
       - 重点关注用户是否修正了之前指出的错误。

    ${gradingStandards}
    
    ${historyContext}

    请严格按照 JSON 格式返回结果。
  `;

  // Add Topic Content
  parts.push({ text: `题目描述/要求: ${topicText || "见附图"}` });
  if (topicImageBase64) {
    parts.push({ inlineData: { mimeType: "image/jpeg", data: topicImageBase64 } });
  }

  // Add Essay Content
  parts.push({ text: `学生作文内容: ${essayText || "见附图"}` });
  if (essayImageBase64) {
    parts.push({ inlineData: { mimeType: "image/jpeg", data: essayImageBase64 } });
  }

  try {
    const result = await genAI.models.generateContent({
      model: model,
      contents: { parts: parts },
      config: {
        systemInstruction: systemInstruction,
        responseMimeType: "application/json",
        responseSchema: essayType === EssayType.BIG ? bigEssaySchema : smallEssaySchema,
      },
    });

    const text = result.text;
    if (!text) throw new Error("AI 未返回结果");
    
    return JSON.parse(text) as GradingResult;
  } catch (error) {
    console.error("Grading failed:", error);
    throw error;
  }
};

export const chatWithExaminer = async (
  currentResult: GradingResult,
  essayText: string,
  chatHistory: ChatMessage[],
  newMessage: string
): Promise<string> => {
  const model = "gemini-2.5-flash";
  
  // Format history for context
  const historyText = chatHistory.map(m => `${m.role === 'user' ? '考生' : '阅卷组长'}: ${m.content}`).join('\n');
  
  const systemInstruction = `
    你现在是北京考研英语阅卷组长，正在与考生面对面交流。
    考生刚刚拿到了你的评分报告。
    
    **评分结果背景:**
    - 总分: ${currentResult.totalScore} / ${currentResult.maxScore}
    - 考生文章全文: "${essayText}"
    - 你之前指出的错误: ${JSON.stringify(currentResult.corrections)}
    
    **你的回答风格:**
    1. **权威且专业:** 保持考场阅卷人的严肃性，但也愿意解答考生的疑惑。
    2. **针对性强:** 针对考生的问题，引用TA作文中的具体句子进行解释。
    3. **处理识别错误:** 如果考生申诉说“系统识别错了，我其实写的是X”，你应该回答：“如果是这样，请在下方点击‘返回修改’修正文本后重新提交。根据你现在所说的内容，这个错误可以忽略/修正...”
    4. **拒绝异想天开:** 如果考生问“我能不能写我在火星上生活”，请严厉指出这不符合考研作文的“社会热点/哲理”导向。
    5. **简练:** 不要长篇大论，直接切中要害。
  `;

  const response = await genAI.models.generateContent({
    model: model,
    contents: `
      历史对话:
      ${historyText}
      
      考生新问题: ${newMessage}
    `,
    config: {
      systemInstruction: systemInstruction,
    },
  });

  return response.text || "阅卷组长正忙，请稍后再试。";
};