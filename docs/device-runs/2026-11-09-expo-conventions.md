# 2026-11-09: Expo conventions and one HTTP client (TR-013)

Build: Expo Go on the OnePlus (Android 16), `chore/expo-conventions` at `4e3d158`, Metro with
`EXPO_PUBLIC_API_BASE_URL=http://localhost:4000/api` (cache cleared), local backend with `RESEND_API_KEY=` empty,
`ui_tester`.

| ID | Result | Note |
|---|---|---|
| C-01 | pass | Cold restart (force-stop Expo Go) straight into Notifications: `/auth/me`, `/notifications`, `/saves` answer 200/304, no 401, so the cookie is read back from SecureStore without the removed axios binding |
| C-02 | pass | Wrong password: the field shows the server's "Invalid email/username or password." |
| C-03 | pass | Sign in with the test password lands on Explore, Los Angeles |
| C-04 | pass | Edit profile: bio "Walk test" saved (`PATCH /users/me` 200, then the onboarding re-save: 3 GETs and 4 POSTs, all 2xx); bio cleared and saved again (database shows an empty bio) |
| C-05 | pass | Forgot password: "Email me a code" moves to the code step; the backend logs the PASSWORD_RESET OTP. Not completed, so the test password is unchanged |
| C-06 | pass | Log out (`POST /auth/logout` 201) returns to the sign-in screen; signing back in works |
| C-07 | not checked | Onboarding dots (needs a new account) and a tap with the keyboard open (the walk closed the keyboard before each tap) |

Put back: bio empty again; the unused reset code expires on its own.
