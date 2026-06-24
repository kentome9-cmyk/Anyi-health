import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getPromptByType, replacePromptVariables } from '@/lib/prompt';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { 
      identityId, 
      storeId,
      accountStage,
      contentDirection,
      decisionStage,
      topicCount
    } = body;

    // 获取创作者身份
    let identity = null;
    if (identityId) {
      identity = await prisma.creatorIdentity.findUnique({
        where: { id: identityId },
      });
    }
    if (!identity && storeId) {
      identity = await prisma.creatorIdentity.findUnique({
        where: { storeId },
      });
    }

    if (!identity) {
      return NextResponse.json(
        { topics: [], error: '请先设置创作者身份' },
        { status: 400 }
      );
    }

    // 获取 AI 配置
    const settings = await prisma.aiSettings.findFirst({
      where: {},
      orderBy: { createdAt: 'desc' },
    });

    if (!settings?.apiKey || !settings?.baseUrl || !settings?.modelId) {
      return NextResponse.json(
        { topics: [], error: 'AI 未配置，请在管理端设置 API Key、Base URL 和 Model ID' },
        { status: 500 }
      );
    }

    const apiUrl = `${settings.baseUrl.replace(/\/$/, '')}/chat/completions`;

    // 获取该门店历史选题标题（用于去重）
    const existingTopics = await prisma.scriptRecord.findMany({
      where: { storeId },
      select: { topicTitle: true },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
    const existingTopicTitles = existingTopics
      .map(t => t.topicTitle)
      .filter((t): t is string => !!t && t.trim() !== '');
    console.log('[AI Topics] 历史选题数量:', existingTopicTitles.length);

    // 从 Prompt 表获取选题策划提示词（类型为 "topic"）
    const topicPromptTemplate = await getPromptByType('topic');
    console.log('[AI Topics] 原始提示词模板:', topicPromptTemplate);

    // 替换提示词中的占位符
    const variables: Record<string, string> = {
      accountStage: accountStage || '不限',
      contentDirection: contentDirection || '不限',
      decisionStage: decisionStage || '不限',
      topicCount: String(topicCount || 10),
      contentTrack: identity.contentTrack,
      personaStyle: identity.personaStyle,
      targetAudience: identity.targetAudience,
    };

    // 使用配置的提示词或默认提示词
    let effectiveSystemPrompt: string;
    if (topicPromptTemplate) {
      effectiveSystemPrompt = replacePromptVariables(topicPromptTemplate, variables);
    } else {
      effectiveSystemPrompt = getDefaultPrompt();
    }
    console.log('[AI Topics] 替换后的 System Prompt:', effectiveSystemPrompt);

    // 构建用户提示词
    const userPrompt = buildUserPrompt({
      contentTrack: identity.contentTrack,
      personaStyle: identity.personaStyle,
      targetAudience: identity.targetAudience,
      videoTone: identity.videoTone,
      videoDuration: identity.videoDuration,
      accountStage,
      contentDirection,
      decisionStage,
      topicCount,
      existingTopicTitles,
    });
    console.log('[AI Topics] 构建的 User Prompt:', userPrompt);

    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${settings.apiKey}`,
      },
      body: JSON.stringify({
        model: settings.modelId,
        messages: [
          { role: 'system', content: effectiveSystemPrompt },
          { role: 'user', content: userPrompt },
        ],
        temperature: 0.8,
      }),
    });

    if (!response.ok) {
      throw new Error(`AI API error: ${response.status}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || '';
    const reasoning = data.choices?.[0]?.message?.reasoning || data.choices?.[0]?.reasoning || '';
    console.log('[AI Topics] AI 思考过程:', reasoning);
    console.log('[AI Topics] AI 原始回复:', content);

    let topics = parseTopicsFromContent(content, topicCount || 10);

    if (!Array.isArray(topics) || topics.length === 0) {
      topics = getFallbackTopics(identity.contentTrack, topicCount || 10);
    }

    return NextResponse.json({ topics });
  } catch (error) {
    console.error('Generate topics error:', error);
    return NextResponse.json(
      { topics: [], error: '生成选题失败' },
      { status: 500 }
    );
  }
}

function buildUserPrompt(params: {
  contentTrack: string;
  personaStyle: string;
  targetAudience: string;
  videoTone?: string | null;
  videoDuration?: string | null;
  accountStage?: string;
  contentDirection?: string;
  decisionStage?: string;
  topicCount?: number;
  existingTopicTitles?: string[];
}): string {
  const { topicCount, existingTopicTitles } = params;

  const duplicationWarning = existingTopicTitles && existingTopicTitles.length > 0
    ? `\n\n【重要】以下选题标题已生成过，请勿重复：\n${existingTopicTitles.slice(0, 30).join('、')}${existingTopicTitles.length > 30 ? '...' : ''}`
    : '';

  return `请根据上述账号定位和选题需求，生成${topicCount || 10}个精准匹配的短视频选题。直接返回JSON数组，不要包含其他文字说明。${duplicationWarning}`;
}

function getDefaultPrompt(): string {
  return `你是一位资深的选题策划师，拥有多年的内容策划经验，深谙不同平台的流量密码和用户心理。你能够根据账号定位、目标用户、行业趋势，为创作者策划系统的选题方案。你的选题既有爆款潜力，又有持续价值。

## 核心能力
1. 教知识（涨粉核心）：解题型、揭秘型、推荐型
2. 聊观点（立人设）：归纳型、反常识型、对立型
3. 讲故事（信任加速）：成就故事、客户故事、踩坑故事
4. 晒过程（变现前置）：挑战型、体验型、测评改造型

## 执行技巧
- 每条内容只解决一个问题
- 结尾必须有明确建议和站位
- 先讲风险痛点，再给价值方案

请严格贴合账号定位，生成精准匹配的选题。返回JSON数组格式。`;
}

function parseTopicsFromContent(content: string, count: number): any[] {
  // 标准化字段名（支持中英文）
  function normalizeTopic(topic: any): any {
    return {
      title: topic.title || topic.选题标题 || topic.标题 || topic.topic || '',
      summary: topic.summary || topic.内容框架 || topic.框架 || topic.description || '',
      angle: topic.angle || topic.角度 || topic.type || '',
    };
  }

  // 方法1：尝试从代码块中提取 JSON
  const codeBlockMatch = content.match(/```(?:json)?\s*(\[[\s\S]*?\])\s*```/);
  if (codeBlockMatch) {
    try {
      const parsed = JSON.parse(codeBlockMatch[1]);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed.map(normalizeTopic).filter(t => t.title).slice(0, count);
      }
    } catch (e) {
      // JSON 解析失败，继续尝试其他方法
    }
  }

  // 方法2：直接匹配 JSON 数组
  const jsonMatch = content.match(/\[\s*\{[\s\S]*?\}\s*\]/);
  if (jsonMatch) {
    try {
      const parsed = JSON.parse(jsonMatch[0]);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed.map(normalizeTopic).filter(t => t.title).slice(0, count);
      }
    } catch (e) {
      // JSON 解析失败
    }
  }

  // 方法3：逐行解析
  const lines = content.split('\n').filter(line => {
    const trimmed = line.trim();
    return trimmed && !trimmed.startsWith('#') && !trimmed.startsWith('```') && trimmed.length > 5;
  });

  const topics = [];
  for (const line of lines.slice(0, count * 2)) {
    const titleMatch = line.match(/[""']?(?:title|选题标题|标题|topic)[/""]?\s*[:：]\s*[""']?([^"'""\n,}]+)/i);
    if (titleMatch) {
      topics.push({
        title: titleMatch[1].trim().slice(0, 50) || `选题${topics.length + 1}`,
        summary: 'AI 生成选题',
        angle: '参考标题',
      });
    }
  }

  // 方法4：如果还是没解析出来，使用行号格式
  if (topics.length === 0) {
    for (let i = 0; i < lines.length && topics.length < count; i++) {
      const line = lines[i].replace(/^\d+[.、:：]\s*/, '').trim();
      if (line.length > 3 && line.length < 100) {
        topics.push({
          title: line,
          summary: 'AI 生成选题',
          angle: '参考标题',
        });
      }
    }
  }

  return topics.slice(0, count);
}

function getFallbackTopics(track: string, count: number): any[] {
  const templates = [
    { title: `${track}入门指南`, summary: '面向新手的基础知识科普', angle: '以小白视角切入，降低理解门槛' },
    { title: `${track}常见误区解析`, summary: '盘点常见错误认知', angle: '反常识切入，引发关注' },
    { title: `${track}效果展示`, summary: '真实案例效果展示', angle: '以结果导向，激发用户兴趣' },
    { title: `${track}vs竞品对比`, summary: '深度对比分析', angle: '差异化定位，建立专业形象' },
    { title: `${track}常见问题解答`, summary: '高频问题汇总', angle: '实用导向，降低用户决策成本' },
    { title: `${track}注意事项盘点`, summary: '避坑指南', angle: '风险提示，增强信任' },
    { title: `客户真实案例分享`, summary: '前后对比效果', angle: '真实可信，促进转化' },
    { title: `${track}适合人群分析`, summary: '精准匹配用户', angle: '降低门槛，扩大受众' },
    { title: `${track}行业内幕揭秘`, summary: '从业者视角分享', angle: '稀缺性内容，提升关注' },
    { title: `${track}趋势预测`, summary: '未来发展方向', angle: '专业前瞻，建立权威' },
  ];
  return templates.slice(0, count);
}
