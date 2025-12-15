import { PrismaClient, Role, SubscriptionTier } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

export async function seedAdmin(prisma: PrismaClient) {
  const adminEmail = 'admin@acejob.tech';
  const adminPassword = 'tech.2025'; // In production, use a strong password
  const hashedPassword = await bcrypt.hash(adminPassword, 10);

  const existingAdmin = await prisma.user.findUnique({
    where: { email: adminEmail },
  });

  if (existingAdmin) {
    console.log('Admin user already exists, updating role...');
    await prisma.user.update({
      where: { email: adminEmail },
      data: {
        role: Role.ADMIN,
        passwordHash: hashedPassword, // Reset password to ensure we can login
      },
    });
    console.log('Admin user updated.');
  } else {
    console.log('Creating admin user...');
    await prisma.user.create({
      data: {
        email: adminEmail,
        passwordHash: hashedPassword,
        username: 'System Admin',
        role: Role.ADMIN,
        subscriptionTier: SubscriptionTier.ENTERPRISE,
        emailVerified: true,
        isActive: true,
      },
    });
    console.log('Admin user created.');
  }

  console.log(`
    Admin Credentials:
    Email: ${adminEmail}
    Password: ${adminPassword}
  `);
}
