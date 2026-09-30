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
  return { Endereco1: line ?? "", Endereco2: text(p.address_complement) ?? "", Bairro: text(p.neighborhood) ?? "", Cidade: text(p.city) ?? "", Estado: text(p.state)?.toUpperCase() ?? "", CodigoPostal: digits(p.postal_code) ?? "" };
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
      Endereco: enderecoPaciente({ ...doctor, address_line: text(doctor.address_line) ?? text(doctor.endereco) }),
    },
    Paciente: {
      ReferenciaExterna: text(patient.id), Nome: text(patient.full_name) ?? "", NomeSocial: text(patient.social_name) ?? "", Nascimento: nascimentoMevo(patient.birth_date), Sexo: sexo,
      Documento: digits(patient.cpf) ?? "", TelefoneCelular: normalizarCelularBR(text(patient.celular) ?? text(patient.phone)),
      Email: text(patient.email), Alergias: allergies.length ? allergies : undefined, Endereco: enderecoPaciente(patient),
    },
    RegistroProntuarioEletronico: { ReferenciaExterna: consultationId, TipoConsulta: "Teleconsulta" },
    Estabelecimento: {
      Nome: text(branding.establishment_name) ?? text(doctor.establishment_name) ?? "Plantão Digital",
      CNPJ: digits(branding.establishment_cnpj) ?? "",
      CNES: digits(branding.establishment_cnes) ?? digits(doctor.establishment_cnes) ?? "",
      Logo: text(branding.establishment_logo) ?? text(branding.logo_url) ?? "",
      Endereco: enderecoPaciente({ address_line: text(branding.establishment_address_line) ?? text(doctor.establishment_address), address_complement: branding.establishment_address_complement, neighborhood: branding.establishment_neighborhood, city: branding.establishment_city, state: branding.establishment_state, postal_code: branding.establishment_postal_code }),
      Contato: { TelefoneComercial: normalizarCelularBR(text(branding.establishment_phone) ?? text(doctor.establishment_phone)) ?? "" },
    },
    ReferenciaExterna: consultationId,
    CertificadoDigitalObrigatorio: true, PermitirImpressao: false,
  };
}

/** Required data confirmed by the Mevo partner. Empty complements/social name are explicit, not invented. */
export function validarPayloadMevo(payload: MevoIniciarPayload): string[] {
  const missing: string[] = [];
  const required = (path: string, value: unknown) => { if (typeof value !== "string" || !value.trim()) missing.push(path); };
  for (const [label, address] of [["Medico", payload.Medico.Endereco], ["Paciente", payload.Paciente.Endereco], ["Estabelecimento", payload.Estabelecimento?.Endereco]] as const) {
    for (const key of ["Endereco1", "Bairro", "Cidade", "Estado", "CodigoPostal"] as const) required(`${label}.Endereco.${key}`, address?.[key]);
    if (address?.CodigoPostal && !/^\d{8}$/.test(address.CodigoPostal)) missing.push(`${label}.Endereco.CodigoPostal (8 dígitos)`);
    if (address?.Estado && !/^(AC|AL|AP|AM|BA|CE|DF|ES|GO|MA|MT|MS|MG|PA|PB|PR|PE|PI|RJ|RN|RS|RO|RR|SC|SP|SE|TO)$/.test(address.Estado)) missing.push(`${label}.Endereco.Estado (UF válida)`);
  }
  required("Estabelecimento.CNPJ", payload.Estabelecimento?.CNPJ);
  required("Estabelecimento.CNES", payload.Estabelecimento?.CNES);
  required("Estabelecimento.Logo", payload.Estabelecimento?.Logo);
  required("Estabelecimento.Contato.TelefoneComercial", payload.Estabelecimento?.Contato?.TelefoneComercial);
  if (payload.Estabelecimento?.CNPJ && !/^\d{14}$/.test(payload.Estabelecimento.CNPJ)) missing.push("Estabelecimento.CNPJ (14 dígitos)");
  if (payload.Estabelecimento?.CNES && !/^\d{7}$/.test(payload.Estabelecimento.CNES)) missing.push("Estabelecimento.CNES (7 dígitos)");
  return missing;
}
