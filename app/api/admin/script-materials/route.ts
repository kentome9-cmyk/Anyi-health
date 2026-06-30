import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAdmin, handleAuthError } from '@/lib/auth';
import { logError } from '@/lib/logger';
import * as XLSX from 'xlsx';

export async function GET(request: NextRequest) {
  try {
    await requireAdmin();
    const { searchParams } = new URL(request.url);
    const category = searchParams.get('category');
    const keyword = searchParams.get('keyword');
    const direction = searchParams.get('direction');
    const subCategory = searchParams.get('subCategory');
    const page = Math.max(1, parseInt(searchParams.get('page') || '1'));
    const pageSize = Math.min(100, Math.max(1, parseInt(searchParams.get('pageSize') || '20')));

    const where: any = {};
    if (category) where.category = category;
    if (keyword) {
      where.OR = [
        { title: { contains: keyword } },
        { content: { contains: keyword } },
        { source: { contains: keyword } },
        { number: { contains: keyword } },
        { direction: { contains: keyword } },
        { subCategory: { contains: keyword } },
      ];
    }
    if (direction) where.direction = direction;
    if (subCategory) where.subCategory = subCategory;

    const [items, total] = await Promise.all([
      prisma.scriptMaterial.findMany({
        where,
        include: {
          uploader: {
            select: { id: true, name: true, username: true },
          },
          _count: {
            select: { rewrites: true },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.scriptMaterial.count({ where }),
    ]);

    return NextResponse.json({
      items,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    });
  } catch (error) {
    logError('Failed to fetch script materials', error);
    return handleAuthError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await requireAdmin();
    const contentType = request.headers.get('content-type') || '';

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

      const bytes = await file.arrayBuffer();
      const buffer = Buffer.from(bytes);
      
      const workbook = XLSX.read(buffer, { type: 'buffer' });
      const firstSheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[firstSheetName];
      const data = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

      if (data.length < 2) {
        return NextResponse.json(
          { error: '文件内容为空或只有表头' },
          { status: 400 }
        );
      }

      const headers = (data[0] as any[]).map((h: any) => 
        String(h).trim().toLowerCase()
      );

      const colIndices: Record<string, number> = {};
      const requiredCols = ['编号', '方向', '子类', '内容'];
      
      for (const col of requiredCols) {
        const idx = headers.findIndex(h => h.includes(col.toLowerCase()));
        if (idx === -1) {
          return NextResponse.json(
            { error: `缺少必需列「${col}」，请检查文件表头` },
            { status: 400 }
          );
        }
        colIndices[col] = idx;
      }

      const optionalCols: Record<string, number> = {};
      ['标题', '来源', '分类'].forEach(col => {
        const idx = headers.findIndex(h => h.includes(col.toLowerCase()));
        if (idx !== -1) {
          optionalCols[col] = idx;
        }
      });

      const createdItems: any[] = [];
      let skippedCount = 0;

      for (let i = 1; i < data.length; i++) {
        const row = data[i] as any[];
        if (!row || row.length === 0) continue;

        const number = String(row[colIndices['编号']] || '').trim();
        const direction = String(row[colIndices['方向']] || '').trim();
        const subCategory = String(row[colIndices['子类']] || '').trim();
        const content = String(row[colIndices['内容']] || '').trim();

        if (!number || !direction || !subCategory || !content) {
          skippedCount++;
          continue;
        }

        const title = String(row[optionalCols['标题']] || '').trim() || content.slice(0, 50) + '...';
        const source = String(row[optionalCols['来源']] || '').trim() || null;
        const category = String(row[optionalCols['分类']] || '').trim() || null;

        try {
          const material = await prisma.scriptMaterial.create({
            data: {
              number,
              direction,
              subCategory,
              title,
              content,
              source,
              category,
              uploadedById: session.userId,
            },
          });

          await prisma.scriptRecord.create({
            data: {
              storeId: 'SYSTEM',
              type: 'material',
              number,
              direction,
              subCategory,
              topicTitle: title,
              content,
              isPublic: true,
              sourceMaterialId: material.id,
            },
          });

          createdItems.push(material);
        } catch (error) {
          logError('Failed to create script material', error);
          skippedCount++;
        }
      }

      return NextResponse.json({
        success: true,
        created: createdItems.length,
        skipped: skippedCount,
        message: `成功导入 ${createdItems.length} 条素材，跳过 ${skippedCount} 条无效数据`,
      });
    } else {
      const body = await request.json();
      const { title, content, source, category, number, direction, subCategory } = body;

      if (!title || !content || !number || !direction || !subCategory) {
        return NextResponse.json(
          { error: '标题、内容、编号、方向和子类不能为空' },
          { status: 400 }
        );
      }

      if (title.length > 255) {
        return NextResponse.json(
          { error: '标题不能超过 255 个字符' },
          { status: 400 }
        );
      }

      if (content.length > 50000) {
        return NextResponse.json(
          { error: '内容不能超过 50000 个字符' },
          { status: 400 }
        );
      }

      const material = await prisma.scriptMaterial.create({
        data: {
          number,
          direction,
          subCategory,
          title,
          content,
          source: source || null,
          category: category || null,
          uploadedById: session.userId,
        },
      });

      await prisma.scriptRecord.create({
        data: {
          storeId: 'SYSTEM',
          type: 'material',
          number,
          direction,
          subCategory,
          topicTitle: title,
          content,
          isPublic: true,
          sourceMaterialId: material.id,
        },
      });

      return NextResponse.json({ item: material });
    }
  } catch (error) {
    logError('Failed to create script material', error);
    return handleAuthError(error);
  }
}