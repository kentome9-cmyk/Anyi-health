import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const roleId = url.searchParams.get('roleId');

    const where: any = { isActive: true };
    if (roleId) {
      where.roleId = roleId;
    }

    const templates = await prisma.contentTemplate.findMany({
      where,
      include: {
        role: {
          select: { name: true },
        },
      },
      orderBy: [{ usageCount: 'desc' }, { createdAt: 'desc' }],
    });

    const formattedTemplates = templates.map(t => ({
      id: t.id,
      name: t.name,
      description: t.description,
      prompt: t.prompt,
      outputFormat: t.outputFormat,
      exampleOutput: t.exampleOutput,
      category: t.role?.name || '通用模板',
    }));

    return NextResponse.json({ templates: formattedTemplates });
  } catch (error) {
    console.error('Failed to get templates:', error);
    return NextResponse.json({ templates: [] });
  }
}
