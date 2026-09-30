// Tipos compartilhados da integração Mevo Receita Digital.
//
// Usados pelas Edge Functions (Deno) e re-exportados para o frontend via
// src/lib/mevo/types.ts (mantenha os dois em sincronia).
//
// ⚠️ Os nomes EXATOS de campos do payload/resposta devem ser confirmados
// contra o PDF oficial da Mevo no kickoff. Onde houver dúvida, os parsers
// das Edge Functions leem variantes defensivamente (camelCase / PascalCase).

/** Conselho profissional. Mevo valida CRM em tempo real contra o CFM. */
export interface RegistroProfissional {
  Conselho: string; // "CRM"
  UF: string; // "SP"
  Numero: string; // "345678"
}

/** Payload conforme exemplo de iniciar fornecido pela Mevo. */
export interface MevoEnderecoEstruturado {
  Endereco1: string; Endereco2?: string; Bairro?: string; Cidade?: string; Estado?: string; CodigoPostal?: string;
}
export interface MevoMedico {
  Nome: string; Documento: string; TipoDocumento: "CPF"; Email: string;
  ReferenciaExterna: string; TelefoneCelular?: string; Especialidades?: string[];
  Endereco?: MevoEnderecoEstruturado;
  RegistroProfissional: RegistroProfissional;
}
export interface MevoPaciente {
  Nome: string; Documento: string; ReferenciaExterna?: string;
  Nascimento?: string; Sexo?: "F" | "M"; TelefoneCelular?: string; Email?: string;
  Alergias?: string[]; Endereco?: MevoEnderecoEstruturado;
}
export interface MevoEstabelecimento {
  Nome: string; CNES?: string; Endereco?: MevoEnderecoEstruturado; Contato?: { TelefoneComercial: string };
}
export interface MevoIniciarPayload {
  Medico: MevoMedico; Paciente: MevoPaciente; Estabelecimento?: MevoEstabelecimento;
  SubParceiro: string; CorPrimaria?: string; CorSecundaria?: string; LogoURL?: string;
  ReferenciaExterna: string;
  RegistroProntuarioEletronico: { ReferenciaExterna: string; TipoConsulta: "Teleconsulta" };
  CertificadoDigitalObrigatorio: boolean; PermitirImpressao: boolean;
}

/**
 * Resposta de iniciar prescrição. Nomes podem variar — a Edge Function
 * normaliza via parseRespostaIniciar(). Mantemos campos opcionais.
 */
export interface MevoRespostaIniciar {
  idPrescricao?: string;
  id?: string;
  url?: string; // URL da modal/iframe Mevo Prescritores
  link?: string;
  token?: string;
  qrCodeUrl?: string;
  qrcode_url?: string;
  codigoValidacao?: string;
  codigo_validacao?: string;
  // Chaves PascalCase efetivamente retornadas pela Mevo (doc oficial).
  ModalURL?: string;
  QRCodeURL?: string;
  CodigoValidacao?: string;
}

/** Forma normalizada que devolvemos ao frontend. */
export interface RespostaIniciarNormalizada {
  modal_url: string;
  prescricao_id: string; // id local (prescricoes_mevo.id)
  mevo_id_prescricao: string | null;
  mevo_token: string | null;
  qrcode_url: string | null;
  codigo_validacao: string | null;
}

/** Erro de validação Mevo (HTTP 412). */
export interface MevoErroValidacao {
  Entidade?: string;
  Campo?: string;
  Descricao?: string;
}

/** Documento devolvido no evento `prescricao` (postMessage da iframe). */
export interface DocumentoMevo {
  TipoDocumento: string; // RECEITA, EXAME, ATESTADO, LME, ENCAMINHAMENTO, RELATORIO, INSTRUCAO, MANIPULADOS
  Categoria?: string; // ex: "RECEITA SIMPLES", "CONTROLE ESPECIAL"
  URL: string; // S3 assinado — EXPIRA EM 10 MIN
  Assinado?: boolean;
  ContentType?: string; // default application/pdf
}

/** Eventos emitidos pela iframe Mevo via window.postMessage. */
export type MevoEventoTipo = "prescricao" | "cancel" | "excluded";

export interface EventoMevo {
  type: MevoEventoTipo;
  idPrescricao?: string;
  Documentos?: DocumentoMevo[];
}
