import { useRef } from "react"
import { motion } from "motion/react"
import { Icon, Button } from "./Common"
import { HeroShield } from "./HeroShield"
import { CinematicTitle } from "../motion/MotionComponents"
import { fadeUpVariants, flowEasing } from "../motion/variants"

interface HeroProps {
  onNavigate?: (path: string) => void
}

export function Hero({ onNavigate }: HeroProps) {
  const heroRef = useRef<HTMLElement>(null)

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
    <section className="hero" id="top" ref={heroRef}>
      <div className="hero-grid" />
      <motion.div
        className="hero-glow"
        animate={{
          opacity: [0.75, 1, 0.75],
          scale: [1, 1.04, 1],
        }}
        transition={{ duration: 7, repeat: Infinity, ease: "easeInOut" }}
      />

      <div className="hero-copy">
        <motion.span
          className="eyebrow"
          initial={{ opacity: 0, x: -14 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.6, ease: flowEasing }}
        >
          <motion.i
            animate={{ scale: [1, 1.3, 1], opacity: [0.8, 1, 0.8] }}
            transition={{ duration: 2, repeat: Infinity }}
          />
          AI AGENT RUNTIME SECURITY
        </motion.span>

        <div style={{ margin: "24px 0 22px" }}>
          <CinematicTitle
            lines={[
              "Let AI Move Fast.",
              <>
                Make Every Action <span>Earn Trust.</span>
              </>,
            ]}
          />
        </div>

        <motion.p
          variants={fadeUpVariants}
          initial="hidden"
          animate="visible"
          transition={{ duration: 0.6, delay: 0.2, ease: flowEasing }}
        >
          MCP Sentinel adds a security layer between AI agents and the tools
          they use. Inspect requests, evaluate permissions, gate sensitive
          actions, and maintain a traceable security record.
        </motion.p>

        <motion.div
          className="button-row"
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.35, ease: flowEasing }}
        >
          <Button href="/console" onClick={handleConsoleClick}>
            Enter Security Console <Icon name="arrow" size={16} />
          </Button>
          <Button variant="secondary" href="#architecture">
            Explore the Architecture
          </Button>
        </motion.div>

        <motion.small
          className="supporting"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.5 }}
        >
          <i /> PROTOTYPE ENVIRONMENT{" "}
          <span>Built for secure, tool-connected AI workflows.</span>
        </motion.small>
      </div>

      <HeroShield />

      <motion.div
        className="hero-foot"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.8, delay: 0.6 }}
      >
        <span>SCROLL TO EXPLORE</span>
        <i />
        <div>
          <b>IDENTITY</b>
          <b>POLICY</b>
          <b>APPROVAL</b>
          <b>AUDIT</b>
        </div>
      </motion.div>
    </section>
  )
}
