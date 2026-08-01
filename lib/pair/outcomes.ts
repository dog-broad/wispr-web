// Map every reachable wire failure reason to the user-facing copy from
// PROJECT.md §7.6.7. The spec's contract is "no generic-error
// fallthrough": every branch the receiver can land on has its own
// titled paragraph.
//
// Reasons fall in two groups:
//
//   server-originated (from {op:pair_failed, reason}): unknown_pin,
//     sender_offline, already_redeemed, rate_limited_minute,
//     rate_limited_hour, bad_op, bad_envelope, oversized_signal,
//     unknown_token, duplicate_sender, premature_signal.
//
//   client-synthesised by PairSession when transport / RTC fails:
//     signaling_closed, signaling_error, peer_disconnected, rtc_failed,
//     negotiation_timeout.
//
// Mode 2 outcomes (§7.6.7 #1–#7) ship with PIN-share in the next
// milestone and aren't reachable from the current code; they're not
// included here.

import type { PairFailure } from "./session";

export interface OutcomeCopy {
  /** Short bolded title in the connect banner. */
  title: string;
  /** Plain-English explanation underneath. */
  body: string;
  /** Suggested action label (e.g. for a retry button). Empty if no
   *  action makes sense (e.g. the user has to wait for the rate-limit
   *  countdown). */
  action?: string;
  /** When true, the banner should render a live countdown driven by
   *  ``failure.retryAfterSeconds``. */
  countdown?: boolean;
}

export function copyForFailure(failure: PairFailure): OutcomeCopy {
  // The post-connection variant of a peer drop and the
  // never-connected-at-all variants of the same wire reason want
  // different copy. Handle peer_disconnected up front so we can fall
  // through to the more specific lookups below.
  if (failure.postConnection) {
    return {
      title: "The other side disconnected.",
      body:
        "Connection ended. Open a fresh PIN if you want to keep pairing.",
      action: "start over",
    };
  }
  return SERVER_REASONS[failure.reason] ?? GENERIC_FALLBACK;
}

// One entry per reachable wire reason. The keys are deliberately the
// raw strings from PairFailReason / synthesised reasons so a wire-level
// trace points straight at the right copy.
const SERVER_REASONS: Record<string, OutcomeCopy> = {
  // §7.6.7 #9 — server has the pair record but no sender WS attached.
  sender_offline: {
    title: "The other side went offline.",
    body: "Ask them to start a new pair.",
    action: "start over",
  },
  // §7.6.7 #10 — single-use PIN already claimed.
  already_redeemed: {
    title: "This pair was already claimed.",
    body: "Ask the sender for a new PIN.",
    action: "start over",
  },
  // §7.6.7 #11 / #12 collapse on the server (Redis TTL of 60s makes
  // expired and never-existed indistinguishable). The copy nods at
  // both possibilities so the user has the right next-step regardless.
  unknown_pin: {
    title: "No share with this PIN.",
    body: "It may have expired (PINs only live ~60s) or never existed.",
    action: "try again",
  },
  // §7.6.7 #13 — five attempts in the last minute.
  rate_limited_minute: {
    title: "Too many tries.",
    body: "Wait a few seconds before trying again.",
    countdown: true,
  },
  // §7.6.7 #14 — thirty attempts in the last hour.
  rate_limited_hour: {
    title: "Too many tries today.",
    body: "Take a longer break before trying again.",
    countdown: true,
  },
  // §7.6.7 #17 — connection to the relay dropped before the pair was
  // established. Lump the WebSocket-level error cases here; the user
  // doesn't need to distinguish "the server hung up" from "the
  // transport errored". The action is the same.
  signaling_closed: {
    title: "Couldn't reach Wispr.",
    body: "Check your connection and try again.",
    action: "retry",
  },
  signaling_error: {
    title: "Couldn't reach Wispr.",
    body: "Check your connection and try again.",
    action: "retry",
  },
  // §7.6.7 #19 — ICE failed, no relay reachable, restrictive NAT, etc.
  rtc_failed: {
    title: "Couldn't establish a direct connection.",
    body:
      "The two devices couldn't see each other. Try a new pair, or have one side switch networks.",
    action: "start over",
  },
  // Synthesised by the session's 15s watchdog when neither ICE nor the
  // data channel converges. Same UX as rtc_failed: the user can't tell
  // the difference and the action is the same.
  negotiation_timeout: {
    title: "Couldn't establish a direct connection.",
    body:
      "Timed out bringing the channel up. Try a new pair, or switch networks.",
    action: "start over",
  },
  // Protocol-level reasons that should never reach a normal user. Map
  // them to a uniform "something broke" copy so the receiver still
  // shows specific text instead of falling through to a generic error.
  bad_op: { ...PROTOCOL_ERROR_COPY("bad_op") },
  bad_envelope: { ...PROTOCOL_ERROR_COPY("bad_envelope") },
  oversized_signal: { ...PROTOCOL_ERROR_COPY("oversized_signal") },
  unknown_token: { ...PROTOCOL_ERROR_COPY("unknown_token") },
  duplicate_sender: {
    title: "This PIN already has a sender.",
    body: "Refresh the page and try again.",
    action: "retry",
  },
  premature_signal: { ...PROTOCOL_ERROR_COPY("premature_signal") },
};

// Last-line copy for reasons that aren't in the table. The §7.6.7
// "no generic-error fallthrough" rule still applies. This exists to
// catch additions that haven't been wired into the table yet, with
// language that nudges the operator to file a real outcome. It should
// never reach production.
const GENERIC_FALLBACK: OutcomeCopy = {
  title: "Something went wrong.",
  body: "An unexpected condition prevented pairing. Refresh and try again.",
  action: "retry",
};

function PROTOCOL_ERROR_COPY(detail: string): OutcomeCopy {
  return {
    title: "Protocol error.",
    body: `The client and server disagreed (${detail}). Refresh and try again.`,
    action: "retry",
  };
}

/** Exported for tests — every wire reason the lib can emit must be in
 *  the table above. */
export const KNOWN_REASONS = Object.freeze(Object.keys(SERVER_REASONS));
