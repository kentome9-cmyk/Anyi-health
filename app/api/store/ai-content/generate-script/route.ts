import { NextResponse } from 'next/server';
import { getOpenAIConfig } from '@/lib/openai';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      type,
      topic,
      summary,
      angle,
      corePoints,
      sourceContent,
      templateId,
      templateName,
      templatePrompt,
      identity,
    } = body;

    if (!identity || !identity.contentTrack || !identity.personaStyle || !identity.targetAudience) {
      return NextResponse.json(
        { content: '', error: '创作者身份不完整' },
        { status: 400 }
      );
    }

    const config = await getOpenAIConfig();
    if (!config) {
      return NextResponse.json(
        { content: '', error: 'AI 未配置' },
        { status: 500 }
      );
    }

    const apiUrl = `${config.baseUrl.replace(/\/$/, '')}/chat/completions`;

    const systemPrompt = `你是一位专业的短视频脚本创作专家。你将根据创作者身份为核心约束，严格贴合账号赛道、人设、内容调性，生成符合要求的短视频脚本。

创作者身份（核心约束，必须遵守）：
- 内容赛道：${identity.contentTrack}
- 人设风格：${identity.personaStyle}
- 目标受众：${identity.targetAudience}
${identity.videoTone ? `- 视频调性：${identity.videoTone}` : ''}
${identity.videoDuration ? `- 视频时长：${identity.videoDuration}` : ''}

创作原则：
1. 绝对遵守创作者身份约束，绝不脱离账号赛道
2. 所有内容必须符合人设风格，保持账号统一调性
3. 内容必须是目标受众真正关心的问题
4. 语言口语化，符合短视频特点，开头3秒必须抓住注意力
5. 脚本结构清晰：开场-核心内容-结尾引导

输出格式要求：
请以结构化方式输出，不使用Markdown或JSON格式，按以下结构输出：

━━━━━━━━━━━━━━━━━━━━━━━━━━

【脚本标题】简洁有力的标题
【视频时长】约60-90秒

【开场钩子（0-8秒）】— 直接抛出痛点/问题/好奇点
（此处写开场文案内容）

【核心内容（8-60秒）】
分点清晰，每一点要言之有物，有具体信息

【结尾引导（60-90秒）】
引导互动、关注、点赞

━━━━━━━━━━━━━━━━━━━━━━━━━━

请务必保持专业，逻辑清晰，内容要有价值。`;

    let userPrompt = '';

    if (type === 'original') {
      userPrompt = `请基于以下信息，为我创作一篇原创短视频脚本：

选题信息：
- 选题标题：${topic || '未提供'}
${summary ? `- 选题摘要：${summary}` : ''}
${angle ? `- 切入角度：${angle}` : ''}

模板要求：${templatePrompt || templateName || '口播短视频脚本'}
${corePoints ? `\n核心观点/创作侧重：\n${corePoints}` : ''}

请严格贴合上述创作者身份约束，创作符合要求的原创脚本。`;
    } else {
      userPrompt = `请基于以下信息，将外网文案改写为符合创作者身份的专属短视频脚本：

原始文案内容：
${sourceContent || '未提供'}

模板要求：${templatePrompt || templateName || '口播短视频脚本'}

请将上述外网文案改写为符合创作者身份的专属脚本，保持核心信息不变，但风格、口吻、角度、语言必须贴合账号赛道、人设、受众、调性。严禁直接照搬原文，需要进行身份适配改写。`;
    }

    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${config.apiKey}`,
      },
      body: JSON.stringify({
        model: config.modelId,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        temperature: 0.75,
      }),
    });

    if (!response.ok) {
      throw new Error(`AI API error: ${response.status}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || '';

    return NextResponse.json({
      success: true,
      content,
      type,
      template: templateName || '',
    });
  } catch (error) {
    console.error('Generate script error:', error);
    return NextResponse.json(
      { content: '', error: '生成脚本失败' },
      { status: 500 }
    );
  }
}
