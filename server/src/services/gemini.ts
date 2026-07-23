// ============================================================
// Gemini AI 评估服务 — prompt 构建 + API 调用
// ============================================================

import { GoogleGenerativeAI } from '@google/generative-ai';
import fs from 'fs';
import { config } from '../config.js';
import type { EvaluationResult } from '@ai-talent-eval/shared';

// ============================================================
// 评估 Prompt 构建
// ============================================================

function buildPrompt(candidateName: string): string {
  return `你是一个专业的主播人才评估专家。请根据以下10个维度的评分标准，对该候选人的视频和照片进行综合评估。

候选人姓名：${candidateName}

=== 评估维度与评分标准 ===

**维度1：外貌（权重18%）**
- 轮廓五官/立体辨识度（满分7分）
  S(7分)：脸型流畅、五官立体、轮廓清晰、辨识度高，标准上镜脸
  A+(6分)：脸型较好、五官有一定立体感，有明显的上镜优势
  A(5分)：脸型无明显硬伤，五官端正，上镜看着舒服干净
  B(4分)：脸型或五官有小瑕疵但不影响整体观感
  C(3分)：五官平平无奇，无记忆点
  C-(≤2分)：脸型或五官有明显缺陷，影响观感

- 整体观感（满分7分）
  S(7分)：干净精致有高级感，让人眼前一亮，有强烈的继续看下去的欲望
  A+(6分)：整体干净舒服，有辨识度，让人愿意继续看
  A(5分)：看着舒服、自然，没有不适感
  B(4分)：整体感觉一般，无功无过
  C(3分)：略显粗糙，需要明显改善
  C-(≤2分)：整体观感差，让人不想继续观看

- 静态情绪底色（满分4分）
  S(4分)：目光柔和有温度，传递友善与真诚，呈现放松平和的情绪暗示
  A+(3分)：眼神自然，无攻击性，整体比较放松
  A(2分)：表情略微僵硬，但还算自然
  B(1分)：表情紧张或不自然

**维度2：气质体态（权重12%）**
- 气质（满分6分）
  S(6分)：精致感与高级感突出，气质出众，适合品质优良的头部品牌
  A+(5分)：有明显的精致感与高级感，气质出众
  A(4分)：有不错的气质，整体感觉良好
  B(3分)：气质一般，无功无过
  C(2分)：气质偏弱，缺乏吸引力
  C-(1分)：气质不佳

- 体态（满分6分）
  S(6分)：体态挺拔优雅，放松状态下也能保持完美框架
  A+(5分)：体态自然端正，整体精神
  A(4分)：体态基本端正，偶有松懈
  B(3分)：体态一般，需要加强训练
  C(2分)：体态松散，不够精神
  C-(1分)：体态不佳

**维度3：妆容（权重5%）**
- 妆容/发型（满分5分）
  S(5分)：妆容精致有层次，发型整洁有型，整体造型精致完美
  A+(4分)：完整的日常妆容，底妆均匀，发型干净整齐
  A(3分)：有基础妆容，整体干净
  B(2分)：妆容简单，基本干净
  C(1分)：妆容粗糙或无妆容，影响观感

**维度4：镜前松弛感（权重5%）**
- 神情自然放松（满分5分）
  S(5分)：极度自然放松，完全看不出镜头痕迹，观众看着极度舒服
  A+(4分)：整体自然放松，偶尔稍有紧绷但很快收回，观众看着舒服愿意停留
  A(3分)：基本自然，能正常表达
  B(2分)：略显紧张但还能正常发挥
  C(1分)：高度紧张，影响表达

**维度5：自信心笃定（权重7%）**
- 语气/气场（满分7分）
  S(7分)：充满自信与气场，有强烈的领袖感和主角光环
  A+(6分)：整体信心十足，讲解流畅有底气，有主角感
  A(5分)：有信心，大部分时候表达流畅
  B(4分)：基本自信，偶有犹豫
  C(3分)：自信心不足，表达犹豫
  C-(≤2分)：明显缺乏自信

**维度6：情绪张力控制力（权重7%）**
- 情绪张力/控制力（满分7分）
  S(7分)：情绪感染力极强，收放自如，能精准控制节奏和氛围
  A+(6分)：整体感染力和控制力不错，能带动观众，遇到突发基本能稳住
  A(5分)：有感染力，能较好地控制情绪
  B(4分)：情绪表达尚可，控制力一般
  C(3分)：情绪表达较弱，控制力不足
  C-(≤2分)：情绪表达差，容易失控

**维度7：专注力（权重5%）**
- 注意力集中/状态维持（满分5分）
  S(5分)：全程高度专注，反应极快，状态始终在线
  A+(4分)：整体注意力在线，反应及时，精神面貌良好无明显起伏
  A(3分)：大部分时间专注，偶有走神
  B(2分)：注意力一般，时有分散
  C(1分)：注意力不集中

**维度8：口音（权重11%）**
- 口条（满分5分）
  S(5分)：口齿极清晰，表达极流畅，毫无口癖，节奏感极佳
  A+(4分)：口齿清晰，表达流畅，偶有轻微口头禅但不影响节奏
  A(3分)：基本清晰流畅
  B(2分)：略有口齿不清或卡顿
  C(1分)：口齿不清，影响理解

- 声线（满分6分）
  S(6分)：声线优质有辨识度，音色悦耳，耐久度极高
  A+(5分)：声音条件好，听着舒适，耐久度好
  A(4分)：声音条件较好，耐听
  B(3分)：声音条件一般，略显单薄但不影响长时间收听
  C(2分)：声音条件较差
  C-(1分)：声音条件差

**维度9：产品学习表达能力（权重12%）**
- 产品学习能力（满分5分）
  S(5分)：极快掌握产品核心卖点，能举一反三，信息覆盖完整无遗漏无错误
  A+(4分)：核心信息完整覆盖，关键内容无遗漏无错误，重点抓得准
  A(3分)：基本掌握产品要点
  B(2分)：有所遗漏但核心无误
  C(1分)：遗漏较多

- 产品表达能力（满分7分）
  S(7分)：讲解极具说服力和感染力，通俗易懂又专业，让人想立刻购买
  A+(6分)：能把产品讲得明白易懂，在通俗和专业之间找到平衡
  A(5分)：能清楚地表达产品卖点
  B(4分)：基本能表达清楚
  C(3分)：表达不够清晰
  C-(≤2分)：表达混乱

**维度10：话术天赋（权重18%，每项满分3分，共18分）**
- 开播留人话术（满分3分）— 直播开场能否快速抓住路人，前3秒决定去留
- 内容叙述话术（满分3分）— 能否把卖点包装成故事或场景化的需求痛点
- 互动控场话术（满分3分）— 实时互动能力，能否把粉丝留言变成讲解素材
- 信任背书话术（满分3分）— 能否让粉丝相信主播推的靠谱（专业背书、亲身体验、选品标准）
- 商业转化话术（满分3分）— 临门一脚推动下单（价格锚定、限时限量、算账式说服）
- 下拨沉淀话术（满分3分）— 结尾引导关注、预告下场、感谢陪伴

话术天赋评分标准（每个子项）：
S(3分)：话术精准有冲击力，既能快速抓人又能促成转化，节奏感和分寸感完美
A+(2.5分)：话术有效，能抓人、能互动、能转化，但个别地方还可以更精炼
A(2分)：话术基本到位，能完成各环节任务，但缺乏记忆点
B(1.5分)：话术平平，能讲清楚但不出彩，感染力不足
C(1分)：话术生硬，接近念稿，缺乏互动感和转化力
C-(0.5分)：话术明显不行，听众容易流失

=== 额外评估项 ===
请同时评估以下内容：
- 通用标签：体力体能、语言能力、技能特长（每项给出value和comment）
- 行业优势匹配度：对以下行业给出匹配度(HIGH/MEDIUM/LOW/NONE)和说明：美妆个护、服饰鞋包、3C数码、零食食品、生活百货、女装
- 综合评价（overallComment，200-500字）

=== 输出要求 ===
请严格按照以下JSON格式返回（不要包含markdown代码块标记，仅返回纯JSON）：
{
  "dimensions": [
    {
      "dimensionId": 1,
      "name": "外貌",
      "weight": 0.18,
      "weightedScore": 0,
      "maxScore": 18.0,
      "subItems": [
        { "name": "轮廓五官/立体辨识度", "score": 0, "maxScore": 7, "comment": "" },
        { "name": "整体观感", "score": 0, "maxScore": 7, "comment": "" },
        { "name": "静态情绪底色", "score": 0, "maxScore": 4, "comment": "" }
      ]
    },
    {
      "dimensionId": 2,
      "name": "气质体态",
      "weight": 0.12,
      "weightedScore": 0,
      "maxScore": 12.0,
      "subItems": [
        { "name": "气质", "score": 0, "maxScore": 6, "comment": "" },
        { "name": "体态", "score": 0, "maxScore": 6, "comment": "" }
      ]
    },
    {
      "dimensionId": 3,
      "name": "妆容",
      "weight": 0.05,
      "weightedScore": 0,
      "maxScore": 5.0,
      "subItems": [
        { "name": "妆容/发型", "score": 0, "maxScore": 5, "comment": "" }
      ]
    },
    {
      "dimensionId": 4,
      "name": "镜前松弛感",
      "weight": 0.05,
      "weightedScore": 0,
      "maxScore": 5.0,
      "subItems": [
        { "name": "神情自然放松", "score": 0, "maxScore": 5, "comment": "" }
      ]
    },
    {
      "dimensionId": 5,
      "name": "自信心笃定",
      "weight": 0.07,
      "weightedScore": 0,
      "maxScore": 7.0,
      "subItems": [
        { "name": "语气/气场", "score": 0, "maxScore": 7, "comment": "" }
      ]
    },
    {
      "dimensionId": 6,
      "name": "情绪张力控制力",
      "weight": 0.07,
      "weightedScore": 0,
      "maxScore": 7.0,
      "subItems": [
        { "name": "情绪张力/控制力", "score": 0, "maxScore": 7, "comment": "" }
      ]
    },
    {
      "dimensionId": 7,
      "name": "专注力",
      "weight": 0.05,
      "weightedScore": 0,
      "maxScore": 5.0,
      "subItems": [
        { "name": "注意力集中/状态维持", "score": 0, "maxScore": 5, "comment": "" }
      ]
    },
    {
      "dimensionId": 8,
      "name": "口音",
      "weight": 0.11,
      "weightedScore": 0,
      "maxScore": 11.0,
      "subItems": [
        { "name": "口条", "score": 0, "maxScore": 5, "comment": "" },
        { "name": "声线", "score": 0, "maxScore": 6, "comment": "" }
      ]
    },
    {
      "dimensionId": 9,
      "name": "产品学习表达能力",
      "weight": 0.12,
      "weightedScore": 0,
      "maxScore": 12.0,
      "subItems": [
        { "name": "产品学习能力", "score": 0, "maxScore": 5, "comment": "" },
        { "name": "产品表达能力", "score": 0, "maxScore": 7, "comment": "" }
      ]
    },
    {
      "dimensionId": 10,
      "name": "话术天赋",
      "weight": 0.18,
      "weightedScore": 0,
      "maxScore": 18.0,
      "subItems": [
        { "name": "开播留人话术", "score": 0, "maxScore": 3, "comment": "" },
        { "name": "内容叙述话术", "score": 0, "maxScore": 3, "comment": "" },
        { "name": "互动控场话术", "score": 0, "maxScore": 3, "comment": "" },
        { "name": "信任背书话术", "score": 0, "maxScore": 3, "comment": "" },
        { "name": "商业转化话术", "score": 0, "maxScore": 3, "comment": "" },
        { "name": "下拨沉淀话术", "score": 0, "maxScore": 3, "comment": "" }
      ]
    }
  ],
  "generalTags": [
    { "name": "体力体能", "value": "", "comment": null },
    { "name": "语言能力", "value": "", "comment": null },
    { "name": "技能特长", "value": "", "comment": null }
  ],
  "industryAdvantages": [
    { "name": "美妆个护", "matchLevel": "MEDIUM", "comment": "" },
    { "name": "服饰鞋包", "matchLevel": "MEDIUM", "comment": "" },
    { "name": "3C数码", "matchLevel": "MEDIUM", "comment": "" },
    { "name": "零食食品", "matchLevel": "MEDIUM", "comment": "" },
    { "name": "生活百货", "matchLevel": "MEDIUM", "comment": "" },
    { "name": "女装", "matchLevel": "MEDIUM", "comment": "" }
  ],
  "overallComment": ""
}`;
}

// ============================================================
// Mock 评估结果
// ============================================================

function generateMockResult(candidateName: string): EvaluationResult {
  return {
    dimensions: [
      {
        dimensionId: 1,
        name: '外貌',
        weight: 0.18,
        weightedScore: 16.2,
        maxScore: 18.0,
        subItems: [
          { name: '轮廓五官/立体辨识度', score: 6, maxScore: 7, comment: '脸型流畅舒展，软组织覆盖良好，五官立体度出色，上镜轮廓清晰。侧颜线条流畅。' },
          { name: '整体观感', score: 6, maxScore: 7, comment: '整体干净舒服，有一定的辨识度，氛围温和自然，属于让人愿意继续看下去的长相。' },
          { name: '静态情绪底色', score: 4, maxScore: 4, comment: '目光柔和有温度，注视时能传递友善。整体呈现放松平和的情绪暗示。' },
        ],
      },
      {
        dimensionId: 2,
        name: '气质体态',
        weight: 0.12,
        weightedScore: 10.2,
        maxScore: 12.0,
        subItems: [
          { name: '气质', score: 5, maxScore: 6, comment: '有明显的精致感与高级感，气质出众，适合为品质优良的头部国货或轻奢品牌带货。' },
          { name: '体态', score: 5, maxScore: 6, comment: '体态自然端正，放松状态下也能保持基本框架，整体看着精神。' },
        ],
      },
      {
        dimensionId: 3,
        name: '妆容',
        weight: 0.05,
        weightedScore: 4.0,
        maxScore: 5.0,
        subItems: [
          { name: '妆容/发型', score: 4, maxScore: 5, comment: '有完整的日常妆容，底妆均匀，眉毛有修饰，气色好。发型干净整齐。' },
        ],
      },
      {
        dimensionId: 4,
        name: '镜前松弛感',
        weight: 0.05,
        weightedScore: 4.0,
        maxScore: 5.0,
        subItems: [
          { name: '神情自然放松', score: 4, maxScore: 5, comment: '整体自然放松，偶尔语调稍高或表情略夸张，但很快收回。观众看着舒服愿意停留。' },
        ],
      },
      {
        dimensionId: 5,
        name: '自信心笃定',
        weight: 0.07,
        weightedScore: 5.88,
        maxScore: 7.0,
        subItems: [
          { name: '语气/气场', score: 6, maxScore: 7, comment: '整体信心十足，讲解流畅有底气。大部分时间传递出笃定感，有主角感。' },
        ],
      },
      {
        dimensionId: 6,
        name: '情绪张力控制力',
        weight: 0.07,
        weightedScore: 5.25,
        maxScore: 7.0,
        subItems: [
          { name: '情绪张力/控制力', score: 5, maxScore: 7, comment: '整体感染力和控制力都不错。正常讲解能带动粉丝，遇到突发基本能稳住。' },
        ],
      },
      {
        dimensionId: 7,
        name: '专注力',
        weight: 0.05,
        weightedScore: 4.0,
        maxScore: 5.0,
        subItems: [
          { name: '注意力集中/状态维持', score: 4, maxScore: 5, comment: '整体注意力在线，反应及时。全程精神面貌良好，无明显起伏。' },
        ],
      },
      {
        dimensionId: 8,
        name: '口音',
        weight: 0.11,
        weightedScore: 8.8,
        maxScore: 11.0,
        subItems: [
          { name: '口条', score: 5, maxScore: 5, comment: '口齿清晰，表达流畅。偶有轻微口头禅但不影响整体节奏。达到普通话二级甲等水平。' },
          { name: '声线', score: 4, maxScore: 6, comment: '声音条件一般，略显单薄，但不影响长时间收听。耐久度尚可。' },
        ],
      },
      {
        dimensionId: 9,
        name: '产品学习表达能力',
        weight: 0.12,
        weightedScore: 9.0,
        maxScore: 12.0,
        subItems: [
          { name: '产品学习能力', score: 4, maxScore: 5, comment: '核心信息完整覆盖，关键内容无遗漏、无错误。重点抓得准。' },
          { name: '产品表达能力', score: 5, maxScore: 7, comment: '能把产品讲得明白易懂，大部分时间能在通俗和专业之间找到平衡。' },
        ],
      },
      {
        dimensionId: 10,
        name: '话术天赋',
        weight: 0.18,
        weightedScore: 14.4,
        maxScore: 18.0,
        subItems: [
          { name: '开播留人话术', score: 2, maxScore: 3, comment: '开场能抓住路人注意力，把产品卖点和粉丝利益挂钩，话术有冲击力。' },
          { name: '内容叙述话术', score: 3, maxScore: 3, comment: '能将产品卖点包装成生活场景，有共鸣代入感，叙述自然不生硬。' },
          { name: '互动控场话术', score: 2, maxScore: 3, comment: '能自然回应弹幕提问，把粉丝留言融入讲解素材，互动感较好。' },
          { name: '信任背书话术', score: 3, maxScore: 3, comment: '使用亲身体验和选品标准建立信任，专业背书能力强。' },
          { name: '商业转化话术', score: 2, maxScore: 3, comment: '能通过价格锚定和限时限量制造紧迫感，算账式说服有一定效果。' },
          { name: '下拨沉淀话术', score: 2, maxScore: 3, comment: '结束时有引导关注和预告下场的意识，话术还需打磨得更自然。' },
        ],
      },
    ],
    generalTags: [
      { name: '体力体能', value: '预计可持续上播 3 小时', comment: '视频面试过程中精力保持良好' },
      { name: '语言能力', value: '普通话二级甲等', comment: null },
      { name: '技能特长', value: '美妆', comment: '具备基础美妆技能' },
    ],
    industryAdvantages: [
      { name: '美妆个护', matchLevel: 'HIGH', comment: '妆容精致，气质与美妆类目高度匹配' },
      { name: '服饰鞋包', matchLevel: 'MEDIUM', comment: '气质条件适合服饰展示' },
      { name: '3C数码', matchLevel: 'LOW', comment: '缺乏 3C 类目相关经验' },
      { name: '零食食品', matchLevel: 'MEDIUM', comment: '亲和力适合食品类目' },
      { name: '生活百货', matchLevel: 'MEDIUM', comment: '亲和力足，适合生活好物分享' },
      { name: '女装', matchLevel: 'MEDIUM', comment: '身材条件适合女装展示' },
    ],
    overallComment: `该候选人综合素质良好，外貌和气质条件出众，镜前表现自然放松，具备较好的产品学习和表达能力。口音方面声线略显单薄，可通过发声训练进一步提升。话术天赋各子项均展现出可培养的潜力，商业转化话术有亮点。综合评级 A 级，建议进入下一轮面试或安排试播考核。`,
  };
}

// ============================================================
// Gemini API 调用
// ============================================================

interface FileInfo {
  path: string;
  mimetype: string;
  originalname: string;
}

export async function evaluateWithGemini(
  fileInfos: FileInfo[],
  candidateName: string,
): Promise<EvaluationResult> {
  if (config.mockMode) {
    console.log('[Gemini] MOCK_MODE=true，返回模拟评估结果');
    // 模拟 2-3 秒的 API 延迟
    await new Promise(resolve => setTimeout(resolve, 2500));
    return generateMockResult(candidateName);
  }

  const genAI = new GoogleGenerativeAI(config.geminiApiKey);
  const model = genAI.getGenerativeModel({ model: config.geminiModel });

  // 构造文件 parts
  const fileParts: Array<{ inlineData: { mimeType: string; data: string } }> = [];
  for (const fileInfo of fileInfos) {
    const fileData = fs.readFileSync(fileInfo.path);
    const base64Data = fileData.toString('base64');

    fileParts.push({
      inlineData: {
        mimeType: fileInfo.mimetype,
        data: base64Data,
      },
    });
  }

  const prompt = buildPrompt(candidateName);
  const parts = [...fileParts, { text: prompt } as const];

  console.log(`[Gemini] 开始调用 API，模型: ${config.geminiModel}，文件数: ${fileInfos.length}`);
  const startTime = Date.now();

  let responseText = '';
  try {
    const result = await model.generateContent({
      contents: [{ role: 'user', parts: parts as any }],
    });
    responseText = result.response.text();
  } catch (err: any) {
    console.error('[Gemini] API 调用失败:', err.message);
    throw err;
  }

  const elapsed = Date.now() - startTime;
  console.log(`[Gemini] API 响应完成，耗时: ${elapsed}ms`);

  // 清洗响应文本，移除可能的 markdown 代码块标记
  let cleaned = responseText.trim();
  if (cleaned.startsWith('```json')) {
    cleaned = cleaned.slice(7);
  } else if (cleaned.startsWith('```')) {
    cleaned = cleaned.slice(3);
  }
  if (cleaned.endsWith('```')) {
    cleaned = cleaned.slice(0, -3);
  }
  cleaned = cleaned.trim();

  try {
    return JSON.parse(cleaned) as EvaluationResult;
  } catch (parseErr: any) {
    console.error('[Gemini] JSON 解析失败，原始响应:', cleaned.substring(0, 500));
    throw new Error(`Gemini 返回格式异常：${parseErr.message}`);
  }
}
