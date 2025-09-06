const $ = (s) => document.querySelector(s);
// const themeToggle = document.getElementById("themeToggle");

(async function init() {
  // restaurar últimos valores
  const { lastIssue, lastHours, lastStart, lastEnd, lastToday } =
    await chrome.storage.sync.get(["lastIssue", "lastHours", "lastStart", "lastEnd", "lastToday"]);

  if (lastIssue) $("#issue").value = lastIssue;
  if (lastHours) $("#hours").value = lastHours;
  if (lastStart) $("#startDate").value = lastStart;
  if (lastEnd) $("#endDate").value = lastEnd;
  $("#todayOnly").checked = !!lastToday;

  // dica dinâmica
  const hint = document.createElement("div");
  hint.className = "hint";
  hint.id = "hint";
  document.body.appendChild(hint);
  updateHint();

  $("#todayOnly").addEventListener("change", updateHint);
  $("#startDate").addEventListener("input", updateHint);
  $("#endDate").addEventListener("input", updateHint);
})();

// chrome.storage.sync.get("theme", ({ theme }) => {
//   if (theme === "light") {
//     document.documentElement.classList.add("light"); // aplica no <html>
//     themeToggle.checked = true;
//   } else {
//     document.documentElement.classList.remove("light");
//     themeToggle.checked = false;
//   }
// });

// // Listener para alternar tema
// themeToggle.addEventListener("change", async () => {
//   if (themeToggle.checked) {
//     document.documentElement.classList.add("light"); // aplica no <html>
//     await chrome.storage.sync.set({ theme: "light" });
//   } else {
//     document.documentElement.classList.remove("light");
//     await chrome.storage.sync.set({ theme: "dark" });
//   }
// });


function updateHint() {
  const todayOnly = $("#todayOnly").checked;
  const start = $("#startDate").value;
  const end = $("#endDate").value;
  const el = $("#hint");
  // habilita/desabilita campos de data
  $("#startDate").disabled = todayOnly;
  $("#endDate").disabled = todayOnly;
  if (todayOnly) {
    el.textContent = "Será registrado apenas a data de hoje.";
  } else if (start && end) {
    el.textContent = `Será registrado de ${start} até ${end}.`;
  } else {
    el.textContent = "Defina um intervalo de datas ou use 'apenas hoje'.";
  }
}

document.getElementById("registerBtn").addEventListener("click", async () => {
  const payload = {
    issue: $("#issue").value.trim(),
    hours: $("#hours").value.trim(),
    startDate: $("#startDate").value,
    endDate: $("#endDate").value,
    todayOnly: $("#todayOnly").checked
  };

  // salvar últimos valores
  await chrome.storage.sync.set({
    lastIssue: payload.issue,
    lastHours: payload.hours,
    lastStart: payload.startDate,
    lastEnd: payload.endDate,
    lastToday: payload.todayOnly
  });

  // mandar para a aba ativa (Jira)
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab?.id) return setStatus("Não achei a aba ativa.");

  try {
    const resp = await chrome.tabs.sendMessage(tab.id, { type: "LOG_WORK_BULK", payload });
    if (!resp?.ok) {
      setStatus("Erro: " + (resp?.error || "desconhecido"));
    } else {
      const total = (resp.result || []).length;
      const okCount = (resp.result || []).filter(r => r.ok).length;
      setStatus(`Concluído: ${okCount}/${total} dia(s).`);
    }
  } catch (e) {
    setStatus("Falha ao comunicar com a página. Ela é do Jira?");
  }
});

function setStatus(txt) {
  let el = document.querySelector(".status");
  if (!el) {
    el = document.createElement("div");
    el.className = "status";
    document.body.appendChild(el);
  }
  el.textContent = txt;
}
