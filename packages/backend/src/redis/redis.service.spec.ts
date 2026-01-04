import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { RedisService } from './redis.service';
import Redis from 'ioredis';

// Mock ioredis
jest.mock('ioredis', () => {
  return jest.fn().mockImplementation(() => {
    return {
      on: jest.fn(),
      get: jest.fn(),
      set: jest.fn(),
      setex: jest.fn(),
      del: jest.fn(),
      exists: jest.fn(),
      expire: jest.fn(),
      ttl: jest.fn(),
      incr: jest.fn(),
      decr: jest.fn(),
      quit: jest.fn().mockResolvedValue('OK'),
    };
  });
});

describe('RedisService', () => {
  let service: RedisService;
  let configService: ConfigService;
  let redisClientMock: any;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RedisService,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string, defaultValue?: any) => {
              const configs: Record<string, any> = {
                REDIS_HOST: 'localhost',
                REDIS_PORT: 6379,
                REDIS_PASSWORD: 'test-password',
              };
              return configs[key] || defaultValue;
            }),
          },
        },
      ],
    }).compile();

    service = module.get<RedisService>(RedisService);
    configService = module.get<ConfigService>(ConfigService);
    
    // Initialize the service which creates the redis client
    await service.onModuleInit();
    redisClientMock = (service as any).client;
  });

  afterEach(async () => {
    await service.onModuleDestroy();
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('Connection and Initialization', () => {
    it('should initialize Redis client with config values', async () => {
      expect(Redis).toHaveBeenCalledWith(expect.objectContaining({
        host: 'localhost',
        port: 6379,
        password: 'test-password',
      }));
    });

    it('should use retryStrategy to calculate delay', async () => {
      const retryStrategy = (Redis as any).mock.calls[0][0].retryStrategy;
      expect(retryStrategy(1)).toBe(50);
      expect(retryStrategy(10)).toBe(500);
      expect(retryStrategy(100)).toBe(2000); // Max delay
    });

    it('should return client via getClient', () => {
      expect(service.getClient()).toBe(redisClientMock);
    });

    it('should register connection event listeners', () => {
      expect(redisClientMock.on).toHaveBeenCalledWith('connect', expect.any(Function));
      expect(redisClientMock.on).toHaveBeenCalledWith('error', expect.any(Function));
    });

    it('should handle connection success log', () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
      const connectHandler = redisClientMock.on.mock.calls.find((call: any) => call[0] === 'connect')[1];
      connectHandler();
      expect(consoleSpy).toHaveBeenCalledWith('Redis connected successfully');
      consoleSpy.mockRestore();
    });

    it('should handle connection error log', () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      const errorHandler = redisClientMock.on.mock.calls.find((call: any) => call[0] === 'error')[1];
      const testError = new Error('Connection failed');
      errorHandler(testError);
      expect(consoleSpy).toHaveBeenCalledWith('Redis connection error:', testError);
      consoleSpy.mockRestore();
    });
  });

  describe('Basic Operations', () => {
    it('should perform GET operation', async () => {
      const key = 'test-key';
      const value = 'test-value';
      redisClientMock.get.mockResolvedValue(value);

      const start = performance.now();
      const result = await service.get(key);
      const end = performance.now();

      expect(redisClientMock.get).toHaveBeenCalledWith(key);
      expect(result).toBe(value);
      console.log(`⏱️ [BENCHMARK] GET operation took ${(end - start).toFixed(4)}ms`);
    });

    it('should perform SET operation without TTL', async () => {
      const key = 'test-key';
      const value = 'test-value';
      redisClientMock.set.mockResolvedValue('OK');

      const start = performance.now();
      await service.set(key, value);
      const end = performance.now();

      expect(redisClientMock.set).toHaveBeenCalledWith(key, value);
      console.log(`⏱️ [BENCHMARK] SET operation took ${(end - start).toFixed(4)}ms`);
    });

    it('should perform SET operation with TTL (setex)', async () => {
      const key = 'test-key';
      const value = 'test-value';
      const ttl = 60;
      redisClientMock.setex.mockResolvedValue('OK');

      await service.set(key, value, ttl);

      expect(redisClientMock.setex).toHaveBeenCalledWith(key, ttl, value);
    });

    it('should perform DEL operation', async () => {
      const key = 'test-key';
      redisClientMock.del.mockResolvedValue(1);

      await service.del(key);

      expect(redisClientMock.del).toHaveBeenCalledWith(key);
    });

    it('should check if key exists', async () => {
      const key = 'test-key';
      redisClientMock.exists.mockResolvedValue(1);

      const result = await service.exists(key);

      expect(redisClientMock.exists).toHaveBeenCalledWith(key);
      expect(result).toBe(true);
    });

    it('should return false if key does not exist', async () => {
      const key = 'missing-key';
      redisClientMock.exists.mockResolvedValue(0);

      const result = await service.exists(key);

      expect(result).toBe(false);
    });
  });

  describe('Advanced Operations', () => {
    it('should set EXPIRE on a key', async () => {
      const key = 'test-key';
      const seconds = 10;
      redisClientMock.expire.mockResolvedValue(1);

      await service.expire(key, seconds);

      expect(redisClientMock.expire).toHaveBeenCalledWith(key, seconds);
    });

    it('should get TTL of a key', async () => {
      const key = 'test-key';
      const ttlValue = 100;
      redisClientMock.ttl.mockResolvedValue(ttlValue);

      const result = await service.ttl(key);

      expect(redisClientMock.ttl).toHaveBeenCalledWith(key);
      expect(result).toBe(ttlValue);
    });

    it('should increment a key', async () => {
      const key = 'counter';
      redisClientMock.incr.mockResolvedValue(1);

      const result = await service.incr(key);

      expect(redisClientMock.incr).toHaveBeenCalledWith(key);
      expect(result).toBe(1);
    });

    it('should decrement a key', async () => {
      const key = 'counter';
      redisClientMock.decr.mockResolvedValue(0);

      const result = await service.decr(key);

      expect(redisClientMock.decr).toHaveBeenCalledWith(key);
      expect(result).toBe(0);
    });
  });

  describe('Error Handling and Edge Cases', () => {
    it('should handle GET operation errors', async () => {
      const key = 'error-key';
      const testError = new Error('Redis error');
      redisClientMock.get.mockRejectedValue(testError);

      await expect(service.get(key)).rejects.toThrow('Redis error');
    });

    it('should handle connection timeout simulated via error event', () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      const errorHandler = redisClientMock.on.mock.calls.find((call: any) => call[0] === 'error')[1];
      
      const timeoutError: any = new Error('Connection timeout');
      timeoutError.code = 'ETIMEDOUT';
      
      errorHandler(timeoutError);
      
      expect(consoleSpy).toHaveBeenCalledWith('Redis connection error:', expect.objectContaining({
        code: 'ETIMEDOUT'
      }));
      consoleSpy.mockRestore();
    });

    it('should handle authentication failure simulated via error event', () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      const errorHandler = redisClientMock.on.mock.calls.find((call: any) => call[0] === 'error')[1];
      
      const authError: any = new Error('WRONGPASS invalid password');
      
      errorHandler(authError);
      
      expect(consoleSpy).toHaveBeenCalledWith('Redis connection error:', expect.objectContaining({
        message: expect.stringContaining('WRONGPASS')
      }));
      consoleSpy.mockRestore();
    });
  });

  describe('Performance Benchmarks', () => {
    it('should measure connection establishment time', async () => {
      const start = performance.now();
      await service.onModuleInit();
      const end = performance.now();
      
      console.log(`⏱️ [BENCHMARK] Redis client initialization took ${(end - start).toFixed(4)}ms`);
      expect(end - start).toBeLessThan(100); // Should be very fast for mock
    });
  });
});
