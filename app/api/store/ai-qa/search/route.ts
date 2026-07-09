import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getEmbedding } from '@/lib/openai';

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

function cleanExpiredCache() {
  const now = Date.now();
  for (const [key, value] of embeddingCache.entries()) {
    if (now - value.timestamp > CACHE_DURATION) {
      embeddingCache.delete(key);
    }
  }
}

setInterval(cleanExpiredCache, 10 * 60 * 1000);

async function* generateAnswerStream(answer: string, related: { id: string; question: string; answer: string; score: number }[], matchQuestion: string | null) {
  const chunkSize = 2;
  
  for (let i = 0; i < answer.length; i += chunkSize) {
    const chunk = answer.slice(i, i + chunkSize);
    yield `data: ${JSON.stringify({ content: chunk, done: false })}\n\n`;
    await new Promise(resolve => setTimeout(resolve, 30));
  }
  
  yield `data: ${JSON.stringify({ 
    content: '', 
    done: true,
    related,
    matchQuestion 
  })}\n\n`;
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { query, stream = false } = body;

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
      answer = '暂无问答数据，请联系管理员添加。';
    } else {
      let scored: { item: typeof qaItems[0]; score: number; similarity: number }[] = [];

      try {
        const queryEmbedding = await getCachedEmbedding(query.trim(), 'qa');
        
        if (queryEmbedding) {
          const embeddingPromises = qaItems.map(item => 
            getCachedEmbedding(item.question, 'qa').then(embedding => ({
              item,
              embedding,
            }))
          );
          
          const embeddingResults = await Promise.all(embeddingPromises);

          scored = embeddingResults
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
        }
      } catch (error) {
        console.warn('Vector search failed, falling back to keyword match:', error);
      }

      if (scored.length === 0) {
        scored = qaItems.map(item => {
          let score = 0;
          const queryLower = query.toLowerCase();
          const questionLower = item.question.toLowerCase();
          
          if (questionLower.includes(queryLower)) {
            score = 0.8;
          } else {
            const queryWords = queryLower.split(/\s+/);
            let matched = 0;
            for (const word of queryWords) {
              if (questionLower.includes(word)) {
                matched++;
              }
            }
            if (matched > 0) {
              score = 0.3 + (matched / queryWords.length) * 0.4;
            }
          }
          
          return {
            item,
            score,
            similarity: score,
          };
        });
      }

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

        await prisma.qaItem.update({
          where: { id: bestMatch.item.id },
          data: { hitCount: { increment: 1 } },
        });
      }
    }

    if (stream) {
      const stream = new ReadableStream({
        async start(controller) {
          for await (const chunk of generateAnswerStream(answer, related, matchQuestion)) {
            controller.enqueue(new TextEncoder().encode(chunk));
          }
          controller.close();
        },
      });

      return new Response(stream, {
        headers: {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          'Connection': 'keep-alive',
        },
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
