import { NextResponse } from 'next/server';
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
    throw new Error('未登录');
  }
  return session;
}

export async function requireAdmin(request?: Request): Promise<AuthSession> {
  const session = await requireAuth(request);
  if (session.userType !== 'admin') {
    throw new Error('权限不足');
  }
  return session;
}

export async function requireStoreUser(request?: Request): Promise<{ session: AuthSession; storeId: string }> {
  const session = await requireAuth(request);
  
  let storeId = session.storeId;
  
  if (session.userType === 'admin') {
    const stores = await prisma.store.findMany({ take: 1 });
    if (stores.length > 0) {
      storeId = stores[0].id;
    }
  }
  
  if (!storeId) {
    throw new Error('门店未关联');
  }
  
  return { session, storeId };
}

export async function requireCustomer(request?: Request): Promise<{ session: AuthSession; customerId: string; storeId: string }> {
  const session = await requireAuth(request);
  if (session.userType !== 'customer') {
    throw new Error('权限不足');
  }
  if (!session.storeId) {
    throw new Error('客户未关联门店');
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
    throw new Error('权限不足');
  }
  
  return { session, storeId };
}

export function handleAuthError(error: unknown): NextResponse {
  const message = error instanceof Error ? error.message : '未知错误';
  
  if (message === '未登录') {
    return NextResponse.json({ error: '请先登录' }, { status: 401 });
  }
  
  if (message === '权限不足') {
    return NextResponse.json({ error: '权限不足' }, { status: 403 });
  }
  
  if (message === '门店未关联') {
    return NextResponse.json({ error: '门店未关联' }, { status: 400 });
  }
  
  return NextResponse.json({ error: '服务器错误' }, { status: 500 });
}