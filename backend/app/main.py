import uvicorn
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.core.config import settings
from app.core.database import SessionLocal, Base, engine
from app.core.seed import seed_db
from app.api import auth, complaints

# Create tables and seed DB
db = SessionLocal()
try:
    seed_db(db)
finally:
    db.close()

app = FastAPI(
    title="Awaaz-e-Awadh - Grievance Resolution API",
    description="Agentic AI governance backend for Awaaz-e-Awadh System",
    version="1.0.0"
)

# CORS middleware config
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allow all origins for dev/hackathon purposes
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register routes
app.include_router(auth.router, prefix="/api")
app.include_router(complaints.router, prefix="/api")

@app.get("/")
def read_root():
    return {
        "app": "Awaaz-e-Awadh API",
        "status": "healthy",
        "version": "1.0.0",
        "documentation": "/docs"
    }

if __name__ == "__main__":
    uvicorn.run("app.main:app", host="0.0.0.0", port=settings.PORT, reload=True)
