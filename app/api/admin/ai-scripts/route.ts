import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { applyDemoStoreFilter, assertWritableAdmin, requireAdmin, handleAuthError } from '@/lib/auth';
import { logError } from '@/lib/logger';
import * as XLSX from 'xlsx';

export async function GET(request: NextRequest) {
  try {
    const session = await requireAdmin(request);
    const { searchParams } = new URL(request.url);
    const storeId = searchParams.get('storeId');
    const type = searchParams.get('type');
    const isRecommended = searchParams.get('isRecommended');
    const isPublic = searchParams.get('isPublic');
    const minViews = searchParams.get('minViews');
    const keyword = searchParams.get('keyword');
    const direction = searchParams.get('direction');
    const subCategory = searchParams.get('subCategory');
    const page = Math.max(1, parseInt(searchParams.get('page') || '1'));
    const pageSize = Math.min(100, Math.max(1, parseInt(searchParams.get('pageSize') || '20')));

    const where: any = {};

    if (storeId && storeId !== 'all') where.storeId = storeId;
    if (type && type !== 'all') where.type = type;
    if (isRecommended === 'true') where.isRecommended = true;
    if (isRecommended === 'false') where.isRecommended = false;
    if (isPublic === 'true') where.isPublic = true;
    if (isPublic === 'false') where.isPublic = false;
    if (minViews) where.viewCount = { gte: parseInt(minViews) };
    if (keyword) {
      where.OR = [
        { topicTitle: { contains: keyword } },
        { content: { contains: keyword } },
        { number: { contains: keyword } },
        { direction: { contains: keyword } },
        { subCategory: { contains: keyword } },
      ];
    }
    if (direction) where.direction = direction;
    if (subCategory) where.subCategory = subCategory;
    applyDemoStoreFilter(where, session);

    const [scripts, total] = await Promise.all([
      prisma.scriptRecord.findMany({
        where,
        include: {
          store: {
            select: {
              id: true,
              storeName: true,
            },
          },
        },
        orderBy: [
          { isRecommended: 'desc' },
          { viewCount: 'desc' },
          { createdAt: 'desc' },
        ],
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.scriptRecord.count({ where }),
    ]);

    return NextResponse.json({
      scripts,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    });
  } catch (error) {
    logError('Failed to fetch scripts', error);
    return handleAuthError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await requireAdmin(request);
    assertWritableAdmin(session);
    const contentType = request.headers.get('content-type') || '';
    console.log(`[DEBUG] POST /api/admin/ai-scripts, contentType: ${contentType}`);

    if (contentType.includes('multipart/form-data')) {
      const formData = await request.formData();
      const file = formData.get('file') as File | null;

      if (!file) {
        return NextResponse.json(
          { error: '请上传文件' },
          { status: 400 }
        );
      }

      const fileExt = file.name.split('.').pop()?.toLowerCase();
      if (!fileExt || !['xlsx', 'xls', 'csv'].includes(fileExt)) {
        return NextResponse.json(
          { error: '不支持的文件格式，请上传 .xlsx、.xls 或 .csv 文件' },
          { status: 400 }
        );
      }

      const maxSize = 10 * 1024 * 1024;
      if (file.size > maxSize) {
        return NextResponse.json(
          { error: `文件大小超过限制，最大允许 10 MB` },
          { status: 400 }
        );
      }

      console.log(`[DEBUG] 开始导入文件: ${file.name}, 大小: ${file.size} bytes`);
      
      const bytes = await file.arrayBuffer();
      const buffer = Buffer.from(bytes);
      
      const workbook = XLSX.read(buffer, { type: 'buffer' });
      const firstSheetName = workbook.SheetNames[0];
      console.log(`[DEBUG] 工作表名称: ${firstSheetName}`);
      
      const worksheet = workbook.Sheets[firstSheetName];
      const data = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
      
      console.log(`[DEBUG] 解析到 ${data.length} 行数据`);

      if (data.length < 2) {
        return NextResponse.json(
          { error: '文件内容为空或只有表头' },
          { status: 400 }
        );
      }

      const headers = (data[0] as any[]).map((h: any) => 
        String(h).trim()
      );

      console.log(`[DEBUG] 表头: ${JSON.stringify(headers)}`);

      const colIndices: Record<string, number> = {};
      const requiredCols = ['编号', '方向', '子类', '内容'];
      
      for (const col of requiredCols) {
        const idx = headers.findIndex(h => h.includes(col));
        console.log(`[DEBUG] 查找列「${col}」: 索引=${idx}`);
        if (idx === -1) {
          return NextResponse.json(
            { 
              error: `缺少必需列「${col}」，请检查文件表头`,
              availableHeaders: headers,
            },
            { status: 400 }
          );
        }
        colIndices[col] = idx;
      }

      const optionalCols: Record<string, number> = {};
      ['标题'].forEach(col => {
        const idx = headers.findIndex(h => h.includes(col));
        if (idx !== -1) {
          optionalCols[col] = idx;
        }
      });

      const createdItems: any[] = [];
      let skippedCount = 0;
      const skippedReasons: string[] = [];

      for (let i = 1; i < data.length; i++) {
        const row = data[i] as any[];
        if (!row || row.length === 0) {
          skippedCount++;
          skippedReasons.push(`第${i+1}行: 空行`);
          continue;
        }

        const number = String(row[colIndices['编号']] || '').trim();
        const direction = String(row[colIndices['方向']] || '').trim();
        const subCategory = String(row[colIndices['子类']] || '').trim();
        const content = String(row[colIndices['内容']] || '').trim();

        if (!number || !direction || !subCategory || !content) {
          skippedCount++;
          const missing = [];
          if (!number) missing.push('编号');
          if (!direction) missing.push('方向');
          if (!subCategory) missing.push('子类');
          if (!content) missing.push('内容');
          skippedReasons.push(`第${i+1}行: 缺少${missing.join('、')}`);
          continue;
        }

        const topicTitle = String(row[optionalCols['标题']] || '').trim() || content.slice(0, 50) + '...';

        try {
          const item = await prisma.scriptRecord.create({
            data: {
              storeId: null,
              type: 'material',
              number,
              direction,
              subCategory,
              topicTitle,
              content,
              isPublic: true,
            },
          });
          createdItems.push(item);
        } catch (error) {
          logError('Failed to create script record', error);
          skippedCount++;
        }
      }

      console.log(`[DEBUG] 导入完成: 创建 ${createdItems.length} 条, 跳过 ${skippedCount} 条`);
      if (skippedCount > 0) {
        console.log(`[DEBUG] 跳过原因: ${JSON.stringify(skippedReasons.slice(0, 10))}`);
      }

      return NextResponse.json({
        success: true,
        created: createdItems.length,
        skipped: skippedCount,
        skippedReasons: skippedReasons.slice(0, 20),
        message: `成功导入 ${createdItems.length} 条脚本，跳过 ${skippedCount} 条无效数据`,
      });
    }

    return NextResponse.json(
      { error: '不支持的请求格式' },
      { status: 400 }
    );
  } catch (error) {
    logError('Failed to upload scripts', error);
    return handleAuthError(error);
  }
}
