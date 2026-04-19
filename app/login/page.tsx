"use client";

import * as React from "react";
import Link from "next/link";
import {
  Wordmark,
  MachineGrid,
  StatusPill,
  ThemeNav,
  useTick
} from "../_components/chrome";

const STEPS: Array<[string, string]> = [
  ["01", "Identity"],
  ["02", "Hardware"],
  ["03", "Payout"],
  ["04", "Install"]
];

const SPECS: Array<[string, string]> = [
  ["CHIP", "Apple M2 Max"],
  ["CORES", "12 cpu · 38 gpu"],
  ["MEMORY", "32 GB unified"],
  ["STORAGE", "178 GB free"],
  ["NETWORK", "↓ 940 / ↑ 412 Mbps"],
  ["REGION", "us-west · Oakland"]
];

const BENCH: Array<[string, string, string, number]> = [
  ["PREFILL", "1,840", "tok/s", 0.82],
  ["DECODE", "   48", "tok/s", 0.64],
  ["LATENCY", "   91", "ms/tok", 0.71],
  ["POWER", "   28", "W draw", 0.45]
];

const EARNINGS_BARS = [
  28, 34, 30, 42, 36, 48, 44, 38, 46, 52, 48, 60, 58, 52, 64, 70, 66, 58, 72,
  78, 74, 68, 82, 90, 84, 78, 88, 96
];

const BREAKDOWN: Array<[string, string, number]> = [
  ["INFERENCE", "$78.20", 62],
  ["EMBEDDINGS", "$28.60", 22],
  ["TRANSCRIBE", "$12.40", 10],
  ["IMAGE GEN", "$ 8.20", 6]
];

const LIVE_MATCHES: Array<[string, string, string, string, string]> = [
  ["22:14:21", "llama3.1-8b", "mbp-oak-04", "+$0.019", "live"],
  ["22:14:18", "bge-small", "rtx-leip-11", "+$0.004", "live"],
  ["22:14:17", "whisper-v3", "m2u-tok-22", "+$0.034", "running"],
  ["22:14:14", "sdxl-turbo", "rtx-aus-07", "+$0.012", "running"],
  ["22:14:12", "e5-large", "mbp-ptl-12", "+$0.007", "live"],
  ["22:14:09", "mistral-7b", "rtx-nyc-19", "+$0.014", "live"],
  ["22:14:05", "flux-schnell", "rtx-aus-07", "+$0.028", "running"],
  ["22:14:02", "parakeet-v1", "m2-air-44", "+$0.006", "live"]
];

export default function Theme0Login() {
  const step = 2;
  const tick = useTick(2200);

  return (
    <div
      className="gpu-root"
      style={{
        width: "100%",
        maxWidth: 1440,
        minHeight: 1024,
        margin: "0 auto",
        background: "var(--paper)",
        display: "flex"
      }}
    >
      {/* ── LEFT — form ── */}
      <div
        style={{
          flex: "1 1 60%",
          padding: "32px 56px",
          display: "flex",
          flexDirection: "column",
          borderRight: "1px solid var(--rule)"
        }}
      >
        {/* header */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between"
          }}
        >
          <Link href="/">
            <Wordmark size={22} />
          </Link>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 16,
              fontSize: 12,
              color: "var(--ink-3)"
            }}
          >
            <span>Already a provider?</span>
            <a
              style={{
                color: "var(--ink)",
                textDecoration: "underline",
                textUnderlineOffset: 3
              }}
            >
              Sign in
            </a>
          </div>
        </div>

        {/* stepper */}
        <div
          style={{
            marginTop: 48,
            display: "flex",
            gap: 0,
            fontFamily: "var(--font-mono)",
            fontSize: 11,
            color: "var(--ink-3)"
          }}
        >
          {STEPS.map(([n, l], i) => {
            const active = i === step - 1;
            const done = i < step - 1;
            return (
              <div
                key={n}
                style={{
                  flex: 1,
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  paddingBottom: 10,
                  borderBottom: `2px solid ${
                    active
                      ? "var(--ink)"
                      : done
                        ? "var(--ink-3)"
                        : "var(--rule-soft)"
                  }`,
                  color: active
                    ? "var(--ink)"
                    : done
                      ? "var(--ink-2)"
                      : "var(--ink-4)"
                }}
              >
                <span>{done ? "✓" : n}</span>
                <span
                  style={{ letterSpacing: 0.06, textTransform: "uppercase" }}
                >
                  {l}
                </span>
              </div>
            );
          })}
        </div>

        {/* headline */}
        <div style={{ marginTop: 56 }}>
          <div className="eyebrow" style={{ marginBottom: 12 }}>
            STEP 02 / 04 · DETECTED HARDWARE
          </div>
          <h1
            style={{
              fontFamily: "var(--font-ui)",
              fontWeight: 500,
              fontSize: 56,
              letterSpacing: -0.035 * 56,
              lineHeight: 1,
              margin: 0
            }}
          >
            We found
            <br />
            <span className="serif" style={{ fontSize: 56 }}>
              one machine
            </span>
            <span style={{ color: "var(--ink-4)" }}> worth listing.</span>
          </h1>
          <p
            style={{
              fontSize: 14,
              color: "var(--ink-3)",
              marginTop: 16,
              maxWidth: 520
            }}
          >
            Confirm the specs, set the hours it can run, and we&apos;ll calibrate
            your throughput against the network.
          </p>
        </div>

        {/* machine card */}
        <div
          style={{
            marginTop: 36,
            border: "1px solid var(--rule)",
            background: "var(--paper-2)",
            borderRadius: 2
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 12,
              padding: "14px 20px",
              borderBottom: "1px solid var(--rule-soft)"
            }}
          >
            <span className="dot live animated" />
            <span
              className="mono"
              style={{
                fontSize: 11,
                color: "var(--ink-3)",
                letterSpacing: 0.08
              }}
            >
              DAEMON · v0.8.4 · connected 00:02:14 ago
            </span>
            <span style={{ marginLeft: "auto" }}>
              <StatusPill state="live">CALIBRATING</StatusPill>
            </span>
          </div>

          <div
            style={{
              padding: "24px 20px",
              display: "grid",
              gridTemplateColumns: "1.2fr 1fr",
              gap: 32
            }}
          >
            {/* specs */}
            <div>
              <div
                style={{
                  display: "flex",
                  alignItems: "baseline",
                  gap: 12,
                  marginBottom: 2
                }}
              >
                <span
                  style={{
                    fontFamily: "var(--font-ui)",
                    fontSize: 24,
                    fontWeight: 500,
                    letterSpacing: -0.02 * 24
                  }}
                >
                  MacBook Pro 16″
                </span>
                <span
                  className="mono"
                  style={{ fontSize: 11, color: "var(--ink-3)" }}
                >
                  host.local
                </span>
              </div>
              <div
                className="mono"
                style={{
                  fontSize: 12,
                  color: "var(--ink-3)",
                  marginBottom: 20
                }}
              >
                machine_id: mac-4A7F9E · fingerprint: c:8a:2f:01
              </div>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  rowGap: 14,
                  columnGap: 24
                }}
              >
                {SPECS.map(([k, v]) => (
                  <div key={k}>
                    <div
                      className="mono"
                      style={{
                        fontSize: 10,
                        color: "var(--ink-4)",
                        letterSpacing: 0.08
                      }}
                    >
                      {k}
                    </div>
                    <div
                      style={{
                        fontSize: 14,
                        color: "var(--ink)",
                        marginTop: 2
                      }}
                    >
                      {v}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* benchmark */}
            <div
              style={{
                borderLeft: "1px solid var(--rule-soft)",
                paddingLeft: 24
              }}
            >
              <div
                className="mono"
                style={{
                  fontSize: 10,
                  color: "var(--ink-3)",
                  letterSpacing: 0.08,
                  marginBottom: 12
                }}
              >
                BENCHMARK · llama-3.1-8b-q4
              </div>

              {BENCH.map(([k, v, u, p]) => (
                <div key={k} style={{ marginBottom: 10 }}>
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "baseline",
                      marginBottom: 3
                    }}
                  >
                    <span
                      className="mono"
                      style={{ fontSize: 10, color: "var(--ink-3)" }}
                    >
                      {k}
                    </span>
                    <span
                      style={{
                        fontFamily: "var(--font-mono)",
                        fontSize: 12
                      }}
                    >
                      {v}
                      <span
                        style={{ color: "var(--ink-4)", marginLeft: 4 }}
                      >
                        {u}
                      </span>
                    </span>
                  </div>
                  <div
                    style={{
                      height: 4,
                      background: "var(--paper-3)",
                      position: "relative",
                      overflow: "hidden"
                    }}
                  >
                    <div
                      style={{
                        height: "100%",
                        width: `${p * 100}%`,
                        background:
                          p > 0.7 ? "var(--live)" : "var(--ink-2)"
                      }}
                    />
                  </div>
                </div>
              ))}
              <div
                className="mono"
                style={{
                  fontSize: 10,
                  color: "var(--ink-4)",
                  marginTop: 6
                }}
              >
                percentile vs. M2 Max fleet · n=312
              </div>
            </div>
          </div>

          {/* availability schedule */}
          <div
            style={{
              borderTop: "1px solid var(--rule-soft)",
              padding: 20,
              background: "var(--paper)"
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: 12
              }}
            >
              <div className="eyebrow">Availability schedule</div>
              <div style={{ display: "flex", gap: 6 }}>
                {["24/7", "Nights", "Custom"].map((x, i) => (
                  <span
                    key={x}
                    style={{
                      padding: "4px 10px",
                      border: "1px solid var(--rule)",
                      fontSize: 11,
                      fontFamily: "var(--font-mono)",
                      background:
                        i === 1 ? "var(--ink)" : "var(--paper)",
                      color: i === 1 ? "var(--paper)" : "var(--ink-2)",
                      cursor: "pointer",
                      borderRadius: 2
                    }}
                  >
                    {x}
                  </span>
                ))}
              </div>
            </div>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "32px repeat(24, 1fr)",
                gap: 2,
                alignItems: "center"
              }}
            >
              <span />
              {Array.from({ length: 24 }).map((_, h) => (
                <span
                  key={h}
                  className="mono"
                  style={{
                    fontSize: 9,
                    color: "var(--ink-4)",
                    textAlign: "center"
                  }}
                >
                  {h % 3 === 0 ? h : ""}
                </span>
              ))}
              {["M", "T", "W", "T", "F", "S", "S"].map((d, di) => (
                <React.Fragment key={`${d}-${di}`}>
                  <span
                    className="mono"
                    style={{ fontSize: 10, color: "var(--ink-3)" }}
                  >
                    {d}
                  </span>
                  {Array.from({ length: 24 }).map((_, h) => {
                    const on = h < 8 || h >= 22;
                    const light = h >= 8 && h <= 10;
                    return (
                      <div
                        key={h}
                        style={{
                          height: 10,
                          background: on
                            ? "var(--live)"
                            : light
                              ? "var(--paper-3)"
                              : "var(--paper-2)",
                          border: "1px solid var(--rule-soft)"
                        }}
                      />
                    );
                  })}
                </React.Fragment>
              ))}
            </div>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                marginTop: 10,
                fontFamily: "var(--font-mono)",
                fontSize: 10,
                color: "var(--ink-3)"
              }}
            >
              <span>Earning window: 22:00 — 08:00 local · 70 hrs/wk</span>
              <span>
                <span className="dot live" style={{ marginRight: 4 }} />
                available&nbsp;&nbsp;
                <span className="dot idle" style={{ marginRight: 4 }} />
                paused
              </span>
            </div>
          </div>
        </div>

        {/* actions */}
        <div
          style={{
            marginTop: "auto",
            paddingTop: 32,
            display: "flex",
            alignItems: "center",
            gap: 12
          }}
        >
          <button
            style={{
              padding: "12px 18px",
              border: "1px solid var(--rule)",
              background: "transparent",
              color: "var(--ink-2)",
              fontSize: 13,
              borderRadius: 2,
              cursor: "pointer"
            }}
          >
            ← Identity
          </button>
          <span
            style={{ marginLeft: 16, fontSize: 12, color: "var(--ink-3)" }}
          >
            By continuing you agree to our{" "}
            <a style={{ textDecoration: "underline" }}>Provider Terms</a>.
          </span>
          <Link
            href="/dashboard"
            style={{
              marginLeft: "auto",
              padding: "12px 20px",
              background: "var(--ink)",
              color: "var(--paper)",
              fontSize: 13,
              fontWeight: 500,
              borderRadius: 2,
              display: "inline-flex",
              alignItems: "center",
              gap: 10
            }}
          >
            Confirm hardware · continue to payout
            <span style={{ opacity: 0.5 }}>→</span>
          </Link>
        </div>
      </div>

      {/* ── RIGHT — live rail ── */}
      <div
        style={{
          flex: "0 0 460px",
          background: "var(--ink)",
          color: "var(--paper)",
          padding: "32px 32px",
          display: "flex",
          flexDirection: "column",
          gap: 24
        }}
      >
        {/* projected earnings */}
        <div>
          <div
            className="eyebrow"
            style={{ color: "rgba(244,241,234,0.5)", marginBottom: 8 }}
          >
            PROJECTED EARNINGS
          </div>
          <div style={{ display: "flex", alignItems: "baseline", gap: 10 }}>
            <span
              style={{
                fontFamily: "var(--font-ui)",
                fontSize: 68,
                fontWeight: 500,
                letterSpacing: -0.04 * 68,
                lineHeight: 0.9
              }}
            >
              $127
            </span>
            <span style={{ fontSize: 24, color: "rgba(244,241,234,0.5)" }}>
              .40
            </span>
            <span
              className="mono"
              style={{
                fontSize: 11,
                color: "rgba(244,241,234,0.5)",
                marginLeft: 8
              }}
            >
              / month
            </span>
          </div>
          <div style={{ marginTop: 6 }} className="mono">
            <span style={{ fontSize: 11, color: "var(--live)" }}>
              ±$18 confidence
            </span>
            <span
              style={{
                fontSize: 11,
                color: "rgba(244,241,234,0.5)",
                marginLeft: 10
              }}
            >
              · 30d rolling demand · 18% platform fee
            </span>
          </div>

          {/* stacked bars */}
          <div style={{ marginTop: 20 }}>
            <div
              style={{
                display: "flex",
                gap: 2,
                height: 40,
                alignItems: "flex-end"
              }}
            >
              {EARNINGS_BARS.map((h, i) => (
                <div
                  key={i}
                  style={{
                    flex: 1,
                    height: `${h}%`,
                    background:
                      i >= 14 ? "var(--live)" : "rgba(244,241,234,0.25)"
                  }}
                />
              ))}
            </div>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                marginTop: 6,
                fontFamily: "var(--font-mono)",
                fontSize: 10,
                color: "rgba(244,241,234,0.5)"
              }}
            >
              <span>Feb 14</span>
              <span>projected today →</span>
              <span>Mar 14</span>
            </div>
          </div>

          {/* breakdown */}
          <div
            style={{
              marginTop: 20,
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: 14
            }}
          >
            {BREAKDOWN.map(([k, v, p]) => (
              <div key={k}>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    fontFamily: "var(--font-mono)",
                    fontSize: 11
                  }}
                >
                  <span style={{ color: "rgba(244,241,234,0.55)" }}>{k}</span>
                  <span>{v}</span>
                </div>
                <div
                  style={{
                    height: 2,
                    background: "rgba(244,241,234,0.15)",
                    marginTop: 4
                  }}
                >
                  <div
                    style={{
                      height: "100%",
                      width: `${p}%`,
                      background: "var(--live)"
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div
          style={{ height: 1, background: "rgba(244,241,234,0.15)" }}
        />

        {/* network */}
        <div>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: 12
            }}
          >
            <div
              className="eyebrow"
              style={{ color: "rgba(244,241,234,0.5)" }}
            >
              <span
                className="dot live animated"
                style={{ marginRight: 8 }}
              />
              NETWORK · us-west
            </div>
            <span
              className="mono"
              style={{
                fontSize: 10,
                color: "rgba(244,241,234,0.5)"
              }}
            >
              tick {String(tick).padStart(3, "0")}
            </span>
          </div>
          <MachineGrid
            rows={6}
            cols={28}
            seed={tick + 7}
            running={0.18}
            warming={0.05}
            live={0.42}
            inv
          />
          <div
            style={{
              marginTop: 12,
              display: "flex",
              justifyContent: "space-between",
              fontFamily: "var(--font-mono)",
              fontSize: 10,
              color: "rgba(244,241,234,0.55)"
            }}
          >
            <span>
              <span className="dot live" /> 168 live
            </span>
            <span>
              <span className="dot running" /> 70 running
            </span>
            <span>
              <span className="dot warming" /> 18 warming
            </span>
            <span>
              <span className="dot idle" /> 47 idle
            </span>
          </div>
        </div>

        {/* log */}
        <div style={{ flex: 1, overflow: "hidden" }}>
          <div
            className="eyebrow"
            style={{
              color: "rgba(244,241,234,0.5)",
              marginBottom: 10
            }}
          >
            LIVE MATCHES
          </div>
          <div
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: 11,
              lineHeight: 1.8
            }}
          >
            {LIVE_MATCHES.map((r, i) => (
              <div
                key={i}
                style={{
                  display: "grid",
                  gridTemplateColumns: "60px 1fr 90px 60px 18px",
                  gap: 8,
                  alignItems: "center",
                  opacity: 1 - i * 0.05,
                  borderBottom: "1px dashed rgba(244,241,234,0.06)",
                  paddingTop: 2,
                  paddingBottom: 2
                }}
              >
                <span style={{ color: "rgba(244,241,234,0.5)" }}>
                  {r[0]}
                </span>
                <span>{r[1]}</span>
                <span style={{ color: "rgba(244,241,234,0.6)" }}>
                  → {r[2]}
                </span>
                <span style={{ color: "var(--live)", textAlign: "right" }}>
                  {r[3]}
                </span>
                <span>
                  <span className={`dot ${r[4]}`} />
                </span>
              </div>
            ))}
          </div>
        </div>

        <div
          style={{
            marginTop: "auto",
            paddingTop: 16,
            borderTop: "1px solid rgba(244,241,234,0.15)",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            fontFamily: "var(--font-mono)",
            fontSize: 10,
            color: "rgba(244,241,234,0.5)"
          }}
        >
          <span>SOC 2 · sandbox-signed · encrypted at rest</span>
          <span>v0.8.4 · wss://edge-sfo.gpubnb</span>
        </div>
      </div>

      <ThemeNav page="login" />
    </div>
  );
}
