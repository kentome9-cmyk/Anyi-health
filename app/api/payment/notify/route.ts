import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { decryptNotifyResource } from '@/lib/wechat-pay';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const body = await request.text();

    if (!body) {
      return NextResponse.json({ code: 'FAIL', message: '空的请求体' }, { status: 400 });
    }

    let notifyData: any;
    try {
      notifyData = JSON.parse(body);
    } catch {
      return NextResponse.json({ code: 'FAIL', message: 'JSON解析失败' }, { status: 400 });
    }

    const { resource, out_trade_no, transaction_id } = notifyData;

    if (!resource || !out_trade_no) {
      return NextResponse.json({ code: 'FAIL', message: '缺少必要字段' }, { status: 400 });
    }

    const order = await prisma.paymentOrder.findUnique({
      where: { outTradeNo: out_trade_no },
    });

    if (!order) {
      return NextResponse.json({ code: 'FAIL', message: '订单不存在' }, { status: 404 });
    }

    if (order.status === 'success') {
      return NextResponse.json({ code: 'SUCCESS', message: '已处理过' });
    }

    const decryptResult = await decryptNotifyResource(resource);

    const { trade_state } = decryptResult;

    if (trade_state === 'SUCCESS') {
      await prisma.paymentOrder.update({
        where: { outTradeNo: out_trade_no },
        data: {
          status: 'success',
          transactionId: transaction_id,
          updatedAt: new Date(),
        },
      });
    } else if (trade_state === 'REFUND' || trade_state === 'CLOSED') {
      await prisma.paymentOrder.update({
        where: { outTradeNo: out_trade_no },
        data: {
          status: 'cancelled',
          transactionId: transaction_id,
          updatedAt: new Date(),
        },
      });
    } else {
      await prisma.paymentOrder.update({
        where: { outTradeNo: out_trade_no },
        data: {
          status: 'failed',
          transactionId: transaction_id,
          updatedAt: new Date(),
        },
      });
    }

    return NextResponse.json({ code: 'SUCCESS', message: '处理成功' });
  } catch (error) {
    console.error('支付回调处理失败:', error);
    return NextResponse.json({ code: 'FAIL', message: '服务器错误' }, { status: 500 });
  }
}