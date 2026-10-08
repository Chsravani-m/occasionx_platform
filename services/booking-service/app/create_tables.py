from app.db.database import Base, engine

# import all models here
from app.db.models.booking import Booking
from app.db.models.notification import Notification
from app.db.models.wishlist import WishlistItem
from app.db.models.payment import Payment
from app.db.models.review import Review
from app.db.models.booking_charge import BookingCharge

print("Creating tables...")

Base.metadata.create_all(bind=engine)

print("Tables created successfully.")