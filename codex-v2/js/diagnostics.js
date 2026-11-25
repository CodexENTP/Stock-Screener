(()=>{
const $=s=>document.querySelector(s),esc=CX.esc,I=CX.I;CX.chrome('diag','Diagnostics');
const row=(s,name,msg)=>`<div class="test ${s}"><div class="s">${s==='pass'?'Pass':s==='warn'?'Check':'Fail'}</div><div><b>${esc(name)}</b><div class="muted">${esc(msg)}</div></div></div>`;
const synth=(n,f)=>{const b=[];let p=100;for(let i=0;i<n;i++){const o=p,c=f(i,p);b.push({t:new Date(Date.UTC(2025,0,1+i)).toISOString().slice(0,10),o,h:Math.max(o,c)+1,l:Math.min(o,c)-1,c,v:1e6+i*1000});p=c}return b};
const offline=[
['Browser storage',()=>{const k='diag-'+Date.now();return[CX.set(k,{a:1})&&CX.get(k).a===1,'Saved and read back a test value.']}],
['Indicators: RSI',()=>{const r=I.rsi(Array.from({length:40},(_, i)=>100+i));return[r[39]===100,'RSI of a steadily rising series is '+r[39]+' (expected 100).']}],
['Indicators: EMA, ATR',()=>{const e=I.ema(Array(30).fill(50),20),a=I.atr(Array.from({length:30},()=>({h:52,l:50,c:51})),10);return[Math.abs(e[29]-50)<1e-9&&Math.abs(a[29]-2)<1e-9,'EMA of a flat series is '+e[29].toFixed(2)+' and ATR of constant 2-point ranges is '+a[29].toFixed(2)+'.']}],
['Indicators: Keltner order',()=>{const b=synth(60,(i,p)=>p+Math.sin(i)),k=I.kc(b),n=59;return[k.l[n]<k.m[n]&&k.m[n]<k.u[n],'Lower, middle and upper bands are in the right order.']}],
['Indicators: MACD',()=>{const m=I.macd(synth(80,(i,p)=>p+1));return[m.m[79]>0&&isFinite(m.h[79]),'MACD is positive on an uptrend.']}],
['Candlestick patterns',()=>{const b=[...synth(6,(i,p)=>p-2),{t:'x',o:90,h:90.5,l:86,c:87,v:1},{t:'y',o:86,h:92,l:85.5,c:91,v:1}];const p=I.pat(b).map(x=>x[0]);return[p.includes('Bullish Engulfing'),'Detected: '+(p.join(', ')||'nothing')+'.']}],
['Codex score and volatility',()=>{const b=synth(260,(i,p)=>p*(1+Math.sin(i/3)*.01-.0005)),a=CX.analyze(b,5e8,b),ok=a.codex>=0&&a.codex<=100&&['price','rsi','dist52','sig','exp5'].every(k=>isFinite(a[k]));return[ok,`Sample stock scored ${a.codex}, ${a.tier}, expected 5-day move about ${a.exp5.toFixed(1)}%.`]}],
['Volatility tiers',()=>[[.5,1.5,2.5,3.5,6].map(CX.tierOf).join()==='Ultra Stable,Stable,Neutral,Volatile,Aggressive','Tier ranges: under 1% Ultra Stable, 1 to 1.8 Stable, 1.8 to 2.8 Neutral, 2.8 to 4 Volatile, above 4 Aggressive (daily standard deviation).']],
['Market rating',()=>{const r=CX.regimeOf(synth(260,(i,p)=>p+1)),d=CX.regimeOf(synth(260,(i,p)=>p-.3));return[/Bullish/.test(r.label)&&/Bearish/.test(d.label),'Rising series rated '+r.label+', falling series rated '+d.label+'.']}],
['Chart library',()=>[typeof LightweightCharts!=='undefined','TradingView Lightweight Charts '+(typeof LightweightCharts!=='undefined'?'loaded.':'did not load. Check your internet connection.')]],
['API keys saved',()=>[!!CX.key.bq()&&!!CX.key.td(),(CX.key.bq()?'Business Quant key saved. ':'Business Quant key missing. ')+(CX.key.td()?'Twelve Data key saved.':'Twelve Data key missing.')]]];
$('#off').onclick=()=>{$('#offOut').innerHTML=offline.map(([n,f])=>{try{const[ok,m]=f();return row(ok?'pass':'fail',n,m)}catch(e){return row('fail',n,e.message)}}).join('')};
$('#api').onclick=async()=>{const out=[],show=()=>$('#apiOut').innerHTML=out.join('')||'Running...',add=(s,n,m)=>{out.push(row(s,n,m));show()};show();const u0=CX.usage();
const T=async(n,fn)=>{try{const[ok,m]=await fn();add(ok?'pass':'warn',n,m)}catch(e){add('fail',n,e.message)}};
await T('Business Quant: metric list',async()=>{const j=await CX.bq('/metadata?table=screener');const names=(Array.isArray(j)?j:j.data||[]).map(x=>x.metric_full);return[names.includes('Net Income (Yr)')&&names.includes('Market Capitalization'),names.length+' metrics found. "Net Income (Yr)" and "Market Capitalization" '+(names.includes('Net Income (Yr)')&&names.includes('Market Capitalization')?'are available.':'were not found, so the scan filter needs a different metric name.')]});
await T('Business Quant: screener query',async()=>{const j=await CX.bq('/screener?page=1&limit=3',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({conditions:'"Net Income (Yr)" > 0 AND "Market Capitalization" > 1000000000',preferred_columns:['Net Income (Yr)','Market Capitalization']})});const d=j.data||[];return[d.length>0&&d[0].ticker,d.length?`Returned ${j.metadata?j.metadata.total_records:d.length} matching stocks, for example ${d[0].ticker}.`:'No rows came back.']});
await T('Twelve Data: daily candles',async()=>{const d=await CX.td('AAPL','1day',5);return[d.bars.length>=3&&d.bars[0].c>0,`Got ${d.bars.length} daily candles. Exchange reported as "${d.meta.exchange}", which the exchange filter reads.`]});
await T('Twelve Data: 4H candles',async()=>{const d=await CX.td('AAPL','4h',5);return[d.bars.length>=3,`Got ${d.bars.length} four-hour candles.`]});
await T('Twelve Data: 1H candles (used for the 1H chart)',async()=>{const d=await CX.td('AAPL','1h',5);return[d.bars.length>=3,`Got ${d.bars.length} one-hour candles.`]});
const u1=CX.usage();add(u1.td-u0.td===3?'pass':'warn','Usage counter',`Twelve Data counter moved by ${u1.td-u0.td} (expected 3) and Business Quant by ${u1.bq-u0.bq} (expected 2).`)};
function review(){const r=CX.get('lastRun');if(!r){$('#run').innerHTML='<div class="muted">No screener run has been recorded yet. Run a scan on the Screener page and this section will review it automatically.</div>';return}
const o=[],ok=r.scanned?(r.scanned-r.tdErr)/r.scanned:0,rej=`price ${r.rejPrice}, volume ${r.rejVol}, beta ${r.rejBeta}, exchange ${r.rejExch}, thin history ${r.rejData}, no oversold or 52W-low signal ${r.rejSignal}`;
o.push(row('pass','Last run',`${new Date(r.ts).toLocaleString()}, ${r.seconds} seconds, ${r.tdCredits} Twelve Data credits used.${r.stopped?' You stopped it early.':''}`));
o.push(row(r.bqOk?'pass':'fail','Business Quant universe',r.bqOk?`Built a universe of ${r.universe} stocks with positive net income.`:'The universe could not be built. '+(r.errors[0]||'')));
o.push(row(r.tdOk?'pass':'fail','Market check (SPY and QQQ)',r.tdOk?'Both indexes loaded.':'Twelve Data did not return the index data.'));
o.push(row(!r.scanned?'fail':ok>=.95?'pass':ok>=.8?'warn':'fail','Twelve Data success rate',r.scanned?`${r.scanned-r.tdErr} of ${r.scanned} requests succeeded (${Math.round(ok*100)}%).`:'No stocks were scanned.'));
o.push(row(r.rl?'warn':'pass','Rate limits',r.rl?`Hit the credit limit ${r.rl} time(s). Wait for the daily or per-minute reset before scanning again.`:'No rate-limit errors.'));
o.push(row(r.passed?'pass':'warn','Stocks that made the list',r.passed?`${r.passed} of ${r.scanned} scanned. Rejected for: ${rej}.`:`None passed. Rejected for: ${rej}. Consider widening the 52W-low range or raising the RSI limit.`));
o.push(row(r.s3Target?(r.s3===r.s3Target?'pass':'warn'):'pass','4H entry checks',r.s3Target?`${r.s3} of ${r.s3Target} four-hour checks completed.`:'No 4H checks were needed.'));
const res=CX.get('results',[]),bad=res.filter(x=>!(x.price>0)||!(x.codex>=0&&x.codex<=100)||!isFinite(x.rsi));o.push(row(bad.length?'fail':'pass','Result data sanity',bad.length?`${bad.length} stored results have invalid values: ${bad.slice(0,5).map(x=>x.t).join(', ')}.`:`All ${res.length} stored results have valid prices, RSI and Codex scores.`));
if(r.errors.length)o.push(row('warn','Errors recorded',r.errors.join(' | ')));
const u=CX.usage(),c=CX.cfg();o.push(row(u.td>=c.tdDay?'fail':u.td>=.8*c.tdDay?'warn':'pass','Twelve Data budget left today',`${c.tdDay-u.td} credits remaining, which is about ${c.tdDay-u.td} more stocks.`));
$('#run').innerHTML=o.join('')}
review();
})();
