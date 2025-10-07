import { IsString, IsArray, IsNotEmpty, IsOptional } from 'class-validator';

export class SyncSavedMenuDto {
  @IsArray()
  @IsString({ each: true })
  @IsNotEmpty()
  channels: string[]; // Array of channel codes: careem, talabat, callcenter, mobile, online

  @IsOptional()
  @IsString()
  menuName?: string; // Optional: Custom name for the synced menu (defaults to SavedMenu name)

  @IsOptional()
  @IsString()
  menuDescription?: string; // Optional: Custom description for the synced menu
}
