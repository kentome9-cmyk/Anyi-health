import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

function generateRandomPassword(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
  let password = '';
  for (let i = 0; i < 12; i++) {
    password += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return password;
}

async function main() {
  const adminExists = await prisma.admin.findUnique({
    where: { username: 'admin' },
  });

  if (adminExists) {
    console.log('Admin already exists, skipping creation');
    return;
  }

  const password = generateRandomPassword();
  const hashedPassword = await bcrypt.hash(password, 10);
  
  const admin = await prisma.admin.create({
    data: {
      username: 'admin',
      password: hashedPassword,
    },
  });

  console.log(`Admin created: ${admin.username}`);
  console.log(`Password: ${password}`);
  console.log('Please save this password securely, it will not be shown again.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
