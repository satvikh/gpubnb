"use client";

import * as React from "react";
import Link from "next/link";
import {
  Wordmark,
  MachineGrid,
  Sparkline,
  ThemeNav,
  useTick
} from "./_components/chrome";

const NAV_ITEMS = ["How it works", "For providers", "For developers", "Pricing", "Docs"];

const RECENT_MATCHES: Array<[string, string, string, string]> = [
  ["22:14:08", "llama-3.1-8b · 412 tok", "mbp-oakland-04", "$0.019"],
  ["22:14:06", "whisper-v3 · 3m audio", "rtx-3090-leipzig", "$0.034"],
  ["22:14:03", "sdxl-turbo · 1024px", "m2-ultra-tokyo", "$0.012"],
  ["22:13:59", "embed-3 · 1.2k docs", "mbp-portland-12", "$0.007"]
];

const LEADERBOARD: Array<[string, string, string, string, string, number]> = [
  ["01", "rtx-4090-austin-07", "RTX 4090 · 24G", "98.1%", "4,812", 847.2],
  ["02", "m2-ultra-tokyo-22", "M2 Ultra · 192G", "94.7%", "3,120", 612.4],
  ["03", "rtx-3090-leipzig-11", "RTX 3090 · 24G", "91.3%", "2,944", 428.1],
  ["04", "mbp-oakland-04", "M2 Max · 32G", "87.8%", "1,820", 284.6],
  ["05", "rtx-4070-sf-33", "RTX 4070 · 12G", "82.4%", "1,447", 198.3],
  ["06", "mbp-portland-12", "M1 Pro · 16G", "76.2%", "1,109", 142.85],
  ["07", "rtx-3080-nyc-19", "RTX 3080 · 10G", "71.9%", "   918", 117.4],
  ["08", "m2-air-austin-44", "M2 · 16G", "68.1%", "   712", 74.2]
];

const WORKLOADS: Array<{
  t: string;
  sub: string;
  min: string;
  max: string;
}> = [
  { t: "Inference", sub: "llama · mistral · qwen", min: "$0.003", max: "/ 1k tok" },
  { t: "Embeddings", sub: "bge · e5 · nomic", min: "$0.001", max: "/ 1k tok" },
  { t: "Transcribe", sub: "whisper · parakeet", min: "$0.008", max: "/ min" },
  { t: "Image gen", sub: "sdxl-turbo · flux-s", min: "$0.012", max: "/ image" }
];

const PROVIDER_POINTS: Array<[string, string]> = [
  ["Sandboxed.", "Jobs run in a signed container, never touch your files."],
  [
    "Throttled.",
    "Capped to spare CPU cycles. Pauses when you open a heavy app."
  ],
  [
    "Private.",
    "All inputs encrypted in transit and at rest. Zero training on your data."
  ],
  ["Paid daily.", "ACH, Wise, USDC. No minimum payout threshold."]
];

export default function Theme0Landing() {
  const tick = useTick(2400);

  return (
    <div
      className="gpu-root"
      style={{
        width: "100%",
        maxWidth: 1440,
        margin: "0 auto",
        minHeight: 3200,
        background: "var(--paper)"
      }}
    >
      {/* ── top marquee ── */}
      <div
        style={{
          borderBottom: "1px solid var(--rule)",
          background: "var(--ink)",
          color: "var(--paper)",
          padding: "7px 32px",
          display: "flex",
          alignItems: "center",
          gap: 24,
          fontFamily: "var(--font-mono)",
          fontSize: 11,
          letterSpacing: 0.02,
          overflow: "hidden",
          position: "relative"
        }}
      >
        <span style={{ color: "var(--live)" }}>● LIVE</span>
        <span>2,847 machines online</span>
        <span style={{ opacity: 0.4 }}>{"//"}</span>
        <span>412 jobs running</span>
        <span style={{ opacity: 0.4 }}>{"//"}</span>
        <span>$18,402 paid to providers this week</span>
        <span style={{ opacity: 0.4 }}>{"//"}</span>
        <span>Avg. wait 2.1s</span>
        <span style={{ marginLeft: "auto", opacity: 0.6 }}>
          network status: nominal
        </span>
      </div>

      {/* ── nav ── */}
      <div
        style={{
          padding: "18px 32px",
          display: "flex",
          alignItems: "center",
          borderBottom: "1px solid var(--rule-soft)"
        }}
      >
        <Wordmark size={22} />
        <div
          style={{
            marginLeft: 48,
            display: "flex",
            gap: 28,
            fontSize: 13,
            color: "var(--ink-2)"
          }}
        >
          {NAV_ITEMS.map((item) => (
            <a key={item}>{item}</a>
          ))}
        </div>
        <div
          style={{
            marginLeft: "auto",
            display: "flex",
            alignItems: "center",
            gap: 12,
            fontSize: 13
          }}
        >
          <Link href="/login" style={{ color: "var(--ink-2)" }}>
            Sign in
          </Link>
          <Link
            href="/login"
            style={{
              padding: "9px 16px",
              border: "none",
              background: "var(--ink)",
              color: "var(--paper)",
              fontFamily: "var(--font-ui)",
              fontSize: 13,
              fontWeight: 500,
              borderRadius: 2
            }}
          >
            Start earning →
          </Link>
        </div>
      </div>

      {/* ── hero ── */}
      <div
        style={{ padding: "64px 32px 48px", borderBottom: "1px solid var(--rule)" }}
      >
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1.15fr 1fr",
            gap: 64,
            alignItems: "end"
          }}
        >
          <div>
            <div className="eyebrow" style={{ marginBottom: 24 }}>
              <span
                className="dot live animated"
                style={{ marginRight: 8 }}
              />
              GPU marketplace · est. 2025 · SF / Remote
            </div>
            <h1
              style={{
                fontFamily: "var(--font-ui)",
                fontWeight: 500,
                fontSize: 96,
                lineHeight: 0.95,
                letterSpacing: -0.04 * 96,
                margin: 0,
                color: "var(--ink)"
              }}
            >
              Your laptop is
              <br />
              <span
                className="serif"
                style={{ fontSize: 96, letterSpacing: -0.02 * 96 }}
              >
                idle 71%
              </span>{" "}
              of the day.
            </h1>
            <h2
              style={{
                fontFamily: "var(--font-ui)",
                fontWeight: 400,
                fontSize: 28,
                lineHeight: 1.25,
                letterSpacing: -0.015 * 28,
                margin: "28px 0 0",
                color: "var(--ink-3)",
                maxWidth: 640
              }}
            >
              GPUbnb rents out that idle compute for lightweight AI jobs — and
              pays you every time it runs.
            </h2>

            <div style={{ display: "flex", gap: 12, marginTop: 40, alignItems: "center" }}>
              <Link
                href="/login"
                style={{
                  padding: "14px 22px",
                  background: "var(--ink)",
                  color: "var(--paper)",
                  fontSize: 14,
                  fontWeight: 500,
                  borderRadius: 2,
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 10
                }}
              >
                List your machine
                <span className="mono" style={{ opacity: 0.55, fontSize: 11 }}>
                  ⌘ L
                </span>
              </Link>
              <button
                style={{
                  padding: "14px 22px",
                  border: "1px solid var(--rule)",
                  background: "transparent",
                  color: "var(--ink)",
                  fontFamily: "var(--font-ui)",
                  fontSize: 14,
                  fontWeight: 500,
                  borderRadius: 2,
                  cursor: "pointer"
                }}
              >
                Submit a job
              </button>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  marginLeft: 8,
                  fontSize: 12,
                  color: "var(--ink-3)"
                }}
              >
                <span className="mono">or</span>
                <code className="kbd">curl -s gpubnb.sh | sh</code>
              </div>
            </div>

            {/* estimator */}
            <div
              style={{
                marginTop: 48,
                border: "1px solid var(--rule)",
                background: "var(--paper-2)",
                padding: 20,
                borderRadius: 2,
                display: "grid",
                gridTemplateColumns: "auto 1fr auto",
                gap: 20,
                alignItems: "center"
              }}
            >
              <div>
                <div className="eyebrow" style={{ marginBottom: 4 }}>
                  Estimator
                </div>
                <div style={{ fontSize: 13, color: "var(--ink-3)" }}>
                  M2 Max · 32GB · 12h/day idle
                </div>
              </div>
              <div
                style={{
                  borderLeft: "1px solid var(--rule-soft)",
                  paddingLeft: 20
                }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "baseline",
                    gap: 10
                  }}
                >
                  <span
                    className="mono"
                    style={{ fontSize: 11, color: "var(--ink-3)" }}
                  >
                    EST. MONTHLY
                  </span>
                  <span
                    style={{
                      fontFamily: "var(--font-ui)",
                      fontSize: 38,
                      fontWeight: 500,
                      letterSpacing: -0.03 * 38
                    }}
                  >
                    $127
                    <span style={{ color: "var(--ink-4)" }}>.40</span>
                  </span>
                  <span
                    className="mono"
                    style={{ fontSize: 11, color: "var(--ink-3)" }}
                  >
                    ± $18
                  </span>
                </div>
                <div
                  className="mono"
                  style={{
                    fontSize: 11,
                    color: "var(--ink-3)",
                    marginTop: 2
                  }}
                >
                  based on last 30d network demand · 18% of earnings to platform
                </div>
              </div>
              <a
                style={{
                  fontSize: 13,
                  color: "var(--ink)",
                  textDecoration: "underline",
                  textUnderlineOffset: 3
                }}
              >
                Tune →
              </a>
            </div>
          </div>

          {/* right — live network panel */}
          <div
            style={{
              border: "1px solid var(--rule)",
              background: "var(--ink)",
              color: "var(--paper)",
              padding: 24,
              borderRadius: 2
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: 16
              }}
            >
              <div
                className="eyebrow"
                style={{ color: "rgba(244,241,234,0.6)" }}
              >
                <span
                  className="dot live animated"
                  style={{ marginRight: 8 }}
                />
                Network · last 60s
              </div>
              <span
                className="mono"
                style={{ fontSize: 10, opacity: 0.5 }}
              >
                us-west · eu-w · ap-se
              </span>
            </div>
            <MachineGrid
              rows={14}
              cols={32}
              seed={tick + 3}
              running={0.14}
              warming={0.05}
              live={0.38}
              inv
            />
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(4, 1fr)",
                gap: 16,
                marginTop: 20,
                paddingTop: 20,
                borderTop: "1px solid rgba(244,241,234,0.12)"
              }}
            >
              {[
                { k: "ONLINE", v: "2,847", sub: "machines" },
                { k: "RUNNING", v: "412", sub: "jobs" },
                { k: "QUEUED", v: "38", sub: "jobs" },
                { k: "THRUPUT", v: "1.4k", sub: "tok/s avg" }
              ].map((s) => (
                <div key={s.k}>
                  <div
                    className="mono"
                    style={{
                      fontSize: 10,
                      opacity: 0.5,
                      letterSpacing: 0.08
                    }}
                  >
                    {s.k}
                  </div>
                  <div
                    style={{
                      fontFamily: "var(--font-ui)",
                      fontSize: 24,
                      fontWeight: 500,
                      letterSpacing: -0.02 * 24,
                      marginTop: 2
                    }}
                  >
                    {s.v}
                  </div>
                  <div
                    className="mono"
                    style={{ fontSize: 10, opacity: 0.5 }}
                  >
                    {s.sub}
                  </div>
                </div>
              ))}
            </div>
            <div
              style={{
                marginTop: 18,
                paddingTop: 18,
                borderTop: "1px solid rgba(244,241,234,0.12)"
              }}
            >
              <div
                className="mono"
                style={{
                  fontSize: 10,
                  opacity: 0.5,
                  letterSpacing: 0.08,
                  marginBottom: 8
                }}
              >
                RECENT MATCHES
              </div>
              {RECENT_MATCHES.map((r, i) => (
                <div
                  key={i}
                  style={{
                    display: "grid",
                    gridTemplateColumns: "70px 1fr 1fr 60px",
                    fontFamily: "var(--font-mono)",
                    fontSize: 11,
                    padding: "4px 0",
                    color: "rgba(244,241,234,0.85)",
                    borderBottom:
                      i < 3
                        ? "1px dashed rgba(244,241,234,0.08)"
                        : "none"
                  }}
                >
                  <span style={{ opacity: 0.5 }}>{r[0]}</span>
                  <span>{r[1]}</span>
                  <span style={{ opacity: 0.7 }}>→ {r[2]}</span>
                  <span
                    style={{ color: "var(--live)", textAlign: "right" }}
                  >
                    {r[3]}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ── how it works ── */}
      <div
        style={{ padding: "80px 32px", borderBottom: "1px solid var(--rule)" }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "end",
            marginBottom: 48
          }}
        >
          <div>
            <div className="eyebrow" style={{ marginBottom: 8 }}>
              § 01 · How it works
            </div>
            <h3
              style={{
                fontFamily: "var(--font-ui)",
                fontWeight: 500,
                fontSize: 48,
                letterSpacing: -0.035 * 48,
                margin: 0,
                lineHeight: 1
              }}
            >
              One sided marketplace,
              <br />
              <span className="serif" style={{ fontSize: 48 }}>
                two sided
              </span>{" "}
              economy.
            </h3>
          </div>
          <div
            style={{
              fontSize: 13,
              color: "var(--ink-3)",
              maxWidth: 320,
              textAlign: "right"
            }}
          >
            Providers install a 4MB daemon. Jobs route via encrypted tunnel.
            Payouts settle daily to bank or wallet.
          </div>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(3, 1fr)",
            gap: 1,
            background: "var(--rule)",
            border: "1px solid var(--rule)"
          }}
        >
          <StepCard
            n="01"
            title="Submit"
            mono="POST /v1/jobs"
            body="A developer posts a job: model, inputs, budget ceiling, latency window. Jobs are priced in sub-cent units, billed per-token or per-second."
            demo={<SubmitDemo />}
          />
          <StepCard
            n="02"
            title="Match"
            mono="scheduler.match()"
            body="The scheduler matches jobs to machines by fit — VRAM, bandwidth, region, reputation. Matches settle in under two seconds."
            demo={<MatchDemo />}
          />
          <StepCard
            n="03"
            title="Earn"
            mono="payout.daily()"
            body="Provider machine runs the job locally, streams results back. Earnings accrue in real time. Payouts every 24 hours."
            demo={<EarnDemo />}
          />
        </div>
      </div>

      {/* ── provider strip ── */}
      <div
        style={{
          padding: "80px 32px",
          borderBottom: "1px solid var(--rule)",
          background: "var(--paper-2)"
        }}
      >
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1.4fr",
            gap: 80
          }}
        >
          <div>
            <div className="eyebrow" style={{ marginBottom: 8 }}>
              § 02 · For providers
            </div>
            <h3
              style={{
                fontFamily: "var(--font-ui)",
                fontWeight: 500,
                fontSize: 56,
                letterSpacing: -0.035 * 56,
                margin: 0,
                lineHeight: 0.98
              }}
            >
              Turn the machine
              <br />
              you already own
              <br />
              <span className="serif" style={{ fontSize: 56 }}>
                into a line item.
              </span>
            </h3>
            <ul
              style={{
                marginTop: 36,
                padding: 0,
                listStyle: "none",
                fontSize: 15,
                lineHeight: 1.8,
                color: "var(--ink-2)"
              }}
            >
              {PROVIDER_POINTS.map(([t, d], i) => (
                <li
                  key={i}
                  style={{
                    display: "grid",
                    gridTemplateColumns: "auto 1fr",
                    gap: 14,
                    paddingBottom: 10,
                    borderBottom:
                      i < 3 ? "1px dashed var(--rule-soft)" : "none",
                    marginBottom: 10
                  }}
                >
                  <span
                    style={{
                      fontWeight: 600,
                      color: "var(--ink)",
                      minWidth: 80
                    }}
                  >
                    {t}
                  </span>
                  <span>{d}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* earnings leaderboard */}
          <div
            style={{
              border: "1px solid var(--rule)",
              background: "var(--paper)",
              padding: 24,
              borderRadius: 2
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: 16
              }}
            >
              <div className="eyebrow">Top earners · last 30d</div>
              <span
                className="mono"
                style={{ fontSize: 10, color: "var(--ink-3)" }}
              >
                anonymized · opt-in
              </span>
            </div>
            <div style={{ fontFamily: "var(--font-mono)", fontSize: 12 }}>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "32px 1fr 110px 110px 140px",
                  padding: "8px 0",
                  borderBottom: "1px solid var(--rule)",
                  fontSize: 10,
                  color: "var(--ink-3)",
                  letterSpacing: 0.06,
                  textTransform: "uppercase"
                }}
              >
                <span>#</span>
                <span>Machine</span>
                <span>Uptime</span>
                <span>Jobs</span>
                <span style={{ textAlign: "right" }}>Earnings</span>
              </div>
              {LEADERBOARD.map((r, i) => (
                <div
                  key={i}
                  style={{
                    display: "grid",
                    gridTemplateColumns: "32px 1fr 110px 110px 140px",
                    padding: "10px 0",
                    borderBottom:
                      i < 7 ? "1px dashed var(--rule-soft)" : "none",
                    alignItems: "center"
                  }}
                >
                  <span style={{ color: "var(--ink-4)" }}>{r[0]}</span>
                  <span>
                    <div style={{ color: "var(--ink)" }}>{r[1]}</div>
                    <div style={{ fontSize: 10, color: "var(--ink-3)" }}>
                      {r[2]}
                    </div>
                  </span>
                  <span>{r[3]}</span>
                  <span>{r[4]}</span>
                  <span style={{ textAlign: "right" }}>
                    <span
                      style={{
                        fontFamily: "var(--font-ui)",
                        fontSize: 15,
                        fontWeight: 500
                      }}
                    >
                      ${r[5].toFixed(2)}
                    </span>
                  </span>
                </div>
              ))}
            </div>
            <div
              style={{
                marginTop: 14,
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center"
              }}
            >
              <span
                className="mono"
                style={{ fontSize: 10, color: "var(--ink-3)" }}
              >
                median: $182.40 · p95: $612.40
              </span>
              <a
                style={{
                  fontSize: 12,
                  textDecoration: "underline",
                  textUnderlineOffset: 3
                }}
              >
                See full methodology →
              </a>
            </div>
          </div>
        </div>
      </div>

      {/* ── workloads ── */}
      <div
        style={{ padding: "80px 32px", borderBottom: "1px solid var(--rule)" }}
      >
        <div style={{ marginBottom: 40 }}>
          <div className="eyebrow" style={{ marginBottom: 8 }}>
            § 03 · Workloads
          </div>
          <h3
            style={{
              fontFamily: "var(--font-ui)",
              fontWeight: 500,
              fontSize: 48,
              letterSpacing: -0.035 * 48,
              margin: 0,
              lineHeight: 1,
              maxWidth: 900
            }}
          >
            Built for the jobs that{" "}
            <span className="serif" style={{ fontSize: 48 }}>
              don&apos;t need
            </span>{" "}
            a data center.
          </h3>
        </div>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(4, 1fr)",
            gap: 1,
            background: "var(--rule)",
            border: "1px solid var(--rule)"
          }}
        >
          {WORKLOADS.map((w, i) => (
            <div
              key={i}
              style={{ background: "var(--paper)", padding: 28 }}
            >
              <div
                className="mono"
                style={{
                  fontSize: 10,
                  color: "var(--ink-3)",
                  letterSpacing: 0.08
                }}
              >
                WORKLOAD / 0{i + 1}
              </div>
              <div
                style={{
                  fontFamily: "var(--font-ui)",
                  fontSize: 28,
                  fontWeight: 500,
                  letterSpacing: -0.03 * 28,
                  marginTop: 24
                }}
              >
                {w.t}
              </div>
              <div
                className="mono"
                style={{
                  fontSize: 11,
                  color: "var(--ink-3)",
                  marginTop: 4
                }}
              >
                {w.sub}
              </div>
              <div
                style={{
                  marginTop: 32,
                  paddingTop: 16,
                  borderTop: "1px dashed var(--rule-soft)",
                  display: "flex",
                  alignItems: "baseline",
                  gap: 6
                }}
              >
                <span
                  style={{
                    fontFamily: "var(--font-ui)",
                    fontSize: 24,
                    fontWeight: 500
                  }}
                >
                  {w.min}
                </span>
                <span
                  className="mono"
                  style={{ fontSize: 11, color: "var(--ink-3)" }}
                >
                  {w.max}
                </span>
              </div>
              <div
                className="mono"
                style={{
                  fontSize: 10,
                  color: "var(--ink-4)",
                  marginTop: 4
                }}
              >
                market floor · spot
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── testimonial ── */}
      <div
        style={{
          padding: "96px 32px",
          borderBottom: "1px solid var(--rule)",
          background: "var(--ink)",
          color: "var(--paper)"
        }}
      >
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr auto",
            gap: 64,
            alignItems: "end"
          }}
        >
          <div>
            <div
              className="eyebrow"
              style={{
                color: "rgba(244,241,234,0.5)",
                marginBottom: 24
              }}
            >
              § 04 · In practice
            </div>
            <div
              style={{
                fontFamily: "var(--font-display)",
                fontStyle: "italic",
                fontWeight: 400,
                fontSize: 64,
                lineHeight: 1.05,
                letterSpacing: -0.02 * 64,
                maxWidth: 1040
              }}
            >
              “We shipped a batch embedding pipeline for 400M documents in a
              weekend. Spent $1,200 instead of a quarter of AWS budget. My
              MacBook Air earned me $18 while I slept.”
            </div>
            <div
              style={{
                marginTop: 32,
                fontFamily: "var(--font-mono)",
                fontSize: 12,
                color: "rgba(244,241,234,0.6)"
              }}
            >
              <span style={{ color: "var(--live)" }}>→</span> Priya
              Balakrishnan · founding eng, Levain &nbsp;·&nbsp; job_01HZK · 412k
              matches · Mar 2026
            </div>
          </div>
          <div
            style={{
              border: "1px solid rgba(244,241,234,0.15)",
              padding: 20,
              width: 280
            }}
          >
            <div
              className="mono"
              style={{
                fontSize: 10,
                color: "rgba(244,241,234,0.5)",
                letterSpacing: 0.08
              }}
            >
              TOTAL PAID · ALL TIME
            </div>
            <div
              style={{
                fontFamily: "var(--font-ui)",
                fontSize: 44,
                fontWeight: 500,
                letterSpacing: -0.03 * 44,
                marginTop: 4
              }}
            >
              $2.4M
            </div>
            <div
              style={{
                height: 1,
                background: "rgba(244,241,234,0.15)",
                margin: "16px 0"
              }}
            />
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: 12,
                fontFamily: "var(--font-mono)",
                fontSize: 11
              }}
            >
              {[
                ["PROVIDERS", "3,921"],
                ["COUNTRIES", "47"],
                ["UPTIME", "99.94%"],
                ["AVG MATCH", "2.1s"]
              ].map(([k, v]) => (
                <div key={k}>
                  <div style={{ opacity: 0.5 }}>{k}</div>
                  <div
                    style={{
                      fontSize: 16,
                      color: "var(--paper)",
                      fontFamily: "var(--font-ui)"
                    }}
                  >
                    {v}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ── cta ── */}
      <div style={{ padding: "96px 32px 72px" }}>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1.2fr 1fr",
            gap: 64,
            alignItems: "end"
          }}
        >
          <div>
            <div className="eyebrow" style={{ marginBottom: 16 }}>
              § 05 · Get started
            </div>
            <h3
              style={{
                fontFamily: "var(--font-ui)",
                fontWeight: 500,
                fontSize: 88,
                letterSpacing: -0.04 * 88,
                margin: 0,
                lineHeight: 0.95
              }}
            >
              Four minutes
              <br />
              to set up.
              <br />
              <span className="serif" style={{ fontSize: 88 }}>
                Zero to earn.
              </span>
            </h3>
          </div>
          <div
            style={{
              border: "1px solid var(--rule)",
              padding: 28,
              background: "var(--paper-2)"
            }}
          >
            <div className="eyebrow" style={{ marginBottom: 14 }}>
              Install
            </div>
            <div
              style={{
                background: "var(--ink)",
                color: "var(--paper)",
                padding: 14,
                fontFamily: "var(--font-mono)",
                fontSize: 13,
                marginBottom: 16
              }}
            >
              <span style={{ color: "var(--ink-4)" }}>$</span> curl -fsSL
              gpubnb.sh | sh
            </div>
            <Link
              href="/login"
              style={{
                display: "block",
                width: "100%",
                padding: 16,
                background: "var(--live)",
                color: "var(--live-ink)",
                fontFamily: "var(--font-ui)",
                fontSize: 15,
                fontWeight: 600,
                borderRadius: 2,
                letterSpacing: -0.01,
                textAlign: "center"
              }}
            >
              List your machine →
            </Link>
            <div
              style={{
                marginTop: 14,
                fontSize: 12,
                color: "var(--ink-3)",
                textAlign: "center"
              }}
            >
              macOS 12+, Linux, Windows (WSL). 4MB daemon. No sudo.
            </div>
          </div>
        </div>
      </div>

      {/* ── footer ── */}
      <div
        style={{
          borderTop: "1px solid var(--rule)",
          padding: "36px 32px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          fontSize: 12,
          color: "var(--ink-3)"
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 24 }}>
          <Wordmark size={16} />
          <span className="mono">© 2026 GPUbnb Labs, Inc.</span>
          <span className="mono">SOC 2 Type II</span>
        </div>
        <div style={{ display: "flex", gap: 20 }}>
          <a>Status</a>
          <a>Docs</a>
          <a>Security</a>
          <a>Jobs</a>
          <a>github</a>
        </div>
      </div>

      <ThemeNav page="landing" />
    </div>
  );
}

// ── step card (how it works) ──
function StepCard({
  n,
  title,
  mono,
  body,
  demo
}: {
  n: string;
  title: string;
  mono: string;
  body: string;
  demo: React.ReactNode;
}) {
  return (
    <div style={{ background: "var(--paper)", padding: 28, minHeight: 320 }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 16
        }}
      >
        <span
          className="mono"
          style={{ fontSize: 11, color: "var(--ink-3)" }}
        >
          § {n}
        </span>
        <span
          className="mono"
          style={{ fontSize: 11, color: "var(--ink-4)" }}
        >
          {mono}
        </span>
      </div>
      <h4
        style={{
          fontFamily: "var(--font-ui)",
          fontSize: 32,
          fontWeight: 500,
          letterSpacing: -0.03 * 32,
          margin: 0,
          lineHeight: 1
        }}
      >
        {title}
      </h4>
      <p
        style={{
          fontSize: 14,
          lineHeight: 1.55,
          color: "var(--ink-2)",
          margin: "16px 0 24px"
        }}
      >
        {body}
      </p>
      {demo}
    </div>
  );
}

function SubmitDemo() {
  return (
    <div
      style={{
        background: "var(--ink)",
        color: "var(--paper)",
        padding: 14,
        borderRadius: 2,
        fontFamily: "var(--font-mono)",
        fontSize: 11,
        lineHeight: 1.7
      }}
    >
      <div>
        <span style={{ color: "var(--ink-4)" }}>$</span> gpubnb submit \
      </div>
      <div style={{ paddingLeft: 14 }}>
        <span style={{ color: "var(--warming)" }}>--model</span> llama-3.1-8b \
      </div>
      <div style={{ paddingLeft: 14 }}>
        <span style={{ color: "var(--warming)" }}>--in</span> prompts.jsonl \
      </div>
      <div style={{ paddingLeft: 14 }}>
        <span style={{ color: "var(--warming)" }}>--max</span> $0.40
      </div>
      <div style={{ color: "var(--live)", marginTop: 6 }}>
        → job_01HZK8... queued
      </div>
    </div>
  );
}

function MatchDemo() {
  const rows: Array<[string, string, string, string, boolean]> = [
    ["mbp-oakland-04", "M2 Max · 32G", "★ 4.97", "0.8s", true],
    ["rtx-leipzig-11", "RTX 3090 · 24G", "★ 4.91", "1.2s", false],
    ["m2-tokyo-22", "M2 Ultra · 64G", "★ 4.99", "2.1s", false]
  ];
  return (
    <div style={{ background: "var(--paper-2)", padding: 14, borderRadius: 2 }}>
      <div
        className="mono"
        style={{ fontSize: 10, color: "var(--ink-3)", marginBottom: 8 }}
      >
        job_01HZK8 · matching…
      </div>
      {rows.map((m, i) => (
        <div
          key={i}
          style={{
            display: "grid",
            gridTemplateColumns: "1fr auto auto auto",
            gap: 10,
            padding: "5px 0",
            fontSize: 11,
            fontFamily: "var(--font-mono)",
            borderBottom: i < 2 ? "1px dashed var(--rule-soft)" : "none",
            color: m[4] ? "var(--ink)" : "var(--ink-4)"
          }}
        >
          <span>
            {m[4] ? "→ " : "  "}
            {m[0]}
          </span>
          <span>{m[1]}</span>
          <span>{m[2]}</span>
          <span>{m[3]}</span>
        </div>
      ))}
    </div>
  );
}

function EarnDemo() {
  return (
    <div style={{ background: "var(--paper-2)", padding: 14, borderRadius: 2 }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          marginBottom: 10
        }}
      >
        <span
          className="mono"
          style={{ fontSize: 10, color: "var(--ink-3)" }}
        >
          TODAY · mbp-oakland-04
        </span>
        <span
          className="mono"
          style={{ fontSize: 10, color: "var(--ink-3)" }}
        >
          $4.12 +$0.019
        </span>
      </div>
      <Sparkline
        data={[1, 2, 1, 3, 2, 4, 3, 5, 4, 6, 5, 7, 8, 7, 9, 11, 10, 12]}
        width={260}
        height={52}
        stroke="var(--ink)"
        fill="rgba(201,242,59,0.35)"
      />
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          marginTop: 8,
          fontFamily: "var(--font-mono)",
          fontSize: 10,
          color: "var(--ink-3)"
        }}
      >
        <span>00:00</span>
        <span>12:00</span>
        <span>22:14</span>
      </div>
    </div>
  );
}
