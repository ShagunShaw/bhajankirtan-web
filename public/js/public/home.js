(() => {
  const $ = (id) => document.getElementById(id);
  const C = window.Catalog;
  const mobile = window.matchMedia("(max-width: 600px)").matches;
  const PERF_LIMIT = mobile ? 6 : 8, PACK_LIMIT = 3;
  let data = null;

  C.attachSuggest($("heroQ"), () => data);

  // Looping, swipeable carousel (phones only)
  const startCarousel = (grid, dots) => {
    const cards = [...grid.querySelectorAll(".pack")];
    if (!mobile || cards.length < 2) return;

    dots.innerHTML = cards.map((_, i) => `<i data-i="${i}"></i>`).join("");
    let cur = 0, paused = false, resume;

    const go = (i) => {
      cur = (i + cards.length) % cards.length;
      const c = cards[cur];
      grid.scrollTo({ left: c.offsetLeft - (grid.clientWidth - c.offsetWidth) / 2, behavior: "smooth" });
    };
    const paint = () => dots.querySelectorAll("i").forEach((d, i) => d.classList.toggle("on", i === cur));

    grid.addEventListener("scroll", () => {
      const mid = grid.scrollLeft + grid.clientWidth / 2;
      let best = 0, dist = Infinity;
      cards.forEach((c, i) => {
        const d = Math.abs(c.offsetLeft + c.offsetWidth / 2 - mid);
        if (d < dist) { dist = d; best = i; }
      });
      cur = best;
      paint();
    }, { passive: true });

    const hold = () => { paused = true; clearTimeout(resume); resume = setTimeout(() => { paused = false; }, 6000); };
    grid.addEventListener("touchstart", hold, { passive: true });
    dots.addEventListener("click", (e) => {
      const d = e.target.closest("i[data-i]");
      if (d) { hold(); go(Number(d.dataset.i)); }
    });

    setInterval(() => { if (!paused && !document.hidden) go(cur + 1); }, 4000);
    paint();
  };

  C.getPerformers()
    .then((d) => {
      data = d;
      const list = d.performers;
      $("perfGrid").innerHTML = list.length
        ? list.slice(0, PERF_LIMIT).map((p, i) => C.perfCard(p, i)).join("")
        : '<p class="empty">Artists will appear here soon.</p>';
      $("perfMore").hidden = list.length <= PERF_LIMIT;
    })
    .catch((e) => { $("perfGrid").innerHTML = `<p class="empty">${C.escapeHTML(e.message)}</p>`; });

  C.getPackages()
    .then((list) => {
      $("packGrid").innerHTML = list.length
        ? list.slice(0, PACK_LIMIT).map((p, i) => C.packCard(p, i, { stamp: true })).join("")
        : '<p class="empty">Packages will appear here soon.</p>';
      $("packMore").hidden = list.length <= PACK_LIMIT;
      startCarousel($("packGrid"), $("packDots"));
    })
    .catch((e) => { $("packGrid").innerHTML = `<p class="empty">${C.escapeHTML(e.message)}</p>`; });
})();