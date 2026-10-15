import { Logo } from "./Common"

interface FooterProps {
  onNavigate?: (path: string) => void
}

export function Footer({ onNavigate }: FooterProps) {
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
    <footer>
      <div className="footer-main">
        <div>
          <Logo onNavigate={onNavigate} />
          <p>
            An independent runtime security layer for exploring safer
            tool-connected AI workflows.
          </p>
        </div>

        <div>
          <span>EXPLORE</span>
          <a
            href="#pipeline"
            onClick={(e) => {
              if (onNavigate) {
                e.preventDefault()
                onNavigate("#pipeline")
              }
            }}
          >
            Platform
          </a>
          <a
            href="#architecture"
            onClick={(e) => {
              if (onNavigate) {
                e.preventDefault()
                onNavigate("#architecture")
              }
            }}
          >
            Architecture
          </a>
          <a
            href="#about"
            onClick={(e) => {
              if (onNavigate) {
                e.preventDefault()
                onNavigate("#about")
              }
            }}
          >
            Research
          </a>
        </div>

        <div>
          <span>PRODUCT</span>
          <a
            href="#preview"
            onClick={(e) => {
              if (onNavigate) {
                e.preventDefault()
                onNavigate("#preview")
              }
            }}
          >
            Product preview
          </a>
          <a href="/console" onClick={handleConsoleClick}>
            Security console
          </a>
          <a
            href="#top"
            onClick={(e) => {
              if (onNavigate) {
                e.preventDefault()
                onNavigate("#top")
              }
            }}
          >
            Return to top
          </a>
        </div>

        <div className="footer-status">
          <span>
            <i /> PROTOTYPE
          </span>
          <p>
            Research and demonstration environment. No real financial
            operations.
          </p>
        </div>
      </div>

      <div className="footer-bottom">
        <span>© {new Date().getFullYear()} MCP Sentinel</span>
        <span>AI agents propose. Security decides.</span>
      </div>
    </footer>
  )
}
