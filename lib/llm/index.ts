import { generateCopyWithAnthropic } from "./anthropicProvider";
import { generateCopyWithOllama } from "./ollamaProvider";
import type { GenerateCopyInput, GenerateCopyResult } from "./schemas";

export type { GenerateCopyInput, GenerateCopyResult } from "./schemas";

/**
 * LLM_PROVIDER switch (.env.local): "ollama" (default, free, local, dev-only
 * — Ollama running on localhost is NOT reachable from a Vercel deployment)
 * or "anthropic" (cloud, needs ANTHROPIC_API_KEY, works everywhere including
 * production). Switch this to "anthropic" before deploying to Vercel.
 */
export async function generateCopy(input: GenerateCopyInput): Promise<GenerateCopyResult> {
  const provider = (process.env.LLM_PROVIDER || "ollama").toLowerCase();

  if (provider === "anthropic") {
    return generateCopyWithAnthropic(input);
  }
  if (provider === "ollama") {
    return generateCopyWithOllama(input);
  }
  throw new Error(`Unknown LLM_PROVIDER "${provider}" in .env.local — use "ollama" or "anthropic".`);
}
