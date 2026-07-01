import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getEmbedding } from '@/lib/openai';

// 计算余弦相似度
function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length) return 0;
  
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;
  
  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  
  const denominator = Math.sqrt(normA) * Math.sqrt(normB);
  if (denominator === 0) return 0;
  
  return dotProduct / denominator;
}

// 向量缓存：缓存 5 分钟，避免重复生成向量
interface CacheItem {
  embedding: number[];
  timestamp: number;
}
const embeddingCache = new Map<string, CacheItem>();
const CACHE_DURATION = 5 * 60 * 1000;

async function getCachedEmbedding(text: string, module: string): Promise<number[] | null> {
  const cacheKey = `${module}:${text}`;
  const cached = embeddingCache.get(cacheKey);
  
  if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
    return cached.embedding;
  }
  
  const embedding = await getEmbedding(text, module);
  if (embedding) {
    embeddingCache.set(cacheKey, {
      embedding,
      timestamp: Date.now(),
    });
  }
  
  return embedding;
}

// 清理过期缓存
function cleanExpiredCache() {
  const now = Date.now();
  for (const [key, value] of embeddingCache.entries()) {
    if (now - value.timestamp > CACHE_DURATION) {
      embeddingCache.delete(key);
    }
  }
}

// 定期清理（每 10 分钟）
setInterval(cleanExpiredCache, 10 * 60 * 1000);

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { query } = body;

    if (!query || query.trim().length === 0) {
      return NextResponse.json({ error: '请输入问题' }, { status: 400 });
    }

    const qaItems = await prisma.qaItem.findMany({
      where: { isActive: true },
      select: {
        id: true,
        question: true,
        answer: true,
        hitCount: true,
      },
    });

    let answer: string;
    let related: { id: string; question: string; answer: string; score: number }[] = [];
    let matchQuestion: string | null = null;

    if (qaItems.length === 0) {
      return NextResponse.json({
        answer: '暂无问答数据，请联系管理员添加。',
        related: [],
        matchQuestion: null,
      });
    }

    // 使用 AI 生成用户问题的向量
    const queryEmbedding = await getCachedEmbedding(query.trim(), 'qa');
    
    if (!queryEmbedding) {
      return NextResponse.json({
        answer: 'AI 向量服务暂不可用，请稍后再试。',
        related: [],
        matchQuestion: null,
      });
    }

    // 并行生成所有 QA 项的向量
    const embeddingPromises = qaItems.map(item => 
      getCachedEmbedding(item.question, 'qa').then(embedding => ({
        item,
        embedding,
      }))
    );
    
    const embeddingResults = await Promise.all(embeddingPromises);

    // 计算相似度
    const scored = embeddingResults
      .filter(result => result.embedding !== null)
      .map(({ item, embedding }) => {
        const similarity = cosineSimilarity(queryEmbedding, embedding!);
        const hitBonus = Math.min(item.hitCount * 0.001, 0.05);
        const finalScore = similarity + hitBonus;
        
        return {
          item,
          score: finalScore,
          similarity,
        };
      });

    // 按相似度排序
    const sorted = scored
      .filter(s => s.score > 0.3)
      .sort((a, b) => b.score - a.score);

    if (sorted.length === 0) {
      answer = '抱歉，没有找到相关答案。您可以尝试其他方式描述您的问题，或联系客服咨询。';
    } else {
      const bestMatch = sorted[0];
      answer = bestMatch.item.answer;
      matchQuestion = bestMatch.item.question;

      related = sorted.slice(1, 4).map(s => ({
        id: s.item.id,
        question: s.item.question,
        answer: s.item.answer,
        score: s.score,
      }));

      // 更新命中次数
      await prisma.qaItem.update({
        where: { id: bestMatch.item.id },
        data: { hitCount: { increment: 1 } },
      });
    }

    return NextResponse.json({
      answer,
      related,
      matchQuestion,
    });
  } catch (error) {
    console.error('Search QA error:', error);
    return NextResponse.json({ error: '查询失败' }, { status: 500 });
  }
}