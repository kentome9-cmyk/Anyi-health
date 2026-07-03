import { getSystemSettings } from './system-settings';

export interface WechatLoginResult {
  openid: string;
  session_key: string;
  unionid?: string;
  errcode?: number;
  errmsg?: string;
}

export interface WechatUserInfo {
  openid: string;
  nickname?: string;
  avatarUrl?: string;
  unionid?: string;
}

export async function getWechatMpConfig() {
  const settings = await getSystemSettings();
  return {
    appId: settings.wxMpAppId,
    appSecret: settings.wxMpAppSecret,
  };
}

export async function jscode2session(code: string): Promise<WechatLoginResult> {
  const { appId, appSecret } = await getWechatMpConfig();
  
  if (!appId || !appSecret) {
    throw new Error('微信小程序配置未完成');
  }

  const url = `https://api.weixin.qq.com/sns/jscode2session?appid=${appId}&secret=${appSecret}&js_code=${code}&grant_type=authorization_code`;
  
  const response = await fetch(url, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
    },
  });

  const result = await response.json() as WechatLoginResult;

  if (result.errcode && result.errcode !== 0) {
    throw new Error(`微信登录失败: ${result.errmsg || '未知错误'}`);
  }

  return result;
}

export async function getUserInfoByOpenid(openid: string): Promise<WechatUserInfo | null> {
  const { appId, appSecret } = await getWechatMpConfig();
  
  if (!appId || !appSecret) {
    throw new Error('微信小程序配置未完成');
  }

  const url = `https://api.weixin.qq.com/cgi-bin/token?grant_type=client_credential&appid=${appId}&secret=${appSecret}`;
  
  const tokenResponse = await fetch(url, {
    method: 'GET',
  });
  
  const tokenResult = await tokenResponse.json();
  
  if (tokenResult.errcode && tokenResult.errcode !== 0) {
    throw new Error(`获取access_token失败: ${tokenResult.errmsg || '未知错误'}`);
  }

  const accessToken = tokenResult.access_token;
  
  const userUrl = `https://api.weixin.qq.com/cgi-bin/user/info?access_token=${accessToken}&openid=${openid}&lang=zh_CN`;
  
  const userResponse = await fetch(userUrl, {
    method: 'GET',
  });
  
  const userResult = await userResponse.json();
  
  if (userResult.errcode && userResult.errcode !== 0) {
    return null;
  }

  return {
    openid: userResult.openid,
    nickname: userResult.nickname,
    avatarUrl: userResult.headimgurl,
    unionid: userResult.unionid,
  };
}