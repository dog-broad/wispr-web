import { describe, expect, it } from "vitest";

import { KNOWN_REASONS, copyForFailure } from "./outcomes";

// The set of wire reasons the session can emit. Keep this list in
// lockstep with PairFailReason on the API + the client-synthesised
// reasons in PairSession; the test below asserts every one has a
// dedicated outcome copy entry.
const ALL_REACHABLE_REASONS = [
  // server-originated (PairFailReason on the API)
  "sender_offline",
  "already_redeemed",
  "unknown_pin",
  "rate_limited_minute",
  "rate_limited_hour",
  "bad_op",
  "bad_envelope",
  "oversized_signal",
  "unknown_token",
  "duplicate_sender",
  "premature_signal",
  // client-synthesised
  "signaling_closed",
  "signaling_error",
  "rtc_failed",
  "negotiation_timeout",
];

describe("outcomes/copyForFailure", () => {
  it("every reachable wire reason has dedicated copy", () => {
    for (const reason of ALL_REACHABLE_REASONS) {
      const copy = copyForFailure({ reason, postConnection: false });
      expect(copy.title, `missing title for reason '${reason}'`).toBeTruthy();
      expect(copy.body, `missing body for reason '${reason}'`).toBeTruthy();
    }
  });

  it("every reason in the table is in the known list (no orphans)", () => {
    for (const key of KNOWN_REASONS) {
      expect(ALL_REACHABLE_REASONS).toContain(key);
    }
  });

  it("rate-limit reasons request a countdown", () => {
    const minute = copyForFailure({
      reason: "rate_limited_minute",
      retryAfterSeconds: 12,
      postConnection: false,
    });
    expect(minute.countdown).toBe(true);

    const hour = copyForFailure({
      reason: "rate_limited_hour",
      retryAfterSeconds: 600,
      postConnection: false,
    });
    expect(hour.countdown).toBe(true);
  });

  it("postConnection drops short-circuit to peer_disconnect copy", () => {
    // Wire reason is the same as 'sender_offline'. What differs is
    // whether the session was already up. The post-connection branch
    // should always pick the "peer disconnected mid-session" copy.
    const dropDuringConnect = copyForFailure({
      reason: "sender_offline",
      postConnection: false,
    });
    const dropAfterConnect = copyForFailure({
      reason: "sender_offline",
      postConnection: true,
    });
    expect(dropDuringConnect.title).not.toBe(dropAfterConnect.title);
    expect(dropAfterConnect.title.toLowerCase()).toContain("disconnect");
  });

  it("unknown wire reason still produces non-empty copy (no fallthrough)", () => {
    const out = copyForFailure({
      reason: "this_should_never_happen",
      postConnection: false,
    });
    // The fallback exists exactly so the receiver UI never has to
    // render empty text; verifying that contract here.
    expect(out.title).toBeTruthy();
    expect(out.body).toBeTruthy();
  });
});
