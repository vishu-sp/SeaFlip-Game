// One HTTP adapter keeps screen code independent of token and transport details.
import {token} from './auth.js';
export async function api(route,body) {
 const response=await fetch('/api'+route,{method:body===undefined?'GET':'POST',headers:{Authorization:'Bearer '+await token(),'Content-Type':'application/json'},...(body===undefined?{}:{body:JSON.stringify(body)}),signal:AbortSignal.timeout(20000)});
 const data=await response.json().catch(()=>({error:'Server unavailable. Retry shortly.'}));
 if(!response.ok)throw new Error(data.error||'Request failed. Please retry.');return data;
}
