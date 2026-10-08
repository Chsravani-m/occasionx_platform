def send_verification_email(
    email: str,
    token: str
):
    print(
        f"""
Verify Email

Email: {email}

Token:
{token}
"""
    )