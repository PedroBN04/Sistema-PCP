/* ═══════════════════════════════════════════════════════
   PCP SIMULADOR — ALUNOS.JS
   Projeto PIVIC Nº 391/2025 — UFU/FAGEN
═══════════════════════════════════════════════════════ */

const EQUIPE_KEY = 'pcp_equipe_nome';

let equipeAtual    = null;
let equipeData     = null;
let statusAtual    = null;
let empresaAtual   = null;
let membrosTemp    = [];
let chartHistorico = null;
let chartResDemanda = null;
let chartResCustos = null;
let chartRankAluno = null;

// ── INICIALIZAÇÃO ─────────────────────────────────────
(async () => {
  statusAtual = await fetchStatus();
  atualizarTopbarRodada();

  // Sessão fechada?
  if (!statusAtual.sessao_aberta) {
    document.getElementById('sessao-fechada-view').style.display = 'block';
    return;
  }

  // Equipe salva no localStorage?
  const saved = localStorage.getItem(EQUIPE_KEY);
  if (saved) {
    const r = await fetch(`${API}/equipe/${saved}`);
    if (r.ok) {
      equipeData  = await r.json();
      equipeAtual = saved;
      empresaAtual = statusAtual.empresa;
      mostrarPainelAluno();
      return;
    }
  }

  // Tela de cadastro
  mostrarCadastro();
})();

function atualizarTopbarRodada() {
  const pill = document.getElementById('topbar-rodada');
  if (!statusAtual) return;
  if (statusAtual.rodada_atual === 0) {
    pill.textContent = 'Aguardando 1ª rodada';
    pill.className   = 'topbar-pill';
  } else {
    pill.textContent = `Rodada ${statusAtual.rodada_atual} de ${statusAtual.total_rodadas}`;
    pill.className   = 'topbar-pill open';
  }
}

// ── CADASTRO ──────────────────────────────────────────
async function mostrarCadastro() {
  document.getElementById('cadastro-view').style.display = 'block';
  await populateEquipeSelect('sel-equipe-exist');
}

function addMembro() {
  const inp  = document.getElementById('cad-membro-input');
  const nome = inp.value.trim();
  if (!nome) return;
  membrosTemp.push(nome);
  renderMembros();
  inp.value = '';
}

function removeMembro(i) { membrosTemp.splice(i, 1); renderMembros(); }

function renderMembros() {
  document.getElementById('cad-membros-list').innerHTML = membrosTemp.map((m, i) => `
    <div class="member-row">
      <div class="member-av">${m[0].toUpperCase()}</div>
      <span class="member-name">${m}</span>
      <button class="btn-rm" onclick="removeMembro(${i})">✕</button>
    </div>`).join('');
}

async function cadastrarEquipe() {
  const nome = document.getElementById('cad-nome').value.trim();
  if (!nome)              { showAlert('cad-err', 'Informe o nome da equipe'); return; }
  if (!membrosTemp.length){ showAlert('cad-err', 'Adicione ao menos um membro'); return; }
  spin('cad-spin', true);
  try {
    const r = await fetch(`${API}/equipe/cadastrar`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nome, membros: membrosTemp })
    });
    const d = await r.json();
    if (!r.ok) { showAlert('cad-err', d.erro); return; }
    equipeAtual  = nome;
    equipeData   = await fetch(`${API}/equipe/${nome}`).then(r => r.json());
    empresaAtual = statusAtual.empresa;
    localStorage.setItem(EQUIPE_KEY, nome);
    document.getElementById('cadastro-view').style.display = 'none';
    mostrarPainelAluno();
  } finally { spin('cad-spin', false); }
}

async function selecionarEquipe() {
  const nome = document.getElementById('sel-equipe-exist').value;
  if (!nome) return;
  const r = await fetch(`${API}/equipe/${nome}`);
  if (!r.ok) { alert('Equipe não encontrada'); return; }
  equipeAtual  = nome;
  equipeData   = await r.json();
  empresaAtual = statusAtual.empresa;
  localStorage.setItem(EQUIPE_KEY, nome);
  document.getElementById('cadastro-view').style.display = 'none';
  mostrarPainelAluno();
}

// ── PAINEL PRINCIPAL ──────────────────────────────────
function mostrarPainelAluno() {
  document.getElementById('aluno-panel').style.display = 'block';
  atualizarSidebar();

  document.querySelectorAll('.nav-item[data-apage]').forEach(btn => {
    btn.addEventListener('click', () => navegarAlunoParah(btn.dataset.apage));
  });

  navegarAlunoParah('briefing');
}

function atualizarSidebar() {
  document.getElementById('sb-eq-nome').textContent    = equipeAtual;
  document.getElementById('sb-eq-membros').textContent = equipeData.membros.join(', ');
  document.getElementById('sb-eq-rodada').textContent  =
    statusAtual.rodada_atual > 0 ? `Rodada ${statusAtual.rodada_atual}/${statusAtual.total_rodadas}` : 'Aguardando início';
}

function navegarAlunoParah(page) {
  document.querySelectorAll('.nav-item[data-apage]').forEach(b => b.classList.remove('active'));
  document.querySelector(`.nav-item[data-apage="${page}"]`)?.classList.add('active');
  document.querySelectorAll('.apage-content').forEach(p => p.style.display = 'none');
  document.getElementById(`apage-${page}`).style.display = 'block';
  if (page === 'briefing')   renderBriefing();
  if (page === 'dados')      renderHistorico();
  if (page === 'empresa')    renderEmpresa();
  if (page === 'plano')      renderPlano();
  if (page === 'resultados') renderResultados();
  if (page === 'ranking')    carregarRankingAluno();
}

// ── BRIEFING ──────────────────────────────────────────
async function renderBriefing() {
  statusAtual = await fetchStatus();
  atualizarSidebar(); atualizarTopbarRodada();

  const rod = statusAtual.rodada_atual;

  document.getElementById('brief-titulo').textContent =
    rod === 0 ? `Bem-vinda, ${equipeAtual}!` : `Rodada ${rod} — Em Andamento`;
  document.getElementById('brief-subtitulo').textContent =
    rod === 0
      ? 'O moderador ainda não iniciou a primeira rodada'
      : `Período ${rod} de ${statusAtual.total_rodadas}`;

  document.getElementById('brief-stats').innerHTML = `
    <div class="stat blue">  <div class="val">${rod}/${statusAtual.total_rodadas}</div><div class="lbl">Rodada</div></div>
    <div class="stat purple"><div class="val">${equipeData.membros.length}</div><div class="lbl">Membros</div></div>
    <div class="stat amber"> <div class="val">${fmt(equipeData.estoque_atual ?? empresaAtual?.estoque_inicial ?? 0)}</div><div class="lbl">Estoque Atual</div></div>
    <div class="stat ${Object.keys(equipeData.rodadas).length > 0 ? 'green' : ''}">
      <div class="val">${Object.keys(equipeData.rodadas).length}/8</div><div class="lbl">Planos Enviados</div>
    </div>`;

  let instrHtml = '';
  if (rod === 0) {
    instrHtml = `
      <p style="margin-bottom:12px">Olá, <strong>${equipeAtual}</strong>! A sessão está configurada e você está pronto para jogar.</p>
      <p style="margin-bottom:12px">Enquanto o moderador não inicia a primeira rodada, explore as seções do menu:</p>
      <ul style="padding-left:20px;margin-bottom:12px;line-height:2">
        <li><strong>📊 Histórico de Demanda</strong> — veja os 8 períodos passados da demanda</li>
        <li><strong>🏭 Dados da Empresa</strong> — entenda as capacidades e custos da fábrica</li>
        <li><strong>📋 Plano Agregado</strong> — aqui você submeterá suas decisões de produção</li>
      </ul>
      <p>Quando o moderador avançar para a Rodada 1, você receberá um aviso aqui.</p>`;
  } else {
    const jaSubmeteu = !!equipeData.rodadas[String(rod)]?.plano;
    instrHtml = `
      <p style="margin-bottom:12px">
        ${jaSubmeteu
          ? '✅ <strong>Plano desta rodada já submetido.</strong> Aguarde o moderador avançar para a próxima rodada.'
          : `Você está na <strong>Rodada ${rod}</strong>. Consulte o histórico de demanda, analise a tendência e elabore seu Plano Agregado.`}
      </p>
      <ul style="padding-left:20px;margin-bottom:12px;line-height:2">
        <li>Acesse <strong>📊 Histórico de Demanda</strong> para analisar os dados</li>
        <li>Acesse <strong>🏭 Dados da Empresa</strong> para ver capacidades e custos</li>
        <li>Preencha e envie o <strong>📋 Plano Agregado</strong> ${jaSubmeteu ? '(já enviado)' : ''}</li>
      </ul>
      <div class="alert alert-warn show" style="margin-bottom:0">
        ⚠️ Lembre-se: custos de falta (${fmtR(empresaAtual?.custo_falta ?? 200)}/un.) são muito maiores que custos de estoque (${fmtR(empresaAtual?.custo_estoque ?? 10)}/un.).
      </div>`;
  }
  document.getElementById('brief-body').innerHTML = instrHtml;

  // Resultado da rodada anterior
  const antKey = String(rod - 1);
  const ultRes = rod > 1 && equipeData.rodadas[antKey]?.resultado;
  const box = document.getElementById('brief-ultimo-resultado');
  if (ultRes) {
    box.style.display = 'block';
    const ns = ultRes.nivel_servico;
    document.getElementById('brief-ult-res-content').innerHTML = `
      <div class="res-ns ${ns >= 90 ? 'high' : ns >= 70 ? 'mid' : 'low'}">${fmtP(ns)} de atendimento</div>
      <div class="stats-row">
        <div class="stat"><div class="val">${fmt(ultRes.demanda)}</div><div class="lbl">Demanda Real</div></div>
        <div class="stat"><div class="val">${fmt(ultRes.atendimento)}</div><div class="lbl">Atendido</div></div>
        <div class="stat ${ultRes.falta > 0 ? 'red' : 'green'}"><div class="val">${fmt(ultRes.falta)}</div><div class="lbl">Falta</div></div>
        <div class="stat"><div class="val">${fmtR(ultRes.custo_total)}</div><div class="lbl">Custo Total</div></div>
      </div>`;
  } else {
    box.style.display = 'none';
  }
}

// ── HISTÓRICO ─────────────────────────────────────────
function renderHistorico() {
  const hist = equipeData.demanda_historico;
  if (chartHistorico) chartHistorico.destroy();
  chartHistorico = new Chart(
    document.getElementById('chart-historico').getContext('2d'),
    { type: 'line', data: {
      labels: hist.map((_, i) => `Período ${i+1}`),
      datasets: [{
        label: 'Demanda Histórica', data: hist,
        borderColor: '#3b7ff5', backgroundColor: 'rgba(59,127,245,.12)',
        tension: .4, fill: true, pointRadius: 5, pointBackgroundColor: '#3b7ff5'
      }]
    }, options: chartDefaults() }
  );
  // Tabela com variação
  document.getElementById('hist-body').innerHTML = hist.map((val, i) => {
    const var_pct = i === 0 ? '—' : ((val - hist[i-1]) / hist[i-1] * 100).toFixed(1) + '%';
    const color   = i === 0 ? '' : val > hist[i-1] ? 'color:var(--green)' : 'color:var(--red)';
    return `<tr>
      <td>Período ${i+1}</td>
      <td>${fmt(val)}</td>
      <td style="${color}">${var_pct}</td>
    </tr>`;
  }).join('');
}

// ── EMPRESA ───────────────────────────────────────────
function renderEmpresa() {
  const e = empresaAtual || {};
  document.getElementById('empresa-cards').innerHTML = `
    <div class="card">
      <div class="section-label">Identificação</div>
      ${row('Empresa', e.nome || '—')}
      ${row('Produto', e.produto || '—')}
      ${row('Estoque Inicial', fmt(e.estoque_inicial) + ' un.')}
    </div>
    <div class="card">
      <div class="section-label">Capacidades por Rodada</div>
      ${row('Produção Regular', fmt(e.cap_regular) + ' un.')}
      ${row('Horas Extras', fmt(e.cap_hora_extra) + ' un.')}
      ${row('Subcontratação', fmt(e.cap_subcontratacao) + ' un.')}
      ${row('Capacidade Total', fmt((e.cap_regular||0) + (e.cap_hora_extra||0) + (e.cap_subcontratacao||0)) + ' un.')}
    </div>
    <div class="card">
      <div class="section-label">Estrutura de Custos</div>
      ${row('Produção Regular', fmtR(e.custo_regular) + ' / un.')}
      ${row('Horas Extras', fmtR(e.custo_hora_extra) + ' / un.')}
      ${row('Subcontratação', fmtR(e.custo_subcontratacao) + ' / un.')}
      ${row('Estoque', fmtR(e.custo_estoque) + ' / un. / período')}
      ${row('Falta (backlog)', `<span style="color:var(--red);font-weight:700">${fmtR(e.custo_falta)} / un.</span>`)}
    </div>
    <div class="card">
      <div class="section-label">Situação Atual</div>
      ${row('Estoque Disponível', fmt(equipeData.estoque_atual ?? e.estoque_inicial) + ' un.')}
      ${row('Rodada Atual', statusAtual.rodada_atual > 0 ? `${statusAtual.rodada_atual} de ${statusAtual.total_rodadas}` : 'Não iniciada')}
      ${row('Planos Enviados', Object.keys(equipeData.rodadas).length + ' de 8')}
    </div>`;
}

function row(label, value) {
  return `<div style="display:flex;justify-content:space-between;align-items:center;
          padding:8px 0;border-bottom:1px solid var(--border);font-size:13px">
    <span style="color:var(--text2)">${label}</span>
    <span style="font-weight:600">${value}</span>
  </div>`;
}

// ── PLANO AGREGADO ────────────────────────────────────
function renderPlano() {
  const rod = statusAtual.rodada_atual;
  document.getElementById('plano-titulo').textContent = `Plano Agregado — Rodada ${rod}`;

  const jaSubmeteu = rod > 0 && !!equipeData.rodadas[String(rod)]?.plano;
  document.getElementById('plano-ja-submetido').style.display = jaSubmeteu ? 'block' : 'none';
  document.getElementById('plano-form-wrap').style.opacity    = jaSubmeteu ? '0.5' : '1';
  document.getElementById('plano-form-wrap').style.pointerEvents = jaSubmeteu ? 'none' : 'auto';

  const e = empresaAtual || {};
  document.getElementById('pl-cap-reg-hint').textContent  = `Máx: ${fmt(e.cap_regular)} un.`;
  document.getElementById('pl-cap-he-hint').textContent   = `Máx: ${fmt(e.cap_hora_extra)} un.`;
  document.getElementById('pl-cap-sub-hint').textContent  = `Máx: ${fmt(e.cap_subcontratacao)} un.`;
  document.getElementById('pl-estoque-atual').value       = equipeData.estoque_atual ?? e.estoque_inicial ?? 0;

  calcularEstimativa();
}

function calcularEstimativa() {
  const p   = +document.getElementById('pl-prod')?.value  || 0;
  const h   = +document.getElementById('pl-he')?.value    || 0;
  const s   = +document.getElementById('pl-sub')?.value   || 0;
  const est = +document.getElementById('pl-estoque-atual')?.value || 0;
  const e   = empresaAtual || {};

  document.getElementById('est-prod').textContent  = fmt(p);
  document.getElementById('est-he').textContent    = fmt(h);
  document.getElementById('est-sub').textContent   = fmt(s);
  document.getElementById('est-est').textContent   = fmt(est);
  document.getElementById('est-total').textContent = fmt(p + h + s + est);

  const cp = p * (e.custo_regular      || 50);
  const ch = h * (e.custo_hora_extra   || 75);
  const cs = s * (e.custo_subcontratacao || 90);
  document.getElementById('est-c-prod').textContent       = fmtR(cp);
  document.getElementById('est-c-he').textContent         = fmtR(ch);
  document.getElementById('est-c-sub').textContent        = fmtR(cs);
  document.getElementById('est-total-custo').textContent  = fmtR(cp + ch + cs);
}

async function submeterPlano() {
  const rod = statusAtual.rodada_atual;
  if (rod === 0) { showAlert('plano-err', 'O moderador ainda não iniciou a primeira rodada'); return; }
  spin('plano-spin', true);
  try {
    const r = await fetch(`${API}/plano/salvar`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        equipe:            equipeAtual,
        producao_regular:  +document.getElementById('pl-prod').value || 0,
        horas_extras:      +document.getElementById('pl-he').value   || 0,
        subcontratacao:    +document.getElementById('pl-sub').value  || 0,
      })
    });
    const d = await r.json();
    if (!r.ok) { showAlert('plano-err', d.erro); return; }

    // Atualizar dados locais
    equipeData = await fetch(`${API}/equipe/${equipeAtual}`).then(r => r.json());

    // Navegar para o resultado
    document.getElementById('plano-ja-submetido').style.display = 'block';
    document.getElementById('plano-form-wrap').style.opacity    = '0.5';
    document.getElementById('plano-form-wrap').style.pointerEvents = 'none';

    // Mostrar resultado imediatamente
    navegarAlunoParah('briefing');
  } finally { spin('plano-spin', false); }
}

// ── RESULTADOS ────────────────────────────────────────
async function renderResultados() {
  equipeData = await fetch(`${API}/equipe/${equipeAtual}`).then(r => r.json());
  const rods  = Object.entries(equipeData.rodadas).sort((a, b) => +a[0] - +b[0]);
  const labels    = rods.map(([k]) => `R${k}`);
  const demandas  = rods.map(([, v]) => v.resultado?.demanda      || 0);
  const atends    = rods.map(([, v]) => v.resultado?.atendimento  || 0);
  const c_prod    = rods.map(([, v]) => v.resultado?.custo_producao || 0);
  const c_he      = rods.map(([, v]) => v.resultado?.custo_horas_extras || 0);
  const c_sub     = rods.map(([, v]) => v.resultado?.custo_subcontratacao || 0);
  const c_est     = rods.map(([, v]) => v.resultado?.custo_estoque || 0);
  const c_falta   = rods.map(([, v]) => v.resultado?.custo_falta  || 0);
  const custoTot  = rods.reduce((a, [, v]) => a + (v.resultado?.custo_total || 0), 0);
  const nsMedio   = rods.length ? rods.map(([,v]) => v.resultado?.nivel_servico || 0).reduce((a,b)=>a+b,0)/rods.length : 0;

  document.getElementById('res-stats').innerHTML = `
    <div class="stat blue">   <div class="val">${rods.length}/8</div><div class="lbl">Rodadas</div></div>
    <div class="stat amber">  <div class="val">${fmtR(custoTot)}</div><div class="lbl">Custo Acumulado</div></div>
    <div class="stat ${nsMedio>=90?'green':nsMedio>=70?'amber':'red'}">
      <div class="val">${fmtP(nsMedio)}</div><div class="lbl">NS Médio</div>
    </div>`;

  if (chartResDemanda) chartResDemanda.destroy();
  chartResDemanda = new Chart(
    document.getElementById('chart-res-demanda').getContext('2d'),
    { type: 'line', data: { labels, datasets: [
      { label: 'Demanda', data: demandas, borderColor: '#f87171', backgroundColor: 'rgba(248,113,113,.08)', tension: .4, fill: true, pointRadius: 4 },
      { label: 'Atendimento', data: atends, borderColor: '#34d399', backgroundColor: 'rgba(52,211,153,.08)', tension: .4, fill: true, pointRadius: 4 }
    ]}, options: chartDefaults() }
  );

  if (chartResCustos) chartResCustos.destroy();
  chartResCustos = new Chart(
    document.getElementById('chart-res-custos').getContext('2d'),
    { type: 'bar', data: { labels, datasets: [
      { label: 'Regular',    data: c_prod,  backgroundColor: 'rgba(59,127,245,.7)',  stack: 's', borderRadius: 0 },
      { label: 'H. Extra',   data: c_he,    backgroundColor: 'rgba(167,139,250,.7)', stack: 's', borderRadius: 0 },
      { label: 'Subcontr.',  data: c_sub,   backgroundColor: 'rgba(34,211,238,.7)',  stack: 's', borderRadius: 0 },
      { label: 'Estoque',    data: c_est,   backgroundColor: 'rgba(251,191,36,.7)',  stack: 's', borderRadius: 0 },
      { label: 'Falta',      data: c_falta, backgroundColor: 'rgba(248,113,113,.8)', stack: 's', borderRadius: 4 }
    ]}, options: { ...chartDefaults(), scales: { x: { ...chartDefaults().scales.x, stacked: true }, y: { ...chartDefaults().scales.y, stacked: true } } } }
  );

  document.getElementById('res-body').innerHTML = rods.map(([k, v]) => {
    const r = v.resultado || {};
    const ns = r.nivel_servico || 0;
    return `<tr>
      <td><span class="badge badge-blue">R${k}</span></td>
      <td>${fmt(r.demanda)}</td>
      <td>${fmt(r.producao_total)}</td>
      <td>${fmt(r.atendimento)}</td>
      <td style="color:${r.falta>0?'var(--red)':'inherit'}">${fmt(r.falta)}</td>
      <td>${fmt(r.estoque_final)}</td>
      <td>${fmtR(r.custo_total)}</td>
      <td><span class="badge ${ns>=90?'badge-green':ns>=70?'badge-amber':'badge-red'}">${fmtP(ns)}</span></td>
    </tr>`;
  }).join('');
}

// ── RANKING ───────────────────────────────────────────
async function carregarRankingAluno() {
  const lista = await fetch(`${API}/resultados_geral`).then(r => r.json());
  if (chartRankAluno) chartRankAluno.destroy();
  if (lista.length) {
    chartRankAluno = new Chart(
      document.getElementById('chart-rank-aluno').getContext('2d'),
      { type: 'bar', data: {
        labels: lista.map(e => e.equipe),
        datasets: [{ label: 'Custo acumulado', data: lista.map(e => e.custo_acumulado),
          backgroundColor: lista.map(e => e.equipe === equipeAtual ? 'rgba(59,127,245,.8)' : 'rgba(59,127,245,.3)'),
          borderRadius: 6, borderWidth: 0 }]
      }, options: chartDefaults() }
    );
  }
  document.getElementById('rank-aluno-body').innerHTML = lista.map((e, i) => {
    const bold = e.equipe === equipeAtual ? 'font-weight:700;color:var(--blue)' : '';
    const medal = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `#${i+1}`;
    return `<tr style="${bold}">
      <td><strong>${medal}</strong></td>
      <td>${e.equipe}${e.equipe === equipeAtual ? ' <span class="badge badge-blue">Você</span>' : ''}</td>
      <td>${e.rodadas_feitas}/8</td>
      <td>${fmtR(e.custo_acumulado)}</td>
    </tr>`;
  }).join('');
}
