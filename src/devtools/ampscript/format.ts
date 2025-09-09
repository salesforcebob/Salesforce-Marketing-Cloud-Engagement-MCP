import { z } from "zod";

export const ampFormatInputSchema = z.object({
  code: z.string().describe("AMPScript source code to format"),
});

export type AmpFormatInput = z.infer<typeof ampFormatInputSchema>;

export type AmpFormatOutput = {
  formatted: string;
  changes: number;
};

export function formatAmpScript(input: AmpFormatInput): AmpFormatOutput {
  const original = input.code;
  // Minimal formatter: normalize newlines, trim trailing spaces per line
  const lines = original.replace(/\r\n?/g, "\n").split("\n");
  const trimmed = lines.map((l) => l.replace(/\s+$/g, ""));
  const formatted = trimmed.join("\n");
  const changes = formatted === original ? 0 : 1;
  return { formatted, changes };
}



