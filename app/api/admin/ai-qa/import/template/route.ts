import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    // 生成导入模板 CSV
    const template = `问题,回答,分类,关键词
产后多久可以开始运动？,一般建议顺产6-8周后、剖腹产8-12周后逐步开始轻度运动，具体请遵医嘱,产后恢复,运动,产后
哺乳期可以减肥吗？,哺乳期减肥需谨慎，建议在医生指导下进行，避免影响乳汁分泌,哺乳期,减肥,哺乳
产后恶露多久干净？,产后恶露一般持续4-6周，若超过8周仍有大量出血需就医,产后护理,恶露
宝宝多大可以添加辅食？,一般建议6个月开始添加辅食，最早不早于4个月,宝宝护理,辅食`;

    return new NextResponse(template, {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': 'attachment; filename="qa_import_template.csv"',
      },
    });
  } catch (error) {
    console.error('Download template error:', error);
    return NextResponse.json({ error: '生成模板失败' }, { status: 500 });
  }
}