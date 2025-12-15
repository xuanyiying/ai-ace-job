import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { seedAdmin } from './seeds/seed-admin';
import { seedModelConfigs } from './seeds/seed-models';
import { seedPromptsTemplates } from './seeds/seed-prompts';
import { seedKnowledgeBase } from './seeds/seed-knowledge-base';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...');

  // Seed Admin
  await seedAdmin(prisma);

  // Seed Models
  await seedModelConfigs(prisma);

  // Seed Prompts
  await seedPromptsTemplates(prisma);

  // Seed Knowledge Base
  await seedKnowledgeBase(prisma);

  // Create initial resume templates
  const templates = [
    {
      name: '经典模板',
      category: 'classic',
      description: '传统简洁的简历格式，适合各类职位申请',
      previewUrl: '/templates/classic-preview.png',
      isPremium: false,
      isActive: true,
      configuration: {
        defaultFontSize: 11,
        defaultColorTheme: '#000000',
        supportedSections: [
          'personalInfo',
          'summary',
          'experience',
          'education',
          'skills',
          'projects',
          'certifications',
          'languages',
        ],
        customizableOptions: ['fontSize', 'colorTheme', 'margin'],
      },
    },
    {
      name: '现代模板',
      category: 'modern',
      description: '现代化设计，带有色彩点缀，适合创意类职位',
      previewUrl: '/templates/modern-preview.png',
      isPremium: false,
      isActive: true,
      configuration: {
        defaultFontSize: 10,
        defaultColorTheme: '#2563eb',
        supportedSections: [
          'personalInfo',
          'summary',
          'experience',
          'education',
          'skills',
          'projects',
          'certifications',
          'languages',
        ],
        customizableOptions: [
          'fontSize',
          'colorTheme',
          'margin',
          'includePhoto',
        ],
      },
    },
    {
      name: '专业模板',
      category: 'professional',
      description: '专业商务风格，适合高级管理和咨询类职位',
      previewUrl: '/templates/professional-preview.png',
      isPremium: false,
      isActive: true,
      configuration: {
        defaultFontSize: 11,
        defaultColorTheme: '#1e293b',
        supportedSections: [
          'personalInfo',
          'summary',
          'experience',
          'education',
          'skills',
          'projects',
          'certifications',
          'languages',
        ],
        customizableOptions: ['fontSize', 'colorTheme', 'margin'],
      },
    },
  ];

  for (const template of templates) {
    await prisma.template.upsert({
      where: { name: template.name },
      update: template,
      create: template,
    });
    console.log(`Created template: ${template.name}`);
  }

  console.log('✨ Seeding completed successfully!');
}

main()
  .catch((e) => {
    console.error('Error seeding database:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
