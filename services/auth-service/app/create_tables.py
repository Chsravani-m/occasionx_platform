from app.db.database import Base, engine

from app.db.models.user import User
from app.db.models.refresh_token import RefreshToken
from app.db.models.password_reset import PasswordResetToken
from app.db.models.otp import OTP
from app.db.models.membership_payment import MembershipPayment

Base.metadata.create_all(bind=engine)

print("Tables created successfully")