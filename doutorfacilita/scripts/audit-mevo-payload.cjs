const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const ts = require('typescript');
const base = path.join(__dirname, '../supabase/functions/_shared');
function load(name) {
  const exports = {};
  const source = ts.transpileModule(fs.readFileSync(path.join(base, name), 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  vm.runInNewContext(source, { exports, require: (file) => load(file.replace('./', '')), Date, Set });
  return exports;
}
const { montarPayloadMevo, nascimentoMevo, validarPayloadMevo } = load('mevo-payload.ts');
const p = JSON.parse(JSON.stringify(montarPayloadMevo(
  { id:'doctor-test', full_name:'Médico Teste', cpf:'123.456.789-00', phone:'+55 (11) 99999-0000', council_number:'1234', council_state:' sp ', specialties:['Clínica Geral'], primary_specialty:'Clínica Geral', email:'doctor@example.test' },
  { id:'patient-test', full_name:'Paciente Teste', cpf:'987.654.321-00', birth_date:'1990-05-12', gender:'female', celular:'+55 (11) 98888-0000', address_line:'Rua Teste', address_number:'123', alergias:['penicilina'], allergies:['penicilina'] },
  'consultation-test', null
)));
assert.equal(p.Medico.TipoDocumento,'CPF');
assert.deepEqual(p.Medico.Especialidades,['Clínica Geral']);
assert.equal(p.Medico.Documento,'12345678900');
assert.equal(p.Medico.TelefoneCelular,'11999990000');
assert.equal(p.Paciente.Nascimento,'1990/05/12');
assert.equal(p.Paciente.Sexo,'F');
assert.equal(p.Paciente.TelefoneCelular,'11988880000');
assert.equal(p.Paciente.Endereco.Endereco1,'Rua Teste, 123');
assert.deepEqual(p.Paciente.Alergias,['penicilina']);
assert.equal(p.RegistroProntuarioEletronico.TipoConsulta,'Teleconsulta');
assert.equal(nascimentoMevo('2026-02-30'),undefined);
assert.equal(nascimentoMevo(''),undefined);
assert.ok(!('Profissional' in p));
assert.ok(!('PermitirImpressao' in p));
assert.ok(!('CertificadoDigitalObrigatorio' in p));
assert.ok(!('Celular' in p.Paciente));
assert.ok(!('DataNascimento' in p.Paciente));
assert.equal(p.Estabelecimento.CNPJ,'');
assert.equal(p.Paciente.NomeSocial,'');
assert.equal(p.Paciente.Endereco.Endereco2,'');
for (const section of [p.Medico.Endereco,p.Paciente.Endereco,p.Estabelecimento.Endereco]) for (const key of ['Endereco1','Endereco2','Bairro','Cidade','Estado','CodigoPostal']) assert.equal(typeof section[key],'string');
const numbered = montarPayloadMevo({}, { address_line:'Rua Teste, 123', address_number:'123' }, 'test', null);
assert.equal(numbered.Paciente.Endereco.Endereco1,'Rua Teste, 123');
const address={address_line:'Rua Teste, 1', address_complement:'', neighborhood:'Centro', city:'Guarulhos', state:'SP', postal_code:'07023022'};
const establishment={establishment_name:'Empresa Teste',establishment_cnpj:'12345678000195',establishment_cnes:'1234567',establishment_logo:'https://example.test/logo.png',establishment_phone:'11999990000',...Object.fromEntries(Object.entries(address).map(([k,v])=>['establishment_'+k,v]))};
const complete=JSON.parse(JSON.stringify(montarPayloadMevo(address, {...address,social_name:'Nome social de teste'},'test',null,establishment)));
assert.deepEqual(Array.from(validarPayloadMevo(complete)),[]);
assert.equal(complete.Paciente.NomeSocial,'Nome social de teste');
assert.equal(complete.Estabelecimento.CNPJ,'12345678000195');
assert.equal(complete.Estabelecimento.Endereco.CodigoPostal,'07023022');
const telemedicine=JSON.parse(JSON.stringify(montarPayloadMevo(address,address,'test',null,{...establishment,establishment_cnes:'Telemedicina'})));
assert.equal(telemedicine.Estabelecimento.CNES,'Telemedicina');
assert.deepEqual(Array.from(validarPayloadMevo(telemedicine)),[]);
const invalidCnes=JSON.parse(JSON.stringify(telemedicine)); invalidCnes.Estabelecimento.CNES='Outro';
assert.ok(validarPayloadMevo(invalidCnes).includes('Estabelecimento.CNES (7 dígitos ou Telemedicina)'));
assert.ok(validarPayloadMevo(p).includes('Estabelecimento.CNES'));
assert.ok(validarPayloadMevo(p).includes('Medico.Endereco.Cidade'));
const broken=JSON.parse(JSON.stringify(complete)); broken.Medico.Endereco.Estado='XX'; broken.Estabelecimento.CNPJ='1';
assert.ok(validarPayloadMevo(broken).includes('Medico.Endereco.Estado (UF válida)'));
assert.ok(validarPayloadMevo(broken).includes('Estabelecimento.CNPJ (14 dígitos)'));
console.log('Campos exigidos presentes após JSON.stringify; casos completo, incompleto e inválido passaram. Sem rede ou emissão.');
