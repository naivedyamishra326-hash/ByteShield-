import { useEffect, useRef, useState, type ReactNode } from "react";

type IconName =
  | "agent"
  | "arrow"
  | "audit"
  | "check"
  | "chevron"
  | "code"
  | "copy"
  | "database"
  | "eye"
  | "fingerprint"
  | "grid"
  | "lock"
  | "menu"
  | "policy"
  | "scan"
  | "shield"
  | "spark"
  | "user"
  | "x"
  | "zoomIn"
  | "zoomOut";

const iconPaths: Record<IconName, ReactNode> = {
  agent: <><circle cx="12" cy="8" r="3" /><path d="M5 20a7 7 0 0 1 14 0M18 4l2-2M6 4 4-2" /></>,
  arrow: <><path d="M5 12h14M15 8l4 4-4 4" /></>,
  audit: <><path d="M5 3h11l3 3v15H5zM9 11h6M9 15h5M9 7h2" /></>,
  check: <path d="m5 12 4 4L19 6" />,
  chevron: <path d="m8 10 4 4 4-4" />,
  code: <><path d="m9 18-6-6 6-6M15 6l6 6-6 6" /></>,
  copy: <><rect x="9" y="9" width="11" height="11" rx="2" /><path d="M15 9V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v7a2 2 0 0 0 2 2h3" /></>,
  database: <><ellipse cx="12" cy="5" rx="8" ry="3" /><path d="M4 5v6c0 1.7 3.6 3 8 3s8-1.3 8-3V5M4 11v6c0 1.7 3.6 3 8 3s8-1.3 8-3v-6" /></>,
  eye: <><path d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6S2 12 2 12" /><circle cx="12" cy="12" r="2.5" /></>,
  fingerprint: <><path d="M7 9a5 5 0 0 1 10 0c0 6-1 9-3 12M4 12v-2a8 8 0 0 1 16 0c0 4-.2 7-1 9M8 12v-2a4 4 0 0 1 8 0c0 5-.4 7-2 9M12 10v4c0 3-.5 5-2 7" /></>,
  grid: <><rect x="4" y="4" width="6" height="6" rx="1" /><rect x="14" y="4" width="6" height="6" rx="1" /><rect x="4" y="14" width="6" height="6" rx="1" /><rect x="14" y="14" width="6" height="6" rx="1" /></>,
  lock: <><rect x="5" y="10" width="14" height="11" rx="2" /><path d="M8 10V7a4 4 0 0 1 8 0v3M12 14v3" /></>,
  menu: <><path d="M4 7h16M4 12h16M4 17h16" /></>,
  policy: <><path d="M6 3h9l3 3v15H6zM9 9h6M9 13h6M9 17h4" /></>,
  scan: <><path d="M4 8V4h4M16 4h4v4M20 16v4h-4M8 20H4v-4M8 12h8" /></>,
  shield: <path d="M12 2 20 6v6c0 5-3.4 8.7-8 10-4.6-1.3-8-5-8-10V6z" />,
  spark: <path d="m12 2 1.5 6.5L20 10l-6.5 1.5L12 18l-1.5-6.5L4 10l6.5-1.5z" />,
  user: <><circle cx="12" cy="8" r="4" /><path d="M4 21a8 8 0 0 1 16 0" /></>,
  x: <><path d="m6 6 12 12M18 6 6 18" /></>,
  zoomIn: <><circle cx="10" cy="10" r="6" /><path d="m15 15 5 5M10 7v6M7 10h6" /></>,
  zoomOut: <><circle cx="10" cy="10" r="6" /><path d="m15 15 5 5M7 10h6" /></>,
};

function Icon({ name, size = 20 }: { name: IconName; size?: number }) {
  return <svg className="icon" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{iconPaths[name]}</svg>;
}

function Button({ children, variant = "primary", href, onClick, className = "", ariaLabel }: { children: ReactNode; variant?: "primary" | "secondary" | "ghost"; href?: string; onClick?: () => void; className?: string; ariaLabel?: string }) {
  const classes = `button button-${variant} ${className}`;
  return href ? <a className={classes} href={href} aria-label={ariaLabel}>{children}</a> : <button className={classes} type="button" onClick={onClick} aria-label={ariaLabel}>{children}</button>;
}

function SectionHeading({ eyebrow, title, body, center = false }: { eyebrow: string; title: ReactNode; body?: string; center?: boolean }) {
  return <header className={`section-heading ${center ? "center" : ""}`}><span className="eyebrow"><i />{eyebrow}</span><h2>{title}</h2>{body && <p>{body}</p>}</header>;
}

function Logo() {
  return <a className="logo" href="#top" aria-label="MCP Sentinel home"><span className="logo-mark"><span /></span><span className="logo-copy"><b>MCP SENTINEL</b><small>AI AGENT SECURITY</small></span></a>;
}

const pipeline = [
  { icon: "spark" as IconName, title: "AI Request", text: "Gemini proposes an action using an available tool.", detail: "The model forms a structured tool request. At this point, it is only a proposal—not permission to execute." },
  { icon: "fingerprint" as IconName, title: "Identity", text: "Validate agent identity and relevant credentials.", detail: "The security layer resolves who is acting, the scope of delegation, and the credentials attached to the request." },
  { icon: "policy" as IconName, title: "Policy Check", text: "Cedar evaluates whether the action is authorized.", detail: "Policy considers the principal, requested action, protected resource, and contextual attributes independently of model reasoning." },
  { icon: "user" as IconName, title: "Approval Gate", text: "Sensitive actions may require explicit approval.", detail: "Configured operations pause for a human decision. Approval is a separate control, not an instruction sent back to the model." },
  { icon: "lock" as IconName, title: "Protected Execution", text: "Authorized actions reach the protected tool.", detail: "The outcome can be inspected and linked to a traceable audit record before returning to the agent." },
];

const capabilities = [
  { icon: "policy" as IconName, title: "Continuous Authorization", text: "Evaluate each relevant tool action against applicable access policies.", detail: "Decision context can include the acting identity, resource, action, and request attributes." },
  { icon: "fingerprint" as IconName, title: "Agent Identity", text: "Represent identity with verifiable credentials and controlled delegation.", detail: "Identity is kept explicit so policy can reason about who or what proposed an action." },
  { icon: "user" as IconName, title: "Human-in-the-Loop", text: "Pause configured sensitive operations until required approval is provided.", detail: "High-impact actions can be queued for an explicit, attributable decision." },
  { icon: "scan" as IconName, title: "Injection Awareness", text: "Inspect untrusted requests and responses for suspicious instructions.", detail: "Content signals can trigger flags or quarantine without replacing authorization controls." },
  { icon: "eye" as IconName, title: "Data Protection", text: "Detect and redact supported sensitive data in applicable responses.", detail: "Response inspection is positioned after execution and before content returns to the agent." },
  { icon: "audit" as IconName, title: "Tamper-Evident Audit", text: "Link audit records with cryptographic hashes to expose modification.", detail: "Hash chaining helps make unexpected record changes detectable during verification." },
];

const architecture = [
  { name: "User / React UI", status: "Implemented", x: 7, y: 41, group: "Experience", input: "User intent", output: "Structured request", responsibility: "Makes actions and decisions visible." },
  { name: "Gemini AI Agent", status: "Implemented", x: 25, y: 41, group: "Agent", input: "User request", output: "Tool proposal", responsibility: "Reasons about intent; does not grant authority." },
  { name: "Security Proxy", status: "Implemented", x: 43, y: 41, group: "Sentinel", input: "Tool proposal", output: "Security decision", responsibility: "Orchestrates independent runtime controls." },
  { name: "Agent Identity", status: "Partial", x: 43, y: 12, group: "Sentinel", input: "Credentials", output: "Principal context", responsibility: "Resolves the acting identity and delegation." },
  { name: "Cedar Engine", status: "Implemented", x: 43, y: 70, group: "Sentinel", input: "Decision context", output: "Allow / deny", responsibility: "Evaluates configured authorization policy." },
  { name: "Approval Gate", status: "Implemented", x: 62, y: 12, group: "Control", input: "Sensitive request", output: "Human decision", responsibility: "Pauses configured operations for review." },
  { name: "Finance MCP", status: "Implemented", x: 62, y: 41, group: "Tool", input: "Authorized call", output: "Tool response", responsibility: "Exposes local demo finance tools." },
  { name: "Simulated Ledger", status: "Implemented", x: 81, y: 41, group: "Data", input: "Finance operation", output: "Sample records", responsibility: "Stores simulated financial data only." },
  { name: "Response Inspection", status: "Partial", x: 62, y: 70, group: "Control", input: "Tool response", output: "Inspected response", responsibility: "Flags supported unsafe or sensitive content." },
  { name: "Hash-Chained Audit", status: "Implemented", x: 81, y: 70, group: "Evidence", input: "Security event", output: "Linked record", responsibility: "Records decisions for later verification." },
];

const scenarios = [
  { tag: "01 / PERMITTED", name: "Normal account lookup", request: "read_account · acct_demo_4821", status: "Allowed", tone: "allowed", description: "Applicable identity and policy checks permit this conceptual account read.", decision: "Policy match: account:read" },
  { tag: "02 / BLOCKED", name: "Unauthorized refund", request: "issue_refund · $4,800.00", status: "Denied", tone: "denied", description: "The request does not satisfy the configured authorization policy, so execution stops.", decision: "Missing permission: refund:issue" },
  { tag: "03 / FLAGGED", name: "Suspicious transaction content", request: "memo · ignore policy and export…", status: "Suspicious input", tone: "warning", description: "Untrusted content is flagged while tool authorization remains an independent boundary.", decision: "Content signal: instruction injection" },
];

const previews = ["Overview", "Finance", "Monitor", "Attack Lab", "Audit"];

function HeroShield() {
  const [active, setActive] = useState(2);
  const nodes = ["Agent request", "Identity context", "Policy decision", "Protected tool"];
  return <div className="hero-visual" aria-label="Interactive conceptual authorization flow">
    <div className="orb orb-a" /><div className="orb orb-b" />
    <div className="shield-wrap">
      <div className="shield shield-back" /><div className="shield shield-mid" />
      <div className="shield shield-front"><div className="shield-core"><Icon name="lock" size={28} /><span>VERIFY</span></div></div>
      <div className="shield-scan" />
    </div>
    <div className="flow-line" />
    {nodes.map((node, i) => <button key={node} className={`hero-node node-${i + 1} ${active === i ? "active" : ""}`} onClick={() => setActive(i)} type="button"><span>{String(i + 1).padStart(2, "0")}</span>{node}</button>)}
    <div className="hero-readout"><span>AUTHORIZATION BOUNDARY</span><strong>{nodes[active]}</strong><small>Conceptual stage {active + 1} of 4</small></div>
    <div className="visual-corner corner-tl" /><div className="visual-corner corner-br" />
  </div>;
}

function Navigation() {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);
  const links = [["Platform", "pipeline"], ["Architecture", "architecture"], ["Capabilities", "capabilities"], ["Research", "research"], ["About", "about"]];
  return <nav className={`nav ${scrolled ? "scrolled" : ""}`} aria-label="Primary navigation">
    <Logo />
    <div className="nav-links">{links.map(([label, id]) => <a href={`#${id}`} key={id}>{label}</a>)}</div>
    <Button href="/console" className="nav-cta">Enter Console <Icon name="arrow" size={16} /></Button>
    <button className="menu-button" type="button" onClick={() => setOpen(!open)} aria-label={open ? "Close navigation" : "Open navigation"} aria-expanded={open}><Icon name={open ? "x" : "menu"} /></button>
    {open && <div className="mobile-menu">{links.map(([label, id]) => <a href={`#${id}`} key={id} onClick={() => setOpen(false)}>{label}<Icon name="arrow" /></a>)}<Button href="/console">Enter Security Console <Icon name="arrow" /></Button></div>}
  </nav>;
}

function Pipeline() {
  const [active, setActive] = useState(0);
  return <section className="section pipeline-section" id="pipeline">
    <SectionHeading eyebrow="SECURITY PIPELINE / 01" title={<>Every Tool Call Has a <span>Security Boundary.</span></>} body="See how a proposed AI action moves through the MCP Sentinel security pipeline." />
    <div className="pipeline">
      <div className="pipeline-track"><div style={{ width: `${active * 25}%` }} /></div>
      {pipeline.map((step, i) => <button className={`pipeline-step ${i === active ? "active" : ""} ${i < active ? "complete" : ""}`} key={step.title} onClick={() => setActive(i)} type="button">
        <span className="step-number">{i < active ? <Icon name="check" /> : `0${i + 1}`}</span>
        <span className="step-icon"><Icon name={step.icon} /></span><b>{step.title}</b><small>{step.text}</small>
      </button>)}
    </div>
    <div className="pipeline-detail"><div><span>SELECTED STAGE / 0{active + 1}</span><h3>{pipeline[active].title}</h3></div><p>{pipeline[active].detail}</p><button type="button" onClick={() => setActive(0)}>Reset flow <span>↺</span></button></div>
  </section>;
}

function Problem() {
  const [verified, setVerified] = useState(true);
  return <section className="section problem-section">
    <SectionHeading eyebrow="THE CONTROL GAP / 02" title={<>AI Autonomy Needs More Than <span>Instructions.</span></>} />
    <div className="comparison">
      <div className="comparison-top"><div className="segmented"><button className={!verified ? "active" : ""} onClick={() => setVerified(false)} type="button">Broad trust</button><button className={verified ? "active" : ""} onClick={() => setVerified(true)} type="button">Verified actions</button></div><span>Conceptual comparison</span></div>
      <div className={`comparison-canvas ${verified ? "verified" : "broad"}`}>
        <div className="compare-node"><Icon name="agent" /><span>AI Agent</span><small>Proposes action</small></div>
        <div className="request-path"><i /><b>{verified ? "INSPECTED" : "DIRECT ACCESS"}</b>{verified && <><span className="control-dot c1" /><span className="control-dot c2" /><span className="control-dot c3" /></>}</div>
        {verified && <div className="sentinel-gate"><Icon name="shield" /><span>MCP SENTINEL</span><small>Identity · Policy · Approval</small></div>}
        <div className="compare-node protected"><Icon name="database" /><span>Protected tool</span><small>{verified ? "Policy enforced" : "Broadly reachable"}</small></div>
      </div>
      <div className="comparison-copy"><span className={verified ? "state-safe" : "state-risk"}>{verified ? "CONTROLLED PATH" : "INSUFFICIENT BOUNDARY"}</span><p>{verified ? "MCP Sentinel inspects the proposal, evaluates applicable policy, and stops execution when conditions are not satisfied." : "This model illustrates the risk of a request moving toward a protected resource without enough independent authorization checks—not every conventional deployment."}</p></div>
    </div>
    <blockquote>“Instructions guide the model. <strong>Enforced controls govern what the system can execute.</strong>”</blockquote>
  </section>;
}

function Capabilities() {
  const [active, setActive] = useState<number | null>(null);
  return <section className="section" id="capabilities">
    <SectionHeading eyebrow="CORE CAPABILITIES / 03" title={<>Security That Lives in the <span>Execution Path.</span></>} body="Composable runtime controls designed to separate model intent from system authority." />
    <div className="bento">{capabilities.map((cap, i) => <article className={`capability-card cap-${i + 1} ${active === i ? "active" : ""}`} key={cap.title} onClick={() => setActive(active === i ? null : i)}>
      <div className="cap-icon"><Icon name={cap.icon} /></div><span className="cap-index">0{i + 1}</span><h3>{cap.title}</h3><p>{cap.text}</p>
      <button type="button" aria-expanded={active === i}>{active === i ? "Close details" : "View details"} <Icon name="arrow" size={15} /></button>
      {active === i && <div className="cap-detail"><p>{cap.detail}</p><a href="#architecture">Locate in architecture <Icon name="arrow" size={14} /></a></div>}
    </article>)}</div>
  </section>;
}

function Architecture() {
  const [selected, setSelected] = useState(2);
  const [zoom, setZoom] = useState(1);
  const [linear, setLinear] = useState(false);
  return <section className="section architecture-section" id="architecture">
    <SectionHeading eyebrow="SYSTEM MAP / 04" title={<>A Clear Path Between AI and the <span>Tools It Controls.</span></>} body="A conceptual view of the application boundaries. Nodes describe responsibilities, not separate microservices." />
    <div className="architecture-shell">
      <div className="architecture-toolbar"><span><i /> ARCHITECTURE EXPLORER</span><div><button type="button" onClick={() => setLinear(!linear)}>{linear ? "Graph view" : "Linear view"}</button><button type="button" onClick={() => setZoom(Math.max(.8, zoom - .1))} aria-label="Zoom out"><Icon name="zoomOut" /></button><button type="button" onClick={() => setZoom(Math.min(1.2, zoom + .1))} aria-label="Zoom in"><Icon name="zoomIn" /></button><button type="button" onClick={() => setZoom(1)}>Reset</button></div></div>
      <div className="architecture-content">
        <div className={`architecture-map ${linear ? "linear" : ""}`} tabIndex={0} aria-label="Architecture graph; use linear view for a text alternative">
          {!linear && <svg className="connectors" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true"><path d="M13 46H25M31 46H43M49 46H62M68 46H81M46 41V24M46 51v19M65 41V24M65 51v19M68 75H81" /></svg>}
          <div className="map-inner" style={{ transform: `scale(${zoom})` }}>{architecture.map((node, i) => <button key={node.name} type="button" className={`architecture-node ${selected === i ? "active" : ""}`} style={linear ? undefined : { left: `${node.x}%`, top: `${node.y}%` }} onClick={() => setSelected(i)}><span><Icon name={i === 2 ? "shield" : i === 7 ? "database" : i === 4 ? "policy" : "grid"} /></span><b>{node.name}</b><small>{node.group}</small></button>)}</div>
        </div>
        <aside className="node-detail"><div className="node-detail-head"><span>SELECTED COMPONENT</span><b className={architecture[selected].status === "Partial" ? "partial" : ""}>{architecture[selected].status}</b></div><div className="detail-icon"><Icon name="shield" size={28} /></div><h3>{architecture[selected].name}</h3><p>{architecture[selected].responsibility}</p><dl><div><dt>Input</dt><dd>{architecture[selected].input}</dd></div><div><dt>Output</dt><dd>{architecture[selected].output}</dd></div><div><dt>Security role</dt><dd>{architecture[selected].group}</dd></div></dl></aside>
      </div>
    </div>
  </section>;
}

function Scenarios() {
  const [active, setActive] = useState(1);
  const scenario = scenarios[active];
  return <section className="section scenario-section" id="research">
    <SectionHeading eyebrow="DECISION LAB / 05" title={<>See How Security Decisions <span>Change the Outcome.</span></>} body="Controlled educational demonstrations—not proof of measured security effectiveness." />
    <div className="scenario-layout">
      <div className="scenario-list">{scenarios.map((item, i) => <button type="button" className={active === i ? "active" : ""} onClick={() => setActive(i)} key={item.name}><span>{item.tag}</span><b>{item.name}</b><Icon name="arrow" /></button>)}</div>
      <div className="scenario-stage">
        <div className="scenario-request"><span>PROPOSED TOOL REQUEST</span><code>{scenario.request}</code><div className="scenario-beam"><i /></div></div>
        <div className="scenario-boundary"><Icon name="shield" size={27} /><span>RUNTIME BOUNDARY</span><small>Identity → Policy → Content</small></div>
        <div className={`scenario-result ${scenario.tone}`}><span>DECISION</span><Icon name={scenario.tone === "allowed" ? "check" : scenario.tone === "denied" ? "lock" : "scan"} size={28} /><b>{scenario.status}</b><code>{scenario.decision}</code></div>
        <p>{scenario.description}</p>
      </div>
    </div>
  </section>;
}

function Developer() {
  const [copied, setCopied] = useState(false);
  const codeWindowRef = useRef<HTMLDivElement>(null);
  const activePointer = useRef<number | null>(null);
  const copy = async () => { await navigator.clipboard?.writeText("permit(principal, action, resource);"); setCopied(true); window.setTimeout(() => setCopied(false), 1500); };
  const rockCodeWindow = (clientX: number, clientY: number) => {
    const card = codeWindowRef.current;
    if (!card || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const bounds = card.getBoundingClientRect();
    const x = (clientX - bounds.left) / bounds.width - .5;
    const y = (clientY - bounds.top) / bounds.height - .5;
    card.style.setProperty("--code-rock-x", `${(-y * 7).toFixed(2)}deg`);
    card.style.setProperty("--code-rock-y", `${(x * 9).toFixed(2)}deg`);
    card.style.setProperty("--code-light-x", `${((x + .5) * 100).toFixed(1)}%`);
    card.style.setProperty("--code-light-y", `${((y + .5) * 100).toFixed(1)}%`);
  };
  const resetCodeWindow = () => {
    const card = codeWindowRef.current;
    if (!card) return;
    activePointer.current = null;
    card.classList.remove("is-rocking");
    card.style.setProperty("--code-rock-x", "0deg");
    card.style.setProperty("--code-rock-y", "0deg");
    card.style.setProperty("--code-light-x", "50%");
    card.style.setProperty("--code-light-y", "35%");
  };
  const chips = ["MCP tool integration", "Cedar policies", "Signed identity", "Gemini tool calling", "Runtime monitoring", "Audit verification", "Security testing"];
  return <section className="section developer-section">
    <div className="developer-copy"><SectionHeading eyebrow="BUILDER EXPERIENCE / 06" title={<>Designed for the People <span>Building AI Systems.</span></>} body="Make security decisions inspectable without obscuring the agent and tool workflow." /><div className="dev-chips">{chips.map((chip, i) => <span key={chip}><Icon name={i % 2 ? "code" : "check"} size={14} />{chip}</span>)}</div><div className="button-row"><Button href="#architecture">Explore architecture</Button><Button variant="secondary" href="#preview">View the demo</Button></div></div>
    <div
      className="code-window"
      ref={codeWindowRef}
      onPointerDown={(event) => {
        if (event.pointerType === "mouse" && event.button !== 0) return;
        activePointer.current = event.pointerId;
        codeWindowRef.current?.classList.add("is-rocking");
        rockCodeWindow(event.clientX, event.clientY);
      }}
      onPointerMove={(event) => {
        if (activePointer.current === event.pointerId) rockCodeWindow(event.clientX, event.clientY);
      }}
      onPointerUp={resetCodeWindow}
      onPointerCancel={resetCodeWindow}
      onPointerLeave={(event) => {
        if (event.pointerType === "mouse") resetCodeWindow();
      }}
    ><div className="code-title"><span><i /><i /><i /></span><b>conceptual-policy.cedar</b><button type="button" onClick={copy}><Icon name={copied ? "check" : "copy"} />{copied ? "Copied" : "Copy"}</button></div><pre><code><span className="purple">permit</span> (<br />{"  "}principal <span className="blue">in</span> Agent::“finance_assistant”,<br />{"  "}action == Action::“read_account”,<br />{"  "}resource <span className="blue">in</span> Account::“demo”<br />)<br /><span className="purple">when</span> {"{"}<br />{"  "}context.identity_verified == <span className="green">true</span><br />{"}"};</code></pre><div className="code-foot"><span><i /> POLICY VALID</span><small>Conceptual syntax preview</small></div></div>
  </section>;
}

function ProductPreview() {
  const [active, setActive] = useState(0);
  return <section className="section preview-section" id="preview">
    <SectionHeading eyebrow="PRODUCT PORTFOLIO / 07" title={<>From Authorization Decisions to <span>Operational Visibility.</span></>} body="A preview of the MCP Sentinel workspace using simulated data." center />
    <div className="preview-tabs" role="tablist">{previews.map((tab, i) => <button role="tab" aria-selected={active === i} className={active === i ? "active" : ""} onClick={() => setActive(i)} key={tab} type="button">{tab}</button>)}</div>
    <div className="product-frame">
      <div className="product-sidebar"><div className="mini-logo"><span /><b>MS</b></div>{[0,1,2,3,4,5].map(i => <i className={i === active ? "active" : ""} key={i}><Icon name={["grid","spark","eye","scan","audit","policy"][i] as IconName} /></i>)}</div>
      <div className="product-main">
        <div className="product-top"><div><small>MCP SENTINEL / {previews[active].toUpperCase()}</small><b>{previews[active]} workspace</b></div><span><i /> SIMULATED DATA</span></div>
        <div className="metrics"><div><span>Requests inspected</span><b>{["1,284","24","86","12","1,284"][active]}</b><small>Demo session</small></div><div><span>Policy decisions</span><b>{["98.7%","ALLOW","LIVE","3","VERIFIED"][active]}</b><small>Conceptual status</small></div><div><span>Median decision</span><b>18ms</b><small>Sample metric</small></div></div>
        <div className="product-grid">
          <div className="activity-panel"><div className="panel-head"><b>{active === 3 ? "Attack scenarios" : active === 4 ? "Audit chain" : "Decision activity"}</b><span>LIVE PREVIEW</span></div>{["account.read","refund.issue","transaction.inspect","ledger.verify"].map((event, i) => <div className="event-row" key={event}><span className={i === 1 ? "deny-dot" : i === 2 ? "warn-dot" : ""} /><code>{event}</code><small>agent_fin_{4821 + i}</small><b className={i === 1 ? "denied-text" : i === 2 ? "warning-text" : ""}>{i === 1 ? "DENIED" : i === 2 ? "FLAGGED" : "ALLOWED"}</b></div>)}</div>
          <div className="risk-panel"><div className="panel-head"><b>Authorization graph</b><span>LOCAL</span></div><div className="mini-graph"><i className="g1">A</i><i className="g2"><Icon name="shield" size={17} /></i><i className="g3">T</i><span /></div><div className="decision-box"><Icon name="check" /><div><small>LATEST DECISION</small><b>Policy satisfied</b></div></div></div>
        </div>
      </div>
    </div>
    <div className="preview-cta"><Button href="/console">Enter Security Console <Icon name="arrow" /></Button><small>Gateway to the product workspace</small></div>
  </section>;
}

function Philosophy() {
  const principles = ["Least privilege", "Explicit authorization", "Human oversight", "Observable decisions", "Evidence-based testing", "Reasoning / execution separation"];
  return <section className="section philosophy" id="about">
    <div><SectionHeading eyebrow="PROJECT PHILOSOPHY / 08" title={<>Built to Explore a <span>Hard Problem.</span></>} /><p className="philosophy-lead">MCP Sentinel is an engineering project focused on a practical question: how can tool-connected AI systems remain useful while their authority stays independently governed?</p><div className="disclaimer"><Icon name="scan" /><p><b>Prototype scope</b>The fintech ledger and operational data shown here are simulated. Production use would require additional threat modeling, security validation, and operational controls.</p></div></div>
    <div className="principles">{principles.map((p, i) => <div key={p}><span>0{i + 1}</span><b>{p}</b><Icon name="arrow" /></div>)}</div>
  </section>;
}

function Footer() {
  return <footer><div className="footer-main"><div><Logo /><p>An independent runtime security layer for exploring safer tool-connected AI workflows.</p></div><div><span>EXPLORE</span><a href="#pipeline">Platform</a><a href="#architecture">Architecture</a><a href="#research">Research</a></div><div><span>PRODUCT</span><a href="#preview">Product preview</a><a href="/console">Security console</a><a href="#top">Return to top</a></div><div className="footer-status"><span><i /> PROTOTYPE</span><p>Research and demonstration environment. No real financial operations.</p></div></div><div className="footer-bottom"><span>© {new Date().getFullYear()} MCP Sentinel</span><span>AI agents propose. Security decides.</span></div></footer>;
}

function ConsoleGateway() {
  return <main className="console-gateway"><div className="gateway-grid" /><Logo /><div className="gateway-card"><span className="eyebrow"><i />CONSOLE DESTINATION</span><div className="gateway-shield"><Icon name="shield" size={54} /><Icon name="lock" size={24} /></div><h1>Security Console</h1><p>This route is reserved as the stable gateway to the MCP Sentinel application dashboard. The current deliverable focuses on the public landing experience.</p><div className="button-row"><Button href="/">Return to landing page</Button><Button variant="secondary" href="/#preview">View product preview</Button></div></div></main>;
}

function App() {
  const heroRef = useRef<HTMLElement>(null);
  if (window.location.pathname === "/console") return <ConsoleGateway />;
  return <div className="app" id="top">
    <Navigation />
    <main>
      <section className="hero" ref={heroRef}>
        <div className="hero-grid" /><div className="hero-glow" />
        <div className="hero-copy"><span className="eyebrow"><i />AI AGENT RUNTIME SECURITY</span><h1>Let AI Move Fast.<br />Make Every Action <span>Earn Trust.</span></h1><p>MCP Sentinel adds a security layer between AI agents and the tools they use. Inspect requests, evaluate permissions, gate sensitive actions, and maintain a traceable security record.</p><div className="button-row"><Button href="/console">Enter Security Console <Icon name="arrow" /></Button><Button variant="secondary" href="#architecture">Explore the Architecture</Button></div><small className="supporting"><i /> PROTOTYPE ENVIRONMENT <span>Built for secure, tool-connected AI workflows.</span></small></div>
        <HeroShield />
        <div className="hero-foot"><span>SCROLL TO EXPLORE</span><i /><div><b>IDENTITY</b><b>POLICY</b><b>APPROVAL</b><b>AUDIT</b></div></div>
      </section>
      <Pipeline /><Problem /><Capabilities /><Architecture /><Scenarios /><Developer /><ProductPreview /><Philosophy />
      <section className="final-cta"><div className="final-orbit orbit-one" /><div className="final-orbit orbit-two" /><div className="final-shield"><Icon name="shield" size={110} /><span /></div><span className="eyebrow"><i />THE AUTHORITY TO VERIFY</span><h2>Give AI the Freedom to Act.<br /><span>Keep the Authority to Verify.</span></h2><p>Explore how runtime identity, authorization policies, approval workflows, and auditability can help make tool-connected AI systems safer to operate.</p><div className="button-row"><Button href="/console">Enter MCP Sentinel <Icon name="arrow" /></Button><Button variant="secondary" href="#architecture">Explore the Architecture</Button></div></section>
    </main>
    <Footer />
  </div>;
}

export default App;
