from app.db.database import Base, engine

from app.db.models.user import UserProfile

Base.metadata.create_all(bind=engine)

print("User Service Tables Created")