# Ollama Browser Agent

AI browser agent Chrome extension powered by local Ollama models. Chat with an AI that can browse the web, interact with pages, read PDFs, and execute multi-step tasks - all running locally on your machine.

Inspired by Claude's browser extension, but using your own local models.

## Features

- Chat interface with plan-and-confirm workflow
- Autonomous browser actions (click, type, navigate, scroll)
- Accessibility tree analysis (like Claude's extension)
- Visual indicators when agent is active (orange glow border)
- PDF/text file upload and analysis
- Loop detection to prevent getting stuck
- Auto tab creation when no webpage is open
- Multiple model support via Ollama
- **Auto Apply** for LinkedIn Easy Apply, Indeed "Easily apply" and Naukri jobs (local LLM answers form questions)

## Quick start (5 minutes)

```bash
# 1. Install Ollama (https://ollama.com/download), then pull a model that fits your laptop
#    (see "Which model should I download?" below – qwen2.5:3b works on almost any laptop)
ollama pull qwen2.5:3b

# 2. Allow the Chrome extension to call Ollama (see "Configure CORS" below), restart Ollama

# 3. Get the code
git clone https://github.com/rajjaiswal3858/Auto_ApplyExtension.git
```

4. Open `chrome://extensions` → turn on **Developer mode** → **Load unpacked** → pick the cloned
   `Auto_ApplyExtension` folder (the one that contains `manifest.json`).
5. Click the extension icon on any normal web page → the side panel opens.
6. The panel should list your Ollama models. If it says *"Ollama not running at localhost:11434"*,
   see [Troubleshooting](#troubleshooting).

Nothing else to build or install – it is a plain Manifest V3 extension with no build step, and
pdf.js is already bundled (`pdf.min.mjs`, `pdf.worker.min.mjs`). No API keys, no cloud calls:
everything runs against Ollama on `http://localhost:11434`.

## Requirements

- Chrome, Edge, Brave or another Chromium browser (Manifest V3 + Side Panel support)
- [Ollama](https://ollama.com) installed and running
- At least one model pulled (default: `qwen2.5:3b`) – see [Which model should I download?](#which-model-should-i-download)
- 8 GB RAM is enough for the 3B model; 16 GB for 7B; 32 GB (or a GPU with 8 GB+ VRAM) for 14B

## Which model should I download?

The model runs **on your laptop**, so pick it by how much memory you have. A model needs roughly
its download size in free RAM (or GPU memory), plus room for Chrome and the rest of your apps.

**Check your laptop:**
- **Windows:** Task Manager → **Performance** → *Memory* shows total RAM; *GPU* shows "Dedicated GPU memory" (VRAM).
- **macOS:**  → About This Mac → *Memory*. On Apple Silicon (M1–M4) RAM and GPU memory are shared.
- **Linux:** `free -h` for RAM, `nvidia-smi` for an NVIDIA GPU's VRAM.

| Your laptop | Model to pull | Download | Auto Apply quality | Speed |
|---|---|---|---|---|
| 4–6 GB RAM, no GPU (older / budget laptop) | `qwen2.5:1.5b` | ~1 GB | Basic – fine for yes/no and number questions, weaker on free-text answers | Fast |
| **8 GB RAM**, integrated graphics (most laptops) | **`qwen2.5:3b`** (default) | ~1.9 GB | Good for Auto Apply | Fast |
| 16 GB RAM, or a GPU with 4–6 GB VRAM (GTX 1650 / RTX 3050), or Apple M1/M2 16 GB | `qwen2.5:7b-instruct` | ~4.7 GB | Better – recommended if it fits | Medium |
| 32 GB RAM, or a GPU with 8–12 GB VRAM (RTX 3060/4060/4070), or Apple M-series 32 GB | `qwen2.5:14b` | ~9 GB | Best for Auto Apply; usable for the Browser Agent tab | Medium |
| 64 GB RAM, or a GPU with 24 GB VRAM (RTX 3090/4090), or Apple M-series 64 GB+ | `qwen2.5:32b` | ~20 GB | Best for open-ended Browser Agent tasks | Slower |

```bash
ollama pull qwen2.5:3b          # pick ONE line from the table
ollama list                     # confirm it downloaded
ollama run qwen2.5:3b "hello"   # quick test, then type /bye
```

Tips:
- **Auto Apply** only asks the model one short form question at a time, so a small model works.
  Every answer is saved and reused, so the model is needed less over time. A bigger model mainly
  helps with free-text questions and the AI job-fit filter.
- The **Browser Agent** tab (open-ended "do this task" chat) needs a bigger model – 14B or more – to
  be reliable.
- If answers come slowly or your laptop freezes, drop one row in the table. If you have spare memory,
  move up one row.
- You can install several models and switch between them from the dropdown at the top of the side
  panel. The panel picks a `qwen` model automatically if one is installed.
- Without a GPU everything still works – Ollama falls back to the CPU, just slower.

## Detailed setup

### 1. Install Ollama

Download from [ollama.com](https://ollama.com) or:

**macOS:**
```bash
brew install ollama
brew services start ollama
```

**Linux:**
```bash
curl -fsSL https://ollama.com/install.sh | sh
sudo systemctl start ollama
```

**Windows:**
Download the installer from [ollama.com/download](https://ollama.com/download/windows). Ollama runs in the system tray automatically.

Check it is running:
```bash
curl http://localhost:11434/api/tags
```

### 2. Pull a model

Pick the model for your laptop from [Which model should I download?](#which-model-should-i-download), e.g.:

```bash
ollama pull qwen2.5:3b
```

You can switch models from the dropdown in the side panel.

### 3. Configure CORS

Ollama rejects requests from browser extensions unless `OLLAMA_ORIGINS` allows them.
(`chrome-extension://*` is enough; `*` also works.)

**Windows (PowerShell):**
```powershell
[System.Environment]::SetEnvironmentVariable("OLLAMA_ORIGINS", "chrome-extension://*", "User")
# Quit Ollama from the system tray (right-click → Quit) and start it again.
# The variable is only read when Ollama starts, so the restart is required.
```

Check it worked (should print `200`, not a 403 error):
```powershell
(Invoke-WebRequest -UseBasicParsing http://localhost:11434/api/tags -Headers @{Origin='chrome-extension://test'}).StatusCode
```

**macOS (app):**
```bash
launchctl setenv OLLAMA_ORIGINS "chrome-extension://*"
# Quit and reopen the Ollama app
```

**macOS (Homebrew service):**
```bash
launchctl setenv OLLAMA_ORIGINS "chrome-extension://*"
brew services restart ollama
```

**Linux (systemd):**
```bash
sudo systemctl edit ollama
# Add:
# [Service]
# Environment="OLLAMA_ORIGINS=chrome-extension://*"
sudo systemctl daemon-reload
sudo systemctl restart ollama
```

### 4. Load the extension

1. Open `chrome://extensions` (Edge: `edge://extensions`)
2. Enable **Developer mode** (top right)
3. Click **Load unpacked**
4. Select this repository's folder (the one with `manifest.json`)
5. Pin the extension, then click its icon on any webpage to open the side panel

After pulling new code (`git pull`), press the **reload** ↻ button on the extension card.

### 5. (Auto Apply only) Set your profile

`profile-default.js` holds the default profile (currently the repo owner's details). If you are
setting this up for yourself, replace them with your own – name, email, phone, city, current role,
education, total years, skills with years, CTC, notice period, links, and your resume as plain text
in `resumeText` – then reload the extension.

You can also edit everything in the **Auto Apply → Profile** section of the panel. Values saved
there **override** the file; fields left empty fall back to it. After a run, check the
**History** section to see exactly what was answered on each application.

Keep these honest and consistent with your resume – total years, skill years and education are
typed straight into application forms.

## Usage

1. Open any webpage (or the agent will create one for you)
2. Click the extension icon to open the side panel
3. Click **Connect to current tab**
4. Type what you want the agent to do
5. Review the proposed plan
6. Click **Approve & Run** to execute

### Example prompts

- "Search for developer jobs on LinkedIn"
- "Summarize this page for me"
- "Fill out the form on this page"
- "Go to google.com and search for AI news"

### Attach files

Click the paperclip icon to attach PDFs or text files. The agent will extract and analyze the content.

## Auto Apply (LinkedIn + Indeed + Naukri)

The **Auto Apply** tab applies to quick-apply jobs for you, 100% locally: LinkedIn **Easy Apply**
Indeed **Easily apply** and **Naukri** Apply. Pick one site, LinkedIn + Indeed, or all three next to
the Start button.

How it works: deterministic page helpers (`linkedin-dom.js`, `indeed-dom.js`) drive each site —
search, job cards, the apply form, Next/Continue/Submit. The local LLM is only asked to answer form
questions your profile doesn't cover, one question at a time, using Ollama structured output so the
answer is always one of the form's real options. Every answer is cached in **Saved answers** and
reused on both sites, so the model is needed less and less over time.

Answer priority: your saved/edited answers → profile rules (name, phone, CTC, notice period,
sponsorship, years of experience…) → local LLM (reads your profile + resume).
Your default profile lives in `profile-default.js`; anything edited in the panel overrides it.

1. Be logged in to LinkedIn / Indeed / Naukri in this Chrome profile.
2. Open the side panel → **Auto Apply**.
3. Check **Profile** (prefilled from `profile-default.js`).
4. Set **Job search**: titles one per line, country, date posted, work type, and **Cities**.
   Type a city and press **+** (or Enter); "Remote, Noida, Gurugram" adds three at once, ✕ removes
   one. The bot searches **city by city**: every keyword in the first city (e.g. Remote), then
   every keyword in the next city, and so on – on each site. No cities = the whole country.
5. Pick a **Mode**:
   - *Dry run* – fills every form up to Submit, then discards. Do this first.
   - *Ask me before each submit* – shows the answers, you click Submit / Skip.
   - *Fully automatic* – submits on its own.
6. Pick the site(s) and press **Start applying**. Keep the panel open and the Chrome window
   visible (not minimized) – Chrome freezes timers in hidden tabs. Stop any time from the panel
   or the on-page "Stop Agent" button. **Max applications** counts per site.

Review **Saved answers** after a dry run and fix anything wrong – fixes are used from then on.
**History** lists every job (with its site) and the reason when it was skipped.

Site notes:
- LinkedIn applies inside a modal on the results page. Location uses LinkedIn's `geoId`.
- Indeed opens each application in its own `smartapply.indeed.com` tab and closes it afterwards.
  The country picks the Indeed domain (India → in.indeed.com); "Indeed city" narrows it.
  Smartapply pages contain hidden honeypot "Continue" buttons (`hp-continue-button-N`); the bot
  only clicks the visible real one.
- Indeed now often shows an **"I'm not a robot" checkbox** on the review page; Submit stays
  disabled until a person ticks it. The bot never touches it: it brings the tab to the front,
  beeps, and waits up to 3 minutes for you to tick it, then submits by itself.
- Optional "update your Indeed resume" steps (Review education, Add work experience) are skipped
  with their Skip button – "Save and continue" is blocked there when Indeed thinks details are missing.
- Indeed has no worldwide site: with Location "Worldwide", Indeed uses your Profile country
  (India -> in.indeed.com).
- Work-authorization questions about another country ("authorized to work in the United States?")
  are answered No / needs sponsorship. Gender, ethnicity, veteran and disability questions are never
  answered by the AI: "prefer not to say" if offered, otherwise your Profile, otherwise the job is skipped.
- Indeed ignores script clicks (`element.click()`) on Continue/Submit, so on Indeed the bot clicks
  with real mouse events through `chrome.debugger` (the same mechanism Playwright/Puppeteer use).
  While it does, the browser shows a "started debugging this browser" bar – that is expected.
  The debugger also auto-accepts Indeed's "Leave site?" prompt when an apply tab is closed.

Experience answers:
- **Min years for any skill** (Profile, default **3**): every "years of experience with X" answer
  is at least this – for skills in your list with fewer years, and for skills not in your list at
  all. Higher values from your skills list (e.g. 3.5) are kept. "Do you have experience with X?"
  is answered **Yes** (unless it asks for more years than you have).

Cities per site:
- LinkedIn: each city is turned into LinkedIn's location id automatically (cached). "Remote"
  searches "<keyword> remote" in your country – LinkedIn's new search ignores the remote URL filter.
- Indeed: the city goes into the location box; "Remote" also sets Indeed's remote filter.
- Naukri: `naukri.com/<keyword>-jobs-in-<city>`; "Remote" uses Naukri's work-from-home filter.
  Further result pages are opened by clicking Next in the page (Naukri's page-2 link drops filters).

Answer safety:
- Personal data (date of birth, URLs, phone, email, ID numbers) is only ever taken from your
  Profile – the AI is not allowed to guess it. If a form requires one you haven't filled in, that
  job is skipped and the log says which field to add.
- Number dropdowns ("14 - 15 LPA", "3 years") are picked by arithmetic, not by the AI.

Naukri notes:
- Naukri has **no review/Submit step**: pressing Apply either applies immediately or opens a
  recruiter chatbot on the right, and answering its last question submits. So on Naukri:
  - *Dry run* only checks that the job has a Naukri Apply button (not "Apply on company site") –
    it never presses Apply.
  - *Ask me before each submit* asks before pressing **Apply**; the chatbot questions are then
    answered automatically (profile → saved answers → local AI), and each answer is logged.
  - If the bot can't answer a chatbot question it leaves the chat unfinished and closes the tab –
    nothing is submitted.
- Each job opens in its own tab (Naukri's job pages), which is closed afterwards.
- Jobs that only "Apply on company site" are skipped. Naukri has a daily apply limit; the run
  stops when Naukri says it's reached.
- Search uses `naukri.com/<keyword>-jobs-in-<city>` with your total experience, date posted
  (1/7/30 days) and work type (office / remote / hybrid).
- A successful apply opens Naukri's "Apply Confirmation" page (`/myapply/saveApply`); that is
  what the bot counts as applied.

General notes:
- Jobs whose forms it can't complete are discarded and logged, never half-submitted.
- It never solves CAPTCHAs or verifications – it pauses up to 3 minutes for you to do it.
- Automating LinkedIn/Indeed is against their terms and accounts can be restricted.
  Keep the default delays and a sensible number of applications per day.
- Sites change their UI often. Selectors were verified against the October 2026 UIs.

### Role matching (why it no longer applies to unrelated jobs)

The job boards decide what a search returns, and they are generous: a search for
**Generative AI Engineer** also returns Frontend Developer, Backend Developer and Data Analyst,
because they fuzzy-match on "Engineer" or on one shared skill. Earlier versions applied to every
quick-apply card in those results.

Each job search line is now treated as **the role you selected**, and every job found by it has to
pass two independent checks before anything is submitted:

1. **Discipline screen** (`role-match.js`, no model involved) - your role is parsed into a
   discipline (AI/ML, frontend, backend, data analytics, DevOps, QA, …) plus its own distinctive
   wording. A posting whose title or description belongs to a *different* discipline is rejected,
   even when it shares Python, SQL, Git, Docker, Kubernetes, AWS, REST APIs or a CS degree - those
   are in almost every posting and never count as evidence. This runs on the search-result title
   first, so most wrong roles are dropped without opening the job.
2. **Local LLM classification** - the title, description, responsibilities and required skills are
   sent to Ollama with a strict schema (`match` / `mismatch` / `unsure` + a confidence and the
   discipline the model thinks the job actually is). Only a `match` with ≥70% confidence that does
   not contradict the model's own stated discipline passes.

Both must agree. **Everything else skips the job**: a discipline conflict, `unsure`, low confidence,
Ollama not running, an HTTP error, a timeout, or a reply that is not valid JSON. There is no
"apply anyway" path. The role is then validated once more inside the apply code itself - before the
form is opened, before a fully-automatic Submit, before a confirmed Submit, and before Naukri's
Apply button (which submits immediately) - so a job that did not pass can never be submitted.

This is dynamic: it works for whatever you type in **Job titles / keywords**, not just AI roles. A
role outside the built-in discipline list (e.g. "Technical Writer") is matched on its own wording
instead. The **History** section shows the reason for every role-based skip.

Because the filter errs towards *not* applying, expect fewer applications per run than before -
that is the intent. Postings whose description LinkedIn fails to load are skipped as unverifiable.

The separate **AI job-fit filter** setting is unchanged and still optional; it screens
seniority/skill fit *on top of* role matching, which is always on and cannot be turned off.

## Tests

Plain Node, no dependencies and no build step:

```bash
node tests/run-all.js            # or run one file:
node tests/role-match.test.js            # role matching: relevant vs irrelevant roles
node tests/autoapply-role-gate.test.js   # the gate as wired into the orchestrator (Ollama faked)
```

## Model recommendations

| Model | Size | Quality | Use case |
|-------|------|---------|----------|
| qwen2.5:3b | 1.9GB | Basic | Auto Apply on 8 GB laptops (default) |
| qwen2.5:7b | 4.7GB | Basic | Simple tasks (search, click) |
| llama3.1:8b | 4.7GB | Basic | Simple tasks |
| qwen2.5:14b | 9GB | Better | Multi-step tasks |
| qwen2.5:32b | 20GB | Good | Complex navigation |

See [Which model should I download?](#which-model-should-i-download) for picking by laptop RAM/GPU.
For open-ended browsing tasks bigger models help. Auto Apply works with `qwen2.5:3b` and up because
the LLM only answers single form questions.

## Architecture

- `background.js` - Service worker: Ollama communication, agent loop, tab management
- `sidepanel.html/js` - Chat UI with plan approval workflow
- `accessibility-tree.js` - DOM analysis (adapted from Claude's extension)
- `visual-indicator.js` - Orange glow border when agent is active
- `register-tab.js` - Content script that registers tabs with the background
- `pdf-extract.js` - PDF text extraction using pdf.js
- `linkedin-dom.js` - LinkedIn page helpers (job cards, Easy Apply modal, form reading/filling)
- `indeed-dom.js` - Indeed page helpers (search results, smartapply form steps)
- `naukri-dom.js` - Naukri page helpers (search results, job page Apply, recruiter chatbot)
- `profile-default.js` - your default Auto Apply profile (edit this with your details)
- `role-match.js` - role matching: is a posting actually the role you selected?
- `autoapply.js` - Auto Apply orchestrator + answer engine (runs in the side panel)
- `autoapply-ui.js` - Auto Apply settings, log, saved answers and history UI

## Limitations

- Local models (7-14B) struggle with complex multi-step tasks
- Cannot interact with browser-internal pages (chrome://)
- Some websites block automated interactions
- No screenshot/vision support (text-only accessibility tree)

## Troubleshooting

| Problem | Fix |
|---------|-----|
| "Ollama not running at localhost:11434" | Start Ollama (`ollama serve` or the tray app) and check `curl http://localhost:11434/api/tags` |
| Requests fail with **403** / "Ollama not reachable: Ollama HTTP 403" | `OLLAMA_ORIGINS` is not set, or Ollama was not fully quit and restarted after setting it (step 3) |
| Model dropdown is empty | Pull a model: `ollama pull qwen2.5:3b` |
| "model not found" | The selected model isn't installed – run `ollama list` and pick one of those in the dropdown |
| Laptop very slow / freezes while applying | Model too big for your RAM – use a smaller one from the model table |
| LinkedIn: "Easy Apply dialog did not open" | Keep the LinkedIn tab visible (window not minimized or covered) |
| Indeed run does nothing | Indeed may be showing a "Verify you are human" page – complete it yourself; make sure you're signed in to Indeed |
| Side panel doesn't open | Use a normal `http(s)` page, not `chrome://` or the Web Store |
| Auto Apply stalls | Keep the Chrome window visible (not minimized) and the panel open; check the log in the panel |
| "started debugging this browser" bar | Expected on Indeed – real mouse clicks are sent via `chrome.debugger` |
| Changes to the code don't show up | Reload the extension in `chrome://extensions` and reopen the side panel |

## Credits

Based on [Unlucko/ollama-browser-agent](https://github.com/Unlucko/ollama-browser-agent);
LinkedIn / Indeed Auto Apply added on top in
[BhavyaKohli-code/browserautoapplyagent](https://github.com/BhavyaKohli-code/browserautoapplyagent).

## License

MIT
