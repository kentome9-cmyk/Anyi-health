'use client';

import { Store, Lock, User } from '@/lib/icons';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

type StoreFormData = {
  storeName: string;
  description: string;
  address: string;
  contactPhone: string;
  expirationTime: string;
  userPhone: string;
  userPassword: string;
  userName: string;
  userId: string;
};

interface StoreUserOption {
  id: string;
  phone: string;
  name: string | null;
}

interface StoreFormProps {
  mode: 'add' | 'edit';
  formData: StoreFormData;
  formErrors: Record<string, string>;
  onFormChange: (data: StoreFormData) => void;
  onSubmit: (e: React.FormEvent) => void;
  onCancel: () => void;
  availableUsers: StoreUserOption[];
}

export function StoreForm({
  mode,
  formData,
  formErrors,
  onFormChange,
  onSubmit,
  onCancel,
  availableUsers,
}: StoreFormProps) {
  const handleChange = (key: keyof typeof formData, value: string) => {
    onFormChange({ ...formData, [key]: value });
  };

  const hasExistingUsers = availableUsers.length > 0;
  const selectedUserId = formData.userId;
  const isUsingExistingUser = selectedUserId && mode === 'add';

  return (
    <form onSubmit={onSubmit} className="space-y-5">
      <div className="border rounded-lg p-4">
        <h3 className="text-sm font-medium text-gray-700 mb-3 flex items-center gap-2">
          <Store className="h-4 w-4" />
          门店信息
        </h3>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5 col-span-2">
            <Label htmlFor={`${mode}StoreName`}>门店名称 *</Label>
            <Input
              id={`${mode}StoreName`}
              value={formData.storeName}
              onChange={(e) => handleChange('storeName', e.target.value)}
            />
            {formErrors.storeName && (
              <p className="text-xs text-red-500">{formErrors.storeName}</p>
            )}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor={`${mode}ContactPhone`}>联系电话</Label>
            <Input
              id={`${mode}ContactPhone`}
              value={formData.contactPhone}
              onChange={(e) => handleChange('contactPhone', e.target.value)}
              placeholder="选填，11位手机号"
            />
            {formErrors.contactPhone && (
              <p className="text-xs text-red-500">{formErrors.contactPhone}</p>
            )}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor={`${mode}ExpirationTime`}>服务到期时间</Label>
            <Input
              id={`${mode}ExpirationTime`}
              type="date"
              value={formData.expirationTime}
              onChange={(e) => handleChange('expirationTime', e.target.value)}
            />
          </div>
          <div className="space-y-1.5 col-span-2">
            <Label htmlFor={`${mode}Address`}>门店地址</Label>
            <Input
              id={`${mode}Address`}
              value={formData.address}
              onChange={(e) => handleChange('address', e.target.value)}
            />
          </div>
          <div className="space-y-1.5 col-span-2">
            <Label htmlFor={`${mode}Description`}>门店描述</Label>
            <Input
              id={`${mode}Description`}
              value={formData.description}
              onChange={(e) => handleChange('description', e.target.value)}
            />
          </div>
        </div>
      </div>

      <div className="border rounded-lg p-4">
        <h3 className="text-sm font-medium text-gray-700 mb-3 flex items-center gap-2">
          <Lock className="h-4 w-4" />
          {mode === 'add' ? '登录账号（用于门店员工登录系统）' : '登录账号'}
        </h3>
        <div className="grid grid-cols-2 gap-3">
          {mode === 'add' && hasExistingUsers && (
            <div className="space-y-1.5 col-span-2">
              <Label htmlFor={`${mode}UserId`}>选择已有用户（注册时未填写门店名称的用户）</Label>
              <Select value={selectedUserId || '__new__'} onValueChange={(value) => handleChange('userId', value === '__new__' ? '' : value)}>
                <SelectTrigger>
                  <SelectValue placeholder="选择已有用户或创建新账号" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__new__">创建新账号</SelectItem>
                  {availableUsers.map((user) => (
                    <SelectItem key={user.id} value={user.id}>
                      <div className="flex items-center gap-2">
                        <User className="w-3 h-3 text-gray-400" />
                        <span>{user.phone}</span>
                        {user.name && <span className="text-gray-500 text-sm">({user.name})</span>}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
          {!isUsingExistingUser && (
            <>
              <div className="space-y-1.5 col-span-2">
                <Label htmlFor={`${mode}UserPhone`}>登录手机号 {mode === 'add' ? '*' : ''}</Label>
                <Input
                  id={`${mode}UserPhone`}
                  value={formData.userPhone}
                  onChange={(e) => handleChange('userPhone', e.target.value)}
                  placeholder={mode === 'add' ? '11位手机号，用于登录后台' : ''}
                />
                {formErrors.userPhone && (
                  <p className="text-xs text-red-500">{formErrors.userPhone}</p>
                )}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor={`${mode}UserPassword`}>
                  {mode === 'add' ? '初始密码 *' : '新密码'}
                </Label>
                <Input
                  id={`${mode}UserPassword`}
                  type="password"
                  value={formData.userPassword}
                  onChange={(e) => handleChange('userPassword', e.target.value)}
                  placeholder={mode === 'add' ? '至少6位' : '留空则不修改'}
                />
                {formErrors.userPassword && (
                  <p className="text-xs text-red-500">{formErrors.userPassword}</p>
                )}
              </div>
            </>
          )}
          {isUsingExistingUser && (
            <div className="space-y-1.5 col-span-2">
              <Label>已选择用户</Label>
              <div className="flex items-center gap-2 p-2 bg-gray-50 rounded-lg">
                <User className="w-4 h-4 text-gray-400" />
                <span className="font-medium">
                  {availableUsers.find((u) => u.id === selectedUserId)?.phone}
                </span>
                {availableUsers.find((u) => u.id === selectedUserId)?.name && (
                  <span className="text-gray-500">({availableUsers.find((u) => u.id === selectedUserId)?.name})</span>
                )}
              </div>
            </div>
          )}
          <div className="space-y-1.5">
            <Label htmlFor={`${mode}UserName`}>店长姓名</Label>
            <Input
              id={`${mode}UserName`}
              value={formData.userName}
              onChange={(e) => handleChange('userName', e.target.value)}
              placeholder="可选"
            />
          </div>
        </div>
      </div>

      <div className="flex justify-end gap-3">
        <Button type="button" variant="outline" onClick={onCancel}>
          取消
        </Button>
        <Button type="submit">
          {mode === 'add' ? '创建门店' : '保存'}
        </Button>
      </div>
    </form>
  );
}