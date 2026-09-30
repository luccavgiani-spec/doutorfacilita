# Payload Mevo — 30/09/2026

Contrato alinhado ao exemplo `Mevo JSON de Iniciar.json` fornecido pelo proprietário. `Medico`, `Especialidades[]`, `TipoDocumento: CPF`, `Paciente.Nascimento` em AAAA/MM/DD, `TelefoneCelular` e `RegistroProntuarioEletronico.TipoConsulta: Teleconsulta` substituem as variantes experimentais anteriores.

CPF/telefone/CEP normalizados, especialidades e alergias consolidadas, número do endereço incluído sem duplicação. Endereço do médico e estabelecimento são enviados como Endereco1 a partir dos textos existentes; não há fonte para separar bairro/cidade/CEP desses textos. Campos sem fonte (CNS, CNPJ, nome social, etnia, peso, altura, CID) são omitidos. Diagnósticos e conteúdo da receita são decisões do médico dentro da Mevo.

Preservados autenticação do médico, titularidade da consulta, estado in_progress, assinatura digital obrigatória, resposta ModalURL/token e persistência. Removido retry que apagava nascimento/endereço em erro 412; erro de validação deve ser corrigido, não escondido. Nenhuma nova coluna/migration é necessária: campos usados já existem no banco produtivo.

17 verificações isoladas do contrato e TypeScript. Sem dados reais, chamada Mevo ou receita sintética. Validação final exige o médico iniciar e assinar a prescrição em consulta, retorno da Mevo e arquivamento dos documentos. Não presumir receita válida apenas porque /iniciar retornou uma sessão.
