# C — Hero com vídeo, /login novo e atalho na tela do celular

Profile: `light` (o repo não declara `## tlc-implement`; default). Handoff: on — 1 lote só (ver Handoff).

Sources:

- `.tasks/C-hero-login-atalho.md` — record of decision: critérios 1–24, fora de escopo, Unresolved 1–5 (valores "escrito no meio-tempo" usados, nenhum decidido aqui)
- `.tasks/refs/hero-referencia.webp` — **binding para a interface**: hero da home (critérios 1–8). Aberta e vista.
- `.tasks/refs/login-referencia.webp` — **binding para a interface**: `/login` desktop e mobile (critérios 9–14). Aberta e vista.
- vídeo original `C:\Users\lucca\Downloads\hf_20260723_084529_2d0c1d72-8b75-42e2-a83f-8f0b8ae35444.mp4` — 1916×1080, 8,04 s, 8.225.819 B, só stream de vídeo (ffprobe)
- docs oficiais consultadas (2026-09-29): web.dev/articles/install-criteria (critérios do Chrome para `beforeinstallprompt`: name/short_name, ícones 192 e 512, start_url, display standalone/fullscreen/minimal-ui/window-controls-overlay, HTTPS, engajamento de 1 toque + 30 s — **sem service worker**); developer.chrome.com/blog/update-install-criteria (exigência de fetch handler removida no Chrome 108 mobile / 112 desktop); MDN Making_PWAs_installable ("While not a requirement for a PWA to be installable…" sobre service worker); nextjs.org `app/manifest.ts` e `metadata.appleWebApp` / `viewport.themeColor`

## Out of scope

- Service worker / offline — docs acima: não é critério de instalação no Chrome atual; nada a parar.
- `/esqueci-senha` e `/redefinir-senha` — task A; aqui só o link (merge A antes de C).
- Linha de Termos/Privacidade do card — páginas não existem.
- Nome/CRM no mockup — não exibido.
- Nav e demais seções da LP — inalteradas.
- Instrumentação de cliques/instalações (Unresolved 5) — nada instrumentado.

## Landing

Toca `LandingPage.tsx` (`Hero()` reescrita no mesmo arquivo, reusa `Arrow`, `fadeUp`, `stagger`, `ShapeGrid`),
novo `lp/InstallBar.tsx`, `lp/avatars.tsx` (extraído da LP sem mudar render, reusado no /login),
`auth/LoginForm.tsx` reescrito só com Tailwind (não altera nenhuma regra `auth-*` usada por cadastro/trocar-senha;
remove apenas o bloco `.auth-split*`/`.auth-main--split`, exclusivo do /login), `app/manifest.ts`, `app/apple-icon.png`, `layout.tsx`.

| One-way door | Literal shape | Alternative rejected |
| --- | --- | --- |
| Identidade do atalho instalado (decidida na task) | manifest `name`/`short_name` "Plantão Digital", `start_url` "/", `id` "/", `display` "standalone", ícones da logo | `display: "browser"` — Chrome não oferece instalação |
| Captura de `beforeinstallprompt` antes da hidratação | script inline `beforeInteractive` no root layout guarda o evento em `window.__pdInstallPrompt` (com `preventDefault`) e emite `pd:installprompt` | listener só no `useEffect` da barra — perde o evento quando o Chrome dispara antes da hidratação |
| Chave de dispensa no `localStorage` | `pd-atalho-dispensado` = `"1"` (também gravada em `appinstalled`) | cookie — seria enviado em toda request sem necessidade |

- Nada mais aqui é difícil de reverter.

## Checks

Não há runner de testes no repo (package.json: dev/build/lint/type-check). Proofs ficam no teto do projeto:
comandos de shell (ffprobe/curl) e asserções JS no navegador embutido em `http://localhost:3103`
(`npx next dev -p 3103`), cada uma com o valor esperado escrito aqui.

### S1 — Hero nova (ref. 1) · LandingPage.tsx 48 KB + ShapeGrid 14 KB + assets · ~16k

**C1** — ≥1024 px coluna esquerda: badge "Médicos online agora" com ponto verde `animate-ping`; `h1` com "Seu médico," (`#0B1B3A`) e "onde você estiver." (`#1E5AE8`) em duas linhas; subtítulo; CTA `a[href="/login"]` com svg câmera e texto "Iniciar consulta agora — R$ 39,90"; cadeado + "Pagamento seguro e protegido".
Proof: browser 1280×800 — `document.querySelector('[data-hero-copy]')` contém os textos; `getComputedStyle` das duas linhas do h1 = `rgb(11, 27, 58)` / `rgb(30, 90, 232)`; os dois spans com `display:block`.

**C2** — ≥1024 px coluna direita: `[data-hero-phone]` contém `video`, cabeçalho com logo Plantão Digital e 3 botões desenhados (mic / encerrar vermelho / câmera); 3 cards "Receita digital · enviada na hora", "Atestado · válido e seguro", "Pedido de exames · sem papel", cada um com svg; frase "Cuidando de você, sempre." com `font-family` Caveat e cor azul. Coluna direita à direita da esquerda (bounding boxes).
Proof: browser 1280×800 — asserções de presença/containment/ordem por `data-*`.

**C3** — `video` com `autoplay`, `muted`, `loop`, `playsinline`, sem `controls`; toca sozinho (`!paused`, `currentTime` avança) em 1280 e 375 e recomeça ao terminar (`loop === true`).
Proof: browser — `v.paused===false && v.muted && v.loop && !v.controls && v.hasAttribute('playsinline')`; `currentTime` medido 2× com 1 s de diferença aumenta. Safari iOS real: não verificável aqui (sem dispositivo) — registrado como pendência.

**C4** — Sem controle pelo usuário: `disablePictureInPicture`, `controlsList="nodownload nofullscreen noremoteplayback"`, sem `onClick`; clique no vídeo não pausa; `contextmenu` no vídeo é cancelado.
Proof: browser — atributos lidos; `elementFromPoint` no centro do vídeo + clique → `paused` segue `false`; `dispatchEvent(new MouseEvent('contextmenu',{cancelable:true}))` retorna `false` (defaultPrevented).

**C5** — `public/assets/hero-medica.mp4`: 1 stream só (vídeo), h264, retrato (altura > largura), duração ≈ 8,04 s, `moov` antes de `mdat` (faststart), ≤ 2.621.440 B; `poster="/assets/hero-medica-poster.webp"` presente (1º quadro).
Proof: `ffprobe -v error -show_entries stream=codec_type,codec_name,width,height:format=duration,size,nb_streams -of compact public/assets/hero-medica.mp4` · faststart: `node -e` lendo o arquivo e comparando `indexOf('moov') < indexOf('mdat')` · poster: atributo lido no browser.

**C6** — Faixa abaixo das colunas com 3 itens com svg: "Atendimento 7h–23h · todos os dias", "CRM ativo · e atendimento seguro", "Equipe médica qualificada · e em constante avaliação"; abaixo (top maior) das duas colunas.
Proof: browser 1280 — `[data-hero-strip]` textos + `getBoundingClientRect().top` > bottom de `[data-hero-copy]`.

**C7** — `ShapeGrid` com `direction="diagonal"`, `speed={0.45}`, `squareSize={46}`, `borderColor="rgba(30,90,232,0.14)"`, `hoverFillColor="rgba(30,90,232,0.10)"` atrás de toda a hero (canvas `absolute inset-0` cobrindo a `section`) e recebendo hover.
Proof: `grep -n -A8 "<ShapeGrid" src/components/LandingPage.tsx` · browser: canvas rect == section rect; nenhum overlay com `pointer-events` acima do canvas fora do conteúdo (hover ativo em área vazia: `elementFromPoint` em área vazia da hero devolve o canvas ou elemento `pointer-events:none`-transparente cujo alvo é a section — ShapeGrid escuta `mousemove` na própria canvas/section).

**C8** — 375 px: ordem badge → h1 → subtítulo → CTA → mockup com vídeo; `scrollWidth <= clientWidth` do documento.
Proof: browser mobile preset — tops crescentes; `document.documentElement.scrollWidth === 375`.

### S2 — /login novo (ref. 2) · LoginForm 5 KB + globals.css (bloco auth) + avatars · ~10k

**C9** — ≥1024 px coluna esquerda: eyebrow "SAÚDE SEM COMPLICAÇÃO"; título "Cuidado médico" / "quando você" (Caveat, azul) / "mais precisa."; texto; 4 itens com svg (títulos e descrições do critério 9); card com 4 avatares, 5 estrelas e "+12.400 consultas realizadas com qualidade e segurança."; `img` `/assets/login-medica.webp` sobre círculo azul com "Sua saúde em boas mãos" em Caveat.
Proof: browser 1280 — `[data-login-marketing]` textos, contagens (4 itens, 4 avatares, 5 estrelas), font-family Caveat.

**C10** — Card: logo; "Acesse sua conta"; subtítulo; segmento "Entrar" (ativo, fundo azul) | "Criar conta"; campo "E-mail" com svg envelope e placeholder `seu@email.com`; "Senha" com svg cadeado, placeholder `Digite sua senha` e botão olho que alterna `type` password↔text; link "Esqueci minha senha?" `href="/esqueci-senha"`; botão "Entrar" com seta; divisor "Primeira vez por aqui?"; botão contorno "Criar minha conta" com svg; 3 selos.
Proof: browser — asserções por `data-login-card`; clique no olho → `input#password.type === 'text'`, de novo → `'password'`.

**C11** — "Criar conta" (segmento) e "Criar minha conta" são `a[href="/cadastrar"]`.
Proof: browser — `href` lidos.

**C12** — Credenciais inválidas → "Email ou senha inválidos" (`role=alert`) e inputs com `aria-invalid="true"` e borda `rgb(239, 68, 68)`; durante envio o botão mostra "Entrando..." e `disabled`; válidas → `router.push('/login/redirect')` (código preservado).
Proof: browser — submit com `teste-invalido@example.com`/`senhaerrada123`; `MutationObserver` registra texto "Entrando..." + disabled; depois alerta + bordas. Válidas: `grep -n "login/redirect" src/components/auth/LoginForm.tsx` (sem conta de teste; não logamos).

**C13** — 375 px: só o card (`[data-login-marketing]` com `display:none`, sem `img` da médica visível), todos os elementos de C10 visíveis, `scrollWidth === 375`.
Proof: browser mobile preset.

**C14** — Barra superior: logo à esquerda (`a[href="/"]`) e "Não tem conta? Cadastre-se" `href="/cadastrar"` à direita.
Proof: browser — rects (logo.left < link.left) e href.

**C15** — `/cadastrar` e `/trocar-senha` iguais a antes: nenhuma regra `auth-*` que eles usam mudou.
Proof: `git diff main -- src/app/globals.css` só remove seletores `.auth-split*`/`.auth-main--split`; `grep -rn "auth-split\|auth-main--split" src` → 0 ocorrências; screenshots antes (main) × depois das duas rotas em 1280 e 375 idênticos por inspeção.

### S3 — Atalho na tela do celular · InstallBar novo + manifest + layout · ~5k

**C16** — < 768 px: barra "Tenha o Plantão Digital na tela do seu celular" + botão "Adicionar atalho" acima do `header` da nav; ≥ 768 px: `[data-install-bar]` ausente do DOM.
Proof: browser 375 — bar.top < header.top; 1280 — `querySelector('[data-install-bar]') === null`.

**C17** — `/manifest.webmanifest` com `name`/`short_name` "Plantão Digital", `start_url` "/", `display` "standalone", `theme_color` "#1E5AE8", `background_color` "#FFFFFF", ícones PNG 192×192 e 512×512 (um `purpose: "maskable"`) gerados da logo; `<head>` com `link[rel=manifest]`, `apple-touch-icon` 180×180 e `meta[name=apple-mobile-web-app-title]` "Plantão Digital".
Proof: `curl -s localhost:3103/manifest.webmanifest` + `node -e` assert · `ffprobe` das dimensões dos PNG · `curl -s localhost:3103/ | grep -o '<link rel="manifest"[^>]*>\|<link rel="apple-touch-icon"[^>]*>\|<meta name="apple-mobile-web-app-title"[^>]*>'`.

**C18** — Com `beforeinstallprompt` disponível, tocar "Adicionar atalho" chama `prompt()` do evento guardado.
Proof: browser 375 — dispara um `Event('beforeinstallprompt')` sintético com `prompt` espião e `userChoice` resolvido; clique → espião chamado. Diálogo nativo/ícone na tela inicial: só em Android real — pendência de QA manual.

**C19** — iOS Safari (UA iPhone Safari, sem `beforeinstallprompt`): clique mostra instrução com "Toque em Compartilhar" e "Adicionar à Tela de Início".
Proof: browser 375 — `Object.defineProperty(navigator,'userAgent',{value:'<UA iPhone Safari 17>'})` e clique (o modo é decidido no clique, não no mount) → os dois passos presentes.

**C20** — Outro navegador móvel sem o evento: clique mostra "Abra o menu do navegador e escolha 'Adicionar à tela inicial'".
Proof: browser 375 (UA Android Chrome do preset, sem evento) — texto presente após clique.

**C21** — Em `display-mode: standalone` ou `navigator.standalone === true`, barra ausente.
Proof: browser 375 — `Object.defineProperty(navigator,'standalone',{value:true})`, remonta a home por navegação client-side (clique em link `/login`, depois `history.back()`) → `[data-install-bar]` ausente; `display-mode` por leitura: `grep -n "display-mode: standalone" src/components/lp/InstallBar.tsx`.

**C22** — "×" esconde a barra e grava `localStorage['pd-atalho-dispensado']='1'`; após reload continua ausente; acesso ao storage em try/catch.
Proof: browser 375 — clique no × → barra ausente, chave = "1", reload → ausente; `grep -n "try" src/components/lp/InstallBar.tsx`.

**C23** — `appinstalled` esconde a barra.
Proof: browser 375 (chave limpa) — `window.dispatchEvent(new Event('appinstalled'))` → barra ausente.

**C24** — Com a barra, 375 px sem rolagem horizontal e CTA da hero não coberto (barra no fluxo, não `fixed`, e CTA abaixo dela).
Proof: browser 375 — `scrollWidth === 375`; `getComputedStyle(bar).position !== 'fixed'`; `elementFromPoint` no centro do CTA devolve o CTA (ou descendente).

## Swept

- validation: existing — `LoginForm` (campos `required`, supabase rejeita vazio → mesma mensagem)
- failure modes: C5 (poster), C20, C22 (storage indisponível → barra reaparece)
- idempotency: C22, C23
- authorization: n/a — páginas públicas; redirect de logado segue em `login/page.tsx` (inalterado)
- concurrency: n/a
- data lifecycle: C22 (única persistência)
- dependency failure: C20
- state transitions: n/a
- observability: Unresolved 5 — nada instrumentado

## Handoff

S1 ~16k + S2 ~10k + S3 ~5k ≈ 31k de leitura, bem abaixo de 150k → um lote só, sem handoff. Verifier independente depois do último commit.
