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
    console.log('[AI Content] 原始模板 Prompt:', finalPrompt);
    
    // 替换变量占位符
    const variables: Record<string, string> = {
      '{contentTrack}': identity.contentTrack || '',
      '{personaStyle}': identity.personaStyle || '',
      '{targetAudience}': identity.targetAudience || '',
      '{contentType}': '口播类', // 默认口播类
    };

    // 根据类型添加对应的变量
    if (type === 'rewrite') {
      // 改写场景：使用原始文案和改写要求
      variables['{rawScript}'] = sourceContent || '';
      variables['{rewriteRequirements}'] = ''; // 可根据需要从前端传入
    } else {
      // 原创场景：使用选题信息
      variables['{topic}'] = topic || summary || '';
      variables['{summary}'] = summary || '';
      variables['{angle}'] = angle || '';
      variables['{supplementary}'] = corePoints || '';
    }

    Object.entries(variables).forEach(([key, value]) => {
      finalPrompt = finalPrompt.replace(new RegExp(key.replace(/[{}]/g, '\\$&'), 'g'), value);
    });
    console.log('[AI Content] 替换后的 System Prompt:', finalPrompt);

    // 构建系统提示词
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
    const reasoning = data.choices?.[0]?.message?.reasoning || data.choices?.[0]?.reasoning || '';
    console.log('[AI Content] AI 思考过程:', reasoning);
    console.log('[AI Content] AI 原始回复:', content);

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
