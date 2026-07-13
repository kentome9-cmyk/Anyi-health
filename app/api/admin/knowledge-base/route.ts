import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import * as XLSX from 'xlsx';
import { getEmbedding } from '@/lib/openai';

type KnowledgeItem = {
  id: string;
  project: string;
  manifestation: string;
  pairingEffect: string | null;
  symptom: string | null;
  pairingItem: string | null;
  pairingReason: string | null;
  carePlan: string | null;
  effectEstimation: string | null;
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
  project: string;
  manifestation: string;
  pairingEffect: string;
  symptom: string;
  pairingItem: string;
  pairingReason: string;
  carePlan: string;
  effectEstimation: string;
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
    project: string;
    manifestation: string;
    pairingEffect: string;
    symptom: string;
    pairingItem: string;
    pairingReason: string;
    carePlan: string;
    effectEstimation: string;
  }[] = [];

  const isEnglishHeader = headers.some((h) =>
    /project|manifestation|symptom|pairing/i.test(h)
  );

  for (let i = 1; i < lines.length; i++) {
    if (!lines[i].trim()) continue;
    const values = parseLine(lines[i]);
    const row: Record<string, string> = {};
    headers.forEach((header, idx) => {
      row[header] = values[idx] || '';
    });

    if (isEnglishHeader) {
      if (!(row['project'] || row['Project'] || row['PROJECT'])) continue;
      dataList.push({
        project: row['project'] || row['Project'] || '',
        manifestation: row['manifestation'] || row['Manifestation'] || '',
        pairingEffect: row['pairingEffect'] || row['pairing_effect'] || row['Pairing Effect'] || '',
        symptom: row['symptom'] || row['Symptom'] || '',
        pairingItem: row['pairingItem'] || row['pairing_item'] || row['Pairing Item'] || '',
        pairingReason: row['pairingReason'] || row['pairing_reason'] || row['Pairing Reason'] || '',
        carePlan: row['carePlan'] || row['care_plan'] || row['Care Plan'] || '',
        effectEstimation: row['effectEstimation'] || row['effect_estimation'] || row['Effect Estimation'] || '',
      });
    } else {
      if (!(row['项目'] || row['项目名称'] || row['项目分类'])) continue;
      dataList.push({
        project: row['项目'] || row['项目名称'] || row['项目分类'] || '',
        manifestation: row['表现'] || row['表现症状'] || '',
        pairingEffect: row['搭配效果'] || '',
        symptom: row['症状'] || row['症状描述'] || '',
        pairingItem: row['搭配项目'] || '',
        pairingReason: row['搭配原因'] || '',
        carePlan: row['调理规划'] || row['护理方案'] || '',
        effectEstimation: row['效果预估'] || '',
      });
    }
  }
  return dataList;
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const keyword = searchParams.get('keyword') || '';
    const action = searchParams.get('action') || '';

    if (action === 'check-embeddings') {
      const total = await prisma.knowledgeBase.count();
      const items = await prisma.knowledgeBase.findMany({
        select: { id: true, embedding: true },
      });
      const withEmbedding = items.filter(item => item.embedding !== null && item.embedding !== undefined).length;
      const withoutEmbedding = total - withEmbedding;
      
      return NextResponse.json({
        total,
        withEmbedding,
        withoutEmbedding,
        message: `知识库共 ${total} 条数据，其中 ${withEmbedding} 条已有向量，${withoutEmbedding} 条缺少向量`,
      });
    }

    const where: any = {};
    if (keyword) {
      where.OR = [
        { project: { contains: keyword } },
        { manifestation: { contains: keyword } },
        { pairingItem: { contains: keyword } },
        { symptom: { contains: keyword } },
        { carePlan: { contains: keyword } },
        { pairingReason: { contains: keyword } },
      ];
    }

    const list: KnowledgeItem[] = await prisma.knowledgeBase.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });

    const headers = ['项目', '表现', '搭配效果', '症状', '搭配项目', '搭配原因', '调理规划', '效果预估'];

    if (action === 'template') {
      try {
        const sampleRow = [
          '产后熏蒸',
          '产后体虚畏寒、手脚冰凉',
          '驱寒排毒、促进血液循环',
          '产后恢复期畏寒',
          '满月发汗',
          '中医认为产后腠理疏松、寒邪易入侵',
          '建议 2-3 个周期，每周 1-2 次',
          '驱寒效果显著，睡眠质量明显改善',
        ];
        const aoa: any[][] = [headers, sampleRow];
        const ws = XLSX.utils.aoa_to_sheet(aoa);
        ws['!cols'] = [
          { wch: 18 },
          { wch: 40 },
          { wch: 30 },
          { wch: 20 },
          { wch: 18 },
          { wch: 40 },
          { wch: 30 },
          { wch: 30 },
        ];
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, '知识库');
        const dataArr = XLSX.write(wb, { type: 'array', bookType: 'xlsx' });
        const bytes = new Uint8Array(dataArr as number[]);
        return new Response(bytes, {
          status: 200,
          headers: {
            'Content-Type':
              'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            'Content-Disposition':
              'attachment; filename="knowledge-base-template.xlsx"; filename*=UTF-8\'\'' +
              encodeURIComponent('知识库导入模板.xlsx'),
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
          kb.project,
          kb.manifestation,
          kb.pairingEffect,
          kb.symptom,
          kb.pairingItem,
          kb.pairingReason,
          kb.carePlan,
          kb.effectEstimation,
        ])
      );
      const csv = '\ufeff' + [headers.join(','), ...rows].join('\n');
      return new NextResponse(csv, {
        status: 200,
        headers: {
          'Content-Type': 'text/csv; charset=utf-8',
          'Content-Disposition':
            'attachment; filename="knowledge-base-' +
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
            kb.project ?? '',
            kb.manifestation ?? '',
            kb.pairingEffect ?? '',
            kb.symptom ?? '',
            kb.pairingItem ?? '',
            kb.pairingReason ?? '',
            kb.carePlan ?? '',
            kb.effectEstimation ?? '',
          ]);
        });
        const ws = XLSX.utils.aoa_to_sheet(aoa);
        ws['!cols'] = [
          { wch: 18 },
          { wch: 40 },
          { wch: 30 },
          { wch: 20 },
          { wch: 18 },
          { wch: 40 },
          { wch: 30 },
          { wch: 30 },
        ];
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, '知识库');
        const dataArr = XLSX.write(wb, { type: 'array', bookType: 'xlsx' });
        const bytes = new Uint8Array(dataArr as number[]);
        const dateStr = new Date().toISOString().slice(0, 10);
        return new Response(bytes, {
          status: 200,
          headers: {
            'Content-Type':
              'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            'Content-Disposition':
              'attachment; filename="knowledge-base-' +
              dateStr +
              '.xlsx"; filename*=UTF-8\'\'' +
              encodeURIComponent('知识库-' + dateStr + '.xlsx'),
          },
        });
      } catch (err) {
        console.error('Excel export error:', err);
        throw err;
      }
    }

    return NextResponse.json(list);
  } catch (error) {
    console.error('Get knowledge base error:', error);
    return NextResponse.json(
      { error: '获取知识库失败' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();

    if (Array.isArray(body)) {
      const items = body.filter((x: any) => x && x.project);
      if (items.length === 0) {
        return NextResponse.json(
          { error: '批量导入数据为空' },
          { status: 400 }
        );
      }
      const created = await prisma.knowledgeBase.createMany({
        data: items.map((x: any) => ({
          project: x.project || '',
          manifestation: x.manifestation || '',
          pairingEffect: x.pairingEffect || '',
          symptom: x.symptom || '',
          pairingItem: x.pairingItem || '',
          pairingReason: x.pairingReason || '',
          carePlan: x.carePlan || '',
          effectEstimation: x.effectEstimation || '',
        })),
      });
      return NextResponse.json({
        count: created.count,
        message: `成功导入 ${created.count} 条数据`,
      });
    }

    const {
      project,
      manifestation,
      pairingEffect,
      symptom,
      pairingItem,
      pairingReason,
      carePlan,
      effectEstimation,
    } = body;

    if (!project || !manifestation) {
      return NextResponse.json(
        { error: '项目和表现不能为空' },
        { status: 400 }
      );
    }

    const text = [
      project,
      manifestation,
      pairingEffect,
      symptom,
      pairingItem,
      pairingReason,
      carePlan,
      effectEstimation,
    ]
      .filter(Boolean)
      .join(' ');

    const embedding = await getEmbedding(text);

    const knowledge = await prisma.knowledgeBase.create({
      data: {
        project,
        manifestation,
        pairingEffect,
        symptom,
        pairingItem,
        pairingReason,
        carePlan,
        effectEstimation,
        embedding: embedding || undefined,
      },
    });

    return NextResponse.json(knowledge);
  } catch (error) {
    console.error('Create knowledge base error:', error);
    return NextResponse.json(
      { error: '创建知识库条目失败' },
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
        ? await prisma.knowledgeBase.findMany({
            where: { id: { in: ids } },
          })
        : await prisma.knowledgeBase.findMany({});

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
          item.project,
          item.manifestation,
          item.pairingEffect,
          item.symptom,
          item.pairingItem,
          item.pairingReason,
          item.carePlan,
          item.effectEstimation,
        ]
          .filter(Boolean)
          .join(' ');

        const embedding = await getEmbedding(text);

        if (embedding) {
          await prisma.knowledgeBase.update({
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

    const result = await prisma.knowledgeBase.deleteMany({
      where: { id: { in: ids } },
    });

    return NextResponse.json({
      count: result.count,
      message: `成功删除 ${result.count} 条数据`,
    });
  } catch (error) {
    console.error('Batch delete knowledge base error:', error);
    return NextResponse.json(
      { error: '批量删除失败' },
      { status: 500 }
    );
  }
}
