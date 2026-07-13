import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import * as XLSX from 'xlsx';
import { requireAdmin, handleAuthError } from '@/lib/auth';
import { getEmbedding } from '@/lib/openai';

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

const MAX_FILE_SIZE = 10 * 1024 * 1024;
const MAX_ROWS = 1000;
const MAX_COLS = 50;

function parseRows(rows: any[][]): KnowledgeRow[] {
  if (rows.length < 2) return [];

  const headers = (rows[0] || []).map((h: any) => {
    const s = h == null ? '' : String(h).trim();
    return s;
  });

  if (headers.length > MAX_COLS) {
    return [];
  }

  const isEnglishHeader = headers.some((h: string) =>
    /project|manifestation|symptom|pairing/i.test(h)
  );

  const dataList: KnowledgeRow[] = [];

  for (let i = 1; i < Math.min(rows.length, MAX_ROWS + 1); i++) {
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
  if (rows.length > 0 && rows[0].length > MAX_COLS) {
    return [];
  }
  return parseRows(rows.slice(0, MAX_ROWS + 1));
}

export async function POST(request: Request) {
  try {
    await requireAdmin();
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

      if (file.size > MAX_FILE_SIZE) {
        return NextResponse.json(
          { error: `文件大小超过限制，最大允许 ${(MAX_FILE_SIZE / (1024 * 1024)).toFixed(1)} MB` },
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

      try {
        await prisma.knowledgeBase.create({
          data: {
            project: item.project || '',
            manifestation: item.manifestation || '',
            pairingEffect: item.pairingEffect || '',
            symptom: item.symptom || '',
            pairingItem: item.pairingItem || '',
            pairingReason: item.pairingReason || '',
            carePlan: item.carePlan || '',
            effectEstimation: item.effectEstimation || '',
            embedding: embedding || undefined,
          },
        });
        successCount++;
      } catch {
        failCount++;
      }
    }

    return NextResponse.json({
      count: successCount,
      failCount,
      message: `成功导入 ${successCount} 条数据，失败 ${failCount} 条`,
    });
  } catch (error) {
    return handleAuthError(error);
  }
}