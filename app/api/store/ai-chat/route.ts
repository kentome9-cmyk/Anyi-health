import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getPromptByType } from '@/lib/prompt';
import { searchKnowledgeByEmbedding, formatKnowledgeContext, getOpenAIConfig } from '@/lib/openai';
import { requireStorePermission, handleAuthError } from '@/lib/auth';

const DEFAULT_SYSTEM_PROMPT =
  '你是一位专业、温柔、有耐心的产后恢复顾问，名为"尚孕智慧小助手"。你拥有丰富的中医产后调理知识和现代康复医学背景，帮助产后妈妈科学地恢复身体健康。\n\n' +
  '工作流程：\n' +
  '### 有图片时：\n' +
  '1. 图片识别：分析客户上传的医疗报告图片，提取关键症状和诊断信息\n' +
  '2. 关键词提取：将图片中提取的信息转化为关键词（如：盆底肌 松弛 肌力差）\n' +
  '3. 知识库检索：使用关键词在产后康复专业知识库中搜索匹配的方案\n' +
  '4. 综合分析：结合客户背景、图片分析结果和知识库方案，提供个性化调理建议\n\n' +
  '### 无图片时：\n' +
  '1. 症状提取：从客户描述中提取关键症状关键词\n' +
  '2. 知识库检索：使用关键词在产后康复专业知识库中搜索匹配的方案\n' +
  '3. 综合分析：结合客户背景和知识库方案，提供个性化调理建议\n\n' +
  '核心要求：\n' +
  '1. 必须严格使用知识库中提供的项目搭配方案，不得推荐知识库中未包含的项目\n' +
  '2. 只使用匹配度最高的那一行方案，不要从多行中挑选项目进行组合\n' +
  '3. 项目名称必须与知识库完全一致\n' +
  '4. 根据用户症状严重程度合理分配项目次数\n' +
  '5. 输出格式必须为以下markdown格式，严格按照模板输出，不得更改标题层级和格式：';


async function fetchImageAsBase64(url: string): Promise<string | undefined> {
  try {
    let fullUrl = url;
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      fullUrl = `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'}${url.startsWith('/') ? '' : '/'}${url}`;
    }
    
    const response = await fetch(fullUrl);
    if (!response.ok) {
      console.error(`❌ 图片获取失败: ${response.status}`);
      return undefined;
    }
    
    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const mimeType = response.headers.get('content-type') || 'image/jpeg';
    const base64 = `data:${mimeType};base64,${buffer.toString('base64')}`;
    
    console.log('📷 图片已转换为base64，长度:', base64.length);
    return base64;
  } catch (error) {
    console.error('❌ 图片获取失败:', error);
    return undefined;
  }
}

type ChatMessage = {
  role: string;
  content: string | Array<{ type: string; text?: string; image_url?: { url: string } }>;
};

interface AIRequestConfig {
  apiUrl: string;
  apiKey: string;
  modelId: string;
  messages: any[];
}

export async function POST(request: Request) {
  try {
    const requestId = `req-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    console.log(`[AI-Chat:${requestId}] ====== 收到请求 ======`);
    
    await requireStorePermission('ai_analysis', request);
    const body = await request.json();
    const { customerId, storeId, messages, reportContent, reportFile, reportFilePath, reportBase64, reportUrl, stream, promptType } = body;
    const type = promptType || 'plan';

    if (!customerId || !messages || messages.length === 0) {
      return NextResponse.json(
        { error: '缺少必要参数' },
        { status: 400 }
      );
    }

    let resolvedReportBase64 = reportBase64;
    
    console.log(`[AI-Chat:${requestId}] reportBase64 received: ${reportBase64?.length || 0}`);
    console.log(`[AI-Chat:${requestId}] reportUrl: ${reportUrl || 'none'}`);
    
    if (reportUrl && !reportBase64) {
      console.log(`[AI-Chat:${requestId}] fetching image from URL: ${reportUrl}`);
      resolvedReportBase64 = await fetchImageAsBase64(reportUrl);
      console.log(`[AI-Chat:${requestId}] fetched base64 length: ${resolvedReportBase64?.length || 0}`);
    }

    console.log(`[AI-Chat:${requestId}] resolvedReportBase64 length: ${resolvedReportBase64?.length || 0}`);
    const enhancedMessages = buildMultimodalMessages(messages, resolvedReportBase64);

    if (stream) {
      return createStreamResponse({ customerId, storeId, messages: enhancedMessages, reportContent, reportFile, reportFilePath, type });
    }

    const reply = await generateAIReply(enhancedMessages, type);

    if (storeId) {
      const lastMessageContent = messages[messages.length - 1]?.content;
      const textContent = typeof lastMessageContent === 'string' 
        ? lastMessageContent 
        : JSON.stringify(lastMessageContent);
      await prisma.aiAnalysis.create({
        data: {
          storeId,
          customerId,
          content: reply,
          reportContent: reportContent || textContent || '',
          reportFile,
          reportFilePath,
        },
      });
    }

    return NextResponse.json({
      reply,
      customerId,
      success: true,
    });
  } catch (error) {
    return handleAuthError(error);
  }
}

async function createStreamResponse({
  customerId,
  storeId,
  messages,
  reportContent,
  reportFile,
  reportFilePath,
  type = 'plan',
}: {
  customerId: string;
  storeId?: string;
  messages: ChatMessage[];
  reportContent?: string;
  reportFile?: string;
  reportFilePath?: string;
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
            const lastMessageContent = messages[messages.length - 1]?.content;
              const textContent = typeof lastMessageContent === 'string' 
                ? lastMessageContent 
                : JSON.stringify(lastMessageContent);
              await prisma.aiAnalysis.create({
                data: {
                  storeId,
                  customerId,
                  content: fullReply,
                  reportContent: reportContent || textContent || '',
                  reportFile,
                  reportFilePath,
                },
              });
          } catch {
            // ignore
          }
        }

        send({ done: true });
      } catch {
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

function buildMultimodalMessages(messages: ChatMessage[], reportBase64?: string): ChatMessage[] {
  if (!reportBase64) {
    return messages;
  }

  const enhancedMessages = [...messages];
  
  const lastMessage = enhancedMessages[enhancedMessages.length - 1];
  if (lastMessage && lastMessage.role === 'user') {
    const content = lastMessage.content;
    
    if (Array.isArray(content)) {
      const hasImage = content.some((item: any) => item.type === 'image_url');
      if (!hasImage) {
        enhancedMessages[enhancedMessages.length - 1] = {
          ...lastMessage,
          content: [
            ...content,
            {
              type: 'image_url',
              image_url: {
                url: reportBase64,
              },
            },
          ],
        };
      }
    } else {
      enhancedMessages[enhancedMessages.length - 1] = {
        ...lastMessage,
        content: [
          {
            type: 'text',
            text: `${content}\n\n请分析以下医疗报告图片，结合客户信息给出专业的产后康复建议。`,
          },
          {
            type: 'image_url',
            image_url: {
              url: reportBase64,
            },
          },
        ],
      };
    }
  }

  return enhancedMessages;
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

function extractKeySymptoms(text: string): string {
  const keywords = [
    '盆底肌', '腹直肌', '骨盆', '气血', '脾胃', '内分泌', '恶露', 
    '子宫', '乳腺', '乳房', '失眠', '疲劳', '头晕', '腰酸', '产后肥胖',
    '漏尿', '松弛', '分离', '外扩', '下垂', '胀痛', '结节', '增生',
    '面色', '气色', '月经', '痛经', '宫寒', '湿气', '代谢', '免疫力',
    '抑郁', '便秘', '水肿', '伤口', '血栓', '骨质疏松',
    '康复', '调理', '修复', '恢复'
  ];
  
  const foundKeywords = keywords.filter(keyword => text.includes(keyword));
  
  if (foundKeywords.length > 0) {
    return foundKeywords.join(' ');
  }
  
  const symptomPatterns = [
    /身体症状[：:]?\s*(.+?)(?=\n|$)/g,
    /症状[：:]?\s*(.+?)(?=\n|$)/g,
    /描述[：:]?\s*(.+?)(?=\n|$)/g,
    /问题[：:]?\s*(.+?)(?=\n|$)/g,
  ];
  
  for (const pattern of symptomPatterns) {
    const match = text.match(pattern);
    if (match && match[0]) {
      const extracted = match[0].replace(/身体症状[：:]?|症状[：:]?|描述[：:]?|问题[：:]?/g, '').trim();
      if (extracted.length > 0) return extracted;
    }
  }
  
  return text;
}

async function getKnowledgeContext(userMessage: string): Promise<string> {
  try {
    const keySymptoms = extractKeySymptoms(userMessage);
    console.log('=== 知识库检索结果 ===');
    console.log('原始消息长度:', userMessage.length);
    console.log('提取的关键症状:', keySymptoms);
    
    let matches = await searchKnowledgeByEmbedding(keySymptoms, 'default', 5, 0.4);
    
    console.log('匹配数量:', matches.length);
    if (matches.length > 0) {
      console.log('匹配详情:', JSON.stringify(matches, null, 2));
      console.log('✅ 关键症状搜索成功，跳过降级搜索');
    } else {
      console.log('未找到匹配的知识库内容，尝试使用原始消息搜索...');
      const fallbackMatches = await searchKnowledgeByEmbedding(userMessage, 'default', 5, 0.3);
      console.log('降级搜索匹配数量:', fallbackMatches.length);
      if (fallbackMatches.length > 0) {
        console.log('降级搜索匹配详情:', JSON.stringify(fallbackMatches, null, 2));
        matches = fallbackMatches;
      }
    }
    console.log('========================');
    
    const context = matches.length > 0 ? formatKnowledgeContext(matches) : '';
    
    if (!context) {
      console.warn('⚠️ 知识库上下文为空，AI将不使用知识库进行回复');
    } else {
      console.log('知识库上下文已注入，长度:', context.length);
    }
    
    return context;
  } catch (error) {
    console.error('❌ 知识库检索失败:', error);
    return '';
  }
}

async function extractSymptomsFromImage(reportBase64: string, config: { apiUrl: string; apiKey: string; modelId: string }): Promise<string> {
  try {
    const response = await fetch(config.apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${config.apiKey}`,
      },
      body: JSON.stringify({
        model: config.modelId,
        messages: [
          {
            role: 'system',
            content: '你是一个医疗报告分析助手，请分析图片中的医疗报告内容，提取关键症状和诊断信息。只返回关键词，用空格分隔，不要返回其他内容。关键词示例：盆底肌 松弛 肌力差 腹直肌分离 气血不足',
          },
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: '请分析这张医疗报告图片，提取关键症状关键词。',
              },
              {
                type: 'image_url',
                image_url: {
                  url: reportBase64,
                },
              },
            ],
          },
        ],
        temperature: 0.3,
      }),
    });

    if (!response.ok) {
      throw new Error(`Image analysis failed: ${response.status}`);
    }

    const result = await response.json();
    const symptoms = result?.choices?.[0]?.message?.content || '';
    console.log('📷 图片识别提取的症状关键词:', symptoms.trim());
    return symptoms.trim();
  } catch (error) {
    console.error('❌ 图片识别失败:', error);
    return '';
  }
}

async function buildAIRequest(messages: ChatMessage[], type: string): Promise<AIRequestConfig | null> {
  const config = await getOpenAIConfig('default');

  if (!config) {
    return null;
  }

  const apiUrl = `${config.baseUrl.replace(/\/$/, '')}/chat/completions`;
  const systemPrompt = await getAnalysisPrompt(type);
  const lastMessageContent = messages[messages.length - 1]?.content || '';
  const userMessage = typeof lastMessageContent === 'string' 
    ? lastMessageContent 
    : lastMessageContent.find((item: any) => item.type === 'text')?.text || '';
  
  const hasImage = typeof lastMessageContent !== 'string' && 
    lastMessageContent.some((item: any) => item.type === 'image_url');
  
  let knowledgeContext = '';
  
  if (hasImage) {
    const imageContent = lastMessageContent.find((item: any) => item.type === 'image_url')?.image_url?.url || '';
    
    if (imageContent) {
      const imageSymptoms = await extractSymptomsFromImage(imageContent, { apiUrl, apiKey: config.apiKey, modelId: config.modelId });
      
      if (imageSymptoms) {
        console.log('🔍 使用图片识别的关键词搜索知识库');
        knowledgeContext = await getKnowledgeContext(imageSymptoms);
        
        if (knowledgeContext) {
          console.log('✅ 图片识别搜索成功，跳过文本搜索');
        } else if (userMessage) {
          console.log('🔍 图片识别未找到匹配，使用文本关键词搜索');
          knowledgeContext = await getKnowledgeContext(userMessage);
        }
      } else if (userMessage) {
        console.log('🔍 图片识别失败，使用文本关键词搜索');
        knowledgeContext = await getKnowledgeContext(userMessage);
      }
    }
  } else {
    knowledgeContext = await getKnowledgeContext(userMessage);
  }
  
  const finalMessages = buildProviderMessages(systemPrompt, messages, knowledgeContext);

  return {
    apiUrl,
    apiKey: config.apiKey,
    modelId: config.modelId,
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
            // ignore
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
      throw new Error(`AI provider error: ${response.status}`);
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
  const textContent = typeof content === 'string' 
    ? content 
    : content.find((item: any) => item.type === 'text')?.text || '';

  if (textContent.includes('客户背景') || textContent.includes('产后') || messages.length === 1) {
    return '我已收到客户信息。当前未配置可用的 AI 模型或模型请求失败，无法严格按后台提示词生成完整分析。请检查 AI 设置后重新生成。';
  }

  if (textContent.includes('饮食') || textContent.includes('吃')) {
    return '关于饮食调理，建议产后初期以清淡易消化为主，循序渐进增加营养。重点补充优质蛋白（鸡蛋、牛奶、瘦肉、鱼类）、铁质（红枣、瘦肉、动物肝脏）、钙质（牛奶、豆制品）和维生素（新鲜蔬菜水果）。避免过于油腻和生冷食物，少食多餐有助于消化吸收。同时注意补充足够水分，特别是哺乳期妈妈。';
  }

  if (textContent.includes('运动') || textContent.includes('锻炼')) {
    return '产后运动需循序渐进：1) 产后1-2周以休息为主，可做轻柔的腹式呼吸和提肛运动；2) 2周后可尝试产后恢复操；3) 42天复查后视身体恢复情况增加运动强度；4) 3个月内避免腹部挤压和负重运动；5) 凯格尔运动对盆底肌恢复非常有益，建议每天坚持。运动中如有不适立即停止。';
  }

  if (textContent.includes('漏尿') || textContent.includes('盆底')) {
    return '产后漏尿是常见问题，主要原因是盆底肌在分娩过程中受到拉伸和损伤。建议：1) 坚持凯格尔运动（提肛运动），每天3组，每组10-15次；2) 避免增加腹压的动作，如提重物、剧烈咳嗽；3) 控制体重，减轻盆底负担；4) 如3个月后仍无改善，建议就医评估；5) 专业的盆底肌修复项目可以显著改善症状。';
  }

  return '我已收到您的咨询。当前未配置可用的 AI 模型或模型请求失败，无法严格按后台提示词生成完整回复。请检查 AI 设置后重新生成。';
}