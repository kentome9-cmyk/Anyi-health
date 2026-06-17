import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import * as XLSX from 'xlsx';

interface KnowledgeRow {
  project: string;
  manifestation: string;
  pairingEffect: string;
  symptom: string;
  pairingItem: string;
  pairingReason: string;
  carePlan: string;
  effectEstimation: string;
}

function parseRows(rows: any[][]): KnowledgeRow[] {
  if (rows.length < 2) return [];

  const headers = (rows[0] || []).map((h: any) => {
    const s = h == null ? '' : String(h).trim();
    return s;
  });

  const isEnglishHeader = headers.some((h: string) =>
    /project|manifestation|symptom|pairing/i.test(h)
  );

  const dataList: KnowledgeRow[] = [];

  for (let i = 1; i < rows.length; i++) {
    const rowValues = rows[i] || [];
    if (rowValues.every((v: any) => v == null || String(v).trim() === '')) continue;

    const row: Record<string, string> = {};
    headers.forEach((header: string, idx: number) => {
      const val = rowValues[idx];
      row[header] = val == null ? '' : String(val).trim();
    });

    if (isEnglishHeader) {
      if (!(row['project'] || row['Project'] || row['PROJECT'])) continue;
      dataList.push({
        project: row['project'] || row['Project'] || '',
        manifestation: row['manifestation'] || row['Manifestation'] || '',
        pairingEffect:
          row['pairingEffect'] || row['pairing_effect'] || row['Pairing Effect'] || '',
        symptom: row['symptom'] || row['Symptom'] || '',
        pairingItem: row['pairingItem'] || row['pairing_item'] || row['Pairing Item'] || '',
        pairingReason: row['pairingReason'] || row['pairing_reason'] || row['Pairing Reason'] || '',
        carePlan: row['carePlan'] || row['care_plan'] || row['Care Plan'] || '',
        effectEstimation:
          row['effectEstimation'] || row['effect_estimation'] || row['Effect Estimation'] || '',
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

function parseCSVContent(content: string): KnowledgeRow[] {
  const cleanContent = content.replace(/^\ufeff/, '');
  const lines = cleanContent.split(/\r?\n/).filter((l) => l.trim());
  if (lines.length < 2) return [];

  const parseCSVLine = (line: string): string[] => {
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

  const rows: string[][] = lines.map(parseCSVLine);
  return parseRows(rows);
}

function isExcelFile(file: File): boolean {
  const name = (file.name || '').toLowerCase();
  return (
    name.endsWith('.xlsx') ||
    name.endsWith('.xls') ||
    name.endsWith('.xlsm') ||
    name.endsWith('.csv')
  );
}

export async function POST(request: Request) {
  try {
    const contentType = request.headers.get('content-type') || '';

    let parsedData: KnowledgeRow[] = [];

    if (contentType.includes('multipart/form-data')) {
      const formData = await request.formData();
      const file = formData.get('file') as File | null;
      if (!file) {
        return NextResponse.json(
          { error: '未找到上传文件' },
          { status: 400 }
        );
      }

      const fileName = (file.name || '').toLowerCase();

      if (fileName.endsWith('.csv')) {
        const text = await file.text();
        parsedData = parseCSVContent(text);
      } else if (
        fileName.endsWith('.xlsx') ||
        fileName.endsWith('.xls') ||
        fileName.endsWith('.xlsm')
      ) {
        const arrayBuffer = await file.arrayBuffer();
        const workbook = XLSX.read(arrayBuffer, { type: 'array' });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        const rows = XLSX.utils.sheet_to_json<any[]>(worksheet, { header: 1, defval: '' });
        parsedData = parseRows(rows);
      } else {
        return NextResponse.json(
          { error: '不支持的文件格式，请上传 .csv、.xlsx 或 .xls 文件' },
          { status: 400 }
        );
      }
    } else {
      const body = await request.json();
      if (typeof body.csv === 'string') {
        parsedData = parseCSVContent(body.csv);
      } else if (Array.isArray(body.data)) {
        parsedData = body.data;
      }
    }

    if (parsedData.length === 0) {
      return NextResponse.json(
        { error: '未解析到有效数据，请检查文件格式和表头' },
        { status: 400 }
      );
    }

    const items = parsedData.filter((x) => x && x.project);
    const created = await prisma.knowledgeBase.createMany({
      data: items.map((x) => ({
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
  } catch (error) {
    console.error('Import knowledge base error:', error);
    return NextResponse.json(
      { error: '导入失败，请检查文件格式' },
      { status: 500 }
    );
  }
}
