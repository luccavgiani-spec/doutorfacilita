// QA isolado: não usa .env, não acessa rede e não emite conversões reais.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');
const root = path.resolve(__dirname, '..');
let checks = 0;
function check(name, fn) { fn(); checks++; console.log('OK', name); }
function compile(file) { return ts.transpileModule(fs.readFileSync(path.join(root, file), 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText; }

async function tracking() {
  const pixel = [], capi = [], storage = new Map();
  const window = { location: { origin: 'https://plantaodigital.com.br', hostname: 'plantaodigital.com.br', pathname: '/checkout', search: '', protocol: 'https:' }, fbq: (...args) => pixel.push(args) };
  const context = vm.createContext({ URLSearchParams, window, document: { cookie: '' }, navigator: { userAgent: 'QA local' }, crypto: require('node:crypto').webcrypto, console, process: { env: { NODE_ENV: 'test' } }, localStorage: { getItem: k => storage.get(k), setItem: (k,v) => storage.set(k,v) }, setTimeout, fetch: async (_, opts) => { capi.push(JSON.parse(opts.body)); return { ok: true }; } });
  const cache = {};
  function load(file) {
    if (cache[file]) return cache[file];
    context.exports = {};
    context.require = name => name === '@/lib/supabase/client'
      ? { createClient: () => ({ auth: { getSession: async () => ({ data: { session: { access_token: 'qa-session' } } }) } }) }
      : load(path.posix.normalize(path.posix.join(path.posix.dirname(file), name + '.ts')));
    new vm.Script('(function(exports,require){' + compile(file) + '\n})(exports,require)').runInContext(context);
    return cache[file] = context.exports;
  }
  // Carregar dependências antes do módulo para manter o exports correto no VM.
  load('src/lib/tracking/config.ts'); load('src/lib/tracking/gtag-events.ts');
  const api = load('src/lib/tracking/meta-tracking.ts');
  api.trackInitiateCheckout({ value: 39.9 });
  check('begin_checkout enfileirado mesmo sem window.gtag prévio', () => assert.equal(window.dataLayer[0][1], 'begin_checkout'));
  check('dedup InitiateCheckout entre Pixel e CAPI', () => assert.equal(pixel[0][3].eventID, capi[0].event_id));
  api.trackPurchase({ order_id: 'qa-order', value: 39.9, email: 'never-send@example.test' });
  api.trackPurchase({ order_id: 'qa-order', value: 39.9 });
  await new Promise(resolve => setImmediate(resolve));
  const purchases = window.dataLayer.filter(x => x[1] === 'purchase');
  check('uma compra por transação no GA4', () => assert.equal(purchases.length, 1));
  check('valor BRL e destino GA4', () => { assert.equal(purchases[0][2].value, 39.9); assert.equal(purchases[0][2].currency, 'BRL'); assert.equal(purchases[0][2].send_to, 'G-KRB2Q1S4D9'); });
  check('dedup Purchase Pixel/CAPI', () => assert.equal(pixel.find(x => x[1] === 'Purchase')[3].eventID, capi.find(x => x.event_name === 'Purchase').order_id));
  check('nenhum email nem parâmetro clínico no payload', () => { assert.ok(!JSON.stringify(window.dataLayer).includes('never-send')); assert.ok(!JSON.stringify(pixel).includes('content_name')); });
  context.localStorage.getItem = () => { throw Error('blocked'); }; context.localStorage.setItem = () => { throw Error('blocked'); };
  check('storage bloqueado não interrompe confirmação', () => api.trackPurchase({ order_id: 'storage-blocked', value: 39.9 }));
  const before = pixel.length;
  api.trackPurchase({ order_id: 'invalid', value: NaN });
  check('valor inválido não emite compra', () => assert.equal(pixel.length, before));
}

async function edge(file, body, scenario = {}, query = '') {
  let handler;
  const writes = [], sent = [];
  const admin = { from(table) {
    const builder = { table, action: 'select', filters: {}, value: undefined };
    const proxy = new Proxy(builder, { get(obj, key) {
      if (key === 'then') return (resolve, reject) => Promise.resolve(result(obj)).then(resolve, reject);
      return (...args) => {
        if (['select','insert','update'].includes(key)) { obj.action = key === 'select' && obj.action !== 'select' ? obj.action : key; if (key !== 'select') { obj.value = args[0]; writes.push({ table, action: key, value: args[0] }); } }
        if (key === 'eq' || key === 'is') obj.filters[args[0]] = args[1];
        if (key === 'maybeSingle' || key === 'single') return Promise.resolve(result(obj));
        return proxy;
      };
    } });
    return proxy;
  }, auth: { getUser: async () => ({ data: { user: { id: 'user', email: 'qa@example.test' } } }) } };
  function result(o) {
    if (scenario.dbError) return { data: null, error: { message: 'QA database failure' } };
    if (o.action !== 'select') return { data: { id: 'attempt' }, error: null };
    if (scenario.otherOwner && o.table === 'patients') return { data: null, error: null };
    if (o.table === 'patients') return { data: { id: 'patient', full_name: 'QA', cpf: '00000000000', email: 'qa@example.test' }, error: null };
    if (o.table === 'consultations') return { data: { id: 'consultation', patient_id: 'patient', status: 'created', paid_at: scenario.alreadyPaid ? 'date' : null, amount_cents: scenario.amountCents ?? 3990 }, error: null };
    return { data: null, error: null };
  }
  const source = fs.readFileSync(path.join(root,file),'utf8').replace(/import \{ createClient \} from [^;]+;/, '');
  const js = ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
  const context = vm.createContext({ exports: {}, createClient: () => admin, Request, Response, URL, TextEncoder, crypto: require('node:crypto').webcrypto, console: { log(){}, warn(){}, error(){} }, Deno: { env: { get: name => name.startsWith('MP_WEBHOOK_SECRET') ? '' : 'qa-value' }, serve: fn => handler = fn }, fetch: async () => ({ ok: !scenario.mpError, status: scenario.mpError ?? 200, json: async () => ({ id: 'payment', status: scenario.status ?? 'approved', external_reference: 'consultation', payment_type_id: 'bank_transfer', transaction_amount: scenario.mpAmount ?? 39.9, status_detail: 'qa' }) }) });
  new vm.Script(js).runInContext(context);
  const response = await handler(new Request('https://qa.invalid/fn' + query,{method:'POST',headers:{'Content-Type':'application/json',...(scenario.noAuth ? {} : {Authorization:'Bearer qa'})},body:JSON.stringify(body)}));
  return { response, writes, sent, body: await response.json() };
}

(async () => {
  await tracking();
  const webhook = 'supabase/functions/mp-webhook/index.ts';
  const notice = { type: 'payment', data: { id: '123' } };
  let r = await edge(webhook, notice, { mpError: 500 }); check('MP indisponível recebe 503 para retry', () => assert.equal(r.response.status,503));
  r = await edge(webhook,notice,{mpError:404}); check('ID inexistente de teste recebe 200',()=>assert.equal(r.response.status,200));
  r = await edge(webhook,notice,{dbError:true}); check('falha DB recebe 500 para retry',()=>assert.equal(r.response.status,500));
  r = await edge(webhook,notice,{},'?data.id=456'); check('ID assinado diferente do body é rejeitado',()=>assert.equal(r.response.status,400));
  r = await edge(webhook,notice,{mpAmount:1}); check('pagamento com valor divergente não libera consulta',()=>{assert.equal(r.response.status,422);assert.equal(r.writes.length,0);});
  r = await edge(webhook,notice); check('aprovação válida grava timestamps e fila',()=>{assert.equal(r.response.status,200);const w=r.writes.find(x=>x.table==='consultations');assert.equal(w.value.status,'in_queue');assert.ok(w.value.paid_at && w.value.queued_at);});
  r = await edge('supabase/functions/mp-process-payment/index.ts',{metodo:'pix',consultation_id:'consultation'},{status:'rejected'}); check('PIX rejeitado não retorna QR pending',()=>assert.equal(r.body.status,'rejected'));
  r = await edge('supabase/functions/mp-process-payment/index.ts',{metodo:'pix',consultation_id:'consultation'},{alreadyPaid:true}); check('consulta paga bloqueia nova cobrança',()=>assert.equal(r.response.status,409));
  r = await edge('supabase/functions/meta-capi/index.ts',{event_name:'Purchase',order_id:'consultation',value:1}); check('CAPI não aceita compra sem paid_at',()=>assert.equal(r.response.status,409));
  r = await edge('supabase/functions/meta-capi/index.ts',{event_name:'Purchase',order_id:'consultation'},{dbError:true}); check('CAPI falha fechada quando banco indisponível',()=>assert.equal(r.response.status,503));
  r = await edge('supabase/functions/meta-capi/index.ts',{event_name:'Purchase',order_id:'consultation',value:1},{alreadyPaid:true}); check('CAPI aceita compra paga após autenticação',()=>assert.equal(r.response.status,200));
  r = await edge('supabase/functions/meta-capi/index.ts',{event_name:'Purchase',order_id:'consultation'},{noAuth:true}); check('CAPI rejeita Purchase anônimo',()=>assert.equal(r.response.status,401));
  r = await edge('supabase/functions/meta-capi/index.ts',{event_name:'Purchase',order_id:'consultation'},{otherOwner:true}); check('CAPI rejeita usuário sem paciente proprietário',()=>assert.equal(r.response.status,403));
  console.log(`${checks} verificações locais passaram; nenhuma chamada externa.`);
})().catch(error=>{ console.error(error); process.exitCode=1; });
