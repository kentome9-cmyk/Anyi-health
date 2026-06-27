import { redirect } from 'next/navigation';
import { prisma } from '@/lib/prisma';

// 强制使用 Node.js 运行时
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

async function checkInstalled(): Promise<boolean> {
  try {
    const count = await prisma.admin.count();
    return count > 0;
  } catch {
    return false;
  }
}

export default async function Home() {
  const installed = await checkInstalled();
  if (!installed) {
    redirect('/install');
  }
  redirect('/login');
}
