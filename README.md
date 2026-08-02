# SAFE-HIRE – AI-Powered Recruitment Scam Detector

SAFE-HIRE is a production-ready, full-stack web application built to help university students and job seekers verify the authenticity of job offers, internship ads, emails, WhatsApp/LinkedIn messages, screenshot images, and recruitment URLs.

---

## 🌟 Key Features

1. **5-Agent AI Pipeline**:
   - **Agent 1: Intake Agent** – Ingests text, image screenshots (via Tesseract OCR), and URLs; auto-detects language.
   - **Agent 2: Linguistic Risk Agent** – Evaluates EMSCAD risk signals (urgency pressure tactics, registration/processing fee demands, generic email domain mismatches e.g. `@gmail.com` for corporate brands).
   - **Agent 3: Verification Agent** – Analyzes WHOIS domain age (<90 days risk), Google Safe Browsing API status, and corporate web presence.
   - **Agent 4: Reasoning Agent** – Synthesizes all signals into an explainable 0–100 Scam Probability Score with plain-language rationale.
   - **Agent 5: Recommendation Agent** – Generates tailored, actionable safety steps and university reporting guidance.

2. **Multilingual Support**:
   - English (EN)
   - Sinhala (සිංහල - SI)
   - Tamil (தமிழ் - TA)
   - Hindi (हिंदी - HI)
   - Bengali (বাংলা - BN)

3. **One-Time Landing Page Flow**:
   - Unauthenticated visitors see the landing page describing SAFE-HIRE's mission and CTAs.
   - Upon login, JWT session is created and the user is redirected straight to the **Dashboard**. Subsequent visits while authenticated skip the landing page automatically.

4. **MongoDB & Resilience**:
   - Uses MongoDB for `users`, `submissions`, and `results` collections.
   - Built-in graceful in-memory fallback store if local MongoDB is not running, ensuring 100% friction-free out-of-the-box execution.

---

## 🚀 Quick Setup & Local Running

### Prerequisites
- Python 3.10+
- Node.js 18+
- (Optional) MongoDB local or MongoDB Atlas connection

---

### Step 1: Start Backend (FastAPI)

```bash
cd backend
python -m venv venv

# On Windows PowerShell:
.\venv\Scripts\Activate.ps1

# On Linux/macOS:
source venv/bin/activate

pip install -r requirements.txt
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```
Backend API will be live at: `http://localhost:8000` (API Docs at `http://localhost:8000/docs`).

---

### Step 2: Start Frontend (React + Vite)

In a new terminal tab:

```bash
cd frontend
npm install
npm run dev
```
Frontend Web Application will be live at: `http://localhost:5173`.

---

### Step 3: Run with Docker Compose (Optional)

```bash
docker-compose up --build
```

---

## 🛠 Tech Stack

| Component | Technology |
|---|---|
| Frontend | React 18, Vite, Tailwind CSS, Lucide Icons, Recharts, react-i18next |
| Backend | Python 3.11, FastAPI, Pydantic, Motor (Async MongoDB), PyJWT |
| Database | MongoDB (`users`, `submissions`, `results` collections) |
| NLP & AI Pipeline | Custom EMSCAD rule engine, pytesseract OCR, WHOIS parser, Safe Browsing scanner |

---

## 🔒 API Endpoints

- `POST /api/auth/register` – Create user account & return JWT
- `POST /api/auth/login` – Authenticate user & return JWT
- `GET /api/user/profile` – Fetch current user profile
- `POST /api/analyze` – Accept text/image/URL, execute 5-agent pipeline, & store results
- `GET /api/history` – List past user scam verifications
- `GET /api/history/{submission_id}` – Get detailed analysis report for a past submission

---

## 📜 License
SAFE-HIRE AI Project - Distributed under MIT License.
