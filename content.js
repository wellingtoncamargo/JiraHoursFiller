(function () {
  // Util: toast simples na página do Jira
  function toast(msg, type = "success") {
    try {
      const id = "jira-hours-toast";
      const old = document.getElementById(id);
      if (old) old.remove();
      const el = document.createElement("div");
      el.id = id;
      el.className = type;
      el.textContent = msg;
      document.body.appendChild(el);
      setTimeout(() => el.remove(), 4000);
    } catch (e) {
      console.log(msg);
    }
  }

  // Monta "started" no formato que o Jira espera: yyyy-MM-ddTHH:mm:ss.SSSZZZ
function toJiraStarted(dateOnly, hour = 9, minute = 0) {
  const d = parseLocalDate(dateOnly);
  if (isNaN(d)) throw new Error("dateOnly inválida em toJiraStarted: " + dateOnly);
  d.setHours(hour, minute, 0, 0); // configura horário local

  const pad = n => String(n).padStart(2, "0");
  const yyyy = d.getFullYear();
  const MM = pad(d.getMonth() + 1);
  const dd = pad(d.getDate());
  const HH = pad(d.getHours());
  const mm = pad(d.getMinutes());
  const ss = pad(d.getSeconds());

  // timezone (ex: -0300)
  const tzMin = -d.getTimezoneOffset(); // se getTimezoneOffset() === 180 => tzMin = -180
  const sign = tzMin >= 0 ? "+" : "-";
  const tzh = pad(Math.floor(Math.abs(tzMin) / 60));
  const tzm = pad(Math.abs(tzMin) % 60);
  const tz = `${sign}${tzh}${tzm}`;

  return `${yyyy}-${MM}-${dd}T${HH}:${mm}:${ss}.000${tz}`;
}

function parseLocalDate(input) {
  if (input instanceof Date) {
    // normaliza para meia-noite local
    return new Date(input.getFullYear(), input.getMonth(), input.getDate());
  }
  if (typeof input !== "string") return new Date(NaN);

  const base = input.split("T")[0].trim(); // ignora parte horária se existir

  if (base.includes("-")) {
    const parts = base.split("-").map(Number);
    if (parts.length !== 3) return new Date(NaN);
    // se primeira parte > 31 assumimos YYYY-MM-DD, senão assumimos DD-MM-YYYY
    if (parts[0] > 31) {
      // YYYY - MM - DD
      return new Date(parts[0], parts[1] - 1, parts[2]);
    } else {
      // DD - MM - YYYY (caso raro)
      return new Date(parts[2], parts[1] - 1, parts[0]);
    }
  }

  if (base.includes("/")) {
    const parts = base.split("/").map(Number);
    if (parts.length !== 3) return new Date(NaN);
    // formato esperado: DD/MM/YYYY
    return new Date(parts[2], parts[1] - 1, parts[0]);
  }

  return new Date(NaN);
}
  // Expande o range (inclusive). Se todayOnly=true, ignora range.
async function expandDates({ startDate, endDate, todayOnly }) {
  const out = [];
  const now = new Date();
  let feriados = [...new Set(await GetFeriados(now))]; // GetFeriados aceita Date

  if (todayOnly) {
    const today = formatDateLocal(now);
    if (!feriados.includes(today) && !isWeekend(today)) {
      out.push(today);
    }
    return out;
  }

  if (!startDate || !endDate) return out;

  const start = parseLocalDate(startDate);
  const end = parseLocalDate(endDate);
  if (isNaN(start) || isNaN(end) || start > end) return out;

  // se atravessa anos, traga também os feriados do ano final
  if (start.getFullYear() !== end.getFullYear()) {
    feriados = [...new Set([...feriados, ...(await GetFeriados(end))])];
  }

  for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
    const dia = formatDateLocal(d);
    if (!isWeekend(dia) && !feriados.includes(dia)) {
      out.push(dia);
    }
  }

  return out;
}

  // Tenta via REST API (rodando no mesmo domínio logado)
  async function addWorklogAPI(issueKey, dateOnly, hours, commentText) {
    const timeSpentSeconds = Math.round(parseFloat(hours) * 3600);
    const started = toJiraStarted(dateOnly, 9, 0);

    const body = {
      started,
      timeSpentSeconds,
      comment: {
        type: "doc",
        version: 1,
        content: [
          { type: "paragraph", content: [{ type: "text", text: commentText }] }
        ]
      }
    };

    const res = await fetch(`/rest/api/3/issue/${encodeURIComponent(issueKey)}/worklog`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Accept": "application/json"
      },
      credentials: "include",
      body: JSON.stringify(body)
    });

    if (!res.ok) {
      const txt = await res.text().catch(() => "");
      throw new Error(`API ${res.status}: ${txt.slice(0, 300)}`);
    }
    return res.json();
  }

    // Obtem os dias de feriados
async function GetFeriados(dateOnly) {
    const v_data = parseLocalDate(dateOnly).getFullYear();

    const res = await fetch(
    `https://brasilapi.com.br/api/feriados/v1/${v_data}`
  );

  if (!res.ok) {
    const txt = await res.text().catch(() => "");
    throw new Error(`API Feriado ${res.status}: ${txt.slice(0, 300)}`);
  }

  const data = await res.json();
  return data.map(value => value.date); // lista de feriados
}

function formatDateLocal(dateInput) {
  const d = parseLocalDate(dateInput);
  if (isNaN(d)) return "";
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${dd}`;
}

function isWeekend(dateInput) {
  const d = parseLocalDate(dateInput);
  if (isNaN(d)) return false;
  const day = d.getDay(); // 0 = domingo, 6 = sábado (local)
  return day === 0 || day === 6;
}

  // Fallback via UI (melhor esforço; seletores variam entre tenants/temas)
  async function addWorklogUI(issueKey, dateOnly, hours, commentText) {
    // Se não estamos na página da issue, tentamos navegar
    const onIssuePage = /\/browse\/[^/]+$/.test(location.pathname);
    if (!onIssuePage) {
      history.pushState({}, "", `/browse/${encodeURIComponent(issueKey)}`);
      // aguarda a página "trocar"
      await new Promise(r => setTimeout(r, 1200));
    }

    // tenta abrir modal "Log time"
    let openBtn =
      Array.from(document.querySelectorAll('button, a'))
        .find(el => /log (time|work)/i.test(el.textContent.trim()))
      || document.querySelector('[data-testid*="log-work"]');

    if (!openBtn) {
      // às vezes fica no menu "More" (•••)
      const more = Array.from(document.querySelectorAll('button, [role="button"]'))
        .find(el => /more/i.test(el.getAttribute("aria-label") || "") || el.textContent.trim() === "More");
      if (more) {
        more.click();
        await new Promise(r => setTimeout(r, 400));
        openBtn = Array.from(document.querySelectorAll('button, a'))
          .find(el => /log (time|work)/i.test(el.textContent.trim()));
      }
    }

    if (!openBtn) throw new Error("Não encontrei o botão 'Log time' na UI.");
    openBtn.click();
    await new Promise(r => setTimeout(r, 600));

    // preenche "Time spent" (aceita "2h" ou "120m")
    const timeInputs = Array.from(document.querySelectorAll('input, textarea'))
      .filter(el => /time spent|tempo gasto|time/i.test(el.getAttribute("aria-label") || el.placeholder || ""));
    const timeEl = timeInputs[0] || document.querySelector('[name="timeSpent"]');
    if (!timeEl) throw new Error("Campo de tempo não encontrado.");
    timeEl.focus();
    timeEl.value = "";
    timeEl.dispatchEvent(new Event("input", { bubbles: true }));
    timeEl.value = `${hours}h`;
    timeEl.dispatchEvent(new Event("input", { bubbles: true }));

    // preenche data/hora (se houver)
    const startedInputs = Array.from(document.querySelectorAll('input'))
      .filter(el => /date|started|data|início/i.test(el.getAttribute("name") || el.getAttribute("aria-label") || ""));
    if (startedInputs[0]) {
      const startedVal = toJiraStarted(dateOnly, 9, 0).replace("T", " ").slice(0, 16); // “yyyy-MM-dd HH:mm”
      try {
        startedInputs[0].focus();
        startedInputs[0].value = startedVal;
        startedInputs[0].dispatchEvent(new Event("input", { bubbles: true }));
      } catch {}
    }

    // comentário (se existir)
    const commentEl = Array.from(document.querySelectorAll('textarea'))
      .find(el => /comment|comentário/i.test(el.getAttribute("aria-label") || ""));
    if (commentEl) {
      commentEl.focus();
      commentEl.value = commentText;
      commentEl.dispatchEvent(new Event("input", { bubbles: true }));
    }

    // salvar
    const saveBtn =
      Array.from(document.querySelectorAll('button'))
        .find(el => /save|salvar|add|adicionar/i.test(el.textContent.trim()))
      || document.querySelector('[data-testid*="save"]');

    if (!saveBtn) throw new Error("Botão de salvar não encontrado.");
    saveBtn.click();
    await new Promise(r => setTimeout(r, 900));
  }

  async function logWorkBulk({ issue, hours, startDate, endDate, todayOnly }) {
    if (!issue || !hours) throw new Error("Preencha 'Tarefa' e 'Horas'.");

    const dates = await expandDates({ startDate, endDate, todayOnly });
    if (!dates.length) throw new Error("Sem datas válidas para registrar.");

    const results = [];
    for (const dateOnly of dates) {
      const commentText = `Registro automatizado via extensão • ${issue} • ${dateOnly}`;
      try {
        await addWorklogAPI(issue, dateOnly, hours, commentText);
        results.push({ dateOnly, ok: true, via: "API" });
      } catch (apiErr) {
        console.warn("Falha API, tentando UI:", apiErr?.message);
        try {
          await addWorklogUI(issue, dateOnly, hours, commentText);
          results.push({ dateOnly, ok: true, via: "UI" });
        } catch (uiErr) {
          results.push({ dateOnly, ok: false, via: "none", err: uiErr?.message || String(uiErr) });
        }
      }
    }

    const okCount = results.filter(r => r.ok).length;
    if (okCount === dates.length) {
      toast(`✅ Lançado com sucesso: ${okCount}/${dates.length} dia(s).`, "success");
    } else if (okCount > 0) {
      const fails = results.filter(r => !r.ok).map(r => `${r.dateOnly}: ${r.err}`).join(" | ");
      toast(`⚠️ Parcial: ${okCount}/${dates.length}. Falhas: ${fails}`, "error");
    } else {
      const fails = results.map(r => `${r.dateOnly}: ${r.err}`).join(" | ");
      toast(`❌ Falhou: ${fails}`, "error");
    }

    return results;
  }

  // Listener do popup
  chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
    if (msg?.type === "LOG_WORK_BULK") {
      logWorkBulk(msg.payload)
        .then(result => sendResponse({ ok: true, result }))
        .catch(err => sendResponse({ ok: false, error: err?.message || String(err) }));
      return true; // resposta assíncrona
    }
  });
})();
