import { useState } from "react"
import { motion, AnimatePresence } from "motion/react"
import { Icon, SectionHeading, Button, type IconName } from "./Common"
import { AnimatedSection, AnimatedCounter } from "../motion/MotionComponents"
import { flowEasing } from "../motion/variants"

export const previews = [
  "Overview",
  "Finance",
  "Monitor",
  "Attack Lab",
  "Audit",
]

interface ProductPreviewProps {
  onNavigate?: (path: string) => void
}

export function ProductPreview({ onNavigate }: ProductPreviewProps) {
  const [active, setActive] = useState(0)

  const handleConsoleClick = (e: React.MouseEvent) => {
    e.preventDefault()
    if (onNavigate) {
      onNavigate("/console")
    } else {
      window.history.pushState({}, "", "/console")
      window.dispatchEvent(new PopStateEvent("popstate"))
    }
  }

  const metricRequests = ["1,284", "24", "86", "12", "1,284"][active]
  const metricDecisions = ["98.7%", "ALLOW", "LIVE", "3", "VERIFIED"][active]

  return (
    <AnimatedSection className="section preview-section" id="preview">
      <SectionHeading
        eyebrow="PRODUCT PORTFOLIO / 07"
        title={
          <>
            From Authorization Decisions to <span>Operational Visibility.</span>
          </>
        }
        body="A preview of the MCP Sentinel workspace using simulated data."
        center
      />

      <div
        className="preview-tabs"
        role="tablist"
        style={{ position: "relative" }}
      >
        {previews.map((tab, i) => {
          const isActive = active === i
          return (
            <button
              role="tab"
              aria-selected={isActive}
              className={isActive ? "active" : ""}
              onClick={() => setActive(i)}
              key={tab}
              type="button"
              style={{ position: "relative", zIndex: 2 }}
            >
              {tab}
              {isActive && (
                <motion.span
                  layoutId="preview-tab-active"
                  className="preview-tab-active-bg"
                  transition={{ type: "spring", stiffness: 350, damping: 28 }}
                />
              )}
            </button>
          )
        })}
      </div>

      <motion.div
        className="product-frame"
        initial={{ opacity: 0, y: 30 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.8, ease: flowEasing }}
      >
        <div className="product-sidebar">
          <div className="mini-logo">
            <span />
            <b>MS</b>
          </div>
          {previews.map((tab, i) => {
            const iconNames: IconName[] = [
              "grid",
              "spark",
              "eye",
              "scan",
              "audit",
            ]
            return (
              <i
                className={i === active ? "active" : ""}
                key={tab}
                role="button"
                tabIndex={0}
                style={{ cursor: "pointer" }}
                onClick={() => setActive(i)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault()
                    setActive(i)
                  }
                }}
                title={tab}
                aria-label={tab}
              >
                <Icon name={iconNames[i]} />
              </i>
            )
          })}
        </div>

        <div className="product-main">
          <div className="product-top">
            <div>
              <small>MCP SENTINEL / {previews[active].toUpperCase()}</small>
              <b>{previews[active]} workspace</b>
            </div>
            <span>
              <motion.i
                animate={{ opacity: [0.6, 1, 0.6] }}
                transition={{ duration: 1.8, repeat: Infinity }}
              />
              SIMULATED DATA
            </span>
          </div>

          <AnimatePresence mode="wait">
            <motion.div
              key={`metrics-${active}`}
              className="metrics"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.25 }}
            >
              <div>
                <span>Requests inspected</span>
                <b>
                  <AnimatedCounter value={metricRequests} />
                </b>
                <small>Demo session</small>
              </div>

              <div>
                <span>Policy decisions</span>
                <b>
                  {metricDecisions.match(/[0-9]/) ? (
                    <AnimatedCounter value={metricDecisions} />
                  ) : (
                    metricDecisions
                  )}
                </b>
                <small>Conceptual status</small>
              </div>

              <div>
                <span>Median decision</span>
                <b>
                  <AnimatedCounter value="18ms" />
                </b>
                <small>Sample metric</small>
              </div>
            </motion.div>
          </AnimatePresence>

          <div className="product-grid">
            <div className="activity-panel">
              <div className="panel-head">
                <b>
                  {active === 3
                    ? "Attack scenarios"
                    : active === 4
                      ? "Audit chain"
                      : "Decision activity"}
                </b>
                <span>LIVE PREVIEW</span>
              </div>

              <AnimatePresence mode="wait">
                <motion.div
                  key={`events-${active}`}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.25 }}
                >
                  {[
                    "account.read",
                    "refund.issue",
                    "transaction.inspect",
                    "ledger.verify",
                  ].map((event, i) => (
                    <motion.div
                      className="event-row"
                      key={event}
                      initial={{ opacity: 0, x: -6 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.05 }}
                    >
                      <span
                        className={
                          i === 1 ? "deny-dot" : i === 2 ? "warn-dot" : ""
                        }
                      />
                      <code>{event}</code>
                      <small>agent_fin_{4821 + i}</small>
                      <b
                        className={
                          i === 1
                            ? "denied-text"
                            : i === 2
                              ? "warning-text"
                              : ""
                        }
                      >
                        {i === 1 ? "DENIED" : i === 2 ? "FLAGGED" : "ALLOWED"}
                      </b>
                    </motion.div>
                  ))}
                </motion.div>
              </AnimatePresence>
            </div>

            <div className="risk-panel">
              <div className="panel-head">
                <b>Authorization graph</b>
                <span>LOCAL</span>
              </div>

              <div className="mini-graph">
                <i className="g1">A</i>
                <motion.i
                  className="g2"
                  animate={{
                    boxShadow: [
                      "0 0 14px rgba(101,231,245,.15)",
                      "0 0 28px rgba(101,231,245,.35)",
                      "0 0 14px rgba(101,231,245,.15)",
                    ],
                  }}
                  transition={{ duration: 2.5, repeat: Infinity }}
                >
                  <Icon name="shield" size={17} />
                </motion.i>
                <i className="g3">T</i>
                <span />
              </div>

              <div className="decision-box">
                <Icon name="check" />
                <div>
                  <small>LATEST DECISION</small>
                  <b>Policy satisfied</b>
                </div>
              </div>
            </div>
          </div>
        </div>
      </motion.div>

      <div className="preview-cta">
        <Button href="/console" onClick={handleConsoleClick}>
          Enter Security Console <Icon name="arrow" />
        </Button>
        <small>Gateway to the product workspace</small>
      </div>
    </AnimatedSection>
  )
}
