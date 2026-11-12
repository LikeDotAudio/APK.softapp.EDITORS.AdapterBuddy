# Smoke test — EDITORS.AdapterBuddy

Is `EDITORS.AdapterBuddy` deployed? Written by `.apk.scripts/smoke.py` from the module's own shape; what each check means is in that script's header.

← [Wiki home](../README.md)

**✅ PASS** — 3/3 checks, since 2026-11-12 00:27 EST

| Check | Target | Result | Detail |
|---|---|---|---|
| pushed | [APK.softapp.EDITORS.AdapterBuddy](https://github.com/LikeDotAudio/APK.softapp.EDITORS.AdapterBuddy.git) | ✅ | HEAD is on origin |
| web | [index.html](https://apk.audio/APK%3ASoftapps/EDITORS/EDITORS.AdapterBuddy/index.html) | ✅ | HTTP 200 |
| app | `OS/Adapter Buddy` → `PODS/POD.THIN/Softapps/EDITORS/EDITORS.AdapterBuddy/index.html` | ✅ | present |

Re-run: `python3 .apk.scripts/smoke.py PODS/POD.THIN/Softapps/EDITORS/EDITORS.AdapterBuddy`

<!-- smoke:sig 131537ab67de since 2026-11-12 00:27 EST -->
