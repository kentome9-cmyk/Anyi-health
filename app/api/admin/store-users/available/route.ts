import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAdmin, handleAuthError } from '@/lib/auth';
import { logError } from '@/lib/logger';

export async function GET(request: Request) {
  try {
    await requireAdmin();

    const users = await prisma.storeUser.findMany({
      where: {
        stores: {
          none: {},
        },
      },
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