# PersonaAI MVP

Predictive Intelligence for Human Performance

## Stack

- Frontend: React + Vite + Tailwind + Recharts
- Backend: FastAPI + SQLite
- AI/ML: spaCy (skill extraction), scikit-learn (prediction), OpenAI API (reasoning)

## Project Structure

- `frontend/`
- `backend/`
- `models/`
- `routes/`
- `utils/`
- `ppt/` and `ppts/` (core idea artifacts)

## Backend Setup

```bash
python -m venv .venv
.venv\\Scripts\\activate
pip install -r backend/requirements.txt
python -m spacy download en_core_web_sm
uvicorn backend.main:app --reload --port 8000
```

Backend docs:

- Swagger UI: http://127.0.0.1:8000/docs
- Health: http://127.0.0.1:8000/api/health

Sample payloads:

- `backend/sample_payloads.json`

## Frontend Setup

```bash
cd frontend
npm install
npm run dev
```

Frontend default URL:

- http://127.0.0.1:5173

If needed, configure API URL via `frontend/.env`:

```bash
VITE_API_BASE_URL=http://127.0.0.1:8000/api
```

## Demo Flow

1. Open frontend dashboard.
2. Enter email + name, click **Initialize Session**.
3. Paste/upload resume text.
4. Select role and behavior metrics.
5. Click **Run Prediction**.
6. Review skill gap, MindOS state, readiness prediction, roadmap, and enterprise metrics.

## Implemented Modules

- Auth + dashboard summary
- Resume analysis and role-skill gap mapping
- MindOS cognitive simulation
- Predictive scoring and risk labeling
- GPT-backed explanation + smart feedback
- Adaptive roadmap generation
- Enterprise workforce analytics
- Privacy controls with local processing mode and masking

## Note on OpenAI Key

Backend loads environment variables from `backend/.env` using `python-dotenv`.
