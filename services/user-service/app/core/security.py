from jose import jwt, JWTError

from dotenv import load_dotenv
import os

load_dotenv()

SECRET_KEY = os.getenv("SECRET_KEY")
ALGORITHM = os.getenv("ALGORITHM")


print("ALGORITHM =", ALGORITHM)

def decode_token(token):
    try:
        payload = jwt.decode(
            token,
            SECRET_KEY,
            algorithms=[ALGORITHM]
        )

        print("TOKEN DECODED SUCCESSFULLY")
        print(payload)

        return payload

    except JWTError as e:
        print("JWT ERROR =", str(e))
        return None