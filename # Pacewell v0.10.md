# Pacewell v0.10.1 — End-to-End Test Plan
*Android only | June 16, 2026*

---

## Test Persona — Marcus Reid

| Field | Value |
|-------|-------|
| Name | Marcus Reid |
| Age | 45 |
| Activity level | Active |
| Primary activity | Running |
| Health goals | Injury prevention, sleep improvement, recovery |
| Units | Imperial (switch to metric mid-test) |
| Email | marcus.reid.test@example.com |
| Password | TestPass123! |

**Seed data covers:** June 9–15, 2026 (7 days, excluding today)
**Missing day:** June 10 (Tuesday) — check-in and activity absent, health metrics only

---

## Before You Start

1. Load the app: `npx expo start --dev-client` → press `a`
2. Run the seed SQL script in Supabase Dashboard → SQL Editor
3. Replace `YOUR_USER_ID_HERE` in the script **after** creating the account in step 1 of Section 1

---

## Section 1 — Account & Onboarding

### 1.1 Registration
- [✔] Tap **Create Account**
- [✔] Enter name: `Marcus Reid`, email: `marcus.reid.test@example.com`, password: `TestPass123!`
- [✔] Submit and confirm the email confirmation screen appears
- [✔] Check email and tap confirmation link
- [✔] Confirm app opens and proceeds past confirmation (app  opens on the login screen and then goes to the green loading screen and stays locked on that 
                                                        screen, when I reload the app it auto logs the user in without requiring them to log in.)

### 1.2 Profile Setup (this is done on sign up, it is the 2nd screen in the signup process)
- [✔] Complete step 1: age `45`, primary activity `Running` (there is no primary activity but there is an activity level, which has been set to 'Active')
- [✔] Complete step 2: activity level `Active`, health goals — select **Injury Prevention**, **Sleep**, **Recovery**
- [✔] Confirm you land on the dashboard after registration

### 1.3 Run the seed SQL
- [✔] Copy your user ID from Supabase Dashboard → Authentication → Users
- [✔] Replace `YOUR_USER_ID_HERE` in `test-data.sql`
- [✔] Run the script in Supabase SQL Editor
- [✔] Confirm no errors returned

---

## Section 2 — Daily Check-In Flow

### 2.1 Today's Check-In (June 16)
- [x] Tap the check-in FAB on the dashboard (the FAB is for activities and not check-ins)
- [✔] Swipe through all 8 cards — enter values for today:
  - Mood: **Good (4)**
  - Energy: **Good (4)** (Energised, there is no Good energy)
  - Stress: **Low (2)**
  - Sleep quality: **Good (4)**
  - Sleep hours: **7.5**
  - Nutrition quality: **Good (4)**
  - Water intake: **8 glasses**
  - Notes: *"First test check-in"*
- [✔] Submit and confirm return to dashboard
- [✔] Confirm dashboard streak has updated
- [✔] Confirm check-in card on dashboard shows completed state

### 2.2 Duplicate Check-In Prevention
- [✔] Attempt to open the check-in flow again for today
- [✔] Confirm the app either blocks it or handles upsert gracefully (no duplicate row) (it will not be blocked, it will be updated and it was)

---

## Section 3 — Activity Logging

### 3.1 Manual Activity Log
- [✔] Navigate to Activity tab
- [✔] Tap **Log Activity**
- [✔] Enter: type `Running`, duration `40 min`, exertion `3 (Moderate)`, notes *"Easy morning run"*
- [✔] Save and confirm it appears in today's activity list
- [✔] Confirm imperial units display correctly (minutes, no unit conversion needed here)

### 3.2 Wearable Sync
- [✔] Open **Sync Settings** modal from Profile
- [✔] Tap **Sync Now** (manual sync)
- [✔] Confirm last synced time updates
- [✔] Navigate to Activity tab and confirm any wearable workouts from the AmazFit appear
- [✔] Confirm steps and heart rate appear in today's data if available

**we need to add the steps and heart rate (maybe) to the app so users can see this information**

---

## Section 4 — Insights

### 4.1 Manual Insight Generation
- [✔] Navigate to **Insights** tab
- [✔] Tap **Generate Insights**
- [✔] Confirm generation triggers (no "need 3 check-ins" error — seed data covers 6 of 7 days)
- [✔] Confirm insights appear on screen after generation completes
- [✔] Confirm the insight types returned are valid (trend, correlation, anomaly, or prediction)

**Insights seems to generate mutiples of the same thing, ie Sleep, Recovery, Pattern etc. It should be unique. I notice when updated a check-in insights regenerate, it should not do this only on initial check-in**

### 4.2 Dashboard Insight Card Refresh
- [✔] Complete today's check-in if not already done (Section 2.1)
- [✔] Navigate to Dashboard
- [✔] Confirm the AI insight card updates within ~30 seconds without manually refreshing
- [✔] If no update: wait the full 30 seconds (6 polling attempts × 5 seconds)

### 4.3 Insight Messaging — Missing Days Edge Case
- [✔] Delete all seed data check-ins temporarily (optional — or create a fresh test account)
- [✔] Attempt to generate insights with 0 check-ins
- [✔] Confirm message reads: *"Complete at least 3 check-ins in the last 14 days to generate insights."*
- [✔] Navigate away from Insights tab
- [✔] Return to Insights tab
- [✔] Confirm the error message is gone (cleared on navigation)

**once insights have been generated, I am still able to generate more insights and instead of checking to see if there have been insights already generated for the day it creates a new sets of insights and lists both. I can keep going and get more insights of the same sections with different information. Insights were generated automatically as well. Once generated, we should not be able to generate another for the same day**

---

## Section 5 — Settings & Preferences

### 5.1 Units — Imperial to Metric
- [✔] Navigate to Profile → Preferences
- [✔] Confirm weight is currently displayed in **lbs** (imperial)
- [✔] Switch units to **Metric**
- [x] Navigate to dashboard or any screen showing weight (we don't show the users weight or steps or heart rate anywhere in the app, we need to add this 
                                                          somewhere)
- [x] Confirm weight now displays in **kg** (82.5 kg for Marcus)
- [✔] Switch back to Imperial
- [x] Confirm it reverts correctly

### 5.2 Bedtime Notification
- [✔] Navigate to Profile → Preferences → Bedtime
- [✔] Set bedtime to **10:00 PM**
- [✔] Confirm bedtime notification is scheduled (check device notification settings)
- [✔] Optionally: set bedtime to 2 minutes from now to test actual notification fires

### 5.3 Check-In Reminder Notification
- [✔] Confirm a daily check-in reminder notification is scheduled (this has been set by default, 8AM. It should not be set until the user does so)
- [✔] Check device notification settings → Pacewell → confirm notifications are enabled
- [✔] Optionally: set reminder time to 2 minutes from now to verify it fires

---

## Section 6 — Profile Management

### 6.1 Edit Profile
- [✔] Navigate to Profile → Edit Profile
- [✔] Change name to `Marc Reid`
- [✔] Save and confirm name updates across the app (dashboard greeting, profile screen)
- [✔] Change name back to `Marcus Reid`

### 6.2 Avatar Upload
- [✔] Tap the avatar on Profile screen 
- [✔] Select a photo from the device gallery
- [✔] Confirm upload completes and avatar displays
- [✔] Confirm avatar persists after navigating away and returning

### 6.3 Wellness Goals
- [✔] Open Wellness Goals modal
- [✔] Adjust weekly activity goal
- [✔] Save and confirm the value persists

---

## Section 7 — Account Management

### 7.1 Sign Out & Sign Back In
- [✔] Sign out from Profile screen
- [✔] Sign back in with `marcus.reid.test@example.com` / `TestPass123!`
- [✔] Confirm all data is intact after sign-in

### 7.2 Password Reset (Dev Build Note)
- [✔] Request a password reset email
- [✔] Confirm email arrives
- [✔] Note: redirect URL will not deep-link correctly in a dev build — this is expected
- [✔] Full test deferred to production build

### 7.3 Delete Account
- [✔] Create a **separate throwaway account** for this test (do not delete Marcus)
- [✔] Navigate to Profile → Delete Account
- [✔] Type `DELETE` to confirm
- [✔] Confirm user is signed out
- [✔] Check Supabase Dashboard → Authentication → Users to confirm auth user is gone
- [✔] Check all DB tables to confirm cascade delete wiped all rows for that user
- [✔] Confirm the throwaway user cannot sign back in

---

## Section 8 — Edge Cases

### 8.1 Missing Day in Seed Data (June 10)
- [x] Navigate to any historical view or check streak count (there isn't a historical view or streak count view. I had to check the DB)
- [x] Confirm the app handles the gap gracefully — no crash, no incorrect streak count (we need to build this so we can see previous days check-ins and be able 
                                                                                        to edit and/or delete it)

### 8.2 App Backgrounding
- [✔] Start a check-in, background the app, return
- [✔] Confirm state is preserved or reset gracefully (if the app is background state is preserved, if the app is swiped away it reloads with user still logged 
                                                       in)

### 8.3 No Network
- [✔] Enable airplane mode
- [✔] Attempt to generate insights
- [✔] Confirm a graceful error is shown, no crash (the message is 'No active session', the message should say they are offline)
- [x] Re-enable network and confirm app recovers (received a network request failed when I enabled the network again)

---

## Pass Criteria

| Area | Pass |
|------|------|
| Registration & email confirmation | ✅ / ❌ |
| Check-in saves and updates streak | ✅ / ❌ |
| Activity log saves correctly | ✅ / ❌ |
| Wearable sync completes | ✅ / ❌ |
| Insights generate from seed data | ✅ / ❌ |
| Dashboard insight card auto-refreshes | ✅ / ❌ |
| Insight error message clears on navigation | ✅ / ❌ |
| Units toggle works correctly | ✅ / ❌ |
| Notifications scheduled | ✅ / ❌ |
| Edit profile saves | ✅ / ❌ |
| Avatar uploads and persists | ✅ / ❌ |
| Delete account removes auth user + all data | ✅ / ❌ |
| Missing day handled gracefully | ✅ / ❌ |
| App recovers from no network | ✅ / ❌ |