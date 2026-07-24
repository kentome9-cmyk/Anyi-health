import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { applyDemoStoreListFilter, requireAdmin, handleAuthError } from '@/lib/auth';
import { logError } from '@/lib/logger';

export async function GET(request: Request) {
  try {
    const session = await requireAdmin(request);

    const users = await prisma.storeUser.findMany({
      where: applyDemoStoreListFilter({
        stores: {
          none: {},
        },
      }, session),
      select: {
        id: true,
        phone: true,
        name: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return NextResponse.json({
      list: users,
      total: users.length,
    });
  } catch (error) {
    logError('Get available store users error', error);
    return handleAuthError(error);
  }
}
