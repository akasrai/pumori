# PRD: Split expenses with friends

Friends sharing costs (trips, flats) want to know who owes whom without spreadsheets.

- Email/password accounts.
- A user creates a group (name, currency from a fixed list: USD, EUR, GBP, NPR) and invites others by
  email. Invites are sent as emails (in development: shown in a local "outbox" page instead of real email).
  An invited person joins by following the invite link and signing up or logging in.
- Group members add expenses: description, amount (2 decimals), payer (a member), date, and how it is
  split: equally among selected members, or exact amounts per member (must sum to the total).
- Each group shows every member's balance (paid minus owed) and a simplified "who pays whom" list with
  the fewest transfers.
- Members can record a settlement (A paid B an amount), which updates balances.
- Members can edit or delete expenses they created; every change is visible in a group activity feed.
- Only group members can see a group, its expenses and balances.
