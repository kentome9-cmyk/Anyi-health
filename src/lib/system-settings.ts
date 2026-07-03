import { prisma } from '@/lib/prisma';

/**
 * 系统设置 key-value 存储的默认值
 * - 新增 key 时务必同时在这里登记默认值，避免读取时出现 undefined
 */
export const SYSTEM_SETTING_DEFAULTS = {
  siteName: '产后健康管理系统',
  siteSubtitle: '门店端',
  customerServicePhone: '',
  customerServiceWechat: '',
  icpNumber: '',
  copyright: '',
  themeColor: '#044332',
  storeThemeColor: '#044332',
  ossRegion: '',
  ossBucket: '',
  ossEndpoint: '',
  ossAccessKeyId: '',
  ossAccessKeySecret: '',
  privacyPolicy: '',
  termsOfService: '',
  wxMpAppId: '',
  wxMpAppSecret: '',
  wxPayMchId: '',
  wxPayApiV3Key: '',
  wxPaySerialNo: '',
  wxPayPrivateKey: '',
} as const;

export type SystemSettingKey = keyof typeof SYSTEM_SETTING_DEFAULTS;

const SETTING_KEYS = Object.keys(SYSTEM_SETTING_DEFAULTS) as SystemSettingKey[];

export type SystemSettingsMap = Record<SystemSettingKey, string>;

/**
 * 读取所有系统设置（缺失的 key 自动用默认值）
 */
export async function getSystemSettings(): Promise<SystemSettingsMap> {
  const records = await prisma.systemSetting.findMany({
    where: { key: { in: SETTING_KEYS as string[] } },
  });

  const result = { ...SYSTEM_SETTING_DEFAULTS } as SystemSettingsMap;
  for (const r of records) {
    if (SETTING_KEYS.includes(r.key as SystemSettingKey) && r.value !== null) {
      result[r.key as SystemSettingKey] = r.value;
    }
  }
  return result;
}

/**
 * 批量更新系统设置
 */
export async function updateSystemSettings(
  updates: Partial<SystemSettingsMap>,
  updatedBy?: string | null
): Promise<SystemSettingsMap> {
  const validEntries = Object.entries(updates).filter(
    ([key]) => SETTING_KEYS.includes(key as SystemSettingKey)
  );

  await prisma.$transaction(
    validEntries.map(([key, value]) =>
      prisma.systemSetting.upsert({
        where: { key },
        create: {
          key,
          value: value ?? null,
          updatedBy: updatedBy ?? null,
        },
        update: {
          value: value ?? null,
          updatedBy: updatedBy ?? null,
        },
      })
    )
  );

  return getSystemSettings();
}
