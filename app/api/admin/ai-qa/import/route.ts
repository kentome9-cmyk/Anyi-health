import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json({ error: '请上传文件' }, { status: 400 });
    }

    const extension = file.name.split('.').pop()?.toLowerCase();
    if (!['csv', 'xlsx', 'xls'].includes(extension || '')) {
      return NextResponse.json({ error: '仅支持 CSV 或 Excel 文件' }, { status: 400 });
    }

    let items: any[] = [];

    if (extension === 'csv') {
      // 解析 CSV
      const text = await file.text();
      const lines = text.trim().split('\n');
      
      // 跳过表头
      for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;
        
        // 简单 CSV 解析（处理引号包裹的字段）
        const parts: string[] = [];
        let current = '';
        let inQuotes = false;
        
        for (let j = 0; j < line.length; j++) {
          const char = line[j];
          if (char === '"') {
            inQuotes = !inQuotes;
          } else if (char === ',' && !inQuotes) {
            parts.push(current.trim());
            current = '';
          } else {
            current += char;
          }
        }
        parts.push(current.trim());
        
        if (parts[0] && parts[1]) {
          items.push({
            question: parts[0],
            answer: parts[1],
            category: parts[2] || null,
            keywords: parts[3] || null,
          });
        }
      }
    } else {
      // 解析 Excel（使用 xlsx 库）
      const arrayBuffer = await file.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      
      // 动态导入 xlsx
      const XLSX = require('xlsx');
      const workbook = XLSX.read(buffer, { type: 'buffer' });
      const sheetName = workbook.SheetNames[0];
      const sheet = workbook.Sheets[sheetName];
      const data = XLSX.utils.sheet_to_json(sheet, { header: 1 }) as any[][];
      
      // 跳过表头，处理数据行
      for (let i = 1; i < data.length; i++) {
        const row = data[i];
        if (row && row[0] && row[1]) {
          items.push({
            question: String(row[0]),
            answer: String(row[1]),
            category: row[2] ? String(row[2]) : null,
            keywords: row[3] ? String(row[3]) : null,
          });
        }
      }
    }

    if (items.length === 0) {
      return NextResponse.json({ error: '未解析到有效数据，请检查文件格式' }, { status: 400 });
    }

    // 限制单次导入数量
    const MAX_IMPORT = 200;
    if (items.length > MAX_IMPORT) {
      return NextResponse.json({ error: `单次导入不超过 ${MAX_IMPORT} 条数据，请分批导入` }, { status: 400 });
    }

    // 批量创建
    const createdItems = await prisma.qaItem.createMany({
      data: items.map((item) => ({
        question: item.question,
        answer: item.answer,
        category: item.category || null,
        keywords: item.keywords || null,
        isActive: true,
      })),
      skipDuplicates: true,
    });

    return NextResponse.json({
      success: true,
      count: createdItems.count,
      total: items.length,
    });
  } catch (error) {
    console.error('Import QA items error:', error);
    return NextResponse.json({ error: '导入失败：' + (error as Error).message }, { status: 500 });
  }
}