export function validateString(value: unknown, minLength: number = 0, maxLength: number = 5000): boolean {
  if (typeof value !== 'string') return false;
  return value.length >= minLength && value.length <= maxLength;
}

export function validateId(value: unknown): boolean {
  if (typeof value !== 'string') return false;
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
}

export function validatePhone(value: unknown): boolean {
  if (typeof value !== 'string') return false;
  return /^1[3-9]\d{9}$/.test(value);
}

export function validateEmail(value: unknown): boolean {
  if (typeof value !== 'string') return false;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

export function validateArray<T>(value: unknown, minLength: number = 0, maxLength: number = 100): value is T[] {
  if (!Array.isArray(value)) return false;
  return value.length >= minLength && value.length <= maxLength;
}

export function validateMessageArray(messages: unknown): boolean {
  if (!validateArray(messages, 1, 50)) return false;
  return (messages as any[]).every(msg => 
    typeof msg === 'object' && 
    msg !== null && 
    typeof msg.role === 'string' && 
    typeof msg.content === 'string' && 
    msg.content.length <= 5000
  );
}