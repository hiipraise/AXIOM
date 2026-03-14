# AXIOM — AI CV / Resume Generator

Zero-cliché, ATS-safe, AI-powered CV generator.

## Stack
- **Frontend**: React + TypeScript + Tailwind CSS (Vite)
- **Backend**: Python + FastAPI
- **Database**: MongoDB
- **AI**: Groq (llama-3.1-8b-instant, free tier)
- **PDF**: ReportLab + QR code verification

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
source venv/bin/activate  # Windows: venv\Scripts\activate
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

| Variable | Description |
|---|---|
| `GROQ_API_KEY` | Your Groq API key (required) |
| `MONGO_URL` | MongoDB connection string |
| `JWT_SECRET` | Change this in production |
| `FRONTEND_URL` | Used for QR code URLs in PDFs |
| `ADMIN_USERNAME` | Initial super admin username |
| `ADMIN_EMAIL` | Initial super admin email |
| `ADMIN_PASSWORD` | Initial super admin password |

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
- `POST /api/auth/register` — create account
- `POST /api/auth/login` — get JWT token
- `GET /api/cv` — list your CVs
- `POST /api/cv` — create new CV
- `PUT /api/cv/{id}` — update CV (auto-saves history)
- `POST /api/cv/ai/chat` — free-form AI chat about your CV
- `POST /api/cv/ai/edit` — apply natural-language edit instruction
- `POST /api/cv/ai/match-job` — align CV to job description
- `POST /api/cv/ai/interview` — interview mode
- `POST /api/cv/upload-cv` — import PDF
- `GET /api/export/pdf/{id}` — generate and download PDF
- `GET /api/public/cv/{username}/{slug}` — view public CV

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
