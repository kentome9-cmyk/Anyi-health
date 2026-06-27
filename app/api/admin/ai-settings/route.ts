import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { logOperation } from '@/lib/operation-log';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const module = searchParams.get('module');

    if (module) {
      // 查询指定模块
      const settings = await prisma.aiSettings.findUnique({
        where: { module },
      });
      return NextResponse.json(settings || null);
    }

    // 查询所有模块配置
    const allSettings = await prisma.aiSettings.findMany({
      orderBy: { module: 'asc' },
    });

    return NextResponse.json(allSettings);
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
      module,
      apiKey, agentId, datasetId, baseUrl, modelId, 
      embeddingApiKey, embeddingBaseUrl, embeddingModelId
    } = body;

    const moduleId = module || 'default';

    let settings;
    const existing = await prisma.aiSettings.findUnique({
      where: { module: moduleId },
    });

    if (existing) {
      settings = await prisma.aiSettings.update({
        where: { module: moduleId },
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
          module: moduleId,
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

    logOperation({
      action: existing ? 'update' : 'create',
      module: 'ai_settings',
      targetId: moduleId,
      targetName: `AI设置-${moduleId}`,
      detail: existing ? `更新模块【${moduleId}】的AI配置` : `创建模块【${moduleId}】的AI配置`,
      request,
    });

    return NextResponse.json(settings);
  } catch (error) {
    console.error('Update ai settings error:', error);
    return NextResponse.json(
      { error: '更新AI设置失败' },
      { status: 500 }
    );
  }
}