import { IsEnum, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { SubscriptionTier } from '@prisma/client';

export class UpdateSubscriptionDto {
  @ApiProperty({ enum: SubscriptionTier, example: SubscriptionTier.PRO })
  @IsEnum(SubscriptionTier)
  @IsNotEmpty()
  tier!: SubscriptionTier;
}
