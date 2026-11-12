# PRD: Notes with tags and search

A private notes app for people who capture ideas all day.

- Email/password accounts.
- Notes have a title (required, ≤120 chars) and a body (plain text with line breaks, ≤20,000 chars).
- Notes can have tags (lowercase words, max 10 per note). Users can filter notes by one tag.
- Full-text search over titles and bodies of the user's own notes; results update as you type
  (debounced), matching is case-insensitive.
- Notes list shows newest edited first, with a short preview of the body.
- Pinning: pinned notes always show first.
- Notes can be archived (hidden from the main list, visible in an Archive view) and restored.
- Users only ever see their own notes and tags.
