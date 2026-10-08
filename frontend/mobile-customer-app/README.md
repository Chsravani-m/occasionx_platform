# OccasionX Mobile (Android & iOS)

React Native app built with Expo, talking to the same api-gateway
backend as `frontend/web-app` - no backend changes were needed. Covers
the Customer and Provider roles; Admin stays web-only for now.

## Setup (run these on your own machine, not in this chat)

```
cd frontend/mobile-app
npm install
```

Then start the dev server:

```
npx expo start
```

Scan the QR code with the **Expo Go** app (free, on the Play Store /
App Store) on your Android or iPhone. No Xcode or Android Studio
needed for this - Expo Go runs the app directly on your own phone.

## Pointing it at your backend

`localhost` inside the app means *the phone itself*, not your dev
machine. If you're testing on a real phone (not a simulator on the
same machine), open `app.json` and set:

```
"extra": { "apiGatewayUrl": "http://<your-computer's-LAN-IP>:8000" }
```

Find your LAN IP with `ipconfig` (Windows) - something like
`192.168.1.23`. Your phone and computer need to be on the same Wi-Fi.
All 6 backend services (api-gateway + the 5 microservices) need to be
running, exactly like when testing the web app.

## What's included

- **Customer**: browse categories, view provider details, direct
  "Book Now & Pay" and "Add to Cart", multi-item cart checkout,
  My Bookings (with Pay Now retry on AWAITING_PAYMENT), Wishlist,
  Notifications, Profile.
- **Provider**: Dashboard stats, Bookings list (reject action),
  Earnings, Bank Details + Automatic Payouts (Razorpay Route) status.
- **Auth**: sign in / register, JWT stored in expo-secure-store
  (not AsyncStorage - tokens get the OS-level secure storage, iOS
  Keychain / Android Keystore).

Same business rules as the web app: free members get a small
Application Fee folded into the same payment as the provider's fee
(not a separate popup), paid members skip it, PER_PLATE/PER_PERSON
pricing respects min/max_quantity floors, and a cart checkout batches
every item into ONE combined Razorpay charge.

## Payments

Razorpay has no official Expo Go module - `react-native-razorpay`
needs a custom native build (EAS dev client), not plain Expo Go. To
keep this running in plain Expo Go with no native build step, payment
uses `src/components/PaymentWebView.tsx`, which opens Razorpay's
standard hosted checkout.js inside a WebView - same order_id/key_id
flow, same backend endpoints (`/payments/create-combined-order`,
`/payments/verify-combined`) as the web app, just wrapped for RN.

If you later want the native Razorpay SDK's UI polish instead of a
WebView, that requires switching to an EAS development build - still
no local Xcode/Android Studio needed (EAS builds in the cloud), but
it's a bigger step than Expo Go and wasn't necessary for this first
version.

## Not included yet (intentionally out of scope for this pass)

- **Admin app** - left on web, per the agreed scope.
- **Push notifications** (Firebase Cloud Messaging / APNs) - the
  Notifications screen currently polls the same
  `/notifications/user/{id}` endpoint the web app's bell icon uses.
  Real push would need a Firebase project + APNs certificate, which
  needs your own Apple/Google developer accounts to set up.
- **Camera/image picker** for provider KYC docs and portfolio photos
  - provider-service already has the endpoints; the mobile screens
    for them weren't built in this pass.
- **App store submission** (bundle identifiers are placeholders -
  `com.occasionx.app` - and you'll need Apple Developer / Google Play
  Console accounts to publish for real).

## Project layout

```
src/
  api/            One file per backend area, mirrors web-app/src/services
  components/     Shared UI: PaymentWebView, ProviderCard, PrimaryButton, Screen
  context/        AuthContext (session state + SecureStore persistence)
  navigation/     RootNavigator switches Auth / Customer / Provider by role
  screens/
    auth/         Sign in, Register
    customer/     Home, CategoryProviders, ProviderDetails, Cart,
                   BookingReview, MyBookings, Wishlist, Notifications, Profile
    provider/     Dashboard, Bookings, Earnings, BankDetails
  theme/          Shared color palette (matches the web app's)
  utils/          cart.ts (AsyncStorage-backed, mirrors web's localStorage cart), format.ts
```

