import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import * as XLSX from 'xlsx';
import { getEmbedding } from '@/lib/openai';

type EmbeddingField =
  | 'category'
  | 'name'
  | 'ingredients'
  | 'effects'
  | 'targetAudience'
  | 'usage';

const ALL_FIELDS: EmbeddingField[] = [
  'category',
  'name',
  'ingredients',
  'effects',
  'targetAudience',
  'usage',
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
      category: row['分类'] || row['产品分类'] || row['category'] || '',
      name: row['产品名称'] || row['名称'] || row['name'] || '',
      spec: row['规格'] || row['spec'] || '',
      price: row['价格'] || row['price'] || '',
      ingredients: row['主要成分'] || row['成分'] || row['ingredients'] || '',
      effects: row['产品功效'] || row['功效'] || row['effects'] || '',
      targetAudience: row['适用人群'] || row['targetAudience'] || '',
      usage: row['使用方式'] || row['用法'] || row['usage'] || '',
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
          category: rowData['分类'] || rowData['产品分类'] || rowData['category'] || '',
          name: rowData['产品名称'] || rowData['名称'] || rowData['name'] || '',
          spec: rowData['规格'] || rowData['spec'] || '',
          price: rowData['价格'] || rowData['price'] || '',
          ingredients: rowData['主要成分'] || rowData['成分'] || rowData['ingredients'] || '',
          effects: rowData['产品功效'] || rowData['功效'] || rowData['effects'] || '',
          targetAudience: rowData['适用人群'] || rowData['targetAudience'] || '',
          usage: rowData['使用方式'] || rowData['用法'] || rowData['usage'] || '',
        });
      }
    }

    items = items.filter((x) => x.category && x.name);

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
        await prisma.product.create({
          data: {
            category: item.category || '',
            name: item.name || '',
            spec: item.spec || '',
            price: item.price || '',
            ingredients: item.ingredients || '',
            effects: item.effects || '',
            targetAudience: item.targetAudience || '',
            usage: item.usage || '',
            embedding: embedding || undefined,
          },
        });
        successCount++;
      } catch (err) {
        console.error('Create product error:', err);
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
    console.error('Import products error:', error);
    return NextResponse.json(
      { error: '导入失败：' + (error as Error).message },
      { status: 500 }
    );
  }
}
