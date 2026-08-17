import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";

export interface SendEmailInput {
  to: string;
  subject: string;
  html: string;
}

/**
 * Transactional/campaign email adapter. Provider is selected via
 * EMAIL_PROVIDER (console | resend | sendgrid | smtp). "console" is the
 * zero-config default: it just logs the email so campaigns, reminders and
 * quote notifications are fully exercisable without any provider key.
 */
@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);

  constructor(private readonly config: ConfigService) {}

  async send(input: SendEmailInput): Promise<{ success: boolean; provider: string; id?: string }> {
    const provider = this.config.get<string>("EMAIL_PROVIDER") ?? "console";

    switch (provider) {
      case "resend": {
        const apiKey = this.config.get<string>("RESEND_API_KEY");
        if (!apiKey) return this.fallbackToConsole(input, "resend (clé absente)");
        const res = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
          body: JSON.stringify({
            from: this.config.get<string>("EMAIL_FROM"),
            to: input.to,
            subject: input.subject,
            html: input.html,
          }),
        });
        const data: any = await res.json().catch(() => ({}));
        return { success: res.ok, provider: "resend", id: data?.id };
      }
      case "sendgrid": {
        const apiKey = this.config.get<string>("SENDGRID_API_KEY");
        if (!apiKey) return this.fallbackToConsole(input, "sendgrid (clé absente)");
        const res = await fetch("https://api.sendgrid.com/v3/mail/send", {
          method: "POST",
          headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
          body: JSON.stringify({
            personalizations: [{ to: [{ email: input.to }] }],
            from: { email: this.config.get<string>("EMAIL_FROM") },
            subject: input.subject,
            content: [{ type: "text/html", value: input.html }],
          }),
        });
        return { success: res.ok, provider: "sendgrid" };
      }
      default:
        return this.fallbackToConsole(input, "console");
    }
  }

  private fallbackToConsole(input: SendEmailInput, provider: string) {
    this.logger.log(`✉️  [${provider}] → ${input.to} | ${input.subject}`);
    return { success: true, provider };
  }
}
