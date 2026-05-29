// Wrapper do Mercado Pago para pagamentos da consulta.
//
// HOJE: stub. Sempre retorna sucesso e devolve um payment_id "STUB-...".
// Quando as API keys forem configuradas em env, este módulo passa a chamar
// `MercadoPagoConfig` + `Payment.create(...)` de verdade. Toda a troca é
// concentrada AQUI — `actions.ts` permanece estável.
//
// Env esperadas no futuro:
//   MERCADOPAGO_ACCESS_TOKEN  — token de produção/test (server-side only)
//   NEXT_PUBLIC_MERCADOPAGO_PUBLIC_KEY — public key (se for usar Brick no client)

import type { CheckoutData } from "@/lib/forms/checkoutSchema";

export interface PaymentResult {
  success: boolean;
  payment_id: string;
  status: "approved" | "pending" | "rejected";
  raw?: unknown;
}

export interface ConsultaPaymentContext {
  consultationId: string;
  amount_cents: number;
  description: string;
  payer: {
    email: string;
    name: string;
    cpf: string; // só dígitos
  };
}

export function isMercadoPagoConfigured(): boolean {
  return Boolean(process.env.MERCADOPAGO_ACCESS_TOKEN);
}

/**
 * Cria um pagamento. Hoje stub. Mantenha a assinatura quando plugar o SDK real.
 */
export async function createPayment(
  ctx: ConsultaPaymentContext,
  payload: CheckoutData,
): Promise<PaymentResult> {
  if (!isMercadoPagoConfigured()) {
    return {
      success: true,
      payment_id: `STUB-${payload.method.toUpperCase()}-${crypto.randomUUID()}`,
      status: "approved",
    };
  }

  // ─── Quando MERCADOPAGO_ACCESS_TOKEN estiver configurado: ──────────
  //
  // IMPORTANTE — dois endpoints distintos do MP, escolhidos pela
  // recomendação atual da Doutor Facilita:
  //
  //   • PIX     → Payments API   (endpoint /v1/payments)
  //   • Cartão  → Orders API     (endpoint /v1/orders, nova API "checkout")
  //
  // ── PIX (Payments API) ───────────────────────────────────────────
  // import { MercadoPagoConfig, Payment } from "mercadopago";
  // const mp = new MercadoPagoConfig({ accessToken: process.env.MERCADOPAGO_ACCESS_TOKEN! });
  // const payment = new Payment(mp);
  //
  // if (payload.method === "pix") {
  //   const out = await payment.create({
  //     body: {
  //       transaction_amount: ctx.amount_cents / 100,
  //       description: ctx.description,
  //       payment_method_id: "pix",
  //       payer: {
  //         email: ctx.payer.email,
  //         first_name: ctx.payer.name.split(" ")[0],
  //         last_name: ctx.payer.name.split(" ").slice(1).join(" "),
  //         identification: { type: "CPF", number: ctx.payer.cpf },
  //       },
  //       external_reference: ctx.consultationId,
  //     },
  //   });
  //   // out.point_of_interaction.transaction_data → { qr_code, qr_code_base64, ticket_url }
  //   return { success: true, payment_id: String(out.id), status: out.status as PaymentResult["status"], raw: out };
  // }
  //
  // ── Cartão (Orders API) ──────────────────────────────────────────
  // A Orders API substitui a chamada direta a /v1/payments para cartão e
  // entrega uma única chamada que cria a order e processa o pagamento.
  // Pode ser usada via fetch direto enquanto o SDK não expõe Orders nativo:
  //
  // const { month, year } = splitCardExpiry(payload.card_expiry);
  // const cardToken = "<gerado no client via Brick/Tokenizer — ver SDK React>";
  // const res = await fetch("https://api.mercadopago.com/v1/orders", {
  //   method: "POST",
  //   headers: {
  //     "Content-Type": "application/json",
  //     Authorization: `Bearer ${process.env.MERCADOPAGO_ACCESS_TOKEN}`,
  //     "X-Idempotency-Key": ctx.consultationId,
  //   },
  //   body: JSON.stringify({
  //     type: "online",
  //     external_reference: ctx.consultationId,
  //     transactions: {
  //       payments: [{
  //         amount: (ctx.amount_cents / 100).toFixed(2),
  //         payment_method: {
  //           id: "<bin-detected>",
  //           type: "credit_card",
  //           token: cardToken,
  //           installments: payload.installments,
  //         },
  //       }],
  //     },
  //     payer: {
  //       email: ctx.payer.email,
  //       first_name: ctx.payer.name.split(" ")[0],
  //       last_name: ctx.payer.name.split(" ").slice(1).join(" "),
  //       identification: { type: "CPF", number: payload.cardholder_cpf },
  //     },
  //   }),
  // });
  // const out = await res.json();
  // return { success: out.status === "processed", payment_id: String(out.id), status: out.status as PaymentResult["status"], raw: out };

  // Fallback defensivo enquanto a integração real não está plugada.
  return {
    success: true,
    payment_id: `STUB-${payload.method.toUpperCase()}-${crypto.randomUUID()}`,
    status: "approved",
  };
}
