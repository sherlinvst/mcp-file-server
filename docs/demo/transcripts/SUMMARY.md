# Tool-call summary

Generated from the server's audit log by `npm run export`. One row per session.

| Session | Calls | Errors | State-changing | Code/test/README edits | Repeated reads | Retried errors | Batched (<=1 s) | Chars returned | Duration | Transcript |
|---|---|---|---|---|---|---|---|---|---|---|
| S1 Builder | 26 | 0 | 15 | 7 | 0 | 0 | 0 | 8865 | 1m 39s | [01-S1-Builder.md](01-S1-Builder.md) |
| S2 Builder | 25 | 0 | 13 | 5 | 0 | 0 | 0 | 18065 | 1m 33s | [02-S2-Builder.md](02-S2-Builder.md) |
| S3 Reviewer | 33 | 0 | 8 | 0 | 0 | 0 | 0 | 51849 | 4m 58s | [03-S3-Reviewer.md](03-S3-Reviewer.md) |
| S4 Guard check | 20 | 15 | 4 | 3 | 3 | 0 | 0 | 661 | 2m 45s | [04-S4-Guard-check.md](04-S4-Guard-check.md) |

**How to read this.** *Errors* include guard rejections that were requested on purpose. 
*State-changing* counts every successful write, edit, append, delete and commit; a session-end commit and log appends are normal for every role. 
*Code/test/README edits* counts successful write, edit and delete calls on any file other than the four notebook files, which is the role check for a Reviewer. 
*Repeated reads* count identical read calls with no write in between (wasted work). 
*Retried errors* count a failed call repeated unchanged. 
*Batched* counts calls that arrived within one second of the previous call, which suggests the agent asked for independent calls together.
