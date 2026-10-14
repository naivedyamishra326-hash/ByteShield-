// ============================================================
// MCP Sentinel — API Data Models & Schemas
// Matches the authoritative backend contracts from Hackathon-Project
// ============================================================

export interface SecurityMetrics {
  totalInvocations: number;
  allowedRequests: number;
  blockedRequests: number;
  approvalRequired: number;
  distinctAgents: number;
  activeIncidents: number;
  recentViolations: number;
  avgAuthzLatencyMs: number;
  p50LatencyMs: number;
  p95LatencyMs: number;
  p99LatencyMs: number;
}

export interface RiskFactor {
  factor: string;
  weight: number;
  score: number;
  description?: string;
}

export interface RiskAssessment {
  overallScore: number;
  level: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  factors: RiskFactor[];
}

export interface AuditEvent {
  id: string;
  timestamp: string;
  correlationId: string;
  sessionId?: string;
  agentIdentity: string;
  toolName: string;
  action: string;
  resourceId?: string;
  eventType: string;
  decision?: "ALLOW" | "DENY" | "HOLD" | string;
  policyId?: string;
  riskAssessment?: RiskAssessment;
  sanitizedArgs?: Record<string, unknown>;
  outcome?: string;
  details?: Record<string, unknown>;
  previousHash?: string;
  eventHash?: string;
}

export interface PolicyFile {
  name: string;
  content: string;
  loadedAt: string;
}

export interface DemoToken {
  id: string;
  subject: string;
  capabilities: string[];
  authorizedResources?: string[];
  maxRefundAmount?: number;
  issuedAt: string;
  expiresAt: string;
  revoked: boolean;
  parentTokenId?: string;
  token?: string;
}

export interface DemoIdentity {
  name: string;
  uri: string;
  tokens: DemoToken[];
}

export interface IncidentEventChain {
  eventId: string;
  timestamp: string;
  toolName: string;
  eventType: string;
  decision?: string;
}

export interface Incident {
  id: string;
  sessionId: string;
  agentIdentity: string;
  severity: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  description: string;
  eventChain: IncidentEventChain[];
  detectedAt: string;
  status: "ACTIVE" | "MITIGATED" | "RESOLVED";
}

export interface ApprovalRequest {
  id: string;
  correlationId: string;
  agentIdentity: string;
  toolName: string;
  arguments: Record<string, unknown>;
  reason: string;
  policyId?: string;
  requestedAt: string;
  expiresAt: string;
  status: "pending" | "approved" | "rejected" | "expired";
  decidedBy?: string;
  decidedAt?: string;
  executionResult?: unknown;
}

export interface CircuitBreakerStatus {
  agentIdentity: string;
  state: "CLOSED" | "OPEN" | "QUARANTINED";
  failureCount: number;
  lastFailureTime?: string;
  quarantinedAt?: string;
  quarantineReason?: string;
}

export interface CustomerAccount {
  id: string;
  name: string;
  email: string;
  balance: number;
  currency: string;
  status: "active" | "suspended" | "closed";
  createdAt: string;
  accountNumber?: string;
  routingNumber?: string;
  accountType?: "checking" | "savings" | "investment";
  tier?: string;
  dailyLimit?: number;
  creditScore?: number;
}

export interface Transaction {
  id: string;
  accountId: string;
  type: "credit" | "debit" | "refund";
  amount: number;
  currency: string;
  memo: string;
  merchantName?: string;
  timestamp: string;
  status: "completed" | "pending" | "refunded" | "disputed";
  riskScore?: number;
  category?: string;
  channel?: "online" | "in-store" | "wire" | "atm";
  location?: string;
  taintMarkers?: string[];
}

export interface ToolActivity {
  toolName: string;
  args: Record<string, unknown>;
  output: unknown;
  isError?: boolean;
  securityDecision?: {
    decision: string;
    reason?: string;
    policyId?: string;
    correlationId: string;
    riskScore: number;
    taintMarkers?: string[];
    evaluationTimeMs?: number;
  };
}

export interface PendingRefund {
  confirmationId: string;
  transactionId: string;
  accountId: string;
  amount: number;
  currency: string;
  reason: string;
  createdAt: string;
  expiresAt: string;
  status: "PENDING" | "CONFIRMED" | "REJECTED" | "EXPIRED";
  executionResult?: unknown;
}

export interface ComplianceControl {
  id: string;
  description: string;
  enforcementMechanism: string;
  status: "COMPLIANT" | "NON_COMPLIANT" | "NOT_TESTED";
}

export interface ComplianceStandard {
  name: string;
  code: string;
  status: "COMPLIANT" | "NON_COMPLIANT";
  controls: ComplianceControl[];
}

export interface ComplianceReport {
  reportId: string;
  generatedAt: string;
  chainIntegrity: boolean;
  rootHash: string;
  totalEventsVerified: number;
  standards: ComplianceStandard[];
}

export interface FinanceStatus {
  configured: boolean;
  model: string;
  clientReady: boolean;
  message?: string;
  proxyReady: boolean;
  quarantined: boolean;
  availableTools: string[];
}

export interface FinanceChatResponse {
  success: boolean;
  response: string;
  sessionId: string;
  toolActivities: ToolActivity[];
  pendingRefund: PendingRefund | null;
  error?: string;
}

export interface SimulationResult {
  scenarioId: string;
  description: string;
  success: boolean;
  decision?: string;
  event?: AuditEvent;
  approval?: ApprovalRequest;
  circuitBreaker?: CircuitBreakerStatus;
  error?: string;
  raw?: unknown;
}
