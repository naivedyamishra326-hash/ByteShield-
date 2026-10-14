import { useState } from "react"
import { motion, AnimatePresence } from "motion/react"
import { Icon, SectionHeading, type IconName } from "./Common"
import { AnimatedSection, LiquidGlassCard } from "../motion/MotionComponents"
import { flowEasing } from "../motion/variants"

export const capabilities = [
  {
    icon: "policy" as IconName,
    title: "Continuous Authorization",
    text: "Evaluate each relevant tool action against applicable access policies.",
    detail:
      "Decision context can include the acting identity, resource, action, and request attributes.",
  },
  {
    icon: "fingerprint" as IconName,
    title: "Agent Identity",
    text: "Represent identity with verifiable credentials and controlled delegation.",
    detail:
      "Identity is kept explicit so policy can reason about who or what proposed an action.",
  },
  {
    icon: "user" as IconName,
    title: "Human-in-the-Loop",
    text: "Pause configured sensitive operations until required approval is provided.",
    detail:
      "High-impact actions can be queued for an explicit, attributable decision.",
  },
  {
    icon: "scan" as IconName,
    title: "Injection Awareness",
    text: "Inspect untrusted requests and responses for suspicious instructions.",
    detail:
      "Content signals can trigger flags or quarantine without replacing authorization controls.",
  },
  {
    icon: "eye" as IconName,
    title: "Data Protection",
    text: "Detect and redact supported sensitive data in applicable responses.",
    detail:
      "Response inspection is positioned after execution and before content returns to the agent.",
  },
  {
    icon: "audit" as IconName,
    title: "Tamper-Evident Audit",
    text: "Link audit records with cryptographic hashes to expose modification.",
    detail:
      "Hash chaining helps make unexpected record changes detectable during verification.",
  },
]

export function Capabilities() {
  const [active, setActive] = useState<number | null>(null)

  return (
    <AnimatedSection className="section" id="capabilities">
      <SectionHeading
        eyebrow="CORE CAPABILITIES / 03"
        title={
          <>
            Security That Lives in the <span>Execution Path.</span>
          </>
        }
        body="Composable runtime controls designed to separate model intent from system authority."
      />

      <div className="bento">
        {capabilities.map((cap, i) => {
          const isActive = active === i

          return (
            <LiquidGlassCard
              className={`capability-card cap-${i + 1} ${
                isActive ? "active" : ""
              }`}
              key={cap.title}
              onClick={() => setActive(isActive ? null : i)}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.08, duration: 0.5, ease: flowEasing }}
              whileHover={{ y: -4 }}
            >
              <div className="cap-icon">
                <Icon name={cap.icon} />
              </div>
              <span className="cap-index">0{i + 1}</span>
              <h3>{cap.title}</h3>
              <p>{cap.text}</p>

              <button
                type="button"
                aria-expanded={isActive}
                onClick={(e) => {
                  e.stopPropagation()
                  setActive(isActive ? null : i)
                }}
              >
                {isActive ? "Close details" : "View details"}{" "}
                <motion.span
                  animate={{ x: isActive ? 2 : 0 }}
                  transition={{ duration: 0.2 }}
                  style={{ display: "inline-flex" }}
                >
                  <Icon name="arrow" size={15} />
                </motion.span>
              </button>

              <AnimatePresence>
                {isActive && (
                  <motion.div
                    className="cap-detail"
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 15 }}
                    transition={{ duration: 0.25, ease: flowEasing }}
                  >
                    <p>{cap.detail}</p>
                    <a
                      href="#architecture"
                      onClick={(e) => e.stopPropagation()}
                    >
                      Locate in architecture <Icon name="arrow" size={14} />
                    </a>
                  </motion.div>
                )}
              </AnimatePresence>
            </LiquidGlassCard>
          )
        })}
      </div>
    </AnimatedSection>
  )
}
