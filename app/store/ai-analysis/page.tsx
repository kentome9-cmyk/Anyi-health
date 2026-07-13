'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Send, Bot, Sparkles, Heart, Leaf, FileText, Upload } from '@/lib/icons';
import ReactMarkdown from 'react-markdown';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { useAuthStore } from '@/stores/auth.store';

interface Message {
  id: string;
  role: 'ai' | 'user';
  content: string;
  timestamp: Date;
  loading?: boolean;
}

interface Customer {
  id: string;
  storeId?: string;
  name: string;
  phone: string;
  age: number;
  postpartumDays: number;
  deliveryMethod: string;
  birthOrder: string;
  hasAbortionHistory: string;
  allergy: string;
  height: number;
  weight: number;
  symptoms?: string;
  reportFile?: string | null;
  reportFilePath?: string | null;
}

interface AnalysisResult {
  bodyAnalysis: {
    symptoms: string[];
    recoveryStage: string;
    fullContent?: string;
  };
  dailyAdvice: {
    diet: string[];
    sleep: string[];
    exercise: string[];
    emotion: string[];
    caution: string[];
  };
  projectRecommendations: {
    core: Array<{ name: string; count: string }>;
    auxiliary: Array<{ name: string; count: string }>;
    reason: string;
    cycle: string;
    effect: string;
  };
}

const mockAIReply = `**身体状况分析**

根据客户提供的信息，目前处于产后恢复的关键阶段。主要观察到以下情况：

- 气血不足，手脚冰凉，需要温补调理
- 盆底肌松弛，存在轻度漏尿风险
- 腹直肌分离约2指，需要专业修复
- 睡眠质量较差，可能与产后激素变化有关

**恢复阶段**：黄金恢复期

**项目搭配推荐**

**核心项目**
盆底肌修复 12次、腹直肌修复 10次、骨盆闭合 8次

**辅助项目**
气血调理 6次、子宫复旧 6次、艾灸理疗 4次

**搭配原因**
盆底肌和腹直肌修复是产后恢复的重中之重，直接关系到客户的身体形态和功能恢复。骨盆闭合有助于整体骨架调整。气血调理和子宫复旧从内部调理身体，艾灸理疗温经通络，全方位促进产后恢复。`;

function cleanDialogMessage(text: string): string {
  if (!text) return '';
  
  let cleaned = text;
  
  // 1. 处理错位的 Markdown 标题标签
  // 将段落中间的 "### xxx" 移到独立行
  cleaned = cleaned.replace(/([^\n#])\s*###\s*/g, '$1\n\n### ');
  
  // 2. 清理重复的问候语和自我介绍
  // 去除 "亲爱的xx妈妈，您好！" 等重复出现的问候语
  const greetings = [
    /亲爱的[^\s，,。！!？?]*妈妈[，,。！!？?]*/g,
    /您好！我是[^\s，,。！!？?]*，先给您一个温暖的抱抱[。！!😊😊]*/g,
    /我看到您现在是产后第[^\s，,。！!？?]*天[，,。！!？?]*/g,
    /我看到您现在是产后[^\s，,。！!？?]*天[，,。！!？?]*/g,
    /生产方式是[^\s，,。！!？?]*[，,。！!？?]*/g,
    /[有无]小产记录[，,。！!？?]*/g,
    /让我们一起，为您的产后恢复之路保驾护航[。！!]*/g,
    /无论是产后身体的调理，还是日常的保养困惑[，,。！!？?]*/g,
    /我都会根据您的情况，耐心地为您解答[。！!]*/g,
  ];
  
  // 记录是否已经保留了第一段问候语
  let firstGreetingRemoved = false;
  greetings.forEach((pattern) => {
    const matches = cleaned.match(pattern);
    if (matches && matches.length > 1) {
      // 出现多次，只保留第一次
      let count = 0;
      cleaned = cleaned.replace(pattern, (match) => {
        count++;
        if (count === 1 && !firstGreetingRemoved) {
          firstGreetingRemoved = true;
          return match;
        }
        return '';
      });
    }
  });
  
  // 3. 修复错乱的 "温暖的抱抱" 标记
  cleaned = cleaned.replace(/温暖的抱抱[^\s\n，,。！!？?]*/g, '温暖的抱抱😊');
  
  // 4. 清理混合段落中的重复内容
  // 将 "### 项目搭配推荐我们一起..." 这样的错乱文本分开
  cleaned = cleaned.replace(/###\s*([^#\n]+?)我们一起/g, '### $1\n\n我们一起');
  
  // 5. 去除单行中的重复短句
  // 例如 "身体的调理，还是日常的保养困惑" 重复时
  const lines = cleaned.split('\n');
  const seenLines = new Set<string>();
  const cleanedLines: string[] = [];
  
  for (let i = 0; i < lines.length; i++) {
    let line = lines[i].trim();
    
    // 跳过完全空的行
    if (line === '') {
      // 连续的空行只保留一个
      if (cleanedLines[cleanedLines.length - 1] !== '') {
        cleanedLines.push('');
      }
      continue;
    }
    
    // 跳过极短且重复的行（小于10个字符且已出现过）
    if (line.length < 10 && seenLines.has(line)) {
      continue;
    }
    
    // 去除一行内的重复内容（例如 "预防便秘，排便时亲爱的xx...妈妈，您好！..."）
    // 检查一行内是否有明显的文本错位
    const misplacedPatterns = [
      /([^，。！？,.!?]{5,})，([^，。！？,.!?]*?)妈妈[，,。！!？?]/,
      /([^，。！？,.!?]{5,})我是尚孕智慧小助手/g,
    ];
    
    misplacedPatterns.forEach((pattern) => {
      if (pattern.test(line)) {
        // 提取第一部分（通常是有意义的内容）
        const match = line.match(pattern);
        if (match) {
          line = match[1].trim();
        }
      }
    });
    
    // 去除同一行中重复的短语
    const phrases = line.split(/[，。！？,.!?]+/).map(p => p.trim()).filter(p => p.length > 5);
    const seenPhrases = new Set<string>();
    let resultLine = '';
    
    for (const phrase of phrases) {
      if (!seenPhrases.has(phrase)) {
        seenPhrases.add(phrase);
        resultLine += (resultLine ? '，' : '') + phrase;
      }
    }
    
    if (resultLine) {
      line = resultLine;
    }
    
    if (line.length >= 10) {
      seenLines.add(line);
    }
    cleanedLines.push(line);
  }
  
  cleaned = cleanedLines.join('\n');
  
  // 6. 修复段落标题和内容错乱
  // 确保 "### 身体状况分析" 等标题后有换行
  cleaned = cleaned.replace(/(###\s*[^\n]+?)根据您的/g, '$1\n\n根据您的');
  cleaned = cleaned.replace(/(###\s*[^\n]+?)您目前/g, '$1\n\n您目前');
  cleaned = cleaned.replace(/(###\s*[^\n]+?)首先对/g, '$1\n\n首先对');
  
  // 7. 清理多余的空行（只保留段落间的一个空行）
  cleaned = cleaned.replace(/\n{3,}/g, '\n\n');
  
  // 8. 清理 "😊" 等表情符号后的异常文本
  cleaned = cleaned.replace(/😊([^\s\n，,。！!？?]{5,})/g, '😊\n\n');
  
  // 9. 清理行首的 "xx" 占位符
  cleaned = cleaned.replace(/^xx\s*/gm, '您');
  
  // 10. 修复 "亲爱的xx" 等格式
  cleaned = cleaned.replace(/亲爱的[^\s]*妈妈/g, '亲爱的妈妈');
  
  // 11. 去除多余的 "我是尚孕智慧小助手"（只保留第一次出现）
  let hasShownAssistantName = false;
  cleaned = cleaned.replace(/我是尚孕智慧小助手/g, (match) => {
    if (!hasShownAssistantName) {
      hasShownAssistantName = true;
      return match;
    }
    return '';
  });
  
  // 12. 去除完全重复的段落
  const paragraphs = cleaned.split('\n\n').map(p => p.trim()).filter(p => p.length > 0);
  const seenParagraphs = new Set<string>();
  const uniqueParagraphs: string[] = [];
  
  for (const paragraph of paragraphs) {
    // 创建段落的简化指纹（去除空格、标点后取前50个字符）
    const fingerprint = paragraph.replace(/[\s\p{P}]/gu, '').slice(0, 50);
    
    if (!seenParagraphs.has(fingerprint)) {
      seenParagraphs.add(fingerprint);
      uniqueParagraphs.push(paragraph);
    }
  }
  
  cleaned = uniqueParagraphs.join('\n\n');
  
  // 13. 最后的修复：确保 "### xxx" 标题后有内容段落
  cleaned = cleaned.replace(/(###\s*[^\n]*)\n###/g, '$1\n\n###');
  
  return cleaned.trim();
}

function parseAIResponseLegacy(content: string): AnalysisResult {
  const result: AnalysisResult = {
    bodyAnalysis: { symptoms: [], recoveryStage: '', fullContent: '' },
    dailyAdvice: { diet: [], sleep: [], exercise: [], emotion: [], caution: [] },
    projectRecommendations: {
      core: [],
      auxiliary: [],
      reason: '',
      cycle: '',
      effect: '',
    },
  };

  const symptomTags = [
    '气血不足', '手脚冰凉', '盆底肌松弛', '轻度漏尿', '腹直肌分离',
    '睡眠质量差', '恶露不尽', '子宫收缩不良', '骨盆外扩'
  ];

  const bodyMatch = content.match(/身体状况分析[\s\S]*?(?:项目搭配|$)/i);
  if (bodyMatch) {
    symptomTags.forEach(tag => {
      if (bodyMatch[0].includes(tag) && !result.bodyAnalysis.symptoms.includes(tag)) {
        result.bodyAnalysis.symptoms.push(tag);
      }
    });
    const stageMatch = bodyMatch[0].match(/恢复阶段[：:]\s*([^\n]+)/);
    if (stageMatch) result.bodyAnalysis.recoveryStage = stageMatch[1].trim();
    else if (bodyMatch[0].includes('黄金期')) result.bodyAnalysis.recoveryStage = '黄金恢复期';
  }

  const projectMatch = content.match(/项目搭配推荐[\s\S]*$/i);
  if (projectMatch) {
    const cleanSection = projectMatch[0];
    const coreMatch = cleanSection.match(/核心项目[\s\S]*?(?:辅助项目|搭配原因|$)/i);
    if (coreMatch) {
      const coreItems = coreMatch[0].match(/([^、\n,，]+?)\s*(\d+\s*次)/g) || [];
      result.projectRecommendations.core = coreItems.map(item => {
        const parts = item.trim().split(/\s+/);
        const count = parts.pop() || '';
        return { name: parts.join(' '), count };
      }).filter(item => item.name && item.name.length < 15);
    }

    const auxMatch = cleanSection.match(/辅助项目[\s\S]*?(?:搭配原因|调理周期|预期效果|$)/i);
    if (auxMatch) {
      const auxItems = auxMatch[0].match(/([^、\n,，]+?)\s*(\d+\s*次)/g) || [];
      result.projectRecommendations.auxiliary = auxItems.map(item => {
        const parts = item.trim().split(/\s+/);
        const count = parts.pop() || '';
        return { name: parts.join(' '), count };
      }).filter(item => item.name && item.name.length < 15);
    }

    const reasonMatch = cleanSection.match(/搭配原因[：:]\s*([\s\S]*?)(?:\n\n|调理周期|预期效果|$)/i);
    if (reasonMatch) {
      result.projectRecommendations.reason = reasonMatch[1].trim().slice(0, 120);
    }
  }

  return result;
}

function cleanMarkdown(text: string): string {
  if (!text) return '';
  return text
    .replace(/\*\*(.*?)\*\*/g, '$1')
    .replace(/\*(.*?)\*/g, '$1')
    .replace(/`(.*?)`/g, '$1')
    .replace(/^- /gm, '')
    .replace(/^\+ /gm, '')
    .replace(/^\* /gm, '')
    .replace(/^\d+\. /gm, '')
    .replace(/^#{1,6}\s*/gm, '')              // 移除行首 markdown 标题 #
    .replace(/#{1,6}\s*(?:▶\s*)?/g, '')        // ✅ 移除中间的 ### ▶ 或 ###
    .replace(/^▶\s*/gm, '')                  // 移除行首 ▶ 符号
    .replace(/\u25B6\s*/g, '')               // 额外处理 ▶ Unicode
    .replace(/^-{3,}\s*$/gm, '')             // 移除分隔线 ---
    .replace(/\s*#{2,}\s*/g, ' ')            // 清理中间多余的 ## 或 ###
    .trim();
}

function simplifyText(text: string): string {
  let result = cleanMarkdown(text);
  result = result.replace(/您好?|您好?|你好?|亲爱的?|尊敬的?|欢迎?|谢谢?|感谢?|请?|建议?|注意?/g, '');
  result = result.replace(/非常?|特别?|十分?|很?|相当?/g, '');
  result = result.replace(/可以?|能够?|需要?|应该?/g, '');
  result = result.replace(/[🌸🌙🚶‍♀️💝⚠️✨🍀💡📅🎯]/g, '');
  result = result.replace(/\s+/g, ' ').trim();
  return result;
}

function parseSection(content: string, pattern: RegExp, minLen: number = 3, maxLen: number = 50): string[] {
  const match = content.match(pattern);
  if (!match) return [];

  const result: string[] = [];
  const lines = match[1].split(/[。；\n]/);
  let pendingTitle = ''; // 暂存以冒号结尾的子标题

  lines.forEach(line => {
    if (!line) return;
    let trimmed = line.trim()
      .replace(/^[①②③④⑤⑥⑦⑧⑨⑩]\s*/, '')
      .replace(/^[-*]\s*/, '')
      .replace(/^[0-9]+\.\s*/, '');

    trimmed = simplifyText(trimmed);

    if (trimmed.length < minLen) return;

    // 🔍 判断是否是子标题行（以冒号结尾，且比较短）
    const endsWithColon = /[:：]\s*$/.test(trimmed);
    const isShortTitle = trimmed.length < 20 && endsWithColon;

    if (isShortTitle) {
      pendingTitle = trimmed;
      return;
    }

    // 如果有暂存的子标题，和当前行合并
    if (pendingTitle) {
      const combined = `${pendingTitle}${trimmed}`;
      if (combined.length >= minLen && combined.length <= maxLen && !result.includes(combined)) {
        result.push(combined);
      }
      pendingTitle = '';
      return;
    }

    if (trimmed.length <= maxLen && !result.includes(trimmed)) {
      result.push(trimmed);
    }
  });

  return result;
}

function parseExerciseSection(content: string, pattern: RegExp): string[] {
  const match = content.match(pattern);
  if (!match) return [];

  const result: string[] = [];
  const lines = match[1].split(/[。；\n]/);
  let pendingTitle = ''; // 暂存以冒号结尾的子标题

  lines.forEach(line => {
    if (!line) return;
    let trimmed = line.trim()
      .replace(/^[①②③④⑤⑥⑦⑧⑨⑩]\s*/, '')
      .replace(/^[-*]\s*/, '')
      .replace(/^[0-9]+\.\s*/, '');

    trimmed = simplifyText(trimmed);

    if (trimmed.length < 3) return;
    if (result.includes(trimmed)) return;

    // 🔍 判断是否是子标题行（以冒号结尾，且没有具体内容）
    // 例如："进行针对性的腹直肌修复训练："
    const endsWithColon = /[:：]\s*$/.test(trimmed);
    const isShortTitle = trimmed.length < 20 && endsWithColon;

    if (isShortTitle) {
      // 这是子标题，暂存起来，和下一行合并
      pendingTitle = trimmed;
      return;
    }

    // 如果有暂存的子标题，和当前行合并
    if (pendingTitle) {
      const combined = `${pendingTitle}${trimmed}`;
      if (combined.length >= 3 && !result.includes(combined)) {
        result.push(combined);
      }
      pendingTitle = '';
      return;
    }

    result.push(trimmed);
  });

  return result;
}

function findKeywordIndex(text: string, keyword: string): number {
  const patterns = [
    new RegExp(`[\\s\\S]*?(${keyword})`, 'i'),
    new RegExp(`[\\s\\S]*?([\\p{P}\\p{S}\\s]*${keyword})`, 'iu'),
  ];
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match && match.index !== undefined) {
      return match.index + match[0].length - match[1].length;
    }
  }
  return text.indexOf(keyword);
}

function extractProjectsSimple(text: string): Array<{ name: string; count: string }> {
  const found: Array<{ name: string; count: string }> = [];
  if (!text) return found;

  const eachCountMatch = text.match(/各\s*(\d+)\s*次/);
  let normalizedText = text;
  if (eachCountMatch) {
    const eachCount = eachCountMatch[1];
    normalizedText = text.replace(/各\s*\d+\s*次/, '').trim();
    if (normalizedText.endsWith('+') || normalizedText.endsWith('、') || normalizedText.endsWith(',')) {
      normalizedText = normalizedText.slice(0, -1).trim();
    }
    const parts = normalizedText.split(/\s*[\+\、,，]\s*/).filter(Boolean);
    parts.forEach(part => {
      const trimmed = part.trim();
      if (trimmed) {
        found.push({ name: trimmed, count: `${eachCount}次` });
      }
    });
    return found;
  }

  const eachXMatch = text.match(/各\s*[xX]\s*(\d+)/);
  if (eachXMatch) {
    const eachCount = eachXMatch[1];
    normalizedText = text.replace(/各\s*[xX]\s*\d+/, '').trim();
    if (normalizedText.endsWith('+') || normalizedText.endsWith('、') || normalizedText.endsWith(',')) {
      normalizedText = normalizedText.slice(0, -1).trim();
    }
    const parts = normalizedText.split(/\s*[\+\、,，]\s*/).filter(Boolean);
    parts.forEach(part => {
      const trimmed = part.trim();
      if (trimmed) {
        found.push({ name: trimmed, count: `${eachCount}次` });
      }
    });
    return found;
  }

  const items = normalizedText.split(/[,，、＋+\n]/).map(s => s.trim()).filter(Boolean);

  items.forEach(item => {
    const match = item.match(/^(.+?)(?:\s*(?:(\d+)\s*次|[xX]\s*(\d+)))?$/);
    if (match && match[1]) {
      let name = match[1]?.trim() || '';
      if (!name) return;

      let count = match[2] ? `${match[2]}次` : (match[3] ? `${match[3]}次` : '待定');

      name = name.replace(/^[:：\s*"`']+/, '').trim();

      if (name && !found.some(f => f.name === name)) {
        found.push({ name, count });
      }
    }
  });

  return found;
}

function parseAIResponse(content: string): AnalysisResult {
  const result: AnalysisResult = {
    bodyAnalysis: { symptoms: [], recoveryStage: '', fullContent: '' },
    dailyAdvice: { diet: [], sleep: [], exercise: [], emotion: [], caution: [] },
    projectRecommendations: {
      core: [],
      auxiliary: [],
      reason: '',
      cycle: '',
      effect: '',
    },
  };

  const symptomTags = [
    '脸色暗沉发黄', '面色苍白', '气色萎靡', '气血亏虚', '手脚冰凉', '头晕乏力', '气血不足',
    '脾胃虚弱', '脾胃不和', '消化不良', '腹胀积食', '大便溏稀', '胃口差', '湿气重', '运化差',
    '内分泌紊乱', '月经不调', '经期紊乱', '烦躁易怒', '代谢变慢', '潮热盗汗', '内分泌失调',
    '免疫力低下', '易感冒疲劳', '体虚乏力', '抵抗力差', '容易生病',
    '入睡困难', '失眠多梦', '易醒早醒', '睡眠质量差', '神经衰弱', '熬夜虚耗',
    '恶露不尽', '恶露淋漓', '恶露残留', '恶露排不干净',
    '子宫收缩不良', '子宫偏大', '子宫恢复缓慢', '子宫松弛下垂',
    '子宫毒素堆积', '宫寒瘀堵', '宫腔垃圾', '宫寒痛经', '宫腔淤堵',
    '子宫衰老松弛', '卵巢功能下降', '私处干涩松弛', '生殖衰老', '宫寒体虚',
    '骨盆外扩', '骨盆前倾', '骨盆后倾', '骨盆张开', '胯宽假胯宽', '骨盆移位', '耻骨分离',
    '腹直肌分离', '腹壁松弛', '肚子松垮', '腹部无力', '中度分离', '轻度分离', '重度分离',
    '盆底肌松弛', '盆底肌无力', '漏尿', '打喷嚏漏尿', '阴道松弛', '下坠坠胀', '盆底肌力差',
    '月子受凉', '月子体虚', '产后风湿', '腰酸背痛', '月子虚汗', '月子后遗症', '怕冷怕风',
    '乳汁稀少', '奶水不足', '泌乳不畅', '堵奶涨奶',
    '乳房残奶淤积', '残汁堆积', '断奶残留乳汁',
    '乳腺增生', '乳房胀痛', '乳腺结节', '乳腺淤堵', '经期乳房刺痛',
    '胸部扁平偏小', '乳房萎缩干瘪', '产后胸部缩水',
    '乳房下垂松弛', '胸部外扩', '乳房下垂松软', '胸型塌陷',
    '乳房松弛老化', '胸部气血不畅', '乳房下垂外扩',
    '产后肥胖', '腹部赘肉多', '全身臃肿', '脂肪堆积', '代谢肥胖',
    '身材走样', '体态臃肿', '全身松弛', '身材变形', '腰腹肥胖松垮',
    '气虚血瘀', '乳腺炎', '骨质疏松', '心理问题', '伤口愈合不良', '血栓', '产后抑郁', '便秘', '水肿'
  ];

  const coreProjects = ['盆底肌修复', '盆底肌训练', '腹直肌修复', '腹直肌恢复', '骨盆闭合', '骨盆修复', '子宫复旧', '产后催乳', '去残汁', '去增生', '胸部增大', '胸部提升', '胸部保养', '产后减脂', '产后塑形', '腹部减脂', '塑形', '产后瑜伽'];
  const auxiliaryProjects = ['产后减脂', '产后塑形', '腹部减脂', '塑形', '五行调理', '五行调养', '脾胃调理', '气血调理', '气色调理', '气色调养', '内分泌调理', '身体调养', '月子病调养', '月子调养', '免疫力提升', '失眠调理', '排恶露', '子宫清毒', '子宫保养', '生殖减龄', '中药熏蒸', '艾灸理疗', '产后发汗', '月子餐', '心理疏导', '营养补充', '经络按摩', '皮肤护理', '私密护理', '肩颈放松', '腿部按摩'];

  // 去除分隔线干扰，便于更准确地提取各部分内容
  const cleanedContent = content.replace(/^-{3,}\s*$/gm, '').replace(/\n{3,}/g, '\n\n');

  // 身体状况分析完整内容提取 - 同时支持 ## 身体状况分析 和 **身体状况分析** 格式
  const bodyAnalysisFullMatch = cleanedContent.match(/^([\s\S]*?)(?=(?:#{2,3}|#{1,6})\s*(?:▶\s*)?日常建议|(?:#{2,3}|#{1,6})\s*(?:▶\s*)?项目搭配|$)/i);
  if (bodyAnalysisFullMatch && bodyAnalysisFullMatch[1]) {
    result.bodyAnalysis.fullContent = bodyAnalysisFullMatch[1].trim();
  }

  // 身体状况分析匹配 - 同时支持 ## 身体状况分析 和 **身体状况分析** 格式
  const bodyAnalysisMatch = cleanedContent.match(/(?:#{2,3}|#{1,6})\s*(?:▶\s*)?身体状况分析[：:]?\s*([\s\S]*?)(?=(?:#{2,3}|#{1,6})\s*(?:▶\s*)?日常建议|(?:#{2,3}|#{1,6})\s*(?:▶\s*)?项目搭配|$)/i)
    || cleanedContent.match(/(?:\*\*|\*)\s*身体状况分析[：:]?\s*([\s\S]*?)(?=(?:\*\*|\*)\s*日常建议|(?:\*\*|\*)\s*项目搭配|$)/i);
  if (bodyAnalysisMatch && bodyAnalysisMatch[1]) {
    const section = bodyAnalysisMatch[1];
    symptomTags.forEach(tag => {
      if (section.includes(tag) && !result.bodyAnalysis.symptoms.includes(tag)) {
        result.bodyAnalysis.symptoms.push(tag);
      }
    });
    const stageMatch = section.match(/恢复阶段|阶段[^：:]*[：:]\s*([^。，\n]+)/i);
    if (stageMatch && stageMatch[1]) {
      result.bodyAnalysis.recoveryStage = stageMatch[1].trim();
    } else if (section.includes('黄金期')) {
      result.bodyAnalysis.recoveryStage = '黄金恢复期';
    } else if (section.includes('42天') || section.includes('满月')) {
      result.bodyAnalysis.recoveryStage = '42天关键期';
    }
  }

  // 日常建议匹配 - 增强版：支持更多格式
  // 1. ### 饮食调理 / ### ▶ 饮食调理
  // 2. **饮食调理** / ***饮食调理**
  // 3. ## 饮食调理
  // 4. 饮食调理: / 饮食调理：
  const patterns = [
    /#{1,6}\s*(?:▶\s*)?([饮食作息运动情志注意][^#\n]{0,10})[:：]?\s*([\s\S]*?)(?=#{1,6}\s*(?:▶\s*)?[饮食作息运动情志注意]|#{1,6}\s*(?:▶\s*)?项目搭配|$)/i,
    /\*\*([饮食作息运动情志注意][^\*]{0,10})\*\*[:：]?\s*([\s\S]*?)(?=\*\*[饮食作息运动情志注意]|#{1,6}\s*(?:▶\s*)?项目搭配|$)/i,
    /([饮食作息运动情志注意][^\n]{0,10})[:：]\s*([\s\S]*?)(?=\n[饮食作息运动情志注意][^\n]{0,10}[:：]|\n#{1,6}|项目搭配|$)/i,
  ];

  // 尝试从原始内容中提取日常建议（不用 cleanedContent，因为需要保留原始格式）
  const rawDailyAdvice = content;
  
  // 匹配饮食调理
  const dietPatterns = [
    /(?:###|##|#)\s*(?:▶\s*)?饮食调理[:：]?\s*([\s\S]*?)(?=(?:###|##|#)\s*(?:▶\s*)?(?:作息|运动|情志|注意)|(?:###|##|#)\s*(?:▶\s*)?项目搭配|$)/i,
    /\*\*饮食调理\*\*[:：]?\s*([\s\S]*?)(?=\*\*作息|\*\*运动|\*\*情志|\*\*注意|###\s*项目搭配|$)/i,
    /饮食调理[：:]\s*([\s\S]*?)(?=作息建议|运动建议|情志调节|注意事项|项目搭配)/i,
  ];
  
  for (const p of dietPatterns) {
    const match = rawDailyAdvice.match(p);
    if (match && match[1] && match[1].trim().length > 5) {
      result.dailyAdvice.diet = parseSection(`饮食调理：${match[1]}`, /饮食调理[:：]?\s*([\s\S]*?)$/i);
      break;
    }
  }
  
  // 匹配作息建议
  const sleepPatterns = [
    /(?:###|##|#)\s*(?:▶\s*)?作息建议[:：]?\s*([\s\S]*?)(?=(?:###|##|#)\s*(?:▶\s*)?(?:饮食|运动|情志|注意)|(?:###|##|#)\s*(?:▶\s*)?项目搭配|$)/i,
    /\*\*作息建议\*\*[:：]?\s*([\s\S]*?)(?=\*\*饮食|\*\*运动|\*\*情志|\*\*注意|###\s*项目搭配|$)/i,
    /作息建议[：:]\s*([\s\S]*?)(?=饮食调理|运动建议|情志调节|注意事项|项目搭配)/i,
  ];
  
  for (const p of sleepPatterns) {
    const match = rawDailyAdvice.match(p);
    if (match && match[1] && match[1].trim().length > 5) {
      result.dailyAdvice.sleep = parseSection(`作息建议：${match[1]}`, /作息建议[:：]?\s*([\s\S]*?)$/i);
      break;
    }
  }
  
  // 匹配运动建议
  const exercisePatterns = [
    /(?:###|##|#)\s*(?:▶\s*)?运动建议[:：]?\s*([\s\S]*?)(?=(?:###|##|#)\s*(?:▶\s*)?(?:饮食|作息|情志|注意)|(?:###|##|#)\s*(?:▶\s*)?项目搭配|$)/i,
    /\*\*运动建议\*\*[:：]?\s*([\s\S]*?)(?=\*\*饮食|\*\*作息|\*\*情志|\*\*注意|###\s*项目搭配|$)/i,
    /运动建议[：:]\s*([\s\S]*?)(?=饮食调理|作息建议|情志调节|注意事项|项目搭配)/i,
  ];
  
  for (const p of exercisePatterns) {
    const match = rawDailyAdvice.match(p);
    if (match && match[1] && match[1].trim().length > 5) {
      result.dailyAdvice.exercise = parseExerciseSection(`运动建议：${match[1]}`, /运动建议[:：]?\s*([\s\S]*?)$/i);
      break;
    }
  }
  
  // 匹配情志调节
  const emotionPatterns = [
    /(?:###|##|#)\s*(?:▶\s*)?情志调节[:：]?\s*([\s\S]*?)(?=(?:###|##|#)\s*(?:▶\s*)?(?:饮食|作息|运动|注意)|(?:###|##|#)\s*(?:▶\s*)?项目搭配|$)/i,
    /\*\*情志调节\*\*[:：]?\s*([\s\S]*?)(?=\*\*饮食|\*\*作息|\*\*运动|\*\*注意|###\s*项目搭配|$)/i,
    /情志调节[：:]\s*([\s\S]*?)(?=饮食调理|作息建议|运动建议|注意事项|项目搭配)/i,
  ];
  
  for (const p of emotionPatterns) {
    const match = rawDailyAdvice.match(p);
    if (match && match[1] && match[1].trim().length > 5) {
      result.dailyAdvice.emotion = parseSection(`情志调节：${match[1]}`, /情志调节[:：]?\s*([\s\S]*?)$/i);
      break;
    }
  }
  
  // 匹配注意事项
  const cautionPatterns = [
    /(?:###|##|#)\s*(?:▶\s*)?注意事项[:：]?\s*([\s\S]*?)(?=(?:###|##|#)\s*(?:▶\s*)?(?:饮食|作息|运动|情志)|(?:###|##|#)\s*(?:▶\s*)?项目搭配|$)/i,
    /\*\*注意事项\*\*[:：]?\s*([\s\S]*?)(?=\*\*饮食|\*\*作息|\*\*运动|\*\*情志|###\s*项目搭配|$)/i,
    /注意事项[：:]\s*([\s\S]*?)(?=饮食调理|作息建议|运动建议|情志调节|项目搭配)/i,
  ];
  
  for (const p of cautionPatterns) {
    const match = rawDailyAdvice.match(p);
    if (match && match[1] && match[1].trim().length > 5) {
      result.dailyAdvice.caution = parseSection(`注意事项：${match[1]}`, /注意事项[:：]?\s*([\s\S]*?)$/i);
      break;
    }
  }
  
  console.log('[Daily Advice] 饮食:', result.dailyAdvice.diet.length, '条');
  console.log('[Daily Advice] 作息:', result.dailyAdvice.sleep.length, '条');
  console.log('[Daily Advice] 运动:', result.dailyAdvice.exercise.length, '条');
  console.log('[Daily Advice] 情志:', result.dailyAdvice.emotion.length, '条');
  console.log('[Daily Advice] 注意:', result.dailyAdvice.caution.length, '条');

  // 项目搭配推荐匹配 - 同时支持 ## 项目搭配推荐 和 **项目搭配推荐** 格式
  const projectMatch = cleanedContent.match(/(?:#{2,3}|#{1,6})\s*(?:▶\s*)?项目搭配推荐?[:：]?\s*([\s\S]*?)$/i)
    || cleanedContent.match(/(?:\*\*|###?)\s*项目搭配推荐?[:：]?\s*([\s\S]*?)$/i);
  const projectSection = (projectMatch && projectMatch[1]) ? projectMatch[1] : '';
  const cleanSection = cleanMarkdown(projectSection);

  const coreKeyword = '核心项目';
  const auxKeyword = '辅助项目';
  const reasonIndex = findKeywordIndex(cleanSection, '搭配原因');
  const cycleIndex = findKeywordIndex(cleanSection, '调理周期');
  const effectIndex = findKeywordIndex(cleanSection, '预期效果');

  const coreIndex = findKeywordIndex(cleanSection, coreKeyword);
  const auxIndex = findKeywordIndex(cleanSection, auxKeyword);

  console.log('[Project Extract] 🔍 cleanSection 内容:', cleanSection.substring(0, 300));
  console.log('[Project Extract] coreIndex:', coreIndex, 'auxIndex:', auxIndex);
  console.log('[Project Extract] reasonIndex:', reasonIndex, 'cycleIndex:', cycleIndex, 'effectIndex:', effectIndex);

  if (cleanSection && coreIndex !== -1) {
    let coreEnd = auxIndex !== -1 ? auxIndex : (reasonIndex !== -1 ? reasonIndex : cleanSection.length);
    const coreText = cleanSection.substring(coreIndex + coreKeyword.length, coreEnd).trim();
    console.log('[Project Extract] 核心项目文本:', coreText);
    result.projectRecommendations.core = extractProjectsSimple(coreText);
    console.log('[Project Extract] 核心项目提取结果:', JSON.stringify(result.projectRecommendations.core));
  }

  if (cleanSection && auxIndex !== -1) {
    let auxEnd = reasonIndex !== -1 ? reasonIndex : (cycleIndex !== -1 ? cycleIndex : cleanSection.length);
    const auxText = cleanSection.substring(auxIndex + auxKeyword.length, auxEnd).trim();
    console.log('[Project Extract] 辅助项目文本:', auxText);
    result.projectRecommendations.auxiliary = extractProjectsSimple(auxText);
    console.log('[Project Extract] 辅助项目提取结果:', JSON.stringify(result.projectRecommendations.auxiliary));
  }

  if (result.projectRecommendations.core.length === 0 && cleanSection) {
    console.log('[Project Extract] ⚠️  核心项目未提取到，使用 fallback 提取');
    const fallbackExtract = (text: string, isCore: boolean) => {
      const found: Array<{ name: string; count: string }> = [];
      const targetProjects = isCore ? coreProjects : auxiliaryProjects;

      targetProjects.forEach(project => {
        if (text.includes(project)) {
          const projectIndex = text.indexOf(project);
          const aroundText = text.substring(Math.max(0, projectIndex - 30), Math.min(text.length, projectIndex + project.length + 30));
          const numMatch = aroundText.match(/(\d+)(?:次)?/);
          const count = numMatch ? `${numMatch[1]}次` : '待定';
          found.push({ name: project, count });
        }
      });

      return found;
    };

    result.projectRecommendations.core = fallbackExtract(cleanSection, true);
    if (result.projectRecommendations.auxiliary.length === 0) {
      console.log('[Project Extract] ⚠️  辅助项目未提取到，使用 fallback 提取');
      result.projectRecommendations.auxiliary = fallbackExtract(cleanSection, false);
    }
    console.log('[Project Extract] Fallback 核心结果:', JSON.stringify(result.projectRecommendations.core));
    console.log('[Project Extract] Fallback 辅助结果:', JSON.stringify(result.projectRecommendations.auxiliary));
  }

  // 先提取搭配原因、调理周期和预期效果（这样后面的增强逻辑才能使用 cycle）
  // ✅ 使用 cleanSection（已通过 cleanMarkdown 清理），而不是 projectSection（原始文本，可能含有 ### ▶ 标记）
  if (cleanSection && reasonIndex !== -1) {
    const end = cycleIndex !== -1 ? cycleIndex : (effectIndex !== -1 ? effectIndex : cleanSection.length);
    const afterText = cleanSection.substring(reasonIndex + '搭配原因'.length, end);
    const cleanText = afterText.replace(/^[:：\s*"`']+/, '').replace(/\*\*+$/, '').trim();
    result.projectRecommendations.reason = cleanText;
    console.log('[Project Extract] 搭配原因:', result.projectRecommendations.reason.substring(0, 100));
  }

  if (cleanSection && cycleIndex !== -1) {
    const end = effectIndex !== -1 ? effectIndex : cleanSection.length;
    const afterText = cleanSection.substring(cycleIndex + '调理周期'.length, end);
    const cleanText = afterText.replace(/^[:：\s*"`']+/, '').replace(/\*\*+$/, '').trim();
    result.projectRecommendations.cycle = cleanText;
    console.log('[Project Extract] 调理周期:', result.projectRecommendations.cycle.substring(0, 100));
  }

  if (cleanSection && effectIndex !== -1) {
    const afterText = cleanSection.substring(effectIndex + '预期效果'.length);
    const cleanText = afterText.replace(/^[:：\s*"`']+/, '').replace(/\*\*+$/, '').trim();
    const paragraphs = cleanText.split(/[\n]+/);
    if (paragraphs.length > 1) {
      paragraphs.pop();
    }
    const finalText = paragraphs.join('\n').trim();
    result.projectRecommendations.effect = finalText;
    console.log('[Project Extract] 预期效果长度:', result.projectRecommendations.effect.length);
  }

  // ✅ 现在调理周期已提取，增强项目次数逻辑放在这里！
  if (result.projectRecommendations.auxiliary.length > 0) {
    const cycleText = result.projectRecommendations.cycle || '';
    console.log('[Project Extract] 🔍 用于增强的调理周期文本:', cycleText);
    
    // 从调理周期中找第一个次数
    const cycleNumMatch = cycleText.match(/(\d+)\s*次/);
    const referenceCount = cycleNumMatch ? `${cycleNumMatch[1]}次` : '';
    console.log('[Project Extract] 从调理周期提取到的参考次数:', referenceCount);
    
    result.projectRecommendations.auxiliary = result.projectRecommendations.auxiliary.map(project => {
      if (!project.count || project.count === '待定') {
        console.log('[Project Extract] 🛠️  正在增强辅助项目:', project.name, '当前次数:', project.count);
        
        // 1. 尝试从原始 projectSection 中搜索该项目附近的数字
        const projectIdx = projectSection.indexOf(project.name);
        if (projectIdx !== -1) {
          const around = projectSection.substring(Math.max(0, projectIdx - 50), Math.min(projectSection.length, projectIdx + project.name.length + 50));
          const match = around.match(/(\d+)\s*次/);
          if (match) {
            console.log('[Project Extract] ✅ 从项目附近找到次数:', match[1]);
            return { ...project, count: `${match[1]}次` };
          }
        }
        // 2. 使用调理周期中的参考次数
        if (referenceCount) {
          console.log('[Project Extract] ✅ 使用调理周期参考次数:', referenceCount);
          return { ...project, count: referenceCount };
        }
        console.log('[Project Extract] ⚠️  无法获取次数，保持原值');
      }
      return project;
    });
    console.log('[Project Extract] ✅ 最终辅助项目:', JSON.stringify(result.projectRecommendations.auxiliary));
  }

  // ✅ 同样处理核心项目
  if (result.projectRecommendations.core.length > 0) {
    const cycleText = result.projectRecommendations.cycle || '';
    const cycleNumMatch = cycleText.match(/(\d+)\s*次/);
    const referenceCount = cycleNumMatch ? `${cycleNumMatch[1]}次` : '';
    
    result.projectRecommendations.core = result.projectRecommendations.core.map(project => {
      if (!project.count || project.count === '待定') {
        const projectIdx = projectSection.indexOf(project.name);
        if (projectIdx !== -1) {
          const around = projectSection.substring(Math.max(0, projectIdx - 50), Math.min(projectSection.length, projectIdx + project.name.length + 50));
          const match = around.match(/(\d+)\s*次/);
          if (match) {
            return { ...project, count: `${match[1]}次` };
          }
        }
        if (referenceCount) {
          return { ...project, count: referenceCount };
        }
      }
      return project;
    });
    console.log('[Project Extract] ✅ 最终核心项目:', JSON.stringify(result.projectRecommendations.core));
  }

  return result;
}

export default function AiAnalysisPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { storeId } = useAuthStore();
  const [inputMessage, setInputMessage] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [customerInfo, setCustomerInfo] = useState<Customer | null>(null);
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult>({
    bodyAnalysis: { symptoms: [], recoveryStage: '', fullContent: '' },
    dailyAdvice: { diet: [], sleep: [], exercise: [], emotion: [], caution: [] },
    projectRecommendations: { core: [], auxiliary: [], reason: '', cycle: '', effect: '' },
  });
  const [uploadedImageBase64, setUploadedImageBase64] = useState('');
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // 防止 AI 请求被重复调用的标志位
  const hasStartedAnalysisRef = useRef(false);
  const requestCountRef = useRef(0);

  useEffect(() => {
    // 🔍 调试日志：记录 useEffect 触发
    console.log('[AI-Analysis] useEffect 触发，当前请求次数:', requestCountRef.current);
    console.log('[AI-Analysis] hasStartedAnalysisRef:', hasStartedAnalysisRef.current);
    
    // ✅ 如果已经发起过请求，直接返回，防止重复调用
    if (hasStartedAnalysisRef.current) {
      console.log('[AI-Analysis] ⚠️  检测到重复调用，已阻止！');
      return;
    }
    
    const customerDataStr = searchParams.get('customerData');
    if (customerDataStr) {
      try {
        const parsedCustomer = JSON.parse(decodeURIComponent(customerDataStr));
        console.log('[AI-Analysis] 解析到客户数据:', parsedCustomer.name);
        
        setCustomerInfo(parsedCustomer);
        
        // 标记已启动，防止重复
        hasStartedAnalysisRef.current = true;
        requestCountRef.current += 1;
        console.log('[AI-Analysis] ✅ 发起第 ' + requestCountRef.current + ' 次 AI 分析请求');
        
        startAIAnalysis(parsedCustomer);
      } catch (error) {
        console.error('[AI-Analysis] ❌ 解析客户数据失败:', error);
      }
    } else {
      console.log('[AI-Analysis] ℹ️  无客户数据，跳转到报告提交页');
      router.push('/store/report-submit');
      return;
    }
  }, []);

  const requestAIStream = async (payload: Record<string, unknown>) => {
    // 🔍 调试日志：记录网络请求发起
    console.log('[AI-Analysis] 🌐 发起网络请求到 /api/store/ai-chat');
    console.log('[AI-Analysis] 📦 请求 payload:', JSON.stringify(payload).substring(0, 200) + '...');
    console.log('[AI-Analysis] ⏱️  时间戳:', new Date().toISOString());
    
    const res = await fetch('/api/store/ai-chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...payload, stream: true }),
    });

    if (!res.ok) {
      console.error('[AI-Analysis] ❌ 请求失败，状态码:', res.status);
      throw new Error('AI request failed');
    }
    
    console.log('[AI-Analysis] ✅ 请求成功，开始处理响应...');

    if (!res.body) {
      const data = await res.json();
      const rawReply = data.reply || '';
      const reply = cleanDialogMessage(rawReply);
      setMessages((prev) => {
        const updated = [...prev];
        const lastMsg = updated[updated.length - 1];
        if (lastMsg && lastMsg.role === 'ai') {
          updated[updated.length - 1] = { ...lastMsg, content: reply, loading: false };
        }
        return updated;
      });
      // 返回原始内容，确保 parseAIResponse 能准确提取各部分信息
      return rawReply;
    }

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    let fullReply = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const events = buffer.split('\n\n');
      buffer = events.pop() || '';

      for (const event of events) {
        const lines = event
          .split('\n')
          .map((line) => line.trim())
          .filter((line) => line.startsWith('data:'));

        for (const line of lines) {
          const raw = line.replace(/^data:\s*/, '');
          if (!raw) continue;

          let data: { delta?: string; done?: boolean; error?: string };
          try {
            data = JSON.parse(raw);
          } catch {
            continue;
          }
          if (data.error) {
            throw new Error(data.error);
          }
          if (data.done) {
            continue;
          }
          if (data.delta) {
            fullReply += data.delta;
            setMessages((prev) => {
              const updated = [...prev];
              const lastMsg = updated[updated.length - 1];
              if (lastMsg && lastMsg.role === 'ai') {
                updated[updated.length - 1] = {
                  ...lastMsg,
                  content: `${lastMsg.content}${data.delta}`,
                  loading: true,
                };
              }
              return updated;
            });
          }
        }
      }
    }

    // 流式响应完成后：
    // 1. 使用清理后的内容显示对话（更美观）
    // 2. 返回原始内容用于结构化提取（保留 markdown 格式，更准确）
    const cleanedReply = cleanDialogMessage(fullReply);
    
    setMessages((prev) => {
      const updated = [...prev];
      const lastMsg = updated[updated.length - 1];
      if (lastMsg && lastMsg.role === 'ai') {
        updated[updated.length - 1] = { ...lastMsg, content: cleanedReply, loading: false };
      }
      return updated;
    });

    // 返回原始内容，确保 parseAIResponse 能准确提取各部分信息
    return fullReply;
  };

  const startAIAnalysis = async (customer: Customer) => {
    setIsLoading(true);

    const textContent = `客户背景：
- 姓名：${customer.name}
- 产后天数：${customer.postpartumDays || '未知'}天
- 生产方式：${customer.deliveryMethod || '未知'}
- 胎次：${customer.birthOrder || '未知'}
- 身高/体重：${customer.height}cm / ${customer.weight}kg
- 身体症状：${customer.symptoms || '暂无描述'}`;

    let reportBase64 = '';
    let reportInfo = '';

    if (customer.reportFilePath) {
      try {
        const response = await fetch(customer.reportFilePath);
        if (response.ok) {
          const blob = await response.blob();
          const reader = new FileReader();
          reportBase64 = await new Promise((resolve) => {
            reader.onloadend = () => resolve(reader.result as string);
            reader.readAsDataURL(blob);
          });
        }
      } catch (error) {
        console.error('Failed to convert report to base64:', error);
      }
      reportInfo = `
- 医疗报告：${customer.reportFile || '已上传'}
- 报告链接：${customer.reportFilePath}`;
    }

    const displayMsg = textContent + reportInfo;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: displayMsg,
      timestamp: new Date(),
    };

    const aiLoadingMessage: Message = {
      id: (Date.now() + 1).toString(),
      role: 'ai',
      content: '',
      timestamp: new Date(),
      loading: true,
    };

    setMessages([userMessage, aiLoadingMessage]);

    try {
      const reply = await requestAIStream({
        customerId: customer.id,
        storeId: customer.storeId || storeId,
        messages: [{ role: 'user', content: displayMsg }],
        reportContent: customer.symptoms || '',
        reportFile: customer.reportFile || '',
        reportFilePath: customer.reportFilePath || '',
        reportBase64,
        promptType: 'plan',
      });
      setAnalysisResult(parseAIResponse(reply || mockAIReply));
    } catch (error) {
      console.error('Failed to start AI analysis:', error);
      setMessages((prev) => {
        const updated = [...prev];
        const lastMsg = updated[updated.length - 1];
        if (lastMsg && lastMsg.role === 'ai') {
          updated[updated.length - 1] = { ...lastMsg, content: mockAIReply, loading: false };
        }
        return updated;
      });
      setAnalysisResult(parseAIResponse(mockAIReply));
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendMessage = async () => {
    if (!inputMessage.trim() || isLoading || !customerInfo) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: inputMessage,
      timestamp: new Date(),
    };

    const aiLoadingMessage: Message = {
      id: (Date.now() + 1).toString(),
      role: 'ai',
      content: '',
      timestamp: new Date(),
      loading: true,
    };

    setMessages((prev) => [...prev, userMessage, aiLoadingMessage]);
    setInputMessage('');
    setIsLoading(true);

    try {
      const requestMessages = [...messages, userMessage]
        .filter((message) => !message.loading)
        .map((message) => ({
          role: message.role === 'ai' ? 'assistant' : 'user',
          content: message.content,
        }));
      const reply = await requestAIStream({
        customerId: customerInfo.id,
        storeId: customerInfo.storeId || storeId,
        messages: requestMessages,
        promptType: 'plan',
      });
      if (reply) {
        setAnalysisResult(parseAIResponse(reply));
      }
    } catch (error) {
      console.error('Failed to send AI message:', error);
      setMessages((prev) => {
        const updated = [...prev];
        const lastMsg = updated[updated.length - 1];
        if (lastMsg && lastMsg.role === 'ai') {
          updated[updated.length - 1] = {
            ...lastMsg,
            content: 'AI response failed. Please retry.',
            loading: false,
          };
        }
        return updated;
      });
    } finally {
      setIsLoading(false);
    }
    return;

    setTimeout(() => {
      setMessages((prev) => {
        const updated = [...prev];
        const lastMsg = updated[updated.length - 1];
        if (lastMsg && lastMsg.role === 'ai') {
          updated[updated.length - 1] = {
            ...lastMsg,
            content: '建议继续按照上述调理方案执行，注意休息和营养补充，如有特殊情况请及时就医。',
            loading: false,
          };
        }
        return updated;
      });
      setIsLoading(false);
    }, 1500);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !customerInfo) return;

    if (file.size > 10 * 1024 * 1024) {
      alert('图片大小不能超过10MB');
      return;
    }

    const validTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'application/pdf'];
    if (!validTypes.includes(file.type)) {
      alert('请上传图片或PDF文件');
      return;
    }

    setIsUploadingImage(true);

    try {
      const reader = new FileReader();
      const base64 = await new Promise<string>((resolve, reject) => {
        reader.onloadend = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });

      const response = await fetch('/api/store/upload', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          fileName: file.name,
          fileBase64: base64,
        }),
      });

      if (response.ok) {
        const result = await response.json();
        setUploadedImageBase64(base64);
        
        const userMessage: Message = {
          id: Date.now().toString(),
          role: 'user',
          content: `📷 上传了报告图片：${result.fileName}`,
          timestamp: new Date(),
        };

        const aiLoadingMessage: Message = {
          id: (Date.now() + 1).toString(),
          role: 'ai',
          content: '',
          timestamp: new Date(),
          loading: true,
        };

        setMessages((prev) => [...prev, userMessage, aiLoadingMessage]);

        const reply = await requestAIStream({
          customerId: customerInfo.id,
          storeId: customerInfo.storeId || storeId,
          messages: [
            { 
              role: 'user', 
              content: [
                { type: 'text', text: `客户背景：\n- 姓名：${customerInfo.name}\n- 产后天数：${customerInfo.postpartumDays || '未知'}天\n- 生产方式：${customerInfo.deliveryMethod || '未知'}\n- 身体症状：${inputMessage || '根据图片分析'}` },
                { type: 'image_url', image_url: { url: base64 } }
              ]
            }
          ],
          reportContent: inputMessage || '',
          reportFile: result.fileName,
          reportFilePath: result.fileUrl,
          reportBase64: base64,
          promptType: 'plan',
        });

        if (reply) {
          setAnalysisResult(parseAIResponse(reply));
        }
      } else {
        alert('图片上传失败');
      }
    } catch (error) {
      console.error('Image upload failed:', error);
      alert('图片上传失败');
    } finally {
      setIsUploadingImage(false);
      setInputMessage('');
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleImageUploadClick = () => {
    fileInputRef.current?.click();
  };

  const handleExportReport = async () => {
    if (!customerInfo) return;
    const finalStoreId = customerInfo.storeId || storeId;
    if (!finalStoreId) return;
    const reportContent = messages
      .filter((message) => message.role === 'ai' && message.content)
      .map((message) => message.content)
      .join('\n\n');

    // 用时间戳生成临时 ID 作为 sessionStorage key
    const tempReportId = `temp_${Date.now()}`;
    const reportKey = `plan_${tempReportId}`;

    try {
      sessionStorage.setItem(
        reportKey,
        JSON.stringify({
          customer: customerInfo,
          analysis: analysisResult,
          reportId: tempReportId,
          reportContent,
          storeId: finalStoreId,
          reportDate: new Date().toLocaleDateString('zh-CN'),
          needSaveToDb: true,
        })
      );
    } catch (storageError) {
      console.error('Failed to save to sessionStorage:', storageError);
      return;
    }

    // 直接跳转，不等待数据库写入
    const queryParams = new URLSearchParams({ reportId: tempReportId });
    router.push(`/store/plan/preview?${queryParams.toString()}`);
  };

  return (
    <div className="h-full flex flex-col bg-gray-50 overflow-hidden">
      {/* 顶部标题栏 */}
      <div className="flex justify-between items-center px-6 py-5 flex-shrink-0">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">AI 智能分析</h1>
          <p className="text-sm text-gray-500 mt-1">正在分析客户健康状况...</p>
        </div>
        <Button
          className="bg-green-600 hover:bg-green-700"
          onClick={handleExportReport}
          disabled={isLoading}
        >
          <FileText className="h-4 w-4 mr-2" />
          预览报告
        </Button>
      </div>

      {/* 客户信息卡片 */}
      <Card className="mx-6 mb-4 flex-shrink-0">
        <CardContent className="pt-4 pb-4">
          <div className="grid grid-cols-3 md:grid-cols-6 gap-4">
            <div>
              <span className="text-xs text-gray-500">客户</span>
              <p className="text-sm font-medium text-gray-900">{customerInfo?.name || '-'}</p>
            </div>
            <div>
              <span className="text-xs text-gray-500">年龄</span>
              <p className="text-sm font-medium text-gray-900">{customerInfo?.age || '-'}岁</p>
            </div>
            <div>
              <span className="text-xs text-gray-500">产后</span>
              <p className="text-sm font-medium text-gray-900">{customerInfo?.postpartumDays || '-'}天</p>
            </div>
            <div>
              <span className="text-xs text-gray-500">方式</span>
              <p className="text-sm font-medium text-gray-900">
                {customerInfo?.deliveryMethod === 'natural' ? '顺产' : customerInfo?.deliveryMethod === 'cesarean' ? '剖宫产' : customerInfo?.deliveryMethod || '-'}
              </p>
            </div>
            <div>
              <span className="text-xs text-gray-500">胎次</span>
              <p className="text-sm font-medium text-gray-900">{customerInfo?.birthOrder || '-'}</p>
            </div>
            <div>
              <span className="text-xs text-gray-500">身高/体重</span>
              <p className="text-sm font-medium text-gray-900">{customerInfo?.height || '-'}/{customerInfo?.weight || '-'}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 主内容区 */}
      <div className="flex-1 min-h-0 overflow-hidden px-6 pb-6 flex flex-col">
        <div className="flex flex-col lg:flex-row gap-4 flex-1 min-h-0">
          {/* 左侧：对话 */}
          <Card className="flex flex-col flex-1 min-h-0 overflow-hidden">
            <CardHeader className="pb-2 flex-shrink-0">
              <CardTitle className="text-sm flex items-center gap-2">
                对话分析
                <Sparkles className="h-4 w-4 text-yellow-500" />
              </CardTitle>
            </CardHeader>
            <CardContent className="flex-1 min-h-0 flex flex-col overflow-hidden p-3">
              <div className="flex-1 overflow-y-auto space-y-2 mb-2 min-h-0">
                {messages.map((message) => (
                  <div
                    key={message.id}
                    className={`flex gap-2 ${message.role === 'user' ? 'flex-row-reverse' : ''}`}
                  >
                    <div
                      className={`w-6 h-6 rounded-full flex-shrink-0 flex items-center justify-center text-xs ${
                        message.role === 'ai' ? 'bg-green-600 text-white' : 'bg-gray-200 text-gray-600'
                      }`}
                    >
                      {message.role === 'ai' ? <Bot className="h-3 w-3" /> : '用'}
                    </div>
                    <div
                      className={`max-w-[85%] p-2 rounded-lg ${
                        message.role === 'user' ? 'bg-green-50 text-gray-800' : 'bg-white border border-gray-200'
                      }`}
                    >
                      {message.loading && !message.content ? (
                        <div className="flex items-center gap-2 text-gray-500 text-sm">
                          <div className="animate-spin h-3 w-3 border-2 border-green-600 border-t-transparent rounded-full" />
                          <span>AI 思考中...</span>
                        </div>
                      ) : message.loading ? (
                        <div className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">
                          {message.content}
                          <span className="inline-block w-1 animate-pulse text-green-600 ml-0.5">|</span>
                        </div>
                      ) : (
                        <div className="text-sm text-gray-700">
                          {(() => {
                            const content = message.content.replace(/^```(?:\w+)?\n?/, '').replace(/\n?```$/, '');
                            const thinkingMatch = content.match(/思考过程：([\s\S]*?)(?=\n\n## |\n\n### |$)/);
                            
                            if (thinkingMatch) {
                              const thinking = thinkingMatch[1].trim();
                              const finalReply = content.replace(/思考过程：[\s\S]*?(?=\n\n## |\n\n### |$)/, '').trim();
                              
                              return (
                                <div>
                                  <div className="mb-3 p-2 bg-blue-50 rounded-md border border-blue-200">
                                    <div className="text-xs font-medium text-blue-700 mb-1">🔍 AI 思考过程</div>
                                    <div className="text-xs text-blue-800 whitespace-pre-wrap">{thinking}</div>
                                  </div>
                                  {finalReply && (
                                    <ReactMarkdown>{finalReply}</ReactMarkdown>
                                  )}
                                </div>
                              );
                            }
                            
                            return <ReactMarkdown>{content}</ReactMarkdown>;
                          })()}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
                <div ref={messagesEndRef} />
              </div>
              <div className="flex gap-2 border-t border-gray-200 pt-2 flex-shrink-0">
                <Button
                  variant="outline"
                  className="h-8 px-3 text-gray-600 hover:text-gray-900 hover:bg-gray-100"
                  onClick={handleImageUploadClick}
                  disabled={isLoading || isUploadingImage}
                >
                  <Upload className="h-3 w-3" />
                </Button>
                <Input
                  placeholder="输入问题..."
                  value={inputMessage}
                  onChange={(e) => setInputMessage(e.target.value)}
                  onKeyPress={handleKeyPress}
                  disabled={isLoading}
                  className="h-8 text-sm"
                />
                <Button
                  className="bg-green-600 hover:bg-green-700 h-8 px-3"
                  onClick={handleSendMessage}
                  disabled={isLoading || !inputMessage.trim()}
                >
                  <Send className="h-3 w-3" />
                </Button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*,.pdf"
                  onChange={handleImageUpload}
                  className="hidden"
                />
              </div>
            </CardContent>
          </Card>

          {/* 右侧：分析结果 */}
          <Card className="flex flex-col flex-1 min-h-0 overflow-hidden">
            <CardHeader className="pb-2 flex-shrink-0">
              <CardTitle className="text-sm flex items-center gap-2">
                方案摘要
                <Heart className="h-4 w-4 text-red-500" />
              </CardTitle>
            </CardHeader>
            <CardContent className="flex-1 overflow-y-auto p-3 space-y-3 min-h-0">
              {/* 症状分析 */}
              <div className="bg-white border border-gray-200 rounded-lg p-3">
                <h4 className="text-xs font-semibold text-gray-700 mb-2">身体状况</h4>
                {analysisResult.bodyAnalysis.symptoms.length > 0 ? (
                  <div className="flex flex-wrap gap-1.5 mb-2">
                    {analysisResult.bodyAnalysis.symptoms.slice(0, 5).map((symptom, idx) => (
                      <span
                        key={idx}
                        className="px-2 py-1 bg-red-50 text-red-700 rounded-full text-xs"
                      >
                        {symptom}
                      </span>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-gray-400">分析中...</p>
                )}
                {analysisResult.bodyAnalysis.recoveryStage && (
                  <div className="text-xs text-gray-700 bg-yellow-50 p-2 rounded mt-2">
                    <span className="font-medium">恢复阶段：</span>
                    {analysisResult.bodyAnalysis.recoveryStage}
                  </div>
                )}
              </div>

              {/* 项目推荐 */}
              <div className="bg-white border border-gray-200 rounded-lg p-3">
                <h4 className="text-xs font-semibold text-gray-700 mb-2 flex items-center gap-1">
                  <Leaf className="h-3 w-3 text-green-600" />
                  项目搭配推荐
                </h4>
                {analysisResult.projectRecommendations.core.length > 0 && (
                  <div className="mb-2">
                    <span className="text-xs font-medium text-gray-600">核心项目</span>
                    <div className="space-y-1 mt-1">
                      {analysisResult.projectRecommendations.core.slice(0, 3).map((proj, idx) => (
                        <div key={idx} className="flex justify-between text-xs py-0.5">
                          <span className="text-gray-800">{proj.name}</span>
                          <span className="text-green-600 font-medium">{proj.count}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                {analysisResult.projectRecommendations.auxiliary.length > 0 && (
                  <div>
                    <span className="text-xs font-medium text-gray-600">辅助项目</span>
                    <div className="space-y-1 mt-1">
                      {analysisResult.projectRecommendations.auxiliary.slice(0, 4).map((proj, idx) => (
                        <div key={idx} className="flex justify-between text-xs py-0.5">
                          <span className="text-gray-800">{proj.name}</span>
                          <span className="text-green-600 font-medium">{proj.count}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                {analysisResult.projectRecommendations.reason && (
                  <p className="mt-2 text-xs text-gray-600 bg-gray-50 p-2 rounded leading-relaxed">
                    <span className="font-medium">搭配原因：</span>
                    {analysisResult.projectRecommendations.reason}
                  </p>
                )}
                {analysisResult.projectRecommendations.cycle && (
                  <p className="mt-2 text-xs text-green-700 bg-green-50 p-2 rounded leading-relaxed">
                    <span className="font-medium">调理周期：</span>
                    {analysisResult.projectRecommendations.cycle}
                  </p>
                )}
                {analysisResult.projectRecommendations.effect && (
                  <p className="mt-2 text-xs text-green-700 bg-green-50 p-2 rounded leading-relaxed">
                    <span className="font-medium">预期效果：</span>
                    {analysisResult.projectRecommendations.effect}
                  </p>
                )}
              </div>
              <div className="bg-white border border-gray-200 rounded-lg p-3">
                <h4 className="text-xs font-semibold text-gray-700 mb-2">日常建议摘要</h4>
                {[
                  { title: '饮食', items: analysisResult.dailyAdvice.diet },
                  { title: '作息', items: analysisResult.dailyAdvice.sleep },
                  { title: '运动', items: analysisResult.dailyAdvice.exercise },
                  { title: '情志', items: analysisResult.dailyAdvice.emotion },
                  { title: '注意', items: analysisResult.dailyAdvice.caution },
                ].some((section) => section.items.length > 0) ? (
                  <div className="space-y-2">
                    {[
                      { title: '饮食', items: analysisResult.dailyAdvice.diet },
                      { title: '作息', items: analysisResult.dailyAdvice.sleep },
                      { title: '运动', items: analysisResult.dailyAdvice.exercise },
                      { title: '情志', items: analysisResult.dailyAdvice.emotion },
                      { title: '注意', items: analysisResult.dailyAdvice.caution },
                    ].map((section) =>
                      section.items.length > 0 ? (
                        <div key={section.title}>
                          <span className="text-xs font-medium text-gray-600">{section.title}</span>
                          <ul className="mt-1 space-y-1">
                            {section.items.slice(0, 2).map((item, idx) => (
                              <li key={`${section.title}-${idx}`} className="text-xs text-gray-600 leading-relaxed">
                                {item}
                              </li>
                            ))}
                          </ul>
                        </div>
                      ) : null
                    )}
                  </div>
                ) : (
                  <p className="text-xs text-gray-400">分析中...</p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
