import { Module, Provider } from "@nestjs/common";
import { JwtModule } from "@nestjs/jwt";
import { PassportModule } from "@nestjs/passport";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { AuthService } from "./auth.service";
import { AuthController } from "./auth.controller";
import { JwtStrategy } from "./strategies/jwt.strategy";
import { GoogleStrategy } from "./strategies/google.strategy";
import { GoogleAuthGuard } from "./guards/google-auth.guard";
import { GoogleLinkTicketService } from "./google-link-ticket.service";

// GoogleStrategy's base class throws at construction time if clientID/clientSecret
// are missing, so it must only be registered as a provider when OAuth is actually
// configured — otherwise the whole API would fail to boot without Google creds.
const googleProviders: Provider[] = [];
if (process.env.GOOGLE_OAUTH_CLIENT_ID && process.env.GOOGLE_OAUTH_CLIENT_SECRET) {
  googleProviders.push(GoogleStrategy);
}

@Module({
  imports: [
    PassportModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.get<string>("JWT_SECRET"),
        signOptions: { expiresIn: config.get<string>("JWT_EXPIRES_IN") ?? "15m" },
      }),
    }),
  ],
  providers: [AuthService, JwtStrategy, GoogleAuthGuard, GoogleLinkTicketService, ...googleProviders],
  controllers: [AuthController],
  exports: [AuthService],
})
export class AuthModule {}
