"""Root ASGI entrypoint for local development.

Allows running from repository root with:
uvicorn main:app --reload
"""

from backend.main import app
