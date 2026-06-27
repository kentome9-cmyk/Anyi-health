import { prisma } from '@/lib/prisma';

interface OpenAIConfig {
  apiKey: string;
  baseUrl: string;
  modelId: string;
}

interface EmbeddingConfig {
  apiKey: string;
  baseUrl: string;
  modelId: string;
}

async function getOpenAIConfig(module: string = 'default'): Promise<OpenAIConfig | null> {
  const settings = await prisma.aiSettings.findUnique({
    where: { module },
  });

  if (!settings && module !== 'default') {
    return getOpenAIConfig('default');
  }

  if (!settings?.apiKey || !settings?.baseUrl || !settings?.modelId) {
    return null;
  }

  return {
    apiKey: settings.apiKey,
    baseUrl: settings.baseUrl,
    modelId: settings.modelId,
  };
}

async function getEmbeddingConfig(module: string = 'default'): Promise<EmbeddingConfig | null> {
  const settings = await prisma.aiSettings.findUnique({
    where: { module },
  });

  if (!settings && module !== 'default') {
    return getEmbeddingConfig('default');
  }

  if (!settings?.embeddingApiKey || !settings?.embeddingBaseUrl || !settings?.embeddingModelId) {
    return null;
  }

  return {
    apiKey: settings.embeddingApiKey,
    baseUrl: settings.embeddingBaseUrl,
    modelId: settings.embeddingModelId,
  };
}

export async function getOpenAIInstance(module: string = 'default') {
  const config = await getOpenAIConfig(module);

  if (!config) {
    throw new Error('AI 未配置，请先在设置中配置 API');
  }

  return {
    config,
    async chat(options: { messages: any[]; temperature?: number }) {
      const apiUrl = `${config.baseUrl.replace(/\/$/, '')}/chat/completions`;
      
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${config.apiKey}`,
        },
        body: JSON.stringify({
          model: config.modelId,
          messages: options.messages,
          temperature: options.temperature ?? 0.7,
        }),
      });

      if (!response.ok) {
        throw new Error(`AI API error: ${response.status}`);
      }

      return response.json();
    },
  };
}

export async function getEmbedding(text: string, module: string = 'default'): Promise<number[] | null> {
  const config = await getEmbeddingConfig(module);

  if (!config) {
    return null;
  }

  const apiUrl = `${config.baseUrl.replace(/\/$/, '')}/embeddings`;

  try {
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${config.apiKey}`,
      },
      body: JSON.stringify({
        model: config.modelId,
        input: text,
      }),
    });

    if (!response.ok) {
      throw new Error(`Embedding API error: ${response.status}`);
    }

    const data = await response.json();
    return data.data?.[0]?.embedding || null;
  } catch (error) {
    console.error('Get embedding error:', error);
    return null;
  }
}

export { getOpenAIConfig, getEmbeddingConfig };

// ============================================
// 向量检索相关函数
// ============================================

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

interface EmbeddableItem {
  id: string;
  embedding: unknown | null | undefined;
}

async function searchByEmbedding<T extends EmbeddableItem>(
  queryEmbedding: number[],
  items: T[],
  transform: (item: T, similarity: number) => unknown,
  topK: number = 5,
  minSimilarity: number = 0.5
): Promise<unknown[]> {
  const itemsWithEmbedding = items.filter(item => item.embedding !== null && item.embedding !== undefined);
  const matches: unknown[] = [];

  for (const item of itemsWithEmbedding) {
    const itemEmbedding = item.embedding as number[];
    const similarity = cosineSimilarity(queryEmbedding, itemEmbedding);
    
    if (similarity >= minSimilarity) {
      matches.push(transform(item, similarity));
    }
  }

  matches.sort((a: any, b: any) => b.similarity - a.similarity);
  return matches.slice(0, topK);
}

interface KnowledgeMatch {
  id: string;
  project: string;
  manifestation: string;
  pairingEffect: string;
  symptom: string;
  pairingItem: string;
  pairingReason: string;
  carePlan: string;
  effectEstimation: string;
  similarity: number;
}

export async function searchKnowledgeByEmbedding(
  queryText: string,
  module: string = 'default',
  topK: number = 5,
  minSimilarity: number = 0.5
): Promise<KnowledgeMatch[]> {
  const queryEmbedding = await getEmbedding(queryText, module);
  if (!queryEmbedding) return [];

  const allKnowledge = await prisma.knowledgeBase.findMany({
    select: {
      id: true,
      project: true,
      manifestation: true,
      pairingEffect: true,
      symptom: true,
      pairingItem: true,
      pairingReason: true,
      carePlan: true,
      effectEstimation: true,
      embedding: true,
    },
  });

  return searchByEmbedding(queryEmbedding, allKnowledge, (item, similarity) => ({
    id: item.id,
    project: item.project,
    manifestation: item.manifestation,
    pairingEffect: item.pairingEffect,
    symptom: item.symptom,
    pairingItem: item.pairingItem,
    pairingReason: item.pairingReason,
    carePlan: item.carePlan,
    effectEstimation: item.effectEstimation,
    similarity,
  }), topK, minSimilarity) as Promise<KnowledgeMatch[]>;
}

export function formatKnowledgeContext(matches: KnowledgeMatch[]): string {
  if (matches.length === 0) return '';

  let context = '【以下是与您问题相关的健康知识库方案，请优先完整使用这些搭配好的方案】：\n\n';

  for (let i = 0; i < matches.length; i++) {
    const m = matches[i];
    context += `【方案 ${i + 1}】（相似度：${(m.similarity * 100).toFixed(1)}%）\n`;
    context += `▎适用项目：${m.project}\n`;
    
    if (m.manifestation) context += `▎用户表现：${m.manifestation}\n`;
    if (m.symptom) context += `▎对应症状：${m.symptom}\n`;
    if (m.pairingEffect) context += `▎搭配效果：${m.pairingEffect}\n`;
    if (m.pairingItem) context += `▎推荐搭配：${m.pairingItem}\n`;
    if (m.pairingReason) context += `▎搭配原因：${m.pairingReason}\n`;
    if (m.carePlan) context += `▎调理规划：${m.carePlan}\n`;
    if (m.effectEstimation) context += `▎效果预估：${m.effectEstimation}\n`;
    
    context += '\n';
  }

  context += '【重要提示】：\n';
  context += '1. 请优先从上述方案中选取最合适的1-2个完整方案推荐给客户；\n';
  context += '2. 推荐时请直接引用方案中的【推荐搭配】，不要拆分或重新组合项目；\n';
  context += '3. 如有多个方案适用，可综合考虑后推荐最匹配的方案组合；\n';
  context += '4. 可结合客户实际情况，对方案中的次数、周期等做适当调整说明。\n';

  return context;
}

// ============================================
// 月经助手知识库相关类型和函数
// ============================================

export interface MenstrualKnowledgeMatch {
  type: 'knowledge' | 'product' | 'healthPlan';
  id: string;
  category: string;
  symptom: string;
  cause: string;
  suggestion: string;
  dietAdvice: string;
  lifestyleAdvice: string;
  attention: string;
  similarity: number;
}

export interface ProductMatch {
  type: 'product';
  id: string;
  category: string;
  name: string;
  spec: string | null;
  price: string | null;
  ingredients: string | null;
  effects: string | null;
  targetAudience: string | null;
  usage: string | null;
  similarity: number;
}

export interface HealthPlanMatch {
  type: 'healthPlan';
  id: string;
  typeField: string;
  targetAudience: string | null;
  productCombo: string | null;
  usage: string | null;
  similarity: number;
}

export type MenstrualCombinedMatch = MenstrualKnowledgeMatch | ProductMatch | HealthPlanMatch;

async function searchProductsByEmbedding(
  queryEmbedding: number[],
  topK: number = 5,
  minSimilarity: number = 0.5
): Promise<ProductMatch[]> {
  const allProducts = await prisma.product.findMany({
    select: {
      id: true,
      category: true,
      name: true,
      spec: true,
      price: true,
      ingredients: true,
      effects: true,
      targetAudience: true,
      usage: true,
      embedding: true,
    },
  });

  return searchByEmbedding(queryEmbedding, allProducts, (item, similarity) => ({
    type: 'product' as const,
    id: item.id,
    category: item.category,
    name: item.name,
    spec: item.spec,
    price: item.price,
    ingredients: item.ingredients,
    effects: item.effects,
    targetAudience: item.targetAudience,
    usage: item.usage,
    similarity,
  }), topK, minSimilarity) as Promise<ProductMatch[]>;
}

async function searchHealthPlansByEmbedding(
  queryEmbedding: number[],
  topK: number = 5,
  minSimilarity: number = 0.5
): Promise<HealthPlanMatch[]> {
  const allPlans = await prisma.healthPlan.findMany({
    select: {
      id: true,
      type: true,
      targetAudience: true,
      productCombo: true,
      usage: true,
      embedding: true,
    },
  });

  return searchByEmbedding(queryEmbedding, allPlans, (item, similarity) => ({
    type: 'healthPlan' as const,
    id: item.id,
    typeField: item.type,
    targetAudience: item.targetAudience,
    productCombo: item.productCombo,
    usage: item.usage,
    similarity,
  }), topK, minSimilarity) as Promise<HealthPlanMatch[]>;
}

export async function searchMenstrualKnowledgeByEmbedding(
  queryText: string,
  module: string = 'default',
  topK: number = 5,
  minSimilarity: number = 0.5
): Promise<MenstrualCombinedMatch[]> {
  const queryEmbedding = await getEmbedding(queryText, module);
  if (!queryEmbedding) return [];

  const allKnowledge = await prisma.menstrualKnowledgeBase.findMany({
    select: {
      id: true,
      category: true,
      symptom: true,
      cause: true,
      suggestion: true,
      dietAdvice: true,
      lifestyleAdvice: true,
      attention: true,
      embedding: true,
    },
  });

  const knowledgeMatches = await searchByEmbedding(queryEmbedding, allKnowledge, (item, similarity) => ({
    type: 'knowledge' as const,
    id: item.id,
    category: item.category,
    symptom: item.symptom,
    cause: item.cause,
    suggestion: item.suggestion,
    dietAdvice: item.dietAdvice,
    lifestyleAdvice: item.lifestyleAdvice,
    attention: item.attention,
    similarity,
  }), topK, minSimilarity) as MenstrualCombinedMatch[];

  const productMatches = await searchProductsByEmbedding(queryEmbedding, topK, minSimilarity);
  const healthPlanMatches = await searchHealthPlansByEmbedding(queryEmbedding, topK, minSimilarity);

  const allMatches = [...knowledgeMatches, ...productMatches, ...healthPlanMatches];
  allMatches.sort((a, b) => b.similarity - a.similarity);

  return allMatches.slice(0, topK * 2);
}

export function formatMenstrualKnowledgeContext(matches: MenstrualCombinedMatch[]): string {
  if (matches.length === 0) return '';

  let context = '【以下是与您问题相关的知识库内容，请严格参考，不得自行创造产品】：\n\n';

  const knowledgeMatches = matches.filter(m => m.type === 'knowledge') as MenstrualKnowledgeMatch[];
  const productMatches = matches.filter(m => m.type === 'product') as ProductMatch[];
  const healthPlanMatches = matches.filter(m => m.type === 'healthPlan') as HealthPlanMatch[];

  if (knowledgeMatches.length > 0) {
    context += '===== 【月经健康知识库】 =====\n\n';
    for (let i = 0; i < knowledgeMatches.length; i++) {
      const m = knowledgeMatches[i];
      context += `【知识 ${i + 1}】（相似度：${(m.similarity * 100).toFixed(1)}%）\n`;
      context += `▎分类：${m.category}\n`;
      context += `▎症状表现：${m.symptom}\n`;
      if (m.cause) context += `▎原因分析：${m.cause}\n`;
      if (m.suggestion) context += `▎建议方案：${m.suggestion}\n`;
      if (m.dietAdvice) context += `▎饮食建议：${m.dietAdvice}\n`;
      if (m.lifestyleAdvice) context += `▎生活建议：${m.lifestyleAdvice}\n`;
      if (m.attention) context += `▎注意事项：${m.attention}\n`;
      context += '\n';
    }
  }

  if (productMatches.length > 0) {
    context += '===== 【产品库】（请只从以下产品中选择推荐） =====\n\n';
    for (let i = 0; i < productMatches.length; i++) {
      const m = productMatches[i];
      context += `【产品 ${i + 1}】（相似度：${(m.similarity * 100).toFixed(1)}%）\n`;
      context += `▎产品分类：${m.category}\n`;
      context += `▎产品名称：${m.name}\n`;
      if (m.spec) context += `▎规格：${m.spec}\n`;
      if (m.price) context += `▎价格：${m.price}\n`;
      if (m.ingredients) context += `▎主要成分：${m.ingredients}\n`;
      if (m.effects) context += `▎产品功效：${m.effects}\n`;
      if (m.targetAudience) context += `▎适用人群：${m.targetAudience}\n`;
      if (m.usage) context += `▎使用方式：${m.usage}\n`;
      context += '\n';
    }
  }

  if (healthPlanMatches.length > 0) {
    context += '===== 【调理方案库】（请只从以下方案中选择推荐） =====\n\n';
    for (let i = 0; i < healthPlanMatches.length; i++) {
      const m = healthPlanMatches[i];
      context += `【方案 ${i + 1}】（相似度：${(m.similarity * 100).toFixed(1)}%）\n`;
      context += `▎调理类型：${m.typeField}\n`;
      if (m.targetAudience) context += `▎适用人群：${m.targetAudience}\n`;
      if (m.productCombo) context += `▎推荐产品组合：${m.productCombo}\n`;
      if (m.usage) context += `▎使用方式：${m.usage}\n`;
      context += '\n';
    }
  }

  context += '【重要规则】：\n';
  context += '1. 所有推荐的产品必须从【产品库】中选择，产品名称必须完全一致，绝对不能自行创造任何产品；\n';
  context += '2. 调理方案请优先从【调理方案库】中选择完整的方案推荐；\n';
  context += '3. 如果找不到合适的产品或方案，请明确告知用户当前知识库中没有针对其情况的合适产品，不要编造。\n';

  return context;
}
