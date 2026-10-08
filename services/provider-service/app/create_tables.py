from app.db.database import Base, engine

import app.db.models

Base.metadata.create_all(bind=engine)

print("Provider Service Tables Created")