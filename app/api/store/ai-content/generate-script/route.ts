import { NextResponse } from 'next/server';
import { getOpenAIConfig } from '@/lib/openai';
import { logError, logDebug } from '@/lib/logger';

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
      direction,
      subCategory,
    } = body;

    if (!identity || !identity.contentTrack || !identity.personaStyle || !identity.targetAudience) {
      return NextResponse.json(
        { content: '', error: '创作者身份不完整' },
        { status: 400 }
      );
    }

    const config = await getOpenAIConfig('content');
    if (!config) {
      return NextResponse.json(
        { content: '', error: 'AI 未配置' },
        { status: 500 }
      );
    }

    const apiUrl = `${config.baseUrl.replace(/\/$/, '')}/chat/completions`;

    let finalPrompt = templatePrompt || '';
    
    const variables: Record<string, string> = {
      '{contentTrack}': identity.contentTrack || '',
      '{personaStyle}': identity.personaStyle || '',
      '{targetAudience}': identity.targetAudience || '',
      '{contentType}': '口播类',
    };

    if (type === 'rewrite') {
      variables['{rawScript}'] = sourceContent || '';
      variables['{rewriteRequirements}'] = '';
    } else {
      variables['{topic}'] = topic || summary || '';
      variables['{summary}'] = summary || '';
      variables['{angle}'] = angle || '';
      variables['{supplementary}'] = corePoints || '';
    }

    Object.entries(variables).forEach(([key, value]) => {
      finalPrompt = finalPrompt.replace(new RegExp(key.replace(/[{}]/g, '\\$&'), 'g'), value);
    });

    let formatInstruction = '';
    if (type === 'rewrite') {
      formatInstruction = '\n\n【重要】请直接返回JSON格式，不要使用Markdown代码块包裹。JSON格式：{"titleSuggestion":"推荐标题","rewrittenScript":"改写后的口播文案","shootingTips":["要点1","要点2"],"hashtags":["#标签1"]}';
    } else {
      formatInstruction = '\n\n【重要】请直接返回JSON格式，不要使用Markdown代码块包裹。JSON格式：{"titleSuggestion":"推荐标题","script":"口播文案","shootingTips":["要点1","要点2"],"hashtags":["#标签1"]}';
    }
    const systemPrompt = finalPrompt + formatInstruction;

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
        ],
        temperature: 0.75,
      }),
    });

    if (!response.ok) {
      throw new Error(`AI API error: ${response.status}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || '';
    
    logDebug(`[AI Content] Generated script for type: ${type}`);

    return NextResponse.json({
      success: true,
      content,
      type,
      template: templateName || '',
    });
  } catch (error) {
    logError('Generate script error', error);
    return NextResponse.json(
      { content: '', error: '生成脚本失败' },
      { status: 500 }
    );
  }
}
