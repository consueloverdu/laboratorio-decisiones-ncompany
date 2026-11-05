(() => {
  "use strict";

  const STORAGE_KEY = "ncompany-decision-story-v1";
  const $ = (id) => document.getElementById(id);
  const safe = (value) => String(value ?? "").replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[char]));
  const filled = (value, fallback = "Pendiente") => String(value ?? "").trim() || fallback;
  let serial = 0;
  const option = (name, why, origin) => ({ id: `option-${Date.now().toString(36)}-${++serial}`, name, why, origin });
  const firstLine = (value) => String(value || "").split(/\n/).map((part) => part.trim()).find(Boolean) || "";
  const TAG_LABELS = { negocio: "Negocio", personal: "Personal", equipos: "Equipos", comprensión: "Comprensión", creatividad: "Creatividad" };
  const METHOD_QUESTIONS = {
    1: "¿Qué parte de esta decisión es importante aunque todavía no sea urgente?",
    2: "¿Qué factores internos y externos podrían cambiar la elección?",
    4: "¿Qué dos ejes te ayudarían a comparar las opciones?",
    6: "¿Qué te empuja hacia el cambio y qué te retiene?",
    11: "¿Qué información mínima necesitas antes de decidir?",
    13: "¿Qué camino te acerca más a la dirección que quieres tomar?",
    35: "¿Qué fortalezas existentes podrían servir como punto de partida?"
  };

  function makeCase(which) {
    let data;
    if (which === "luckia") {
      data = {
        title: "Elegir un primer piloto de coordinación",
        context: "Ejemplo temporal y ficticio situado en España: un equipo de Luckia quiere explorar cómo coordinar mejor el juego responsable entre salones y canal online.",
        objective: "Aprender qué iniciativa conviene probar con un alcance pequeño.",
        constraint: "No hay datos internos de costes ni resultados; todas las propuestas son hipótesis del ejercicio.",
        options: [
          option("Formación común de equipos", "Explora si una base compartida ayuda a coordinar respuestas entre canales.", "Ejemplo ficticio"),
          option("Información más clara para usuarios", "Explora si explicar mejor la información ayuda a las personas usuarias.", "Ejemplo ficticio"),
          option("Protocolo compartido de derivación", "Explora una forma común de orientar y coordinar respuestas.", "Ejemplo ficticio")
        ],
        comparison: [
          { pros: "Podría crear un lenguaje común entre equipos.\nPuede probarse con un grupo pequeño.", cons: "Requiere tiempo de formación.\nPor sí sola puede no cambiar los procesos.", pending: "Horas disponibles y necesidades de formación." },
          { pros: "Podría facilitar la comprensión.\nUn prototipo permitiría observar dudas reales.", cons: "Exige trabajo de contenido y diseño.\nSin línea base sería difícil medir la mejora.", pending: "Dudas más frecuentes y capacidad de rediseño." },
          { pros: "Conecta la actuación entre canales.\nPuede revelar puntos de coordinación difíciles.", cons: "Necesita acuerdos entre áreas.\nPuede añadir complejidad operativa.", pending: "Personas responsables y variaciones locales." }
        ],
        priority: [1, 0, 2],
        originText: "Las tres opciones y sus argumentos son ejemplos ficticios editables. No representan decisiones de Luckia."
      };
    } else if (which === "career") {
      data = {
        title: "Elegir mi siguiente paso profesional",
        context: "Caso ficticio: no estoy a gusto en mi trabajo actual y quiero decidir cómo avanzar.",
        objective: "Encontrar un camino profesional sostenible y motivador.",
        constraint: "Aún no conozco mis ingresos mínimos, oportunidades reales ni tiempo disponible.",
        options: [
          option("Cambiar de trabajo", "Explora una salida directa hacia otro puesto u organización.", "Ejemplo ficticio"),
          option("Preparar oposiciones", "Explora una vía profesional distinta que exige tiempo de estudio.", "Ejemplo ficticio"),
          option("Transición gradual con plazo", "Combina estabilidad temporal con búsqueda o estudio y una fecha de decisión.", "Tercera vía ficticia")
        ],
        comparison: [
          { pros: "Podría aliviar el malestar actual.\nAbre posibilidades de aprendizaje.", cons: "Hay incertidumbre sobre ingresos y encaje.\nAún no existen ofertas comparadas.", pending: "Ofertas reales y condición económica mínima." },
          { pros: "Tiene requisitos de acceso definidos.\nPodría abrir una carrera estable.", cons: "Exige dedicación sostenida.\nLos plazos y el resultado son inciertos.", pending: "Motivación, convocatorias y horas disponibles." },
          { pros: "Permite probar caminos sin una ruptura inmediata.\nProtege ingresos durante la exploración.", cons: "Puede alargar el malestar.\nNecesita una fecha y límites claros.", pending: "Duración tolerable y señales para decidir." }
        ],
        priority: [2, 0, 1],
        originText: "Las tres opciones y sus argumentos son ejemplos ficticios editables. La transición gradual es una tercera vía del ejercicio."
      };
    } else {
      data = {
        title: "", context: "", objective: "", constraint: "",
        options: [
          option("Mantener el camino actual", "Sirve como punto de comparación antes de cambiar.", "Plantilla por regla · sin IA"),
          option("Cambiar de forma directa", "Explora una alternativa distinta a la situación actual.", "Plantilla por regla · sin IA"),
          option("Hacer una prueba pequeña", "Permite aprender antes de asumir un cambio mayor.", "Plantilla por regla · sin IA")
        ],
        comparison: [{ pros: "", cons: "", pending: "" }, { pros: "", cons: "", pending: "" }, { pros: "", cons: "", pending: "" }],
        priority: [],
        originText: "Estas son tres plantillas genéricas generadas por una regla fija, no por IA. Cámbialas para que encajen con tu caso."
      };
    }
    const comparison = Object.fromEntries(data.options.map((item, index) => [item.id, data.comparison[index]]));
    return { caseId: which, mode: "course", title: data.title, context: data.context, objective: data.objective, constraint: data.constraint,
      options: data.options, comparison, selectedIds: [], priorityIds: data.priority.map((index) => data.options[index].id),
      originText: data.originText, orders: {}, finalChoiceId: "", finalReason: "",
      plan: { action: "", owner: "", date: "", review: "" }, optionalModelId: "", methodReflections: {} };
  }

  let state = makeCase("luckia");
  let catalog = [];
  let dirty = false;
  const markDirty = () => { dirty = true; };
  const confirmReplace = () => !dirty || window.confirm("Hay cambios en este caso que no has guardado aquí. ¿Quieres sustituirlo?");
  function resetFinal() { state.finalChoiceId = ""; state.finalReason = ""; state.plan = { action: "", owner: "", date: "", review: "" }; }

  function announce(message) { $("live-message").textContent = message; }
  function selectedOptions() { return state.selectedIds.map((id) => state.options.find((item) => item.id === id)).filter(Boolean); }
  function hasPair() { return selectedOptions().length === 2; }
  function pairKey() { return [...state.selectedIds].sort().join("|"); }
  function orderForPair() {
    if (!hasPair()) return null;
    const key = pairKey();
    if (!state.orders[key]) {
      const leadId = state.priorityIds.find((id) => state.selectedIds.includes(id)) || "";
      state.orders[key] = { leadId, reason: "", change: "", automaticExample: Boolean(leadId) };
    }
    return state.orders[key];
  }
  function comparisonFor(id) { state.comparison[id] ||= { pros: "", cons: "", pending: "" }; return state.comparison[id]; }
  function orderValues() {
    const order = orderForPair();
    if (!order) return { reason: "", change: "" };
    if (!order.automaticExample) return { reason: order.reason, change: order.change };
    const data = comparisonFor(order.leadId);
    return { reason: firstLine(data.pros), change: filled(data.pending, "") };
  }

  function setTab(which) {
    const decision = which === "decision";
    $("decision-view").hidden = !decision;
    $("catalog-view").hidden = decision;
    $("tab-decision").classList.toggle("is-active", decision);
    $("tab-methods").classList.toggle("is-active", !decision);
    if (decision) { $("tab-decision").setAttribute("aria-current", "page"); $("tab-methods").removeAttribute("aria-current"); }
    else { $("tab-methods").setAttribute("aria-current", "page"); $("tab-decision").removeAttribute("aria-current"); }
    $("hero-kicker").textContent = decision ? "UNA HISTORIA DE DECISIÓN" : "BIBLIOTECA DE TRABAJO";
    $("page-title").innerHTML = decision ? "Una buena decisión es el resultado de hacer buenas preguntas<span>.</span>" : "Elige una forma de pensar<span>.</span>";
    $("hero-lead").textContent = decision ? "Partimos de tu situación, abrimos tres caminos y tú eliges los dos que merece la pena comparar." : "Cincuenta modelos para explorar preguntas distintas. Aplica uno a tu situación cuando te sirva.";
    window.scrollTo({ top: 0, behavior: "smooth" });
  }
  function setMode(mode) {
    state.mode = mode;
    const course = mode === "course";
    $("mode-course").classList.toggle("is-active", course);
    $("mode-free").classList.toggle("is-active", !course);
    $("mode-course").setAttribute("aria-pressed", String(course));
    $("mode-free").setAttribute("aria-pressed", String(!course));
    document.body.classList.toggle("free-mode", !course);
  }
  function renderContext() {
    $("decision-title").value = state.title;
    $("decision-context").value = state.context;
    $("decision-objective").value = state.objective;
    $("decision-constraint").value = state.constraint;
    document.querySelectorAll(".case-card").forEach((button) => button.classList.toggle("is-selected", button.dataset.case === state.caseId));
    $("case-disclaimer").hidden = state.caseId !== "luckia";
    $("options-origin").textContent = state.originText;
    renderOptionalMethod();
  }
  function renderOptions() {
    $("options-list").innerHTML = state.options.map((item, index) => `
      <div class="option-card"><div class="option-number">0${index + 1}</div><div class="option-body"><div class="option-top"><strong>Camino ${index + 1}</strong><span>${safe(item.origin)}</span></div>
        <label class="field"><span>Opción</span><input type="text" maxlength="140" data-option-name="${safe(item.id)}" value="${safe(item.name)}"></label>
        <label class="field"><span>Por qué esta opción</span><textarea rows="2" data-option-why="${safe(item.id)}">${safe(item.why)}</textarea></label></div></div>`).join("");
  }
  function renderPick() {
    $("pick-list").innerHTML = state.options.map((item) => {
      const selected = state.selectedIds.includes(item.id);
      return `<button type="button" class="pick-card ${selected ? "is-picked" : ""}" data-pick-id="${safe(item.id)}" aria-pressed="${selected}"><span class="pick-mark" aria-hidden="true">${selected ? "✓" : "+"}</span><span><strong>${safe(filled(item.name, "Opción sin nombre"))}</strong><small>${safe(item.why)}</small></span></button>`;
    }).join("");
    $("pick-status").textContent = state.selectedIds.length === 2 ? "Dos caminos elegidos. La comparación aparece a continuación." : `Has escogido ${state.selectedIds.length} de 2. Escoge exactamente dos para continuar.`;
    $("pick-status").classList.toggle("ready", state.selectedIds.length === 2);
  }
  function renderComparison() {
    const pair = selectedOptions();
    $("story-compare").hidden = pair.length !== 2;
    $("story-final").hidden = pair.length !== 2;
    if (pair.length !== 2) return;
    $("comparison-cards").innerHTML = pair.map((item, index) => {
      const data = comparisonFor(item.id);
      return `<div class="comparison-card"><div class="comparison-head"><span>${index === 0 ? "A" : "B"}</span><h3>${safe(item.name)}</h3></div>
        <label class="field"><span>Pros</span><textarea rows="3" data-compare-id="${safe(item.id)}" data-compare-field="pros" placeholder="Una idea por línea">${safe(data.pros)}</textarea></label>
        <label class="field"><span>Contras</span><textarea rows="3" data-compare-id="${safe(item.id)}" data-compare-field="cons" placeholder="Una idea por línea">${safe(data.cons)}</textarea></label>
        <label class="field"><span>Dato pendiente</span><textarea rows="2" data-compare-id="${safe(item.id)}" data-compare-field="pending" placeholder="Qué habría que comprobar">${safe(data.pending)}</textarea></label></div>`;
    }).join("");
    renderOrder(); renderOptionalMethod(); renderFinal();
  }
  function renderOrder() {
    if (!hasPair()) return;
    const pair = selectedOptions(), order = orderForPair();
    $("provisional-lead").innerHTML = `<option value="">Orden pendiente</option>${pair.map((item) => `<option value="${safe(item.id)}" ${order.leadId === item.id ? "selected" : ""}>${safe(item.name)}</option>`).join("")}`;
    const values = orderValues();
    $("provisional-reason").value = values.reason;
    $("provisional-change").value = values.change;
    const lead = pair.find((item) => item.id === order.leadId);
    if (lead && values.reason.trim() && values.change.trim()) {
      $("order-summary").innerHTML = `<strong>${safe(lead.name)} va delante, por ahora.</strong><p>Lo sostiene: ${safe(values.reason)} <br> Cambiaría si: ${safe(values.change)}</p><small>${order.automaticExample ? "Orden del caso ficticio. Comprueba o cambia sus argumentos." : "Orden indicado por la persona con datos editables."}</small>`;
    } else {
      $("order-summary").innerHTML = `<strong>Orden pendiente.</strong><p>Indica qué opción va delante, el dato decisivo y una condición que podría cambiar la lectura.</p>`;
    }
  }
  function renderFinal() {
    if (!hasPair()) return;
    const pair = selectedOptions(), order = orderForPair();
    $("final-choice-list").innerHTML = pair.map((item) => `<label class="final-choice"><input type="radio" name="final-choice" value="${safe(item.id)}" ${state.finalChoiceId === item.id ? "checked" : ""}><span><strong>${safe(item.name)}</strong><small>${order.leadId === item.id ? "Va delante en el orden provisional" : "Puedes elegirla igualmente"}</small></span></label>`).join("");
    $("final-reason").value = state.finalReason;
    $("plan-action").value = state.plan.action;
    $("plan-owner").value = state.plan.owner;
    $("plan-date").value = state.plan.date;
    $("plan-review").value = state.plan.review;
    $("final-reason-label").textContent = state.finalChoiceId && order.leadId && state.finalChoiceId !== order.leadId ? "Por qué discrepas del orden provisional" : "Por qué eliges esta opción";
    renderFinalStatus();
  }
  function renderFinalStatus() {
    const missing = [];
    const pair = selectedOptions();
    if (pair.some((item) => !comparisonFor(item.id).pros.trim() || !comparisonFor(item.id).cons.trim())) missing.push("anota pros y contras de los dos caminos");
    const order = orderForPair(), values = orderValues();
    if (!order?.leadId || !values.reason.trim() || !values.change.trim()) missing.push("explica el orden provisional y cuándo cambiaría");
    if (!state.finalChoiceId) missing.push("elige una opción");
    if (!state.finalReason.trim()) missing.push("explica el motivo");
    if (!state.plan.action.trim()) missing.push("define la primera acción");
    if (!state.plan.owner.trim()) missing.push("indica un responsable");
    if (!state.plan.date) missing.push("pon una fecha");
    if (!state.plan.review.trim()) missing.push("escribe la señal de revisión");
    $("final-status").textContent = missing.length ? `Informe en borrador: ${missing.join(", ")}.` : "Decisión y plan completos. Ya puedes descargar el informe.";
    $("final-status").classList.toggle("ready", missing.length === 0);
  }
  function renderOptionalMethod() {
    const item = catalog.find((model) => String(model.id) === String(state.optionalModelId));
    for (const id of ["context-method-note", "optional-method-note"]) {
      const node = $(id);
      node.hidden = !item;
      if (item) node.innerHTML = `<strong>Enfoque opcional: ${safe(item.name)}</strong><span>${safe(item.use)} Puedes usar esta pregunta sin añadir pasos al recorrido.</span>`;
    }
    $("method-reflection-wrap").hidden = !item;
    if (item) {
      $("method-reflection-question").textContent = METHOD_QUESTIONS[item.id] || `¿Qué te ayuda a ver «${item.name}» que aún no aparece en tu situación?`;
      $("method-reflection").value = state.methodReflections?.[item.id] || "";
    }
  }
  function renderAll() { renderContext(); renderOptions(); renderPick(); renderComparison(); setMode(state.mode); }

  function reportMarkdown() {
    const pair = selectedOptions(), order = hasPair() ? orderForPair() : null, orderCopy = hasPair() ? orderValues() : null;
    const provisional = state.options.find((item) => item.id === order?.leadId), final = state.options.find((item) => item.id === state.finalChoiceId);
    const method = catalog.find((item) => String(item.id) === String(state.optionalModelId));
    const lines = [`# ${filled(state.title, "Mi decisión")}`, "", "Informe de trabajo · prototipo NCompany", "", "## 1. La situación", filled(state.context), "", `Objetivo: ${filled(state.objective)}`, `Dato o límite importante: ${filled(state.constraint)}`, "", "## 2. Tres caminos propuestos", ""];
    state.options.forEach((item, index) => lines.push(`${index + 1}. ${filled(item.name)} — Por qué: ${filled(item.why)} [${item.origin}]`));
    lines.push("", "## 3. Dos caminos elegidos", ...(pair.length ? pair.map((item) => `- ${filled(item.name)}`) : ["Pendiente"]), "");
    if (method) lines.push(`Enfoque opcional desde el catálogo: ${method.name} — ${method.use}`, `Reflexión: ${filled(state.methodReflections?.[method.id])}`, "");
    lines.push("## 4. Pros, contras y orden provisional", "");
    pair.forEach((item) => { const data = comparisonFor(item.id); lines.push(`### ${filled(item.name)}`, `Pros: ${filled(data.pros)}`, `Contras: ${filled(data.cons)}`, `Dato pendiente: ${filled(data.pending)}`, ""); });
    lines.push(`Orden provisional: ${filled(provisional?.name)}`, `Dato decisivo: ${filled(orderCopy?.reason)}`, `Cambiaría si: ${filled(orderCopy?.change)}`, "", "## 5. Decisión de la persona", `Elección: ${filled(final?.name)}`, `Motivo: ${filled(state.finalReason)}`, "", "## Próximos pasos", `Primera acción: ${filled(state.plan.action)}`, `Responsable: ${filled(state.plan.owner)}`, `Fecha: ${filled(state.plan.date)}`, `Señal para revisar: ${filled(state.plan.review)}`, "", "Esta maqueta no tiene IA conectada. Los casos de ejemplo son ficticios; el caso de Luckia es temporal y no ha sido elegido por la empresa.");
    return lines.join("\n");
  }
  function downloadReport() {
    const blob = new Blob([reportMarkdown()], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(blob), a = document.createElement("a");
    const slug = (state.title || "decision").toLocaleLowerCase("es").normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 55) || "decision";
    a.href = url; a.download = `${slug}-informe.md`; document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 500);
    announce("Informe descargado en Markdown");
  }
  function saveLocal() { try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); dirty = false; window.alert("Caso guardado solo en este navegador. Esta demo no crea una cuenta."); } catch { window.alert("El navegador no permite guardar este caso."); } }
  function loadLocal() {
    try {
      if (!confirmReplace()) return;
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return window.alert("Aún no hay un caso guardado en este navegador.");
      const loaded = JSON.parse(raw);
      if (!Array.isArray(loaded.options) || loaded.options.length !== 3 || !loaded.comparison) throw new Error("Formato incompatible");
      state = loaded; state.methodReflections ||= {}; dirty = false; renderAll(); setTab("decision"); announce("Caso recuperado desde este navegador");
    } catch { window.alert("No se pudo recuperar el caso guardado."); }
  }

  function populateCatalogFilters() {
    const families = [...new Set(catalog.map((item) => item.family))].sort((a, b) => a.localeCompare(b, "es"));
    const tags = [...new Set(catalog.map((item) => item.tag))].sort((a, b) => a.localeCompare(b, "es"));
    $("catalog-family").innerHTML = '<option value="">Todas</option>' + families.map((value) => `<option value="${safe(value)}">${safe(value)}</option>`).join("");
    $("catalog-use").innerHTML = '<option value="">Todos</option>' + tags.map((value) => `<option value="${safe(value)}">${safe(TAG_LABELS[value] || value)}</option>`).join("");
  }
  function renderCatalog() {
    const query = $("catalog-search").value.trim().toLocaleLowerCase("es"), family = $("catalog-family").value, tag = $("catalog-use").value;
    const results = catalog.filter((item) => (!family || item.family === family) && (!tag || item.tag === tag) && (!query || `${item.name} ${item.use} ${item.family} ${item.tag}`.toLocaleLowerCase("es").includes(query)));
    $("catalog-count").textContent = `${results.length} de ${catalog.length} modelos`;
    $("catalog-list").innerHTML = results.length ? results.map((item) => `<article class="catalog-card card"><span class="catalog-family">${safe(item.family)}</span><h3>${safe(item.name)}</h3><p>${safe(item.use)}</p>${item.name.includes("indagación apreciativa") ? '<p class="catalog-clarification">Aquí «AI» significa indagación apreciativa, no inteligencia artificial.</p>' : ""}<div><span class="catalog-tag">${safe(TAG_LABELS[item.tag] || item.tag)}</span><button type="button" class="button ghost small" data-apply-model="${safe(item.id)}">Aplicarlo a mi situación ↗</button></div></article>`).join("") : '<div class="catalog-empty">No hay modelos con estos filtros. Prueba otra palabra o familia.</div>';
  }
  async function loadCatalog() {
    try {
      const response = await fetch("catalogo_modelos.json?v=7", { cache: "no-store" });
      if (!response.ok) throw new Error("Sin catálogo");
      const data = await response.json();
      if (!Array.isArray(data.models)) throw new Error("Formato del catálogo no válido");
      catalog = data.models.map((item) => ({ id: item.id, name: item.name, family: item.family, use: item.use, tag: item.tag }));
      populateCatalogFilters(); renderCatalog(); renderOptionalMethod();
    } catch { $("catalog-count").textContent = "Catálogo no disponible en esta vista"; $("catalog-list").innerHTML = '<div class="catalog-empty">No se pudo cargar el catálogo. El recorrido de decisión sigue disponible.</div>'; }
  }

  function bindEvents() {
    $("tab-decision").addEventListener("click", () => setTab("decision"));
    $("tab-methods").addEventListener("click", () => setTab("methods"));
    $("mode-course").addEventListener("click", () => setMode("course"));
    $("mode-free").addEventListener("click", () => setMode("free"));
    document.querySelectorAll(".case-card").forEach((button) => button.addEventListener("click", () => { if (button.dataset.case === state.caseId || !confirmReplace()) return; const mode = state.mode; state = makeCase(button.dataset.case); state.mode = mode; dirty = false; renderAll(); announce("Caso cargado"); }));
    const contextFields = { "decision-title": "title", "decision-context": "context", "decision-objective": "objective", "decision-constraint": "constraint" };
    Object.entries(contextFields).forEach(([id, key]) => $(id).addEventListener("input", (event) => { state[key] = event.target.value; markDirty(); }));
    $("method-reflection").addEventListener("input", (event) => { if (!state.optionalModelId) return; state.methodReflections ||= {}; state.methodReflections[state.optionalModelId] = event.target.value; markDirty(); });
    $("options-list").addEventListener("input", (event) => {
      const id = event.target.dataset.optionName || event.target.dataset.optionWhy;
      const item = state.options.find((option) => option.id === id);
      if (!item) return;
      if (event.target.dataset.optionName) item.name = event.target.value;
      if (event.target.dataset.optionWhy) item.why = event.target.value;
      markDirty();
      renderPick(); renderComparison();
    });
    $("pick-list").addEventListener("click", (event) => {
      const button = event.target.closest("[data-pick-id]"); if (!button) return;
      const id = button.dataset.pickId;
      if (state.selectedIds.includes(id)) state.selectedIds = state.selectedIds.filter((value) => value !== id);
      else if (state.selectedIds.length < 2) state.selectedIds.push(id);
      else { announce("Ya has escogido dos. Quita una antes de elegir otra."); return; }
      resetFinal(); markDirty();
      renderPick(); renderComparison();
      if (hasPair()) announce("Dos caminos elegidos; comparación abierta");
    });
    $("comparison-cards").addEventListener("input", (event) => {
      const id = event.target.dataset.compareId, field = event.target.dataset.compareField;
      if (!id || !["pros", "cons", "pending"].includes(field)) return;
      comparisonFor(id)[field] = event.target.value;
      markDirty();
      if (orderForPair()?.automaticExample) renderOrder();
      renderFinalStatus();
    });
    $("provisional-lead").addEventListener("change", (event) => { const order = orderForPair(); order.leadId = event.target.value; order.automaticExample = false; order.reason = ""; order.change = ""; markDirty(); renderOrder(); renderFinal(); });
    for (const [id, key] of [["provisional-reason", "reason"], ["provisional-change", "change"]]) $(id).addEventListener("input", (event) => {
      const order = orderForPair(); if (!order) return;
      if (order.automaticExample) { const values = orderValues(); order.reason = values.reason; order.change = values.change; order.automaticExample = false; }
      order[key] = event.target.value; markDirty(); renderOrderSummaryOnly(); renderFinalStatus();
    });
    $("final-choice-list").addEventListener("change", (event) => { if (event.target.name !== "final-choice") return; if (state.finalChoiceId !== event.target.value) { state.finalReason = ""; state.plan = { action: "", owner: "", date: "", review: "" }; } state.finalChoiceId = event.target.value; markDirty(); renderFinal(); });
    $("final-reason").addEventListener("input", (event) => { state.finalReason = event.target.value; markDirty(); renderFinalStatus(); });
    const planFields = { "plan-action": "action", "plan-owner": "owner", "plan-date": "date", "plan-review": "review" };
    Object.entries(planFields).forEach(([id, key]) => $(id).addEventListener("input", (event) => { state.plan[key] = event.target.value; markDirty(); renderFinalStatus(); }));
    $("download-report").addEventListener("click", downloadReport);
    $("save-local").addEventListener("click", saveLocal);
    $("load-local").addEventListener("click", loadLocal);
    $("catalog-search").addEventListener("input", renderCatalog);
    $("catalog-family").addEventListener("change", renderCatalog);
    $("catalog-use").addEventListener("change", renderCatalog);
    $("catalog-list").addEventListener("click", (event) => { const button = event.target.closest("[data-apply-model]"); if (!button) return; state.optionalModelId = button.dataset.applyModel; markDirty(); renderOptionalMethod(); setTab("decision"); $("story-context").scrollIntoView({ behavior: "smooth", block: "start" }); announce("Modelo marcado como enfoque opcional de tu situación"); });
  }
  function renderOrderSummaryOnly() {
    const pair = selectedOptions(), order = orderForPair(); if (!order) return;
    const lead = pair.find((item) => item.id === order.leadId), values = orderValues();
    $("order-summary").innerHTML = lead && values.reason.trim() && values.change.trim() ? `<strong>${safe(lead.name)} va delante, por ahora.</strong><p>Lo sostiene: ${safe(values.reason)}<br>Cambiaría si: ${safe(values.change)}</p><small>Orden indicado por la persona con datos editables.</small>` : `<strong>Orden pendiente.</strong><p>Indica qué opción va delante, el dato decisivo y una condición que podría cambiar la lectura.</p>`;
  }

  bindEvents(); renderAll(); loadCatalog();
  if ("serviceWorker" in navigator && location.protocol !== "file:") navigator.serviceWorker.register("service-worker.js", { updateViaCache: "none" }).then((registration) => registration.update()).catch(() => {});
})();
