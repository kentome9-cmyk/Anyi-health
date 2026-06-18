import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    const settings = await prisma.aiSettings.findFirst({
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json(settings || {
      apiKey: '',
      agentId: '',
      datasetId: '',
      baseUrl: '',
      modelId: '',
      embeddingApiKey: '',
      embeddingBaseUrl: '',
      embeddingModelId: '',
    });
  } catch (error) {
    console.error('Get ai settings error:', error);
    return NextResponse.json(
      { error: '获取AI设置失败' },
      { status: 500 }
    );
  }
}

export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const { 
      apiKey, agentId, datasetId, baseUrl, modelId, 
      embeddingApiKey, embeddingBaseUrl, embeddingModelId
    } = body;

    const existing = await prisma.aiSettings.findFirst({
      orderBy: { createdAt: 'desc' },
    });

    let settings;
    if (existing) {
      settings = await prisma.aiSettings.update({
        where: { id: existing.id },
        data: {
          apiKey,
          agentId,
          datasetId,
          baseUrl,
          modelId,
          embeddingApiKey,
          embeddingBaseUrl,
          embeddingModelId,
        },
      });
    } else {
      settings = await prisma.aiSettings.create({
        data: {
          apiKey,
          agentId,
          datasetId,
          baseUrl,
          modelId,
          embeddingApiKey,
          embeddingBaseUrl,
          embeddingModelId,
        },
      });
    }

    return NextResponse.json(settings);
  } catch (error) {
    console.error('Update ai settings error:', error);
    return NextResponse.json(
      { error: '更新AI设置失败' },
      { status: 500 }
    );
  }
}
