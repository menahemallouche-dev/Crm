import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import OpenAI from "openai";

/**
 * Thin wrapper around the OpenAI SDK. Every consumer must treat a `null`
 * return from `getClient()` as "no AI configured" and fall back to
 * deterministic heuristics — this is what lets the whole product run in a
 * demo/offline environment without an OPENAI_API_KEY.
 */
@Injectable()
export class OpenAiService {
  private readonly logger = new Logger(OpenAiService.name);
  private client: OpenAI | null = null;

  constructor(private readonly config: ConfigService) {
    const apiKey = this.config.get<string>("OPENAI_API_KEY");
    if (apiKey) {
      this.client = new OpenAI({ apiKey });
    } else {
      this.logger.warn(
        "OPENAI_API_KEY absent — l'IA utilisera les heuristiques de repli (scoring déterministe).",
      );
    }
  }

  get isEnabled(): boolean {
    return this.client !== null;
  }

  getClient(): OpenAI | null {
    return this.client;
  }

  get model(): string {
    return this.config.get<string>("OPENAI_MODEL") ?? "gpt-4.1";
  }

  /** Calls the chat completion endpoint and returns raw text, or null on failure/absence. */
  async complete(systemPrompt: string, userPrompt: string): Promise<string | null> {
    if (!this.client) return null;
    try {
      const response = await this.client.chat.completions.create({
        model: this.model,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        temperature: 0.2,
      });
      return response.choices[0]?.message?.content ?? null;
    } catch (error) {
      this.logger.error(`Appel OpenAI échoué: ${(error as Error).message}`);
      return null;
    }
  }

  /** Calls the chat completion endpoint requesting strict JSON output. */
  async completeJson<T = unknown>(systemPrompt: string, userPrompt: string): Promise<T | null> {
    if (!this.client) return null;
    try {
      const response = await this.client.chat.completions.create({
        model: this.model,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        temperature: 0.1,
        response_format: { type: "json_object" },
      });
      const content = response.choices[0]?.message?.content;
      return content ? (JSON.parse(content) as T) : null;
    } catch (error) {
      this.logger.error(`Appel OpenAI (JSON) échoué: ${(error as Error).message}`);
      return null;
    }
  }
}
