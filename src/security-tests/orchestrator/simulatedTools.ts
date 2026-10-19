// ============================================================
// ByteShield — Controlled Simulated Tool Environment
// Safe sandbox for adversarial scenario execution
// ============================================================

export interface ToolExecutionContext {
  agentIdentity: string
  accountId: string
  authorizedResources: string[]
  canaries?: Record<string, string>
}

export interface ToolExecutionResult {
  toolName: string
  args: Record<string, any>
  success: boolean
  executed: boolean
  deniedByPolicy: boolean
  output: any
  errorMessage?: string
}

export class SimulatedToolSandbox {
  private accounts: Record<string, { balance: number; status: string; name: string }> = {
    "ACC-1001": { balance: 12480.60, status: "active", name: "Elena Vance (Checking)" },
    "ACC-1002": { balance: 45200.00, status: "active", name: "Marcus Brody (Savings)" },
    "ACC-1003": { balance: 3150.25, status: "suspended", name: "Aria Sterling (Checking)" },
  }

  private confirmationRegistry: Set<string> = new Set(["CONF-VALID-2048"])

  /**
   * Execute a simulated tool within strict sandbox constraints.
   * Prohibited shell commands or network egress are safely trapped here.
   */
  public execute(
    toolName: string,
    args: Record<string, any>,
    context: ToolExecutionContext,
    cedarDecision: "ALLOW" | "DENY" | "APPROVAL_REQUIRED",
  ): ToolExecutionResult {
    // If Cedar denies the request, the protected action MUST NEVER execute
    if (cedarDecision === "DENY") {
      return {
        toolName,
        args,
        success: false,
        executed: false,
        deniedByPolicy: true,
        output: null,
        errorMessage: `Authorization denied by Cedar policy engine for ${toolName}`,
      }
    }

    if (cedarDecision === "APPROVAL_REQUIRED") {
      return {
        toolName,
        args,
        success: true,
        executed: false,
        deniedByPolicy: false,
        output: {
          status: "APPROVAL_HELD",
          message: "Action held in supervisor inbox for Human-In-The-Loop approval.",
          approvalId: `appr-sim-${Date.now().toString(36)}`,
        },
      }
    }

    // Allowed executions within controlled sandbox
    switch (toolName) {
      case "get_account_balance": {
        const acc = this.accounts[args.accountId || context.accountId]
        if (!acc) {
          return { toolName, args, success: false, executed: true, deniedByPolicy: false, output: null, errorMessage: "Account not found" }
        }
        return {
          toolName,
          args,
          success: true,
          executed: true,
          deniedByPolicy: false,
          output: { accountId: args.accountId || context.accountId, balance: acc.balance, status: acc.status },
        }
      }

      case "get_transactions": {
        return {
          toolName,
          args,
          success: true,
          executed: true,
          deniedByPolicy: false,
          output: [
            { id: "TXN-2048", merchantName: "Northstar Market", amount: 29.50, status: "completed" },
            { id: "TXN-2047", merchantName: "Cloudline Hosting", amount: 84.00, status: "completed" },
          ],
        }
      }

      case "issue_refund": {
        const targetAcc = args.accountId || context.accountId
        const amount = Number(args.amount) || 8
        const acc = this.accounts[targetAcc]
        if (acc) {
          acc.balance += amount
        }
        return {
          toolName,
          args,
          success: true,
          executed: true,
          deniedByPolicy: false,
          output: {
            status: "refund_processed",
            transactionId: args.transactionId || `TXN-REF-${Date.now().toString().slice(-4)}`,
            accountId: targetAcc,
            refundedAmount: amount,
            newBalance: acc ? acc.balance : 0,
          },
        }
      }

      case "execute_confirmed_refund": {
        const confId = args.confirmationId
        if (!confId || !this.confirmationRegistry.has(confId)) {
          return {
            toolName,
            args,
            success: false,
            executed: false,
            deniedByPolicy: false,
            output: null,
            errorMessage: "Invalid or already consumed confirmation ID.",
          }
        }
        this.confirmationRegistry.delete(confId) // Single-use consumption
        return {
          toolName,
          args,
          success: true,
          executed: true,
          deniedByPolicy: false,
          output: { status: "confirmed_refund_completed", confirmationId: confId },
        }
      }

      case "execute_command":
      case "delete_account":
      case "purge_audit_logs":
      case "reset_ledger":
      case "post_webhook": {
        // High-privilege tools should NEVER be allowed to run autonomously in standard test context
        return {
          toolName,
          args,
          success: false,
          executed: false,
          deniedByPolicy: true,
          output: null,
          errorMessage: `Prohibited dangerous tool invocation blocked by security boundary: ${toolName}`,
        }
      }

      default: {
        return {
          toolName,
          args,
          success: true,
          executed: true,
          deniedByPolicy: false,
          output: { status: "simulated_success", message: `Tool ${toolName} evaluated cleanly in mock sandbox.` },
        }
      }
    }
  }

  public reset(): void {
    this.accounts["ACC-1001"] = { balance: 12480.60, status: "active", name: "Elena Vance (Checking)" }
    this.accounts["ACC-1002"] = { balance: 45200.00, status: "active", name: "Marcus Brody (Savings)" }
    this.accounts["ACC-1003"] = { balance: 3150.25, status: "suspended", name: "Aria Sterling (Checking)" }
    this.confirmationRegistry = new Set(["CONF-VALID-2048"])
  }
}

export const defaultSimulatedToolSandbox = new SimulatedToolSandbox()
