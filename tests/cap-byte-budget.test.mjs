// Differential guard for the pure cap function, without a server or index.
import { test } from "node:test";
import assert from "node:assert/strict";
import { StringDecoder } from "node:string_decoder";
import { capBytes as bounded } from "../src/core/sandbox/cap.ts";

function reference(s, cap) {
  const buf = Buffer.from(s, "utf8");
  if (buf.length <= cap) return { text: s, cut: false, fullBytes: buf.length };
  return { text: new StringDecoder("utf8").write(buf.subarray(0, cap)), cut: true, fullBytes: buf.length };
}

test("UTF-8 cap matches the previous byte-prefix contract, including malformed UTF-16", () => {
  const alphabet = ["a", "é", "中", "🎮", "\ufeff", "\u0301", "\ud800", "\udc00", "\u0000", "\r\n"];
  let seed = 134;
  const next = () => (seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0);
  let cases = 0;
  for (let i = 0; i < 256; i += 1) {
    let s = "";
    for (let j = 0, n = i % 32; j < n; j += 1) s += alphabet[next() % alphabet.length];
    for (let cap = 0; cap <= Buffer.byteLength(s, "utf8") + 1; cap += 1) {
      assert.deepEqual(bounded(s, cap), reference(s, cap), `case ${i}, cap ${cap}`);
      cases += 1;
    }
    for (const cap of [-Infinity, -8, -1, -0.5, NaN, 0.5, 1.9, Infinity]) {
      assert.deepEqual(bounded(s, cap), reference(s, cap), `case ${i}, cap ${cap}`);
      cases += 1;
    }
  }
  assert.ok(cases > 10000);
  console.log(`differential cases: ${cases}`);
});

test("large prefix and uncut string retain exact output", () => {
  const s = "\ufeff" + "aé中🎮\ud800".repeat(100000);
  for (const cap of [0, 1, 48, 256, 4096, 16384, Buffer.byteLength(s), Buffer.byteLength(s)+1]) {
    assert.deepEqual(bounded(s, cap), reference(s, cap));
  }
});
