'use client';

import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  ArrowLeft,
  Printer,
  Star,
  Sparkles,
  Check,
  Target,
  ClipboardList,
  CalendarClock,
  Utensils,
  Moon,
  Dumbbell,
  Heart,
  Leaf,
} from '@/lib/icons';
import { Button } from '@/components/ui/button';

interface ReportDetail {
  id: string;
  storeName: string;
  customerName: string;
  customerPhone: string;
  customer: {
    name: string;
    phone: string;
    age?: number | null;
    postpartumDays?: number | null;
    deliveryMethod?: string | null;
    birthOrder?: string | number | null;
    hasAbortionHistory?: boolean | string | null;
    allergy?: string | null;
  };
  content: string | null;
  structuredData: {
    bodyAnalysis?: {
      symptoms?: string[];
      recoveryStage?: string;
      fullContent?: string;
    };
    dailyAdvice?: {
      diet?: string[];
      sleep?: string[];
      exercise?: string[];
      emotion?: string[];
      caution?: string[];
    };
    projectRecommendations?: {
      core?: Array<{ name: string; count?: string; suggestedCount?: string }>;
      auxiliary?: Array<{ name: string; count?: string; suggestedCount?: string }>;
      reason?: string;
      cycle?: string;
      effect?: string;
    };
  } | null;
  createdAt: string;
}

function ReportViewContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const reportId = searchParams.get('reportId') || searchParams.get('id') || '';
  const [report, setReport] = useState<ReportDetail | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!reportId) {
      setLoading(false);
      return;
    }

    const loadReport = async () => {
      try {
        const res = await fetch(`/api/store/reports/${reportId}`);
        const data = await res.json();
        setReport(res.ok ? data : null);
      } catch (error) {
        console.error('Failed to load report:', error);
        setReport(null);
      } finally {
        setLoading(false);
      }
    };

    loadReport();
  }, [reportId]);

  const handlePrint = () => {
    window.print();
  };

  const handleBack = () => {
    router.back();
  };

  if (loading) {
    return <div className="p-8 text-center text-gray-500">加载中...</div>;
  }

  if (!report) {
    return <div className="p-8 text-center text-gray-500">报告不存在或已删除</div>;
  }

  const structured = report.structuredData || {};
  const bodyAnalysis = structured.bodyAnalysis || {};
  const dailyAdvice = structured.dailyAdvice || {};
  const projectRecs = structured.projectRecommendations || {};

  const symptoms = bodyAnalysis.symptoms || [];
  const coreProjects = projectRecs.core || [];
  const auxiliaryProjects = projectRecs.auxiliary || [];

  // 兼容处理：count 和 suggestedCount 都要支持
  const getProjectCount = (p: any): string => p.count || p.suggestedCount || '待定';

  const reportDate = new Date(report.createdAt).toLocaleDateString('zh-CN');

  // 身体状况分析内容清理（同 plan/preview）
  const cleanedBodyContent = (() => {
    const raw = bodyAnalysis.fullContent || report.content || '';
    if (!raw) return '';

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

    const lines = textToShow.split('\n');
    const cleaned: string[] = [];

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();

      if (!line) {
        cleaned.push('');
        continue;
      }

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

      if (
        /^#{1,6}/.test(line) ||
        /^▶\s*/.test(line) ||
        line === '身体状况分析' ||
        /^身体状况分析[:：]?$/.test(line) ||
        /^身体状况[:：]?$/.test(line)
      ) {
        continue;
      }

      const cleanedLine = line
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
  })();

  return (
    <div className="flex-1 overflow-y-auto bg-gray-50 print:bg-white print:py-0 print:overflow-visible print:h-auto print:w-full">
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
          .a4-paper {
            width: 100% !important;
            max-width: 100% !important;
            min-height: auto !important;
            padding: 0 !important;
            margin: 0 !important;
            box-shadow: none !important;
            box-sizing: border-box;
          }
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
          <h1 className="text-2xl font-bold text-gray-900">报告详情</h1>
          <p className="text-sm text-gray-500 mt-1">查看客户的产后健康报告</p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" onClick={handleBack} className="flex items-center gap-2">
            <ArrowLeft className="h-4 w-4" />
            返回
          </Button>
          <Button variant="outline" onClick={handlePrint} className="flex items-center gap-2">
            <Printer className="h-4 w-4" />
            打印
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
            <p className="text-sm font-bold text-gray-900">{report.id}</p>
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
            <p className="text-sm font-bold text-gray-900">{report.customer?.name || report.customerName}</p>
          </div>
          <div className="p-3 border-r border-b" style={{ borderColor: '#e5e7eb' }}>
            <p className="text-xs text-gray-500 mb-1">年龄</p>
            <p className="text-sm font-bold text-gray-900">{report.customer?.age || '-'} 岁</p>
          </div>
          <div className="p-3 border-r border-b" style={{ borderColor: '#e5e7eb' }}>
            <p className="text-xs text-gray-500 mb-1">联系电话</p>
            <p className="text-sm font-bold text-gray-900">{report.customer?.phone || report.customerPhone}</p>
          </div>
          <div className="p-3 border-b" style={{ borderColor: '#e5e7eb' }}>
            <p className="text-xs text-gray-500 mb-1">产后天数</p>
            <p className="text-sm font-bold text-gray-900">{report.customer?.postpartumDays || '-'} 天</p>
          </div>
          <div className="p-3 border-r" style={{ borderColor: '#e5e7eb' }}>
            <p className="text-xs text-gray-500 mb-1">生产方式</p>
            <p className="text-sm font-bold text-gray-900">{report.customer?.deliveryMethod || '-'}</p>
          </div>
          <div className="p-3 border-r" style={{ borderColor: '#e5e7eb' }}>
            <p className="text-xs text-gray-500 mb-1">胎次</p>
            <p className="text-sm font-bold text-gray-900">{report.customer?.birthOrder || '-'}</p>
          </div>
          <div className="p-3 border-r" style={{ borderColor: '#e5e7eb' }}>
            <p className="text-xs text-gray-500 mb-1">小产记录</p>
            <p className="text-sm font-bold text-gray-900">{report.customer?.hasAbortionHistory ? '有' : '无'}</p>
          </div>
          <div className="p-3">
            <p className="text-xs text-gray-500 mb-1">过敏史/既往病史</p>
            <p className="text-sm font-bold text-gray-900">{report.customer?.allergy || '无'}</p>
          </div>
        </div>

        {/* 身体状况分析 */}
        <section className="mb-6">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-1.5 h-6 rounded" style={{ background: '#003429' }}></div>
            <h3 className="text-base font-bold text-gray-900">身体状况分析</h3>
          </div>
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
            {symptoms.length > 0 ? (
              <div className="flex flex-wrap gap-2 mb-3">
                {symptoms.map((symptom, idx) => (
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

            {bodyAnalysis.recoveryStage && (
              <p className="text-sm text-gray-700 mb-3">
                <span className="font-semibold">恢复阶段：</span>{bodyAnalysis.recoveryStage}
              </p>
            )}

            {cleanedBodyContent && (
              <div className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap mt-3 pt-3 border-t border-gray-200">
                {cleanedBodyContent}
              </div>
            )}
          </div>
        </section>

        {/* 项目搭配推荐 */}
        {(coreProjects.length > 0 || auxiliaryProjects.length > 0) && (
          <section className="mb-8">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-1.5 h-6 rounded" style={{ background: '#003429' }}></div>
              <h3 className="text-base font-bold text-gray-900">项目搭配推荐</h3>
            </div>

            <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
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
                    {coreProjects.length > 0 && (
                      <>
                        <tr className="bg-gray-50/50 border-b border-gray-100">
                          <td
                            className="py-4 px-5 align-middle font-semibold text-gray-800"
                            rowSpan={coreProjects.length + 1}
                          >
                            <div className="flex flex-col items-center gap-1">
                              <Star className="h-4 w-4 text-gray-700" />
                              <span>核心项目</span>
                            </div>
                          </td>
                        </tr>
                        {coreProjects.map((proj, idx) => (
                          <tr key={`core-${idx}`} className="border-b border-gray-100">
                            <td className="py-4 px-5 text-gray-900 font-medium">{proj.name}</td>
                            <td className="py-4 px-5 text-center text-gray-900 font-bold">
                              {getProjectCount(proj)}
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
                    {auxiliaryProjects.length > 0 && (
                      <>
                        <tr className="bg-gray-50/50 border-b border-gray-100">
                          <td
                            className="py-4 px-5 align-middle font-semibold text-gray-800"
                            rowSpan={auxiliaryProjects.length + 1}
                          >
                            <div className="flex flex-col items-center gap-1">
                              <Sparkles className="h-4 w-4 text-gray-700" />
                              <span>辅助项目</span>
                            </div>
                          </td>
                        </tr>
                        {auxiliaryProjects.map((proj, idx) => (
                          <tr key={`aux-${idx}`} className="border-b border-gray-100">
                            <td className="py-4 px-5 text-gray-900 font-medium">{proj.name}</td>
                            <td className="py-4 px-5 text-center text-gray-900 font-bold">
                              {getProjectCount(proj)}
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

              <div className="p-5 space-y-4 bg-white border-t border-gray-200">
                {projectRecs.reason && (
                  <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                    <div className="font-bold text-gray-900 mb-2 flex items-center gap-2">
                      <ClipboardList className="h-4 w-4 text-gray-700" /> 搭配原因说明
                    </div>
                    <p className="text-sm text-gray-700 leading-relaxed">
                      {projectRecs.reason}
                    </p>
                  </div>
                )}

                {projectRecs.cycle && (
                  <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                    <div className="font-bold text-gray-900 mb-2 flex items-center gap-2">
                      <CalendarClock className="h-4 w-4 text-gray-700" /> 调理周期安排
                    </div>
                    <p className="text-sm text-gray-700 leading-relaxed">
                      {projectRecs.cycle}
                    </p>
                  </div>
                )}

                {projectRecs.effect && (
                  <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                    <div className="font-bold text-gray-900 mb-3 flex items-center gap-2">
                      <Target className="h-4 w-4 text-gray-700" /> 预期调理效果
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      {projectRecs.effect.split('\n').filter(line => line.trim()).map((line, idx) => (
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
        )}

        {/* 日常建议 */}
        <section className="mb-6">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-1.5 h-6 rounded" style={{ background: '#003429' }}></div>
            <h3 className="text-base font-bold text-gray-900">日常建议</h3>
          </div>

          <div className="space-y-3" style={{ background: '#f8faf8', borderRadius: '8px', padding: '12px 16px' }}>
            {dailyAdvice.diet && dailyAdvice.diet.length > 0 && (
              <div>
                <div className="text-sm font-bold text-gray-900 mb-2 flex items-center gap-2">
                  <Utensils className="h-4 w-4 text-gray-700" /> 饮食调理
                </div>
                <ul className="space-y-1 pl-5">
                  {dailyAdvice.diet.slice(0, 4).map((item, idx) => (
                    <li key={idx} className="text-sm text-gray-700 leading-relaxed" style={{ listStyleType: 'disc' }}>
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {dailyAdvice.sleep && dailyAdvice.sleep.length > 0 && (
              <div>
                <div className="text-sm font-bold text-gray-900 mb-2 flex items-center gap-2">
                  <Moon className="h-4 w-4 text-gray-700" /> 作息建议
                </div>
                <ul className="space-y-1 pl-5">
                  {dailyAdvice.sleep.slice(0, 4).map((item, idx) => (
                    <li key={idx} className="text-sm text-gray-700 leading-relaxed" style={{ listStyleType: 'disc' }}>
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {dailyAdvice.exercise && dailyAdvice.exercise.length > 0 && (
              <div>
                <div className="text-sm font-bold text-gray-900 mb-2 flex items-center gap-2">
                  <Dumbbell className="h-4 w-4 text-gray-700" /> 运动建议
                </div>
                <ul className="space-y-1 pl-5">
                  {dailyAdvice.exercise.slice(0, 4).map((item, idx) => (
                    <li key={idx} className="text-sm text-gray-700 leading-relaxed" style={{ listStyleType: 'disc' }}>
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {dailyAdvice.emotion && dailyAdvice.emotion.length > 0 && (
              <div>
                <div className="text-sm font-bold text-gray-900 mb-2 flex items-center gap-2">
                  <Heart className="h-4 w-4 text-gray-700" /> 情志调节
                </div>
                <ul className="space-y-1 pl-5">
                  {dailyAdvice.emotion.slice(0, 4).map((item, idx) => (
                    <li key={idx} className="text-sm text-gray-700 leading-relaxed" style={{ listStyleType: 'disc' }}>
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {dailyAdvice.caution && dailyAdvice.caution.length > 0 && (
              <div>
                <div className="text-sm font-bold text-gray-900 mb-2 flex items-center gap-2">
                  <Leaf className="h-4 w-4 text-gray-700" /> 注意事项
                </div>
                <ul className="space-y-1 pl-5">
                  {dailyAdvice.caution.slice(0, 5).map((item, idx) => (
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
    </div>
  );
}

export default function ReportViewPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-gray-500">加载中...</div>}>
      <ReportViewContent />
    </Suspense>
  );
}
