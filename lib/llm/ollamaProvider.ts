import { z } from "zod";
import { BRAND_VOICE, TOOL_SCHEMAS, RESPONSE_SCHEMAS, CaptionSchema, buildUserPrompt } from "./schemas";
import type { GenerateCopyInput, GenerateCopyResult, JsonSchema } from "./schemas";

const DEFAULT_BASE_URL = "http://localhost:11434";
const DEFAULT_MODEL = "qwen2.5-coder:7b";
const REQUEST_TIMEOUT_MS = 120_000; // local inference can be slow, especially on CPU
const MAX_ATTEMPTS = 3;

interface OllamaChatResponse {
  message?: {
    role: string;
    content?: string;
    tool_calls?: { function: { name: string; arguments: unknown } }[];
  };
  error?: string;
}

/**
 * Small local models sometimes emit literal newline/tab characters inside
 * JSON string values (e.g. a multi-line tweet body) instead of escaping them
 * as \n — which is invalid JSON and breaks JSON.parse. Walk the string
 * tracking quote state and escape only the control characters that fall
 * inside a string literal, leaving structural whitespace untouched.
 */
function sanitizeJsonControlChars(text: string): string {
  let out = "";
  let inString = false;
  let escaped = false;
  for (const ch of text) {
    if (inString) {
      if (escaped) {
        out += ch;
        escaped = false;
      } else if (ch === "\\") {
        out += ch;
        escaped = true;
      } else if (ch === '"') {
        out += ch;
        inString = false;
      } else if (ch === "\n") {
        out += "\\n";
      } else if (ch === "\r") {
        out += "\\r";
      } else if (ch === "\t") {
        out += "\\t";
      } else {
        out += ch;
      }
    } else {
      out += ch;
      if (ch === '"') inString = true;
    }
  }
  return out;
}

/**
 * Scans (respecting string/escape state) for unclosed `{`/`[` and an
 * unterminated trailing string. Returns the text needed to close everything
 * that's still open, in the correct nesting order — empty string if nothing
 * is open. This is the dominant failure mode observed in practice: the model
 * runs out of output mid-structure and stops exactly N braces short, most
 * often just one (e.g. the outer envelope's closing `}` never arrives).
 */
function computeMissingClosers(text: string): string {
  const stack: string[] = [];
  let inString = false;
  let escaped = false;
  for (const ch of text) {
    if (inString) {
      if (escaped) escaped = false;
      else if (ch === "\\") escaped = true;
      else if (ch === '"') inString = false;
      continue;
    }
    if (ch === '"') inString = true;
    else if (ch === "{") stack.push("}");
    else if (ch === "[") stack.push("]");
    else if ((ch === "}" || ch === "]") && stack[stack.length - 1] === ch) stack.pop();
  }
  const closeString = inString ? '"' : "";
  return closeString + stack.reverse().join("");
}

/**
 * Small models occasionally emit structurally invalid JSON. Try a straight
 * parse first; on failure, try appending whatever closing braces/brackets
 * (and closing quote) are needed to balance an under-closed/truncated
 * response — the most common real-world failure — then fall back to
 * progressively trimming stray extra trailing closers, the less common
 * opposite case. All without needing a full JSON-repair dependency.
 */
function parseJsonLenient(text: string): unknown {
  const sanitized = sanitizeJsonControlChars(text);
  try {
    return JSON.parse(sanitized);
  } catch (firstError) {
    const closers = computeMissingClosers(sanitized);
    if (closers) {
      try {
        return JSON.parse(sanitized + closers);
      } catch {
        // fall through to the trimming strategy below
      }
    }

    let trimmed = sanitized.trimEnd();
    for (let i = 0; i < 10 && /[}\]]$/.test(trimmed); i++) {
      trimmed = trimmed.slice(0, -1).trimEnd();
      try {
        return JSON.parse(trimmed);
      } catch {
        // keep trimming — there may be more than one stray trailing brace/bracket
      }
    }
    throw firstError;
  }
}

function extractJson(text: string): unknown {
  // Some models wrap JSON in prose or code fences even when a tool call was
  // requested — pull out the first {...} block as a fallback.
  const match = text.match(/\{[\s\S]*\}/);
  if (!match) throw new Error("No JSON object found in the model's response.");
  return parseJsonLenient(match[0]);
}

/**
 * Some models (e.g. qwen2.5-coder via Ollama) don't populate the native
 * `tool_calls` field even when tools are supplied — instead they emit a
 * `{"name": "...", "arguments": {...}}` envelope as plain JSON text. Unwrap
 * that shape so we validate the actual payload, not the envelope around it.
 */
function unwrapToolPayload(raw: unknown): unknown {
  if (raw && typeof raw === "object" && "arguments" in raw) {
    const args = (raw as { arguments: unknown }).arguments;
    if (args && typeof args === "object") return args;
  }
  return raw;
}

export interface CallToolParams<T> {
  toolName: string;
  toolDescription: string;
  jsonSchema: JsonSchema;
  zodSchema: z.ZodType<T>;
  userPrompt: string;
  extraInstructions?: string;
}

/** One tool-calling round-trip to Ollama, with retries and JSON repair baked in. */
export async function callOllamaTool<T>({ toolName, toolDescription, jsonSchema, zodSchema, userPrompt, extraInstructions }: CallToolParams<T>): Promise<T> {
  const baseUrl = (process.env.OLLAMA_BASE_URL || DEFAULT_BASE_URL).replace(/\/$/, "");
  const model = process.env.OLLAMA_MODEL || DEFAULT_MODEL;

  const attempt = async (): Promise<T> => {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

    let res: Response;
    try {
      res = await fetch(`${baseUrl}/api/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: controller.signal,
        body: JSON.stringify({
          model,
          stream: false,
          options: { temperature: 0.3 }, // favor strict schema compliance over creative variance
          messages: [
            { role: "system", content: BRAND_VOICE },
            {
              role: "user",
              content: `${userPrompt}\n\nRespond by calling the "${toolName}" tool with the drafted content. Every field listed as required in the tool's parameters schema must be present, including nested ones — do not omit any of them.${extraInstructions ? ` ${extraInstructions}` : ""} Respond with ONLY the tool call, no other text.`,
            },
          ],
          tools: [{ type: "function", function: { name: toolName, description: toolDescription, parameters: jsonSchema } }],
        }),
      });
    } catch (err) {
      if (err instanceof Error && err.name === "AbortError") {
        throw new Error(`Ollama didn't respond within ${REQUEST_TIMEOUT_MS / 1000}s. The model may be too slow for this hardware, or still loading — try again.`);
      }
      throw new Error(
        `Could not reach Ollama at ${baseUrl}. Make sure it's running (\`ollama serve\`) and reachable at that address. (${err instanceof Error ? err.message : String(err)})`
      );
    } finally {
      clearTimeout(timeout);
    }

    if (!res.ok) {
      const body = await res.text().catch(() => "");
      throw new Error(
        `Ollama returned an error (HTTP ${res.status}). Make sure the model "${model}" is pulled (\`ollama pull ${model}\`). ${body}`.trim()
      );
    }

    const json: OllamaChatResponse = await res.json();
    if (json.error) throw new Error(`Ollama error: ${json.error}`);

    const toolCall = json.message?.tool_calls?.[0];
    let raw: unknown;
    if (toolCall) {
      raw = typeof toolCall.function.arguments === "string" ? parseJsonLenient(toolCall.function.arguments) : toolCall.function.arguments;
    } else if (json.message?.content) {
      raw = extractJson(json.message.content);
    } else {
      throw new Error("Ollama did not return a tool call or any content. Try again, or try a different OLLAMA_MODEL that supports tool calling.");
    }

    return zodSchema.parse(unwrapToolPayload(raw));
  };

  // Local models are meaningfully less reliable than Claude at strict nested
  // schema compliance, so allow a couple more attempts before giving up.
  let lastError: unknown;
  for (let i = 0; i < MAX_ATTEMPTS; i++) {
    try {
      return await attempt();
    } catch (err) {
      lastError = err;
    }
  }
  throw lastError instanceof Error ? lastError : new Error(String(lastError));
}

// --- Decomposed colorBlock schemas ---
// The combined 5-section colorBlock schema is too much for a small local
// model to sustain reliably in one generation (observed truncated/incomplete
// output even after retries). Splitting it into one focused call per section
// is far more reliable, at the cost of a few extra local (free) requests.

const HookSchema = z.object({ subhead: z.string(), headline: z.string(), cta: z.string() });
const ItemSchema = z.object({ title: z.string(), body: z.string() });
const ProblemFixSchema = z.object({ headline: z.string(), items: z.array(ItemSchema).length(3) });
const FeaturesSchema = z.object({
  headline: z.string(),
  items: z.array(z.object({ title: z.string(), body: z.string().optional() })).min(4).max(6),
});
const CtaSectionSchema = z.object({ headline: z.string(), body: z.string() });

const itemsSchema = (n: number): JsonSchema => ({
  type: "object",
  properties: {
    headline: { type: "string" },
    items: {
      type: "array",
      minItems: n,
      maxItems: n,
      items: { type: "object", properties: { title: { type: "string" }, body: { type: "string" } }, required: ["title", "body"] },
    },
  },
  required: ["headline", "items"],
});

async function generateColorBlockWithOllama(input: GenerateCopyInput): Promise<GenerateCopyResult> {
  const topicLine = `Topic/brief from the client: ${input.topic}`;

  const hook = await callOllamaTool({
    toolName: "draft_hook_slide",
    toolDescription: "Draft the opening hook slide of a 5-slide carousel.",
    jsonSchema: {
      type: "object",
      properties: {
        subhead: { type: "string", description: "Short supporting line above the headline." },
        headline: { type: "string", description: "Big bold hook question/statement." },
        cta: { type: "string", description: "Short CTA line at the bottom, e.g. 'You can start today!'" },
      },
      required: ["subhead", "headline", "cta"],
    },
    zodSchema: HookSchema,
    userPrompt: `${topicLine}\n\nDraft slide 1 of 5 (the "hook") for a carousel about this topic.`,
  });

  const problem = await callOllamaTool({
    toolName: "draft_problem_slide",
    toolDescription: "Draft the problem slide of a 5-slide carousel — exactly 3 problems.",
    jsonSchema: itemsSchema(3),
    zodSchema: ProblemFixSchema,
    userPrompt: `${topicLine}\n\nDraft slide 2 of 5 (the "problem" slide) — a headline plus EXACTLY 3 problems (each with a title and one-sentence body) that this topic solves.`,
    extraInstructions: 'The "items" array must contain exactly 3 entries, no more, no fewer.',
  });

  const fix = await callOllamaTool({
    toolName: "draft_fix_slide",
    toolDescription: "Draft the fix slide of a 5-slide carousel — exactly 3 fixes.",
    jsonSchema: itemsSchema(3),
    zodSchema: ProblemFixSchema,
    userPrompt: `${topicLine}\n\nDraft slide 3 of 5 (the "fix" slide) — a headline plus EXACTLY 3 ways buckstreaming fixes the problems from the previous slide.`,
    extraInstructions: 'The "items" array must contain exactly 3 entries, no more, no fewer.',
  });

  const features = await callOllamaTool({
    toolName: "draft_features_slide",
    toolDescription: "Draft the features slide of a 5-slide carousel — 4 to 6 features.",
    jsonSchema: {
      type: "object",
      properties: {
        headline: { type: "string" },
        items: {
          type: "array",
          minItems: 4,
          maxItems: 6,
          items: { type: "object", properties: { title: { type: "string" }, body: { type: "string" } }, required: ["title"] },
        },
      },
      required: ["headline", "items"],
    },
    zodSchema: FeaturesSchema,
    userPrompt: `${topicLine}\n\nDraft slide 4 of 5 ("THE FEATURES") — a headline plus 4 to 6 feature bullets relevant to this topic.`,
  });

  const cta = await callOllamaTool({
    toolName: "draft_cta_slide",
    toolDescription: "Draft the closing CTA slide of a 5-slide carousel.",
    jsonSchema: {
      type: "object",
      properties: { headline: { type: "string" }, body: { type: "string" } },
      required: ["headline", "body"],
    },
    zodSchema: CtaSectionSchema,
    userPrompt: `${topicLine}\n\nDraft slide 5 of 5 (the closing call-to-action) for this carousel.`,
  });

  const caption = await callOllamaTool({
    toolName: "draft_caption",
    toolDescription: "Draft the Instagram caption and first-comment text for this carousel post.",
    jsonSchema: {
      type: "object",
      properties: { caption: { type: "string" }, firstComment: { type: "string" } },
      required: ["caption", "firstComment"],
    },
    zodSchema: CaptionSchema,
    userPrompt: `${topicLine}\n\nDraft the Instagram caption and first-comment text for this carousel post.`,
  });

  return { family: "colorBlock", slides: { hook, problem, fix, features, cta }, caption };
}

export async function generateCopyWithOllama(input: GenerateCopyInput): Promise<GenerateCopyResult> {
  if (input.family === "colorBlock") {
    return generateColorBlockWithOllama(input);
  }

  const tool = TOOL_SCHEMAS[input.family];
  const schema = RESPONSE_SCHEMAS[input.family];
  const userPrompt = buildUserPrompt(input);

  const result = await callOllamaTool({
    toolName: tool.name,
    toolDescription: tool.description,
    jsonSchema: tool.input_schema,
    zodSchema: schema,
    userPrompt,
  });

  return { family: input.family, ...(result as any) };
}
