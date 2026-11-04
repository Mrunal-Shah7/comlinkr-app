import fs from "fs";
import ts from "typescript";

const text = fs.readFileSync("app/(tabs)/feed/index.tsx", "utf8");
const start = text.indexOf("const la = StyleSheet.create(");
const sub = text.slice(start);
const scanner = ts.createScanner(ts.ScriptTarget.Latest, false, ts.LanguageVariant.Standard, sub, ts.ScriptKind.TS);
let depth = 0;
let line = 1;
let tok = scanner.scan();
const open = [];
while (tok !== ts.SyntaxKind.EndOfFileToken) {
  const pos = scanner.getTokenPos();
  const frag = sub.slice(pos, pos + 40).split(/\r?\n/)[0];
  if (tok === ts.SyntaxKind.OpenBraceToken) {
    depth++;
    open.push({ line, frag });
  }
  if (tok === ts.SyntaxKind.CloseBraceToken) depth--;
  if (scanner.getToken() === "\n" || sub[scanner.getTokenPos()] === "\n") line++;
  tok = scanner.scan();
}
console.log("brace depth at EOF (ts scanner):", depth);
console.log("last few opens:", open.slice(-5));
