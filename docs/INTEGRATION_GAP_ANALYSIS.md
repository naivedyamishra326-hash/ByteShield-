# MCP Sentinel: Integration Gap Analysis & Architecture Specification

## 1. Executive Summary

This document provides a comprehensive repository audit, architectural assessment, and feature-by-feature integration matrix connecting the **MCP Sentinel Frontend** ([naivedyamishra326-hash/bestfrontend](https://github.com/naivedyamishra326-hash/bestfrontend)) with the **MCP Sentinel Backend & Security Engine** ([naivedyamishra326-hash/Hackathon-Project](https://github.com/naivedyamishra326-hash/Hackathon-Project)).

The objective is to transform the standalone frontend prototype into a fully integrated, live full-stack application while preserving:
- The Obsidian Flow visual design, animations, component hierarchy, and responsive styling.
- The 10 distinct security console views.
- The zero-trust security control path (Identity -> Proxy -> Cedar Policy -> Approval -> Protected MCP Execution -> Response Inspection -> Cryptographic Audit Chain).
- Complete data integrity, error resilience, and server-side secret management.

---

## 2. Repository Audit Findings

### 2.1 Frontend Repository: `bestfrontend`
- **Scaffold**: Single-page prototype with hash-based and path-based routing (`/console`, `/accounts`, `/finance`, `/graph`, `/monitor`, `/incidents`, `/policies`, `/identity`, `/attack-lab`, `/audit`).
- **Styling**: Tailored dark-mode CSS with Obsidian Flow palette (`#080b0f`, `#82e3c2` mint, `#8fb8f4` blue, `#f0c782` amber, `#f17e82` red) and typography (`Manrope`, `DM Mono`).
- **State Management**: Browser-local state (`localStorage` key: `sentinel-demo-v1`) tracking local chat messages, mock events, and a single pending approval.
- **Current Limitation**: All 10 views were driven by in-memory mock datasets (`events`, `txs`, `scenarios`, `nodeData`) and simulated algorithms (fallback hash calculation, hardcoded response strings). Real backend endpoints were not connected.

### 2.2 Backend Repository: `Hackathon-Project`
- **Architecture**: Monorepo with 5 core security packages and 4 application services:
  - `packages/shared`: Shared types, constants (`DEMO_IDENTITIES`, `API_CONFIG`), and utilities.
  - `packages/policy-engine`: Cedar policy engine (`CedarPolicyEngine`) evaluating `.cedar` policies.
  - `packages/identity`: Identity provider (`IdentityProvider`) managing Ed25519-signed JWT tokens, capability attenuation, and delegation chains.
  - `packages/audit`: Audit logger (`AuditLogger`) persisting events to SQLite (`sentinel.db`) with SHA-256 hash chaining.
  - `packages/security-core`: Request/response inspectors, risk scorer, behavioral analyzer, and autonomous circuit breaker.
  - `apps/api`: Express + Server-Sent Events (SSE) server on port 3100 exposing 30+ endpoints.
  - `apps/demo-mcp-server`: Model Context Protocol (MCP) server managing the simulated financial ledger (`sharedLedger`).
  - `apps/mcp-proxy`: Zero-trust security proxy intercepting and inspecting MCP tool execution requests.
- **Capabilities**: Fully operational security pipeline, live Gemini 2.5 Flash integration with structured tool-calling, cryptographic audit hashing, and real-time SSE stream.

---

## 3. Side-by-Side Feature Matrix

| Frontend Feature | Frontend Location | Existing Backend Support | Status | Integration Gap | Required Action | Validation |
|---|---|---|---|---|---|---|
| **Overview Metrics & Latency** | `/console` · `SecurityConsole.tsx` | `GET /api/metrics` · `GET /api/audit/integrity` | **IMPLEMENTED** | Frontend displays hardcoded numbers (1,284 requests, 18 denied); backend computes live telemetry. | **INTEGRATE** · Connect to `api.getMetrics()` and `api.verifyIntegrity()`. Fall back to sample if offline. | Unit test API client; verify dashboard renders live counts from `sentinel.db`. |
| **Activity Chart & 24h/7d Trend** | `/console` · `SecurityConsole.tsx` | `GET /api/events` aggregation | **PARTIALLY IMPLEMENTED** | Frontend SVG chart had static path data; backend holds individual event timestamps. | **EXTEND** · Aggregate events by hour/day to render live volume curves. | Verify chart data reflects events generated in test runs. |
| **Approval Inbox** | `/console` & `/finance` · Modal / Inbox | `GET /api/approvals` · `POST /api/approvals/:id/decision` · `POST /api/finance/refunds/:id/confirm` | **IMPLEMENTED** | Frontend approval was local state only; backend enforces re-authorization before tool execution. | **INTEGRATE** · Wire review modal to backend decision endpoints with single-execution guarantee. | Trigger over-limit refund; verify pending approval appears and re-executes only on supervisor approval. |
| **Accounts Ledger & Balances** | `/accounts` · Table & Balance Cards | `GET /api/finance/accounts` · `GET /api/finance/accounts/:id` · `GET /api/finance/accounts/:id/transactions` | **IMPLEMENTED** | Frontend had 8 hardcoded transactions; backend has multi-account ledger (`ACC-1001`, `ACC-1002`, `ACC-1003`). | **INTEGRATE** · Wire account selector, search, category filters, and live transaction queries. | Verify balance and transactions update after a permitted refund is executed. |
| **Account Status (Freeze/Suspend)** | `/accounts` · Status Toggle | `POST /api/finance/accounts/:id/status` | **IMPLEMENTED** | Frontend lacked action to suspend/reactivate account from UI. | **INTEGRATE** · Add status toggle calling backend API. | Freeze `ACC-1001`; verify subsequent tool calls to `ACC-1001` are denied. |
| **AI Account Audit** | `/accounts` · AI Audit Modal | `POST /api/finance/ai/audit` | **IMPLEMENTED** | Feature present in backend but missing trigger in new frontend. | **INTEGRATE** · Expose "Run AI Audit" button on account card opening report modal. | Run AI audit on `ACC-1001`; verify analysis report generated by backend. |
| **Finance Assistant (AI Chat)** | `/finance` · Interactive Chat | `POST /api/finance/chat` · `GET /api/finance/status` · `POST /api/finance/reset` | **IMPLEMENTED** | Frontend simulated responses with regex string matching; backend orchestrates Gemini + Cedar + MCP tools. | **INTEGRATE** · Wire chat input to `api.sendFinanceChat()`. Display model text, tool activities, and security decisions. | Submit prompt: "Check balance for ACC-1001"; verify live tool execution and audit log record. |
| **Architecture Topology** | `/graph` · SVG Diagram & Linear Flow | Static graph + `GET /api/circuit-breaker` | **PARTIALLY IMPLEMENTED** | Frontend diagram was static; backend tracks autonomous circuit breaker states. | **INTEGRATE** · Link graph node alert status to live circuit breaker telemetry. | Trip circuit breaker in Attack Lab; verify Agent node in Graph pulses in quarantine alert state. |
| **Security Monitor (Live Feed)** | `/monitor` · Event Table | `GET /api/events` · `SSE /api/events/stream` | **IMPLEMENTED** | Frontend used static array + local additions; backend provides real-time SSE stream. | **INTEGRATE** · Connect EventSource to `/api/events/stream` and pre-load past events from SQLite. | Trigger tool call; verify event arrives in table via SSE without page refresh. |
| **Incident Explorer & Attack Chains** | `/incidents` · Incident List & Breaker | `GET /api/incidents` · `GET /api/circuit-breaker` · `POST /api/circuit-breaker/reset` | **IMPLEMENTED** | Frontend displayed static placeholder events; backend behavioral analyzer detects correlated attack chains. | **INTEGRATE** · Fetch live incidents and provide one-click circuit breaker reset. | Run 3 rapid violations in Attack Lab; verify incident is created and agent quarantined. |
| **Policy Studio & Rule Editor** | `/policies` · Cedar Policy Explorer | `GET /api/policies` · `POST /api/policies/validate` · `PUT /api/policies/:name` · `POST /api/policies/generate` | **IMPLEMENTED** | Frontend showed hardcoded policy snippets; backend reads/writes actual `.cedar` files. | **INTEGRATE** · Fetch policy files from backend, allow syntax validation and live editing. | Edit policy to lower limit; test refund to verify new threshold is actively enforced. |
| **Agent Identity & Delegation** | `/identity` · Token Inspector | `GET /api/identities` · `POST /api/tokens/issue` · `POST /api/tokens/revoke` · `POST /api/tokens/delegate` | **IMPLEMENTED** | Frontend displayed mock token strings; backend signs authentic Ed25519 JWT tokens. | **INTEGRATE** · Connect token issuance, revocation, and delegation chain inspector. | Revoke token; verify subsequent MCP calls with that token are denied (`TOKEN_REJECTED`). |
| **Attack Simulation Lab** | `/attack-lab` · 8 Attack Scenarios | `POST /api/simulate/:scenario` · `POST /api/reset` | **IMPLEMENTED** | Frontend simulated 6 scenarios with client-side logic; backend implements 8 end-to-end security scenarios. | **INTEGRATE** · Route all scenarios to `POST /api/simulate/:scenario` and display live proxy decisions. | Run `excessive-refund`; verify Cedar policy denies with `$50 limit exceeded` reason. |
| **Audit Explorer & Chain Verification** | `/audit` · Hash Chain & JSON Export | `GET /api/events` · `GET /api/audit/integrity` · `GET /api/reports/compliance` | **IMPLEMENTED** | Frontend recomputed mock hashes in-browser; backend verifies SHA-256 links across stored SQLite records. | **INTEGRATE** · Connect to `api.verifyIntegrity()`, export real audit logs, and render Compliance Report. | Verify chain reports valid; manually alter test record; verify integrity check catches discrepancy. |

---

## 4. End-to-End Control Path Architecture

```
                                      [ USER REQUEST ]
                                             |
                                             v
                           +-----------------------------------+
                           |    Vite + React Frontend (8443)   |
                           +-----------------------------------+
                                             |
                                    HTTP / REST / SSE
                                             |
                                             v
                           +-----------------------------------+
                           |    Express API Gateway (3100)     |
                           +-----------------------------------+
                                             |
                     +-----------------------+-----------------------+
                     |                                               |
                     v                                               v
          [ Gemini AI Client ]                            [ Direct Security API ]
                     |                                               |
                     v                                               v
          [ Tool Proposal Hook ]                          [ Scenario Simulation ]
                     |                                               |
                     +-----------------------+-----------------------+
                                             |
                                             v
                           +-----------------------------------+
                           |     MCP Security Proxy (3001)     |
                           |  - Request Inspector (Injection)  |
                           |  - Identity Attestation (EdDSA)   |
                           |  - Risk Scorer (0-100)            |
                           +-----------------------------------+
                                             |
                                             v
                           +-----------------------------------+
                           |      Cedar Policy Engine          |
                           |  - Principal & Capability check   |
                           |  - Resource scope validation      |
                           |  - Limit threshold check          |
                           +-----------------------------------+
                                       /           \
                           (Hold/Pause)             (Permit/Deny)
                                     /               \
                                    v                 v
                 [ Human-In-The-Loop Approval ]   [ Protected MCP Server ]
                                    \                 /
                                     \               /
                                      v             v
                           +-----------------------------------+
                           |     Response Inspector & DLP      |
                           |  - PII / Card / Secret Masking    |
                           +-----------------------------------+
                                             |
                                             v
                           +-----------------------------------+
                           |   SQLite Audit Store (sentinel.db)|
                           |  - SHA-256 Hash Chain Record      |
                           |  - Behavioral Incident Correlation|
                           +-----------------------------------+
                                             |
                                             v
                           +-----------------------------------+
                           |    SSE Broadcast -> Live UI       |
                           +-----------------------------------+
```

---

## 5. Security Guardrails & Operational Constraints

1. **Zero Secret Leakage**:
   - `GEMINI_API_KEY` is loaded exclusively server-side in `apps/api/.env`.
   - Never expose API keys or Ed25519 private keys in Vite bundle (`VITE_*` variables).
2. **Deterministic Authorization**:
   - The LLM never decides authorization; Cedar policy and identity claims are authoritative.
   - Tool proposals are treated as untrusted inputs.
3. **Execution Idempotency & Anti-Replay**:
   - Approvals are assigned unique UUIDs and can only be executed once.
   - Nonce and timestamp validation prevent replay of revoked tokens.
4. **Isolated Test Harness**:
   - Attack Lab exercises only the local fictional ledger (`ACC-1001` - `ACC-1003`). No external financial networks or services are ever contacted.
