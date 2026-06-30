import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireStoreUser, handleAuthError } from '@/lib/auth';
import { logError } from '@/lib/logger';

export async function GET(request: NextRequest) {
  try {
    const session = await requireStoreUser();
    const { searchParams } = new URL(request.url);
    const keyword = searchParams.get('keyword');
    const direction = searchParams.get('direction');
    const subCategory = searchParams.get('subCategory');
    const page = Math.max(1, parseInt(searchParams.get('page') || '1'));
    const pageSize = Math.min(100, Math.max(1, parseInt(searchParams.get('pageSize') || '20')));

    const where: any = {};
    if (keyword) {
      where.OR = [
        { title: { contains: keyword } },
        { content: { contains: keyword } },
        { number: { contains: keyword } },
        { direction: { contains: keyword } },
        { subCategory: { contains: keyword } },
      ];
    }
    if (direction) where.direction = direction;
    if (subCategory) where.subCategory = subCategory;

    const [items, total] = await Promise.all([
      prisma.scriptMaterial.findMany({
        where,
        include: {
          _count: {
            select: { rewrites: true },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.scriptMaterial.count({ where }),
    ]);

    const directions = await prisma.scriptMaterial.findMany({
      distinct: ['direction'],
      select: { direction: true },
      orderBy: { direction: 'asc' },
    });

    const subCategories = await prisma.scriptMaterial.findMany({
      distinct: ['subCategory'],
      select: { subCategory: true },
      orderBy: { subCategory: 'asc' },
    });

    return NextResponse.json({
      items,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
      directions: directions.map(d => d.direction),
      subCategories: subCategories.map(s => s.subCategory),
    });
  } catch (error) {
    logError('Failed to fetch script materials', error);
    return handleAuthError(error);
  }
}