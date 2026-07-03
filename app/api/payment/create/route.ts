import { NextResponse } from 'next/server';
import { requireCustomer } from '@/lib/auth';
import { createMiniPayment, createH5Payment, generateOutTradeNo } from '@/lib/wechat-pay';
import { prisma } from '@/lib/prisma';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const { session, customerId, storeId } = await requireCustomer();
    
    const { amount, description, payMethod = 'mini', metadata } = await request.json();

    if (!amount || amount <= 0) {
      return NextResponse.json({ error: '金额必须大于0' }, { status: 400 });
    }

    if (!description) {
      return NextResponse.json({ error: '缺少商品描述' }, { status: 400 });
    }

    const outTradeNo = generateOutTradeNo();

    const existingOrder = await prisma.paymentOrder.findUnique({
      where: { outTradeNo },
    });

    if (existingOrder) {
      return NextResponse.json({ error: '订单号重复' }, { status: 400 });
    }

    const notifyUrl = `${process.env.NEXT_PUBLIC_APP_URL || ''}/api/payment/notify`;

    let paymentResult: any;

    const customer = await prisma.customer.findUnique({
      where: { id: customerId },
    });

    if (!customer) {
      return NextResponse.json({ error: '客户不存在' }, { status: 404 });
    }

    if (payMethod === 'mini') {
      if (!customer.wxMpOpenid) {
        return NextResponse.json({ error: '客户未绑定微信' }, { status: 400 });
      }

      paymentResult = await createMiniPayment({
        outTradeNo,
        amount,
        description,
        openid: customer.wxMpOpenid,
        notifyUrl,
        metadata,
      });
    } else {
      paymentResult = await createH5Payment({
        outTradeNo,
        amount,
        description,
        notifyUrl,
        metadata,
      });
    }

    await prisma.paymentOrder.create({
      data: {
        storeId,
        customerId,
        outTradeNo,
        amount,
        status: 'pending',
        payMethod,
        description,
        metadata,
      },
    });

    return NextResponse.json({
      outTradeNo,
      amount,
      ...paymentResult,
    });
  } catch (error) {
    console.error('创建支付订单失败:', error);
    const message = error instanceof Error ? error.message : '服务器错误';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}