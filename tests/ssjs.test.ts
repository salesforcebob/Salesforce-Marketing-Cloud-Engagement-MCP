import { describe, it, expect } from "vitest";
import { formatSsjs } from "../src/devtools/ssjs/format.js";
import { lintSsjs } from "../src/devtools/ssjs/lint.js";

describe("SSJS tools", () => {
  it("formats CRLF to LF", () => {
    const out = formatSsjs({ code: "var x=1;\r\nvar y=2;" });
    expect(out.formatted.includes("\r")).toBe(false);
  });

  it("lints eval usage", () => {
    const res = lintSsjs({ code: "eval('x=1')" });
    expect(res.issues.find((i) => i.ruleId === "no-eval")).toBeTruthy();
  });
});



