(()=>{
const $=s=>document.querySelector(s),esc=CX.esc;CX.chrome('screener','Screener');
/* ---------- settings ---------- */
const STRAT={os:'Oversold',cross:'MACD and RSI crossover',golden:'Golden cross',ichi:'Ichimoku cloud'};
const F=[
['minP','Min share price ($)','num','2'],['maxP','Max share price ($)','num',''],
['strat','Strategy','sel','os',[['os','Oversold (RSI)'],['cross','MACD and RSI crossover'],['golden','Golden cross (50 and 200 average)'],['ichi','Ichimoku cloud']]],
['tf','Chart used for the signal','sel','1D',[['1D','1D (daily chart)'],['4H','4H (uses Twelve Data credits)']]],
['osT','Oversold means RSI at or below','sel','30',[['25','25 - Deeply oversold'],['30','30 - Oversold (standard)'],['35','35 - Approaching oversold'],['40','40 - Early weakness']],'os'],
['needs','Which bullish crossover','sel','either',[['either','MACD or RSI (either one)'],['macd','MACD only'],['rsi','RSI only'],['both','MACD and RSI (both)']],'cross'],
['rsiType','RSI crossover type','sel','ma',[['ma','RSI crosses above its 9-period average'],['30','RSI crosses above 30'],['50','RSI crosses above 50']],'cross'],
['timing','Crossover timing','sel','both',[['at','At crossing'],['both','At crossing or approaching']],'cross'],
['gcTiming','Golden cross timing','sel','both',[['at','Just crossed (last 10 candles)'],['both','Just crossed or approaching']],'golden'],
['ichiMin','Minimum Ichimoku score','sel','60',[['40','40 and up'],['50','50 and up'],['60','60 and up'],['75','75 and up'],['90','90 and up']],'ichi'],
['dc','Stocks with a death cross','sel','show',[['show','Show them with a warning'],['hide','Hide them']]],
['batch','Stocks per batch','sel','100',[['50','50 - Quick Scan'],['100','100 - Standard Scan'],['250','250 - Deep Scan'],['400','400 - Maximum Scan']]]];
const SDESC={os:'Finds stocks whose RSI (14) is at or below your oversold level on the chosen chart.',cross:'Finds bullish crossovers on the chosen chart. MACD crossover means the MACD line crossing above its signal line. RSI crossover means RSI (14) crossing above its 9-period average, above 30, or above 50, whichever you choose. You can use either one alone, either of the two, or require both. At crossing means it crossed within the last 2 candles. Approaching means it is still below but rising and on pace to cross within 3 candles.',golden:'Finds stocks where the 50-period average has crossed above the 200-period average within the last 10 candles, or is approaching that cross, on the chosen chart.',ichi:'Scores each stock out of 100 on the chosen chart: candle closes above the cloud 30, Tenkan above or piercing above the cloud 25, base line cross 20, bullish future cloud 15, lagging span above price 10. Stocks at or above your minimum score are kept.'};
const saved=CX.get('form3',{}),cur={};
F.forEach(f=>{const v=saved[f[0]];cur[f[0]]=v!==undefined&&(f[2]==='num'||f[4].some(o=>o[0]===v))?v:f[3]});
$('#form').innerHTML=F.map(f=>f[2]==='num'?`<div><label>${f[1]}</label><input id="f_${f[0]}" type="number" step="any" min="0"></div>`:`<div id="w_${f[0]}"><label>${f[1]}</label><select id="f_${f[0]}">${f[4].map(o=>`<option value="${esc(o[0])}">${esc(o[1])}</option>`).join('')}</select></div>`).join('');
const showRows=()=>{F.forEach(f=>{if(f[5]){const w=$('#w_'+f[0]);w.style.display=cur.strat===f[5]?'':'none'}});$('#sdesc').textContent=SDESC[cur.strat]};
F.forEach(f=>{const el=$('#f_'+f[0]);el.value=cur[f[0]];el.onchange=()=>{cur[f[0]]=el.value;CX.set('form3',cur);showRows()}});showRows();
const num=v=>v===''||v==null?'':+v;
const form=()=>{const f=Object.assign({},cur);['minP','maxP'].forEach(k=>f[k]=num(f[k]));return f};
/* ---------- results table ---------- */
let results=CX.get('results',[]),sorts=CX.get('sorts2',[['codex',-1],['tier',1],['price',1]]),busy=false,stopFlag=false;
const COLS=[['t','Ticker'],['price','Price'],['codex','Codex'],['tier','Volatility'],['exp5','Typical 5d move'],['drift3m','3M drift'],['rsi','RSI'],['dist52','Above 52W low'],['v20','Avg volume'],['sector','Sector'],['entry','4H entry'],['setup','Setup'],['good','Good signals'],['bad','Bad signals']];
const sg=r=>r.sigs||{good:(r.pats||[]).filter(p=>p[1]==='bull').map(p=>({n:p[0],w:50})),bad:(r.pats||[]).filter(p=>p[1]==='bear').map(p=>({n:p[0],w:50}))},top=(r,k)=>Math.max(0,...sg(r)[k].map(x=>x.w));
const val=(r,k)=>k==='tier'?CX.tierRank.indexOf(r.tier):k==='good'?top(r,'good'):k==='bad'?top(r,'bad'):k==='setup'?(r.setup?r.setup.score:null):k==='entry'?(r.entry?2:r.sig4h&&r.sig4h.pierced?1:0):r[k];
$('#sorts').innerHTML=[0,1,2].map(i=>`<div><label>${['Sort by','Then by','Then by'][i]}</label><div style="display:flex;gap:6px"><select data-i="${i}" data-k="c"><option value="">(none)</option>${COLS.map(c=>`<option value="${c[0]}">${c[1]}</option>`).join('')}</select><select data-i="${i}" data-k="d"><option value="1">Low to high</option><option value="-1">High to low</option></select></div></div>`).join('');
const q=(i,k)=>document.querySelector(`[data-i="${i}"][data-k="${k}"]`);
const syncSort=()=>sorts.forEach((s,i)=>{q(i,'c').value=s[0];q(i,'d').value=s[1]});syncSort();
$('#sorts').onchange=()=>{sorts=[0,1,2].map(i=>[q(i,'c').value,+q(i,'d').value]);CX.set('sorts2',sorts);render()};
$('#head').innerHTML='<tr>'+COLS.map(c=>`<th data-c="${c[0]}">${c[1]}</th>`).join('')+'<th>Actions</th></tr>';
$('#head').onclick=e=>{const c=e.target.dataset.c;if(!c)return;const d=sorts[0][0]===c?-sorts[0][1]:1;sorts=[[c,d],...sorts.filter(s=>s[0]&&s[0]!==c)].slice(0,3);while(sorts.length<3)sorts.push(['',1]);CX.set('sorts2',sorts);syncSort();render()};
const f1=(x,d=1)=>x==null||isNaN(x)?'-':(+x).toFixed(d),big=v=>v>=1e6?(v/1e6).toFixed(1)+'M':v>=1e3?(v/1e3).toFixed(0)+'K':f1(v,0);
function render(){const w=new Set(CX.get('watch',[]).map(x=>x.t)),act=sorts.filter(s=>s[0]),rows=results.slice().sort((a,b)=>{for(const[k,d]of act){const x=val(a,k),y=val(b,k);if(x==y)continue;if(x==null)return 1;if(y==null)return-1;return(x>y?1:-1)*d}return 0});
$('#count').textContent=rows.length+' stocks in results';const lr=CX.get('lastRun');const ad=results.map(r=>r.asof).filter(Boolean).sort().pop();$('#asof').textContent=(lr?'Last scan '+new Date(lr.ts).toLocaleString():'')+(ad?'. Prices as of the '+ad.slice(0,10)+' close.':'');
$('#body').innerHTML=rows.length?rows.map(r=>`<tr><td><b>${esc(r.t)}</b><div class="muted" style="font-size:11px">${esc((r.name||'').slice(0,24))}</div></td><td>$${f1(r.price,2)}</td><td><b>${r.codex}</b></td><td>${r.tier}<div class="muted" style="font-size:11px">${f1(r.sig,1)}% daily</div></td><td>&plusmn;${f1(r.exp5)}%</td><td class="${r.drift3m>=0?'up':'dn'}">${f1(r.drift3m)}%</td><td>${f1(r.rsi,0)}</td><td>${f1(r.dist52)}%</td><td>${big(r.v20)}</td><td>${esc(r.sector||'')}</td><td>${r.entry?'<span class="chip bull">Signal</span>':r.sig4h&&r.sig4h.pierced?'<span class="chip neutral">Already in 1D</span>':'-'}</td><td>${r.setup?`<div class="muted" style="font-size:11px">${esc(r.setup.label)}</div>${r.setup.score!=null?`<b>${r.setup.score}</b> `:''}${r.setup.chips.map(c=>`<span class="chip ${/no cross/.test(c)?'neutral':'bull'}">${esc(c)}</span>`).join('')}`:'-'}</td><td>${sg(r).good.map(x=>`<span class="chip bull">${esc(x.n)}</span>`).join('')||'-'}</td><td>${sg(r).bad.map(x=>`<span class="chip bad${x.w>=80?' sev':''}">${esc(x.n)}</span>`).join('')||'-'}</td><td><button class="b sm ghost" data-a="chart" data-t="${esc(r.t)}">Chart</button> <button class="b sm ghost" data-a="watch" data-t="${esc(r.t)}">${w.has(r.t)?'Unwatch':'Watch'}</button> <button class="b sm ghost" data-a="paper" data-t="${esc(r.t)}">Paper</button> <button class="b sm ghost" data-a="black" data-t="${esc(r.t)}">Blacklist</button></td></tr>`).join(''):'<tr><td colspan="15" class="muted" style="padding:24px">No results yet. Add your keys in Settings, then choose Scan next batch.</td></tr>'}
let pt=null;
$('#body').onclick=e=>{const b=e.target.closest('button');if(!b)return;const t=b.dataset.t,r=results.find(x=>x.t===t);
if(b.dataset.a==='chart')window.open('chart.html?s='+encodeURIComponent(t),'cx_'+t,'width=1300,height=880');
if(b.dataset.a==='watch'){CX.toggleWatch(t,r.name,r.price);render()}
if(b.dataset.a==='black'&&confirm('Blacklist '+t+'? It will be removed from results and skipped in every future scan.')){CX.blacklist(t);results=CX.get('results',[]);render()}
if(b.dataset.a==='paper'){pt=r;$('#pdT').textContent='Paper trade: '+t;$('#pdP').value=r.price.toFixed(2);$('#pd').showModal()}};
$('#pdNo').onclick=()=>$('#pd').close();
$('#pdOk').onclick=()=>{const s=+$('#pdS').value,p=+$('#pdP').value;if(!(s>0&&p>0))return;const rg2=CX.get('regime');
CX.paperAdd(pt.t,s,p,{codex:pt.codex,rsi:pt.rsi,pats:pt.pats.map(x=>x[0]),bull:pt.pats.filter(x=>x[1]==='bull').map(x=>x[0]),entrySignal:!!pt.entry,tier:pt.tier,v20:pt.v20,dist52:pt.dist52,price:pt.price,regime:rg2?{label:rg2.label,SPY:rg2.SPY.close,QQQ:rg2.QQQ.close}:null});$('#pd').close();$('#msg').textContent=pt.t+' added to paper trades.'};
function showRegime(){const r=CX.get('regime');if(!r)return;const c=l=>/Bull/.test(l)?'ok':/Bear/.test(l)?'bad':'warn';$('#regime').innerHTML=`<span class="pill ${c(r.label)}">Overall: ${r.label}</span><span class="pill ${c(r.SPY.label)}">SPY: ${r.SPY.label}</span><span class="pill ${c(r.QQQ.label)}">QQQ: ${r.QQQ.label}</span><span class="muted">${new Date(r.ts).toLocaleString()}</span>`}
CX.onWait=s=>{if(busy)$('#msg').textContent='Waiting '+s+'s for the Twelve Data per-minute limit...'};
/* ---------- universe and scan ---------- */
const ONLY=new Set(['NYSE','NASDAQ']);
async function universe(force){const u=CX.get('universe');if(!force&&u&&u.date===CX.today()&&u.rows&&!u.facets)return u;
$('#msg').textContent='Reading Business Quant metric names...';const m=await CX.metrics();
if(!m.ni)throw new Error('Could not find the annual net income metric in Business Quant. Closest names: '+m.hints.join(', '));
$('#msg').textContent='Loading the stock list from Business Quant...';
const uj=await CX.bq('/universe?security_type=Equity'),ur=(uj&&uj.data)||uj;if(!Array.isArray(ur))throw new Error('Business Quant returned an unexpected stock list.');
const um=new Map(ur.filter(x=>x.security_type==='Equity'&&ONLY.has(x.exchange)).map(x=>[x.ticker,x]));
$('#msg').textContent='Applying the positive net income filter...';
const j=await CX.bq('/screener?page=1&limit=10000',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({conditions:`"${m.ni}" > 0`,preferred_columns:[m.ni]})});
if(!j||!Array.isArray(j.data))throw new Error('Business Quant returned an unexpected screener response.');
const seed=Math.floor(Math.random()*1e9),h=t=>{let v=seed;for(const ch of t)v=(v*31+ch.charCodeAt(0))>>>0;return v};
const rows=j.data.filter(d=>um.has(d.ticker)).map(d=>{const x=um.get(d.ticker);return{t:d.ticker,n:d.name_short||d.name||x.name_short||d.ticker,s:d.sector||x.sector||'',i:d.industry||x.industry||'',ex:x.exchange,ni:+d[m.ni]}}).sort((a,b)=>h(a.t)-h(b.t));
const o={date:CX.today(),rows,cursor:0,profitable:j.data.length,listed:um.size};CX.set('universe',o);return o}
async function scan(restart){if(busy)return;const f=form();busy=true;stopFlag=false;$('#go').disabled=true;$('#stop').disabled=false;
const st={strat:f.strat,tf:f.tf,ts:Date.now(),universe:0,profitable:0,listed:0,scanned:0,passed:0,rejData:0,rejPrice:0,rejVol:0,rejBeta:0,rejSignal:0,rejFilter:0,bqErr:0,bqCalls:0,tdErr:0,rl:0,s3:0,s3Target:0,s3Skipped:false,errors:[],bqOk:false,mktOk:false,stopped:false,tdCredits:0};const u0=CX.usage();
try{if(f.tf==='4H'&&!CX.key.td())throw new Error('4H scans need a Twelve Data key. Add it in Settings, or choose the 1D chart.');$('#msg').textContent='Checking the overall market...';const{bars}=await CX.regime();showRegime();st.mktOk=true;const spy=bars.SPY;
const u=await universe(restart);st.bqOk=true;st.profitable=u.profitable;st.listed=u.listed;
const P=u.rows;st.universe=P.length;
const left=CX.cfg().bqLimit-CX.usage().bq,size=Math.min(+f.batch,Math.max(0,left)*20);if(size<=0)throw new Error('No Business Quant calls left today ('+CX.usage().bq+'/'+CX.cfg().bqLimit+'). Try again after the daily reset.');
if(u.cursor>=P.length){$('#msg').textContent='Reached the end of the list for these filters. Choose Start over to begin again.';u.cursor=0;CX.set('universe',u);return}
let halt=false;const black=new Set(CX.get('black',[]).map(x=>x.t)),slice=P.slice(u.cursor,u.cursor+size),[from,till]=CX.range(420),fresh=[];let done=0;
for(let i=0;i<slice.length;i+=20){if(stopFlag){st.stopped=true;break}const chunk=slice.slice(i,i+20).filter(x=>!black.has(x.t));$('#prog').style.width=(i/slice.length*100)+'%';$('#msg').textContent=`Loading prices for stocks ${u.cursor+i+1} to ${u.cursor+Math.min(i+20,slice.length)} of ${P.length}...`;
let map;try{map=await CX.bqQuotes(chunk.map(x=>x.t),from,till);st.bqCalls++}catch(e){st.bqErr++;if(st.errors.length<8)st.errors.push(e.message);if(/budget|429|limit/i.test(e.message))break;done=i+20;continue}
done=Math.min(i+20,slice.length);
for(const x of chunk){if(stopFlag){st.stopped=true;halt=true;break}const b=map.get(x.t);if(!b||b.length<70){st.rejData++;continue}st.scanned++;const a=CX.analyze(b,x.ni,spy);
if(a.price<(f.minP||0)||(f.maxP!==''&&a.price>f.maxP)){st.rejPrice++;continue}if(a.v20<250000){st.rejVol++;continue}
if(f.dc==='hide'&&a.death){st.rejDeath=(st.rejDeath||0)+1;continue}
let sb=b,s4=null;
if(f.tf==='4H'){if(CX.usage().td>=CX.cfg().tdDay){st.errors.push('Twelve Data daily credit budget reached.');st.rl++;halt=true;break}
$('#msg').textContent=`Checking the 4H chart for ${x.t} (${st.scanned} stocks checked, ${st.passed} found)`;
try{const d=await CX.td(x.t,'4h',f.strat==='golden'?300:200);sb=d.bars;s4=CX.sig4h(sb);st.s3++}catch(e){st.tdErr++;if(st.errors.length<8)st.errors.push(x.t+' (4H): '+e.message);if(/run out|daily/i.test(e.message)){st.rl++;halt=true;break}continue}}
if(sb.length<(f.strat==='golden'?215:100)){st.rejData++;continue}
const sg=CX.signal(f,sb);if(!sg.ok){st.rejSignal++;continue}
st.passed++;const r=Object.assign({t:x.t,name:x.n,sector:x.s,industry:x.i,ni:x.ni,exchange:x.ex,ts:Date.now(),sig4h:null,entry:false},a,{setup:{label:STRAT[f.strat]+' on '+f.tf,score:sg.score,chips:sg.chips}});
if(s4){r.sig4h={pierced:s4.pierced,pats:s4.pats};r.entry=s4.pierced&&a.aboveKCL}fresh.push(r)}
if(halt)break}
u.cursor+=done;CX.set('universe',u);
const top=f.tf==='1D'?fresh.slice().sort((a,b)=>b.codex-a.codex).slice(0,10):[];st.s3Target=top.length;
if(top.length&&!CX.key.td()){st.s3Skipped=true;st.s3Target=0}else{let k=0;for(const r of top){if(stopFlag)break;k++;$('#msg').textContent=`Checking the 4H chart for ${r.t} (${k} of ${top.length})`;
try{const{bars:b4}=await CX.td(r.t,'4h',120);const s=CX.sig4h(b4);r.sig4h={pierced:s.pierced,pats:s.pats};r.entry=s.pierced&&r.aboveKCL;st.s3++}catch(e){st.tdErr++;if(/run out|daily|limit/i.test(e.message))st.rl++;if(st.errors.length<8)st.errors.push(r.t+' (4H): '+e.message);if(/run out|daily/i.test(e.message))break}}}
const ids=new Set(slice.map(x=>x.t));results=results.filter(r=>!ids.has(r.t)).concat(fresh);CX.set('results',results);
$('#msg').textContent=`Done. Checked ${st.scanned} stocks and found ${st.passed} matching your strategy. No setup match: ${st.rejSignal}. Outside price range: ${st.rejPrice}.${st.rejDeath?' Hidden for a death cross: '+st.rejDeath+'.':''} Under 250K volume: ${st.rejVol}.${st.passed?'':' Scan another batch, or loosen the strategy settings.'}${st.s3Skipped?' 4H checks were skipped because no Twelve Data key is saved.':''}`}
catch(e){st.errors.push(e.message);$('#msg').innerHTML='<span class="bad">'+esc(e.message)+'</span>'}
finally{const u1=CX.usage();st.tdCredits=u1.td-u0.td;st.bqUsed=u1.bq-u0.bq;st.seconds=Math.round((Date.now()-st.ts)/1000);st.results=results.length;CX.set('lastRun',st);busy=false;$('#go').disabled=false;$('#stop').disabled=true;$('#prog').style.width='0';render()}}
$('#go').onclick=()=>scan(false);$('#stop').onclick=()=>{stopFlag=true};$('#reset').onclick=()=>scan(true);
$('#clear').onclick=()=>{if(confirm('Clear all screener results?')){results=[];CX.set('results',[]);render()}};
showRegime();render();
})();
