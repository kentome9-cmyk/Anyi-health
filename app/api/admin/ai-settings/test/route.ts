import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { decrypt } from '@/lib/crypto';
import { requireAdmin, handleAuthError } from '@/lib/auth';

export async function POST(request: Request) {
  try {
    await requireAdmin();
    const body = await request.json();
    const { apiType, module = 'default' } = body;

    let settings = await prisma.aiSettings.findUnique({
      where: { module },
    });

    if (!settings && module !== 'default') {
      settings = await prisma.aiSettings.findUnique({
        where: { module: 'default' },
      });
    }

    if (!settings) {
      return NextResponse.json({
        success: false,
        message: '请先保存 AI 配置',
      });
    }

    let apiKey: string;
    let baseUrl: string;
    let modelId: string;

    if (apiType === 'reply') {
      if (!settings.apiKey) {
        return NextResponse.json({
          success: false,
          message: '答复 API Key 未配置',
        });
      }
      apiKey = decrypt(settings.apiKey);
      baseUrl = settings.baseUrl || '';
      modelId = settings.modelId || '';
    } else {
      if (!settings.embeddingApiKey) {
        return NextResponse.json({
          success: false,
          message: '向量 API Key 未配置',
        });
      }
      apiKey = decrypt(settings.embeddingApiKey);
      baseUrl = settings.embeddingBaseUrl || '';
      modelId = settings.embeddingModelId || '';
    }

    if (!baseUrl) {
      return NextResponse.json({
        success: false,
        message: `${apiType === 'reply' ? '答复' : '向量'} Base URL 未配置`,
      });
    }

    if (!modelId) {
      return NextResponse.json({
        success: false,
        message: `${apiType === 'reply' ? '答复' : '向量'} Model ID 未配置`,
      });
    }

    let testUrl: string;
    let testBody: Record<string, any>;

    if (apiType === 'reply') {
      testUrl = `${baseUrl.replace(/\/$/, '')}/chat/completions`;
      testBody = {
        model: modelId,
        messages: [
          { role: 'user', content: '你好，请回复"测试成功"' }
        ],
        max_tokens: 50,
      };
    } else {
      testUrl = `${baseUrl.replace(/\/$/, '')}/embeddings`;
      testBody = {
        model: modelId,
        input: '测试文本向量化',
      };
    }

    try {
      const response = await fetch(testUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
        },
        body: JSON.stringify(testBody),
      });

      if (response.ok) {
        const data = await response.json();
        let resultMsg = 'API 连接成功！';
        if (apiType === 'reply') {
          const reply = data.choices?.[0]?.message?.content || '';
          resultMsg = reply ? `API 连接成功！回复：${reply}` : 'API 连接成功！';
        } else {
          const embeddingLength = data.data?.[0]?.embedding?.length || 0;
          resultMsg = embeddingLength > 0 ? `API 连接成功！向量维度：${embeddingLength}` : 'API 连接成功！';
        }
        return NextResponse.json({
          success: true,
          message: resultMsg,
        });
      } else {
        const errorText = await response.text();
        let errorMsg = `HTTP ${response.status}`;
        try {
          const errorData = JSON.parse(errorText);
          errorMsg = errorData.error?.message || errorData.message || errorMsg;
        } catch {
          errorMsg = errorText.substring(0, 200) || errorMsg;
        }
        return NextResponse.json({
          success: false,
          message: `API 调用失败：${errorMsg}`,
        });
      }
    } catch (fetchError: any) {
      return NextResponse.json({
        success: false,
        message: `网络错误：${fetchError.message}`,
      });
    }
  } catch (error) {
    return handleAuthError(error);
  }
}