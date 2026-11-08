# XSS Awareness Lab

An educational web-security demo built around a fictional student portal
("Northgate Polytechnic"). It shows the two main real-world ways an
attacker gets a BeEF **hook** into a victim's browser — an **app-layer**
path (**stored XSS**) and a **network-layer** path (**bettercap MITM**) —
and why fixing one does not defend against the other. Isolated,
authorized lab use only.

**🧪 Local lab:** clone and run on `localhost` — the Q&A board becomes
vulnerable, so posting a crafted question hooks everyone who views the
board via BeEF. Pair it with bettercap on an isolated subnet for the
network-layer half of the demo.

> ⚠️ **Scope / ethics.** For authorized security-education labs on
> machines and accounts you own or are explicitly allowed to test.
> Do not point a live hook at anyone who hasn't consented.

---

## What this project demonstrates

1. **Social engineering via lookalike UI.** The portal reads like an
   everyday campus site (sign-in, Q&A board, announcements, course
   search, events), so browser prompts and credential fields feel
   in-context — the same dynamic that makes real phishing effective.

2. **Two independent paths to the same BeEF hook.**
   - **Stored cross-site scripting (XSS).** The Q&A board is a
     deliberately-vulnerable implementation: user-submitted question
     titles and bodies are concatenated into the DOM without escaping.
     A posted `<script>` executes for every browser that loads the
     board. The fault is in the *site*.
   - **Network MITM with bettercap.** On an isolated lab subnet,
     bettercap ARP-spoofs the gateway and rewrites plain-HTTP traffic
     in transit (`http.proxy.injectjs`) to add the hook to *any* page
     the victim loads. The target site doesn't have to be vulnerable;
     the *network path* is.

3. **The "no interaction" property (for either vector).** The victim
   doesn't have to click anything. The payload runs when the page is
   parsed into the DOM — no scroll, no click, no visible indication.

4. **How BeEF fits in.** BeEF is **not** the injector; it's the C2
   panel for browsers that are already hooked. Getting `hook.js` onto
   the page is the attack vector — in this lab, two different vectors
   land at the same BeEF endpoint. The hook is never baked into the
   repo's HTML: it only arrives when a payload is posted (XSS) or when
   the network path is tampered with (bettercap).

5. **The defensive fixes — one per vector.**
   - Against stored XSS: escape user input before rendering (what the
     public build does on GitHub Pages). This is the mitigation real
     frameworks apply by default — React/Vue text interpolation,
     Jinja autoescape, `textContent` vs `innerHTML`.
   - Against bettercap MITM: end-to-end **TLS with HSTS**. The
     app itself cannot defend against a tampered network path; only
     encryption and trust-on-first-use protections do.

## Attack-vector comparison

| Vector                                | Fault lies with | How the hook lands                                           | Real-world defence              |
|---------------------------------------|-----------------|--------------------------------------------------------------|---------------------------------|
| **Stored XSS** (this lab's Q&A board) | The site        | Attacker posts a payload; viewers run it on page load        | Escape user input before render |
| **Bettercap MITM**                    | The network path | Attacker ARP-spoofs gateway; HTTP responses are rewritten to add the hook | End-to-end TLS + HSTS           |

The lesson is that patching one vector does not protect against the
other — a perfectly-coded site still loses a user on a rogue hotspot,
and a perfectly-encrypted session on a vulnerable site is still
exploitable.

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
- **Google Fonts** (Inter, Source Serif 4) for the portal.
- **GitHub Pages** for the safe public deployment.
- **BeEF** (external — you run it on your own lab host) as the C2 for
  the hook demonstration.
- **Bettercap** (external — you run it on your own isolated lab subnet)
  for the network-layer injection demo.

## Run it locally

```bash
python -m http.server 8000
```

Then open `http://localhost:8000`.

See **[LAB-SETUP.md](LAB-SETUP.md)** for the full step-by-step on both
vectors — stored XSS → BeEF and bettercap MITM → BeEF — plus HTTPS/HSTS
caveats and scope warnings.

## Project layout

```
index.html       myNorthgate student portal (main page)
portal.css       University theme (burgundy + charcoal)
portal.js        Q&A board, ask form, search, sign-in (lab-mode gated)
booth.html       Alternate photo-booth demo host (optional)
styles.css       Base styles for the photo booth
theme-y2k.css    Y2K / holographic skin for the photo booth
app.js           Camera + live canvas filters + photo strip
LAB-SETUP.md     Full BeEF walkthrough — stored-XSS + bettercap MITM
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
