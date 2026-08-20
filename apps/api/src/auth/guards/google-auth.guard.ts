import { ExecutionContext, Injectable, ServiceUnavailableException } from "@nestjs/common";
import { AuthGuard } from "@nestjs/passport";
import { ConfigService } from "@nestjs/config";

/**
 * Wraps AuthGuard('google') with a friendly error when OAuth isn't
 * configured, instead of Passport's opaque "Unknown authentication
 * strategy" — the GoogleStrategy provider itself only exists when
 * GOOGLE_OAUTH_CLIENT_ID/SECRET are set (see auth.module.ts).
 */
@Injectable()
export class GoogleAuthGuard extends AuthGuard("google") {
  constructor(private readonly config: ConfigService) {
    super();
  }

  canActivate(context: ExecutionContext) {
    if (!this.config.get<string>("GOOGLE_OAUTH_CLIENT_ID") || !this.config.get<string>("GOOGLE_OAUTH_CLIENT_SECRET")) {
      throw new ServiceUnavailableException(
        "Connexion Google non configurée — renseignez GOOGLE_OAUTH_CLIENT_ID et GOOGLE_OAUTH_CLIENT_SECRET.",
      );
    }
    return super.canActivate(context) as boolean | Promise<boolean>;
  }
}
