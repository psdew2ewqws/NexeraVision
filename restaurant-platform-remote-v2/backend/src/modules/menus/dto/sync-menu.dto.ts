import { IsString, IsNotEmpty, IsArray, IsUUID, IsOptional } from 'class-validator';

export class SyncMenuDto {
  @IsString()
  @IsNotEmpty()
  channel: string; // careem, talabat, callcenter

  @IsArray()
  @IsUUID('4', { each: true })
  @IsOptional()
  branchIds?: string[]; // Optional: sync specific branches only
}
