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
await T('Business Quant: metric list',async()=>{const j=await CX.bq('/metadata?table=screener');const names=(Array.isArray(j)?j:j.data||[]).map(x=>x.metric_full),ok=names.includes('Net Income (Yr)')&&names.includes('Market Capitalization');return[ok,names.length+' metrics found. "Net Income (Yr)" and "Market Capitalization" '+(ok?'are available.':'were not found, so the scan filter needs different metric names.')]});
await T('Business Quant: stock list',async()=>{const j=await CX.bq('/universe?security_type=Equity'),r=(j&&j.data)||j||[],n=r.filter(x=>x.exchange==='NASDAQ').length,y=r.filter(x=>x.exchange==='NYSE').length;return[n>0&&y>0,`${r.length} equities listed, including ${n} NASDAQ and ${y} NYSE. Only those two exchanges are scanned.`]});
await T('Business Quant: screener query',async()=>{const j=await CX.bq('/screener?page=1&limit=3',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({conditions:'"Net Income (Yr)" > 0 AND "Market Capitalization" >= 1000000000',preferred_columns:['Net Income (Yr)','Market Capitalization']})});const d=j.data||[];return[d.length>0&&!!d[0].ticker,d.length?`Returned ${j.metadata?j.metadata.total_records:d.length} matching stocks, for example ${d[0].ticker}.`:'No rows came back.']});
await T('Business Quant: batch prices',async()=>{const t=['AAPL','MSFT','JNJ','KO','SPY'],[f,e]=CX.range(420),m=await CX.bqQuotes(t,f,e),n=t.map(x=>(m.get(x)||[]).length),ok=n.every(x=>x>=200);return[ok,`Price rows per stock: ${t.map((x,i)=>x+' '+n[i]).join(', ')}. ${ok?'Full year of history for all five, so batches of 20 are safe.':'Some stocks came back short, so batches may be truncated. Send me this result.'}`]});
await T('Twelve Data: 4H candles',async()=>{const d=await CX.td('AAPL','4h',5);return[d.bars.length>=3&&d.bars[0].c>0,`Got ${d.bars.length} four-hour candles. This powers the 4H entry check and the 4H chart.`]});
await T('Twelve Data: 1H candles',async()=>{const d=await CX.td('AAPL','1h',5);return[d.bars.length>=3,`Got ${d.bars.length} one-hour candles.`]});
const u1=CX.usage();add(u1.bq-u0.bq===4&&u1.td-u0.td===2?'pass':'warn','Usage counter',`Business Quant moved by ${u1.bq-u0.bq} (expected 4) and Twelve Data by ${u1.td-u0.td} (expected 2).`)};
function review(){const r=CX.get('lastRun');if(!r){$('#run').innerHTML='<div class="muted">No screener run has been recorded yet. Run a scan on the Screener page and this section will review it automatically.</div>';return}
const o=[],rej=`price ${r.rejPrice}, volume ${r.rejVol}, beta ${r.rejBeta}, missing or short history ${r.rejData}, no oversold or 52W-low signal ${r.rejSignal}`,u=CX.usage(),c=CX.cfg();
o.push(row('pass','Last run',`${new Date(r.ts).toLocaleString()}, ${r.seconds} seconds, ${r.bqUsed??0} Business Quant calls and ${r.tdCredits} Twelve Data credits used.${r.stopped?' You stopped it early.':''}`));
o.push(row(r.bqOk?'pass':'fail','Stock list',r.bqOk?`${r.listed} NYSE and NASDAQ stocks listed, ${r.universe} with positive net income and the market cap you set.`:'The stock list could not be built. '+(r.errors[0]||'')));
o.push(row(r.mktOk?'pass':'fail','Market check (SPY and QQQ)',r.mktOk?'Both indexes loaded.':'The index prices did not load.'));
o.push(row(!r.bqCalls?'fail':r.bqErr?'warn':'pass','Price loading',r.bqCalls?`${r.bqCalls} price calls succeeded${r.bqErr?', '+r.bqErr+' failed':''}, covering ${r.scanned} stocks.`:'No price calls succeeded.'));
o.push(row(r.passed?'pass':'warn','Stocks that made the list',r.passed?`${r.passed} of ${r.scanned} checked. Rejected for: ${rej}.`:`None passed. Rejected for: ${rej}. Consider widening the 52W-low range or raising the RSI limit.`));
o.push(row(r.s3Skipped?'warn':r.s3Target&&r.s3<r.s3Target?'warn':'pass','4H entry checks',r.s3Skipped?'Skipped because no Twelve Data key is saved.':r.s3Target?`${r.s3} of ${r.s3Target} four-hour checks completed.`:'No 4H checks were needed.'));
const res=CX.get('results',[]),bad=res.filter(x=>!(x.price>0)||!(x.codex>=0&&x.codex<=100)||!isFinite(x.rsi));o.push(row(bad.length?'fail':'pass','Result data sanity',bad.length?`${bad.length} stored results have invalid values: ${bad.slice(0,5).map(x=>x.t).join(', ')}.`:`All ${res.length} stored results have valid prices, RSI and Codex scores.`));
if(r.errors.length)o.push(row('warn','Errors recorded',r.errors.join(' | ')));
o.push(row(u.bq>=c.bqLimit?'fail':u.bq>=.8*c.bqLimit?'warn':'pass','Business Quant budget left today',`${c.bqLimit-u.bq} calls remaining, enough for about ${Math.max(0,c.bqLimit-u.bq)*20} more stocks.`));
$('#run').innerHTML=o.join('')}
review();
})();
