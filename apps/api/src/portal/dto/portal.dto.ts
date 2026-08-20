import { IsEmail, IsOptional, IsString, MinLength } from "class-validator";

export class PortalLoginDto {
  @IsEmail()
  email: string;

  @IsString()
  password: string;
}

export class CreatePortalUserDto {
  @IsEmail()
  email: string;

  @IsString()
  @MinLength(8)
  password: string;

  @IsOptional()
  @IsString()
  contactId?: string;
}

export class SignPortalQuoteDto {
  @IsString()
  signedByName: string;
}
