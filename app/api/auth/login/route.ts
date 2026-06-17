import { NextResponse } from 'next/server';
import { validateAdmin, validateStoreUser, validateCustomer } from '@/services/auth.service';

export async function POST(request: Request) {
  try {
    const { phone, password, userType, username } = await request.json();

    if (userType === 'admin') {
      if (!username || !password) {
        return NextResponse.json(
          { error: '缺少必要参数' },
          { status: 400 }
        );
      }
      const user = await validateAdmin(username, password);
      if (!user) {
        return NextResponse.json(
          { error: '用户名或密码错误' },
          { status: 401 }
        );
      }
      return NextResponse.json({
        userType: 'admin',
        userId: user.id,
        userName: user.username,
        storeId: null,
      });
    }

    if (userType === 'store_user') {
      if (!phone || !password) {
        return NextResponse.json(
          { error: '缺少必要参数' },
          { status: 400 }
        );
      }
      const user = await validateStoreUser(phone, password);
      if (!user) {
        return NextResponse.json(
          { error: '手机号或密码错误' },
          { status: 401 }
        );
      }
      return NextResponse.json({
        userType: 'store_user',
        userId: user.id,
        userName: user.name,
        storeId: user.storeId,
      });
    }

    if (userType === 'customer') {
      if (!phone || !password) {
        return NextResponse.json(
          { error: '缺少必要参数' },
          { status: 400 }
        );
      }
      const customer = await validateCustomer(phone, password);
      if (!customer) {
        return NextResponse.json(
          { error: '手机号或密码错误' },
          { status: 401 }
        );
      }
      return NextResponse.json({
        userType: 'customer',
        userId: customer.id,
        userName: customer.name,
        storeId: customer.storeId,
      });
    }

    return NextResponse.json(
      { error: '无效的用户类型' },
      { status: 400 }
    );
  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json(
      { error: '服务器错误' },
      { status: 500 }
    );
  }
}
