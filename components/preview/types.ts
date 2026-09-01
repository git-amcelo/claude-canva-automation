import type { GenerateCopyResult } from "@/lib/llm";

/** Clones the current copy, lets the caller mutate the draft, then commits it. */
export type PatchFn = (mutator: (draft: GenerateCopyResult) => void) => void;
