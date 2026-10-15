# ByteShield Environment Setup & Operating Guide

## 1. System Requirements & Architecture

- **Node.js:** v18.0.0 or higher (v20+ recommended).
- **Package Manager:** `npm` or `pnpm`.
- **Operating System:** Windows, Linux, or macOS.
- **Port Allocations:**
  - `8443` (or `$PORT`): Vite Web Console frontend (development server).
  - `3100`: Backend API server (Express / Fastify MCP security proxy).

---

## 2. Environment Variables Configuration

Create a `.env` file in the workspace root or configure the following variables:

```bash
# ============================================================
# ByteShield / MCP Sentinel Environment Configuration
# ============================================================

# Frontend Port (Vite Dev Server)
PORT=8443

# Backend API Service Port
PROXY_PORT=3100
API_BASE_URL=http://localhost:3100

# Google Gemini Model Provider Configuration
GEMINI_API_KEY=AIzaSyYourGeminiApiKeyHere
GEMINI_MODEL=gemini-2.0-flash

# Cedar Engine & Authorization Settings
CEDAR_POLICIES_PATH=./src/policies
CEDAR_FAIL_CLOSED=true

# Tamper-Evident Audit Storage
SQLITE_DB_PATH=./data/sentinel_audit.db
ENABLE_HASH_CHAINING=true

# Autonomous Circuit Breaker Thresholds
CIRCUIT_BREAKER_THRESHOLD=3
CIRCUIT_BREAKER_WINDOW_MS=60000
```

> **Security Note:** API keys and credentials are held strictly on the backend service. Client-side bundles never bundle secrets or private keys.

---

## 3. Installation & Startup Commands

### Step 1: Install Dependencies
```bash
npm install
```

### Step 2: Build Application
Validates TypeScript compilation, CSS bundling, and production asset creation:
```bash
npm run build
```

### Step 3: Start Development Console
```bash
npm run dev
```
Access the console at: `http://localhost:8443`

---

## 4. Automated Testing & Verification Commands

ByteShield includes an automated test runner for validating scenario catalogue integrity, agentic test runs, Cedar authorization, and dynamic incident lifecycles:

### Run the Full Verification Suite:
```bash
npx tsx src/security-tests/verify-all.test.ts
```
Expected output:
```
=== BYTESHIELD AUTOMATED COMPLIANCE & SECURITY VERIFICATION ===
[TEST 1] Verifying 100-Scenario Manifest Contract... ✓
[TEST 2] Testing Key Adversarial Scenarios via Agentic Test Runner... ✓
[TEST 3] Running Full Category Suite: CAT01 (10 scenarios)... ✓
[TEST 4] Testing Cedar AI Copilot & Policy Simulation Pipeline... ✓
[TEST 5] Testing Shared Store & Dynamic Incident Lifecycle... ✓
[TEST 6] Testing Transaction Security Context & Honest Empty State... ✓
=======================================================
ALL 6 SECURITY TEST SUITES PASSED CLEANLY (100% SUCCESS)
=======================================================
```

### Run a Specific Adversarial Category (e.g. Category 1):
```bash
npx tsx -e "import { defaultAgenticTestRunner } from './src/security-tests/orchestrator/testRunner'; defaultAgenticTestRunner.startCategory('CAT01_DIRECT_PROMPT_INJECTION').then(s => console.log('Passed:', s.passedScenarios, '/', s.totalScenarios))"
```

---

## 5. Console Navigation & Operating Procedures

| Route | View Name | Operational Responsibility |
| :--- | :--- | :--- |
| `/console` | Security Overview | Live metrics, active approvals, audit integrity status, system health. |
| `/accounts` | Accounts & Transactions | Customer ledger profiles, transaction inspection with linked security context. |
| `/finance` | Autonomous Finance Bot | Interactive chat with the financial remediation agent with Cedar gating. |
| `/monitor` | Live Security Monitor | Real-time SSE stream of intercepted requests, DLP findings, and policy decisions. |
| `/incidents` | Dynamic Incident Management | Correlated multi-stage attack chains with lifecycle transitions (`OPEN` -> `RESOLVED`). |
| `/policies` | Cedar Policy Explorer | Cedar source editor, AI Copilot, and 100-scenario simulation diff engine. |
| `/identity` | Identity & Attestation | Ed25519 JWT tokens, SPIFFE trust domain verification, and capability scopes. |
| `/attack-lab` | 100-Scenario Attack Lab | Full automated adversarial test harness with category filters, progress bar, and traces. |
| `/audit` | Audit Explorer | Cryptographically linked SHA-256 records and compliance framework mapping. |
