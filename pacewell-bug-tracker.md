# Pacewell — Bug Tracker & Test Checklist
*Last updated: April 2026*

---

## 🔴 Critical (Must fix before launch)

| # | Screen | Issue | Status |
|---|--------|-------|--------|
| 1 | Auth | Re-enable email confirmation in Supabase before production | ⬜ Open |
| 2 | Insights | Change AI minimum check-ins threshold from 1 back to 3 | ⬜ Open |
| 3 | All | Full regression test on physical Android device | ⬜ Open |

---

## 🟡 High Priority (Fix before launch)

| # | Screen | Issue | Status |
|---|--------|-------|--------|
| 4 | Auth | Test full registration flow with email confirmation enabled | ⬜ Open |
| 5 | Auth | Test magic link flow end to end | ⬜ Open |
| 6 | Auth | Test delete account flow end to end | ⬜ Open |
| 7 | Auth | Test password reset flow end to end | ⬜ Open |
| 8 | Dashboard | Verify streak counter is accurate across timezone changes | ⬜ Open |
| 9 | Dashboard | Verify FAB → Log Activity → returns to Dashboard correctly | ⬜ Open |
| 10 | Check-in | Verify edit check-in flow works correctly (existing data pre-populated) | ⬜ Open |
| 11 | Check-in | Verify upsert works correctly when editing same day check-in | ⬜ Open |
| 12 | Activity | Verify FAB → Log Activity → returns to Activity tab correctly | ⬜ Open |
| 13 | Activity | Verify weekly goal progress bar calculates correctly | ⬜ Open |
| 14 | Activity | Verify delete activity removes from list immediately | ⬜ Open |
| 15 | Profile | Verify notification time change reschedules correctly | ⬜ Open |
| 16 | Profile | Verify units toggle persists after app restart | ⬜ Open |
| 17 | Profile | Verify wellness goal saves and reflects on activity screen | ⬜ Open |
| 18 | Profile | Verify marketing opt-in toggle saves to Supabase | ⬜ Open |
| 19 | Edit Profile | Verify profile changes save and reflect on profile screen | ⬜ Open |
| 20 | Edit Profile | Verify avatar upload works on fresh install | ⬜ Open |
| 21 | Insights | Verify insights generate after check-in submission | ⬜ Open |
| 22 | Insights | Verify today-only filter works correctly | ⬜ Open |
| 23 | Insights | Verify Learn more expands and Show less collapses | ⬜ Open |

---

## 🟢 Low Priority (Nice to fix before launch)

| # | Screen | Issue | Status |
|---|--------|-------|--------|
| 24 | All | Verify dark status bar text is readable on all screens | ⬜ Open |
| 25 | All | Verify splash screen colour matches app icon background | ⬜ Open |
| 26 | All | Verify no auth flash when reopening app while logged in | ⬜ Open |
| 27 | Dashboard | Verify avatar displays correctly after upload | ⬜ Open |
| 28 | Dashboard | Verify greeting changes correctly (morning/afternoon/evening) | ⬜ Open |
| 29 | Check-in | Verify X button returns to dashboard correctly | ⬜ Open |
| 30 | Check-in | Verify Back/Next buttons work alongside swipe navigation | ⬜ Open |
| 31 | Activity | Verify time of day displays correctly for logged activities | ⬜ Open |
| 32 | Notifications | Verify notification fires at correct local time | ⬜ Open |
| 33 | Notifications | Verify tapping notification deep links to check-in screen | ⬜ Open |
| 34 | Profile | Verify streak badge shows correct count | ⬜ Open |
| 35 | Profile | Verify avatar shows on profile after upload | ⬜ Open |

---

## 📋 Pre-Production Checklist

| # | Item | Status |
|---|------|--------|
| 1 | Change AI insights threshold back to 3 | ⬜ Open |
| 2 | Enable email confirmation in Supabase | ⬜ Open |
| 3 | Set up Apple Developer Account | ⬜ Open |
| 4 | Set up Google Play Developer Account | ⬜ Open |
| 5 | Create App Store screenshots | ⬜ Open |
| 6 | Write App Store description and keywords | ⬜ Open |
| 7 | Write Google Play description | ⬜ Open |
| 8 | Create Privacy Policy page | ⬜ Open |
| 9 | Create Terms of Service page | ⬜ Open |
| 10 | Complete age rating questionnaire | ⬜ Open |
| 11 | Production EAS build — Android | ⬜ Open |
| 12 | Production EAS build — iOS | ⬜ Open |
| 13 | TestFlight beta testing — iOS | ⬜ Open |
| 14 | Submit to App Store | ⬜ Open |
| 15 | Submit to Google Play | ⬜ Open |

---

## 🚀 Future Features (Post Launch)

| # | Feature | Priority |
|---|---------|----------|
| 1 | Wearable integration (HealthKit / Health Connect) | High |
| 2 | Nutrition logging | Medium |
| 3 | Weekly activity goal — full profile implementation | Medium |
| 4 | Historical activity log (beyond today) | Medium |
| 5 | Calendar view of check-ins | Medium |
| 6 | Insight detail screen | Low |
| 7 | Export health data | Low |
| 8 | Household / family accounts | Low |

---

## 📝 Notes

- Status legend: ⬜ Open · 🔄 In Progress · ✅ Fixed · ❌ Wont Fix
- Update this document as items are resolved
- All testing should be done on physical Android device
- iOS testing pending Apple Developer Account setup
