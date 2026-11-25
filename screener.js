(()=>{
const $=s=>document.querySelector(s),esc=CX.esc;CX.chrome('screener','Screener');
const D={minP:2,maxP:'',minV:250000,minB:'',maxB:'',minCap:300,sect:'',ind:'',near:15,rsiT:35,batch:100,s3:12,order:'mc'},IDS=Object.keys(D);
const saved=Object.assign({},D,CX.get('form',{}));IDS.forEach(i=>$('#'+i).value=saved[i]);
const num=v=>v===''||v==null?'':+v;
const form=()=>{const f={};IDS.forEach(i=>f[i]=$('#'+i).value);CX.set('form',f);['minP','maxP','minV','minB','maxB','minCap','near','rsiT','batch','s3'].forEach(k=>{f[k]=num(f[k]);if(f[k]===''&&['minV','minCap','near','rsiT','batch','s3'].includes(k))f[k]=D[k]});return f};
IDS.forEach(i=>$('#'+i).onchange=form);
let results=CX.get('results',[]),sorts=CX.get('sorts',[['codex',-1],['tier',1],['price',1]]),busy=false,stopFlag=false;
const COLS=[['t','Ticker'],['price','Price'],['codex','Codex'],['tier','Volatility'],['exp5','Exp. 5d move'],['drift3m','3M drift'],['rsi','RSI'],['dist52','Above 52W low'],['v20','Avg volume'],['beta','Beta'],['sector','Sector'],['entry','4H entry'],['pats','Signals']];
const val=(r,k)=>k==='tier'?CX.tierRank.indexOf(r.tier):k==='pats'?r.pats.length:k==='entry'?(r.entry?2:r.sig4h&&r.sig4h.pierced?1:0):r[k];
/* sort controls */
$('#sorts').innerHTML=[0,1,2].map(i=>`<div><label>${['Sort by','Then by','Then by'][i]}</label><div style="display:flex;gap:6px"><select data-i="${i}" data-k="c">${COLS.map(c=>`<option value="${c[0]}">${c[1]}</option>`).join('')}</select><select data-i="${i}" data-k="d"><option value="1">Low to high</option><option value="-1">High to low</option></select></div></div>`).join('');
sorts.forEach((s,i)=>{document.querySelector(`[data-i="${i}"][data-k=c]`).value=s[0];document.querySelector(`[data-i="${i}"][data-k=d]`).value=s[1]});
$('#sorts').onchange=()=>{sorts=[0,1,2].map(i=>[document.querySelector(`[data-i="${i}"][data-k=c]`).value,+document.querySelector(`[data-i="${i}"][data-k=d]`).value]);CX.set('sorts',sorts);render()};
$('#head').innerHTML='<tr>'+COLS.map(c=>`<th data-c="${c[0]}">${c[1]}</th>`).join('')+'<th>Actions</th></tr>';
$('#head').onclick=e=>{const c=e.target.dataset.c;if(!c)return;const d=sorts[0][0]===c?-sorts[0][1]:1;sorts=[[c,d],...sorts.filter(s=>s[0]!==c)].slice(0,3);while(sorts.length<3)sorts.push(['price',1]);CX.set('sorts',sorts);sorts.forEach((s,i)=>{document.querySelector(`[data-i="${i}"][data-k=c]`).value=s[0];document.querySelector(`[data-i="${i}"][data-k=d]`).value=s[1]});render()};
const f1=(x,d=1)=>x==null||isNaN(x)?'-':(+x).toFixed(d),big=v=>v>=1e6?(v/1e6).toFixed(1)+'M':v>=1e3?(v/1e3).toFixed(0)+'K':f1(v,0);
function render(){const w=new Set(CX.get('watch',[]).map(x=>x.t)),rows=results.slice().sort((a,b)=>{for(const[k,d]of sorts){const x=val(a,k),y=val(b,k);if(x==y)continue;if(x==null)return 1;if(y==null)return-1;return(x>y?1:-1)*d}return 0});
$('#count').textContent=rows.length+' stocks in results';const lr=CX.get('lastRun');$('#asof').textContent=lr?'Last scan '+new Date(lr.ts).toLocaleString():'';
$('#body').innerHTML=rows.length?rows.map(r=>`<tr><td><b>${esc(r.t)}</b><div class="muted" style="font-size:11px">${esc((r.name||'').slice(0,24))}</div></td><td>$${f1(r.price,2)}</td><td><b>${r.codex}</b></td><td>${r.tier}<div class="muted" style="font-size:11px">${f1(r.sig,1)}% daily</div></td><td>&plusmn;${f1(r.exp5)}%</td><td class="${r.drift3m>=0?'up':'dn'}">${f1(r.drift3m)}%</td><td>${f1(r.rsi,0)}</td><td>${f1(r.dist52)}%</td><td>${big(r.v20)}</td><td>${f1(r.beta,2)}</td><td>${esc(r.sector||'')}</td><td>${r.entry?'<span class="chip bull">Signal</span>':r.sig4h&&r.sig4h.pierced?'<span class="chip neutral">Already in 1D</span>':'-'}</td><td>${r.pats.map(p=>`<span class="chip ${p[1]}">${p[0]}</span>`).join('')}${r.flags.map(p=>`<span class="chip bear">${p}</span>`).join('')}</td><td><button class="b sm ghost" data-a="chart" data-t="${esc(r.t)}">Chart</button> <button class="b sm ghost" data-a="watch" data-t="${esc(r.t)}">${w.has(r.t)?'Unwatch':'Watch'}</button> <button class="b sm ghost" data-a="paper" data-t="${esc(r.t)}">Paper</button> <button class="b sm ghost" data-a="black" data-t="${esc(r.t)}">Blacklist</button></td></tr>`).join(''):'<tr><td colspan="14" class="muted" style="padding:24px">No results yet. Add your keys in Settings, then choose Scan next batch.</td></tr>'}
let pt=null;
$('#body').onclick=e=>{const b=e.target.closest('button');if(!b)return;const t=b.dataset.t,r=results.find(x=>x.t===t);
if(b.dataset.a==='chart')window.open('chart.html?s='+encodeURIComponent(t),'cx_'+t,'width=1300,height=880');
if(b.dataset.a==='watch'){CX.toggleWatch(t,r.name,r.price);render()}
if(b.dataset.a==='black'&&confirm('Blacklist '+t+'? It will be removed from results and skipped in every future scan.')){CX.blacklist(t);results=CX.get('results',[]);render()}
if(b.dataset.a==='paper'){pt=r;$('#pdT').textContent='Paper trade: '+t;$('#pdP').value=r.price.toFixed(2);$('#pd').showModal()}};
$('#pdNo').onclick=()=>$('#pd').close();
$('#pdOk').onclick=()=>{const s=+$('#pdS').value,p=+$('#pdP').value;if(!(s>0&&p>0))return;const rg=CX.get('regime');
CX.paperAdd(pt.t,s,p,{codex:pt.codex,rsi:pt.rsi,pats:pt.pats.map(x=>x[0]),bull:pt.pats.filter(x=>x[1]==='bull').map(x=>x[0]),entrySignal:!!pt.entry,tier:pt.tier,v20:pt.v20,dist52:pt.dist52,price:pt.price,regime:rg?{label:rg.label,SPY:rg.SPY.close,QQQ:rg.QQQ.close}:null});$('#pd').close();$('#msg').textContent=pt.t+' added to paper trades.'};
/* regime banner */
function showRegime(){const r=CX.get('regime');if(!r)return;const c=l=>/Bull/.test(l)?'ok':/Bear/.test(l)?'bad':'warn';$('#regime').innerHTML=`<span class="pill ${c(r.label)}">Overall: ${r.label}</span><span class="pill ${c(r.SPY.label)}">SPY: ${r.SPY.label}</span><span class="pill ${c(r.QQQ.label)}">QQQ: ${r.QQQ.label}</span><span class="muted">${new Date(r.ts).toLocaleString()}</span>`}
CX.onWait=s=>{if(busy)$('#msg').textContent='Waiting '+s+'s for the Twelve Data per-minute limit...'};
/* scan */
const ONLY=new Set(['NYSE','NASDAQ']);
async function universe(f,force){const sig=JSON.stringify([f.sect,f.ind,f.minCap,f.order]),u=CX.get('universe');if(!force&&u&&u.sig===sig&&u.date===CX.today())return u;
$('#msg').textContent='Loading the stock list from Business Quant...';
const uj=await CX.bq('/universe?security_type=Equity'),ur=(uj&&uj.data)||uj;if(!Array.isArray(ur))throw new Error('Business Quant returned an unexpected stock list.');
const um=new Map(ur.filter(x=>x.security_type==='Equity'&&ONLY.has(x.exchange)).map(x=>[x.ticker,x]));
let c='"Net Income (Yr)" > 0 AND "Market Capitalization" >= '+(f.minCap||0)*1e6;const list=(s,col)=>s.split(',').map(x=>x.trim().replace(/'/g,'')).filter(Boolean).map(x=>`"${col}" = '${x}'`);
const sc=list(f.sect||'','sector'),ic=list(f.ind||'','industry');if(sc.length)c+=' AND ('+sc.join(' OR ')+')';if(ic.length)c+=' AND ('+ic.join(' OR ')+')';
$('#msg').textContent='Applying the positive net income filter...';
const j=await CX.bq('/screener?page=1&limit=10000',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({conditions:c,preferred_columns:['Net Income (Yr)','Market Capitalization']})});
if(!j||!Array.isArray(j.data))throw new Error('Business Quant returned an unexpected screener response.');
const rows=j.data.filter(d=>um.has(d.ticker)).map(d=>{const m=um.get(d.ticker);return{t:d.ticker,n:d.name_short||d.name||m.name_short||d.ticker,s:d.sector||m.sector,i:d.industry||m.industry,ex:m.exchange,ni:d['Net Income (Yr)'],mc:d['Market Capitalization']}});
rows.sort((a,b)=>f.order==='mca'?a.mc-b.mc:b.mc-a.mc);if(f.order==='rnd')rows.sort(()=>Math.random()-.5);
const o={sig,date:CX.today(),rows,cursor:0,profitable:j.data.length,listed:um.size};CX.set('universe',o);return o}
async function scan(restart){if(busy)return;const f=form();busy=true;stopFlag=false;$('#go').disabled=true;$('#stop').disabled=false;
const st={ts:Date.now(),universe:0,profitable:0,listed:0,scanned:0,passed:0,rejData:0,rejPrice:0,rejVol:0,rejBeta:0,rejSignal:0,bqErr:0,bqCalls:0,tdErr:0,rl:0,s3:0,s3Target:0,s3Skipped:false,errors:[],bqOk:false,mktOk:false,stopped:false,tdCredits:0};const u0=CX.usage();
try{$('#msg').textContent='Checking the overall market...';const{bars}=await CX.regime();showRegime();st.mktOk=true;const spy=bars.SPY;
const u=await universe(f,restart);st.bqOk=true;st.universe=u.rows.length;st.profitable=u.profitable;st.listed=u.listed;
const left=CX.cfg().bqLimit-CX.usage().bq,size=Math.min(f.batch,Math.max(0,left)*20);if(size<=0)throw new Error('No Business Quant calls left today ('+CX.usage().bq+'/'+CX.cfg().bqLimit+'). Try again after the daily reset.');
if(u.cursor>=u.rows.length){$('#msg').textContent='Reached the end of the stock list. Choose Start over to begin again.';u.cursor=0;CX.set('universe',u);return}
const black=new Set(CX.get('black',[]).map(x=>x.t)),slice=u.rows.slice(u.cursor,u.cursor+size),[from,till]=CX.range(420),fresh=[];let done=0;
for(let i=0;i<slice.length;i+=20){if(stopFlag){st.stopped=true;break}const chunk=slice.slice(i,i+20).filter(x=>!black.has(x.t));$('#prog').style.width=(i/slice.length*100)+'%';$('#msg').textContent=`Loading prices for stocks ${u.cursor+i+1} to ${u.cursor+Math.min(i+20,slice.length)} of ${u.rows.length}...`;
let map;try{map=await CX.bqQuotes(chunk.map(x=>x.t),from,till);st.bqCalls++}catch(e){st.bqErr++;if(st.errors.length<8)st.errors.push(e.message);if(/budget|429|limit/i.test(e.message))break;done=i+20;continue}
done=Math.min(i+20,slice.length);
for(const x of chunk){const b=map.get(x.t);if(!b||b.length<70){st.rejData++;continue}st.scanned++;const a=CX.analyze(b,x.ni,spy);
if(a.price<(f.minP||0)||(f.maxP&&a.price>f.maxP)){st.rejPrice++;continue}if(a.v20<(f.minV||0)){st.rejVol++;continue}
if((f.minB!==''&&a.beta!=null&&a.beta<f.minB)||(f.maxB!==''&&a.beta!=null&&a.beta>f.maxB)){st.rejBeta++;continue}
if(!(a.dist52<=f.near||a.rsi<=f.rsiT)){st.rejSignal++;continue}
st.passed++;fresh.push(Object.assign({t:x.t,name:x.n,sector:x.s,industry:x.i,ni:x.ni,exchange:x.ex,ts:Date.now(),sig4h:null,entry:false},a))}}
u.cursor+=done;CX.set('universe',u);
const top=fresh.slice().sort((a,b)=>b.codex-a.codex).slice(0,f.s3||0);st.s3Target=top.length;
if(top.length&&!CX.key.td()){st.s3Skipped=true;st.s3Target=0}else{let k=0;for(const r of top){if(stopFlag)break;k++;$('#msg').textContent=`Checking the 4H chart for ${r.t} (${k} of ${top.length})`;
try{const{bars:b4}=await CX.td(r.t,'4h',120);const s=CX.sig4h(b4);r.sig4h={pierced:s.pierced,pats:s.pats};r.entry=s.pierced&&r.aboveKCL;st.s3++}catch(e){st.tdErr++;if(/run out|daily|limit/i.test(e.message))st.rl++;if(st.errors.length<8)st.errors.push(r.t+' (4H): '+e.message);if(/run out|daily/i.test(e.message))break}}}
const ids=new Set(slice.map(x=>x.t));results=results.filter(r=>!ids.has(r.t)).concat(fresh);CX.set('results',results);
$('#msg').textContent=`Done. ${st.passed} of ${st.scanned} stocks checked made the list.${st.s3Skipped?' 4H checks were skipped because no Twelve Data key is saved.':''}`}
catch(e){st.errors.push(e.message);$('#msg').innerHTML='<span class="bad">'+esc(e.message)+'</span>'}
finally{const u1=CX.usage();st.tdCredits=u1.td-u0.td;st.bqUsed=u1.bq-u0.bq;st.seconds=Math.round((Date.now()-st.ts)/1000);st.results=results.length;CX.set('lastRun',st);busy=false;$('#go').disabled=false;$('#stop').disabled=true;$('#prog').style.width='0';render()}}
$('#go').onclick=()=>scan(false);$('#stop').onclick=()=>{stopFlag=true};
$('#reset').onclick=()=>scan(true);
$('#clear').onclick=()=>{if(confirm('Clear all screener results?')){results=[];CX.set('results',[]);render()}};
showRegime();render();
})();
