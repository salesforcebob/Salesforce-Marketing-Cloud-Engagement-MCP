import { z } from "zod";

export const ssjsFormatInputSchema = z.object({
  code: z.string().describe("SSJS source code"),
});

export type SsjsFormatInput = z.infer<typeof ssjsFormatInputSchema>;

export type SsjsFormatOutput = {
  formatted: string;
};

export function formatSsjs(input: SsjsFormatInput): SsjsFormatOutput {
  // Minimal normalization: ensure LF newlines
  return { formatted: input.code.replace(/\r\n?/g, "\n") };
}



