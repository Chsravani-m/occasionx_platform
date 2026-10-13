"""
End-to-end access-control smoke test for a LOCAL/DEV stack.

Registers throwaway customers and a provider, then checks that each
protected endpoint refuses anonymous callers and other users, and that
public browsing still works. Needs a dev stack started with:

    APP_ENV=development  WHATSAPP_TEST_MODE=true  (test OTP in responses)
    PAYMENT_TEST_MODE=true  DEV_SKIP_VERIFICATION=true
    RAZORPAY_KEY_SECRET=fake_secret_123
    SUPER_ADMIN_EMAIL / SUPER_ADMIN_PASSWORD as below
    catalog seeded (python -m app.seeders.seed_all)

Never run it against production - it creates accounts.

    python services/shared/security_smoke_test.py
"""
import hashlib, hmac, io, os, sys, uuid
import httpx

G = os.getenv("GATEWAY_URL", "http://localhost:8000")
P = os.getenv("PROVIDER_SERVICE_URL", "http://localhost:8003")
ADMIN_EMAIL = os.getenv("SUPER_ADMIN_EMAIL", "admin@test.com")
ADMIN_PASSWORD = os.getenv("SUPER_ADMIN_PASSWORD", "AdminPass123!")
RAZORPAY_SECRET = os.getenv("RAZORPAY_KEY_SECRET", "fake_secret_123").encode()
c = httpx.Client(base_url=G, timeout=30)
results = []


def check(name, cond, detail=""):
    results.append((name, bool(cond)))
    print(("PASS " if cond else "FAIL ") + name + ("" if cond else f"  -> {detail}"))


def h(tok):
    return {"Authorization": f"Bearer {tok}"}


rnd = uuid.uuid4().hex[:8]

# ---------------------------------------------------------------- anonymous
r = c.get("/providers/"); check("anon list all providers blocked", r.status_code == 401, r.status_code)
r = c.get("/providers/stats"); check("anon provider stats blocked", r.status_code == 401, r.status_code)
r = c.get("/catalog/categories"); check("anon catalog read allowed", r.status_code == 200, r.status_code)
cats = r.json()
r = c.post("/catalog/categories", json={"name": "x"}); check("anon catalog create blocked", r.status_code == 401, r.status_code)
r = c.post("/providers", json={}); check("anon create provider record blocked", r.status_code in (401, 403, 422), r.status_code)
r = c.get("/providers/", headers={"X-Internal-Key": "guess"}); check("spoofed internal key rejected", r.status_code == 401, r.status_code)

# ---------------------------------------------------------------- customers
def register_customer(tag, phone):
    email = f"cust{tag}{rnd}@test.com"
    r = c.post("/auth/register", json={"full_name": "C " + tag, "phone": phone, "email": email, "password": "Passw0rd!"})
    assert r.status_code == 200, r.text
    r = c.post("/auth/login", json={"identifier": email, "password": "Passw0rd!"})
    assert r.status_code == 200, r.text
    d = r.json()
    return d["accessToken"], d["refreshToken"], d["user"]["id"]

base = int(uuid.uuid4().int % 10**9)
custA, refreshA, idA = register_customer("a", f"9{base:09d}"[:10])
custB, refreshB, idB = register_customer("b", f"8{base:09d}"[:10])

r = c.post("/auth/register", json={"full_name": "x", "phone": "7000000001", "email": f"p{rnd}@t.com", "password": "Passw0rd!", "role": "PROVIDER"})
check("self-register as PROVIDER via /auth/register blocked", r.status_code == 400, r.status_code)
r = c.post("/auth/register", json={"full_name": "x", "phone": "7000000002", "email": f"a{rnd}@t.com", "password": "Passw0rd!", "role": "ADMIN"})
check("self-register as ADMIN blocked", r.status_code == 400, r.status_code)

r = c.get("/notifications/user/" + idA, headers=h(refreshA)); check("refresh token rejected as access token", r.status_code == 401, r.status_code)
r = c.get("/notifications/user/" + idA, headers=h(custA)); check("own notifications allowed", r.status_code == 200, r.status_code)
r = c.get("/notifications/user/" + idA, headers=h(custB)); check("other user's notifications blocked", r.status_code == 403, r.status_code)
r = c.get("/notifications/user/" + idA); check("anon notifications blocked", r.status_code == 401, r.status_code)

# membership
r = c.post(f"/auth/users/{idA}/membership/create-order", headers=h(custB)); check("membership order for other user blocked", r.status_code == 403, r.status_code)
r = c.post(f"/auth/users/{idA}/membership/create-order", headers=h(custA)); check("own membership order ok", r.status_code == 200, r.text)
mem_order = r.json()
check("membership fee is Rs.499", mem_order.get("amount") == 49900, mem_order.get("amount"))
r = c.post(f"/auth/users/{idB}/membership/test-confirm", headers=h(custB), json={"order_id": mem_order["order_id"]})
check("confirming someone else's membership order blocked", r.status_code == 400, r.status_code)

# booking charge
r = c.post("/payments/booking-charge/create-order", headers=h(custA), json={"customer_id": idB}); check("booking charge for other customer blocked", r.status_code == 403, r.status_code)
r = c.post("/payments/booking-charge/create-order", headers=h(custA), json={"customer_id": idA}); check("own booking charge ok", r.status_code == 200, r.text)
check("booking charge is Rs.99", r.json().get("amount") == 9900, r.json().get("amount"))
charge_order = r.json()["order_id"]
r = c.post("/payments/booking-charge/test-confirm", headers=h(custB), json={"order_id": charge_order}); check("confirming other's charge order blocked", r.status_code == 403, r.status_code)

# ---------------------------------------------------------------- provider sign-up
pphone = f"6{base:09d}"[:10]
r = c.post("/auth/send-registration-otp", json={"phone": pphone}); assert r.status_code == 200, r.text
otp = r.json().get("test_otp"); check("dev mode returns test OTP", otp is not None, r.json())
r = c.post("/auth/verify-registration-otp", json={"phone": pphone, "otp": otp}); assert r.status_code == 200, r.text
ptok = r.json().get("phone_verification_token") or r.json().get("verification_token")
pemail = f"prov{rnd}@test.com"
r = c.post("/auth/register-provider", json={
    "full_name": "Prov", "owner_name": "Prov", "business_name": "Biz " + rnd, "email": pemail,
    "phone": pphone, "password": "Passw0rd!", "phone_verification_token": ptok, "pan_number": "ABCDE1234F"})
check("provider registration ok", r.status_code == 200, r.text)
reg = r.json()
pid, puid, onb = reg["provider_id"], reg["user_id"], reg.get("onboarding_token")
check("onboarding token returned", bool(onb))

r = c.put(f"/providers/{pid}/booking-policy", json={"booking_notice_hours": 5}); check("anon provider edit blocked", r.status_code == 401, r.status_code)
r = c.put(f"/providers/{pid}/booking-policy", headers=h(custA), json={"booking_notice_hours": 5}); check("other user provider edit blocked", r.status_code == 403, r.status_code)
r = c.put(f"/providers/{pid}/booking-policy", headers=h(onb), json={"booking_notice_hours": 5, "cancellation_policy": "x"}); check("owner (onboarding token) edit ok", r.status_code == 200, r.text)
r = c.put(f"/providers/{pid}/bank-details", headers=h(onb), json={"bank_account_holder_name": "Prov", "bank_account_number": "1234567890", "bank_ifsc_code": "HDFC0001234", "bank_name": "HDFC"})
check("owner sets bank details", r.status_code == 200, r.text)
r = c.get(f"/providers/{pid}/bank-details"); check("anon bank details blocked", r.status_code == 401, r.status_code)
r = c.get(f"/providers/{pid}/bank-details", headers=h(custA)); check("other user bank details blocked", r.status_code == 403, r.status_code)
r = c.get(f"/providers/{pid}/bank-details", headers=h(onb)); check("owner reads bank details", r.status_code == 200 and r.json()["bank_account_number"] == "1234567890", r.text)
r = c.get(f"/notifications/user/{puid}", headers=h(onb)); check("onboarding token rejected outside provider onboarding", r.status_code == 401, r.status_code)

r = c.get(f"/providers/{pid}"); d = r.json()
check("public provider record hides PAN", r.status_code == 200 and d.get("pan_number") is None, d.get("pan_number"))
r = c.get(f"/providers/{pid}", headers=h(onb)); check("owner sees own PAN", r.json().get("pan_number") == "ABCDE1234F", r.json().get("pan_number"))
r = c.get(f"/providers/{pid}/profile"); prov = r.json().get("provider", {})
check("public profile hides bank account", r.status_code == 200 and prov.get("bank_account_number") is None and prov.get("activation_token") is None, prov.get("bank_account_number"))

# services / pricing ownership
r = c.post(f"/providers/{pid}/services", headers=h(onb), json={"name": "Svc", "description": "d", "category_id": cats[0]["id"] if cats else None})
check("owner creates service", r.status_code == 200, r.text)
sid = r.json().get("id")
r = c.put(f"/providers/services/{sid}", headers=h(custA), json={"name": "hijack"}); check("other user edit service blocked", r.status_code == 403, r.status_code)
r = c.delete(f"/providers/services/{sid}", headers=h(custA)); check("other user delete service blocked", r.status_code == 403, r.status_code)
r = c.get(f"/providers/services/{sid}/blocked-dates"); check("anon blocked-dates (customer names) blocked", r.status_code == 401, r.status_code)

# KYC documents
files = {"file": ("pan.pdf", io.BytesIO(b"%PDF-1.4 secret"), "application/pdf")}
r = c.post(f"/providers/{pid}/documents/upload", headers=h(custA), data={"document_type": "PAN_CARD"}, files=files)
check("other user can't upload provider docs", r.status_code == 403, r.status_code)
files = {"file": ("pan.pdf", io.BytesIO(b"%PDF-1.4 secret"), "application/pdf")}
r = c.post(f"/providers/{pid}/documents/upload", headers=h(onb), data={"document_type": "PAN_CARD"}, files=files)
check("owner uploads KYC doc", r.status_code == 200, r.text)
doc_url = r.json()["document"]["document_url"]
files = {"file": ("evil.html", io.BytesIO(b"<script>"), "text/html")}
r = c.post(f"/providers/{pid}/documents/upload", headers=h(onb), data={"document_type": "PAN_CARD"}, files=files)
check("non-document file type rejected", r.status_code == 400, r.status_code)
r = c.get(doc_url); check("anon KYC download blocked", r.status_code == 401, r.status_code)
r = c.get(doc_url, headers=h(custA)); check("other user KYC download blocked", r.status_code == 404, r.status_code)
r = c.get(doc_url, headers=h(onb)); check("owner KYC download ok", r.status_code == 200 and r.content.startswith(b"%PDF"), r.status_code)
fname = doc_url.rsplit("/", 1)[1]
for variant in [f"/uploads/provider-documents/{fname}", f"/uploads/./provider-documents/{fname}", f"/uploads/PROVIDER-DOCUMENTS/{fname}", f"/uploads/x/../provider-documents/{fname}"]:
    r = httpx.get(P + variant)
    check(f"direct static access blocked: {variant[:40]}", r.status_code in (401, 404), r.status_code)
r = c.get(f"/providers/{pid}/documents"); check("anon document list blocked", r.status_code == 401, r.status_code)

# registration payment binding
r = c.post(f"/providers/{pid}/registration-payment", headers=h(custA)); check("other user can't start provider's registration payment", r.status_code == 403, r.status_code)
r = c.post(f"/providers/{pid}/verify-registration-payment", headers=h(onb), json={
    "razorpay_order_id": "order_other", "razorpay_payment_id": "pay_x",
    "razorpay_signature": hmac.new(RAZORPAY_SECRET, b"order_other|pay_x", hashlib.sha256).hexdigest()})
check("payment for a different order rejected (validly signed)", r.status_code == 400, r.text)
r = c.post(f"/providers/{pid}/registration-payment", headers=h(onb)); check("owner starts registration payment", r.status_code == 200, r.text)
r = c.post(f"/providers/{pid}/mark-registration-paid", headers=h(custA)); check("other user can't mark registration paid", r.status_code == 403, r.status_code)
r = c.post(f"/providers/{pid}/mark-registration-paid", headers=h(onb)); check("owner test-mode mark paid ok", r.status_code == 200, r.text)

# ---------------------------------------------------------------- admin
r = c.post("/auth/login", json={"identifier": ADMIN_EMAIL, "password": ADMIN_PASSWORD}); admin = r.json()["accessToken"]
r = c.get("/providers/", headers=h(admin)); check("admin lists providers", r.status_code == 200, r.status_code)
r = c.get(f"/providers/{pid}/documents", headers=h(admin)); check("admin lists provider docs", r.status_code == 200, r.status_code)
r = c.get(doc_url, headers=h(admin)); check("admin KYC download ok", r.status_code == 200, r.status_code)
r = c.get("/providers/", headers=h(custA)); check("customer can't list all providers", r.status_code == 403, r.status_code)
r = c.post("/catalog/event-types", headers=h(custA), json={"name": "x"}); check("customer catalog write blocked", r.status_code == 403, r.status_code)
r = c.post("/catalog/event-types", headers=h(admin), json={"name": "Test Event " + rnd}); check("admin catalog write ok", r.status_code in (200, 201), r.text)

# ---------------------------------------------------------------- collab
r = c.post("/collab/sessions", headers=h(custA), json={"host_user_id": idB, "host_name": "spoof"}); check("collab session as someone else blocked", r.status_code == 403, r.status_code)
r = c.post("/collab/sessions", headers=h(custA), json={"host_user_id": idA, "host_name": "A"}); check("collab own session ok", r.status_code == 200, r.text)

# ---------------------------------------------------------------- reviews
r = c.post("/bookings/review", headers=h(custB), json={"booking_id": str(uuid.uuid4()), "customer_id": idA, "rating": 5}); check("review as someone else blocked", r.status_code == 403, r.status_code)

# ---------------------------------------------------------------- public browsing still works
for path in ["/providers/recent", f"/providers/{pid}/details", f"/providers/{pid}/services", f"/providers/{pid}/portfolio", f"/providers/{pid}/booking-policy", "/locations/states", "/catalog/event-types"]:
    r = c.get(path); check(f"public GET {path[:45]}", r.status_code == 200, r.status_code)

failed = [n for n, ok in results if not ok]
print(f"\n{len(results) - len(failed)}/{len(results)} passed")
sys.exit(1 if failed else 0)
