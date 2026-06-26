import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import * as XLSX from 'xlsx';
import { getEmbedding } from '@/lib/openai';

type EmbeddingField =
  | 'category'
  | 'symptom'
  | 'cause'
  | 'suggestion'
  | 'dietAdvice'
  | 'lifestyleAdvice'
  | 'attention';

const ALL_FIELDS: EmbeddingField[] = [
  'category',
  'symptom',
  'cause',
  'suggestion',
  'dietAdvice',
  'lifestyleAdvice',
  'attention',
];

function parseCSV(content: string): any[] {
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
  const dataList: any[] = [];

  for (let i = 1; i < lines.length; i++) {
    if (!lines[i].trim()) continue;
    const values = parseLine(lines[i]);
    const row: Record<string, string> = {};
    headers.forEach((header, idx) => {
      row[header] = values[idx] || '';
    });

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

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const embeddingFieldsStr = formData.get('embeddingFields') as string;
    const autoGenerateEmbedding = formData.get('autoGenerateEmbedding') === 'true';

    if (!file) {
      return NextResponse.json({ error: '请上传文件' }, { status: 400 });
    }

    const extension = file.name.split('.').pop()?.toLowerCase();
    if (!['csv', 'xlsx', 'xls'].includes(extension || '')) {
      return NextResponse.json({ error: '仅支持 CSV 或 Excel 文件' }, { status: 400 });
    }

    let embeddingFields: EmbeddingField[] = ALL_FIELDS;
    if (embeddingFieldsStr) {
      try {
        const parsed = JSON.parse(embeddingFieldsStr);
        if (Array.isArray(parsed) && parsed.length > 0) {
          embeddingFields = parsed.filter((f) => ALL_FIELDS.includes(f));
        }
      } catch {
        // ignore, use default
      }
    }

    let items: any[] = [];

    if (extension === 'csv') {
      const text = await file.text();
      items = parseCSV(text);
    } else {
      const arrayBuffer = await file.arrayBuffer();
      const dataArr = new Uint8Array(arrayBuffer);
      const workbook = XLSX.read(dataArr, { type: 'array' });
      const sheetName = workbook.SheetNames[0];
      const sheet = workbook.Sheets[sheetName];
      const data = XLSX.utils.sheet_to_json(sheet, { header: 1 }) as any[][];

      if (data.length < 2) {
        return NextResponse.json({ error: '文件内容为空或格式不正确' }, { status: 400 });
      }

      const headers = (data[0] as string[]).map((h) => String(h || '').trim());

      for (let i = 1; i < data.length; i++) {
        const row = data[i];
        if (!row) continue;
        const rowData: Record<string, string> = {};
        headers.forEach((header, idx) => {
          rowData[header] = row[idx] != null ? String(row[idx]) : '';
        });

        items.push({
          category: rowData['分类'] || rowData['类别'] || rowData['category'] || '',
          symptom: rowData['症状'] || rowData['症状表现'] || rowData['symptom'] || '',
          cause: rowData['原因'] || rowData['原因分析'] || rowData['cause'] || '',
          suggestion: rowData['建议'] || rowData['建议方案'] || rowData['suggestion'] || '',
          dietAdvice: rowData['饮食'] || rowData['饮食建议'] || rowData['dietAdvice'] || '',
          lifestyleAdvice: rowData['生活'] || rowData['生活建议'] || rowData['lifestyleAdvice'] || '',
          attention: rowData['注意'] || rowData['注意事项'] || rowData['attention'] || '',
        });
      }
    }

    items = items.filter((x) => x.category && x.symptom);

    if (items.length === 0) {
      return NextResponse.json({ error: '未解析到有效数据，请检查文件格式' }, { status: 400 });
    }

    const MAX_IMPORT = 200;
    if (items.length > MAX_IMPORT) {
      return NextResponse.json(
        { error: `单次导入不超过 ${MAX_IMPORT} 条数据，请分批导入` },
        { status: 400 }
      );
    }

    let successCount = 0;
    let embeddingSuccessCount = 0;
    let embeddingFailCount = 0;

    for (const item of items) {
      let embedding: number[] | null = null;

      if (autoGenerateEmbedding) {
        const textParts = embeddingFields
          .map((field) => item[field])
          .filter(Boolean);
        const text = textParts.join(' ');

        if (text.trim()) {
          embedding = await getEmbedding(text);
          if (embedding) {
            embeddingSuccessCount++;
          } else {
            embeddingFailCount++;
          }
        }
      }

      try {
        await prisma.menstrualKnowledgeBase.create({
          data: {
            category: item.category || '',
            symptom: item.symptom || '',
            cause: item.cause || '',
            suggestion: item.suggestion || '',
            dietAdvice: item.dietAdvice || '',
            lifestyleAdvice: item.lifestyleAdvice || '',
            attention: item.attention || '',
            embedding: embedding || undefined,
          },
        });
        successCount++;
      } catch (err) {
        console.error('Create item error:', err);
      }
    }

    let message = `成功导入 ${successCount} 条数据`;
    if (autoGenerateEmbedding) {
      message += `，向量生成成功 ${embeddingSuccessCount} 条，失败 ${embeddingFailCount} 条`;
    }

    return NextResponse.json({
      success: true,
      count: successCount,
      total: items.length,
      embeddingSuccessCount,
      embeddingFailCount,
      message,
    });
  } catch (error) {
    console.error('Import menstrual knowledge base error:', error);
    return NextResponse.json(
      { error: '导入失败：' + (error as Error).message },
      { status: 500 }
    );
  }
}
