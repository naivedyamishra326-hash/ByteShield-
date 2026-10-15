# ByteShield Live Event Architecture & Incident Management

## 1. Single Source of Truth Architecture

To prevent fragmented or conflicting states across the dashboard, ByteShield utilizes a unified **Security Store & Event Pipeline** (`src/services/securityStore.ts`).

The Overview metrics, Security Monitor, Attack Lab, Transaction Inspector, and Incident Management views all derive their state from the **same recorded security events and persistent entities**.

```
                           +---------------------------+
                           |  Sentinel Security Proxy  |
                           +-------------+-------------+
                                         |
                                         v
                         +-------------------------------+
                         |      Security Event Bus       |
                         |   (SSE Stream & Store Pipe)   |
                         +---------------+---------------+
                                         |
            +----------------------------+---------------------------+
            |                            |                           |
            v                            v                           v
+-----------------------+    +-----------------------+    +-----------------------+
|   Live Metrics &      |    |  Dynamic Incident     |    | Transaction Security  |
|   Overview Telemetry  |    |  Management Engine    |    |  Lifecycle Timeline   |
+-----------------------+    +-----------------------+    +-----------------------+
            |                            |                           |
            +----------------------------+---------------------------+
                                         |
                                         v
                             +-----------------------+
                             | UI Real-Time Updates  |
                             | (Zero Full-Page Reload|
                             +-----------------------+
```

---

## 2. Structured Security Event Schema

Every security-relevant operation emits a structured event:

```ts
export interface AuditEvent {
  id: string                      // e.g. "EVT-1048"
  timestamp: string               // ISO-8601 UTC
  eventType: "tool_execution" | "policy_decision" | "approval_request" | "security_incident"
  toolName?: string               // e.g. "issue_refund"
  agentIdentity: string           // e.g. "spiffe://demo.local/agent/financial-remediation"
  decision: "ALLOW" | "DENY" | "APPROVAL_REQUIRED"
  policyId?: string               // e.g. "fin-remediation-refund-acc1001"
  reasons?: string[]
  sanitizedArgs?: Record<string, any>
  riskAssessment?: {
    overallScore: number          // 0-100
    classification: string
  }
  hash?: string                   // SHA-256 Merkle link
}
```

---

## 3. Dynamic Incident Lifecycle & State Transitions

Incidents in ByteShield are not static text rows; they are **operational state machines** that correlate related attack signals into actionable workflows.

### A. Lifecycle States
1. **`OPEN`:** The boundary detector intercepted an adversarial signal, canary leak, or Cedar denial.
2. **`INVESTIGATING`:** An analyst has begun triaging the attack chain and examining prompt traces.
3. **`CONTAINED`:** Autonomous mitigations (e.g. circuit breaker quarantine or session token revocation) have isolated the offending principal.
4. **`RESOLVED`:** Root cause has been mitigated and resolution notes persisted.
5. **`REOPENED`:** New correlated violations occurred on a previously resolved incident, reopening the ticket while preserving historical timeline entries.

### B. Incident Data Model
```ts
export interface SecurityIncident {
  id: string
  title: string
  category: string
  severity: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL"
  status: "OPEN" | "INVESTIGATING" | "CONTAINED" | "RESOLVED" | "REOPENED"
  firstObservedAt: string
  lastUpdatedAt: string
  relatedTestRunId?: string
  relatedScenarioId?: string
  relatedPrincipal: string
  relatedTransactionId?: string
  relatedTool?: string
  policyDecision?: string
  evidence: {
    promptSnippet?: string
    toolArgs?: Record<string, any>
    rawViolation?: string
  }
  timeline: Array<{
    timestamp: string
    action: string
    actor: string
    notes?: string
  }>
  assignedReviewer?: string
  resolutionNotes?: string
}
```

---

## 4. Transaction Security Enrichment & 7-Stage Lifecycle

When an operator inspects a transaction in the Accounts portal, ByteShield displays its linked security context rather than generic mock data.

### The 7-Stage Enforcement Lifecycle
For transactions mediated by agents, the system renders an ordered verification sequence:
1. **Transaction Requested:** Client or dispute initiated.
2. **Agent Proposes Operation:** AI agent submits a structured MCP tool call.
3. **Identity & SPIFFE Token Verified:** Proxy checks Ed25519 signature, expiration, and capability claims.
4. **Cedar Policy Evaluated:** Deterministic rules determine `ALLOW`, `DENY`, or `APPROVAL_REQUIRED`.
5. **Operation Executed / Blocked:** Fictional ledger mutation performed or rejected.
6. **Response Inspected & DLP Sanitized:** Canary detection and cardholder data masking.
7. **Audit Record Chained to SQLite:** Chained into tamper-evident SHA-256 Merkle log.

### Honest Empty State Principle
For transactions without linked security events (e.g. legacy offline purchases), the console explicitly displays:
> *"No linked security activity is recorded for this transaction."*
Fictional attacks, fake incident numbers, or synthetic approvals are never fabricated for standard transactions.

---

## 5. Reconnection & Resilience

- **SSE Stream (`createEventStream`):** Delivers live push updates for audit events and circuit breaker trips.
- **Auto-Reconnect:** If the SSE connection drops, the client automatically attempts reconnection with exponential backoff.
- **State Hydration:** Upon reconnection, the console queries `/api/events?limit=100` and `/api/metrics` to hydrate the latest persistent state.
- **Offline Fallback:** If the backend port 3100 is offline, the console transparently falls back to local in-memory store states, preserving operator productivity.
