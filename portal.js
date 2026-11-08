/* myNorthgate portal — front-end only.
 * Seeds content, renders the Q&A board, and handles the ask/search/login
 * forms entirely in the browser. No network calls; nothing is sent anywhere.
 */
(() => {
  "use strict";

  const $ = (id) => document.getElementById(id);
  const esc = (s) =>
    String(s).replace(/[&<>"']/g, (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c])
    );

  // ---------- Seed data ----------
  const news = [
    { tag: "Registration", title: "Spring 2027 registration opens Nov 10", body: "Priority registration begins for continuing students. Check your enrolment appointment in myPortal.", date: "Oct 24, 2026" },
    { tag: "Library", title: "Extended library hours for finals", body: "Riverside Library is open 24/7 from Dec 1–18. Bring your student card for after-hours access.", date: "Oct 22, 2026" },
    { tag: "IT", title: "myPortal maintenance window", body: "Scheduled maintenance Sat 2–4am. Sign-in may be briefly unavailable during this window.", date: "Oct 20, 2026" },
  ];

  const events = [
    { m: "Nov", d: "03", title: "Fall Career Fair", meta: "10am–3pm · Student Union Building" },
    { m: "Nov", d: "07", title: "Intro to Research Workshop", meta: "1pm · Library, Room 204" },
    { m: "Nov", d: "12", title: "Hackathon: NorthgateBuild", meta: "9am · Engineering Commons" },
    { m: "Nov", d: "18", title: "Wellness Day", meta: "All day · Recreation Centre" },
  ];

  let questions = [
    { id: 1, cat: "Courses", title: "Is CMPT 120 heavy on math?", body: "Thinking of taking it next term but I'm nervous about the math side. How much calc is actually involved?", author: "jordan_m", time: "2h ago", votes: 14 },
    { id: 2, cat: "Registration", title: "Waitlist moved — do I get an email?", body: "I'm #3 on the waitlist for PSYC 101. Does the portal email you when a seat opens or do I have to keep checking?", author: "sam.lee", time: "5h ago", votes: 9 },
    { id: 3, cat: "IT & Portal", title: "myPortal says my password expired", body: "It keeps rejecting my login even though I'm sure the password is right. Anyone else getting this today?", author: "priya_k", time: "6h ago", votes: 21 },
    { id: 4, cat: "Campus Life", title: "Best quiet study spots on Riverside campus?", body: "Library fills up fast around finals. Where do you go when it's packed?", author: "tariq", time: "1d ago", votes: 17 },
    { id: 5, cat: "Courses", title: "BIOL 110 vs BIOL 112 for non-majors?", body: "Which one is more manageable if I just need a science elective?", author: "mina.c", time: "1d ago", votes: 6 },
  ];
  let nextId = 6;
  let activeCat = "all";
  let search = "";

  // LAB DEMO: when running locally (localhost / 127.0.0.1 / file://), the
  // Q&A board renders question titles and bodies UNESCAPED so a posted
  // <script src="…hook.js"></script> executes for anyone viewing the
  // thread (stored XSS). On any public hostname (e.g. GitHub Pages) the
  // board renders safely via the esc() helper — a deliberately-vulnerable
  // app should not be publicly reachable, and this file serves as a
  // portfolio/education piece there, not a live attack surface.
  const LAB_MODE = (() => {
    try {
      const h = location.hostname;
      return (
        location.protocol === "file:" ||
        h === "localhost" ||
        h === "127.0.0.1" ||
        h === "" ||
        h.endsWith(".localhost") ||
        h.endsWith(".local")
      );
    } catch (e) {
      return false;
    }
  })();

  // ---------- Render: news ----------
  $("newsCards").innerHTML = news
    .map(
      (n) => `
      <article class="news-card">
        <div class="card-body">
          <span class="tag">${esc(n.tag)}</span>
          <h3>${esc(n.title)}</h3>
          <p>${esc(n.body)}</p>
          <span class="date">${esc(n.date)}</span>
        </div>
      </article>`
    )
    .join("");

  // ---------- Render: events ----------
  $("eventsList").innerHTML = events
    .map(
      (e) => `
      <div class="event">
        <div class="cal"><div class="m">${esc(e.m)}</div><div class="d">${esc(e.d)}</div></div>
        <div><h4>${esc(e.title)}</h4><p>${esc(e.meta)}</p></div>
      </div>`
    )
    .join("");

  // ---------- Render: Q&A ----------
  function renderQA() {
    const list = $("qaList");
    const filtered = questions.filter((q) => {
      const catOk = activeCat === "all" || q.cat === activeCat;
      const s = search.toLowerCase();
      const sOk = !s || (q.title + " " + q.body).toLowerCase().includes(s);
      return catOk && sOk;
    });
    $("qaCount").textContent = questions.length;

    if (!filtered.length) {
      list.innerHTML = `<li class="qa-item"><div class="qa-body"><p class="muted">No questions match. Be the first to ask →</p></div></li>`;
      return;
    }
    // In LAB_MODE, user-authored title/body are concatenated into HTML
    // without escaping — the simulated vulnerability. On public hosts
    // everything is escaped. Meta fields are always safe.
    const t = (s) => (LAB_MODE ? String(s) : esc(s));
    list.innerHTML = filtered
      .map(
        (q) => `
        <li class="qa-item" data-id="${q.id}">
          <div class="votes">
            <button class="vote-btn" data-vote="${q.id}" title="Upvote">▲</button>
            <span class="vote-count">${q.votes}</span>
            <span class="vote-label">votes</span>
          </div>
          <div class="qa-body">
            <h3>${t(q.title)}</h3>
            <div class="qa-meta">
              <span class="cat-chip">${esc(q.cat)}</span>
              <span>by ${esc(q.author)}</span>
              <span>· ${esc(q.time)}</span>
            </div>
            ${q.body ? `<p class="qa-excerpt">${t(q.body)}</p>` : ""}
          </div>
        </li>`
      )
      .join("");

    // Inline <script> added via innerHTML won't execute on its own, so
    // when in LAB_MODE we re-create any <script> tags inside the list so
    // they run — mirroring how a real stored-XSS payload behaves when a
    // vulnerable backend writes user content into the page.
    if (LAB_MODE) {
      list.querySelectorAll("script").forEach((old) => {
        const s = document.createElement("script");
        for (const a of old.attributes) s.setAttribute(a.name, a.value);
        s.text = old.textContent;
        old.replaceWith(s);
      });
    }
  }
  renderQA();

  // Upvote (event delegation)
  $("qaList").addEventListener("click", (e) => {
    const btn = e.target.closest("[data-vote]");
    if (!btn) return;
    const q = questions.find((x) => x.id === Number(btn.dataset.vote));
    if (q) { q.votes++; renderQA(); }
  });

  // Category tabs
  $("qaTabs").addEventListener("click", (e) => {
    const tab = e.target.closest(".tab");
    if (!tab) return;
    document.querySelectorAll("#qaTabs .tab").forEach((t) => t.classList.remove("active"));
    tab.classList.add("active");
    // decode HTML entity in data-cat (e.g. "IT &amp; Portal")
    const tmp = document.createElement("textarea");
    tmp.innerHTML = tab.dataset.cat;
    activeCat = tmp.value;
    renderQA();
  });

  // Board search
  $("qaSearch").addEventListener("input", (e) => { search = e.target.value; renderQA(); });

  // Ask form
  $("askForm").addEventListener("submit", (e) => {
    e.preventDefault();
    const title = $("qTitle").value.trim();
    const cat = $("qCategory").value;
    const body = $("qBody").value.trim();
    if (!title) return;
    questions.unshift({ id: nextId++, cat, title, body, author: "you", time: "just now", votes: 1 });
    e.target.reset();
    activeCat = "all";
    document.querySelectorAll("#qaTabs .tab").forEach((t, i) => t.classList.toggle("active", i === 0));
    renderQA();
    const st = $("askStatus");
    st.hidden = false;
    st.textContent = "✓ Posted to the board — thanks for contributing!";
    toast("Your question was posted to the board.");
    document.getElementById("qa").scrollIntoView({ behavior: "smooth" });
  });

  // Course search (hero) — benign hint only
  $("courseSearch").addEventListener("submit", (e) => {
    e.preventDefault();
    const q = $("courseQuery").value.trim();
    $("searchHint").textContent = q
      ? `Showing results for “${q}” — open the course catalogue to register.`
      : "Type a course code or keyword to search the catalogue.";
  });

  // Login — front-end only, no auth, no network, password never stored.
  $("loginForm").addEventListener("submit", (e) => {
    e.preventDefault();
    const st = $("loginStatus");
    st.hidden = false;
    st.style.color = "var(--muted)";
    st.textContent = "Checking credentials…";
    setTimeout(() => {
      st.style.color = "#c0392b";
      st.textContent = "myPortal sign-in is temporarily unavailable. Please try again shortly.";
    }, 1200);
  });

  // ---------- Toast ----------
  let toastTimer;
  function toast(msg) {
    const t = $("toast");
    t.textContent = msg;
    t.hidden = false;
    requestAnimationFrame(() => t.classList.add("show"));
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => {
      t.classList.remove("show");
      setTimeout(() => (t.hidden = true), 300);
    }, 2600);
  }

  // ---------- "Students online" ticker (cosmetic) ----------
  (function ticker() {
    let n = 320 + Math.floor(Math.random() * 180);
    $("onlineCount").textContent = n;
    setInterval(() => {
      n += Math.floor(Math.random() * 9) - 4;
      if (n < 200) n = 200;
      $("onlineCount").textContent = n;
    }, 3000);
  })();
})();
