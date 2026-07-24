import fs from 'fs';
import path from 'path';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import * as XLSX from 'xlsx';

const prisma = new PrismaClient();

const DEMO_BATCH_ID = process.env.DEMO_BATCH_ID || 'DEMO_INVESTOR_V1';
const DEMO_ADMIN_USERNAME = process.env.DEMO_ADMIN_USERNAME || 'admin003';
const DEMO_ADMIN_PASSWORD = process.env.DEMO_ADMIN_PASSWORD || 'Demo@123456';
const DEMO_DATA_DIR = process.env.DEMO_DATA_DIR || path.join(process.cwd(), 'scripts', 'demo-data');
const STORE_COUNT = 30;
const CUSTOMERS_PER_STORE = 36;
const STORE_PERMISSIONS = [
  'customer_manage',
  'ai_analysis',
  'menstrual_chat',
  'short_video',
  'learning_center',
  'profile',
];

type CsvRecord = Record<string, string | number | boolean | null | undefined>;

type StoreRow = {
  storeKey: string;
  storeName: string;
  city: string;
  address: string;
  contactPhone: string;
  managerName: string;
  loginPhone: string;
};

type CustomerRow = {
  customerKey: string;
  storeKey: string;
  name: string;
  phone: string;
  age: number | null;
  postpartumDays: number | null;
  deliveryMethod: string;
  birthOrder: number | null;
  allergy: string | null;
  notes: string | null;
  height: number | null;
  weight: number | null;
};

type ServiceRow = {
  customerKey: string;
  storeKey: string;
  reportContent: string;
  planTitle: string;
  careType: string;
  bodyRecordNote: string;
  aiAnalysisContent: string;
  chatTitle: string;
  chatUserMessage: string;
  chatAssistantMessage: string;
};

type VideoRow = {
  storeKey: string;
  topic: string;
  summary: string;
  angle: string;
  corePoints: string;
  contentDirection: string;
  scriptContent: string;
};

type DemoTrendTotals = {
  loginCount?: number;
  operationCount?: number;
  aiAnalysisCount?: number;
  chatMessageCount?: number;
};

type SeedDemoOptions = {
  trendTotals?: DemoTrendTotals;
  generateMissing?: boolean;
  createLogs?: boolean;
};

const cities = [
  '上海', '杭州', '南京', '苏州', '成都', '重庆', '广州', '深圳', '武汉', '长沙',
  '郑州', '西安', '青岛', '济南', '合肥', '宁波', '厦门', '福州', '天津', '北京',
];
const surnames = ['林', '陈', '王', '李', '周', '赵', '孙', '吴', '徐', '何', '高', '罗'];
const givenNames = ['安然', '欣怡', '雨桐', '佳宁', '若溪', '晓晴', '思妍', '可欣', '雅婷', '梦琪'];
const careTypes = ['产后恢复', '气血调理', '睡眠改善', '体态管理', '盆底肌修复', '腹直肌修复'];
const topicAngles = ['门店服务故事', '客户常见问题', '产后恢复科普', '到店体验分享', '员工专业成长'];

function text(record: CsvRecord, keys: string[], fallback = '') {
  for (const key of keys) {
    const value = record[key];
    if (value !== null && value !== undefined && String(value).trim() !== '') {
      return String(value).trim();
    }
  }
  return fallback;
}

function numberValue(record: CsvRecord, keys: string[], fallback: number | null = null) {
  const raw = text(record, keys);
  if (!raw) return fallback;
  const parsed = Number(raw);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function demoPhone(storeIndex: number, customerIndex: number) {
  return `17${String(storeIndex).padStart(2, '0')}${String(customerIndex).padStart(4, '0')}${String((storeIndex + customerIndex) % 1000).padStart(3, '0')}`.slice(0, 11);
}

function storeUserPhone(storeIndex: number) {
  return `16${String(storeIndex).padStart(2, '0')}000000${storeIndex % 10}`.slice(0, 11);
}

async function uniqueDemoStoreUserPhone(preferredPhone: string, storeIndex: number) {
  const fallbackPhone = storeUserPhone(storeIndex);
  const candidates = [preferredPhone, fallbackPhone, `159${String(storeIndex).padStart(8, '0')}`.slice(0, 11)]
    .map((value) => String(value || '').trim())
    .filter(Boolean);

  for (const phone of candidates) {
    const exists = await prisma.storeUser.findUnique({ where: { phone }, select: { id: true } });
    if (!exists) {
      return phone;
    }
  }

  for (let offset = 0; offset < 1000; offset++) {
    const phone = `158${String(storeIndex).padStart(4, '0')}${String(offset).padStart(4, '0')}`.slice(0, 11);
    const exists = await prisma.storeUser.findUnique({ where: { phone }, select: { id: true } });
    if (!exists) {
      return phone;
    }
  }

  return `${Date.now()}`.slice(0, 11);
}

function daysAgo(days: number) {
  const date = new Date();
  date.setDate(date.getDate() - days);
  return date;
}

function trendDate(index: number, total: number) {
  if (total <= 0) return daysAgo(8);

  const weights = [0.08, 0.1, 0.12, 0.14, 0.16, 0.18, 0.22];
  const base = weights.map((weight) => Math.floor(total * weight));
  let remainder = total - base.reduce((sum, value) => sum + value, 0);
  for (let i = base.length - 1; i >= 0 && remainder > 0; i--) {
    base[i]++;
    remainder--;
  }

  let running = 0;
  let dayIndex = base.length - 1;
  for (let i = 0; i < base.length; i++) {
    running += base[i];
    if (index < running) {
      dayIndex = i;
      break;
    }
  }

  const date = daysAgo(6 - dayIndex);
  date.setHours(9 + (index % 10), index % 60, 0, 0);
  return date;
}

function oldTrendDate(index: number) {
  const date = daysAgo(8 + (index % 30));
  date.setHours(10 + (index % 8), index % 60, 0, 0);
  return date;
}

function normalizeDeliveryMethod(value: string) {
  if (['剖腹产', '剖宫产', 'cesarean'].includes(value)) return 'cesarean';
  return 'natural';
}

function readCsv(fileName: string) {
  const filePath = path.join(DEMO_DATA_DIR, fileName);
  if (!fs.existsSync(filePath)) return null;
  const content = fs.readFileSync(filePath, 'utf8').replace(/^\uFEFF/, '');
  const workbook = XLSX.read(content, { type: 'string', raw: false });
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  return XLSX.utils
    .sheet_to_json<CsvRecord>(sheet, { defval: '' })
    .filter((record) => Object.values(record).some((value) => String(value ?? '').trim() !== ''));
}

function loadStoreRows(): StoreRow[] | null {
  const records = readCsv('stores.csv');
  if (!records) return null;
  return records.map((record, index) => {
    const storeIndex = index + 1;
    const city = text(record, ['store_city', 'city', '门店城市'], cities[index % cities.length]);
    return {
      storeKey: text(record, ['store_key', '门店编号'], `store-${String(storeIndex).padStart(2, '0')}`),
      storeName: text(record, ['store_name', '门店名称'], `${city}安逸健康演示店${String(storeIndex).padStart(2, '0')}`),
      city,
      address: text(record, ['store_address', 'address', '门店地址'], `${city}市演示区健康路${storeIndex}号`),
      contactPhone: text(record, ['store_phone', 'contact_phone', '门店电话'], storeUserPhone(storeIndex)),
      managerName: text(record, ['store_manager_name', 'manager_name', '店长姓名'], `${city}演示店长${storeIndex}`),
      loginPhone: text(record, ['store_login_phone', 'login_phone', '门店登录手机号'], storeUserPhone(storeIndex)),
    };
  });
}

function loadCustomerRows(stores: StoreRow[]): CustomerRow[] | null {
  const records = readCsv('customers.csv');
  if (!records) return null;
  return records.map((record, index) => {
    const store = stores[index % stores.length];
    const customerIndex = index + 1;
    return {
      customerKey: text(record, ['customer_key', '客户编号'], `customer-${String(customerIndex).padStart(4, '0')}`),
      storeKey: text(record, ['store_key', '门店编号'], store.storeKey),
      name: text(record, ['customer_name', 'name', '客户姓名'], `${surnames[index % surnames.length]}${givenNames[index % givenNames.length]}`),
      phone: text(record, ['customer_phone', 'phone', '客户手机号'], demoPhone((index % stores.length) + 1, customerIndex)),
      age: numberValue(record, ['customer_age', 'age', '客户年龄'], 24 + (index % 15)),
      postpartumDays: numberValue(record, ['postpartum_days', '产后天数'], 20 + (index % 160)),
      deliveryMethod: normalizeDeliveryMethod(text(record, ['delivery_method', '分娩方式'], index % 3 === 0 ? '剖腹产' : '顺产')),
      birthOrder: numberValue(record, ['birth_order', '胎次'], 1 + (index % 2)),
      allergy: text(record, ['allergy', '过敏史']) || null,
      notes: text(record, ['notes', '客户备注'], '演示客户档案，占位数据'),
      height: numberValue(record, ['height', '身高'], 155 + (index % 18)),
      weight: numberValue(record, ['weight', '体重'], 48 + (index % 25)),
    };
  });
}

function loadServiceRows(customers: CustomerRow[]): ServiceRow[] | null {
  const records = readCsv('service-records.csv');
  if (!records) return null;
  return records.map((record, index) => {
    const customer = customers[index % customers.length];
    const careType = text(record, ['care_type', '调理类型'], careTypes[index % careTypes.length]);
    return {
      customerKey: text(record, ['customer_key', '客户编号'], customer.customerKey),
      storeKey: text(record, ['store_key', '门店编号'], customer.storeKey),
      reportContent: text(record, ['report_content', '客户报告'], `演示报告：${customer.name}第${(index % 6) + 1}次到店记录。`),
      planTitle: text(record, ['plan_title', '方案标题'], `${careType}方案`),
      careType,
      bodyRecordNote: text(record, ['body_record_note', '身体记录'], '演示身体记录，占位数据'),
      aiAnalysisContent: text(record, ['ai_analysis_content', 'AI分析'], `AI演示分析：${customer.name}当前适合继续进行${careType}。`),
      chatTitle: text(record, ['chat_title', '聊天标题'], `演示会话 ${index + 1}`),
      chatUserMessage: text(record, ['chat_user_message', '用户消息'], '演示问题：最近周期不稳定怎么办？'),
      chatAssistantMessage: text(record, ['chat_assistant_message', 'AI回复'], '演示回答：建议记录周期、睡眠和饮食变化。'),
    };
  });
}

function loadVideoRows(stores: StoreRow[]): VideoRow[] | null {
  const records = readCsv('video-scripts.csv');
  if (!records) return null;
  return records.map((record, index) => {
    const store = stores[index % stores.length];
    return {
      storeKey: text(record, ['store_key', '门店编号'], store.storeKey),
      topic: text(record, ['video_topic', 'topic', '短视频选题'], `${topicAngles[index % topicAngles.length]} ${index + 1}`),
      summary: text(record, ['summary', '摘要'], '演示选题摘要'),
      angle: text(record, ['angle', '切入角度'], '演示切入角度'),
      corePoints: text(record, ['core_points', '核心观点'], '演示核心观点'),
      contentDirection: text(record, ['content_direction', '内容方向'], index % 2 === 0 ? '科普' : '故事'),
      scriptContent: text(record, ['script_content', '脚本正文'], '演示脚本正文：开场、痛点、方法、到店引导。'),
    };
  });
}

function buildGeneratedStores(): StoreRow[] {
  return Array.from({ length: STORE_COUNT }, (_, index) => {
    const storeIndex = index + 1;
    const city = cities[index % cities.length];
    return {
      storeKey: `store-${String(storeIndex).padStart(2, '0')}`,
      storeName: `${city}安逸健康演示店${String(storeIndex).padStart(2, '0')}`,
      city,
      address: `${city}市演示区健康路${storeIndex}号`,
      contactPhone: storeUserPhone(storeIndex),
      managerName: `${city}演示店长${storeIndex}`,
      loginPhone: storeUserPhone(storeIndex),
    };
  });
}

function buildGeneratedCustomers(stores: StoreRow[]): CustomerRow[] {
  return stores.flatMap((store, storeOffset) =>
    Array.from({ length: CUSTOMERS_PER_STORE }, (_, customerOffset) => {
      const index = storeOffset * CUSTOMERS_PER_STORE + customerOffset;
      const customerIndex = customerOffset + 1;
      return {
        customerKey: `${store.storeKey}-customer-${String(customerIndex).padStart(3, '0')}`,
        storeKey: store.storeKey,
        name: `${surnames[index % surnames.length]}${givenNames[(storeOffset + customerIndex) % givenNames.length]}`,
        phone: demoPhone(storeOffset + 1, customerIndex),
        age: 24 + ((storeOffset + customerIndex) % 15),
        postpartumDays: 20 + (((storeOffset + 1) * customerIndex) % 160),
        deliveryMethod: normalizeDeliveryMethod(customerIndex % 3 === 0 ? '剖腹产' : '顺产'),
        birthOrder: 1 + (customerIndex % 2),
        allergy: customerIndex % 8 === 0 ? '对酒精类产品敏感' : null,
        notes: '演示客户档案，占位数据',
        height: 155 + (customerIndex % 18),
        weight: 48 + (customerIndex % 25),
      };
    })
  );
}

function buildGeneratedServices(customers: CustomerRow[]): ServiceRow[] {
  return customers.map((customer, index) => {
    const careType = careTypes[index % careTypes.length];
    return {
      customerKey: customer.customerKey,
      storeKey: customer.storeKey,
      reportContent: `演示报告：${customer.name}第${(index % 6) + 1}次到店记录。`,
      planTitle: `${careType}方案`,
      careType,
      bodyRecordNote: '演示身体记录，占位数据',
      aiAnalysisContent: `AI演示分析：${customer.name}当前适合继续进行${careType}。`,
      chatTitle: `演示会话 ${index + 1}`,
      chatUserMessage: '演示问题：最近周期不稳定怎么办？',
      chatAssistantMessage: '演示回答：建议记录周期、睡眠和饮食变化。',
    };
  });
}

function buildGeneratedVideos(stores: StoreRow[]): VideoRow[] {
  return stores.flatMap((store, storeOffset) =>
    Array.from({ length: 8 }, (_, topicOffset) => {
      const index = storeOffset * 8 + topicOffset;
      return {
        storeKey: store.storeKey,
        topic: `${topicAngles[index % topicAngles.length]} ${storeOffset + 1}-${topicOffset + 1}`,
        summary: '演示选题摘要',
        angle: '演示切入角度',
        corePoints: '演示核心观点',
        contentDirection: topicOffset % 2 === 0 ? '科普' : '故事',
        scriptContent: '演示脚本正文：开场、痛点、方法、到店引导。',
      };
    })
  );
}

async function resetCurrentBatch() {
  const [demoAdmins, demoStoreUsers, demoStores] = await Promise.all([
    prisma.admin.findMany({ where: { isDemo: true, demoBatchId: DEMO_BATCH_ID }, select: { id: true } }),
    prisma.storeUser.findMany({ where: { isDemo: true, demoBatchId: DEMO_BATCH_ID }, select: { id: true } }),
    prisma.store.findMany({ where: { isDemo: true, demoBatchId: DEMO_BATCH_ID }, select: { id: true } }),
  ]);

  const demoAdminIds = demoAdmins.map((item) => item.id);
  const demoStoreUserIds = demoStoreUsers.map((item) => item.id);
  const demoStoreIds = demoStores.map((item) => item.id);

  await prisma.$transaction(async (tx) => {
    await tx.loginLog.deleteMany({
      where: {
        OR: [
          { userId: { in: demoAdminIds } },
          { userId: { in: demoStoreUserIds } },
          { userName: { startsWith: 'demo_' } },
          { userName: DEMO_ADMIN_USERNAME },
        ],
      },
    });
    await tx.operationLog.deleteMany({
      where: {
        OR: [
          { operatorId: { in: demoAdminIds } },
          { operatorId: { in: demoStoreUserIds } },
          { operatorName: DEMO_ADMIN_USERNAME },
          { detail: { contains: DEMO_BATCH_ID } },
        ],
      },
    });
    await tx.store.deleteMany({ where: { id: { in: demoStoreIds } } });
    await tx.storeUser.deleteMany({ where: { id: { in: demoStoreUserIds } } });
    await tx.admin.deleteMany({ where: { id: { in: demoAdminIds } } });
  });
}

async function mainImport(
  stores: StoreRow[],
  customers: CustomerRow[],
  services: ServiceRow[],
  videos: VideoRow[],
  options: SeedDemoOptions = {}
) {
  const trendTotals = options.trendTotals || {};
  const hashedAdminPassword = await bcrypt.hash(DEMO_ADMIN_PASSWORD, 10);
  const demoAdmin = await prisma.admin.create({
    data: {
      username: DEMO_ADMIN_USERNAME,
      password: hashedAdminPassword,
      name: '投资人演示账号',
      isDemo: true,
      demoBatchId: DEMO_BATCH_ID,
    },
  });

  const createdStores = new Map<string, string>();
  let storeIndex = 1;
  for (const storeRow of stores) {
    const hashedPassword = await bcrypt.hash('DemoStore@123', 10);
    const loginPhone = await uniqueDemoStoreUserPhone(storeRow.loginPhone, storeIndex);
    const storeUser = await prisma.storeUser.create({
      data: {
        phone: loginPhone,
        password: hashedPassword,
        name: storeRow.managerName,
        permissions: JSON.stringify(STORE_PERMISSIONS),
        isDemo: true,
        demoBatchId: DEMO_BATCH_ID,
      },
    });
    const store = await prisma.store.create({
      data: {
        storeUserId: storeUser.id,
        storeName: storeRow.storeName,
        description: '投资人演示用虚构门店',
        address: storeRow.address,
        contactPhone: storeRow.contactPhone || storeUser.phone,
        status: true,
        isDemo: true,
        demoBatchId: DEMO_BATCH_ID,
        expirationTime: daysAgo(-365),
      },
    });
    createdStores.set(storeRow.storeKey, store.id);
    storeIndex++;
  }

  const createdCustomers = new Map<string, { id: string; storeId: string; row: CustomerRow }>();
  for (const row of customers) {
    const storeId = createdStores.get(row.storeKey);
    if (!storeId) continue;
    const customer = await prisma.customer.create({
      data: {
        storeId,
        name: row.name,
        phone: row.phone,
        age: row.age,
        postpartumDays: row.postpartumDays,
        postpartumTime: row.postpartumDays ? daysAgo(row.postpartumDays) : null,
        deliveryMethod: row.deliveryMethod,
        birthOrder: row.birthOrder,
        allergy: row.allergy,
        notes: row.notes,
        hasAbortionHistory: false,
        height: row.height,
        weight: row.weight,
      },
    });
    createdCustomers.set(row.customerKey, { id: customer.id, storeId, row });
  }

  let reportCount = 0;
  let planCount = 0;
  let bodyRecordCount = 0;
  let aiAnalysisCount = 0;
  let chatSessionCount = 0;
  let chatMessageCount = 0;
  let aiAnalysisTrendCount = 0;
  let chatMessageTrendCount = 0;
  for (const [index, row] of services.entries()) {
    const customer = createdCustomers.get(row.customerKey);
    if (!customer) continue;
    const storeId = createdStores.get(row.storeKey) || customer.storeId;
    await prisma.report.create({
      data: {
        storeId,
        customerId: customer.id,
        type: 'text',
        content: row.reportContent,
        structuredData: { demo: true, batchId: DEMO_BATCH_ID, summary: row.reportContent },
        createdAt: daysAgo((index % 45) + 1),
      },
    });
    reportCount++;
    await prisma.plan.create({
      data: {
        storeId,
        customerId: customer.id,
        version: 1,
        status: index % 5 === 0 ? 'completed' : 'active',
        rawContent: { demo: true, text: row.planTitle },
        structuredContent: { title: row.planTitle, projects: ['基础评估', row.careType, '居家跟进'] },
        isLatest: true,
        coreProjects: ['基础评估', row.careType],
        assistantProjects: ['饮食建议', '作息提醒'],
        actualCounts: { planned: 8, finished: index % 5 === 0 ? 8 : (index % 6) + 1 },
        completedAt: index % 5 === 0 ? daysAgo(index % 30) : null,
      },
    });
    planCount++;
    await prisma.bodyRecord.create({
      data: {
        storeId,
        customerId: customer.id,
        visitCount: (index % 8) + 1,
        visitDate: daysAgo(index % 60),
        records: { demo: true, weight: customer.row.weight, sleepScore: 60 + (index % 35), note: row.bodyRecordNote },
        notes: row.bodyRecordNote,
        createdAt: daysAgo(index % 60),
      },
    });
    bodyRecordCount++;
    const aiAnalysisCreatedAt = trendTotals.aiAnalysisCount === undefined
      ? daysAgo(index % 45)
      : aiAnalysisTrendCount < trendTotals.aiAnalysisCount
        ? trendDate(aiAnalysisTrendCount++, trendTotals.aiAnalysisCount)
        : oldTrendDate(index);
    await prisma.aiAnalysis.create({
      data: {
        storeId,
        customerId: customer.id,
        content: row.aiAnalysisContent,
        reportContent: row.reportContent,
        structuredData: { demo: true, riskLevel: index % 7 === 0 ? 'medium' : 'low', suggestions: ['继续观察', '保持复访'] },
        createdAt: aiAnalysisCreatedAt,
      },
    });
    aiAnalysisCount++;
    const chatMessageDates = Array.from({ length: 3 }, (_, messageOffset) => {
      if (trendTotals.chatMessageCount === undefined) {
        return daysAgo((index % 30) + 1);
      }

      if (chatMessageTrendCount < trendTotals.chatMessageCount) {
        return trendDate(chatMessageTrendCount++, trendTotals.chatMessageCount);
      }

      return oldTrendDate(index + messageOffset);
    });
    const chatSession = await prisma.menstrualChatSession.create({
      data: { storeId, title: row.chatTitle, messageCount: 3, createdAt: chatMessageDates[0] },
    });
    chatSessionCount++;
    await prisma.menstrualChatMessage.createMany({
      data: [
        { sessionId: chatSession.id, role: 'user', content: row.chatUserMessage, createdAt: chatMessageDates[0] },
        { sessionId: chatSession.id, role: 'assistant', content: row.chatAssistantMessage, createdAt: chatMessageDates[1] },
        { sessionId: chatSession.id, role: 'user', content: '演示追问：需要到店评估吗？', createdAt: chatMessageDates[2] },
      ],
    });
    chatMessageCount += 3;
  }

  const createdCustomerList = Array.from(createdCustomers.values());
  if (
    trendTotals.aiAnalysisCount !== undefined &&
    createdCustomerList.length > 0 &&
    aiAnalysisTrendCount < trendTotals.aiAnalysisCount
  ) {
    const extraAiCount = trendTotals.aiAnalysisCount - aiAnalysisTrendCount;
    await prisma.aiAnalysis.createMany({
      data: Array.from({ length: extraAiCount }, (_, offset) => {
        const customer = createdCustomerList[offset % createdCustomerList.length];
        return {
          storeId: customer.storeId,
          customerId: customer.id,
          content: '演示 AI 分析占位内容',
          reportContent: '演示客户报告占位内容',
          structuredData: { demo: true, batchId: DEMO_BATCH_ID, generatedForTrend: true },
          createdAt: trendDate(aiAnalysisTrendCount + offset, trendTotals.aiAnalysisCount!),
        };
      }),
    });
    aiAnalysisTrendCount += extraAiCount;
    aiAnalysisCount += extraAiCount;
  }

  if (
    trendTotals.chatMessageCount !== undefined &&
    createdStores.size > 0 &&
    chatMessageTrendCount < trendTotals.chatMessageCount
  ) {
    const firstStoreId = Array.from(createdStores.values())[0];
    const extraChatMessageCount = trendTotals.chatMessageCount - chatMessageTrendCount;
    const extraChatSession = await prisma.menstrualChatSession.create({
      data: {
        storeId: firstStoreId,
        title: '演示趋势会话',
        messageCount: extraChatMessageCount,
        createdAt: trendDate(chatMessageTrendCount, trendTotals.chatMessageCount),
      },
    });
    await prisma.menstrualChatMessage.createMany({
      data: Array.from({ length: extraChatMessageCount }, (_, offset) => ({
        sessionId: extraChatSession.id,
        role: offset % 2 === 0 ? 'user' : 'assistant',
        content: offset % 2 === 0 ? '演示趋势消息' : '演示趋势回复',
        createdAt: trendDate(chatMessageTrendCount + offset, trendTotals.chatMessageCount!),
      })),
    });
    chatMessageTrendCount += extraChatMessageCount;
    chatSessionCount++;
    chatMessageCount += extraChatMessageCount;
  }

  let topicCount = 0;
  let scriptCount = 0;
  for (const [index, row] of videos.entries()) {
    const storeId = createdStores.get(row.storeKey);
    if (!storeId) continue;
    const topic = await prisma.topic.create({
      data: {
        storeId,
        topic: row.topic,
        summary: row.summary,
        angle: row.angle,
        corePoints: row.corePoints,
        contentDirection: row.contentDirection,
        isRecommended: index % 3 === 0,
        totalViews: 500 + index * 35,
        totalLikes: 30 + index * 6,
      },
    });
    topicCount++;
    await prisma.scriptRecord.create({
      data: {
        storeId,
        topicId: topic.id,
        type: 'original',
        version: 1,
        topicTitle: topic.topic,
        summary: topic.summary,
        angle: topic.angle,
        corePoints: topic.corePoints,
        templateName: '演示脚本模板',
        content: row.scriptContent,
        viewCount: topic.totalViews,
        likeCount: topic.totalLikes,
        commentCount: index * 2,
        favoriteCount: index,
        isRecommended: topic.isRecommended,
        isPublic: false,
        number: `D-${String(index + 1).padStart(4, '0')}`,
        direction: topic.contentDirection || '演示方向',
        subCategory: '演示分类',
        createdAt: daysAgo((index % 30) + 1),
      },
    });
    scriptCount++;
  }

  const loginLogCount = options.createLogs === false ? 0 : trendTotals.loginCount ?? 42;
  if (loginLogCount > 0) {
    await prisma.loginLog.createMany({
      data: Array.from({ length: loginLogCount }, (_, index) => ({
        userType: 'admin',
        userId: demoAdmin.id,
        userName: DEMO_ADMIN_USERNAME,
        ip: '127.0.0.1',
        userAgent: 'Demo Seed',
        success: true,
        createdAt: trendTotals.loginCount === undefined ? daysAgo(index % 14) : trendDate(index, loginLogCount),
      })),
    });
  }

  const operationLogCount = options.createLogs === false ? 0 : trendTotals.operationCount ?? 90;
  if (operationLogCount > 0) {
    await prisma.operationLog.createMany({
      data: Array.from({ length: operationLogCount }, (_, index) => ({
        operatorType: 'admin',
        operatorId: demoAdmin.id,
        operatorName: DEMO_ADMIN_USERNAME,
        action: ['view', 'search', 'export_preview'][index % 3],
        module: ['dashboard', 'customer', 'store', 'ai_analysis', 'short_video'][index % 5],
        targetName: `演示操作 ${index + 1}`,
        detail: `batch=${DEMO_BATCH_ID}; 演示操作日志`,
        createdAt: trendTotals.operationCount === undefined ? daysAgo(index % 14) : trendDate(index, operationLogCount),
      })),
    });
  }

  return {
    stores: createdStores.size,
    customers: createdCustomers.size,
    reports: reportCount,
    plans: planCount,
    bodyRecords: bodyRecordCount,
    aiAnalyses: aiAnalysisCount,
    chatSessions: chatSessionCount,
    chatMessages: chatMessageCount,
    topics: topicCount,
    scripts: scriptCount,
    loginLogs: loginLogCount,
    operationLogs: operationLogCount,
  };
}

export async function seedDemoData(options: SeedDemoOptions = {}) {
  console.log(`Resetting demo batch ${DEMO_BATCH_ID}...`);
  await resetCurrentBatch();

  const generateMissing = options.generateMissing ?? true;
  const stores = loadStoreRows() || (generateMissing ? buildGeneratedStores() : []);
  if (stores.length === 0) {
    throw new Error('请先上传门店表 stores.csv');
  }

  const customers = loadCustomerRows(stores) || (generateMissing ? buildGeneratedCustomers(stores) : []);
  const services =
    customers.length > 0
      ? loadServiceRows(customers) || (generateMissing ? buildGeneratedServices(customers) : [])
      : [];
  const videos = loadVideoRows(stores) || (generateMissing ? buildGeneratedVideos(stores) : []);
  const totals = await mainImport(stores, customers, services, videos, options);

  console.log('Demo seed completed');
  console.log({
    batchId: DEMO_BATCH_ID,
    dataDir: DEMO_DATA_DIR,
    admin: DEMO_ADMIN_USERNAME,
    password: DEMO_ADMIN_PASSWORD,
    ...totals,
  });

  return totals;
}

if (process.argv[1]?.endsWith('seed-demo-data.ts') || process.argv[1]?.endsWith('seed-demo-data.js')) {
  seedDemoData({
    generateMissing: process.env.DEMO_GENERATE_MISSING !== 'false',
    createLogs: process.env.DEMO_CREATE_LOGS !== 'false',
  })
    .catch((error) => {
      console.error(error);
      process.exit(1);
    })
    .finally(async () => {
      await prisma.$disconnect();
    });
}
