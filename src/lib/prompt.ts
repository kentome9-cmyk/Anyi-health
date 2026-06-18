import { prisma } from '@/lib/prisma';

// 从 Prompt 表读取指定类型的提示词
export async function getPromptByType(type: string): Promise<string | null> {
  console.log(`[Prompt Lib] 查询 Prompt 表，type=${type}`);
  const prompt = await prisma.prompt.findFirst({
    where: {
      type,
      isActive: true,
    },
    orderBy: { sortOrder: 'asc' },
  });
  console.log(`[Prompt Lib] 查询结果:`, prompt ? `id=${prompt.id}, name=${prompt.name}, content=${prompt.content.substring(0, 80)}...` : 'null');
  return prompt?.content || null;
}

// 替换提示词中的变量
export function replacePromptVariables(
  prompt: string,
  variables: Record<string, string>
): string {
  let result = prompt;
  Object.entries(variables).forEach(([key, value]) => {
    result = result.replace(new RegExp(`\\{${key}\\}`, 'g'), value);
  });
  return result;
}
