import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import * as XLSX from 'xlsx';
import { getEmbedding } from '@/lib/openai';

type MenstrualKnowledgeItem = {
  id: string;
  category: string;
  symptom: string;
  cause: string;
  suggestion: string;
  dietAdvice: string;
  lifestyleAdvice: string;
  attention: string;
  createdAt: Date;
  updatedAt: Date;
};

function toCSVRow(fields: (string | null | undefined)[]): string {
  return fields
    .map((f) => {
      const s = (f ?? '').toString();
      if (s.includes(',') || s.includes('"') || s.includes('\n')) {
        return '"' + s.replace(/"/g, '""') + '"';
      }
      return s;
    })
    .join(',');
}

function parseCSV(content: string): {
  category: string;
  symptom: string;
  cause: string;
  suggestion: string;
  dietAdvice: string;
  lifestyleAdvice: string;
  attention: string;
}[] {
  const lines = content.trim().split(/\r?\n/);
  if (lines.length < 2) return [];

  const parseLine = (line: string): string[] => {
    const result: string[] = [];
    let current = '';
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (inQuotes) {
        if (ch === '"' && line[i + 1] === '"') {
          current += '"';
          i++;
        } else if (ch === '"') {
          inQuotes = false;
        } else {
          current += ch;
        }
      } else {
        if (ch === '"') {
          inQuotes = true;
        } else if (ch === ',') {
          result.push(current);
          current = '';
        } else {
          current += ch;
        }
      }
    }
    result.push(current);
    return result.map((s) => s.trim());
  };

  const headers = parseLine(lines[0]).map((h) => h.trim());
  const dataList: {
    category: string;
    symptom: string;
    cause: string;
    suggestion: string;
    dietAdvice: string;
    lifestyleAdvice: string;
    attention: string;
  }[] = [];

  for (let i = 1; i < lines.length; i++) {
    if (!lines[i].trim()) continue;
    const values = parseLine(lines[i]);
    const row: Record<string, string> = {};
    headers.forEach((header, idx) => {
      row[header] = values[idx] || '';
    });

    if (!(row['分类'] || row['类别'] || row['category'])) continue;
    dataList.push({
      category: row['分类'] || row['类别'] || row['category'] || '',
      symptom: row['症状'] || row['症状表现'] || row['symptom'] || '',
      cause: row['原因'] || row['原因分析'] || row['cause'] || '',
      suggestion: row['建议'] || row['建议方案'] || row['suggestion'] || '',
      dietAdvice: row['饮食'] || row['饮食建议'] || row['dietAdvice'] || '',
      lifestyleAdvice: row['生活'] || row['生活建议'] || row['lifestyleAdvice'] || '',
      attention: row['注意'] || row['注意事项'] || row['attention'] || '',
    });
  }
  return dataList;
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const keyword = searchParams.get('keyword') || '';
    const category = searchParams.get('category') || '';
    const action = searchParams.get('action') || '';

    const where: any = {};
    if (keyword) {
      where.OR = [
        { category: { contains: keyword } },
        { symptom: { contains: keyword } },
        { cause: { contains: keyword } },
        { suggestion: { contains: keyword } },
        { dietAdvice: { contains: keyword } },
        { lifestyleAdvice: { contains: keyword } },
        { attention: { contains: keyword } },
      ];
    }
    if (category) {
      where.category = category;
    }

    const list: MenstrualKnowledgeItem[] = await prisma.menstrualKnowledgeBase.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });

    const headers = ['分类', '症状表现', '原因分析', '建议方案', '饮食建议', '生活建议', '注意事项'];

    if (action === 'template') {
      try {
        const sampleRow = [
          '痛经调理',
          '经期腹部疼痛、坠胀感',
          '气滞血瘀、寒凝胞宫',
          '温经散寒、活血化瘀',
          '忌食生冷，多喝红糖姜茶',
          '热敷腹部，适当运动',
          '避免剧烈运动，保持温暖',
        ];
        const aoa: any[][] = [headers, sampleRow];
        const ws = XLSX.utils.aoa_to_sheet(aoa);
        ws['!cols'] = [
          { wch: 15 },
          { wch: 30 },
          { wch: 30 },
          { wch: 30 },
          { wch: 30 },
          { wch: 30 },
          { wch: 30 },
        ];
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, '月经知识库');
        const dataArr = XLSX.write(wb, { type: 'array', bookType: 'xlsx' });
        const bytes = new Uint8Array(dataArr as number[]);
        return new Response(bytes, {
          status: 200,
          headers: {
            'Content-Type':
              'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            'Content-Disposition':
              'attachment; filename="menstrual-knowledge-base-template.xlsx"; filename*=UTF-8\'\'' +
              encodeURIComponent('月经知识库导入模板.xlsx'),
          },
        });
      } catch (err) {
        console.error('Excel template error:', err);
        throw err;
      }
    }

    if (action === 'export') {
      const rows = list.map((kb) =>
        toCSVRow([
          kb.category,
          kb.symptom,
          kb.cause,
          kb.suggestion,
          kb.dietAdvice,
          kb.lifestyleAdvice,
          kb.attention,
        ])
      );
      const csv = '\ufeff' + [headers.join(','), ...rows].join('\n');
      return new NextResponse(csv, {
        status: 200,
        headers: {
          'Content-Type': 'text/csv; charset=utf-8',
          'Content-Disposition':
            'attachment; filename="menstrual-knowledge-base-' +
            new Date().toISOString().slice(0, 10) +
            '.csv"',
        },
      });
    }

    if (action === 'export-xlsx') {
      try {
        const aoa: any[][] = [headers];
        list.forEach((kb) => {
          aoa.push([
            kb.category ?? '',
            kb.symptom ?? '',
            kb.cause ?? '',
            kb.suggestion ?? '',
            kb.dietAdvice ?? '',
            kb.lifestyleAdvice ?? '',
            kb.attention ?? '',
          ]);
        });
        const ws = XLSX.utils.aoa_to_sheet(aoa);
        ws['!cols'] = [
          { wch: 15 },
          { wch: 30 },
          { wch: 30 },
          { wch: 30 },
          { wch: 30 },
          { wch: 30 },
          { wch: 30 },
        ];
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, '月经知识库');
        const dataArr = XLSX.write(wb, { type: 'array', bookType: 'xlsx' });
        const bytes = new Uint8Array(dataArr as number[]);
        const dateStr = new Date().toISOString().slice(0, 10);
        return new Response(bytes, {
          status: 200,
          headers: {
            'Content-Type':
              'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            'Content-Disposition':
              'attachment; filename="menstrual-knowledge-base-' +
              dateStr +
              '.xlsx"; filename*=UTF-8\'\'' +
              encodeURIComponent('月经知识库-' + dateStr + '.xlsx'),
          },
        });
      } catch (err) {
        console.error('Excel export error:', err);
        throw err;
      }
    }

    return NextResponse.json(list);
  } catch (error) {
    console.error('Get menstrual knowledge base error:', error);
    return NextResponse.json(
      { error: '获取月经知识库失败' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();

    if (Array.isArray(body)) {
      const items = body.filter((x: any) => x && x.category && x.symptom);
      if (items.length === 0) {
        return NextResponse.json(
          { error: '批量导入数据为空' },
          { status: 400 }
        );
      }
      const created = await prisma.menstrualKnowledgeBase.createMany({
        data: items.map((x: any) => ({
          category: x.category || '',
          symptom: x.symptom || '',
          cause: x.cause || '',
          suggestion: x.suggestion || '',
          dietAdvice: x.dietAdvice || '',
          lifestyleAdvice: x.lifestyleAdvice || '',
          attention: x.attention || '',
        })),
      });
      return NextResponse.json({
        count: created.count,
        message: `成功导入 ${created.count} 条数据`,
      });
    }

    const {
      category,
      symptom,
      cause,
      suggestion,
      dietAdvice,
      lifestyleAdvice,
      attention,
    } = body;

    if (!category || !symptom) {
      return NextResponse.json(
        { error: '分类和症状不能为空' },
        { status: 400 }
      );
    }

    const text = [
      category,
      symptom,
      cause,
      suggestion,
      dietAdvice,
      lifestyleAdvice,
      attention,
    ]
      .filter(Boolean)
      .join(' ');

    const embedding = await getEmbedding(text);

    const knowledge = await prisma.menstrualKnowledgeBase.create({
      data: {
        category,
        symptom,
        cause,
        suggestion,
        dietAdvice,
        lifestyleAdvice,
        attention,
        embedding: embedding || undefined,
      },
    });

    return NextResponse.json(knowledge);
  } catch (error) {
    console.error('Create menstrual knowledge base error:', error);
    return NextResponse.json(
      { error: '创建月经知识库条目失败' },
      { status: 500 }
    );
  }
}

export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const action = body.action || '';

    if (action === 'generate-embeddings') {
      const { ids } = body;

      let items = ids
        ? await prisma.menstrualKnowledgeBase.findMany({
            where: { id: { in: ids } },
          })
        : await prisma.menstrualKnowledgeBase.findMany({});

      if (!ids) {
        items = items.filter((item) => !item.embedding);
      }

      if (items.length === 0) {
        return NextResponse.json({
          success: true,
          message: '没有需要生成向量的知识条目',
          count: 0,
        });
      }

      let successCount = 0;
      let failCount = 0;

      for (const item of items) {
        const text = [
          item.category,
          item.symptom,
          item.cause,
          item.suggestion,
          item.dietAdvice,
          item.lifestyleAdvice,
          item.attention,
        ]
          .filter(Boolean)
          .join(' ');

        const embedding = await getEmbedding(text);

        if (embedding) {
          await prisma.menstrualKnowledgeBase.update({
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

    return NextResponse.json(
      { error: '未知操作' },
      { status: 400 }
    );
  } catch (error) {
    console.error('Generate embeddings error:', error);
    return NextResponse.json(
      { error: '生成向量失败' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request) {
  try {
    const body = await request.json();
    const { ids } = body;

    if (!Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json(
        { error: '请选择要删除的条目' },
        { status: 400 }
      );
    }

    const result = await prisma.menstrualKnowledgeBase.deleteMany({
      where: { id: { in: ids } },
    });

    return NextResponse.json({
      count: result.count,
      message: `成功删除 ${result.count} 条数据`,
    });
  } catch (error) {
    console.error('Batch delete menstrual knowledge base error:', error);
    return NextResponse.json(
      { error: '批量删除失败' },
      { status: 500 }
    );
  }
}
