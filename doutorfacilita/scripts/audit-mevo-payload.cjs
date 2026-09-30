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
const { montarPayloadMevo, nascimentoMevo } = load('mevo-payload.ts');
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
assert.ok(!('Celular' in p.Paciente));
assert.ok(!('DataNascimento' in p.Paciente));
assert.ok(!('CNPJ' in p.Estabelecimento));
const numbered = montarPayloadMevo({}, { address_line:'Rua Teste, 123', address_number:'123' }, 'test', null);
assert.equal(numbered.Paciente.Endereco.Endereco1,'Rua Teste, 123');
console.log('17 verificações do contrato Mevo passaram; sem rede, dados reais ou emissão.');
