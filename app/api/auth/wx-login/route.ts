import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { createToken } from '@/lib/session';
import { setAuthCookie } from '@/lib/auth-cookie';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

interface WxLoginPayload {
  code: string;
  userType: 'store_user' | 'customer';
}

export async function POST(request: Request) {
  try {
    const { code, userType } = (await request.json()) as WxLoginPayload;

    if (!code || !userType) {
      return NextResponse.json({ error: '缺少必要参数' }, { status: 400 });
    }

    const wxAppId = process.env.WX_APP_ID || '';
    const wxAppSecret = process.env.WX_APP_SECRET || '';

    if (!wxAppId || !wxAppSecret) {
      console.warn('[wx-login] 微信小程序配置未设置，使用模拟登录');
      return handleMockLogin(userType);
    }

    const wxResponse = await fetch(
      `https://api.weixin.qq.com/sns/jscode2session?appid=${wxAppId}&secret=${wxAppSecret}&js_code=${code}&grant_type=authorization_code`
    );

    const wxData = await wxResponse.json();

    if (wxData.errcode) {
      return NextResponse.json({ error: wxData.errmsg }, { status: 401 });
    }

    const { openid, unionid } = wxData;

    if (userType === 'store_user') {
      return handleStoreUserWxLogin(openid, unionid);
    }

    if (userType === 'customer') {
      return handleCustomerWxLogin(openid, unionid);
    }

    return NextResponse.json({ error: '无效的用户类型' }, { status: 400 });
  } catch (error) {
    console.error('[wx-login] Error:', error);
    return NextResponse.json({ error: '服务器错误' }, { status: 500 });
  }
}

async function handleMockLogin(userType: 'store_user' | 'customer') {
  if (userType === 'store_user') {
    const user = await prisma.storeUser.findFirst({
      include: { stores: { select: { id: true }, take: 1 } },
    });

    if (!user) {
      return NextResponse.json({ error: '未找到门店用户' }, { status: 404 });
    }

    let permissions: string[] | null = null;
    if (user.permissions) {
      try {
        permissions = JSON.parse(user.permissions);
      } catch {
        permissions = null;
      }
    }

    const sessionData = {
      userType: 'store_user' as const,
      userId: user.id,
      storeId: user.stores[0]?.id ?? null,
      permissions,
    };

    await setAuthCookie(sessionData);
    const token = createToken(sessionData);

    return NextResponse.json({
      userType: 'store_user',
      userId: user.id,
      userName: user.name,
      phone: user.phone,
      storeId: user.stores[0]?.id ?? null,
      permissions,
      token,
    });
  }

  if (userType === 'customer') {
    const customer = await prisma.customer.findFirst();

    if (!customer) {
      return NextResponse.json({ error: '未找到客户' }, { status: 404 });
    }

    const sessionData = {
      userType: 'customer' as const,
      userId: customer.id,
      storeId: customer.storeId,
    };

    await setAuthCookie(sessionData);
    const token = createToken(sessionData);

    return NextResponse.json({
      userType: 'customer',
      userId: customer.id,
      userName: customer.name,
      phone: customer.phone,
      storeId: customer.storeId,
      token,
    });
  }

  return NextResponse.json({ error: '无效的用户类型' }, { status: 400 });
}

async function handleStoreUserWxLogin(openid: string, unionid?: string) {
  let user = await prisma.storeUser.findFirst({
    where: { wxMpOpenid: openid },
    include: { stores: { select: { id: true }, take: 1 } },
  });

  if (!user && unionid) {
    user = await prisma.storeUser.findFirst({
      where: { wxUnionid: unionid },
      include: { stores: { select: { id: true }, take: 1 } },
    });
  }

  if (!user) {
    return NextResponse.json({ error: '微信未绑定账号' }, { status: 404 });
  }

  let permissions: string[] | null = null;
  if (user.permissions) {
    try {
      permissions = JSON.parse(user.permissions);
    } catch {
      permissions = null;
    }
  }

  const sessionData = {
    userType: 'store_user' as const,
    userId: user.id,
    storeId: user.stores[0]?.id ?? null,
    permissions,
  };

  await setAuthCookie(sessionData);
  const token = createToken(sessionData);

  return NextResponse.json({
    userType: 'store_user',
    userId: user.id,
    userName: user.name,
    phone: user.phone,
    storeId: user.stores[0]?.id ?? null,
    permissions,
    token,
  });
}

async function handleCustomerWxLogin(openid: string, unionid?: string) {
  let customer = await prisma.customer.findFirst({
    where: { wxMpOpenid: openid },
  });

  if (!customer && unionid) {
    customer = await prisma.customer.findFirst({
      where: { wxUnionid: unionid },
    });
  }

  if (!customer) {
    return NextResponse.json({ error: '微信未绑定账号' }, { status: 404 });
  }

  const sessionData = {
    userType: 'customer' as const,
    userId: customer.id,
    storeId: customer.storeId,
  };

  await setAuthCookie(sessionData);
  const token = createToken(sessionData);

  return NextResponse.json({
    userType: 'customer',
    userId: customer.id,
    userName: customer.name,
    phone: customer.phone,
    storeId: customer.storeId,
    token,
  });
}
