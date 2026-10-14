import React, { useEffect, useRef, useState, type ReactNode } from "react"
import {
  motion,
  useScroll,
  useSpring,
  useReducedMotion,
  useInView,
  type HTMLMotionProps,
} from "motion/react"
import {
  fadeUpVariants,
  staggerContainer,
  staggerItem,
  textMaskContainer,
  textMaskItem,
  flowEasing,
} from "./variants"

/**
 * Top-edge scroll progress indicator with smooth spring damping
 */
export function ScrollProgress() {
  const { scrollYProgress } = useScroll()
  const scaleX = useSpring(scrollYProgress, {
    stiffness: 100,
    damping: 30,
    restDelta: 0.001,
  })
  const prefersReduced = useReducedMotion()

  if (prefersReduced) return null

  return (
    <motion.div
      className="scroll-progress-bar"
      style={{
        scaleX,
        transformOrigin: "0%",
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        height: "2.5px",
        background: "linear-gradient(90deg, #65e7f5, #8bafff, #6de7ae)",
        zIndex: 9999,
        pointerEvents: "none",
        boxShadow: "0 0 12px rgba(101, 231, 245, 0.5)",
      }}
    />
  )
}

/**
 * Section wrapper that triggers smooth fade & rise on scroll
 */
export function AnimatedSection({
  children,
  className = "",
  id,
  delay = 0,
}: {
  children: ReactNode
  className?: string
  id?: string
  delay?: number
}) {
  const prefersReduced = useReducedMotion()

  if (prefersReduced) {
    return (
      <section className={className} id={id}>
        {children}
      </section>
    )
  }

  return (
    <motion.section
      id={id}
      className={className}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, amount: 0.12 }}
      variants={{
        hidden: { opacity: 0, y: 24 },
        visible: {
          opacity: 1,
          y: 0,
          transition: {
            duration: 0.7,
            delay,
            ease: flowEasing,
          },
        },
      }}
    >
      {children}
    </motion.section>
  )
}

/**
 * Cinematic headline reveal with line-by-line masked rise
 */
export function CinematicTitle({
  lines,
  className = "",
}: {
  lines: (string | ReactNode)[]
  className?: string
}) {
  const prefersReduced = useReducedMotion()

  if (prefersReduced) {
    return (
      <h1 className={className}>
        {lines.map((line, idx) => (
          <React.Fragment key={idx}>
            {line}
            {idx < lines.length - 1 && <br />}
          </React.Fragment>
        ))}
      </h1>
    )
  }

  return (
    <motion.h1
      className={className}
      variants={textMaskContainer}
      initial="hidden"
      animate="visible"
    >
      {lines.map((line, idx) => (
        <span
          key={idx}
          style={{
            display: "block",
            overflow: "hidden",
            lineHeight: "1.06",
            paddingBottom: "4px",
          }}
        >
          <motion.span
            variants={textMaskItem}
            style={{ display: "inline-block" }}
          >
            {line}
          </motion.span>
        </span>
      ))}
    </motion.h1>
  )
}

/**
 * Animated counter that counts from 0 to target number when scrolled into view
 */
export function AnimatedCounter({
  value,
  duration = 1.2,
}: {
  value: string
  duration?: number
}) {
  const prefersReduced = useReducedMotion()
  const ref = useRef<HTMLSpanElement>(null)
  const isInView = useInView(ref, { once: true })
  const [displayValue, setDisplayValue] = useState(prefersReduced ? value : "0")

  useEffect(() => {
    if (prefersReduced || !isInView) return

    // Extract numbers, decimal, and formatting
    const match = value.match(/([0-9,.]+)/)
    if (!match) {
      setDisplayValue(value)
      return
    }

    const numericPart = match[1]
    const isPercentage = value.includes("%")
    const isMs = value.includes("ms")
    const hasComma = numericPart.includes(",")
    const rawNumber = parseFloat(numericPart.replace(/,/g, ""))

    if (isNaN(rawNumber)) {
      setDisplayValue(value)
      return
    }

    let startTime: number | null = null
    let animationFrame: number

    const step = (timestamp: number) => {
      if (!startTime) startTime = timestamp
      const progress = Math.min((timestamp - startTime) / (duration * 1000), 1)
      // Ease out cubic
      const eased = 1 - Math.pow(1 - progress, 3)
      const current = rawNumber * eased

      let formatted = ""
      if (rawNumber % 1 !== 0) {
        formatted = current.toFixed(1)
      } else {
        formatted = Math.floor(current).toString()
      }

      if (hasComma) {
        const parts = formatted.split(".")
        parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ",")
        formatted = parts.join(".")
      }

      if (isPercentage) formatted += "%"
      if (isMs) formatted += "ms"

      setDisplayValue(formatted)

      if (progress < 1) {
        animationFrame = requestAnimationFrame(step)
      } else {
        setDisplayValue(value)
      }
    }

    animationFrame = requestAnimationFrame(step)
    return () => cancelAnimationFrame(animationFrame)
  }, [value, duration, isInView, prefersReduced])

  return <span ref={ref}>{displayValue}</span>
}

/**
 * Liquid Glass Spotlight Container for cards
 * Adds a GPU-accelerated specular light tracking cursor position
 */
export function LiquidGlassCard({
  children,
  className = "",
  onClick,
  ...props
}: HTMLMotionProps<"article"> & {
  children: ReactNode
  className?: string
  onClick?: () => void
}) {
  const cardRef = useRef<HTMLElement>(null)
  const prefersReduced = useReducedMotion()

  const handlePointerMove = (e: React.PointerEvent<HTMLElement>) => {
    if (prefersReduced || !cardRef.current) return
    const rect = cardRef.current.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top
    cardRef.current.style.setProperty("--mouse-x", `${x}px`)
    cardRef.current.style.setProperty("--mouse-y", `${y}px`)
    cardRef.current.style.setProperty("--spotlight-opacity", "1")
  }

  const handlePointerLeave = () => {
    if (!cardRef.current) return
    cardRef.current.style.setProperty("--spotlight-opacity", "0")
  }

  return (
    <motion.article
      ref={cardRef}
      className={`liquid-glass-card ${className}`}
      onPointerMove={handlePointerMove}
      onPointerLeave={handlePointerLeave}
      onClick={onClick}
      {...props}
    >
      <div className="card-spotlight-layer" aria-hidden="true" />
      {children}
    </motion.article>
  )
}
