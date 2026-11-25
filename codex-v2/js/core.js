window.CX=(()=>{
const P='cx2:',sleep=ms=>new Promise(r=>setTimeout(r,ms)),J=JSON;
const get=(k,d)=>{try{const v=localStorage.getItem(P+k);return v==null?d:J.parse(v)}catch(e){return d}};
const set=(k,v)=>{try{localStorage.setItem(P+k,J.stringify(v));return true}catch(e){return false}};
const today=()=>new Date().toISOString().slice(0,10);
const cfg=()=>Object.assign({bqLimit:30,tdDay:800,tdMin:8},get('cfg',{}));
const key={bq:()=>localStorage.getItem('codex-bq-key')||'',td:()=>localStorage.getItem('codex-td-key')||''};
const api={get,set,cfg,key,sleep,today};
const esc=s=>String(s==null?'':s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));api.esc=esc;
/* ---------- usage tracking ---------- */
function usage(){let u=get('usage');if(!u||u.date!==today()){u={date:today(),bq:0,td:0,err:0,rl:0};set('usage',u)}return u}
function bump(k){const u=usage();u[k]++;set('usage',u);paint()}
const win=()=>get('tdwin',[]).filter(t=>Date.now()-t<60000);
api.usage=usage;api.tdWindow=()=>win().length;
async function slot(){for(;;){const w=win();if(w.length<cfg().tdMin){w.push(Date.now());set('tdwin',w);return}const ms=60000-(Date.now()-w[0])+300;api.onWait&&api.onWait(Math.ceil(ms/1000));paint();await sleep(Math.min(ms,1000))}}
function paint(){const el=document.getElementById('usage');if(!el)return;const u=usage(),c=cfg(),w=win().length,k=(a,b)=>a>=b?'bad':a>=.8*b?'warn':'';
el.innerHTML=`<b>API usage</b><div class="${k(u.td,c.tdDay)}">Twelve Data <span>${u.td}/${c.tdDay} today, ${w}/${c.tdMin} this minute</span></div><div class="${k(u.bq,c.bqLimit)}">Business Quant <span>${u.bq}/${c.bqLimit} today</span></div>${u.err?`<div class="warn">Errors today <span>${u.err}${u.rl?`, ${u.rl} rate-limited`:''}</span></div>`:''}`}
/* ---------- API calls ---------- */
const pruneCache=()=>{const ks=Object.keys(localStorage).filter(k=>k.startsWith(P+'c:'));if(ks.length<10)return;ks.map(k=>[k,(J.parse(localStorage.getItem(k))||{}).ts||0]).sort((a,b)=>a[1]-b[1]).slice(0,ks.length-8).forEach(x=>localStorage.removeItem(x[0]))};
api.td=async(sym,interval,size=260,o={})=>{const ck='c:'+sym+'|'+interval+'|'+size;
if(o.cache){const c=get(ck);if(c&&Date.now()-c.ts<6e5)return c.d}
const k=key.td();if(!k)throw new Error('Add your Twelve Data key in Settings.');
await slot();bump('td');let j;
try{const r=await fetch(`https://api.twelvedata.com/time_series?symbol=${encodeURIComponent(sym)}&interval=${interval}&outputsize=${size}&order=asc&timezone=UTC&apikey=${k}`);j=await r.json()}catch(e){bump('err');throw new Error('Could not reach Twelve Data (network or browser block).')}
if(!j||j.status==='error'||!j.values){bump('err');if(j&&j.code===429)bump('rl');throw new Error((j&&j.message)||'Twelve Data returned no data')}
const d={meta:j.meta,bars:j.values.map(v=>({t:v.datetime,o:+v.open,h:+v.high,l:+v.low,c:+v.close,v:+(v.volume||0)})).filter(x=>x.c>0)};
if(o.cache){pruneCache();set(ck,{ts:Date.now(),d})}return d};
api.bq=async(path,o={})=>{const k=key.bq();if(!k)throw new Error('Add your Business Quant key in Settings.');bump('bq');
let r;try{r=await fetch('https://data.businessquant.com'+path+(path.includes('?')?'&':'?')+'api_key='+encodeURIComponent(k),o)}catch(e){bump('err');throw new Error('Could not reach Business Quant (network or browser block).')}
if(!r.ok){bump('err');throw new Error('Business Quant '+r.status+(r.status==401?': key not accepted.':r.status==429?': limit reached.':''))}return r.json()};
/* ---------- indicators ---------- */
const avg=a=>a.reduce((s,x)=>s+x,0)/(a.length||1),cl=(x,a=0,b=1)=>Math.max(a,Math.min(b,x));
const I={};api.I=I;
I.sd=a=>{const m=avg(a);return Math.sqrt(avg(a.map(x=>(x-m)**2)))};
I.ema=(a,n)=>{const k=2/(n+1);let p=a[0];return a.map((x,i)=>i?(p=x*k+p*(1-k)):p)};
I.rsi=(c,n=14)=>{const o=Array(c.length).fill(null);if(c.length<=n)return o;let g=0,l=0;for(let i=1;i<=n;i++){const d=c[i]-c[i-1];d>0?g+=d:l-=d}g/=n;l/=n;o[n]=l?100-100/(1+g/l):100;for(let i=n+1;i<c.length;i++){const d=c[i]-c[i-1];g=(g*(n-1)+(d>0?d:0))/n;l=(l*(n-1)+(d<0?-d:0))/n;o[i]=l?100-100/(1+g/l):100}return o};
I.atr=(b,n=10)=>{const tr=b.map((x,i)=>i?Math.max(x.h-x.l,Math.abs(x.h-b[i-1].c),Math.abs(x.l-b[i-1].c)):x.h-x.l);let p=avg(tr.slice(0,n));return tr.map((x,i)=>i<n-1?null:i===n-1?p:(p=(p*(n-1)+x)/n))};
I.macd=c=>{const a=I.ema(c,12),b=I.ema(c,26),m=a.map((x,i)=>x-b[i]),s=I.ema(m,9);return{m,s,h:m.map((x,i)=>x-s[i])}};
I.kc=(b,n=20,k=2)=>{const m=I.ema(b.map(x=>x.c),n),a=I.atr(b,10);return{m,u:m.map((x,i)=>a[i]==null?null:x+k*a[i]),l:m.map((x,i)=>a[i]==null?null:x-k*a[i])}};
I.levels=(b,w=4,look=150)=>{const s=b.slice(-look),pts=[];for(let i=w;i<s.length-w;i++){const h=s.slice(i-w,i+w+1);if(s[i].h===Math.max(...h.map(x=>x.h)))pts.push(s[i].h);if(s[i].l===Math.min(...h.map(x=>x.l)))pts.push(s[i].l)}pts.sort((a,b)=>a-b);const o=[];pts.forEach(p=>{const L=o[o.length-1];if(L&&p/L.p-1<.015){L.p=(L.p*L.n+p)/(L.n+1);L.n++}else o.push({p,n:1})});return o};
I.pat=b=>{const n=b.length;if(n<6)return[];const r=[],c=b[n-1],p=b[n-2],q=b[n-3],body=x=>Math.abs(x.c-x.o),rg=x=>(x.h-x.l)||1e-9,up=x=>x.c>x.o,dn=x=>x.c<x.o,lo=x=>Math.min(x.o,x.c)-x.l,hi=x=>x.h-Math.max(x.o,x.c),down=b[n-5].c>b[n-2].c,upT=b[n-5].c<b[n-2].c;
if(down&&body(c)>0&&lo(c)>=2*body(c)&&hi(c)<=.35*body(c))r.push(['Hammer','bull']);
if(down&&dn(p)&&up(c)&&c.c>=p.o&&c.o<=p.c)r.push(['Bullish Engulfing','bull']);
if(down&&dn(q)&&body(q)>.5*rg(q)&&body(p)<.3*rg(p)&&up(c)&&c.c>(q.o+q.c)/2)r.push(['Morning Star','bull']);
if(down&&dn(p)&&up(c)&&c.o<p.c&&c.c>(p.o+p.c)/2&&c.c<p.o)r.push(['Piercing Line','bull']);
if(upT&&body(c)>0&&hi(c)>=2*body(c)&&lo(c)<=.35*body(c))r.push(['Shooting Star','bear']);
if(upT&&up(p)&&dn(c)&&c.o>=p.c&&c.c<=p.o)r.push(['Bearish Engulfing','bear']);
if(upT&&up(q)&&body(q)>.5*rg(q)&&body(p)<.3*rg(p)&&dn(c)&&c.c<(q.o+q.c)/2)r.push(['Evening Star','bear']);
if(upT&&up(p)&&dn(c)&&c.o>p.c&&c.c<(p.o+p.c)/2&&c.c>p.o)r.push(['Dark Cloud Cover','bear']);
if(body(c)<=.1*rg(c))r.push(['Doji','neutral']);return r};
/* ---------- scoring ---------- */
const tiers=[[1,'Ultra Stable'],[1.8,'Stable'],[2.8,'Neutral'],[4,'Volatile'],[1e9,'Aggressive']];
api.tierRank=tiers.map(t=>t[1]);api.tierOf=s=>tiers.find(t=>s<t[0])[1];
api.analyze=(b,ni,spy)=>{const n=b.length,c=b.map(x=>x.c),L=b[n-1],rs=I.rsi(c),rsi=rs[n-1],mc=I.macd(c),kc=I.kc(b);
const yr=b.slice(-252),low52=Math.min(...yr.map(x=>x.l)),high52=Math.max(...yr.map(x=>x.h)),dist52=(L.c/low52-1)*100;
const v20=avg(b.slice(-20).map(x=>x.v)),v5=avg(b.slice(-5).map(x=>x.v)),v50=avg(b.slice(-50).map(x=>x.v)),vr=v5/(v50||1);
const r=c.slice(-64).map((x,i,a)=>i?(x/a[i-1]-1)*100:0).slice(1),sig=I.sd(r),exp5=sig*Math.sqrt(5),drift3m=(c[n-1]/c[Math.max(0,n-64)]-1)*100,rng=avg(b.slice(-63).map(x=>(x.h-x.l)/x.c*100));
let beta=null;if(spy){const m=new Map(spy.map(x=>[x.t.slice(0,10),x.c])),pr=[];let pc=null,ps=null;for(const x of b.slice(-253)){const s=m.get(x.t.slice(0,10));if(s==null)continue;if(pc!=null)pr.push([x.c/pc-1,s/ps-1]);pc=x.c;ps=s}
if(pr.length>60){const mx=avg(pr.map(p=>p[1])),my=avg(pr.map(p=>p[0]));let cv=0,vv=0;pr.forEach(p=>{cv+=(p[0]-my)*(p[1]-mx);vv+=(p[1]-mx)**2});beta=vv?cv/vv:null}}
const pats=I.pat(b),bull=pats.filter(p=>p[1]==='bull').length,bear=pats.filter(p=>p[1]==='bear').length;
const lv=I.levels(b).filter(x=>x.n>=2).map(x=>x.p),sup=lv.filter(p=>p<L.c).pop(),res=lv.find(p=>p>L.c);
const roc3=(c[n-1]/c[n-4]-1)*100,histUp=mc.h[n-1]>mc.h[n-2],rsiUp=rsi>rs[n-3],bounce=L.c>b[n-2].c,near=sup&&(L.c/sup-1)*100<3,broke=lv.some(p=>b[n-4].c>p&&L.c<p*.99);
const mom=.4*cl(vr/2)+.35*cl((roc3+2)/6)+.25*cl(Math.log10((v20||1)/250000));
const osc=cl(.35*(rsiUp?1:0)+.3*(histUp?1:0)+.35*cl(bull*.7)-bear*.4);
const sr=broke?.1:near?(bounce?1:.45):(res&&(res/L.c-1)*100<3?(vr>1.2?.7:.45):.5);
const os=.6*cl((50-rsi)/25)+.4*cl(1-dist52/20),pf=ni>0?cl(.5+.5*Math.log10(ni/1e7)/2):ni==null?.5:0;
const codex=Math.round(100*(.35*mom+.25*osc+.2*sr+.12*os+.08*pf)),flags=[];
if(bear)flags.push('Bearish candle');if(broke)flags.push('Breaking support');if(mc.h[n-1]<0&&!histUp)flags.push('MACD weakening');if(v20<250000)flags.push('Thin volume');
const low20=Math.min(...b.slice(-20).map(x=>x.l)),kl=kc.l[n-1];
return{price:L.c,asof:L.t,codex,parts:{mom,osc,sr,os,pf},rsi,dist52,low52,high52,v20,vr,sig,tier:api.tierOf(sig),exp5,drift3m,rng,beta,pats,flags,sup,res,aboveKCL:L.c>=kl,zone:[Math.min(low20,kl),Math.max(low20,kl)]}};
api.sig4h=b=>{const k=I.kc(b),n=b.length;let pierced=false;for(let i=Math.max(0,n-6);i<n;i++)if(k.l[i]!=null&&b[i].c<k.l[i])pierced=true;return{pierced,pats:I.pat(b)}};
api.regimeOf=b=>{const c=b.map(x=>x.c),n=c.length,e=(a,k)=>I.ema(a,k)[n-1],s=k=>avg(c.slice(-k)),mh=I.macd(c).h[n-1],rs=I.rsi(c)[n-1];
const pts=(c[n-1]>e(c,20)?1:-1)+(c[n-1]>s(50)?1:-1)+(n>=200?(c[n-1]>s(200)?1:-1):0)+(rs>55?1:rs<45?-1:0)+(mh>0?1:-1);
return{pts,close:c[n-1],t:b[n-1].t,rsi:rs,label:api.regimeLabel(pts)}};
api.regimeLabel=p=>p<=-4?'Extremely Bearish':p<=-2?'Bearish':p<=1?'Neutral':p<=3?'Bullish':'Extremely Bullish';
api.regime=async()=>{const o={ts:Date.now()},bars={};for(const s of['SPY','QQQ']){const d=await api.td(s,'1day',260);bars[s]=d.bars;o[s]=api.regimeOf(d.bars)}o.pts=(o.SPY.pts+o.QQQ.pts)/2;o.label=api.regimeLabel(Math.round(o.pts));set('regime',o);return{regime:o,bars}};
/* ---------- lists ---------- */
api.listAdd=(k,item,idf='t')=>{const l=get(k,[]);if(!l.some(x=>x[idf]===item[idf])){l.push(item);set(k,l);return true}return false};
api.listDel=(k,t,idf='t')=>set(k,get(k,[]).filter(x=>x[idf]!==t));
api.toggleWatch=(t,name,price)=>{if(get('watch',[]).some(x=>x.t===t)){api.listDel('watch',t);return false}api.listAdd('watch',{t,name,price,added:today()});return true};
api.blacklist=t=>{api.listAdd('black',{t,added:today()});api.listDel('watch',t);set('results',get('results',[]).filter(r=>r.t!==t))};
api.paperAdd=(t,shares,entry,snap)=>{const l=get('paper',[]);l.push({id:Date.now(),t,shares:+shares,entry:+entry,stop:+(entry*.95).toFixed(4),opened:today(),snap:snap||null,exit:null,closed:null});set('paper',l)};
/* ---------- page chrome ---------- */
api.chrome=(active,title)=>{const nav=[['index.html','Screener','screener'],['portfolio.html','Watch &amp; Paper','portfolio'],['diagnostics.html','Diagnostics','diag']];
document.body.insertAdjacentHTML('afterbegin',`<header class="top"><a class="brand" href="index.html"><img class="ca" src="codex-ca.png" alt="" onerror="this.style.display='none'"><div><img class="word" src="codex-word.png" alt="" onerror="this.outerHTML='<div class=txt>CODEX</div>'"><div class="sub">ANALYTICS</div></div></a><div class="divider"></div><div class="tool"><b>Stock Ticker V2</b><small>${title}</small></div><nav>${nav.map(n=>`<a href="${n[0]}" class="${n[2]===active?'on':''}">${n[1]}</a>`).join('')}<button id="setBtn">Settings</button></nav></header>`);
document.body.insertAdjacentHTML('beforeend',`<div id="usage"></div><dialog id="setDlg"><h2>Settings</h2><label>Business Quant API key</label><input id="sBq" type="password" autocomplete="off"><label>Twelve Data API key</label><input id="sTd" type="password" autocomplete="off"><div class="grid" style="margin-top:6px"><div><label>Business Quant daily budget</label><input id="sBl" type="number"></div><div><label>Twelve Data per day</label><input id="sTdd" type="number"></div><div><label>Twelve Data per minute</label><input id="sTm" type="number"></div></div><p class="muted">Keys stay in this browser only. Usage counts what this browser has called today.</p><div class="row"><button class="b" id="sSave">Save</button><button class="b ghost" id="sReset">Reset today's counters</button><button class="b ghost" id="sClose">Close</button></div></dialog>`);
const d=document.getElementById('setDlg'),v=id=>document.getElementById(id);
v('setBtn').onclick=()=>{const c=cfg();v('sBq').value=key.bq();v('sTd').value=key.td();v('sBl').value=c.bqLimit;v('sTdd').value=c.tdDay;v('sTm').value=c.tdMin;d.showModal()};
v('sClose').onclick=()=>d.close();v('sReset').onclick=()=>{set('usage',{date:today(),bq:0,td:0,err:0,rl:0});set('tdwin',[]);paint()};
v('sSave').onclick=()=>{localStorage.setItem('codex-bq-key',v('sBq').value.trim());localStorage.setItem('codex-td-key',v('sTd').value.trim());set('cfg',{bqLimit:+v('sBl').value||30,tdDay:+v('sTdd').value||800,tdMin:+v('sTm').value||8});d.close();paint()};
paint();setInterval(paint,2000);window.addEventListener('storage',paint);
if(!key.td()||!key.bq())setTimeout(()=>v('setBtn').click(),300)};
return api})();
