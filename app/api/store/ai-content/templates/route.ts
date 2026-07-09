import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const type = url.searchParams.get('type'); // script 或 rewrite

    if (!type) {
      return NextResponse.json({ templates: [], error: '缺少type参数' }, { status: 400 });
    }

    const templates = await prisma.prompt.findMany({
      where: {
        type: type,
        isActive: true,
      },
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'desc' }],
    });

    const formattedTemplates = templates.map(t => ({
      id: t.id,
      name: t.name,
      description: t.description,
      content: t.content, // prompt 字段映射到 content
      type: t.type,
    }));

    return NextResponse.json({ templates: formattedTemplates });
  } catch (error) {
    console.error('Failed to get templates:', error);
    return NextResponse.json({ templates: [] });
  }
}
