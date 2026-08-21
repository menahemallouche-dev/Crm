import { Injectable } from "@nestjs/common";
import { PassportStrategy } from "@nestjs/passport";
import { ConfigService } from "@nestjs/config";
import { Strategy, StrategyOptions, VerifyCallback } from "passport-google-oauth20";

export interface GoogleProfile {
  googleId: string;
  email: string;
  firstName: string;
  lastName: string;
  avatarUrl?: string;
}

/**
 * Only instantiated by AuthModule when GOOGLE_OAUTH_CLIENT_ID/SECRET are
 * present (see auth.module.ts) — passport-google-oauth20 throws at
 * construction time if those are missing, so this class must never be
 * registered as a Nest provider without them.
 */
@Injectable()
export class GoogleStrategy extends PassportStrategy(Strategy, "google") {
  constructor(config: ConfigService) {
    const options: StrategyOptions = {
      clientID: config.get<string>("GOOGLE_OAUTH_CLIENT_ID") as string,
      clientSecret: config.get<string>("GOOGLE_OAUTH_CLIENT_SECRET") as string,
      callbackURL: `${config.get<string>("API_URL") ?? "http://localhost:4000"}/api/auth/google/callback`,
      scope: ["profile", "email"],
    };
    super(options);
  }

  authenticate(req: any, options?: any) {
    // `options` carries whatever GoogleAuthGuard.getAuthenticateOptions() returned
    // (e.g. { state: linkTicket } for the account-linking flow) — preserved as-is.
    super.authenticate(req, { ...options, session: false });
  }

  validate(_accessToken: string, _refreshToken: string, profile: any, done: VerifyCallback) {
    const email = profile.emails?.[0]?.value;
    const googleProfile: GoogleProfile = {
      googleId: profile.id,
      email,
      firstName: profile.name?.givenName ?? profile.displayName ?? "Utilisateur",
      lastName: profile.name?.familyName ?? "Google",
      avatarUrl: profile.photos?.[0]?.value,
    };
    done(null, googleProfile);
  }
}
