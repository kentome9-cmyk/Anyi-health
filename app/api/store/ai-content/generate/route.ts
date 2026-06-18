import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getOpenAIConfig } from '@/lib/openai';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { templateId, variables, messages, systemPrompt, storeId } = body;

    // 获取模板信息
    const template = await prisma.contentTemplate.findUnique({
      where: { id: templateId },
      include: {
        role: {
          select: { name: true, systemPrompt: true },
        },
      },
    });

    if (!template) {
      return NextResponse.json({ error: '模板不存在' }, { status: 404 });
    }

    // 获取 AI 配置
    const config = await getOpenAIConfig();
    if (!config) {
      return NextResponse.json({ error: 'AI 未配置' }, { status: 500 });
    }

    const apiUrl = `${config.baseUrl.replace(/\/$/, '')}/chat/completions`;

    // 对话模式：传递了 messages 数组
    if (messages && Array.isArray(messages)) {
      // 构建系统提示词
      const finalSystemPrompt = systemPrompt || [
        template.role?.systemPrompt || '',
        template.prompt || '',
        template.exampleOutput ? `\n参考示例：\n${template.exampleOutput}` : '',
      ].filter(Boolean).join('\n\n');

      const allMessages = [
        { role: 'system' as const, content: finalSystemPrompt },
        ...messages,
      ];

      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${config.apiKey}`,
        },
        body: JSON.stringify({
          model: config.modelId,
          messages: allMessages,
          temperature: 0.7,
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
        reply: content,
        template: {
          id: template.id,
          name: template.name,
        },
        role: template.role?.name || '',
      });
    }

    // 变量模式：替换变量生成
    let prompt = template.prompt || '';
    if (variables) {
      Object.entries(variables).forEach(([key, value]) => {
        prompt = prompt.replace(new RegExp(`{{${key}}}`, 'g'), value as string);
      });
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
          ...(template.role?.systemPrompt ? [{ role: 'system', content: template.role.systemPrompt }] : []),
          { role: 'user', content: prompt },
        ],
        temperature: 0.7,
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
      template: {
        id: template.id,
        name: template.name,
      },
      role: template.role?.name || '',
    });
  } catch (error) {
    console.error('Generate content error:', error);
    return NextResponse.json(
      { error: '生成内容失败' },
      { status: 500 }
    );
  }
}
