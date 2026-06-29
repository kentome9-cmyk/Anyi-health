import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { logOperation } from '@/lib/operation-log';
import { encrypt } from '@/lib/crypto';
import { requireAdmin, handleAuthError } from '@/lib/auth';

function sanitizeSettings(settings: any): any {
  if (!settings) return null;
  return {
    id: settings.id,
    module: settings.module,
    agentId: settings.agentId,
    datasetId: settings.datasetId,
    baseUrl: settings.baseUrl,
    modelId: settings.modelId,
    embeddingBaseUrl: settings.embeddingBaseUrl,
    embeddingModelId: settings.embeddingModelId,
    hasApiKey: !!settings.apiKey,
    hasEmbeddingApiKey: !!settings.embeddingApiKey,
    createdAt: settings.createdAt,
    updatedAt: settings.updatedAt,
  };
}

export async function GET(request: Request) {
  try {
    await requireAdmin();
    const { searchParams } = new URL(request.url);
    const module = searchParams.get('module');

    if (module) {
      const settings = await prisma.aiSettings.findUnique({
        where: { module },
      });
      return NextResponse.json(sanitizeSettings(settings));
    }

    const allSettings = await prisma.aiSettings.findMany({
      orderBy: { module: 'asc' },
    });

    return NextResponse.json(allSettings.map(sanitizeSettings));
  } catch (error) {
    return handleAuthError(error);
  }
}

export async function PUT(request: Request) {
  try {
    await requireAdmin();
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

    const encryptedApiKey = apiKey ? encrypt(apiKey) : existing?.apiKey;
    const encryptedEmbeddingApiKey = embeddingApiKey 
      ? encrypt(embeddingApiKey) 
      : existing?.embeddingApiKey;

    if (existing) {
      settings = await prisma.aiSettings.update({
        where: { module: moduleId },
        data: {
          apiKey: encryptedApiKey,
          agentId,
          datasetId,
          baseUrl,
          modelId,
          embeddingApiKey: encryptedEmbeddingApiKey,
          embeddingBaseUrl,
          embeddingModelId,
        },
      });
    } else {
      settings = await prisma.aiSettings.create({
        data: {
          module: moduleId,
          apiKey: encryptedApiKey,
          agentId,
          datasetId,
          baseUrl,
          modelId,
          embeddingApiKey: encryptedEmbeddingApiKey,
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

    return NextResponse.json(sanitizeSettings(settings));
  } catch (error) {
    return handleAuthError(error);
  }
}