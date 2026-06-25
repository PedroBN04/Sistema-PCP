/* ═══════════════════════════════════════════════════════
   PCP SIMULADOR — MODERADOR.JS
   Projeto PIVIC Nº 391/2025 — UFU/FAGEN
═══════════════════════════════════════════════════════ */

let chartProgresso = null;
let chartDemPreview = null;
let chartEquipeDemanda = null;
let chartRanking = null;

const DEM_DEFAULTS = {
  uniforme:    { dmin: 38000, dmax: 41500, rmin: 30000, rmax: 50000, dif_min: 2000,  dif_max: 5000  },
  tendencia:   { dmin: 35000, dmax: 45000, rmin: 30000, rmax: 50000, dif_min: 5000,  dif_max: 15000 },
  ciclicidade: { dmin: 37000, dmax: 44000, rmin: 30000, rmax: 50000, dif_min: 5000,  dif_max: 10000 },
  tend_ciclic: { dmin: 32500, dmax: 47500, rmin: 30000, rmax: 50000, dif_min: 10000, dif_max: 18000 }
};

const DEM_DESC = {
  uniforme:    'Valores oscilam em torno da média entre mínimo e máximo, sem tendência clara. Ideal para uma introdução ao jogo.',
  tendencia:   'O histórico começa abaixo do mínimo e cresce progressivamente. A demanda futura sobe de mínimo até máximo ao longo das 8 rodadas.',
  ciclicidade: 'Segue um padrão cíclico (sobe–desce–sobe). O histórico e a demanda futura alternam entre os quatro quartis do intervalo.',
  tend_ciclic: 'Combina a tendência crescente com o padrão cíclico. Use a opção "Ênfase" para ajustar o peso de cada componente.'
};

// ── NAVEGAÇÃO ──────────────────────────────────────────
document.querySelectorAll('.nav-item[data-page]').forEach(btn => {
  btn.addEventListener('click', () => navegarPara(btn.dataset.page));
});

function navegarPara(page) {
  document.querySelectorAll('.nav-item[data-page]').forEach(b => b.classList.remove('active'));
  document.querySelector(`.nav-item[data-page="${page}"]`)?.classList.add('active');
  document.querySelectorAll('.page-content').forEach(p => p.style.display = 'none');
  document.getElementById(`page-${page}`).style.display = 'block';
  if (page === 'visao-geral')  carregarVisaoGeral();
  if (page === 'demanda')      carregarConfigDemanda();
  if (page === 'parametros')   carregarParametros();   
  if (page === 'empresa')      carregarEmpresa();
  if (page === 'sessao')       carregarSessao();
  if (page === 'equipes')      carregarEquipes();
  if (page === 'ranking')      carregarRanking();
}


// ── LOGIN ─────────────────────────────────────────────
async function doLogin() {
  const senha = document.getElementById('login-senha').value;
  spin('login-spin', true);
  try {
    const r = await fetch(`${API}/moderador/login`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ senha })
    });
    if (!r.ok) { showAlert('login-err', 'Senha incorreta'); return; }
    document.getElementById('login-gate-wrap').style.display = 'none';
    document.getElementById('mod-panel').style.display = 'block';
    navegarPara('visao-geral');
    atualizarTopbar();
  } finally { spin('login-spin', false); }
}
document.getElementById('login-senha')?.addEventListener('keydown', e => {
  if (e.key === 'Enter') doLogin();
});

// ── TOPBAR / SIDEBAR ──────────────────────────────────
async function atualizarTopbar() {
  try {
    const st = await fetchStatus();
    const rodTxt = st.sessao_aberta
      ? `Rodada ${st.rodada_atual}/${st.total_rodadas} · ${st.num_equipes} equipes`
      : 'Sessão fechada';
    document.getElementById('topbar-status').textContent = rodTxt;
    document.getElementById('topbar-status').className =
      'topbar-pill ' + (st.sessao_aberta ? 'open' : 'closed');

    const dot  = document.querySelector('#sidebar-status .status-dot');
    const txt  = document.getElementById('sidebar-status-text');
    if (st.rodada_atual === 0) {
      dot.className = 'status-dot amber';
      txt.textContent = 'Aguardando início';
    } else if (st.rodada_atual <= st.total_rodadas) {
      dot.className = 'status-dot green';
      txt.textContent = `Rodada ${st.rodada_atual} de ${st.total_rodadas}`;
    } else {
      dot.className = 'status-dot red';
      txt.textContent = 'Jogo encerrado';
    }
  } catch {}
}

// ── VISÃO GERAL ───────────────────────────────────────
async function carregarVisaoGeral() {
  const [st, cfg] = await Promise.all([fetchStatus(), fetch(`${API}/moderador/config`).then(r => r.json())]);

  document.getElementById('vg-stats').innerHTML = `
    <div class="stat blue"><div class="val">${st.rodada_atual}/${st.total_rodadas}</div><div class="lbl">Rodada Atual</div></div>
    <div class="stat ${st.sessao_aberta ? 'green' : 'red'}">
      <div class="val">${st.sessao_aberta ? 'Aberta' : 'Fechada'}</div><div class="lbl">Sessão</div>
    </div>
    <div class="stat purple"><div class="val">${st.num_equipes}</div><div class="lbl">Equipes</div></div>
    <div class="stat amber"><div class="val">${st.tipo_demanda}</div><div class="lbl">Perfil Demanda</div></div>`;

  const tipoLabel = { uniforme: 'Uniforme', tendencia: 'Tendência', ciclicidade: 'Ciclicidade', tend_ciclic: 'Tend. + Ciclic.' };
  document.getElementById('vg-config-resumo').innerHTML = [
    ['Empresa',  cfg.empresa?.nome || '—'],
    ['Produto',  cfg.empresa?.produto || '—'],
    ['Perfil',   tipoLabel[cfg.tipo_demanda] || '—'],
    ['Modo',     cfg.modo_demanda === 'automatico' ? 'Automático' : 'Manual'],
    ['Cap. Regular', fmt(cfg.empresa?.cap_regular) + ' un./rod.'],
    ['Estoque Inicial', fmt(cfg.empresa?.estoque_inicial) + ' un.'],
  ].map(([k, v]) => `
    <div style="display:flex;justify-content:space-between;padding:7px 0;border-bottom:1px solid var(--border);font-size:13px">
      <span style="color:var(--text2)">${k}</span>
      <span style="font-weight:600">${v}</span>
    </div>`).join('');

  // gráfico progresso
  const r = await fetch(`${API}/equipes`);
  const nomes = await r.json();
  const dados = await Promise.all(nomes.map(async n => {
    const eq = await fetch(`${API}/equipe/${n}`).then(r => r.json());
    return { equipe: n, rodadas: Object.keys(eq.rodadas).length };
  }));
  if (chartProgresso) chartProgresso.destroy();
  if (dados.length) {
    const ctx = document.getElementById('chart-progresso').getContext('2d');
    chartProgresso = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: dados.map(d => d.equipe),
        datasets: [{ label: 'Rodadas concluídas', data: dados.map(d => d.rodadas),
          backgroundColor: 'rgba(59,127,245,.6)', borderColor: '#3b7ff5', borderRadius: 6, borderWidth: 1 }]
      },
      options: { ...chartDefaults(), scales: { ...chartDefaults().scales, y: { ...chartDefaults().scales.y, max: 8 } } }
    });
  }
  atualizarTopbar();
}

// ── DEMANDA ───────────────────────────────────────────
async function carregarConfigDemanda() {
  const cfg = await fetch(`${API}/moderador/config`).then(r => r.json());
  document.getElementById('dem-modo').value  = cfg.modo_demanda || 'automatico';
  document.getElementById('dem-tipo').value  = cfg.tipo_demanda || 'uniforme';
  document.getElementById('dem-enfase').value = cfg.enfase_tend_ciclic || 'equilibrio';
  if (cfg.params?.[cfg.tipo_demanda]) {
    document.getElementById('dem-min').value = cfg.params[cfg.tipo_demanda].min || '';
    document.getElementById('dem-max').value = cfg.params[cfg.tipo_demanda].max || '';
  }
  toggleDemModo(); onDemTipoChange();
}

function toggleDemModo() {
  const auto = document.getElementById('dem-modo').value === 'automatico';
  document.getElementById('dem-auto').style.display   = auto ? 'block' : 'none';
  document.getElementById('dem-manual').style.display = auto ? 'none' : 'block';
  if (!auto) buildManualInputs();
}

function buildManualInputs() {
  const c = document.getElementById('dem-manual-grid');
  if (c.children.length) return;
  c.innerHTML = Array.from({ length: 16 }, (_, i) => `
    <div>
      <label style="font-size:11px">${i < 8 ? `H${i+1}` : `F${i-7}`}</label>
      <input type="number" class="manual-val" value="0" placeholder="0"/>
    </div>`).join('');
}

function onDemTipoChange() {
  const tipo = document.getElementById('dem-tipo').value;
  const p    = DEM_DEFAULTS[tipo];
  document.getElementById('dem-dmin-hint').textContent = `(padrão: ${fmt(p.dmin)})`;
  document.getElementById('dem-dmax-hint').textContent = `(padrão: ${fmt(p.dmax)})`;
  document.getElementById('dem-rest-min').textContent  = `Mín ≥ ${fmt(p.rmin)} · Diferença ≥ ${fmt(p.dif_min)}`;
  document.getElementById('dem-rest-max').textContent  = `Máx ≤ ${fmt(p.rmax)} · Diferença ≤ ${fmt(p.dif_max)}`;
  document.getElementById('dem-enfase-wrap').style.display = tipo === 'tend_ciclic' ? 'block' : 'none';

  // atualizar descrição
  const d = document.getElementById('dem-descricao');
  if (d) {
    const labels = { uniforme:'Uniforme', tendencia:'Tendência', ciclicidade:'Ciclicidade', tend_ciclic:'Tend.+Ciclic.' };
    d.innerHTML = `<span class="badge badge-blue" style="margin-bottom:12px;display:inline-block">${labels[tipo]}</span><br>${DEM_DESC[tipo]}
      <hr class="divider"/>
      <p class="text-xs text-muted" style="line-height:1.8">
        <strong>Mín padrão:</strong> ${fmt(p.dmin)} &nbsp;|&nbsp; <strong>Máx padrão:</strong> ${fmt(p.dmax)}<br>
        <strong>Restrição Mín:</strong> ≥ ${fmt(p.rmin)} &nbsp;|&nbsp; <strong>Restrição Máx:</strong> ≤ ${fmt(p.rmax)}<br>
        <strong>Diferença:</strong> entre ${fmt(p.dif_min)} e ${fmt(p.dif_max)}
      </p>`;
  }
}

function validarDemParams() {
  const tipo = document.getElementById('dem-tipo').value;
  const minV = document.getElementById('dem-min').value;
  const maxV = document.getElementById('dem-max').value;
  if (!minV && !maxV) return { ok: true, params: { ...DEM_DEFAULTS[tipo] } };
  const p  = DEM_DEFAULTS[tipo];
  const mn = parseInt(minV); const mx = parseInt(maxV);
  if (mn < p.rmin)          return { ok: false, msg: `Mínimo deve ser ≥ ${fmt(p.rmin)}` };
  if (mx > p.rmax)          return { ok: false, msg: `Máximo deve ser ≤ ${fmt(p.rmax)}` };
  const dif = mx - mn;
  if (dif < p.dif_min)      return { ok: false, msg: `Diferença deve ser ≥ ${fmt(p.dif_min)}` };
  if (dif > p.dif_max)      return { ok: false, msg: `Diferença deve ser ≤ ${fmt(p.dif_max)}` };
  return { ok: true, params: { min: mn, max: mx } };
}

async function previewDemanda() {
  const tipo   = document.getElementById('dem-tipo').value;
  const enfase = document.getElementById('dem-enfase').value;
  const v      = validarDemParams();
  if (!v.ok) { showAlert('dem-err', v.msg); return; }
  hideAlert('dem-err');
  const r = await fetch(`${API}/moderador/preview_demanda`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ tipo, params: v.params, enfase })
  });
  const d = await r.json();
  if (chartDemPreview) chartDemPreview.destroy();
  const ctx = document.getElementById('chart-dem-preview').getContext('2d');
  const labels = [...d.historico.map((_, i) => `H${i+1}`), ...d.futura.map((_, i) => `F${i+1}`)];
  chartDemPreview = new Chart(ctx, {
    type: 'line',
    data: { labels, datasets: [
      { label: 'Histórico', data: [...d.historico, ...Array(8).fill(null)],
        borderColor: '#a78bfa', backgroundColor: 'rgba(167,139,250,.12)', tension: .4, fill: true, pointRadius: 4 },
      { label: 'Futura',    data: [...Array(8).fill(null), ...d.futura],
        borderColor: '#34d399', backgroundColor: 'rgba(52,211,153,.1)', tension: .4, fill: true, pointRadius: 4, borderDash: [6, 3] }
    ]},
    options: chartDefaults()
  });
}

async function salvarDemanda() {
  const modo = document.getElementById('dem-modo').value;
  const tipo = document.getElementById('dem-tipo').value;
  //const v    = validarDemParams();
  //if (!v.ok) { showAlert('dem-err', v.msg); return; }
  //hideAlert('dem-err');
  //const body = { tipo_demanda: tipo, modo_demanda: modo,
  //               enfase_tend_ciclic: document.getElementById('dem-enfase').value };
  //if (modo === 'automatico') body.params = { [tipo]: v.params };
  //else {
  //  const vals = [...document.querySelectorAll('.manual-val')].map(el => parseInt(el.value) || 0);
  //  body.demanda_manual = vals;
  //}
  //await fetch(`${API}/moderador/config`, {
  //  method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body)
  //});
 alert(`✅ Configuração de demanda salva!\n\nModo : ${modo}\nTipo : ${tipo}`);
 atualizarTopbar();
 navegarPara('parametros');
 document.getElementById('info-demanda-salva').innerHTML = `(Modo: ${modo} | Tipo: ${tipo})`;
}

// ── EMPRESA ───────────────────────────────────────────
async function carregarEmpresa() {
  const cfg = await fetch(`${API}/moderador/config`).then(r => r.json());
  const e   = cfg.empresa || {};
  const fields = {
    'emp-nome': e.nome, 'emp-produto': e.produto,
    'emp-cap-reg': e.cap_regular, 'emp-cap-he': e.cap_hora_extra, 'emp-cap-sub': e.cap_subcontratacao,
    'emp-c-reg': e.custo_regular, 'emp-c-he': e.custo_hora_extra, 'emp-c-sub': e.custo_subcontratacao,
    'emp-c-est': e.custo_estoque, 'emp-c-falta': e.custo_falta,
    'emp-est-ini': e.estoque_inicial
  };
  Object.entries(fields).forEach(([id, val]) => {
    const el = document.getElementById(id);
    if (el && val !== undefined) el.value = val;
  });
}

async function salvarEmpresa() {
  const empresa = {
    nome: document.getElementById('emp-nome').value,
    produto: document.getElementById('emp-produto').value,
    cap_regular:        +document.getElementById('emp-cap-reg').value,
    cap_hora_extra:     +document.getElementById('emp-cap-he').value,
    cap_subcontratacao: +document.getElementById('emp-cap-sub').value,
    custo_regular:      +document.getElementById('emp-c-reg').value,
    custo_hora_extra:   +document.getElementById('emp-c-he').value,
    custo_subcontratacao:+document.getElementById('emp-c-sub').value,
    custo_estoque:      +document.getElementById('emp-c-est').value,
    custo_falta:        +document.getElementById('emp-c-falta').value,
    estoque_inicial:    +document.getElementById('emp-est-ini').value,
  };
  await fetch(`${API}/moderador/config`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ empresa })
  });
  showAlert('emp-ok', '✅ Dados da empresa salvos com sucesso!', 'ok');
}

// ── SESSÃO ────────────────────────────────────────────
async function carregarSessao() {
  const st = await fetchStatus();
  document.getElementById('sess-stats').innerHTML = `
    <div class="stat blue"><div class="val">${st.rodada_atual}/${st.total_rodadas}</div><div class="lbl">Rodada Atual</div></div>
    <div class="stat ${st.sessao_aberta ? 'green' : 'red'}">
      <div class="val">${st.sessao_aberta ? '🟢 Aberta' : '🔴 Fechada'}</div><div class="lbl">Sessão</div>
    </div>
    <div class="stat purple"><div class="val">${st.num_equipes}</div><div class="lbl">Equipes</div></div>`;

  const chips = document.getElementById('sess-rodadas');
  chips.innerHTML = Array.from({ length: st.total_rodadas }, (_, i) => {
    const n = i + 1;
    const cls = n < st.rodada_atual ? 'round-chip done' : n === st.rodada_atual ? 'round-chip current' : 'round-chip';
    return `<span class="${cls}">${n}</span>`;
  }).join('');

  // tabela progresso
  const nomes = await fetch(`${API}/equipes`).then(r => r.json());
  const rows = await Promise.all(nomes.map(async n => {
    const eq = await fetch(`${API}/equipe/${n}`).then(r => r.json());
    const rodKey = String(st.rodada_atual);
    const submetido = !!eq.rodadas[rodKey]?.plano;
    const custo = eq.rodadas[rodKey]?.resultado?.custo_total ?? null;
    return `<tr>
      <td><strong>${n}</strong></td>
      <td class="text-muted text-sm">${eq.membros.join(', ')}</td>
      <td>${submetido ? '<span class="badge badge-green">✓ Submetido</span>' : '<span class="badge badge-gray">Pendente</span>'}</td>
      <td>${custo !== null ? fmtR(custo) : '—'}</td>
    </tr>`;
  }));
  document.getElementById('sess-progresso-body').innerHTML = rows.join('');
}

async function abrirSessao() {
  await fetch(`${API}/moderador/abrir_sessao`, { method: 'POST' });
  alert('✅ Sessão aberta! Os alunos já podem se cadastrar.');
  atualizarTopbar();
  carregarSessao();
}

async function fecharSessao() {
  if (!confirm('Fechar sessão? Novos cadastros serão bloqueados.')) return;
  await fetch(`${API}/moderador/fechar_sessao`, { method: 'POST' });
  atualizarTopbar(); carregarSessao();
}

async function avancarRodada() {
  if (!confirm('Avançar para a próxima rodada? Certifique-se de que todas as equipes submeteram o plano.')) return;
  const r = await fetch(`${API}/moderador/avancar_rodada`, { method: 'POST' });
  const d = await r.json();
  alert(`✅ Avançado para a Rodada ${d.rodada}!`);
  atualizarTopbar(); carregarSessao(); carregarVisaoGeral();
}

async function resetarJogo() {
  if (!confirm('⚠️ ATENÇÃO: Isso apagará TODOS os dados permanentemente. Confirma?')) return;
  await fetch(`${API}/moderador/resetar`, { method: 'POST' });
  alert('Jogo resetado. Recarregando…');
  location.reload();
}

// ── EQUIPES ───────────────────────────────────────────
let chartEquipe = null;
async function carregarEquipes() {
  const nomes = await fetch(`${API}/equipes`).then(r => r.json());
  const rows = await Promise.all(nomes.map(async n => {
    const eq = await fetch(`${API}/equipe/${n}`).then(r => r.json());
    const custo = Object.values(eq.rodadas).reduce((a, r) => a + (r.resultado?.custo_total || 0), 0);
    return { nome: n, eq, custo };
  }));
  document.getElementById('equipes-body').innerHTML = rows.map(({ nome, eq, custo }) => `
    <tr>
      <td><strong>${nome}</strong></td>
      <td class="text-sm text-muted">${eq.membros.join(', ')}</td>
      <td><span class="badge badge-purple">Auto</span></td>
      <td>${Object.keys(eq.rodadas).length}/8</td>
      <td>${fmtR(custo)}</td>
      <td><button class="btn btn-ghost btn-sm" onclick="detalharEquipe('${nome}')">Ver demanda</button></td>
    </tr>`).join('');
  document.getElementById('equipe-detalhe').style.display = 'none';
}

async function detalharEquipe(nome) {
  const eq  = await fetch(`${API}/equipe/${nome}`).then(r => r.json());
  const box = document.getElementById('equipe-detalhe');
  box.style.display = 'block';
  document.getElementById('equipe-detalhe-titulo').textContent = `Demanda — ${nome}`;
  const labels = [
    ...eq.demanda_historico.map((_, i) => `H${i+1}`),
    ...eq.demanda_futura.map((_, i) => `F${i+1}`)
  ];
  if (chartEquipe) chartEquipe.destroy();
  chartEquipe = new Chart(
    document.getElementById('chart-equipe-demanda').getContext('2d'),
    { type: 'line', data: { labels, datasets: [
      { label: 'Histórico', data: [...eq.demanda_historico, ...Array(8).fill(null)],
        borderColor: '#a78bfa', tension: .4, fill: false, pointRadius: 4 },
      { label: 'Futura', data: [...Array(8).fill(null), ...eq.demanda_futura],
        borderColor: '#34d399', tension: .4, fill: false, pointRadius: 4, borderDash: [5, 4] }
    ]}, options: chartDefaults() }
  );
  box.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

// ── RANKING ───────────────────────────────────────────
async function carregarRanking() {
  const lista = await fetch(`${API}/resultados_geral`).then(r => r.json());
  if (chartRanking) chartRanking.destroy();
  if (lista.length) {
    chartRanking = new Chart(
      document.getElementById('chart-ranking').getContext('2d'),
      { type: 'bar', data: {
        labels: lista.map(e => e.equipe),
        datasets: [{ label: 'Custo acumulado', data: lista.map(e => e.custo_acumulado),
          backgroundColor: lista.map((_, i) => i === 0 ? 'rgba(52,211,153,.7)' : 'rgba(59,127,245,.5)'),
          borderRadius: 6, borderWidth: 0 }]
      }, options: chartDefaults() }
    );
  }
  document.getElementById('ranking-body').innerHTML = lista.map((e, i) => {
    const medal = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `#${i+1}`;
    const media = e.rodadas_feitas ? fmtR(Math.round(e.custo_acumulado / e.rodadas_feitas)) : '—';
    return `<tr>
      <td><strong>${medal}</strong></td>
      <td><strong>${e.equipe}</strong></td>
      <td class="text-sm text-muted">${e.membros.join(', ')}</td>
      <td>${e.rodadas_feitas}/8</td>
      <td>${fmtR(e.custo_acumulado)}</td>
      <td class="text-muted">${media}</td>
    </tr>`;
  }).join('');
}

// ── CONFIGURAÇÕES ─────────────────────────────────────
async function alterarSenha() {
  const s = document.getElementById('nova-senha').value;
  if (!s) { alert('Informe a nova senha'); return; }
  await fetch(`${API}/moderador/config`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ senha_moderador: s })
  });
  showAlert('senha-ok', '✅ Senha alterada com sucesso!', 'ok');
  document.getElementById('nova-senha').value = '';
}

// ── PARÂMETROS DO MODELO ─────────────────────────────────────────

// Valores padrão — espelham a planilha do orientador 
const PARAM_DEFAULTS = {
  //Preço de venda do produto:
  preco_venda_prod_min: 50, preco_venda_prod_max: 300,
  //Estoque inicial:
  estoque_ini_min: 0, estoque_ini_max: 10000,
  //Custo de armazenagem (estoque):
  custo_armaz_min: 0, custo_armaz_max: 100,
  //Capacidade produtiva inicial (produção regular):
  capac_produ_min: 10000, capac_produ_max: 30000,
  //Produção regular - Custo fixo:
  produ_regul_custo_fixo_min: 100000, produ_regul_custo_fixo_max: 1000000,
  //Produção regular - Custo variável:
  produ_regul_custo_varia_min: 50, produ_regul_custo_varia_max: 200,
  //Produção em hora extra (Custo variável):
  produ_hora_extra_custo_varia_min: 50, produ_hora_extra_custo_varia_max: 280,
  //Nível máximo permitido de hora extra:
  hora_extra_max_min: 0, hora_extra_max_max: 25,
  //Perda de produtividade na produção em hora extra:
  perda_produ_hora_extra_min: 0, perda_produ_hora_extra_max: 20,
  //Produção em um turno extra Custo fixo:
  produ_turno_extra_custo_fixo_min: 100000, produ_turno_extra_custo_fixo_max: 800000,
  //Produção em um turno extra Custo variável:
  produ_turno_extra_custo_varia_min: 50, produ_turno_extra_custo_varia_max: 200,
  //Acréscimo de capacidade - 5.000 unidades:
  acres_capac_5_min: 100000, acres_capac_5_max: 300000,
  //Acréscimo de capacidade - 10.000 unidades:
  acres_capac_10_min: 150000, acres_capac_10_max: 500000,
  //Acréscimo de capacidade - 15.000 unidades:
  acres_capac_15_min: 250000, acres_capac_15_max: 250000,
  // Terceirização (Custo variável):
  terce_custo_varia_min: 50, terce_custo_varia_max: 200,
  //Limite máximo da produção em terceirização:
  limit_max_produ_terce_min: 10000, limit_max_produ_terce_max: 30000,
  //Capital disponível para acréscimo de capacidade:
  capit_dispo_acres_capac_min: 500000, capit_dispo_acres_capac_max: 1500000,
  //Taxa de rendimento do capital disponível:
  taxa_rendi_capit_dispo_min: 0, taxa_rendi_capit_dispo_max: 4,
  // Redução do custo variável devido ao aumento da capacidade produtiva:
  reduc_custo_varia_aumen_capac_produ_min: 0, reduc_custo_varia_aumen_capac_produ_max: 10,
  //Perda de clientes:
  perda_clien_min: 0, perda_clien_max: 100,
};

// IDs dos inputs — sufixo bate com o id no HTML (p-<chave>)
//const PARAM_IDS = Object.keys(PARAM_DEFAULTS);

// 1. Criamos a função que vai fazer essa atualização
function preencherValoresPadrao() {
  
  // Pegamos a lista de nomes igual fizemos antes
  const chaves = Object.keys(PARAM_DEFAULTS);

  // Fazemos um "loop" (forEach) para passar por cada nome da lista
  chaves.forEach(chave => {
    
    // O JavaScript procura no HTML um elemento que tenha o ID igual ao nome da chave
    const inputNoHtml = document.getElementById(chave);

    // Se ele achar esse input na tela...
    if (inputNoHtml) {
      // 1. Atualiza o placeholder (texto cinza de fundo)
      inputNoHtml.placeholder = PARAM_DEFAULTS[chave];
      
      // 2. BÔNUS: Como seu campo é "readonly", é ideal definir o 'value' também, 
      // para que o número seja o valor real do campo e não apenas um fundo invisível.
      inputNoHtml.value = PARAM_DEFAULTS[chave]; 
    }
    
  });
}

// 2. Executamos a função assim que a tela for carregada


async function carregarParametros() {
  //ocument.getElementById('info-demanda-salva').innerHTML = `(Modo: ${modo} | Tipo: ${tipo})`;
  // 2. Executamos a função assim que a tela for carregada
  preencherValoresPadrao();
  const cfg = await fetch(`${API}/moderador/config`).then(r => r.json());
  const p   = cfg.parametros_modelo || {};
  PARAM_IDS.forEach(k => {
    const el = document.getElementById(`p-${k.replace(/_/g, '-')}`);
    if (el) el.value = (p[k] !== undefined) ? p[k] : PARAM_DEFAULTS[k];
  });
}

function _coletarParametros() {
  const out = {};
  PARAM_IDS.forEach(k => {
    const el  = document.getElementById(`p-${k.replace(/_/g, '-')}`);
    if (!el) return;
    // campos reais (taxa e redcv) → parseFloat; demais → parseInt
    out[k] = (k.startsWith('taxa') || k.startsWith('redcv'))
      ? parseFloat(el.value)
      : parseInt(el.value);
  });
  return out;
}

function _validarParametros(p) {
  for (const grupo of [
    ['preco_min','preco_max'], ['est_ini_min','est_ini_max'],
    ['armazen_min','armazen_max'], ['cap_ini_min','cap_ini_max'],
    ['reg_cf_min','reg_cf_max'], ['reg_cv_min','reg_cv_max'],
    ['he_cv_min','he_cv_max'], ['he_max_min','he_max_max'],
    ['he_perda_min','he_perda_max'], ['te_cf_min','te_cf_max'],
    ['te_cv_min','te_cv_max'], ['acr5_min','acr5_max'],
    ['acr10_min','acr10_max'], ['acr15_min','acr15_max'],
    ['capital_min','capital_max'], ['taxa_min','taxa_max'],
    ['redcv_min','redcv_max'], ['terc_cv_min','terc_cv_max'],
    ['terc_lim_min','terc_lim_max'], ['perda_cli_min','perda_cli_max'],
  ]) {
    const [kMin, kMax] = grupo;
    if (isNaN(p[kMin]) || isNaN(p[kMax]))
      return { ok: false, msg: `Preencha os campos de "${kMin.replace(/_/g,' ')}" corretamente.` };
    if (p[kMin] > p[kMax])
      return { ok: false, msg: `Mínimo não pode ser maior que Máximo em "${kMin.replace(/_/g,' ')}".` };
  }
  return { ok: true };
}

async function salvarParametros() {
  const p = _coletarParametros();
  const v = _validarParametros(p);
  if (!v.ok) { showAlert('param-err', v.msg); hideAlert('param-ok'); return; }
  hideAlert('param-err');
  await fetch(`${API}/moderador/config`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ parametros_modelo: p }),
  });
  showAlert('param-ok', '✅ Parâmetros salvos com sucesso!', 'ok');
}

function resetarParametros() {
  if (!confirm('Restaurar todos os parâmetros para os valores padrão?')) return;
  PARAM_IDS.forEach(k => {
    const el = document.getElementById(`p-${k.replace(/_/g, '-')}`);
    if (el) el.value = PARAM_DEFAULTS[k];
  });
  showAlert('param-ok', 'ℹ️ Padrões restaurados — clique em Salvar para confirmar.', 'ok');
}


// ── INIT ──────────────────────────────────────────────
atualizarTopbar();