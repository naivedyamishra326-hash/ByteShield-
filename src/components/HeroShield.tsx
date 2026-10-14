import { useState, useRef, useEffect } from "react"
import {
  motion,
  useMotionValue,
  useSpring,
  useTransform,
  useReducedMotion,
  AnimatePresence,
} from "motion/react"
import { Icon } from "./Common"

export function HeroShield() {
  const [active, setActive] = useState(2)
  const containerRef = useRef<HTMLDivElement>(null)
  const prefersReduced = useReducedMotion()

  const nodes = [
    "Agent request",
    "Identity context",
    "Policy decision",
    "Protected tool",
  ]

  // Mouse tilt tracking
  const mouseX = useMotionValue(0)
  const mouseY = useMotionValue(0)

  const springConfig = { damping: 25, stiffness: 150 }
  const smoothX = useSpring(mouseX, springConfig)
  const smoothY = useSpring(mouseY, springConfig)

  // Parallax shifts for different depth layers
  const rotateX = useTransform(smoothY, [-0.5, 0.5], [6, -6])
  const rotateY = useTransform(smoothX, [-0.5, 0.5], [-8, 8])
  const layerBackX = useTransform(smoothX, [-0.5, 0.5], [-12, 12])
  const layerBackY = useTransform(smoothY, [-0.5, 0.5], [-10, 10])
  const layerFrontX = useTransform(smoothX, [-0.5, 0.5], [8, -8])
  const layerFrontY = useTransform(smoothY, [-0.5, 0.5], [6, -6])

  const handlePointerMove = (e: React.PointerEvent) => {
    if (prefersReduced || !containerRef.current) return
    const rect = containerRef.current.getBoundingClientRect()
    const x = (e.clientX - rect.left) / rect.width - 0.5
    const y = (e.clientY - rect.top) / rect.height - 0.5
    mouseX.set(x)
    mouseY.set(y)
  }

  const handlePointerLeave = () => {
    mouseX.set(0)
    mouseY.set(0)
  }

  return (
    <motion.div
      ref={containerRef}
      className="hero-visual"
      aria-label="Interactive conceptual authorization flow"
      onPointerMove={handlePointerMove}
      onPointerLeave={handlePointerLeave}
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 1, delay: 0.2 }}
      style={
        prefersReduced
          ? undefined
          : {
              perspective: 1000,
            }
      }
    >
      {/* Ambient background orbs */}
      <motion.div
        className="orb orb-a"
        animate={
          prefersReduced
            ? undefined
            : {
                y: [0, -12, 0],
                x: [0, 8, 0],
                scale: [1, 1.04, 1],
              }
        }
        transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        className="orb orb-b"
        animate={
          prefersReduced
            ? undefined
            : {
                y: [0, 14, 0],
                x: [0, -10, 0],
                scale: [1, 1.05, 1],
              }
        }
        transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
      />

      {/* Layered Glass Shield */}
      <motion.div
        className="shield-wrap"
        style={
          prefersReduced
            ? undefined
            : {
                rotateX,
                rotateY,
                transformStyle: "preserve-3d",
              }
        }
        animate={
          prefersReduced
            ? undefined
            : {
                y: [0, -7, 0],
              }
        }
        transition={{
          y: { duration: 6, repeat: Infinity, ease: "easeInOut" },
        }}
      >
        <motion.div
          className="shield shield-back"
          style={prefersReduced ? undefined : { x: layerBackX, y: layerBackY }}
        />
        <motion.div
          className="shield shield-mid"
          style={prefersReduced ? undefined : { x: smoothX, y: smoothY }}
        />
        <motion.div
          className="shield shield-front"
          style={
            prefersReduced ? undefined : { x: layerFrontX, y: layerFrontY }
          }
        >
          <div className="shield-core">
            <motion.div
              animate={
                prefersReduced
                  ? undefined
                  : {
                      scale: [1, 1.06, 1],
                    }
              }
              transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
              style={{ display: "grid", placeItems: "center" }}
            >
              <Icon name="lock" size={28} />
            </motion.div>
            <span>VERIFY</span>
          </div>
        </motion.div>
        <div className="shield-scan" />
      </motion.div>

      {/* Dynamic connection flow line */}
      <div className="flow-line" />

      {/* Connected Nodes */}
      {nodes.map((node, i) => (
        <motion.button
          key={node}
          className={`hero-node node-${i + 1} ${active === i ? "active" : ""}`}
          onClick={() => setActive(i)}
          type="button"
          whileHover={{ scale: 1.08 }}
          whileTap={{ scale: 0.95 }}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.3 + i * 0.1 }}
        >
          <span>{String(i + 1).padStart(2, "0")}</span>
          {node}
        </motion.button>
      ))}

      {/* Dynamic status readout */}
      <div className="hero-readout">
        <span>AUTHORIZATION BOUNDARY</span>
        <AnimatePresence mode="wait">
          <motion.strong
            key={active}
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.2 }}
          >
            {nodes[active]}
          </motion.strong>
        </AnimatePresence>
        <small>Conceptual stage {active + 1} of 4</small>
      </div>

      <div className="visual-corner corner-tl" />
      <div className="visual-corner corner-br" />
    </motion.div>
  )
}
