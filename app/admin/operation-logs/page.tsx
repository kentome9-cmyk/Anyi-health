'use client';

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  ScrollText,
  History,
  Search,
  RefreshCw,
  CheckCircle,
  XCircle,
  Filter,
  Calendar,
} from '@/lib/icons';
import { DataTablePagination } from '@/components/ui/data-table-pagination';

// ========== 类型定义 ==========
interface LoginLog {
  id: string;
  userType: string;
  userId: string | null;
  userName: string | null;
  ip: string | null;
  userAgent: string | null;
  success: boolean;
  errorMessage: string | null;
  createdAt: string;
}

interface OperationLog {
  id: string;
  operatorType: string;
  operatorId: string | null;
  operatorName: string | null;
  action: string;
  module: string;
  targetId: string | null;
  targetName: string | null;
  detail: string | null;
  ip: string | null;
  userAgent: string | null;
  createdAt: string;
}

// ========== 常量配置 ==========
const USER_TYPE_LABEL: Record<string, string> = {
  admin: '管理员',
  store_user: '门店',
  customer: '客户',
  unknown: '未知',
};

const MODULE_OPTIONS = [
  { value: 'all', label: '全部模块' },
  { value: 'customer', label: '客户管理' },
  { value: 'store', label: '门店管理' },
  { value: 'ai_settings', label: 'AI 设置' },
  { value: 'prompt', label: '提示词' },
  { value: 'database', label: '数据库' },
  { value: 'admin', label: '管理员' },
  { value: 'knowledge_base', label: '知识库' },
  { value: 'qa_item', label: '问答库' },
  { value: 'store_user', label: '门店账号' },
];

const ACTION_OPTIONS = [
  { value: 'all', label: '全部操作' },
  { value: 'create', label: '创建' },
  { value: 'update', label: '更新' },
  { value: 'delete', label: '删除' },
  { value: 'export', label: '导出' },
  { value: 'reset_password', label: '重置密码' },
  { value: 'login', label: '登录' },
];

const OPERATOR_TYPE_OPTIONS = [
  { value: 'all', label: '全部角色' },
  { value: 'admin', label: '管理员' },
  { value: 'store_user', label: '门店用户' },
];

const LOGIN_USER_TYPE_OPTIONS = [
  { value: 'all', label: '全部用户类型' },
  { value: 'admin', label: '管理员' },
  { value: 'store_user', label: '门店用户' },
  { value: 'customer', label: '客户' },
];

const LOGIN_RESULT_OPTIONS = [
  { value: 'all', label: '全部结果' },
  { value: 'true', label: '登录成功' },
  { value: 'false', label: '登录失败' },
];

const MODULE_LABELS: Record<string, string> = {
  customer: '客户管理',
  store: '门店管理',
  ai_settings: 'AI 设置',
  prompt: '提示词',
  database: '数据库',
  admin: '管理员',
  knowledge_base: '知识库',
  qa_item: '问答库',
  store_user: '门店账号',
  login_log: '登录日志',
};

const ACTION_LABELS: Record<string, string> = {
  create: '创建',
  update: '更新',
  delete: '删除',
  export: '导出',
  reset_password: '重置密码',
  login: '登录',
};

const ACTION_COLORS: Record<string, string> = {
  create: 'bg-green-100 text-green-700',
  update: 'bg-blue-100 text-blue-700',
  delete: 'bg-red-100 text-red-700',
  export: 'bg-purple-100 text-purple-700',
  reset_password: 'bg-orange-100 text-orange-700',
  login: 'bg-gray-100 text-gray-700',
};

const QUICK_DATE_RANGES = [
  { label: '今天', days: 0 },
  { label: '近 7 天', days: 6 },
  { label: '近 30 天', days: 29 },
];

// ========== 工具函数 ==========
function formatDateInput(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function getQuickRange(days: number): { start: string; end: string } {
  const end = new Date();
  const start = new Date();
  start.setDate(end.getDate() - days);
  return { start: formatDateInput(start), end: formatDateInput(end) };
}

export default function LogsPage() {
  const searchParams = useSearchParams();
  const tabFromUrl = searchParams.get('tab');
  const [activeTab, setActiveTab] = useState<'login' | 'operation'>(
    tabFromUrl === 'login' ? 'login' : 'operation'
  );

  // ===== 登录日志筛选 =====
  const [loginLogs, setLoginLogs] = useState<LoginLog[]>([]);
  const [loginTotal, setLoginTotal] = useState(0);
  const [loginLoading, setLoginLoading] = useState(true);
  const [loginPage, setLoginPage] = useState(1);
  const [loginPageSize, setLoginPageSize] = useState(20);
  const [loginUserType, setLoginUserType] = useState('all');
  const [loginSuccess, setLoginSuccess] = useState('all');
  const [loginUserName, setLoginUserName] = useState('');
  const [loginIp, setLoginIp] = useState('');
  const [loginStartDate, setLoginStartDate] = useState('');
  const [loginEndDate, setLoginEndDate] = useState('');

  // ===== 操作日志筛选 =====
  const [opLogs, setOpLogs] = useState<OperationLog[]>([]);
  const [opTotal, setOpTotal] = useState(0);
  const [opLoading, setOpLoading] = useState(true);
  const [opPage, setOpPage] = useState(1);
  const [opPageSize, setOpPageSize] = useState(20);
  const [opModule, setOpModule] = useState('all');
  const [opAction, setOpAction] = useState('all');
  const [opOperatorType, setOpOperatorType] = useState('all');
  const [opOperatorName, setOpOperatorName] = useState('');
  const [opKeyword, setOpKeyword] = useState('');
  const [opStartDate, setOpStartDate] = useState('');
  const [opEndDate, setOpEndDate] = useState('');

  // ========== 加载登录日志 ==========
  const loadLoginLogs = async () => {
    setLoginLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(loginPage),
        pageSize: String(loginPageSize),
      });
      if (loginUserType && loginUserType !== 'all') params.set('userType', loginUserType);
      if (loginSuccess && loginSuccess !== 'all') params.set('success', loginSuccess);
      if (loginUserName) params.set('userName', loginUserName);
      if (loginIp) params.set('ip', loginIp);
      if (loginStartDate) params.set('startDate', loginStartDate);
      if (loginEndDate) params.set('endDate', loginEndDate);

      const res = await fetch(`/api/admin/login-logs?${params.toString()}`);
      const data = await res.json();
      setLoginLogs(data.list || []);
      setLoginTotal(data.total || 0);
    } catch (err) {
      console.error('Failed to load login logs:', err);
    } finally {
      setLoginLoading(false);
    }
  };

  // ========== 加载操作日志 ==========
  const loadOpLogs = async () => {
    setOpLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(opPage),
        pageSize: String(opPageSize),
      });
      if (opModule && opModule !== 'all') params.set('module', opModule);
      if (opAction && opAction !== 'all') params.set('action', opAction);
      if (opOperatorType && opOperatorType !== 'all') params.set('operatorType', opOperatorType);
      if (opOperatorName) params.set('operatorName', opOperatorName);
      if (opKeyword) params.set('keyword', opKeyword);
      if (opStartDate) params.set('startDate', opStartDate);
      if (opEndDate) params.set('endDate', opEndDate);

      const res = await fetch(`/api/admin/operation-logs?${params.toString()}`);
      const data = await res.json();
      setOpLogs(data.data || []);
      setOpTotal(data.total || 0);
    } catch (err) {
      console.error('Failed to load operation logs:', err);
    } finally {
      setOpLoading(false);
    }
  };

  // ========== 事件处理 ==========
  const handleLoginSearch = () => {
    setLoginPage(1);
    loadLoginLogs();
  };

  const handleOpSearch = () => {
    setOpPage(1);
    loadOpLogs();
  };

  const handleLoginReset = () => {
    setLoginUserType('all');
    setLoginSuccess('all');
    setLoginUserName('');
    setLoginIp('');
    setLoginStartDate('');
    setLoginEndDate('');
    setLoginPage(1);
    setTimeout(loadLoginLogs, 0);
  };

  const handleOpReset = () => {
    setOpModule('all');
    setOpAction('all');
    setOpOperatorType('all');
    setOpOperatorName('');
    setOpKeyword('');
    setOpStartDate('');
    setOpEndDate('');
    setOpPage(1);
    setTimeout(loadOpLogs, 0);
  };

  const setLoginQuickDate = (days: number) => {
    const { start, end } = getQuickRange(days);
    setLoginStartDate(start);
    setLoginEndDate(end);
  };

  const setOpQuickDate = (days: number) => {
    const { start, end } = getQuickRange(days);
    setOpStartDate(start);
    setOpEndDate(end);
  };

  // ========== 副作用 ==========
  useEffect(() => {
    if (activeTab === 'login') {
      loadLoginLogs();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, loginPage, loginPageSize]);

  useEffect(() => {
    if (activeTab === 'operation') {
      loadOpLogs();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, opPage, opPageSize]);

  const loginTotalPages = Math.max(1, Math.ceil(loginTotal / loginPageSize));
  const opTotalPages = Math.max(1, Math.ceil(opTotal / opPageSize));

  const formatUA = (ua: string | null) => {
    if (!ua) return '-';
    if (ua.length > 60) return ua.substring(0, 60) + '...';
    return ua;
  };

  return (
    <div className="space-y-6">
      {/* 页面标题 */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <ScrollText className="h-6 w-6" />
            系统日志
          </h2>
          <p className="text-gray-500 mt-1">查看登录记录与操作审计日志</p>
        </div>
        <Button variant="outline" onClick={() => activeTab === 'login' ? loadLoginLogs() : loadOpLogs()}>
          <RefreshCw className="h-4 w-4 mr-2" />
          刷新
        </Button>
      </div>

      {/* Tab 切换 */}
      <div className="border-b border-gray-200">
        <div className="flex gap-1">
          <button
            onClick={() => setActiveTab('operation')}
            className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors flex items-center gap-2 ${
              activeTab === 'operation'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <ScrollText className="h-4 w-4" />
            操作日志
          </button>
          <button
            onClick={() => setActiveTab('login')}
            className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors flex items-center gap-2 ${
              activeTab === 'login'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <History className="h-4 w-4" />
            登录日志
          </button>
        </div>
      </div>

      {/* ================= 操作日志 Tab ================= */}
      {activeTab === 'operation' && (
        <div className="space-y-6 mt-6">
          {/* 筛选区 */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <Filter className="h-4 w-4" />
                筛选条件
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* 第一行：模块、操作、角色、操作者 */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">模块</label>
                  <Select value={opModule} onValueChange={setOpModule}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="全部模块" />
                    </SelectTrigger>
                    <SelectContent>
                      {MODULE_OPTIONS.map((opt) => (
                        <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">操作类型</label>
                  <Select value={opAction} onValueChange={setOpAction}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="全部操作" />
                    </SelectTrigger>
                    <SelectContent>
                      {ACTION_OPTIONS.map((opt) => (
                        <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">操作者角色</label>
                  <Select value={opOperatorType} onValueChange={setOpOperatorType}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="全部角色" />
                    </SelectTrigger>
                    <SelectContent>
                      {OPERATOR_TYPE_OPTIONS.map((opt) => (
                        <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">操作者</label>
                  <Input
                    placeholder="用户名/ID 搜索"
                    value={opOperatorName}
                    onChange={(e) => setOpOperatorName(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleOpSearch()}
                  />
                </div>
              </div>

              {/* 第二行：关键词、日期范围 */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">关键词</label>
                  <Input
                    placeholder="搜索操作对象/详情/ID"
                    value={opKeyword}
                    onChange={(e) => setOpKeyword(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleOpSearch()}
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="text-xs text-gray-500 mb-1 block flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    日期范围
                  </label>
                  <div className="flex gap-2 items-center">
                    <Input
                      type="date"
                      value={opStartDate}
                      onChange={(e) => setOpStartDate(e.target.value)}
                      className="flex-1"
                    />
                    <span className="text-gray-400">至</span>
                    <Input
                      type="date"
                      value={opEndDate}
                      onChange={(e) => setOpEndDate(e.target.value)}
                      className="flex-1"
                    />
                    <div className="flex gap-1">
                      {QUICK_DATE_RANGES.map((r) => (
                        <button
                          key={r.days}
                          onClick={() => setOpQuickDate(r.days)}
                          className="px-2 py-1 text-xs border border-gray-200 rounded-md hover:bg-gray-50 text-gray-600 whitespace-nowrap"
                        >
                          {r.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* 按钮行 */}
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={handleOpReset}>重置</Button>
                <Button onClick={handleOpSearch}>
                  <Search className="h-4 w-4 mr-2" />
                  查询
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* 操作日志表格 */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base">操作记录</CardTitle>
                  <CardDescription>共 {opTotal} 条记录</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[160px]">时间</TableHead>
                      <TableHead className="w-[100px]">模块</TableHead>
                      <TableHead className="w-[90px]">操作</TableHead>
                      <TableHead className="w-[120px]">操作对象</TableHead>
                      <TableHead className="w-[130px]">操作者</TableHead>
                      <TableHead>操作详情</TableHead>
                      <TableHead className="w-[110px]">IP</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {opLoading ? (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center py-12 text-gray-400">
                          加载中...
                        </TableCell>
                      </TableRow>
                    ) : opLogs.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center py-12 text-gray-400">
                          暂无操作日志
                        </TableCell>
                      </TableRow>
                    ) : (
                      opLogs.map((log) => (
                        <TableRow key={log.id}>
                          <TableCell className="text-gray-600 whitespace-nowrap text-sm">
                            {new Date(log.createdAt).toLocaleString('zh-CN', { hour12: false })}
                          </TableCell>
                          <TableCell className="text-gray-700 text-sm">
                            {MODULE_LABELS[log.module] || log.module}
                          </TableCell>
                          <TableCell>
                            <Badge className={ACTION_COLORS[log.action] || 'bg-gray-100 text-gray-700'}>
                              {ACTION_LABELS[log.action] || log.action}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-gray-700 text-sm">
                            {log.targetName || '-'}
                          </TableCell>
                          <TableCell>
                            <div className="text-sm text-gray-700">
                              {log.operatorName || log.operatorId || '-'}
                            </div>
                            <div className="text-xs text-gray-400">
                              {USER_TYPE_LABEL[log.operatorType] || log.operatorType}
                            </div>
                          </TableCell>
                          <TableCell
                            className="text-gray-600 text-sm max-w-[280px] truncate"
                            title={log.detail || ''}
                          >
                            {log.detail || '-'}
                          </TableCell>
                          <TableCell className="text-gray-500 text-sm font-mono whitespace-nowrap">
                            {log.ip || '-'}
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>

              <DataTablePagination
                page={opPage}
                pageSize={opPageSize}
                total={opTotal}
                onPageChange={setOpPage}
                onPageSizeChange={(size) => { setOpPageSize(size); setOpPage(1); }}
              />
            </CardContent>
          </Card>
        </div>
      )}

      {/* ================= 登录日志 Tab ================= */}
      {activeTab === 'login' && (
        <div className="space-y-6 mt-6">
          {/* 筛选区 */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <Filter className="h-4 w-4" />
                筛选条件
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* 第一行：用户类型、登录结果、用户名、IP */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">用户类型</label>
                  <Select value={loginUserType} onValueChange={setLoginUserType}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="全部用户类型" />
                    </SelectTrigger>
                    <SelectContent>
                      {LOGIN_USER_TYPE_OPTIONS.map((opt) => (
                        <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">登录结果</label>
                  <Select value={loginSuccess} onValueChange={setLoginSuccess}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="全部结果" />
                    </SelectTrigger>
                    <SelectContent>
                      {LOGIN_RESULT_OPTIONS.map((opt) => (
                        <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">用户名/手机号</label>
                  <Input
                    placeholder="搜索用户名"
                    value={loginUserName}
                    onChange={(e) => setLoginUserName(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleLoginSearch()}
                  />
                </div>
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">IP 地址</label>
                  <Input
                    placeholder="按 IP 搜索"
                    value={loginIp}
                    onChange={(e) => setLoginIp(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleLoginSearch()}
                  />
                </div>
              </div>

              {/* 第二行：日期范围 */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="md:col-span-2">
                  <label className="text-xs text-gray-500 mb-1 block flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    日期范围
                  </label>
                  <div className="flex gap-2 items-center">
                    <Input
                      type="date"
                      value={loginStartDate}
                      onChange={(e) => setLoginStartDate(e.target.value)}
                      className="flex-1"
                    />
                    <span className="text-gray-400">至</span>
                    <Input
                      type="date"
                      value={loginEndDate}
                      onChange={(e) => setLoginEndDate(e.target.value)}
                      className="flex-1"
                    />
                    <div className="flex gap-1">
                      {QUICK_DATE_RANGES.map((r) => (
                        <button
                          key={r.days}
                          onClick={() => setLoginQuickDate(r.days)}
                          className="px-2 py-1 text-xs border border-gray-200 rounded-md hover:bg-gray-50 text-gray-600 whitespace-nowrap"
                        >
                          {r.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* 按钮行 */}
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={handleLoginReset}>重置</Button>
                <Button onClick={handleLoginSearch}>
                  <Search className="h-4 w-4 mr-2" />
                  查询
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* 登录日志表格 */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base">登录记录</CardTitle>
                  <CardDescription>共 {loginTotal} 条记录</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[160px]">时间</TableHead>
                      <TableHead className="w-[100px]">用户类型</TableHead>
                      <TableHead className="w-[130px]">用户</TableHead>
                      <TableHead className="w-[120px]">IP</TableHead>
                      <TableHead>UA / 设备</TableHead>
                      <TableHead className="w-[100px]">结果</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {loginLoading ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center py-12 text-gray-400">
                          加载中...
                        </TableCell>
                      </TableRow>
                    ) : loginLogs.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center py-12 text-gray-400">
                          暂无登录记录
                        </TableCell>
                      </TableRow>
                    ) : (
                      loginLogs.map((log) => (
                        <TableRow key={log.id}>
                          <TableCell className="text-gray-600 whitespace-nowrap text-sm">
                            {new Date(log.createdAt).toLocaleString('zh-CN', { hour12: false })}
                          </TableCell>
                          <TableCell className="text-gray-700 text-sm">
                            {USER_TYPE_LABEL[log.userType] || log.userType}
                          </TableCell>
                          <TableCell className="text-sm text-gray-700">
                            {log.userName || '-'}
                          </TableCell>
                          <TableCell className="text-sm font-mono text-gray-600 whitespace-nowrap">
                            {log.ip || '-'}
                          </TableCell>
                          <TableCell
                            className="text-xs text-gray-500"
                            title={log.userAgent || ''}
                          >
                            {formatUA(log.userAgent)}
                          </TableCell>
                          <TableCell>
                            {log.success ? (
                              <Badge className="bg-green-100 text-green-700 hover:bg-green-100">
                                <CheckCircle className="h-3 w-3 mr-1" />
                                成功
                              </Badge>
                            ) : (
                              <Badge
                                className="bg-red-100 text-red-700 hover:bg-red-100"
                                title={log.errorMessage || ''}
                              >
                                <XCircle className="h-3 w-3 mr-1" />
                                失败
                              </Badge>
                            )}
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>

              <DataTablePagination
                page={loginPage}
                pageSize={loginPageSize}
                total={loginTotal}
                onPageChange={setLoginPage}
                onPageSizeChange={(size) => { setLoginPageSize(size); setLoginPage(1); }}
              />
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
