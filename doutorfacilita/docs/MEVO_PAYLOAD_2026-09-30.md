# Mevo — contrato obrigatório confirmado pelo parceiro (30/09/2026)

A ausência de chaves apontada pelo parceiro foi corrigida: endereço do médico com seis chaves, Paciente.NomeSocial e Endereco2, Estabelecimento.CNPJ/CNES/Logo/Contato/Endereco. Complemento e nome social ausentes são strings vazias explícitas; documentos e endereços não são inventados.

Migration acrescenta endereço estruturado a doctors e social_name a patients. Médico preenche Perfil; admin edita nome social do paciente e dados do estabelecimento em Admin > Mevo. A função lê configuração não secreta do banco e conserva credenciais no servidor. Configuração jurídica IPV fornecida pelo usuário aplicada ao banco, com logo pública do Plantão Digital (HTTP 200).

Validação anterior ao envio retorna 422 com caminhos ausentes, mantendo autenticação, ownership e consulta em andamento. CNES IPV e endereço profissional permanecem pendentes; não copiar endereço da empresa para médico sem confirmação.

Verificação: contrato depois de JSON.stringify, casos completo/incompleto/inválido, TypeScript app e builder, diff check. Não houve emissão remota com a nova versão; aceite da API e assinatura dependem de completar o cadastro e testar com médico autenticado. Não há fundamento para prometer 95% de sucesso end-to-end antes disso. Homologação não comprova produção.
