import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import * as XLSX from 'xlsx';
import { getEmbedding } from '@/lib/openai';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const keyword = searchParams.get('keyword') || '';
    const category = searchParams.get('category') || '';
    const action = searchParams.get('action') || '';

    const where: any = {};
    if (keyword) {
      where.OR = [
        { name: { contains: keyword } },
        { category: { contains: keyword } },
        { ingredients: { contains: keyword } },
        { effects: { contains: keyword } },
        { targetAudience: { contains: keyword } },
        { usage: { contains: keyword } },
      ];
    }
    if (category) {
      where.category = category;
    }

    const list = await prisma.product.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });

    const headers = ['分类', '产品名称', '规格', '价格', '主要成分', '产品功效', '适用人群', '使用方式'];

    if (action === 'template') {
      const sampleRow = [
        '私护产品系列',
        '雪莲护理贴',
        '10片/盒',
        '168元',
        '天山雪莲、益母草、蛇床子、苦参、元胡、当归等',
        '清宫排毒、私处养护',
        '宫寒、痛经、月经不调人群',
        '贴在内裤上，每天1片，10小时后取下',
      ];
      const aoa: any[][] = [headers, sampleRow];
      const ws = XLSX.utils.aoa_to_sheet(aoa);
      ws['!cols'] = [
        { wch: 15 }, { wch: 20 }, { wch: 12 }, { wch: 10 },
        { wch: 30 }, { wch: 30 }, { wch: 30 }, { wch: 30 },
      ];
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, '产品库');
      const dataArr = XLSX.write(wb, { type: 'array', bookType: 'xlsx' });
      const bytes = new Uint8Array(dataArr as number[]);
      return new Response(bytes, {
        status: 200,
        headers: {
          'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          'Content-Disposition':
            'attachment; filename="product-template.xlsx"; filename*=UTF-8\'\'' +
            encodeURIComponent('产品库导入模板.xlsx'),
        },
      });
    }

    if (action === 'export-xlsx') {
      const aoa: any[][] = [headers];
      list.forEach((p) => {
        aoa.push([
          p.category ?? '', p.name ?? '', p.spec ?? '', p.price ?? '',
          p.ingredients ?? '', p.effects ?? '', p.targetAudience ?? '', p.usage ?? '',
        ]);
      });
      const ws = XLSX.utils.aoa_to_sheet(aoa);
      ws['!cols'] = [
        { wch: 15 }, { wch: 20 }, { wch: 12 }, { wch: 10 },
        { wch: 30 }, { wch: 30 }, { wch: 30 }, { wch: 30 },
      ];
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, '产品库');
      const dataArr = XLSX.write(wb, { type: 'array', bookType: 'xlsx' });
      const bytes = new Uint8Array(dataArr as number[]);
      const dateStr = new Date().toISOString().slice(0, 10);
      return new Response(bytes, {
        status: 200,
        headers: {
          'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          'Content-Disposition':
            'attachment; filename="products-' + dateStr + '.xlsx"; filename*=UTF-8\'\'' +
            encodeURIComponent('产品库-' + dateStr + '.xlsx'),
        },
      });
    }

    return NextResponse.json(list);
  } catch (error) {
    console.error('Get products error:', error);
    return NextResponse.json({ error: '获取产品列表失败' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { category, name, spec, price, ingredients, effects, targetAudience, usage } = body;

    if (!category || !name) {
      return NextResponse.json({ error: '分类和产品名称不能为空' }, { status: 400 });
    }

    const text = [name, category, effects, targetAudience, ingredients]
      .filter(Boolean)
      .join(' ');
    const embedding = await getEmbedding(text);

    const product = await prisma.product.create({
      data: {
        category, name, spec, price, ingredients, effects, targetAudience, usage,
        embedding: embedding || undefined,
      },
    });

    return NextResponse.json(product);
  } catch (error) {
    console.error('Create product error:', error);
    return NextResponse.json({ error: '创建产品失败' }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const action = body.action || '';

    if (action === 'generate-embeddings') {
      const { ids } = body;

      let items = ids
        ? await prisma.product.findMany({ where: { id: { in: ids } } })
        : await prisma.product.findMany({});

      if (!ids) {
        items = items.filter((item) => !item.embedding);
      }

      if (items.length === 0) {
        return NextResponse.json({
          success: true,
          message: '没有需要生成向量的产品',
          count: 0,
        });
      }

      let successCount = 0;
      let failCount = 0;

      for (const item of items) {
        const text = [item.name, item.category, item.effects, item.targetAudience, item.ingredients]
          .filter(Boolean)
          .join(' ');
        const embedding = await getEmbedding(text);
        if (embedding) {
          await prisma.product.update({
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
      return NextResponse.json({ error: '请选择要删除的产品' }, { status: 400 });
    }

    const result = await prisma.product.deleteMany({
      where: { id: { in: ids } },
    });

    return NextResponse.json({
      count: result.count,
      message: `成功删除 ${result.count} 条数据`,
    });
  } catch (error) {
    console.error('Batch delete products error:', error);
    return NextResponse.json({ error: '批量删除失败' }, { status: 500 });
  }
}
