import { Body, Controller, Get, Post } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { AuthService } from "./auth.service";
import { EnableMfaDto, LoginDto, RefreshDto, RegisterDto } from "./dto/auth.dto";
import { Public } from "../common/decorators/roles.decorator";
import { CurrentUser } from "../common/decorators/current-user.decorator";
import { AuthenticatedUser } from "./types";

@ApiTags("auth")
@Controller("auth")
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Post("register")
  register(@Body() dto: RegisterDto) {
    return this.authService.register(dto);
  }

  @Public()
  @Post("login")
  login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
  }

  @Public()
  @Post("refresh")
  refresh(@Body() dto: RefreshDto) {
    return this.authService.refresh(dto.refreshToken);
  }

  @Get("me")
  me(@CurrentUser() user: AuthenticatedUser) {
    return user;
  }

  @Post("mfa/generate")
  generateMfa(@CurrentUser() user: AuthenticatedUser) {
    return this.authService.generateMfaSecret(user.id);
  }

  @Post("mfa/enable")
  enableMfa(@CurrentUser() user: AuthenticatedUser, @Body() dto: EnableMfaDto) {
    return this.authService.enableMfa(user.id, dto.code);
  }
}
