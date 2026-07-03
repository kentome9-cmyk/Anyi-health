import { prisma } from '../src/lib/prisma';
import { uploadToOss } from '../src/lib/oss';
import { readFile, stat } from 'fs/promises';
import { join, resolve } from 'path';

async function migrateLearningResources() {
  console.log('开始迁移学习资源文件到 OSS...');

  const resources = await prisma.learningResource.findMany({
    where: {
      filePath: { not: null },
    },
    select: {
      id: true,
      filePath: true,
    },
  });

  console.log(`找到 ${resources.length} 个需要迁移的资源`);

  let successCount = 0;
  let failCount = 0;

  for (const resource of resources) {
    if (!resource.filePath || resource.filePath.startsWith('http://') || resource.filePath.startsWith('https://')) {
      console.log(`跳过已迁移的资源: ${resource.id}`);
      continue;
    }

    try {
      const fullPath = resolve(process.cwd(), 'public', resource.filePath);
      await stat(fullPath);

      const buffer = await readFile(fullPath);
      const fileName = resource.filePath.split('/').pop() || `${resource.id}.bin`;

      const ossUrl = await uploadToOss(buffer, fileName);
      if (!ossUrl) {
        console.log(`OSS 上传失败，跳过: ${resource.id}`);
        failCount++;
        continue;
      }

      await prisma.learningResource.update({
        where: { id: resource.id },
        data: { filePath: ossUrl },
      });

      console.log(`迁移成功: ${resource.id} -> ${ossUrl}`);
      successCount++;
    } catch (error) {
      console.log(`迁移失败 ${resource.id}: ${(error as Error).message}`);
      failCount++;
    }
  }

  console.log(`迁移完成！成功: ${successCount}, 失败: ${failCount}`);
}

async function main() {
  try {
    await migrateLearningResources();
    await prisma.$disconnect();
  } catch (error) {
    console.error('迁移过程发生错误:', error);
    await prisma.$disconnect();
    process.exit(1);
  }
}

main();