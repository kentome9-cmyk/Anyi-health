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

    // 如果有模板内容，进行变量替换
    let finalPrompt = templatePrompt || '';
    
    // 替换变量占位符
    const variables: Record<string, string> = {
      '{contentTrack}': identity.contentTrack || '',
      '{personaStyle}': identity.personaStyle || '',
      '{targetAudience}': identity.targetAudience || '',
      '{contentType}': '口播类', // 默认口播类
      '{topic}': topic || summary || '',
      '{summary}': summary || '',
      '{angle}': angle || '',
      '{supplementary}': corePoints || '',
    };

    Object.entries(variables).forEach(([key, value]) => {
      finalPrompt = finalPrompt.replace(new RegExp(key.replace(/[{}]/g, '\\$&'), 'g'), value);
    });

    // 构建系统提示词
    const systemPrompt = finalPrompt;

    let userPrompt = '';

    if (type === 'original') {
      userPrompt = `请基于以下选题信息创作短视频脚本：

选题标题：${topic || '未提供'}
内容摘要：${summary || '未提供'}
切入角度：${angle || '未提供'}
补充说明：${corePoints || '无'}

请严格按照上述选题信息，创作高质量的短视频脚本。`;
    } else {
      userPrompt = `请将以下外网文案改写为符合账号人设的短视频脚本：

原始文案：
${sourceContent || '未提供'}

请将原文案改写为符合账号赛道、人设风格的专属脚本，保持核心信息，进行身份适配改写。`;
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
