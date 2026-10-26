# B-gjengen — Outland HQ bread club

Single-page app (Norwegian bokmål) for three colleagues who share lunch loaves.
It tracks who bought which loaf, how many slices each person ate, and works out
whose turn it is next. Built as a claude.ai artifact; this repo is the port to
GitHub Pages.

## Status of this repo

- `index.html` is the complete app, ported from the claude.ai artifact. UI, logic
  and styling are done and should not be redesigned.
- It is live at https://siggiesmalls.github.io/bgjengen/ and the three members
  share one log in Firebase Firestore (project `b-gjengen`, location `eur3`).
- Images are local under `assets/`.

## Storage

- The Firebase compat SDK (app + firestore) is loaded from the gstatic CDN; there
  is no build step and the page must stay a single static file plus `assets/`.
- `boot()` at the bottom of `index.html` holds `FIREBASE_CONFIG` and the four
  subscriptions:
  - `club/settings` (one document: members, slicesPerLoaf, startDate, whatToBuy)
  - `loaves` collection (buyer, date YYYY-MM-DD, slices, note, createdAt)
  - `slices` collection, doc id `<date>_<memberId>` (member, date, slices, updatedAt;
    an absence registered ahead is `slices: 0, absent: true`)
  - `adjustments` collection: manual stock corrections (date, from, to, delta,
    shares {memberId: slices}, by, createdAt). If the rules don't allow it, the
    page still works and only the correction is refused.
- No login, by the owner's choice: everyone is a writer (`state.canWrite = true`)
  and members pick who they are with "Jeg er …". `firestore.rules` is the copy
  of the published rules: open read/write on exactly those four paths. Rules
  are published by hand in the Firebase console.
- A write that Firestore rejects with `permission-denied` shows the "no write
  access" messages.

### Seed data
`club/settings` was created with:
```json
{"slicesPerLoaf":20,"startDate":"2026-10-05","whatToBuy":"",
 "members":[
  {"id":"m1","name":"Brødsjefen","slicesPerDay":5,"days":[1,2,3,4,5],"preferredDay":1,"notes":""},
  {"id":"m2","name":"Brødstøtten","slicesPerDay":4,"days":[1,2,3,4,5],"preferredDay":3,"notes":""},
  {"id":"m3","name":"Brødutvikleren","slicesPerDay":5,"days":[2,3,4],"preferredDay":0,"notes":""}]}
```
`days` are JS weekday numbers (1 = Monday). `preferredDay` 0 = any buy day.

## Rules the logic implements (do not change without asking)
- The ledger is in slices. Contributed = slices in the loaves a person bought +
  their share of stock corrections. Eaten = registered slices; an unregistered
  day counts 0 once it is over. Before `ZERO_FROM` (2026-10-26) an unregistered
  office day counts the person's usual amount, so past numbers never change.
- Balance = contributed − eaten. Lowest balance buys next; ties: fewest loaves,
  then longest since last bought. The plan simulates day by day from today with
  usual rates, skipping absences.
- Stock = all loaf slices + corrections − all eaten. A manual correction splits
  the difference evenly over all members; leftover slices go +1 to the lowest
  contributors (increase) or −1 from the highest (decrease).
- Registering a loaf needs the slice count (no default).
- Preferred days decide *when* in the week, never *who*.
- Never buy on Fridays (`NO_BUY_DAYS = [5]`); Thursday covers Friday.
- Loaves before `startDate` are ignored. Balances never reset.
- "Jeg er …" selection is per device in `localStorage` (`breadclub.me`).

## Deploy
GitHub Pages, branch `main`, folder `/` (root). No build step.

## Design
Follows the Outland design system (Poppins, black app bar, white cards on
#f9f9fa, Outland green #35a581 / #2a8568, deep teal #005a4a). Light theme only.
