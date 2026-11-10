# 2026-11-10: The move-in date and the order of the offer (TR-036, plan 12)

Branch `feature/move-in-rules`, from `feature/event-edit`. Not merged.

## Problem

From the walkthrough (L-20; [plan 12](../plan/12-move-in-and-offer-order.md)):

- An application accepted a move-in of 30 Nov for a home available from 2 Dec.
- The offer appeared as soon as the form was sent. The app saved the terms, submitted and signed in one go, so the
  landlord first saw an application the tenant had already signed.

The owner decided both questions in chat: refuse an early move-in, and show the offer only after the landlord
approves.

## Change

- **Backend (`property-applications`):**
  - Steps 1 and 4 refuse a move-in before `HousingListing.availableDate`, compared by date part:
    `MOVE_IN_BEFORE_AVAILABLE`, "This home is available from 2 December 2026…". A listing without the date adds no
    rule.
  - `termsRead` and `termsAgreed` are optional on step 4. The terms are now sent before the agreement is read, and
    the signature is the acknowledgement.
  - Withdraw also takes an approved application the tenant has not signed (declining the offer); the landlord is
    told. Once signed, withdrawing is refused. This replaces L-23.
  - The response adds `landlordName`, `listing.country` and `listing.availableDate`.
  - The server still accepts a tenant signature before approval, for installed builds that sign when sending.
- **App:**
  - `property-agreement.tsx` has four parts: Apply, Sent, Your offer, Signed.
    - Apply has the move-in picker starting at the later of today and the available day, "Available from …" under
      it, and the lease length (12 or 6 months). Send saves step 1 and step 4, then submits.
    - Sent: waiting for the landlord, with Withdraw.
    - Your offer: read-only terms, the agreement, sign or Decline.
    - Signed: "It's agreed", with the copy in My Documents.
  - Reopening shows the part the application is at. The screen also opens from just an application id.
  - The "Change a term" chips and "Start a week later" are removed.
  - `notifications.tsx`: tapping an application notification opens the applicant's application, or the landlord
    dashboard for the landlord. A withdrawn or rejected one opens the listing.
  - `landlord-dashboard.tsx`: an approved, unsigned application is labelled "Waiting for signature".
  - The listing passes its available day (`listingModel.availableDay`) to Apply.

## How it was checked

- **Backend:** `tsc`, lint on the changed files, unit tests 120, e2e tests 62.
  - The unit fake now understands `OR`. The test that refused withdrawal after approval now declines an approved
    offer, and a new test refuses withdrawal after signing.
  - The 4 new e2e tests are in `test/design-d/move-in-offer.e2e-spec.ts`:
    - before, on and after the day, for steps 1 and 4;
    - no available day;
    - step 4 without the flags;
    - send, approve, sign gives `SIGNED` with a document (the upload is stubbed, so nothing goes to Cloudinary);
    - decline after approval; withdraw after signing is refused.
- **Mobile:** `pnpm typecheck`.
- **Phone** (OnePlus, Expo Go, local backend), as `uit_gps1`. The landlord was `uit_hannah5`, given a LANDLORD badge
  in the local database for the walk and removed afterwards; the landlord acted through the local API.
  - On a home available from 2 Dec, the picker opened on 2 Dec with 1 Dec greyed out and no way back to November.
  - The API refused 30 Nov for another test account with the message above.
  - Sent with 4 Dec and 6 months: the database showed `SUBMITTED` with those terms, and the screen showed "Sent,
    waiting for Hannah Kim". Reopening from the listing still showed Sent.
  - The landlord approved. Tapping "Application approved" opened the offer, with $3,429/mo, 4 Dec and 6 months, and
    no deposit row because the listing has none.
  - Decline: the dialog's Cancel kept the offer (`APPROVED`); Decline withdrew it, and the landlord got "Application
    withdrawn".
  - A second application (Culver City, 5 Dec, 12 months) was sent through the API and approved. Its offer opened from
    the notification and showed the US residential lease. "I have read" and a typed name enabled Sign; signing showed
    "It's agreed", and the database showed `SIGNED`.
  - For this signing walk the backend ran with the Cloudinary keys empty, so the agreement PDF would not be stored.
    The SDK still sent one unauthenticated request with an empty cloud name, which Cloudinary refused ("cloud_name
    is disabled"). No file and no credentials went out. The stored document is covered by the e2e test.
- The walk's applications, their notifications, the badge, and 30 "New event in your area" notifications (from the
  plan 11 test events) were deleted.

## Found while walking

- **Fixed:** from a notification, the agreement was the UK one for a Los Angeles home, because countries are stored as
  "United States". The market is now read from the currency or the country.
- **Not fixed:** opening another screen by deep link while the agreement sheet was open left the sheet drawn over the
  new screen. It only happened through the test shortcut (a deep link with a sheet open). A push notification tapped
  while a sheet is open could do the same.
- **Not fixed:** the listing's button says "View agreement" for a sent application.
- **Not walked:** the landlord dashboard label (no landlord account on the phone); iOS.
