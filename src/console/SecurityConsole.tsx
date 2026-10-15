import React, { useState, useEffect, useRef, useCallback } from "react"
import "./console.css"
import { api, createEventStream } from "../api/client"
import type {
  SecurityMetrics,
  AuditEvent,
  PolicyFile,
  DemoIdentity,
  DemoToken,
  Incident,
  ApprovalRequest,
  CircuitBreakerStatus,
  CustomerAccount,
  Transaction,
  PendingRefund,
  ComplianceReport,
  FinanceStatus,
  ToolActivity,
} from "../api/types"
import {
  ALL_SCENARIOS,
  CATEGORIES_METADATA,
  SCENARIO_MANIFEST,
  getScenarioById,
  getScenariosByCategory,
} from "../security-tests/scenarios/manifest"
import type { SecurityScenario, ScenarioCategory } from "../security-tests/scenarios/types"
import {
  defaultAgenticTestRunner,
  type RunProgress,
  type RunComparison,
} from "../security-tests/orchestrator/testRunner"
import type { ScenarioEvaluationResult } from "../security-tests/orchestrator/defenseEvaluator"
import { defaultCedarCopilot, type PolicyCandidate, type PolicySimulationImpact } from "../services/cedarCopilot"
import {
  defaultSecurityStore,
  type SecurityIncident,
  type EnrichedTransaction,
  type IncidentStatus,
  type SecurityStoreState,
} from "../services/securityStore"

interface SecurityConsoleProps {
  currentPath: string
  onNavigate: (path: string) => void
}

interface EventItem {
  id: string
  time: string
  actor: string
  tool: string
  resource: string
  result: string
  severity: "low" | "warning" | "critical"
  detail: string
  hash?: string
}

interface ScenarioItem {
  id: string
  title: string
  label: string
  copy: string
  tool: string
  result: string
  severity: "low" | "warning" | "critical"
  tone: "good" | "warn" | "bad"
  detail: string
}

const defaultEvents: EventItem[] = [
  {
    id: "EVT-1048",
    time: "2 min ago",
    actor: "finance-agent",
    tool: "refund_transaction",
    resource: "ACC-1001 · TXN-2048",
    result: "Approval required",
    severity: "warning",
    detail: "A sample $29.50 refund request was paused for human review.",
  },
  {
    id: "EVT-1047",
    time: "8 min ago",
    actor: "finance-agent",
    tool: "get_account_balance",
    resource: "ACC-1001",
    result: "Allowed",
    severity: "low",
    detail: "A read-only sample lookup passed identity and policy checks.",
  },
  {
    id: "EVT-1046",
    time: "14 min ago",
    actor: "finance-agent",
    tool: "refund_transaction",
    resource: "ACC-1002 · TXN-2041",
    result: "Denied",
    severity: "critical",
    detail: "The resource was outside the principal's sample account boundary.",
  },
  {
    id: "EVT-1045",
    time: "22 min ago",
    actor: "finance-agent",
    tool: "get_transactions",
    resource: "ACC-1001",
    result: "Allowed",
    severity: "low",
    detail: "Sample transaction history was returned to the requester.",
  },
  {
    id: "EVT-1044",
    time: "31 min ago",
    actor: "unknown-agent",
    tool: "get_account_balance",
    resource: "ACC-1001",
    result: "Denied",
    severity: "critical",
    detail: "The sample identity registry did not recognize this principal.",
  },
]

const scenariosList: ScenarioItem[] = [
  {
    id: "legitimate-refund",
    title: "Legitimate Refund",
    label: "Identity · read/write",
    copy: "Agent refunds $29.50 to ACC-1001 — within authorized limits",
    tool: "issue_refund",
    result: "Allowed",
    severity: "low",
    tone: "good",
    detail: "Recognized sample identity and delegated account scope. Within limits.",
  },
  {
    id: "step-up-approval",
    title: "HITL Step-Up Approval",
    label: "Human approval · step-up",
    copy: "Agent requests $120 refund (> $50 limit) — pauses for supervisor decision",
    tool: "issue_refund",
    result: "Approval required",
    severity: "warning",
    tone: "warn",
    detail: "Sample amount requires human approval; no action executes automatically.",
  },
  {
    id: "excessive-refund",
    title: "Refund Limit Violation",
    label: "Policy · amount",
    copy: "Agent attempts $500 refund — exceeds $50 authorized limit",
    tool: "issue_refund",
    result: "Denied",
    severity: "critical",
    tone: "bad",
    detail: "The illustrative Cedar rule denies amounts over $50. No tool is called.",
  },
  {
    id: "circuit-breaker-quarantine",
    title: "Autonomous Circuit Breaker",
    label: "Self-healing defense",
    copy: "3 rapid violations → trips breaker, isolates agent & revokes all tokens",
    tool: "circuit_breaker",
    result: "Quarantined",
    severity: "critical",
    tone: "bad",
    detail: "Autonomous circuit breaker trips on repeated policy violations.",
  },
  {
    id: "cross-account",
    title: "Cross-Account Access",
    label: "Policy · resource",
    copy: "Attempt a refund outside the agent's account boundary (ACC-1002)",
    tool: "issue_refund",
    result: "Denied",
    severity: "critical",
    tone: "bad",
    detail: "The requested account differs from the sample delegated resource scope.",
  },
  {
    id: "unauthorized-tool",
    title: "Unauthorized Tool Access",
    label: "Capability violation",
    copy: "Read-only analyst attempts issue_refund without capability",
    tool: "issue_refund",
    result: "Denied",
    severity: "critical",
    tone: "bad",
    detail: "Identity token lacks ledger.refund capability.",
  },
  {
    id: "prompt-injection",
    title: "Prompt Injection Attack",
    label: "Request DLP / taint",
    copy: "Malicious memo → injection detected → unauthorized action blocked",
    tool: "request_inspector",
    result: "Denied",
    severity: "critical",
    tone: "bad",
    detail: "Prompt injection marker detected in memo argument.",
  },
  {
    id: "token-revocation",
    title: "Revoked Token Rejection",
    label: "Identity · attestation",
    copy: "Token issued → call succeeds → token revoked → call denied",
    tool: "identity_provider",
    result: "Denied",
    severity: "critical",
    tone: "bad",
    detail: "Blacklisted or revoked JWT rejected before tool execution.",
  },
]

const nodeDataMap: Record<string, string[]> = {
  user: [
    "Dashboard user",
    "Initiates a request",
    "A prompt or console action.",
    "A visible response and decision.",
    "The dashboard starts a request and renders the outcome.",
  ],
  agent: [
    "Gemini finance agent",
    "Proposes tool calls",
    "User intent and conversation context.",
    "A structured MCP tool proposal.",
    "The documented flow keeps the agent away from direct ledger access.",
  ],
  proxy: [
    "MCP security proxy",
    "Enforcement boundary",
    "Tool, arguments, principal and context.",
    "Allow, deny, approval hold, or inspected response.",
    "The proxy coordinates request inspection, identity, policy, approval, execution and audit.",
  ],
  policy: [
    "Cedar policy engine",
    "Authorization decision",
    "Principal, action, resource and context.",
    "A policy decision and reason.",
    "Cedar rules determine whether a proposed action is permitted.",
  ],
  tools: [
    "Finance MCP server",
    "Protected tools",
    "An authorized MCP call.",
    "Simulated ledger data or mutation result.",
    "The demo server exposes finance tools backed by a fictional ledger.",
  ],
  audit: [
    "Audit storage",
    "Tamper-evident record",
    "Decision and event details.",
    "A linked audit record.",
    "The repository documents SQLite audit storage with SHA-256 hash chaining.",
  ],
}

// Default Fallback Datasets for Offline / Demo Mode
const defaultCustomerAccounts: CustomerAccount[] = [
  { id: "ACC-1001", name: "Elena Vance (Checking)", email: "elena.vance@blackmesa.internal", balance: 12480.60, currency: "USD", status: "active", createdAt: "2026-01-15T08:00:00Z", dailyLimit: 2500, tier: "Gold Executive" },
  { id: "ACC-1002", name: "Marcus Brody (Savings)", email: "marcus.brody@museum.org", balance: 45200.00, currency: "USD", status: "active", createdAt: "2026-01-20T09:30:00Z", dailyLimit: 5000, tier: "Platinum Business" },
  { id: "ACC-1003", name: "Aria Sterling (Checking)", email: "aria.sterling@apex.finance", balance: 3150.25, currency: "USD", status: "suspended", createdAt: "2026-02-01T11:15:00Z", dailyLimit: 1000, tier: "Standard Tier" },
]

const defaultTransactionsByAccount: Record<string, Transaction[]> = {
  "ACC-1001": [
    { id: "TXN-2048", accountId: "ACC-1001", type: "debit", currency: "USD", merchantName: "Northstar Market", memo: "Weekly groceries", category: "Groceries", timestamp: "Oct 14, 2026", amount: 29.5, status: "completed" },
    { id: "TXN-2047", accountId: "ACC-1001", type: "debit", currency: "USD", merchantName: "Cloudline Hosting", memo: "Monthly compute plan", category: "Cloud", timestamp: "Oct 14, 2026", amount: 84.0, status: "completed" },
    { id: "TXN-2046", accountId: "ACC-1001", type: "debit", currency: "USD", merchantName: "Morrow Coffee", memo: "Team coffee", category: "Dining", timestamp: "Oct 13, 2026", amount: 8.4, status: "completed" },
    { id: "TXN-2045", accountId: "ACC-1001", type: "debit", currency: "USD", merchantName: "Aster Rail", memo: "Regional rail ticket", category: "Travel", timestamp: "Oct 12, 2026", amount: 126.8, status: "completed" },
  ],
  "ACC-1002": [
    { id: "TXN-3011", accountId: "ACC-1002", type: "debit", currency: "USD", merchantName: "Atlas Datacenter", memo: "Dedicated rack hosting", category: "Cloud", timestamp: "Oct 14, 2026", amount: 1420.0, status: "completed" },
    { id: "TXN-3010", accountId: "ACC-1002", type: "debit", currency: "USD", merchantName: "Summit Airlines", memo: "Executive flight", category: "Travel", timestamp: "Oct 11, 2026", amount: 650.0, status: "completed" },
    { id: "TXN-3009", accountId: "ACC-1002", type: "debit", currency: "USD", merchantName: "Savant Consulting", memo: "Q4 Strategy retainer", category: "Services", timestamp: "Oct 09, 2026", amount: 2500.0, status: "completed" },
  ],
  "ACC-1003": [
    { id: "TXN-4001", accountId: "ACC-1003", type: "debit", currency: "USD", merchantName: "ByteStream Media", memo: "Subscription charge", category: "Entertainment", timestamp: "Oct 13, 2026", amount: 19.99, status: "disputed" },
    { id: "TXN-4002", accountId: "ACC-1003", type: "debit", currency: "USD", merchantName: "QuickMart", memo: "Late evening convenience", category: "Groceries", timestamp: "Oct 10, 2026", amount: 45.2, status: "completed" },
  ],
}

const defaultPolicies: PolicyFile[] = [
  {
    name: "fintech.cedar",
    loadedAt: "2026-10-15T00:00:00Z",
    content: `// ============================================================
// MCP Sentinel — Fintech Demonstration Policies
// Fine-grained authorization for the remediation scenario
// ============================================================

// POLICY: Financial remediation agent can read approved accounts
@id("fin-remediation-read-accounts")
permit (
  principal == MCPSentinel::Agent::"spiffe://demo.local/agent/financial-remediation",
  action == MCPSentinel::Action::"read_account",
  resource
)
when {
  resource.status == "active"
};

// POLICY: Financial remediation agent can issue refunds
// ONLY to authorized account ACC-1001, max 50 units
@id("fin-remediation-refund-acc1001")
permit (
  principal == MCPSentinel::Agent::"spiffe://demo.local/agent/financial-remediation",
  action == MCPSentinel::Action::"issue_refund",
  resource == MCPSentinel::Account::"ACC-1001"
)
when {
  context.requestedAmount <= 5000 &&
  context.currency == "USD"
};

// POLICY: Block refunds on suspended accounts
@id("block-suspended-account-refunds")
forbid (
  principal,
  action == MCPSentinel::Action::"issue_refund",
  resource
)
when {
  resource.status == "suspended"
};`,
  },
  {
    name: "base.cedar",
    loadedAt: "2026-10-15T00:00:00Z",
    content: `// ============================================================
// MCP Sentinel — Base Authorization Policies
// ============================================================

// Standard read access for authenticated agents
@id("base-agent-read")
permit (
  principal,
  action in [MCPSentinel::Action::"read_account", MCPSentinel::Action::"list_accounts"],
  resource
);

// High-risk commands require explicit supervisor approval
@id("base-command-approval")
forbid (
  principal,
  action == MCPSentinel::Action::"execute_command",
  resource
)
unless {
  context has supervisorApproval &&
  context.supervisorApproval == true
};`,
  },
]

const defaultIdentities: DemoIdentity[] = [
  {
    name: "Financial Remediation Agent",
    uri: "spiffe://demo.local/agent/financial-remediation",
    tokens: [
      {
        id: "tok_ed25519_fin_rem_001",
        subject: "spiffe://demo.local/agent/financial-remediation",
        capabilities: ["ledger.read", "ledger.refund"],
        authorizedResources: ["ACC-1001"],
        maxRefundAmount: 5000,
        issuedAt: "2026-10-15T01:00:00Z",
        expiresAt: "2026-10-15T09:00:00Z",
        revoked: false,
      },
    ],
  },
  {
    name: "Audit & Compliance Monitor",
    uri: "spiffe://demo.local/agent/audit-monitor",
    tokens: [
      {
        id: "tok_ed25519_aud_mon_002",
        subject: "spiffe://demo.local/agent/audit-monitor",
        capabilities: ["ledger.read", "audit.verify", "integrity.scan"],
        authorizedResources: ["*"],
        issuedAt: "2026-10-15T02:00:00Z",
        expiresAt: "2026-10-15T10:00:00Z",
        revoked: false,
      },
    ],
  },
  {
    name: "Customer Support Assistant",
    uri: "spiffe://demo.local/agent/support-bot",
    tokens: [
      {
        id: "tok_ed25519_sup_bot_003",
        subject: "spiffe://demo.local/agent/support-bot",
        capabilities: ["ledger.read"],
        authorizedResources: ["ACC-1001", "ACC-1002"],
        issuedAt: "2026-10-15T00:30:00Z",
        expiresAt: "2026-10-15T08:30:00Z",
        revoked: false,
      },
    ],
  },
]

const defaultIncidents: Incident[] = [
  {
    id: "INC-2041",
    sessionId: "session-demo-01",
    agentIdentity: "spiffe://demo.local/agent/financial-remediation",
    severity: "HIGH",
    description: "Repeated unauthorized refund attempt outside account boundary",
    detectedAt: "2026-10-14T23:45:00Z",
    status: "ACTIVE",
    eventChain: [
      { eventId: "EVT-1046", timestamp: "2026-10-14T23:44:10Z", toolName: "get_account_balance", eventType: "tool_execution", decision: "ALLOW" },
      { eventId: "EVT-1047", timestamp: "2026-10-14T23:45:00Z", toolName: "issue_refund", eventType: "tool_execution", decision: "DENY" },
    ],
  },
]

const defaultCircuitBreaker: CircuitBreakerStatus = {
  agentIdentity: "spiffe://demo.local/agent/financial-remediation",
  state: "CLOSED",
  failureCount: 0,
  quarantineReason: "Agent operating within safe policy limits.",
}

export function SecurityConsole({
  currentPath,
  onNavigate,
}: SecurityConsoleProps) {
  const LOCAL_STORAGE_KEY = "sentinel-demo-v1"

  // Live Backend State
  const [isLiveBackend, setIsLiveBackend] = useState<boolean>(false)
  const [backendStatus, setBackendStatus] = useState<string>("Checking backend...")
  const [liveMetrics, setLiveMetrics] = useState<SecurityMetrics | null>(null)
  const [liveIntegrity, setLiveIntegrity] = useState<{
    valid: boolean
    checkedCount: number
    brokenAt?: string
    rootHash?: string
  } | null>(null)
  const [liveApprovals, setLiveApprovals] = useState<ApprovalRequest[]>([])

  // Accounts State
  const [customerAccounts, setCustomerAccounts] = useState<CustomerAccount[]>([])
  const [selectedAccountId, setSelectedAccountId] = useState<string>("ACC-1001")
  const [currentAccount, setCurrentAccount] = useState<CustomerAccount | null>(null)
  const [accountAnalytics, setAccountAnalytics] = useState<any>(null)
  const [liveTransactions, setLiveTransactions] = useState<Transaction[]>([])
  const [accountLoading, setAccountLoading] = useState<boolean>(false)
  const [aiAuditModal, setAiAuditModal] = useState<{
    open: boolean
    loading: boolean
    report: string | null
  }>({ open: false, loading: false, report: null })

  // Finance Assistant State
  const [financeStatus, setFinanceStatus] = useState<FinanceStatus | null>(null)
  const [sessionId] = useState(() => `session-${Date.now()}`)
  const [chatLoading, setChatLoading] = useState(false)
  const [financeToolActivities, setFinanceToolActivities] = useState<ToolActivity[]>([])
  const [livePendingRefund, setLivePendingRefund] = useState<PendingRefund | null>(null)

  // Live Security Monitor & SSE Events
  const [liveEvents, setLiveEvents] = useState<AuditEvent[]>([])
  const [selectedLiveEvent, setSelectedLiveEvent] = useState<AuditEvent | null>(null)

  // Incidents & Circuit Breaker
  const [liveIncidents, setLiveIncidents] = useState<Incident[]>([])
  const [circuitBreaker, setCircuitBreaker] = useState<CircuitBreakerStatus | null>(null)

  // Policy Studio State
  const [livePolicies, setLivePolicies] = useState<PolicyFile[]>([])
  const [selectedPolicyFile, setSelectedPolicyFile] = useState<string>("fintech.cedar")
  const [policyContent, setPolicyContent] = useState<string>(() => defaultPolicies[0].content)
  const [policyValidation, setPolicyValidation] = useState<{
    valid?: boolean
    errors?: string[]
  } | null>(null)
  const [copilotPrompt, setCopilotPrompt] = useState("")
  const [copilotLoading, setCopilotLoading] = useState(false)
  const [copilotResult, setCopilotResult] = useState<any>(null)

  // Identity State
  const [liveIdentities, setLiveIdentities] = useState<DemoIdentity[]>([])
  const [liveDelegations, setLiveDelegations] = useState<any[]>([])
  const [liveRevocations, setLiveRevocations] = useState<any[]>([])

  // Attack Lab State
  const [scenarioResults, setScenarioResults] = useState<Record<string, any>>({})
  const [scenarioRunning, setScenarioRunning] = useState<string | null>(null)
  const [decidingApproval, setDecidingApproval] = useState<string | null>(null)

  // Audit Compliance Report
  const [complianceReport, setComplianceReport] = useState<ComplianceReport | null>(null)
  const [complianceModalOpen, setComplianceModalOpen] = useState(false)
  const [complianceLoading, setComplianceLoading] = useState(false)

  // Local fallback messages and events
  const [messages, setMessages] = useState<
    Array<{ role: string; text: string; toolActivities?: ToolActivity[] }>
  >(() => {
    try {
      const saved = localStorage.getItem(LOCAL_STORAGE_KEY)
      if (saved) {
        const parsed = JSON.parse(saved)
        if (Array.isArray(parsed.messages)) return parsed.messages
      }
    } catch {}
    return [
      {
        role: "assistant",
        text: "Hello. I am the MCP Sentinel Finance Assistant. Every tool proposal follows zero-trust Cedar policy enforcement.",
      },
    ]
  })

  // Persistence: Save chat messages to localStorage (BUG-001)
  useEffect(() => {
    try {
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify({ messages }))
    } catch (e) {
      console.warn("Failed to save chat messages to localStorage", e)
    }
  }, [messages])

  const [localEvents, setLocalEvents] = useState<EventItem[]>([])
  const [nodePick, setNodePick] = useState("proxy")
  const [graphMode, setGraphMode] = useState<"map" | "list">("map")
  const [scenarioPick, setScenarioPick] = useState("excessive-refund")
  const [tableSearch, setTableSearch] = useState("")
  const [categoryFilter, setCategoryFilter] = useState("")
  const [eventSearch, setEventSearch] = useState("")
  const [eventFilter, setEventFilter] = useState("All results")
  const [globalSearch, setGlobalSearch] = useState("")
  const [chatInput, setChatInput] = useState("")
  const [menuOpen, setMenuOpen] = useState(false)
  const [selectedTxn, setSelectedTxn] = useState<Transaction | null>(null)
  const [enrichedSelectedTxn, setEnrichedSelectedTxn] = useState<EnrichedTransaction | null>(null)

  // Shared Security Store State Subscription
  const [storeState, setStoreState] = useState<SecurityStoreState>(() => defaultSecurityStore.getState())
  useEffect(() => {
    return defaultSecurityStore.subscribe((s) => setStoreState({ ...s }))
  }, [])

  // 100-Scenario Runner & Attack Lab State
  const [selectedCategory, setSelectedCategory] = useState<string>("ALL")
  const [runnerProgress, setRunnerProgress] = useState<RunProgress | null>(null)
  const [selectedScenarioDetail, setSelectedScenarioDetail] = useState<SecurityScenario | null>(null)
  const [selectedScenarioTrace, setSelectedScenarioTrace] = useState<ScenarioEvaluationResult | null>(null)
  const [runnerComparisonModal, setRunnerComparisonModal] = useState<RunComparison | null>(null)
  const [runnerActiveRunSummary, setRunnerActiveRunSummary] = useState<any | null>(null)
  const [attackLabSeverityFilter, setAttackLabSeverityFilter] = useState<string>("ALL")
  const [attackLabStatusFilter, setAttackLabStatusFilter] = useState<string>("ALL")
  const [attackLabSearch, setAttackLabSearch] = useState<string>("")
  const [copiedInputId, setCopiedInputId] = useState<string | null>(null)

  useEffect(() => {
    return defaultAgenticTestRunner.onProgress((prog) => {
      setRunnerProgress({ ...prog })
    })
  }, [])

  // Cedar Policy Simulation State
  const [policySimImpact, setPolicySimImpact] = useState<PolicySimulationImpact | null>(null)
  const [policySimLoading, setPolicySimLoading] = useState(false)

  // Dynamic Incident Management State
  const [selectedIncidentModal, setSelectedIncidentModal] = useState<SecurityIncident | null>(null)
  const [incidentStatusFilter, setIncidentStatusFilter] = useState<string>("ALL")
  const [incidentResolutionNotes, setIncidentResolutionNotes] = useState<string>("")
  const [toastMessage, setToastMessage] = useState<string | null>(null)

  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const chatLogRef = useRef<HTMLDivElement>(null)

  // Auto-scroll chat log to latest message (BUG-002)
  useEffect(() => {
    if (chatLogRef.current) {
      chatLogRef.current.scrollTop = chatLogRef.current.scrollHeight
    }
  }, [messages, chatLoading])

  const showToast = useCallback((msg: string) => {
    setToastMessage(msg)
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current)
    toastTimerRef.current = setTimeout(() => setToastMessage(null), 3000)
  }, [])

  // 1. Initial Health Check & Live Backend Detection
  const checkBackendHealth = useCallback(async () => {
    try {
      const h = await api.getHealth()
      if (h.status === "ok") {
        setIsLiveBackend(true)
        setBackendStatus("Port 3100 · Connected")
      }
    } catch {
      setIsLiveBackend(false)
      setBackendStatus("Port 3100 · Offline (Using Local Fallback)")
    }
  }, [])

  useEffect(() => {
    checkBackendHealth()
    const timer = setInterval(checkBackendHealth, 10000)
    return () => clearInterval(timer)
  }, [checkBackendHealth])

  // 2. Data Loaders
  const loadOverviewData = useCallback(async () => {
    try {
      const [m, i, a, evts] = await Promise.all([
        api.getMetrics().catch(() => null),
        api.verifyIntegrity().catch(() => null),
        api.getApprovals().catch(() => ({ approvals: [] })),
        api.getEvents({ limit: "10" }).catch(() => ({ events: [] })),
      ])
      if (m) setLiveMetrics(m)
      if (i) setLiveIntegrity(i)
      if (a?.approvals) setLiveApprovals(a.approvals)
      if (evts?.events) setLiveEvents(evts.events)
    } catch (err) {
      console.warn("Live overview load warning:", err)
    }
  }, [])

  const loadAccountsData = useCallback(async (accId: string) => {
    setAccountLoading(true)
    try {
      const [accs, details, txns] = await Promise.all([
        api.getAccounts().catch(() => ({ accounts: [] })),
        api.getAccountDetails(accId).catch(() => null),
        api
          .getAccountTransactions(accId, {
            category: categoryFilter,
            search: tableSearch,
          })
          .catch(() => ({ transactions: [], count: 0 })),
      ])
      if (accs?.accounts?.length) setCustomerAccounts(accs.accounts)
      if (details) {
        setCurrentAccount(details.account)
        setAccountAnalytics(details.analytics)
      }
      if (txns?.transactions) setLiveTransactions(txns.transactions)
    } catch (err) {
      console.warn("Accounts load error:", err)
    } finally {
      setAccountLoading(false)
    }
  }, [categoryFilter, tableSearch])

  const loadMonitorData = useCallback(async () => {
    try {
      const res = await api.getEvents({ limit: "100" })
      if (res?.events) setLiveEvents(res.events)
    } catch (err) {
      console.warn("Monitor events load error:", err)
    }
  }, [])

  const loadIncidentsData = useCallback(async () => {
    try {
      const [incRes, cbRes] = await Promise.all([
        api.getIncidents().catch(() => ({ incidents: [] })),
        api.getCircuitBreaker().catch(() => ({ statuses: [] })),
      ])
      if (incRes?.incidents) setLiveIncidents(incRes.incidents)
      if (cbRes?.statuses?.length) setCircuitBreaker(cbRes.statuses[0])
    } catch (err) {
      console.warn("Incidents load error:", err)
    }
  }, [])

  const loadPoliciesData = useCallback(async () => {
    try {
      const res = await api.getPolicies()
      if (res?.policies?.length) {
        setLivePolicies(res.policies)
        setSelectedPolicyFile((prev) => {
          const match = res.policies.find((p) => p.name === prev)
          const active = match || res.policies[0]
          setPolicyContent(active.content)
          return active.name
        })
      }
    } catch (err) {
      console.warn("Policies load error:", err)
    }
  }, [])

  const loadIdentityData = useCallback(async () => {
    try {
      const [idRes, delRes, revRes] = await Promise.all([
        api.getIdentities().catch(() => ({ identities: [] })),
        api.getDelegations().catch(() => ({ delegations: [] })),
        api.getRevocations().catch(() => ({ revocations: [] })),
      ])
      if (idRes?.identities) setLiveIdentities(idRes.identities)
      if (delRes?.delegations) setLiveDelegations(delRes.delegations)
      if (revRes?.revocations) setLiveRevocations(revRes.revocations)
    } catch (err) {
      console.warn("Identity load error:", err)
    }
  }, [])

  const loadFinanceStatus = useCallback(async () => {
    try {
      const [st, p] = await Promise.all([
        api.getFinanceStatus().catch(() => null),
        api.getPendingRefunds().catch(() => ({ pendingRefunds: [] })),
      ])
      if (st) setFinanceStatus(st)
      if (p?.pendingRefunds?.length) setLivePendingRefund(p.pendingRefunds[0])
    } catch (err) {
      console.warn("Finance status load error:", err)
    }
  }, [])

  // Route resolution (computed before view loaders)
  const getCleanRoute = useCallback(() => {
    let r = currentPath.replace(/^#/, "")
    if (!r.startsWith("/")) r = "/" + r
    const clean = r.split("?")[0]
    if (
      [
        "/console",
        "/accounts",
        "/finance",
        "/graph",
        "/monitor",
        "/incidents",
        "/policies",
        "/identity",
        "/attack-lab",
        "/audit",
      ].includes(clean)
    ) {
      return clean
    }
    return "/console"
  }, [currentPath])

  const activeRoute = getCleanRoute()

  // 3. Connect Real-Time SSE Stream
  useEffect(() => {
    if (!isLiveBackend) return
    const cleanup = createEventStream((evt) => {
      if (evt.type === "audit_event" && evt.data) {
        setLiveEvents((prev) => [evt.data, ...prev.slice(0, 199)])
        showToast(`Live Event: ${evt.data.toolName} · ${evt.data.decision || "LOGGED"}`)
      }
      if (evt.type === "circuit_breaker") {
        loadIncidentsData()
      }
    })
    return cleanup
  }, [isLiveBackend, loadIncidentsData, showToast])

  // 4. Trigger loaders on view change (only load data relevant to current view) (BUG-003)
  useEffect(() => {
    if (!isLiveBackend) return
    loadOverviewData()
    if (activeRoute === "/accounts") loadAccountsData(selectedAccountId)
    if (activeRoute === "/finance") {
      loadFinanceStatus()
      loadAccountsData(selectedAccountId)
    }
    if (activeRoute === "/monitor" || activeRoute === "/audit") loadMonitorData()
    if (activeRoute === "/incidents") loadIncidentsData()
    if (activeRoute === "/policies") loadPoliciesData()
    if (activeRoute === "/identity") loadIdentityData()
  }, [
    isLiveBackend,
    activeRoute,
    loadOverviewData,
    loadAccountsData,
    loadMonitorData,
    loadIncidentsData,
    loadPoliciesData,
    loadIdentityData,
    loadFinanceStatus,
    selectedAccountId,
  ])

  // Dedicated effect for account switching (BUG-006)
  useEffect(() => {
    if (isLiveBackend && (activeRoute === "/accounts" || activeRoute === "/finance")) {
      loadAccountsData(selectedAccountId)
    }
  }, [selectedAccountId, isLiveBackend, activeRoute, loadAccountsData])

  // Offline mode account switching state update (BUG-006 / BUG-013)
  useEffect(() => {
    if (!isLiveBackend) {
      const acc = defaultCustomerAccounts.find((a) => a.id === selectedAccountId) || defaultCustomerAccounts[0]
      setCurrentAccount(acc)
    }
  }, [selectedAccountId, isLiveBackend])

  const handleNavClick = (path: string, e: React.MouseEvent) => {
    e.preventDefault()
    setMenuOpen(false)
    onNavigate(path)
  }

  // ── Handlers for Live Actions ──────────────────────────────────
  const handleSendMessage = async (textToSend?: string) => {
    const text = (textToSend || chatInput).trim()
    if (!text) return

    setMessages((prev) => [...prev, { role: "user", text }])
    setChatInput("")
    setChatLoading(true)

    if (isLiveBackend) {
      try {
        const res = await api.sendFinanceChat(text, sessionId, selectedAccountId)
        if (res.response) {
          setMessages((prev) => [
            ...prev,
            {
              role: "assistant",
              text: res.response,
              toolActivities: res.toolActivities,
            },
          ])
        }
        if (res.toolActivities?.length) {
          setFinanceToolActivities((prev) => [...prev, ...res.toolActivities])
        }
        if (res.pendingRefund) {
          setLivePendingRefund(res.pendingRefund)
          showToast("Sensitive refund paused for human supervisor review")
        }
        loadOverviewData()
        loadMonitorData()
      } catch (err: any) {
        setMessages((prev) => [
          ...prev,
          { role: "assistant", text: `Execution error: ${err.message}` },
        ])
      } finally {
        setChatLoading(false)
      }
    } else {
      // Local demo fallback
      setTimeout(() => {
        setMessages((prev) => [
          ...prev,
          {
            role: "assistant",
            text: `[Sample Response]: Evaluated policy for "${text}". Permitted within sample account ACC-1001.`,
          },
        ])
        setChatLoading(false)
      }, 500)
    }
  }

  const handleConfirmRefund = async (confirmationId: string) => {
    try {
      const res = await api.confirmRefund(confirmationId)
      if (res.success) {
        showToast("Refund confirmed and executed through protected MCP tool!")
        setLivePendingRefund(null)
        loadAccountsData(selectedAccountId)
        loadOverviewData()
        loadMonitorData()
      } else {
        showToast(`Refund error: ${res.error || "Failed"}`)
      }
    } catch (err: any) {
      showToast(`Error confirming refund: ${err.message}`)
    }
  }

  const handleRejectRefund = async (confirmationId: string) => {
    try {
      await api.rejectRefund(confirmationId)
      showToast("Refund request rejected by supervisor")
      setLivePendingRefund(null)
      loadOverviewData()
      loadMonitorData()
    } catch (err: any) {
      showToast(`Error rejecting refund: ${err.message}`)
    }
  }

  const handleResetFinance = async () => {
    if (isLiveBackend) {
      try {
        await api.resetFinance()
        setMessages([
          {
            role: "assistant",
            text: "Hello! The demo ledger, transaction records, and conversation history have been reset to their initial clean state. How can I help you?",
          },
        ])
        setFinanceToolActivities([])
        setLivePendingRefund(null)
        showToast("Finance ledger & assistant reset")
        loadAccountsData(selectedAccountId)
      } catch (err: any) {
        showToast(`Reset error: ${err.message}`)
      }
    } else {
      setMessages([
        {
          role: "assistant",
          text: "New sample conversation. Ask about the fictional ledger or propose a controlled action.",
        },
      ])
      showToast("Local conversation reset")
    }
  }

  const handleToggleAccountStatus = async (status: "active" | "suspended") => {
    try {
      await api.setAccountStatus(selectedAccountId, status, "Changed via Security Console")
      showToast(`Account ${selectedAccountId} is now ${status}`)
      loadAccountsData(selectedAccountId)
    } catch (err: any) {
      showToast(`Status update failed: ${err.message}`)
    }
  }

  const handleRunAiAudit = async () => {
    setAiAuditModal({ open: true, loading: true, report: null })
    try {
      const res = await api.runAiAudit(selectedAccountId)
      setAiAuditModal({ open: true, loading: false, report: res.report })
    } catch (err: any) {
      setAiAuditModal({
        open: true,
        loading: false,
        report: `Failed to run AI Audit: ${err.message}`,
      })
    }
  }

  const handleRunScenario = async (id: string) => {
    setScenarioRunning(id)
    try {
      const scenario = getScenarioById(id)
      if (scenario) {
        const result = await defaultAgenticTestRunner.startScenario(id)
        setSelectedScenarioTrace(result)
        setScenarioResults((prev) => ({
          ...prev,
          [id]: {
            description: result.defenseNotes,
            decision: result.actualPolicyDecision,
            verdict: result.verdict,
            executionPrevented: result.executionPrevented,
            canaryDisclosed: result.canaryDisclosed,
            details: result,
          },
        }))
        showToast(`Scenario ${id}: ${result.verdict} (${result.actualPolicyDecision})`)
      } else if (isLiveBackend) {
        const res = await api.simulate(id)
        setScenarioResults((prev) => ({ ...prev, [id]: res }))
        showToast(`Scenario executed: ${res.decision || "Outcome recorded"}`)
      }
      loadOverviewData()
      loadMonitorData()
      loadIncidentsData()
    } catch (err: any) {
      setScenarioResults((prev) => ({ ...prev, [id]: { error: err.message } }))
      showToast(`Simulation error: ${err.message}`)
    } finally {
      setScenarioRunning(null)
    }
  }

  // 100-Scenario Suite Execution
  const handleRunAll100Scenarios = async () => {
    showToast("Launching full 100-scenario adversarial testing suite...")
    try {
      const summary = await defaultAgenticTestRunner.startSuite()
      setRunnerActiveRunSummary(summary)
      defaultSecurityStore.recordTestRunCompleted(summary)
      showToast(`100-scenario suite completed! Passed: ${summary.passedScenarios}/${summary.totalScenarios}`)
      loadOverviewData()
      loadMonitorData()
    } catch (err: any) {
      showToast(`Suite execution failed: ${err.message}`)
    }
  }

  // Category Execution (10 Scenarios)
  const handleRunSelectedCategory = async (cat: ScenarioCategory) => {
    showToast(`Launching ${cat.replace("CAT", "").replace(/_/g, " ")} (10 scenarios)...`)
    try {
      const summary = await defaultAgenticTestRunner.startCategory(cat)
      setRunnerActiveRunSummary(summary)
      defaultSecurityStore.recordTestRunCompleted(summary)
      showToast(`Category test completed! Passed: ${summary.passedScenarios}/10`)
      loadOverviewData()
      loadMonitorData()
    } catch (err: any) {
      showToast(`Category run failed: ${err.message}`)
    }
  }

  const handlePauseSuite = () => {
    defaultAgenticTestRunner.pause()
    showToast("Test suite run paused")
  }

  const handleResumeSuite = async () => {
    showToast("Resuming test suite execution...")
    try {
      const summary = await defaultAgenticTestRunner.resume()
      setRunnerActiveRunSummary(summary)
      showToast(`Suite completed! Passed: ${summary.passedScenarios}/${summary.totalScenarios}`)
    } catch (err: any) {
      showToast(`Resume failed: ${err.message}`)
    }
  }

  const handleCancelSuite = () => {
    defaultAgenticTestRunner.cancel()
    showToast("Test suite run cancelled")
  }

  const handleRetryFailedSuite = async () => {
    showToast("Retrying failed/error scenarios...")
    try {
      const summary = await defaultAgenticTestRunner.retryFailed()
      setRunnerActiveRunSummary(summary)
      showToast(`Retry completed! Passed: ${summary.passedScenarios}/${summary.totalScenarios}`)
    } catch (err: any) {
      showToast(`Retry failed: ${err.message}`)
    }
  }

  const handleExportRunReport = (format: "json" | "markdown") => {
    const activeRunId = defaultAgenticTestRunner.getActiveRunId() || "RUN-DEFAULT"
    try {
      const content = defaultAgenticTestRunner.exportReport(activeRunId, format)
      const blob = new Blob([content], { type: format === "json" ? "application/json" : "text/markdown" })
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = `byteshield-security-report-${activeRunId}.${format === "json" ? "json" : "md"}`
      a.click()
      URL.revokeObjectURL(url)
      showToast(`Exported ${format.toUpperCase()} test report`)
    } catch (err: any) {
      showToast(`Export failed: ${err.message}`)
    }
  }

  const handleSimulatePolicyImpact = () => {
    setPolicySimLoading(true)
    setTimeout(() => {
      try {
        const impact = defaultCedarCopilot.simulatePolicyImpact(policyContent)
        setPolicySimImpact(impact)
        showToast(`Policy simulated against 100 scenarios! Risk: ${impact.recommendation}`)
      } catch (err: any) {
        showToast(`Policy simulation error: ${err.message}`)
      } finally {
        setPolicySimLoading(false)
      }
    }, 300)
  }

  const handleUpdateIncidentLifecycle = (incidentId: string, status: IncidentStatus) => {
    const success = defaultSecurityStore.updateIncidentStatus(
      incidentId,
      status,
      "security-lead@byteshield.local",
      incidentResolutionNotes,
    )
    if (success) {
      showToast(`Incident ${incidentId} marked as ${status}`)
      setIncidentResolutionNotes("")
      setSelectedIncidentModal(null)
      loadIncidentsData()
    } else {
      showToast(`Failed to update incident ${incidentId}`)
    }
  }

  const handleOpenTransactionDetail = (txn: Transaction) => {
    setSelectedTxn(txn)
    const enriched = defaultSecurityStore.getTransaction(txn.id)
    setEnrichedSelectedTxn(enriched || null)
  }

  const handleSupervisorApprovalDecision = async (
    approvalId: string,
    decision: "approve" | "reject",
  ) => {
    setDecidingApproval(approvalId)
    try {
      const res = await api.decideApproval(approvalId, decision)
      showToast(`Supervisor decision recorded: ${decision.toUpperCase()}`)
      loadOverviewData()
      loadMonitorData()
      // update scenario results if applicable
      setScenarioResults((prev) => ({
        ...prev,
        "step-up-approval": {
          ...prev["step-up-approval"],
          approval: res.approval,
          description: `Supervisor decided: ${decision.toUpperCase()}! Action was ${
            decision === "approve" ? "ALLOWED and executed" : "REJECTED"
          }.`,
        },
      }))
    } catch (err: any) {
      showToast(`Approval decision failed: ${err.message}`)
    } finally {
      setDecidingApproval(null)
    }
  }

  const handleResetBreaker = async () => {
    try {
      await api.resetCircuitBreaker()
      showToast("Circuit breaker reset · agent quarantine lifted")
      loadIncidentsData()
    } catch {
      setCircuitBreaker({
        agentIdentity: "spiffe://demo.local/agent/financial-remediation",
        state: "CLOSED",
        failureCount: 0,
        quarantineReason: "Circuit breaker manually reset to normal operation.",
      })
      showToast("Circuit breaker reset · agent quarantine lifted")
    }
  }

  const handleValidatePolicy = async () => {
    try {
      const res = await api.validatePolicy(policyContent)
      setPolicyValidation(res)
      showToast(res.valid ? "Policy syntax valid" : "Cedar syntax errors detected")
    } catch {
      const hasPermitOrForbid = /^\s*(permit|forbid)\s*\(/m.test(policyContent)
      const hasSemi = policyContent.trim().endsWith(";")
      if (hasPermitOrForbid && hasSemi) {
        setPolicyValidation({ valid: true, errors: [] })
        showToast("Policy syntax valid (local Cedar validator)")
      } else {
        const errors: string[] = []
        if (!hasPermitOrForbid) errors.push("Expected 'permit' or 'forbid' statement")
        if (!hasSemi) errors.push("Statement must end with semicolon ';'")
        setPolicyValidation({ valid: false, errors })
        showToast("Cedar syntax errors detected")
      }
    }
  }

  const handleSavePolicy = async () => {
    try {
      const res = await api.updatePolicy(selectedPolicyFile, policyContent)
      if (res.success) {
        showToast("Policy file saved and re-indexed into Cedar Engine")
        loadPoliciesData()
      } else {
        showToast(`Save failed: ${res.errors?.join(", ")}`)
      }
    } catch {
      setLivePolicies((prev) => {
        const existing = prev.length ? [...prev] : [...defaultPolicies]
        const idx = existing.findIndex((p) => p.name === selectedPolicyFile)
        if (idx >= 0) {
          existing[idx] = { ...existing[idx], content: policyContent, loadedAt: new Date().toISOString() }
        } else {
          existing.push({ name: selectedPolicyFile, content: policyContent, loadedAt: new Date().toISOString() })
        }
        return existing
      })
      showToast("Policy saved locally in session")
    }
  }

  const handleGenerateCopilotPolicy = async () => {
    if (!copilotPrompt.trim()) return
    setCopilotLoading(true)
    try {
      const res = await api.generatePolicy(copilotPrompt)
      setCopilotResult(res)
      if (res.generatedPolicy) {
        setPolicyContent(res.generatedPolicy)
      }
      showToast("Cedar Copilot policy generated")
    } catch {
      // Local copilot fallback
      const cleanPrompt = copilotPrompt.trim().toLowerCase()
      const isForbid = cleanPrompt.includes("block") || cleanPrompt.includes("forbid") || cleanPrompt.includes("deny")
      const action = cleanPrompt.includes("refund") ? "issue_refund" : "read_account"
      const effect = isForbid ? "forbid" : "permit"
      const generated = `// Generated by Sentinel Cedar Copilot (Local Engine)\n// Intent: "${copilotPrompt}"\n@id("copilot-${effect}-${Date.now().toString().slice(-4)}")\n${effect} (\n  principal == MCPSentinel::Agent::"spiffe://demo.local/agent/financial-remediation",\n  action == MCPSentinel::Action::"${action}",\n  resource\n)\nwhen {\n  resource.status == "active"\n};`
      setPolicyContent(generated)
      setCopilotResult({
        prompt: copilotPrompt,
        generatedPolicy: generated,
        explanation: `${effect.toUpperCase()} policy generated for ${action}`,
        valid: true,
      })
      showToast("Cedar Copilot policy generated locally")
    } finally {
      setCopilotLoading(false)
    }
  }

  const handleIssueToken = async (subject: string) => {
    try {
      const caps = subject.includes("read-only")
        ? ["ledger.read", "customer.read"]
        : ["ledger.read", "customer.read", "ledger.refund"]
      const res = await api.issueToken({
        subject,
        capabilities: caps,
        authorizedResources: ["ACC-1001"],
        maxRefundAmount: 50,
        ttlSeconds: 300,
      })
      showToast(`Ed25519 token issued for ${subject.split("/").pop()}`)
      loadIdentityData()
    } catch {
      const newToken: DemoToken = {
        id: `tok_ed25519_${Date.now().toString(36)}`,
        subject,
        capabilities: subject.includes("read-only")
          ? ["ledger.read", "customer.read"]
          : ["ledger.read", "customer.read", "ledger.refund"],
        authorizedResources: ["ACC-1001"],
        maxRefundAmount: 5000,
        issuedAt: new Date().toISOString(),
        expiresAt: new Date(Date.now() + 3600000).toISOString(),
        revoked: false,
      }
      setLiveIdentities((prev) => {
        const base = prev.length ? prev : defaultIdentities
        return base.map((ident) =>
          ident.uri === subject
            ? { ...ident, tokens: [...(ident.tokens || []), newToken] }
            : ident
        )
      })
      showToast(`Ed25519 token issued for ${subject.split("/").pop()}`)
    }
  }

  const handleRevokeToken = async (tokenId: string) => {
    try {
      await api.revokeToken(tokenId, "Revoked from Security Console")
      showToast(`Token ${tokenId.slice(0, 10)}... revoked`)
      loadIdentityData()
    } catch {
      setLiveIdentities((prev) => {
        const base = prev.length ? prev : defaultIdentities
        return base.map((ident) => ({
          ...ident,
          tokens: (ident.tokens || []).filter((t) => t.id !== tokenId),
        }))
      })
      showToast(`Token ${tokenId.slice(0, 10)}... revoked`)
    }
  }

  const handleGenerateComplianceReport = async () => {
    setComplianceLoading(true)
    try {
      const rep = await api.getComplianceReport()
      setComplianceReport(rep)
      setComplianceModalOpen(true)
    } catch (err: any) {
      showToast(`Compliance report error: ${err.message}`)
    } finally {
      setComplianceLoading(false)
    }
  }

  const handleDownloadComplianceMarkdown = () => {
    if (!complianceReport) return
    let md = `# Executive & Compliance Security Audit Report\n\n`
    md += `**Report ID:** ${complianceReport.reportId}\n`
    md += `**Generated At:** ${complianceReport.generatedAt}\n`
    md += `**Cryptographic Hash Chain Integrity:** ${
      complianceReport.chainIntegrity ? "VERIFIED VALID" : "FAILED"
    }\n`
    md += `**Root Hash:** \`${complianceReport.rootHash}\`\n`
    md += `**Total Events Verified:** ${complianceReport.totalEventsVerified}\n\n`
    md += `## Framework Compliance Mapping\n\n`

    for (const std of complianceReport.standards) {
      md += `### ${std.name} (${std.code}) — Status: ${std.status}\n\n`
      md += `| Control ID | Description | Enforcement Mechanism | Status |\n`
      md += `| :--- | :--- | :--- | :--- |\n`
      for (const ctrl of std.controls) {
        md += `| ${ctrl.id} | ${ctrl.description} | ${ctrl.enforcementMechanism} | ${ctrl.status} |\n`
      }
      md += `\n`
    }

    const blob = new Blob([md], { type: "text/markdown" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `executive-compliance-report-${complianceReport.reportId}.md`
    a.click()
    URL.revokeObjectURL(url)
    showToast("Downloaded compliance report markdown")
  }

  const handleExportAuditJSON = () => {
    const dataToExport = isLiveBackend && liveEvents.length ? liveEvents : defaultEvents
    const blob = new Blob(
      [
        JSON.stringify(
          {
            label: "MCP Sentinel Cryptographic Audit Export",
            exportedAt: new Date().toISOString(),
            integrityVerified: liveIntegrity?.valid ?? true,
            totalRecords: dataToExport.length,
            records: dataToExport,
          },
          null,
          2,
        ),
      ],
      { type: "application/json" },
    )
    const u = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = u
    a.download = "mcp-sentinel-audit-export.json"
    a.click()
    URL.revokeObjectURL(u)
    showToast("Audit JSON exported")
  }

  const handleResetAll = async () => {
    if (window.confirm("Reset all demo data, audit logs, and transaction ledgers?")) {
      if (isLiveBackend) {
        try {
          await api.resetAll()
          showToast("All backend state reset to genesis")
          loadOverviewData()
          loadAccountsData(selectedAccountId)
          loadMonitorData()
        } catch (err: any) {
          showToast(`Reset error: ${err.message}`)
        }
      } else {
        localStorage.removeItem(LOCAL_STORAGE_KEY)
        setMessages([
          {
            role: "assistant",
            text: "New sample conversation. Ask about the fictional ledger or propose a controlled action.",
          },
        ])
        setLocalEvents([])
        showToast("Demo state reset")
      }
    }
  }

  // Icons Helper
  const renderIcon = (name: string) => {
    switch (name) {
      case "shield":
        return (
          <svg className="ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 3 20 6v5c0 5-3.4 8.5-8 10-4.6-1.5-8-5-8-10V6l8-3Z" />
            <path d="m8.5 12 2.2 2.2 4.8-5" />
          </svg>
        )
      case "grid":
        return (
          <svg className="ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
            <rect x="4" y="4" width="6" height="6" rx="1" /><rect x="14" y="4" width="6" height="6" rx="1" />
            <rect x="4" y="14" width="6" height="6" rx="1" /><rect x="14" y="14" width="6" height="6" rx="1" />
          </svg>
        )
      case "wallet":
        return (
          <svg className="ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="5" width="18" height="15" rx="2" /><path d="M3 9h18m-5 5h2" />
          </svg>
        )
      case "spark":
        return (
          <svg className="ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
            <path d="m12 3 2 6 6 3-6 2-2 7-2-7-6-2 6-3 2-6Z" />
          </svg>
        )
      case "nodes":
        return (
          <svg className="ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="6" cy="7" r="2" /><circle cx="18" cy="6" r="2" /><circle cx="12" cy="18" r="2" />
            <path d="m8 7 8-1M7 9l4 7m6-8-4 8" />
          </svg>
        )
      case "activity":
        return (
          <svg className="ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 12h4l2-7 4 14 3-7h5" />
          </svg>
        )
      case "alert":
        return (
          <svg className="ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
            <path d="m10 4-8 14a2 2 0 0 0 2 3h16a2 2 0 0 0 2-3L14 4a2 2 0 0 0-4 0Z" /><path d="M12 9v4m0 3h.01" />
          </svg>
        )
      case "file":
        return (
          <svg className="ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
            <path d="M14 2H6a2 2 0 0 0-2 2v16h16V8Z" /><path d="M14 2v6h6M8 13h8m-8 4h8" />
          </svg>
        )
      case "key":
        return (
          <svg className="ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="8" cy="15" r="4" /><path d="m11 12 8-8 2 2-2 2 2 2-2 2-2-2-3 3" />
          </svg>
        )
      case "flask":
        return (
          <svg className="ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
            <path d="M9 3h6m-5 0v6l-5 9a2 2 0 0 0 2 3h10a2 2 0 0 0 2-3l-5-9V3" />
          </svg>
        )
      case "audit":
        return (
          <svg className="ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
            <path d="M6 3h12l3 3v15H3V3Zm2 8h8m-8 4h8" />
          </svg>
        )
      case "home":
        return (
          <svg className="ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
            <path d="m3 10 9-7 9 7v10h-6v-7H9v7H3Z" />
          </svg>
        )
      case "search":
        return (
          <svg className="ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="10" cy="10" r="6" /><path d="m15 15 5 5" />
          </svg>
        )
      case "reset":
        return (
          <svg className="ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
            <path d="M4 8a8 8 0 1 1-1 5M4 3v5h5" />
          </svg>
        )
      case "arrow":
        return (
          <svg className="ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
            <path d="M5 12h14m-6-6 6 6-6 6" />
          </svg>
        )
      case "check":
        return (
          <svg className="ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
            <path d="m5 12 4 4L19 6" />
          </svg>
        )
      case "clock":
        return (
          <svg className="ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" />
          </svg>
        )
      case "lock":
        return (
          <svg className="ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
            <rect x="4" y="10" width="16" height="11" rx="2" /><path d="M8 10V7a4 4 0 1 1 8 0v3" />
          </svg>
        )
      case "send":
        return (
          <svg className="ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
            <path d="m22 2-7 20-4-9-9-4Z" /><path d="M22 2 11 13" />
          </svg>
        )
      case "download":
        return (
          <svg className="ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 3v12m-5-5 5 5 5-5M5 20h14" />
          </svg>
        )
      case "close":
        return (
          <svg className="ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
            <path d="m6 6 12 12M18 6 6 18" />
          </svg>
        )
      default:
        return (
          <svg className="ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" />
          </svg>
        )
    }
  }

  return (
    <div className="console-root">
      {menuOpen && (
        <div
          className="sidebar-backdrop"
          onClick={() => setMenuOpen(false)}
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0, 0, 0, 0.65)",
            backdropFilter: "blur(2px)",
            zIndex: 40,
          }}
        />
      )}
      <div className={`shell ${menuOpen ? "menu-open" : ""}`} id="shell">
        {/* Left Rail Sidebar */}
        <aside className="sidebar">
          <a className="brand" href="#/" onClick={(e) => handleNavClick("/", e)}>
            <span className="brand-icon">{renderIcon("shield")}</span>
            <span>
              MCP SENTINEL<small>OBSIDIAN FLOW</small>
            </span>
          </a>

          <div className="env">
            <b>
              {isLiveBackend ? "BACKEND CONNECTED" : "DEMO ENVIRONMENT"}{" "}
              <span style={{ color: isLiveBackend ? "var(--mint)" : "var(--amber)" }}>●</span>
            </b>
            <p>{backendStatus}</p>
          </div>

          <div className="nav-title">Workspace</div>
          <a
            className={`nav-item ${activeRoute === "/console" ? "active" : ""}`}
            href="#/console"
            onClick={(e) => handleNavClick("/console", e)}
          >
            {renderIcon("grid")}
            <span>Overview</span>
          </a>
          <a
            className={`nav-item ${activeRoute === "/accounts" ? "active" : ""}`}
            href="#/accounts"
            onClick={(e) => handleNavClick("/accounts", e)}
          >
            {renderIcon("wallet")}
            <span>Accounts</span>
          </a>
          <a
            className={`nav-item ${activeRoute === "/finance" ? "active" : ""}`}
            href="#/finance"
            onClick={(e) => handleNavClick("/finance", e)}
          >
            {renderIcon("spark")}
            <span>Finance assistant</span>
          </a>

          <div className="nav-title">Security</div>
          <a
            className={`nav-item ${activeRoute === "/graph" ? "active" : ""}`}
            href="#/graph"
            onClick={(e) => handleNavClick("/graph", e)}
          >
            {renderIcon("nodes")}
            <span>Architecture graph</span>
          </a>
          <a
            className={`nav-item ${activeRoute === "/monitor" ? "active" : ""}`}
            href="#/monitor"
            onClick={(e) => handleNavClick("/monitor", e)}
          >
            {renderIcon("activity")}
            <span>Monitor</span>
          </a>
          <a
            className={`nav-item ${activeRoute === "/incidents" ? "active" : ""}`}
            href="#/incidents"
            onClick={(e) => handleNavClick("/incidents", e)}
          >
            {renderIcon("alert")}
            <span>Incidents</span>
          </a>
          <a
            className={`nav-item ${activeRoute === "/policies" ? "active" : ""}`}
            href="#/policies"
            onClick={(e) => handleNavClick("/policies", e)}
          >
            {renderIcon("file")}
            <span>Policies</span>
          </a>
          <a
            className={`nav-item ${activeRoute === "/identity" ? "active" : ""}`}
            href="#/identity"
            onClick={(e) => handleNavClick("/identity", e)}
          >
            {renderIcon("key")}
            <span>Agent identity</span>
          </a>

          <div className="nav-title">Demonstrations</div>
          <a
            className={`nav-item ${activeRoute === "/attack-lab" ? "active" : ""}`}
            href="#/attack-lab"
            onClick={(e) => handleNavClick("/attack-lab", e)}
          >
            {renderIcon("flask")}
            <span>Attack lab</span>
          </a>
          <a
            className={`nav-item ${activeRoute === "/audit" ? "active" : ""}`}
            href="#/audit"
            onClick={(e) => handleNavClick("/audit", e)}
          >
            {renderIcon("audit")}
            <span>Audit explorer</span>
          </a>

          <div className="nav-bottom">
            <a className="nav-item" href="#/" onClick={(e) => handleNavClick("/", e)}>
              {renderIcon("home")}
              <span>Back to product site</span>
            </a>
            <div className="profile">
              <span className="avatar">NS</span>
              <span>
                Sentinel workspace<small>Enterprise Operator</small>
              </span>
            </div>
          </div>
        </aside>

        {/* Main Console Content */}
        <main className="main">
          {/* Topbar */}
          <header className="topbar">
            <div className="crumb">
              <button
                className="btn small mobile-menu-btn"
                type="button"
                onClick={() => setMenuOpen(!menuOpen)}
              >
                {renderIcon("grid")}
              </button>
              <span>Sentinel</span> /{" "}
              <strong>
                {activeRoute === "/console"
                  ? "Overview"
                  : activeRoute === "/accounts"
                    ? "Accounts"
                    : activeRoute === "/finance"
                      ? "Finance assistant"
                      : activeRoute === "/graph"
                        ? "Architecture graph"
                        : activeRoute === "/monitor"
                          ? "Security monitor"
                          : activeRoute === "/incidents"
                            ? "Incident explorer"
                            : activeRoute === "/policies"
                              ? "Policy explorer"
                              : activeRoute === "/identity"
                                ? "Agent identity"
                                : activeRoute === "/attack-lab"
                                  ? "Attack lab"
                                  : "Audit explorer"}
              </strong>
            </div>

            <div className="top-actions">
              <label className="search">
                {renderIcon("search")}
                <input
                  id="global-search"
                  placeholder="Search this view"
                  aria-label="Search this view"
                  value={globalSearch}
                  onChange={(e) => setGlobalSearch(e.target.value)}
                />
              </label>
              <span className={`pill ${isLiveBackend ? "good" : ""}`}>
                {isLiveBackend ? "Live Backend" : "Sample Data"}
              </span>
              <button
                className="btn small reset"
                type="button"
                onClick={handleResetAll}
              >
                {renderIcon("reset")}
                <span>Reset demo</span>
              </button>
            </div>
          </header>

          <div className="content">
            {/* View 1: /console (Overview) */}
            {activeRoute === "/console" && (
              <>
                <div className="page-head">
                  <div>
                    <div className="eyebrow">
                      {isLiveBackend ? "MCP SENTINEL / LIVE RUNTIME" : "MCP SENTINEL / PROTOTYPE"}
                    </div>
                    <h1>Security overview</h1>
                    <p>
                      {isLiveBackend
                        ? "Real-time authorization telemetry and cryptographically chained audit events from port 3100."
                        : "A clear view of sample authorization activity and demo state."}
                    </p>
                  </div>
                  <div className="page-actions">
                    <button
                      className="btn small"
                      type="button"
                      onClick={(e) => handleNavClick("/monitor", e)}
                    >
                      <span>Open monitor</span> {renderIcon("arrow")}
                    </button>
                    <button
                      className="btn small primary"
                      type="button"
                      onClick={(e) => handleNavClick("/attack-lab", e)}
                    >
                      <span>Run a scenario</span> {renderIcon("arrow")}
                    </button>
                  </div>
                </div>

                <div className="banner">
                  <span className="banner-icon">{renderIcon("shield")}</span>
                  <div>
                    <b>
                      {isLiveBackend
                        ? "Zero-Trust Enforcement Layer Active"
                        : "Control path ready for demonstration"}
                    </b>
                    <p>
                      {isLiveBackend
                        ? `Live Cedar policy engine ready · ${liveIntegrity?.checkedCount || 0} audit records verified · SQLite persistence active.`
                        : "Sample requests show the intended policy flow. No live backend is connected."}
                    </p>
                  </div>
                  <span className="pill good">
                    {isLiveBackend ? "Port 3100 Active" : "Prototype state"}
                  </span>
                </div>

                <div className="metrics">
                  <div className="metric">
                    <div className="metric-label">
                      <span>Evaluated requests</span>
                      {renderIcon("activity")}
                    </div>
                    <div className="metric-value">
                      {liveMetrics
                        ? liveMetrics.totalInvocations.toLocaleString()
                        : storeState.totalTestRuns.toLocaleString()}
                    </div>
                    <div className="metric-note">
                      {isLiveBackend ? "Live backend telemetry" : `${storeState.completedRuns} security test runs recorded`}
                    </div>
                  </div>

                  <div className="metric">
                    <div className="metric-label">
                      <span>Blocked attacks</span>
                      {renderIcon("lock")}
                    </div>
                    <div className="metric-value">
                      {liveMetrics ? liveMetrics.blockedRequests : storeState.blockedUnauthorizedActions}
                    </div>
                    <div className="metric-note">
                      {liveMetrics && liveMetrics.totalInvocations > 0
                        ? `${(
                            (liveMetrics.blockedRequests / liveMetrics.totalInvocations) *
                            100
                          ).toFixed(1)}% enforcement rate`
                        : `${storeState.deniedActions} policy denials enforced`}
                    </div>
                  </div>

                  <div className="metric">
                    <div className="metric-label">
                      <span>Open incidents</span>
                      {renderIcon("alert")}
                    </div>
                    <div className="metric-value">
                      {String(storeState.incidents.filter((i) => i.status !== "RESOLVED").length).padStart(2, "0")}
                    </div>
                    <div className="metric-note">
                      {storeState.incidents.filter((i) => i.severity === "CRITICAL" && i.status !== "RESOLVED").length > 0
                        ? "Critical threats requiring review"
                        : "Operational triage normal"}
                    </div>
                  </div>

                  <div className="metric">
                    <div className="metric-label">
                      <span>Audit chain</span>
                      {renderIcon("audit")}
                    </div>
                    <div className="metric-value" style={{ color: "var(--mint)" }}>
                      {(liveIntegrity?.valid ?? storeState.auditHashChainValid)
                        ? "Verified"
                        : "Tampered"}
                    </div>
                    <div className="metric-note">
                      {liveIntegrity
                        ? `${liveIntegrity.checkedCount} records chained`
                        : "Merkle SHA-256 links verified"}
                    </div>
                  </div>
                </div>

                <div className="layout2">
                  <section className="panel">
                    <div className="panel-head">
                      <span>
                        <b>Authorization activity</b>
                        <small>Request volume · last 24 hours</small>
                      </span>
                      <span className="toggle">
                        <button className="on" type="button">24h</button>
                        <button type="button">7d</button>
                      </span>
                    </div>
                    <div className="panel-body">
                      <div className="chart">
                        <svg viewBox="0 0 650 175" role="img" aria-label="Authorization activity">
                          <path className="gridline" d="M35 20H640M35 60H640M35 100H640M35 140H640" />
                          <path className="line-a" d="M35 123 Q70 113 105 116T175 85T245 98T315 65T385 76T455 48T525 60T600 28T640 24" />
                          <path className="line-b" d="M35 143 Q70 139 105 134T175 121T245 128T315 112T385 118T455 100T525 106T600 89T640 82" />
                          <text className="chart-text" x="35" y="164">00:00</text>
                          <text className="chart-text" x="180" y="164">06:00</text>
                          <text className="chart-text" x="330" y="164">12:00</text>
                          <text className="chart-text" x="480" y="164">18:00</text>
                          <text className="chart-text" x="615" y="164">24:00</text>
                        </svg>
                      </div>
                      <div className="legend">
                        <span><i></i>Evaluated</span>
                        <span><i className="blue"></i>Denied</span>
                        <span>{isLiveBackend ? "Live telemetry" : "Sample curve"}</span>
                      </div>
                    </div>
                  </section>

                  <section className="panel">
                    <div className="panel-head">
                      <span>
                        <b>Approval inbox</b>
                        <small>Configured step-up actions</small>
                      </span>
                      <span className={`pill ${liveApprovals.length || livePendingRefund ? "warn" : "good"}`}>
                        {liveApprovals.length ? `${liveApprovals.length} pending` : livePendingRefund ? "1 pending" : "Clear"}
                      </span>
                    </div>
                    <div className="panel-body">
                      {liveApprovals.length > 0 ? (
                        <div className="approval">
                          <b>{liveApprovals[0].toolName}</b>
                          <p>
                            {liveApprovals[0].reason}
                            <br />
                            Principal: {liveApprovals[0].agentIdentity}
                          </p>
                          <div className="approval-actions" style={{ marginTop: "8px", display: "flex", gap: "6px" }}>
                            <button
                              className="btn small primary"
                              type="button"
                              onClick={() => handleSupervisorApprovalDecision(liveApprovals[0].id, "approve")}
                              disabled={decidingApproval === liveApprovals[0].id}
                            >
                              Approve
                            </button>
                            <button
                              className="btn small"
                              type="button"
                              onClick={() => handleSupervisorApprovalDecision(liveApprovals[0].id, "reject")}
                              disabled={decidingApproval === liveApprovals[0].id}
                            >
                              Reject
                            </button>
                          </div>
                        </div>
                      ) : livePendingRefund ? (
                        <div className="approval">
                          <b>{livePendingRefund.amount} {livePendingRefund.currency} Refund · {livePendingRefund.transactionId}</b>
                          <p>
                            {livePendingRefund.reason}
                            <br />
                            Account: {livePendingRefund.accountId}
                          </p>
                          <div className="approval-actions" style={{ marginTop: "8px", display: "flex", gap: "6px" }}>
                            <button
                              className="btn small primary"
                              type="button"
                              onClick={() => handleConfirmRefund(livePendingRefund.confirmationId)}
                            >
                              Confirm
                            </button>
                            <button
                              className="btn small"
                              type="button"
                              onClick={() => handleRejectRefund(livePendingRefund.confirmationId)}
                            >
                              Reject
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="muted" style={{ fontSize: "9px", padding: "18px 4px" }}>
                          No approval waiting.{" "}
                          <a href="#/finance" onClick={(e) => handleNavClick("/finance", e)} style={{ color: "var(--mint)" }}>
                            Create a sample request →
                          </a>
                        </div>
                      )}
                    </div>
                  </section>
                </div>

                <section className="panel">
                  <div className="panel-head">
                    <span>
                      <b>Recent security events</b>
                      <small>Live decisions from MCP security proxy</small>
                    </span>
                    <a
                      href="#/monitor"
                      onClick={(e) => handleNavClick("/monitor", e)}
                      style={{ color: "var(--mint)", fontSize: "9px" }}
                    >
                      View monitor →
                    </a>
                  </div>
                  {(isLiveBackend && liveEvents.length ? liveEvents.slice(0, 5) : defaultEvents).map((e: any) => {
                    const isAllowed = e.decision === "ALLOW" || e.result === "Allowed"
                    const isDeny = e.decision === "DENY" || e.result === "Denied"
                    return (
                      <div
                        key={e.id}
                        className="event"
                        onClick={() => setSelectedLiveEvent(e)}
                        style={{ cursor: "pointer" }}
                      >
                        <span className={`event-mark ${isDeny ? "bad" : isAllowed ? "" : "warn"}`}>
                          {renderIcon(isDeny ? "alert" : isAllowed ? "check" : "clock")}
                        </span>
                        <div>
                          <b>{e.toolName || e.tool}</b>
                          <small>
                            {(e.agentIdentity || e.actor)?.replace("spiffe://demo.local/agent/", "")} · {e.resourceId || e.resource || "ACC-1001"}
                          </small>
                        </div>
                        <div className="event-time">
                          <span className={`pill ${isDeny ? "bad" : isAllowed ? "good" : "warn"}`}>
                            {e.decision || e.result}
                          </span>
                          <br />
                          {e.timestamp ? new Date(e.timestamp).toLocaleTimeString() : e.time || "Just now"}
                        </div>
                      </div>
                    )
                  })}
                </section>
              </>
            )}

            {/* View 2: /accounts */}
            {activeRoute === "/accounts" && (
              <>
                <div className="page-head">
                  <div>
                    <div className="eyebrow">LEDGER & BALANCES</div>
                    <h1>Customer accounts</h1>
                    <p>Fictional customer accounts and ledger records secured by MCP Sentinel.</p>
                  </div>
                  <div className="page-actions">
                    <button
                      className="btn small"
                      type="button"
                      onClick={handleRunAiAudit}
                      disabled={aiAuditModal.loading}
                    >
                      {renderIcon("spark")}
                      <span>Run AI Audit</span>
                    </button>
                    <button
                      className="btn small primary"
                      type="button"
                      onClick={(e) => handleNavClick("/finance", e)}
                    >
                      {renderIcon("spark")}
                      <span>Ask finance assistant</span>
                    </button>
                  </div>
                </div>

                {/* Account Cards */}
                {(() => {
                  const activeAccount = currentAccount || (defaultCustomerAccounts.find((a) => a.id === selectedAccountId) || defaultCustomerAccounts[0])
                  return (
                    <div className="account-cards">
                      <div className="balance">
                        <small>Available balance</small>
                        <b>
                          ${activeAccount.balance.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                        </b>
                        <small>
                          {activeAccount.id} · {activeAccount.name}
                        </small>
                      </div>
                      <div className="balance">
                        <small>Account Tier & Status</small>
                        <b style={{ fontSize: "14px", marginTop: "8px" }}>
                          {activeAccount.tier || "Gold Executive"}{" "}
                          <span className={`pill ${activeAccount.status === "suspended" ? "bad" : "good"}`} style={{ marginLeft: "6px" }}>
                            {activeAccount.status}
                          </span>
                        </b>
                        <div style={{ marginTop: "6px" }}>
                          <button
                            className="btn small"
                            style={{ height: "24px", fontSize: "8px", padding: "0 6px" }}
                            type="button"
                            onClick={() =>
                              handleToggleAccountStatus(
                                activeAccount.status === "suspended" ? "active" : "suspended"
                              )
                            }
                          >
                            {activeAccount.status === "suspended" ? "Reactivate" : "Freeze Account"}
                          </button>
                        </div>
                      </div>
                      <div className="balance">
                        <small>Daily limit & analytics</small>
                        <b>
                          ${(activeAccount.dailyLimit || 2500).toLocaleString("en-US")}
                        </b>
                        <small>Max single refund threshold: $50.00</small>
                      </div>
                    </div>
                  )
                })()}

                {/* Account Switcher */}
                <div style={{ marginBottom: "14px", display: "flex", gap: "8px", alignItems: "center" }}>
                  <span style={{ fontSize: "9px", color: "var(--muted)" }}>Select Account:</span>
                  {(customerAccounts.length ? customerAccounts : defaultCustomerAccounts).slice(0, 4).map((acc) => (
                    <button
                      key={acc.id}
                      type="button"
                      className={`btn small ${selectedAccountId === acc.id ? "primary" : ""}`}
                      onClick={() => setSelectedAccountId(acc.id)}
                    >
                      {acc.id} ({acc.name.split(" ")[0]})
                    </button>
                  ))}
                </div>

                <section className="panel">
                  {(() => {
                    const accountTxns = liveTransactions.length
                      ? liveTransactions
                      : (defaultTransactionsByAccount[selectedAccountId] || defaultTransactionsByAccount["ACC-1001"])
                    const activeTxnSearch = (tableSearch || globalSearch).trim().toLowerCase()
                    const displayedTxns = accountTxns.filter((t: any) => {
                      if (categoryFilter && (t.category || t.cat) !== categoryFilter) return false
                      if (!activeTxnSearch) return true
                      const merchant = (t.merchantName || t.merchant || "").toLowerCase()
                      const memo = (t.memo || "").toLowerCase()
                      const id = (t.id || "").toLowerCase()
                      return merchant.includes(activeTxnSearch) || memo.includes(activeTxnSearch) || id.includes(activeTxnSearch)
                    })

                    return (
                      <>
                        <div className="panel-head">
                          <span>
                            <b>Transaction history</b>
                            <small>
                              {displayedTxns.length} entries · select a row to inspect
                            </small>
                          </span>
                          <span className="pill good">Demo ledger</span>
                        </div>

                        <div className="table-toolbar">
                          <input
                            className="field"
                            placeholder="Search transaction or merchant"
                            value={tableSearch}
                            onChange={(e) => setTableSearch(e.target.value)}
                          />
                          <select
                            className="select"
                            value={categoryFilter}
                            onChange={(e) => setCategoryFilter(e.target.value)}
                          >
                            <option value="">All categories</option>
                            <option value="Groceries">Groceries</option>
                            <option value="Cloud">Cloud</option>
                            <option value="Dining">Dining</option>
                            <option value="Travel">Travel</option>
                            <option value="Shopping">Shopping</option>
                            <option value="Utilities">Utilities</option>
                          </select>
                        </div>

                        <div className="table-wrap">
                          <table className="table">
                            <thead>
                              <tr>
                                <th>Transaction</th>
                                <th>Merchant / memo</th>
                                <th>Category</th>
                                <th>Date</th>
                                <th>Amount</th>
                                <th>Status</th>
                              </tr>
                            </thead>
                            <tbody>
                              {displayedTxns.length > 0 ? (
                                displayedTxns.map((t: any) => (
                                  <tr
                                    key={t.id}
                                    onClick={() => handleOpenTransactionDetail(t)}
                                    style={{ cursor: "pointer" }}
                                  >
                                    <td>{t.id}</td>
                                    <td>
                                      {t.merchantName || t.merchant || "Merchant"}
                                      <small style={{ display: "block", color: "var(--muted)" }}>
                                        {t.memo}
                                      </small>
                                    </td>
                                    <td>{t.category || t.cat || "General"}</td>
                                    <td>{t.timestamp || t.date}</td>
                                    <td>-${Math.abs(t.amount).toFixed(2)}</td>
                                    <td>
                                      <span className={`pill ${t.status === "disputed" || t.status === "Flagged" ? "bad" : "good"}`}>
                                        {t.status}
                                      </span>
                                    </td>
                                  </tr>
                                ))
                              ) : (
                                <tr>
                                  <td colSpan={6} style={{ textAlign: "center", color: "var(--muted)", padding: "24px" }}>
                                    No transactions match the selected filters.
                                  </td>
                                </tr>
                              )}
                            </tbody>
                          </table>
                        </div>
                      </>
                    )
                  })()}
                </section>
              </>
            )}

            {/* View 3: /finance */}
            {activeRoute === "/finance" && (
              <>
                <div className="page-head">
                  <div>
                    <div className="eyebrow">
                      {isLiveBackend ? "GEMINI AGENT + CEDAR ENFORCEMENT" : "DETERMINISTIC SIMULATION"}
                    </div>
                    <h1>Finance assistant</h1>
                    <p>
                      {isLiveBackend
                        ? "Conversational agent powered by Google Gemini 3 Flash, routed through MCP security proxy."
                        : "Deterministic sample conversation · every tool proposal follows zero-trust policy."}
                    </p>
                  </div>
                  <div className="page-actions">
                    <button className="btn small" type="button" onClick={handleResetFinance}>
                      {renderIcon("reset")}
                      <span>New conversation</span>
                    </button>
                  </div>
                </div>

                <div className="chat-layout">
                  <section className="panel chat">
                    <div className="chat-head">
                      <span className="brand-icon">{renderIcon("spark")}</span>
                      <span>
                        <b>Sentinel finance agent</b>
                        <small>
                          {isLiveBackend ? "Gemini 3 Flash · Cedar Guardrails" : "Simulation mode · sample tools"}
                        </small>
                      </span>
                      <span className="pill good">Tool calls inspected</span>
                    </div>

                    <div className="chat-log" id="chat-log" ref={chatLogRef}>
                      {messages.map((m, idx) => (
                        <div key={idx} className={`msg ${m.role === "assistant" ? "assistant" : "user"}`}>
                          <div className="who">
                            {m.role === "assistant" ? "Sentinel assistant" : "You"}
                          </div>
                          <div className="bubble">
                            {m.text}
                            {m.toolActivities && m.toolActivities.length > 0 && (
                              <div style={{ marginTop: "8px", borderTop: "1px solid rgba(255,255,255,.1)", paddingTop: "6px" }}>
                                <small style={{ color: "var(--mint)", fontWeight: 700 }}>
                                  Protected MCP Tool Proposal:
                                </small>
                                {m.toolActivities.map((act, i) => (
                                  <div key={i} style={{ fontSize: "8px", marginTop: "3px" }}>
                                    <b>{act.toolName}</b> —{" "}
                                    <span style={{ color: act.securityDecision?.decision === "ALLOW" ? "var(--mint)" : "var(--amber)" }}>
                                      {act.securityDecision?.decision || "Evaluated"}
                                    </span>
                                    {act.securityDecision?.reason && (
                                      <span style={{ display: "block", color: "var(--muted)" }}>
                                        {act.securityDecision.reason}
                                      </span>
                                    )}
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                      {chatLoading && (
                        <div className="msg assistant">
                          <div className="who">Sentinel assistant</div>
                          <div className="bubble" style={{ color: "var(--mint)" }}>
                            Evaluating request with Cedar policy engine...
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="compose">
                      <form
                        id="chat-form"
                        onSubmit={(e) => {
                          e.preventDefault()
                          handleSendMessage()
                        }}
                      >
                        <textarea
                          id="chat-input"
                          placeholder="Ask about the sample ledger or propose a controlled action…"
                          aria-label="Message the assistant"
                          value={chatInput}
                          onChange={(e) => setChatInput(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter" && !e.shiftKey) {
                              e.preventDefault()
                              handleSendMessage()
                            }
                          }}
                        />
                        <button className="btn primary" type="submit" aria-label="Send message" disabled={chatLoading}>
                          {renderIcon("send")}
                        </button>
                      </form>

                      <div className="chips">
                        <button
                          type="button"
                          onClick={() => handleSendMessage("Show the balance for account ACC-1001")}
                        >
                          Check balance for ACC-1001
                        </button>
                        <button
                          type="button"
                          onClick={() => handleSendMessage("Refund TXN-2048 for $29.50")}
                        >
                          Propose a $29.50 refund
                        </button>
                        <button
                          type="button"
                          onClick={() => handleSendMessage("Try a $500 refund for TXN-2048")}
                        >
                          Try $500 refund (exceeds limit)
                        </button>
                      </div>
                    </div>
                  </section>

                  <section className="panel">
                    <div className="panel-head">
                      <span>
                        <b>Request lifecycle</b>
                        <small>Illustrative zero-trust control path</small>
                      </span>
                      <span className="pill good">Enforcement Path</span>
                    </div>
                    <div className="panel-body steps-list">
                      <div className="flow-row">
                        <span className="flow-icon">{renderIcon("spark")}</span>
                        <div>
                          <b>Agent proposes</b>
                          <small>Tool request is a proposal; no direct ledger access.</small>
                        </div>
                      </div>
                      <div className="flow-row">
                        <span className="flow-icon">{renderIcon("lock")}</span>
                        <div>
                          <b>Identity + policy</b>
                          <small>Check EdDSA identity token, scope and Cedar rule.</small>
                        </div>
                      </div>
                      <div className="flow-row">
                        <span className="flow-icon">{renderIcon("clock")}</span>
                        <div>
                          <b>Human approval</b>
                          <small>Sensitive actions pause; approval is separate from execution.</small>
                        </div>
                      </div>
                      <div className="flow-row">
                        <span className="flow-icon">{renderIcon("audit")}</span>
                        <div>
                          <b>Cryptographic audit record</b>
                          <small>Stored in SQLite with SHA-256 hash chaining.</small>
                        </div>
                      </div>

                      <hr style={{ border: 0, borderTop: "1px solid rgba(255,255,255,.1)", margin: "10px 0" }} />
                      <b style={{ fontSize: "9px" }}>Approval queue</b>
                      {livePendingRefund ? (
                        <div className="approval">
                          <b>
                            {livePendingRefund.amount} {livePendingRefund.currency} refund · {livePendingRefund.transactionId}
                          </b>
                          <p>{livePendingRefund.reason}</p>
                          <div className="approval-actions" style={{ display: "flex", gap: "6px" }}>
                            <button
                              className="btn small primary"
                              type="button"
                              onClick={() => handleConfirmRefund(livePendingRefund.confirmationId)}
                            >
                              Approve
                            </button>
                            <button
                              className="btn small"
                              type="button"
                              onClick={() => handleRejectRefund(livePendingRefund.confirmationId)}
                            >
                              Reject
                            </button>
                          </div>
                        </div>
                      ) : (
                        <p className="muted" style={{ fontSize: "8px" }}>No pending requests.</p>
                      )}
                    </div>
                  </section>
                </div>
              </>
            )}

            {/* View 4: /graph */}
            {activeRoute === "/graph" && (
              <>
                <div className="page-head">
                  <div>
                    <div className="eyebrow">TOPOLOGY & BOUNDARIES</div>
                    <h1>Architecture graph</h1>
                    <p>Conceptual and runtime component graph of the zero-trust sidecar.</p>
                  </div>
                  <div className="page-actions">
                    <button className="btn small" type="button" onClick={() => setNodePick("proxy")}>
                      {renderIcon("reset")}
                      <span>Reset view</span>
                    </button>
                  </div>
                </div>

                <section className="panel" style={{ marginBottom: "11px" }}>
                  <div className="panel-head">
                    <span>
                      <b>Request path · proposal to protected tool</b>
                      <small>Circuit breaker status: {circuitBreaker?.state || "CLOSED (Healthy)"}</small>
                    </span>
                    <span className="toggle">
                      <button
                        className={graphMode === "map" ? "on" : ""}
                        type="button"
                        onClick={() => setGraphMode("map")}
                      >
                        Diagram
                      </button>
                      <button
                        className={graphMode === "list" ? "on" : ""}
                        type="button"
                        onClick={() => setGraphMode("list")}
                      >
                        Linear flow
                      </button>
                    </span>
                  </div>

                  {graphMode === "map" ? (
                    <div className="graph">
                      <svg viewBox="0 0 700 370" preserveAspectRatio="none" aria-hidden="true">
                        <path d="M90 185 Q180 185 230 60" />
                        <path d="M330 60 Q390 60 430 180" />
                        <path d="M530 180 Q600 180 630 60" />
                        <path d="M530 190 Q600 200 630 285" />
                        <path d="M485 220 Q485 275 470 300" />
                        <path className="dash" d="M620 100Q570 235 500 305" />
                      </svg>

                      {[
                        { id: "user", label: "Dashboard user", cl: "n-user", icon: "home" },
                        { id: "agent", label: "Gemini agent", cl: "n-agent", icon: "spark" },
                        { id: "proxy", label: "MCP proxy", cl: "n-proxy", icon: "shield" },
                        { id: "policy", label: "Cedar policy", cl: "n-policy", icon: "file" },
                        { id: "tools", label: "Finance tools", cl: "n-tools", icon: "wallet" },
                        { id: "audit", label: "Audit storage", cl: "n-audit", icon: "audit" },
                      ].map((n) => (
                        <button
                          key={n.id}
                          className={`node ${n.cl} ${nodePick === n.id ? "selected" : ""}`}
                          type="button"
                          onClick={() => setNodePick(n.id)}
                        >
                          <span className="step-symbol">{renderIcon(n.icon)}</span>
                          <strong>{n.label}</strong>
                          <small>{nodeDataMap[n.id]?.[1] || "component"}</small>
                        </button>
                      ))}
                    </div>
                  ) : (
                    <div className="panel-body" style={{ display: "flex", gap: "9px", justifyContent: "center", flexWrap: "wrap" }}>
                      {["Dashboard user", "Gemini agent", "MCP proxy", "Cedar policy", "Finance tools", "Audit storage"].map((x, i) => (
                        <div key={x} style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                          {i > 0 && <span style={{ color: "var(--mint)" }}>→</span>}
                          <div className="arch-node">
                            <b>{x}</b>
                            <small>stage 0{i + 1}</small>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </section>

                <div className="layout2">
                  <section className="panel">
                    <div className="panel-head">
                      <span>
                        <b>Decision path</b>
                        <small>Evaluation pipeline stages</small>
                      </span>
                    </div>
                    {[
                      "Inspect request parameters & taint markers",
                      "Verify agent identity (EdDSA token) and scope",
                      "Evaluate deterministic Cedar policies",
                      "Pause for configured human approval if required",
                      "Inspect response (DLP) and commit SHA-256 audit record",
                    ].map((x, i) => (
                      <div key={x} className="event" style={{ cursor: "default" }}>
                        <span className="event-mark">{renderIcon(i === 3 ? "clock" : "check")}</span>
                        <div>
                          <b>{x}</b>
                          <small>Stage 0{i + 1}</small>
                        </div>
                      </div>
                    ))}
                  </section>

                  <section className="panel node-info">
                    <div className="eyebrow">Selected component</div>
                    <h3>{nodeDataMap[nodePick]?.[0] || "Component"}</h3>
                    <span className="pill good">{nodeDataMap[nodePick]?.[1] || "Operational"}</span>
                    <p>{nodeDataMap[nodePick]?.[4] || ""}</p>
                    <div className="detail">
                      <span>Input</span>
                      <span>{nodeDataMap[nodePick]?.[2] || "Payload"}</span>
                      <span>Output</span>
                      <span>{nodeDataMap[nodePick]?.[3] || "Decision"}</span>
                    </div>
                  </section>
                </div>
              </>
            )}

            {/* View 5: /monitor */}
            {activeRoute === "/monitor" && (
              <>
                <div className="page-head">
                  <div>
                    <div className="eyebrow">LIVE EVENT STREAM</div>
                    <h1>Security monitor</h1>
                    <p>Live stream of decisions, authorizations, and policy enforcement events.</p>
                  </div>
                  <div className="page-actions">
                    <button className="btn small" type="button" onClick={loadMonitorData}>
                      {renderIcon("reset")}
                      <span>Refresh</span>
                    </button>
                  </div>
                </div>

                {(() => {
                  const baseEvents = isLiveBackend ? liveEvents : defaultEvents
                  const activeEventSearch = (eventSearch || globalSearch).trim().toLowerCase()
                  const filteredEvents = baseEvents.filter((e: any) => {
                    // Filter by decision
                    if (eventFilter === "ALLOW" && e.decision !== "ALLOW" && e.result !== "Allowed") return false
                    if (eventFilter === "DENY" && e.decision !== "DENY" && e.result !== "Denied") return false
                    if (eventFilter === "HOLD" && !e.decision?.includes("APPROV") && e.decision !== "HOLD" && e.result !== "Approval required") return false

                    // Filter by search query
                    if (!activeEventSearch) return true
                    const tool = (e.toolName || e.tool || "").toLowerCase()
                    const actor = (e.agentIdentity || e.actor || "").toLowerCase()
                    const id = (e.id || "").toLowerCase()
                    const res = (e.resourceId || e.resource || "").toLowerCase()
                    return tool.includes(activeEventSearch) || actor.includes(activeEventSearch) || id.includes(activeEventSearch) || res.includes(activeEventSearch)
                  })

                  return (
                    <>
                      <div className="metrics">
                        <div className="metric">
                          <div className="metric-label">
                            <span>Visible events</span>
                            {renderIcon("activity")}
                          </div>
                          <div className="metric-value">
                            {baseEvents.length}
                          </div>
                          <div className="metric-note">SQLite + Real-time SSE</div>
                        </div>
                        <div className="metric">
                          <div className="metric-label">
                            <span>Allowed</span>
                            {renderIcon("check")}
                          </div>
                          <div className="metric-value" style={{ color: "var(--mint)" }}>
                            {baseEvents.filter(
                              (e: any) => e.decision === "ALLOW" || e.result === "Allowed"
                            ).length}
                          </div>
                          <div className="metric-note">Permitted actions</div>
                        </div>
                        <div className="metric">
                          <div className="metric-label">
                            <span>Denied</span>
                            {renderIcon("lock")}
                          </div>
                          <div className="metric-value" style={{ color: "var(--red)" }}>
                            {baseEvents.filter(
                              (e: any) => e.decision === "DENY" || e.result === "Denied"
                            ).length}
                          </div>
                          <div className="metric-note">Policy violations</div>
                        </div>
                        <div className="metric">
                          <div className="metric-label">
                            <span>Approval Holds</span>
                            {renderIcon("clock")}
                          </div>
                          <div className="metric-value" style={{ color: "var(--amber)" }}>
                            {baseEvents.filter(
                              (e: any) =>
                                e.decision === "HOLD" ||
                                e.result === "Approval required" ||
                                e.decision?.includes("APPROV")
                            ).length}
                          </div>
                          <div className="metric-note">Awaiting human review</div>
                        </div>
                      </div>

                      <section className="panel">
                        <div className="panel-head">
                          <span>
                            <b>Event stream</b>
                            <small>
                              {filteredEvents.length} events matching filter · select an event to inspect cryptographic signature & sanitized args
                            </small>
                          </span>
                          <span className={`pill ${isLiveBackend ? "good" : ""}`}>
                            {isLiveBackend ? "SSE Stream Connected" : "Local Mock Stream"}
                          </span>
                        </div>

                        <div className="table-toolbar">
                          <input
                            className="field"
                            placeholder="Filter events by tool, principal, or ID..."
                            value={eventSearch}
                            onChange={(e) => setEventSearch(e.target.value)}
                          />
                          <select
                            className="select"
                            value={eventFilter}
                            onChange={(e) => setEventFilter(e.target.value)}
                          >
                            <option value="All results">All results</option>
                            <option value="ALLOW">Allowed</option>
                            <option value="DENY">Denied</option>
                            <option value="HOLD">Approval Holds</option>
                          </select>
                        </div>

                        <div className="table-wrap">
                          <table className="table">
                            <thead>
                              <tr>
                                <th>Event ID</th>
                                <th>Timestamp</th>
                                <th>Principal</th>
                                <th>Tool / Action</th>
                                <th>Resource</th>
                                <th>Decision</th>
                                <th>Risk / Severity</th>
                              </tr>
                            </thead>
                            <tbody>
                              {filteredEvents.length > 0 ? (
                                filteredEvents.map((e: any) => {
                                  const isAllowed = e.decision === "ALLOW" || e.result === "Allowed"
                                  const isDeny = e.decision === "DENY" || e.result === "Denied"
                                  return (
                                    <tr
                                      key={e.id}
                                      onClick={() => setSelectedLiveEvent(e)}
                                      style={{ cursor: "pointer" }}
                                    >
                                      <td>{e.id}</td>
                                      <td>{e.timestamp ? new Date(e.timestamp).toLocaleTimeString() : e.time}</td>
                                      <td>
                                        {(e.agentIdentity || e.actor)?.replace("spiffe://demo.local/agent/", "")}
                                      </td>
                                      <td>{e.toolName || e.tool}</td>
                                      <td>{e.resourceId || e.resource || "ACC-1001"}</td>
                                      <td>
                                        <span className={`pill ${isDeny ? "bad" : isAllowed ? "good" : "warn"}`}>
                                          {e.decision || e.result}
                                        </span>
                                      </td>
                                      <td>
                                        <span className={`pill ${isDeny ? "bad" : isAllowed ? "good" : "warn"}`}>
                                          {e.riskAssessment?.level || e.severity || "low"}
                                        </span>
                                      </td>
                                    </tr>
                                  )
                                })
                              ) : (
                                <tr>
                                  <td colSpan={7} style={{ textAlign: "center", color: "var(--muted)", padding: "24px" }}>
                                    No events match the current filter criteria.
                                  </td>
                                </tr>
                              )}
                            </tbody>
                          </table>
                        </div>
                      </section>
                    </>
                  )
                })()}
              </>
            )}

            {/* View 6: /incidents */}
            {activeRoute === "/incidents" && (
              <>
                <div className="page-head">
                  <div>
                    <div className="eyebrow">ATTACK CHAIN EXPLORER & INCIDENT LIFECYCLE</div>
                    <h1>Security incidents</h1>
                    <p>Correlated behavioral attack chains, multi-stage state transitions, and autonomous self-healing defense.</p>
                  </div>
                  <div className="page-actions">
                    <button className="btn small" type="button" onClick={handleResetBreaker}>
                      {renderIcon("reset")}
                      <span>Reset Circuit Breaker</span>
                    </button>
                  </div>
                </div>

                {/* Circuit Breaker Status Banner */}
                {(() => {
                  const activeBreaker = circuitBreaker || (!isLiveBackend ? defaultCircuitBreaker : null)
                  if (!activeBreaker) return null
                  return (
                    <div
                      className="banner"
                      style={{
                        borderColor: activeBreaker.state === "QUARANTINED" ? "var(--red)" : "var(--line)",
                      }}
                    >
                      <span className="banner-icon" style={{ color: activeBreaker.state === "QUARANTINED" ? "var(--red)" : "var(--mint)" }}>
                        {renderIcon("alert")}
                      </span>
                      <div>
                        <b>Autonomous Circuit Breaker: {activeBreaker.state}</b>
                        <p>
                          Failure count: {activeBreaker.failureCount} · Threshold: {(activeBreaker as any).threshold || 3} rapid violations ·{" "}
                          {activeBreaker.quarantineReason || "Agent operating within safe policy limits."}
                        </p>
                      </div>
                      <span className={`pill ${activeBreaker.state === "QUARANTINED" ? "bad" : "good"}`}>
                        {activeBreaker.state}
                      </span>
                    </div>
                  )
                })()}

                {/* Incident Status Filter Tabs */}
                <div className="category-tabs" style={{ marginBottom: "16px" }}>
                  {(["ALL", "OPEN", "INVESTIGATING", "CONTAINED", "RESOLVED"] as const).map((status) => {
                    const count = status === "ALL"
                      ? storeState.incidents.length
                      : storeState.incidents.filter((i) => i.status === status).length
                    return (
                      <button
                        key={status}
                        className={`category-tab ${incidentStatusFilter === status ? "active" : ""}`}
                        type="button"
                        onClick={() => setIncidentStatusFilter(status)}
                      >
                        {status} ({count})
                      </button>
                    )
                  })}
                </div>

                <section className="panel">
                  {(() => {
                    const baseIncidents: SecurityIncident[] = storeState.incidents.length > 0
                      ? storeState.incidents
                      : (liveIncidents.length > 0
                        ? liveIncidents.map((li) => ({
                            id: li.id,
                            title: li.description,
                            category: "PROMPT_INJECTION",
                            severity: (li.severity || "HIGH") as any,
                            status: "OPEN" as IncidentStatus,
                            firstObservedAt: li.detectedAt,
                            lastUpdatedAt: li.detectedAt,
                            relatedAgentIdentity: li.agentIdentity,
                            relatedScenarioId: "SEC-CAT01-001",
                            evidence: [li.description],
                            timeline: [
                              { time: li.detectedAt, action: "DETECTED", actor: "Sentinel Proxy", note: li.description },
                            ],
                          }))
                        : defaultIncidents.map((di) => ({
                            id: di.id,
                            title: di.description,
                            category: "PROMPT_INJECTION",
                            severity: (di.severity || "HIGH") as any,
                            status: "OPEN" as IncidentStatus,
                            firstObservedAt: di.detectedAt,
                            lastUpdatedAt: di.detectedAt,
                            relatedAgentIdentity: di.agentIdentity,
                            relatedScenarioId: "SEC-CAT01-001",
                            evidence: [di.description],
                            timeline: [
                              { time: di.detectedAt, action: "DETECTED", actor: "Sentinel Proxy", note: di.description },
                            ],
                          })))

                    const filteredIncidents = baseIncidents.filter((inc) => {
                      if (incidentStatusFilter !== "ALL" && inc.status !== incidentStatusFilter) return false
                      if (!globalSearch.trim()) return true
                      const q = globalSearch.toLowerCase()
                      return (
                        inc.title.toLowerCase().includes(q) ||
                        (inc.relatedAgentIdentity && inc.relatedAgentIdentity.toLowerCase().includes(q)) ||
                        inc.id.toLowerCase().includes(q) ||
                        (inc.relatedScenarioId && inc.relatedScenarioId.toLowerCase().includes(q))
                      )
                    })

                    return (
                      <>
                        <div className="panel-head">
                          <span>
                            <b>Correlated Security Incidents</b>
                            <small>{filteredIncidents.length} matching operational records</small>
                          </span>
                        </div>
                        {filteredIncidents.length > 0 ? (
                          filteredIncidents.map((inc) => (
                            <div key={inc.id} style={{ padding: "16px 20px", borderBottom: "1px solid rgba(255,255,255,.08)" }}>
                              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "12px" }}>
                                <div>
                                  <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "4px" }}>
                                    <span style={{ fontFamily: "var(--mono)", fontSize: "10px", color: "var(--mint)" }}>{inc.id}</span>
                                    <b>{inc.title}</b>
                                  </div>
                                  <p style={{ fontSize: "10px", color: "var(--muted)", margin: "4px 0" }}>
                                    Principal: <span style={{ color: "#d0dedb" }}>{inc.relatedAgentIdentity || "spiffe://demo.local/agent/financial-remediation"}</span> · Category: {inc.category} · Updated: {new Date(inc.lastUpdatedAt).toLocaleTimeString()}
                                    {inc.relatedScenarioId && (
                                      <span> · Test Scenario: <b style={{ color: "var(--mint)" }}>{inc.relatedScenarioId}</b></span>
                                    )}
                                  </p>
                                </div>
                                <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                                  <span className={`pill ${inc.severity === "CRITICAL" || inc.severity === "HIGH" ? "bad" : inc.severity === "MEDIUM" ? "warn" : "good"}`}>
                                    {inc.severity}
                                  </span>
                                  <span className={`pill ${inc.status === "RESOLVED" ? "good" : inc.status === "CONTAINED" ? "accent" : inc.status === "INVESTIGATING" ? "info" : "warn"}`}>
                                    {inc.status}
                                  </span>
                                </div>
                              </div>

                              {/* Evidence snippet */}
                              {inc.evidence && inc.evidence.length > 0 && (
                                <div style={{ marginTop: "8px", padding: "8px 12px", background: "rgba(0,0,0,.35)", borderRadius: "6px", fontSize: "9px", fontFamily: "var(--mono)", color: "var(--faint)" }}>
                                  <b>Trigger Evidence:</b> {inc.evidence.join(" | ")}
                                </div>
                              )}

                              {/* Incident Action Lifecycle Buttons */}
                              <div style={{ marginTop: "12px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                                <div style={{ display: "flex", gap: "8px" }}>
                                  {inc.status !== "INVESTIGATING" && inc.status !== "RESOLVED" && (
                                    <button
                                      className="btn small"
                                      type="button"
                                      onClick={() => handleUpdateIncidentLifecycle(inc.id, "INVESTIGATING")}
                                    >
                                      Investigate
                                    </button>
                                  )}
                                  {inc.status !== "CONTAINED" && inc.status !== "RESOLVED" && (
                                    <button
                                      className="btn small"
                                      type="button"
                                      onClick={() => handleUpdateIncidentLifecycle(inc.id, "CONTAINED")}
                                    >
                                      Contain
                                    </button>
                                  )}
                                  {inc.status !== "RESOLVED" ? (
                                    <button
                                      className="btn small primary"
                                      type="button"
                                      onClick={() => {
                                        setSelectedIncidentModal(inc)
                                        setIncidentResolutionNotes(inc.resolutionNotes || "")
                                      }}
                                    >
                                      Resolve...
                                    </button>
                                  ) : (
                                    <button
                                      className="btn small"
                                      type="button"
                                      onClick={() => handleUpdateIncidentLifecycle(inc.id, "REOPENED")}
                                    >
                                      Reopen
                                    </button>
                                  )}
                                </div>
                                <button
                                  className="btn small"
                                  type="button"
                                  onClick={() => setSelectedIncidentModal(inc)}
                                >
                                  View Timeline & Evidence ({inc.timeline?.length || 1})
                                </button>
                              </div>
                            </div>
                          ))
                        ) : (
                          <div style={{ padding: "40px", textAlign: "center", color: "var(--muted)", fontSize: "11px" }}>
                            No security incidents found matching status filter "{incidentStatusFilter}". All agent workflows operating within normal boundaries.
                          </div>
                        )}
                      </>
                    )
                  })()}
                </section>
              </>
            )}

            {/* View 7: /policies */}
            {activeRoute === "/policies" && (
              <>
                <div className="page-head">
                  <div>
                    <div className="eyebrow">CEDAR POLICY ENGINE & AI COPILOT</div>
                    <h1>Policy explorer</h1>
                    <p>Fine-grained Cedar authorization rules actively evaluated at runtime with AI authoring and 100-scenario simulation.</p>
                  </div>
                  <div className="page-actions">
                    <button
                      className="btn small"
                      type="button"
                      onClick={handleSimulatePolicyImpact}
                      disabled={policySimLoading}
                    >
                      {renderIcon("activity")}
                      <span>{policySimLoading ? "Simulating on 100 Scenarios..." : "Simulate on 100 Scenarios"}</span>
                    </button>
                    <button className="btn small" type="button" onClick={handleValidatePolicy}>
                      {renderIcon("check")}
                      <span>Validate Syntax</span>
                    </button>
                    <button className="btn small primary" type="button" onClick={handleSavePolicy}>
                      <span>Save Policy</span>
                    </button>
                  </div>
                </div>

                {(() => {
                  const basePolicies = livePolicies.length ? livePolicies : defaultPolicies
                  const filteredPolicies = basePolicies.filter((p) => {
                    if (!globalSearch.trim()) return true
                    const q = globalSearch.toLowerCase()
                    return p.name.toLowerCase().includes(q) || p.content.toLowerCase().includes(q)
                  })

                  return (
                    <>
                      <div className="policy-layout">
                        <section className="panel">
                          <div className="panel-head">
                            <span><b>Active Cedar Policies ({filteredPolicies.length})</b></span>
                          </div>
                          {filteredPolicies.map((p) => (
                            <div
                              key={p.name}
                              className={`policy-item ${selectedPolicyFile === p.name ? "selected" : ""}`}
                              onClick={() => {
                                setSelectedPolicyFile(p.name)
                                setPolicyContent(p.content)
                                setPolicyValidation(null)
                              }}
                            >
                              <b>{p.name}</b>
                              <small>Loaded at {new Date(p.loadedAt).toLocaleTimeString()}</small>
                            </div>
                          ))}

                          <div style={{ padding: "14px", borderTop: "1px solid rgba(255,255,255,.1)" }}>
                            <b style={{ fontSize: "9px" }}>Cedar AI Copilot</b>
                            <p style={{ fontSize: "8px", color: "var(--muted)", margin: "4px 0 8px" }}>
                              Generate verified Cedar rules using natural language prompts.
                            </p>
                            <input
                              className="field"
                              style={{ width: "100%", marginBottom: "6px" }}
                              placeholder="e.g. Permit read_account for finance-agent"
                              value={copilotPrompt}
                              onChange={(e) => setCopilotPrompt(e.target.value)}
                            />
                            <button
                              className="btn small"
                              style={{ width: "100%" }}
                              type="button"
                              onClick={handleGenerateCopilotPolicy}
                              disabled={copilotLoading}
                            >
                              {renderIcon("spark")}
                              <span>{copilotLoading ? "Generating..." : "Generate Rule"}</span>
                            </button>
                          </div>
                        </section>

                        <section className="panel">
                          <div className="panel-head">
                            <span>
                              <b>Policy Source Editor · {selectedPolicyFile}</b>
                              {policyValidation && (
                                <span className={`pill ${policyValidation.valid ? "good" : "bad"}`} style={{ marginLeft: "8px" }}>
                                  {policyValidation.valid ? "Syntax Valid" : "Errors Detected"}
                                </span>
                              )}
                            </span>
                          </div>
                          <textarea
                            style={{
                              width: "100%",
                              height: "440px",
                              background: "#090e12",
                              color: "#b4c4c1",
                              fontFamily: "var(--mono)",
                              fontSize: "11px",
                              padding: "16px",
                              border: 0,
                              outline: 0,
                              resize: "none",
                            }}
                            value={policyContent || (defaultPolicies.find((p) => p.name === selectedPolicyFile)?.content || defaultPolicies[0].content)}
                            onChange={(e) => setPolicyContent(e.target.value)}
                          />
                        </section>
                      </div>

                      {/* Policy Simulation Impact Diff Panel */}
                      {policySimImpact && (
                        <section className="panel" style={{ marginTop: "16px" }}>
                          <div className="panel-head" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                            <span>
                              <b>Policy Simulation Impact (100 Adversarial Scenarios)</b>
                              <small>Deterministic Cedar evaluation across all 10 security categories</small>
                            </span>
                            <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                              <span className={`pill ${policySimImpact.recommendation === "SAFE_TO_DEPLOY" ? "good" : policySimImpact.recommendation === "HIGH_RISK_REGRESSION" ? "bad" : "warn"}`}>
                                {policySimImpact.recommendation}
                              </span>
                              <button className="btn small" type="button" onClick={() => setPolicySimImpact(null)}>
                                Dismiss Diff
                              </button>
                            </div>
                          </div>
                          <div className="panel-body">
                            <div className="impact-grid" style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "12px", marginBottom: "16px" }}>
                              <div className="impact-card">
                                <div className="impact-title">Scenarios Tested</div>
                                <div className="impact-val">{policySimImpact.scenariosEvaluated}</div>
                              </div>
                              <div className="impact-card">
                                <div className="impact-title">Pass Rate Shift</div>
                                <div className="impact-val" style={{ color: policySimImpact.candidatePassed >= policySimImpact.baselinePassed ? "var(--mint)" : "var(--red)" }}>
                                  {policySimImpact.baselinePassed} &rarr; {policySimImpact.candidatePassed}
                                </div>
                              </div>
                              <div className="impact-card">
                                <div className="impact-title">Security Regressions</div>
                                <div className="impact-val" style={{ color: policySimImpact.regressions.length > 0 ? "var(--red)" : "var(--mint)" }}>
                                  {policySimImpact.regressions.length}
                                </div>
                              </div>
                              <div className="impact-card">
                                <div className="impact-title">Risk Assessment</div>
                                <div className="impact-val" style={{ fontSize: "14px", color: policySimImpact.recommendation === "SAFE_TO_DEPLOY" ? "var(--mint)" : "var(--red)" }}>
                                  {policySimImpact.riskAssessment.overallRisk}
                                </div>
                              </div>
                            </div>

                            {/* Regressions list if any */}
                            {policySimImpact.regressions.length > 0 && (
                              <div style={{ marginBottom: "14px", padding: "12px", background: "rgba(255, 68, 68, 0.1)", border: "1px solid rgba(255, 68, 68, 0.3)", borderRadius: "8px" }}>
                                <b style={{ color: "var(--red)", fontSize: "11px", display: "block", marginBottom: "6px" }}>
                                  Critical Security Regressions Detected ({policySimImpact.regressions.length})
                                </b>
                                <p style={{ fontSize: "10px", color: "var(--faint)", marginBottom: "8px" }}>
                                  The proposed policy candidate permits operations that were previously blocked by Cedar:
                                </p>
                                <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
                                  {policySimImpact.regressions.map((regId) => (
                                    <span key={regId} className="pill bad" style={{ fontFamily: "var(--mono)", fontSize: "9px" }}>
                                      {regId}
                                    </span>
                                  ))}
                                </div>
                              </div>
                            )}

                            {/* Newly permitted or blocked */}
                            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                              <div style={{ padding: "12px", background: "rgba(0,0,0,0.3)", borderRadius: "6px", border: "1px solid rgba(255,255,255,0.06)" }}>
                                <b style={{ fontSize: "10px", color: "var(--mint)" }}>Newly Permitted Scenarios ({policySimImpact.newlyPermitted.length})</b>
                                <div style={{ marginTop: "6px", display: "flex", gap: "4px", flexWrap: "wrap" }}>
                                  {policySimImpact.newlyPermitted.length > 0 ? (
                                    policySimImpact.newlyPermitted.map((id) => (
                                      <span key={id} className="pill good" style={{ fontSize: "8px", fontFamily: "var(--mono)" }}>{id}</span>
                                    ))
                                  ) : (
                                    <small style={{ color: "var(--muted)" }}>None</small>
                                  )}
                                </div>
                              </div>
                              <div style={{ padding: "12px", background: "rgba(0,0,0,0.3)", borderRadius: "6px", border: "1px solid rgba(255,255,255,0.06)" }}>
                                <b style={{ fontSize: "10px", color: "var(--yellow)" }}>Newly Blocked Scenarios ({policySimImpact.newlyBlocked.length})</b>
                                <div style={{ marginTop: "6px", display: "flex", gap: "4px", flexWrap: "wrap" }}>
                                  {policySimImpact.newlyBlocked.length > 0 ? (
                                    policySimImpact.newlyBlocked.map((id) => (
                                      <span key={id} className="pill warn" style={{ fontSize: "8px", fontFamily: "var(--mono)" }}>{id}</span>
                                    ))
                                  ) : (
                                    <small style={{ color: "var(--muted)" }}>None</small>
                                  )}
                                </div>
                              </div>
                            </div>
                          </div>
                        </section>
                      )}
                    </>
                  )
                })()}
              </>
            )}

            {/* View 8: /identity */}
            {activeRoute === "/identity" && (
              <>
                <div className="page-head">
                  <div>
                    <div className="eyebrow">IDENTITY & ATTESTATION</div>
                    <h1>Agent identity registry</h1>
                    <p>Cryptographic Ed25519-signed JWT credentials and delegation chains.</p>
                  </div>
                </div>

                {(() => {
                  const baseIdentities = liveIdentities.length ? liveIdentities : defaultIdentities
                  const filteredIdentities = baseIdentities.filter((ident) => {
                    if (!globalSearch.trim()) return true
                    const q = globalSearch.toLowerCase()
                    return ident.name.toLowerCase().includes(q) || ident.uri.toLowerCase().includes(q)
                  })

                  return (
                    <div className="agents">
                      {filteredIdentities.map((ident) => (
                        <div key={ident.uri} className="panel agent-card">
                          <div className="panel-head">
                            <span>
                              <b>{ident.name}</b>
                              <small>{ident.uri}</small>
                            </span>
                            <button
                              className="btn small"
                              type="button"
                              onClick={() => handleIssueToken(ident.uri)}
                            >
                              Issue Token
                            </button>
                          </div>
                          <div className="panel-body">
                            <small style={{ color: "var(--muted)", display: "block", marginBottom: "6px" }}>
                              Active Tokens: {ident.tokens?.length || 0}
                            </small>
                            {ident.tokens?.map((t) => (
                              <div
                                key={t.id}
                                style={{
                                  padding: "8px",
                                  border: "1px solid rgba(255,255,255,.08)",
                                  borderRadius: "6px",
                                  marginBottom: "6px",
                                  fontSize: "9px",
                                }}
                              >
                                <div style={{ display: "flex", justifyContent: "space-between" }}>
                                  <b>Token ID: {t.id.slice(0, 14)}...</b>
                                  <button
                                    className="btn small"
                                    style={{ height: "20px", fontSize: "7px", padding: "0 4px" }}
                                    type="button"
                                    onClick={() => handleRevokeToken(t.id)}
                                  >
                                    Revoke
                                  </button>
                                </div>
                                <div style={{ marginTop: "4px", color: "var(--muted)" }}>
                                  Capabilities: {t.capabilities?.join(", ")}
                                </div>
                                <div style={{ color: "var(--muted)" }}>
                                  Resources: {t.authorizedResources?.join(", ") || "All"}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  )
                })()}
              </>
            )}

            {/* View 9: /attack-lab */}
            {activeRoute === "/attack-lab" && (
              <div className="attack-lab-wrapper">
                <div className="attack-lab-head">
                  <div className="attack-lab-title-area">
                    <div className="attack-lab-eyebrow-row">
                      <span className="attack-lab-pulse-dot" />
                      <span className="eyebrow">ADVERSARIAL AGENTIC SECURITY TESTING</span>
                    </div>
                    <h1>Attack Lab · 100-Scenario Adversarial Suite</h1>
                    <p>Automated, controlled adversarial AI evaluation against prompt injection, canary leakage, and unauthorized tool invocation.</p>
                  </div>
                  <div className="attack-lab-actions">
                    {runnerProgress?.state === "running" ? (
                      <>
                        <button className="btn small warning" type="button" onClick={handlePauseSuite}>
                          {renderIcon("clock")}
                          <span>Pause Suite</span>
                        </button>
                        <button className="btn small danger" type="button" onClick={handleCancelSuite}>
                          {renderIcon("close")}
                          <span>Cancel Suite</span>
                        </button>
                      </>
                    ) : runnerProgress?.state === "paused" ? (
                      <>
                        <button className="btn small attack-lab-cta" type="button" onClick={handleResumeSuite}>
                          {renderIcon("play")}
                          <span>Resume Suite</span>
                        </button>
                        <button className="btn small danger" type="button" onClick={handleCancelSuite}>
                          {renderIcon("close")}
                          <span>Cancel</span>
                        </button>
                      </>
                    ) : (
                      <>
                        <button
                          className="btn attack-lab-cta"
                          type="button"
                          onClick={handleRunAll100Scenarios}
                        >
                          {renderIcon("play")}
                          <span>Run All 100 Scenarios</span>
                        </button>
                        {runnerProgress && (runnerProgress.failedScenarios > 0 || runnerProgress.inconclusiveScenarios > 0) && (
                          <button className="btn small warning" type="button" onClick={handleRetryFailedSuite}>
                            {renderIcon("alert")}
                            <span>Retry Failures ({runnerProgress.failedScenarios})</span>
                          </button>
                        )}
                        <button className="btn small" type="button" onClick={() => handleExportRunReport("json")} title="Export JSON test report">
                          {renderIcon("download")}
                          <span>Export JSON</span>
                        </button>
                        <button className="btn small" type="button" onClick={() => handleExportRunReport("markdown")} title="Export Markdown summary report">
                          {renderIcon("file")}
                          <span>Export Report (MD)</span>
                        </button>
                        <button className="btn small subtle" type="button" onClick={handleResetAll} title="Reset active session tests">
                          {renderIcon("reset")}
                          <span>Reset</span>
                        </button>
                      </>
                    )}
                  </div>
                </div>

                {/* Live Runner Telemetry Bar */}
                {runnerProgress && (
                  <div className="attack-lab-telemetry">
                    <div className="telemetry-head">
                      <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                        <span className={`pill telemetry-status-pill ${runnerProgress.state === "running" ? "info" : runnerProgress.state === "completed" ? "good" : runnerProgress.state === "paused" ? "warn" : "bad"}`}>
                          <span className="telemetry-pulse" />
                          <span>{runnerProgress.state.toUpperCase()}</span>
                        </span>
                        <span style={{ fontSize: "12px", fontFamily: "var(--mono)", color: "#d5e2df", fontWeight: 600 }}>
                          {runnerProgress.state === "running"
                            ? `Executing Scenario: ${runnerProgress.currentScenarioId || "initializing..."}`
                            : `Run Identifier: ${runnerProgress.runId}`}
                        </span>
                      </div>
                      <div style={{ fontSize: "11px", color: "var(--muted)", fontFamily: "var(--mono)" }}>
                        <b style={{ color: "var(--text)" }}>{runnerProgress.completedScenarios}</b> / {runnerProgress.totalScenarios} Scenarios
                        <span style={{ marginLeft: "6px", color: "var(--mint)" }}>
                          ({Math.round((runnerProgress.completedScenarios / Math.max(1, runnerProgress.totalScenarios)) * 100)}%)
                        </span>
                      </div>
                    </div>

                    <div className="progress-track">
                      <div
                        className="progress-fill"
                        style={{
                          width: `${(runnerProgress.completedScenarios / Math.max(1, runnerProgress.totalScenarios)) * 100}%`,
                        }}
                      />
                    </div>

                    <div className="telemetry-stats-grid">
                      <div className="telemetry-stat-card">
                        <span className="telemetry-stat-lbl">Passed</span>
                        <span className="telemetry-stat-val" style={{ color: "var(--mint)" }}>
                          {runnerProgress.passedScenarios}
                        </span>
                      </div>
                      <div className="telemetry-stat-card">
                        <span className="telemetry-stat-lbl">Failed</span>
                        <span
                          className="telemetry-stat-val"
                          style={{ color: runnerProgress.failedScenarios > 0 ? "var(--red)" : "var(--mint)" }}
                        >
                          {runnerProgress.failedScenarios}
                        </span>
                      </div>
                      <div className="telemetry-stat-card">
                        <span className="telemetry-stat-lbl">Inconclusive</span>
                        <span className="telemetry-stat-val" style={{ color: "var(--amber)" }}>
                          {runnerProgress.inconclusiveScenarios}
                        </span>
                      </div>
                      <div className="telemetry-stat-card">
                        <span className="telemetry-stat-lbl">Detection Rate</span>
                        <span className="telemetry-stat-val" style={{ color: "var(--mint)" }}>
                          {runnerProgress.detectionRate}%
                        </span>
                      </div>
                      <div className="telemetry-stat-card">
                        <span className="telemetry-stat-lbl">Execution Blocked</span>
                        <span className="telemetry-stat-val" style={{ color: "var(--mint)" }}>
                          {runnerProgress.executionPreventedCount}
                        </span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Category Selection Tabs */}
                <div>
                  <div className="attack-lab-nav-scroll">
                    <button
                      className={`attack-lab-cat-pill ${selectedCategory === "ALL" ? "active" : ""}`}
                      type="button"
                      onClick={() => setSelectedCategory("ALL")}
                    >
                      <span className="cat-tag">ALL</span>
                      <span>All Categories</span>
                      <span className="cat-count-badge">(100)</span>
                    </button>
                    {CATEGORIES_METADATA.map((catMeta) => {
                      const catCount = getScenariosByCategory(catMeta.id).length
                      const match = catMeta.id.match(/^CAT(\d+)/)
                      const catNum = match ? match[1] : catMeta.id.slice(0, 5)
                      return (
                        <button
                          key={catMeta.id}
                          className={`attack-lab-cat-pill ${selectedCategory === catMeta.id ? "active" : ""}`}
                          type="button"
                          onClick={() => setSelectedCategory(catMeta.id)}
                          title={catMeta.name}
                        >
                          <span className="cat-tag">{catNum}</span>
                          <span>{catMeta.name}</span>
                          <span className="cat-count-badge">({catCount})</span>
                        </button>
                      )
                    })}
                  </div>

                  {selectedCategory !== "ALL" && (() => {
                    const curCat = CATEGORIES_METADATA.find((c) => c.id === selectedCategory)
                    const catScenarios = getScenariosByCategory(selectedCategory as ScenarioCategory)
                    return (
                      <div className="attack-lab-cat-banner">
                        <div className="cat-banner-info">
                          <div className="cat-banner-title">
                            {curCat?.name || selectedCategory}
                          </div>
                          <p className="cat-banner-desc">
                            {curCat?.description}
                          </p>
                        </div>
                        <button
                          className="btn attack-lab-cta"
                          type="button"
                          onClick={() => handleRunSelectedCategory(selectedCategory as ScenarioCategory)}
                          disabled={runnerProgress?.state === "running"}
                        >
                          {renderIcon("play")}
                          <span>Run Category ({catScenarios.length} Scenarios)</span>
                        </button>
                      </div>
                    )
                  })()}
                </div>

                {/* Scenario Filtering and Grid */}
                {(() => {
                  const filtered = ALL_SCENARIOS.filter((sc) => {
                    if (selectedCategory !== "ALL" && sc.category !== selectedCategory) return false

                    if (attackLabSeverityFilter !== "ALL" && sc.severity !== attackLabSeverityFilter) {
                      return false
                    }

                    if (attackLabStatusFilter !== "ALL") {
                      const res = scenarioResults[sc.id]
                      if (attackLabStatusFilter === "untested" && res) return false
                      if (attackLabStatusFilter === "passed" && res?.verdict !== "PASSED") return false
                      if (attackLabStatusFilter === "failed" && res?.verdict !== "FAILED") return false
                      if (attackLabStatusFilter === "inconclusive" && res?.verdict !== "INCONCLUSIVE") return false
                      if (attackLabStatusFilter !== "untested" && !res) return false
                    }

                    const q = (attackLabSearch || globalSearch).trim().toLowerCase()
                    if (!q) return true
                    return (
                      sc.id.toLowerCase().includes(q) ||
                      sc.name.toLowerCase().includes(q) ||
                      sc.threatModel.toLowerCase().includes(q) ||
                      sc.description.toLowerCase().includes(q) ||
                      sc.expectedPolicyOutcome.toLowerCase().includes(q) ||
                      sc.expectedToolOutcome.toLowerCase().includes(q)
                    )
                  })

                  return (
                    <div>
                      {/* Filter Controls Bar */}
                      <div className="attack-lab-filter-bar">
                        <div className="search-box-wrapper">
                          {renderIcon("search")}
                          <input
                            type="text"
                            className="search-box-input"
                            placeholder="Filter scenarios by ID, name, threat model..."
                            value={attackLabSearch}
                            onChange={(e) => setAttackLabSearch(e.target.value)}
                          />
                        </div>

                        <div className="filter-group">
                          <select
                            className="filter-select"
                            value={attackLabSeverityFilter}
                            onChange={(e) => setAttackLabSeverityFilter(e.target.value)}
                            aria-label="Filter by Severity"
                          >
                            <option value="ALL">All Severities</option>
                            <option value="critical">Critical Severity</option>
                            <option value="high">High Severity</option>
                            <option value="medium">Medium Severity</option>
                            <option value="low">Low Severity</option>
                          </select>

                          <select
                            className="filter-select"
                            value={attackLabStatusFilter}
                            onChange={(e) => setAttackLabStatusFilter(e.target.value)}
                            aria-label="Filter by Evaluation Outcome"
                          >
                            <option value="ALL">All Evaluation States</option>
                            <option value="passed">Passed</option>
                            <option value="failed">Failed</option>
                            <option value="inconclusive">Inconclusive</option>
                            <option value="untested">Untested</option>
                          </select>

                          <span className="scenario-count-pill">
                            <span>Showing</span>
                            <b style={{ color: "var(--text)" }}>{filtered.length}</b>
                            <span>of 100</span>
                          </span>

                          {(attackLabSearch || attackLabSeverityFilter !== "ALL" || attackLabStatusFilter !== "ALL") && (
                            <button
                              className="btn small subtle"
                              type="button"
                              onClick={() => {
                                setAttackLabSearch("")
                                setAttackLabSeverityFilter("ALL")
                                setAttackLabStatusFilter("ALL")
                              }}
                              title="Reset active filters"
                            >
                              Clear Filters
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Scenarios Grid or Empty State */}
                      {filtered.length === 0 ? (
                        <div style={{ padding: "48px 24px", textAlign: "center", background: "rgba(13, 19, 25, 0.5)", border: "1px dashed var(--line)", borderRadius: "10px", margin: "16px 0" }}>
                          <p style={{ color: "var(--muted)", fontSize: "13px", margin: "0 0 14px" }}>
                            No security scenarios match your current filter parameters.
                          </p>
                          <button
                            className="btn small"
                            type="button"
                            onClick={() => {
                              setSelectedCategory("ALL")
                              setAttackLabSearch("")
                              setAttackLabSeverityFilter("ALL")
                              setAttackLabStatusFilter("ALL")
                            }}
                          >
                            Reset All Filters
                          </button>
                        </div>
                      ) : (
                        <div className="scenario-grid">
                          {filtered.map((sc) => {
                            const runRes = scenarioResults[sc.id]
                            const isSelected = scenarioPick === sc.id
                            return (
                              <div
                                key={sc.id}
                                className={`scenario ${isSelected ? "selected" : ""}`}
                                onClick={() => setScenarioPick(sc.id)}
                                style={{ display: "flex", flexDirection: "column", justifyContent: "space-between" }}
                              >
                                <div>
                                  <div className="card-top-row">
                                    <span className="card-id-pill">
                                      {sc.id}
                                    </span>
                                    <span className={`pill ${sc.severity === "critical" ? "bad" : sc.severity === "high" ? "warn" : sc.severity === "medium" ? "info" : "good"}`}>
                                      {sc.severity.toUpperCase()}
                                    </span>
                                  </div>
                                  <b className="card-title">{sc.name}</b>
                                  <p className="card-desc">
                                    {sc.threatModel}
                                  </p>
                                  <div className="card-chips">
                                    <span className="card-chip highlight">
                                      Expected: {sc.expectedPolicyOutcome}
                                    </span>
                                    <span className="card-chip">
                                      Tool: {sc.expectedToolOutcome}
                                    </span>
                                    <span className="card-chip">
                                      v{sc.evaluationVersion}
                                    </span>
                                  </div>
                                </div>

                                <div>
                                  {runRes && (
                                    <div className="card-verdict-box">
                                      <div className="card-verdict-header">
                                        <span style={{ color: "var(--muted)", textTransform: "uppercase", fontSize: "9px", letterSpacing: "0.05em" }}>
                                          Evaluation Verdict
                                        </span>
                                        <span className={`pill ${runRes.verdict === "PASSED" ? "good" : runRes.verdict === "FAILED" ? "bad" : "warn"}`} style={{ fontSize: "9px" }}>
                                          {runRes.verdict || "RECORDED"}
                                        </span>
                                      </div>
                                      <div className="card-verdict-desc">
                                        {runRes.description || runRes.decision || "Outcome recorded"}
                                      </div>
                                    </div>
                                  )}

                                  <div className="card-actions">
                                    <button
                                      className="btn small primary"
                                      style={{ flex: 1, minHeight: "34px" }}
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation()
                                        handleRunScenario(sc.id)
                                      }}
                                      disabled={scenarioRunning === sc.id}
                                    >
                                      {scenarioRunning === sc.id ? "Testing..." : (
                                        <>
                                          {renderIcon("play")}
                                          <span>Run Test</span>
                                        </>
                                      )}
                                    </button>
                                    <button
                                      className="btn small"
                                      style={{ minHeight: "34px", padding: "0 14px" }}
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation()
                                        setSelectedScenarioDetail(sc)
                                        setSelectedScenarioTrace(scenarioResults[sc.id]?.details || null)
                                      }}
                                      title="Inspect prompt, context, and trace"
                                    >
                                      {renderIcon("search")}
                                      <span>Inspect</span>
                                    </button>
                                  </div>
                                </div>
                              </div>
                            )
                          })}
                        </div>
                      )}
                    </div>
                  )
                })()}
              </div>
            )}

            {/* View 10: /audit */}
            {activeRoute === "/audit" && (
              <>
                <div className="page-head">
                  <div>
                    <div className="eyebrow">TAMPER-EVIDENT RECORD</div>
                    <h1>Audit explorer</h1>
                    <p>Cryptographically linked SHA-256 audit records with compliance mapping.</p>
                  </div>
                  <div className="page-actions">
                    <button
                      className="btn small primary"
                      type="button"
                      onClick={handleGenerateComplianceReport}
                      disabled={complianceLoading}
                    >
                      {renderIcon("file")}
                      <span>{complianceLoading ? "Generating..." : "Compliance Report"}</span>
                    </button>
                    <button className="btn small" type="button" onClick={handleExportAuditJSON}>
                      {renderIcon("download")}
                      <span>Export JSON</span>
                    </button>
                  </div>
                </div>

                <div className="banner">
                  <span className="banner-icon">{renderIcon("audit")}</span>
                  <div>
                    <b>
                      Cryptographic Chain Integrity:{" "}
                      <span style={{ color: liveIntegrity?.valid !== false ? "var(--mint)" : "var(--red)" }}>
                        {liveIntegrity?.valid !== false ? "VALID & UNALTERED" : "TAMPERING DETECTED"}
                      </span>
                    </b>
                    <p>
                      {liveIntegrity
                        ? `${liveIntegrity.checkedCount} records verified from SQLite genesis link.`
                        : "Walks every stored record and recomputes previous-hash linkage."}
                    </p>
                  </div>
                  <span className="pill good">SHA-256 Chained</span>
                </div>

                <section className="panel">
                  <div className="panel-head">
                    <span><b>Cryptographic Hash Ledger</b></span>
                  </div>
                  <div className="table-wrap">
                    <table className="table">
                      <thead>
                        <tr>
                          <th>Record ID</th>
                          <th>Timestamp</th>
                          <th>Principal</th>
                          <th>Tool Proposal</th>
                          <th>Decision</th>
                          <th>Previous Hash</th>
                          <th>Event Hash</th>
                        </tr>
                      </thead>
                      <tbody>
                        {(liveEvents.length ? liveEvents : defaultEvents).map((e: any) => (
                          <tr key={e.id}>
                            <td>{e.id}</td>
                            <td>{e.timestamp ? new Date(e.timestamp).toLocaleTimeString() : e.time}</td>
                            <td>{(e.agentIdentity || e.actor)?.replace("spiffe://demo.local/agent/", "")}</td>
                            <td>{e.toolName || e.tool}</td>
                            <td>
                              <span className={`pill ${(e.decision || e.result) === "ALLOW" || (e.decision || e.result) === "Allowed" ? "good" : "bad"}`}>
                                {e.decision || e.result}
                              </span>
                            </td>
                            <td className="mono" style={{ fontSize: "8px", color: "var(--muted)" }}>
                              {e.previousHash ? `${e.previousHash.slice(0, 14)}...` : "GENESIS"}
                            </td>
                            <td className="mono" style={{ fontSize: "8px", color: "var(--mint)" }}>
                              {e.eventHash ? `${e.eventHash.slice(0, 14)}...` : "00000000..."}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </section>
              </>
            )}
          </div>
        </main>
      </div>

      {/* Selected Transaction Inspector Modal with Full Security Context */}
      {selectedTxn && (
        <div className="modal-bg" onClick={() => setSelectedTxn(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()} style={{ width: "min(720px, 95%)", maxHeight: "90vh", overflowY: "auto" }}>
            <header className="modal-head">
              <span>
                <b>Transaction Details · {selectedTxn.id}</b>
                <small>{selectedTxn.merchantName || selectedTxn.memo} · {selectedTxn.category || "General"}</small>
              </span>
              <button className="btn small" type="button" onClick={() => setSelectedTxn(null)}>
                {renderIcon("close")}
              </button>
            </header>
            <div className="modal-body">
              {/* Summary Header */}
              <div className="kv" style={{ marginBottom: "16px" }}>
                <div>
                  <label>Amount</label>
                  <b style={{ color: (selectedTxn.status as string) === "denied" || selectedTxn.status === "disputed" ? "var(--red)" : "var(--text)" }}>
                    -${Math.abs(selectedTxn.amount).toFixed(2)} {selectedTxn.currency || "USD"}
                  </b>
                </div>
                <div>
                  <label>Status</label>
                  <b style={{ textTransform: "capitalize" }}>{selectedTxn.status}</b>
                </div>
                <div>
                  <label>Account</label>
                  <b>{selectedTxn.accountId || (selectedTxn as any).account || selectedAccountId}</b>
                </div>
                <div>
                  <label>Record Type</label>
                  <span className="pill good">Simulated Ledger</span>
                </div>
              </div>

              {/* Security Context Inspection */}
              {enrichedSelectedTxn?.securityContext ? (
                <div style={{ marginTop: "12px", borderTop: "1px solid var(--line)", paddingTop: "14px" }}>
                  <div className="eyebrow" style={{ marginBottom: "8px" }}>Zero-Trust Security Telemetry</div>
                  
                  <div className="kv" style={{ marginBottom: "14px" }}>
                    <div>
                      <label>Mediating Agent Principal</label>
                      <b style={{ fontSize: "10px" }} className="mono">
                        {enrichedSelectedTxn.securityContext.agentIdentity || "spiffe://demo.local/agent/financial-remediation"}
                      </b>
                    </div>
                    <div>
                      <label>Cedar Authorization</label>
                      <span className={`pill ${enrichedSelectedTxn.securityContext.cedarDecision === "ALLOW" ? "good" : "bad"}`}>
                        {enrichedSelectedTxn.securityContext.cedarDecision}
                      </span>
                    </div>
                    <div>
                      <label>Determining Policy</label>
                      <b className="mono" style={{ fontSize: "10px" }}>
                        {enrichedSelectedTxn.securityContext.policyId || "fin-remediation-refund-acc1001"}
                      </b>
                    </div>
                    <div>
                      <label>DLP Inspection</label>
                      <span className="pill good">
                        {enrichedSelectedTxn.securityContext.responseInspection?.dlpCheckPassed ? "Sanitized (0 Leaks)" : "Flagged"}
                      </span>
                    </div>
                  </div>

                  {enrichedSelectedTxn.securityContext.decisionExplanation && (
                    <div style={{ background: "rgba(255,255,255,.02)", padding: "10px 12px", borderRadius: "6px", border: "1px solid var(--line)", marginBottom: "14px", fontSize: "11px" }}>
                      <span style={{ color: "var(--muted)", display: "block", marginBottom: "4px", fontSize: "9px", textTransform: "uppercase" }}>Policy Explanation</span>
                      {enrichedSelectedTxn.securityContext.decisionExplanation}
                    </div>
                  )}

                  {enrichedSelectedTxn.securityContext.linkedIncidentId && (
                    <div style={{ background: "rgba(241,126,130,.06)", padding: "10px 12px", borderRadius: "6px", border: "1px solid rgba(241,126,130,.2)", marginBottom: "14px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <div>
                        <b style={{ color: "var(--red)", fontSize: "11px" }}>Linked Security Incident: {enrichedSelectedTxn.securityContext.linkedIncidentId}</b>
                        <p style={{ margin: "2px 0 0", fontSize: "9px", color: "var(--muted)" }}>Violation correlated and logged in Incident Management.</p>
                      </div>
                      <button
                        className="btn small"
                        type="button"
                        onClick={() => {
                          setSelectedTxn(null)
                          handleNavClick("/incidents", { preventDefault: () => {} } as any)
                        }}
                      >
                        <span>View Incident</span>
                        {renderIcon("arrow")}
                      </button>
                    </div>
                  )}

                  {/* Cryptographic Audit Chaining */}
                  {enrichedSelectedTxn.securityContext.auditHash && (
                    <div style={{ marginBottom: "14px" }}>
                      <span style={{ color: "var(--faint)", fontSize: "9px", textTransform: "uppercase", display: "block", marginBottom: "4px" }}>
                        Cryptographic Audit Record (SHA-256)
                      </span>
                      <div className="trace-box" style={{ padding: "8px 12px", fontSize: "9px", color: "var(--mint)" }}>
                        Event: {enrichedSelectedTxn.securityContext.auditEventId || "EVT-1048"} · Root Hash: {enrichedSelectedTxn.securityContext.auditHash}
                      </div>
                    </div>
                  )}

                  {/* Security Lifecycle Timeline */}
                  {enrichedSelectedTxn.securityContext.timeline?.length > 0 && (
                    <div>
                      <span style={{ color: "var(--faint)", fontSize: "9px", textTransform: "uppercase", display: "block", marginBottom: "8px" }}>
                        Enforcement Lifecycle Timeline
                      </span>
                      <div className="timeline-container">
                        {enrichedSelectedTxn.securityContext.timeline.map((stg, idx) => (
                          <div key={idx} className="timeline-node">
                            <span className={`timeline-dot ${stg.status}`} />
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                              <b style={{ fontSize: "11px" }}>{stg.stage}</b>
                              <span className="mono" style={{ fontSize: "8px", color: "var(--faint)" }}>
                                {new Date(stg.timestamp).toLocaleTimeString()}
                              </span>
                            </div>
                            <p style={{ margin: "2px 0 0", fontSize: "9px", color: "var(--muted)" }}>{stg.detail}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div style={{ marginTop: "14px", borderTop: "1px solid var(--line)", paddingTop: "18px", textAlign: "center", color: "var(--muted)" }}>
                  <div style={{ width: "32px", height: "32px", margin: "0 auto 8px", color: "var(--faint)" }}>
                    {renderIcon("shield")}
                  </div>
                  <b style={{ color: "var(--text)", fontSize: "12px", display: "block", marginBottom: "4px" }}>
                    No linked security activity is recorded for this transaction.
                  </b>
                  <p style={{ fontSize: "10px", maxWidth: "420px", margin: "0 auto", color: "var(--faint)" }}>
                    Standard consumer payment transactions processed without agent delegation or policy rule violations operate normally without raising security alerts.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Selected Event Inspector Modal */}
      {selectedLiveEvent && (
        <div className="modal-bg" onClick={() => setSelectedLiveEvent(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()} style={{ width: "min(600px, 95%)" }}>
            <header className="modal-head">
              <span>
                <b>Event Inspector · {selectedLiveEvent.id}</b>
                <small>{selectedLiveEvent.toolName || (selectedLiveEvent as any).tool}</small>
              </span>
              <button className="btn small" type="button" onClick={() => setSelectedLiveEvent(null)}>
                {renderIcon("close")}
              </button>
            </header>
            <div className="modal-body">
              <div className="kv" style={{ marginBottom: "14px" }}>
                <div>
                  <label>Decision</label>
                  <b>{selectedLiveEvent.decision || (selectedLiveEvent as any).result}</b>
                </div>
                <div>
                  <label>Principal</label>
                  <b>{selectedLiveEvent.agentIdentity || (selectedLiveEvent as any).actor}</b>
                </div>
                <div>
                  <label>Policy ID</label>
                  <b>{selectedLiveEvent.policyId || "fintech.cedar"}</b>
                </div>
                <div>
                  <label>Risk Score</label>
                  <b>{selectedLiveEvent.riskAssessment?.overallScore ?? 12}/100</b>
                </div>
              </div>

              {selectedLiveEvent.sanitizedArgs && (
                <div>
                  <label style={{ fontSize: "8px", color: "var(--faint)", textTransform: "uppercase" }}>
                    Sanitized Tool Arguments
                  </label>
                  <pre className="code" style={{ marginTop: "4px" }}>
                    {JSON.stringify(selectedLiveEvent.sanitizedArgs, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* AI Audit Modal */}
      {aiAuditModal.open && (
        <div className="modal-bg" onClick={() => setAiAuditModal({ open: false, loading: false, report: null })}>
          <div className="modal" onClick={(e) => e.stopPropagation()} style={{ width: "min(700px, 95%)" }}>
            <header className="modal-head">
              <span>
                <b>AI Account Security & Risk Audit</b>
                <small>Autonomous analysis of account {selectedAccountId}</small>
              </span>
              <button
                className="btn small"
                type="button"
                onClick={() => setAiAuditModal({ open: false, loading: false, report: null })}
              >
                {renderIcon("close")}
              </button>
            </header>
            <div className="modal-body">
              {aiAuditModal.loading ? (
                <div style={{ padding: "30px", textAlign: "center", color: "var(--mint)" }}>
                  Analyzing transaction patterns, prompt injection signals, and velocity limits...
                </div>
              ) : (
                <pre className="code" style={{ maxHeight: "350px", overflow: "auto" }}>
                  {aiAuditModal.report}
                </pre>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Compliance Report Modal */}
      {complianceModalOpen && complianceReport && (
        <div className="modal-bg" onClick={() => setComplianceModalOpen(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()} style={{ width: "min(780px, 95%)" }}>
            <header className="modal-head">
              <span>
                <b>Executive & Compliance Audit Report</b>
                <small>Framework mapping · Report ID: {complianceReport.reportId}</small>
              </span>
              <button className="btn small" type="button" onClick={() => setComplianceModalOpen(false)}>
                {renderIcon("close")}
              </button>
            </header>
            <div className="modal-body" style={{ maxHeight: "420px", overflow: "auto" }}>
              <div className="kv" style={{ marginBottom: "14px" }}>
                <div>
                  <label>Cryptographic Chain</label>
                  <b style={{ color: complianceReport.chainIntegrity ? "var(--mint)" : "var(--red)" }}>
                    {complianceReport.chainIntegrity ? "VERIFIED VALID" : "TAMPERED"}
                  </b>
                </div>
                <div>
                  <label>Records Checked</label>
                  <b>{complianceReport.totalEventsVerified}</b>
                </div>
              </div>

              {complianceReport.standards?.map((std) => (
                <div key={std.code} style={{ marginBottom: "14px" }}>
                  <b style={{ color: "var(--mint)", fontSize: "11px" }}>
                    {std.name} ({std.code})
                  </b>
                  <div className="table-wrap" style={{ marginTop: "6px" }}>
                    <table className="table">
                      <thead>
                        <tr>
                          <th>Control</th>
                          <th>Description</th>
                          <th>Enforcement</th>
                          <th>Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {std.controls?.map((c) => (
                          <tr key={c.id}>
                            <td>{c.id}</td>
                            <td>{c.description}</td>
                            <td>{c.enforcementMechanism}</td>
                            <td>
                              <span className="pill good">{c.status}</span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ))}
            </div>
            <footer className="modal-foot">
              <button className="btn small primary" type="button" onClick={handleDownloadComplianceMarkdown}>
                {renderIcon("download")} Download Markdown
              </button>
            </footer>
          </div>
        </div>
      )}

      {/* Incident Lifecycle & Resolution Detail Modal */}
      {selectedIncidentModal && (
        <div className="modal-bg" onClick={() => setSelectedIncidentModal(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()} style={{ width: "min(720px, 95%)" }}>
            <header className="modal-head">
              <span>
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <b style={{ fontSize: "14px" }}>Incident: {selectedIncidentModal.id}</b>
                  <span className={`pill ${selectedIncidentModal.severity === "CRITICAL" || selectedIncidentModal.severity === "HIGH" ? "bad" : "warn"}`}>
                    {selectedIncidentModal.severity}
                  </span>
                  <span className={`pill ${selectedIncidentModal.status === "RESOLVED" ? "good" : selectedIncidentModal.status === "CONTAINED" ? "accent" : selectedIncidentModal.status === "INVESTIGATING" ? "info" : "warn"}`}>
                    {selectedIncidentModal.status}
                  </span>
                </div>
                <small>{selectedIncidentModal.title}</small>
              </span>
              <button className="btn small" type="button" onClick={() => setSelectedIncidentModal(null)}>
                {renderIcon("close")}
              </button>
            </header>

            <div className="modal-body" style={{ maxHeight: "500px", overflow: "auto" }}>
              <div className="kv" style={{ marginBottom: "14px" }}>
                <div>
                  <label>Principal</label>
                  <b style={{ fontSize: "10px" }}>{selectedIncidentModal.relatedAgentIdentity || "spiffe://demo.local/agent/financial-remediation"}</b>
                </div>
                <div>
                  <label>Category</label>
                  <b>{selectedIncidentModal.category}</b>
                </div>
                <div>
                  <label>First Observed</label>
                  <b style={{ fontSize: "10px" }}>{new Date(selectedIncidentModal.firstObservedAt).toLocaleString()}</b>
                </div>
                <div>
                  <label>Correlated Test Scenario</label>
                  <b style={{ color: "var(--mint)", fontSize: "10px" }}>{selectedIncidentModal.relatedScenarioId || "N/A"}</b>
                </div>
              </div>

              {/* Trigger Evidence */}
              <div style={{ marginBottom: "14px" }}>
                <span style={{ fontSize: "9px", color: "var(--faint)", textTransform: "uppercase", display: "block", marginBottom: "4px" }}>
                  Trigger Violation & Adversarial Evidence
                </span>
                <div style={{ padding: "10px 14px", background: "rgba(0,0,0,0.4)", borderRadius: "6px", border: "1px solid rgba(255,255,255,0.08)", fontSize: "10px", fontFamily: "var(--mono)" }}>
                  {(selectedIncidentModal.evidence && selectedIncidentModal.evidence.length > 0) ? selectedIncidentModal.evidence.join("\n") : "Adversarial prompt injection pattern detected and flagged by boundary detector."}
                </div>
              </div>

              {/* Incident Event Timeline */}
              {selectedIncidentModal.timeline && selectedIncidentModal.timeline.length > 0 && (
                <div style={{ marginBottom: "16px" }}>
                  <span style={{ fontSize: "9px", color: "var(--faint)", textTransform: "uppercase", display: "block", marginBottom: "8px" }}>
                    Audit & Incident Lifecycle Timeline
                  </span>
                  <div className="timeline-container">
                    {selectedIncidentModal.timeline.map((item, idx) => (
                      <div key={idx} className="timeline-node">
                        <span className={`timeline-dot ${item.action === "RESOLVED" ? "good" : item.action === "CONTAINED" ? "accent" : item.action === "INVESTIGATING" ? "info" : "bad"}`} />
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                          <b style={{ fontSize: "11px" }}>{item.action}</b>
                          <span className="mono" style={{ fontSize: "8px", color: "var(--faint)" }}>
                            {new Date(item.time).toLocaleTimeString()} · {item.actor}
                          </span>
                        </div>
                        {item.note && (
                          <p style={{ margin: "2px 0 0", fontSize: "9px", color: "var(--muted)" }}>{item.note}</p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* State Transition & Resolution Section */}
              <div style={{ padding: "12px", background: "rgba(255,255,255,0.03)", borderRadius: "6px", border: "1px solid rgba(255,255,255,0.08)" }}>
                <b style={{ fontSize: "10px", display: "block", marginBottom: "6px" }}>Operational Incident Resolution</b>
                <textarea
                  className="field"
                  style={{ width: "100%", height: "60px", marginBottom: "8px", fontSize: "10px", resize: "none" }}
                  placeholder="Enter root-cause notes, containment mitigation, or resolution details..."
                  value={incidentResolutionNotes}
                  onChange={(e) => setIncidentResolutionNotes(e.target.value)}
                />
                <div style={{ display: "flex", gap: "8px", justifyContent: "flex-end" }}>
                  {selectedIncidentModal.status !== "INVESTIGATING" && selectedIncidentModal.status !== "RESOLVED" && (
                    <button
                      className="btn small"
                      type="button"
                      onClick={() => handleUpdateIncidentLifecycle(selectedIncidentModal.id, "INVESTIGATING")}
                    >
                      Mark Investigating
                    </button>
                  )}
                  {selectedIncidentModal.status !== "CONTAINED" && selectedIncidentModal.status !== "RESOLVED" && (
                    <button
                      className="btn small"
                      type="button"
                      onClick={() => handleUpdateIncidentLifecycle(selectedIncidentModal.id, "CONTAINED")}
                    >
                      Contain Threat
                    </button>
                  )}
                  {selectedIncidentModal.status !== "RESOLVED" ? (
                    <button
                      className="btn small primary"
                      type="button"
                      onClick={() => handleUpdateIncidentLifecycle(selectedIncidentModal.id, "RESOLVED")}
                    >
                      Resolve Incident
                    </button>
                  ) : (
                    <button
                      className="btn small"
                      type="button"
                      onClick={() => handleUpdateIncidentLifecycle(selectedIncidentModal.id, "REOPENED")}
                    >
                      Reopen Incident
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Scenario Inspection & Trace Modal */}
      {selectedScenarioDetail && (
        <div className="modal-bg" onClick={() => setSelectedScenarioDetail(null)}>
          <div className="attack-lab-modal-dialog" onClick={(e) => e.stopPropagation()}>
            <header className="modal-head" style={{ padding: "16px 20px" }}>
              <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
                  <span className="card-id-pill" style={{ fontSize: "11px" }}>
                    {selectedScenarioDetail.id}
                  </span>
                  <b style={{ fontSize: "14px", color: "#f2f5f4" }}>{selectedScenarioDetail.name}</b>
                  <span className={`pill ${selectedScenarioDetail.severity === "critical" ? "bad" : selectedScenarioDetail.severity === "high" ? "warn" : selectedScenarioDetail.severity === "medium" ? "info" : "good"}`}>
                    {selectedScenarioDetail.severity.toUpperCase()}
                  </span>
                </div>
                <small style={{ color: "var(--muted)", fontSize: "11px" }}>
                  {CATEGORIES_METADATA.find((c) => c.id === selectedScenarioDetail.category)?.name || selectedScenarioDetail.category} · Evaluation Contract v{selectedScenarioDetail.evaluationVersion}
                </small>
              </div>
              <button className="btn small subtle" type="button" onClick={() => setSelectedScenarioDetail(null)} aria-label="Close modal">
                {renderIcon("close")}
              </button>
            </header>

            <div className="modal-body" style={{ maxHeight: "560px", overflowY: "auto", padding: "18px 20px" }}>
              {/* Threat Model */}
              <div style={{ marginBottom: "16px" }}>
                <span style={{ fontSize: "10px", color: "var(--mint)", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", display: "block", marginBottom: "6px" }}>
                  Adversarial Threat Model
                </span>
                <p style={{ fontSize: "12px", color: "#d2dedb", margin: 0, lineHeight: "1.55", background: "rgba(255,255,255,0.02)", padding: "10px 14px", borderRadius: "8px", border: "1px solid rgba(255,255,255,0.05)" }}>
                  {selectedScenarioDetail.threatModel}
                </p>
              </div>

              {/* Synthetic Adversarial Prompt with Copy Button */}
              <div style={{ marginBottom: "16px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px" }}>
                  <span style={{ fontSize: "10px", color: "var(--red)", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em" }}>
                    Synthetic Adversarial Payload
                  </span>
                  <button
                    className="btn small subtle"
                    style={{ fontSize: "10px", height: "26px", padding: "0 8px" }}
                    type="button"
                    onClick={() => {
                      navigator.clipboard.writeText(selectedScenarioDetail.syntheticInput)
                      setCopiedInputId(selectedScenarioDetail.id)
                      setTimeout(() => setCopiedInputId(null), 2000)
                    }}
                  >
                    {copiedInputId === selectedScenarioDetail.id ? (
                      <>
                        {renderIcon("check")}
                        <span style={{ color: "var(--mint)" }}>Copied!</span>
                      </>
                    ) : (
                      <span>Copy Payload</span>
                    )}
                  </button>
                </div>
                <pre className="terminal-block">
                  {selectedScenarioDetail.syntheticInput}
                </pre>
              </div>

              {/* Expected Defense Contract */}
              <div style={{ marginBottom: "16px" }}>
                <span style={{ fontSize: "10px", color: "var(--muted)", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", display: "block", marginBottom: "8px" }}>
                  Zero-Trust Defense Specifications
                </span>
                <div className="kv-contract-grid">
                  <div className="contract-card">
                    <label>Expected Policy Decision</label>
                    <b style={{ color: selectedScenarioDetail.expectedPolicyOutcome === "DENY" ? "var(--red)" : "var(--mint)" }}>
                      {selectedScenarioDetail.expectedPolicyOutcome}
                    </b>
                  </div>
                  <div className="contract-card">
                    <label>Expected Tool Execution</label>
                    <b style={{ color: selectedScenarioDetail.expectedToolOutcome === "BLOCKED" ? "var(--mint)" : "var(--amber)" }}>
                      {selectedScenarioDetail.expectedToolOutcome}
                    </b>
                  </div>
                  <div className="contract-card">
                    <label>Available Sandboxed Tools</label>
                    <span style={{ fontSize: "10px", fontFamily: "var(--mono)", color: "#bdc8c9", marginTop: "2px" }}>
                      {selectedScenarioDetail.availableSimulatedTools.length > 0 ? selectedScenarioDetail.availableSimulatedTools.join(", ") : "None (Isolated Prompt)"}
                    </span>
                  </div>
                </div>
              </div>

              {/* Execution Trace if available */}
              {selectedScenarioTrace ? (
                <div style={{ marginTop: "16px", borderTop: "1px solid rgba(255,255,255,0.08)", paddingTop: "16px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "10px" }}>
                    <b style={{ fontSize: "12px", color: "#f2f5f4" }}>Live Execution & Evaluation Telemetry</b>
                    <span className={`pill ${selectedScenarioTrace.verdict === "PASSED" ? "good" : selectedScenarioTrace.verdict === "FAILED" ? "bad" : "warn"}`} style={{ fontSize: "10px" }}>
                      Verdict: {selectedScenarioTrace.verdict}
                    </span>
                  </div>

                  <div className="kv-contract-grid">
                    <div className="contract-card">
                      <label>Actual Policy Decision</label>
                      <b style={{ color: selectedScenarioTrace.actualPolicyDecision === "DENY" ? "var(--red)" : "var(--mint)" }}>
                        {selectedScenarioTrace.actualPolicyDecision}
                      </b>
                    </div>
                    <div className="contract-card">
                      <label>Execution Prevented</label>
                      <b style={{ color: selectedScenarioTrace.executionPrevented ? "var(--mint)" : "var(--red)" }}>
                        {selectedScenarioTrace.executionPrevented ? "YES (Enforced)" : "NO (Unauthorized Execution)"}
                      </b>
                    </div>
                    <div className="contract-card">
                      <label>Canary Disclosed</label>
                      <b style={{ color: selectedScenarioTrace.canaryDisclosed ? "var(--red)" : "var(--mint)" }}>
                        {selectedScenarioTrace.canaryDisclosed ? "LEAKED" : "NONE (Protected)"}
                      </b>
                    </div>
                    <div className="contract-card">
                      <label>Execution Latency</label>
                      <b>{selectedScenarioTrace.durationMs} ms</b>
                    </div>
                  </div>

                  <div style={{ marginBottom: "14px", padding: "12px 14px", background: "rgba(0,0,0,0.35)", borderRadius: "8px", border: "1px solid rgba(255,255,255,0.06)" }}>
                    <span style={{ fontSize: "9px", color: "var(--faint)", textTransform: "uppercase", display: "block", marginBottom: "4px", letterSpacing: "0.05em" }}>
                      Defense Evaluation Notes
                    </span>
                    <p style={{ fontSize: "11px", color: "#d0dedb", margin: 0, lineHeight: "1.45" }}>
                      {selectedScenarioTrace.defenseNotes}
                    </p>
                  </div>

                  {/* Step Trace Log */}
                  {selectedScenarioTrace.stepTraces && selectedScenarioTrace.stepTraces.length > 0 && (
                    <div>
                      <span style={{ fontSize: "9px", color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.06em", display: "block", marginBottom: "6px" }}>
                        Multi-Stage Step Logs ({selectedScenarioTrace.stepTraces.length})
                      </span>
                      <div style={{ maxHeight: "170px", overflowY: "auto", background: "#05080c", borderRadius: "8px", border: "1px solid rgba(255,255,255,0.06)", padding: "10px 14px" }}>
                        {selectedScenarioTrace.stepTraces.map((st: { stage: string; output: string }, idx: number) => {
                          const total = selectedScenarioTrace.stepTraces?.length ?? 0
                          return (
                            <div key={idx} style={{ padding: "5px 0", borderBottom: idx < total - 1 ? "1px solid rgba(255,255,255,0.04)" : "none", fontSize: "10px", fontFamily: "var(--mono)", lineHeight: "1.4" }}>
                              <span style={{ color: "var(--mint)", fontWeight: 600 }}>[{st.stage}]</span>{" "}
                              <span style={{ color: "#c8d4d6" }}>{st.output}</span>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div style={{ marginTop: "14px", padding: "20px", textAlign: "center", background: "rgba(0,0,0,0.25)", border: "1px dashed var(--line)", borderRadius: "8px", color: "var(--muted)", fontSize: "11px" }}>
                  Scenario has not been executed yet in the active session. Click "Run This Scenario Now" below to test boundary enforcement.
                </div>
              )}
            </div>

            <footer className="modal-foot" style={{ padding: "14px 20px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <button
                className="btn small attack-lab-cta"
                type="button"
                onClick={async () => {
                  if (selectedScenarioDetail) {
                    await handleRunScenario(selectedScenarioDetail.id)
                  }
                }}
                disabled={scenarioRunning === selectedScenarioDetail?.id}
              >
                {scenarioRunning === selectedScenarioDetail?.id ? "Executing..." : (
                  <>
                    {renderIcon("play")}
                    <span>Run This Scenario Now</span>
                  </>
                )}
              </button>
              <button className="btn small" type="button" onClick={() => setSelectedScenarioDetail(null)}>
                Close
              </button>
            </footer>
          </div>
        </div>
      )}

      {/* Toast Notification */}
      <div className={`toast ${toastMessage ? "show" : ""}`} role="status" aria-live="polite">
        {toastMessage}
      </div>
    </div>
  )
}

export default SecurityConsole
