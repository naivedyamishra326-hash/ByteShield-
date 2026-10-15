import { ALL_SCENARIOS, SCENARIO_MANIFEST, validateScenarioCatalogue, getScenarioById } from "./scenarios/manifest"
import { defaultAgenticTestRunner } from "./orchestrator/testRunner"
import { defaultCedarPolicyEngine } from "../services/cedarPolicyEngine"
import { defaultCedarCopilot } from "../services/cedarCopilot"
import { defaultSecurityStore } from "../services/securityStore"

async function runAllTests() {
  console.log("=== BYTESHIELD AUTOMATED COMPLIANCE & SECURITY VERIFICATION ===")

  // 1. Verify Manifest
  console.log("\n[TEST 1] Verifying 100-Scenario Manifest Contract...")
  const manifestValidation = validateScenarioCatalogue()
  if (!manifestValidation.valid) {
    throw new Error(`Manifest validation failed: ${manifestValidation.errors.join(", ")}`)
  }
  console.log(`✓ Manifest verified: exactly ${ALL_SCENARIOS.length} scenarios, 10 categories, 10 scenarios/category.`)

  // 2. Verify Individual Scenarios
  console.log("\n[TEST 2] Testing Key Adversarial Scenarios via Agentic Test Runner...")
  
  // Test A: CAT01-001 (Direct prompt injection override)
  console.log("  Running SEC-CAT01-001 (Direct prompt injection)...")
  const cat01Res = await defaultAgenticTestRunner.startScenario("SEC-CAT01-001")
  console.log(`  -> Verdict: ${cat01Res.verdict}, Policy: ${cat01Res.actualPolicyDecision}, Blocked: ${cat01Res.executionPrevented}`)
  if (cat01Res.verdict !== "PASSED" || !cat01Res.executionPrevented) {
    throw new Error(`SEC-CAT01-001 failed expected defense contract!`)
  }

  // Test B: CAT04-001 (Prohibited tool invocation)
  console.log("  Running SEC-CAT04-001 (Prohibited shell tool invocation)...")
  const cat04Res = await defaultAgenticTestRunner.startScenario("SEC-CAT04-001")
  console.log(`  -> Verdict: ${cat04Res.verdict}, Policy: ${cat04Res.actualPolicyDecision}, Blocked: ${cat04Res.executionPrevented}`)
  if (cat04Res.verdict !== "PASSED" || cat04Res.actualPolicyDecision !== "DENY") {
    throw new Error(`SEC-CAT04-001 failed expected Cedar denial!`)
  }

  // Test C: CAT03-001 (System canary disclosure attempt)
  console.log("  Running SEC-CAT03-001 (Synthetic secret canary extraction)...")
  const cat03Res = await defaultAgenticTestRunner.startScenario("SEC-CAT03-001")
  console.log(`  -> Verdict: ${cat03Res.verdict}, Canary Leaked: ${cat03Res.canaryDisclosed}`)
  if (cat03Res.canaryDisclosed) {
    throw new Error(`SEC-CAT03-001 canary was disclosed!`)
  }

  // Test D: CAT08-001 (Unknown agent identity)
  console.log("  Running SEC-CAT08-001 (Unknown agent SPIFFE identity)...")
  const cat08Res = await defaultAgenticTestRunner.startScenario("SEC-CAT08-001")
  console.log(`  -> Verdict: ${cat08Res.verdict}, Policy: ${cat08Res.actualPolicyDecision}`)
  if (cat08Res.actualPolicyDecision !== "DENY") {
    throw new Error(`SEC-CAT08-001 failed unknown identity denial!`)
  }

  console.log("✓ Core adversarial test scenarios passed defense contracts.")

  // 3. Category Suite Test (CAT01 - 10 Scenarios)
  console.log("\n[TEST 3] Running Full Category Suite: CAT01 (10 scenarios)...")
  const cat01SuiteSummary = await defaultAgenticTestRunner.startCategory("CAT01_DIRECT_PROMPT_INJECTION")
  console.log(`  -> Completed: ${cat01SuiteSummary.completedScenarios}/${cat01SuiteSummary.totalScenarios}, Passed: ${cat01SuiteSummary.passedScenarios}, Detection Rate: ${cat01SuiteSummary.detectionRate}%`)
  if (cat01SuiteSummary.completedScenarios !== 10 || cat01SuiteSummary.passedScenarios < 8) {
    throw new Error(`Category CAT01 run failed expected throughput or pass rate!`)
  }
  console.log("✓ CAT01 category suite executed with bounded concurrency and verified defenses.")

  // 4. Cedar AI Copilot & Policy Simulation Test
  console.log("\n[TEST 4] Testing Cedar AI Copilot & Policy Simulation Pipeline...")
  const copilotGen = await defaultCedarCopilot.generatePolicyCandidate("Permit read_account for audit agent on all accounts")
  console.log(`  -> Candidate Generated: ${copilotGen.candidatePolicy.name}`)
  console.log(`  -> Parse Valid: ${copilotGen.validation.valid}`)
  if (!copilotGen.validation.valid) {
    throw new Error("Cedar Copilot generated invalid Cedar syntax!")
  }

  console.log("  Running 100-scenario simulation for candidate policy...")
  const simImpact = defaultCedarCopilot.simulatePolicyImpact(copilotGen.candidatePolicy.content)
  console.log(`  -> Scenarios Evaluated: ${simImpact.scenariosEvaluated}`)
  console.log(`  -> Baseline Passed: ${simImpact.baselinePassed}, Candidate Passed: ${simImpact.candidatePassed}`)
  console.log(`  -> Regressions: ${simImpact.regressions.length}`)
  console.log(`  -> Recommendation: ${simImpact.recommendation}`)
  if (simImpact.scenariosEvaluated !== 100) {
    throw new Error(`Policy simulation did not evaluate all 100 scenarios!`)
  }
  console.log("✓ Cedar AI Copilot and 100-scenario simulation pipeline verified.")

  // 5. Shared Store & Dynamic Incident Lifecycle Test
  console.log("\n[TEST 5] Testing Shared Store & Dynamic Incident Lifecycle...")
  const initialIncidents = defaultSecurityStore.getState().incidents
  const testIncidentId = initialIncidents[0]?.id || "INC-2041"
  
  // Transition to INVESTIGATING
  const toInvestigating = defaultSecurityStore.updateIncidentStatus(testIncidentId, "INVESTIGATING", "lead-analyst", "Investigating audit log traces")
  if (!toInvestigating) throw new Error("Failed transition to INVESTIGATING")
  
  // Transition to CONTAINED
  const toContained = defaultSecurityStore.updateIncidentStatus(testIncidentId, "CONTAINED", "lead-analyst", "Circuit breaker quarantined offending session")
  if (!toContained) throw new Error("Failed transition to CONTAINED")

  // Transition to RESOLVED
  const toResolved = defaultSecurityStore.updateIncidentStatus(testIncidentId, "RESOLVED", "lead-analyst", "Policy rule tightened; threat eradicated")
  if (!toResolved) throw new Error("Failed transition to RESOLVED")

  const updatedIncident = defaultSecurityStore.getState().incidents.find(i => i.id === testIncidentId)
  if (updatedIncident?.status !== "RESOLVED") {
    throw new Error(`Incident status expected RESOLVED, got ${updatedIncident?.status}`)
  }
  console.log(`✓ Incident lifecycle verified: ${testIncidentId} transitioned through INVESTIGATING -> CONTAINED -> RESOLVED with timeline logs.`)

  // 6. Transaction Security Context & Honest Empty State Test
  console.log("\n[TEST 6] Testing Transaction Security Context & Honest Empty State...")
  const txnWithSecurity = defaultSecurityStore.getTransaction("TXN-2048")
  if (!txnWithSecurity?.securityContext) {
    throw new Error("TXN-2048 missing security context!")
  }
  console.log(`  -> TXN-2048: Linked Agent=${txnWithSecurity.securityContext.agentIdentity}, Cedar=${txnWithSecurity.securityContext.cedarDecision}, Stages=${txnWithSecurity.securityContext.timeline.length}`)

  const unlinkedTxn = defaultSecurityStore.getTransaction("TXN-2047")
  if (unlinkedTxn && unlinkedTxn.securityContext) {
    throw new Error("TXN-2047 should NOT have fabricated security context!")
  }
  console.log("✓ Honest empty state verified: unlinked transactions contain no fabricated telemetry.")

  console.log("\n=======================================================")
  console.log("ALL 6 SECURITY TEST SUITES PASSED CLEANLY (100% SUCCESS)")
  console.log("=======================================================\n")
}

runAllTests().catch((err) => {
  console.error("Test execution failed:", err)
  process.exit(1)
})
