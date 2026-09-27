# PR Reviewer Assignment Bot

Round-robins PR review requests across a roster, posts/updates Slack status
messages, sends reminders, and cleans up on close/merge. Implemented across
five workflows:

- `pr-reviewer-assign.yml` — assigns reviewer(s) on open/reopen/ready-for-review,
  posts the initial Slack message.
- `pr-reviewer-remind.yml` — cron (every 6h) that nudges reviewers after 36h
  of inactivity and cleans up state files 7 days after resolution.
- `pr-review-status.yml` — updates Slack + bot state when a review is submitted.
- `pr-closed.yml` — marks the PR merged/closed and freezes the Slack message.
- `pr-no-review-label.yml` — opt-out: applying the `no-review` label drops
  review requests, deletes the Slack message/thread, and untracks the PR.

All state lives on an orphan `bot-state` branch (not `main`), which is
checked out by each workflow and committed/pushed back by github-actions[bot].
It contains:

```
config.json      # committed manually, see below — the bot never edits this
state.json       # { "cursor": <int> } — round-robin position, bot-managed
prs/<owner>_<repo>_<number>.json   # one file per tracked PR, bot-managed
```

## `config.json` schema

```json
{
  "roster": ["github-login-1", "github-login-2"],
  "github_to_slack": {
    "github-login-1": "U0XXXXXXX1",
    "github-login-2": "U0XXXXXXX2"
  },
  "always_reviewer_slack": "U0XXXXXXX0",
  "slack_channel_id": "C0XXXXXXX"
}
```

- `roster` — GitHub usernames eligible for round-robin assignment.
- `github_to_slack` — maps GitHub login → Slack member ID, used for @-mentions.
  Only needs entries for people who should be mentioned in Slack.
- `always_reviewer_slack` — Slack ID of a reviewer cc'd on every PR (e.g. a
  lead). If the PR author's Slack ID equals this, they're excluded from being
  their own always-reviewer and a second roster reviewer is picked instead.
- `slack_channel_id` — channel the bot posts to. If empty/absent, or if
  `SLACK_BOT_TOKEN` isn't set, Slack calls are skipped entirely and the bot
  still functions (GitHub review requests + fallback PR comments for
  reminders), just without Slack notifications.

`config.json` is edited directly on the `bot-state` branch (not through these
workflows) whenever the roster or Slack mapping changes.