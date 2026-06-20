'use client';

import React, { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import {
  ArrowLeft,
  FileText,
  Printer,
  Heart,
  Leaf,
  ChevronRight,
  Check,
  Sparkles,
  Star,
  Target,
  ClipboardList,
  CalendarClock,
  Utensils,
  Moon,
  Dumbbell,
} from '@/lib/icons';
import { useAuthStore } from '@/stores/auth.store';
import PlanSaveModal from '@/components/PlanSaveModal';

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
}

interface AnalysisResult {
  bodyAnalysis: {
    symptoms: string[];
    recoveryStage: string;
    fullContent: string;
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

const DEFAULT_SYMPTOMS = [
  '气血不足',
  '手脚冰凉',
  '盆底肌松弛',
  '轻度漏尿',
  '腹直肌分离',
  '睡眠质量差',
  '腰背酸痛',
  '情绪波动',
];

const DEFAULT_DIET = [
  '多食用红枣、桂圆、枸杞等补气血食材，建议每日红枣桂圆小米粥',
  '适量摄入鸡蛋、牛奶、瘦肉补充优质蛋白，每日保证2-3两优质蛋白',
  '多喝鱼汤、鸡汤促进乳汁分泌，可适量加入通草、王不留行等药材',
  '多吃新鲜蔬菜水果补充维生素和膳食纤维，预防便秘',
  '避免生冷辛辣刺激性食物，减少咖啡、茶类饮品摄入',
  '少食多餐，避免暴饮暴食，每日5-6餐为宜',
  '适量补充钙、铁、维生素D等营养素',
];

const DEFAULT_SLEEP = [
  '保证每天7-8小时充足睡眠，创造安静舒适的睡眠环境',
  '尽量与宝宝作息同步，宝宝睡时妈妈也抓紧时间休息',
  '睡前可用温水泡脚15-20分钟，配合按摩放松促进血液循环',
  '避免熬夜和过度劳累，白天可安排1-2次小睡补充精力',
  '保持卧室通风良好，温度适宜（22-24℃）',
  '睡前避免使用手机等电子产品，可听轻音乐帮助入睡',
];

const DEFAULT_EXERCISE = [
  '产后42天内以休息为主，避免剧烈运动和负重',
  '可进行轻柔的产后恢复操，每次15-20分钟',
  '坚持凯格尔运动帮助盆底肌恢复，每日3组，每组10-15次',
  '产后2个月后可逐步增加散步等轻度活动，从每日10分钟开始',
  '半年内避免仰卧起坐、平板支撑等腹部挤压运动',
  '建议在专业指导下进行产后瑜伽或普拉提',
  '根据体力恢复情况，循序渐进增加运动量',
];

const DEFAULT_EMOTION = [
  '保持心情愉悦，避免焦虑和抑郁情绪',
  '家人多给予关心和支持，分担育儿压力',
  '必要时可寻求专业心理咨询和疏导',
  '适当的户外活动和阳光照射有助于调节情绪',
  '保持与朋友的交流，避免过度孤独感',
  '学会放松技巧，如深呼吸、冥想等',
];

const DEFAULT_CAUTION = [
  '避免久坐久站，每1-2小时起身活动5-10分钟',
  '产后42天内避免同房，待复查确认恢复后再恢复',
  '注意个人卫生，勤换内衣，保持外阴清洁预防感染',
  '按时进行产后42天复查，关注子宫和盆底肌恢复情况',
  '如有异常恶露、发热、腹痛等情况及时就医',
  '避免提重物和剧烈运动，防止子宫脱垂',
  '注意保暖，避免受凉，特别是腹部和腰部',
];

const DEFAULT_CORE_PROJECTS = [
  { name: '盆底肌修复', count: '12次' },
  { name: '腹直肌修复', count: '10次' },
  { name: '骨盆闭合', count: '8次' },
];

const DEFAULT_AUX_PROJECTS = [
  { name: '气血调理', count: '6次' },
  { name: '子宫复旧', count: '6次' },
  { name: '艾灸理疗', count: '4次' },
  { name: '腰背舒缓', count: '4次' },
];

const DEFAULT_REASON =
  '盆底肌和腹直肌修复是产后恢复的重中之重，直接关系到客户的身体形态和功能恢复。盆底肌松弛可能导致漏尿、阴道松弛等问题，腹直肌分离影响腹部形态和核心力量。骨盆闭合有助于整体骨架调整，改善体态和缓解腰背疼痛。气血调理和子宫复旧从内部调理身体，帮助子宫恢复到孕前状态。艾灸理疗温经通络，促进血液循环，改善手脚冰凉等气血不足症状。全方位系统化调理，促进产后身心全面恢复。';

const DEFAULT_CYCLE =
  '建议在3个月内完成核心项目，每周2-3次，每次间隔48小时让身体有充分恢复时间。辅助项目可根据客户时间灵活安排，建议每周1-2次，可与核心项目穿插进行。完整调理周期建议为3-6个月，第一个月集中调理，第二个月巩固效果，第三个月维持保养。';

const DEFAULT_EFFECT = [
  '盆底肌功能明显改善，漏尿情况减轻或消失',
  '腹直肌分离缩小至1指以内，腹部紧致度提升',
  '骨盆位置趋于稳定，假胯宽情况改善',
  '整体气血充盈，手脚冰凉情况明显改善',
  '睡眠质量提升，精力恢复，疲劳感减轻',
  '身体形态逐渐恢复孕前状态，自信心提升',
  '腰背酸痛缓解，日常活动更加轻松自如',
  '身心状态全面改善，生活质量提升',
];

export default function PlanPreviewPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { storeId } = useAuthStore();
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);
  const [reportId, setReportId] = useState<string>('');
  const [reportDate, setReportDate] = useState<string>('');
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [existingPlanId, setExistingPlanId] = useState<string | null>(null);

  useEffect(() => {
    const reportIdParam = searchParams.get('reportId');
    let customerData: Customer | null = null;
    let analysisData: AnalysisResult | null = null;
    let reportId = reportIdParam || '';
    let reportDate = new Date().toLocaleDateString('zh-CN');
    let needSaveToDb = false;
    let reportContent = '';
    let storeIdForReport = '';

    if (reportIdParam) {
      const storageKey = `plan_${reportIdParam}`;
      try {
        const storedData = sessionStorage.getItem(storageKey);
        if (storedData) {
          const parsed = JSON.parse(storedData);
          customerData = parsed.customer;
          analysisData = parsed.analysis;
          reportId = parsed.reportId || reportIdParam;
          reportDate = parsed.reportDate || reportDate;
          needSaveToDb = parsed.needSaveToDb || false;
          reportContent = parsed.reportContent || '';
          storeIdForReport = parsed.storeId || '';
        }
      } catch (error) {
        console.error('Failed to read from sessionStorage:', error);
      }

      if (needSaveToDb && storeIdForReport && customerData) {
        const saveToDb = async () => {
          if (!customerData || !analysisData) return;
          try {
            const res = await fetch('/api/admin/reports', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                storeId: storeIdForReport,
                customerId: customerData.id,
                type: 'text',
                content: reportContent,
                images: [],
                structuredData: analysisData,
              }),
            });
            const data = await res.json();
            if (res.ok && data.id) {
              const newStorageKey = `plan_${data.id}`;
              const updatedData = {
                customer: customerData,
                analysis: analysisData,
                reportId: data.id,
                reportContent,
                storeId: storeIdForReport,
                reportDate,
                needSaveToDb: false,
              };
              try {
                sessionStorage.setItem(newStorageKey, JSON.stringify(updatedData));
                sessionStorage.removeItem(storageKey);
                setReportId(data.id);
              } catch (storageError) {
                console.error('Failed to update sessionStorage after save:', storageError);
              }
            }
          } catch (error) {
            console.error('Failed to save report to DB (async):', error);
          }
        };
        saveToDb();
      }
    }

    if (!customerData || !analysisData) {
      const customerDataStr = searchParams.get('customerData');
      const analysisDataStr = searchParams.get('analysisData');

      if (customerDataStr) {
        try {
          customerData = JSON.parse(decodeURIComponent(customerDataStr));
        } catch (error) {
          console.error('Failed to parse customer data:', error);
        }
      }
      if (analysisDataStr) {
        try {
          analysisData = JSON.parse(decodeURIComponent(analysisDataStr));
        } catch (error) {
          console.error('Failed to parse analysis data:', error);
        }
      }
    }

    if (customerData) {
      setCustomer(customerData);
    } else {
      setCustomer({
        id: 'default',
        name: '张美丽',
        phone: '138-0000-0000',
        age: 28,
        postpartumDays: 45,
        deliveryMethod: '顺产',
        birthOrder: '第一胎',
        hasAbortionHistory: '无',
        allergy: '无',
        height: 165,
        weight: 60,
        symptoms: '',
      });
    }

    if (analysisData) {
      setAnalysisResult(analysisData);
    } else {
      setAnalysisResult({
        bodyAnalysis: {
          symptoms: DEFAULT_SYMPTOMS,
          recoveryStage: '黄金恢复期',
          fullContent: '客户目前处于产后恢复的关键阶段，需要重点关注身体恢复和调理。',
        },
        dailyAdvice: {
          diet: DEFAULT_DIET,
          sleep: DEFAULT_SLEEP,
          exercise: DEFAULT_EXERCISE,
          emotion: DEFAULT_EMOTION,
          caution: DEFAULT_CAUTION,
        },
        projectRecommendations: {
          core: DEFAULT_CORE_PROJECTS,
          auxiliary: DEFAULT_AUX_PROJECTS,
          reason: DEFAULT_REASON,
          cycle: DEFAULT_CYCLE,
          effect: DEFAULT_EFFECT.join('\n'),
        },
      });
    }

    setReportId(reportId);
    setReportDate(reportDate);
  }, []);

  const handlePrint = () => {
    window.print();
  };

  const handleSavePlan = async () => {
    if (!customer || !analysisResult) return;

    const coreProjects = analysisResult.projectRecommendations.core.map((p) => ({
      name: p.name,
      suggestedCount: p.count,
    }));
    const assistantProjects = analysisResult.projectRecommendations.auxiliary.map((p) => ({
      name: p.name,
      suggestedCount: p.count,
    }));

    let foundExistingPlanId: string | null = null;

    if (reportId) {
      try {
        const res = await fetch(`/api/admin/plans?reportId=${encodeURIComponent(reportId)}&pageSize=1`);
        if (res.ok) {
          const data = await res.json();
          if (data.list && data.list.length > 0) {
            foundExistingPlanId = data.list[0].id;
          }
        }
      } catch (error) {
        console.warn('检查已有方案失败：', error);
      }
    }

    if (foundExistingPlanId) {
      const confirmReplace = window.confirm('该报告已有调理方案，是否覆盖？');
      if (!confirmReplace) return;
      setExistingPlanId(foundExistingPlanId);
    } else {
      setExistingPlanId(null);
    }

    setShowSaveModal(true);
  };

  const handleSavePlanConfirm = async (actualCounts: Record<string, string>) => {
    if (!customer || !analysisResult) return;
    const finalStoreId = customer.storeId || storeId;
    if (!finalStoreId) return;

    const coreProjects = analysisResult.projectRecommendations.core.map((p) => ({
      name: p.name,
      suggestedCount: p.count,
    }));
    const assistantProjects = analysisResult.projectRecommendations.auxiliary.map((p) => ({
      name: p.name,
      suggestedCount: p.count,
    }));

    const payload = {
      storeId: finalStoreId,
      customerId: customer.id,
      reportId,
      rawContent: analysisResult,
      structuredContent: analysisResult,
      coreProjects,
      assistantProjects,
      actualCounts,
    };

    try {
      const res = await fetch(existingPlanId ? `/api/admin/plans/${existingPlanId}` : '/api/admin/plans', {
        method: existingPlanId ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || '保存失败');
      }
      alert('方案保存成功');
    } catch (error) {
      console.error('保存方案失败:', error);
      alert('方案保存失败，请重试');
    }
  };

  const handleBack = () => {
    router.back();
  };

  return (
    <div className="flex-1 overflow-y-auto bg-gray-50 print:bg-white print:py-0 print:overflow-visible print:h-auto print:w-full">
      {/* 打印专用样式
          - @page margin: 15mm → 每页（包括跨页后的新页）都有均匀的 15mm 边距
          - .a4-paper 打印时取消额外 padding，避免和 @page margin 重复
          - 内容自然分页，不强制 break-inside
          
          【提示】如果打印时看到浏览器自动添加的页眉（时间戳/URL）和页脚：
          在打印对话框的"选项"区域，取消勾选"页眉和页脚"即可。
          （这是浏览器级别的功能，CSS 无法完全控制）*/}
      <style jsx global>{`
        @media print {
          @page {
            size: A4;
            margin: 15mm;
          }
          html, body {
            margin: 0;
            padding: 0;
            background: white;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
          * {
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
          /* A4 纸张容器：取消固定宽度和 padding，让 @page margin 控制边距 */
          .a4-paper {
            width: 100% !important;
            max-width: 100% !important;
            min-height: auto !important;
            padding: 0 !important;
            margin: 0 !important;
            box-shadow: none !important;
            box-sizing: border-box;
          }
          /* 内部板块之间的少量间距 */
          .a4-paper > * + * {
            margin-top: 3mm;
          }
          .a4-paper > :first-child {
            margin-top: 0;
          }
        }
      `}</style>

      {/* 顶部标题栏 - 打印时隐藏 */}
      <div className="flex justify-between items-center px-6 py-5 print:hidden">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">方案预览</h1>
          <p className="text-sm text-gray-500 mt-1">查看并管理客户的产后健康调理方案</p>
        </div>
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            onClick={handleBack}
            className="flex items-center gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            返回
          </Button>
          <Button
            variant="outline"
            onClick={handlePrint}
            className="flex items-center gap-2"
          >
            <Printer className="h-4 w-4" />
            打印
          </Button>
          <Button
            className="bg-green-600 hover:bg-green-700 flex items-center gap-2"
            onClick={handleSavePlan}
          >
            <FileText className="h-4 w-4" />
            保存方案
          </Button>
        </div>
      </div>

      <div
        className="a4-paper bg-white mx-auto shadow-lg print:shadow-none print:mx-0 print:my-0 print:w-full print:max-w-none print:border-0"
        style={{ width: '210mm', minHeight: '297mm', padding: '40px', maxWidth: '210mm' }}
      >
        {/* 文档头部 */}
        <div className="flex justify-between items-center pb-6 mb-6 border-b border-gray-200" style={{ borderBottomWidth: '1px' }}>
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-green-900 rounded-lg flex items-center justify-center">
              <span className="text-2xl">🌿</span>
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900" style={{ fontFamily: 'system-ui, sans-serif' }}>尚孕</h2>
              <p className="text-xs text-gray-600 uppercase tracking-wider">智慧医疗产康</p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-xs text-gray-500 uppercase">报告编号</p>
            <p className="text-sm font-bold text-gray-900">{reportId}</p>
            <p className="text-xs text-gray-500 mt-1">{reportDate}</p>
          </div>
        </div>

        {/* 报告标题 */}
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">产后恢复健康报告</h1>
          <p className="text-xs text-gray-500 uppercase tracking-widest">Postpartum Recovery Health Report</p>
        </div>

        {/* 客户信息 - 2行4列网格 */}
        <div className="grid grid-cols-4 rounded-lg overflow-hidden mb-8" style={{ background: '#f5f5f5' }}>
          <div className="p-3 border-r border-b" style={{ borderColor: '#e5e7eb' }}>
            <p className="text-xs text-gray-500 mb-1">客户姓名</p>
            <p className="text-sm font-bold text-gray-900">{customer?.name || '-'}</p>
          </div>
          <div className="p-3 border-r border-b" style={{ borderColor: '#e5e7eb' }}>
            <p className="text-xs text-gray-500 mb-1">年龄</p>
            <p className="text-sm font-bold text-gray-900">{customer?.age || '-'} 岁</p>
          </div>
          <div className="p-3 border-r border-b" style={{ borderColor: '#e5e7eb' }}>
            <p className="text-xs text-gray-500 mb-1">联系电话</p>
            <p className="text-sm font-bold text-gray-900">{customer?.phone || '-'}</p>
          </div>
          <div className="p-3 border-b" style={{ borderColor: '#e5e7eb' }}>
            <p className="text-xs text-gray-500 mb-1">产后天数</p>
            <p className="text-sm font-bold text-gray-900">{customer?.postpartumDays || '-'} 天</p>
          </div>
          <div className="p-3 border-r" style={{ borderColor: '#e5e7eb' }}>
            <p className="text-xs text-gray-500 mb-1">生产方式</p>
            <p className="text-sm font-bold text-gray-900">{customer?.deliveryMethod || '-'}</p>
          </div>
          <div className="p-3 border-r" style={{ borderColor: '#e5e7eb' }}>
            <p className="text-xs text-gray-500 mb-1">胎次</p>
            <p className="text-sm font-bold text-gray-900">{customer?.birthOrder || '-'}</p>
          </div>
          <div className="p-3 border-r" style={{ borderColor: '#e5e7eb' }}>
            <p className="text-xs text-gray-500 mb-1">小产记录</p>
            <p className="text-sm font-bold text-gray-900">无</p>
          </div>
          <div className="p-3">
            <p className="text-xs text-gray-500 mb-1">过敏史/既往病史</p>
            <p className="text-sm font-bold text-gray-900">{customer?.allergy || '无'}</p>
          </div>
        </div>

        {/* 身体状况分析 */}
        <section className="mb-6">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-1.5 h-6 rounded" style={{ background: '#003429' }}></div>
            <h3 className="text-base font-bold text-gray-900">身体状况分析</h3>
          </div>
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
            {/* 症状标签 */}
            {analysisResult?.bodyAnalysis?.symptoms && analysisResult.bodyAnalysis.symptoms.length > 0 ? (
              <div className="flex flex-wrap gap-2 mb-3">
                {analysisResult.bodyAnalysis.symptoms.map((symptom, idx) => (
                  <span
                    key={idx}
                    className="px-3 py-1.5 rounded-full text-sm bg-white border border-gray-200 text-gray-700"
                  >
                    {symptom}
                  </span>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-600 mb-3">暂无症状数据</p>
            )}

            {/* 恢复阶段 */}
            {analysisResult?.bodyAnalysis?.recoveryStage && (
              <p className="text-sm text-gray-700 mb-3">
                <span className="font-semibold">恢复阶段：</span>{analysisResult.bodyAnalysis.recoveryStage}
              </p>
            )}

            {/* 完整分析内容（只保留真正的身体状况分析，跳过问候语） */}
            {analysisResult?.bodyAnalysis?.fullContent && (
              <div className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap mt-3 pt-3 border-t border-gray-200">
                {(() => {
                  const raw = analysisResult.bodyAnalysis.fullContent;

                  // 1. 找出真正分析内容的起始位置
                  // 关键词："根据您"、"我为您分析"、"身体状况"、"您产后"、"目前您"、"分析如下" 等
                  const startKeywords = [
                    '根据您',
                    '为您分析',
                    '为您',
                    '目前您',
                    '分析如下',
                    '您产后',
                    '针对您',
                    '以下是',
                    '您目前',
                    '身体状况如下',
                    '综合评估',
                  ];

                  let startIdx = -1;
                  for (const keyword of startKeywords) {
                    const idx = raw.indexOf(keyword);
                    if (idx !== -1) {
                      if (startIdx === -1 || idx < startIdx) startIdx = idx;
                    }
                  }

                  let textToShow = raw;
                  if (startIdx !== -1) {
                    textToShow = raw.substring(startIdx);
                  }

                  // 2. 按行进一步清理
                  const lines = textToShow.split('\n');
                  const cleaned: string[] = [];

                  for (let i = 0; i < lines.length; i++) {
                    const line = lines[i].trim();

                    // 跳过空行
                    if (!line) {
                      cleaned.push('');
                      continue;
                    }

                    // 跳过问候语、自我介绍
                    if (
                      line.startsWith('亲爱的') ||
                      line.includes('妈妈，您好') ||
                      line.includes('妈妈您好') ||
                      line.includes('智慧小助手') ||
                      line.includes('很高兴为您服务') ||
                      line.includes('温暖的抱抱') ||
                      line.includes('我看到您现在是') ||
                      line.includes('为您的产后恢复之路保驾护航') ||
                      line.includes('为您解答') ||
                      line.includes('让我们一起') ||
                      line.includes('无论是产后') ||
                      line === '您好'
                    ) {
                      continue;
                    }

                    // 跳过标题（markdown 标题和纯标题）
                    if (
                      /^#{1,6}/.test(line) ||
                      /^▶\s*/.test(line) ||
                      line === '身体状况分析' ||
                      /^身体状况分析[:：]?$/.test(line) ||
                      /^身体状况[:：]?$/.test(line)
                    ) {
                      continue;
                    }

                    // 清理 markdown 格式标记
                    let cleanedLine = line
                      .replace(/\*\*(.*?)\*\*/g, '$1')
                      .replace(/\*(.*?)\*/g, '$1')
                      .replace(/`(.*?)`/g, '$1')
                      .replace(/^#{1,6}\s*/, '')
                      .replace(/^▶\s*/, '')
                      .trim();

                    if (cleanedLine) {
                      cleaned.push(cleanedLine);
                    }
                  }

                  return cleaned.join('\n').trim();
                })()}
              </div>
            )}
          </div>
        </section>

        {/* 项目搭配推荐 - 保留最新丰富样式 */}
        <section className="mb-8">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-1.5 h-6 rounded" style={{ background: '#003429' }}></div>
            <h3 className="text-base font-bold text-gray-900">项目搭配推荐</h3>
          </div>

          <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
            {/* 项目表格 */}
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200">
                    <th className="text-left py-3 px-5 font-semibold text-gray-700 w-32">项目分类</th>
                    <th className="text-left py-3 px-5 font-semibold text-gray-700">项目名称</th>
                    <th className="text-center py-3 px-5 font-semibold text-gray-700 w-24">建议次数</th>
                    <th className="text-left py-3 px-5 font-semibold text-gray-700">项目说明</th>
                  </tr>
                </thead>
                <tbody>
                  {analysisResult?.projectRecommendations?.core &&
                    analysisResult.projectRecommendations.core.length > 0 && (
                      <>
                        <tr className="bg-gray-50/50 border-b border-gray-100">
                          <td
                            className="py-4 px-5 align-middle font-semibold text-gray-800"
                            rowSpan={analysisResult.projectRecommendations.core.length + 1}
                          >
                            <div className="flex flex-col items-center gap-1">
                              <Star className="h-4 w-4 text-gray-700" />
                              <span>核心项目</span>
                            </div>
                          </td>
                        </tr>
                        {analysisResult.projectRecommendations.core.map((proj, idx) => (
                          <tr key={`core-${idx}`} className="border-b border-gray-100">
                            <td className="py-4 px-5 text-gray-900 font-medium">{proj.name}</td>
                            <td className="py-4 px-5 text-center text-gray-900 font-bold">
                              {proj.count || '待定'}
                            </td>
                            <td className="py-4 px-5 text-gray-600 text-xs">
                              {idx === 0 && '针对产后盆底肌松弛、漏尿等问题，采用专业仪器和手法进行修复'}
                              {idx === 1 && '修复腹直肌分离，改善腹部松弛，恢复紧致身材'}
                              {idx === 2 && '调整骨盆位置，改善产后骨盆外扩，缓解腰背疼痛'}
                              {idx >= 3 && '专业调理项目'}
                            </td>
                          </tr>
                        ))}
                      </>
                    )}
                  {analysisResult?.projectRecommendations?.auxiliary &&
                    analysisResult.projectRecommendations.auxiliary.length > 0 && (
                      <>
                        <tr className="bg-gray-50/50 border-b border-gray-100">
                          <td
                            className="py-4 px-5 align-middle font-semibold text-gray-800"
                            rowSpan={analysisResult.projectRecommendations.auxiliary.length + 1}
                          >
                            <div className="flex flex-col items-center gap-1">
                              <Sparkles className="h-4 w-4 text-gray-700" />
                              <span>辅助项目</span>
                            </div>
                          </td>
                        </tr>
                        {analysisResult.projectRecommendations.auxiliary.map((proj, idx) => (
                          <tr key={`aux-${idx}`} className="border-b border-gray-100">
                            <td className="py-4 px-5 text-gray-900 font-medium">{proj.name}</td>
                            <td className="py-4 px-5 text-center text-gray-900 font-bold">
                              {proj.count || '待定'}
                            </td>
                            <td className="py-4 px-5 text-gray-600 text-xs">
                              {idx === 0 && '从内部调理气血，改善手脚冰凉、气血不足等症状'}
                              {idx === 1 && '促进子宫恢复，帮助子宫收缩，减少产后出血'}
                              {idx === 2 && '传统艾灸理疗，温经通络，促进血液循环'}
                              {idx >= 3 && '缓解产后腰背酸痛，放松肌肉，改善体态'}
                            </td>
                          </tr>
                        ))}
                      </>
                    )}
                </tbody>
              </table>
            </div>

            {/* 项目说明 */}
            <div className="p-5 space-y-4 bg-white border-t border-gray-200">
              {analysisResult?.projectRecommendations?.reason && (
                <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                  <div className="font-bold text-gray-900 mb-2 flex items-center gap-2">
                    <ClipboardList className="h-4 w-4 text-gray-700" /> 搭配原因说明
                  </div>
                  <p className="text-sm text-gray-700 leading-relaxed">
                    {analysisResult.projectRecommendations.reason}
                  </p>
                </div>
              )}

              {analysisResult?.projectRecommendations?.cycle && (
                <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                  <div className="font-bold text-gray-900 mb-2 flex items-center gap-2">
                    <CalendarClock className="h-4 w-4 text-gray-700" /> 调理周期安排
                  </div>
                  <p className="text-sm text-gray-700 leading-relaxed">
                    {analysisResult.projectRecommendations.cycle}
                  </p>
                </div>
              )}

              {analysisResult?.projectRecommendations?.effect && (
                <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                  <div className="font-bold text-gray-900 mb-3 flex items-center gap-2">
                    <Target className="h-4 w-4 text-gray-700" /> 预期调理效果
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    {analysisResult.projectRecommendations.effect.split('\n').filter(line => line.trim()).map((line, idx) => (
                      <div key={idx} className="flex items-start gap-2 text-sm text-gray-700">
                        <Check className="h-4 w-4 text-gray-600 mt-0.5 flex-shrink-0" />
                        <span>{line.replace(/^[-•]\s*/, '')}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </section>

        {/* 日常建议 */}
        <section className="mb-6">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-1.5 h-6 rounded" style={{ background: '#003429' }}></div>
            <h3 className="text-base font-bold text-gray-900">日常建议</h3>
          </div>

          <div className="space-y-3" style={{ background: '#f8faf8', borderRadius: '8px', padding: '12px 16px' }}>
            {/* 饮食调理 */}
            {analysisResult?.dailyAdvice?.diet && analysisResult.dailyAdvice.diet.length > 0 && (
              <div>
                <div className="text-sm font-bold text-gray-900 mb-2 flex items-center gap-2">
                  <Utensils className="h-4 w-4 text-gray-700" /> 饮食调理
                </div>
                <ul className="space-y-1 pl-5">
                  {analysisResult.dailyAdvice.diet.slice(0, 4).map((item, idx) => (
                    <li key={idx} className="text-sm text-gray-700 leading-relaxed" style={{ listStyleType: 'disc' }}>
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* 作息建议 */}
            {analysisResult?.dailyAdvice?.sleep && analysisResult.dailyAdvice.sleep.length > 0 && (
              <div>
                <div className="text-sm font-bold text-gray-900 mb-2 flex items-center gap-2">
                  <Moon className="h-4 w-4 text-gray-700" /> 作息建议
                </div>
                <ul className="space-y-1 pl-5">
                  {analysisResult.dailyAdvice.sleep.slice(0, 4).map((item, idx) => (
                    <li key={idx} className="text-sm text-gray-700 leading-relaxed" style={{ listStyleType: 'disc' }}>
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* 运动建议 */}
            {analysisResult?.dailyAdvice?.exercise && analysisResult.dailyAdvice.exercise.length > 0 && (
              <div>
                <div className="text-sm font-bold text-gray-900 mb-2 flex items-center gap-2">
                  <Dumbbell className="h-4 w-4 text-gray-700" /> 运动建议
                </div>
                <ul className="space-y-1 pl-5">
                  {analysisResult.dailyAdvice.exercise.slice(0, 4).map((item, idx) => (
                    <li key={idx} className="text-sm text-gray-700 leading-relaxed" style={{ listStyleType: 'disc' }}>
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* 情志调节 */}
            {analysisResult?.dailyAdvice?.emotion && analysisResult.dailyAdvice.emotion.length > 0 && (
              <div>
                <div className="text-sm font-bold text-gray-900 mb-2 flex items-center gap-2">
                  <Heart className="h-4 w-4 text-gray-700" /> 情志调节
                </div>
                <ul className="space-y-1 pl-5">
                  {analysisResult.dailyAdvice.emotion.slice(0, 4).map((item, idx) => (
                    <li key={idx} className="text-sm text-gray-700 leading-relaxed" style={{ listStyleType: 'disc' }}>
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* 注意事项 */}
            {analysisResult?.dailyAdvice?.caution && analysisResult.dailyAdvice.caution.length > 0 && (
              <div>
                <div className="text-sm font-bold text-gray-900 mb-2 flex items-center gap-2">
                  <Leaf className="h-4 w-4 text-gray-700" /> 注意事项
                </div>
                <ul className="space-y-1 pl-5">
                  {analysisResult.dailyAdvice.caution.slice(0, 5).map((item, idx) => (
                    <li key={idx} className="text-sm text-gray-700 leading-relaxed" style={{ listStyleType: 'disc' }}>
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </section>

        {/* 页脚 - 签名和二维码 */}
        <div className="mt-8 pt-4 flex justify-between items-center" style={{ borderTop: '1px solid rgba(108, 121, 142, 0.2)' }}>
          <div>
            <div className="w-48 h-10 border-b" style={{ borderBottomColor: '#e5e7eb' }}></div>
            <p className="text-xs font-bold text-gray-900 mt-1">尚孕 智慧医疗产康</p>
            <p className="text-xs text-gray-500">临床团队</p>
          </div>
          <div className="text-center">
            <div className="w-16 h-16 border rounded flex items-center justify-center mx-auto mb-1" style={{ background: '#f8fafc', borderColor: 'rgba(108, 121, 142, 0.1)' }}>
              <span className="text-xs text-gray-400">二维码</span>
            </div>
            <p className="text-xs text-gray-500" style={{ width: '96px' }}>扫描二维码查看线上版健康报告</p>
          </div>
        </div>
      </div>

      <PlanSaveModal
        isOpen={showSaveModal}
        onClose={() => setShowSaveModal(false)}
        onSave={handleSavePlanConfirm}
        coreProjects={analysisResult?.projectRecommendations.core.map((p) => ({
          name: p.name,
          suggestedCount: p.count,
        })) || []}
        assistantProjects={analysisResult?.projectRecommendations.auxiliary.map((p) => ({
          name: p.name,
          suggestedCount: p.count,
        })) || []}
        customerName={customer?.name || ''}
      />
    </div>
  );
}
