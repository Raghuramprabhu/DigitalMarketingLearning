(()=>{'use strict';
const $=s=>document.querySelector(s), $$=s=>[...document.querySelectorAll(s)];
const state={mode:'pipeline',a:23,b:4,c:15,events:[],cursor:-1,playing:false,timer:null,wheel:0,carry:27,carrySteps:0,carryTimer:null};
const arch={
cards:['THE INPUT PROGRAM','Babbage designed three conceptually different card functions. Number cards specify constants; operation cards select arithmetic; variable cards determine which stored columns are read or written. Historical card formats were more complicated than these teaching illustrations.'],
store:['THE STORE — MEMORY','An array of vertical decimal-wheel columns holds numerical variables. Rather than a loom holding a design in thread positions, the Store can retain values for later operations, including intermediate results.'],
mill:['THE MILL — ARITHMETIC','The proposed Mill carries out arithmetic using gears, number axes, and decimal carries. This is the conceptual ancestor of a computing processor, although Babbage’s actual mechanical design was more complex than this animated illustration.'],
printer:['THE OUTPUT','Babbage designed mechanisms to print or punch results rather than requiring a person to transcribe every answer. Numerical results should leave the calculation intact and readable.']
};
function updateArchitecture(key){const t=arch[key];if(!t)return;$$('.bb-arch-part').forEach(b=>b.classList.toggle('selected',b.dataset.arch===key));$('#bb-arch-detail').innerHTML='<div class="bb-arch-tag">INSPECTED / '+key.toUpperCase()+'</div><h3>'+t[0]+'</h3><p>'+t[1]+'</p>'}
$$('[data-arch]').forEach(b=>b.addEventListener('click',()=>updateArchitecture(b.dataset.arch)));
function safeVal(id){const n=Number($(id).value);return Number.isFinite(n)?Math.max(0,Math.min(99,Math.trunc(n))):0}
function fmt(n){return String(n).padStart(4,'0')}
function createEvents(){
const a=state.a,b=state.b,c=state.c,mul=a*b,add=state.mode==='addition'?a+b:mul+c,events=[];
const push=(title,description,cardType,cardLabel,registers,axA=null,axB=null,op=null,calc=null,print=false)=>events.push({title,description,cardType,cardLabel,registers:{...registers},axA,axB,op,calc,print});
const base={V0:null,V1:null,V2:null,V3:null,V4:null};
push('A number card approaches the reader.','The first constant is written into a Store column. This illustrates a number-card load; exact historic card encodings are not reproduced.','NUMBER','VALUE '+a,{...base,V0:a});
push('The second number enters.','Another number card supplies the second constant, stored independently in V1.','NUMBER','VALUE '+b,{...base,V0:a,V1:b});
if(state.mode==='pipeline')push('One more constant is stored.','The final '+c+' will be needed only after multiplication. The Store preserves it while the Mill performs earlier work.','NUMBER','VALUE '+c,{...base,V0:a,V1:b,V2:c});
const stored={...base,V0:a,V1:b,V2:state.mode==='pipeline'?c:null};
push('The operation card is read.','A distinct instruction selects '+(state.mode==='pipeline'?'MULTIPLY':'ADD')+'. The values remain stored until variable-selection instructions route them.','OPERATION',state.mode==='pipeline'?'MULTIPLY':'ADD',stored,null,null,state.mode==='pipeline'?'×':'+');
push('Variable card selects V0.','The machine identifies V0 as the source for the Mill’s first input axis. In the historical design, variable cards controlled transfers.','VARIABLE','READ V0',stored,a,null,state.mode==='pipeline'?'×':'+');
push('Variable card selects V1.','V1 is routed toward the second arithmetic input. The Mill now has both operands.','VARIABLE','READ V1',stored,a,b,state.mode==='pipeline'?'×':'+');
const first=state.mode==='pipeline'?mul:a+b;
push('The Mill begins the arithmetic.','Two decimal values engage the mechanical calculation process. Observe the gear motion and the changing result wheels.','EXECUTE',state.mode==='pipeline'?a+' × '+b:a+' + '+b,stored,a,b,state.mode==='pipeline'?'×':'+',first);
push('The result stabilizes.','The first arithmetic operation returns '+first+'. The Mill is not the Store: its result must be routed back to a memory column.','RESULT',String(first),stored,a,b,state.mode==='pipeline'?'×':'+',first);
if(state.mode==='addition'){
push('A destination variable is selected.','The resulting '+first+' is written into V3 for later use.','VARIABLE','WRITE V3',{...stored,V3:first},a,b,'+',first);
push('The output mechanism is selected.','The calculated value travels from the stored result to the conceptual print mechanism.','OUTPUT','PRINT V3',{...stored,V3:first},a,b,'+',first,true);
}else{
const middle={...stored,V3:mul};
push('Variable card stores the product.','The number '+mul+' returns from the Mill to V3. This preserves the intermediate result.','VARIABLE','WRITE V3',middle,a,b,'×',mul);
push('A new operation card arrives.','The same Mill is reconfigured for ADD rather than MULTIPLY. A general-purpose machine changes its operation without changing its physical hardware.','OPERATION','ADD',middle,null,null,'+',mul);
push('Read the intermediate result.','V3 supplies '+mul+' as the first input of the next operation.','VARIABLE','READ V3',middle,mul,null,'+',mul);
push('Read the waiting constant.','V2 still holds '+c+'. The Store supplies it as the second operand.','VARIABLE','READ V2',middle,mul,c,'+',mul);
push('The gears perform addition.','The Mill computes '+mul+' + '+c+'. Notice the carry across decimal columns where needed.','EXECUTE',mul+' + '+c,middle,mul,c,'+',add);
push('The final value settles.','The decimal wheels now represent '+add+'. Both arithmetic operations were performed by the same Mill.','RESULT',String(add),middle,mul,c,'+',add);
push('Store the final result.','The computed value returns to a new memory column, V4. The intermediate value V3 remains available.','VARIABLE','WRITE V4',{...middle,V4:add},mul,c,'+',add);
push('The printer receives its number.','The result '+add+' is sent to the output. A human need not calculate or transcribe the intermediate stages.','OUTPUT','PRINT V4',{...middle,V4:add},mul,c,'+',add,true);
}
return events;
}
function makeDigits(container,length,cellheight=68){container.innerHTML='';for(let i=0;i<length;i++){const box=document.createElement('div');box.className=container.id==='bb-carry-drums'?'bb-carry-drum':'bb-digit';const track=document.createElement('div');track.className=container.id==='bb-carry-drums'?'bb-drum-track':'bb-digit-track';track.innerHTML=Array.from({length:20},(_,j)=>'<span>'+j%10+'</span>').join('');box.append(track);if(container.id==='bb-carry-drums'){const label=document.createElement('small');label.textContent=['HUNDREDS','TENS','ONES'][i];box.append(label)}container.append(box)}}
function setDigits(selector,value,cellheight,animate=true){const place=Math.max(0,Math.trunc(Number(value)||0));const digits=String(place).padStart($$(selector+' > div').length,'0').slice(-$$(selector+' > div').length);$$(selector+' > div').forEach((box,i)=>{const track=box.querySelector(':scope > div');const desired=Number(digits[i]),prior=Number(box.dataset.digit||0);const increment=animate&&prior>desired;cellheight=box.clientHeight||cellheight;track.style.transition=animate?'transform .48s cubic-bezier(.17,.67,.38,1)':'none';track.style.transform='translateY(-'+(cellheight*(desired+(increment?10:0)))+'px)';box.dataset.digit=String(desired);if(increment)setTimeout(()=>{if(!track.isConnected)return;track.style.transition='none';track.style.transform='translateY(-'+(cellheight*desired)+'px)'},510)})}
function renderRegisters(regs,active){$('#bb-registers').innerHTML=Object.entries(regs).map(([key,v])=>'<div class="bb-register '+(active===key?'active':'')+'"><small>'+key+'</small><strong>'+(v===null?'—':v)+'</strong><div class="bb-register-caption">'+(v===null?'EMPTY':'STORED')+'</div></div>').join('')}
function renderCard(event){if(!event){$('#bb-card-kind').textContent='AWAITING INSTRUCTIONS';$('#bb-card-title').textContent='STANDBY';$('#bb-punch-graphic').innerHTML='';$('#bb-card-note').textContent='Number cards supply values; variable cards route them; operation cards choose arithmetic.';return}
$('#bb-card-kind').textContent=event.cardType+' CARD';$('#bb-card-title').textContent=event.cardLabel;document.querySelector('.bb-card-badge').textContent=event.cardType;$('#bb-card-note').textContent=event.description;const seed=event.cardLabel.split('').reduce((sum,ch)=>sum+ch.charCodeAt(0),17);$('#bb-punch-graphic').innerHTML=Array.from({length:27},(_,i)=>'<i class="'+(((seed*(i+13)+i*97+i*i*7)%11)<5?'hole':'')+'"></i>').join('');$('#bb-card-track').classList.remove('feeding');void $('#bb-card-track').offsetWidth;$('#bb-card-track').classList.add('feeding');$('#bb-needles').innerHTML=Array.from({length:7},(_,i)=>'<i class="'+(i%2?'sensing':'')+'"></i>').join('')}
function updateResult(value,animate=true){if(value===null||value===undefined){setDigits('#bb-result-wheels',0,68,false);return}setDigits('#bb-result-wheels',value,68,animate)}
function updateProgress(){const count=state.events.length;$('#bb-stage-counter').textContent=String(Math.max(0,state.cursor+1)).padStart(2,'0')+' / '+String(count).padStart(2,'0');$('#bb-stage-progress').innerHTML=state.events.map((_,i)=>'<i class="'+(i<=state.cursor?'done':'')+'"></i>').join('')}
function applyEvent(index){state.cursor=index;const event=state.events[index];if(!event)return;$('#bb-stage-title').textContent=event.title;$('#bb-stage-description').textContent=event.description;renderCard(event);renderRegisters(event.registers,event.cardLabel?.match(/V\d/)?.[0]);$('#bb-axis-a').textContent=event.axA===null?'—':event.axA;$('#bb-axis-b').textContent=event.axB===null?'—':event.axB;$('#bb-op-display').textContent=event.op||'·';const running=event.cardType==='EXECUTE';$('#bb-gears').classList.toggle('running',running);$('#bb-mill-status').textContent=running?'GEARS TURNING':event.calc!==null?'RESULT READY':'WAITING';if(event.calc!==null)updateResult(event.calc,true);$('#bb-carry-lamp').classList.toggle('fired',running&&event.op==='+');$('#bb-carry-lamp').textContent=running&&event.op==='+'?'DECIMAL CARRY ENGAGED':'CARRY READY';$('#bb-print-slip').classList.toggle('show',event.print);$('#bb-printer-indicator').textContent=event.print?'PRINTING':'EMPTY';if(event.print)$('#bb-print-number').textContent=event.calc;updateProgress();if(index===state.events.length-1)stopEngine()}
function stopEngine(){if(state.timer){clearInterval(state.timer);state.timer=null}state.playing=false;$('#bb-run').textContent='▶ RUN THE ENGINE';$('#bb-gears').classList.remove('running')}
function stepEngine(){if(state.cursor>=state.events.length-1){stopEngine();return}applyEvent(state.cursor+1)}
function resetEngine(){stopEngine();state.cursor=-1;$('#bb-stage-title').textContent='THE ENGINE IS WAITING.';$('#bb-stage-description').textContent='Press RUN for the whole sequence, or NEXT EVENT to inspect one instruction at a time.';renderCard(null);renderRegisters({V0:null,V1:null,V2:null,V3:null,V4:null});$('#bb-axis-a').textContent='—';$('#bb-axis-b').textContent='—';$('#bb-op-display').textContent='·';$('#bb-mill-status').textContent='IDLE';setDigits('#bb-result-wheels',0,68,false);$('#bb-carry-lamp').classList.remove('fired');$('#bb-carry-lamp').textContent='CARRY READY';$('#bb-print-slip').classList.remove('show');$('#bb-printer-indicator').textContent='EMPTY';updateProgress()}
function configure(mode,load=false){state.mode=mode;$$('[data-bb-preset]').forEach(b=>b.classList.toggle('on',b.dataset.bbPreset===mode));$('#bb-c-label').hidden=mode==='addition';if(!load){if(mode==='addition'){state.a=27;state.b=18;state.c=0}else{state.a=23;state.b=4;state.c=15}$('#bb-input-a').value=state.a;$('#bb-input-b').value=state.b;$('#bb-input-c').value=state.c}else{state.a=safeVal('#bb-input-a');state.b=safeVal('#bb-input-b');state.c=safeVal('#bb-input-c');}state.events=createEvents();resetEngine()}
$$('[data-bb-preset]').forEach(b=>b.onclick=()=>configure(b.dataset.bbPreset));
$('#bb-apply').onclick=()=>configure(state.mode,true);
$('#bb-step').onclick=()=>{stopEngine();stepEngine()};
$('#bb-run').onclick=()=>{if(state.playing){stopEngine();return}if(state.cursor>=state.events.length-1)resetEngine();state.playing=true;$('#bb-run').textContent='Ⅱ PAUSE ENGINE';stepEngine();state.timer=setInterval(()=>{if(!document.querySelector('.scene[data-scene="13"]').classList.contains('active')){stopEngine();return}stepEngine()},Number($('#bb-speed').value))};
$('#bb-reset').onclick=resetEngine;
makeDigits($('#bb-result-wheels'),4);
configure('pipeline');
const archObserve=new MutationObserver(()=>{if(!$('.scene[data-scene="13"]').classList.contains('active'))stopEngine();if(!$('.scene[data-scene="14"]').classList.contains('active'))stopCarry()});
archObserve.observe($('#screen'),{attributes:true,subtree:true,attributeFilter:['class']});
function stopCarry(){if(state.carryTimer){clearInterval(state.carryTimer);state.carryTimer=null}$('#bb-carry-auto').textContent='▶ AUTOMATE'}
function resetCarry(){stopCarry();state.carry=27;state.carrySteps=0;$('#bb-carry-phase').textContent='INITIAL STATE';$('#bb-carry-equation').textContent='START AT 27';$('#bb-carry-value').textContent='027';$('#bb-carry-trace').innerHTML='';$('#bb-carry-signal').classList.remove('flash');setCarryDigit(27,false)}
function setCarryDigit(value,animate=true){const size=matchMedia('(max-width:760px)').matches?Math.max(110,Math.min(innerWidth*.13,190)):Math.max(110,Math.min(innerWidth*.13,190));setDigits('#bb-carry-drums',value,size,animate)}
function carryStep(){if(state.carrySteps>=9){stopCarry();return}
const before=state.carry;
if(state.carrySteps===0){state.carry+=10;$('#bb-carry-phase').textContent='TENS COLUMN';$('#bb-carry-equation').textContent='27 + 10 → 37';$('#bb-carry-trace').insertAdjacentHTML('beforeend','<span>+10 → 37</span>')}
else{state.carry++;$('#bb-carry-phase').textContent='UNITS COLUMN';$('#bb-carry-equation').textContent=before+' + 1 → '+state.carry;$('#bb-carry-trace').insertAdjacentHTML('beforeend','<span>+'+1+' → '+state.carry+'</span>')}
state.carrySteps++;
$('#bb-carry-value').textContent=String(state.carry).padStart(3,'0');
setCarryDigit(state.carry,true);
if(before%10===9){$('#bb-carry-signal').classList.remove('flash');void $('#bb-carry-signal').offsetWidth;$('#bb-carry-signal').classList.add('flash');$('#bb-carry-phase').textContent='CARRY FIRED / UNITS → TENS'}
if(state.carrySteps===9){$('#bb-carry-phase').textContent='RESULT VERIFIED · 045';stopCarry()}
}
$('#bb-carry-step').onclick=()=>{stopCarry();carryStep()};
$('#bb-carry-auto').onclick=()=>{if(state.carryTimer){stopCarry();return}if(state.carrySteps===9)resetCarry();$('#bb-carry-auto').textContent='Ⅱ PAUSE';carryStep();state.carryTimer=setInterval(()=>{if(state.carrySteps>=9){stopCarry();return}carryStep()},650)};
$('#bb-carry-reset').onclick=resetCarry;
makeDigits($('#bb-carry-drums'),3);resetCarry();
$('#bb-return-machine').onclick=()=>{document.querySelector('#map-list button[data-to="13"]').click();configure('pipeline')};
$('#bb-finale-restart').onclick=()=>document.querySelector('#map-list button[data-to="7"]').click();
})();