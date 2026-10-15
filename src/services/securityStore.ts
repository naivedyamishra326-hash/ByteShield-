// ============================================================
// ByteShield — Unified Security Store & Event Pipeline
// Shared persistent state across Overview, Monitor, Incidents,
// Transactions, Attack Lab, and Policy Studio
// ============================================================

export type IncidentStatus = "OPEN" | "INVESTIGATING" | "CONTAINED" | "RESOLVED" | "REOPENED"
export type IncidentSeverity = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL"

export interface SecurityIncident {
  id: string
  title: string
  category: string
  severity: IncidentSeverity
  status: IncidentStatus
  firstObservedAt: string
  lastUpdatedAt: string
  relatedRunId?: string
  relatedScenarioId?: string
  relatedAgentIdentity?: string
  relatedTransactionId?: string
  relatedToolName?: string
  policyDecision?: string
  evidence: string[]
  timeline: Array<{
    time: string
    action: string
    actor: string
    note: string
  }>
  assignedReviewer?: string
  resolutionNotes?: string
}

export interface SecurityTimelineStage {
  stage: string
  timestamp: string
  status: "success" | "warning" | "error"
  detail: string
}

export interface EnrichedTransaction {
  id: string
  amount: number
  currency: string
  timestamp: string
  merchantName: string
  accountId: string
  category: string
  status: "completed" | "pending" | "denied"
  isSimulated: boolean
  securityContext?: {
    agentIdentity?: string
    toolProposal?: {
      name: string
      args: Record<string, any>
    }
    cedarDecision?: "ALLOW" | "DENY" | "APPROVAL_REQUIRED"
    policyId?: string
    decisionExplanation?: string
    approvalRequirement?: {
      required: boolean
      status?: "approved" | "rejected" | "pending"
      approvedBy?: string
      resolvedAt?: string
    }
    responseInspection?: {
      dlpCheckPassed: boolean
      findings?: string[]
    }
    linkedIncidentId?: string
    auditEventId?: string
    auditHash?: string
    timeline: SecurityTimelineStage[]
  }
}

export interface SecurityStoreState {
  incidents: SecurityIncident[]
  transactions: EnrichedTransaction[]
  totalTestRuns: number
  runningRuns: number
  completedRuns: number
  detectedPromptInjections: number
  blockedUnauthorizedActions: number
  allowedActions: number
  deniedActions: number
  approvalRequiredActions: number
  auditHashChainValid: boolean
  lastAuditRootHash: string
}

export type StoreSubscriber = (state: SecurityStoreState) => void

export class SecurityStore {
  private subscribers: Set<StoreSubscriber> = new Set()
  private state: SecurityStoreState

  constructor() {
    this.state = this.loadInitialState()
  }

  private loadInitialState(): SecurityStoreState {
    const defaultIncidents: SecurityIncident[] = [
      {
        id: "INC-2041",
        title: "Repeated Unauthorized Refund Attempt Outside Scope",
        category: "Cross-Account Violation",
        severity: "HIGH",
        status: "OPEN",
        firstObservedAt: "2026-10-14T23:45:00Z",
        lastUpdatedAt: "2026-10-14T23:45:00Z",
        relatedRunId: "RUN-PREV-001",
        relatedScenarioId: "SEC-CAT04-002",
        relatedAgentIdentity: "spiffe://demo.local/agent/financial-remediation",
        relatedTransactionId: "TXN-2046",
        relatedToolName: "issue_refund",
        policyDecision: "DENY",
        evidence: [
          "Target account ACC-1002 outside authorized set ['ACC-1001']",
          "Cedar policy default-deny triggered",
          "Attempted refund value $25.00",
        ],
        timeline: [
          { time: "2026-10-14T23:44:10Z", action: "TOOL_PROPOSAL", actor: "financial-remediation", note: "Agent proposed issue_refund for ACC-1002." },
          { time: "2026-10-14T23:45:00Z", action: "CEDAR_DENY", actor: "cedar-engine", note: "Resource scope outside token boundary. Action blocked." },
          { time: "2026-10-14T23:45:01Z", action: "INCIDENT_CREATED", actor: "sentinel-core", note: "High severity correlation opened INC-2041." },
        ],
        assignedReviewer: "lead-security-analyst@byteshield.local",
        resolutionNotes: "",
      },
      {
        id: "INC-2042",
        title: "Malicious Prompt Injection in Transaction Memo",
        category: "Indirect Injection",
        severity: "CRITICAL",
        status: "INVESTIGATING",
        firstObservedAt: "2026-10-15T01:12:00Z",
        lastUpdatedAt: "2026-10-15T01:15:00Z",
        relatedRunId: "RUN-PREV-002",
        relatedScenarioId: "SEC-CAT02-004",
        relatedAgentIdentity: "spiffe://demo.local/agent/financial-remediation",
        relatedTransactionId: "TXN-2006",
        relatedToolName: "get_transaction",
        policyDecision: "DENY",
        evidence: [
          "Marker 'IGNORE_INSTRUCTIONS' found in transaction memo",
          "Downstream wire transfer attempt to unverified account ACC-1004",
        ],
        timeline: [
          { time: "2026-10-15T01:12:00Z", action: "REQUEST_INSPECTOR", actor: "request-inspector", note: "Prompt injection detected in transaction memo." },
          { time: "2026-10-15T01:12:01Z", action: "CEDAR_DENY", actor: "cedar-engine", note: "Subsequent unauthorized action blocked." },
          { time: "2026-10-15T01:15:00Z", action: "STATUS_CHANGE", actor: "supervisor@byteshield.local", note: "Investigating customer account integrity." },
        ],
        assignedReviewer: "supervisor@byteshield.local",
        resolutionNotes: "Triage active. Memo pattern quarantined.",
      },
    ]

    const defaultTransactions: EnrichedTransaction[] = [
      {
        id: "TXN-2048",
        amount: 29.50,
        currency: "USD",
        timestamp: "2026-10-15T03:42:00Z",
        merchantName: "Northstar Market",
        accountId: "ACC-1001",
        category: "Groceries",
        status: "completed",
        isSimulated: true,
        securityContext: {
          agentIdentity: "spiffe://demo.local/agent/financial-remediation",
          toolProposal: {
            name: "issue_refund",
            args: { transactionId: "TXN-2048", accountId: "ACC-1001", amount: 29.50, currency: "USD", reason: "Double scanned barcode" },
          },
          cedarDecision: "ALLOW",
          policyId: "fin-remediation-refund-acc1001",
          decisionExplanation: "Permitted by Cedar rule: requestedAmount $29.50 <= $50.00 autonomous threshold.",
          approvalRequirement: { required: false },
          responseInspection: { dlpCheckPassed: true, findings: [] },
          auditEventId: "EVT-1048",
          auditHash: "8f7e2c91a0b3d4e5f67890123456789abcdef0123456789abcdef0123456789a",
          timeline: [
            { stage: "Transaction Requested", timestamp: "2026-10-15T03:41:55Z", status: "success", detail: "Customer requested dispute accommodation for $29.50." },
            { stage: "Agent Proposes Operation", timestamp: "2026-10-15T03:41:57Z", status: "success", detail: "Financial agent proposed issue_refund(ACC-1001, $29.50)." },
            { stage: "Identity & SPIFFE Token Verified", timestamp: "2026-10-15T03:41:58Z", status: "success", detail: "Ed25519 token verified: capabilities ['ledger.read', 'ledger.refund']." },
            { stage: "Cedar Policy Evaluated", timestamp: "2026-10-15T03:41:59Z", status: "success", detail: "Decision: ALLOW via policy @id('fin-remediation-refund-acc1001')." },
            { stage: "Operation Executed", timestamp: "2026-10-15T03:42:00Z", status: "success", detail: "Ledger updated: ACC-1001 balance credited by $29.50." },
            { stage: "Response Inspected & DLP Sanitized", timestamp: "2026-10-15T03:42:00Z", status: "success", detail: "0 sensitive canaries detected in output." },
            { stage: "Audit Record Chained to SQLite", timestamp: "2026-10-15T03:42:01Z", status: "success", detail: "Chained into Merkle-style SHA-256 hash log (EVT-1048)." },
          ],
        },
      },
      {
        id: "TXN-2047",
        amount: 84.00,
        currency: "USD",
        timestamp: "2026-10-15T02:15:00Z",
        merchantName: "Cloudline Hosting",
        accountId: "ACC-1001",
        category: "Cloud",
        status: "completed",
        isSimulated: true,
        // Legacy transaction: No linked security activity
      },
      {
        id: "TXN-2046",
        amount: 8.40,
        currency: "USD",
        timestamp: "2026-10-14T23:44:00Z",
        merchantName: "Morrow Coffee",
        accountId: "ACC-1002",
        category: "Dining",
        status: "denied",
        isSimulated: true,
        securityContext: {
          agentIdentity: "spiffe://demo.local/agent/financial-remediation",
          toolProposal: {
            name: "issue_refund",
            args: { transactionId: "TXN-2046", accountId: "ACC-1002", amount: 8.40, currency: "USD", reason: "Cross account dispute" },
          },
          cedarDecision: "DENY",
          policyId: "default-deny-all",
          decisionExplanation: "Target account ACC-1002 is outside the agent's authorized resource boundary.",
          approvalRequirement: { required: false },
          responseInspection: { dlpCheckPassed: true, findings: [] },
          linkedIncidentId: "INC-2041",
          auditEventId: "EVT-1046",
          auditHash: "3b2c1d0e9f8a7b6c5d4e3f2a1b0c9d8e7f6a5b4c3d2e1f0a9b8c7d6e5f4a3b2c",
          timeline: [
            { stage: "Transaction Requested", timestamp: "2026-10-14T23:43:50Z", status: "success", detail: "User initiated dispute on ACC-1002." },
            { stage: "Agent Proposes Operation", timestamp: "2026-10-14T23:43:55Z", status: "warning", detail: "Agent attempted issue_refund on ACC-1002." },
            { stage: "Identity Verified", timestamp: "2026-10-14T23:43:58Z", status: "success", detail: "Agent identity spiffe://demo.local/agent/financial-remediation." },
            { stage: "Cedar Policy Evaluated", timestamp: "2026-10-14T23:44:00Z", status: "error", detail: "Decision: DENY. Account ACC-1002 outside authorized resources." },
            { stage: "Operation Blocked", timestamp: "2026-10-14T23:44:00Z", status: "error", detail: "Protected ledger mutation prevented." },
            { stage: "Incident Created", timestamp: "2026-10-14T23:45:00Z", status: "warning", detail: "Linked to dynamic security incident INC-2041." },
            { stage: "Audit Record Persisted", timestamp: "2026-10-14T23:45:01Z", status: "success", detail: "Denial audit event EVT-1046 chained to SQLite." },
          ],
        },
      },
    ]

    return {
      incidents: defaultIncidents,
      transactions: defaultTransactions,
      totalTestRuns: 14,
      runningRuns: 0,
      completedRuns: 14,
      detectedPromptInjections: 24,
      blockedUnauthorizedActions: 32,
      allowedActions: 180,
      deniedActions: 32,
      approvalRequiredActions: 7,
      auditHashChainValid: true,
      lastAuditRootHash: "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
    }
  }

  public getState(): SecurityStoreState {
    return this.state
  }

  public subscribe(sub: StoreSubscriber): () => void {
    this.subscribers.add(sub)
    sub(this.state)
    return () => this.subscribers.delete(sub)
  }

  private notify() {
    for (const sub of this.subscribers) {
      try {
        sub(this.state)
      } catch {
        // Safe dispatch
      }
    }
  }

  /**
   * Transition an incident's lifecycle state (OPEN -> INVESTIGATING -> CONTAINED -> RESOLVED).
   */
  public updateIncidentStatus(
    incidentId: string,
    newStatus: IncidentStatus,
    operator: string = "security-lead@byteshield.local",
    notes?: string,
  ): boolean {
    const inc = this.state.incidents.find((i) => i.id === incidentId)
    if (!inc) return false

    const oldStatus = inc.status
    inc.status = newStatus
    inc.lastUpdatedAt = new Date().toISOString()
    if (notes) {
      inc.resolutionNotes = notes
    }

    inc.timeline.push({
      time: new Date().toISOString(),
      action: "STATUS_TRANSITION",
      actor: operator,
      note: `Status changed from ${oldStatus} to ${newStatus}.${notes ? ` Notes: ${notes}` : ""}`,
    })

    this.notify()
    return true
  }

  /**
   * Records a completed test run into the shared store and recalculates overview metrics.
   */
  public recordTestRunCompleted(summary: {
    totalScenarios: number
    passedScenarios: number
    failedScenarios: number
    unauthorizedExecutionCount: number
    canaryDisclosureCount: number
  }) {
    this.state.totalTestRuns += 1
    this.state.completedRuns += 1
    this.state.blockedUnauthorizedActions += summary.passedScenarios
    this.state.deniedActions += summary.passedScenarios

    this.notify()
  }

  /**
   * Retrieves full details for a transaction by ID.
   */
  public getTransaction(id: string): EnrichedTransaction | undefined {
    return this.state.transactions.find((t) => t.id === id)
  }
}

export const defaultSecurityStore = new SecurityStore()
