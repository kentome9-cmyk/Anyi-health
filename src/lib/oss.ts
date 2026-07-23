import OSS from 'ali-oss';
import { getSystemSettings } from './system-settings';

let ossClient: OSS | null = null;
let cachedCdnDomain: string = '';

export async function getOssClient(): Promise<OSS | null> {
  if (ossClient) {
    console.log('[OSS] Reusing existing client');
    return ossClient;
  }

  console.log('[OSS] Creating new client...');

  const settings = await getSystemSettings();
  const { ossRegion, ossBucket, ossEndpoint, ossCdnDomain, ossAccessKeyId, ossAccessKeySecret } = settings;

  console.log('[OSS] Settings:', { 
    ossRegion: ossRegion ? '***' : 'empty', 
    ossBucket: ossBucket ? '***' : 'empty', 
    ossEndpoint: ossEndpoint ? '***' : 'empty', 
    ossAccessKeyId: ossAccessKeyId ? '***' : 'empty', 
    ossAccessKeySecret: ossAccessKeySecret ? '***' : 'empty' 
  });

  if (!ossRegion || !ossBucket || !ossAccessKeyId || !ossAccessKeySecret) {
    console.error('[OSS] Configuration missing:', { ossRegion, ossBucket, ossEndpoint, ossAccessKeyId, ossAccessKeySecret });
    return null;
  }

  cachedCdnDomain = ossCdnDomain || '';

  try {
    // 不手动设置endpoint，让SDK根据region自动生成正确的URL格式
    // SDK会自动使用虚拟主机模式：bucket.oss-${region}.aliyuncs.com
    // 如果用户自定义了endpoint（如内网地址），则使用用户配置
    const endpoint = ossEndpoint || undefined;

    console.log('[OSS] Creating client with:', { region: ossRegion, bucket: ossBucket, endpoint });

    const client = new OSS({
      region: ossRegion,
      bucket: ossBucket,
      endpoint: endpoint,
      accessKeyId: ossAccessKeyId,
      accessKeySecret: ossAccessKeySecret,
      secure: true,
      timeout: 300000,
    });

    ossClient = client;
    return client;
  } catch (error) {
    console.error('[OSS] Failed to create client:', error);
    ossClient = null;
    return null;
  }
}

export function getCdnDomain(): string {
  return cachedCdnDomain;
}

export async function uploadToOss(buffer: Buffer, fileName: string, folder: string = 'anyiai'): Promise<string | null> {
  const client = await getOssClient();
  if (!client) {
    console.warn('[OSS] uploadToOss: client is null, falling back to local storage');
    return null;
  }

  const objectKey = `${folder}/${fileName}`;

  try {
    console.log('[OSS] uploading:', objectKey);
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
      console.log('[OSS] upload success:', url);
      return url;
    }
    console.error('[OSS] upload failed:', result.res.status);
    return null;
  } catch (error) {
    console.error('[OSS] upload error:', error);
    return null;
  }
}

export async function getPresignedUrl(fileName: string, folder: string = 'anyiai'): Promise<{ url: string; objectKey: string; cdnUrl: string } | null> {
  const client = await getOssClient();
  if (!client) {
    return null;
  }

  const objectKey = `${folder}/${fileName}`;

  try {
    // 使用SDK的signatureUrl方法，确保签名格式正确
    // 关键：SDK会根据endpoint自动选择虚拟主机或路径模式
    const url = client.signatureUrl(objectKey, {
      expires: 3600,
      method: 'PUT',
    });

    console.log('[OSS] Generated presigned URL:', url);

    let cdnUrl = url;
    const cdnDomain = getCdnDomain();
    if (cdnDomain) {
      try {
        const parsed = new URL(url);
        cdnUrl = `${parsed.protocol}//${cdnDomain}${parsed.pathname}`;
      } catch {
      }
    }

    return { url, objectKey, cdnUrl };
  } catch (error) {
    console.error('[OSS] getPresignedUrl error:', error);
    return null;
  }
}

export async function testOssConnection(): Promise<{ success: boolean; message: string }> {
  const client = await getOssClient();
  if (!client) {
    return { success: false, message: 'OSS配置不完整，请检查地域、Bucket、AccessKey ID和AccessKey Secret' };
  }

  try {
    const testKey = `test/connection-${Date.now()}.txt`;
    const result = await client.put(testKey, Buffer.from('test connection'));
    if (result.res.status === 200) {
      await client.delete(testKey).catch(() => {});
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