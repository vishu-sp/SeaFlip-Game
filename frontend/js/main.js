// AI-assisted revision of uploaded main.js. Events connect cohesive modules.
import * as Auth from './auth.js';import {api} from './api.js';import {$,show,notice,table} from './ui.js';import * as Game from './game.js';import {ART} from './art.js';
let mode='login',submitting=false;
async function safely(fn){try{await fn();}catch(e){notice(e.message);}}
function setMode(m){mode=m;$('nameField').hidden=m!=='register';$('authBtn').textContent=m==='login'?'Dive in →':'Create account →';$('tabLogin').classList.toggle('active',m==='login');$('tabRegister').classList.toggle('active',m==='register');$('password').autocomplete=m==='login'?'current-password':'new-password';}
$('tabLogin').onclick=()=>setMode('login');$('tabRegister').onclick=()=>setMode('register');
$('authForm').onsubmit=e=>{e.preventDefault();safely(async()=>{submitting=true;$('authBtn').disabled=true;try{const email=$('email').value.trim(),password=$('password').value;if(mode==='register'){const name=$('displayName').value.trim();if(name.length<2)throw new Error('Enter a player name with at least two characters.');await Auth.register(name,email,password);}else await Auth.login(email,password);$('password').value='';await api('/profile');show('menu');notice('');}finally{submitting=false;$('authBtn').disabled=false;}});};
$('resetBtn').onclick=()=>safely(async()=>{if(!$('email').value.trim())throw new Error('Enter your email address first.');await Auth.reset($('email').value.trim());notice('If this address has an account, a reset email will arrive shortly.');});
$('logoutBtn').onclick=()=>safely(async()=>{await Auth.logout();Game.stop();show('login');});
for(const b of document.querySelectorAll('[data-go]'))b.onclick=()=>{notice('');show(b.dataset.go);};
for(const b of document.querySelectorAll('[data-start]'))b.onclick=()=>safely(async()=>{b.disabled=true;try{await Game.start();}finally{b.disabled=false;}});
$('leaveBtn').onclick=()=>safely(Game.leave);$('puzzleBtn').onclick=Game.puzzle;
$('answerForm').onsubmit=e=>{e.preventDefault();Game.submit();};
document.addEventListener('screenchange',e=>safely(async()=>{
 const id=e.detail;
 if(id==='menu'||id==='profile'){const p=await api('/profile');$('welcome').textContent='Ready for another adventure, '+p.displayName+'?';if(id==='profile')table('profileTable',['Player profile','Your progress'],[['Name',p.displayName],['Highest score',p.highScore],['Total score',p.totalScore],['Games finished',p.played],['Levels completed',p.levelsCompleted+' / 3']]);}
 if(id==='leaderboard'){const rows=await api('/leaderboard');table('lbTable',['Rank','Diver','Best'],rows.map((r,i)=>[i+1,r.displayName,r.highScore]));$('lbEmpty').hidden=rows.length>0;}
 if(id==='history'){const rows=await api('/history');table('histTable',['Date','Level','Score','Result'],rows.map(r=>[new Date(r.finishedAt).toLocaleDateString(),r.level,r.score,r.result]));$('histEmpty').hidden=rows.length>0;}
}));
document.querySelectorAll('[data-art]').forEach(el=>el.innerHTML=ART[el.dataset.art]);
for(let i=0;i<18;i++){const b=document.createElement('i');b.style.cssText=`left:${Math.random()*100}%;width:${12+i}px;height:${12+i}px;animation-duration:${10+i}s;animation-delay:-${i}s`;$('sea').append(b);}
show('login');init();async function init(){try{await Auth.initAuth(user=>{if(submitting)return;if(user){show('menu');}else{Game.stop();show('login');}});}catch(e){notice(e.message);$('authBtn').disabled=true;}}
