import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { apiType } = body; // 'reply' | 'embedding'

    const settings = await prisma.aiSettings.findFirst({
      where: { storeId: null },
      orderBy: { createdAt: 'desc' },
    });

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
      apiKey = settings.apiKey || '';
      baseUrl = settings.baseUrl || '';
      modelId = settings.modelId || '';
    } else {
      apiKey = settings.embeddingApiKey || '';
      baseUrl = settings.embeddingBaseUrl || '';
      modelId = settings.embeddingModelId || '';
    }

    if (!apiKey) {
      return NextResponse.json({
        success: false,
        message: `${apiType === 'reply' ? '答复' : '向量'} API Key 未配置`,
      });
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

    // 构造测试请求
    const testUrl = `${baseUrl.replace(/\/$/, '')}/chat/completions`;
    const testBody = {
      model: modelId,
      messages: [
        { role: 'user', content: '你好，请回复"测试成功"' }
      ],
      max_tokens: 50,
    };

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
        const reply = data.choices?.[0]?.message?.content || '';
        return NextResponse.json({
          success: true,
          message: `API 连接成功！${reply ? '回复：' + reply : ''}`,
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
    console.error('Test API error:', error);
    return NextResponse.json({
      success: false,
      message: '测试失败',
    });
  }
}
