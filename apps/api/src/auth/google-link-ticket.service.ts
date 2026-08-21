import { Injectable } from "@nestjs/common";
import { randomBytes } from "crypto";

interface Ticket {
  userId: string;
  expiresAt: number;
}

const TICKET_TTL_MS = 5 * 60_000; // 5 minutes — plenty for a redirect round-trip to Google and back

/**
 * Carries "link my Google account to my current session" intent through the
 * OAuth redirect, which can't carry an Authorization header. The staff app
 * calls POST /auth/google/link-ticket while authenticated to mint a
 * short-lived, single-use ticket; it's then passed as the OAuth `state`
 * param to /auth/google and read back by the callback (see
 * GoogleAuthGuard.getAuthenticateOptions and AuthService.loginWithGoogle).
 *
 * In-memory and single-instance — same pragmatic tradeoff as the Redis
 * fallbacks elsewhere in this codebase. For a multi-instance deployment,
 * back this with Redis instead (the interface below wouldn't need to change).
 */
@Injectable()
export class GoogleLinkTicketService {
  private readonly tickets = new Map<string, Ticket>();

  issue(userId: string): string {
    this.sweep();
    const ticket = randomBytes(24).toString("hex");
    this.tickets.set(ticket, { userId, expiresAt: Date.now() + TICKET_TTL_MS });
    return ticket;
  }

  /** Single-use: returns the userId and immediately invalidates the ticket. */
  consume(ticket: string): string | null {
    const entry = this.tickets.get(ticket);
    this.tickets.delete(ticket);
    if (!entry || entry.expiresAt < Date.now()) return null;
    return entry.userId;
  }

  private sweep() {
    const now = Date.now();
    for (const [key, entry] of this.tickets) {
      if (entry.expiresAt < now) this.tickets.delete(key);
    }
  }
}
