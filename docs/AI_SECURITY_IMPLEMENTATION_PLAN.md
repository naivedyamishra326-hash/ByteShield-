# ByteShield: AI Agentic Security Testing and Live Runtime Defense
## Implementation Plan & System Architecture

### 1. Executive Summary & Mission
**ByteShield** is an enterprise-grade AI security testing and live runtime defense platform. This document defines the engineering implementation plan to evolve the existing ByteShield frontend into a fully functional, integrated AI-agent security platform capable of:
1. Executing an automated catalogue of **exactly 100 controlled adversarial AI security test scenarios** across 10 distinct threat categories.
2. Evaluating whether configured AI models and agent workflows resist prompt injection, privilege escalation, unauthorized tool calls, canary data exfiltration, and metadata poisoning.
3. Enforcing deterministic authorization via the **Cedar Policy Engine** with an **AI-Assisted Policy Copilot** that assists in authoring, explaining, validating, and simulating policies without usurping runtime authorization authority.
4. Providing a unified, persistent event stream linking the **Overview**, **Security Monitor**, **Incidents Explorer**, **Transaction Ledger**, **Cedar Policy Studio**, and **Attack Lab**.
5. Preserving the existing Obsidian Flow UI aesthetic while replacing disconnected or simulated data with authentic, record-backed security telemetry.

---

### 2. Inspection Findings & Technical Baseline

#### 2.1 Workspace Architecture
- **Frontend Stack:** React 19 (`react`, `react-dom`), Vite 8, Tailwind CSS v4 (`@tailwindcss/vite`), and Motion (`motion/react`). Running on port 8443 inside the Figma Make / Vite dev server.
- **Console Routes:** `/console` (Overview), `/accounts` (Ledger & Accounts), `/finance` (Finance Assistant), `/graph` (Architecture Topology), `/monitor` (Security Overview & Live Event Feed), `/incidents` (Dynamic Incident Management), `/policies` (Cedar Policies & Copilot), `/identity` (Agent SPIFFE Identities & Ed25519 Tokens), `/attack-lab` (Adversarial Security Lab), `/audit` (Tamper-Evident Hash-Chained Audit Log).
- **Backend Service:** Express + SSE server running on port 3100 (proxied via Vite dev server `/api` configuration). Integrates `@mcp-sentinel/policy-engine` (Cedar WASM), `@mcp-sentinel/identity` (Ed25519 JWT), `@mcp-sentinel/audit` (SQLite + SHA-256 Merkle-style hash chaining), and `@mcp-sentinel/security-core` (Request/Response DLP Inspectors, Risk Scorer, Behavioral Analyzer, Circuit Breaker).

#### 2.2 Functional Gap Analysis

| Feature Area | Baseline State | Required Target Behavior | Gap Severity |
| :--- | :--- | :--- | :--- |
| **Test Scenario Catalogue** | 8 hardcoded demonstration scenarios in `SecurityConsole.tsx`. | Exactly 100 distinct adversarial scenarios across 10 defined categories (10 per category) with unique IDs, machine-readable definitions, canaries, and manifest validation. | **CRITICAL** |
| **Agentic Test Runner** | Fire-and-forget single scenario trigger (`/api/simulate/:scenario`). | Stateful orchestrator supporting full-suite runs, category runs, single-scenario runs, pause, resume, cancel, retry, rerun, and run comparison. Bounded concurrency and sensible timeouts. | **CRITICAL** |
| **Defense Evaluation Layer** | Simple binary `ALLOW`/`DENY` string inspection. | Multi-dimensional evaluation checking model refusal vs. actual tool proposals, Cedar denials, execution prevention, canary leakage, and incident generation. | **CRITICAL** |
| **Cedar AI Copilot & Simulation** | Simple string templating for policy generation. | Full validation pipeline: requirement -> candidate -> syntax/parse -> schema -> test cases -> simulation against 100 scenarios -> human review -> activation. Cedar remains authoritative. | **HIGH** |
| **Overview & Monitor Metrics** | Local mock numbers and partially connected API metrics. | Live metrics derived from recorded test runs, security events, policy decisions, and verified audit records. Zero hardcoded counts. | **HIGH** |
| **Transaction Security Context** | Basic transaction table with limited summary modal. | Rich transaction detail modal featuring linked agent identity, tool proposal, Cedar decision, approval history, response DLP findings, and chronological security lifecycle timeline. Empty state for unlinked records. | **HIGH** |
| **Dynamic Incident Management** | Static list with 1-2 hardcoded incidents. | Operational view of correlated security events with full lifecycle (`OPEN`, `INVESTIGATING`, `CONTAINED`, `RESOLVED`), status transitions, resolution notes, and audit-logged state changes. | **HIGH** |
| **Attack Lab UI** | 8 cards with local state triggers. | Full catalogue browser with category filtering, search, scenario details drawer, live execution progress bar, detailed per-scenario execution traces, diff views, and JSON/Markdown export. | **HIGH** |
| **Data Consistency & Event Flow** | In-memory sets in React state prone to drift. | Single persistent event stream and unified store correlating `testRunId`, `scenarioId`, `eventId`, `incidentId`, `transactionId`, and `auditHash`. | **HIGH** |

---

### 3. Core Architecture & End-to-End Pipeline

```
                                [ OPERATOR / USER ]
                                         │
                                         ▼
                 ┌───────────────────────────────────────────────┐
                 │       ByteShield Console UI (Port 8443)       │
                 │   - Overview & Security Monitor               │
                 │   - Attack Lab (100 Scenarios & Runner)       │
                 │   - Policy Studio (Cedar AI Copilot & Diff)   │
                 │   - Accounts & Transaction Inspection Modal   │
                 │   - Dynamic Incident Management               │
                 └───────────────────────┬───────────────────────┘
                                         │ HTTP REST / SSE Stream
                                         ▼
                 ┌───────────────────────────────────────────────┐
                 │          Backend API / Service Engine         │
                 │              (Vite Proxy / Express)           │
                 └───────┬───────────────────────────────┬───────┘
                         │                               │
                         ▼                               ▼
       ┌──────────────────────────────────┐   ┌──────────────────────────────────┐
       │     AI Agentic Orchestrator      │   │      MCP Security Boundary       │
       │  - 100-Scenario Catalogue        │   │  - Request DLP & Injection Check │
       │  - Stateful Test Runner          │   │  - Ed25519 SPIFFE Identity       │
       │  - Model Provider (Gemini/Mock)  │   │  - Cedar Policy Engine (Authz)   │
       │  - Multi-Dimensional Evaluator   │   │  - Supervisor Step-Up Approval   │
       │  - Isolated Execution Sandbox    │   │  - Protected Tool Sandboxing     │
       └─────────────────┬────────────────┘   │  - Response DLP & Canary Shield  │
                         │                    └─────────────────┬────────────────┘
                         │                                      │
                         └──────────────────┬───────────────────┘
                                            │ Emits Telemetry & Events
                                            ▼
                 ┌───────────────────────────────────────────────┐
                 │         Event & Incident Pipeline             │
                 │  - Real-time SSE / WebSocket Broadcaster      │
                 │  - Behavioral Correlation & Incident Engine   │
                 │  - Circuit Breaker & Quarantine Controller    │
                 └───────────────────────┬───────────────────────┘
                                         │ Persists Records
                                         ▼
                 ┌───────────────────────────────────────────────┐
                 │              Persistent Storage               │
                 │  - Test Runs & Scenario Results               │
                 │  - Correlated Security Incidents              │
                 │  - Customer Accounts & Financial Ledger       │
                 │  - Cedar Policy Versions & Candidates         │
                 │  - Tamper-Evident SHA-256 Chained Audit Log   │
                 └───────────────────────────────────────────────┘
```

---

### 4. Implementation Details by Feature

#### 4.1 Feature 1 & 2: 100 Adversarial Security Test Scenarios
- **Storage Location:** `src/security-tests/scenarios/`
- **Structure:** 10 categories, exactly 10 distinct scenarios per category (Total = 100 scenarios):
  1. `CAT01`: Direct Prompt Injection (`SEC-CAT01-001` to `SEC-CAT01-010`)
  2. `CAT02`: Indirect Prompt Injection (`SEC-CAT02-001` to `SEC-CAT02-010`)
  3. `CAT03`: Sensitive Information & Instruction Disclosure (`SEC-CAT03-001` to `SEC-CAT03-010`)
  4. `CAT04`: Unauthorized Tool Use (`SEC-CAT04-001` to `SEC-CAT04-010`)
  5. `CAT05`: Multi-Turn Escalation (`SEC-CAT05-001` to `SEC-CAT05-010`)
  6. `CAT06`: Encoding & Representation Variation (`SEC-CAT06-001` to `SEC-CAT06-010`)
  7. `CAT07`: MCP Tool & Metadata Poisoning (`SEC-CAT07-001` to `SEC-CAT07-010`)
  8. `CAT08`: Identity, Policy & Approval Bypass (`SEC-CAT08-001` to `SEC-CAT08-010`)
  9. `CAT09`: Data Flow & Exfiltration Control (`SEC-CAT09-001` to `SEC-CAT09-010`)
  10. `CAT10`: Memory, Session & Workflow Integrity (`SEC-CAT10-001` to `SEC-CAT10-010`)
- **Manifest:** `src/security-tests/scenarios/manifest.ts` providing automated integrity validation: verifies exactly 100 unique scenario IDs, exactly 10 per category, and no missing fields.

#### 4.2 Feature 3: Secure Agentic Test Orchestration
- **Location:** `src/security-tests/orchestrator/testRunner.ts`
- **State Machine:** `idle` ➔ `queued` ➔ `running` ➔ `paused` ➔ `completed` | `cancelled`
- **Capabilities:**
  - Launch entire 100-scenario suite.
  - Launch selected category (10 scenarios).
  - Launch single individual scenario.
  - Pause active test run and preserve state.
  - Resume paused test run without duplicate executions.
  - Cancel active run with immediate worker shutdown.
  - Retry eligible transient failures.
  - Rerun specific scenario in place.
  - Export run results to JSON and formatted Markdown.
  - Compare completed runs against baseline runs.
- **Safety Constraints:** Controlled concurrency (max 2 parallel scenario executions), execution timeout per scenario (10s limit), fully isolated sandbox context for each test.

#### 4.3 Feature 4: Multi-Dimensional Defense Evaluation
- **Location:** `src/security-tests/orchestrator/defenseEvaluator.ts`
- **Evaluation Criteria:**
  1. *Model Resistance:* Did the model recognize the attack and refuse to comply?
  2. *Tool Proposal Safety:* Did the model propose an unauthorized or malicious tool action?
  3. *Policy Enforcement:* Did Cedar evaluate the request and return the expected decision (`ALLOW`, `DENY`, or `APPROVAL_REQUIRED`)?
  4. *Execution Prevention:* Did the protected operation actually execute? (Zero tolerance: if denied, tool execution must be `BLOCKED`).
  5. *Canary Protection:* Were any synthetic secrets, canaries, or system prompts leaked in the response or tool arguments?
  6. *Audit Event Integrity:* Was a tamper-evident audit record generated and chained?
  7. *Incident Correlation:* Did high-severity violations trigger an incident in the dynamic incident manager?

#### 4.4 Feature 5: AI-Assisted Cedar Policy Engine
- **Location:** `src/services/cedarPolicyEngine.ts` and `src/services/cedarCopilot.ts`
- **Core Principles:**
  - **Deterministic Cedar Authority:** Runtime authorization decisions are 100% computed by Cedar policy rules. The AI model is strictly prohibited from granting permissions.
  - **Policy Copilot Capabilities:** Natural language requirement to Cedar policy; plain-language policy explanation; test case generation (positive and negative); schema and syntax validation.
  - **Validation Pipeline:** AI Proposal ➔ Syntax Validation ➔ Schema Check ➔ Compatibility Review ➔ Test Cases ➔ Simulation against 100 Scenarios ➔ Operator Approval ➔ Activation.
  - **Policy Simulation:** Evaluates candidate policies against the scenario catalogue and displays impact diffs (e.g., changes in allow/deny decisions, blocked legitimate operations).

#### 4.5 Feature 6: Live Overview & Security Overview
- **Location:** `src/console/SecurityConsole.tsx` (Overview & Monitor views)
- **Metrics Source:** Dynamic aggregation of live test runs, audit logs, active incidents, and Cedar policy decisions.
- **Streaming Pipeline:** Real-time updates via Server-Sent Events (`/api/events/stream`) with automatic reconnection and state resynchronization.

#### 4.6 Feature 7: Detailed Transaction Inspection
- **Location:** `src/console/SecurityConsole.tsx` (Transaction detail modal)
- **Data Display:**
  - Base transaction attributes (ID, amount, currency, timestamp, status, account, category, simulation flag).
  - Security context: Linked agent identity (`SPIFFE`), tool proposal name and arguments, Cedar authorization decision and rule ID, supervisor approval history, response DLP result, and SQLite SHA-256 audit hash.
  - Security lifecycle timeline: 8-stage sequence from request initiation to cryptographic audit log chaining.
  - Honest empty state: Explicit notification when a legacy transaction has no linked security telemetry.

#### 4.7 Feature 8: Dynamic Incident Management
- **Location:** `src/services/incidentManager.ts` & `src/console/SecurityConsole.tsx`
- **Lifecycle States:** `OPEN` ➔ `INVESTIGATING` ➔ `CONTAINED` ➔ `RESOLVED` (with `REOPENED` support).
- **Incident Model:** ID, title, category, severity, status, timestamps, related run/scenario/principal/transaction/tool/policy, evidence chain, timeline, and resolution notes.
- **Actions:** Status transitions with operator notes, persistent audit logging, and automated metric recalculations.

#### 4.8 Feature 9: Attack Lab UI Integration
- **Location:** `src/console/SecurityConsole.tsx` (Attack Lab view)
- **UI Elements:**
  - Category selector (10 categories with scenario counts and pass/fail badges).
  - 100-scenario catalogue with search and filter.
  - Execution controls: "Run All 100 Scenarios", "Run Category", "Run Single".
  - Active run progress indicator: current scenario ID, progress bar, completion counters.
  - Detailed per-scenario trace drawer displaying input prompt, model output, tool arguments, Cedar decision, defense verdict, and audit link.
  - Export modal (JSON and Markdown reports).

---

### 5. Implementation Roadmap & Execution Order

1. **Phase 1: Scenario Catalogue & Manifest (Feature 2)**
   - Create 10 category files with 10 scenarios each in `src/security-tests/scenarios/`.
   - Build `src/security-tests/scenarios/manifest.ts` with strict self-validation logic.
2. **Phase 2: Agentic Test Orchestrator & Defense Evaluator (Features 3 & 4)**
   - Implement `testRunner.ts`, `defenseEvaluator.ts`, and simulated tool sandbox.
   - Support run lifecycle (queued, running, paused, cancelled, completed), retry, and comparison.
3. **Phase 3: Cedar Policy Copilot & Simulation Engine (Feature 5)**
   - Implement Cedar validation pipeline, syntax parser, AI copilot prompt translator, and policy diff simulator.
4. **Phase 4: Shared Store & Live Event Pipeline (Features 6, 8, 10)**
   - Build unified `securityStore.ts` managing runs, incidents, events, policies, and ledger transactions.
   - Implement SSE/event broadcasting and reconnection logic.
5. **Phase 5: UI Integration & Console Enhancements (Features 6, 7, 8, 9)**
   - Upgrade Attack Lab view with 100 scenarios, live runner progress, and trace inspector.
   - Upgrade Overview and Monitor with authentic event-driven telemetry.
   - Upgrade Accounts view with rich transaction security inspection modal and timeline.
   - Upgrade Incidents view with lifecycle transitions and resolution notes.
   - Upgrade Policies view with Cedar Copilot and simulation diff panel.
6. **Phase 6: Verification & Testing (Acceptance Criteria)**
   - Execute manifest verification tests.
   - Run end-to-end test scenarios through the runner.
   - Execute `npm run build` and ensure 0 compilation errors.
7. **Phase 7: Comprehensive Documentation**
   - Author `docs/ATTACK_LAB_SCENARIOS.md`
   - Author `docs/AI_EVALUATION_METHODOLOGY.md`
   - Author `docs/CEDAR_AI_POLICY_WORKFLOW.md`
   - Author `docs/LIVE_EVENT_ARCHITECTURE.md`
   - Author `docs/ENVIRONMENT_SETUP.md`
