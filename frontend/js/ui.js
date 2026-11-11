import {ART} from './art.js';
export const $=id=>document.getElementById(id);
export function show(id){document.querySelectorAll('.screen').forEach(s=>s.classList.toggle('active',s.id===id));document.dispatchEvent(new CustomEvent('screenchange',{detail:id}));$(id).querySelector('h1,h2')?.focus();}
export function notice(message){$('notice').textContent=message;}
export function renderCards(run,handler){
 $('grid').style.gridTemplateColumns=`repeat(${run.size},1fr)`;
 // Keep DOM nodes between requests so CSS transforms animate rather than jump.
 if($('grid').children.length!==run.cards.length){$('grid').replaceChildren();for(const card of run.cards){const b=document.createElement('button');b.className='card';b.innerHTML='<span class="inner"><span class="face front"><span>✦</span></span><span class="face back"></span></span>';b.addEventListener('click',()=>handler(card.index));$('grid').append(b);}}
 run.cards.forEach((card,i)=>{const b=$('grid').children[i];b.className='card'+(card.symbol?' up':'')+(card.matched?' done':'');b.disabled=card.matched;b.setAttribute('aria-label',card.symbol?card.symbol+' card':'Reveal card '+(i+1));if(card.symbol)b.querySelector('.back').innerHTML=ART[card.symbol];});
}
export function table(id,headers,rows){const t=$(id);t.replaceChildren();for(const [i,row] of [headers,...rows].entries()){const tr=document.createElement('tr');row.forEach(value=>{const c=document.createElement(i===0?'th':'td');c.textContent=String(value);tr.append(c);});t.append(tr);}}
