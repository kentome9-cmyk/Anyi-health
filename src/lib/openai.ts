import { prisma } from '@/lib/prisma';

interface OpenAIConfig {
  apiKey: string;
  baseUrl: string;
  modelId: string;
}

async function getOpenAIConfig(): Promise<OpenAIConfig | null> {
  const settings = await prisma.aiSettings.findFirst({
    where: { storeId: null },
    orderBy: { createdAt: 'desc' },
  });

  if (!settings?.apiKey || !settings?.baseUrl || !settings?.modelId) {
    return null;
  }

  return {
    apiKey: settings.apiKey,
    baseUrl: settings.baseUrl,
    modelId: settings.modelId,
  };
}

export async function getOpenAIInstance() {
  const config = await getOpenAIConfig();

  if (!config) {
    throw new Error('AI 未配置，请先在设置中配置 API');
  }

  // 返回配置供直接使用
  return {
    config,
    async chat(options: { messages: any[]; temperature?: number }) {
      const apiUrl = `${config.baseUrl.replace(/\/$/, '')}/chat/completions`;
      
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${config.apiKey}`,
        },
        body: JSON.stringify({
          model: config.modelId,
          messages: options.messages,
          temperature: options.temperature ?? 0.7,
        }),
      });

      if (!response.ok) {
        throw new Error(`AI API error: ${response.status}`);
      }

      return response.json();
    },
  };
}

export { getOpenAIConfig };
