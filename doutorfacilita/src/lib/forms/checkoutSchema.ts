import { z } from "zod";
import { onlyDigits } from "./masks";
import { isValidCpf, isValidCardNumber, isValidCardExpiry } from "./validators";

export const PAYMENT_METHODS = ["pix", "card"] as const;
export type PaymentMethod = (typeof PAYMENT_METHODS)[number];

// Schema único (não discriminado). Campos do cartão são opcionais por padrão;
// quando method='card', superRefine exige todos eles. Isso evita as dores de
// cabeça do FieldErrors em union no react-hook-form.
export const checkoutSchema = z
  .object({
    method: z.enum(PAYMENT_METHODS),
    card_number: z.string().optional().default(""),
    cardholder_name: z.string().optional().default(""),
    card_expiry: z.string().optional().default(""),
    card_cvv: z.string().optional().default(""),
    cardholder_cpf: z.string().optional().default(""),
    installments: z
      .union([z.number(), z.string()])
      .transform((v) => (typeof v === "number" ? v : Number(v) || 1))
      .pipe(z.number().int().min(1).max(12))
      .default(1),
  })
  .superRefine((data, ctx) => {
    if (data.method !== "card") return;
    if (!isValidCardNumber(data.card_number ?? "")) {
      ctx.addIssue({ code: "custom", path: ["card_number"], message: "Número de cartão inválido" });
    }
    const name = (data.cardholder_name ?? "").trim();
    if (name.length < 3) {
      ctx.addIssue({ code: "custom", path: ["cardholder_name"], message: "Informe o nome impresso no cartão" });
    }
    if (!isValidCardExpiry(data.card_expiry ?? "")) {
      ctx.addIssue({ code: "custom", path: ["card_expiry"], message: "Validade inválida (MM/AA)" });
    }
    if (!/^\d{3,4}$/.test(data.card_cvv ?? "")) {
      ctx.addIssue({ code: "custom", path: ["card_cvv"], message: "CVV inválido" });
    }
    if (!isValidCpf(data.cardholder_cpf ?? "")) {
      ctx.addIssue({ code: "custom", path: ["cardholder_cpf"], message: "CPF inválido" });
    }
  });

export type CheckoutInput = z.input<typeof checkoutSchema>;
export type CheckoutData = z.output<typeof checkoutSchema>;

export function splitCardExpiry(mmYY: string): { month: number; year: number } {
  const [mm, yy] = mmYY.split("/");
  return { month: Number(mm), year: 2000 + Number(yy) };
}

export function cardNumberOnlyDigits(formatted: string): string {
  return onlyDigits(formatted);
}
