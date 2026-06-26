import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { query } = body;

    if (!query || query.trim().length === 0) {
      return NextResponse.json({ error: '请输入问题' }, { status: 400 });
    }

    const qaItems = await prisma.qaItem.findMany({
      where: { isActive: true },
    });

    if (qaItems.length === 0) {
      return NextResponse.json({
        answer: '暂无问答数据，请联系管理员添加。',
        related: [],
      });
    }

    const normalizedQuery = query.trim().toLowerCase();
    const queryWords: string[] = normalizedQuery.replace(/[？?。，！]/g, '').split(/\s+/);

    const scored = qaItems.map(item => {
      let score = 0;
      const questionLower = item.question.toLowerCase();
      const keywordsLower = (item.keywords || '').toLowerCase();
      const categoryLower = (item.category || '').toLowerCase();
      const answerLower = item.answer.toLowerCase();

      if (questionLower.includes(normalizedQuery)) {
        score += 100;
      }

      const questionWords = questionLower.replace(/[？?。，！]/g, '').split(/\s+/);
      queryWords.forEach(word => {
        if (questionWords.some(qw => qw.includes(word) || word.includes(qw))) {
          score += 20;
        }
      });

      queryWords.forEach(word => {
        if (keywordsLower.includes(word)) {
          score += 30;
        }
      });

      queryWords.forEach(word => {
        if (categoryLower.includes(word)) {
          score += 15;
        }
      });

      queryWords.forEach(word => {
        if (answerLower.includes(word)) {
          score += 5;
        }
      });

      score += Math.min(item.hitCount * 0.1, 10);

      return { item, score };
    });

    const sorted = scored
      .filter(s => s.score > 0)
      .sort((a, b) => b.score - a.score);

    let answer: string;
    let related: { id: string; question: string; answer: string; score: number }[] = [];

    if (sorted.length === 0) {
      answer = '抱歉，没有找到相关答案。您可以尝试其他关键词，或联系客服咨询。';
    } else {
      const bestMatch = sorted[0].item;
      answer = bestMatch.answer;
      related = sorted.slice(1, 4).map(s => ({
        id: s.item.id,
        question: s.item.question,
        answer: s.item.answer,
        score: s.score,
      }));

      await prisma.qaItem.update({
        where: { id: bestMatch.id },
        data: { hitCount: { increment: 1 } },
      });
    }

    return NextResponse.json({
      answer,
      related,
      matchQuestion: sorted.length > 0 ? sorted[0].item.question : null,
    });
  } catch (error) {
    console.error('Search QA error:', error);
    return NextResponse.json({ error: '查询失败' }, { status: 500 });
  }
}