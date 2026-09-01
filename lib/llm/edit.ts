import Anthropic from "@anthropic-ai/sdk";
import { BRAND_VOICE, TOOL_SCHEMAS, RESPONSE_SCHEMAS } from "./schemas";
import type { GenerateCopyResult } from "./schemas";
import { callOllamaTool } from "./ollamaProvider";

function buildEditPrompt(current: GenerateCopyResult, instruction: string): string {
  const { family, ...payload } = current;
  return [
    "Here is the current copy for an Instagram carousel (as JSON):",
    "```json",
    JSON.stringify(payload, null, 2),
    "```",
    "",
    `Edit instruction from the client: ${instruction}`,
    "",
    "Apply ONLY what the instruction asks for and keep every other field word-for-word identical. Return the FULL updated copy (all slides + caption) via the tool.",
  ].join("\n");
}

async function editWithAnthropic(current: GenerateCopyResult, instruction: string): Promise<GenerateCopyResult> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error("ANTHROPIC_API_KEY is not set. Add it to .env.local, or set LLM_PROVIDER=ollama.");
  }
  const client = new Anthropic({ apiKey });
  const tool = TOOL_SCHEMAS[current.family];
  const schema = RESPONSE_SCHEMAS[current.family];

  const attempt = async () => {
    const message = await client.messages.create({
      model: "claude-sonnet-5",
      max_tokens: 4096,
      system: BRAND_VOICE,
      tools: [tool],
      tool_choice: { type: "tool", name: tool.name },
      messages: [{ role: "user", content: buildEditPrompt(current, instruction) }],
    });
    const toolUse = message.content.find((block): block is Anthropic.ToolUseBlock => block.type === "tool_use");
    if (!toolUse) throw new Error("Claude did not return structured output. Try again.");
    return schema.parse(toolUse.input);
  };

  try {
    const parsed = await attempt();
    return { family: current.family, ...(parsed as any) };
  } catch {
    const parsed = await attempt();
    return { family: current.family, ...(parsed as any) };
  }
}

async function editWithOllama(current: GenerateCopyResult, instruction: string): Promise<GenerateCopyResult> {
  const tool = TOOL_SCHEMAS[current.family];
  const schema = RESPONSE_SCHEMAS[current.family];
  const parsed = await callOllamaTool({
    toolName: tool.name,
    toolDescription: tool.description,
    jsonSchema: tool.input_schema,
    zodSchema: schema,
    userPrompt: buildEditPrompt(current, instruction),
  });
  return { family: current.family, ...(parsed as any) };
}

/**
 * Applies a natural-language edit instruction ("make slide 3 punchier") to the
 * current copy and returns the full updated copy.
 */
export async function editCopy(current: GenerateCopyResult, instruction: string): Promise<GenerateCopyResult> {
  const provider = (process.env.LLM_PROVIDER || "ollama").toLowerCase();
  if (provider === "anthropic") return editWithAnthropic(current, instruction);
  return editWithOllama(current, instruction);
}
