import fs from "fs";
const p = "app/(tabs)/feed/index.tsx";
let text = fs.readFileSync(p, "utf8");
const start = text.indexOf("// ── My Area Live styles ───────────────────────────────────");
if (start < 0) {
  console.error("start marker not found");
  process.exit(1);
}
text = text.slice(0, start) +
  `// ── My Area Live styles ───────────────────────────────────
const la = StyleSheet.create({});
`;
fs.writeFileSync(p, text);
console.log("stripped la block, new len", text.length);
