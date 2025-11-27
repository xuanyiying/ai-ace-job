import { Test, TestingModule } from '@nestjs/testing';
import {
  BadRequestException,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { JobService } from './job.service';
import { PrismaService } from '../prisma/prisma.service';
import { AIEngine } from '../ai/ai.engine';

describe('JobService', () => {
  let service: JobService;
  let prismaService: PrismaService;
  let aiEngine: AIEngine;

  const mockJob = {
    id: 'job-1',
    userId: 'user-1',
    title: 'Senior Software Engineer',
    company: 'Tech Corp',
    location: 'San Francisco, CA',
    jobType: 'Full-time',
    salaryRange: '$150k - $200k',
    jobDescription: 'We are looking for a senior software engineer...',
    requirements: 'Requirements: 5+ years experience, JavaScript, React',
    parsedRequirements: {
      requiredSkills: ['javascript', 'react'],
      preferredSkills: ['typescript', 'node.js'],
      experienceYears: 5,
      educationLevel: 'bachelor',
      responsibilities: ['Design and implement features', 'Code review'],
      keywords: ['Senior', 'Engineer', 'Tech'],
    },
    sourceUrl: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockJobInput = {
    title: 'Senior Software Engineer',
    company: 'Tech Corp',
    location: 'San Francisco, CA',
    jobType: 'Full-time',
    salaryRange: '$150k - $200k',
    jobDescription: 'We are looking for a senior software engineer...',
    requirements: 'Requirements: 5+ years experience, JavaScript, React',
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        JobService,
        {
          provide: PrismaService,
          useValue: {
            job: {
              create: jest.fn(),
              findUnique: jest.fn(),
              findMany: jest.fn(),
              update: jest.fn(),
              delete: jest.fn(),
            },
          },
        },
        {
          provide: AIEngine,
          useValue: {
            parseJobDescription: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<JobService>(JobService);
    prismaService = module.get<PrismaService>(PrismaService);
    aiEngine = module.get<AIEngine>(AIEngine);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('createJob', () => {
    it('should create a job successfully', async () => {
      (aiEngine.parseJobDescription as jest.Mock).mockResolvedValue(
        mockJob.parsedRequirements
      );
      (prismaService.job.create as jest.Mock).mockResolvedValue(mockJob);

      const result = await service.createJob('user-1', mockJobInput);

      expect(result.id).toBe('job-1');
      expect(result.title).toBe('Senior Software Engineer');
      expect(prismaService.job.create).toHaveBeenCalled();
    });

    it('should throw BadRequestException if title is missing', async () => {
      const invalidInput = { ...mockJobInput, title: '' };

      await expect(service.createJob('user-1', invalidInput)).rejects.toThrow(
        BadRequestException
      );
    });

    it('should throw BadRequestException if company is missing', async () => {
      const invalidInput = { ...mockJobInput, company: '' };

      await expect(service.createJob('user-1', invalidInput)).rejects.toThrow(
        BadRequestException
      );
    });

    it('should throw BadRequestException if jobDescription is missing', async () => {
      const invalidInput = { ...mockJobInput, jobDescription: '' };

      await expect(service.createJob('user-1', invalidInput)).rejects.toThrow(
        BadRequestException
      );
    });

    it('should parse job description when creating job', async () => {
      (aiEngine.parseJobDescription as jest.Mock).mockResolvedValue(
        mockJob.parsedRequirements
      );
      (prismaService.job.create as jest.Mock).mockResolvedValue(mockJob);

      await service.createJob('user-1', mockJobInput);

      expect(aiEngine.parseJobDescription).toHaveBeenCalledWith(
        mockJobInput.jobDescription
      );
    });
  });

  describe('parseJobDescription', () => {
    it('should parse job description successfully', async () => {
      (aiEngine.parseJobDescription as jest.Mock).mockResolvedValue(
        mockJob.parsedRequirements
      );

      const result = await service.parseJobDescription(
        mockJobInput.jobDescription
      );

      expect(result.requiredSkills).toContain('javascript');
      expect(result.experienceYears).toBe(5);
    });

    it('should throw BadRequestException if description is empty', async () => {
      await expect(service.parseJobDescription('')).rejects.toThrow(
        BadRequestException
      );
    });

    it('should throw BadRequestException if description is only whitespace', async () => {
      await expect(service.parseJobDescription('   ')).rejects.toThrow(
        BadRequestException
      );
    });

    it('should extract skills from job description', async () => {
      const description =
        'We need JavaScript, TypeScript, React, and Node.js developers';
      const expectedSkills = ['javascript', 'typescript', 'react', 'node.js'];

      (aiEngine.parseJobDescription as jest.Mock).mockResolvedValue({
        requiredSkills: expectedSkills,
        preferredSkills: [],
        responsibilities: [],
        keywords: [],
      });

      const result = await service.parseJobDescription(description);

      expect(result.requiredSkills).toEqual(expectedSkills);
    });

    it('should extract experience years from job description', async () => {
      const description = 'We require 5+ years of experience';

      (aiEngine.parseJobDescription as jest.Mock).mockResolvedValue({
        requiredSkills: [],
        preferredSkills: [],
        experienceYears: 5,
        responsibilities: [],
        keywords: [],
      });

      const result = await service.parseJobDescription(description);

      expect(result.experienceYears).toBe(5);
    });

    it('should extract education level from job description', async () => {
      const description = 'Bachelor degree required';

      (aiEngine.parseJobDescription as jest.Mock).mockResolvedValue({
        requiredSkills: [],
        preferredSkills: [],
        educationLevel: 'bachelor',
        responsibilities: [],
        keywords: [],
      });

      const result = await service.parseJobDescription(description);

      expect(result.educationLevel).toBe('bachelor');
    });
  });

  describe('fetchJobFromUrl', () => {
    it('should throw BadRequestException if URL is invalid', async () => {
      await expect(service.fetchJobFromUrl('not-a-valid-url')).rejects.toThrow(
        BadRequestException
      );
    });

    it('should throw BadRequestException if URL is empty', async () => {
      await expect(service.fetchJobFromUrl('')).rejects.toThrow(
        BadRequestException
      );
    });

    it('should throw BadRequestException if fetching fails', async () => {
      const axios = require('axios');
      jest.mock('axios');

      await expect(
        service.fetchJobFromUrl('https://example.com/job')
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('getJob', () => {
    it('should get job by ID', async () => {
      (prismaService.job.findUnique as jest.Mock).mockResolvedValue(mockJob);

      const result = await service.getJob('job-1', 'user-1');

      expect(result.id).toBe('job-1');
    });

    it('should throw NotFoundException if job not found', async () => {
      (prismaService.job.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(service.getJob('nonexistent-job', 'user-1')).rejects.toThrow(
        NotFoundException
      );
    });

    it('should throw ForbiddenException if user does not own job', async () => {
      (prismaService.job.findUnique as jest.Mock).mockResolvedValue(mockJob);

      await expect(service.getJob('job-1', 'different-user')).rejects.toThrow(
        ForbiddenException
      );
    });
  });

  describe('listJobs', () => {
    it('should list all jobs for a user', async () => {
      const mockJobs = [mockJob, { ...mockJob, id: 'job-2' }];
      (prismaService.job.findMany as jest.Mock).mockResolvedValue(mockJobs);

      const result = await service.listJobs('user-1');

      expect(result).toHaveLength(2);
      expect(prismaService.job.findMany).toHaveBeenCalledWith({
        where: { userId: 'user-1' },
        orderBy: { createdAt: 'desc' },
      });
    });

    it('should return empty array if user has no jobs', async () => {
      (prismaService.job.findMany as jest.Mock).mockResolvedValue([]);

      const result = await service.listJobs('user-1');

      expect(result).toEqual([]);
    });
  });

  describe('updateJob', () => {
    it('should update job successfully', async () => {
      const updatedData = {
        title: 'Lead Software Engineer',
        jobDescription: 'Updated description',
      };

      (prismaService.job.findUnique as jest.Mock).mockResolvedValue(mockJob);
      (aiEngine.parseJobDescription as jest.Mock).mockResolvedValue(
        mockJob.parsedRequirements
      );
      (prismaService.job.update as jest.Mock).mockResolvedValue({
        ...mockJob,
        ...updatedData,
      });

      const result = await service.updateJob('job-1', 'user-1', updatedData);

      expect(result.title).toBe('Lead Software Engineer');
      expect(prismaService.job.update).toHaveBeenCalled();
    });

    it('should re-parse job description when updated', async () => {
      const updatedData = {
        jobDescription: 'New job description with Python and Django',
      };

      (prismaService.job.findUnique as jest.Mock).mockResolvedValue(mockJob);
      (aiEngine.parseJobDescription as jest.Mock).mockResolvedValue({
        requiredSkills: ['python', 'django'],
        preferredSkills: [],
        responsibilities: [],
        keywords: [],
      });
      (prismaService.job.update as jest.Mock).mockResolvedValue({
        ...mockJob,
        ...updatedData,
      });

      await service.updateJob('job-1', 'user-1', updatedData);

      expect(aiEngine.parseJobDescription).toHaveBeenCalledWith(
        updatedData.jobDescription
      );
    });

    it('should throw ForbiddenException if user does not own job', async () => {
      (prismaService.job.findUnique as jest.Mock).mockResolvedValue(mockJob);

      await expect(
        service.updateJob('job-1', 'different-user', {})
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('deleteJob', () => {
    it('should delete job successfully', async () => {
      (prismaService.job.findUnique as jest.Mock).mockResolvedValue(mockJob);
      (prismaService.job.delete as jest.Mock).mockResolvedValue(mockJob);

      await service.deleteJob('job-1', 'user-1');

      expect(prismaService.job.delete).toHaveBeenCalledWith({
        where: { id: 'job-1' },
      });
    });

    it('should throw ForbiddenException if user does not own job', async () => {
      (prismaService.job.findUnique as jest.Mock).mockResolvedValue(mockJob);

      await expect(
        service.deleteJob('job-1', 'different-user')
      ).rejects.toThrow(ForbiddenException);
    });

    it('should throw NotFoundException if job not found', async () => {
      (prismaService.job.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(
        service.deleteJob('nonexistent-job', 'user-1')
      ).rejects.toThrow(NotFoundException);
    });
  });
});
