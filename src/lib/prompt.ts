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

function escapeRegExp(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export function replacePromptVariables(
  prompt: string,
  variables: Record<string, string>
): string {
  let result = prompt;
  Object.entries(variables).forEach(([key, value]) => {
    const escapedKey = escapeRegExp(key);
    result = result.replace(new RegExp(`\\{${escapedKey}\\}`, 'g'), value);
  });
  return result;
}
