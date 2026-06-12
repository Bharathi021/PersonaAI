# PersonaAI Backend (FastAPI)

## Setup

1. Create virtual environment and install dependencies:

```bash
python -m venv .venv
.venv\\Scripts\\activate
pip install -r backend/requirements.txt
```

2. (Optional) Install spaCy model for richer extraction:

```bash
python -m spacy download en_core_web_sm
```

3. (Optional) Set OpenAI key for real GPT reasoning:

```bash
set OPENAI_API_KEY=your_key_here
```

4. Run API server from workspace root:

```bash
uvicorn backend.main:app --reload --port 8000
```

## Key Endpoints

- `POST /api/auth/login`
- `POST /api/analysis/run`
- `GET /api/dashboard/{user_id}`
- `GET /api/dashboard/enterprise/metrics`
- `GET /api/business/plans`
- `GET /api/tasks/` (new Task API)
- `POST /api/tasks/` (create task)
- `GET /api/tasks/{task_id}`
- `PUT /api/tasks/{task_id}`
- `DELETE /api/tasks/{task_id}`
- `GET /api/health`

## Production-ready Task API Scope

1. Persistent task model (SQLite / SQLAlchemy)
2. CRUD endpoints in `/api/tasks`
3. Validation via Pydantic schemas
4. Standards: 404 handling, meaningful error responses
5. Future: auth + user ownership, filtering/pagination, search, retry logic

## Implementation plan (one feature/day)

Day 1: Task model + persistence + create/list endpoints
Day 2: read/update/delete endpoints + request schema validation
Day 3: add task status flow + priority metrics + tests
Day 4: secure endpoints with auth/ownership
Day 5: deploy review + performance checks + documentation

## Demo Flow

1. Login with email/name.
2. Send analysis payload from `backend/sample_payloads.json`.
3. Fetch user dashboard and enterprise metrics.

## Privacy Notes

- Resume text is masked before storage in local processing mode.
- Only minimal fields are stored in SQLite (`backend/personaai.db`).
