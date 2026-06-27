import { prisma } from './prisma';
import { getAuthCookie } from './auth-cookie';

export interface LogOperationParams {
  action: string;
  module: string;
  targetId?: string | null;
  targetName?: string | null;
  detail?: string | null;
  request?: Request | null;
  operatorType?: string;
  operatorId?: string | null;
  operatorName?: string | null;
}

export async function logOperation(params: LogOperationParams) {
  try {
    let operatorType = params.operatorType;
    let operatorId = params.operatorId;
    let operatorName = params.operatorName;

    if (!operatorType || !operatorId) {
      try {
        const auth = await getAuthCookie();
        if (auth) {
          operatorType = operatorType || auth.userType;
          operatorId = operatorId || auth.userId;
        }
      } catch {
        // 无法获取 auth 时跳过
      }
    }

    let ip: string | null = null;
    let userAgent: string | null = null;

    if (params.request) {
      ip = params.request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? null;
      userAgent = params.request.headers.get('user-agent') ?? null;
    }

    await prisma.operationLog.create({
      data: {
        operatorType: operatorType ?? 'unknown',
        operatorId: operatorId ?? null,
        operatorName: operatorName ?? null,
        action: params.action,
        module: params.module,
        targetId: params.targetId ?? null,
        targetName: params.targetName ?? null,
        detail: params.detail ?? null,
        ip,
        userAgent,
      },
    });
  } catch (error) {
    console.error('Log operation failed:', error);
  }
}
