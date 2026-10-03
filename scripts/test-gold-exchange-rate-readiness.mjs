import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { build } from 'esbuild';

const root = fileURLToPath(new URL('../', import.meta.url));
// Execute production hook effects with a deterministic React hook scheduler.
// Firestore is isolated: a snapshot is delivered only when the test requests it.
const harness = `
const slots=[]; let cursor=0; const pending=[]; export const subscriptions=[];
export function render(fn){cursor=0;const result=fn();while(pending.length)pending.shift()();return result;}
export function useState(initial){const i=cursor++;if(!(i in slots))slots[i]=initial;return [slots[i],v=>{slots[i]=typeof v==='function'?v(slots[i]):v;}];}
export function useRef(initial){const i=cursor++;if(!(i in slots))slots[i]={current:initial};return slots[i];}
export function useEffect(fn,deps){const i=cursor++;const old=slots[i];if(!old||deps.some((v,j)=>!Object.is(v,old[j]))){slots[i]=deps;pending.push(fn);}}
export function doc(_db,...parts){return parts.join('/');}
export function getDoc(){throw Error('Unexpected network read');}
export function onSnapshot(ref,...args){const opts=typeof args[0]==='object'?args.shift():{};subscriptions.push({ref,opts,success:args[0],error:args[1]});return ()=>{};}
`;
const result = await build({
  stdin: { contents: `export {useGoldExchangeMarketData} from './src/hooks/useGoldExchangeRemoteData.js';
export {default as autoVault} from './src/hooks/useGoldExchangeAutoVault.js';
export {applyExchangeFinalWeights,getExchangeTotals,validateExchangeProductsForCalculation} from './src/lib/goldExchangeForm.js';
export {DEFAULT_GOLD_PRODUCTS,DEFAULT_PURITY,DEFAULT_EXCHANGE} from './src/lib/goldRates.js';
export {render,subscriptions} from 'kgm-test-harness';`, resolveDir: root },
  bundle: true, write: false, format: 'esm', platform: 'node',
  plugins: [{ name: 'isolated-hooks', setup(b) {
    b.onResolve({ filter: /^(react|firebase\/firestore|kgm-test-harness)$/ }, () => ({ path: 'harness', namespace: 'mock' }));
    b.onResolve({ filter: /^@\/firebase\/firebase$/ }, () => ({ path: 'db', namespace: 'mock' }));
    b.onResolve({ filter: /^@\/services\/userService$/ }, () => ({ path: 'profile', namespace: 'mock' }));
    b.onResolve({ filter: /^@\/hooks\/useInstallPrompt$/ }, () => ({ path: 'install', namespace: 'mock' }));
    b.onResolve({ filter: /^@\// }, args => ({ path: path.join(root, 'src', args.path.slice(2) + '.js') }));
    b.onLoad({ filter: /.*/, namespace: 'mock' }, args => ({ contents: args.path==='harness'?harness:args.path==='db'?'export const db={};':args.path==='profile'?'export async function fetchMyProfile(){return null;}':'export function nudgeAppInstall(){}', loader: 'js' }));
  } }],
});
const m = await import('data:text/javascript;base64,' + Buffer.from(result.outputFiles[0].text).toString('base64'));
const row = { productId:'gold-18k-jewelry', goldType:m.DEFAULT_GOLD_PRODUCTS['gold-18k-jewelry'].legacyGoldType,
  calculationMethod:'rate', quantity:'3.75', inputUnit:'g', exchangeType:'999.9골드바', finalWeight:0 };
const defaults={purity:m.DEFAULT_PURITY,exchange:m.DEFAULT_EXCHANGE,products:m.DEFAULT_GOLD_PRODUCTS};
const remote={...defaults,products:{...defaults.products,'gold-18k-jewelry':{...defaults.products['gold-18k-jewelry'],conversionRate:0.71}}};
assert.equal(m.getExchangeTotals(m.applyExchangeFinalWeights([row],{rates:defaults})).totalGrams,2.7);
let products=[row], step=0, calculated=false, calls=0;
const choice={current:true};
const setters={setError:()=>{},setProducts:fn=>{products=fn(products);},setCalculated:v=>{calculated=v;},setStep:v=>{step=v;},onCalculated:()=>{calls++;}};
function run(){return m.render(()=>{const market=m.useGoldExchangeMarketData();m.autoVault({enabled:true,entryMode:'vault',vaultImportLoading:false,products,...market,maxProducts:20,maxProductGrams:10000,step,initializedChoiceRef:choice,...setters});return market;});}
let market=run();
assert.equal(market.ratesReady,false);
assert.equal(step,0);assert.equal(calculated,false);assert.equal(calls,0);
const ratesSub=m.subscriptions.find(s=>s.ref==='appConfig/goldRates');
assert.equal(ratesSub.opts.includeMetadataChanges,true);
// A cached default rate must not complete the one-shot automatic calculation.
ratesSub.success({data:()=>defaults,exists:()=>true,metadata:{fromCache:true}});
market=run();assert.equal(market.ratesReady,false);assert.equal(step,0);assert.equal(calls,0);
// A server-side missing document also must not bless merged defaults.
ratesSub.success({data:()=>undefined,exists:()=>false,metadata:{fromCache:false}});
market=run();assert.equal(market.ratesReady,false);assert.equal(step,0);
// Delayed server rate: execute the actual auto hook and actual calculation helpers.
const oldWindow=globalThis.window;globalThis.window={setTimeout:()=>0};
try {
  ratesSub.success({data:()=>remote,exists:()=>true,metadata:{fromCache:false}});
  market=run();assert.equal(market.ratesReady,true);assert.equal(step,1);assert.equal(calculated,true);
  assert.equal(m.getExchangeTotals(products).totalGrams,2.662);assert.equal(calls,1);
  run();assert.equal(calls,1);
} finally { if(oldWindow===undefined)delete globalThis.window;else globalThis.window=oldWindow; }

// Execute the actual page handler body, including its loading guard.
const page=await readFile(path.join(root,'src/pages/GoldExchange.jsx'),'utf8');
const body=page.match(/const onCalculateCore = \(e\) => \{([\s\S]*?)\n  \};/);
assert.ok(body,'manual calculate handler missing');
let message='',writes=0,validations=0;
const manual=new Function('ratesReady','setError','validateExchangeProductsForCalculation','products','rates','pureGoldBuyPricePerDon','MAX_PRODUCTS_PER_BOOKING','MAX_PRODUCT_GRAMS','setProducts','e',body[1]);
manual(false,v=>{message=v;},()=>{validations++;return {ok:true};},[row],defaults,760000,20,10000,()=>{writes++;},{preventDefault(){}});
assert.match(message,/불러오는 중/);assert.equal(writes,0);assert.equal(validations,0);
const fullManual=new Function('ratesReady','setError','validateExchangeProductsForCalculation','products','rates','pureGoldBuyPricePerDon','MAX_PRODUCTS_PER_BOOKING','MAX_PRODUCT_GRAMS','setProducts','setCalculated','initializedChoiceRef','trackProductEventOncePerSession','analyticsSourceMode','setStep','STEP','window','nudgeAppInstall','applyExchangeFinalWeights','e',body[1]);
let manualProducts=[row],manualStep=0;
fullManual(true,()=>{},m.validateExchangeProductsForCalculation,manualProducts,remote,760000,20,10000,fn=>{manualProducts=fn(manualProducts);},()=>{},{current:true},()=>{},'manual',v=>{manualStep=v;},{BARS:1,RESERVE:2},{setTimeout:()=>0},()=>{},m.applyExchangeFinalWeights,{preventDefault(){}});
assert.equal(manualStep,1);assert.equal(m.getExchangeTotals(manualProducts).totalGrams,2.662);
console.log('GOLD RATE READINESS: PASS (delayed server 0.71, cached defaults blocked, missing document blocked, manual loading blocked, auto/manual 2.662g)');
