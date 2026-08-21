import { Body, Controller, Get, Post, Query, Req, Res, UseGuards } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { ConfigService } from "@nestjs/config";
import { Request, Response } from "express";
import { AuthService } from "./auth.service";
import { EnableMfaDto, LoginDto, RefreshDto, RegisterDto } from "./dto/auth.dto";
import { Public } from "../common/decorators/roles.decorator";
import { CurrentUser } from "../common/decorators/current-user.decorator";
import { AuthenticatedUser } from "./types";
import { GoogleAuthGuard } from "./guards/google-auth.guard";
import { GoogleProfile } from "./strategies/google.strategy";

@ApiTags("auth")
@Controller("auth")
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly config: ConfigService,
  ) {}

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

  /** Tells the frontend whether to render the "Se connecter avec Google" button. */
  @Public()
  @Get("providers")
  providers() {
    return {
      googleEnabled: Boolean(
        this.config.get<string>("GOOGLE_OAUTH_CLIENT_ID") && this.config.get<string>("GOOGLE_OAUTH_CLIENT_SECRET"),
      ),
    };
  }

  /** Authenticated staff member wants to explicitly attach their Google account (Paramètres → "Lier mon compte Google"). */
  @Post("google/link-ticket")
  createGoogleLinkTicket(@CurrentUser() user: AuthenticatedUser) {
    return { ticket: this.authService.createGoogleLinkTicket(user.id) };
  }

  @Post("google/unlink")
  unlinkGoogle(@CurrentUser() user: AuthenticatedUser) {
    return this.authService.unlinkGoogle(user.id);
  }

  @Public()
  @UseGuards(GoogleAuthGuard)
  @Get("google")
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  googleLogin(@Query("linkTicket") _linkTicket?: string) {
    // GoogleAuthGuard redirects to Google's consent screen — this body never runs.
    // The `linkTicket` query param (if any) is relayed via OAuth `state` — see GoogleAuthGuard.getAuthenticateOptions.
  }

  @Public()
  @UseGuards(GoogleAuthGuard)
  @Get("google/callback")
  async googleCallback(@Req() req: Request, @Res() res: Response) {
    const appUrl = this.config.get<string>("APP_URL") ?? "http://localhost:3000";
    // Google echoes our `state` param back as a plain query string param on the callback.
    const linkTicket = typeof req.query.state === "string" ? req.query.state : undefined;
    try {
      const session = await this.authService.loginWithGoogle(req.user as GoogleProfile, linkTicket);
      const params = new URLSearchParams({ accessToken: session.accessToken, refreshToken: session.refreshToken });
      res.redirect(`${appUrl}/oauth-callback?${params.toString()}`);
    } catch (error) {
      const redirectTo = linkTicket ? "/settings" : "/login";
      res.redirect(`${appUrl}${redirectTo}?error=${encodeURIComponent((error as Error).message)}`);
    }
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
