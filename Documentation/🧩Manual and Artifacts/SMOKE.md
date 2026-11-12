# Smoke test — EDITORS.AdapterBuddy

Is `EDITORS.AdapterBuddy` deployed? Written by `.apk.scripts/smoke.py` from the module's own shape; what each check means is in that script's header.

← [Wiki home](../README.md)

**❌ FAIL** — 2/3 checks, since 2026-11-12 00:16 EST

| Check | Target | Result | Detail |
|---|---|---|---|
| pushed | [APK.softapp.EDITORS.AdapterBuddy](https://github.com/LikeDotAudio/APK.softapp.EDITORS.AdapterBuddy.git) | ❌ | 1 commit(s) not pushed |
| web | [index.html](https://apk.audio/APK%3ASoftapps/EDITORS/EDITORS.AdapterBuddy/index.html) | ✅ | HTTP 200 |
| app | `OS/Adapter Buddy` → `PODS/POD.THIN/Softapps/EDITORS/EDITORS.AdapterBuddy/index.html` | ✅ | present |

Re-run: `python3 .apk.scripts/smoke.py PODS/POD.THIN/Softapps/EDITORS/EDITORS.AdapterBuddy`

<!-- smoke:sig 85f216a3be5e since 2026-11-12 00:16 EST -->
