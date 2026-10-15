// ============================================================
// MCP Sentinel — Unified Backend API Client
// Handles REST requests and Server-Sent Events (SSE)
// ============================================================

import type {
  SecurityMetrics,
  AuditEvent,
  PolicyFile,
  DemoIdentity,
  Incident,
  ApprovalRequest,
  CircuitBreakerStatus,
  CustomerAccount,
  Transaction,
  PendingRefund,
  ComplianceReport,
  FinanceStatus,
  FinanceChatResponse,
} from "./types"

const API_BASE = import.meta.env.VITE_API_BASE_URL || "/api"

async function fetchJSON<T>(path: string, options?: RequestInit): Promise<T> {
  const url = `${API_BASE}${path}`
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), 12000)

  try {
    const headers: Record<string, string> = {
      Accept: "application/json",
      ...(options?.headers as Record<string, string>),
    }
    if (options?.body) {
      headers["Content-Type"] = "application/json"
    }

    const res = await fetch(url, {
      signal: controller.signal,
      ...options,
      headers,
    })

    if (!res.ok) {
      const err = await res
        .json()
        .catch(() => ({ error: `HTTP ${res.status}: ${res.statusText}` }))
      throw new Error(err.error || err.message || res.statusText)
    }

    return await res.json()
  } catch (err: any) {
    if (err.name === "AbortError") {
      throw new Error(`API request timed out after 12s: ${path}`)
    }
    throw err
  } finally {
    clearTimeout(timeoutId)
  }
}

export const api = {
  // System Health & Diagnostics
  getHealth: () =>
    fetchJSON<{
      status: string
      version?: string
      policyEngineReady: boolean
      timestamp?: string
    }>("/health"),

  // Security Overview Metrics
  getMetrics: () => fetchJSON<SecurityMetrics>("/metrics"),

  // Audit Events & Tamper-Evident Hash Chain
  getEvents: (params?: Record<string, string>) => {
    const qs = params ? "?" + new URLSearchParams(params).toString() : ""
    return fetchJSON<{ events: AuditEvent[] }>(`/events${qs}`)
  },

  getEvent: (id: string) => fetchJSON<AuditEvent>(`/events/${id}`),

  verifyIntegrity: () =>
    fetchJSON<{
      valid: boolean
      checkedCount: number
      brokenAt?: string
      rootHash?: string
    }>("/audit/integrity"),

  getComplianceReport: () => fetchJSON<ComplianceReport>("/reports/compliance"),

  // Cedar Policies
  getPolicies: () => fetchJSON<{ policies: PolicyFile[] }>("/policies"),

  updatePolicy: (filename: string, content: string) =>
    fetchJSON<{ success: boolean; errors?: string[] }>(`/policies/${filename}`, {
      method: "PUT",
      body: JSON.stringify({ content }),
    }),

  validatePolicy: (content: string) =>
    fetchJSON<{ valid: boolean; errors: string[] }>("/policies/validate", {
      method: "POST",
      body: JSON.stringify({ content }),
    }),

  generatePolicy: (prompt: string) =>
    fetchJSON<{
      prompt: string
      generatedPolicy: string
      explanation: string
      valid: boolean
      errors?: string[]
    }>("/policies/generate", {
      method: "POST",
      body: JSON.stringify({ prompt }),
    }),

  // Agent Identity & Attestation
  getIdentities: () =>
    fetchJSON<{ identities: DemoIdentity[] }>("/identities"),

  issueToken: (params: {
    subject: string
    capabilities: string[]
    authorizedResources?: string[]
    maxRefundAmount?: number
    ttlSeconds?: number
  }) => fetchJSON<{ token: string; tokenId: string }>("/tokens/issue", {
    method: "POST",
    body: JSON.stringify(params),
  }),

  revokeToken: (tokenId: string, reason: string) =>
    fetchJSON<{ success: boolean; tokenId: string }>("/tokens/revoke", {
      method: "POST",
      body: JSON.stringify({ tokenId, reason }),
    }),

  delegateToken: (params: {
    parentTokenId: string
    delegatee: string
    attenuatedCapabilities?: string[]
    maxRefundAmount?: number
    ttlSeconds?: number
  }) => fetchJSON<any>("/tokens/delegate", {
    method: "POST",
    body: JSON.stringify(params),
  }),

  getDelegations: () => fetchJSON<{ delegations: any[] }>("/delegations"),

  getRevocations: () => fetchJSON<{ revocations: any[] }>("/revocations"),

  // Incidents & Autonomous Circuit Breaker
  getIncidents: () => fetchJSON<{ incidents: Incident[] }>("/incidents"),

  getCircuitBreaker: () =>
    fetchJSON<{ statuses: CircuitBreakerStatus[] }>("/circuit-breaker"),

  resetCircuitBreaker: (agentIdentity?: string) =>
    fetchJSON<{ success: boolean; message: string }>("/circuit-breaker/reset", {
      method: "POST",
      body: JSON.stringify({ agentIdentity }),
    }),

  // Human-In-The-Loop Approvals
  getApprovals: () =>
    fetchJSON<{ approvals: ApprovalRequest[] }>("/approvals"),

  decideApproval: (
    id: string,
    decision: "approve" | "reject",
    approvedBy: string = "supervisor@mcp-sentinel.local",
  ) =>
    fetchJSON<{ success: boolean; approval: ApprovalRequest }>(
      `/approvals/${id}/decision`,
      {
        method: "POST",
        body: JSON.stringify({ decision, approvedBy }),
      },
    ),

  // Gemini AI Finance Assistant
  getFinanceStatus: () => fetchJSON<FinanceStatus>("/finance/status"),

  sendFinanceChat: (
    message: string,
    conversationId?: string,
    accountId?: string,
  ) =>
    fetchJSON<FinanceChatResponse>("/finance/chat", {
      method: "POST",
      body: JSON.stringify({ message, conversationId, accountId }),
    }),

  getFinanceConversation: (id: string) =>
    fetchJSON<any>(`/finance/conversations/${id}`),

  getPendingRefunds: () =>
    fetchJSON<{ pendingRefunds: PendingRefund[] }>("/finance/refunds/pending"),

  confirmRefund: (confirmationId: string) =>
    fetchJSON<{
      success: boolean
      status: string
      executionResult?: any
      error?: string
    }>(`/finance/refunds/${confirmationId}/confirm`, {
      method: "POST",
    }),

  rejectRefund: (confirmationId: string) =>
    fetchJSON<{ success: boolean; status: string }>(
      `/finance/refunds/${confirmationId}/reject`,
      {
        method: "POST",
      },
    ),

  resetFinance: () => fetchJSON<{ success: boolean }>("/finance/reset", {
    method: "POST",
  }),

  // Accounts & Ledger
  getAccounts: () =>
    fetchJSON<{ accounts: CustomerAccount[] }>("/finance/accounts"),

  getAccountDetails: (id: string) =>
    fetchJSON<{ account: CustomerAccount; analytics: any }>(
      `/finance/accounts/${id}`,
    ),

  getAccountTransactions: (
    id: string,
    params?: { category?: string; status?: string; search?: string },
  ) => {
    const qs = new URLSearchParams()
    if (params?.category && params.category !== "all")
      qs.set("category", params.category)
    if (params?.status && params.status !== "all")
      qs.set("status", params.status)
    if (params?.search && params.search.trim())
      qs.set("search", params.search.trim())
    const query = qs.toString() ? `?${qs.toString()}` : ""
    return fetchJSON<{ transactions: Transaction[]; count: number }>(
      `/finance/accounts/${id}/transactions${query}`,
    )
  },

  setAccountStatus: (
    id: string,
    status: "active" | "suspended" | "closed",
    reason?: string,
  ) =>
    fetchJSON<{ success: boolean; account: CustomerAccount }>(
      `/finance/accounts/${id}/status`,
      {
        method: "POST",
        body: JSON.stringify({ status, reason }),
      },
    ),

  runAiAudit: (accountId: string) =>
    fetchJSON<{ success: boolean; report: string; analytics: any }>(
      "/finance/ai/audit",
      {
        method: "POST",
        body: JSON.stringify({ accountId }),
      },
    ),

  // Attack Lab Simulations & 100-Scenario Runner
  simulate: (scenario: string) =>
    fetchJSON<{
      scenarioId: string
      description: string
      success: boolean
      decision?: string
      event?: AuditEvent
      approval?: ApprovalRequest
      circuitBreaker?: CircuitBreakerStatus
      error?: string
      [key: string]: any
    }>(`/simulate/${scenario}`, {
      method: "POST",
    }),

  resetAll: () => fetchJSON<{ success: boolean }>("/reset", {
    method: "POST",
  }),

  // Dynamic Incident Management Lifecycle
  updateIncidentStatus: (
    id: string,
    status: "OPEN" | "INVESTIGATING" | "CONTAINED" | "RESOLVED" | "REOPENED",
    notes?: string,
  ) =>
    fetchJSON<{ success: boolean; incident: any }>(`/incidents/${id}/status`, {
      method: "POST",
      body: JSON.stringify({ status, notes }),
    }).catch(() => {
      // Local security store fallback
      const { defaultSecurityStore } = require("../services/securityStore")
      const updated = defaultSecurityStore.updateIncidentStatus(id, status, "operator@byteshield.local", notes)
      return { success: updated, incident: defaultSecurityStore.getState().incidents.find((i: any) => i.id === id) }
    }),
}

// Server-Sent Events (SSE) subscriber
export function createEventStream(onEvent: (event: any) => void) {
  let eventSource: EventSource | null = null
  let retryTimer: any = null
  let active = true

  const connect = () => {
    if (!active) return
    try {
      eventSource = new EventSource(`${API_BASE}/events/stream`)

      eventSource.onmessage = (e) => {
        try {
          const parsed = JSON.parse(e.data)
          onEvent(parsed)
        } catch {
          // ignore parsing error
        }
      }

      eventSource.onerror = () => {
        eventSource?.close()
        if (active) {
          retryTimer = setTimeout(connect, 4000)
        }
      }
    } catch {
      if (active) {
        retryTimer = setTimeout(connect, 4000)
      }
    }
  }

  connect()

  return () => {
    active = false
    clearTimeout(retryTimer)
    eventSource?.close()
  }
}
