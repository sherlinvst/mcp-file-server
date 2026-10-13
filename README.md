# MCP File-Server Connector

This project is a small server that speaks the Model Context Protocol. The connected AI can then read, write and edit files in one folder in `workspace/`, and save its progress with git. It cannot see anything else on your computer.

---

## Repository Structure
```
mcp-file-server/
├── README.md                    <- you are here
├── package.json                 <- dependencies and npm scripts
├── package-lock.json            <- exact versions of the dependencies
├── tsconfig.json                <- TypeScript settings
├── ecosystem.config.cjs         <- pm2: the server and the ngrok tunnel
├── .env.example                 <- template for your secrets
├── .env                         <- YOUR secrets (not uploaded)
├── .gitignore
│
├── src/
│   ├── server.ts                <- web server, login, the /mcp routes
│   ├── tools.ts                 <- the 9 tools and their guards
│   ├── audit.ts                 <- the tool-call log
│   ├── sandbox.ts               <- keeps every path inside workspace/
│   └── git.ts                   <- safe git wrapper; makes the workspace's git history
├── test/
│   ├── sandbox.test.ts          <- 5 path-escape tests
│   └── guards.test.ts           <- 19 guard and audit-log tests
├── scripts/
│   ├── seed.mjs                 <- creates the workspace and notebook files
│   ├── mark.mjs                 <- labels sessions in the call log
│   └── export-transcript.mjs    <- call log for readable transcripts
│
├── docs/
│   ├── DOCUMENTATION.md         <- full write-up
│   ├── HANDOFF_PROTOCOL.md      <- rules the AI follows each session
│   ├── screenshots/             <- test evidence images
│   ├── archive/run1/            <- the first attempt, kept as history
│   └── demo/                    <- the official recorded run
│       ├── chat/                <- chat text of each session
│       ├── screenshots/         <- evidence images
│       ├── test-runs/           <- pytest and CLI output
│       ├── transcripts/         <- every tool call
│       ├── workspace-snapshot/  <- the final workspace files
│       ├── PLAN_LOG.final.md    <- the final plan log
│       ├── git_log.txt          <- the agent's commit history
│       ├── server_calls.log     <- the server's own request log
│       └── workspace-run2.bundle<- the workspace's full git history in one file
│
├── logs/                        <- raw call log (not uploaded)
├── dist/  node_modules/         <- generated (not uploaded)
│
└── workspace/                   <- THE SANDBOX. Own git history (not uploaded)
    ├── .gitignore
    ├── PROJECT_STATE.md         <- where things stand now (rewritten each session)
    ├── PLAN_LOG.md              <- plans and results (append-only)
    ├── CHECKPOINTS.md           <- safe points to resume from (append-only)
    ├── DECISIONS.md             <- why choices were made (append-only)
    ├── HANDOFF_PROTOCOL.md      <- copy of the rules, readable by the AI
    ├── notes/                   <- the demo app the AI builds
    ├── tests/                   <- tests for demo app
    └── README.md                <- the demo app's README (written by the AI)
```
---

## 1. Checklist
| You need | How to check | Where to get it |
|---|---|---|
| Node.js 20.6 or newer | `node -v` | nodejs.org |
| git | `git --version` | git-scm.com |
| Python 3.10 or newer | `python --version` | python.org |
| A free ngrok account | N/A | ngrok.com |
| pm2 | `pm2 -v` | `npm i -g pm2` |
| ngrok| `ngrok version` | Windows: `winget install ngrok.ngrok`. Mac: `brew install ngrok` |
| Claude Account | N/A | claude.ai. |

---
## 2. Available Tool Calls
| Tool | Inputs | What it does | Guards |
|---|---|---|---|
| `list_files` | `path` (default `.`) | Lists files and folders (folders end in `/`) | Sandbox; refuses `.git`; hides `.git` |
| `read_file` | `path`, optional `start`, `end` (line numbers) | Reads a text file or part of one | Sandbox; refuses `.git`; 1 MB limit |
| `write_file` | `path`, `content` | Creates or overwrites a file | Sandbox; refuses `.git` and the 3 log files; 1 MB limit |
| `str_replace` | `path`, `old_str`, `new_str` | Replaces exactly one occurrence | Sandbox; refuses `.git` and the 3 log files; fails on 0 or 2+ matches |
| `delete_file` | `path` | Deletes one file | Sandbox; files only; refuses the root, `.git` and the 4 notebook files |
| `append_file` | `path`, `content` | Adds text to the end of a file | Sandbox; refuses `.git`; 10,000 characters per call |
| `git_status` | none | Short status and branch | Fixed command, no shell |
| `git_commit` | `message` (3 to 200 characters) | Stages everything and commits | Fixed command, no shell |
| `git_log` | `limit` (1 to 50) | Recent commits, one per line | Fixed command, no shell |

Three log files: `PLAN_LOG.md`, `CHECKPOINTS.md` and `DECISIONS.md`. They only grow, via `append_file`. `PROJECT_STATE.md` can be rewritten because it holds the current state. Every tool returns a readable error when something is refused, so the AI can correct itself.

---

## 2. Setup, step by step
### Step 1. Get the code

```bash
git clone YOUR_GITHUB_URL # replace with this repository's URL
cd mcp-file-server
npm install
```

### Step 2. Make your secrets file (`.env`)

```powershell
copy .env.example .env          # Mac/Linux: cp .env.example .env
```

Make two random secrets. Run each command and copy what it prints:

```bash
node -e "console.log(require('crypto').randomBytes(24).toString('hex'))"    # for SECRET_PATH (48 characters)
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"    # for AUTH_TOKEN (64 characters)
```

Open `.env` in a text editor and fill it in:

```
PORT=3000
WORKSPACE_ROOT=./workspace
SECRET_PATH=paste-the-48-character-value-here
AUTH_TOKEN=paste-the-64-character-value-here
```

### Step 3. Create the workspace

```bash
npm run seed
```

This makes the `workspace/` folder with the four notebook files and a copy of the rules the AI follows. It never overwrites existing files.

- You should see: `Wrote:` lines, ending with `Seeded ... (6 file(s) written)`.

### Step 4. Run the tests

```bash
npm test
```

- You should see: `24 passed`. The tests prove that bad paths are rejected, the guards work, and every call is logged.

### Step 5. Start the server

```bash
npm run dev
```

- You should see: `MCP server listening on :3000 (bearer: on, secret path: on)`.

In a second terminal:

```powershell
curl.exe http://localhost:3000/health # Mac/Linux: curl http://localhost:3000/health
```

- You should see: `{"ok":true}`. (On Windows use `curl.exe`. Plain `curl` is a different command in PowerShell.)

### Step 6. Check the login (recommended)

Run this while the server is running. It reads your secrets from `.env`, so nothing secret is printed.

```powershell
$token  = (Select-String -Path .env -Pattern '^AUTH_TOKEN=(.*)$').Matches.Groups[1].Value
$secret = (Select-String -Path .env -Pattern '^SECRET_PATH=(.*)$').Matches.Groups[1].Value
$base = "http://localhost:3000"
$f = "$env:TEMP\init.json"
'{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2025-03-26","capabilities":{},"clientInfo":{"name":"test","version":"1"}}}' | Out-File -Encoding ascii $f

function T($url, $auth) {
  $a = @("-s","-o","NUL","-w","%{http_code}","-X","POST",$url,"-H","Content-Type: application/json","-H","Accept: application/json, text/event-stream","--data","@$f")
  if ($auth) { $a += @("-H","Authorization: $auth") }
  "$(curl.exe @a)"
}

"1 no token:      " + (T "$base/mcp" $null)
"2 wrong token:   " + (T "$base/mcp" "Bearer wrong")
"3 correct token: " + (T "$base/mcp" "Bearer $token")
"4 secret URL:    " + (T "$base/mcp/$secret" $null)
"5 wrong secret:  " + (T "$base/mcp/not-the-secret" $null)
```

| Test | You should see | Meaning |
|---|---|---|
| 1 | `401` | No token: refused |
| 2 | `401` | Wrong token: refused |
| 3 | `200` | Right token: accepted |
| 4 | `200` | Secret URL: accepted |
| 5 | `404` | Wrong secret: refused, and reveals nothing |

### Step 7. Set up the public tunnel (ngrok)

1. In the ngrok dashboard, copy your authtoken and register it (no brackets):
   ```bash
   ngrok config add-authtoken YOUR_NGROK_AUTHTOKEN
   ```
2. In the dashboard open Domains, create your free static domain, and write it down. It looks like `something-something.ngrok-free.dev`.
3. Test it by hand. Start the server in one terminal (`npm run dev`), then in another:
   ```bash
   ngrok http --url=YOUR-STATIC-DOMAIN 3000
   ```
   If your ngrok rejects `--url`, use `--domain=YOUR-STATIC-DOMAIN`.
4. In a third terminal:
    ```bash
    curl.exe https://YOUR-STATIC-DOMAIN/health
    ```

- You should see: `{"ok":true}`.

### Step 8. Keep it running with pm2

Open `ecosystem.config.cjs` and put your domain in the tunnel app's `args`. (The file in this repo contains the original author's domain.) On Windows it should look like this, because pm2 cannot start the ngrok shortcut directly:

```js
module.exports = {
  apps: [
    {
      name: "mcp-files",
      cwd: __dirname,
      script: "dist/server.js",
      node_args: "--env-file=.env",
      autorestart: true,
      max_restarts: 20,
    },
    {
      name: "mcp-tunnel",
      cwd: __dirname,
      script: "C:/Windows/System32/cmd.exe", // Change this to your own path
      interpreter: "none",
      args: "/c ngrok http --url=YOUR-STATIC-DOMAIN 3000",
      autorestart: true,
    },
  ],
};

// Mac/Linux: for the tunnel use `script: "ngrok"`, `interpreter: "none"` and `args: "http --url=YOUR-STATIC-DOMAIN 3000"`.
```

```bash
npm run build
pm2 start ecosystem.config.cjs
pm2 save
pm2 status
```

- You should see: both `mcp-files` and `mcp-tunnel` online. Then check the public address:

```powershell
curl.exe https://YOUR-STATIC-DOMAIN/health
```

- You should see: `{"ok":true}`.

- After a reboot: Mac/Linux: run `pm2 startup` once and run the command it prints. Windows: pm2 cannot do this, so run `pm2 resurrect` after each reboot.

### Step 9. Connect Claude

Claude connects to your server from the internet, so the tunnel must be online. The claude.ai form has no place for a token, so you use the secret URL.

1. Print your connector address (this keeps the secret out of your command history):
   ```powershell
   $secret = (Select-String -Path .env -Pattern '^SECRET_PATH=(.*)$').Matches.Groups[1].Value
   "https://YOUR-STATIC-DOMAIN/mcp/$secret"
   ```
2. Open claude.ai and sign in. Open the connectors page (Customize, then Connectors).
3. Click "+", then "Add custom connector"
4. Fill in "Name:" `File Server`, and "URL:" the address from step 1. Leave any advanced OAuth fields "empty. Click "Add".
5. Open a new chat. In the message box, open the tools menu and switch File Server on.
6. Send: `Use the File Server tools. List the files in the workspace.` Approve the tool call.

- You should see: the notebook files listed.

7. Prove the call reached your server:
   ```powershell
   pm2 logs mcp-files --lines 10 --nostream
   ```
   - You should see: a line with `"auth":"secret"` and `"tool":"list_files"`.
---

## 3. Recording every tool call

The server writes one line per tool call to `logs/tool-calls.jsonl`, outside the workspace, so the AI cannot touch it. It is saved automatically, after every call. The file appears with the first call (or the first `npm run mark`). Each line records the time, the login route used, the tool, its arguments, whether it was an error, how long it took, and the start of the result.

To label which calls belong to which session:

```powershell
npm run mark -- "S1 Builder"      # before the chat
npm run mark -- --end             # after the chat
npm run export                    # at the end
```

`npm run export` writes readable Markdown to `docs/demo/transcripts/`: one transcript per session, and a `SUMMARY.md` with simple efficiency measures.

---