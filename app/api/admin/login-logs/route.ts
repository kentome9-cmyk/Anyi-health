import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import type { Prisma } from '@prisma/client';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const url = new URL(request.url);
  const page = parseInt(url.searchParams.get('page') || '1', 10);
  const pageSize = parseInt(url.searchParams.get('pageSize') || '20', 10);
  const userType = url.searchParams.get('userType') || '';
  const successParam = url.searchParams.get('success');
  const userName = url.searchParams.get('userName') || '';
  const ip = url.searchParams.get('ip') || '';
  const startDate = url.searchParams.get('startDate') || '';
  const endDate = url.searchParams.get('endDate') || '';

  const where: Prisma.LoginLogWhereInput = {};
  if (userType) where.userType = userType;
  if (successParam === 'true') where.success = true;
  if (successParam === 'false') where.success = false;
  if (userName) where.userName = { contains: userName, mode: 'insensitive' };
  if (ip) where.ip = { contains: ip };

  if (startDate || endDate) {
    where.createdAt = {};
    if (startDate) {
      (where.createdAt as Prisma.DateTimeFilter).gte = new Date(startDate + 'T00:00:00');
    }
    if (endDate) {
      (where.createdAt as Prisma.DateTimeFilter).lte = new Date(endDate + 'T23:59:59');
    }
  }

  const [list, total] = await Promise.all([
    prisma.loginLog.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.loginLog.count({ where }),
  ]);

  return NextResponse.json({ list, total, page, pageSize });
}
