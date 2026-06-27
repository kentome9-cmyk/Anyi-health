'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  CheckCircle,
  XCircle,
  Loader2,
  Database,
  User,
  Sparkles,
  Rocket,
  Eye,
  EyeOff,
  CircleAlert,
} from '@/lib/icons';

type Step = 'check' | 'migrate' | 'admin' | 'done';

interface DbCheckResult {
  success: boolean;
  message: string;
  url?: string;
  tablesExist?: boolean;
  existingTables?: string[];
  detail?: string;
}

interface MigrateResult {
  success: boolean;
  message: string;
  stdout?: string;
  stderr?: string;
  detail?: string;
}

interface CreateAdminResult {
  success: boolean;
  message: string;
  detail?: string;
  admin?: { id: string; username: string; name: string | null };
}

const STEPS: Array<{ key: Step; label: string; icon: typeof Database }> = [
  { key: 'check', label: '数据库连接', icon: Database },
  { key: 'migrate', label: '数据表初始化', icon: Database },
  { key: 'admin', label: '创建管理员', icon: User },
  { key: 'done', label: '完成', icon: Sparkles },
];

export function InstallWizard() {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState<Step>('check');
  const [completedSteps, setCompletedSteps] = useState<Set<Step>>(new Set());

  // 数据库检测
  const [dbChecking, setDbChecking] = useState(false);
  const [dbResult, setDbResult] = useState<DbCheckResult | null>(null);

  // 表迁移
  const [migrating, setMigrating] = useState(false);
  const [migrateResult, setMigrateResult] = useState<MigrateResult | null>(null);

  // 创建管理员
  const [adminForm, setAdminForm] = useState({
    username: 'admin',
    password: '',
    confirmPassword: '',
    name: '',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [creatingAdmin, setCreatingAdmin] = useState(false);
  const [adminResult, setAdminResult] = useState<CreateAdminResult | null>(null);
  const [adminFormError, setAdminFormError] = useState<string | null>(null);

  // 顶部状态：是否已安装
  const [installChecked, setInstallChecked] = useState(false);
  const [alreadyInstalled, setAlreadyInstalled] = useState(false);

  // 检查是否已安装
  useEffect(() => {
    const checkInstalled = async () => {
      try {
        const res = await fetch('/api/install/status', { cache: 'no-store' });
        const data = await res.json();
        if (data.installed) {
          setAlreadyInstalled(true);
        }
      } catch {
        // 忽略错误，按未安装处理
      } finally {
        setInstallChecked(true);
      }
    };
    checkInstalled();
  }, []);

  // 已安装则跳转到登录
  useEffect(() => {
    if (alreadyInstalled) {
      router.replace('/login/admin');
    }
  }, [alreadyInstalled, router]);

  const runDbCheck = useCallback(async () => {
    setDbChecking(true);
    setDbResult(null);
    try {
      const res = await fetch('/api/install/check-db', { cache: 'no-store' });
      const data = await res.json();
      setDbResult(data);
      if (data.success) {
        setCompletedSteps((prev) => new Set(prev).add('check'));
      }
    } catch (err) {
      setDbResult({
        success: false,
        message: '请求失败',
        detail: err instanceof Error ? err.message : String(err),
      });
    } finally {
      setDbChecking(false);
    }
  }, []);

  const runMigrate = useCallback(async () => {
    setMigrating(true);
    setMigrateResult(null);
    try {
      const res = await fetch('/api/install/migrate', {
        method: 'POST',
        cache: 'no-store',
      });
      const data = await res.json();
      setMigrateResult(data);
      if (data.success) {
        setCompletedSteps((prev) => new Set(prev).add('migrate'));
      }
    } catch (err) {
      setMigrateResult({
        success: false,
        message: '请求失败',
        detail: err instanceof Error ? err.message : String(err),
      });
    } finally {
      setMigrating(false);
    }
  }, []);

  const submitAdmin = useCallback(async () => {
    setAdminFormError(null);
    // 前端校验
    if (adminForm.username.length < 3 || adminForm.username.length > 100) {
      setAdminFormError('用户名长度需在 3-100 个字符之间');
      return;
    }
    if (adminForm.password.length < 6 || adminForm.password.length > 50) {
      setAdminFormError('密码长度需在 6-50 个字符之间');
      return;
    }
    if (adminForm.password !== adminForm.confirmPassword) {
      setAdminFormError('两次输入的密码不一致');
      return;
    }

    setCreatingAdmin(true);
    setAdminResult(null);
    try {
      const res = await fetch('/api/install/create-admin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: adminForm.username.trim(),
          password: adminForm.password,
          name: adminForm.name.trim() || undefined,
        }),
      });
      const data = await res.json();
      setAdminResult(data);
      if (data.success) {
        setCompletedSteps((prev) => new Set(prev).add('admin'));
        setCurrentStep('done');
      }
    } catch (err) {
      setAdminResult({
        success: false,
        message: '请求失败',
        detail: err instanceof Error ? err.message : String(err),
      });
    } finally {
      setCreatingAdmin(false);
    }
  }, [adminForm]);

  const handleNext = useCallback(() => {
    if (currentStep === 'check') {
      if (dbResult?.success) {
        setCurrentStep('migrate');
        // 如果表已存在，自动跳过迁移
        if (dbResult.tablesExist) {
          setCompletedSteps((prev) => new Set(prev).add('migrate'));
        }
      }
    } else if (currentStep === 'migrate') {
      setCurrentStep('admin');
    }
  }, [currentStep, dbResult]);

  // 初次加载自动检测数据库
  useEffect(() => {
    if (installChecked && !alreadyInstalled && currentStep === 'check' && !dbResult && !dbChecking) {
      runDbCheck();
    }
  }, [installChecked, alreadyInstalled, currentStep, dbResult, dbChecking, runDbCheck]);

  if (!installChecked) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-green-50 via-white to-emerald-50">
        <Loader2 className="size-8 animate-spin text-green-600" />
      </div>
    );
  }

  if (alreadyInstalled) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-green-50 via-white to-emerald-50">
        <div className="text-center">
          <Loader2 className="size-8 animate-spin text-green-600 mx-auto mb-3" />
          <p className="text-gray-600">系统已安装，正在跳转登录...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-white to-emerald-50 px-4 py-8 md:py-12">
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center size-14 rounded-2xl bg-gradient-to-br from-green-500 to-emerald-600 shadow-lg shadow-green-200 mb-4">
            <Sparkles className="size-7 text-white" />
          </div>
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900">
            安姨健康 · 系统安装
          </h1>
          <p className="text-sm md:text-base text-gray-500 mt-2">
            欢迎使用，请按步骤完成系统初始化
          </p>
        </div>

        {/* Stepper */}
        <div className="mb-6">
          <div className="flex items-center justify-between bg-white rounded-xl p-3 ring-1 ring-gray-200 shadow-sm">
            {STEPS.map((step, index) => {
              const Icon = step.icon;
              const isCompleted = completedSteps.has(step.key);
              const isCurrent = currentStep === step.key;
              const isLast = index === STEPS.length - 1;

              return (
                <div key={step.key} className="flex items-center flex-1 last:flex-none">
                  <div className="flex flex-col items-center gap-1.5 min-w-0">
                    <div
                      className={`size-9 rounded-full flex items-center justify-center transition-all ${
                        isCompleted
                          ? 'bg-green-500 text-white shadow-sm shadow-green-200'
                          : isCurrent
                          ? 'bg-green-100 text-green-700 ring-2 ring-green-500'
                          : 'bg-gray-100 text-gray-400'
                      }`}
                    >
                      {isCompleted ? (
                        <CheckCircle className="size-5" />
                      ) : (
                        <Icon className="size-4" />
                      )}
                    </div>
                    <span
                      className={`text-xs font-medium whitespace-nowrap ${
                        isCurrent || isCompleted ? 'text-gray-900' : 'text-gray-400'
                      }`}
                    >
                      {step.label}
                    </span>
                  </div>
                  {!isLast && (
                    <div className="flex-1 h-0.5 mx-2 mb-5 bg-gray-200">
                      <div
                        className={`h-full transition-all ${
                          isCompleted ? 'bg-green-500' : 'bg-gray-200'
                        }`}
                      />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Step Content */}
        {currentStep === 'check' && (
          <Card className="shadow-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Database className="size-5 text-green-600" />
                步骤 1：检查数据库连接
              </CardTitle>
              <p className="text-sm text-gray-500 mt-1">
                系统会读取 <code className="px-1.5 py-0.5 bg-gray-100 rounded text-xs">.env</code> 中的{' '}
                <code className="px-1.5 py-0.5 bg-gray-100 rounded text-xs">DATABASE_URL</code> 验证数据库连接。
              </p>
            </CardHeader>
            <CardContent className="space-y-4">
              {dbChecking && (
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <Loader2 className="size-4 animate-spin" />
                  正在连接数据库...
                </div>
              )}

              {dbResult && (
                <div
                  className={`rounded-lg p-4 ${
                    dbResult.success
                      ? 'bg-green-50 ring-1 ring-green-200'
                      : 'bg-red-50 ring-1 ring-red-200'
                  }`}
                >
                  <div className="flex items-start gap-2">
                    {dbResult.success ? (
                      <CheckCircle className="size-5 text-green-600 mt-0.5 shrink-0" />
                    ) : (
                      <XCircle className="size-5 text-red-600 mt-0.5 shrink-0" />
                    )}
                    <div className="flex-1 min-w-0">
                      <p
                        className={`text-sm font-medium ${
                          dbResult.success ? 'text-green-900' : 'text-red-900'
                        }`}
                      >
                        {dbResult.message}
                      </p>
                      {dbResult.url && (
                        <p className="text-xs text-gray-600 mt-1.5 font-mono break-all">
                          连接串：{dbResult.url}
                        </p>
                      )}
                      {dbResult.detail && (
                        <p className="text-xs text-red-700 mt-1.5 break-all">
                          详情：{dbResult.detail}
                        </p>
                      )}
                      {dbResult.success && dbResult.tablesExist && (
                        <div className="mt-2">
                          <p className="text-xs text-gray-600">
                            已存在 {dbResult.existingTables?.length} 张表
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              <div className="flex justify-end gap-2 pt-2">
                <Button
                  variant="outline"
                  onClick={runDbCheck}
                  disabled={dbChecking}
                >
                  {dbChecking && <Loader2 className="size-4 animate-spin" />}
                  重新检测
                </Button>
                <Button
                  onClick={handleNext}
                  disabled={!dbResult?.success}
                >
                  下一步
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {currentStep === 'migrate' && (
          <Card className="shadow-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Database className="size-5 text-green-600" />
                步骤 2：初始化数据表
              </CardTitle>
              <p className="text-sm text-gray-500 mt-1">
                {dbResult?.tablesExist
                  ? '检测到数据库中已存在表结构，可直接进入下一步。'
                  : '系统将执行 `prisma db push` 创建或同步数据表结构。'}
              </p>
            </CardHeader>
            <CardContent className="space-y-4">
              {migrating && (
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <Loader2 className="size-4 animate-spin" />
                  正在创建/同步数据表，请稍候...
                </div>
              )}

              {migrateResult && (
                <div
                  className={`rounded-lg p-4 ${
                    migrateResult.success
                      ? 'bg-green-50 ring-1 ring-green-200'
                      : 'bg-red-50 ring-1 ring-red-200'
                  }`}
                >
                  <div className="flex items-start gap-2">
                    {migrateResult.success ? (
                      <CheckCircle className="size-5 text-green-600 mt-0.5 shrink-0" />
                    ) : (
                      <XCircle className="size-5 text-red-600 mt-0.5 shrink-0" />
                    )}
                    <div className="flex-1 min-w-0">
                      <p
                        className={`text-sm font-medium ${
                          migrateResult.success ? 'text-green-900' : 'text-red-900'
                        }`}
                      >
                        {migrateResult.message}
                      </p>
                      {migrateResult.detail && (
                        <p className="text-xs text-red-700 mt-1.5 break-all">
                          详情：{migrateResult.detail}
                        </p>
                      )}
                      {migrateResult.stdout && (
                        <details className="mt-2">
                          <summary className="text-xs text-gray-600 cursor-pointer">
                            查看执行输出
                          </summary>
                          <pre className="mt-2 text-xs bg-white/60 p-2 rounded ring-1 ring-gray-200 overflow-x-auto whitespace-pre-wrap break-all max-h-48 overflow-y-auto">
                            {migrateResult.stdout}
                            {migrateResult.stderr && `\n${migrateResult.stderr}`}
                          </pre>
                        </details>
                      )}
                    </div>
                  </div>
                </div>
              )}

              <div className="flex justify-end gap-2 pt-2">
                <Button
                  variant="outline"
                  onClick={() => setCurrentStep('check')}
                  disabled={migrating}
                >
                  上一步
                </Button>
                {!dbResult?.tablesExist && (
                  <Button
                    onClick={runMigrate}
                    disabled={migrating || migrateResult?.success}
                  >
                    {migrating && <Loader2 className="size-4 animate-spin" />}
                    {migrateResult?.success ? '已完成' : '开始初始化'}
                  </Button>
                )}
                <Button
                  onClick={handleNext}
                  disabled={!dbResult?.tablesExist && !migrateResult?.success}
                >
                  下一步
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {currentStep === 'admin' && (
          <Card className="shadow-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="size-5 text-green-600" />
                步骤 3：创建超级管理员
              </CardTitle>
              <p className="text-sm text-gray-500 mt-1">
                请设置系统首个管理员账号。安装完成后，请妥善保管账号信息。
              </p>
            </CardHeader>
            <CardContent className="space-y-4">
              {adminResult && !adminResult.success && (
                <div className="rounded-lg p-3 bg-red-50 ring-1 ring-red-200 flex items-start gap-2">
                  <XCircle className="size-4 text-red-600 mt-0.5 shrink-0" />
                  <div className="text-sm">
                    <p className="text-red-900 font-medium">{adminResult.message}</p>
                    {adminResult.detail && (
                      <p className="text-xs text-red-700 mt-1 break-all">
                        {adminResult.detail}
                      </p>
                    )}
                  </div>
                </div>
              )}

              <div className="space-y-3">
                <div>
                  <label className="text-sm font-medium text-gray-700 mb-1.5 block">
                    用户名 <span className="text-red-500">*</span>
                  </label>
                  <Input
                    value={adminForm.username}
                    onChange={(e) =>
                      setAdminForm({ ...adminForm, username: e.target.value })
                    }
                    placeholder="3-100 个字符，支持字母、数字、下划线、@、.、-"
                    autoComplete="username"
                  />
                </div>

                <div>
                  <label className="text-sm font-medium text-gray-700 mb-1.5 block">
                    姓名 <span className="text-gray-400 text-xs">（可选）</span>
                  </label>
                  <Input
                    value={adminForm.name}
                    onChange={(e) =>
                      setAdminForm({ ...adminForm, name: e.target.value })
                    }
                    placeholder="管理员姓名"
                  />
                </div>

                <div>
                  <label className="text-sm font-medium text-gray-700 mb-1.5 block">
                    密码 <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <Input
                      type={showPassword ? 'text' : 'password'}
                      value={adminForm.password}
                      onChange={(e) =>
                        setAdminForm({ ...adminForm, password: e.target.value })
                      }
                      placeholder="6-50 个字符"
                      autoComplete="new-password"
                      className="pr-9"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      {showPassword ? (
                        <EyeOff className="size-4" />
                      ) : (
                        <Eye className="size-4" />
                      )}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="text-sm font-medium text-gray-700 mb-1.5 block">
                    确认密码 <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <Input
                      type={showConfirmPassword ? 'text' : 'password'}
                      value={adminForm.confirmPassword}
                      onChange={(e) =>
                        setAdminForm({
                          ...adminForm,
                          confirmPassword: e.target.value,
                        })
                      }
                      placeholder="再次输入密码"
                      autoComplete="new-password"
                      className="pr-9"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      {showConfirmPassword ? (
                        <EyeOff className="size-4" />
                      ) : (
                        <Eye className="size-4" />
                      )}
                    </button>
                  </div>
                </div>
              </div>

              {adminFormError && (
                <div className="rounded-lg p-3 bg-amber-50 ring-1 ring-amber-200 flex items-start gap-2">
                  <CircleAlert className="size-4 text-amber-600 mt-0.5 shrink-0" />
                  <p className="text-sm text-amber-900">{adminFormError}</p>
                </div>
              )}

              <div className="flex justify-end gap-2 pt-2">
                <Button
                  variant="outline"
                  onClick={() => setCurrentStep('migrate')}
                  disabled={creatingAdmin}
                >
                  上一步
                </Button>
                <Button
                  onClick={submitAdmin}
                  disabled={creatingAdmin}
                >
                  {creatingAdmin && <Loader2 className="size-4 animate-spin" />}
                  创建管理员
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {currentStep === 'done' && (
          <Card className="shadow-sm">
            <CardContent className="py-12 text-center">
              <div className="inline-flex items-center justify-center size-16 rounded-full bg-green-100 mb-4">
                <Rocket className="size-8 text-green-600" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">
                系统安装完成！
              </h2>
              <p className="text-sm text-gray-500 mb-1">
                管理员账号已创建：<span className="font-mono text-gray-900">{adminResult?.admin?.username}</span>
              </p>
              <p className="text-sm text-gray-500 mb-6">
                您现在可以使用该账号登录后台管理系统
              </p>
              <div className="flex items-center justify-center gap-2">
                <Button
                  variant="outline"
                  onClick={() => router.push('/login')}
                >
                  门店端登录
                </Button>
                <Button onClick={() => router.push('/login/admin')}>
                  立即登录后台
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
