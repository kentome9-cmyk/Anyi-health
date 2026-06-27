import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getPromptByType } from '@/lib/prompt';
import { searchKnowledgeByEmbedding, formatKnowledgeContext } from '@/lib/openai';

const DEFAULT_SYSTEM_PROMPT =
  '你是一名产后康复健康管理顾问。请严格根据用户输入和后台配置的提示词回答，不要额外增加未被要求的固定章节或项目推荐。';

type ChatMessage = {
  role: string;
  content: string;
};

interface AIRequestConfig {
  apiUrl: string;
  apiKey: string;
  modelId: string;
  messages: any[];
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { customerId, storeId, messages, reportContent, stream, promptType } = body;
    const type = promptType || 'plan';

    if (!customerId || !messages || messages.length === 0) {
      return NextResponse.json(
        { error: '缺少必要参数' },
        { status: 400 }
      );
    }

    if (stream) {
      return createStreamResponse({ customerId, storeId, messages, reportContent, type });
    }

    const reply = await generateAIReply(messages, type);

    if (storeId) {
      await prisma.aiAnalysis.create({
        data: {
          storeId,
          customerId,
          content: reply,
          reportContent: reportContent || messages[messages.length - 1]?.content || '',
        },
      });
    }

    return NextResponse.json({
      reply,
      customerId,
      success: true,
    });
  } catch (error) {
    console.error('AI chat error:', error);
    return NextResponse.json(
      { error: 'AI分析失败，请稍后重试' },
      { status: 500 }
    );
  }
}

async function createStreamResponse({
  customerId,
  storeId,
  messages,
  reportContent,
  type = 'plan',
}: {
  customerId: string;
  storeId?: string;
  messages: Array<{ role: string; content: string }>;
  reportContent?: string;
  type?: string;
}) {
  const encoder = new TextEncoder();

  const readable = new ReadableStream({
    async start(controller) {
      let fullReply = '';

      const send = (event: unknown) => {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(event)}\n\n`));
      };

      try {
        for await (const delta of streamAIReply(messages, type)) {
          fullReply += delta;
          send({ delta });
        }

        if (storeId && fullReply.trim()) {
          try {
            await prisma.aiAnalysis.create({
              data: {
                storeId,
                customerId,
                content: fullReply,
                reportContent: reportContent || messages[messages.length - 1]?.content || '',
              },
            });
          } catch (error) {
            console.error('Save AI analysis record failed:', error);
          }
        }

        send({ done: true });
      } catch (error) {
        console.error('AI stream error:', error);
        send({ error: 'AI stream failed' });
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

function buildProviderMessages(systemPrompt: string | null | undefined, messages: ChatMessage[], knowledgeContext?: string) {
  let systemContent = systemPrompt?.trim() || DEFAULT_SYSTEM_PROMPT;
  
  if (knowledgeContext) {
    systemContent = `${systemContent}\n\n${knowledgeContext}`;
  }

  return [
    {
      role: 'system',
      content: systemContent,
    },
    ...messages.map((message) => ({
      role: message.role === 'ai' ? 'assistant' : message.role,
      content: message.content,
    })),
  ];
}

async function getAnalysisPrompt(type: string = 'plan'): Promise<string> {
  const prompt = await getPromptByType(type);
  return prompt || DEFAULT_SYSTEM_PROMPT;
}

async function getKnowledgeContext(userMessage: string): Promise<string> {
  try {
    const matches = await searchKnowledgeByEmbedding(userMessage, 'default', 5, 0.5);
    return matches.length > 0 ? formatKnowledgeContext(matches) : '';
  } catch {
    return '';
  }
}

async function buildAIRequest(messages: ChatMessage[], type: string): Promise<AIRequestConfig | null> {
  const settings = await prisma.aiSettings.findFirst({
    orderBy: { createdAt: 'desc' },
  });

  if (!settings?.apiKey || !settings?.baseUrl || !settings?.modelId) {
    return null;
  }

  const apiUrl = `${settings.baseUrl.replace(/\/$/, '')}/chat/completions`;
  const systemPrompt = await getAnalysisPrompt(type);
  const userMessage = messages[messages.length - 1]?.content || '';
  const knowledgeContext = await getKnowledgeContext(userMessage);
  const finalMessages = buildProviderMessages(systemPrompt, messages, knowledgeContext);

  return {
    apiUrl,
    apiKey: settings.apiKey,
    modelId: settings.modelId,
    messages: finalMessages,
  };
}

async function* streamAIReply(messages: ChatMessage[], type: string = 'plan'): AsyncGenerator<string> {
  const config = await buildAIRequest(messages, type);
  
  if (!config) {
    yield* streamText(generateFallbackReply(messages));
    return;
  }

  try {
    const response = await fetch(config.apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${config.apiKey}`,
      },
      body: JSON.stringify({
        model: config.modelId,
        stream: true,
        messages: config.messages,
        temperature: 0.7,
      }),
    });

    if (!response.ok || !response.body) {
      throw new Error(`AI provider stream error: ${response.status}`);
    }

    const reader = response.body.getReader();
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
            const delta = parsed?.choices?.[0]?.delta?.content || '';
            if (delta) yield delta;
          } catch {
            // Ignore malformed provider chunks.
          }
        }
      }
    }
  } catch {
    yield* streamText(generateFallbackReply(messages));
  }
}

async function* streamText(text: string): AsyncGenerator<string> {
  const chunks = text.match(/[\s\S]{1,12}/g) || [];
  for (const chunk of chunks) {
    yield chunk;
    await new Promise((resolve) => setTimeout(resolve, 16));
  }
}

async function generateAIReply(messages: ChatMessage[], type: string = 'plan'): Promise<string> {
  const config = await buildAIRequest(messages, type);
  
  if (!config) {
    return generateFallbackReply(messages);
  }

  try {
    const response = await fetch(config.apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${config.apiKey}`,
      },
      body: JSON.stringify({
        model: config.modelId,
        messages: config.messages,
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`AI provider error: ${response.status} ${errorText}`);
    }

    const data = await response.json();
    return data?.choices?.[0]?.message?.content || generateFallbackReply(messages);
  } catch {
    return generateFallbackReply(messages);
  }
}

function generateFallbackReply(messages: ChatMessage[]): string {
  const lastMessage = messages[messages.length - 1];
  const content = lastMessage?.content || '';

  if (content.includes('客户背景') || content.includes('产后') || messages.length === 1) {
    return '我已收到客户信息。当前未配置可用的 AI 模型或模型请求失败，无法严格按后台提示词生成完整分析。请检查 AI 设置后重新生成。';
  }

  if (content.includes('饮食') || content.includes('吃')) {
    return '关于饮食调理，建议产后初期以清淡易消化为主，循序渐进增加营养。重点补充优质蛋白（鸡蛋、牛奶、瘦肉、鱼类）、铁质（红枣、瘦肉、动物肝脏）、钙质（牛奶、豆制品）和维生素（新鲜蔬菜水果）。避免过于油腻和生冷食物，少食多餐有助于消化吸收。同时注意补充足够水分，特别是哺乳期妈妈。';
  }

  if (content.includes('运动') || content.includes('锻炼')) {
    return '产后运动需循序渐进：1) 产后1-2周以休息为主，可做轻柔的腹式呼吸和提肛运动；2) 2周后可尝试产后恢复操；3) 42天复查后视身体恢复情况增加运动强度；4) 3个月内避免腹部挤压和负重运动；5) 凯格尔运动对盆底肌恢复非常有益，建议每天坚持。运动中如有不适立即停止。';
  }

  if (content.includes('漏尿') || content.includes('盆底')) {
    return '产后漏尿是常见问题，主要原因是盆底肌在分娩过程中受到拉伸和损伤。建议：1) 坚持凯格尔运动（提肛运动），每天3组，每组10-15次；2) 避免增加腹压的动作，如提重物、剧烈咳嗽；3) 控制体重，减轻盆底负担；4) 如3个月后仍无改善，建议就医评估；5) 专业的盆底肌修复项目可以显著改善症状。';
  }

  return '我已收到您的咨询。当前未配置可用的 AI 模型或模型请求失败，无法严格按后台提示词生成完整回复。请检查 AI 设置后重新生成。';
}
