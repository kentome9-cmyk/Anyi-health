import WechatPay from 'wechatpay-node-v3';
import crypto from 'crypto';
import { getSystemSettings } from './system-settings';

let wechatPayInstance: WechatPay | null = null;

export interface WechatPayConfig {
  appId: string;
  mchId: string;
  apiV3Key: string;
  serialNo: string;
  privateKey: string;
}

export interface CreatePaymentParams {
  outTradeNo: string;
  amount: number;
  description: string;
  openid?: string;
  notifyUrl?: string;
  metadata?: Record<string, unknown>;
}

export interface PaymentResult {
  prepayId: string;
  paySign: string;
  timeStamp: string;
  nonceStr: string;
  package: string;
  signType: string;
}

export async function getWechatPayConfig(): Promise<WechatPayConfig> {
  const settings = await getSystemSettings();
  return {
    appId: settings.wxMpAppId,
    mchId: settings.wxPayMchId,
    apiV3Key: settings.wxPayApiV3Key,
    serialNo: settings.wxPaySerialNo,
    privateKey: settings.wxPayPrivateKey,
  };
}

export async function getWechatPayInstance(): Promise<WechatPay> {
  if (wechatPayInstance) {
    return wechatPayInstance;
  }

  const config = await getWechatPayConfig();
  
  if (!config.mchId || !config.privateKey || !config.apiV3Key) {
    throw new Error('微信支付配置未完成');
  }

  wechatPayInstance = new WechatPay({
    appid: config.appId,
    mchid: config.mchId,
    publicKey: Buffer.from(''),
    privateKey: Buffer.from(config.privateKey),
    key: config.apiV3Key,
    serial_no: config.serialNo,
  });

  return wechatPayInstance;
}

function generatePaySign(privateKey: string, appId: string, timeStamp: string, nonceStr: string, packageStr: string): string {
  const signString = `${appId}\n${timeStamp}\n${nonceStr}\n${packageStr}\n`;
  
  const sign = crypto.createSign('RSA-SHA256');
  sign.update(signString);
  const signature = sign.sign(privateKey, 'base64');
  
  return signature;
}

export async function createMiniPayment(params: CreatePaymentParams): Promise<PaymentResult> {
  const pay = await getWechatPayInstance();
  const config = await getWechatPayConfig();

  if (!params.openid) {
    throw new Error('微信小程序支付需要openid');
  }

  const notifyUrl = params.notifyUrl || process.env.WX_PAY_NOTIFY_URL || '';

  const result = await pay.transactions_jsapi({
    description: params.description,
    out_trade_no: params.outTradeNo,
    notify_url: notifyUrl,
    amount: {
      total: Math.round(params.amount * 100),
    },
    payer: {
      openid: params.openid!,
    },
  }) as any;

  const prepayId = result.prepay_id;
  
  if (!prepayId) {
    throw new Error('创建支付订单失败');
  }

  const timeStamp = Math.floor(Date.now() / 1000).toString();
  const nonceStr = Math.random().toString(36).substr(2, 15);
  const packageStr = `prepay_id=${prepayId}`;

  const paySign = generatePaySign(config.privateKey, config.appId, timeStamp, nonceStr, packageStr);

  return {
    prepayId,
    paySign,
    timeStamp,
    nonceStr,
    package: packageStr,
    signType: 'RSA',
  };
}

export async function createH5Payment(params: CreatePaymentParams): Promise<{ h5Url: string }> {
  const pay = await getWechatPayInstance();

  const notifyUrl = params.notifyUrl || process.env.WX_PAY_NOTIFY_URL || '';

  const result = await pay.transactions_h5({
    description: params.description,
    out_trade_no: params.outTradeNo,
    notify_url: notifyUrl,
    amount: {
      total: Math.round(params.amount * 100),
    },
    scene_info: {
      payer_client_ip: '127.0.0.1',
      h5_info: {
        type: 'Wap',
        app_name: '产后健康管理系统',
        app_url: process.env.NEXT_PUBLIC_APP_URL || '',
      },
    },
  }) as any;

  if (!result.h5_url) {
    throw new Error('创建H5支付订单失败');
  }

  return { h5Url: result.h5_url };
}

export async function queryOrder(outTradeNo: string): Promise<any> {
  const pay = await getWechatPayInstance();
  
  try {
    const result = await pay.query({
      out_trade_no: outTradeNo,
    });
    return result;
  } catch (error) {
    console.error('查询订单失败:', error);
    throw error;
  }
}

export async function verifyPayNotify(signature: string, timestamp: string, nonce: string, serial: string, body: string): Promise<boolean> {
  const pay = await getWechatPayInstance();
  
  try {
    return await pay.verifySign({
      signature,
      timestamp,
      nonce,
      serial,
      body,
    });
  } catch (error) {
    console.error('验证签名失败:', error);
    return false;
  }
}

export function generateOutTradeNo(): string {
  const timestamp = Date.now().toString().slice(-10);
  const random = Math.random().toString(36).substr(2, 6).toUpperCase();
  return `ANYI${timestamp}${random}`;
}

export async function decryptNotifyResource(resource: any): Promise<any> {
  const pay = await getWechatPayInstance();
  
  const { ciphertext, associated_data, nonce } = resource;
  
  try {
    return pay.decipher_gcm(ciphertext, associated_data, nonce);
  } catch (error) {
    console.error('解密失败:', error);
    throw new Error('解密失败');
  }
}