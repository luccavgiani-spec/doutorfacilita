# C — Hero nova com vídeo, /login novo e atalho na tela do celular

> Build this with **tlc-implement**.
> Every criterion below becomes a check with a proof, referenced by its number. Nothing under
> `Unresolved` gets settled while building.

## Intent

A hero atual da home é só texto centralizado sobre o grid animado e não mostra o produto
(atendimento por vídeo). O `/login` é um split simples que não segue a identidade que o Lucca quer.
E no celular não há como o paciente voltar ao site sem digitar o endereço ou procurar no histórico —
quem precisa de um médico de novo tem que reencontrar o Plantão Digital.

Quando isto for entregue: a hero segue a referência 1 com um mockup de celular tocando o vídeo da
médica em loop, sobre o mesmo `ShapeGrid` animado; o `/login` segue a referência 2 no desktop e no
mobile, com o link "Esqueci minha senha?"; e no mobile a home tem uma barra que cria um atalho
"Plantão Digital", com a logo, na tela do celular.

27 critérios em 3 fatias · 1 one-way door · 5 em aberto, dos quais 1 bloqueia go-live

## Criteria

### Hero nova da home (referência 1)

1. Em ≥1024 px, a coluna esquerda da hero mostra: badge "Médicos online agora" com ponto verde pulsante; `<h1>` em duas linhas, "Seu médico," em `#0B1B3A` e "onde você estiver." em `#1E5AE8`; subtítulo "Consulta online por vídeo, com médicos de CRM ativo."; CTA pill azul com ícone de câmera "Iniciar consulta agora — R$ 39,90 →" que leva a `/login`; abaixo, cadeado + "Pagamento seguro e protegido".
2. Em ≥1024 px, a coluna direita mostra um mockup de celular cuja tela é o vídeo da médica, com o cabeçalho da tela exibindo a logo Plantão Digital e, na base, os botões desenhados microfone / encerrar (vermelho) / câmera; ao redor, três cards flutuantes com ícone — "Receita digital · enviada na hora", "Atestado · válido e seguro", "Pedido de exames · sem papel" — e a frase manuscrita "Cuidando de você, sempre." em Caveat azul.
3. O vídeo do mockup é um `<video>` com `autoPlay`, `muted`, `loop` e `playsInline`, sem atributo `controls`; toca sozinho ao carregar em desktop e em 375 px (Chrome Android e Safari iOS) e recomeça ao terminar.
4. O usuário não consegue pausar, dar play nem ativar som: não há controles visíveis, clicar/tocar no vídeo não muda o estado e o menu de contexto do vídeo fica desabilitado (`disablePictureInPicture`, `controlsList="nodownload nofullscreen noremoteplayback"`, sem `onClick` que pause).
5. O arquivo servido é `public/assets/hero-medica.mp4` gerado a partir do vídeo original (1916×1080, 8,04 s, 8,2 MB, sem áudio), recortado em retrato centrado na médica, sem faixa de áudio, H.264 `+faststart`, ≤ 2,5 MB; há um `poster` (`public/assets/hero-medica-poster.webp`, primeiro quadro) exibido até o vídeo começar.
6. Abaixo das colunas, uma faixa com três itens com ícone: "Atendimento 7h–23h · todos os dias", "CRM ativo · e atendimento seguro", "Equipe médica qualificada · e em constante avaliação".
7. Always, o `ShapeGrid` animado (`direction="diagonal"`, `speed={0.45}`, `squareSize={46}`, borda `rgba(30,90,232,0.14)`, hover `rgba(30,90,232,0.10)`) fica atrás de toda a hero e reage ao hover.
8. Em 375 px, a hero mostra badge, título, subtítulo e CTA primeiro, depois o mockup com o vídeo, e não há rolagem horizontal da página.

### `/login` novo (referência 2)

9. Em ≥1024 px, a coluna esquerda mostra: eyebrow "SAÚDE SEM COMPLICAÇÃO"; título "Cuidado médico" / "quando você" (Caveat, azul) / "mais precisa."; texto "Consultas online com médicos de verdade, na hora que você precisar, de onde estiver."; 4 itens com ícone — "Atendimento rápido · Consultas em até 10 minutos", "Médicos verificados · Com registro ativo e seguro", "Receita digital · Enviada na hora, direto no seu celular", "Seus dados protegidos · Totalmente seguros e em conformidade com a LGPD"; card de prova social com 4 avatares, 5 estrelas e "+12.400 consultas realizadas com qualidade e segurança."; foto da médica (quadro do mesmo vídeo) sobre círculo azul com "Sua saúde em boas mãos" manuscrito.
10. O card de acesso mostra: logo; "Acesse sua conta"; "Entre para iniciar sua consulta e cuidar da sua saúde."; segmento "Entrar" (ativo, azul) | "Criar conta"; campo "E-mail" com ícone de envelope e placeholder "seu@email.com"; campo "Senha" com ícone de cadeado, placeholder "Digite sua senha" e botão de olho que alterna mostrar/ocultar; link "Esqueci minha senha?" → `/esqueci-senha`; botão "Entrar →"; divisor "Primeira vez por aqui?"; botão contorno "Criar minha conta" com ícone; linha de 3 selos "Seus dados protegidos" · "Atendimento rápido" · "Receita digital válida".
11. Quando o usuário clica no segmento "Criar conta" ou em "Criar minha conta", vai para `/cadastrar`.
12. Com credenciais válidas vai para `/login/redirect`; com inválidas vê "Email ou senha inválidos" e os campos com borda de erro; durante o envio o botão mostra "Entrando..." desabilitado.
13. Em 375 px, `/login` mostra só o card de acesso (sem coluna de marketing e sem foto), com todos os elementos de 10, sem rolagem horizontal.
14. A barra superior mantém logo à esquerda e "Não tem conta? Cadastre-se" → `/cadastrar` à direita.
15. Always, `/cadastrar` e `/trocar-senha` renderizam igual a hoje — compartilham as classes `auth-*` de `globals.css` com o `LoginForm` (112 usos no `CadastroWizard`).

### Atalho na tela do celular

16. Em < 768 px, a home mostra no topo, acima da navegação, uma barra promocional "Tenha o Plantão Digital na tela do seu celular" com o link "Adicionar atalho"; em ≥ 768 px a barra não é renderizada.
17. O site publica um web app manifest com `name` e `short_name` "Plantão Digital", `start_url` "/", `display` "standalone", `theme_color` "#1E5AE8", `background_color` "#FFFFFF" e ícones PNG 192×192 e 512×512 (um deles `purpose: "maskable"`) gerados da logo `public/assets/logo-plantao-digital.jpg`; o `<head>` tem `apple-touch-icon` 180×180 da mesma logo e `apple-mobile-web-app-title` "Plantão Digital".
18. Dado Chrome/Edge/Samsung Internet no Android com o evento `beforeinstallprompt` disponível, quando o usuário toca "Adicionar atalho", então abre o diálogo nativo de instalação; aceito, aparece na tela inicial um ícone com a logo chamado "Plantão Digital" que abre `https://www.meuplantaodigital.com/`.
19. Dado Safari no iOS (sem API de instalação), quando o usuário toca "Adicionar atalho", então aparece uma instrução com os passos "Toque em Compartilhar" e "Adicionar à Tela de Início"; seguidos os passos, o ícone usa a logo e se chama "Plantão Digital".
20. Dado qualquer outro navegador móvel sem `beforeinstallprompt`, quando o usuário toca "Adicionar atalho", então vê "Abra o menu do navegador e escolha 'Adicionar à tela inicial'".
21. Enquanto o site está aberto pelo atalho (`display-mode: standalone` ou `navigator.standalone`), a barra não aparece.
22. Quando o usuário toca "×" na barra, ela some e não reaparece nesse navegador (chave em `localStorage`, leitura/escrita em try/catch — sem storage, a barra apenas reaparece no próximo acesso).
23. Quando o navegador dispara `appinstalled`, a barra some.
24. Always, a barra não empurra a hero para rolagem horizontal em 375 px e não cobre o CTA.

## Out of scope

- Service worker / uso offline — o pedido é um atalho, não um app offline. Se o Chrome atual exigir service worker para disparar `beforeinstallprompt`, parar e perguntar (vira dependência nova).
- Rotas `/esqueci-senha` e `/redefinir-senha` — task A; aqui só o link. **Merge A antes de C.**
- Linha "Ao continuar, você concorda com nossos Termos de Uso e Política de Privacidade" — as páginas não existem; omitida.
- Nome/CRM de médico no mockup — nenhum nome ou número de CRM é exibido.
- Nav e demais seções da LP — inalteradas.

## Observable

| Surface | Decision | Landing |
| --- | --- | --- |
| screen home · hero | desktop | 1, 2, 6, 7 |
| screen home · hero | mobile | 8 · posição dos cards flutuantes no mobile: Unresolved 3 |
| screen home · hero | loading do vídeo | 5 (poster) |
| screen home · hero | vídeo não carrega | 5 (poster permanece) |
| screen `/login` | desktop | 9, 10, 14 |
| screen `/login` | mobile | 13 |
| screen `/login` | error / loading | 12 |
| screen `/login` | usuário já logado | existing - `login/page.tsx` redireciona médico → `/cockpit`, paciente → `/fila` |
| copy `/login` prova social | número / avatares | Unresolved 1 |
| screen home · barra de atalho | exibição por dispositivo | 16, 21 |
| screen home · barra de atalho | ação por navegador | 18, 19, 20 |
| screen home · barra de atalho | dispensar | 22, 23 |
| screen home · barra de atalho | copy | Unresolved 4 |
| manifest | nome / ícone / abertura | 17 |

## Swept

- validation: existing - `LoginForm` (email/senha obrigatórios)
- failure modes: 5 (vídeo falha → poster); 20 (sem API de instalação); 22 (storage indisponível)
- idempotency and retry: 22, 23 (barra não reaparece após dispensar/instalar)
- authorization: n/a - páginas públicas
- concurrency and ordering: n/a - sem escrita concorrente
- data lifecycle: 22 (única persistência: chave de dispensa no `localStorage`)
- external-dependency failure: 20 (navegador sem suporte)
- state transitions: n/a - nenhum ciclo de vida de dados muda
- observability: Unresolved 5

## Impact

| Front | What changes |
|---|---|
| UI | `Hero()` de `src/components/LandingPage.tsx` substituída; `ShapeGrid.tsx` reutilizado sem alteração |
| UI | `src/components/auth/LoginForm.tsx` reescrito; classes `auth-*` compartilhadas — ver 15 |
| assets | novos `public/assets/hero-medica.mp4`, `hero-medica-poster.webp`, foto do `/login` (quadro do vídeo), ícones PNG do manifest e `apple-touch-icon` |
| head | `src/app/layout.tsx` ganha manifest, `apple-touch-icon`, `apple-mobile-web-app-title`, `theme-color` (App Router: `app/manifest.ts` e `metadata`) |
| performance | vídeo de ≤ 2,5 MB acima da dobra; `preload="metadata"` + poster para não travar o LCP |

## Decided

| Decision | Shape | Alternative rejected |
|---|---|---|
| Identidade do atalho instalado | manifest `name`/`short_name` "Plantão Digital", `start_url` "/", `display` "standalone", ícones da logo | `display: "browser"`: o Chrome não oferece instalação sem `standalone`/`minimal-ui`. Uma vez instalado, nome e ícone ficam no celular do paciente — mudar depois exige reinstalação no iOS |

## Sources

- `.tasks/refs/hero-referencia.webp` — **binding para a interface** da hero (1–8); cópia transcrita nos critérios. Imagem do médico substituída pelo vídeo.
- `.tasks/refs/login-referencia.webp` — **binding para a interface** do `/login` desktop e mobile (9–14); cópia transcrita nos critérios.
- Vídeo original: `C:\Users\lucca\Downloads\hf_20260723_084529_2d0c1d72-8b75-42e2-a83f-8f0b8ae35444.mp4` (médica de jaleco em consultório, câmera fixa, sem áudio).
- Respostas do Lucca (2026-09-29, chat), literais: "no lugar da imagem da hero, pensei em utilizar o video em mp4 dentro do mockup. tanto na versao desktop, quanto mobile. Em autoplay, loop, e sem controles disponiveis para o usuario (play, pause, mute)." · "divergencia na ref 1 e 2: prossiga como voce mencionou em ambas." (→ "7h–23h" e "iniciar sua consulta") · "na versao mobile, quero criar na home page, talvez como uma barra de avisos promocional, um hyperlink que cria um atalho no celular do usuario para abrir o site diretamente. O ícone do celular do usuario tem que ser a logo do meu plantao digital, e se chamar 'Plantão Digital'."

This task is the record of decision. If a linked document diverges, ask before building.

## Unresolved

| # | Kind | Question | Until answered |
|---|---|---|---|
| 1 | blocks go-live | Número e avatares da prova social do `/login` são fictícios (referência: "Mais de 50 mil"). | Escrito no meio-tempo: "+12.400", mesmo número (também fictício) da LP, avatares no padrão da LP |
| 2 | open | Foto do `/login` desktop não foi respondida | Escrito no meio-tempo: quadro do próprio vídeo da hero (mesma médica), recortado |
| 3 | open | Layout da hero em 375 px sem referência | Escrito no meio-tempo: texto+CTA → mockup → cards flutuantes empilhados abaixo → faixa inferior empilhada |
| 4 | open | Copy da barra de atalho | Escrito no meio-tempo: textos de 16, 19, 20 |
| 5 | open | Medir cliques em "Adicionar atalho" / instalações (GTM/Meta já instalados)? | Nada instrumentado |
