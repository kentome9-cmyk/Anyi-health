import OSS from 'ali-oss';
import { getSystemSettings } from './system-settings';

let ossClient: OSS | null = null;

export async function getOssClient(): Promise<OSS | null> {
  if (ossClient) return ossClient;

  const settings = await getSystemSettings();
  const { ossRegion, ossBucket, ossEndpoint, ossAccessKeyId, ossAccessKeySecret } = settings;

  if (!ossRegion || !ossBucket || !ossAccessKeyId || !ossAccessKeySecret) {
    return null;
  }

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

export async function uploadToOss(buffer: Buffer, fileName: string, folder: string = 'anyiai'): Promise<string | null> {
  const client = await getOssClient();
  if (!client) return null;

  const objectKey = `${folder}/${fileName}`;

  try {
    const result = await client.put(objectKey, buffer);
    if (result.res.status === 200) {
      return result.url;
    }
    return null;
  } catch {
    return null;
  }
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