import { useState } from "react"
import { motion, AnimatePresence } from "motion/react"
import { Icon, SectionHeading } from "./Common"
import { AnimatedSection } from "../motion/MotionComponents"
import { flowEasing } from "../motion/variants"

export function Problem() {
  const [verified, setVerified] = useState(true)

  return (
    <AnimatedSection className="section problem-section">
      <SectionHeading
        eyebrow="THE CONTROL GAP / 02"
        title={
          <>
            AI Autonomy Needs More Than <span>Instructions.</span>
          </>
        }
      />

      <div className="comparison">
        <div className="comparison-top">
          <div className="segmented" style={{ position: "relative" }}>
            <button
              className={!verified ? "active" : ""}
              onClick={() => setVerified(false)}
              type="button"
              style={{ position: "relative", zIndex: 2 }}
            >
              Broad trust
              {!verified && (
                <motion.span
                  layoutId="segmented-pill"
                  className="segmented-active-bg"
                  transition={{ type: "spring", stiffness: 350, damping: 28 }}
                />
              )}
            </button>
            <button
              className={verified ? "active" : ""}
              onClick={() => setVerified(true)}
              type="button"
              style={{ position: "relative", zIndex: 2 }}
            >
              Verified actions
              {verified && (
                <motion.span
                  layoutId="segmented-pill"
                  className="segmented-active-bg"
                  transition={{ type: "spring", stiffness: 350, damping: 28 }}
                />
              )}
            </button>
          </div>
          <span>Conceptual comparison</span>
        </div>

        <div className={`comparison-canvas ${verified ? "verified" : "broad"}`}>
          <motion.div
            className="compare-node"
            whileHover={{ scale: 1.04 }}
            transition={{ type: "spring", stiffness: 300, damping: 20 }}
          >
            <Icon name="agent" />
            <span>AI Agent</span>
            <small>Proposes action</small>
          </motion.div>

          <div className="request-path">
            <i />
            <b>{verified ? "INSPECTED" : "DIRECT ACCESS"}</b>
            {verified && (
              <>
                <span className="control-dot c1" />
                <span className="control-dot c2" />
                <span className="control-dot c3" />
              </>
            )}
          </div>

          <AnimatePresence>
            {verified && (
              <motion.div
                className="sentinel-gate"
                initial={{ opacity: 0, scale: 0.85 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.85 }}
                transition={{ duration: 0.35, ease: flowEasing }}
              >
                <Icon name="shield" />
                <span>MCP SENTINEL</span>
                <small>Identity · Policy · Approval</small>
              </motion.div>
            )}
          </AnimatePresence>

          <motion.div
            className="compare-node protected"
            whileHover={{ scale: 1.04 }}
            transition={{ type: "spring", stiffness: 300, damping: 20 }}
          >
            <Icon name="database" />
            <span>Protected tool</span>
            <small>{verified ? "Policy enforced" : "Broadly reachable"}</small>
          </motion.div>
        </div>

        <div className="comparison-copy">
          <AnimatePresence mode="wait">
            <motion.span
              key={verified ? "safe" : "risk"}
              className={verified ? "state-safe" : "state-risk"}
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -5 }}
              transition={{ duration: 0.2 }}
            >
              {verified ? "CONTROLLED PATH" : "INSUFFICIENT BOUNDARY"}
            </motion.span>
          </AnimatePresence>

          <AnimatePresence mode="wait">
            <motion.p
              key={verified ? "safe-text" : "risk-text"}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.25 }}
            >
              {verified
                ? "MCP Sentinel inspects the proposal, evaluates applicable policy, and stops execution when conditions are not satisfied."
                : "This model illustrates the risk of a request moving toward a protected resource without enough independent authorization checks—not every conventional deployment."}
            </motion.p>
          </AnimatePresence>
        </div>
      </div>

      <motion.blockquote
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.7, delay: 0.2, ease: flowEasing }}
      >
        “Instructions guide the model.{" "}
        <strong>Enforced controls govern what the system can execute.</strong>”
      </motion.blockquote>
    </AnimatedSection>
  )
}
