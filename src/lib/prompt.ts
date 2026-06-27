import { prisma } from '@/lib/prisma';

export async function getPromptByType(type: string): Promise<string | null> {
  const prompt = await prisma.prompt.findFirst({
    where: {
      type,
      isActive: true,
    },
    orderBy: { sortOrder: 'asc' },
  });
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
