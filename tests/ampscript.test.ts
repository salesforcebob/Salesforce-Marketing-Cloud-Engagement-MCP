import { describe, it, expect } from "vitest";
import { formatAmpScript } from "../src/devtools/ampscript/format.js";
import { lintAmpScript } from "../src/devtools/ampscript/lint.js";

describe("AMPScript tools", () => {
  it("formats by trimming trailing spaces", () => {
    const input = '%%=v(@x)=%%   \nSET @x = 1   ';
    const out = formatAmpScript({ code: input });
    expect(out.formatted.endsWith("  ")).toBe(false);
  });

  it("lints trailing spaces", () => {
    const input = '%%=v(@x)=%%   \nSET @x = 1   ';
    const res = lintAmpScript({ code: input });
    expect(res.issues.find((i) => i.ruleId === "trailing-spaces")).toBeTruthy();
  });
});



