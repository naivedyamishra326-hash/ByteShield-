import { useState } from "react"
import { motion, AnimatePresence } from "motion/react"
import { Icon, SectionHeading, type IconName } from "./Common"
import { AnimatedSection } from "../motion/MotionComponents"
import { flowEasing } from "../motion/variants"

export const pipeline = [
  {
    icon: "spark" as IconName,
    title: "AI Request",
    text: "Gemini proposes an action using an available tool.",
    detail:
      "The model forms a structured tool request. At this point, it is only a proposal—not permission to execute.",
  },
  {
    icon: "fingerprint" as IconName,
    title: "Identity",
    text: "Validate agent identity and relevant credentials.",
    detail:
      "The security layer resolves who is acting, the scope of delegation, and the credentials attached to the request.",
  },
  {
    icon: "policy" as IconName,
    title: "Policy Check",
    text: "Cedar evaluates whether the action is authorized.",
    detail:
      "Policy considers the principal, requested action, protected resource, and contextual attributes independently of model reasoning.",
  },
  {
    icon: "user" as IconName,
    title: "Approval Gate",
    text: "Sensitive actions may require explicit approval.",
    detail:
      "Configured operations pause for a human decision. Approval is a separate control, not an instruction sent back to the model.",
  },
  {
    icon: "lock" as IconName,
    title: "Protected Execution",
    text: "Authorized actions reach the protected tool.",
    detail:
      "The outcome can be inspected and linked to a traceable audit record before returning to the agent.",
  },
]

export function Pipeline() {
  const [active, setActive] = useState(0)

  return (
    <AnimatedSection className="section pipeline-section" id="pipeline">
      <SectionHeading
        eyebrow="SECURITY PIPELINE / 01"
        title={
          <>
            Every Tool Call Has a <span>Security Boundary.</span>
          </>
        }
        body="See how a proposed AI action moves through the MCP Sentinel security pipeline."
      />

      <div className="pipeline">
        <div className="pipeline-track">
          <motion.div
            style={{ height: "100%" }}
            initial={{ width: 0 }}
            animate={{ width: `${active * 25}%` }}
            transition={{ type: "spring", stiffness: 220, damping: 25 }}
          />
        </div>

        {pipeline.map((step, i) => {
          const isActive = i === active
          const isComplete = i < active

          return (
            <motion.button
              className={`pipeline-step ${isActive ? "active" : ""} ${
                isComplete ? "complete" : ""
              }`}
              key={step.title}
              onClick={() => setActive(i)}
              type="button"
              whileHover={{ y: -3 }}
              whileTap={{ scale: 0.98 }}
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.08, duration: 0.5, ease: flowEasing }}
            >
              <motion.span
                className="step-number"
                animate={isActive ? { scale: [1, 1.08, 1] } : { scale: 1 }}
                transition={{ duration: 0.4 }}
              >
                {isComplete ? <Icon name="check" size={16} /> : `0${i + 1}`}
              </motion.span>
              <span className="step-icon">
                <Icon name={step.icon} />
              </span>
              <b>{step.title}</b>
              <small>{step.text}</small>
            </motion.button>
          )
        })}
      </div>

      <div className="pipeline-detail">
        <AnimatePresence mode="wait">
          <motion.div
            key={active}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 10 }}
            transition={{ duration: 0.25 }}
          >
            <span>SELECTED STAGE / 0{active + 1}</span>
            <h3>{pipeline[active].title}</h3>
          </motion.div>
        </AnimatePresence>

        <AnimatePresence mode="wait">
          <motion.p
            key={active}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.25, delay: 0.05 }}
          >
            {pipeline[active].detail}
          </motion.p>
        </AnimatePresence>

        <motion.button
          type="button"
          onClick={() => setActive(0)}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
          Reset flow <span style={{ display: "inline-block" }}>↺</span>
        </motion.button>
      </div>
    </AnimatedSection>
  )
}
