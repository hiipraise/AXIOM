
# AXIOM — AI CV / Resume Generator

Zero-cliché, ATS-safe, AI-powered CV generator.

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
| `AXIOM_AUTO_APPROVE_RECRUITERS` | `true/false` — auto-approve recruiter company profiles |
| `JITSI_DOMAIN` | Jitsi domain (default: `meet.jit.si`) |
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

### Account System
- Username + password only registration (no email required)
- Optional email + secret question for account recovery
- No localStorage — token stored in memory only
- Delete account button wipes all data immediately
- Session-only mode for unregistered users

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
│   └── app/
│       ├── config.py
│       ├── database.py
│       ├── middleware/auth.py
│       ├── models/schemas.py
│       ├── routers/
│       │   ├── auth.py
│       │   ├── cv.py
│       │   ├── export.py
│       │   ├── admin.py
│       │   └── public.py
│       └── services/
│           ├── ai_service.py
│           ├── auth_service.py
│           └── pdf_service.py
├── frontend/
│   ├── src/
│   │   ├── App.tsx
│   │   ├── api/index.ts
│   │   ├── store/auth.ts
│   │   ├── types/index.ts
│   │   ├── components/
│   │   │   ├── cv/        (all CV section editors + AI panel)
│   │   │   ├── UI/        (reusable form elements)
│   │   │   └── admin/     (admin layout)
│   │   └── pages/
│   │       ├── auth/      (login, register, forgot)
│   │       ├── cv/        (editor, new CV wizard)
│   │       ├── dashboard/ (main dashboard, account)
│   │       ├── public/    (public CV + profile views)
│   │       └── admin/     (dashboard, users, CVs, ratings)
│   ├── package.json
│   └── Dockerfile
├── docker-compose.yml
├── .env.example
└── README.md
```

---

## API Reference

Full interactive API docs available at `/docs` when the backend is running.

Key endpoints:

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
- `GET /api/cv/{cv_id}` — get a CV (owner-only unless it’s public)
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

### Export / PDF
- `GET /api/export/pdf/{cv_id}`
- `GET /api/export/public-pdf/{username}/{slug}`
- `POST /api/export/pdf-preview`
- `POST /api/export/html-pdf`


### Public

- `GET /api/public/feed` — paginated public CV feed
- `GET /api/public/cv/{username}/{slug}` — view a public CV (JSON)
- `GET /api/public/profile/{username}` — public profile + public CVs
- `GET /api/public/sitemap.xml`

### Jobs
- `GET /api/jobs/search`
- `POST /api/jobs/match-cv`
- `POST /api/jobs/cover-letter`
- `GET /api/jobs/saved`
- `POST /api/jobs/saved/{job_id}`
- `DELETE /api/jobs/saved/{job_id}`
- `GET /api/jobs/applications`
- `POST /api/jobs/applications`
- `PUT /api/jobs/applications/{application_id}`
- `DELETE /api/jobs/applications/{application_id}`
- `GET /api/jobs/{job_id}`

### AXIOM Jobs (employer-created)
- `GET /api/axiom-jobs`
- `GET /api/axiom-jobs/mine`
- `POST /api/axiom-jobs`
- `GET /api/axiom-jobs/{job_id}`
- `PUT /api/axiom-jobs/{job_id}`
- `DELETE /api/axiom-jobs/{job_id}`
- `POST /api/axiom-jobs/{job_id}/share`

### Axiom Applications
- `GET /api/axiom-applications` (candidate’s applications)
- `POST /api/axiom-applications` (apply to an AXIOM job)
- `GET /api/axiom-applications/employer`
- `PUT /api/axiom-applications/{application_id}/status`

### Recruiter
- `POST /api/recruiter/register`
- `GET /api/recruiter/profile`
- `PUT /api/recruiter/profile`
- `DELETE /api/recruiter/profile`
- `GET /api/recruiter/talent-pools`
- `POST /api/recruiter/talent-pools`
- `GET /api/recruiter/saved-candidates`
- `POST /api/recruiter/saved-candidates`
- `PUT /api/recruiter/saved-candidates/{saved_id}`
- `DELETE /api/recruiter/saved-candidates/{saved_id}`

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
