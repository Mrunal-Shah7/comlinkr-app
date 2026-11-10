# Testing on the phone

_2026-11-04. How Claude tests the app on a real Android phone, over USB or wireless debugging, with scrcpy.
**State: working.** First run the same day: the smoke checklist on a OnePlus Nord CE4 (Android 16) over wireless
debugging, in Expo Go, through MCPier's `android` server ([run log](device-runs/2026-11-04-00-smoke.md))._

## What it is

Claude drives the phone like a person: it reads the screen (screenshots and the UI tree), taps, swipes and types,
and checks what it sees against a checklist. It does what the "P" rows of a checklist ask, records the result in a
run log, and updates the module's review. This replaces a scripted UI test suite for now.

What it is good for: walking journeys end to end, reproducing a reported bug, checking a fix on the device,
finding things the code reading missed.

What it is not: a suite that runs the same way every time without Claude, in CI or by a teammate. Each run costs
time and tokens and may take slightly different paths. Keep checklists precise (exact screens, buttons and
expected text) so runs are comparable. If an unattended regression suite is wanted later, the checklists are the
starting point for one.

## Tools

| Tool | Role |
|---|---|
| MCPier `android` server ([scrcpy-mcp](https://github.com/JuanCF/scrcpy-mcp) tools, 39 tools) | How Claude reaches the phone today, through the MCPier connector (`search_tools`, `call_tool`, `execute` for several calls in one script). Tools: `screenshot`, `tap`, `swipe`, `input_text`, `key_event`, `ui_find_element`, `ui_dump`, `app_start`, `shell_exec`, `start_session` / `stop_session`. No `.mcp.json` needed in the repository |
| scrcpy (`C:\Program Files\scrcpy-win64-v3.3.3`) | The owner can watch the phone on the PC; also used to record screens frame by frame (as for the white-flash bug) |
| adb (`%LOCALAPPDATA%\Android\Sdk\platform-tools`) | Device connection, `adb reverse`, logs (`adb logcat`) |

scrcpy-mcp is a third-party package with one maintainer, and it gives the agent a shell on the phone. Before the
first use: read its source at the pinned version, keep the version pinned, and update only after reading the
changes.

## Set up once

1. **Phone.** Settings → About phone → tap Build number 7 times. Developer options → turn on USB debugging (and
   Wireless debugging for wireless).
2. **USB.** Plug in, accept the "Allow USB debugging" prompt, then `adb devices` must list the phone as `device`.
3. **Wireless** (phone and PC on the same network):
   - Android 11 and later: Wireless debugging → Pair device with pairing code →
     `adb pair <phone-ip>:<pair-port>` (enter the code), then `adb connect <phone-ip>:<port>`.
   - Or, while on USB: `adb tcpip 5555`, unplug, `adb connect <phone-ip>:5555`.
   - `adb reverse` works over wireless too, so the phone's `localhost` still reaches the PC.
4. **Give the phone a serial without spaces.** A wireless device found by mDNS gets a serial like
   `adb-d9bf1d37-VVLKjS (2)._adb-tls-connect._tcp`; the MCP server splits it at the space and reports "no
   authorized device". Run `adb mdns services`, then `adb connect <ip>:<port>` for the connected service, and pass
   that `ip:port` as `serial` to every MCP call.
5. **MCP server.** Through MCPier: `list_servers` must show `android` as ready. (Without MCPier, add scrcpy-mcp to
   `.mcp.json` at the repository root; on Windows Claude Code needs `cmd /c` for npx:
   `{"mcpServers": {"scrcpy": {"command": "cmd", "args": ["/c", "npx", "-y", "scrcpy-mcp@0.5.0"]}}}`.)
6. **The build.** Expo Go (needs a version matching the SDK: 57.x for SDK 57) or a development build of
   `com.comlinkr.app` (`npx expo run:android`), loaded from Metro on the local backend. Never walk an EAS build:
   every EAS profile points at production. See [system-map.md](system-map.md#how-it-runs-locally).

### Starting a run without editing `.env`

Both apps let a variable already set in the process win over `.env`, so nothing needs editing or switching back:

```
# backend: email sending off for this process (OTP codes go to the log)
cd backend && RESEND_API_KEY= npx pnpm@9.15.0 start:dev

# Metro: local API for this process only; .env keeps the production URL. GoogleService-Info.plist is not in the
# repository (gitignored); without a file at GOOGLE_SERVICE_INFO_PLIST every cold start of the app fails ("Something
# went wrong", "Failed to download remote update"). Point it at any placeholder plist outside the repository.
cd frontend/apps/mobile && GOOGLE_SERVICE_INFO_PLIST=<path to a placeholder plist> EXPO_PUBLIC_API_BASE_URL=http://localhost:4000/api npx expo start --lan --port 8083

adb -s <ip:port> reverse tcp:4000 tcp:4000
adb -s <ip:port> reverse tcp:8083 tcp:8083
adb -s <ip:port> shell am start -a android.intent.action.VIEW -d exp://127.0.0.1:8083 host.exp.exponent
```

Metro's `env: export …` line lists the variables it took from `.env`; `EXPO_PUBLIC_API_BASE_URL` must not be in
it. Expo Go keeps its sign-in between runs, so check who is signed in before the first step.

## Before each walk

1. Backend running (`pnpm start:dev`), `adb reverse tcp:4000 tcp:4000` and `tcp:8083`, Metro running.
2. Check the app is on the local backend: open any list and see the request in the backend log. If nothing
   arrives, stop; the app may be on production.
3. Write down any setting the walk will change (profile fields, city, theme, notification preferences) so it can be
   put back.
4. Sign in only as a seeded test account (`*@comlinkr.test`).

## During the walk

- Prefer finding elements by visible text or accessibility label (`ui_find_element`) over fixed coordinates.
  Controls that are hard to find get an `accessibilityLabel` in the code, in the same pull request as the checklist
  that needs it. Many controls report `clickable: false`; tap their visible icon or label anyway.
- Wait about 1.5 s after a tap that opens a menu, dialog or screen before the next tap (`shell_exec` with
  `sleep 1.5`; `execute` scripts have no `setTimeout`). Taps during an animation are lost.
- Take screenshots with no scrcpy session running (`stop_session`): the session's frames can lag a step behind,
  while `adb screencap` is always current. Screenshot coordinates are scaled; convert, or read positions from
  `ui_find_element`, which uses the phone's own pixels.
- Type with a scrcpy session running (`start_session`, then `stop_session` before the next screenshot). Without
  one, text goes through `adb input text`, which added a character to a password containing `!` (12 characters
  for 11). Check the field's text length in `ui_dump` before submitting; an empty field reports its hint as text.
- Before typing, check the field is focused and visible (`ui_dump`, `focused="true"`). The keyboard covers the
  lower half of the screen; a tap there hits the keyboard (one opened Gboard settings). Close it with Back before
  tapping a button it covers.
- In the signed-in side menu, scroll before tapping anything near the bottom: the Log Out footer is pinned over
  the last rows.
- Take a screenshot at each checkpoint the checklist names. Screenshots go to the session scratchpad, not the
  repository, unless they show only test data.
- Record each step as it happens, not from memory at the end.
- A crash or red screen: capture `adb logcat -d -t 500` and the backend log before doing anything else.
- Do not touch other apps, the phone's settings (beyond what the checklist says) or real accounts.

## After the walk

1. Delete what the walk created (posts, listings, messages, test users made during the walk) and check it is gone.
   Put changed settings back.
2. Write the run log in `docs/device-runs/` (format in its README).
3. Update the module's review: statements now seen on the phone become **[observed]**, problems go under
   "Problems found", and the checklist rows that passed are ticked.
4. A problem that needs fixing gets a line in `docs/triage.md`.

## Checklist actors

Each checklist row says who does it:

- **P**: Claude on the phone through scrcpy-mcp.
- **A**: Claude calling the local API directly (`http://localhost:4000/api`) as a test account.
- **D**: Claude reading the local database (structure, and rows the walk wrote).
- **C**: Claude confirming in code that something cannot be reached from any screen, or can only be read, not run,
  locally.
- **YOU**: the owner by hand (iOS, store builds, production, anything needing a real account).

## Limits

- Android only. iOS needs a Mac.
- Google Sign-In, Apple sign-in, Firebase and push need a development build; Expo Go cannot show them.
- Sign-up and password reset depend on the backend logging the OTP (`RESEND_API_KEY` empty locally).
- A development build runs JavaScript in dev mode, which is 2–4× slower than a release build. Performance numbers
  from a walk are only for comparison with other walks.

## Checking things a screenshot cannot catch

A flash or a jump lasts a few frames. Record on the PC with scrcpy and measure each frame with ffmpeg
(`adb shell screenrecord` is refused on the OnePlus test phone):

```
scrcpy -s <ip:port> --no-window --no-audio --no-control --max-fps=60 --record=back.mp4 --time-limit=5
# …do the action on the phone while it records…
ffmpeg -i back.mp4 -vf "signalstats,metadata=print:key=lavfi.signalstats.YAVG:file=yavg.txt" -f null -
ffmpeg -i back.mp4 -vf "select='between(t,1.9,2.3)',scale=270:-1,tile=4x3" -frames:v 1 strip.png
```

`yavg.txt` gives each frame's average brightness (a white frame is near 235; the dark theme is about 35); the tile
image shows the frames around the action. Keep recordings in the session scratchpad. In Git Bash, prefix adb
commands that take a phone path with `MSYS_NO_PATHCONV=1`, or `/sdcard/…` is rewritten into a Windows path.
