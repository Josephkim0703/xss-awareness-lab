# XSS Awareness Lab

An educational web-security demo built around a fictional student portal
("Northgate Polytechnic") and a Y2K-themed browser photo booth. It shows
how **stored cross-site scripting (XSS)** on an ordinary-looking page
can chain into a browser-exploitation framework (**BeEF**) inside an
isolated, authorized lab.

**🌐 Live demo (safe render):** _enabled once GitHub Pages is live_
**🧪 Local lab:** clone and run on `localhost` — the Q&A board becomes
vulnerable, so posting a crafted question hooks everyone who views the
board via BeEF.

> ⚠️ **Scope / ethics.** For authorized security-education labs on
> machines and accounts you own or are explicitly allowed to test.
> Do not point a live hook at anyone who hasn't consented.

---

## What this project demonstrates

1. **Social engineering via lookalike UI.** The portal reads like an
   everyday campus site (sign-in, Q&A board, announcements, course
   search, events), so browser prompts and credential fields feel
   in-context — the same dynamic that makes real phishing effective.

2. **Stored cross-site scripting (XSS) as the only attack vector.**
   The Q&A board is a deliberately-vulnerable implementation:
   user-submitted question titles and bodies are concatenated into the
   DOM without escaping. A posted `<script>` executes for every browser
   that loads the board. No toggle, no admin flag, no setup — it is
   simply how the page renders.

3. **The "no interaction" property.** Stored XSS doesn't require the
   victim to click anything. The payload runs when the page is parsed
   into the DOM — no scroll, no click, no visible indication.

4. **How BeEF fits in.** BeEF is **not** the injector; it's the C2
   panel for browsers that are already hooked. Getting `hook.js` onto
   the page is the attack vector — in this lab, that vector is the
   board's stored XSS. The hook is never baked into the HTML: it only
   arrives when a payload is posted. Once a browser is hooked, BeEF
   can run modules against it.

5. **The defensive fix.** The exact same code path would be safe if
   the title and body were escaped before rendering (as the public
   build does on GitHub Pages). That one-line difference — treat user
   input as text, not HTML — is the same mitigation real frameworks
   apply by default (React/Vue text interpolation, Jinja autoescape,
   `textContent` vs `innerHTML`).

## Live site vs. local lab

| Host                                  | Q&A rendering       | Why                                         |
|---------------------------------------|---------------------|---------------------------------------------|
| `localhost` / `127.0.0.1` / `file://` | **Unescaped** (lab) | Intended demo environment                   |
| Any public hostname (e.g. GitHub Pages) | **Escaped** (safe) | Deliberately-vulnerable apps shouldn't be publicly reachable |

The decision is a hostname check at the top of [`portal.js`](portal.js).
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

See **[LAB-SETUP.md](LAB-SETUP.md)** for the full stored-XSS → BeEF
walkthrough.

## Project layout

```
index.html       myNorthgate student portal (main page)
portal.css       University theme (burgundy + charcoal)
portal.js        Q&A board, ask form, search, sign-in (lab-mode gated)
booth.html       Y2K photo-booth alternate demo host
styles.css       Base styles for the photo booth
theme-y2k.css    Y2K / holographic skin for the photo booth
app.js           Camera + live canvas filters + photo strip
LAB-SETUP.md     Full BeEF + stored-XSS demo walkthrough
```

## What this project is NOT

- It is not an attack tool. It is not a cloned real website. The
  school name, crest, and content are fictional; only a palette
  (burgundy + charcoal) is inspired by a real institution's identity,
  and that alone does not impersonate anyone.
- No hook or exploit script is embedded in the HTML. The only way to
  get `hook.js` onto the page in this lab is to inject it yourself as
  a posted payload — i.e. to carry out the stored-XSS attack against
  the deliberately-vulnerable board.
- The public demo site does not host or trigger any XSS. All
  user-submitted content is escaped on any non-local hostname.
- Even in lab mode, there is no network capture code in this repo.
  Credential-field handlers are inert; BeEF is what performs any
  capture in the hook demo, and you run that yourself.

## License

MIT — see [LICENSE](LICENSE).
