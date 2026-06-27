export interface ScriptMetadata {
  titleSuggestion: string;
  script: string;
  hashtags: string[];
  shootingTips: string[];
  editingTips: string[];
  userNeeds?: {
    surface?: string;
    deep?: string;
    coreBenefit?: string;
    emotion?: string;
    resonance?: string;
    insight?: string;
  };
}

export function cleanJsonString(content: string): string {
  let jsonStr = content;
  if (content.includes('```json')) {
    jsonStr = content.replace(/```json\n?/g, '').replace(/```+\n?/g, '').trim();
  } else if (content.includes('```')) {
    jsonStr = content.replace(/```+\n?/g, '').trim();
  }
  return jsonStr;
}

export function extractScriptMetadata(content: string): ScriptMetadata {
  try {
    const jsonStr = cleanJsonString(content);
    const json = JSON.parse(jsonStr);
    return {
      titleSuggestion: json.titleSuggestion || '',
      script: json.rewrittenScript || json.script || '',
      hashtags: Array.isArray(json.hashtags) ? json.hashtags : [],
      shootingTips: Array.isArray(json.shootingTips) ? json.shootingTips : [],
      editingTips: Array.isArray(json.editingTips) ? json.editingTips : [],
      userNeeds: json.userNeeds,
    };
  } catch {
    return {
      titleSuggestion: '',
      script: '',
      hashtags: [],
      shootingTips: [],
      editingTips: [],
    };
  }
}

export function extractTopicDirection(content: string): { summary: string; angle: string } {
  const summaryMatch = content.match(/【内容摘要】([\s\S]*?)(?=【切入角度】|$)/);
  const angleMatch = content.match(/【切入角度】([\s\S]*?)$/);
  return {
    summary: summaryMatch ? summaryMatch[1].trim() : '',
    angle: angleMatch ? angleMatch[1].trim() : '',
  };
}

export function extractScriptContent(content: string): string {
  try {
    const json = JSON.parse(content);
    return json.script || json.rewrittenScript || content;
  } catch {
    return content;
  }
}

export function getScriptTextToCopy(content: string): string {
  let textToCopy = content;
  try {
    const json = JSON.parse(content);
    if (json.rewrittenScript && typeof json.rewrittenScript === 'string') {
      textToCopy = json.rewrittenScript;
    } else if (json.script && typeof json.script === 'string') {
      textToCopy = json.script;
    }
  } catch {
  }
  return textToCopy;
}