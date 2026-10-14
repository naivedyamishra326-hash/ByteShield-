import { useState, useEffect } from "react"
import { motion, AnimatePresence } from "motion/react"
import { Icon, SectionHeading } from "./Common"
import { AnimatedSection } from "../motion/MotionComponents"
import { flowEasing } from "../motion/variants"

export const architecture = [
  {
    name: "User / React UI",
    status: "Implemented",
    x: 7,
    y: 41,
    group: "Experience",
    input: "User intent",
    output: "Structured request",
    responsibility: "Makes actions and decisions visible.",
  },
  {
    name: "Gemini AI Agent",
    status: "Implemented",
    x: 25,
    y: 41,
    group: "Agent",
    input: "User request",
    output: "Tool proposal",
    responsibility: "Reasons about intent; does not grant authority.",
  },
  {
    name: "Security Proxy",
    status: "Implemented",
    x: 43,
    y: 41,
    group: "Sentinel",
    input: "Tool proposal",
    output: "Security decision",
    responsibility: "Orchestrates independent runtime controls.",
  },
  {
    name: "Agent Identity",
    status: "Partial",
    x: 43,
    y: 12,
    group: "Sentinel",
    input: "Credentials",
    output: "Principal context",
    responsibility: "Resolves the acting identity and delegation.",
  },
  {
    name: "Cedar Engine",
    status: "Implemented",
    x: 43,
    y: 70,
    group: "Sentinel",
    input: "Decision context",
    output: "Allow / deny",
    responsibility: "Evaluates configured authorization policy.",
  },
  {
    name: "Approval Gate",
    status: "Implemented",
    x: 62,
    y: 12,
    group: "Control",
    input: "Sensitive request",
    output: "Human decision",
    responsibility: "Pauses configured operations for review.",
  },
  {
    name: "Finance MCP",
    status: "Implemented",
    x: 62,
    y: 41,
    group: "Tool",
    input: "Authorized call",
    output: "Tool response",
    responsibility: "Exposes local demo finance tools.",
  },
  {
    name: "Simulated Ledger",
    status: "Implemented",
    x: 81,
    y: 41,
    group: "Data",
    input: "Finance operation",
    output: "Sample records",
    responsibility: "Stores simulated financial data only.",
  },
  {
    name: "Response Inspection",
    status: "Partial",
    x: 62,
    y: 70,
    group: "Control",
    input: "Tool response",
    output: "Inspected response",
    responsibility: "Flags supported unsafe or sensitive content.",
  },
  {
    name: "Hash-Chained Audit",
    status: "Implemented",
    x: 81,
    y: 70,
    group: "Evidence",
    input: "Security event",
    output: "Linked record",
    responsibility: "Records decisions for later verification.",
  },
]

type FlowState = "allowed" | "denied" | "pending"

export function Architecture() {
  const [selected, setSelected] = useState(2)
  const [zoom, setZoom] = useState(1)
  const [linear, setLinear] = useState(false)
  const [simulating, setSimulating] = useState(true)
  const [flowState, setFlowState] = useState<FlowState>("allowed")
  const [activeStep, setActiveStep] = useState(0)

  // Flow simulation sequence
  // 0: AI Agent -> 1: Proxy -> 2: Identity & Cedar -> 3: Approval / Tool -> 4: Audit
  useEffect(() => {
    if (!simulating) return
    const interval = setInterval(() => {
      setActiveStep((prev) => (prev + 1) % 5)
    }, 2200)
    return () => clearInterval(interval)
  }, [simulating])

  const flowColors = {
    allowed: "var(--cyan)",
    denied: "var(--red)",
    pending: "var(--amber)",
  }

  return (
    <AnimatedSection className="section architecture-section" id="architecture">
      <SectionHeading
        eyebrow="SYSTEM MAP / 04"
        title={
          <>
            A Clear Path Between AI and the <span>Tools It Controls.</span>
          </>
        }
        body="A conceptual view of the application boundaries. Nodes describe responsibilities, not separate microservices."
      />

      <div className="architecture-shell">
        <div className="architecture-toolbar">
          <span>
            <i /> ARCHITECTURE EXPLORER
          </span>

          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            {/* Flow State Selector */}
            <div
              className="segmented flow-selector"
              style={{ display: "inline-flex", padding: "2px" }}
            >
              <button
                type="button"
                className={flowState === "allowed" ? "active" : ""}
                onClick={() => setFlowState("allowed")}
                title="Simulate allowed flow"
                style={{
                  padding: "6px 10px",
                  fontSize: "9px",
                  color: flowState === "allowed" ? "var(--green)" : undefined,
                }}
              >
                ● Allowed
              </button>
              <button
                type="button"
                className={flowState === "denied" ? "active" : ""}
                onClick={() => setFlowState("denied")}
                title="Simulate denied flow"
                style={{
                  padding: "6px 10px",
                  fontSize: "9px",
                  color: flowState === "denied" ? "var(--red)" : undefined,
                }}
              >
                ● Denied
              </button>
              <button
                type="button"
                className={flowState === "pending" ? "active" : ""}
                onClick={() => setFlowState("pending")}
                title="Simulate approval gate flow"
                style={{
                  padding: "6px 10px",
                  fontSize: "9px",
                  color: flowState === "pending" ? "var(--amber)" : undefined,
                }}
              >
                ● Pending
              </button>
            </div>

            <button
              type="button"
              onClick={() => setSimulating(!simulating)}
              title="Toggle flow signal animation"
            >
              {simulating ? "Pause Signal" : "Play Signal"}
            </button>
            <button type="button" onClick={() => setLinear(!linear)}>
              {linear ? "Graph view" : "Linear view"}
            </button>
            <button
              type="button"
              onClick={() => setZoom(Math.max(0.8, zoom - 0.1))}
              aria-label="Zoom out"
            >
              <Icon name="zoomOut" />
            </button>
            <button
              type="button"
              onClick={() => setZoom(Math.min(1.2, zoom + 0.1))}
              aria-label="Zoom in"
            >
              <Icon name="zoomIn" />
            </button>
            <button type="button" onClick={() => setZoom(1)}>
              Reset
            </button>
          </div>
        </div>

        <div className="architecture-content">
          <div
            className={`architecture-map ${linear ? "linear" : ""}`}
            tabIndex={0}
            aria-label="Architecture graph; use linear view for a text alternative"
          >
            {!linear && (
              <svg
                className="connectors"
                viewBox="0 0 100 100"
                preserveAspectRatio="none"
                aria-hidden="true"
              >
                {/* Base connection lines */}
                <path d="M13 46H25M31 46H43M49 46H62M68 46H81M46 41V24M46 51v19M65 41V24M65 51v19M68 75H81" />

                {/* Animated flowing signal beam */}
                {simulating && (
                  <motion.path
                    d={
                      flowState === "denied"
                        ? "M13 46H25M31 46H43M46 41V24M46 51v19"
                        : flowState === "pending"
                          ? "M13 46H25M31 46H43M46 41V24M65 41V24"
                          : "M13 46H25M31 46H43M49 46H62M68 46H81M46 41V24M46 51v19M65 41V24M65 51v19M68 75H81"
                    }
                    fill="none"
                    stroke={flowColors[flowState]}
                    strokeWidth="0.4"
                    strokeDasharray="1.5 3"
                    initial={{ strokeDashoffset: 0 }}
                    animate={{ strokeDashoffset: -20 }}
                    transition={{
                      duration: 4,
                      repeat: Infinity,
                      ease: "linear",
                    }}
                    style={{
                      filter: `drop-shadow(0 0 4px ${flowColors[flowState]})`,
                    }}
                  />
                )}
              </svg>
            )}

            <div
              className="map-inner"
              style={{
                transform: `scale(${zoom})`,
                transition: "transform 0.25s ease",
              }}
            >
              {architecture.map((node, i) => {
                const isSelected = selected === i

                return (
                  <motion.button
                    key={node.name}
                    type="button"
                    className={`architecture-node ${
                      isSelected ? "active" : ""
                    }`}
                    style={
                      linear
                        ? undefined
                        : { left: `${node.x}%`, top: `${node.y}%` }
                    }
                    onClick={() => setSelected(i)}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.96 }}
                    animate={
                      isSelected
                        ? {
                            borderColor: "var(--cyan)",
                            boxShadow:
                              "0 0 30px rgba(101,231,245,.2), inset 0 1px rgba(255,255,255,.08)",
                          }
                        : {}
                    }
                  >
                    <span>
                      <Icon
                        name={
                          i === 2
                            ? "shield"
                            : i === 7
                              ? "database"
                              : i === 4
                                ? "policy"
                                : "grid"
                        }
                      />
                    </span>
                    <b>{node.name}</b>
                    <small>{node.group}</small>
                  </motion.button>
                )
              })}
            </div>
          </div>

          <aside className="node-detail">
            <AnimatePresence mode="wait">
              <motion.div
                key={selected}
                initial={{ opacity: 0, x: 12 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -12 }}
                transition={{ duration: 0.25, ease: flowEasing }}
              >
                <div className="node-detail-head">
                  <span>SELECTED COMPONENT</span>
                  <b
                    className={
                      architecture[selected].status === "Partial"
                        ? "partial"
                        : ""
                    }
                  >
                    {architecture[selected].status}
                  </b>
                </div>

                <div className="detail-icon">
                  <Icon name="shield" size={28} />
                </div>

                <h3>{architecture[selected].name}</h3>
                <p>{architecture[selected].responsibility}</p>

                <dl>
                  <div>
                    <dt>Input</dt>
                    <dd>{architecture[selected].input}</dd>
                  </div>
                  <div>
                    <dt>Output</dt>
                    <dd>{architecture[selected].output}</dd>
                  </div>
                  <div>
                    <dt>Security role</dt>
                    <dd>{architecture[selected].group}</dd>
                  </div>
                </dl>
              </motion.div>
            </AnimatePresence>
          </aside>
        </div>
      </div>
    </AnimatedSection>
  )
}
