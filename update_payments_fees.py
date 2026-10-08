import copy
import openpyxl

SRC = "OccasionX_Functional_Test_Checklist_v5.xlsx"
OUT = "OccasionX_Functional_Test_Checklist_v6.xlsx"

wb = openpyxl.load_workbook(SRC)
ws = wb["Payments & Fees"]

ROW = {f"PF-{n:02d}": 4 + n for n in range(1, 14)}
STATUS_COL = 7
NOTES_COL = 8

# The Status column has a uniform banner fill across the whole sheet (not
# color-coded by Pass/Fail) - just reuse whatever fill is already on the
# Status cell being edited, so formatting stays consistent.

results = {
    "PF-01": (
        "Pass",
        "Verified live as a free member (Sravani Mallampati, is_paid_member: "
        "false): direct-booking Total combined the package price and the "
        "Rs.1 Application Fee into one figure (e.g. Package Rs.51,200 + Fee "
        "Rs.1 = Total Rs.51,201), with the fee line item clearly visible "
        "above the combined Total - not a separate charge.",
    ),
    "PF-03": (
        "Pass",
        "Verified live: clicking 'Book Now & Pay' as a free member creates "
        "exactly one booking record and opens exactly one Razorpay checkout "
        "iframe for the single combined amount (confirmed via booking-service "
        "API: one AWAITING_PAYMENT booking with amount=51,200 and "
        "application_fee=1, and exactly one iframe element on screen) - no "
        "separate fee popup followed by a service popup. Source review of "
        "ProviderDetailsPage.tsx confirms startPayment() calls the same "
        "createCombinedPaymentOrder() used by the cart flow, by design, for "
        "this reason.",
    ),
    "PF-04": (
        "Pass",
        "Verified live: added 2 services from different providers (Blue Sky "
        "Catering Events + Elite Catering House) to the cart as a free "
        "member and checked out together. The review screen showed "
        "'Application Fee (2 services)' = Rs.2 as its own bill line "
        "(Provider Fees Subtotal Rs.93,300 + Application Fee Rs.2 = Total "
        "Rs.93,302) - not a flat Rs.1. Cross-checked against the backend: "
        "both resulting bookings had application_fee=1 each (1+1=2), "
        "confirming this is real backend math, not just a UI display "
        "artifact.",
    ),
    "PF-05": (
        "Pass",
        "Verified live as a paid member (mindsprintproj@gmail.com, "
        "is_paid_member: true): added the same 2 services to the cart and "
        "checked out together. No Application Fee line or fee notice "
        "appeared anywhere - not on the provider page, not in the cart, and "
        "not on the review screen. Review screen Total = Rs.93,300, exactly "
        "matching the sum of the 2 provider fees (Rs.51,200 + Rs.42,100) "
        "with no fee added.",
    ),
    "PF-06": (
        "Pass",
        "Verified live twice: started a multi-item combined payment (real "
        "Razorpay checkout opened, confirmed via a single iframe + Razorpay "
        "network calls), then abandoned it by navigating away without "
        "entering payment details. In both cases the cart items were "
        "unaffected and the created bookings remained AWAITING_PAYMENT "
        "(amount_paid: null, payment_date: null) when checked directly "
        "against the booking-service API - nothing was silently marked paid "
        "or lost.",
    ),
    "PF-07": (
        "Pass",
        "Confirmed via source review of create_combined_order() in "
        "booking-service/app/crud/payment.py: the Application Fee is only "
        "added when include_booking_charge is true, which the frontend "
        "derives from !isPaidMember() at request time - it doesn't check "
        "whether a fee was already paid on a prior attempt. However, "
        "double-charging in practice is structurally prevented: a booking "
        "only ever leaves AWAITING_PAYMENT via confirm_booking_payment "
        "(on verified success) or explicit reject/expiry, so a booking that "
        "already had its fee successfully paid can never still be in "
        "AWAITING_PAYMENT to retry. A genuine unpaid retry correctly "
        "re-includes the fee (verified live: Pay Now on an AWAITING_PAYMENT "
        "booking recomputed Total inclusive of the Rs.1 fee).",
    ),
    "PF-08": (
        "N/A",
        "This dev environment's PAYMENT_TEST_MODE is deliberately set to "
        "false as of 2026-07-23 across auth-service, booking-service and "
        "provider-service (.env comments explicitly flag this as an "
        "intentional live-mode change, with real Razorpay keys "
        "rzp_live_SSe54lW1XdPQIx) so that real payment behavior could be "
        "verified for other test cases. Flipping PAYMENT_TEST_MODE back to "
        "true to test this case would undo that intentional setup and was "
        "out of scope for this pass, per direction from the user. The "
        "underlying test-mode code path itself (skip Razorpay, use "
        "/payments/test-confirm) was already implemented and verified in an "
        "earlier session - see 'Verify Razorpay test-mode guard end to end' "
        "in the build history.",
    ),
    "PF-09": (
        "Pass",
        "Verified live: with the environment in live mode, triggered both a "
        "single-item direct booking (Total shown: Rs.51,201) and a "
        "multi-item cart checkout (Total shown: Rs.93,302) as a free "
        "member. In both cases a real Razorpay checkout order was created "
        "(confirmed via network trace: POST /payments/create-combined-order "
        "followed by the Razorpay iframe/CDN calls with the live key) for "
        "exactly the amount shown on screen - the combined-order total is "
        "computed server-side from the same booking.amount + "
        "application_fee fields the UI displays, so there is no separate "
        "code path that could drift from the displayed total. Popups were "
        "abandoned before entering payment details per the agreed safety "
        "boundary (no direct pixel-level iframe comparison was possible "
        "since the Razorpay iframe content is cross-origin and blocked from "
        "script access, but the amount is verified at the source instead).",
    ),
    "PF-10": (
        "N/A",
        "Requires a completed real payment plus manual verification in the "
        "Razorpay dashboard that a provider without a linked payout account "
        "settles 100% to OccasionX's own account. Since this environment is "
        "in live mode with real Razorpay keys, deliberately completing a "
        "payment purely to observe payout routing was out of scope per "
        "direction from the user (no real charges were to be completed "
        "during this test pass). The underlying logic (only attempt a "
        "Razorpay Route transfer when the provider has a linked account) "
        "was already implemented and reviewed in an earlier session - see "
        "'booking-service: wire Razorpay Route transfers when provider has "
        "linked account' in the build history.",
    ),
    "PF-11": (
        "N/A",
        "Requires at least one test provider with an ACTIVATED Razorpay "
        "linked account, a completed real payment, and cross-checking the "
        "split in the Razorpay dashboard (not just the app) - none of which "
        "was appropriate to force in this live-mode environment without "
        "authorization to complete real charges. Skipped per direction from "
        "the user, consistent with PF-10.",
    ),
    "PF-12": (
        "Pass",
        "Fixed and verified live in this session: the receipt/bill view on "
        "My Bookings and provider Bookings now shows Service Provider Fee "
        "and Application Fee as two separate line items instead of one "
        "merged number - confirmed on a paid booking's receipt.",
    ),
}

pass_fill = None
for row in ws.iter_rows(min_row=1):
    for cell in row:
        if cell.value == "Pass" and pass_fill is None:
            pass_fill = copy.copy(cell.fill)
    if pass_fill:
        break

for pf_id, (status, note) in results.items():
    r = ROW[pf_id]
    actual_id = ws.cell(row=r, column=1).value
    assert actual_id == pf_id, f"Row mapping wrong: expected {pf_id} at row {r}, found {actual_id!r}"

    status_cell = ws.cell(row=r, column=STATUS_COL)
    notes_cell = ws.cell(row=r, column=NOTES_COL)

    status_cell.value = status
    if pass_fill:
        status_cell.fill = pass_fill
    notes_cell.value = note

# Also note the dead-code bug found in create_order() during PF-01 review,
# as an addendum on PF-01's note - it's unreachable from the current UI
# (no frontend caller of the plain createOrder function), so it's flagged
# informationally rather than filed as a separate Fail.
pf01_row = ROW["PF-01"]
pf01_notes = ws.cell(row=pf01_row, column=NOTES_COL)
pf01_notes.value += (
    " CODE NOTE (not a live bug): booking-service/app/crud/payment.py's "
    "create_order() (the older, non-combined single-order function) "
    "computes amount_paise from booking.amount only and never adds "
    "booking.application_fee - but it is dead code, since no frontend "
    "caller of the corresponding plain createOrder() was found (both the "
    "direct-booking and cart/retry flows use createCombinedPaymentOrder() "
    "instead, which correctly includes the fee). Worth removing or fixing "
    "if it's ever wired up in the future."
)

wb.save(OUT)
print("Saved", OUT)
