import Anthropic from "@anthropic-ai/sdk";
import { BRAND_VOICE, TOOL_SCHEMAS, RESPONSE_SCHEMAS, buildUserPrompt } from "./schemas";
import type { GenerateCopyInput, GenerateCopyResult } from "./schemas";

export async function generateCopyWithAnthropic(input: GenerateCopyInput): Promise<GenerateCopyResult> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error(
      "ANTHROPIC_API_KEY is not set. Add it to .env.local (see .env.local.example), or set LLM_PROVIDER=ollama to use a local model instead, then restart the app."
    );
  }

  const client = new Anthropic({ apiKey });
  const tool = TOOL_SCHEMAS[input.family];
  const schema = RESPONSE_SCHEMAS[input.family];
  const userPrompt = buildUserPrompt(input);

  const attempt = async () => {
    const message = await client.messages.create({
      model: "claude-sonnet-5",
      max_tokens: 4096,
      system: BRAND_VOICE,
      tools: [tool],
      tool_choice: { type: "tool", name: tool.name },
      messages: [{ role: "user", content: userPrompt }],
    });

    const toolUse = message.content.find((block): block is Anthropic.ToolUseBlock => block.type === "tool_use");
    if (!toolUse) {
      throw new Error("Claude did not return structured output. Try again.");
    }
    return schema.parse(toolUse.input);
  };

  try {
    const parsed = await attempt();
    return { family: input.family, ...(parsed as any) };
  } catch {
    // one retry — structured-output validation occasionally fails on the first try
    const parsed = await attempt();
    return { family: input.family, ...(parsed as any) };
  }
}
