// ============================================================
// ByteShield — 100 Adversarial Security Scenarios Manifest
// Authoritative Catalogue & Integrity Validation
// ============================================================

import type { SecurityScenario, ScenarioCategory, CategoryMetadata, ScenarioManifest } from "./types"
import { cat01Scenarios } from "./cat01_direct_prompt_injection"
import { cat02Scenarios } from "./cat02_indirect_prompt_injection"
import { cat03Scenarios } from "./cat03_sensitive_disclosure"
import { cat04Scenarios } from "./cat04_unauthorized_tool_use"
import { cat05Scenarios } from "./cat05_multi_turn_escalation"
import { cat06Scenarios } from "./cat06_encoding_variation"
import { cat07Scenarios } from "./cat07_mcp_metadata_poisoning"
import { cat08Scenarios } from "./cat08_identity_policy_bypass"
import { cat09Scenarios } from "./cat09_data_exfiltration"
import { cat10Scenarios } from "./cat10_session_workflow_integrity"

export const CATEGORIES_METADATA: CategoryMetadata[] = [
  {
    id: "CAT01_DIRECT_PROMPT_INJECTION",
    name: "Direct Prompt Injection",
    description: "Evaluates resistance to system prompt overrides, persona swaps, and conflicting natural-language directives.",
    count: 10,
  },
  {
    id: "CAT02_INDIRECT_PROMPT_INJECTION",
    name: "Indirect Prompt Injection",
    description: "Evaluates untrusted instructions embedded in retrieved docs, search snippets, memos, emails, and tickets.",
    count: 10,
  },
  {
    id: "CAT03_SENSITIVE_INFO_DISCLOSURE",
    name: "Sensitive Info & Instruction Disclosure",
    description: "Tests protection of synthetic system canaries, API keys, credentials, customer SSNs, and cross-session data.",
    count: 10,
  },
  {
    id: "CAT04_UNAUTHORIZED_TOOL_USE",
    name: "Unauthorized Tool Use",
    description: "Evaluates prevention of prohibited tools, cross-account mutations, threshold limits, and HITL approval bypasses.",
    count: 10,
  },
  {
    id: "CAT05_MULTI_TURN_ESCALATION",
    name: "Multi-Turn Escalation",
    description: "Tests gradual privilege creep, denial fatigue resistance, stale context reuse, and mid-dialogue account pivots.",
    count: 10,
  },
  {
    id: "CAT06_ENCODING_REPRESENTATION",
    name: "Encoding & Representation Variation",
    description: "Evaluates resistance to Unicode homoglyphs, polyglot prompts, XML tags, Base64 strings, and zero-width characters.",
    count: 10,
  },
  {
    id: "CAT07_MCP_METADATA_POISONING",
    name: "MCP Tool & Metadata Poisoning",
    description: "Evaluates poisoned tool descriptions, hijacked tool outputs, shadow tools, and argument schema discordance.",
    count: 10,
  },
  {
    id: "CAT08_IDENTITY_POLICY_BYPASS",
    name: "Identity, Policy & Approval Bypass",
    description: "Tests rejection of forged SPIFFE identities, expired JWTs, missing capabilities, and Cedar default-deny behavior.",
    count: 10,
  },
  {
    id: "CAT09_DATA_EXFILTRATION_CONTROL",
    name: "Data Flow & Exfiltration Control",
    description: "Evaluates containment of canary secrets, egress firewalls, bulk database exports, and chunked response DLP.",
    count: 10,
  },
  {
    id: "CAT10_SESSION_WORKFLOW_INTEGRITY",
    name: "Session, Memory & Workflow Integrity",
    description: "Tests memory poisoning defense, cross-session isolation, post-revocation blocks, and audit synchronization.",
    count: 10,
  },
]

export const ALL_SCENARIOS: SecurityScenario[] = [
  ...cat01Scenarios,
  ...cat02Scenarios,
  ...cat03Scenarios,
  ...cat04Scenarios,
  ...cat05Scenarios,
  ...cat06Scenarios,
  ...cat07Scenarios,
  ...cat08Scenarios,
  ...cat09Scenarios,
  ...cat10Scenarios,
]

/**
 * Validates that the scenario catalogue meets all strict engineering criteria:
 * 1. Exactly 100 total scenarios.
 * 2. Exactly 100 unique scenario IDs.
 * 3. Exactly 10 categories with 10 scenarios in each category.
 * 4. All required fields are present and non-empty.
 */
export function validateScenarioCatalogue(): {
  valid: boolean
  totalCount: number
  uniqueIdCount: number
  categoryCounts: Record<string, number>
  errors: string[]
} {
  const errors: string[] = []
  const ids = new Set<string>()
  const categoryCounts: Record<string, number> = {}

  for (const cat of CATEGORIES_METADATA) {
    categoryCounts[cat.id] = 0
  }

  for (const s of ALL_SCENARIOS) {
    // ID uniqueness
    if (ids.has(s.id)) {
      errors.push(`Duplicate scenario ID detected: ${s.id}`)
    }
    ids.add(s.id)

    // Category count
    if (categoryCounts[s.category] !== undefined) {
      categoryCounts[s.category]++
    } else {
      errors.push(`Scenario ${s.id} has unrecognized category: ${s.category}`)
    }

    // Required fields check
    if (!s.id) errors.push(`Scenario missing id`)
    if (!s.name) errors.push(`Scenario ${s.id} missing name`)
    if (!s.description) errors.push(`Scenario ${s.id} missing description`)
    if (!s.threatModel) errors.push(`Scenario ${s.id} missing threatModel`)
    if (!s.syntheticInput) errors.push(`Scenario ${s.id} missing syntheticInput`)
    if (!s.expectedModelBehavior) errors.push(`Scenario ${s.id} missing expectedModelBehavior`)
    if (!s.expectedPolicyOutcome) errors.push(`Scenario ${s.id} missing expectedPolicyOutcome`)
    if (!s.expectedToolOutcome) errors.push(`Scenario ${s.id} missing expectedToolOutcome`)
    if (!s.detectionCriteria) errors.push(`Scenario ${s.id} missing detectionCriteria`)
    if (!s.failureCriteria) errors.push(`Scenario ${s.id} missing failureCriteria`)
    if (!s.severity) errors.push(`Scenario ${s.id} missing severity`)
    if (!s.evaluationVersion) errors.push(`Scenario ${s.id} missing evaluationVersion`)
    if (!s.initialContext || !s.initialContext.agentIdentity) {
      errors.push(`Scenario ${s.id} missing initialContext.agentIdentity`)
    }
  }

  // Verify total count
  if (ALL_SCENARIOS.length !== 100) {
    errors.push(`Expected exactly 100 scenarios, found ${ALL_SCENARIOS.length}`)
  }

  // Verify exactly 10 per category
  for (const [cat, count] of Object.entries(categoryCounts)) {
    if (count !== 10) {
      errors.push(`Category ${cat} has ${count} scenarios, expected exactly 10`)
    }
  }

  return {
    valid: errors.length === 0,
    totalCount: ALL_SCENARIOS.length,
    uniqueIdCount: ids.size,
    categoryCounts,
    errors,
  }
}

const validation = validateScenarioCatalogue()

export const SCENARIO_MANIFEST: ScenarioManifest = {
  version: "1.0.0",
  totalScenarios: ALL_SCENARIOS.length,
  expectedCategoriesCount: 10,
  scenariosPerCategory: 10,
  generatedAt: new Date().toISOString(),
  categories: CATEGORIES_METADATA,
  scenarioIds: ALL_SCENARIOS.map((s) => s.id),
  validationStatus: validation.valid ? "VALID" : "INVALID",
  validationErrors: validation.errors.length ? validation.errors : undefined,
}

export function getScenarioById(id: string): SecurityScenario | undefined {
  return ALL_SCENARIOS.find((s) => s.id === id)
}

export function getScenariosByCategory(category: ScenarioCategory): SecurityScenario[] {
  return ALL_SCENARIOS.filter((s) => s.category === category)
}
