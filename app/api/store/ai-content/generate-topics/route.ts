import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getOpenAIConfig } from '@/lib/openai';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { identityId, storeId } = body;

    let identity = null;

    if (identityId) {
      identity = await prisma.creatorIdentity.findUnique({
        where: { id: identityId },
      });
    }

    if (!identity && storeId) {
      identity = await prisma.creatorIdentity.findUnique({
        where: { storeId },
      });
    }

    if (!identity) {
      return NextResponse.json(
        { topics: [], error: '请先设置创作者身份' },
        { status: 400 }
      );
    }

    const config = await getOpenAIConfig('content');
    if (!config) {
      return NextResponse.json(
        { topics: [], error: 'AI 未配置' },
        { status: 500 }
      );
    }

    const apiUrl = `${config.baseUrl.replace(/\/$/, '')}/chat/completions`;

    const systemPrompt = `你是一位专业的短视频选题策划专家。请根据用户提供的创作者身份，严格贴合账号赛道、人设、受众，批量生成8-10个精准匹配的选题方向。

重要原则：
1. 选题必须完全符合内容赛道方向，禁止跨领域
2. 选题必须匹配人设风格，符合账号整体调性
3. 选题必须是目标受众真正关心的内容
4. 选题要有差异化，既有热门话题，也有深度内容

请以JSON数组格式返回，格式如下：
[
  {
    "title": "简洁有力的选题标题",
    "summary": "选题核心内容简述，1-2句话",
    "angle": "选题切入角度，说明为什么这个角度有吸引力"
  },
  ...
]

请直接返回JSON数组，不要包含其他文字说明。`;

    const userPrompt = `创作者身份信息：
内容赛道：${identity.contentTrack}
人设风格：${identity.personaStyle}
目标受众：${identity.targetAudience}
${identity.videoTone ? `视频调性：${identity.videoTone}` : ''}
${identity.videoDuration ? `视频时长：${identity.videoDuration}` : ''}

请严格贴合上述创作者身份，生成8-10个精准匹配的短视频选题方向。请确保选题标题简洁有力，内容简要说明核心价值。`;

    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${config.apiKey}`,
      },
      body: JSON.stringify({
        model: config.modelId,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        temperature: 0.8,
      }),
    });

    if (!response.ok) {
      throw new Error(`AI API error: ${response.status}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || '';

    let topics: { title: string; summary: string; angle: string }[] = [];

    try {
      const jsonMatch = content.match(/\[.*\]/s);
      if (jsonMatch) {
        topics = JSON.parse(jsonMatch[0]);
      } else {
        topics = [];
      }
    } catch (e) {
      const lines = content.split('\n').filter((line: string) => line.trim());
      topics = lines.slice(0, 10).map((line: string, idx: number) => ({
        title: line.replace(/^\d+\.\s*/, '').slice(0, 50),
        summary: 'AI 生成选题',
        angle: '参考标题',
      }));
    }

    if (!Array.isArray(topics) || topics.length === 0) {
      topics = [
        { title: `${identity.contentTrack}入门指南`, summary: '面向新手的基础知识科普', angle: '以小白视角切入，降低理解门槛' },
        { title: `${identity.contentTrack}常见误区解析`, summary: '盘点行业常见错误认知', angle: '反常识切入，引发关注' },
        { title: `${identity.contentTrack}效果展示`, summary: '真实案例效果展示', angle: '以结果导向，激发用户兴趣' },
      ];
    }

    return NextResponse.json({ topics });
  } catch (error) {
    console.error('Generate topics error:', error);
    return NextResponse.json(
      { topics: [], error: '生成选题失败' },
      { status: 500 }
    );
  }
}
