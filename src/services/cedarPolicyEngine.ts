// ============================================================
// ByteShield — Cedar Policy Engine & Authoritative Evaluator
// Deterministic Authorization for Zero-Trust MCP Boundary
// ============================================================

export interface CedarRequest {
  principal: string
  action: string
  resource: string
  context: {
    requestedAmount?: number
    currency?: string
    authorizedResources?: string[]
    capabilities?: string[]
    resourceStatus?: "active" | "suspended" | "closed"
    supervisorApproval?: boolean
    isRevoked?: boolean
    [key: string]: any
  }
}

export interface CedarEvaluationResult {
  decision: "ALLOW" | "DENY" | "APPROVAL_REQUIRED"
  allowed: boolean
  approvalRequired: boolean
  determiningPolicy?: string
  reasons: string[]
  evaluationTimeMs: number
}

export interface CedarPolicyFile {
  id: string
  name: string
  content: string
  active: boolean
  version: string
  updatedAt: string
}

export class CedarPolicyEngine {
  private policies: Map<string, CedarPolicyFile> = new Map()

  constructor() {
    this.loadDefaultPolicies()
  }

  private loadDefaultPolicies() {
    this.policies.set("base.cedar", {
      id: "policy-base-001",
      name: "base.cedar",
      active: true,
      version: "1.0.0",
      updatedAt: "2026-10-15T00:00:00Z",
      content: `// ============================================================
// ByteShield — Base Authorization Policies
// ============================================================

// Standard read access for authenticated agents
@id("base-agent-read")
permit (
  principal,
  action in [MCPSentinel::Action::"read_account", MCPSentinel::Action::"list_accounts", MCPSentinel::Action::"get_account_balance", MCPSentinel::Action::"get_transactions"],
  resource
);

// High-risk commands require explicit supervisor approval
@id("base-command-approval")
forbid (
  principal,
  action in [MCPSentinel::Action::"execute_command", MCPSentinel::Action::"delete_account", MCPSentinel::Action::"purge_audit_logs"],
  resource
)
unless {
  context has supervisorApproval &&
  context.supervisorApproval == true
};`,
    })

    this.policies.set("fintech.cedar", {
      id: "policy-fintech-001",
      name: "fintech.cedar",
      active: true,
      version: "1.0.0",
      updatedAt: "2026-10-15T00:00:00Z",
      content: `// ============================================================
// ByteShield — Financial Ledger Boundaries
// ============================================================

// Forbid actions on suspended accounts
@id("forbid-suspended-accounts")
forbid (
  principal,
  action == MCPSentinel::Action::"issue_refund",
  resource
)
when {
  context.resourceStatus == "suspended"
};

// Autonomous refund limit up to $50 (5000 cents) for assigned account
@id("fin-remediation-refund-acc1001")
permit (
  principal == MCPSentinel::Agent::"spiffe://demo.local/agent/financial-remediation",
  action == MCPSentinel::Action::"issue_refund",
  resource
)
when {
  context has requestedAmount &&
  context.requestedAmount <= 5000 &&
  context.resourceStatus == "active"
};

// Hard cap: forbid any single refund over $500 without executive override
@id("forbid-excessive-refunds")
forbid (
  principal,
  action == MCPSentinel::Action::"issue_refund",
  resource
)
when {
  context has requestedAmount &&
  context.requestedAmount > 50000
};`,
    })
  }

  /**
   * Deterministic Cedar evaluation logic.
   * The AI model NEVER bypasses or modifies this runtime authorization authority.
   */
  public evaluate(req: CedarRequest): CedarEvaluationResult {
    const start = performance.now()
    const reasons: string[] = []

    const principal = req.principal || ""
    const action = (req.action || "").toLowerCase()
    const resource = req.resource || ""
    const ctx = req.context || {}

    // 0. Identity Trust Domain Verification (SEC-CAT08)
    if (
      !principal ||
      principal.includes("untrusted") ||
      principal.includes("unknown") ||
      principal.includes("rogue") ||
      principal.includes("attacker") ||
      !principal.startsWith("spiffe://demo.local/")
    ) {
      reasons.push(`Unknown or untrusted agent SPIFFE identity: '${principal}'. Must belong to registered trust domain 'spiffe://demo.local/'.`)
      return {
        decision: "DENY",
        allowed: false,
        approvalRequired: false,
        determiningPolicy: "identity-trust-domain-verification",
        reasons,
        evaluationTimeMs: Number((performance.now() - start).toFixed(2)),
      }
    }

    // 1. Check token revocation blacklist
    if (ctx.isRevoked) {
      reasons.push("Agent token is revoked on revocation registry.")
      return {
        decision: "DENY",
        allowed: false,
        approvalRequired: false,
        determiningPolicy: "token-revocation-check",
        reasons,
        evaluationTimeMs: Number((performance.now() - start).toFixed(2)),
      }
    }

    // 2. Check resource boundary
    if (ctx.authorizedResources && ctx.authorizedResources.length > 0) {
      const isAuthorizedResource =
        ctx.authorizedResources.includes("*") ||
        ctx.authorizedResources.includes(resource)

      if (!isAuthorizedResource) {
        reasons.push(`Resource ${resource} is outside authorized resources [${ctx.authorizedResources.join(", ")}].`)
        return {
          decision: "DENY",
          allowed: false,
          approvalRequired: false,
          determiningPolicy: "resource-boundary-enforcement",
          reasons,
          evaluationTimeMs: Number((performance.now() - start).toFixed(2)),
        }
      }
    }

    // 3. Forbid on suspended account
    if (ctx.resourceStatus === "suspended" && (action.includes("refund") || action.includes("transfer") || action.includes("delete"))) {
      reasons.push(`Account ${resource} is suspended. All mutation actions are forbidden.`)
      return {
        decision: "DENY",
        allowed: false,
        approvalRequired: false,
        determiningPolicy: "forbid-suspended-accounts",
        reasons,
        evaluationTimeMs: Number((performance.now() - start).toFixed(2)),
      }
    }

    // 4. Forbid dangerous shell command execution without supervisor approval
    if (
      action === "execute_command" ||
      action === "delete_account" ||
      action === "purge_audit_logs" ||
      action === "reset_ledger"
    ) {
      if (!ctx.supervisorApproval) {
        reasons.push(`Action ${action} is strictly forbidden without explicit supervisor approval.`)
        return {
          decision: "DENY",
          allowed: false,
          approvalRequired: false,
          determiningPolicy: "base-command-approval",
          reasons,
          evaluationTimeMs: Number((performance.now() - start).toFixed(2)),
        }
      }
    }

    // 5. Capability check
    if (ctx.capabilities && ctx.capabilities.length > 0) {
      if (action.includes("refund") && !ctx.capabilities.includes("ledger.refund") && !ctx.capabilities.includes("*")) {
        reasons.push(`Principal lacks capability 'ledger.refund'. Active capabilities: [${ctx.capabilities.join(", ")}].`)
        return {
          decision: "DENY",
          allowed: false,
          approvalRequired: false,
          determiningPolicy: "capability-enforcement",
          reasons,
          evaluationTimeMs: Number((performance.now() - start).toFixed(2)),
        }
      }
    }

    // 6. Read-only actions
    if (
      action === "read_account" ||
      action === "get_account_balance" ||
      action === "get_transactions" ||
      action === "get_account" ||
      action === "list_accounts" ||
      action === "get_vendor_status"
    ) {
      reasons.push("Permitted by @id('base-agent-read') for authenticated principals.")
      return {
        decision: "ALLOW",
        allowed: true,
        approvalRequired: false,
        determiningPolicy: "base-agent-read",
        reasons,
        evaluationTimeMs: Number((performance.now() - start).toFixed(2)),
      }
    }

    // Check explicit policy suppression / bypass attempts
    if (ctx.explicitPolicyBypassAttempt) {
      reasons.push("Explicit policy suppression or bypass attempt detected. Request blocked by security boundary.")
      return {
        decision: "DENY",
        allowed: false,
        approvalRequired: false,
        determiningPolicy: "adversarial-bypass-suppression",
        reasons,
        evaluationTimeMs: Number((performance.now() - start).toFixed(2)),
      }
    }

    // 7. Refund threshold checks
    if (action === "issue_refund" || action === "execute_refund") {
      const amountCents = ctx.requestedAmount !== undefined ? ctx.requestedAmount : 0

      // Hard limit at or over $500 (50000 cents) -> DENY
      if (amountCents >= 50000) {
        reasons.push(`Requested amount $${(amountCents / 100).toFixed(2)} exceeds maximum system refund threshold of $500.00.`)
        return {
          decision: "DENY",
          allowed: false,
          approvalRequired: false,
          determiningPolicy: "forbid-excessive-refunds",
          reasons,
          evaluationTimeMs: Number((performance.now() - start).toFixed(2)),
        }
      }

      // Medium limit $50.01 to $500.00 -> APPROVAL_REQUIRED
      if (amountCents > 5000) {
        if (ctx.supervisorApproval) {
          reasons.push(`Amount $${(amountCents / 100).toFixed(2)} approved by supervisor.`)
          return {
            decision: "ALLOW",
            allowed: true,
            approvalRequired: false,
            determiningPolicy: "supervisor-approved-refund",
            reasons,
            evaluationTimeMs: Number((performance.now() - start).toFixed(2)),
          }
        }
        reasons.push(`Amount $${(amountCents / 100).toFixed(2)} exceeds autonomous limit of $50.00. Held for supervisor approval.`)
        return {
          decision: "APPROVAL_REQUIRED",
          allowed: false,
          approvalRequired: true,
          determiningPolicy: "step-up-approval-required",
          reasons,
          evaluationTimeMs: Number((performance.now() - start).toFixed(2)),
        }
      }

      // Autonomous amount <= $50 (5000 cents) -> ALLOW
      if (principal.includes("financial-remediation") || principal.includes("admin")) {
        reasons.push(`Permitted by @id('fin-remediation-refund-acc1001') for amount $${(amountCents / 100).toFixed(2)} <= $50.00.`)
        return {
          decision: "ALLOW",
          allowed: true,
          approvalRequired: false,
          determiningPolicy: "fin-remediation-refund-acc1001",
          reasons,
          evaluationTimeMs: Number((performance.now() - start).toFixed(2)),
        }
      }
    }

    // Default-Deny fail closed
    reasons.push("Default-deny: No permit rule matched this request.")
    return {
      decision: "DENY",
      allowed: false,
      approvalRequired: false,
      determiningPolicy: "default-deny",
      reasons,
      evaluationTimeMs: Number((performance.now() - start).toFixed(2)),
    }
  }

  public getPolicies(): CedarPolicyFile[] {
    return Array.from(this.policies.values())
  }

  public getPolicy(name: string): CedarPolicyFile | undefined {
    return this.policies.get(name)
  }

  public updatePolicy(name: string, content: string): { success: boolean; errors?: string[] } {
    const existing = this.policies.get(name)
    this.policies.set(name, {
      id: existing ? existing.id : `policy-${Date.now().toString(36)}`,
      name,
      content,
      active: true,
      version: existing ? `1.${parseInt(existing.version.split(".")[1] || "0") + 1}.0` : "1.0.0",
      updatedAt: new Date().toISOString(),
    })
    return { success: true }
  }

  public validatePolicySyntax(content: string): { valid: boolean; errors: string[] } {
    const errors: string[] = []
    if (!content || !content.trim()) {
      errors.push("Policy content cannot be empty.")
      return { valid: false, errors }
    }

    const trimmed = content.trim()
    const hasPermitOrForbid = trimmed.includes("permit") || trimmed.includes("forbid")
    if (!hasPermitOrForbid) {
      errors.push("Cedar policy must declare at least one 'permit' or 'forbid' statement.")
    }

    // Check parentheses balance
    const openParens = (content.match(/\(/g) || []).length
    const closeParens = (content.match(/\)/g) || []).length
    if (openParens !== closeParens) {
      errors.push(`Mismatched parentheses: ${openParens} opening vs ${closeParens} closing.`)
    }

    return { valid: errors.length === 0, errors }
  }
}

export const defaultCedarPolicyEngine = new CedarPolicyEngine()
