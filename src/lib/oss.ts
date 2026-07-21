import OSS from 'ali-oss';
import { getSystemSettings } from './system-settings';

let ossClient: OSS | null = null;
let cachedCdnDomain: string = '';

export async function getOssClient(): Promise<OSS | null> {
  if (ossClient) return ossClient;

  const settings = await getSystemSettings();
  const { ossRegion, ossBucket, ossEndpoint, ossCdnDomain, ossAccessKeyId, ossAccessKeySecret } = settings;

  if (!ossRegion || !ossBucket || !ossAccessKeyId || !ossAccessKeySecret) {
    return null;
  }

  cachedCdnDomain = ossCdnDomain || '';

  try {
    ossClient = new OSS({
      region: ossRegion,
      bucket: ossBucket,
      endpoint: ossEndpoint || undefined,
      accessKeyId: ossAccessKeyId,
      accessKeySecret: ossAccessKeySecret,
      secure: true,
    });
    return ossClient;
  } catch {
    return null;
  }
}

export function getCdnDomain(): string {
  return cachedCdnDomain;
}

export async function uploadToOss(buffer: Buffer, fileName: string, folder: string = 'anyiai'): Promise<string | null> {
  const client = await getOssClient();
  if (!client) return null;

  const objectKey = `${folder}/${fileName}`;

  try {
    const result = await client.put(objectKey, buffer);
    if (result.res.status === 200) {
      let url = result.url;
      const cdnDomain = getCdnDomain();
      if (cdnDomain) {
        try {
          const parsed = new URL(url);
          url = `${parsed.protocol}//${cdnDomain}${parsed.pathname}`;
        } catch {
        }
      }
      return url;
    }
    return null;
  } catch {
    return null;
  }
}

export async function testOssConnection(): Promise<{ success: boolean; message: string }> {
  const client = await getOssClient();
  if (!client) {
    return { success: false, message: 'OSS配置不完整，请检查地域、Bucket、AccessKey ID和AccessKey Secret' };
  }

  try {
    const result = await client.list({ 'max-keys': 1 }, {});
    if (result.res.status === 200) {
      const cdnDomain = getCdnDomain();
      if (cdnDomain) {
        return { success: true, message: `OSS连接成功！已配置CDN域名: ${cdnDomain}` };
      }
      return { success: true, message: 'OSS连接成功！' };
    }
    return { success: false, message: `OSS连接失败，状态码: ${result.res.status}` };
  } catch (error) {
    const err = error as Error;
    return { success: false, message: `OSS连接失败: ${err.message}` };
  }
}

export function resetOssClient(): void {
  ossClient = null;
  cachedCdnDomain = '';
}

export async function deleteFromOss(objectKey: string): Promise<boolean> {
  const client = await getOssClient();
  if (!client) return false;

  try {
    await client.delete(objectKey);
    return true;
  } catch {
    return false;
  }
}

export function getObjectKeyFromUrl(url: string): string | null {
  try {
    const parsed = new URL(url);
    const path = parsed.pathname;
    if (path.startsWith('/')) {
      return path.slice(1);
    }
    return path;
  } catch {
    return null;
  }
}

export function isOssUrl(url: string): boolean {
  return url.startsWith('https://') || url.startsWith('http://');
}