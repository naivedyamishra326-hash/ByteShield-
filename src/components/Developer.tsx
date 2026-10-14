import { useState, useRef } from "react"
import { motion } from "motion/react"
import { Icon, SectionHeading, Button } from "./Common"
import { AnimatedSection } from "../motion/MotionComponents"
import { flowEasing } from "../motion/variants"

export function Developer() {
  const [copied, setCopied] = useState(false)
  const codeWindowRef = useRef<HTMLDivElement>(null)
  const activePointer = useRef<number | null>(null)

  const copy = async () => {
    try {
      await navigator.clipboard?.writeText(
        'permit (\n  principal in Agent::"finance_assistant",\n  action == Action::"read_account",\n  resource in Account::"demo"\n)\nwhen {\n  context.identity_verified == true\n};',
      )
    } catch {
      // Fallback
    }
    setCopied(true)
    window.setTimeout(() => setCopied(false), 1800)
  }

  const rockCodeWindow = (clientX: number, clientY: number) => {
    const card = codeWindowRef.current
    if (!card || window.matchMedia("(prefers-reduced-motion: reduce)").matches)
      return
    const bounds = card.getBoundingClientRect()
    const x = (clientX - bounds.left) / bounds.width - 0.5
    const y = (clientY - bounds.top) / bounds.height - 0.5
    card.style.setProperty("--code-rock-x", `${(-y * 7).toFixed(2)}deg`)
    card.style.setProperty("--code-rock-y", `${(x * 9).toFixed(2)}deg`)
    card.style.setProperty("--code-light-x", `${((x + 0.5) * 100).toFixed(1)}%`)
    card.style.setProperty("--code-light-y", `${((y + 0.5) * 100).toFixed(1)}%`)
  }

  const resetCodeWindow = () => {
    const card = codeWindowRef.current
    if (!card) return
    activePointer.current = null
    card.classList.remove("is-rocking")
    card.style.setProperty("--code-rock-x", "0deg")
    card.style.setProperty("--code-rock-y", "0deg")
    card.style.setProperty("--code-light-x", "50%")
    card.style.setProperty("--code-light-y", "35%")
  }

  const chips = [
    "MCP tool integration",
    "Cedar policies",
    "Signed identity",
    "Gemini tool calling",
    "Runtime monitoring",
    "Audit verification",
    "Security testing",
  ]

  return (
    <AnimatedSection className="section developer-section">
      <div className="developer-copy">
        <SectionHeading
          eyebrow="BUILDER EXPERIENCE / 06"
          title={
            <>
              Designed for the People <span>Building AI Systems.</span>
            </>
          }
          body="Make security decisions inspectable without obscuring the agent and tool workflow."
        />

        <div className="dev-chips">
          {chips.map((chip, i) => (
            <motion.span
              key={chip}
              initial={{ opacity: 0, y: 10 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.1 + i * 0.05, duration: 0.4 }}
              whileHover={{ y: -2, borderColor: "var(--line-bright)" }}
            >
              <Icon name={i % 2 ? "code" : "check"} size={14} />
              {chip}
            </motion.span>
          ))}
        </div>

        <div className="button-row">
          <Button href="#architecture">Explore architecture</Button>
          <Button variant="secondary" href="#preview">
            View the demo
          </Button>
        </div>
      </div>

      <div
        className="code-window"
        ref={codeWindowRef}
        onPointerDown={(event) => {
          if (event.pointerType === "mouse" && event.button !== 0) return
          activePointer.current = event.pointerId
          codeWindowRef.current?.classList.add("is-rocking")
          rockCodeWindow(event.clientX, event.clientY)
        }}
        onPointerMove={(event) => {
          if (activePointer.current === event.pointerId)
            rockCodeWindow(event.clientX, event.clientY)
        }}
        onPointerUp={resetCodeWindow}
        onPointerCancel={resetCodeWindow}
        onPointerLeave={(event) => {
          if (event.pointerType === "mouse") resetCodeWindow()
        }}
      >
        <div className="code-title">
          <span>
            <i />
            <i />
            <i />
          </span>
          <b>conceptual-policy.cedar</b>
          <motion.button
            type="button"
            onClick={copy}
            whileTap={{ scale: 0.92 }}
          >
            <Icon name={copied ? "check" : "copy"} />
            {copied ? "Copied" : "Copy"}
          </motion.button>
        </div>

        <pre>
          <code>
            <span className="purple">permit</span> (<br />
            {"  "}principal <span className="blue">in</span> Agent::
            “finance_assistant”,
            <br />
            {"  "}action == Action::“read_account”,
            <br />
            {"  "}resource <span className="blue">in</span> Account::“demo”
            <br />
            )<br />
            <span className="purple">when</span> {"{"}
            <br />
            {"  "}context.identity_verified =={" "}
            <span className="green">true</span>
            <br />
            {"}"};
          </code>
        </pre>

        <div className="code-foot">
          <span>
            <i /> POLICY VALID
          </span>
          <small>Conceptual syntax preview</small>
        </div>
      </div>
    </AnimatedSection>
  )
}
