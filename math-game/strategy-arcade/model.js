(function(root){
'use strict';
const linked=(a,b)=>a!==b&&(a%b===0||b%a===0);
const moves=(last,used,max)=>Array.from({length:max},(_,i)=>i+1).filter(n=>!used.includes(n)&&(!last||linked(last,n)));
const nimMove=piles=>{const sum=piles.reduce((a,b)=>a^b,0);for(let i=0;i<piles.length;i++){const target=piles[i]^sum;if(target<piles[i])return {row:i,count:piles[i]-target};}return {row:piles.findIndex(n=>n>0),count:1};};
const missions=()=>Array.from({length:10},()=>{let a=0;while(!a)a=Math.floor(Math.random()*7)-3;const b=Math.floor(Math.random()*9)-4;const xs=Array.from({length:11},(_,i)=>i-5).filter(x=>Math.abs(a*x+b)<=5);const x=xs[Math.floor(Math.random()*xs.length)];return {a,b,x,y:a*x+b};});
const api={linked,moves,nimMove,missions};if(typeof module==='object')module.exports=api;else root.ArcadeMath=api;
})(typeof globalThis!=='undefined'?globalThis:this);
