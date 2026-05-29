"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

import {
  checkoutSchema,
  type CheckoutInput,
  type PaymentMethod,
} from "@/lib/forms/checkoutSchema";
import {
  maskCardNumber,
  maskCardExpiry,
  maskCpf,
  onlyDigits,
} from "@/lib/forms/masks";
import { finalizarCompra } from "@/app/checkout/actions";

const PARCELAS = [
  { v: 1, label: "1x de R$ 59,00 (sem juros)" },
  { v: 2, label: "2x de R$ 29,50 (sem juros)" },
  { v: 3, label: "3x de R$ 19,67 (sem juros)" },
];

interface Props {
  stubEnabled: boolean;
  patientName: string;
  patientEmail: string;
  patientCpf: string;
}

export default function CheckoutForm({
  stubEnabled,
  patientName,
  patientEmail,
  patientCpf,
}: Props) {
  const [method, setMethod] = useState<PaymentMethod>("pix");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const form = useForm<CheckoutInput>({
    resolver: zodResolver(checkoutSchema),
    mode: "onBlur",
    defaultValues: {
      method: "pix",
      card_number: "",
      cardholder_name: "",
      card_expiry: "",
      card_cvv: "",
      cardholder_cpf: patientCpf,
      installments: 1,
    } as CheckoutInput,
  });

  const {
    register,
    control,
    handleSubmit,
    formState: { errors },
    setValue,
  } = form;

  function switchMethod(m: PaymentMethod) {
    setMethod(m);
    setValue("method", m, { shouldValidate: false });
    setError(null);
  }

  function onSubmit(data: CheckoutInput) {
    setError(null);
    startTransition(async () => {
      const res = await finalizarCompra(data);
      if (res && "error" in res) setError(res.error);
    });
  }

  return (
    <div className="auth-shell">
      <header className="auth-top">
        <div className="auth-top-inner">
          <Link href="/" className="logo-no" style={{ textDecoration: "none" }}>
            <span className="dots">
              <span></span><span></span><span></span><span></span>
            </span>
            <span className="no-word">nó</span> telemed
          </Link>
          <div className="auth-top-link">
            <b>{patientName}</b>
          </div>
        </div>
        <div className="bar4">
          <span></span><span></span><span></span><span></span>
        </div>
      </header>

      <main className="auth-main auth-main--checkout">
        <div className="checkout-grid">
          {/* Coluna pagamento */}
          <div className="auth-card auth-card--wide">
            <span className="auth-eyebrow">pagamento</span>
            <h1 className="auth-h1">finalize sua compra</h1>
            <p className="auth-sub">
              Escolha a forma de pagamento. Assim que confirmar, você entra na
              fila e é atendido em até 10 minutos.
            </p>

            <div className="checkout-tabs" role="tablist" aria-label="Forma de pagamento">
              <button
                type="button"
                role="tab"
                aria-selected={method === "pix"}
                className={`checkout-tab ${method === "pix" ? "is-active" : ""}`}
                onClick={() => switchMethod("pix")}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="3" width="7" height="7" rx="1" />
                  <rect x="14" y="3" width="7" height="7" rx="1" />
                  <rect x="3" y="14" width="7" height="7" rx="1" />
                  <line x1="14" y1="14" x2="21" y2="14" />
                  <line x1="14" y1="17" x2="17" y2="17" />
                  <line x1="20" y1="20" x2="21" y2="20" />
                </svg>
                PIX
                <span className="checkout-tab-tag">aprovação instantânea</span>
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={method === "card"}
                className={`checkout-tab ${method === "card" ? "is-active" : ""}`}
                onClick={() => switchMethod("card")}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="2" y="5" width="20" height="14" rx="2" ry="2" />
                  <line x1="2" y1="10" x2="22" y2="10" />
                </svg>
                Cartão de crédito
                <span className="checkout-tab-tag">até 3x sem juros</span>
              </button>
            </div>

            <form className="auth-form" onSubmit={handleSubmit(onSubmit)} noValidate>
              <input type="hidden" {...register("method")} value={method} readOnly />

              {method === "pix" && (
                <div className="checkout-pix">
                  <div className="checkout-pix-qr" aria-hidden>
                    <svg width="120" height="120" viewBox="0 0 120 120" fill="none">
                      <rect x="0" y="0" width="120" height="120" fill="#f4f6f9" rx="8" />
                      <g fill="#1a1a1a">
                        <rect x="14" y="14" width="22" height="22" />
                        <rect x="84" y="14" width="22" height="22" />
                        <rect x="14" y="84" width="22" height="22" />
                        <rect x="44" y="20" width="6" height="6" />
                        <rect x="56" y="14" width="6" height="6" />
                        <rect x="68" y="26" width="6" height="6" />
                        <rect x="44" y="44" width="6" height="6" />
                        <rect x="56" y="56" width="6" height="6" />
                        <rect x="68" y="44" width="6" height="6" />
                        <rect x="44" y="68" width="6" height="6" />
                        <rect x="56" y="80" width="6" height="6" />
                        <rect x="80" y="56" width="6" height="6" />
                        <rect x="92" y="68" width="6" height="6" />
                        <rect x="100" y="84" width="6" height="6" />
                      </g>
                    </svg>
                  </div>
                  <div className="checkout-pix-info">
                    <h3>QR Code aparece após confirmar</h3>
                    <p>
                      Você terá <b>30 minutos</b> para escanear no app do seu banco.
                      O pagamento é creditado em segundos e você entra na fila
                      automaticamente.
                    </p>
                    <ul className="checkout-pix-list">
                      <li>Sem cadastro de cartão</li>
                      <li>Confirmação em até 1 minuto</li>
                      <li>Recibo enviado por email</li>
                    </ul>
                  </div>
                </div>
              )}

              {method === "card" && (
                <>
                  <div className="auth-field">
                    <label className="auth-label">Número do cartão*</label>
                    <Controller
                      control={control}
                      name="card_number"
                      render={({ field }) => (
                        <input
                          className={`auth-input ${errors.card_number ? "auth-input--error" : ""}`}
                          value={field.value ?? ""}
                          onChange={(e) => field.onChange(maskCardNumber(e.target.value))}
                          onBlur={field.onBlur}
                          inputMode="numeric"
                          autoComplete="cc-number"
                          placeholder="0000 0000 0000 0000"
                        />
                      )}
                    />
                    {errors.card_number && <div className="auth-error">{errors.card_number.message}</div>}
                  </div>

                  <div className="auth-field">
                    <label className="auth-label">Nome impresso no cartão*</label>
                    <input
                      className={`auth-input ${errors.cardholder_name ? "auth-input--error" : ""}`}
                      {...register("cardholder_name")}
                      autoComplete="cc-name"
                      placeholder="Como está no cartão"
                    />
                    {errors.cardholder_name && (
                      <div className="auth-error">{errors.cardholder_name.message}</div>
                    )}
                  </div>

                  <div className="auth-row-2">
                    <div className="auth-field">
                      <label className="auth-label">Validade*</label>
                      <Controller
                        control={control}
                        name="card_expiry"
                        render={({ field }) => (
                          <input
                            className={`auth-input ${errors.card_expiry ? "auth-input--error" : ""}`}
                            value={field.value ?? ""}
                            onChange={(e) => field.onChange(maskCardExpiry(e.target.value))}
                            onBlur={field.onBlur}
                            inputMode="numeric"
                            autoComplete="cc-exp"
                            placeholder="MM/AA"
                          />
                        )}
                      />
                      {errors.card_expiry && <div className="auth-error">{errors.card_expiry.message}</div>}
                    </div>
                    <div className="auth-field">
                      <label className="auth-label">CVV*</label>
                      <Controller
                        control={control}
                        name="card_cvv"
                        render={({ field }) => (
                          <input
                            className={`auth-input ${errors.card_cvv ? "auth-input--error" : ""}`}
                            value={field.value ?? ""}
                            onChange={(e) => field.onChange(onlyDigits(e.target.value).slice(0, 4))}
                            onBlur={field.onBlur}
                            inputMode="numeric"
                            autoComplete="cc-csc"
                            placeholder="000"
                          />
                        )}
                      />
                      {errors.card_cvv && <div className="auth-error">{errors.card_cvv.message}</div>}
                    </div>
                  </div>

                  <div className="auth-field">
                    <label className="auth-label">CPF do titular*</label>
                    <Controller
                      control={control}
                      name="cardholder_cpf"
                      render={({ field }) => (
                        <input
                          className={`auth-input ${errors.cardholder_cpf ? "auth-input--error" : ""}`}
                          value={field.value ?? ""}
                          onChange={(e) => field.onChange(maskCpf(e.target.value))}
                          onBlur={field.onBlur}
                          inputMode="numeric"
                          placeholder="000.000.000-00"
                        />
                      )}
                    />
                    {errors.cardholder_cpf && (
                      <div className="auth-error">{errors.cardholder_cpf.message}</div>
                    )}
                  </div>

                  <div className="auth-field">
                    <label className="auth-label">Parcelas</label>
                    <select
                      className="auth-select"
                      {...register("installments", { valueAsNumber: true })}
                    >
                      {PARCELAS.map((p) => (
                        <option key={p.v} value={p.v}>{p.label}</option>
                      ))}
                    </select>
                  </div>
                </>
              )}

              {error && (
                <div role="alert" className="auth-alert">{error}</div>
              )}

              <button
                type="submit"
                disabled={!stubEnabled || pending}
                className="auth-button auth-button--success auth-button--block"
              >
                {pending
                  ? "Processando..."
                  : stubEnabled
                    ? "Finalizar compra"
                    : "Pagamento em breve"}
              </button>

              <p className="checkout-secure">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                  <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                </svg>
                Pagamento seguro. Seus dados não passam pelos nossos servidores.
              </p>
            </form>
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
              <li>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round"><polyline points="20 6 9 17 4 12"/></svg>
                Vídeo até 20 min
              </li>
              <li>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round"><polyline points="20 6 9 17 4 12"/></svg>
                Receita digital assinada
              </li>
              <li>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round"><polyline points="20 6 9 17 4 12"/></svg>
                Atestado e pedido de exame
              </li>
              <li>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round"><polyline points="20 6 9 17 4 12"/></svg>
                Atendimento em até 10 min
              </li>
            </ul>

            <hr className="checkout-divider" />

            <div className="checkout-totals">
              <div className="checkout-line">
                <span>Subtotal</span>
                <span>R$ 59,00</span>
              </div>
              <div className="checkout-line">
                <span>Taxa</span>
                <span>R$ 0,00</span>
              </div>
              <div className="checkout-line checkout-line--total">
                <span>Total</span>
                <span>R$ 59,00</span>
              </div>
            </div>

            <div className="checkout-payer">
              <div className="checkout-summary-soft">Pagador</div>
              <div className="checkout-summary-bold">{patientName}</div>
              <div className="checkout-summary-soft">{patientEmail}</div>
            </div>

            {stubEnabled && (
              <div className="checkout-stub-note">
                <b>DEV:</b> stub ativo — qualquer dado preenchido cai na /fila
                ao "Finalizar compra". Trocar pela MP quando as keys estiverem
                no env.
              </div>
            )}
          </aside>
        </div>
      </main>
    </div>
  );
}
