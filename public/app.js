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
  const state = { meal: meals[0].id, data: loadData(), toastTimer: null };

  const elements = {
    nav: document.querySelector("#meal-nav"),
    crumb: document.querySelector("#crumb-meal"),
    grid: document.querySelector("#function-grid"),
    title: document.querySelector("#section-title"),
    mealMiniIcon: document.querySelector("#meal-mini-icon"),
    kicker: document.querySelector("#section-kicker-text"),
    mealCount: document.querySelector("#meal-count"),
    toast: document.querySelector("#toast"),
  };

  function loadData() {
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

  function saveData() {
    try {
      localStorage.setItem(storageKey, JSON.stringify(state.data));
      document.querySelector(".status-dot")?.setAttribute("title", "Salvo neste navegador");
    } catch {
      announce("Não foi possível salvar. Verifique o espaço disponível no navegador.");
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
      <span class="topic-text">${safeText(item)}</span>
      <span class="topic-actions">
        <button class="mini-action edit" type="button" aria-label="Editar tópico: ${safeText(item)}" title="Editar" data-action="edit" data-meal="${mealId}" data-letter="${letter}" data-index="${index}">${actionIcon("edit")}</button>
        <button class="mini-action delete" type="button" aria-label="Excluir tópico: ${safeText(item)}" title="Excluir" data-action="delete" data-meal="${mealId}" data-letter="${letter}" data-index="${index}">${actionIcon("delete")}</button>
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
        <button class="add-topic-button" type="submit" aria-label="Adicionar tópico à função ${letter}" title="Adicionar tópico"><svg viewBox="0 0 16 16" aria-hidden="true"><path d="M8 3v10M3 8h10"/></svg></button>
      </form>
    </article>`;
  }

  function render() {
    const meal = meals.find(item => item.id === state.meal) || meals[0];
    elements.crumb.textContent = meal.label;
    elements.title.textContent = meal.label;
    elements.mealMiniIcon.innerHTML = `<span class="meal-emoji" aria-hidden="true">${meal.icon}</span>`;
    elements.kicker.textContent = meal.label.toLocaleUpperCase("pt-BR");
    elements.grid.innerHTML = letters.map(letter => renderCard(meal, letter)).join("");
    elements.mealCount.textContent = plural(navCounts(meal.id), "tópico");
    renderNav();
  }

  function setTopics(mealId, letter, items) {
    if (!state.data[mealId]) state.data[mealId] = {};
    state.data[mealId][letter] = items;
    saveData();
    render();
  }

  function announce(message) {
    elements.toast.textContent = message;
    elements.toast.classList.add("visible");
    window.clearTimeout(state.toastTimer);
    state.toastTimer = window.setTimeout(() => elements.toast.classList.remove("visible"), 1900);
  }

  elements.nav.addEventListener("click", event => {
    const button = event.target.closest("[data-meal]");
    if (!button) return;
    state.meal = button.dataset.meal;
    render();
  });

  elements.grid.addEventListener("submit", event => {
    const form = event.target.closest(".add-topic-form");
    if (!form) return;
    event.preventDefault();
    const input = form.elements.topic;
    const value = input.value.trim();
    if (!value) { input.focus(); return; }
    const items = itemsFor(form.dataset.meal, form.dataset.letter);
    setTopics(form.dataset.meal, form.dataset.letter, [...items, value]);
    const nextInput = elements.grid.querySelector(`form[data-meal="${form.dataset.meal}"][data-letter="${form.dataset.letter}"] input`);
    nextInput?.focus();
    announce("Tópico adicionado.");
  });

  elements.grid.addEventListener("click", event => {
    const button = event.target.closest("button[data-action]");
    if (!button) return;
    const { meal: mealId, letter, index, action } = button.dataset;
    const items = [...itemsFor(mealId, letter)];
    const itemIndex = Number(index);
    if (action === "delete") {
      const deleted = items.splice(itemIndex, 1);
      setTopics(mealId, letter, items);
      announce(deleted.length ? "Tópico excluído." : "");
      return;
    }
    const row = button.closest(".topic-row");
    const current = items[itemIndex];
    row.querySelector(".topic-text").innerHTML = `<input class="topic-edit" maxlength="240" value="${safeText(current)}" aria-label="Editar tópico" />`;
    row.querySelector(".topic-actions").innerHTML = '<button class="mini-action save-edit" type="button" aria-label="Salvar tópico" title="Salvar"><svg viewBox="0 0 16 16" aria-hidden="true"><path d="m3 8 3.2 3.2L13 4.5"/></svg></button>';
    const input = row.querySelector(".topic-edit");
    input.focus();
    input.select();
    const commit = () => {
      const value = input.value.trim();
      if (!value) { input.focus(); return; }
      items[itemIndex] = value;
      setTopics(mealId, letter, items);
      announce("Tópico atualizado.");
    };
    row.querySelector(".save-edit").addEventListener("click", commit, { once: true });
    input.addEventListener("keydown", keyEvent => {
      if (keyEvent.key === "Enter") { keyEvent.preventDefault(); commit(); }
      if (keyEvent.key === "Escape") render();
    }, { once: true });
  });

  render();

  if ("serviceWorker" in navigator) {
    window.addEventListener("load", () => {
      navigator.serviceWorker.register("/sw.js").catch(() => {});
    }, { once: true });
  }
})();
