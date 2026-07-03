import { NextResponse } from 'next/server';
import { jscode2session } from '@/lib/wechat-auth';
import { prisma } from '@/lib/prisma';
import { setAuthCookie } from '@/lib/auth-cookie';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const { code, storeId, nickname, avatarUrl } = await request.json();

    if (!code) {
      return NextResponse.json({ error: '缺少code参数' }, { status: 400 });
    }

    const result = await jscode2session(code);
    
    const { openid, unionid } = result;

    let customer = await prisma.customer.findUnique({
      where: { wxMpOpenid: openid },
    });

    if (!customer) {
      if (!storeId) {
        return NextResponse.json({ error: '首次登录需要门店ID' }, { status: 400 });
      }

      customer = await prisma.customer.create({
        data: {
          storeId,
          phone: `wx_${openid.slice(-10)}`,
          name: nickname || '微信用户',
          wxMpOpenid: openid,
          wxUnionid: unionid || undefined,
          wxNickname: nickname || undefined,
          wxAvatar: avatarUrl || undefined,
        },
      });
    } else {
      if (nickname || avatarUrl) {
        await prisma.customer.update({
          where: { id: customer.id },
          data: {
            wxNickname: nickname || customer.wxNickname,
            wxAvatar: avatarUrl || customer.wxAvatar,
          },
        });
      }
    }

    await setAuthCookie({
      userType: 'customer',
      userId: customer.id,
      storeId: customer.storeId,
    });

    return NextResponse.json({
      userType: 'customer',
      userId: customer.id,
      userName: customer.name,
      storeId: customer.storeId,
      wxOpenid: openid,
    });
  } catch (error) {
    console.error('微信登录失败:', error);
    const message = error instanceof Error ? error.message : '服务器错误';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}