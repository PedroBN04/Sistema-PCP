"""
PCP Simulador — Backend (Flask)
Projeto PIVIC Nº 391/2025 — UFU/FAGEN
Orientador: Prof. Dr. João Henrique Lopes Guerra
"""

from flask import Flask, jsonify, request, send_from_directory
from flask_cors import CORS
import json, os, random, math
from datetime import datetime

BASE_DIR     = os.path.dirname(os.path.abspath(__file__))
FRONTEND_DIR = os.path.join(BASE_DIR, '..', 'frontend')
TEMPLATE_DIR = os.path.join(FRONTEND_DIR, 'templates')
DB_FILE      = os.path.join(BASE_DIR, 'db.json')

app = Flask(__name__, static_folder=FRONTEND_DIR, template_folder=TEMPLATE_DIR)
CORS(app)

# ─────────────────────────────────────────────────────────────────
# BANCO DE DADOS (JSON)
# ─────────────────────────────────────────────────────────────────

def default_config():
    return {
        "senha_moderador":    "admin123",
        "rodada_atual":       0,
        "total_rodadas":      8,
        "sessao_aberta":      False,   # moderador liberou o cadastro
        "tipo_demanda":       "uniforme",
        "modo_demanda":       "automatico",
        "enfase_tend_ciclic": "equilibrio",
        "demanda_manual":     [],
        "empresa": {
            "nome":               "Indústria Alfa",
            "produto":            "Peças",
            "cap_regular":        40000,
            "cap_hora_extra":     5000,
            "cap_subcontratacao": 10000,
            "estoque_inicial":    2000,
            "custo_regular":      50,
            "custo_hora_extra":   75,
            "custo_subcontratacao": 90,
            "custo_estoque":      10,
            "custo_falta":        200
        },
        "params": {
            "uniforme":    {"min": 38000, "max": 41500, "rest_min": 30000, "rest_max": 50000, "dif_min": 2000,  "dif_max": 5000},
            "tendencia":   {"min": 35000, "max": 45000, "rest_min": 30000, "rest_max": 50000, "dif_min": 5000,  "dif_max": 15000},
            "ciclicidade": {"min": 37000, "max": 44000, "rest_min": 30000, "rest_max": 50000, "dif_min": 5000,  "dif_max": 10000},
            "tend_ciclic": {"min": 32500, "max": 47500, "rest_min": 30000, "rest_max": 50000, "dif_min": 10000, "dif_max": 18000}
        },
        "parametros_modelo": {
            "preco_venda_prod_valor": 100,
            "estoque_ini_valor": 1000,
            "custo_armaz_valor": 15,
            "capac_produ_valor": 28000,
            "produ_regul_custo_fixo_valor": 580000,
            "produ_regul_custo_varia_valor": 60,
            "produ_hora_extra_custo_varia_valor": 90,
            "hora_extra_max_valor": 20,
            "perda_produ_hora_extra_valor": 10,
            "produ_turno_extra_custo_fixo_valor": 380000,
            "produ_turno_extra_custo_varia_valor": 70,
            "acres_capac_5_valor": 200000,
            "acres_capac_10_valor": 350000,
            "acres_capac_15_valor": 500000,
            "terce_custo_varia_valor": 86,
            "limit_max_produ_terce_valor": 20000,
            "capit_dispo_acres_capac_valor": 700000,
            "taxa_rendi_capit_dispo_valor": 3.5,
            "reduc_custo_varia_aumen_capac_produ_valor": 1.5,
            "perda_clien_valor": 80
        }
    }

def load_db():
    if not os.path.exists(DB_FILE):
        db = {"config": default_config(), "equipes": {}}
        save_db(db)
        return db
    with open(DB_FILE) as f:
        return json.load(f)

def save_db(data):
    with open(DB_FILE, 'w') as f:
        json.dump(data, f, indent=2, ensure_ascii=False)

# ─────────────────────────────────────────────────────────────────
# GERAÇÃO DE DEMANDA (lógica fiel aos parâmetros do xlsx)
# ─────────────────────────────────────────────────────────────────

def gerar_uniforme(a, b):
    c = b - a
    f = (a + b) / 2
    hist = [round(f + (c/2 - random.randint(0, int(c)))) for _ in range(8)]
    fut  = [round(f + (c/2 - random.randint(0, int(c)))) for _ in range(8)]
    return hist, fut

def gerar_tendencia(a, b):
    e = round(a / 2)
    f = round((a - e) / 8)
    hist = [e]
    for i in range(1, 8):
        lo = e + (i - 1) * f
        hist.append(random.randint(int(lo), max(int(lo + f), int(lo) + 1)))
    c = round((b - a) / 8)
    fut = [min(b, round(a + i * c + random.randint(0, int(c)))) for i in range(8)]
    return hist, fut

def gerar_ciclicidade(a, e_max):
    b = round(a + 1 * (e_max - a) / 4)
    c = round(a + 2 * (e_max - a) / 4)
    d = round(a + 3 * (e_max - a) / 4)
    hist_ranges = [(c,d),(d,e_max),(c,d),(b,c),(a,b),(b,c),(c,d),(d,e_max)]
    fut_ranges  = [(c,d),(b,c),(a,b),(b,c),(c,d),(d,e_max),(c,d),(b,c)]
    hist = [random.randint(lo, hi) for lo, hi in hist_ranges]
    fut  = [random.randint(lo, hi) for lo, hi in fut_ranges]
    return hist, fut

def gerar_tend_ciclic(a, b, enfase="equilibrio"):
    pesos = {"tendencia": 2/3, "ciclicidade": 1/3, "equilibrio": 0.5}
    p  = pesos.get(enfase, 0.5)
    at = math.ceil(a * p);  bt = math.floor(b * p)
    ac = math.ceil(a*(1-p)); ec = math.floor(b*(1-p))
    ht, ft = gerar_tendencia(at, bt)
    hc, fc = gerar_ciclicidade(ac, ec)
    hist = [round(ht[i] + hc[i]) for i in range(8)]
    fut  = [round(ft[i] + fc[i]) for i in range(8)]
    return hist, fut

def gerar_demanda(tipo, params, enfase="equilibrio"):
    a, b = params['min'], params['max']
    if tipo == 'uniforme':    return gerar_uniforme(a, b)
    if tipo == 'tendencia':   return gerar_tendencia(a, b)
    if tipo == 'ciclicidade': return gerar_ciclicidade(a, b)
    if tipo == 'tend_ciclic': return gerar_tend_ciclic(a, b, enfase)
    return gerar_uniforme(a, b)

def capacidade_total_trimestral(cfg):
    """Capacidade maxima que uma equipe consegue produzir em um trimestre,
    considerando os parametros do modelo (regular + hora extra + turno
    extra + terceirizacao). Usado para alertar o moderador quando a
    demanda configurada estiver acima do que o jogo permite atender."""
    e = cfg['empresa']
    return e['cap_regular'] + e['cap_hora_extra'] + e['cap_subcontratacao']

def alerta_demanda_vs_capacidade(cfg, params):
    cap = capacidade_total_trimestral(cfg)
    if params['max'] > cap:
        return (f"Atencao: a demanda maxima configurada ({params['max']}) supera a "
                f"capacidade produtiva total do trimestre ({cap}), considerando os "
                f"parametros do modelo. Nenhuma equipe conseguira atender 100% da "
                f"demanda nesses trimestres.")
    return None

# ─────────────────────────────────────────────────────────────────
# CÁLCULO DE RESULTADOS
# ─────────────────────────────────────────────────────────────────

def calcular_resultado(equipe, rodada_num, empresa):
    idx    = rodada_num - 1
    demanda = equipe['demanda_futura'][idx] if idx < len(equipe['demanda_futura']) else 0
    plano   = equipe['rodadas'].get(str(rodada_num), {}).get('plano', {})

    prod  = plano.get('producao_regular', 0)
    he    = plano.get('horas_extras', 0)
    sub   = plano.get('subcontratacao', 0)
    est_i = equipe.get('estoque_atual', empresa.get('estoque_inicial', 0))
    total = prod + he + sub + est_i

    atend  = min(total, demanda)
    falta  = max(0, demanda - total)
    sobra  = max(0, total - demanda)

    c_prod = prod * empresa['custo_regular']
    c_he   = he   * empresa['custo_hora_extra']
    c_sub  = sub  * empresa['custo_subcontratacao']
    c_est  = sobra * empresa['custo_estoque']
    c_falt = falta * empresa['custo_falta']
    c_tot  = c_prod + c_he + c_sub + c_est + c_falt

    ns = round(atend / demanda * 100, 1) if demanda > 0 else 100.0
    return {
        "demanda": demanda, "producao_total": prod + he + sub,
        "estoque_entrada": est_i, "atendimento": atend,
        "falta": falta, "estoque_final": sobra,
        "custo_producao": c_prod, "custo_horas_extras": c_he,
        "custo_subcontratacao": c_sub, "custo_estoque": c_est,
        "custo_falta": c_falt, "custo_total": c_tot,
        "nivel_servico": ns
    }

# ─────────────────────────────────────────────────────────────────
# ROTAS — ARQUIVOS ESTÁTICOS
# ─────────────────────────────────────────────────────────────────

@app.route('/')
def index():
    return send_from_directory(TEMPLATE_DIR, 'index.html')

@app.route('/moderador')
def moderador_page():
    return send_from_directory(TEMPLATE_DIR, 'moderador.html')

@app.route('/alunos')
def alunos_page():
    return send_from_directory(TEMPLATE_DIR, 'alunos.html')

@app.route('/css/<path:f>')
def css(f): return send_from_directory(os.path.join(FRONTEND_DIR, 'css'), f)

@app.route('/js/<path:f>')
def js(f): return send_from_directory(os.path.join(FRONTEND_DIR, 'js'), f)

# ─────────────────────────────────────────────────────────────────
# API — STATUS
# ─────────────────────────────────────────────────────────────────

@app.route('/api/status')
def status():
    db  = load_db()
    cfg = db['config']
    return jsonify({
        "rodada_atual":   cfg['rodada_atual'],
        "total_rodadas":  cfg['total_rodadas'],
        "sessao_aberta":  cfg['sessao_aberta'],
        "num_equipes":    len(db['equipes']),
        "tipo_demanda":   cfg['tipo_demanda'],
        "modo_demanda":   cfg['modo_demanda'],
        "empresa":        cfg['empresa']
    })

# ─────────────────────────────────────────────────────────────────
# API — EQUIPES
# ─────────────────────────────────────────────────────────────────

@app.route('/api/equipe/cadastrar', methods=['POST'])
def cadastrar_equipe():
    db  = load_db()
    cfg = db['config']
    if not cfg['sessao_aberta']:
        return jsonify({"erro": "Sessão ainda não foi aberta pelo moderador"}), 403
    data   = request.json
    nome   = data.get('nome', '').strip()
    membros = data.get('membros', [])
    if not nome:
        return jsonify({"erro": "Nome da equipe é obrigatório"}), 400
    if nome in db['equipes']:
        return jsonify({"erro": "Equipe já cadastrada"}), 400

    tipo   = cfg['tipo_demanda']
    enfase = cfg.get('enfase_tend_ciclic', 'equilibrio')
    if cfg['modo_demanda'] == 'automatico':
        hist, fut = gerar_demanda(tipo, cfg['params'][tipo], enfase)
    else:
        vals = cfg.get('demanda_manual', [0]*16)
        hist, fut = vals[:8], vals[8:16]

    db['equipes'][nome] = {
        "nome": nome, "membros": membros,
        "cadastro": datetime.now().isoformat(),
        "demanda_historico": hist, "demanda_futura": fut,
        "estoque_atual": cfg['empresa']['estoque_inicial'],
        "rodadas": {}
    }
    save_db(db)
    alerta = alerta_demanda_vs_capacidade(cfg, cfg['params'][tipo]) if cfg['modo_demanda'] == 'automatico' else None
    return jsonify({"ok": True, "equipe": nome, "historico": hist, "futura": fut, "alerta": alerta})

@app.route('/api/equipes')
def listar_equipes():
    db = load_db()
    return jsonify(list(db['equipes'].keys()))

@app.route('/api/equipe/<nome>')
def get_equipe(nome):
    db = load_db()
    eq = db['equipes'].get(nome)
    if not eq: return jsonify({"erro": "Equipe não encontrada"}), 404
    return jsonify(eq)

# ─────────────────────────────────────────────────────────────────
# API — PLANO AGREGADO
# ─────────────────────────────────────────────────────────────────

@app.route('/api/plano/salvar', methods=['POST'])
def salvar_plano():
    db   = load_db()
    data = request.json
    nome = data.get('equipe')
    if nome not in db['equipes']:
        return jsonify({"erro": "Equipe não encontrada"}), 404

    cfg    = db['config']
    rodada = cfg['rodada_atual']
    if rodada == 0:
        return jsonify({"erro": "O moderador ainda não iniciou a primeira rodada"}), 403
    if str(rodada) in db['equipes'][nome]['rodadas'] and \
       db['equipes'][nome]['rodadas'][str(rodada)].get('plano'):
        return jsonify({"erro": f"Plano da Rodada {rodada} já foi submetido"}), 409

    plano = {
        "producao_regular": data.get('producao_regular', 0),
        "horas_extras":     data.get('horas_extras', 0),
        "subcontratacao":   data.get('subcontratacao', 0),
        "timestamp":        datetime.now().isoformat()
    }
    if str(rodada) not in db['equipes'][nome]['rodadas']:
        db['equipes'][nome]['rodadas'][str(rodada)] = {}
    db['equipes'][nome]['rodadas'][str(rodada)]['plano'] = plano

    resultado = calcular_resultado(db['equipes'][nome], rodada, cfg['empresa'])
    db['equipes'][nome]['rodadas'][str(rodada)]['resultado'] = resultado
    db['equipes'][nome]['estoque_atual'] = resultado['estoque_final']
    save_db(db)
    return jsonify({"ok": True, "resultado": resultado})

# ─────────────────────────────────────────────────────────────────
# API — RESULTADOS
# ─────────────────────────────────────────────────────────────────

@app.route('/api/resultados/<nome>')
def resultados_equipe(nome):
    db = load_db()
    eq = db['equipes'].get(nome)
    if not eq: return jsonify({"erro": "Equipe não encontrada"}), 404
    return jsonify({
        "equipe": nome, "membros": eq['membros'],
        "rodadas": eq['rodadas'],
        "demanda_historico": eq['demanda_historico'],
        "demanda_futura":    eq['demanda_futura']
    })

@app.route('/api/resultados_geral')
def resultados_geral():
    db  = load_db()
    out = []
    for nome, eq in db['equipes'].items():
        custo = sum(r.get('resultado', {}).get('custo_total', 0) for r in eq['rodadas'].values())
        out.append({"equipe": nome, "membros": eq['membros'],
                    "rodadas_feitas": len(eq['rodadas']), "custo_acumulado": custo})
    out.sort(key=lambda x: x['custo_acumulado'])
    return jsonify(out)

# ─────────────────────────────────────────────────────────────────
# API — MODERADOR
# ─────────────────────────────────────────────────────────────────

@app.route('/api/moderador/login', methods=['POST'])
def moderador_login():
    db = load_db()
    if request.json.get('senha') == db['config']['senha_moderador']:
        return jsonify({"ok": True})
    return jsonify({"erro": "Senha incorreta"}), 401

# Limites reais (min/max) que o moderador pode escolher - espelha a planilha
# do orientador (aba "Logica sistema") e os mesmos limites do PARAM_DEFAULTS
# do front-end; o servidor valida com base neles alem da validacao em tempo
# real que ja ocorre no front-end (chave = id do campo "_valor" no HTML)
PARAM_BOUNDS = {
    "preco_venda_prod_valor": (50, 300), "estoque_ini_valor": (0, 10000),
    "custo_armaz_valor": (0, 100), "capac_produ_valor": (10000, 30000),
    "produ_regul_custo_fixo_valor": (100000, 1000000), "produ_regul_custo_varia_valor": (50, 200),
    "produ_hora_extra_custo_varia_valor": (50, 280), "hora_extra_max_valor": (0, 25),
    "perda_produ_hora_extra_valor": (0, 20), "produ_turno_extra_custo_fixo_valor": (100000, 800000),
    "produ_turno_extra_custo_varia_valor": (50, 200), "acres_capac_5_valor": (100000, 300000),
    "acres_capac_10_valor": (150000, 500000), "acres_capac_15_valor": (250000, 750000),
    "terce_custo_varia_valor": (50, 200), "limit_max_produ_terce_valor": (10000, 30000),
    "capit_dispo_acres_capac_valor": (500000, 1500000), "taxa_rendi_capit_dispo_valor": (0, 3.5),
    "reduc_custo_varia_aumen_capac_produ_valor": (0, 10), "perda_clien_valor": (0, 100),
}

def validar_parametros_modelo(p):
    for chave, (lo, hi) in PARAM_BOUNDS.items():
        if chave not in p: continue
        valor = p[chave]
        if not (lo <= valor <= hi):
            return f'Parametro "{chave}" = {valor} fora do intervalo permitido [{lo}, {hi}]'
    return None

def aplicar_parametros_modelo_na_empresa(cfg):
    """Conecta os parametros do modelo (tela 'Parametros do Modelo') aos
    dados que o jogo de fato usa para calcular resultado e demanda -
    sem isso, os parametros ficavam salvos mas nunca eram lidos por
    calcular_resultado()."""
    p = cfg['parametros_modelo']
    e = cfg['empresa']
    if 'capac_produ_valor' not in p: return  # ainda não configurado
    e['cap_regular']          = p['capac_produ_valor']
    e['cap_hora_extra']       = round(p['capac_produ_valor'] * p['hora_extra_max_valor'] / 100)
    e['cap_subcontratacao']   = p['limit_max_produ_terce_valor']
    e['estoque_inicial']      = p['estoque_ini_valor']
    e['custo_regular']        = p['produ_regul_custo_varia_valor']
    e['custo_hora_extra']     = p['produ_hora_extra_custo_varia_valor']
    e['custo_subcontratacao'] = p['terce_custo_varia_valor']
    e['custo_estoque']        = p['custo_armaz_valor']


@app.route('/api/moderador/config', methods=['GET'])
def get_config():
    return jsonify(load_db()['config'])

@app.route('/api/moderador/config', methods=['POST'])
def set_config():
    db  = load_db()
    cfg = db['config']
    d   = request.json
    
    # Atualiza configurações de demanda
    for k in ['tipo_demanda','modo_demanda','enfase_tend_ciclic','demanda_manual']:
        if k in d: cfg[k] = d[k]
        
    if 'params' in d:
        for tipo, vals in d['params'].items():
            if tipo in cfg['params']: cfg['params'][tipo].update(vals)
            
    if 'empresa' in d:
        cfg['empresa'].update(d['empresa'])
        
    # Salva e atualiza o novo dicionário parametros_modelo recebido do Frontend
    if 'parametros_modelo' in d:
        erro = validar_parametros_modelo(d['parametros_modelo'])
        if erro:
            return jsonify({"erro": erro}), 400
        if 'parametros_modelo' not in cfg:
            cfg['parametros_modelo'] = {}
        cfg['parametros_modelo'].update(d['parametros_modelo'])
        aplicar_parametros_modelo_na_empresa(cfg)
        
    if d.get('senha_moderador'):
        cfg['senha_moderador'] = d['senha_moderador']
        
    save_db(db)
    return jsonify({"ok": True})

@app.route('/api/moderador/abrir_sessao', methods=['POST'])
def abrir_sessao():
    db = load_db()
    db['config']['sessao_aberta'] = True
    save_db(db)
    return jsonify({"ok": True})

@app.route('/api/moderador/fechar_sessao', methods=['POST'])
def fechar_sessao():
    db = load_db()
    db['config']['sessao_aberta'] = False
    save_db(db)
    return jsonify({"ok": True})

@app.route('/api/moderador/avancar_rodada', methods=['POST'])
def avancar_rodada():
    db  = load_db()
    cfg = db['config']
    if cfg['rodada_atual'] < cfg['total_rodadas']:
        cfg['rodada_atual'] += 1
    save_db(db)
    return jsonify({"ok": True, "rodada": cfg['rodada_atual']})

@app.route('/api/moderador/resetar', methods=['POST'])
def resetar():
    save_db({"config": default_config(), "equipes": {}})
    return jsonify({"ok": True})

@app.route('/api/moderador/preview_demanda', methods=['POST'])
def preview_demanda():
    d      = request.json
    tipo   = d.get('tipo', 'uniforme')
    params = d.get('params', {})
    enfase = d.get('enfase', 'equilibrio')
    hist, fut = gerar_demanda(tipo, params, enfase)
    cfg = load_db()['config']
    alerta = alerta_demanda_vs_capacidade(cfg, params)
    return jsonify({"historico": hist, "futura": fut, "alerta": alerta,
                     "capacidade_total": capacidade_total_trimestral(cfg)})

# ─────────────────────────────────────────────────────────────────

if __name__ == '__main__':
    port  = int(os.environ.get('PORT', 5000))
    debug = os.environ.get('FLASK_DEBUG', '0') == '1'
    print(f" PCP Simulador → http://localhost:{port}")
    app.run(host='0.0.0.0', port=port, debug=debug)