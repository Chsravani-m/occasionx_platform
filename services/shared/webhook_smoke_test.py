"""
Razorpay webhook smoke test for a LOCAL/DEV stack (same setup as
security_smoke_test.py, plus RAZORPAY_WEBHOOK_SECRET). Sends signed fake
Razorpay events for every payment type and checks the database via psql
(local Postgres on the /tmp socket). Never run against production.

    python services/shared/webhook_smoke_test.py
"""
import hmac, hashlib, json, os, uuid, datetime, subprocess
import httpx
c = httpx.Client(base_url=os.getenv("GATEWAY_URL", "http://localhost:8000"), timeout=30)
H = lambda t: {"Authorization": f"Bearer {t}"}
SECRET = os.getenv("RAZORPAY_WEBHOOK_SECRET", "whsec_test_123").encode()
KEY_SECRET = os.getenv("RAZORPAY_KEY_SECRET", "fake_secret_123").encode()
res = []
def check(n, ok, d=""):
    res.append(ok); print(("PASS " if ok else "FAIL ") + n + ("" if ok else f" -> {d}"))
def hook(order_id, amount, event="order.paid", secret=SECRET, pay_id=None):
    body = json.dumps({"event": event, "payload": {"payment": {"entity": {"id": pay_id or "pay_" + uuid.uuid4().hex[:14], "order_id": order_id, "amount": amount, "status": "captured"}}}}).encode()
    sig = hmac.new(secret, body, hashlib.sha256).hexdigest()
    return c.post("/payments/webhook/razorpay", content=body, headers={"X-Razorpay-Signature": sig, "Content-Type": "application/json"})
def sql(db, q):
    return subprocess.run(["psql", "-h", "/tmp", "-U", "postgres", "-d", f"occasionx_{db}_db", "-tAc", q], capture_output=True, text=True).stdout.strip()

n = uuid.uuid4().int % 10**9
email = f"wh{n}@t.com"
c.post("/auth/register", json={"full_name": "W C", "phone": f"9{n:09d}", "email": email, "password": "Passw0rd!"})
lg = c.post("/auth/login", json={"identifier": email, "password": "Passw0rd!"}).json()
cust, cid = lg["accessToken"], lg["user"]["id"]
ph = f"7{n:09d}"
otp = c.post("/auth/send-registration-otp", json={"phone": ph}).json()["test_otp"]
vt = c.post("/auth/verify-registration-otp", json={"phone": ph, "otp": otp}).json()
vt = vt.get("phone_verification_token") or vt.get("verification_token")
reg = c.post("/auth/register-provider", json={"full_name": "P", "owner_name": "P", "business_name": "WBiz", "email": f"wp{n}@t.com", "phone": ph, "password": "Passw0rd!", "phone_verification_token": vt}).json()
pid, onb = reg["provider_id"], reg["onboarding_token"]

# provider registration via webhook
order = c.post(f"/providers/{pid}/registration-payment", headers=H(onb)).json()["order_id"]
r = hook(order, 100)  # test mode amount is 100 but fee env is 99900 -> short
check("registration: short amount not accepted", r.json().get("result") == "provider_registration:amount_short", r.text)
r = hook(order, 99900)
check("registration: webhook completes payment", r.status_code == 200 and r.json()["result"] == "provider_registration:confirmed", r.text)
check("registration: provider marked paid", sql("provider", f"select registration_fee_paid from providers where id='{pid}'") == "t")
r = hook(order, 99900); check("registration: replay is harmless", r.json()["result"] == "provider_registration:already_paid", r.text)

# activate provider + set up service for bookings
tok = sql("provider", f"select activation_token from providers where id='{pid}'")
c.post("/providers/activate", json={"token": tok})
ptok = c.post("/auth/login", json={"identifier": f"wp{n}@t.com", "password": "Passw0rd!"}).json()["accessToken"]
cats = c.get("/catalog/categories").json()
svc = c.post(f"/providers/{pid}/services", headers=H(ptok), json={"name": "Photo", "category_id": cats[0]["id"]}).json()
pr = c.post(f"/providers/services/{svc['id']}/pricing", headers=H(ptok), json={"pricing_type": "FIXED", "amount": 5000}).json()

def accepted_booking(days):
    d = (datetime.date.today() + datetime.timedelta(days=days)).isoformat()
    b = c.post("/bookings", headers=H(cust), json={"customer_id": cid, "provider_id": pid, "service_id": svc["id"], "pricing_id": pr["id"], "event_date": d, "event_time": "18:00:00", "amount": 5000}).json()
    c.patch(f"/bookings/{b['id']}/status", headers=H(ptok), json={"booking_status": "AWAITING_PAYMENT"})
    return b["id"]

# booking + charge
b1 = accepted_booking(10)
o = c.post("/payments/create-combined-order", headers=H(cust), json={"booking_ids": [b1], "customer_id": cid, "include_booking_charge": True}).json()
check("combined order amount = 5000 + 99", o["amount"] == 509900, o)
r = hook(o["order_id"], 509900, pay_id="pay_bad", secret=b"wrong")
check("bad signature rejected", r.status_code == 400, r.status_code)
check("bad signature changed nothing", sql("booking", f"select booking_status from bookings where id='{b1}'") == "AWAITING_PAYMENT")
r = hook(o["order_id"], 509900)
check("booking: webhook confirms booking", r.json().get("result") == "booking:confirmed", r.text)
check("booking: status CONFIRMED", sql("booking", f"select booking_status from bookings where id='{b1}'") == "CONFIRMED")
check("booking: charge PAID", sql("booking", f"select status from booking_charges where razorpay_order_id='{o['order_id']}'") == "PAID")
r = hook(o["order_id"], 509900, event="payment.captured"); check("booking: replay harmless", r.json().get("result") == "booking:already_paid", r.text)
sig = hmac.new(KEY_SECRET, f"{o['order_id']}|pay_browser".encode(), hashlib.sha256).hexdigest()
r = c.post("/payments/verify-combined", headers=H(cust), json={"razorpay_order_id": o["order_id"], "razorpay_payment_id": "pay_browser", "razorpay_signature": sig})
check("browser verify after webhook still succeeds", r.status_code == 200, r.text)
notes = sql("booking", f"select count(*) from notifications where booking_id='{b1}' and title like 'Payment successful%'")
check("booking: customer notified once", notes == "1", notes)

# short payment
b2 = accepted_booking(11)
o2 = c.post("/payments/create-combined-order", headers=H(cust), json={"booking_ids": [b2], "customer_id": cid}).json()
r = hook(o2["order_id"], 100)
check("booking: short payment flagged, not confirmed", r.json().get("result") == "booking:amount_short" and sql("booking", f"select booking_status from bookings where id='{b2}'") == "AWAITING_PAYMENT", r.text)

# expired booking paid late
b3 = accepted_booking(12)
o3 = c.post("/payments/create-combined-order", headers=H(cust), json={"booking_ids": [b3], "customer_id": cid}).json()
sql("booking", f"update bookings set booking_status='EXPIRED' where id='{b3}'")
r = hook(o3["order_id"], 500000)
check("booking: late payment on expired booking flagged for refund", r.json().get("result") == "booking:needs_review" and sql("booking", f"select status from payments where razorpay_order_id='{o3['order_id']}'") == "PAID_NEEDS_REVIEW", r.text)
check("booking: expired booking not re-confirmed", sql("booking", f"select booking_status from bookings where id='{b3}'") == "EXPIRED")

# booking charge alone
ch = c.post("/payments/booking-charge/create-order", headers=H(cust), json={"customer_id": cid}).json()
r = hook(ch["order_id"], 9900); check("booking charge via webhook", r.json().get("result") == "booking:confirmed", r.text)

# membership
mo = c.post(f"/auth/users/{cid}/membership/create-order", headers=H(cust)).json()
r = hook(mo["order_id"], 49900); check("membership via webhook", r.json().get("result") == "membership:confirmed", r.text)
ms = c.get(f"/auth/users/{cid}/membership", headers=H(cust)).json()
check("membership: user now paid member", ms["is_paid_member"] is True, ms)
r = hook(mo["order_id"], 49900); check("membership replay harmless", r.json().get("result") == "membership:already_paid", r.text)

# misc
r = hook("order_unknown", 100); check("unknown order acknowledged", r.status_code == 200 and r.json()["result"] == "unknown_order", r.text)
r = hook("x", 1, event="payment.failed"); check("other events ignored", r.json().get("status") == "ignored", r.text)
r = c.post("/auth/internal/razorpay-paid", json={"razorpay_order_id": mo["order_id"], "razorpay_payment_id": "p", "amount": 1})
check("internal membership endpoint blocked from outside", r.status_code == 403, r.status_code)
r = c.post("/providers/internal/razorpay-paid", json={"razorpay_order_id": order, "razorpay_payment_id": "p", "amount": 1})
check("internal provider endpoint blocked from outside", r.status_code == 403, r.status_code)
print(f"\n{sum(res)}/{len(res)} passed")
