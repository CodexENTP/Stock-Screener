(()=>{
const $=s=>document.querySelector(s),sym=(new URLSearchParams(location.search).get('s')||'').toUpperCase();CX.chrome('screener','Chart');
document.title=sym+' | Codex Analytics';$('#sym').textContent=sym;
const TF={'1D':['1day',300,1],'4H':['4h',300,1],'2H':['2h',300,1],'1H':['1h',400,1],'15 Min':['15min',400,1]};
let cur='1D',charts=[];
$('#tf').innerHTML=Object.keys(TF).map(k=>`<button data-k="${k}">${k}</button>`).join('');
$('#tf').onclick=e=>{if(e.target.dataset.k)load(e.target.dataset.k)};
const upd=()=>{const on=CX.get('watch',[]).some(x=>x.t===sym);$('#w').textContent=on?'Remove from Watch List':'Add to Watch List';return on};upd();
$('#w').onclick=()=>{CX.toggleWatch(sym,'',lastPx);upd()};
let lastPx=null;
const tm=(t,daily)=>daily?t.slice(0,10):Math.floor(Date.parse(t.replace(' ','T')+'Z')/1000);
function agg(b,n){const o=[];for(let i=0;i<b.length;i+=n){const g=b.slice(i,i+n);if(g.length<n&&i>0&&o.length)break;o.push({t:g[0].t,o:g[0].o,h:Math.max(...g.map(x=>x.h)),l:Math.min(...g.map(x=>x.l)),c:g[g.length-1].c,v:g.reduce((s,x)=>s+x.v,0)})}return o}
const mk=(el,tv)=>{const c=LightweightCharts.createChart(el,{width:el.clientWidth,height:el.clientHeight,layout:{background:{color:'#041226'},textColor:'#aeb7c3'},grid:{vertLines:{color:'#0d2238'},horzLines:{color:'#0d2238'}},rightPriceScale:{borderColor:'#24425e'},timeScale:{borderColor:'#24425e',timeVisible:tv,secondsVisible:false},crosshair:{mode:0}});charts.push(c);return c};
async function load(k){cur=k;[...$('#tf').children].forEach(b=>b.classList.toggle('on',b.dataset.k===k));$('#msg').textContent='Loading '+k+' candles (1 Twelve Data credit, cached 10 min)...';
try{const[iv,size,g]=TF[k],d=await CX.td(sym,iv,size,{cache:true});let b=g>1?agg(d.bars,g):d.bars;const daily=iv==='1day';draw(b,daily);$('#msg').textContent=(d.meta&&d.meta.exchange?d.meta.exchange+'. ':'')+b.length+' candles.'}
catch(e){$('#msg').innerHTML='<span class="bad">'+CX.esc(e.message)+'</span>'}}
function draw(b,daily){charts.forEach(c=>c.remove());charts=[];const T=x=>tm(x.t,daily),seen=new Set();b=b.filter(x=>{const t=T(x);if(seen.has(t))return false;seen.add(t);return true});
const last=b[b.length-1],prev=b[b.length-2]||last;lastPx=last.c;$('#px').textContent='$'+last.c.toFixed(2);const ch=(last.c/prev.c-1)*100;$('#chg').textContent=(ch>=0?'+':'')+ch.toFixed(2)+'%';$('#chg').className=ch>=0?'up':'dn';
const p=mk($('#cp'),!daily),cs=p.addCandlestickSeries({upColor:'#7fc49a',downColor:'#d78585',borderVisible:false,wickUpColor:'#7fc49a',wickDownColor:'#d78585'});cs.setData(b.map(x=>({time:T(x),open:x.o,high:x.h,low:x.l,close:x.c})));
const vs=p.addHistogramSeries({priceFormat:{type:'volume'},priceScaleId:'vol'});p.priceScale('vol').applyOptions({scaleMargins:{top:.82,bottom:0}});vs.setData(b.map(x=>({time:T(x),value:x.v,color:x.c>=x.o?'rgba(127,196,154,.45)':'rgba(215,133,133,.45)'})));
const kc=CX.I.kc(b),line=(arr,col,w=1,st=0)=>{const s=p.addLineSeries({color:col,lineWidth:w,lineStyle:st,priceLineVisible:false,lastValueVisible:false});s.setData(b.map((x,i)=>arr[i]==null||i<20?null:{time:T(x),value:arr[i]}).filter(Boolean));return s};
line(kc.u,'#e0a568',1,2);line(kc.m,'#8a95a5',1,0);line(kc.l,'#e0a568',1,2);
const lv=CX.I.levels(b,4,Math.min(b.length,200)).filter(x=>x.n>=2&&Math.abs(x.p/last.c-1)<.2).sort((x,y)=>Math.abs(x.p-last.c)-Math.abs(y.p-last.c)).slice(0,6);
lv.forEach(x=>cs.createPriceLine({price:x.p,color:x.p<last.c?'#7fc49a':'#d78585',lineWidth:1,lineStyle:1,axisLabelVisible:true,title:x.p<last.c?'Support':'Resistance'}));
const c=b.map(x=>x.c),rs=CX.I.rsi(c),r=mk($('#cr'),!daily),rl=r.addLineSeries({color:'#e0a568',lineWidth:2,priceLineVisible:false});rl.setData(b.map((x,i)=>rs[i]==null?null:{time:T(x),value:rs[i]}).filter(Boolean));
[30,70].forEach(v=>rl.createPriceLine({price:v,color:'#5a6b7d',lineWidth:1,lineStyle:2,axisLabelVisible:true,title:v===30?'Oversold':'Overbought'}));
const mc=CX.I.macd(c),m=mk($('#cm'),!daily),mh=m.addHistogramSeries({priceLineVisible:false});mh.setData(b.map((x,i)=>i<26?null:{time:T(x),value:mc.h[i],color:mc.h[i]>=0?'rgba(127,196,154,.7)':'rgba(215,133,133,.7)'}).filter(Boolean));
const ml=m.addLineSeries({color:'#e0a568',lineWidth:1,priceLineVisible:false}),sl=m.addLineSeries({color:'#8a95a5',lineWidth:1,priceLineVisible:false});
ml.setData(b.map((x,i)=>i<26?null:{time:T(x),value:mc.m[i]}).filter(Boolean));sl.setData(b.map((x,i)=>i<26?null:{time:T(x),value:mc.s[i]}).filter(Boolean));
let busy=false;charts.forEach((c,i)=>c.timeScale().subscribeVisibleLogicalRangeChanged(rg=>{if(busy||!rg)return;busy=true;charts.forEach((o,j)=>{if(j!==i)o.timeScale().setVisibleLogicalRange(rg)});busy=false}));
p.timeScale().setVisibleLogicalRange({from:Math.max(0,b.length-120),to:b.length+3})}
addEventListener('resize',()=>{[['#cp',0],['#cr',1],['#cm',2]].forEach(([s,i])=>charts[i]&&charts[i].resize($(s).clientWidth,$(s).clientHeight))});
if(!sym)$('#msg').textContent='Open this page from the screener or a list so a ticker is selected.';else load('1D');
})();
