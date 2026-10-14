import { motion } from "motion/react"
import { Icon, SectionHeading } from "./Common"
import { AnimatedSection } from "../motion/MotionComponents"
import { flowEasing } from "../motion/variants"

export function Philosophy() {
  const principles = [
    "Least privilege",
    "Explicit authorization",
    "Human oversight",
    "Observable decisions",
    "Evidence-based testing",
    "Reasoning / execution separation",
  ]

  return (
    <AnimatedSection className="section philosophy" id="about">
      <div>
        <SectionHeading
          eyebrow="PROJECT PHILOSOPHY / 08"
          title={
            <>
              Built to Explore a <span>Hard Problem.</span>
            </>
          }
        />
        <p className="philosophy-lead">
          MCP Sentinel is an engineering project focused on a practical
          question: how can tool-connected AI systems remain useful while their
          authority stays independently governed?
        </p>
        <motion.div
          className="disclaimer"
          whileHover={{ x: 2 }}
          transition={{ duration: 0.2 }}
        >
          <Icon name="scan" />
          <p>
            <b>Prototype scope</b>The fintech ledger and operational data shown
            here are simulated. Production use would require additional threat
            modeling, security validation, and operational controls.
          </p>
        </motion.div>
      </div>

      <div className="principles">
        {principles.map((p, i) => (
          <motion.div
            key={p}
            initial={{ opacity: 0, x: 12 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.08 * i, duration: 0.4, ease: flowEasing }}
            whileHover={{ x: 6 }}
          >
            <span>0{i + 1}</span>
            <b>{p}</b>
            <Icon name="arrow" />
          </motion.div>
        ))}
      </div>
    </AnimatedSection>
  )
}
