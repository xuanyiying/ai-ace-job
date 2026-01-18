import { IsString, IsOptional, IsEnum, IsObject } from 'class-validator';

export enum GuideType {
  GUIDE = 'guide',
  STRATEGY = 'strategy',
  STAR = 'star',
  MOCK = 'mock',
}

export class GetPreparationGuideDto {
  @IsEnum(GuideType)
  type: GuideType;

  @IsOptional()
  @IsString()
  language?: string = 'zh-CN';

  @IsOptional()
  @IsObject()
  resumeData?: Record<string, any>;

  @IsOptional()
  @IsString()
  jobDescription?: string;

  @IsOptional()
  @IsString()
  question?: string;
}
