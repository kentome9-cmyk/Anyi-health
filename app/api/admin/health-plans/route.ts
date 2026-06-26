import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import * as XLSX from 'xlsx';
import { getEmbedding } from '@/lib/openai';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const keyword = searchParams.get('keyword') || '';
    const type = searchParams.get('type') || '';
    const action = searchParams.get('action') || '';

    const where: any = {};
    if (keyword) {
      where.OR = [
        { type: { contains: keyword } },
        { targetAudience: { contains: keyword } },
        { productCombo: { contains: keyword } },
        { usage: { contains: keyword } },
      ];
    }
    if (type) {
      where.type = type;
    }

    const list = await prisma.healthPlan.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });

    const headers = ['调理类型', '适用人群', '推荐产品组合', '使用方式'];

    if (action === 'template') {
      const sampleRow = [
        '补气血（早晚组合）',
        '术后/气血不足/产后虚弱/久坐上班族/运动少人群',
        '红参阿胶饮*1+红石榴叶酸铁饮品*1',
        '早上红参阿胶饮1支，晚上红石榴叶酸铁饮品1支（餐后吸收效果最佳）',
      ];
      const aoa: any[][] = [headers, sampleRow];
      const ws = XLSX.utils.aoa_to_sheet(aoa);
      ws['!cols'] = [
        { wch: 20 }, { wch: 40 }, { wch: 40 }, { wch: 50 },
      ];
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, '调理方案');
      const dataArr = XLSX.write(wb, { type: 'array', bookType: 'xlsx' });
      const bytes = new Uint8Array(dataArr as number[]);
      return new Response(bytes, {
        status: 200,
        headers: {
          'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          'Content-Disposition':
            'attachment; filename="health-plan-template.xlsx"; filename*=UTF-8\'\'' +
            encodeURIComponent('调理方案导入模板.xlsx'),
        },
      });
    }

    if (action === 'export-xlsx') {
      const aoa: any[][] = [headers];
      list.forEach((p) => {
        aoa.push([
          p.type ?? '', p.targetAudience ?? '', p.productCombo ?? '', p.usage ?? '',
        ]);
      });
      const ws = XLSX.utils.aoa_to_sheet(aoa);
      ws['!cols'] = [
        { wch: 20 }, { wch: 40 }, { wch: 40 }, { wch: 50 },
      ];
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, '调理方案');
      const dataArr = XLSX.write(wb, { type: 'array', bookType: 'xlsx' });
      const bytes = new Uint8Array(dataArr as number[]);
      const dateStr = new Date().toISOString().slice(0, 10);
      return new Response(bytes, {
        status: 200,
        headers: {
          'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          'Content-Disposition':
            'attachment; filename="health-plans-' + dateStr + '.xlsx"; filename*=UTF-8\'\'' +
            encodeURIComponent('调理方案-' + dateStr + '.xlsx'),
        },
      });
    }

    return NextResponse.json(list);
  } catch (error) {
    console.error('Get health plans error:', error);
    return NextResponse.json({ error: '获取调理方案列表失败' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { type, targetAudience, productCombo, usage } = body;

    if (!type) {
      return NextResponse.json({ error: '调理类型不能为空' }, { status: 400 });
    }

    const text = [type, targetAudience, productCombo]
      .filter(Boolean)
      .join(' ');
    const embedding = await getEmbedding(text);

    const plan = await prisma.healthPlan.create({
      data: {
        type, targetAudience, productCombo, usage,
        embedding: embedding || undefined,
      },
    });

    return NextResponse.json(plan);
  } catch (error) {
    console.error('Create health plan error:', error);
    return NextResponse.json({ error: '创建调理方案失败' }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const action = body.action || '';

    if (action === 'generate-embeddings') {
      const { ids } = body;

      let items = ids
        ? await prisma.healthPlan.findMany({ where: { id: { in: ids } } })
        : await prisma.healthPlan.findMany({});

      if (!ids) {
        items = items.filter((item) => !item.embedding);
      }

      if (items.length === 0) {
        return NextResponse.json({
          success: true,
          message: '没有需要生成向量的方案',
          count: 0,
        });
      }

      let successCount = 0;
      let failCount = 0;

      for (const item of items) {
        const text = [item.type, item.targetAudience, item.productCombo]
          .filter(Boolean)
          .join(' ');
        const embedding = await getEmbedding(text);
        if (embedding) {
          await prisma.healthPlan.update({
            where: { id: item.id },
            data: { embedding },
          });
          successCount++;
        } else {
          failCount++;
        }
      }

      return NextResponse.json({
        success: true,
        message: `向量生成完成：成功 ${successCount} 条，失败 ${failCount} 条`,
        count: successCount,
        failCount,
      });
    }

    return NextResponse.json({ error: '未知操作' }, { status: 400 });
  } catch (error) {
    console.error('Generate embeddings error:', error);
    return NextResponse.json({ error: '生成向量失败' }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const body = await request.json();
    const { ids } = body;

    if (!Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json({ error: '请选择要删除的方案' }, { status: 400 });
    }

    const result = await prisma.healthPlan.deleteMany({
      where: { id: { in: ids } },
    });

    return NextResponse.json({
      count: result.count,
      message: `成功删除 ${result.count} 条数据`,
    });
  } catch (error) {
    console.error('Batch delete health plans error:', error);
    return NextResponse.json({ error: '批量删除失败' }, { status: 500 });
  }
}
