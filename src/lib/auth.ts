import { NextResponse } from 'next/server';
import { getAuthCookie, AuthSession } from './auth-cookie';
import { prisma } from './prisma';
import { hasPermission, StorePermissionKey } from './store-permissions';

export async function requireAuth(): Promise<AuthSession> {
  const session = await getAuthCookie();
  if (!session) {
    throw new Error('未登录');
  }
  return session;
}

export async function requireAdmin(): Promise<AuthSession> {
  const session = await requireAuth();
  if (session.userType !== 'admin') {
    throw new Error('权限不足');
  }
  return session;
}

export async function requireStoreUser(): Promise<{ session: AuthSession; storeId: string }> {
  const session = await requireAuth();
  
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

export async function requireCustomer(): Promise<{ session: AuthSession; customerId: string; storeId: string }> {
  const session = await requireAuth();
  if (session.userType !== 'customer') {
    throw new Error('权限不足');
  }
  if (!session.storeId) {
    throw new Error('客户未关联门店');
  }
  return { session, customerId: session.userId, storeId: session.storeId };
}

export async function requireStorePermission(
  permission: StorePermissionKey
): Promise<{ session: AuthSession; storeId: string }> {
  const { session, storeId } = await requireStoreUser();
  
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