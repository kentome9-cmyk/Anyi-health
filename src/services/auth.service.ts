import bcrypt from 'bcryptjs';
import { prisma } from '@/lib/prisma';

const SALT_ROUNDS = 10;

// 密码加密
export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, SALT_ROUNDS);
}

// 密码验证
export async function verifyPassword(
  password: string,
  hashedPassword: string
): Promise<boolean> {
  return bcrypt.compare(password, hashedPassword);
}

// ============================================
// Admin 认证
// ============================================

export async function validateAdmin(
  username: string,
  password: string
): Promise<{ id: string; username: string; name: string | null } | null> {
  const admin = await prisma.admin.findUnique({
    where: { username },
  });

  if (!admin) return null;

  const isValid = await verifyPassword(password, admin.password);
  if (!isValid) return null;

  return {
    id: admin.id,
    username: admin.username,
    name: admin.name,
  };
}

export async function createAdmin(
  username: string,
  password: string,
  name?: string
) {
  const hashedPassword = await hashPassword(password);
  return prisma.admin.create({
    data: { username, password: hashedPassword, name },
  });
}

// ============================================
// StoreUser 认证
// ============================================

export async function validateStoreUser(
  phone: string,
  password: string
): Promise<{ id: string; phone: string; name: string | null; storeId: string | null; permissions: string[] | null } | null> {
  const user = await prisma.storeUser.findUnique({
    where: { phone },
    include: { stores: { select: { id: true }, take: 1 } },
  });

  if (!user) return null;
  if (!user.status) return null;

  const isValid = await verifyPassword(password, user.password);
  if (!isValid) return null;

  let permissions: string[] | null = null;
  if (user.permissions) {
    try {
      permissions = JSON.parse(user.permissions);
    } catch {
      permissions = null;
    }
  }

  return {
    id: user.id,
    phone: user.phone,
    name: user.name,
    storeId: user.stores[0]?.id ?? null,
    permissions,
  };
}

export async function createStoreUser(
  phone: string,
  password: string,
  name?: string
) {
  const hashedPassword = await hashPassword(password);
  return prisma.storeUser.create({
    data: { phone, password: hashedPassword, name },
  });
}

// ============================================
// Customer 认证
// ============================================

export async function validateCustomer(
  phone: string,
  password: string
): Promise<{ id: string; phone: string; name: string; storeId: string } | null> {
  const customer = await prisma.customer.findFirst({
    where: { phone },
  });

  if (!customer || !customer.password) return null;

  const isValid = await verifyPassword(password, customer.password);
  if (!isValid) return null;

  return {
    id: customer.id,
    phone: customer.phone,
    name: customer.name,
    storeId: customer.storeId,
  };
}

export async function createCustomer(
  phone: string,
  name: string,
  storeId: string,
  password?: string
) {
  const hashedPassword = password ? await hashPassword(password) : null;
  return prisma.customer.create({
    data: {
      phone,
      name,
      storeId,
      password: hashedPassword,
    },
  });
}
