function rawUrl(path) {
  const { owner, repo, branch } = SITE_CONFIG;
  return `https://raw.githubusercontent.com/${owner}/${repo}/${branch}/${path}`;
}

function renderMasthead(activePage) {
  const el = document.getElementById("masthead");
  if (!el) return;

  const items = [
    { href: "index.html", label: "الأحدث", key: "latest" },
    { href: "catalog.html", label: "الفهرس", key: "catalog" },
    { href: "search.html", label: "بحث", key: "search" },
    { href: "about.html", label: "حول", key: "about" },
  ];

  const navHtml = items
    .map((it) => {
      const current = it.key === activePage ? ' aria-current="page"' : "";
      return `<li><a class="nav__link" href="${it.href}"${current}>${it.label}</a></li>`;
    })
    .join("");

  el.innerHTML = `
    <div class="masthead__inner">
      <a class="masthead__emblem-link" href="index.html">
        <img class="masthead__emblem" src="images/flag.png" alt="راية الاتحاد السوفيتي" width="240" height="120">
      </a>
      <h1 class="masthead__title"><a href="index.html">النهج الشيوعي</a></h1>
      <hr class="masthead__rule">
      <p class="masthead__tagline">نهج بناء الإشتراكية والتقدم هو نهج الشيوعية</p>
      <nav class="nav" aria-label="التنقل الرئيسي">
        <ul class="nav__list">${navHtml}</ul>
      </nav>
    </div>
  `;
}

async function fetchIssues() {
  const url = rawUrl("data/issues.json") + `?t=${Date.now()}`;
  try {
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) return [];
    const list = await res.json();
    if (!Array.isArray(list)) return [];
    return list.slice().sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
  } catch (e) {
    return [];
  }
}

function formatDate(dateStr) {
  if (!dateStr) return "";
  try {
    const d = new Date(dateStr);
    if (Number.isNaN(d.getTime())) return dateStr;
    return d.toLocaleDateString("ar", { year: "numeric", month: "long", day: "numeric" });
  } catch (e) {
    return dateStr;
  }
}

function plateHtml(issue) {
  const thumb = issue.thumb ? rawUrl(issue.thumb) : "";
  const pdf = rawUrl(issue.pdf);
  const inner = thumb
    ? `<img src="${thumb}" alt="غلاف عدد: ${escapeHtml(issue.title)}" loading="lazy">`
    : `<div class="plate__frame--empty">لا صورة غلاف</div>`;
  return `
    <a class="plate" href="${pdf}">
      <div class="plate__frame">${inner}</div>
      <div class="plate__title">${escapeHtml(issue.title)}</div>
      <div class="plate__meta">${formatDate(issue.date)}</div>
    </a>
  `;
}

function groupIssuesByYearMonth(issues) {
  const years = new Map();
  for (const issue of issues) {
    const d = new Date(issue.date);
    const year = Number.isNaN(d.getTime()) ? "بدون تاريخ" : d.getFullYear();
    const month = Number.isNaN(d.getTime()) ? "" : d.toLocaleDateString("ar", { month: "long" });
    if (!years.has(year)) years.set(year, new Map());
    const months = years.get(year);
    if (!months.has(month)) months.set(month, []);
    months.get(month).push(issue);
  }
  const sortedYears = [...years.entries()].sort((a, b) => {
    if (a[0] === "بدون تاريخ") return 1;
    if (b[0] === "بدون تاريخ") return -1;
    return b[0] - a[0];
  });
  return sortedYears.map(([year, months]) => ({
    year,
    months: [...months.entries()].sort((a, b) => {
      const da = a[1][0] ? new Date(a[1][0].date) : null;
      const db = b[1][0] ? new Date(b[1][0].date) : null;
      if (!da || !db) return 0;
      return db - da;
    }).map(([month, list]) => ({ month, issues: list })),
  }));
}

function escapeHtml(str) {
  return String(str ?? "").replace(/[&<>"']/g, (c) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;",
  }[c]));
}

function emptyStateHtml(message, hint) {
  return `
    <div class="empty-state">
      <strong>${escapeHtml(message)}</strong>
      <span>${escapeHtml(hint || "")}</span>
    </div>
  `;
}
