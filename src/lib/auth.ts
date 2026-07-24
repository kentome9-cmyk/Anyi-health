import { NextResponse } from 'next/server';
import type { Prisma } from '@prisma/client';
import { getAuthCookie, AuthSession } from './auth-cookie';
import { prisma } from './prisma';
import { hasPermission, StorePermissionKey } from './store-permissions';
import { getSessionFromHeaders, UnifiedSession } from './session';

function toAuthSession(session: UnifiedSession): AuthSession {
  return {
    userType: session.userType,
    userId: session.userId,
    storeId: session.storeId,
    permissions: session.permissions,
    isDemo: session.isDemo,
    demoBatchId: session.demoBatchId,
    expiresAt: Date.now() + 7 * 24 * 60 * 60 * 1000,
  };
}

export async function requireAuth(request?: Request): Promise<AuthSession> {
  if (request) {
    const headerSession = await getSessionFromHeaders(request.headers);
    if (headerSession) {
      return toAuthSession(headerSession);
    }
  }

  const session = await getAuthCookie();
  if (!session) {
    throw new Error('UNAUTHENTICATED');
  }
  return session;
}

export async function requireAdmin(request?: Request): Promise<AuthSession> {
  const session = await requireAuth(request);
  if (session.userType !== 'admin') {
    throw new Error('FORBIDDEN');
  }
  return session;
}

export function isDemoAdmin(session: Pick<AuthSession, 'userType' | 'isDemo'>): boolean {
  return session.userType === 'admin' && session.isDemo === true;
}

export function getDemoBatchId(session: Pick<AuthSession, 'demoBatchId'>): string {
  return session.demoBatchId || process.env.DEMO_BATCH_ID || 'DEMO_INVESTOR_V1';
}

export function getDemoStoreWhere(session: Pick<AuthSession, 'demoBatchId'>): Prisma.StoreWhereInput {
  return {
    isDemo: true,
    demoBatchId: getDemoBatchId(session),
  };
}

export function getAdminVisibleStoreWhere(
  session: Pick<AuthSession, 'userType' | 'isDemo' | 'demoBatchId'>
): Prisma.StoreWhereInput {
  if (isDemoAdmin(session)) {
    return getDemoStoreWhere(session);
  }

  if (session.userType === 'admin') {
    return { isDemo: false };
  }

  return {};
}

export function applyDemoStoreFilter<T extends Record<string, unknown> & { store?: Prisma.StoreWhereInput }>(
  where: T,
  session: Pick<AuthSession, 'userType' | 'isDemo' | 'demoBatchId'>
): T {
  if (session.userType !== 'admin') {
    return where;
  }

  where.store = where.store
    ? { AND: [where.store, getAdminVisibleStoreWhere(session)] }
    : getAdminVisibleStoreWhere(session);
  return where;
}

export function applyDemoStoreListFilter<T extends Record<string, unknown> & { isDemo?: boolean; demoBatchId?: string | null }>(
  where: T,
  session: Pick<AuthSession, 'userType' | 'isDemo' | 'demoBatchId'>
): T {
  if (session.userType !== 'admin') {
    return where;
  }

  if (isDemoAdmin(session)) {
    where.isDemo = true;
    where.demoBatchId = getDemoBatchId(session);
  } else {
    where.isDemo = false;
    delete where.demoBatchId;
  }
  return where;
}

export function assertWritableAdmin(session: Pick<AuthSession, 'userType' | 'isDemo'>) {
  if (isDemoAdmin(session)) {
    throw new Error('DEMO_READ_ONLY');
  }
}

export async function requireStoreUser(request?: Request): Promise<{ session: AuthSession; storeId: string }> {
  const session = await requireAuth(request);
  let storeId = session.storeId;

  if (session.userType === 'admin') {
    const stores = await prisma.store.findMany({
      where: getAdminVisibleStoreWhere(session),
      take: 1,
    });
    if (stores.length > 0) {
      storeId = stores[0].id;
    }
  }

  if (!storeId) {
    throw new Error('STORE_NOT_LINKED');
  }

  return { session, storeId };
}

export async function requireCustomer(request?: Request): Promise<{ session: AuthSession; customerId: string; storeId: string }> {
  const session = await requireAuth(request);
  if (session.userType !== 'customer') {
    throw new Error('FORBIDDEN');
  }
  if (!session.storeId) {
    throw new Error('CUSTOMER_STORE_NOT_LINKED');
  }
  return { session, customerId: session.userId, storeId: session.storeId };
}

export async function requireStorePermission(
  permission: StorePermissionKey,
  request?: Request
): Promise<{ session: AuthSession; storeId: string }> {
  const { session, storeId } = await requireStoreUser(request);

  if (session.userType === 'admin') {
    return { session, storeId };
  }

  const permissions = session.permissions || [];
  if (!hasPermission(permissions, permission)) {
    throw new Error('FORBIDDEN');
  }

  return { session, storeId };
}

export function handleAuthError(error: unknown): NextResponse {
  const message = error instanceof Error ? error.message : 'UNKNOWN_ERROR';

  if (message === 'UNAUTHENTICATED') {
    return NextResponse.json({ error: '请先登录' }, { status: 401 });
  }

  if (message === 'FORBIDDEN') {
    return NextResponse.json({ error: '权限不足' }, { status: 403 });
  }

  if (message === 'DEMO_READ_ONLY') {
    return NextResponse.json({ error: '无权限' }, { status: 403 });
  }

  if (message === 'STORE_NOT_LINKED') {
    return NextResponse.json({ error: '门店未关联' }, { status: 400 });
  }

  return NextResponse.json({ error: '服务器错误' }, { status: 500 });
}
