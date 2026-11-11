// Firestore persistence only. Transactions prevent duplicate answers / double scoring.
import {getFirestore} from 'firebase-admin/firestore';
import {check,expire} from './engine.js';
export function repository() {
 const db=getFirestore();
 const ref=uid=>db.collection('players').doc(uid);
 async function mutate(uid,id,change) {
  return db.runTransaction(async tx=>{
   const player=ref(uid), active=player.collection('private').doc('active');
   const [rs,ps]=await Promise.all([tx.get(active),tx.get(player)]);
   check(rs.exists,'Start a new game first.');const run=rs.data();check(run.id===id,'This game was replaced. Return to the menu.');
   expire(run);const extra=await change(run);run.updatedAt=Date.now();
   const stats=ps.data()||{displayName:'Diver',highScore:0,totalScore:0,played:0,levelsCompleted:0};
   stats.levelsCompleted=Math.max(stats.levelsCompleted||0,run.completed);
   if(['won','lost'].includes(run.phase)&&!run.recorded) {
    run.recorded=true;stats.highScore=Math.max(stats.highScore||0,run.score);stats.totalScore=(stats.totalScore||0)+Math.max(0,run.score);stats.played=(stats.played||0)+1;
    tx.set(player.collection('history').doc(run.id),{level:run.level,score:run.score,result:run.phase,finishedAt:run.finishedAt||Date.now()});
    tx.set(db.collection('leaderboard').doc(uid),{displayName:stats.displayName,highScore:stats.highScore});
   }
   tx.set(active,run);tx.set(player,stats);return {run,extra};
  });
 }
 return {mutate,
 async start(uid,run){await ref(uid).collection('private').doc('active').set(run);},
 async profile(uid,name){const r=ref(uid);await db.runTransaction(async tx=>{const s=await tx.get(r);if(!s.exists)tx.set(r,{displayName:name,highScore:0,totalScore:0,played:0,levelsCompleted:0});});return (await r.get()).data();},
 async history(uid){return (await ref(uid).collection('history').orderBy('finishedAt','desc').limit(20).get()).docs.map(d=>d.data());},
 async leaders(){return (await db.collection('leaderboard').orderBy('highScore','desc').limit(10).get()).docs.map(d=>d.data());}
 };
}
