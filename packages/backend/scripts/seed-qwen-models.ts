#!/usr/bin/env ts-node
/**
 * Model Configuration Seed Script
 * Adds models from the provided screenshot to the database.
 * Supports SiliconCloud, Qwen (DashScope), and Ollama.
 *
 * Usage:
 *   export QWEN_API_KEY=your_dashscope_api_key
 *   export SILICON_CLOUD_API_KEY=your_silicon_cloud_api_key
 *   export ENCRYPTION_KEY=your_encryption_key_from_env
 *   npx ts-node packages/backend/scripts/seed-qwen-models.ts
 */

import { PrismaClient } from '@prisma/client';
import * as crypto from 'crypto';

const prisma = new PrismaClient();
const ENCRYPTION_KEY =
  process.env.ENCRYPTION_KEY || 'default-encryption-key-change-in-production';
const QWEN_API_KEY = process.env.QWEN_API_KEY;
const SILICON_CLOUD_API_KEY = process.env.SILICON_CLOUD_API_KEY;

function encrypt(text: string): string {
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv(
    'aes-256-gcm',
    Buffer.from(ENCRYPTION_KEY.padEnd(32, '0').slice(0, 32)),
    iv
  );

  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');

  const authTag = cipher.getAuthTag();
  return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`;
}

const MODELS = [
  // SiliconCloud Series
  {
    name: 'deepseek-ai/DeepSeek-R1-0528-Qwen3-8B',
    provider: 'siliconcloud',
    endpoint: 'https://api.siliconflow.cn/v1',
    apiKey: SILICON_CLOUD_API_KEY,
    defaultTemperature: 0.7,
    defaultMaxTokens: 4000,
    costPerInputToken: 0.00002,
    costPerOutputToken: 0.00004,
  },
  // Qwen (DashScope) Series
  {
    name: 'qwen3-max-preview',
    provider: 'qwen',
    endpoint: 'https://dashscope.aliyuncs.com/compatible-mode/v1',
    apiKey: QWEN_API_KEY,
    defaultTemperature: 0.7,
    defaultMaxTokens: 4000,
    costPerInputToken: 0.00004,
    costPerOutputToken: 0.0001,
  },
  {
    name: 'qwen-turbo',
    provider: 'qwen',
    endpoint: 'https://dashscope.aliyuncs.com/compatible-mode/v1',
    apiKey: QWEN_API_KEY,
    defaultTemperature: 0.7,
    defaultMaxTokens: 32768,
    costPerInputToken: 0.00001,
    costPerOutputToken: 0.00002,
  },
  {
    name: 'text-embedding-v3',
    provider: 'qwen',
    endpoint: 'https://dashscope.aliyuncs.com/compatible-mode/v1',
    apiKey: QWEN_API_KEY,
    defaultTemperature: 0,
    defaultMaxTokens: 8192,
    costPerInputToken: 0.00001,
    costPerOutputToken: 0,
  },
  {
    name: 'qwen3-coder-flash',
    provider: 'qwen',
    endpoint: 'https://dashscope.aliyuncs.com/compatible-mode/v1',
    apiKey: QWEN_API_KEY,
    defaultTemperature: 0.1,
    defaultMaxTokens: 4000,
    costPerInputToken: 0.00001,
    costPerOutputToken: 0.00002,
  },
  {
    name: 'deepseek-v3.2',
    provider: 'qwen',
    endpoint: 'https://dashscope.aliyuncs.com/compatible-mode/v1',
    apiKey: QWEN_API_KEY,
    defaultTemperature: 0.7,
    defaultMaxTokens: 4000,
    costPerInputToken: 0.00002,
    costPerOutputToken: 0.00004,
  },
  {
    name: 'kimi-k2-thinking',
    provider: 'qwen',
    endpoint: 'https://dashscope.aliyuncs.com/compatible-mode/v1',
    apiKey: QWEN_API_KEY,
    defaultTemperature: 0.7,
    defaultMaxTokens: 8000,
    costPerInputToken: 0.00004,
    costPerOutputToken: 0.0001,
  },
  {
    name: 'Moonshot-Kimi-K2-Instruct',
    provider: 'qwen',
    endpoint: 'https://dashscope.aliyuncs.com/compatible-mode/v1',
    apiKey: QWEN_API_KEY,
    defaultTemperature: 0.7,
    defaultMaxTokens: 8000,
    costPerInputToken: 0.00004,
    costPerOutputToken: 0.0001,
  },
  {
    name: 'llama-4-maverick-17b-128e-instruct',
    provider: 'qwen',
    endpoint: 'https://dashscope.aliyuncs.com/compatible-mode/v1',
    apiKey: QWEN_API_KEY,
    defaultTemperature: 0.7,
    defaultMaxTokens: 4000,
    costPerInputToken: 0.00002,
    costPerOutputToken: 0.00004,
  },
  {
    name: 'glm-4.7',
    provider: 'qwen',
    endpoint: 'https://dashscope.aliyuncs.com/compatible-mode/v1',
    apiKey: QWEN_API_KEY,
    defaultTemperature: 0.7,
    defaultMaxTokens: 4000,
    costPerInputToken: 0.00002,
    costPerOutputToken: 0.00004,
  },
  // Ollama (Local) Series
  {
    name: 'deepseek-r1:1.5b',
    provider: 'ollama',
    endpoint: 'http://localhost:11434/v1',
    apiKey: 'local',
    defaultTemperature: 0.7,
    defaultMaxTokens: 4000,
    costPerInputToken: 0,
    costPerOutputToken: 0,
  },
];

async function seed() {
  console.log('🚀 Seeding AI model configurations...');

  for (const modelData of MODELS) {
    try {
      if (!modelData.apiKey && modelData.provider !== 'ollama') {
        console.warn(
          `⚠️  Skipping ${modelData.name}: API key not provided for provider ${modelData.provider}`
        );
        continue;
      }

      const encryptedApiKey = encrypt(modelData.apiKey || 'local');
      const { apiKey, ...otherData } = modelData;

      const existing = await prisma.modelConfig.findUnique({
        where: { name: modelData.name },
      });

      if (existing) {
        console.log(`ℹ️  Model ${modelData.name} already exists, updating...`);
        await prisma.modelConfig.update({
          where: { name: modelData.name },
          data: {
            ...otherData,
            apiKey: encryptedApiKey,
            updatedAt: new Date(),
          },
        });
      } else {
        await prisma.modelConfig.create({
          data: {
            ...otherData,
            apiKey: encryptedApiKey,
            rateLimitPerMinute: modelData.provider === 'ollama' ? 0 : 60,
            rateLimitPerDay: modelData.provider === 'ollama' ? 0 : 10000,
            isActive: true,
          },
        });
        console.log(`✅ Created model: ${modelData.name}`);
      }
    } catch (error) {
      console.error(`❌ Error processing model ${modelData.name}:`, error);
    }
  }

  console.log('✨ Seeding complete!');
}

seed()
  .catch((e) => {
    console.error('❌ Seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
