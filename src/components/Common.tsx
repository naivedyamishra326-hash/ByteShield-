import React, { type ReactNode } from "react"
import { motion } from "motion/react"
import { buttonVariants } from "../motion/variants"

export type IconName = "agent" | "arrow" | "audit" | "check" | "chevron" | "code" | "copy" | "database" | "eye" | "fingerprint" | "grid" | "lock" | "menu" | "policy" | "scan" | "shield" | "spark" | "user" | "x" | "zoomIn" | "zoomOut"

export const iconPaths: Record<IconName, ReactNode> = {
  agent: (
    <>
      <circle cx="12" cy="8" r="3" />
      <path d="M5 20a7 7 0 0 1 14 0M18 4l2-2M6 4 4-2" />
    </>
  ),
  arrow: (
    <>
      <path d="M5 12h14M15 8l4 4-4 4" />
    </>
  ),
  audit: (
    <>
      <path d="M5 3h11l3 3v15H5zM9 11h6M9 15h5M9 7h2" />
    </>
  ),
  check: <path d="m5 12 4 4L19 6" />,
  chevron: <path d="m8 10 4 4 4-4" />,
  code: (
    <>
      <path d="m9 18-6-6 6-6M15 6l6 6-6 6" />
    </>
  ),
  copy: (
    <>
      <rect x="9" y="9" width="11" height="11" rx="2" />
      <path d="M15 9V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v7a2 2 0 0 0 2 2h3" />
    </>
  ),
  database: (
    <>
      <ellipse cx="12" cy="5" rx="8" ry="3" />
      <path d="M4 5v6c0 1.7 3.6 3 8 3s8-1.3 8-3V5M4 11v6c0 1.7 3.6 3 8 3s8-1.3 8-3v-6" />
    </>
  ),
  eye: (
    <>
      <path d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6S2 12 2 12" />
      <circle cx="12" cy="12" r="2.5" />
    </>
  ),
  fingerprint: (
    <>
      <path d="M7 9a5 5 0 0 1 10 0c0 6-1 9-3 12M4 12v-2a8 8 0 0 1 16 0c0 4-.2 7-1 9M8 12v-2a4 4 0 0 1 8 0c0 5-.4 7-2 9M12 10v4c0 3-.5 5-2 7" />
    </>
  ),
  grid: (
    <>
      <rect x="4" y="4" width="6" height="6" rx="1" />
      <rect x="14" y="4" width="6" height="6" rx="1" />
      <rect x="4" y="14" width="6" height="6" rx="1" />
      <rect x="14" y="14" width="6" height="6" rx="1" />
    </>
  ),
  lock: (
    <>
      <rect x="5" y="10" width="14" height="11" rx="2" />
      <path d="M8 10V7a4 4 0 0 1 8 0v3M12 14v3" />
    </>
  ),
  menu: (
    <>
      <path d="M4 7h16M4 12h16M4 17h16" />
    </>
  ),
  policy: (
    <>
      <path d="M6 3h9l3 3v15H6zM9 9h6M9 13h6M9 17h4" />
    </>
  ),
  scan: (
    <>
      <path d="M4 8V4h4M16 4h4v4M20 16v4h-4M8 20H4v-4M8 12h8" />
    </>
  ),
  shield: <path d="M12 2 20 6v6c0 5-3.4 8.7-8 10-4.6-1.3-8-5-8-10V6z" />,
  spark: <path d="m12 2 1.5 6.5L20 10l-6.5 1.5L12 18l-1.5-6.5L4 10l6.5-1.5z" />,
  user: (
    <>
      <circle cx="12" cy="8" r="4" />
      <path d="M4 21a8 8 0 0 1 16 0" />
    </>
  ),
  x: (
    <>
      <path d="m6 6 12 12M18 6 6 18" />
    </>
  ),
  zoomIn: (
    <>
      <circle cx="10" cy="10" r="6" />
      <path d="m15 15 5 5M10 7v6M7 10h6" />
    </>
  ),
  zoomOut: (
    <>
      <circle cx="10" cy="10" r="6" />
      <path d="m15 15 5 5M7 10h6" />
    </>
  ),
}

export function Icon({ name, size = 20 }: { name: IconName; size?: number }) {
  return (
    <svg
      className="icon"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {iconPaths[name]}
    </svg>
  )
}

export function Button({
  children,
  variant = "primary",
  href,
  onClick,
  className = "",
  ariaLabel,
}: {
  children: ReactNode
  variant?: "primary" | "secondary" | "ghost"
  href?: string
  onClick?: (e: React.MouseEvent) => void
  className?: string
  ariaLabel?: string
}) {
  const classes = `button button-${variant} ${className}`

  if (href) {
    return (
      <motion.a
        className={classes}
        href={href}
        onClick={onClick}
        aria-label={ariaLabel}
        variants={buttonVariants}
        initial="rest"
        whileHover="hover"
        whileTap="tap"
      >
        {children}
      </motion.a>
    )
  }

  return (
    <motion.button
      className={classes}
      type="button"
      onClick={onClick}
      aria-label={ariaLabel}
      variants={buttonVariants}
      initial="rest"
      whileHover="hover"
      whileTap="tap"
    >
      {children}
    </motion.button>
  )
}

export function SectionHeading({
  eyebrow,
  title,
  body,
  center = false,
}: {
  eyebrow: string
  title: ReactNode
  body?: string
  center?: boolean
}) {
  return (
    <header className={`section-heading ${center ? "center" : ""}`}>
      <motion.span
        className="eyebrow"
        initial={{ opacity: 0, x: -10 }}
        whileInView={{ opacity: 1, x: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.5 }}
      >
        <i />
        {eyebrow}
      </motion.span>
      <motion.h2
        initial={{ opacity: 0, y: 16 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.6, delay: 0.08 }}
      >
        {title}
      </motion.h2>
      {body && (
        <motion.p
          initial={{ opacity: 0, y: 12 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.16 }}
        >
          {body}
        </motion.p>
      )}
    </header>
  )
}

export function Logo({ onNavigate }: { onNavigate?: (path: string) => void }) {
  const handleClick = (e: React.MouseEvent) => {
    if (window.location.pathname !== "/") {
      e.preventDefault()
      if (onNavigate) {
        onNavigate("/")
      } else {
        window.history.pushState({}, "", "/")
        window.dispatchEvent(new PopStateEvent("popstate"))
      }
    }
  }

  return (
    <a
      className="logo"
      href="/#top"
      onClick={handleClick}
      aria-label="MCP Sentinel home"
    >
      <motion.span
        className="logo-mark"
        whileHover={{ scale: 1.08, rotate: 2 }}
        transition={{ type: "spring", stiffness: 400, damping: 20 }}
      >
        <span />
      </motion.span>
      <span className="logo-copy">
        <b>MCP SENTINEL</b>
        <small>AI AGENT SECURITY</small>
      </span>
    </a>
  )
}
