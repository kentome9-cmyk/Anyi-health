import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getOpenAIConfig } from '@/lib/openai';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { query, storeId } = body;

    if (!query || query.trim().length === 0) {
      return NextResponse.json({ error: '请输入问题' }, { status: 400 });
    }

    // 获取所有启用的问答数据
    const qaItems = await prisma.qaItem.findMany({
      where: { isActive: true },
      include: {
        role: {
          select: { name: true, systemPrompt: true },
        },
      },
    });

    if (qaItems.length === 0) {
      return NextResponse.json({
        answer: '暂无问答数据，请联系管理员添加。',
        related: [],
      });
    }

    // 获取 AI 配置
    const config = await getOpenAIConfig();
    if (!config) {
      return NextResponse.json({ error: 'AI 未配置' }, { status: 500 });
    }

    // 构建知识库上下文
    const knowledgeContext = qaItems
      .map(item => `Q: ${item.question}\nA: ${item.answer}`)
      .join('\n\n');

    // 调用 AI 进行匹配
    const apiUrl = `${config.baseUrl.replace(/\/$/, '')}/chat/completions`;
    const messages: { role: 'system' | 'user'; content: string }[] = [];

    // 系统提示词
    messages.push({
      role: 'system',
      content: `你是一个专业的问答助手。根据提供的知识库内容，回答用户的问题。

知识库：
${knowledgeContext}

规则：
1. 如果知识库中有相关内容，请基于知识库回答
2. 如果没有相关内容，请说"抱歉，我没有找到相关的答案，建议您联系客服咨询"
3. 回答要简洁、专业
4. 只根据知识库内容回答，不要编造答案`,
    });

    messages.push({
      role: 'user',
      content: query,
    });

    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${config.apiKey}`,
      },
      body: JSON.stringify({
        model: config.modelId,
        messages,
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      throw new Error(`AI API error: ${response.status}`);
    }

    const data = await response.json();
    const answer = data.choices?.[0]?.message?.content || '';

    // 查找相关问答（简单的关键词匹配）
    const related = qaItems
      .filter(item => {
        const lowerQuery = query.toLowerCase();
        return (
          item.question.toLowerCase().includes(lowerQuery) ||
          item.keywords?.toLowerCase().includes(lowerQuery)
        );
      })
      .slice(0, 3)
      .map(item => ({
        id: item.id,
        question: item.question,
        answer: item.answer,
      }));

    return NextResponse.json({
      answer,
      related,
    });
  } catch (error) {
    console.error('QA search error:', error);
    return NextResponse.json(
      { error: '查询失败' },
      { status: 500 }
    );
  }
}
