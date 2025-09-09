import { z } from "zod";

export const ssjsLintInputSchema = z.object({
  code: z.string().describe("SSJS source code"),
});

export type SsjsLintInput = z.infer<typeof ssjsLintInputSchema>;

export type SsjsLintIssue = {
  ruleId: string;
  message: string;
  severity: "info" | "warn" | "error";
  line?: number;
  column?: number;
};

export type SsjsLintOutput = { issues: SsjsLintIssue[] };

export function lintSsjs(input: SsjsLintInput): SsjsLintOutput {
  const issues: SsjsLintIssue[] = [];
  // naive rule: discourage eval
  if (/\beval\s*\(/i.test(input.code)) {
    issues.push({ ruleId: "no-eval", message: "Avoid eval() in SSJS", severity: "warn" });
  }
  return { issues };
}



