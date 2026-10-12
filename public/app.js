(() => {
  "use strict";

  const meals = [
    { id: "breakfast", label: "Café da manhã", icon: "☀", color: "#d6a54f" },
    { id: "lunch", label: "Almoço", icon: "◉", color: "#7f9c6e" },
    { id: "snack", label: "Café da tarde", icon: "☕", color: "#9e806d" },
    { id: "dinner", label: "Jantar", icon: "☾", color: "#7d88a5" },
  ];
  const letters = ["A", "B", "C", "D"];
  const storageKey = "meu-dia-notas-v2";
  const state = { meal: meals[0].id, data: {}, connected: false, busy: false, syncing: false, editing: false, snapshot: null, toastTimer: null };
  const localNotes = loadLocalData();

  const elements = {
    nav: document.querySelector("#meal-nav"),
    grid: document.querySelector("#function-grid"),
    title: document.querySelector("#section-title"),
    mealMiniIcon: document.querySelector("#meal-mini-icon"),
    kicker: document.querySelector("#section-kicker-text"),
    mealCount: document.querySelector("#meal-count"),
    toast: document.querySelector("#toast"),
  };

  function loadLocalData() {
    try {
      const current = localStorage.getItem(storageKey);
      if (current !== null) {
        const saved = JSON.parse(current);
        return saved && typeof saved === "object" && !Array.isArray(saved) ? saved : {};
      }
      const legacy = JSON.parse(localStorage.getItem("meu-dia-notas-v1") || "{}");
      const merged = {};
      // Keep every topic from the former daily records, including repeated topics.
      for (const key of Object.keys(legacy || {}).sort()) {
        const day = legacy[key];
        for (const meal of meals) {
          for (const letter of letters) {
            const items = day?.[meal.id]?.[letter];
            if (!Array.isArray(items)) continue;
            merged[meal.id] ??= {};
            merged[meal.id][letter] ??= [];
            merged[meal.id][letter].push(...items);
          }
        }
      }
      // Keep the original storage as a backup if migration cannot be saved.
      try { localStorage.setItem(storageKey, JSON.stringify(merged)); } catch {}
      return merged;
    } catch {
      return {};
    }
  }

  function itemsFor(mealId, letter) {
    const items = state.data?.[mealId]?.[letter];
    return Array.isArray(items) ? items : [];
  }

  function navCounts(mealId) {
    return letters.reduce((sum, letter) => sum + itemsFor(mealId, letter).length, 0);
  }

  function plural(count, one, many = `${one}s`) {
    return `${count} ${count === 1 ? one : many}`;
  }

  function safeText(value) {
    return String(value).replace(/[&<>"']/g, char => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char]);
  }

  function renderNav() {
    elements.nav.innerHTML = meals.map(meal => `
      <button class="meal-link" type="button" data-meal="${meal.id}" aria-current="${state.meal === meal.id ? "page" : "false"}">
        <span class="meal-icon" aria-hidden="true">${meal.icon}</span>
        <span class="meal-link-label">${meal.label}</span>
        <span class="meal-link-count">${navCounts(meal.id)}</span>
      </button>
    `).join("");
  }

  function actionIcon(kind) {
    if (kind === "edit") return '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="m10.8 2.8 2.4 2.4M3 13l2.8-.6 7-7a1.7 1.7 0 0 0-2.4-2.4l-7 7L3 13Z"/></svg>';
    return '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M3 4.5h10M6 4.5V3h4v1.5m2 0-.5 8H4.5l-.5-8m3 2v4m3-4v4"/></svg>';
  }

  function renderTopic(item, mealId, letter, index) {
    return `<li class="topic-row" data-topic-index="${index}">
      <span class="topic-bullet" aria-hidden="true"></span>
      <span class="topic-text">${safeText(item.text)}</span>
      <span class="topic-actions">
        <button class="mini-action edit" type="button" aria-label="Editar tópico: ${safeText(item.text)}" title="Editar" data-action="edit" data-meal="${mealId}" data-letter="${letter}" data-index="${index}">${actionIcon("edit")}</button>
        <button class="mini-action delete" type="button" aria-label="Excluir tópico: ${safeText(item.text)}" title="Excluir" data-action="delete" data-meal="${mealId}" data-letter="${letter}" data-index="${index}">${actionIcon("delete")}</button>
      </span>
    </li>`;
  }

  function renderCard(meal, letter) {
    const items = itemsFor(meal.id, letter);
    const list = items.length
      ? `<ul class="topic-list">${items.map((item, index) => renderTopic(item, meal.id, letter, index)).join("")}</ul>`
      : '<div class="empty-card"><span class="empty-mark" aria-hidden="true">＋</span><span>Seus tópicos aparecerão aqui</span></div>';
    return `<article class="function-card" aria-labelledby="title-${meal.id}-${letter}">
      <div class="function-top">
        <div class="function-name"><span class="function-letter">${letter}</span><span class="function-title" id="title-${meal.id}-${letter}">Função ${letter}</span></div>
        <span class="topic-total">${plural(items.length, "tópico")}</span>
      </div>
      ${list}
      <form class="add-topic-form" data-meal="${meal.id}" data-letter="${letter}">
        <input class="add-topic-input" name="topic" maxlength="240" autocomplete="off" aria-label="Novo tópico para função ${letter} em ${meal.label}" placeholder="Escreva um tópico..." />
        <button class="add-topic-button" ${!state.connected || state.busy ? "disabled" : ""} type="submit" aria-label="Adicionar tópico à função ${letter}" title="Adicionar tópico"><svg viewBox="0 0 16 16" aria-hidden="true"><path d="M8 3v10M3 8h10"/></svg></button>
      </form>
    </article>`;
  }

  function render() {
    const meal = meals.find(item => item.id === state.meal) || meals[0];
    elements.title.textContent = meal.label;
    elements.mealMiniIcon.innerHTML = `<span class="meal-emoji" aria-hidden="true">${meal.icon}</span>`;
    elements.kicker.textContent = meal.label.toLocaleUpperCase("pt-BR");
    elements.grid.innerHTML = letters.map(letter => renderCard(meal, letter)).join("");
    elements.mealCount.textContent = plural(navCounts(meal.id), "tópico");
    renderNav();
  }

  function announce(message) {
    elements.toast.textContent = message;
    elements.toast.classList.add("visible");
    window.clearTimeout(state.toastTimer);
    state.toastTimer = window.setTimeout(() => elements.toast.classList.remove("visible"), 3500);
  }

  function connectionStatus(message) {
    document.querySelector("#sync-status").textContent = message;
    document.querySelector("#sync-status").setAttribute("role", "status");
    document.querySelector("#import-local").disabled = !state.connected || state.busy;
  }

  async function request(method = "GET", body) {
    const response = await fetch("/api/notes", {
      method, cache: "no-store",
      headers: body ? {"Content-Type": "application/json"} : {},
      body: body ? JSON.stringify(body) : undefined,
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || "Não foi possível sincronizar.");
    return result;
  }

  function hasDraft() {
    return [...elements.grid.querySelectorAll(".add-topic-input")].some(input => input.value.trim());
  }

  async function sync(force = false) {
    if (state.syncing || (!force && (state.busy || state.editing || hasDraft()))) return;
    state.syncing = true;
    try {
      const {notes} = await request();
      const data = {};
      for (const note of notes) {
        data[note.meal] ??= {};
        data[note.meal][note.letter] ??= [];
        data[note.meal][note.letter].push(note);
      }
      const snapshot = JSON.stringify(data);
      const changed = snapshot !== state.snapshot || !state.connected;
      state.data = data;
      state.snapshot = snapshot;
      state.connected = true;
      connectionStatus("Anotações compartilhadas · Sincronizado");
      if (changed || force) render();
    } catch (error) {
      state.connected = false;
      connectionStatus("Sem conexão · Tente atualizar a página");
      elements.grid.querySelectorAll(".add-topic-button").forEach(button => button.disabled = true);
      if (force) announce(error.message);
    } finally { state.syncing = false; }
  }

  async function write(method, body) {
    if (state.busy) return false;
    state.busy = true;
    connectionStatus("Salvando para todos…");
    elements.grid.querySelectorAll("button").forEach(button => button.disabled = true);
    try {
      await request(method, body);
      return true;
    } catch (error) {
      announce(error.message);
      return false;
    } finally {
      state.busy = false;
      connectionStatus(state.connected ? "Anotações compartilhadas" : "Sem conexão");
      elements.grid.querySelectorAll("button").forEach(button => button.disabled = false);
    }
  }

  elements.nav.addEventListener("click", event => {
    const button = event.target.closest("[data-meal]");
    if (!button || state.busy) return;
    state.meal = button.dataset.meal;
    state.editing = false;
    render();
    sync();
  });

  elements.grid.addEventListener("submit", async event => {
    const form = event.target.closest(".add-topic-form");
    if (!form) return;
    event.preventDefault();
    const input = form.elements.topic;
    const value = input.value.trim();
    if (!value || state.busy || !state.connected) return;
    const meal = form.dataset.meal;
    const letter = form.dataset.letter;
    const added = await write("POST", {items: [{id: crypto.randomUUID(), meal, letter, text: value}]});
    if (!added) return;
    input.value = "";
    await sync(true);
    elements.grid.querySelector('form[data-letter="' + letter + '"] input')?.focus();
    announce("Tópico adicionado para todos.");
  });

  elements.grid.addEventListener("click", async event => {
    const button = event.target.closest("button[data-action]");
    if (!button || state.busy || !state.connected || state.editing) return;
    const {meal, letter, index, action} = button.dataset;
    const item = itemsFor(meal, letter)[Number(index)];
    if (!item) return;
    if (action === "delete") {
      if (await write("DELETE", {id: item.id, expectedText: item.text})) announce("Tópico excluído para todos.");
      await sync(true);
      return;
    }
    state.editing = true;
    const row = button.closest(".topic-row");
    row.querySelector(".topic-text").innerHTML = '<input class="topic-edit" maxlength="240" value="' + safeText(item.text) + '" aria-label="Editar tópico" />';
    row.querySelector(".topic-actions").innerHTML = '<button class="mini-action save-edit" type="button" aria-label="Salvar tópico" title="Salvar">✓</button><button class="mini-action cancel-edit" type="button" aria-label="Cancelar edição" title="Cancelar">×</button>';
    const input = row.querySelector(".topic-edit");
    input.focus(); input.select();
    const commit = async () => {
      const text = input.value.trim();
      if (!text || state.busy) return;
      if (await write("PATCH", {id: item.id, expectedText: item.text, text})) {
        state.editing = false;
        await sync(true);
        announce("Tópico atualizado para todos.");
      }
    };
    const cancel = () => { state.editing = false; render(); sync(); };
    row.querySelector(".save-edit").addEventListener("click", commit);
    row.querySelector(".cancel-edit").addEventListener("click", cancel);
    input.addEventListener("keydown", event => {
      if (event.key === "Enter") { event.preventDefault(); commit(); }
      if (event.key === "Escape") cancel();
    });
  });

  // Sharing local notes is an explicit action, never an automatic upload.
  const localItems = [];
  for (const meal of meals) for (const letter of letters) {
    for (const text of localNotes?.[meal.id]?.[letter] || []) {
      if (typeof text === "string" && text.trim() && text.length <= 240) localItems.push({meal: meal.id, letter, text});
    }
  }
  const importButton = document.querySelector("#import-local");
  importButton.hidden = !localItems.length || localStorage.getItem("filipe-local-import-done") === "yes";
  importButton.addEventListener("click", async () => {
    if (state.busy || !state.connected) return;
    let ids;
    try { ids = JSON.parse(localStorage.getItem("filipe-local-import-ids") || "null"); } catch {}
    if (!Array.isArray(ids) || ids.length !== localItems.length) {
      ids = localItems.map(() => crypto.randomUUID());
      localStorage.setItem("filipe-local-import-ids", JSON.stringify(ids));
    }
    for (let offset = 0; offset < localItems.length; offset += 500) {
      const items = localItems.slice(offset, offset + 500).map((item, index) => ({...item, id: ids[offset + index]}));
      if (!await write("POST", {items})) return;
    }
    localStorage.setItem("filipe-local-import-done", "yes");
    importButton.hidden = true;
    await sync(true);
    announce("Anotações deste navegador compartilhadas com todos.");
  });

  render();
  connectionStatus("Carregando anotações compartilhadas…");
  sync(true);
  window.setInterval(() => { if (!document.hidden) sync(); }, 10000);
  document.addEventListener("visibilitychange", () => { if (!document.hidden) sync(); });
  window.addEventListener("online", () => sync());

  if ("serviceWorker" in navigator) {
    window.addEventListener("load", () => {
      navigator.serviceWorker.register("/sw.js").catch(() => {});
    }, { once: true });
  }
})();
