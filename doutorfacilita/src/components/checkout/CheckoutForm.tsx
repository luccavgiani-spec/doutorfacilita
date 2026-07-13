"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Logo } from "@/components/Logo";

import { prepararConsulta } from "@/app/checkout/actions";
import {
  ensureDeviceId,
  ensureMpSdk,
  pollUntilPaid,
  processCard,
  processPix,
  type ProcessResult,
} from "@/lib/payments/mercadopago";

type PaymentMethod = "pix" | "card";

interface Props {
  mpPublicKey: string;
  patientName: string;
  patientEmail: string;
  patientCpf: string;
}

// Singleton em variável de módulo: sobrevive ao double-mount do StrictMode e
// evita "Cardform already instantiated".
// deno-lint-ignore no-explicit-any
const cardFormSingleton: { instance: any | null } = { instance: null };

function centsToBRL(cents: number): string {
  return (cents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

/** Extrai uma mensagem legível de um erro do SDK do Mercado Pago. */
function mpErrorMessage(err: unknown): string {
  const arr = Array.isArray(err) ? err : [err];
  const msg = arr
    // deno-lint-ignore no-explicit-any
    .map((e: any) => e?.message ?? e?.description ?? e?.cause)
    .filter(Boolean)
    .join(" · ");
  return msg || "Não foi possível validar o cartão. Confira os dados.";
}

export default function CheckoutForm({
  mpPublicKey,
  patientName,
  patientEmail,
  patientCpf,
}: Props) {
  const router = useRouter();
  const cpfDigits = patientCpf.replace(/\D/g, "");

  const [method, setMethod] = useState<PaymentMethod>("pix");
  const [prep, setPrep] = useState<{ consultationId: string; amountCents: number } | null>(null);
  const [prepError, setPrepError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);
  const [cardReady, setCardReady] = useState(false);

  const [pix, setPix] = useState<{ qr: string; qrBase64: string | null } | null>(null);
  const [pixCopied, setPixCopied] = useState(false);
  const [challenge, setChallenge] = useState<{ url: string } | null>(null);

  const deviceIdRef = useRef<string | undefined>(undefined);
  const prepRef = useRef(prep);
  prepRef.current = prep;

  // ─── 1. Prepara a consulta pendente (id + valor) ────────────────────
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const r = await prepararConsulta();
      if (cancelled) return;
      if ("error" in r) setPrepError(r.error);
      else setPrep(r);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // Device fingerprint cedo (assíncrono).
  useEffect(() => {
    ensureDeviceId().then((id) => {
      deviceIdRef.current = id;
    });
  }, []);

  // ─── Resultado comum de um pagamento ────────────────────────────────
  const handleResult = useCallback(
    async (res: ProcessResult, consultationId: string) => {
      if (res.status === "approved") {
        router.push(`/fila?consultation=${consultationId}`);
        router.refresh();
        return;
      }
      if (res.status === "challenge") {
        setChallenge({ url: res.three_ds.url });
        const paid = await pollUntilPaid(consultationId, { timeoutMs: 5 * 60_000 });
        if (paid) {
          router.push(`/fila?consultation=${consultationId}`);
          router.refresh();
        } else {
          setChallenge(null);
          setError("Não confirmamos a autenticação do cartão. Tente novamente.");
          setProcessing(false);
        }
        return;
      }
      if (res.status === "pending" && res.metodo === "pix") {
        setPix({ qr: res.qr_code ?? "", qrBase64: res.qr_code_base64 ?? null });
        setProcessing(false);
        const paid = await pollUntilPaid(consultationId, { timeoutMs: 30 * 60_000 });
        if (paid) {
          router.push(`/fila?consultation=${consultationId}`);
          router.refresh();
        }
        return;
      }
      if (res.status === "rejected") {
        setError("Pagamento recusado. Tente outro cartão ou use PIX.");
        setProcessing(false);
        return;
      }
      if (res.status === "error") {
        setError(
          res.naoConfigurada
            ? "Pagamento indisponível no momento (aguardando configuração)."
            : res.message || "Falha ao processar o pagamento.",
        );
        setProcessing(false);
        return;
      }
      setError("Pagamento em análise. Você será avisado assim que for aprovado.");
      setProcessing(false);
    },
    [router],
  );

  // Envia o cartão: fonte da verdade do token é getCardFormData() (o 2º arg do
  // onCardTokenReceived varia de formato entre versões do SDK).
  const submitCard = useCallback(async () => {
    const cf = cardFormSingleton.instance;
    const current = prepRef.current;
    if (!cf || !current) {
      setProcessing(false);
      return;
    }
    const d = cf.getCardFormData();
    if (!d?.token) {
      setError("Não foi possível validar o cartão. Confira os dados.");
      setProcessing(false);
      return;
    }
    const res = await processCard({
      consultationId: current.consultationId,
      token: d.token,
      paymentMethodId: d.paymentMethodId,
      issuerId: d.issuerId,
      installments: Number(d.installments) || 1,
      deviceId: deviceIdRef.current,
    });
    await handleResult(res, current.consultationId);
  }, [handleResult]);

  // ─── 2. cardForm (só na aba cartão, com consulta pronta) ────────────
  useEffect(() => {
    if (method !== "card" || !prep || !mpPublicKey || challenge) return;
    let cancelled = false;
    setCardReady(false);

    (async () => {
      await ensureMpSdk();
      if (cancelled) return;

      // Tripla checagem antes de instanciar.
      const form = document.getElementById("mp-form");
      const number = document.getElementById("mp-cardNumber");
      if (!form || !number || number.getBoundingClientRect().width <= 0) return;

      if (cardFormSingleton.instance) {
        try {
          cardFormSingleton.instance.unmount();
        } catch { /* noop */ }
        cardFormSingleton.instance = null;
      }

      // deno-lint-ignore no-explicit-any
      const MP = (window as any).MercadoPago;
      const mp = new MP(mpPublicKey, { locale: "pt-BR" });
      const amountReais = (prep.amountCents / 100).toFixed(2);

      const cardForm = mp.cardForm({
        amount: amountReais,
        iframe: true,
        form: {
          id: "mp-form",
          cardNumber: { id: "mp-cardNumber", placeholder: "0000 0000 0000 0000" },
          expirationDate: { id: "mp-expirationDate", placeholder: "MM/AA" },
          securityCode: { id: "mp-securityCode", placeholder: "123" },
          cardholderName: { id: "mp-cardholderName", placeholder: "Como está no cartão" },
          issuer: { id: "mp-issuer" },
          installments: { id: "mp-installments" },
          identificationType: { id: "mp-identificationType" },
          identificationNumber: { id: "mp-identificationNumber", placeholder: "Somente números" },
          cardholderEmail: { id: "mp-cardholderEmail" },
        },
        callbacks: {
          onFormMounted: (err: unknown) => {
            if (err) {
              console.error("[mp] onFormMounted", err);
              setError("Não foi possível carregar o formulário do cartão.");
            } else {
              setCardReady(true);
            }
          },
          onSubmit: (event: Event) => {
            event.preventDefault();
            setError(null);
            setProcessing(true);
          },
          onCardTokenReceived: (err: unknown) => {
            if (err) {
              console.error("[mp] onCardTokenReceived", err);
              setError(mpErrorMessage(err));
              setProcessing(false);
              return;
            }
            void submitCard();
          },
          onError: (err: unknown) => {
            console.error("[mp] onError", err);
            setError(mpErrorMessage(err));
            setProcessing(false);
          },
        },
      });

      cardFormSingleton.instance = cardForm;
    })();

    return () => {
      cancelled = true;
      if (cardFormSingleton.instance) {
        try {
          cardFormSingleton.instance.unmount();
        } catch { /* noop */ }
        cardFormSingleton.instance = null;
      }
    };
  }, [method, prep, mpPublicKey, challenge, submitCard]);

  function switchMethod(m: PaymentMethod) {
    setMethod(m);
    setError(null);
  }

  async function onPixClick() {
    if (!prep) return;
    setError(null);
    setProcessing(true);
    const res = await processPix(prep.consultationId);
    await handleResult(res, prep.consultationId);
  }

  async function copyPix() {
    if (!pix?.qr) return;
    try {
      await navigator.clipboard.writeText(pix.qr);
      setPixCopied(true);
      setTimeout(() => setPixCopied(false), 2500);
    } catch { /* clipboard bloqueado */ }
  }

  const cardDisabled = !mpPublicKey;

  return (
    <div className="auth-shell">
      <header className="auth-top">
        <div className="auth-top-inner">
          <Link href="/" style={{ textDecoration: "none" }}>
            <Logo size={30} />
          </Link>
          <div className="auth-top-link"><b>{patientName}</b></div>
        </div>
        <div className="bar4"><span></span><span></span><span></span><span></span></div>
      </header>

      <main className="auth-main auth-main--checkout">
        <div className="checkout-grid">
          {/* Coluna pagamento */}
          <div className="auth-card auth-card--wide">
            <span className="auth-eyebrow">pagamento</span>
            <h1 className="auth-h1">Finalize sua compra</h1>
            <p className="auth-sub">
              Escolha como pagar. Assim que a confirmação cair, você entra na
              fila e é atendido em até 10 minutos.
            </p>

            {prepError && <div role="alert" className="auth-alert">{prepError}</div>}

            <div className="checkout-tabs" role="tablist" aria-label="Forma de pagamento">
              <button
                type="button" role="tab" aria-selected={method === "pix"}
                className={`checkout-tab ${method === "pix" ? "is-active" : ""}`}
                onClick={() => switchMethod("pix")}
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" />
                  <rect x="3" y="14" width="7" height="7" rx="1" /><line x1="14" y1="14" x2="21" y2="14" />
                  <line x1="14" y1="17" x2="17" y2="17" /><line x1="20" y1="20" x2="21" y2="20" />
                </svg>
                <span>PIX</span>
                <span className="checkout-tab-tag">aprovação na hora</span>
              </button>
              <button
                type="button" role="tab" aria-selected={method === "card"}
                className={`checkout-tab ${method === "card" ? "is-active" : ""}`}
                onClick={() => switchMethod("card")}
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="2" y="5" width="20" height="14" rx="2" ry="2" /><line x1="2" y1="10" x2="22" y2="10" />
                </svg>
                <span>Cartão de crédito</span>
                <span className="checkout-tab-tag">crédito à vista ou parcelado</span>
              </button>
            </div>

            {/* ─── 3DS challenge (iframe) ─── */}
            {challenge && (
              <div className="checkout-3ds">
                <div className="checkout-3ds-head">
                  <span className="checkout-spinner" aria-hidden />
                  <p>Autenticação do seu banco. Conclua abaixo sem fechar a página.</p>
                </div>
                <iframe title="Autenticação 3-D Secure" src={challenge.url} className="checkout-3ds-frame" />
              </div>
            )}

            {/* ─── PIX ─── */}
            {!challenge && method === "pix" && (
              !pix ? (
                <div className="checkout-panel">
                  <div className="checkout-panel-icon checkout-panel-icon--pix">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" />
                      <rect x="3" y="14" width="7" height="7" rx="1" /><line x1="14" y1="14" x2="21" y2="14" />
                    </svg>
                  </div>
                  <h3 className="checkout-panel-title">Pague com PIX</h3>
                  <p className="checkout-panel-text">
                    Geramos um QR Code na hora. Você tem até <b>30 minutos</b> para
                    pagar no app do seu banco — a confirmação cai em segundos e
                    você entra na fila automaticamente.
                  </p>
                  <button
                    type="button" onClick={onPixClick} disabled={!prep || processing}
                    className="auth-button auth-button--success auth-button--block"
                  >
                    {processing ? "Gerando QR…" : "Gerar QR Code PIX"}
                  </button>
                </div>
              ) : (
                <div className="checkout-panel">
                  {pix.qrBase64 ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={`data:image/png;base64,${pix.qrBase64}`}
                      alt="QR Code PIX" className="checkout-pix-img" width={210} height={210}
                    />
                  ) : (
                    <p className="checkout-panel-text">QR indisponível — use o código copia-e-cola.</p>
                  )}
                  <h3 className="checkout-panel-title">Escaneie ou copie o código</h3>
                  {pix.qr && <div className="checkout-pix-code">{pix.qr}</div>}
                  <button type="button" onClick={copyPix} className="auth-button auth-button--primary auth-button--block">
                    {pixCopied ? "✓ Código copiado" : "Copiar código PIX"}
                  </button>
                  <div className="checkout-wait">
                    <span className="checkout-spinner" aria-hidden />
                    Aguardando pagamento… você vai para a fila automaticamente.
                  </div>
                </div>
              )
            )}

            {/* ─── Cartão (mp.cardForm) ─── */}
            {!challenge && method === "card" && (
              <>
                {cardDisabled && (
                  <div role="alert" className="auth-alert">
                    Pagamento por cartão indisponível (chave pública não configurada). Use PIX.
                  </div>
                )}
                <form id="mp-form" className="checkout-card-form" style={cardDisabled ? { opacity: 0.5, pointerEvents: "none" } : undefined}>
                  <div className="auth-field">
                    <label className="auth-label">Número do cartão</label>
                    <div id="mp-cardNumber" className="auth-input mp-secure-field" />
                  </div>

                  <div className="auth-row-2">
                    <div className="auth-field">
                      <label className="auth-label">Validade</label>
                      <div id="mp-expirationDate" className="auth-input mp-secure-field" />
                    </div>
                    <div className="auth-field">
                      <label className="auth-label">CVV</label>
                      <div id="mp-securityCode" className="auth-input mp-secure-field" />
                    </div>
                  </div>

                  <div className="auth-field">
                    <label className="auth-label">Nome impresso no cartão</label>
                    <input id="mp-cardholderName" type="text" className="auth-input" defaultValue={patientName} />
                  </div>

                  <div className="auth-row-2">
                    <div className="auth-field auth-field--doc-type">
                      <label className="auth-label">Documento</label>
                      <select id="mp-identificationType" className="auth-select" />
                    </div>
                    <div className="auth-field">
                      <label className="auth-label">CPF do titular</label>
                      <input id="mp-identificationNumber" type="text" className="auth-input" defaultValue={cpfDigits} inputMode="numeric" />
                    </div>
                  </div>

                  <div className="auth-row-2">
                    <div className="auth-field">
                      <label className="auth-label">Banco emissor</label>
                      <select id="mp-issuer" className="auth-select" />
                    </div>
                    <div className="auth-field">
                      <label className="auth-label">Parcelas</label>
                      <select id="mp-installments" className="auth-select" />
                    </div>
                  </div>

                  <input id="mp-cardholderEmail" type="hidden" defaultValue={patientEmail} />

                  {error && <div role="alert" className="auth-alert">{error}</div>}

                  <button
                    type="submit"
                    disabled={cardDisabled || !prep || processing || !cardReady}
                    className="auth-button auth-button--success auth-button--block"
                  >
                    {processing
                      ? "Processando…"
                      : cardReady
                        ? `Pagar ${prep ? centsToBRL(prep.amountCents) : ""}`
                        : "Carregando cartão…"}
                  </button>
                </form>
              </>
            )}

            {error && method === "pix" && (
              <div role="alert" className="auth-alert" style={{ marginTop: 12 }}>{error}</div>
            )}

            <p className="checkout-secure">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" />
              </svg>
              Pagamento processado com segurança pelo Mercado Pago. Os dados do
              cartão não passam pelos nossos servidores.
            </p>
          </div>

          {/* Coluna resumo */}
          <aside className="checkout-summary">
            <span className="auth-eyebrow">resumo</span>
            <h2 className="checkout-summary-title">sua consulta</h2>

            <div className="checkout-summary-row">
              <div className="checkout-doc-av">DR</div>
              <div>
                <div className="checkout-summary-bold">Próximo médico disponível</div>
                <div className="checkout-summary-soft">Clínico Geral · CRM ativo</div>
              </div>
            </div>

            <ul className="checkout-bullets">
              <li><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round"><polyline points="20 6 9 17 4 12"/></svg>Vídeo até 20 min</li>
              <li><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round"><polyline points="20 6 9 17 4 12"/></svg>Receita digital assinada</li>
              <li><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round"><polyline points="20 6 9 17 4 12"/></svg>Atestado e pedido de exame</li>
              <li><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round"><polyline points="20 6 9 17 4 12"/></svg>Atendimento em até 10 min</li>
            </ul>

            <hr className="checkout-divider" />

            <div className="checkout-totals">
              <div className="checkout-line"><span>Subtotal</span><span>{prep ? centsToBRL(prep.amountCents) : "—"}</span></div>
              <div className="checkout-line"><span>Taxa</span><span>R$ 0,00</span></div>
              <div className="checkout-line checkout-line--total"><span>Total</span><span>{prep ? centsToBRL(prep.amountCents) : "—"}</span></div>
            </div>

            <div className="checkout-payer">
              <div className="checkout-summary-soft">Pagador</div>
              <div className="checkout-summary-bold">{patientName}</div>
              <div className="checkout-summary-soft">{patientEmail}</div>
            </div>
          </aside>
        </div>
      </main>
    </div>
  );
}
