/**
 * Legacy fragment codec retained to keep older comparison links working.
 * New links use anonymous SQLite records and short random IDs.
 *
 * Design (documented per SRS §9.3 "document the behaviour when the item list changes"):
 *  - Answers are packed 2 bits per item (00 unanswered, 01 experienced,
 *    10 not_experienced, 11 not_applicable), in item_id order, then base64url-encoded.
 *  - Payload format: `cs1.<itemCount>.<idsHash>.<base64url>`
 *      cs1            protocol + version (bump for breaking changes)
 *      itemCount      number of items the sender's list had
 *      idsHash        FNV-1a 32-bit of the joined item_id list — if the app's
 *                     item list changes later, old links fail this check and the
 *                     UI shows a recoverable error instead of a wrong comparison (FR-020)
 *  - Carried in the URL #fragment: never sent to the server, private by default.
 *  - No names, emails, or any identifier ever (SRS §9.3, NFR-005).
 *  - Input is untrusted: strict shape + size validation (NFR-007).
 */
import { z } from "zod";
import type { Dataset, ResponseValue, Responses } from "./types";

const MAX_PAYLOAD_LENGTH = 4096;
const PROTOCOL = "cs1";

const CODE_TO_VALUE: Record<number, ResponseValue | undefined> = {
  0: undefined,
  1: "experienced",
  2: "not_experienced",
  3: "not_applicable",
};
const VALUE_TO_CODE: Record<string, number> = {
  experienced: 1,
  not_experienced: 2,
  not_applicable: 3,
};

export type DecodeResult =
  | { ok: true; responses: Responses }
  | { ok: false; reason: "malformed" | "version" | "item_list_changed" };

/** FNV-1a 32-bit, returned as 8-char lowercase hex. */
function fnv1a(str: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h.toString(16).padStart(8, "0");
}

function datasetFingerprint(dataset: Dataset): { count: number; hash: string } {
  const ids = [...dataset.items].sort((a, b) => a.item_id.localeCompare(b.item_id)).map((i) => i.item_id);
  return { count: ids.length, hash: fnv1a(ids.join("|")) };
}

function bytesToBase64Url(bytes: Uint8Array): string {
  let bin = "";
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function base64UrlToBytes(s: string): Uint8Array | null {
  const b64 = s.replace(/-/g, "+").replace(/_/g, "/");
  if (!/^[A-Za-z0-9+/]*={0,2}$/.test(b64)) return null;
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes;
}

export function encodeComparisonPayload(responses: Responses, dataset: Dataset): string {
  const { count, hash } = datasetFingerprint(dataset);
  const ordered = [...dataset.items].sort((a, b) => a.item_id.localeCompare(b.item_id));

  const bitCount = ordered.length * 2;
  const bytes = new Uint8Array(Math.ceil(bitCount / 8));
  ordered.forEach((item, idx) => {
    const code = VALUE_TO_CODE[responses[item.item_id] ?? ""] ?? 0;
    const bitPos = idx * 2;
    bytes[bitPos >> 3] |= code << (6 - (bitPos & 7));
  });

  return `${PROTOCOL}.${count}.${hash}.${bytesToBase64Url(bytes)}`;
}

export function decodeComparisonPayload(payload: string, dataset: Dataset): DecodeResult {
  if (typeof payload !== "string" || payload.length === 0 || payload.length > MAX_PAYLOAD_LENGTH) {
    return { ok: false, reason: "malformed" };
  }

  // strict shape check on untrusted input (NFR-007)
  const shape = /^cs(\d+)\.(\d+)\.([0-9a-f]{8})\.([A-Za-z0-9_-]+)$/.exec(payload.trim());
  if (!shape) return { ok: false, reason: "malformed" };

  const [, versionStr, countStr, hash, data] = shape;
  if (versionStr !== "1") return { ok: false, reason: "version" };

  const { count: expectedCount, hash: expectedHash } = datasetFingerprint(dataset);
  // Item list changed after the link was created → documented failure mode.
  if (Number(countStr) !== expectedCount || hash !== expectedHash) {
    return { ok: false, reason: "item_list_changed" };
  }

  const bytes = base64UrlToBytes(data);
  if (!bytes) return { ok: false, reason: "malformed" };

  const ordered = [...dataset.items].sort((a, b) => a.item_id.localeCompare(b.item_id));
  const needed = Math.ceil((ordered.length * 2) / 8);
  if (bytes.length !== needed) return { ok: false, reason: "malformed" };

  const responses: Responses = {};
  ordered.forEach((item, idx) => {
    const bitPos = idx * 2;
    const byte = bytes[bitPos >> 3];
    const code = (byte >> (6 - (bitPos & 7))) & 0b11;
    const value = CODE_TO_VALUE[code];
    if (value !== undefined) responses[item.item_id] = value;
  });

  // zod validation of the decoded values (untrusted input, NFR-007)
  const parsedResponses = z.record(z.enum(["experienced", "not_experienced", "not_applicable"])).safeParse(responses);
  if (!parsedResponses.success) return { ok: false, reason: "malformed" };

  // Trailing padding bits must be zero — reject sloppy/tampered payloads.
  const usedBits = ordered.length * 2;
  const trailingBits = bytes.length * 8 - usedBits;
  if (trailingBits > 0) {
    const last = bytes[bytes.length - 1];
    if (last & ((1 << trailingBits) - 1)) return { ok: false, reason: "malformed" };
  }

  return { ok: true, responses };
}

export function buildCompareUrl(responses: Responses, dataset: Dataset, origin?: string): string {
  const base = typeof origin === "string" ? origin : typeof window !== "undefined" ? window.location.origin : "";
  return `${base}/compare#${encodeComparisonPayload(responses, dataset)}`;
}
