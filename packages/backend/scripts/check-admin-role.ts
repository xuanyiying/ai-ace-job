import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkAdminRole() {
  try {
    // 查找所有 ADMIN 角色的用户
    const adminUsers = await prisma.user.findMany({
      where: {
        role: 'ADMIN',
      },
      select: {
        id: true,
        email: true,
        role: true,
        username: true,
      },
    });

    console.log('🔍 [DATABASE CHECK] Admin users found:', adminUsers.length);
    
    adminUsers.forEach((user, index) => {
      console.log(`\n🔍 [DATABASE CHECK] Admin User ${index + 1}:`, {
        id: user.id,
        email: user.email,
        role: user.role,
        roleType: typeof user.role,
        username: user.username,
      });
    });

    // 也查找所有用户，看看是否有其他角色值
    const allUsers = await prisma.user.findMany({
      select: {
        id: true,
        email: true,
        role: true,
      },
    });

    console.log('\n🔍 [DATABASE CHECK] All users roles:');
    const roleCount: Record<string, number> = {};
    allUsers.forEach((user) => {
      roleCount[user.role] = (roleCount[user.role] || 0) + 1;
    });
    console.log(roleCount);

  } catch (error) {
    console.error('❌ Error checking admin role:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkAdminRole();
