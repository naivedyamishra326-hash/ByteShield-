# MCP Sentinel / ByteShield — Bug Audit Report

> **Auditor**: Antigravity Senior Engineering Agent  
> **Date**: 2026-10-15  
> **Scope**: Repository A (`ByteShield-`) — full frontend codebase (`src/`)  
> **Reference**: Repository B (`Hackathon-Project`) — backend API (`apps/api/src/index.ts`)  
> **Build status**: ✅ `vite build` passes (exit 0), ✅ Dev server on port 8443 returns HTTP 200

---

## Summary

| Severity | Count |
|:---------|:-----:|
| 🔴 Critical (data loss / broken feature) | 3 |
| 🟠 High (functional defect) | 5 |
| 🟡 Medium (UX / logic) | 6 |
| 🔵 Low (style / polish) | 4 |
| **Total confirmed bugs** | **18** |

---

## 🔴 Critical Bugs

### BUG-001: Chat messages never persisted to localStorage (data loss)

| Field | Value |
|:------|:------|
| **File** | [SecurityConsole.tsx](file:///c:/Users/mishr/Downloads/Cybersecurity%20Landing%20Page%20Design/src/console/SecurityConsole.tsx#L312-L328) |
| **Severity** | 🔴 Critical |
| **Category** | Data Loss / State Management |

**Evidence**: The `messages` state is initialized from `localStorage.getItem(LOCAL_STORAGE_KEY)` at L316, and `localStorage.removeItem(LOCAL_STORAGE_KEY)` is called during reset at L909. However, there is **no `localStorage.setItem()` call anywhere** in the entire file. Messages are **read but never written**.

**Root Cause**: The persistence write-back effect (`useEffect` syncing `messages` → localStorage) was either never implemented or was accidentally removed.

**Impact**: If a user sends several chat messages, navigates away from the console, and returns, all messages are lost. The `LOCAL_STORAGE_KEY` value (`"sentinel-demo-v1"`) suggests persistence was an intentional feature.

**Fix**: Add a `useEffect` that writes messages to localStorage whenever they change:
```tsx
useEffect(() => {
  try {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify({ messages }))
  } catch {}
}, [messages])
```

---

### BUG-002: Chat log does not auto-scroll to latest message

| Field | Value |
|:------|:------|
| **File** | [SecurityConsole.tsx](file:///c:/Users/mishr/Downloads/Cybersecurity%20Landing%20Page%20Design/src/console/SecurityConsole.tsx#L345) |
| **Severity** | 🔴 Critical |
| **Category** | Broken UX / Chat Feature |

**Evidence**: `chatLogRef` is declared (`useRef<HTMLDivElement>(null)`) at L345 and attached to the chat log container at L1734 (`ref={chatLogRef}`), but is **never used for scrolling**. No `scrollIntoView`, `scrollTop`, or similar call exists anywhere in the component.

**Root Cause**: The auto-scroll logic was not implemented after the ref was created.

**Impact**: When the chat grows longer than the visible area, new messages appear below the fold. Users must manually scroll down after every sent/received message — a severe UX regression for a chat interface.

**Fix**: Add a `useEffect` dependent on `messages`:
```tsx
useEffect(() => {
  if (chatLogRef.current) {
    chatLogRef.current.scrollTop = chatLogRef.current.scrollHeight
  }
}, [messages, chatLoading])
```

---

### BUG-003: All data loaders fire on every view change (unnecessary API bombardment)

| Field | Value |
|:------|:------|
| **File** | [SecurityConsole.tsx](file:///c:/Users/mishr/Downloads/Cybersecurity%20Landing%20Page%20Design/src/console/SecurityConsole.tsx#L496-L516) |
| **Severity** | 🔴 Critical |
| **Category** | Performance / Backend Overload |

**Evidence**: The `useEffect` at L496 calls **all seven data loaders** (`loadOverviewData`, `loadAccountsData`, `loadMonitorData`, `loadIncidentsData`, `loadPoliciesData`, `loadIdentityData`, `loadFinanceStatus`) on **every** dependency change including `isLiveBackend` and `selectedAccountId`. There is no conditional logic to load only the data relevant to the current view.

**Root Cause**: The effect does not check `activeRoute` before deciding which loaders to invoke. All seven loaders (≈14+ API requests via `Promise.all`) fire simultaneously regardless of which page the user is viewing.

**Impact**: Every navigation to a console sub-route triggers ~14 parallel API calls to the backend. Combined with the 10-second health poll interval and SSE stream, this creates an API storm that is particularly problematic when the backend is actually connected.

**Fix**: Conditionally invoke loaders based on `activeRoute`:
```tsx
useEffect(() => {
  if (!isLiveBackend) return
  loadOverviewData() // lightweight, always useful
  if (activeRoute === "/accounts") loadAccountsData(selectedAccountId)
  if (activeRoute === "/monitor") loadMonitorData()
  if (activeRoute === "/incidents") loadIncidentsData()
  if (activeRoute === "/policies") loadPoliciesData()
  if (activeRoute === "/identity") loadIdentityData()
  if (activeRoute === "/finance") loadFinanceStatus()
}, [isLiveBackend, activeRoute, selectedAccountId, /* ...callbacks */])
```

---

## 🟠 High Severity Bugs

### BUG-004: Philosophy disclaimer has missing space between bold text and sentence

| Field | Value |
|:------|:------|
| **File** | [Philosophy.tsx](file:///c:/Users/mishr/Downloads/Cybersecurity%20Landing%20Page%20Design/src/components/Philosophy.tsx#L39) |
| **Severity** | 🟠 High |
| **Category** | Content / Rendering |

**Evidence**: Line 39 reads:
```tsx
<b>Prototype scope</b>The fintech ledger and operational data shown
```
The closing `</b>` is immediately followed by "The" with **no space or punctuation** between them.

**Rendered result**: "**Prototype scope**The fintech ledger…" — words run together.

**Fix**: Add a separating dash and space:
```tsx
<b>Prototype scope</b> — The fintech ledger and operational data shown
```

---

### BUG-005: ProductPreview sidebar has 6 icons but only 5 tabs (off-by-one)

| Field | Value |
|:------|:------|
| **File** | [ProductPreview.tsx](file:///c:/Users/mishr/Downloads/Cybersecurity%20Landing%20Page%20Design/src/components/ProductPreview.tsx#L7-L104) |
| **Severity** | 🟠 High |
| **Category** | Logic / UI Mismatch |

**Evidence**: The `previews` array has 5 entries: `["Overview", "Finance", "Monitor", "Attack Lab", "Audit"]` (L7–13). The sidebar renders 6 icons (indices 0–5) at L90: `{[0, 1, 2, 3, 4, 5].map(…)}` with `iconNames` including `"policy"`. The `active` state comparison at L100 (`i === active`) will never highlight index 5 because `active` can only be 0–4.

**Impact**: A phantom 6th icon appears in the sidebar that can never be selected and serves no purpose.

**Fix**: Either add a 6th tab ("Policies") to `previews`, or reduce the sidebar to 5 icons:
```tsx
{[0, 1, 2, 3, 4].map((i) => {
  const iconNames: IconName[] = ["grid", "spark", "eye", "scan", "audit"]
  // ...
})}
```

---

### BUG-006: Account data not re-fetched when `selectedAccountId` changes independently

| Field | Value |
|:------|:------|
| **File** | [SecurityConsole.tsx](file:///c:/Users/mishr/Downloads/Cybersecurity%20Landing%20Page%20Design/src/console/SecurityConsole.tsx#L391-L415) |
| **Severity** | 🟠 High |
| **Category** | Data Staleness |

**Evidence**: When a user clicks a different account button (L1609: `onClick={() => setSelectedAccountId(acc.id)}`), the `selectedAccountId` state changes. The main data loading effect at L496 does include `selectedAccountId` in its dependency array, but calls **all** loaders, not just `loadAccountsData`. More critically, if `isLiveBackend` is false, the effect exits early and the selected account changes visually in the switcher but the displayed balance, transactions, and analytics remain from the previous account.

**Fix**: Add a dedicated effect for account switching:
```tsx
useEffect(() => {
  if (isLiveBackend) loadAccountsData(selectedAccountId)
}, [selectedAccountId, isLiveBackend, loadAccountsData])
```

---

### BUG-007: `fetchJSON` sets `Content-Type: application/json` on GET requests

| Field | Value |
|:------|:------|
| **File** | [client.ts](file:///c:/Users/mishr/Downloads/Cybersecurity%20Landing%20Page%20Design/src/api/client.ts#L30-L35) |
| **Severity** | 🟠 High |
| **Category** | HTTP Protocol |

**Evidence**: The `fetchJSON` function unconditionally sets `Content-Type: application/json` on **all** requests including GETs. Per HTTP/1.1 semantics, a `Content-Type` header on a GET request with no body is meaningless and some strict proxies/WAFs may reject it.

**Fix**: Only set `Content-Type` when there is a body:
```tsx
const headers: Record<string, string> = { Accept: "application/json" }
if (options?.body) headers["Content-Type"] = "application/json"
```

---

### BUG-008: ConsoleGateway "View product preview" won't scroll to `#preview` section

| Field | Value |
|:------|:------|
| **File** | [ConsoleGateway.tsx](file:///c:/Users/mishr/Downloads/Cybersecurity%20Landing%20Page%20Design/src/components/ConsoleGateway.tsx#L72), [App.tsx](file:///c:/Users/mishr/Downloads/Cybersecurity%20Landing%20Page%20Design/src/App.tsx#L108-L124) |
| **Severity** | 🟠 High |
| **Category** | Navigation / Routing |

**Evidence**: The "View product preview" button calls `handleNavigate("/#preview", e)`. In `App.tsx`, the `navigate` function splits on `#` and uses `setTimeout(…, 100)` to scroll to `#preview`. When coming from the ConsoleGateway, the entire landing page component tree must **mount first** (React AnimatePresence renders a new component). The 100ms timeout is likely insufficient — the `#preview` element doesn't exist yet.

**Impact**: User clicks "View product preview" but lands at the top of the landing page.

**Fix**: Use a retry approach:
```tsx
const scrollToHash = (hash: string, retries = 10) => {
  const el = document.getElementById(hash)
  if (el) el.scrollIntoView({ behavior: "smooth" })
  else if (retries > 0) setTimeout(() => scrollToHash(hash, retries - 1), 100)
}
```

---

## 🟡 Medium Severity Bugs

### BUG-009: Monitor "Visible events" metric shows stale default count when live backend has 0 events

| Field | Value |
|:------|:------|
| **File** | [SecurityConsole.tsx](file:///c:/Users/mishr/Downloads/Cybersecurity%20Landing%20Page%20Design/src/console/SecurityConsole.tsx#L2048) |
| **Severity** | 🟡 Medium |

**Evidence**: `{liveEvents.length || defaultEvents.length}` — if backend is connected but has 0 events, `liveEvents.length` is `0` (falsy), and falls through to `defaultEvents.length` (5).

**Fix**: `{isLiveBackend ? liveEvents.length : defaultEvents.length}`

---

### BUG-010: Global search input captures state but never filters anything

| Field | Value |
|:------|:------|
| **File** | [SecurityConsole.tsx](file:///c:/Users/mishr/Downloads/Cybersecurity%20Landing%20Page%20Design/src/console/SecurityConsole.tsx#L338) |
| **Severity** | 🟡 Medium |

**Evidence**: `globalSearch` state is bound to the topbar search input but no view references it for filtering. Users type and nothing happens.

---

### BUG-011: `eventSearch` and `eventFilter` states declared but never used

| Field | Value |
|:------|:------|
| **File** | [SecurityConsole.tsx](file:///c:/Users/mishr/Downloads/Cybersecurity%20Landing%20Page%20Design/src/console/SecurityConsole.tsx#L336-L337) |
| **Severity** | 🟡 Medium |

**Evidence**: `eventSearch` and `eventFilter` are declared but never bound to any input or used in any filter logic. Dead state.

---

### BUG-012: `loadPoliciesData` depends on `selectedPolicyFile` which it also sets (potential loop)

| Field | Value |
|:------|:------|
| **File** | [SecurityConsole.tsx](file:///c:/Users/mishr/Downloads/Cybersecurity%20Landing%20Page%20Design/src/console/SecurityConsole.tsx#L439-L451) |
| **Severity** | 🟡 Medium |

**Evidence**: `loadPoliciesData` (L439) depends on `selectedPolicyFile` in its `useCallback` dependency (L451) but calls `setSelectedPolicyFile(active.name)` at L445. If names mismatch, the callback identity changes, causing re-invocation.

---

### BUG-013: Identity, Incidents, and Policies views render blank when backend is offline

| Field | Value |
|:------|:------|
| **File** | [SecurityConsole.tsx](file:///c:/Users/mishr/Downloads/Cybersecurity%20Landing%20Page%20Design/src/console/SecurityConsole.tsx#L2328-L2393) |
| **Severity** | 🟡 Medium |

**Evidence**: These views map over empty arrays with no fallback data and no empty-state message. Other views (Overview, Accounts) have hardcoded sample data. These three render completely blank.

---

### BUG-014: `toastTimerRef` uses `number` type but mixes `setTimeout`/`clearTimeout` namespaces

| Field | Value |
|:------|:------|
| **File** | [SecurityConsole.tsx](file:///c:/Users/mishr/Downloads/Cybersecurity%20Landing%20Page%20Design/src/console/SecurityConsole.tsx#L344-L350) |
| **Severity** | 🟡 Medium |

**Evidence**: Uses `window.setTimeout` (returns `number`) but unqualified `clearTimeout` (expects `NodeJS.Timeout`). Can cause type-check failures in strict TS configs.

---

## 🔵 Low Severity Bugs

### BUG-015: Footer "Research" link points to `#research` — no matching element exists

| Field | Value |
|:------|:------|
| **File** | [Footer.tsx](file:///c:/Users/mishr/Downloads/Cybersecurity%20Landing%20Page%20Design/src/components/Footer.tsx#L33) |
| **Severity** | 🔵 Low |

**Fix**: Change to `#about` (the Philosophy section has `id="about"`).

---

### BUG-016: Console mobile menu has no backdrop click-to-close

| Field | Value |
|:------|:------|
| **File** | [SecurityConsole.tsx](file:///c:/Users/mishr/Downloads/Cybersecurity%20Landing%20Page%20Design/src/console/SecurityConsole.tsx#L1065) |
| **Severity** | 🔵 Low |

---

### BUG-017: `Hero` section `id="top"` is on the App wrapper, not the Hero component (fragile)

| Field | Value |
|:------|:------|
| **File** | [App.tsx](file:///c:/Users/mishr/Downloads/Cybersecurity%20Landing%20Page%20Design/src/App.tsx#L152), [Footer.tsx](file:///c:/Users/mishr/Downloads/Cybersecurity%20Landing%20Page%20Design/src/components/Footer.tsx#L42) |
| **Severity** | 🔵 Low |

---

### BUG-018: `ConsoleGateway` component exists but is never imported or rendered

| Field | Value |
|:------|:------|
| **File** | [ConsoleGateway.tsx](file:///c:/Users/mishr/Downloads/Cybersecurity%20Landing%20Page%20Design/src/components/ConsoleGateway.tsx) |
| **Severity** | 🔵 Low |
| **Category** | Dead Code |

---

## Architectural Observations (Non-Bug)

1. **Monolithic SecurityConsole**: At 2,751 lines, `SecurityConsole.tsx` is a single component handling 10 views and 30+ state variables. The reference project splits this into separate page components.

2. **Dual icon systems**: Landing page uses `Icon` from `Common.tsx`; console uses inline `renderIcon()`. These should be unified.

3. **No error boundaries**: An uncaught error in any component crashes the entire application.

4. **No per-route `<title>` updates**: Console sub-routes don't update `document.title`.

---

## Next Steps

> [!IMPORTANT]
> Click **Proceed** below to begin implementing fixes, starting with the 3 Critical bugs.

1. Create branch: `git checkout -b claude/byteshield-bugfixes`
2. Fix Critical bugs (BUG-001 → BUG-003)
3. Fix High bugs (BUG-004 → BUG-008)
4. Fix Medium bugs (BUG-009 → BUG-014)
5. Fix Low bugs (BUG-015 → BUG-018)
6. Verify via `npm run build` and browser testing
