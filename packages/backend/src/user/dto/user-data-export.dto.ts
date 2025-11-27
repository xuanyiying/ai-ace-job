import { ApiProperty } from '@nestjs/swagger';

export class UserDataExportDto {
  @ApiProperty()
  user!: {
    id: string;
    email: string;
    username?: string;
    phone?: string;
    subscriptionTier: string;
    createdAt: Date;
    updatedAt: Date;
  };

  @ApiProperty()
  resumes!: Array<{
    id: string;
    title: string;
    version: number;
    isPrimary: boolean;
    createdAt: Date;
    updatedAt: Date;
    parsedData?: any;
  }>;

  @ApiProperty()
  jobs!: Array<{
    id: string;
    title: string;
    company: string;
    location?: string;
    jobDescription: string;
    requirements: string;
    createdAt: Date;
    updatedAt: Date;
  }>;

  @ApiProperty()
  optimizations!: Array<{
    id: string;
    resumeId: string;
    jobId: string;
    matchScore?: any;
    suggestions: any[];
    status: string;
    createdAt: Date;
    completedAt?: Date;
  }>;

  @ApiProperty()
  generatedPdfs!: Array<{
    id: string;
    templateId: string;
    downloadCount: number;
    createdAt: Date;
  }>;

  @ApiProperty()
  exportedAt!: Date;
}
