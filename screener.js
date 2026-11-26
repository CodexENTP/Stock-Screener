(()=>{
const $=s=>document.querySelector(s),esc=CX.esc;CX.chrome('screener','Screener');
/* ---------- filter definitions (modeled on the TradingView stock screener) ---------- */
const O=(a)=>a.map(x=>Array.isArray(x)?x:[x,x]);
const F=[
['minP','Min price ($)','num','2'],['maxP','Max price ($)','num',''],
['cap','Market cap','sel','300:',[['','Any'],[':300','Micro (under $300M)'],['300:2000','Small ($300M to $2B)'],['2000:10000','Mid ($2B to $10B)'],['10000:200000','Large ($10B to $200B)'],['200000:','Mega (over $200B)'],['300:','$300M and up'],['1000:','$1B and up']]],
['vol','Avg volume (20 day)','sel','250000',[['250000','250K and up'],['500000','500K and up'],['1000000','1M and up'],['2000000','2M and up'],['5000000','5M and up']]],
['relvol','Volume vs 50-day average','sel','',[['','Any'],['1','Above 1x'],['1.5','Above 1.5x'],['2','Above 2x'],['3','Above 3x']]],
['chg','Change at last close','sel','',[['','Any'],[':-3','Down more than 3%'],['-3:0','Down 0 to 3%'],['0:3','Up 0 to 3%'],['3:','Up more than 3%']]],
['beta','Beta (1-year vs SPY)','sel','',[['','Any'],[':0','Negative'],[':0.5','Under 0.5'],['0.5:1','0.5 to 1'],['1:1.5','1 to 1.5'],['1.5:2','1.5 to 2'],['2:','Over 2']]],
['rsi','RSI (14)','sel','',[['','Any'],[':30','Oversold (under 30)'],[':40','Under 40'],['40:60','40 to 60'],['60:','Over 60'],['70:','Overbought (over 70)']]],
['macd','MACD','sel','',[['','Any'],['up','Histogram rising'],['pos','Histogram above zero'],['neg','Histogram below zero']]],
['pat','Candlestick patterns','sel','',[['','Any'],['bull','Has a bullish pattern'],['nobear','No bearish pattern']]],
['tier','Volatility (3-month daily swing)','multi',[],O(CX.tierRank)],
['sector','Sector','multi',[],'sectors'],['industry','Industry','multi',[],'industries'],
['codex','Codex score','sel','',[['','Any'],['40','40 and up'],['50','50 and up'],['60','60 and up'],['70','70 and up']]],
['signal','Entry idea','sel','either',[['either','Near 52W low or oversold'],['low','Near 52W low only'],['os','Oversold only'],['none','No requirement']]],
['near','Near 52W low means within','sel','15',O(['5','10','15','20','30','50']).map(x=>[x[0],x[0]+'%'])],
['osT','Oversold means RSI at or below','sel','35',O(['25','30','35','40'])],
['batch','Stocks per batch','sel','100',[['50','50 - Quick Scan'],['100','100 - Standard Scan'],['250','250 - Deep Scan'],['400','400 - Maximum Scan']]],
['s3','4H check for top picks','sel','10',[['0','Skip (saves Twelve Data credits)'],['5','Top 5'],['10','Top 10'],['15','Top 15'],['25','Top 25']]],
['order','Start with','sel','mc',[['mc','Largest companies'],['mca','Smallest companies'],['rnd','Random order']]]];
const saved=CX.get('form2',{}),st0={};let facets=(CX.get('universe')||{}).facets||{sectors:[],industries:{}};
F.forEach(f=>{const v=saved[f.id=f[0]];st0[f[0]]=f[2]==='multi'?(Array.isArray(v)?v:[]):(v!==undefined&&(f[2]==='num'||f[4].some(o=>o[0]===v))?v:f[3])});
const cur=st0;
function msOpts(id){const f=F.find(x=>x[0]===id);if(id==='sector')return facets.sectors.map(x=>[x,x]);if(id==='industry'){const S=cur.sector;const l=S.length?S.flatMap(s=>facets.industries[s]||[]):Object.values(facets.industries).flat();return[...new Set(l)].sort().map(x=>[x,x])}return f[4]}
function drawMulti(id){const o=msOpts(id),b=$('#msb_'+id);b.innerHTML=o.length?o.map(x=>`<label><input type="checkbox" value="${esc(x[0])}" ${cur[id].includes(x[0])?'checked':''}>${esc(x[1])}</label>`).join(''):'<span class="muted">Click "Load sector and industry lists" to fill this in.</span>';sumMulti(id)}
function sumMulti(id){const n=cur[id].length;$('#mss_'+id).textContent=n?(n<=2?cur[id].join(', '):n+' selected'):'Any'}
$('#form').innerHTML=F.map(f=>f[2]==='num'?`<div><label>${f[1]}</label><input id="f_${f[0]}" type="number" step="any"></div>`:f[2]==='sel'?`<div><label>${f[1]}</label><select id="f_${f[0]}">${f[4].map(o=>`<option value="${esc(o[0])}">${esc(o[1])}</option>`).join('')}</select></div>`:`<div><label>${f[1]}</label><details class="ms"><summary id="mss_${f[0]}">Any</summary><div class="msb" id="msb_${f[0]}"></div></details></div>`).join('');
const save=()=>CX.set('form2',cur);
F.forEach(f=>{const id=f[0];if(f[2]==='multi'){drawMulti(id);$('#msb_'+id).onchange=e=>{const v=e.target.value;cur[id]=e.target.checked?[...cur[id],v]:cur[id].filter(x=>x!==v);if(id==='sector'){const ok=new Set(msOpts('industry').map(x=>x[0]));cur.industry=cur.industry.filter(x=>ok.has(x));drawMulti('industry')}sumMulti(id);save()}}
else{const el=$('#f_'+id);el.value=cur[id];el.onchange=()=>{cur[id]=el.value;save()}}});
const num=v=>v===''||v==null?'':+v;
const form=()=>{const f=Object.assign({},cur);['minP','maxP'].forEach(k=>f[k]=num(f[k]));return f};
const rg=v=>{if(!v||!String(v).includes(':'))return null;const[a,b]=v.split(':');return[a===''?null:+a,b===''?null:+b]};
const inR=(x,r)=>!r||x==null||((r[0]==null||x>=r[0])&&(r[1]==null||x<r[1]));
/* ---------- results table ---------- */
let results=CX.get('results',[]),sorts=CX.get('sorts2',[['codex',-1],['tier',1],['price',1]]),busy=false,stopFlag=false;
const COLS=[['t','Ticker'],['price','Price'],['codex','Codex'],['tier','Volatility'],['exp5','Typical 5d move'],['drift3m','3M drift'],['rsi','RSI'],['dist52','Above 52W low'],['v20','Avg volume'],['beta','Beta (1-year vs SPY)'],['sector','Sector'],['entry','4H entry'],['pats','Signals']];
const val=(r,k)=>k==='tier'?CX.tierRank.indexOf(r.tier):k==='pats'?r.pats.length:k==='entry'?(r.entry?2:r.sig4h&&r.sig4h.pierced?1:0):r[k];
$('#sorts').innerHTML=[0,1,2].map(i=>`<div><label>${['Sort by','Then by','Then by'][i]}</label><div style="display:flex;gap:6px"><select data-i="${i}" data-k="c"><option value="">(none)</option>${COLS.map(c=>`<option value="${c[0]}">${c[1]}</option>`).join('')}</select><select data-i="${i}" data-k="d"><option value="1">Low to high</option><option value="-1">High to low</option></select></div></div>`).join('');
const q=(i,k)=>document.querySelector(`[data-i="${i}"][data-k="${k}"]`);
const syncSort=()=>sorts.forEach((s,i)=>{q(i,'c').value=s[0];q(i,'d').value=s[1]});syncSort();
$('#sorts').onchange=()=>{sorts=[0,1,2].map(i=>[q(i,'c').value,+q(i,'d').value]);CX.set('sorts2',sorts);render()};
$('#head').innerHTML='<tr>'+COLS.map(c=>`<th data-c="${c[0]}">${c[1]}</th>`).join('')+'<th>Actions</th></tr>';
$('#head').onclick=e=>{const c=e.target.dataset.c;if(!c)return;const d=sorts[0][0]===c?-sorts[0][1]:1;sorts=[[c,d],...sorts.filter(s=>s[0]&&s[0]!==c)].slice(0,3);while(sorts.length<3)sorts.push(['',1]);CX.set('sorts2',sorts);syncSort();render()};
const f1=(x,d=1)=>x==null||isNaN(x)?'-':(+x).toFixed(d),big=v=>v>=1e6?(v/1e6).toFixed(1)+'M':v>=1e3?(v/1e3).toFixed(0)+'K':f1(v,0);
function render(){const w=new Set(CX.get('watch',[]).map(x=>x.t)),act=sorts.filter(s=>s[0]),rows=results.slice().sort((a,b)=>{for(const[k,d]of act){const x=val(a,k),y=val(b,k);if(x==y)continue;if(x==null)return 1;if(y==null)return-1;return(x>y?1:-1)*d}return 0});
$('#count').textContent=rows.length+' stocks in results';const lr=CX.get('lastRun');const ad=results.map(r=>r.asof).filter(Boolean).sort().pop();$('#asof').textContent=(lr?'Last scan '+new Date(lr.ts).toLocaleString():'')+(ad?'. Prices as of the '+ad.slice(0,10)+' close.':'');
$('#body').innerHTML=rows.length?rows.map(r=>`<tr><td><b>${esc(r.t)}</b><div class="muted" style="font-size:11px">${esc((r.name||'').slice(0,24))}</div></td><td>$${f1(r.price,2)}</td><td><b>${r.codex}</b></td><td>${r.tier}<div class="muted" style="font-size:11px">${f1(r.sig,1)}% daily</div></td><td>&plusmn;${f1(r.exp5)}%</td><td class="${r.drift3m>=0?'up':'dn'}">${f1(r.drift3m)}%</td><td>${f1(r.rsi,0)}</td><td>${f1(r.dist52)}%</td><td>${big(r.v20)}</td><td>${f1(r.beta,2)}</td><td>${esc(r.sector||'')}</td><td>${r.entry?'<span class="chip bull">Signal</span>':r.sig4h&&r.sig4h.pierced?'<span class="chip neutral">Already in 1D</span>':'-'}</td><td>${r.pats.map(p=>`<span class="chip ${p[1]}">${p[0]}</span>`).join('')}${r.flags.map(p=>`<span class="chip bear">${p}</span>`).join('')}</td><td><button class="b sm ghost" data-a="chart" data-t="${esc(r.t)}">Chart</button> <button class="b sm ghost" data-a="watch" data-t="${esc(r.t)}">${w.has(r.t)?'Unwatch':'Watch'}</button> <button class="b sm ghost" data-a="paper" data-t="${esc(r.t)}">Paper</button> <button class="b sm ghost" data-a="black" data-t="${esc(r.t)}">Blacklist</button></td></tr>`).join(''):'<tr><td colspan="14" class="muted" style="padding:24px">No results yet. Add your keys in Settings, then choose Scan next batch.</td></tr>'}
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
async function universe(force){const u=CX.get('universe');if(!force&&u&&u.date===CX.today()&&u.rows)return u;
$('#msg').textContent='Reading Business Quant metric names...';const m=await CX.metrics();
if(!m.ni||!m.cap)throw new Error('Could not find the net income or market cap metric in Business Quant. Closest names: '+m.hints.join(', '));
$('#msg').textContent='Loading the stock list from Business Quant...';
const uj=await CX.bq('/universe?security_type=Equity'),ur=(uj&&uj.data)||uj;if(!Array.isArray(ur))throw new Error('Business Quant returned an unexpected stock list.');
const um=new Map(ur.filter(x=>x.security_type==='Equity'&&ONLY.has(x.exchange)).map(x=>[x.ticker,x]));
$('#msg').textContent='Applying the positive net income filter...';
const j=await CX.bq('/screener?page=1&limit=10000',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({conditions:`"${m.ni}" > 0`,preferred_columns:[m.ni,m.cap]})});
if(!j||!Array.isArray(j.data))throw new Error('Business Quant returned an unexpected screener response.');
const rows=j.data.filter(d=>um.has(d.ticker)).map(d=>{const x=um.get(d.ticker);return{t:d.ticker,n:d.name_short||d.name||x.name_short||d.ticker,s:d.sector||x.sector||'',i:d.industry||x.industry||'',ex:x.exchange,ni:+d[m.ni],mc:+d[m.cap]||0}});
const sectors=[...new Set(rows.map(r=>r.s).filter(Boolean))].sort(),industries={};rows.forEach(r=>{if(r.s&&r.i)(industries[r.s]=industries[r.s]||new Set()).add(r.i)});Object.keys(industries).forEach(k=>industries[k]=[...industries[k]].sort());
const o={date:CX.today(),rows,cursor:0,fsig:'',seed:Math.floor(Math.random()*1e9),profitable:j.data.length,listed:um.size,facets:{sectors,industries},metrics:{ni:m.ni,cap:m.cap}};CX.set('universe',o);facets=o.facets;drawMulti('sector');drawMulti('industry');return o}
function pool(u,f){const cr=rg(f.cap),S=new Set(f.sector),I=new Set(f.industry),h=s=>{let v=u.seed;for(const ch of s)v=(v*31+ch.charCodeAt(0))>>>0;return v};
const r=u.rows.filter(x=>inR(x.mc/1e6,cr)&&(!S.size||S.has(x.s))&&(!I.size||I.has(x.i)));r.sort(f.order==='mca'?(a,b)=>a.mc-b.mc:f.order==='rnd'?(a,b)=>h(a.t)-h(b.t):(a,b)=>b.mc-a.mc);return r}
function passes(a,f,st){
if(a.price<(f.minP||0)||(f.maxP!==''&&a.price>f.maxP)){st.rejPrice++;return false}
if(a.v20<+f.vol){st.rejVol++;return false}
if(a.beta!=null&&!inR(a.beta,rg(f.beta))){st.rejBeta++;return false}
const near=a.dist52<=+f.near,os=a.rsi<=+f.osT,ok=f.signal==='either'?(near||os):f.signal==='low'?near:f.signal==='os'?os:true;if(!ok){st.rejSignal++;return false}
const bad=!inR(a.rsi,rg(f.rsi))||(f.relvol&&a.vr<+f.relvol)||!inR(a.chg1d,rg(f.chg))||(f.macd==='up'&&!a.histUp)||(f.macd==='pos'&&!a.histPos)||(f.macd==='neg'&&a.histPos)||(f.pat==='bull'&&!a.pats.some(p=>p[1]==='bull'))||(f.pat==='nobear'&&a.pats.some(p=>p[1]==='bear'))||(f.tier.length&&!f.tier.includes(a.tier))||(f.codex&&a.codex<+f.codex);
if(bad){st.rejFilter++;return false}return true}
async function scan(restart){if(busy)return;const f=form();busy=true;stopFlag=false;$('#go').disabled=true;$('#stop').disabled=false;
const st={ts:Date.now(),universe:0,profitable:0,listed:0,scanned:0,passed:0,rejData:0,rejPrice:0,rejVol:0,rejBeta:0,rejSignal:0,rejFilter:0,bqErr:0,bqCalls:0,tdErr:0,rl:0,s3:0,s3Target:0,s3Skipped:false,errors:[],bqOk:false,mktOk:false,stopped:false,tdCredits:0};const u0=CX.usage();
try{$('#msg').textContent='Checking the overall market...';const{bars}=await CX.regime();showRegime();st.mktOk=true;const spy=bars.SPY;
const u=await universe(restart);st.bqOk=true;st.profitable=u.profitable;st.listed=u.listed;
const P=pool(u,f),fsig=JSON.stringify([f.cap,f.sector,f.industry,f.order]);if(u.fsig!==fsig){u.fsig=fsig;u.cursor=0}st.universe=P.length;
if(!P.length)throw new Error('No stocks match the market cap, sector and industry you chose. Loosen those filters.');
const left=CX.cfg().bqLimit-CX.usage().bq,size=Math.min(+f.batch,Math.max(0,left)*20);if(size<=0)throw new Error('No Business Quant calls left today ('+CX.usage().bq+'/'+CX.cfg().bqLimit+'). Try again after the daily reset.');
if(u.cursor>=P.length){$('#msg').textContent='Reached the end of the list for these filters. Choose Start over to begin again.';u.cursor=0;CX.set('universe',u);return}
const black=new Set(CX.get('black',[]).map(x=>x.t)),slice=P.slice(u.cursor,u.cursor+size),[from,till]=CX.range(420),fresh=[];let done=0;
for(let i=0;i<slice.length;i+=20){if(stopFlag){st.stopped=true;break}const chunk=slice.slice(i,i+20).filter(x=>!black.has(x.t));$('#prog').style.width=(i/slice.length*100)+'%';$('#msg').textContent=`Loading prices for stocks ${u.cursor+i+1} to ${u.cursor+Math.min(i+20,slice.length)} of ${P.length}...`;
let map;try{map=await CX.bqQuotes(chunk.map(x=>x.t),from,till);st.bqCalls++}catch(e){st.bqErr++;if(st.errors.length<8)st.errors.push(e.message);if(/budget|429|limit/i.test(e.message))break;done=i+20;continue}
done=Math.min(i+20,slice.length);
for(const x of chunk){const b=map.get(x.t);if(!b||b.length<70){st.rejData++;continue}st.scanned++;const a=CX.analyze(b,x.ni,spy);if(!passes(a,f,st))continue;
st.passed++;fresh.push(Object.assign({t:x.t,name:x.n,sector:x.s,industry:x.i,ni:x.ni,exchange:x.ex,ts:Date.now(),sig4h:null,entry:false},a))}}
u.cursor+=done;CX.set('universe',u);
const top=fresh.slice().sort((a,b)=>b.codex-a.codex).slice(0,+f.s3||0);st.s3Target=top.length;
if(top.length&&!CX.key.td()){st.s3Skipped=true;st.s3Target=0}else{let k=0;for(const r of top){if(stopFlag)break;k++;$('#msg').textContent=`Checking the 4H chart for ${r.t} (${k} of ${top.length})`;
try{const{bars:b4}=await CX.td(r.t,'4h',120);const s=CX.sig4h(b4);r.sig4h={pierced:s.pierced,pats:s.pats};r.entry=s.pierced&&r.aboveKCL;st.s3++}catch(e){st.tdErr++;if(/run out|daily|limit/i.test(e.message))st.rl++;if(st.errors.length<8)st.errors.push(r.t+' (4H): '+e.message);if(/run out|daily/i.test(e.message))break}}}
const ids=new Set(slice.map(x=>x.t));results=results.filter(r=>!ids.has(r.t)).concat(fresh);CX.set('results',results);
$('#msg').textContent=`Done. ${st.passed} of ${st.scanned} stocks checked made the list.${st.s3Skipped?' 4H checks were skipped because no Twelve Data key is saved.':''}`}
catch(e){st.errors.push(e.message);$('#msg').innerHTML='<span class="bad">'+esc(e.message)+'</span>'}
finally{const u1=CX.usage();st.tdCredits=u1.td-u0.td;st.bqUsed=u1.bq-u0.bq;st.seconds=Math.round((Date.now()-st.ts)/1000);st.results=results.length;CX.set('lastRun',st);busy=false;$('#go').disabled=false;$('#stop').disabled=true;$('#prog').style.width='0';render()}}
$('#go').onclick=()=>scan(false);$('#stop').onclick=()=>{stopFlag=true};$('#reset').onclick=()=>scan(true);
$('#lists').onclick=async()=>{if(busy)return;busy=true;try{await universe(false);$('#msg').textContent='Sector and industry lists loaded. Open the Sector or Industry dropdown to choose.'}catch(e){$('#msg').innerHTML='<span class="bad">'+esc(e.message)+'</span>'}busy=false};
$('#clear').onclick=()=>{if(confirm('Clear all screener results?')){results=[];CX.set('results',[]);render()}};
showRegime();render();
})();
