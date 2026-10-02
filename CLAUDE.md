# B-gjengen — Outland HQ bread club

Single-page app (Norwegian bokmål) for three colleagues who share lunch loaves.
It tracks who bought which loaf, how many slices each person ate, and works out
whose turn it is next. Built as a claude.ai artifact; this repo is the port to
GitHub Pages.

## Status of this repo

- `index.html` is the complete app as exported from the artifact. UI, logic and
  styling are done and should not be redesigned.
- **It does not work yet outside the artifact** for two reasons, both at the
  bottom of `index.html` in `boot()`:
  1. Shared storage used `window.claude.use('db')` — a Firestore-style document
     store that only exists inside claude.ai artifacts. Outside it, `boot()`
     sets `state.unavailable = true` and the page shows "Logg inn for å se klubben".
  2. `window.claude.use('user')` was used for `canWrite`. Outside, treat
     everyone as a writer (`state.canWrite = true`).
- Images are already local under `assets/`.

## The job

Replace the storage layer so the three members share one live log on GitHub Pages.

### Recommended: Firebase Firestore (free tier)
The existing code is written against an API that is nearly identical to the
Firestore web SDK (`doc`, `collection`, `get/set/update/delete`, `onSnapshot`,
`where/orderBy/limit`, `snap.exists`, `snap.data()`, `snap.docs`), so the port
is mostly wiring:

- Load the Firebase compat or modular SDK from the CDN (no build step; the page
  must stay a single static file plus `assets/`).
- In `boot()`, replace `await window.claude.use('db')` with the Firestore
  instance, and keep the three subscriptions as they are:
  - `club/settings` (one document: members, slicesPerLoaf, startDate, whatToBuy)
  - `loaves` collection (buyer, date YYYY-MM-DD, slices, note, createdAt)
  - `slices` collection, doc id `<date>_<memberId>` (member, date, slices, updatedAt)
- `exists` is a property in the artifact API; in the Firestore SDK it is
  `snap.exists()` (modular) or `snap.exists` (compat). Pick compat to minimise
  edits, or adapt the two call sites.
- Error handling branches on `ex.code === 'invalid_argument'` for "no write
  access"; map Firestore's `permission-denied` to the same path.
- Auth: simplest is Firebase anonymous auth plus a shared club passphrase
  checked in security rules via a custom claim or a `club/secret` doc — or, since
  this is three people and nothing sensitive, open rules restricted to the
  Pages origin via App Check. Keep it simple; the owner is an IT PM and can set
  up the Firebase project herself if given exact steps.

### Seed data
Create `club/settings` with:
```json
{"slicesPerLoaf":20,"startDate":"2026-10-05","whatToBuy":"",
 "members":[
  {"id":"m1","name":"Brødsjefen","slicesPerDay":5,"days":[1,2,3,4,5],"preferredDay":1,"notes":""},
  {"id":"m2","name":"Brødstøtten","slicesPerDay":4,"days":[1,2,3,4,5],"preferredDay":3,"notes":""},
  {"id":"m3","name":"Brødutvikleren","slicesPerDay":5,"days":[2,3,4],"preferredDay":0,"notes":""}]}
```
`days` are JS weekday numbers (1 = Monday). `preferredDay` 0 = any buy day.

## Rules the logic implements (do not change without asking)
- Fair share = each person's actual slices eaten (logged, falling back to their
  usual rate on unlogged office days) ÷ club total. Before anyone has logged,
  the usual rates are used. Whoever is furthest below their fair share buys next.
- Preferred days decide *when* in the week, never *who*.
- Never buy on Fridays (`NO_BUY_DAYS = [5]`); Thursday covers Friday.
- Loaves before `startDate` are ignored. Balances never reset.
- "Jeg er …" selection is per device in `localStorage` (`breadclub.me`).

## Deploy
GitHub Pages, branch `main`, folder `/` (root). No build step.

## Design
Follows the Outland design system (Poppins, black app bar, white cards on
#f9f9fa, Outland green #35a581 / #2a8568, deep teal #005a4a). Light theme only.
