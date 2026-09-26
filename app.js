(function () {
  "use strict";

  var STORAGE_KEY = "corsuVocabProgress.v1";

  var CATEGORIES = [
    { key: "all", label: "Tout" },
    { key: "mot", label: "Mots" },
    { key: "phrase", label: "Phrases" },
    { key: "proverbe", label: "Proverbes" }
  ];

  var CAT_BADGE = { mot: "MOT", phrase: "PHRASE", proverbe: "PROVERBE" };

  var state = {
    mastered: {},
    variante: "sud",
    category: "all",
    seenToday: { date: "", count: 0 }
  };

  var queue = [];
  var current = null;
  var isFlipped = false;

  var els = {};

  function todayStr() {
    return new Date().toISOString().slice(0, 10);
  }

  function loadState() {
    try {
      var raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        var parsed = JSON.parse(raw);
        if (parsed && typeof parsed === "object") {
          state.mastered = parsed.mastered || {};
          state.variante = parsed.variante === "nord" ? "nord" : "sud";
          state.category = parsed.category || "all";
          state.seenToday = parsed.seenToday || { date: "", count: 0 };
        }
      }
    } catch (e) {
      console.warn("Progression illisible, on repart de zéro.", e);
    }
    if (state.seenToday.date !== todayStr()) {
      state.seenToday = { date: todayStr(), count: 0 };
    }
    if (!CATEGORIES.some(function (c) { return c.key === state.category; })) {
      state.category = "all";
    }
  }

  function saveState() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (e) {
      console.warn("Impossible de sauvegarder la progression.", e);
    }
  }

  function wordsForCategory(catKey) {
    if (catKey === "all") return WORDS;
    return WORDS.filter(function (w) { return w.cat === catKey; });
  }

  function remainingWords(catKey) {
    return wordsForCategory(catKey).filter(function (w) { return !state.mastered[w.id]; });
  }

  function shuffle(arr) {
    var a = arr.slice();
    for (var i = a.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var tmp = a[i]; a[i] = a[j]; a[j] = tmp;
    }
    return a;
  }

  function registerSeen() {
    if (state.seenToday.date !== todayStr()) {
      state.seenToday = { date: todayStr(), count: 0 };
    }
    state.seenToday.count++;
  }

  function buildQueue() {
    queue = shuffle(remainingWords(state.category));
    resetCardTransform();
    isFlipped = false;
    els.card.classList.remove("flipped");
    current = queue.length ? queue[0] : null;
    render();
  }

  function nextCard() {
    resetCardTransform();
    isFlipped = false;
    els.card.classList.remove("flipped");
    current = queue.length ? queue[0] : null;
    render();
  }

  function markKnow() {
    if (!current) return;
    state.mastered[current.id] = true;
    registerSeen();
    queue.shift();
    saveState();
    animateOut(1, nextCard);
    updateStats();
  }

  function markDontKnow() {
    if (!current) return;
    registerSeen();
    var w = queue.shift();
    queue.push(w);
    saveState();
    animateOut(-1, nextCard);
    updateStats();
  }

  function animateOut(direction, done) {
    var card = els.card;
    card.classList.add("fly-out");
    card.style.transform = "translateX(" + (direction * 600) + "px) rotate(" + (direction * 20) + "deg)";
    card.style.opacity = "0";
    window.setTimeout(function () {
      card.classList.remove("fly-out");
      done();
      card.style.opacity = "1";
    }, 260);
  }

  function resetCardTransform() {
    var card = els.card;
    card.classList.remove("dragging", "snap-back", "fly-out");
    card.style.transform = "";
    card.style.opacity = "1";
    els.swipeLeft.style.opacity = "0";
    els.swipeRight.style.opacity = "0";
  }

  function resetMastered() {
    var msg = "Remettre tous les mots maîtrisés dans la liste ?";
    if (!confirm(msg)) return;
    state.mastered = {};
    saveState();
    buildQueue();
    updateStats();
    showToast("Mots maîtrisés remis dans la liste");
  }

  function render() {
    renderFilters();
    renderVariante();
    renderCard();
    updateStats();
  }

  function renderFilters() {
    els.filtersRow.innerHTML = "";
    CATEGORIES.forEach(function (c) {
      var btn = document.createElement("button");
      btn.className = "filter-pill" + (state.category === c.key ? " filter-active" : "");
      btn.textContent = c.label;
      btn.addEventListener("click", function () {
        if (state.category === c.key) return;
        state.category = c.key;
        saveState();
        buildQueue();
        renderFilters();
      });
      els.filtersRow.appendChild(btn);
    });
  }

  function renderVariante() {
    var buttons = els.varianteSeg.querySelectorAll(".seg-btn");
    buttons.forEach(function (b) {
      b.classList.toggle("seg-active", b.dataset.variante === state.variante);
    });
    els.varianteLabel.textContent = state.variante === "sud" ? "CORSU — PUMUNTICU" : "CORSU — CISMUNTICU";
    if (current) {
      els.corsText.textContent = current[state.variante];
    }
  }

  function renderCard() {
    if (!current) {
      els.cardWrap.classList.add("empty");
      els.emptyState.classList.remove("hidden");
      els.card.style.display = "none";
      els.controls.style.display = "none";
      return;
    }
    els.cardWrap.classList.remove("empty");
    els.emptyState.classList.add("hidden");
    els.card.style.display = "";
    els.controls.style.display = "";

    var badge = CAT_BADGE[current.cat] || current.cat.toUpperCase();
    els.badgeFront.textContent = badge;
    els.badgeBack.textContent = badge;
    els.frText.textContent = current.fr;
    els.corsText.textContent = current[state.variante];
    els.varianteLabel.textContent = state.variante === "sud" ? "CORSU — PUMUNTICU" : "CORSU — CISMUNTICU";
  }

  function updateStats() {
    var remaining = remainingWords(state.category).length;
    var total = wordsForCategory(state.category).length;
    var mastered = total - remaining;
    els.statRemaining.textContent = remaining;
    els.statSeen.textContent = state.seenToday.count;
    els.statMastered.textContent = mastered;
    els.statTotal.textContent = total;
  }

  var toastTimer = null;
  function showToast(msg) {
    els.toast.textContent = msg;
    els.toast.classList.add("show");
    window.clearTimeout(toastTimer);
    toastTimer = window.setTimeout(function () {
      els.toast.classList.remove("show");
    }, 2200);
  }

  /* ---------------- Drag / swipe handling ---------------- */

  var drag = { active: false, startX: 0, startY: 0, dx: 0, moved: false, pointerId: null };

  function onPointerDown(e) {
    if (!current) return;
    drag.active = true;
    drag.startX = e.clientX;
    drag.startY = e.clientY;
    drag.dx = 0;
    drag.moved = false;
    drag.pointerId = e.pointerId;
    els.card.classList.add("dragging");
    els.card.classList.remove("snap-back");
    try { els.card.setPointerCapture(e.pointerId); } catch (err) {}
  }

  function onPointerMove(e) {
    if (!drag.active) return;
    var dx = e.clientX - drag.startX;
    var dy = e.clientY - drag.startY;
    if (Math.abs(dx) > 6 || Math.abs(dy) > 6) drag.moved = true;
    drag.dx = dx;
    var rotate = dx / 18;
    els.card.style.transform = "translateX(" + dx + "px) rotate(" + rotate + "deg)";
    var ratio = Math.min(Math.abs(dx) / 110, 1);
    if (dx > 0) {
      els.swipeRight.style.opacity = ratio;
      els.swipeLeft.style.opacity = 0;
    } else if (dx < 0) {
      els.swipeLeft.style.opacity = ratio;
      els.swipeRight.style.opacity = 0;
    } else {
      els.swipeLeft.style.opacity = 0;
      els.swipeRight.style.opacity = 0;
    }
  }

  function onPointerUp(e) {
    if (!drag.active) return;
    drag.active = false;
    els.card.classList.remove("dragging");
    var threshold = 90;

    if (!drag.moved) {
      toggleFlip();
      resetCardTransform();
      return;
    }

    if (drag.dx > threshold) {
      markKnow();
    } else if (drag.dx < -threshold) {
      markDontKnow();
    } else {
      els.card.classList.add("snap-back");
      els.card.style.transform = "";
      els.swipeLeft.style.opacity = 0;
      els.swipeRight.style.opacity = 0;
    }
  }

  function toggleFlip() {
    if (!current) return;
    isFlipped = !isFlipped;
    els.card.classList.toggle("flipped", isFlipped);
  }

  /* ---------------- Init ---------------- */

  function cacheEls() {
    els.filtersRow = document.getElementById("filtersRow");
    els.varianteSeg = document.getElementById("varianteSeg");
    els.varianteLabel = document.getElementById("varianteLabel");
    els.cardWrap = document.getElementById("cardWrap");
    els.card = document.getElementById("card");
    els.cardInner = document.getElementById("cardInner");
    els.badgeFront = document.getElementById("badgeFront");
    els.badgeBack = document.getElementById("badgeBack");
    els.frText = document.getElementById("frText");
    els.corsText = document.getElementById("corsText");
    els.emptyState = document.getElementById("emptyState");
    els.controls = document.querySelector(".controls");
    els.btnKnow = document.getElementById("btnKnow");
    els.btnDontKnow = document.getElementById("btnDontKnow");
    els.emptyResetBtn = document.getElementById("emptyResetBtn");
    els.resetBtn = document.getElementById("resetBtn");
    els.toast = document.getElementById("toast");
    els.statRemaining = document.getElementById("statRemaining");
    els.statSeen = document.getElementById("statSeen");
    els.statMastered = document.getElementById("statMastered");
    els.statTotal = document.getElementById("statTotal");
    els.swipeLeft = els.card.querySelector(".swipe-tag-left");
    els.swipeRight = els.card.querySelector(".swipe-tag-right");
  }

  function bindEvents() {
    els.card.addEventListener("pointerdown", onPointerDown);
    els.card.addEventListener("pointermove", onPointerMove);
    els.card.addEventListener("pointerup", onPointerUp);
    els.card.addEventListener("pointercancel", onPointerUp);

    els.btnKnow.addEventListener("click", markKnow);
    els.btnDontKnow.addEventListener("click", markDontKnow);
    els.emptyResetBtn.addEventListener("click", resetMastered);
    els.resetBtn.addEventListener("click", resetMastered);

    els.varianteSeg.querySelectorAll(".seg-btn").forEach(function (b) {
      b.addEventListener("click", function () {
        state.variante = b.dataset.variante;
        saveState();
        renderVariante();
      });
    });

    document.addEventListener("keydown", function (e) {
      if (e.key === "ArrowLeft") markDontKnow();
      else if (e.key === "ArrowRight") markKnow();
      else if (e.key === " " || e.key === "Enter") { e.preventDefault(); toggleFlip(); }
    });
  }

  function init() {
    cacheEls();
    loadState();
    bindEvents();
    buildQueue();
  }

  document.addEventListener("DOMContentLoaded", init);
})();
