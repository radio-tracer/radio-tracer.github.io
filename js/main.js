/**
 * RadioTracer landing — tracer diagram + interactive demos
 */
(function () {
  "use strict";

  // ── helpers ──────────────────────────────────────────────
  const $ = (sel, root = document) => root.querySelector(sel);
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

  function easeInOut(t) {
    return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
  }

  /** Animate a number of steps along a polyline (array of {x,y}) */
  function animateAlong(points, duration, onFrame) {
    return new Promise((resolve) => {
      if (!points || points.length < 2) {
        resolve();
        return;
      }
      // Precompute segment lengths
      const segs = [];
      let total = 0;
      for (let i = 0; i < points.length - 1; i++) {
        const dx = points[i + 1].x - points[i].x;
        const dy = points[i + 1].y - points[i].y;
        const len = Math.hypot(dx, dy);
        segs.push({ len, dx, dy, from: points[i] });
        total += len;
      }
      const t0 = performance.now();
      function frame(now) {
        const t = Math.min(1, (now - t0) / duration);
        const e = easeInOut(t);
        let dist = e * total;
        let x = points[0].x;
        let y = points[0].y;
        let angle = 0;
        for (const s of segs) {
          if (dist <= s.len) {
            const f = s.len ? dist / s.len : 0;
            x = s.from.x + s.dx * f;
            y = s.from.y + s.dy * f;
            angle = Math.atan2(s.dy, s.dx);
            break;
          }
          dist -= s.len;
          x = s.from.x + s.dx;
          y = s.from.y + s.dy;
          angle = Math.atan2(s.dy, s.dx);
        }
        onFrame({ x, y, angle, t });
        if (t < 1) requestAnimationFrame(frame);
        else resolve();
      }
      requestAnimationFrame(frame);
    });
  }

  // ── Tracer diagram ───────────────────────────────────────
  // SCA → CVE importer → methods.json → agent → app → svc → vuln → report
  const PATH = [
    { x: 20, y: 70 },       // needle start
    { x: 80, y: 70 },       // SCA
    { x: 250, y: 70 },      // CVE importer
    { x: 445, y: 70 },      // methods.json
    { x: 647, y: 70 },      // agent
    { x: 650, y: 200 },     // app
    { x: 370, y: 200 },     // OrderService
    { x: 305, y: 330 },     // DeserUtil (HIT)
    { x: 635, y: 330 },     // report
  ];

  const EDGE_STEPS = [
    null,    // 0 start
    "e0",    // SCA → importer
    "e1",    // importer → watchlist
    "e2",    // watchlist → agent
    "e3",    // agent → app
    "e4",    // app → svc
    "e5",    // svc → vuln
    "e6",    // vuln → report
  ];

  const NODE_AT = [
    null,
    "n-sca",
    "n-importer",
    "n-watchlist",
    "n-agent",
    "n-app",
    "n-svc",
    "n-vuln",
    "n-report",
  ];

  const STATUS_AT = [
    "Injecting probe…",
    '<span class="ok">SCA inventory</span> — known vulnerable packages',
    '<span class="ok">CVE importer</span> — radio-tracer-cve-import maps CVE → methods',
    '<span class="ok">methods.json</span> — watchlist ready for the agent',
    '<span class="ok">Agent attached</span> — probes injected on class load',
    '<span class="ok">Workload running</span> — traffic / tests in flight',
    '<span class="ok">OrderService</span> — business call chain',
    '<span class="hit">HIT · DeserUtil#read</span> — CVE method executed',
    '<span class="hit">REACHABLE</span> — HTML + stderr + Slack notified',
  ];

  let tracing = false;

  function setStatus(html) {
    const el = $("#diagram-status");
    if (el) el.innerHTML = html;
  }

  function resetDiagram() {
    tracing = false;
    const probe = $("#probe");
    const trail = $("#trail-dot");
    if (probe) {
      probe.classList.add("probe-hidden");
      probe.classList.remove("probe-hit");
      probe.setAttribute("transform", "translate(0,0)");
    }
    if (trail) trail.setAttribute("opacity", "0");

    document.querySelectorAll(".edge").forEach((e) => {
      e.classList.remove("edge-active");
      e.setAttribute("marker-end", "url(#arrow)");
    });
    document.querySelectorAll(".node").forEach((n) => {
      n.classList.remove("node-hit", "node-hot");
    });
    setStatus('Idle — click <span class="ok">Inject tracer</span> to watch a probe travel the call path.');
  }

  async function runTracer() {
    if (tracing) return;
    tracing = true;
    resetDiagram();
    tracing = true; // reset clears it

    const probe = $("#probe");
    const trail = $("#trail-dot");
    if (!probe) return;

    probe.classList.remove("probe-hidden", "probe-hit");
    setStatus(STATUS_AT[0]);

    // Animate segment by segment so we can light nodes/edges
    for (let i = 0; i < PATH.length - 1; i++) {
      if (!tracing) return;
      const from = PATH[i];
      const to = PATH[i + 1];
      const edgeId = EDGE_STEPS[i + 1];
      const nodeId = NODE_AT[i + 1];

      await animateAlong([from, to], 700 + Math.random() * 200, ({ x, y, angle }) => {
        // needle points along direction (default tip is down-ish; rotate so tip leads)
        const deg = (angle * 180) / Math.PI + 90;
        probe.setAttribute("transform", `translate(${x},${y}) rotate(${deg})`);
        if (trail) {
          trail.setAttribute("cx", x);
          trail.setAttribute("cy", y);
          trail.setAttribute("opacity", "0.85");
        }
      });

      if (edgeId) {
        const edge = document.getElementById(edgeId);
        if (edge) {
          edge.classList.add("edge-active");
          edge.setAttribute("marker-end", "url(#arrow-active)");
        }
      }
      if (nodeId) {
        const node = document.getElementById(nodeId);
        if (node) {
          node.classList.add("node-hot");
          if (nodeId === "n-vuln") {
            node.classList.remove("node-hot");
            node.classList.add("node-hit");
            probe.classList.add("probe-hit");
            // flash ring red
            const ring = $("#probe-ring");
            if (ring) ring.setAttribute("stroke", "#ef4444");
          }
          if (nodeId === "n-report") {
            node.classList.add("node-hit");
          }
        }
      }
      setStatus(STATUS_AT[i + 1] || "");
      await sleep(220);
    }

    if (trail) trail.setAttribute("opacity", "0.35");
    setStatus(
      '<span class="hit">REACHABLE</span> — vulnerable method ran under this workload. Prioritize the fix.'
    );
    tracing = false;
  }

  // ── Demo 1: busy app → Slack ─────────────────────────────
  let slackBusy = false;

  function clearSlack() {
    const msgs = $("#slack-msgs");
    if (!msgs) return;
    msgs.innerHTML =
      '<div class="slack-empty" id="slack-empty">Waiting for first REACHABLE hit…<br />' +
      '<span style="font-size:0.78rem;opacity:0.8">Webhook quiet until a watched method runs</span></div>';
  }

  function postSlackMessage() {
    const msgs = $("#slack-msgs");
    if (!msgs) return;
    const empty = $("#slack-empty");
    if (empty) empty.remove();

    const now = new Date();
    const time = now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    const div = document.createElement("div");
    div.className = "slack-msg";
    div.innerHTML = `
      <div class="slack-avatar">RT</div>
      <div>
        <div class="slack-meta"><strong>RadioTracer</strong><span class="time">${time}</span></div>
        <div class="slack-text"><span class="alert">[REACHABLE]</span> CVE-2023-XXXX · CRITICAL
com.acme.util.DeserUtil#deserialize
hits=1  ·  module=orders-api
<span style="color:#9a9b9e">stack: OrderService.importOrder ← OrdersController.importBatch ← DemoApp</span>

_First hit this JVM · report will merge on exit_</div>
      </div>`;
    msgs.appendChild(div);
    msgs.scrollTop = msgs.scrollHeight;
  }

  async function runSlackDemo(autoClick = true) {
    if (slackBusy) return;
    slackBusy = true;

    const app = $("#fake-app");
    const cursor = $("#demo-cursor");
    const btn = $("#btn-import");
    if (!app || !btn) {
      slackBusy = false;
      return;
    }

    clearSlack();

    if (autoClick && cursor) {
      // Move cursor to Import button
      const appRect = app.getBoundingClientRect();
      const btnRect = btn.getBoundingClientRect();
      const startX = 40;
      const startY = 80;
      const endX = btnRect.left - appRect.left + btnRect.width * 0.55;
      const endY = btnRect.top - appRect.top + btnRect.height * 0.55;

      cursor.style.left = startX + "px";
      cursor.style.top = startY + "px";
      cursor.classList.add("visible");

      await sleep(200);
      // CSS transition move
      cursor.style.transition = "left 0.9s cubic-bezier(.2,.8,.2,1), top 0.9s cubic-bezier(.2,.8,.2,1)";
      cursor.style.left = endX + "px";
      cursor.style.top = endY + "px";
      await sleep(950);

      // click pulse
      cursor.style.transform = "scale(0.85)";
      btn.disabled = true;
      btn.textContent = "Importing…";
      await sleep(150);
      cursor.style.transform = "";
      await sleep(400);
      cursor.classList.remove("visible");
      cursor.style.transition = "";
    } else {
      btn.disabled = true;
      btn.textContent = "Importing…";
      await sleep(500);
    }

    // Simulate processing then REACHABLE
    await sleep(450);
    postSlackMessage();
    btn.disabled = false;
    btn.textContent = "Import orders";
    slackBusy = false;
  }

  // ── Demo 2: CI test → logs + HTML ────────────────────────
  let ciBusy = false;

  const TERM_LINES = [
    { cls: "cmd", text: "$ radio-tracer-cve-import --input snyk.json --out target/methods.json" },
    { cls: "ok", text: "Wrote 4 watched methods → target/methods.json" },
    { cls: "cmd", text: "$ mvn -pl it-tests verify -Dradio.tracer.agent=true" },
    { cls: "dim", text: "[INFO] Building it-tests 1.0.0" },
    { cls: "ok", text: "[INFO] --- surefire: OrderImportIT" },
    { cls: "dim", text: "RadioTracer agent attached · methods=target/methods.json" },
    { cls: "dim", text: "  report=target/radio-tracer-report.html" },
    { cls: "", text: "OrderImportIT#importsSerializedBatch ........ " },
    { cls: "hit", text: "[REACHABLE] CVE-2023-XXXX CRITICAL com.acme.util.DeserUtil#deserialize hits=1" },
    { cls: "dim", text: "    at com.acme.orders.OrderService.importOrder(OrderService.java:88)" },
    { cls: "dim", text: "    at com.acme.it.OrderImportIT.importsSerializedBatch(OrderImportIT.java:41)" },
    { cls: "ok", text: "OrderImportIT#importsSerializedBatch ........ OK" },
    { cls: "ok", text: "Tests run: 1, Failures: 0, Errors: 0, Skipped: 0" },
    { cls: "warn", text: "RadioTracer: writing HTML report → target/radio-tracer-report.html" },
    { cls: "ok", text: "[INFO] BUILD SUCCESS" },
  ];

  function resetReport() {
    const rp = $("#report-preview");
    const body = $("#rp-body");
    const st = $("#rp-status");
    if (rp) rp.classList.remove("reveal");
    if (st) st.textContent = "pending…";
    if (body) {
      body.innerHTML =
        '<p class="muted" style="margin:2rem 0;text-align:center">Report appears when the JVM exits after the test run.</p>';
    }
  }

  function showReport() {
    const rp = $("#report-preview");
    const body = $("#rp-body");
    const st = $("#rp-status");
    if (st) st.innerHTML = '<span style="color:#b91c1c;font-weight:700">1 REACHABLE</span>';
    if (body) {
      body.innerHTML = `
        <div class="cards">
          <div class="card-mini"><div class="n r">1</div><div class="muted">REACHABLE</div></div>
          <div class="card-mini"><div class="n">4</div><div class="muted">watched</div></div>
          <div class="card-mini"><div class="n">1</div><div class="muted">hits</div></div>
          <div class="card-mini"><div class="n">12s</div><div class="muted">run</div></div>
        </div>
        <table>
          <thead>
            <tr><th>CVE</th><th>Method</th><th>Sev</th><th>Hits</th></tr>
          </thead>
          <tbody>
            <tr class="hit">
              <td>CVE-2023-XXXX</td>
              <td>DeserUtil#deserialize</td>
              <td>CRITICAL</td>
              <td>1</td>
            </tr>
            <tr>
              <td>CVE-2022-AAAA</td>
              <td>XmlParser#parse</td>
              <td>HIGH</td>
              <td class="muted">0</td>
            </tr>
            <tr>
              <td>CVE-2021-BBBB</td>
              <td>LogUtil#format</td>
              <td>MED</td>
              <td class="muted">0</td>
            </tr>
            <tr>
              <td>CVE-2024-CCCC</td>
              <td>JwtLib#verify</td>
              <td>HIGH</td>
              <td class="muted">0</td>
            </tr>
          </tbody>
        </table>
        <p class="muted" style="margin:0.75rem 0 0;font-size:0.72rem">
          Flat multi-module merge · hits summed by CVE + method · generated on JVM exit
        </p>`;
    }
    if (rp) {
      rp.classList.remove("reveal");
      // reflow
      void rp.offsetWidth;
      rp.classList.add("reveal");
    }
  }

  async function runCiDemo() {
    if (ciBusy) return;
    ciBusy = true;
    const term = $("#term-body");
    if (!term) {
      ciBusy = false;
      return;
    }

    term.innerHTML = "";
    resetReport();

    for (const line of TERM_LINES) {
      const span = document.createElement("div");
      if (line.cls) span.className = line.cls;
      span.textContent = line.text;
      term.appendChild(span);
      term.scrollTop = term.scrollHeight;
      // slower on hit lines for drama
      const delay = line.cls === "hit" ? 700 : line.cls === "cmd" ? 400 : 120 + Math.random() * 80;
      await sleep(delay);
    }

    await sleep(400);
    showReport();
    ciBusy = false;
  }

  // ── Wire up ──────────────────────────────────────────────
  function init() {
    $("#btn-inject")?.addEventListener("click", runTracer);
    $("#btn-reset")?.addEventListener("click", resetDiagram);

    $("#btn-import")?.addEventListener("click", () => runSlackDemo(false));
    $("#btn-demo-slack")?.addEventListener("click", () => runSlackDemo(true));

    $("#btn-demo-ci")?.addEventListener("click", runCiDemo);

    // Auto-play tracer once when the diagram enters the viewport
    const diagram = $(".diagram-wrap");
    if (diagram && "IntersectionObserver" in window) {
      let played = false;
      const io = new IntersectionObserver(
        (entries) => {
          entries.forEach((e) => {
            if (e.isIntersecting && !played) {
              played = true;
              setTimeout(runTracer, 500);
              io.disconnect();
            }
          });
        },
        { threshold: 0.35 }
      );
      io.observe(diagram);
    }

    // Optional: gentle auto-hint for demos when scrolled into view
    const demoSlack = $("#demo-slack");
    if (demoSlack && "IntersectionObserver" in window) {
      let once = false;
      const io2 = new IntersectionObserver(
        (entries) => {
          entries.forEach((e) => {
            if (e.isIntersecting && !once) {
              once = true;
              setTimeout(() => runSlackDemo(true), 600);
              io2.disconnect();
            }
          });
        },
        { threshold: 0.4 }
      );
      io2.observe(demoSlack);
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
