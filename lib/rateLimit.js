const o=new Map,c=3600*1e3,r=5;export function isRateLimited(n){const e=Date.now(),t=(o.get(n)||[]).filter(s=>e-s<c);return t.push(e),o.set(n,t),t.length>r}
