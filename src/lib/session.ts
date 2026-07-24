import { NextRequest } from 'next/server';
import { getAuthCookie, AuthSession, signData, verifySignature } from './auth-cookie';

export type SessionUserType = 'admin' | 'store_user' | 'customer';

export interface UnifiedSession {
  userType: SessionUserType;
  userId: string;
  storeId: string | null;
  permissions?: string[];
  isDemo?: boolean;
  demoBatchId?: string | null;
}

export async function getSessionFromRequest(
  request: NextRequest
): Promise<UnifiedSession | null> {
  const authHeader = request.headers.get('authorization');
  
  if (authHeader?.startsWith('Bearer ')) {
    const token = authHeader.slice(7);
    const session = verifyToken(token);
    if (session) {
      return session;
    }
  }

  const cookieSession = await getAuthCookie();
  if (cookieSession) {
    return cookieSession;
  }

  return null;
}

export async function getSessionFromHeaders(
  headers: Headers
): Promise<UnifiedSession | null> {
  const authHeader = headers.get('authorization');
  
  if (authHeader?.startsWith('Bearer ')) {
    const token = authHeader.slice(7);
    const session = verifyToken(token);
    if (session) {
      return {
        userType: session.userType,
        userId: session.userId,
        storeId: session.storeId,
        permissions: session.permissions,
        isDemo: session.isDemo,
        demoBatchId: session.demoBatchId,
      };
    }
    return null;
  }

  const cookieSession = await getAuthCookie();
  if (cookieSession) {
      return {
        userType: cookieSession.userType,
        userId: cookieSession.userId,
        storeId: cookieSession.storeId,
        permissions: cookieSession.permissions,
        isDemo: cookieSession.isDemo,
        demoBatchId: cookieSession.demoBatchId,
      };
  }

  return null;
}

export function verifyToken(token: string): AuthSession | null {
  const data = verifySignature(token);
  if (!data) return null;
  
  try {
    const session = JSON.parse(data) as AuthSession;
    if (session.expiresAt && Date.now() > session.expiresAt) {
      return null;
    }
    return session;
  } catch {
    return null;
  }
}

export function createToken(sessionData: Omit<AuthSession, 'expiresAt'>): string {
  const session: AuthSession = {
    ...sessionData,
    expiresAt: Date.now() + 7 * 24 * 60 * 60 * 1000,
  };
  return signData(JSON.stringify(session));
}
