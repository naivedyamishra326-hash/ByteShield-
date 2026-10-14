import { useEffect, useState } from "react"
import { motion, AnimatePresence } from "motion/react"
import { Icon, Logo, Button } from "./Common"
import { flowEasing } from "../motion/variants"

interface NavigationProps {
  onNavigate?: (path: string) => void
}

export function Navigation({ onNavigate }: NavigationProps) {
  const [open, setOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24)
    onScroll()
    window.addEventListener("scroll", onScroll, { passive: true })
    return () => window.removeEventListener("scroll", onScroll)
  }, [])

  const links = [
    ["Platform", "pipeline"],
    ["Architecture", "architecture"],
    ["Capabilities", "capabilities"],
    ["Research", "research"],
    ["About", "about"],
  ]

  const handleLinkClick = (
    e: React.MouseEvent<HTMLAnchorElement>,
    href: string,
  ) => {
    if (href.startsWith("/")) {
      e.preventDefault()
      if (onNavigate) {
        onNavigate(href)
      } else {
        window.history.pushState({}, "", href)
        window.dispatchEvent(new PopStateEvent("popstate"))
      }
    }
  }

  return (
    <motion.nav
      className={`nav ${scrolled ? "scrolled" : ""}`}
      aria-label="Primary navigation"
      initial={{ y: -24, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.6, ease: flowEasing }}
    >
      <Logo onNavigate={onNavigate} />

      <div
        className="nav-links"
        onMouseLeave={() => setHoveredIdx(null)}
        style={{ position: "relative" }}
      >
        {links.map(([label, id], idx) => (
          <a
            href={`#${id}`}
            key={id}
            onMouseEnter={() => setHoveredIdx(idx)}
            className="nav-link-item"
            style={{ position: "relative", zIndex: 2 }}
          >
            {label}
            {hoveredIdx === idx && (
              <motion.span
                layoutId="nav-hover-pill"
                className="nav-hover-pill"
                transition={{ type: "spring", stiffness: 350, damping: 28 }}
              />
            )}
          </a>
        ))}
      </div>

      <Button
        href="/console"
        onClick={(e) => handleLinkClick(e as any, "/console")}
        className="nav-cta"
      >
        Enter Console <Icon name="arrow" size={16} />
      </Button>

      <motion.button
        className="menu-button"
        type="button"
        whileTap={{ scale: 0.94 }}
        onClick={() => setOpen(!open)}
        aria-label={open ? "Close navigation" : "Open navigation"}
        aria-expanded={open}
      >
        <Icon name={open ? "x" : "menu"} />
      </motion.button>

      <AnimatePresence>
        {open && (
          <motion.div
            className="mobile-menu"
            initial={{ opacity: 0, y: -12, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.98 }}
            transition={{ duration: 0.25, ease: flowEasing }}
          >
            {links.map(([label, id], i) => (
              <motion.a
                href={`#${id}`}
                key={id}
                onClick={() => setOpen(false)}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.04 * i, duration: 0.25 }}
              >
                {label}
                <Icon name="arrow" size={14} />
              </motion.a>
            ))}
            <div style={{ marginTop: "8px" }}>
              <Button
                href="/console"
                onClick={(e) => {
                  setOpen(false)
                  handleLinkClick(e as any, "/console")
                }}
              >
                Enter Security Console <Icon name="arrow" />
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.nav>
  )
}
