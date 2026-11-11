// External service adapter. Reference: https://marcconrad.com/uob/fish/doc.php
// Live response uses question, fish, chest. The player solves the FISH value.
export function parsePuzzle(data) {
 if(!data || (data.fish ?? data.solution)==null)throw new Error('Missing Fish API answer');
 const solution=Number(data.fish ?? data.solution);
 if(!Number.isInteger(solution)||solution<0||typeof data.question!=='string')throw new Error('Invalid Fish API response');
 let image=data.question;
 if(/^[A-Za-z0-9+/=\r\n]+$/.test(image)) image='data:image/png;base64,'+image.replace(/\s/g,'');
 if(!/^data:image\/(png|jpeg);base64,/.test(image)) throw new Error('Expected a base64 puzzle image');
 return {image,solution};
}
export async function fetchPuzzle() {
 const response=await fetch('https://marcconrad.com/uob/fish/api.php?out=json&base64=yes',{signal:AbortSignal.timeout(12000)});
 if(!response.ok)throw new Error('Fish API unavailable');
 return parsePuzzle(await response.json());
}
