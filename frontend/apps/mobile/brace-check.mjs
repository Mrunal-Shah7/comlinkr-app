import fs from "fs";
const text = fs.readFileSync("app/(tabs)/feed/index.tsx", "utf8");
const needle = process.argv[2] || "const s = StyleSheet.create(";
const start = text.indexOf(needle);
if (start < 0) throw new Error("const s not found");
const openBrace = text.indexOf("{", start + needle.length);
let i = openBrace;
let depth = 0;
let line = text.slice(0, openBrace).split("\n").length;
let state = "code";
let stringQuote = null;

for (; i < text.length; i++) {
  const c = text[i];
  const next = text[i + 1];

  if (state === "code") {
    if (c === '"' || c === "'" || c === "`") {
      state = c === "`" ? "template" : "string";
      stringQuote = c;
      continue;
    }
    if (c === "/" && next === "/") {
      state = "lineComment";
      i++;
      continue;
    }
    if (c === "/" && next === "*") {
      state = "blockComment";
      i++;
      continue;
    }
    if (c === "\n") line++;
    if (c === "{") depth++;
    if (c === "}") {
      depth--;
      if (depth === 0) {
        console.log("StyleSheet.create object closes at line", line, "snippet:", JSON.stringify(text.slice(i, i + 15)));
        process.exit(0);
      }
    }
    continue;
  }
  if (state === "lineComment") {
    if (c === "\n") {
      state = "code";
      line++;
    }
    continue;
  }
  if (state === "blockComment") {
    if (c === "\n") line++;
    if (c === "*" && next === "/") {
      state = "code";
      i++;
    }
    continue;
  }
  if (state === "template") {
    if (c === "\n") line++;
    if (c === "`") state = "code";
    continue;
  }
  if (state === "string") {
    if (c === "\n") line++;
    if (c === "\\") {
      i++;
      continue;
    }
    if (c === stringQuote) state = "code";
    continue;
  }
}

console.log("EOF: depth still", depth, "last line", line);
