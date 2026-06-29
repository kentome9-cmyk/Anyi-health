const isProduction = process.env.NODE_ENV === 'production';

export function logError(message: string, error?: unknown): void {
  const safeError = error instanceof Error ? error.message : String(error);
  console.error(`[ERROR] ${message}:`, safeError);
}

export function logWarn(message: string): void {
  console.warn(`[WARN] ${message}`);
}

export function logInfo(message: string): void {
  if (!isProduction) {
    console.log(`[INFO] ${message}`);
  }
}

export function logDebug(message: string): void {
  if (!isProduction) {
    console.log(`[DEBUG] ${message}`);
  }
}

export function sanitizeObject(obj: any): any {
  if (typeof obj !== 'object' || obj === null) {
    return obj;
  }
  
  const sanitized: Record<string, any> = {};
  const sensitiveKeys = ['password', 'token', 'secret', 'apikey', 'apiKey', 'auth', 'authorization'];
  
  for (const key of Object.keys(obj)) {
    const lowerKey = key.toLowerCase();
    if (sensitiveKeys.some(sk => lowerKey.includes(sk))) {
      sanitized[key] = '***REDACTED***';
    } else if (typeof obj[key] === 'object') {
      sanitized[key] = sanitizeObject(obj[key]);
    } else {
      sanitized[key] = obj[key];
    }
  }
  
  return sanitized;
}