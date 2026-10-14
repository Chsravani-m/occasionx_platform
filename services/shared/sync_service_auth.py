"""Copy shared/service_auth.py into every backend service's app/core/."""

from pathlib import Path
import shutil

SERVICES = [
    "auth-service",
    "user-service",
    "provider-service",
    "catalog-service",
    "booking-service",
    "search-service",
    "ai-service",
    "collab-service",
]

root = Path(__file__).resolve().parent.parent
source = root / "shared" / "service_auth.py"

for service in SERVICES:
    target = root / service / "app" / "core" / "service_auth.py"
    target.parent.mkdir(parents=True, exist_ok=True)
    init = target.parent / "__init__.py"
    if not init.exists():
        init.write_text("")
    shutil.copyfile(source, target)
    print("updated", target.relative_to(root))
