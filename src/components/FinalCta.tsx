import { motion, useReducedMotion } from "motion/react"
import { Icon, Button } from "./Common"
import { flowEasing } from "../motion/variants"

interface FinalCtaProps {
  onNavigate?: (path: string) => void
}

export function FinalCta({ onNavigate }: FinalCtaProps) {
  const prefersReduced = useReducedMotion()

  const handleConsoleClick = (e: React.MouseEvent) => {
    e.preventDefault()
    if (onNavigate) {
      onNavigate("/console")
    } else {
      window.history.pushState({}, "", "/console")
      window.dispatchEvent(new PopStateEvent("popstate"))
    }
  }

  return (
    <section className="final-cta">
      {/* Dynamic ambient orbits */}
      <motion.div
        className="final-orbit orbit-one"
        animate={
          prefersReduced
            ? undefined
            : {
                rotate: [12, 16, 12],
                scale: [1, 1.03, 1],
              }
        }
        transition={{ duration: 12, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        className="final-orbit orbit-two"
        animate={
          prefersReduced
            ? undefined
            : {
                rotate: [-12, -16, -12],
                scale: [1, 1.04, 1],
              }
        }
        transition={{ duration: 14, repeat: Infinity, ease: "easeInOut" }}
      />

      {/* Floating background shield glyph */}
      <motion.div
        className="final-shield"
        animate={
          prefersReduced
            ? undefined
            : {
                y: [0, -10, 0],
                opacity: [0.06, 0.1, 0.06],
              }
        }
        transition={{ duration: 7, repeat: Infinity, ease: "easeInOut" }}
      >
        <Icon name="shield" size={110} />
        <span />
      </motion.div>

      <motion.span
        className="eyebrow"
        initial={{ opacity: 0, y: 10 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.5 }}
      >
        <i />
        THE AUTHORITY TO VERIFY
      </motion.span>

      <motion.h2
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.7, delay: 0.1, ease: flowEasing }}
      >
        Give AI the Freedom to Act.
        <br />
        <span>Keep the Authority to Verify.</span>
      </motion.h2>

      <motion.p
        initial={{ opacity: 0, y: 16 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.7, delay: 0.2, ease: flowEasing }}
      >
        Explore how runtime identity, authorization policies, approval
        workflows, and auditability can help make tool-connected AI systems
        safer to operate.
      </motion.p>

      <motion.div
        className="button-row"
        initial={{ opacity: 0, y: 14 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.5, delay: 0.3 }}
      >
        <Button href="/console" onClick={handleConsoleClick}>
          Enter MCP Sentinel <Icon name="arrow" />
        </Button>
        <Button variant="secondary" href="#architecture">
          Explore the Architecture
        </Button>
      </motion.div>
    </section>
  )
}
