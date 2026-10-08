"""Alembic environment for catalog-service.

Uses the service's own SQLAlchemy Base and DATABASE_URL, so migrations
always target the same database the app connects to.
"""
import importlib
import os
import sys
from logging.config import fileConfig
from pathlib import Path

from alembic import context
from sqlalchemy import create_engine, pool

SERVICE_ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(SERVICE_ROOT))

try:
    from dotenv import load_dotenv
    load_dotenv(SERVICE_ROOT / ".env")
except ImportError:
    pass

from app.db.database import Base  # noqa: E402

# Every model module must be imported so its tables are on Base.metadata.
MODEL_MODULES = ['app.db.models.category', 'app.db.models.district', 'app.db.models.event_type', 'app.db.models.event_type_category', 'app.db.models.location', 'app.db.models.package', 'app.db.models.package_category', 'app.db.models.state', 'app.db.models.subcategory']
for module in MODEL_MODULES:
    importlib.import_module(module)

config = context.config
if config.config_file_name is not None:
    fileConfig(config.config_file_name)

target_metadata = Base.metadata


def _database_url() -> str:
    url = os.getenv("DATABASE_URL")
    if not url:
        from app.db.database import DATABASE_URL
        url = DATABASE_URL
    if not url:
        raise RuntimeError("DATABASE_URL is not set")
    return url


def run_migrations_offline() -> None:
    context.configure(
        url=_database_url(),
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
        compare_type=True,
    )
    with context.begin_transaction():
        context.run_migrations()


def run_migrations_online() -> None:
    engine = create_engine(_database_url(), poolclass=pool.NullPool)
    with engine.connect() as connection:
        context.configure(
            connection=connection,
            target_metadata=target_metadata,
            compare_type=True,
        )
        with context.begin_transaction():
            context.run_migrations()


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
