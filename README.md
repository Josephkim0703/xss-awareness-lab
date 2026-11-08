# XSS Awareness Lab

An educational web-security demo built around a fictional student portal
("Northgate Polytechnic") and a Y2K-themed browser photo booth. It
illustrates **stored XSS** and how it chains into a browser-exploitation
framework (**BeEF**) inside an isolated, authorized lab.

**🌐 Live demo (safe mode):** _enabled once GitHub Pages is live_
**🧪 Lab mode:** clone and run on `localhost` — the Q&A board becomes
intentionally vulnerable so you can walk through a real injection → hook
flow.

> ⚠️ **Scope / ethics.** For authorized security-education labs on
> machines and accounts you own or are explicitly allowed to test.
> Do not point a live hook at anyone who hasn't consented.

---

## What this project demonstrates

1. **Social engineering via lookalike UI.** The portal reads like an
   everyday campus site (sign-in, Q&A board, announcements, course
   search, events), so browser prompts and credential fields feel
   in-context — the same dynamic that makes real phishing effective.

2. **Stored cross-site scripting (XSS).** On localhost, the Q&A board
   is a deliberately-vulnerable implementation: user-submitted titles
   and bodies are concatenated into the DOM without escaping. A posted
   `<script>` executes for every browser that views the board.

3. **The "no interaction" property.** Stored XSS doesn't require the
   victim to click anything. The payload runs when the page loads —
   no scroll, no click, no visible indication.

4. **How BeEF fits in.** BeEF is **not** the injector; it's the C2
   panel for browsers that are already hooked. Getting `hook.js` onto
   the page is the attack vector — in this lab, that vector is the
   board's stored XSS. Once a browser is hooked, BeEF can run modules
   against it (keystroke logging on the hooked page, fake credential
   prompts, webcam prompts, browser recon).

5. **The defensive fix.** Flip `LAB_MODE` off — the exact same code
   path escapes user input before rendering. That is the one-line
   difference between a vulnerable and a hardened board, and it is
   the same mitigation real frameworks (React, Vue, Jinja autoescape)
   apply by default.

## Live site vs. lab mode

| Host                   | Q&A rendering  | Why                                |
|------------------------|----------------|------------------------------------|
| `localhost` / `127.0.0.1` / `file://` | **Unescaped** (lab) | Local demo, authorized lab use     |
| Any other hostname     | **Escaped** (safe)   | A deliberately-vulnerable app should not be publicly reachable |

The toggle is a hostname check at the top of [`portal.js`](portal.js).
This is deliberate: hosting live stored-XSS on the public web turns a
demo into a real attack surface. Running the lab locally is also what
every mainstream intentionally-vulnerable training app (DVWA, WebGoat,
Juice Shop) does, and for the same reason.

## Tech used

- **Vanilla HTML / CSS / JavaScript** — no framework, no build step.
- **Google Fonts** (Inter, Source Serif 4) for the portal; Mochiy Pop
  One for the Y2K photo-booth theme.
- **`getUserMedia` + Canvas 2D filters** in the photo-booth page for a
  real live-camera demo (12 filters, photo strip, download).
- **GitHub Pages** for the safe public deployment.
- **BeEF** (external — you run it on your own lab host) as the C2 for
  the hook demonstration.

## Run it locally

```bash
python -m http.server 8000
```

Then open `http://localhost:8000`.

See **[LAB-SETUP.md](LAB-SETUP.md)** for the full BeEF + stored-XSS
walkthrough (both the baseline hard-coded-hook demo and the stored-XSS
→ BeEF demo).

## Project layout

```
index.html       myNorthgate student portal (main page)
portal.css       University theme (burgundy + charcoal)
portal.js        Q&A board, ask form, search, sign-in (lab-mode gated)
booth.html       Y2K photo-booth alternate demo host
styles.css       Base styles for the photo booth
theme-y2k.css    Y2K / holographic skin for the photo booth
app.js           Camera + live canvas filters + photo strip
LAB-SETUP.md     Full BeEF + XSS demo walkthrough
```

## What this project is NOT

- It is not an attack tool. It is not a cloned real website. The school
  name, crest, and content are fictional; only a palette (burgundy +
  charcoal) is inspired by a real institution's identity, and that
  alone does not impersonate anyone.
- The public demo site does not host or trigger any XSS. All
  user-submitted content is escaped on any non-local hostname.
- Even in lab mode, there is no network capture code in this repo.
  Credential-field handlers are inert; BeEF is what performs any
  capture in the hook demo, and you run that yourself.

## License

MIT — see [LICENSE](LICENSE).
