import { motion } from "motion/react"
import { Icon, Logo, Button } from "./Common"
import { pageVariants, flowEasing } from "../motion/variants"

interface ConsoleGatewayProps {
  onNavigate?: (path: string) => void
}

export function ConsoleGateway({ onNavigate }: ConsoleGatewayProps) {
  const handleNavigate = (path: string, e: React.MouseEvent) => {
    e.preventDefault()
    if (onNavigate) {
      onNavigate(path)
    } else {
      window.history.pushState({}, "", path)
      window.dispatchEvent(new PopStateEvent("popstate"))
    }
  }

  return (
    <motion.main
      className="console-gateway"
      variants={pageVariants}
      initial="initial"
      animate="animate"
      exit="exit"
    >
      <div className="gateway-grid" />
      <Logo onNavigate={onNavigate} />

      <motion.div
        className="gateway-card"
        initial={{ opacity: 0, scale: 0.95, y: 16 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.1, ease: flowEasing }}
      >
        <span className="eyebrow">
          <i />
          CONSOLE DESTINATION
        </span>

        <motion.div
          className="gateway-shield"
          animate={{
            scale: [1, 1.05, 1],
            filter: [
              "drop-shadow(0 0 10px rgba(101,231,245,.2))",
              "drop-shadow(0 0 25px rgba(101,231,245,.4))",
              "drop-shadow(0 0 10px rgba(101,231,245,.2))",
            ],
          }}
          transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
        >
          <Icon name="shield" size={54} />
          <Icon name="lock" size={24} />
        </motion.div>

        <h1>Security Console</h1>
        <p>
          This route is reserved as the stable gateway to the MCP Sentinel
          application dashboard. The current deliverable focuses on the public
          landing experience.
        </p>

        <div className="button-row">
          <Button href="/" onClick={(e) => handleNavigate("/", e)}>
            Return to landing page
          </Button>
          <Button
            variant="secondary"
            href="/#preview"
            onClick={(e) => handleNavigate("/#preview", e)}
          >
            View product preview
          </Button>
        </div>
      </motion.div>
    </motion.main>
  )
}
