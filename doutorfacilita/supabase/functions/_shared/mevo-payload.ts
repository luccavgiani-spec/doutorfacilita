import type { MevoIniciarPayload, MevoEnderecoEstruturado } from "./mevo-types.ts";
import { normalizarCelularBR } from "./mevo-utils.ts";

type Row = Record<string, unknown>;
const text = (v: unknown): string | undefined => typeof v === "string" && v.trim() ? v.trim() : undefined;
const digits = (v: unknown) => text(v)?.replace(/\D/g, "") || undefined;
const strings = (v: unknown): string[] => Array.isArray(v) ? v.map(text).filter((x): x is string => !!x) : [];

export function nascimentoMevo(value: unknown): string | undefined {
  const date = text(value);
  if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) return undefined;
  const parsed = new Date(date + "T00:00:00Z");
  return Number.isFinite(parsed.getTime()) && parsed.toISOString().slice(0, 10) === date ? date.replaceAll("-", "/") : undefined;
}

function enderecoPaciente(p: Row): MevoEnderecoEstruturado | undefined {
  let line = text(p.address_line);
  const number = text(p.address_number);
  if (line && number && !new RegExp(`(?:^|[\\s,])${number.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`).test(line)) line += ", " + number;
  if (!line) return undefined;
  return { Endereco1: line, Endereco2: text(p.address_complement), Bairro: text(p.neighborhood), Cidade: text(p.city), Estado: text(p.state)?.toUpperCase(), CodigoPostal: digits(p.postal_code) };
}

/** Contrato do exemplo Mevo JSON de Iniciar. Campos sem fonte real são omitidos. */
export function montarPayloadMevo(doctor: Row, patient: Row, consultationId: string, authEmail: string | null, branding: Row = {}): MevoIniciarPayload {
  const specialties = [...new Set([...strings(doctor.specialties), ...strings([doctor.primary_specialty])])];
  const gender = text(patient.gender)?.toLowerCase();
  const sexo = gender === "f" || gender === "female" || gender === "feminino" ? "F" : gender === "m" || gender === "male" || gender === "masculino" ? "M" : undefined;
  const allergies = [...new Set([...strings(patient.alergias), ...strings(patient.allergies)])];
  return {
    CorPrimaria: text(branding.cor_primaria), CorSecundaria: text(branding.cor_secundaria), LogoURL: text(branding.logo_url),
    SubParceiro: text(branding.subparceiro) ?? "PLANTAO_DIGITAL",
    Medico: {
      Nome: text(doctor.full_name) ?? "", Documento: digits(doctor.cpf) ?? "", TipoDocumento: "CPF",
      ReferenciaExterna: text(doctor.id) ?? "", TelefoneCelular: normalizarCelularBR(text(doctor.phone)),
      Email: text(doctor.email) ?? authEmail ?? "", Especialidades: specialties.length ? specialties : undefined,
      RegistroProfissional: { Numero: text(doctor.council_number) ?? "", Conselho: text(doctor.council) ?? "CRM", UF: text(doctor.council_state)?.toUpperCase() ?? "" },
      Endereco: text(doctor.endereco) ? { Endereco1: text(doctor.endereco)! } : undefined,
    },
    Paciente: {
      ReferenciaExterna: text(patient.id), Nome: text(patient.full_name) ?? "", Nascimento: nascimentoMevo(patient.birth_date), Sexo: sexo,
      Documento: digits(patient.cpf) ?? "", TelefoneCelular: normalizarCelularBR(text(patient.celular) ?? text(patient.phone)),
      Email: text(patient.email), Alergias: allergies.length ? allergies : undefined, Endereco: enderecoPaciente(patient),
    },
    RegistroProntuarioEletronico: { ReferenciaExterna: consultationId, TipoConsulta: "Teleconsulta" },
    Estabelecimento: { Nome: text(doctor.establishment_name) ?? "Plantão Digital", CNES: digits(doctor.establishment_cnes), Endereco: text(doctor.establishment_address) ? { Endereco1: text(doctor.establishment_address)! } : undefined, Contato: text(doctor.establishment_phone) ? { TelefoneComercial: text(doctor.establishment_phone)! } : undefined },
    ReferenciaExterna: consultationId,
    CertificadoDigitalObrigatorio: true, PermitirImpressao: false,
  };
}
