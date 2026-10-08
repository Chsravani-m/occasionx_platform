import sys
from pathlib import Path

# Makes `from app...` imports resolve when pytest is run from this
# directory (services/ai-service), the same way uvicorn app.main:app
# is run from here.
sys.path.insert(0, str(Path(__file__).resolve().parent))
