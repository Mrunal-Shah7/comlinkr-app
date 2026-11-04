import fs from "fs";
const p = "app/(tabs)/feed/index.tsx";
let text = fs.readFileSync(p, "utf8");
const marker = "// ── Styles ────────────────────────────────────────────────";
const start = text.indexOf(marker);
if (start < 0) throw new Error("marker not found");
const before = text.slice(0, start);
const tail = `${marker}
const s = StyleSheet.create({});
const st = StyleSheet.create({});
const la = StyleSheet.create({});
`;
fs.writeFileSync(p, before + tail);
console.log("ok, len", (before + tail).length);
