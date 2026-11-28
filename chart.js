(()=>{
const $=s=>document.querySelector(s),sym=(new URLSearchParams(location.search).get('s')||'').toUpperCase();CX.chrome('screener','Chart');
document.title=sym+' | Codex Analytics';$('#sym').textContent=sym;
const TF={'1D':['1day',600],'4H':['4h',600],'2H':['2h',600],'1H':['1h',600],'15 Min':['15min',600]};
const DEF={vol:1,kc:1,ma20:1,ma50:1,ma200:1,sr:1,gd:1,rsi:1,macd:1,paper:1,rsiMa:'SMA',rsiLen:14,bb:2,div:0};
const P=Object.assign({},DEF,CX.get('chartPrefs',{}));
const UP='#26a69a',DN='#ef5350',BG='#0e1726',GRID='#121f31',BLUE='#2962FF',GOLD='#FFD700',MAC={20:'#f5a623',50:'#ba68c8',200:'#90caf9'};
const GOLDSVG='<svg viewBox="0 0 24 24"><polygon points="5,17 8,9 16,9 19,17" fill="#FFD54F" stroke="#B8860B" stroke-width="1"/><rect x="5" y="17" width="14" height="3.2" fill="#F9A825" stroke="#B8860B" stroke-width="1"/></svg>';
const SKULLSVG='<svg viewBox="0 0 24 24"><path d="M12 3C7.6 3 5 6 5 10c0 2.4 1 4 2.5 5V20h2v-1.6h1.2V20h2.6v-1.6h1.2V20h2v-5c1.5-1 2.5-2.6 2.5-5 0-4-2.6-7-7-7z" fill="#e6e6e6"/><circle cx="9" cy="10.5" r="1.9" fill="#111"/><circle cx="15" cy="10.5" r="1.9" fill="#111"/><path d="M12 12.8l-1.1 2.2h2.2z" fill="#111"/></svg>';
let cur=CX.get('chartTf','1D'),D=null,chart=null,lastPx=null,keepRange=false,icons=[],ro=null,C=null;
/* ---------- controls ---------- */
$('#tf').innerHTML=Object.keys(TF).map(k=>`<button data-k="${k}">${k}</button>`).join('');
$('#tf').onclick=e=>{if(e.target.dataset.k)load(e.target.dataset.k)};
const TG=[['vol','Volume'],['kc','Keltner Channels'],['ma20','MA 20'],['ma50','MA 50'],['ma200','MA 200'],['sr','Support / Resistance'],['gd','Golden / Death Cross'],['rsi','RSI'],['macd','MACD'],['paper','Paper trade lines']];
const save=()=>CX.set('chartPrefs',P);
$('#tg').innerHTML=TG.map(t=>`<label><input type="checkbox" data-k="${t[0]}" ${P[t[0]]?'checked':''}>${t[1]}</label>`).join('');
$('#tg').onchange=e=>{P[e.target.dataset.k]=e.target.checked?1:0;save();drawRs();redraw()};
function drawRs(){const r=$('#rs');if(!P.rsi){r.innerHTML='';return}
r.innerHTML=`<span>RSI settings:</span><label>Smoothing<select id="rsM">${['None','SMA','SMA + Bollinger Bands','EMA','SMMA (RMA)','WMA','VWMA'].map(o=>`<option ${o===P.rsiMa?'selected':''}>${o}</option>`).join('')}</select></label><label>Length<input id="rsL" type="number" min="1" value="${P.rsiLen}" style="width:60px"></label>${P.rsiMa==='SMA + Bollinger Bands'?`<label>BB StdDev<input id="rsB" type="number" min="0.001" step="0.5" value="${P.bb}" style="width:60px"></label>`:''}<label><input type="checkbox" id="rsD" ${P.div?'checked':''}>Calculate divergence</label>`;
$('#rsM').onchange=e=>{P.rsiMa=e.target.value;save();drawRs();redraw()};$('#rsL').onchange=e=>{P.rsiLen=Math.max(1,+e.target.value||14);save();redraw()};
if($('#rsB'))$('#rsB').onchange=e=>{P.bb=+e.target.value||2;save();redraw()};$('#rsD').onchange=e=>{P.div=e.target.checked?1:0;save();redraw()}}
const upd=()=>{const on=CX.get('watch',[]).some(x=>x.t===sym);$('#w').textContent=on?'Remove from Watch List':'Add to Watch List'};upd();
$('#w').onclick=()=>{CX.toggleWatch(sym,'',lastPx);upd()};
/* ---------- calculations ---------- */
const sma=(a,n)=>{const o=Array(a.length).fill(null);let s=0;for(let i=0;i<a.length;i++){s+=a[i];if(i>=n)s-=a[i-n];if(i>=n-1)o[i]=s/n}return o};
function maOn(a,len,type,vol){const s=a.findIndex(x=>x!=null),o=Array(a.length).fill(null);if(s<0)return o;
const sm=i=>{if(i-s+1<len)return null;let t=0;for(let k=i-len+1;k<=i;k++)t+=a[k];return t/len};
if(type==='SMA'||type==='SMA + Bollinger Bands'){for(let i=0;i<a.length;i++)o[i]=sm(i);return o}
if(type==='EMA'||type==='SMMA (RMA)'){const al=type==='EMA'?2/(len+1):1/len;let p=null;for(let i=0;i<a.length;i++){if(i-s+1<len)continue;p=p==null?sm(i):al*a[i]+(1-al)*p;o[i]=p}return o}
if(type==='WMA'){const den=len*(len+1)/2;for(let i=s+len-1;i<a.length;i++){let t=0;for(let k=0;k<len;k++)t+=a[i-len+1+k]*(k+1);o[i]=t/den}return o}
if(type==='VWMA'){for(let i=s+len-1;i<a.length;i++){let n=0,d=0;for(let k=i-len+1;k<=i;k++){n+=a[k]*vol[k];d+=vol[k]}o[i]=d?n/d:null}return o}return o}
function pivots(a,cmp,L=5,R=5){const o=[];for(let i=L;i<a.length-R;i++){const v=a[i];if(v==null)continue;let ok=true;for(let k=i-L;k<=i+R&&ok;k++){if(k!==i&&(a[k]==null||!cmp(v,a[k])))ok=false}if(ok)o.push(i)}return o}
function diverge(rs,b){const bull=[],bear=[],pl=pivots(rs,(v,w)=>v<=w),ph=pivots(rs,(v,w)=>v>=w);
for(let k=1;k<pl.length;k++){const a=pl[k-1],c=pl[k],g=c-a;if(g>=5&&g<=60&&rs[c]>rs[a]&&b[c].l<b[a].l)bull.push(c)}
for(let k=1;k<ph.length;k++){const a=ph[k-1],c=ph[k],g=c-a;if(g>=5&&g<=60&&rs[c]<rs[a]&&b[c].h>b[a].h)bear.push(c)}return{bull,bear}}
function compute(b){const c=b.map(x=>x.c),vol=b.map(x=>x.v),o={c,vol};o.kc=CX.I.kc(b);o.s20=sma(c,20);o.s50=sma(c,50);o.s200=sma(c,200);
o.rsi=CX.I.rsi(c,14);o.rma=P.rsiMa==='None'?null:maOn(o.rsi,P.rsiLen,P.rsiMa,vol);
if(P.rsiMa==='SMA + Bollinger Bands'&&o.rma){o.bbu=[];o.bbl=[];for(let i=0;i<c.length;i++){const m=o.rma[i];if(m==null){o.bbu.push(null);o.bbl.push(null);continue}let v=0;for(let k=i-P.rsiLen+1;k<=i;k++)v+=(o.rsi[k]-m)**2;const sd=Math.sqrt(v/P.rsiLen)*P.bb;o.bbu.push(m+sd);o.bbl.push(m-sd)}}
o.mc=CX.I.macd(c);o.ev=Array(c.length).fill(null);let g=0,d=0;
for(let i=200;i<c.length;i++){const x=o.s50[i]-o.s200[i],y=o.s50[i-1]-o.s200[i-1];if(x>0&&y<=0){o.ev[i]='g';g++}else if(x<0&&y>=0){o.ev[i]='d';d++}}o.g=g;o.d=d;
o.div=P.div?diverge(o.rsi,b):null;return o}
/* ---------- loading ---------- */
async function load(k){cur=k;CX.set('chartTf',k);keepRange=false;[...$('#tf').children].forEach(b=>b.classList.toggle('on',b.dataset.k===k));$('#msg').textContent='Loading '+k+' candles (1 Twelve Data credit, cached for 10 minutes)...';
try{const[iv,size]=TF[k];const d=await CX.td(sym,iv,size,{cache:true});D={bars:d.bars,meta:d.meta,daily:iv==='1day'};
const last=D.bars[D.bars.length-1],prev=D.bars[D.bars.length-2]||last;lastPx=last.c;$('#px').textContent='$'+last.c.toFixed(2);const ch=(last.c/prev.c-1)*100;$('#chg').textContent=(ch>=0?'+':'')+ch.toFixed(2)+'%';$('#chg').className=ch>=0?'up':'dn';
redraw();$('#msg').textContent=`${D.bars.length} candles${D.meta&&D.meta.exchange?', '+D.meta.exchange:''}. Golden crosses: ${C?C.g:0}. Death crosses: ${C?C.d:0}.${D.bars.length<201?' Not enough candles for the 200 average.':''}`}
catch(e){$('#msg').innerHTML='<span class="bad">'+CX.esc(e.message)+'</span>'}}
/* ---------- drawing ---------- */
const fmtV=v=>v>=1e9?(v/1e9).toFixed(2)+'B':v>=1e6?(v/1e6).toFixed(2)+'M':v>=1e3?(v/1e3).toFixed(2)+'K':String(Math.round(v));
const f2=x=>x==null?'-':(+x).toFixed(2);
const sp=(c,t)=>`<span style="color:${c}">${t}</span>`;
function redraw(){if(!D)return;if(typeof LightweightCharts==='undefined'){$('#msg').innerHTML='<span class="bad">The chart library did not load. It needs an internet connection.</span>';return}
const L=LightweightCharts,b=D.bars,daily=D.daily;let prevRange=null;
if(chart){if(keepRange)try{prevRange=chart.timeScale().getVisibleLogicalRange()}catch(e){}chart.remove();chart=null}
keepRange=true;C=compute(b);$('#ov').innerHTML='';icons=[];
const T=b.map(x=>Math.floor(Date.parse(daily?x.t.slice(0,10)+'T00:00:00Z':x.t.replace(' ','T')+'Z')/1000)),idx=new Map(T.map((t,i)=>[t,i]));
const ok=T.map((t,i)=>i===0||t>T[i-1]);
chart=L.createChart($('#cw'),{autoSize:true,layout:{background:{type:'solid',color:BG},textColor:'#b2b5be',fontSize:12,panes:{separatorColor:'#2a3547',separatorHoverColor:'rgba(178,181,189,.2)',enableResize:true}},grid:{vertLines:{color:GRID},horzLines:{color:GRID}},rightPriceScale:{borderVisible:false,scaleMargins:{top:.08,bottom:.08}},timeScale:{borderVisible:false,timeVisible:!daily,secondsVisible:false,rightOffset:8,barSpacing:9},crosshair:{mode:L.CrosshairMode.Normal,vertLine:{color:'#758696',width:1,style:3,labelBackgroundColor:'#2a3547'},horzLine:{color:'#758696',width:1,style:3,labelBackgroundColor:'#2a3547'}}});
const pt=(i,v)=>v==null||!ok[i]?null:{time:T[i],value:v},series=(arr,fn)=>arr.map((v,i)=>fn(i,v)).filter(Boolean);
/* price pane */
const cs=chart.addSeries(L.CandlestickSeries,{upColor:UP,downColor:DN,borderUpColor:UP,borderDownColor:DN,wickUpColor:UP,wickDownColor:DN,priceLineVisible:true,lastValueVisible:true},0);
cs.setData(b.map((x,i)=>{if(!ok[i])return null;const p={time:T[i],open:x.o,high:x.h,low:x.l,close:x.c},e=P.gd&&C.ev[i];if(e==='g')Object.assign(p,{color:GOLD,borderColor:GOLD,wickColor:GOLD});if(e==='d')Object.assign(p,{color:'#000000',borderColor:'#cfd8dc',wickColor:'#cfd8dc'});return p}).filter(Boolean));
if(P.vol){const vs=chart.addSeries(L.HistogramSeries,{priceFormat:{type:'volume'},priceScaleId:'vol',lastValueVisible:false,priceLineVisible:false},0);vs.priceScale().applyOptions({scaleMargins:{top:.82,bottom:0}});vs.setData(b.map((x,i)=>ok[i]?{time:T[i],value:x.v,color:x.c>=x.o?'rgba(38,166,154,.5)':'rgba(239,83,80,.5)'}:null).filter(Boolean))}
const ln=(arr,col,w,from=0)=>{const s=chart.addSeries(L.LineSeries,{color:col,lineWidth:w,priceLineVisible:false,lastValueVisible:false,crosshairMarkerVisible:false},0);s.setData(series(arr,(i,v)=>i<from?null:pt(i,v)))};
if(P.kc){ln(C.kc.u,BLUE,1,20);ln(C.kc.m,BLUE,1,20);ln(C.kc.l,BLUE,1,20)}
if(P.ma20)ln(C.s20,MAC[20],1);if(P.ma50)ln(C.s50,MAC[50],1);if(P.ma200)ln(C.s200,MAC[200],1);
if(P.sr){const last=b[b.length-1].c;I_lv(b).filter(x=>Math.abs(x.p/last-1)<.2).sort((x,y)=>Math.abs(x.p-last)-Math.abs(y.p-last)).slice(0,6).forEach(x=>cs.createPriceLine({price:x.p,color:x.p<last?UP:DN,lineWidth:1,lineStyle:2,axisLabelVisible:true,title:x.p<last?'Support':'Resistance'}))}
if(P.paper)CX.get('paper',[]).filter(t=>t.t===sym&&t.exit==null).forEach(t=>{cs.createPriceLine({price:t.entry,color:BLUE,lineWidth:1,lineStyle:0,axisLabelVisible:true,title:`Entry ${t.opened.slice(5).replace('-','/')} @ $${t.entry.toFixed(2)}/share`});cs.createPriceLine({price:t.stop,color:DN,lineWidth:1,lineStyle:2,axisLabelVisible:true,title:'Stop -5%'})});
/* RSI pane (matches the RSI indicator pine script) */
let np=1,rp=-1,mp=-1,rsiLine=null;const fix={autoscaleInfoProvider:()=>({priceRange:{minValue:0,maxValue:100}})},none={priceLineVisible:false,lastValueVisible:false,crosshairMarkerVisible:false};
const base=(price,o)=>chart.addSeries(L.BaselineSeries,Object.assign({baseValue:{type:'price',price},topLineColor:'transparent',bottomLineColor:'transparent',topFillColor1:'transparent',topFillColor2:'transparent',bottomFillColor1:'transparent',bottomFillColor2:'transparent',relativeGradient:true,lineVisible:false},none,fix,o),rp);
if(P.rsi){rp=np++;
base(30,{topFillColor1:'rgba(126,87,194,.10)',topFillColor2:'rgba(126,87,194,.10)',relativeGradient:false}).setData(b.map((x,i)=>ok[i]?{time:T[i],value:70}:null).filter(Boolean));
const rv=series(C.rsi,pt);base(70,{topFillColor1:'rgba(76,175,80,.85)',topFillColor2:'rgba(76,175,80,0)'}).setData(rv);base(30,{bottomFillColor1:'rgba(239,83,80,0)',bottomFillColor2:'rgba(239,83,80,.85)'}).setData(rv);
if(C.rma){const m=chart.addSeries(L.LineSeries,Object.assign({color:'#FFEB3B',lineWidth:1},none,fix),rp);m.setData(series(C.rma,pt))}
if(C.bbu){[C.bbu,C.bbl].forEach(a=>{const s=chart.addSeries(L.LineSeries,Object.assign({color:'#4CAF50',lineWidth:1},none,fix),rp);s.setData(series(a,pt))})}
rsiLine=chart.addSeries(L.LineSeries,Object.assign({color:'#7E57C2',lineWidth:1,priceLineVisible:false,lastValueVisible:true,crosshairMarkerVisible:true},fix),rp);rsiLine.setData(rv);
[[70,1],[50,.5],[30,1]].forEach(([v,a])=>rsiLine.createPriceLine({price:v,color:`rgba(120,123,134,${a})`,lineWidth:1,lineStyle:2,axisLabelVisible:true,title:''}));
if(C.div){const mk=[...C.div.bull.map(i=>({time:T[i],position:'belowBar',color:'#4CAF50',shape:'arrowUp',text:'Bull'})),...C.div.bear.map(i=>({time:T[i],position:'aboveBar',color:'#F23645',shape:'arrowDown',text:'Bear'}))].sort((x,y)=>x.time-y.time);L.createSeriesMarkers(rsiLine,mk)}}
/* MACD pane */
if(P.macd){mp=np++;const h=chart.addSeries(L.HistogramSeries,{priceLineVisible:false,lastValueVisible:false},mp),hh=C.mc.h;
h.setData(series(hh,(i,v)=>i<26||!ok[i]?null:{time:T[i],value:v,color:v>=0?(v>=hh[i-1]?'#26A69A':'#B2DFDB'):(v<=hh[i-1]?'#FF5252':'#FFCDD2')}));
[[C.mc.m,BLUE],[C.mc.s,'#FF6D00']].forEach(([a,col])=>{const s=chart.addSeries(L.LineSeries,{color:col,lineWidth:1,priceLineVisible:false,lastValueVisible:true,crosshairMarkerVisible:false},mp);s.setData(series(a,(i,v)=>i<26?null:pt(i,v)))})}
try{const ps=chart.panes(),w=[3.2,1.1,1.1];ps.forEach((p,i)=>p.setStretchFactor(np===1?1:w[i]))}catch(e){}
/* overlays: legends and cross icons */
const lg=(cls)=>{const d=document.createElement('div');d.className='lg';$('#ov').appendChild(d);return d},lP=lg(),lR=P.rsi?lg():null,lM=P.macd?lg():null;
function legend(i){const x=b[i],pv=b[i-1]||x,up=x.c>=x.o,col=up?UP:DN,ch=x.c-pv.c;
let h=`<div><span class="t"><b>${sym}</b> · ${cur} · ${D.meta&&D.meta.exchange||''}</span> &nbsp;O${sp(col,f2(x.o))} H${sp(col,f2(x.h))} L${sp(col,f2(x.l))} C${sp(col,f2(x.c))} ${sp(col,(ch>=0?'+':'')+f2(ch)+' ('+(ch>=0?'+':'')+f2(ch/pv.c*100)+'%)')}</div>`;
if(P.vol)h+=`<div>Vol ${sp(col,fmtV(x.v))}</div>`;if(P.kc)h+=`<div>${sp(BLUE,'KC 20 2 close')} ${sp(BLUE,f2(C.kc.u[i]))} ${sp(BLUE,f2(C.kc.m[i]))} ${sp(BLUE,f2(C.kc.l[i]))}</div>`;
const m=[[20,P.ma20,C.s20],[50,P.ma50,C.s50],[200,P.ma200,C.s200]].filter(z=>z[1]).map(z=>sp(MAC[z[0]],`MA ${z[0]} ${f2(z[2][i])}`)).join(' &nbsp;');if(m)h+=`<div>${m}</div>`;
const e=P.gd&&C.ev[i];if(e)h+=`<div>${e==='g'?sp(GOLD,'Golden Cross: 50 crossed above 200'):sp('#cfd8dc','Death Cross: 50 crossed below 200')}</div>`;lP.innerHTML=h;
if(lR)lR.innerHTML=`${sp('#d1d4dc','RSI 14 close')} ${sp('#7E57C2',f2(C.rsi[i]))}${C.rma?' '+sp('#FFEB3B',f2(C.rma[i])):''}${C.bbu?' '+sp('#4CAF50',f2(C.bbu[i])+' '+f2(C.bbl[i])):''}`;
if(lM)lM.innerHTML=`${sp('#d1d4dc','MACD 12 26 close 9')} ${sp(C.mc.h[i]>=0?'#26A69A':'#FF5252',f2(C.mc.h[i]))} ${sp(BLUE,f2(C.mc.m[i]))} ${sp('#FF6D00',f2(C.mc.s[i]))}`}
const lastI=b.length-1;legend(lastI);chart.subscribeCrosshairMove(p=>{const i=p&&p.time!=null?idx.get(p.time):undefined;legend(i==null?lastI:i)});
if(P.gd)C.ev.forEach((e,i)=>{if(!e||!ok[i])return;const el=document.createElement('div'),g=e==='g';el.className='ic';el.style.borderColor=g?GOLD:'#9aa0a6';el.innerHTML=g?GOLDSVG:SKULLSVG;el.title=(g?'Golden Cross: the 50 period average crossed above the 200 period average on ':'Death Cross: the 50 period average crossed below the 200 period average on ')+b[i].t.slice(0,16);$('#ov').appendChild(el);icons.push({el,t:T[i]})});
function place(){if(!chart)return;let hs;try{hs=chart.panes().map(p=>p.getHeight())}catch(e){return}let acc=0;const tops=hs.map(h=>{const t=acc;acc+=h+1;return t});
lP.style.top='6px';if(lR)lR.style.top=(tops[rp]+4)+'px';if(lM)lM.style.top=(tops[mp]+4)+'px';
const w=$('#wrap').clientWidth;icons.forEach(ic=>{const x=chart.timeScale().timeToCoordinate(ic.t);if(x==null||x<0||x>w-70){ic.el.style.display='none';return}ic.el.style.display='flex';ic.el.style.left=(x-11)+'px';ic.el.style.top=(hs[0]-30)+'px'})}
chart.timeScale().subscribeVisibleLogicalRangeChange(place);
if(prevRange)chart.timeScale().setVisibleLogicalRange(prevRange);else chart.timeScale().setVisibleLogicalRange({from:Math.max(0,b.length-130),to:b.length+8});
if(!ro){ro=new ResizeObserver(()=>place());ro.observe($('#wrap'))}
requestAnimationFrame(place);setTimeout(place,150)}
const I_lv=b=>CX.I.levels(b,4,Math.min(b.length,200)).filter(x=>x.n>=2);
drawRs();
if(!sym)$('#msg').textContent='Open this page from the screener or a list so a ticker is selected.';else load(TF[cur]?cur:'1D');
})();
