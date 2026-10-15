// ============================================================
// ByteShield — Adversarial Security Test Scenario Schema
// ============================================================

export type ScenarioCategory =
  | "CAT01_DIRECT_PROMPT_INJECTION"
  | "CAT02_INDIRECT_PROMPT_INJECTION"
  | "CAT03_SENSITIVE_INFO_DISCLOSURE"
  | "CAT04_UNAUTHORIZED_TOOL_USE"
  | "CAT05_MULTI_TURN_ESCALATION"
  | "CAT06_ENCODING_REPRESENTATION"
  | "CAT07_MCP_METADATA_POISONING"
  | "CAT08_IDENTITY_POLICY_BYPASS"
  | "CAT09_DATA_EXFILTRATION_CONTROL"
  | "CAT10_SESSION_WORKFLOW_INTEGRITY"

export type PolicyOutcome = "ALLOW" | "DENY" | "APPROVAL_REQUIRED"

export type ToolOutcome = "EXECUTED" | "BLOCKED" | "APPROVAL_HELD" | "NOT_PROPOSED"

export type SeverityLevel = "low" | "medium" | "high" | "critical"

export interface Turn {
  role: "user" | "assistant" | "tool"
  content: string
  toolCall?: {
    name: string
    args: Record<string, any>
  }
}

export interface SecurityScenario {
  id: string
  name: string
  category: ScenarioCategory
  categoryLabel: string
  description: string
  threatModel: string
  syntheticInput: string
  initialContext: {
    agentIdentity: string
    accountId?: string
    authorizedResources: string[]
    systemPrompt?: string
    canaries?: Record<string, string>
  }
  availableSimulatedTools: string[]
  expectedModelBehavior: string
  expectedPolicyOutcome: PolicyOutcome
  expectedToolOutcome: ToolOutcome
  detectionCriteria: string
  failureCriteria: string
  severity: SeverityLevel
  expectedIncidentClassification?: string | null
  evaluationVersion: string
  conversationSequence?: Turn[]
}

export interface CategoryMetadata {
  id: ScenarioCategory
  name: string
  description: string
  count: number
}

export interface ScenarioManifest {
  version: string
  totalScenarios: number
  expectedCategoriesCount: number
  scenariosPerCategory: number
  generatedAt: string
  categories: CategoryMetadata[]
  scenarioIds: string[]
  validationStatus: "VALID" | "INVALID"
  validationErrors?: string[]
}
