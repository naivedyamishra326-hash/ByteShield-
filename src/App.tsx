import { useState, useEffect, useCallback } from "react"
import { AnimatePresence, motion } from "motion/react"
import { Navigation } from "./components/Navigation"
import { Hero } from "./components/Hero"
import { Pipeline } from "./components/Pipeline"
import { Problem } from "./components/Problem"
import { Capabilities } from "./components/Capabilities"
import { Architecture } from "./components/Architecture"
import { Scenarios } from "./components/Scenarios"
import { Developer } from "./components/Developer"
import { ProductPreview } from "./components/ProductPreview"
import { Philosophy } from "./components/Philosophy"
import { FinalCta } from "./components/FinalCta"
import { Footer } from "./components/Footer"
import { ConsoleGateway } from "./components/ConsoleGateway"
import { SecurityConsole } from "./console/SecurityConsole"
import { ScrollProgress } from "./motion/MotionComponents"
import { pageVariants } from "./motion/variants"

export const CONSOLE_ROUTES = [
  "/console",
  "/accounts",
  "/finance",
  "/graph",
  "/monitor",
  "/incidents",
  "/policies",
  "/identity",
  "/attack-lab",
  "/audit",
]

export const normalizeConsolePath = (rawPath: string): string | null => {
  if (!rawPath) return null
  let p = rawPath
  if (p.startsWith("#")) {
    p = p.slice(1)
  }
  if (!p.startsWith("/")) {
    p = "/" + p
  }
  const clean = p.split("?")[0]
  if (clean === "/dashboard") return "/console"
  if (clean === "/attacks") return "/attack-lab"
  if (CONSOLE_ROUTES.includes(clean)) {
    return clean
  }
  return null
}

export const isConsoleRoute = (path: string): boolean => {
  return normalizeConsolePath(path) !== null
}

export const normalizeGatewayPath = (rawPath: string): string | null => {
  if (!rawPath) return null
  let p = rawPath
  if (p.startsWith("#")) p = p.slice(1)
  if (!p.startsWith("/")) p = "/" + p
  const clean = p.split("?")[0]
  if (clean === "/gateway" || clean === "/console-gateway") return clean
  return null
}

export const isGatewayRoute = (path: string): boolean => {
  return normalizeGatewayPath(path) !== null
}

function App() {
  const getInitialRoute = (): string => {
    if (typeof window === "undefined") return "/"
    const pathMatch = normalizeConsolePath(window.location.pathname)
    if (pathMatch) return pathMatch
    const hashMatch = normalizeConsolePath(window.location.hash)
    if (hashMatch) return hashMatch
    const gatewayMatch = normalizeGatewayPath(window.location.pathname) || normalizeGatewayPath(window.location.hash)
    if (gatewayMatch) return gatewayMatch
    return window.location.pathname || "/"
  }

  const [currentPath, setCurrentPath] = useState<string>(getInitialRoute)

  const handleLocationUpdate = useCallback(() => {
    const pathMatch = normalizeConsolePath(window.location.pathname)
    if (pathMatch) {
      setCurrentPath(pathMatch)
      return
    }
    const hashMatch = normalizeConsolePath(window.location.hash)
    if (hashMatch) {
      setCurrentPath(hashMatch)
      return
    }
    const gatewayMatch = normalizeGatewayPath(window.location.pathname) || normalizeGatewayPath(window.location.hash)
    if (gatewayMatch) {
      setCurrentPath(gatewayMatch)
      return
    }
    setCurrentPath(window.location.pathname || "/")
  }, [])

  useEffect(() => {
    window.addEventListener("popstate", handleLocationUpdate)
    window.addEventListener("hashchange", handleLocationUpdate)
    return () => {
      window.removeEventListener("popstate", handleLocationUpdate)
      window.removeEventListener("hashchange", handleLocationUpdate)
    }
  }, [handleLocationUpdate])

  const scrollToHash = (targetHash: string, retries = 15) => {
    const el = document.getElementById(targetHash)
    if (el) {
      el.scrollIntoView({ behavior: "smooth" })
    } else if (retries > 0) {
      setTimeout(() => scrollToHash(targetHash, retries - 1), 60)
    }
  }

  const navigate = (path: string) => {
    // Check if navigating to landing page
    if (path === "/" || path === "#/" || path === "") {
      window.history.pushState({}, "", "/")
      setCurrentPath("/")
      window.scrollTo({ top: 0, behavior: "smooth" })
      return
    }

    // Check if target is a console route
    const consoleTarget = normalizeConsolePath(path)
    if (consoleTarget) {
      window.history.pushState({}, "", consoleTarget)
      setCurrentPath(consoleTarget)
      window.scrollTo({ top: 0, behavior: "smooth" })
      return
    }

    // Check if target is gateway route
    const gatewayTarget = normalizeGatewayPath(path)
    if (gatewayTarget) {
      window.history.pushState({}, "", gatewayTarget)
      setCurrentPath(gatewayTarget)
      window.scrollTo({ top: 0, behavior: "smooth" })
      return
    }

    // Anchor hash link on landing page (e.g. /#capabilities or #architecture)
    if (path.includes("#")) {
      const [route, hash] = path.split("#")
      const targetRoute = route || "/"
      if (currentPath !== targetRoute) {
        window.history.pushState({}, "", path)
        setCurrentPath(targetRoute)
        scrollToHash(hash)
        return
      } else {
        scrollToHash(hash)
        return
      }
    }

    if (path !== currentPath) {
      window.history.pushState({}, "", path)
      setCurrentPath(path)
      window.scrollTo({ top: 0, behavior: "smooth" })
    }
  }

  const inConsole = isConsoleRoute(currentPath)
  const inGateway = isGatewayRoute(currentPath)

  return (
    <>
      <AnimatePresence mode="wait">
        {inConsole ? (
          <motion.div
            key="security-console"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            <SecurityConsole currentPath={currentPath} onNavigate={navigate} />
          </motion.div>
        ) : inGateway ? (
          <motion.div
            key="console-gateway"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            <ConsoleGateway onNavigate={navigate} />
          </motion.div>
        ) : (
          <motion.div
            key="landing-page"
            className="app"
            id="top"
            variants={pageVariants}
            initial="initial"
            animate="animate"
            exit="exit"
          >
            <ScrollProgress />
            <Navigation onNavigate={navigate} />
            <main>
              <Hero onNavigate={navigate} />
              <Pipeline />
              <Problem />
              <Capabilities />
              <Architecture />
              <Scenarios />
              <Developer />
              <ProductPreview onNavigate={navigate} />
              <Philosophy />
              <FinalCta onNavigate={navigate} />
            </main>
            <Footer onNavigate={navigate} />
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}

export default App
