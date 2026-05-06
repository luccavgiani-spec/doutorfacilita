# Doutor Facilita

Plataforma de telemedicina da nó. Atendimento médico por vídeo em até 10 minutos.

## Stack

- **Framework:** Next.js 15 (App Router) + TypeScript
- **Estilo:** Tailwind CSS v3 + CSS legado do protótipo (paleta Google + DM Sans + Caveat)
- **Backend:** Supabase (Postgres + Auth + Storage + Edge Functions) — projeto `tylpojscdbkzulykdguv` (sa-east-1)
- **Vídeo:** LiveKit Cloud (Build tier free → Ship $50/mês)
- **Prescrição:** Mevo (Receita Digital embedded)
- **Pagamento:** Mercado Pago
- **Deploy:** Vercel (https://vercel.com/luccavgiani-5948s-projects)

## Rotas

| Rota | Descrição | Auth |
|---|---|---|
| `/` | Landing page (mobile-first) | pública |
| `/fila` | Fila de espera do paciente | paciente |
| `/consulta` | Sala de videochamada do paciente | paciente |
| `/cockpit` | Cockpit do médico (desktop) | médico |

## Desenvolvimento

```bash
npm install
cp .env.example .env.local   # preencher chaves
npm run dev
```

Abre em http://localhost:3000

## Compliance

- **CFM 2.314/2022** — teleconsulta com termo de consentimento
- **CFM 1.821/2007 + Lei 13.787/2018** — prontuário eletrônico (retenção 20 anos)
- **LGPD** — paciente é titular, Doutor Facilita é controladora, Mevo é suboperadora
- **NGS2/SBIS-CFM** — trilha de auditoria append-only no Supabase

Detalhes na documentação interna do projeto.

## Estrutura

```
src/
├── app/
│   ├── layout.tsx           # root layout com fonts
│   ├── globals.css          # Tailwind v3 + CSS legado do protótipo
│   ├── page.tsx             # /
│   ├── fila/page.tsx        # /fila
│   ├── consulta/page.tsx    # /consulta
│   └── cockpit/page.tsx     # /cockpit
├── components/
│   ├── LPScreen.tsx
│   ├── FilaScreen.tsx
│   ├── ConsultaScreen.tsx
│   └── CockpitScreen.tsx
└── lib/                     # (a criar) clientes Supabase, LiveKit, Mevo
```
