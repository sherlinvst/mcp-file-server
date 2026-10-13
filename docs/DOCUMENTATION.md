# Ticsay, Sherlin Vincent S. [BSCS-3B]

# MCP File-Server Connector: Project Documentation

This document records how the project was developed, what went wrong, how each problem was fixed, why I redid everything, and the evidence from the demo. The project is completed with the help of AI, specifically Claude, ChatGPT, and Gemini.

---

## 1. What was built

| Part | Summary |
|---|---|
| Server | Node.js and TypeScript MCP server over Streamable HTTP, with 9 tools (6 file tools, 3 git-lite tools) |
| Sandbox | All file access is confined to `workspace/`; escapes are rejected and tested |
| Guards | `.git` is unreadable and unwritable; the three log files are append-only; the four notebook files cannot be deleted |
| Login | Secret URL (for claude.ai) and bearer token (for other clients), constant-time comparison, failed-attempt limiter |
| Audit log | Every tool call is written to `logs/tool-calls.jsonl` and exported as readable per-session transcripts |
| Deployment | ngrok static domain for a public HTTPS address; pm2 keeps the server and tunnel running |
| Handoff protocol | Four notebook files (`PROJECT_STATE`, `PLAN_LOG`, `CHECKPOINTS`, `DECISIONS`) and a written protocol with roles and efficiency rules |
| Client | Claude on claude.ai, as a custom connector |
| Demo task | A Python command-line notes app (`add`, `list`, `search`, `delete`) with tests and a README, built by the agent through the tools |

---

## 2. How the project was developed

The work followed the five milestones from the slides, then a review that led to a second, properly recorded run.

| Phase | Milestone | What I did |
|---|---|---|
| 1. Plan | N/A | Read the requirements and rubrics; chose the reference stack (Node.js and TypeScript, Streamable HTTP, zod, ngrok, pm2, git) |
| 2. Skeleton | M1 | Project setup; Express server; MCP endpoint; first tool `list_files` |
| 3. Sandbox | M2 | `resolveSafe()` path protection; the remaining file tools; sandbox tests 
| 4. Deploy | M3 | ngrok static domain; pm2 for the server and tunnel; connect a real AI client |
| 5. Protocol | M4 | Four notebook files; the three git tools; first guards (no `.git` writes, no deleting notebook files); seed script |
| 6. First demo | M5 | Run 1: six chat sessions building the notes app |
| 7. Review | N/A | Compared the result with the rubrics. Found security gaps and no tool-call record |
| 8. Hardening | stretch | Added authentication (secret URL and bearer token, limiter), full guards, committed guard tests |
| 9. Recording | stretch | Added the audit log, session markers, the transcript exporter, roles and efficiency rules |
| 10. Second demo | M5 | Run 2: on the final code with everything recorded |

### 2.1 Phase detail

#### Phase 2: skeleton (M1) 
I created the project with `npm`, installed the MCP SDK, Express and zod, and wrote a server that builds a fresh MCP server for each request. The first tool, `list_files`, proved the whole path: client, HTTP, tool, file system. 
- Problems: 
PowerShell differences, missing Node type definitions, the Inspector transport form and its OAuth confusion.

#### Phase 3: sandbox (M2) 
`resolveSafe()` resolves every path against `workspace/`, rejects anything outside it, and checks symlinks. I added `read_file`, `write_file`, `str_replace` (exactly one match), `delete_file` and `append_file`, plus tests for traversal, absolute paths, null bytes and sibling-prefix tricks. 
- Problem: one test failed on Windows because of short folder names.

#### Phase 4: deploy (M3) 
I registered an ngrok account and claimed a static domain, put the server and tunnel under pm2, and connected a client. This was the longest phase. 
- Problems: ngrok authtoken typing, pm2 could not start ngrok, DNS and TLS trouble, no pm2 startup on Windows, and the choice of AI client, which took several attempts.

#### Phase 5: protocol (M4)
I added `git_status`, `git_commit` and `git_log` (run with fixed arguments, no shell), the four notebook files with entry formats, and a seed script. 
- Problems: the missing `seed` script, the agent not finding files outside the sandbox.

#### Phase 6: first demo (M5, Run 1)
Six sessions built the notes app. Session 1 hit a git failure and Session 3 ran out of tokens. 

#### Phase 7: review 
I compared the server with the rubrics and found three things, described in section 3.

#### Phase 8: hardening 
The deadline is extended, so I added token authentication, made the server enforce the append-only and `.git` rules instead of leaving them to the protocol, and covered them with 19 committed tests.

#### Phase 9: recording 
I added an audit log that records every call outside the workspace, `npm run mark` to label sessions, and `npm run export` to turn the log into transcripts with simple efficiency measures. I added Builder and Reviewer roles and efficiency rules to the protocol.

#### Phase 10: second demo (Run 2) 
Everything was reset to a clean workspace and rerun with recording on.

---

## 3. Why I redid everything

### 3.1 The server lacked security

| Gap in Run 1 | Why it mattered |
|---|---|
| `.git` could be read through `read_file` and `list_files` | The agent could read its own history files. Only writes and deletes of `.git` were blocked |
| The three log files were append-only only by convention | The protocol told the agent to use `append_file`, but the server still allowed `write_file` and `str_replace` to overwrite them. A rule that only a prompt enforces is weak |
| Guards compared plain file names | On Windows `decisions.md`, `DECISIONS.md.` and `DECISIONS.md:x` reach the same file, so a plain name check could be bypassed |
| No authentication on the public address  | Anyone who found the address could use the tools. |


### 3.2 The sessions were not recorded

| Gap in Run 1 | Why it mattered |
|---|---|
| The chat text held my prompts and Claude's narration, but not the actual tool calls | The rubric grades the tool-call transcript and "calls are logged" |
| The only server record was one line per call in pm2's log, with arguments cut to 300 characters and no results| It could not prove what a call returned or whether it was an error |
| No way to tell which calls belonged to which session | Efficiency could not be measured |

The fix is the audit log and exporter.

### 3.3 Interruptions during Run 2 that forced a reset or a rerun

These happened while I was redoing the work. Each is recorded in full in section 5.4.

| # | Interruption | Effect |
|---|---|---|
| I1 | I pasted Session 2's pytest output into Session 1's chat by mistake | The session no longer matched the plan; I reset the workspace |
| I2 | An earlier attempt's call log held entries that were not written by the live server | I set the log aside, made the exporter refuse such lines, and reran |
| I3 | The guard-test session paused partway | Caused an abrupt pause in the session |

---

## 4. Run 1 (archived)

Run 1 lives in `docs/archive/run1/`: a workspace snapshot. It used the older tool code.

### 4.1 Session timeline

Six chat sessions were run with Claude. The agent picks the session number itself: the highest session number in the logs, plus one. Numbers were never reset, so the gaps are real.

| Session | What happened | Outcome |
|---|---|---|
| S1 | Read the protocol, recorded D-001 and D-002, wrote the `notes/` package and 6 tests. Its session-end `git_commit` failed twice* with no useful message, so it wrote CP-001 saying there was no commit | Partial Done |
| S2| Fresh chat. Recovered state from the files, noticed the git history differed from S1's notes, retried the commit, and it worked. Wrote CP-002 | Done |
| S3 | I answered the open questions. The agent recorded D-003, deleted scratch files, implemented `search` and `delete` (D-004), wrote the README and appended CP-003. I ran out of tokens before it could commit CP-003 and rewrite `PROJECT_STATE.md` | Interrupted |
| S4 | New chat, same prompt. The agent recovered from the files, noticed S3 had been cut off, did not repeat S3's work, and finished S3's session end. Wrote CP-004 | Done |
| S5 | One short command: delete `test_commit` and commit | Done |
| S6 | One short command: list all workspace files | Done |

### 4.2 Session 1: failure

#### What went wrong
`git_commit` failed twice with only `Command failed`. `git_status` kept reporting a clean tree even though `notes/` and `tests/` had just been created, and `git_log` showed "9 commits from an apparently unrelated TypeScript project". The agent could not explain this, so it did the honest thing: it wrote CP-001 as "Commit: NONE, nothing verified".
- Root cause 
The workspace had no git history of its own, and git was silently using my parent project's repository. Three details combined:

1. `ensureRepo()` checked the wrong thing. It asked git `rev-parse --git-dir`, which succeeds when git finds any repo above the folder, so `git init` never ran inside `workspace/`.
2. The parent repo ignores `workspace/`. My main `.gitignore` lists `/workspace/`, so the workspace contents did not exist from that repo's point of view. That is why `git_status` was clean and `git add -A` staged nothing.
3. The error message was swallowed. `git commit` prints "nothing to commit" on standard output, but my wrapper reported only the generic exception text.

The "9 TypeScript commits" were my parent project's own history.

### 4.3 Session 1: problem fixed

(`src/git.ts`):

| Change | Effect |
|---|---|
| `ensureRepo()` checks for `workspace/.git` directly | The workspace always gets its own git history |
| `GIT_CEILING_DIRECTORIES` is set to the workspace's parent | Git can never climb into a parent repo; a missing repo causes a clear error |
| Failures include git's real output | The agent sees "nothing to commit" or "Author identity unknown" and can react |
| I initialised the workspace repo and restarted the server | Commits land in the right place |

---

## 5. Run 2

Run 2 starts from a clean workspace on the final code with the audit log on from the first call.

### 5.1 Plan

| Session | Role | Goal | Tools expected |
|---|---|---|---|
| S1 | Builder | Plan, scaffold, implement `add` and `list` with tests | Reads, writes, appends, git |
| S2 | Builder | Fix failures from my pytest output, implement `search` and `delete`, write the README | Reads, writes, edits, appends, git |
| S3 | Reviewer | Read-only review of code, tests and logs; record findings | Reads, appends and git; may rewrite only `PROJECT_STATE.md` |
| S4 | Guard check | 15 calls that try to break the guards | All tools; 10 refusals expected |

Between sessions I ran `python -m pytest -v` myself and put the output into the next session's message, because the agent cannot run code. Each session's exact conversation is saved in `docs/demo/chats/`.

### 5.2 Results

| Evidence | Location |
|---|---|
| The exact conversation to each session | `docs/demo/chats/` |
| Every tool call, per session, plus efficiency summary | `docs/demo/transcripts/` |
| pytest and CLI output | `docs/demo/test-runs/` |
| Final plan log | `docs/demo/PLAN_LOG.final.md` |
| Final workspace files and history | `docs/demo/workspace-snapshot/`, `git_log.txt`, `workspace-run2.bundle` |
| Server log | `docs/demo/server_calls.log` |
| Guard check hashes | `docs/demo/hashes-before.txt`, `hashes-after.txt` |
| Screenshots | `docs/screenshots/` |

---

## 6. Decisions and trade-offs

### 6.1 Stack

| Decision | Alternatives | Why | Trade-off |
|---|---|---|---|
| Node.js, TypeScript, official MCP SDK | Python with FastMCP | Reference stack, best documented, types catch path mistakes | A build step; more tooling |
| Streamable HTTP | stdio | Claude on the web connects to a remote URL | Needs a tunnel and a login |
| zod on every tool input | Manual checks | One schema validates input and describes the tool to the model | One more dependency |
| ngrok with a static domain | Cloudflare Tunnel | Fastest to set up; the URL never changes | Free-plan limits |
| pm2 | systemd, Docker | Simple, cross-platform, logs and auto-restart | No boot persistence on Windows |
| git on the host | A custom snapshot system | Free checkpoints, history and rollback | `git add -A` is coarse |
| Secrets in `.env` | Hard-coded values | Nothing secret in the repo; easy to rotate | Must be created on each machine |

### 6.2 Choosing the AI client

I considered four options and decided over several attempts.

| Option | What I found | Verdict |
|---|---|---|
| ChatGPT (Developer mode) | My first choice. Works through custom connectors but needs a paid plan, and its connector form cannot send a static `Authorization` header, which led to the secret-URL route | Not used |
| Claude Code (terminal) | Accepts a header, so it works with a bearer token. But it needs a paid plan, and it was not installed | Not used |
| Gemini CLI (terminal) | Works with the bearer token; needed a trusted folder; it is a terminal tool | Connected successfully, not used for the demo |
| Claude on claude.ai | Custom connectors are available on the free plan (limited to one), connect from the cloud, and give a web-chat experience like my professor's demo | Chosen |

- Trade-offs: 
the connector form has no header field, so the connection relies on the secret URL, which is weaker than a header. Free usage limits exist, and one of them ended Session 3 of Run 1. The connector must be switched on in every new chat.

### 6.3 Sandbox design

One root folder (`workspace/`); each path is resolved against it and symlinks are resolved with `realpath`.  
- Trade-offs: 
the agent cannot read the project's `docs/` or `src/`, so anything it needs must be copied into the workspace (P21). A check-then-use race (TOCTOU) is theoretically possible, and the symlink case is implemented but not covered by an automated test.

### 6.4 Git-lite instead of a shell

Three fixed tools (`git_status`, `git_commit`, `git_log`) run with `execFile`, never through a shell. 

- Trade-off: 
`git_commit` always runs `git add -A`, so stray files get committed. Selective staging would be safer but needs more parameters to validate. The tool description now warns about it.

### 6.5 The handoff protocol, roles and efficiency rules

| Choice | Reason |
|---|---|
| Four files with distinct jobs | State, plan, checkpoints and decisions answer different questions; separate files stay short |
| `PROJECT_STATE.md` is overwritten; the other three are append-only | The state is the current truth; the logs are history |
| Session numbers and sequential IDs instead of dates | The model has no reliable clock; git records the true time |
| Format guides at the top of each log file | The agent reads them at session start, so entries stay consistent |
| A strict "be honest" rule for checkpoints | Run 1's S1 and S4 reported untested code as untested |
| Role (Builder and Reviewer) | Gives each session a clear job. The Reviewer may not edit code, tests or the README |
| Efficiency rules | Read the four state files together, read only what is needed (line ranges for long files), never repeat a failed call unchanged, and stop after two failed attempts |

- Trade-off: 
Roles and efficiency rules are instructions in the protocol, not restrictions in the server. The server enforces the destructive-action guards, but it does not stop a Reviewer session from calling `write_file`.

### 6.6 Adding authentication

| Feature | Detail |
|---|---|
| Bearer token on `/mcp` | `Authorization: Bearer ...`, 64 characters, compared in constant time |
| Secret path `/mcp/YOUR_SECRET` | 48 characters; needed because the claude.ai connector form has no header field |
| Failed-attempt limiter | 10 failures per minute per address, then `429`; valid callers are never blocked |
| Safe logging | Failures are logged as `/mcp/<redacted>`; each call is tagged `"auth":"bearer"` or `"auth":"secret"` |
| Startup validation | The server refuses to start if both credentials are missing or too short |

##### Trade-offs:
- Two routes instead of one: more code and two credentials to protect. 
- Static credentials: they never expire and have no scope. 
- The secret lives in a URL: it appears in the connector settings and in ngrok's request viewer. 
- In-memory limiter: simple and dependency-free, but it resets on restart.

### 6.7 Adding guards 

| Guard | Behavior |
|---|---|
| `.git` | `list_files` and `read_file` now refuse it (writes and deletes already did) |
| Append-only logs | `write_file` and `str_replace` refuse `PLAN_LOG.md`, `CHECKPOINTS.md` and `DECISIONS.md` with `Append-only file: use append_file instead`. `append_file` works. `PROJECT_STATE.md` stays editable because it is rewritten every session |
| Spelling tricks | Guard checks ignore case, trailing dots and spaces, and `:stream` suffixes, because Windows reaches the same file through those spellings. This also fixed the same bypass in the delete protection |
| Tool descriptions | `list_files` now gives `notes` as the example path (the old `src` does not exist in the workspace); `git_commit` warns that it stages everything |

- Trade-offs:
The agent can no longer fix a typo in a log entry; it must append a correction, which is what an audit trail should do anyway. Normalization is best-effort on Windows: it does not cover 8.3 short names. The guards are covered by 19 committed tests (`test/guards.test.ts`) and by the live guard-check session.

### 6.8 The audit log and the strict exporter

| Detail | Choice |
|---|---|
| What is logged | Time, login route, tool, arguments (long strings shortened to 300 characters), error or not, duration, result length and the start of the result (500 characters) |
| Where | `logs/tool-calls.jsonl`, outside `workspace/`, ignored by git, saved automatically after every call |
| How sessions are separated | `npm run mark -- "S1 Builder"` and `npm run mark -- --end` write marker lines; `npm run export` splits the log at the markers |
| What the export adds | One readable transcript per session and a `SUMMARY.md` with efficiency measures, the login route and a code-edit count for the role check |
| Strict input | The exporter refuses lines with `auth: "test"`, a missing timestamp or a missing result length, warns, and lists them in `SUMMARY.md` |
| Failure behavior | A logging error is swallowed, so it can never break a tool call |

- Trade-offs: 
Results are shortened, so the log records "what happened", not a copy of every file's contents. The efficiency measures are simple counts and cannot tell a smart repeat from a wasteful one. "Calls within one second" only "suggests" batching. Session labels depend on my remembering to run the marker commands.

### 6.9 Two git histories

The agent's workspace has its own git history and is ignored by the project repo. 
- Trade-off: 
the workspace is invisible on GitHub unless I publish it on purpose (P28), so the evidence uses a snapshot folder and a git bundle.

### 6.10 No code-execution tool

The agent cannot run code; I run tests and paste the results. 
- Trade-off: 
more manual back-and-forth, and the agent's code is "unverified" until I report back. It produced a good habit: the logs say plainly what has and has not been tested.

### 6.11 Archiving Run 1 and redoing everything

Archive Run 1 (snapshot, git bundle, transcripts, server log) and rerun on the final code with recording on. 
- Trade-offs: 
extra time and tokens, in exchange for clean, complete evidence. 

---

## 7. Test evidences with screenshots

Saved images for tests in `docs/demo/screenshots/tools/tests`.

### 7.1 Automated tests

![docs\demo\screenshots\tests\npm test.png](/docs/demo/screenshots/tests/npm%20test.png)

#### Figure 1. `npm test`: 5 sandbox tests and 19 guard and audit-log tests 

### 7.2 Authentication test

![docs\demo\screenshots\tests\auth-test.png](/docs/demo/screenshots/tests/auth-test.png)

#### Figure 2. Output of the authentication tests (README, Step 6)

### 7.3 Process manager

![docs\demo\screenshots\tests\pm2 status.png](/docs/demo/screenshots/tests/pm2%20status.png)

#### Figure 3. `pm2 status`: `mcp-files` and `mcp-tunnel` online

![docs\demo\screenshots\tests\pm2restart-kill.png](/docs/demo/screenshots/tests/pm2restart-kill.png)

#### Figure 4. After killing the server process, pm2 started it again


### 7.4 Every tool, tested in MCP Inspector

Saved images for successful tool calls in `docs/demo/screenshots/tools/success`.

| # | Tool | Input | Expected | Screenshot |
|---|---|---|---|---|
| 1 | `list_files` | `{"path":"."}` | The notebook files | [01](/docs/demo/screenshots/tools/success/1-list_files.png) |
| 2 | `write_file` | `{"path":"hello.txt","content":"hi"}` | `Wrote 2 chars to hello.txt` | [02](/docs/demo/screenshots/tools/success/2-write.png) |
| 3 | `read_file` | `{"path":"hello.txt"}` | `hi` | [03](/docs/demo/screenshots/tools/success/3-read.png) |
| 4 | `str_replace` | `hi` to `hello` | `Replaced 1 occurrence in hello.txt` | [04](/docs/demo/screenshots/tools/success/4-str-replace.png) |
| 5 | `read_file` | `{"path":"hello.txt"}` | `hello` | [05](/docs/demo/screenshots/tools/success/5-read.png) |
| 6 | `write_file` | `lines.txt`, three lines | `Wrote 14 chars to lines.txt` | [06](/docs/demo/screenshots/tools/success/6-write.png) |
| 7 | `read_file` | `lines.txt`, `start:2`, `end:2` | `two` | [07](/docs/demo/screenshots/tools/success/7-read.png) |
| 8 | `git_status` | `{}` | `?? hello.txt`, `?? lines.txt` | [08](/docs/demo/screenshots/tools/success/8-git-status.png) |
| 9 | `git_commit` | `inspector test` | A commit summary | [09](/docs/demo/screenshots/tools/success/9-git-commit.png) | 
| 10 | `git_log` | `{"limit":5}` | `inspector test` on top | [10](/docs/demo/screenshots/tools/success/10-gitlog.png) |
| 11 | `append_file` | `scratch.log`, `first line` | `Appended to scratch.log` | [11](/docs/demo/screenshots/tools/success/11-append-file.png) |
| 12 | `append_file` | `scratch.log`, `second line` | `Appended to scratch.log` | [12](/docs/demo/screenshots/tools/success/12-append-file.png) |
| 13 | `read_file` | `scratch.log` | Both lines, in order | [13](/docs/demo/screenshots/tools/success/13-read-file.png) |
| 14 | `delete_file` | `hello.txt` | `Deleted hello.txt` | [14](/docs/demo/screenshots/tools/success/14-delete%20file.png) |

##### Refusals(an error is the correct result):
Saved images for error (on purpose) tool calls in `docs/demo/screenshots/tools/errors`.

| # | Tool | Input | Expected error | Screenshot |
|---|---|---|---|---|
| 15 | `read_file` | `../../etc/passwd` | `Path escapes workspace` | [15](/docs/demo/screenshots/tools/errors/erro-1-read-file.png) |
| 16 | `read_file` | `.git/config` | `Access to .git is not allowed` | [16](/docs/demo/screenshots/tools/errors/error-2-read-file.png) |
| 17 | `write_file` | `DECISIONS.md` | `Append-only file: use append_file instead` | [17](/docs/demo/screenshots/tools/errors/error-3-write-file.png) |
| 18 | `delete_file` | `PROJECT_STATE.md` | `Protected handoff file: cannot delete` | [18](/docs/demo/screenshots/tools/errors/error-4-delete.png) |
| 19 | `str_replace` | text that is not there | `old_str not found` | [19](/docs/demo/screenshots/tools/errors/error-5-str-replace.png) |
| 20 | `str_replace` | `o` in a file with two | `old_str appears 2 times; include more context to make it unique` | [20](/docs/demo/screenshots/tools/errors/error-6-str-replace.png) |


### 7.5 A real client
Saved images for client-used tool calls per session in docs/demo/screenshots/{session-number}.

| Session # | Screenshot |
|---|---|
| Session 1 | [tools-calls-1](/docs/demo/screenshots/S1/tool%20calls-1.png) |
| Session 1 | [tools-calls-2](/docs/demo/screenshots/S1/tool-calls-2.png) |
| Session 1 | [tools-calls-3](/docs/demo/screenshots/S1//tool-calls-3.png) |
| Session 2 | [tools-calls-1](/docs/demo/screenshots/S2/tool-calls-1.png) |
| Session 2 | [tools-calls-2](/docs/demo/screenshots/S2/tool-calls-2.png) |
| Session 2 | [tools-calls-3](/docs/demo/screenshots/S2/tool-calls-3.png) |
| Session 3 | [tools-calls-1](/docs/demo/screenshots/S3/tool-calls-1.png) |
| Session 3 | [tools-calls-2](/docs/demo/screenshots/S3/tool-calls-2.png) |
| Session 3 | [tools-calls-3](/docs/demo/screenshots/S3/tool-calls-3.png) |
| Session 4 | [tools-calls-1](/docs/demo/screenshots/S4/tool-calls-1.png) |
| Session 4 | [tools-calls-2](/docs/demo/screenshots/S4/tool%20calls-2.png) |

![docs\demo\screenshots\S4\guard-flagged-paused.png](/docs/demo/screenshots/S4/guard-flagged-paused.png)

#### Figure 5. Short paused in Session 4 checking safe guards

---

## 8. Known limitations

1. Roles are not enforced by the server. A Reviewer session could call a write tool and the transcript shows whether it did.
2. Static credentials: with no expiry or per-user scope. OAuth would be the proper fix.
3. The symlink check has no automated test. Symlinks need elevated rights on Windows.
5. The limiter and any in-memory state reset when the server restarts.
6. No boot persistence for pm2 on Windows.
7. The audit log keeps shortened results, not full file contents, and is a local file. The exporter can only check that lines look like the server's own; it cannot prove who made a call.
8. `git_commit` stages everything.
9. The efficiency measures are simple counts. They flag repeats and retries but cannot judge whether a call was necessary.
10. One custom connector on a free claude.ai account, so separate role logins were not practical.

---