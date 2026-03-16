# PCP Simulador

Simulador educacional para o ensino do **Planejamento e Controle da Produção (PCP)**, desenvolvido como protótipo de pesquisa no âmbito de projeto de Iniciação Científica da Universidade Federal de Uberlândia.

Equipes de alunos competem em 8 rodadas tomando decisões de produção com base em histórico de demanda gerado dinamicamente, recebendo feedback imediato de custos e nível de serviço.

---

## Projeto acadêmico

| Campo | Informação |
|---|---|
| Registro | DIRPE/PIVIC Nº 391/2025 |
| Edital | DIRPE Nº 007/2025 — UFU |
| Orientador | Prof. Dr. João Henrique Lopes Guerra |
| Estudantes | Eduarda Mendonça de Freitas · Pedro Humberto Bitencourt Nascimento |
| Instituição | Faculdade de Gestão e Negócios — FAGEN/UFU · Uberlândia, MG |
| Vigência | Dez/2025 – Dez/2026 |

---

## Stack

| Camada | Tecnologia |
|---|---|
| Backend | Python 3.8+ · Flask · Flask-CORS |
| Frontend | HTML5 · CSS3 · JavaScript (ES2020) |
| Gráficos | Chart.js 4.4 |
| Dados | JSON (protótipo) |

---

## Estrutura

```
pcp_final/
├── backend/
│   ├── app.py          # API REST (Flask)
│   └── iniciar.py      # Script de inicialização
└── frontend/
    ├── css/
    │   └── style.css
    ├── js/
    │   ├── shared.js
    │   ├── moderador.js
    │   └── alunos.js
    └── templates/
        ├── index.html      # Landing page
        ├── moderador.html  # Painel do moderador
        └── alunos.html     # Área das equipes
```

---

## Instalação e execução

**Pré-requisitos:** Python 3.8+

```bash
# 1. Clonar o repositório
git clone https://github.com/<usuario>/pcp-simulador.git
cd pcp-simulador

# 2. Instalar dependências
pip install flask flask-cors

# 3. Iniciar o servidor
cd backend
python app.py
```

Acesse `http://localhost:5000` no navegador.

> Alternativamente, execute `python iniciar.py` — o script instala as dependências automaticamente.

### Uso em rede local (sala de aula)

Inicie o servidor na máquina do moderador e compartilhe o IP local com os alunos:

```bash
# Descobrir o IP local
ipconfig        # Windows
ifconfig        # macOS / Linux
```

Os alunos acessam `http://<IP-do-moderador>:5000/alunos`.

---

## Fluxo do sistema

```
Moderador configura  →  Abre sessão  →  Equipes se cadastram
        ↓
  [ Ciclo — 8 rodadas ]
  Alunos elaboram Plano Agregado
  → Submetem → Recebem resultado
  → Moderador avança rodada
        ↓
   Ranking final
```

**Páginas:**

| Rota | Perfil | Descrição |
|---|---|---|
| `/` | Público | Landing page |
| `/moderador` | Moderador | Configuração, controle de rodadas e ranking — acesso por senha |
| `/alunos` | Alunos | Cadastro, plano agregado e resultados |

**Senha padrão do moderador:** `admin123` — altere antes do uso em sala na seção *Configurações* do painel.

---

## Geração de demanda

Quatro perfis disponíveis, com parâmetros configuráveis pelo moderador:

| Perfil | Comportamento |
|---|---|
| Uniforme | Oscila em torno da média sem tendência |
| Tendência | Cresce progressivamente ao longo das rodadas |
| Ciclicidade | Segue padrão senoidal (sobe e desce) |
| Tendência + Ciclicidade | Combinação ponderada dos dois perfis |

---

## Licença

Uso acadêmico. Todos os direitos reservados à UFU/FAGEN — PIVIC Nº 391/2025.
