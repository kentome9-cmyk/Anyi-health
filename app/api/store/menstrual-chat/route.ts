import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getPromptByType } from '@/lib/prompt';
import { searchMenstrualKnowledgeByEmbedding, formatMenstrualKnowledgeContext, getOpenAIConfig } from '@/lib/openai';

const DEFAULT_SYSTEM_PROMPT =
  '你是一名专业的健康养生产品销售顾问。请根据用户的问题，结合提供的产品知识库和调理方案库，给出专业的建议。推荐产品时必须严格从知识库中选择，绝对不能自行创造任何不存在的产品。';

async function getSystemPrompt(): Promise<string> {
  try {
    const prompt = await getPromptByType('menstrual');
    if (prompt) {
      console.log('[Menstrual-Chat] 使用月经助手提示词');
      return prompt;
    }
    console.log('[Menstrual-Chat] 未找到月经助手提示词，使用默认提示词');
    return DEFAULT_SYSTEM_PROMPT;
  } catch (error) {
    console.error('[Menstrual-Chat] 获取提示词失败:', error);
    return DEFAULT_SYSTEM_PROMPT;
  }
}

type ChatMessage = {
  role: string;
  content: string;
};

export async function POST(request: Request) {
  try {
    const storeId = request.headers.get('x-store-id');
    if (!storeId) {
      return NextResponse.json({ error: '缺少门店ID' }, { status: 401 });
    }

    const body = await request.json();
    const { message, sessionId, stream } = body;

    if (!message || typeof message !== 'string') {
      return NextResponse.json(
        { error: '请输入问题' },
        { status: 400 }
      );
    }

    let targetSessionId = sessionId;
    
    if (!targetSessionId) {
      const newSession = await prisma.menstrualChatSession.create({
        data: {
          storeId,
          title: message.slice(0, 50) || '新对话',
          messageCount: 0,
        },
      });
      targetSessionId = newSession.id;
    }

    await prisma.menstrualChatMessage.create({
      data: {
        sessionId: targetSessionId,
        role: 'user',
        content: message,
      },
    });

    await prisma.menstrualChatSession.update({
      where: { id: targetSessionId },
      data: {
        messageCount: { increment: 1 },
        updatedAt: new Date(),
        title: {
          set: message.slice(0, 50) || '新对话',
        },
      },
    });

    if (stream) {
      return createStreamResponse(message, targetSessionId, storeId);
    }

    const reply = await generateAIReply(message);

    await prisma.menstrualChatMessage.create({
      data: {
        sessionId: targetSessionId,
        role: 'assistant',
        content: reply,
      },
    });

    await prisma.menstrualChatSession.update({
      where: { id: targetSessionId },
      data: {
        messageCount: { increment: 1 },
        updatedAt: new Date(),
      },
    });

    return NextResponse.json({
      content: reply,
      sessionId: targetSessionId,
      success: true,
    });
  } catch (error) {
    console.error('Menstrual AI chat error:', error);
    return NextResponse.json(
      { error: 'AI回答失败，请稍后重试' },
      { status: 500 }
    );
  }
}

async function createStreamResponse(message: string, sessionId: string, storeId: string) {
  const encoder = new TextEncoder();

  const readable = new ReadableStream({
    async start(controller) {
      let fullReply = '';
      let fullReasoning = '';

      const send = (event: unknown) => {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(event)}\n\n`));
      };

      try {
        const systemPrompt = await getSystemPrompt();
        const knowledgeContext = await getKnowledgeContext(message);

        const messages: ChatMessage[] = [
          { role: 'system', content: systemPrompt + (knowledgeContext ? '\n\n' + knowledgeContext : '') },
          { role: 'user', content: message },
        ];

        const aiSettings = await getOpenAIConfig('default');
        if (!aiSettings || !aiSettings.baseUrl || !aiSettings.modelId) {
          send({ error: 'AI 未配置' });
          controller.close();
          return;
        }

        const apiUrl = `${aiSettings.baseUrl.replace(/\/$/, '')}/chat/completions`;

        const response = await fetch(apiUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${aiSettings.apiKey}`,
          },
          body: JSON.stringify({
            model: aiSettings.modelId,
            messages,
            stream: true,
          }),
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          send({ error: errorData.error?.message || 'API 请求失败' });
          controller.close();
          return;
        }

        const reader = response.body?.getReader();
        if (!reader) {
          send({ error: '无法读取响应' });
          controller.close();
          return;
        }

        const decoder = new TextDecoder();
        let buffer = '';

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const events = buffer.split('\n\n');
          buffer = events.pop() || '';

          for (const event of events) {
            const lines = event
              .split('\n')
              .map((line) => line.trim())
              .filter((line) => line.startsWith('data:'));

            for (const line of lines) {
              const data = line.replace(/^data:\s*/, '');
              if (!data || data === '[DONE]') continue;

              try {
                const parsed = JSON.parse(data);
                const content = parsed.choices?.[0]?.delta?.content || '';
                const reasoning = parsed.choices?.[0]?.delta?.reasoning || 
                                 parsed.choices?.[0]?.reasoning || '';
                
                if (content) {
                  fullReply += content;
                  send({ content, reasoning: '', done: false });
                }
                if (reasoning) {
                  fullReasoning += reasoning;
                  send({ content: '', reasoning, done: false });
                }
              } catch {
                // 忽略解析错误
              }
            }
          }
        }

        send({ done: true, content: fullReply, reasoning: fullReasoning });

        try {
          await prisma.menstrualChatMessage.create({
            data: {
              sessionId,
              role: 'assistant',
              content: fullReply,
            },
          });

          await prisma.menstrualChatSession.update({
            where: { id: sessionId },
            data: {
              messageCount: { increment: 1 },
              updatedAt: new Date(),
            },
          });
        } catch (saveError) {
          console.error('[Menstrual-Chat] 保存消息失败:', saveError);
        }
      } catch (error) {
        console.error('Stream error:', error);
        send({ error: '生成失败' });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(readable, {
    headers: {
      'Content-Type': 'text/event-stream; charset=utf-8',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
    },
  });
}

async function getKnowledgeContext(userMessage: string): Promise<string> {
  try {
    const matches = await searchMenstrualKnowledgeByEmbedding(userMessage, 'default', 5, 0.5);
    if (matches.length > 0) {
      console.log(`[Menstrual-Chat] 向量检索找到 ${matches.length} 条相关知识`);
      return formatMenstrualKnowledgeContext(matches);
    }
    return '';
  } catch (error) {
    console.error('[Menstrual-Chat] 知识检索失败:', error);
    return '';
  }
}

async function generateAIReply(message: string): Promise<string> {
  const systemPrompt = await getSystemPrompt();
  const knowledgeContext = await getKnowledgeContext(message);

  const messages: ChatMessage[] = [
    { role: 'system', content: systemPrompt + (knowledgeContext ? '\n\n' + knowledgeContext : '') },
    { role: 'user', content: message },
  ];

  const aiSettings = await getOpenAIConfig('default');
  if (!aiSettings || !aiSettings.baseUrl || !aiSettings.modelId) {
    throw new Error('AI 未配置');
  }

  const apiUrl = `${aiSettings.baseUrl.replace(/\/$/, '')}/chat/completions`;

  const response = await fetch(apiUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${aiSettings.apiKey}`,
    },
    body: JSON.stringify({
      model: aiSettings.modelId,
      messages,
      stream: false,
    }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error?.message || 'API 请求失败');
  }

  const data = await response.json();
  return data.choices?.[0]?.message?.content || '抱歉，暂时无法回答您的问题。';
}
