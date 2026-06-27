export const STORE_PERMISSIONS = {
  customer_manage: {
    label: '客户管理',
    description: '客户档案管理、在线分析',
    module: '项目搭配',
  },
  ai_analysis: {
    label: 'AI分析',
    description: '提交报告、AI分析报告',
    module: '项目搭配',
  },
  menstrual_chat: {
    label: '月经助手',
    description: '产品搭配、问答查询',
    module: '月经助手',
  },
  short_video: {
    label: '短视频助手',
    description: '创作者身份、选题策划、脚本库、内容创作',
    module: '短视频助手',
  },
  learning_center: {
    label: '学习中心',
    description: '学习资源观看',
    module: '学习中心',
  },
  profile: {
    label: '个人资料',
    description: '修改个人信息、密码',
    module: '个人',
  },
} as const;

export type StorePermissionKey = keyof typeof STORE_PERMISSIONS;

export const DEFAULT_STORE_PERMISSIONS: StorePermissionKey[] = ['profile'];

export const ALL_STORE_PERMISSIONS = Object.keys(STORE_PERMISSIONS) as StorePermissionKey[];

export function hasPermission(
  permissions: string[] | null | undefined,
  key: StorePermissionKey
): boolean {
  if (!permissions || permissions.length === 0) return false;
  return permissions.includes(key);
}
