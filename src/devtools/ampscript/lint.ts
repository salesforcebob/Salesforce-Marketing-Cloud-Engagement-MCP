import { z } from "zod";

export const ampLintInputSchema = z.object({
  code: z.string().describe("AMPScript source code to lint"),
});

export type AmpLintInput = z.infer<typeof ampLintInputSchema>;

export type AmpLintIssue = {
  ruleId: string;
  message: string;
  severity: "info" | "warn" | "error";
  line?: number;
  column?: number;
};

export type AmpLintOutput = {
  issues: AmpLintIssue[];
};

export function lintAmpScript(input: AmpLintInput): AmpLintOutput {
  const issues: AmpLintIssue[] = [];
  const lines = input.code.replace(/\r\n?/g, "\n").split("\n");
  // naive rule: flag trailing spaces
  lines.forEach((l, idx) => {
    if (/\s+$/.test(l)) {
      issues.push({ ruleId: "trailing-spaces", message: "Line has trailing spaces", severity: "info", line: idx + 1 });
    }
  });
  return { issues };
}



