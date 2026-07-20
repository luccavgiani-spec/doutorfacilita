import { z } from "zod";
import { onlyDigits } from "./masks";
import { isValidCpf, isValidBrDateNotFuture, isStrongPassword } from "./validators";

const UFS = [
  "AC","AL","AP","AM","BA","CE","DF","ES","GO","MA","MT","MS","MG","PA","PB",
  "PR","PE","PI","RJ","RN","RS","RO","RR","SC","SP","SE","TO",
] as const;

export const cadastroSchema = z
  .object({
    // 1
    nome: z.string().trim().min(2, "Informe seu nome"),
    sobrenome: z.string().trim().min(2, "Informe seu sobrenome"),
    email: z.string().trim().toLowerCase().email("Email inválido"),
    telefone: z
      .string()
      .refine((v) => onlyDigits(v).length >= 10 && onlyDigits(v).length <= 11, "Telefone inválido"),
    data_nascimento: z
      .string()
      .refine(isValidBrDateNotFuture, "Data inválida (DD/MM/AAAA, sem datas futuras)"),
    genero: z.enum(["F", "M", "O", "N"]),
    // saúde (aba Dados Pessoais) — persistem em patients.alergias / patients.current_medications
    alergias: z.array(z.string().trim().min(1)).default([]),
    current_medications: z.array(z.string().trim().min(1)).default([]),
    // 2
    cep: z.string().refine((v) => onlyDigits(v).length === 8, "CEP inválido"),
    logradouro: z.string().trim().min(2, "Informe o logradouro"),
    numero: z.string().trim().min(1, "Informe o número"),
    complemento: z.string().trim().default(""),
    bairro: z.string().trim().min(2, "Informe o bairro"),
    cidade: z.string().trim().min(2, "Informe a cidade"),
    uf: z.enum(UFS),
    // 3
    cpf: z.string().refine(isValidCpf, "CPF inválido"),
    // 4
    senha: z.string().refine(isStrongPassword, "Senha não atende aos requisitos"),
    confirmar_senha: z.string(),
    emergency_contact_name: z.string().trim().min(2, "Informe um nome"),
    emergency_contact_phone: z
      .string()
      .refine((v) => onlyDigits(v).length >= 10 && onlyDigits(v).length <= 11, "Telefone inválido"),
    accepts_terms: z.literal(true, { message: "Você precisa aceitar os termos" }),
    accepts_communications: z.boolean().default(false),
  })
  .superRefine((data, ctx) => {
    if (data.senha !== data.confirmar_senha) {
      ctx.addIssue({
        code: "custom",
        path: ["confirmar_senha"],
        message: "As senhas não conferem",
      });
    }
  });

export type CadastroFormInput = z.input<typeof cadastroSchema>;
export type CadastroForm = z.output<typeof cadastroSchema>;

export const UF_LIST = UFS;
