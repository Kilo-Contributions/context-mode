// impl/03 §3, TECH-SPEC GP4 "output cut is code-point safe" (#903, #1176), DEVIATIONS D-M2-6, D-M2-T5-1.
// Pure function. The caller passes the cap (OUTPUT_CAP, REPORT_CAP, ...); nothing is read here.
import { StringDecoder } from "node:string_decoder";

export function capBytes(s: string, cap: number): { text: string; cut: boolean; fullBytes: number } {
  const fullBytes = Buffer.byteLength(s, "utf8");
  if (fullBytes <= cap) return { text: s, cut: false, fullBytes };
  // Preserve the old subarray coercion for nonstandard numeric caps. Normal
  // callers use nonnegative integer constants, and need only a cap-sized buffer.
  if (!Number.isSafeInteger(cap) || cap < 0) {
    const buf = Buffer.from(s, "utf8");
    return { text: new StringDecoder("utf8").write(buf.subarray(0, cap)), cut: true, fullBytes };
  }
  // Buffer.write emits whole UTF-8 sequences only. Avoid allocating the entire
  // output solely to discard its suffix. Decode only the initialized prefix.
  const buf = Buffer.allocUnsafe(cap);
  const written = buf.write(s, 0, cap, "utf8");
  return { text: buf.toString("utf8", 0, written), cut: true, fullBytes };
}
