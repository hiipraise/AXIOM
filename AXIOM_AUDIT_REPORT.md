# AXIOM Platform Audit Report

**Audit Date:** June 2026
**Auditor:** Senior Product Engineer & Full-Stack Engineer
**Platform:** AXIOM — AI CV/Resume Generator
**Version:** 1.0.0

---

## Executive Context

AXIOM is an AI-powered CV/resume generator designed to create truthful, ATS-safe, zero-cliché professional documents. The platform serves job seekers across experience levels (student to executive), includes AI-assisted editing, job matching, interview practice, and a employer job board with application tracking.

This audit examines the full platform including:
- Backend (FastAPI + MongoDB)
- Frontend (React + TypeScript + Tailwind)
- AI services (Groq integration)
- Job board and application tracking
- Interview practice system
- Employer/recruiter features
- Admin panel

---

## 1. Product Alignment

### 1.1 Core Vision Assessment

| Aspect | Status | Notes |
|--------|--------|-------|
| AI CV Generation | ✅ Core | Works as intended |
| Zero-Cliché Policy | ✅ Implemented | 40+ banned words in ai_prompts.py |
| ATS Safety | ⚠️ Partial | Basic compliance rules exist, but no ATS scoring/validation |
| Career Level Targeting | ✅ Implemented | 6 levels: student → executive |
| Industry Vertical Targeting | ✅ Implemented | 10 industries defined |
| Job Board | ⚠️ Dual | External API + internal AXIOM jobs creates confusion |
| Interview Practice | ✅ Solid | AI-powered with STAR coaching |

### 1.2 Disconnected Features

**1. Public CV Feed (`/explore`)**
- No clear value proposition for viewers
- No indication of how many people actually view public CVs
- Recruiter value unclear — why browse random CVs?

**2. Skill Gap Engine**
- Sophisticated backend (roadmap generation)
- Frontend access is buried/likely undiscoverable
- Not surfaced as a key feature

**3. Rating System**
- Self-rating only — no peer/community ratings
- What is the purpose? (No visible aggregation or social proof)

### 1.3 Missing for Product Promise

| Missing | Impact |
|---------|--------|
| No ATS simulator/preview | Can't test how CV parses |
| No export to Word/Docx | PDF-only limits usability |
| No bulk apply functionality | Single-application workflow |
| No referral/sharing analytics | No visibility into sharing success |
| No recruiter search API | Public CVs can't be discovered via search |

---

## 2. Feature Audit

| Feature | Status | Issues Found | Recommended Improvements | Priority |
|---------|--------|------------|----------------------|----------|
| CV Creation (10 sections) | ✅ Complete | No section reordering; no drag-drop | Add section reordering, keyboard shortcuts | Medium |
| AI Assist Chat | ✅ Complete | No conversation history persistence; rate limits aggressive | Persist chat context per session | Medium |
| AI Generate Summary | ✅ Complete | Sometimes generic; no style options | Add tone options (formal/impact/story) | Medium |
| AI Edit Section | ✅ Complete | No undo; no edit history | Add AI edit history with undo | High |
| AI Match to Job | ✅ Complete | No save of matches; fleeting analysis | Save match history per job | Medium |
| AI Review | ⚠️ Works | Scores may be inconsistent; no follow-up actions | Add actionable "fix one click" | High |
| AI Optimize Bullets | ⚠️ Works | Limited to one experience entry at a time | Bulk optimize option | Medium |
| Keyword Gap Analysis | ✅ Solid | Missing keyword trends visualization | Visual analytics dashboard | High |
| Skill Gap + Roadmap | ⚠️ Complete | Frontend is buried; no progress tracking | Surface in dashboard prominently | High |
| Import PDF CV | ⚠️ Partial | Limited to PDF; many formats fail extraction | Add DOCX, images, LinkedIn import | High |
| PDF Export | ✅ Complete | No Word export; no ATS-friendly HTML | Add DOCX, plain-text export | High |
| Theme Selection (8 themes) | ✅ Complete | No live preview while selecting | Live preview before save | Low |
| Version History | ✅ Complete | No diff view; no restore UI | Add diff view, one-click restore | Medium |
| Interview Practice (STAR) | ✅ Complete | No mobile audio input; no webcam practice | Add mobile-optimized recording | Medium |
| Live Interview (Jitsi) | ⚠️ Works | Jitsi login required; transcription quality varies | Jitsi embedded auth | Medium |
| External Job Search | ⚠️ Dual systems | Jobs API + AXIOM jobs creates confusion | Unified; hide external if sparse | Medium |
| AXIOM Job Board | ⚠️ Incomplete | Employer profile setup is complex; limited traffic | Employer onboarding flow | High |
| Application Tracker | ✅ Core exists | No calendar view; no remindFollow-up | Add calendar, email reminders | High |
| Cover Letter Generator | ✅ Complete | No templates; no save | Template selection, save drafts | Medium |
| Recruiter Talent Pools | ⚠️ Incomplete | No bulk actions; limited notes | Add bulk tag, notes fields | Medium |
| Admin Panel | ⚠️ Partial | Missing search on many pages; limited exports | Global search, CSV export | High |

---

## 3. User Experience (UX) Audit

### 3.1 Critical UX Issues

**Onboarding Friction**
- `/register` → No confirmation immediately shown
- No guided tour after first login
- No suggested first CV creation prompt with template
- Guest mode (`/guest`) exists but no clear entry point

**Navigation Problems**
- `/dashboard` shows "Career Command Center" but no tooltips
- Hamburger menu collapses many top-level items
- Admin routes are deep (`/admin/analytics` vs admin sidebar)
- No breadcrumb navigation on deep pages

**Information Architecture Issues**
- CV Editor: 10 sections but no progress indicator
- No persistent "where am I" indicator
- Settings scattered: `/account` + `/forgot` + inline edit
- Job search and AXIOM jobs appear as separate systems

**Cognitive Overload**
- Dashboard shows 6+ metrics without explanation
- Interview start asks 5+ configuration options
- CV new page has overwhelming section list
- Rating modal allows any 1-5 without guidance

### 3.2 Specific UX Friction Points

| Flow | Issue | Recommendation |
|------|-------|-------------|
| CV Editor | 10 sections at once, no guided order | Section wizard or progressive disclosure |
| AI Edit | No clear feedback that edit applied | Toast + subtle diff preview |
| Job Match | Results appear fleetingly | Save results + historical comparison |
| Interview | "use_star" toggle unclear meaning | Toggle with explanation tooltip |
| Public CV | No clear "for recruiters" framing | Add "shareable link for recruiters" CTA |
| Rating | Self-rating only — what's the point? | Clarify purpose or remove |

### 3.3 Missing UX Elements

- **Undo/redo**: No browser-level undo for form changes
- **Keyboard shortcuts**: None defined for CV editing
- **Search**: Global search across CVs, jobs, applications
- **Quick actions**: No keyboard shortcuts (Ctrl+S to save)
- **Empty states**: Some pages lack meaningful empty states
- **Loading states**: Some API delays not shown (silent failure)

---

## 4. User Interface (UI) Audit

### 4.1 Visual Design Review

**Color Usage**
- Primary: Ink (#1a1a1a) — good contrast
- Secondary: Amber for ratings/CTAs
- Purple (#a0449f) for interview readiness
- Consistent but limited palette — may feel stark

**Typography**
- Uses lucide-react icons — good consistency
- Font: Not explicitly defined in CSS
- Scale: Reasonable but tight — smaller on mobile

**Layout & Spacing**
- Tailwind-based: Consistent spacing scale
- Card-based: Good visual hierarchy
- Mobile: Responsive but cramped on smaller screens

### 4.2 UI Inconsistencies

| Issue | Details |
|-------|--------|
| Button styles | `btn-primary`, `btn-secondary`, `btn-ghost` — inconsistently applied |
| Card borders | Some with `border-ink/10`, some `border-ash-border` |
| Badges | Different styles in different contexts |
| Loading | Some `AppLoading`, some skeleton, some silent |
| Form validation | Inline error placement inconsistent |
| Icons | Mixed icon sets (lucide vs custom) |

### 4.3 Accessibility Concerns

- No ARIA labels on many interactive elements
- Color contrast: Amber icons may fail WCAG on ash-backgrounds
- Keyboard navigation incomplete in CV editor
- Focus states not consistently visible
- Screen reader testing not evident

### 4.4 Empty & Loading States

- CV list: Good empty state (create CTA)
- Job search results: "No jobs" state is weak
- Dashboard analytics: No meaningful empty states
- Error messages: Generic "something went wrong"

---

## 5. Engineering Audit

### 5.1 Architecture Assessment

**Strengths**
- Clean separation: routers, services, models
- FastAPI with Pydantic validation
- Motor async MongoDB driver
- JWT with HttpOnly cookies
- Rate limiting integrated
- Security headers middleware

**Concerns**

| Issue | Details |
|-------|--------|
| Token storage | sessionStorage (not HTTP-only for JS access) — contradicts some security goals |
| No API versioning | `/api/v1/` not used |
| Database indexes | Some missing compound indexes |
| No connection pooling config visible | Default Motor settings |
| Error handling | Inconsistent error types across routers |
| No request validation on some endpoints | Some endpoints skip validation |
| Singleton patterns | `get_db()` called on every request |

### 5.2 Scalability Issues

**Database**
- No read replicas configured
- No caching strategy for common queries
- Compound indexes missing on some queries
- No pagination on list endpoints (hardcoded limits)

**API**
- No API versioning
- No request batching
- No GraphQL for complex queries
- Rate limiting is global (not per-user)

**Frontend**
- No code splitting on route level
- Bundle size unknown (no analysis seen)
- No lazy loading visible
- React Query not fully utilized

### 5.3 Security Review

| Aspect | Status | Notes |
|--------|--------|-------|
| Password storage | ✅ bcrypt | Good |
| JWT expiration | ✅ 7 days | Could be shorter |
| HTTPS | ⚠️ conditional | Middleware added for prod only |
| CORS | ⚠️ permissive | `*` allowed in dev |
| Rate limiting | ✅ Applied | But not on all endpoints |
| XSS | ⚠️ depends on React | Sanitization unclear |
| CSRF | ✅ HttpOnly cookie | Good |
| SQL/NoSQL injection | ✅ Pydantic | Parameterized |
| Secret management | ⚠️ env files | No secret manager |

### 5.4 Technical Debt

| Debt | Impact |
|------|-------|
| No test files visible | High risk of regression |
| AI prompts in monolithic file | Hard to maintain prompts |
| Schema duplication | Backend + Frontend types drift risk |
| No linter config | Code quality inconsistent |
| No type checking in build | Type errors in prod possible |
| Error logging incomplete | Debugging is difficult |

### 5.5 Backend Code Issues

```python
# Example: Inconsistent error handling in cv.py
raise HTTPException(404, "CV not found")  # Some use detail= as kwarg
raise HTTPException(400, "Username already taken")  # Others use message
# Should be: HTTPException(status_code=404, detail="...")
```

```python
# ai_service.py: No error handling on LLM calls
response = await client.chat.completions.create(...)  # Can fail silently
# No retry logic, no fallback
```

```python
# database.py: Global state
client: AsyncIOMotorClient = None  # Module-level singleton
db = None  # Shared across requests
# No connection health checks
```

### 5.6 Frontend Code Issues

- **API layer**: Centralized but no request deduplication
- **State**: Zustand used, but React Query underutilized
- **Error boundaries**: None visible
- **No error boundaries**: One API error crashes component tree
- **Types**: Some `any` types remaining
- **No form library**: Manual form state management

---

## 6. Quality Assurance Audit

### 6.1 Potential Bugs

| Bug | Location | Severity |
|-----|----------|----------|
| Token not cleared on logout | auth.ts:clearAuth | Medium |
| Race condition in duplicate CV | cv.ts | Low |
| No validation on ObjectId | Multiple routes | High |
| CV history grows unbounded | cv.ts | Medium |
| Job cache never invalidates | jobs.py | High |
| Interview session never expires | interview.py | Medium |
| Ratings can be gamed | cv.ts | Low |

### 6.2 Missing Validation

| Missing | Risk |
|---------|------|
| CV data schema validation on save | Data corruption |
| Job ID format validation | 404 returns wrong error |
| Cover letter length limits | UI overflow |
| Upload file type verification | Security risk |
| Username length validation | DB constraint error |
| Duplicate application check | Data inconsistency |

### 6.3 Edge Cases Not Handled

- CV with 0 sections filled → still saves (allowed)
- Job search with special chars in query
- Very long cover letter generation
- Concurrent CV editing by same user
- Session expiry during interview
- Jitsi connection failure mid-session

---

## 7. User Journey Audit

### 7.1 Discovery

- Landing page exists: clean but value prop unclear
- SEO keywords not visible
- No clear CTA for what to do first
- Social proof absent (testimonials, usage numbers)

### 7.2 Signup Flow

1. Landing → /register (or /login)
2. Username + password only
3. Optional email (for recovery)
4. Login success
5. Redirect to dashboard — **no guidance**

**Issue**: No "create your first CV" wizard

### 7.3 Onboarding

- Dashboard shows "Career Command Center"
- Metrics unexplained
- No suggested actions
- CV list is empty with create CTA
- No templates suggested

**Issue**: High drop-off after registration

### 7.4 CV Creation Flow

1. /cv/new — enter title
2. 10 blank sections
3. Personal info required (first)
4. AI assist panel available
5. Save generates PDF preview option

**Issues**:
- Overwhelming blank canvas
- No section sorting
- No auto-save indicator
- No progress completion

### 7.5 Job Discovery → Application

1. Dashboard → Job widget OR /jobs OR /jobs/axiom
2. Search filters
3. Job details
4. "Match CV" (AI analysis)
5. Cover letter generation
6. Apply (external or AXIOM)
7. Tracker

**Issues**:
- Two job systems confusing
- No saved search
- No application drafting
- No follow-up reminders

### 7.6 Interview Practice

1. Start on dashboard or /interview
2. Select CV + optional job
3. Mode selection (behavioural/technical/full)
4. Questions (5-7)
5. AI feedback on each
6. Summary + scores

**Issues**:
- Configuration overwhelming
- No mobile optimization
- Results not linked to CV improvement

### 7.7 Retention Risks

| Moment | Drop-off Risk |
|--------|-------------|
| First login | High — no guidance |
| CV creation start | Medium — blank canvas |
| First AI edit | Low |
| Job search | Medium — duplicate systems confuse |
| Application | Low |
| Interview setup | High — complex config |

---

## 8. Competitive Analysis

### 8.1 Market Comparison

**Competitors**: EnhanceAI, Kickresume, Rezi, CV Compiler, Teal, Ring

| Feature | AXIOM | Competitors |
|---------|-------|-----------|
| AI editing | ✅ | ✅ |
| Job matching | ⚠️ Basic | ⚠️ Varies |
| Interview practice | ✅ Unique | ❌ Rare |
| Live interview | ✅ Unique | ❌ Rare |
| ATS preview | ❌ | ⚠️ Some |
| Word export | ❌ | ✅ |
| LinkedIn import | ❌ | ⚠️ Some |
| Job alerts | ❌ | ✅ |
| Application tracking | ⚠️ Basic | ⚠️ Varies |

### 8.2 Missing Competitive Features

| Gap | Why It Matters |
|-----|--------------|
| ATS Simulator | Users can't test parsing |
| LinkedIn Export | LinkedIn as backup |
| Job Alerts | Email reminders for matches |
| Team/Enterprise | No collaboration |
| Resume Builder | Word alternative |
| Cover Letter Templates | Faster creation |

### 8.3 Differentiators to Strengthen

- **Live Interview**: Unique, needs polish
- **Skill Gap Engine**: Unique, needs visibility
- **Employer Job Board**: Unique for freemium
- **Zero-Cliché**: Reputation builder

---

## 9. Growth & Retention

### 9.1 Activation Issues

- CV creation completion: No drop-off tracking
- First save: No celebratory feedback
- First export: Not highlighted

### 9.2 Engagement Gaps

- No completion streaks or gamification
- No weekly insights email
- No "profile strength" deeper explanation
- No suggestions for improvements

### 9.3 Retention Gaps

- No abandoned CV recovery
- No email for new jobs matching profile
- No check-in on interview improvement
- No re-engagement for returning users

### 9.4 Sharing Gaps

- No referral program visible
- No shareable public profile for recruiters
- No embeddable CV widget
- No social sharing

---

## 10. Product Gaps

### 10.1 High Impact / Low Effort

| Gap | Effort |
|-----|--------|
| Add "create first CV" wizard | Low |
| Global search across platform | Low |
| Keyboard shortcuts for CV editor | Low |
| Toast notifications for all actions | Low |
| Better empty states | Low |
| Add breadcrumbs | Low |

### 10.2 High Impact / Medium Effort

| Gap | Effort |
|-----|--------|
| ATS simulator/preview | Medium |
| Word export | Medium |
| Section drag-and-drop reordering | Medium |
| Interview mobile optimization | Medium |
| Global search | Medium |
| CV diff + restore | Medium |

### 10.3 High Impact / High Effort

| Gap | Effort |
|-----|--------|
| LinkedIn sync/import | High |
| ATS parser integration | High |
| Recruiter search API | High |
| Team/enterprise features | High |
| Mobile native apps | High |

### 10.4 What Should Be Removed

| Feature | Rationale |
|---------|----------|
| Public CV feed | Unclear value, no engagement |
| Self-rating system | No clear purpose |
| Guest CV editor | Finds nowhere |

### 10.5 What Should Be Merged

| Current | Proposed |
|---------|----------|
| /jobs (external) | Unified job search |
| /jobs/axiom | Same page, filter toggle |
| Rating modal | Merge with public profile |

---

## 11. Executive Summary

### Top 10 Issues

1. **No clear first-time user journey** — Drop-off likely high after signup
2. **CV editor is overwhelming** — 10 blank sections, no guidance
3. **Dual job systems** — User confusion between external/AXIOM jobs
4. **No ATS simulation** — Core promise "ATS-safe" untestable
5. **Interview configuration too complex** — 5+ options, unclear what to choose
6. **Missing global search** — Can't find anything across platform
7. **No undo/edit history in CV editor** — Can't revert changes
8. **Skill Gap Engine is invisible** — Powerful feature, no frontend visibility
9. **Public CV feed lacks purpose** — Unclear why recruiters would browse
10. **No Word export** — PDF-only limits real-world use

### Top 10 Opportunities

1. **Interview practice + ATS feedback loop** — Link interview performance to CV improvements
2. **Employer job board polishing** — Differentiate from Indeed/Monster
3. **Skill Gap → Learning roadmap** — Surface + track completion
4. **Recruiter search** — Let them find candidates
5. **Email drip campaigns** — Weekly tips + job matches
6. **Referral program** — Viral growth mechanism
7. **Team features** — Collaboration on CVs
8. **Word export** — Real-world usability
9. **LinkedIn sync** — Competitor feature to match
10. **Public profile for recruiters** — Clear value proposition

### Top 5 Quick Wins

1. Add "new user wizard" after first login
2. Add keyboard shortcus (Ctrl+S to save, Ctrl+Z undo)
3. Add breadcrumbs for deep navigation
4. Unify /jobs and /jobs/axiom with filter
5. Add toast feedback on every action

### Top 5 Engineering Improvements

1. Add unit/integration tests across API
2. Add request validation schemas consistently
3. Add error boundaries in React
4. Add API request logging
5. Add database query optimization

### Top 5 UX Improvements

1. Create first-CV wizard
2. Add breadcrumbs everywhere
3. Simplify interview start form
4. Unify job search experience
5. Add global search (Cmd+K)

### Top 5 UI Improvements

1. Define and document design tokens
2. Add loading skeletons vs spinners
3. Consistent error message placement
4. Better empty states
5. Color contrast audit

---

### Scores

| Category | Score | Notes |
|----------|-------|-------|
| **Product** | 68/100 | Solid core, experience gaps |
| **Engineering** | 72/100 | Good structure, debt present |
| **UX** | 58/100 | Core works, guidance gaps |
| **UI** | 75/100 | Consistent, refinements needed |
| **Market Readiness** | 62/100 | MVP ready, polish needed |

---

## Recommendations Summary

### Immediate (This Sprint)

1. ✅ Add first-login wizard
2. ✅ Add breadcrumbs
3. ✅ Add global search (Cmd+K)
4. ✅ Unify job search UI
5. ✅ Add toast feedback

### Next Quarter

1. ATS simulator preview
2. Word export
3. Interview simplified flow
4. Skill Gap Engine surface
5. Section reordering

### Long Term

1. Recruiter search API
2. LinkedIn integration
3. Team features
4. Mobile apps
5. ATS partnerships

---

*End of Audit Report*