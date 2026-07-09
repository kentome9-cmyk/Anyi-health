import dotenv from 'dotenv';
dotenv.config();

import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();
const SALT_ROUNDS = 10;

async function main() {
  console.log('Starting to seed test data...');
  
  let store = await prisma.store.findFirst({ take: 1 });
  if (!store) {
    console.log('No store found, creating one...');
    store = await prisma.store.create({
      data: {
        storeName: '测试门店',
        contactPhone: '13800000000',
        address: '测试地址',
        description: '测试门店描述',
      },
    });
  }
  
  console.log('Store ID:', store.id);
  
  const existingStoreUser = await prisma.storeUser.findUnique({ where: { phone: '13800138000' } });
  
  if (!existingStoreUser) {
    console.log('Creating test store user...');
    const hashedPassword = await bcrypt.hash('123456', SALT_ROUNDS);
    const storeUser = await prisma.storeUser.create({
      data: {
        phone: '13800138000',
        password: hashedPassword,
        name: '左淑林',
        permissions: JSON.stringify(['customer_manage', 'ai_analysis', 'menstrual_chat', 'short_video', 'learning_center', 'profile']),
      },
    });
    
    await prisma.store.update({
      where: { id: store.id },
      data: { storeUserId: storeUser.id },
    });
    
    console.log('Store user created and linked to store');
  } else {
    console.log('Store user already exists:', existingStoreUser.name);
    if (!store.storeUserId) {
      await prisma.store.update({
        where: { id: store.id },
        data: { storeUserId: existingStoreUser.id },
      });
      console.log('Linked existing store user to store');
    }
  }
  
  const existingCustomer = await prisma.customer.findFirst({ where: { phone: '13800138001' } });
  let customer;
  
  if (!existingCustomer) {
    console.log('Creating test customer...');
    customer = await prisma.customer.create({
      data: {
        storeId: store.id,
        name: '张女士',
        phone: '13800138001',
        age: 28,
        deliveryMethod: 'natural',
        birthOrder: 1,
        postpartumDays: 45,
        height: 165,
        weight: 62,
      },
    });
  } else {
    customer = existingCustomer;
    console.log('Customer already exists:', customer.name);
  }
  
  const existingPlan = await prisma.plan.findFirst({ where: { customerId: customer.id } });
  
  if (!existingPlan) {
    console.log('Creating test plan...');
    await prisma.plan.create({
      data: {
        storeId: store.id,
        customerId: customer.id,
        status: 'active',
        version: 1,
        isLatest: true,
        rawContent: '产后恢复方案：盆底肌修复+腹直肌修复',
        structuredContent: JSON.stringify({
          title: '产后45天恢复方案',
          items: ['盆底肌修复', '腹直肌修复', '子宫复旧'],
        }),
        coreProjects: JSON.stringify(['盆底肌修复', '腹直肌修复']),
        assistantProjects: JSON.stringify(['子宫复旧']),
        actualCounts: JSON.stringify({
          'core_盆底肌修复': '6',
          'core_腹直肌修复': '4',
          'assistant_子宫复旧': '2',
        }),
      },
    });
    console.log('Test plan created successfully');
  } else {
    console.log('Plan already exists for customer:', customer.name);
  }
  
  console.log('Seeding completed!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
