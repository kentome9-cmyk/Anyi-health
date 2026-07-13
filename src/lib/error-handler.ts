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

function formatErrorLog(error: unknown): string {
  const timestamp = new Date().toISOString();
  let log = `[${timestamp}] `;
  
  if (error instanceof Error) {
    log += `Error: ${error.message}\n`;
    if (error.stack) {
      log += `Stack: ${error.stack}\n`;
    }
    if ('code' in error && error.code) {
      log += `Code: ${error.code}\n`;
    }
    if ('statusCode' in error && error.statusCode) {
      log += `Status: ${error.statusCode}\n`;
    }
  } else {
    log += `Unknown error: ${JSON.stringify(error, null, 2)}\n`;
  }
  
  return log;
}

export function logError(error: unknown): void {
  const log = formatErrorLog(error);
  console.error(log);
  
  if (process.env.NODE_ENV === 'production') {
    try {
      const fs = require('fs');
      const path = require('path');
      const logPath = path.join(process.cwd(), 'logs', 'error.log');
      
      if (!fs.existsSync(path.dirname(logPath))) {
        fs.mkdirSync(path.dirname(logPath), { recursive: true });
      }
      
      fs.appendFileSync(logPath, log + '\n');
    } catch {
      console.error('Failed to write error log to file');
    }
  }
}

export function handleError(error: unknown): NextResponse {
  logError(error);

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

export function withErrorHandling<T>(handler: () => Promise<T>): Promise<T | NextResponse> {
  return handler().catch(error => {
    return handleError(error);
  });
}
