/* ═══════════════════════════════════════════════════════
   PCP SIMULADOR — SHARED UTILITIES
   Projeto PIVIC Nº 391/2025 — UFU/FAGEN
═══════════════════════════════════════════════════════ */

// Usa o mesmo host que serviu a página — funciona em localhost, na rede
// local (IP do moderador) e em produção (Render/Railway/etc.), sem editar nada
const API = `${window.location.origin}/api`;

/* ── Formatadores ── */
const fmt  = n => (n ?? 0).toLocaleString('pt-BR');
const fmtR = n => 'R$\u00a0' + (n ?? 0).toLocaleString('pt-BR');
const fmtP = n => (n ?? 0).toFixed(1) + '%';

/* ── Alertas ── */
function showAlert(id, msg, tipo = 'err') {
  const el = document.getElementById(id);
  if (!el) return;
  el.className = `alert alert-${tipo === 'err' ? 'err' : tipo === 'ok' ? 'ok' : tipo === 'warn' ? 'warn' : 'info'} show`;
  el.textContent = msg;
  if (tipo !== 'err') setTimeout(() => el.classList.remove('show'), 5000);
}
function hideAlert(id) {
  const el = document.getElementById(id);
  if (el) el.classList.remove('show');
}

/* ── Spinner ── */
function spin(id, on) {
  const el = document.getElementById(id);
  if (el) el.style.display = on ? 'inline-block' : 'none';
}

/* ── Tabs genéricas ── */
function initTabs(containerSelector) {
  document.querySelectorAll(containerSelector + ' .tab').forEach(tab => {
    tab.addEventListener('click', () => {
      const target = tab.dataset.tab;
      const parent = tab.closest(containerSelector);
      parent.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
      parent.querySelectorAll('.tab-pane').forEach(p => p.classList.remove('active'));
      tab.classList.add('active');
      const pane = parent.querySelector(`#${target}`);
      if (pane) pane.classList.add('active');
    });
  });
}

/* ── Chart.js tema escuro ── */
function chartDefaults() {
  return {
    responsive: true,
    maintainAspectRatio: true,
    plugins: {
      legend: { labels: { color: '#7a8fa8', font: { family: 'DM Sans', size: 12 } } },
      tooltip: {
        backgroundColor: '#161d26', borderColor: '#2e3d50', borderWidth: 1,
        titleColor: '#e2eaf4', bodyColor: '#7a8fa8',
        callbacks: { label: ctx => ' ' + fmt(ctx.raw) }
      }
    },
    scales: {
      x: { ticks: { color: '#7a8fa8', font: { size: 11 } }, grid: { color: '#1d2733' } },
      y: { ticks: { color: '#7a8fa8', font: { size: 11 }, callback: v => fmt(v) }, grid: { color: '#1d2733' } }
    }
  };
}

/* ── Status da sessão ── */
async function fetchStatus() {
  const r = await fetch(`${API}/status`);
  return r.json();
}

/* ── Carregar lista de equipes em um <select> ── */
async function populateEquipeSelect(selectId) {
  const r     = await fetch(`${API}/equipes`);
  const nomes = await r.json();
  const el    = document.getElementById(selectId);
  if (!el) return;
  el.innerHTML = '<option value="">— Selecione —</option>' +
    nomes.map(n => `<option value="${n}">${n}</option>`).join('');
}
