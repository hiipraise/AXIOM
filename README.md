# AXIOM — AI CV / Resume Generator

<p align="center">
  <img src="https://img.shields.io/badge/license-MIT-yellow" alt="License: MIT" />
  <img src="https://img.shields.io/badge/python-3.10%2B-blue" alt="Python 3.10+" />
  <img src="https://img.shields.io/badge/react-18-blue" alt="React 18" />
  <img src="https://img.shields.io/badge/typescript-5-blue" alt="TypeScript 5" />
  <img src="https://img.shields.io/badge/FastAPI-✓-009688" alt="FastAPI" />
  <img src="https://img.shields.io/badge/MongoDB-✓-47A248" alt="MongoDB" />
  <img src="https://img.shields.io/badge/PRs-welcome-brightgreen" alt="PRs Welcome" />
</p>

Zero-cliché, ATS-safe, AI-powered CV generator with job search and interview preparation.

## Stack
- **Frontend**: React + TypeScript + Tailwind CSS (Vite)
- **Backend**: Python + FastAPI
- **Database**: MongoDB
- **AI**: Groq (Groq API + configurable model)
- **PDF**: ReportLab + QR code verification
- **Auth**: HTTP-only cookie JWT session (browser) + optional bearer token for mobile/non-cookie clients

---

## Quick Start

### 1. Clone and configure
```bash
cp .env.example .env
# Edit .env — set GROQ_API_KEY at minimum
```

### 2. Run with Docker Compose
```bash
docker-compose up --build
```

- Frontend: http://localhost:5173
- Backend API: http://localhost:8000
- API Docs: http://localhost:8000/docs

### 3. First login
Super admin is created automatically on first boot:
- **Username**: `hiipraise`
- **Password**: `password123`
- You will be prompted to change your password on first login.

---

## Local Development (without Docker)

### Backend
```bash
cd backend
python -m venv venv
venv\Scripts\activate
pip install -r requirements.txt
cp ../.env.example .env    # fill in values
uvicorn main:app --reload --port 8000
```

### Frontend
```bash
cd frontend
npm install
npm run dev
```

---

## Environment Variables

Settings are loaded from `.env` (Pydantic settings). Key variables:

| Variable | Description |
|---|---|
| `ENV` | `development` or `production` |
| `MONGO_URL` | MongoDB connection string |
| `JWT_SECRET` | JWT signing secret (must be set explicitly for stable sessions in production) |
| `GROQ_API_KEY` | Groq API key (required for AI features) |
| `GROQ_MODEL` | Groq model name |
| `FRONTEND_URL` | Base URL used for public/QR links in PDFs |
| `ALLOWED_ORIGINS` | Comma-separated CORS origins (or `*`) |
| `ADMIN_USERNAME` | Initial super admin username |
| `ADMIN_EMAIL` | Initial super admin email |
| `ADMIN_PASSWORD` | Initial super admin password |
| `ADZUNA_APP_ID` / `ADZUNA_APP_KEY` | Job provider keys (if enabled) |
| `RAPIDAPI_KEY` / `RAPIDAPI_HOST` | Job provider keys (if enabled) |


---

## Features

### CV Builder
- 10 structured sections: Personal Info, Summary, Skills, Experience, Education, Certifications, Projects, Awards, Languages, Volunteer
- AI interview mode — answer questions, AI builds the structure
- Import existing PDF CV — extracted and converted to editable JSON
- AI Assist panel: chat, apply edits, align to job description
- Theme selector: Minimal, Classic, Sharp
- 1–3 page length control
- Version history (auto-saved on every update)
- PDF download with QR verification code
- Public / private visibility toggle

### Zero-Cliché Policy
The AI is instructed to **never** use: versatile, passionate, dynamic, modern, scalable, specialize, streamline, leveraged, results-driven, team player, detail-oriented, innovative, synergy, cutting-edge, or similar filler language.

### Cover Letters
- AI-generated tailored cover letters
- Match CV content to job requirements
- Tone and style customization

### Job Search
- Search live jobs from multiple external APIs
- Match CV to job postings with AI
- Save jobs for later

### Account System
- Username + password only registration (no email required)
- Optional email + secret question for account recovery
- No localStorage — token stored in memory only
- Delete account button wipes all data immediately
- Session-only mode for unregistered users
- Feedback widget for user feedback collection

### Admin Panel (`/admin`)
- Dashboard with platform stats
- User management (roles, activate/deactivate, delete)
- CV browser
- Ratings analytics with score distribution

---

## Project Structure

```
axiom/
├── backend/
│   ├── main.py
│   ├── requirements.txt
│   ├── Dockerfile
│   ├── ruff.toml
│   ├── mongo-init.js
│   └── app/
│       ├── __init__.py
│       ├── config.py
│       ├── database.py
│       ├── limiter.py
│       ├── middleware/
│       │   ├── __init__.py
│       │   ├── auth.py
│       │   ├── security_headers.py
│       │   └── validation.py
│       ├── models/
│       │   └── schemas.py
│       ├── prompts/
│       │   ├── __init__.py
│       │   ├── cover_letter.py
│       │   ├── cv_generation.py
│       │   ├── interview.py
│       │   └── review.py
│       ├── routers/
│       │   ├── __init__.py
│       │   ├── admin.py
│       │   ├── analytics.py
│       │   ├── announcements.py
│       │   ├── auth.py
│       │   ├── cv.py
│       │   ├── export.py
│       │   ├── feedback.py
│       │   ├── comments.py
│       │   ├── email.py
│       │   ├── interview.py
│       │   ├── jobs.py
│       │   ├── notifications.py
│       │   ├── public.py
│       │   └── search.py
│       ├── services/
│       │   ├── __init__.py
│       │   ├── ai_prompts.py
│       │   ├── ai_service.py
│       │   ├── ats_service.py
│       │   ├── auth_service.py
│       │   ├── docx_export.py
│       │   ├── html_pdf.py
│       │   ├── job_service.py
│       │   ├── notification_service.py
│       │   └── pdf_service.py
│       └── utils/
│           ├── __init__.py
│           └── errors.py
├── frontend/
│   ├── src/
│   │   ├── App.tsx
│   │   ├── main.tsx
│   │   ├── index.css
│   │   ├── api/
│   │   │   └── index.ts
│   │   ├── components/
│   │   │   ├── UI/
│   │   │   │   └── Badge.tsx
│   │   │   ├── cv/
│   │   │   │   ├── AIAssistPanel.tsx
│   │   │   │   ├── ATSPreviewModal.tsx
│   │   │   │   ├── AwardsSection.tsx
│   │   │   │   ├── BulletOptimizer.tsx
│   │   │   │   ├── CertificationsSection.tsx
│   │   │   │   ├── CVContextSelector.tsx
│   │   │   │   ├── CVPreview.tsx
│   │   │   │   ├── CVRenderer.tsx
│   │   │   │   ├── CVReviewPanel.tsx
│   │   │   │   ├── CVScaleWrapper.tsx
│   │   │   │   ├── DiffViewer.tsx
│   │   │   │   ├���─ EducationSection.tsx
│   │   │   │   ├── ExperienceSection.tsx
│   │   │   │   ├── HistoryDrawer.tsx
│   │   │   │   ├── LanguagesSection.tsx
│   │   │   │   ├── PersonalInfoSection.tsx
│   │   │   │   ├── ProjectsSection.tsx
│   │   │   │   ├── SkillGapEngine.tsx
│   │   │   │   ├── SkillsSection.tsx
│   │   │   │   ├── SummarySection.tsx
│   │   │   │   ├── TargetingSection.tsx
│   │   │   │   ├── VolunteerSection.tsx
│   │   │   │   └── templates/
│   │   │   ├── interview/
│   │   │   │   ├── InterviewStageSelector.tsx
│   │   │   │   ├── JitsiRoom.tsx
│   │   │   │   ├── MediaControls.tsx
│   │   │   │   ├── QuestionPlayer.tsx
│   │   │   │   ├── SelfRecordingPanel.tsx
│   │   │   │   ├── VoiceCapturePanel.tsx
│   │   │   │   └── VoiceModeToggle.tsx
│   │   │   ├── jobs/
│   │   │   │   ├── ApplyModal.tsx
│   │   │   │   ├── AxiomJobCard.tsx
│   │   │   │   ├── CoverLetterModal.tsx
│   │   │   │   ├── JobCard.tsx
│   │   │   │   └── ShareJobModal.tsx
│   │   │   ├── landing/
│   │   │   │   ├── CTASection.tsx
│   │   │   │   ├── ExploreTeaserSection.tsx
│   │   │   │   ├── FeaturesSection.tsx
│   │   │   │   ├── Footer.tsx
│   │   │   │   ├── Hero.tsx
│   │   │   │   ├── HowItWorksSection.tsx
│   │   │   │   ├── JobsTeaserSection.tsx
│   │   │   │   ├── Logo.tsx
│   │   │   │   └── Navbar.tsx
│   │   │   ├── admin/
│   │   │   │   ├── AdminLayout.tsx
│   │   │   │   └── useAnalytics.ts
│   │   │   ├── recruiter/
│   │   │   │   ├── CvSnapshotModal.tsx
│   │   │   ├── Layout.tsx
│   │   │   ├── Talents.tsx
│   │   │   │   └── Dashboard.tsx
│   │   │   ├── notifications/
│   │   │   ├── feedback/
│   │   │   ├── layout/
│   │   │   └── landing/
│   │   ├── context/
│   │   │   ├── announcement.tsx
│   │   │   └── cv.ts
│   │   ├── hooks/
│   │   │   ├── useAISpeaker.ts
│   │   │   ├── useInterviewMedia.ts
│   │   │   ├── useInterviewTimer.ts
│   │   │   ├── useJitsi.ts
│   │   │   ├── usePrintCV.ts
│   │   │   ├── useScrollRestoration.ts
│   │   │   ├── useSmartBack.ts
│   │   │   ├── useVoiceCapture.ts
│   │   │   ├── useScrollRestoration.ts
│   │   │   └── useSmartBack.ts
│   │   ├── lib/
│   │   │   ├── cvContext.ts
│   │   │   ├── cvTemplateRegistry.ts
│   │   │   ├── cvThemes.ts
│   │   │   └── queryClient.ts
│   │   ├── pages/
│   │   │   ├── LandingPage.tsx
│   │   │   ├── auth/
│   │   │   ├── cv/
│   │   │   ├── dashboard/
│   │   │   ├── interview/
│   │   │   ├── jobs/
│   │   │   ├── public/
│   │   │   ├── admin/
│   │   │   └── recruiter/
│   │   ├── store/
│   │   │   ├── auth.ts
│   │   │   └── cvUndo.ts
│   │   ├── types/
│   │   │   └── index.ts
│   │   └── utils/
│   │       └── renderCVtoHTML.ts
│   ├── package.json
│   └── Dockerfile
├── docker-compose.yml
├── .env.example
├── .gitignore
├── .pre-commit-config.yaml
├── LICENSE
├── package.json
├── package-lock.json
└── README.md
```

---

## API Reference

Full interactive API docs available at `/docs` when the backend is running.

### Auth
- `POST /api/auth/register`
- `POST /api/auth/login`
- `POST /api/auth/logout`
- `GET /api/auth/me`
- `PUT /api/auth/change-password`
- `PUT /api/auth/update-profile`
- `POST /api/auth/forgot-username`
- `POST /api/auth/recover-account`
- `DELETE /api/auth/delete-account`

### CV
- `GET /api/cv` — list your CVs
- `POST /api/cv` — create a CV
- `GET /api/cv/{cv_id}` — get a CV (owner-only unless it's public)
- `PUT /api/cv/{cv_id}` — update (auto-saves history)
- `DELETE /api/cv/{cv_id}` — delete
- `POST /api/cv/{cv_id}/duplicate`
- `GET /api/cv/{cv_id}/history` — latest snapshots
- `GET /api/cv/{cv_id}/analytics`
- `POST /api/cv/{cv_id}/analytics`

### AI (CV)
All require auth.
- `POST /api/cv/ai/chat`
- `POST /api/cv/ai/generate-summary`
- `POST /api/cv/ai/edit`
- `POST /api/cv/ai/match-job`
- `POST /api/cv/ai/interview`
- `POST /api/cv/ai/review`
- `POST /api/cv/ai/optimize-bullets`
- `POST /api/cv/ai/keyword-gap`
- `POST /api/cv/upload-cv` — upload PDF, returns extracted CV JSON

### Cover Letters
- `POST /api/jobs/cover-letter` — generate AI cover letter for a job
- `POST /api/jobs/cover-letter/preview`

### Export / PDF
- `GET /api/export/pdf/{cv_id}`
- `GET /api/export/public-pdf/{username}/{slug}`
- `POST /api/export/pdf-preview`
- `POST /api/export/html-pdf`
- `GET /api/export/docx/{cv_id}` — export as DOCX

### Public

- `GET /api/public/feed` — paginated public CV feed
- `GET /api/public/cv/{username}/{slug}` — view a public CV (JSON)
- `GET /api/public/profile/{username}` — public profile + public CVs
- `GET /api/public/sitemap.xml`

### Job Search
- `GET /api/jobs/search`
- `POST /api/jobs/match-cv`
- `GET /api/jobs/saved`
- `POST /api/jobs/saved/{job_id}`
- `DELETE /api/jobs/saved/{job_id}`
- `GET /api/jobs/{job_id}`

### Interview
- `POST /api/interview/start` — start a new interview session
- `POST /api/interview/answer` — submit an answer
- `GET /api/interview/sessions` — list your sessions
- `GET /api/interview/sessions/{id}` — session detail with messages

### Search
- `GET /api/search/candidates` — search public CVs
- `GET /api/search/jobs` — search jobs

### Feedback
- `POST /api/feedback`
- `GET /api/feedback`

### Notifications
- `GET /api/notifications`
- `PUT /api/notifications/{notification_id}/read`
- `PUT /api/notifications/read-all`

### Announcements
- `GET /api/announcements/active`
- `GET /api/announcements`
- `POST /api/announcements`
- `PUT /api/announcements/{ann_id}/activate`
- `PUT /api/announcements/{ann_id}/deactivate`
- `DELETE /api/announcements/{ann_id}`

### Analytics (admin)
- `POST /api/analytics/event`
- `GET /api/analytics/overview`
- `GET /api/analytics/daily`
- `GET /api/analytics/top-pages`
- `GET /api/analytics/top-referrers`
- `GET /api/analytics/hourly`

---

## Security Notes

- Passwords hashed with bcrypt
- JWT tokens expire after 7 days
- No CV PDFs stored — generated on demand
- Only JSON CV data stored in MongoDB
- Public CVs include a QR code linking to the verified public profile
- No localStorage usage — token held in memory only

---

## License

MIT