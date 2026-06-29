import { NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';

export class AppError extends Error {
  constructor(
    public statusCode: number,
    public message: string,
    public details?: any
  ) {
    super(message);
  }
}

export function handleError(error: unknown): NextResponse {
  console.error('[Error]', error);

  if (error instanceof AppError) {
    return NextResponse.json(
      { error: error.message, details: error.details },
      { status: error.statusCode }
    );
  }

  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === 'P2002') {
      return NextResponse.json({ error: '记录已存在' }, { status: 409 });
    }
    if (error.code === 'P2025') {
      return NextResponse.json({ error: '记录不存在' }, { status: 404 });
    }
    return NextResponse.json({ error: '数据库操作失败' }, { status: 500 });
  }

  if (error instanceof Prisma.PrismaClientValidationError) {
    return NextResponse.json({ error: '数据验证失败' }, { status: 400 });
  }

  if (error instanceof SyntaxError) {
    return NextResponse.json({ error: '请求格式错误' }, { status: 400 });
  }

  if (error instanceof Error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ error: '服务器错误' }, { status: 500 });
}