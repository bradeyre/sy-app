import{createSignedReadUrl as P}from"@/lib/storage";import{formatZAR as Z}from"@/lib/format";import{resolveDeviceBrand,notesWithQuoteRef,rewriteRecordsForAirtableRetry}from"@/lib/airtableLeadFields";const h=process.env.AIRTABLE_API_KEY,u="appMB4HF3PkGe2rZd",g="tblx9AkbkYzo8Cqhu",p="tblTYFnQ9cn7SNKXi",I="https://api.airtable.com/v0";async function f(e,i={}){const t=await fetch(`${I}/${e}`,{...i,headers:{Authorization:`Bearer ${h}`,"Content-Type":"application/json",...i.headers}});if(!t.ok){const n=await t.text().catch(()=>"");throw new Error(`Airtable ${i.method||"GET"} ${e} failed: ${t.status} ${n}`)}return t.json()}function l(e){return String(e||"").trim().replace(/\s+/g," ").toLowerCase()}function d(e,i){if(!i)return null;const t=l(i);return e.find(r=>l(r)===t)||null}
const STATED_CAPACITY_CHOICES=["N/a","2GB","4GB","8GB","16GB","32GB","64GB","128GB","256GB","500GB","512GB","750GB","1TB","1.5TB","2TB","STANDARD"];
/**
 * "Stated Capacity" is a single-select, so it needs one of the field's own
 * choices, not whatever the calculator happens to call the capacity. The two
 * differ in exactly the case that matters for devices with no storage: the
 * calculator says "N/A", the Airtable option is spelled "N/a". Sent raw that
 * 422s the write, which before the retry guard would have taken the whole lead
 * down with it. Vacuums, coffee machines and hair care all land here the moment
 * those categories go live on a site.
 *
 * Matched case-insensitively like every other select in this file; anything the
 * field does not have is left blank and logged rather than sent, since the
 * capacity is also carried in "Device Model (Text)".
 */
function resolveStatedCapacity(e){const raw=String(e||"").trim();if(!raw)return null;const match=d(STATED_CAPACITY_CHOICES,raw);if(!match)console.warn(`airtable: "${raw}" is not a choice on Stated Capacity, leaving it blank on this record.`);return match}
const B=["Sealed","Mint","Good","Poor"],O="Default (EFT)",m="Epic Deals Consignment (10% Extra)",S="Epic Deals Voucher (12% Extra!) - Spend it in our online store",b={10:"Epic Deals Consignment (10% Extra)"},A={12:"Epic Deals Voucher (12% Extra!) - Spend it in our online store",5:"Epic Deals Voucher (5% Extra)"},y={"first national bank (fnb)":"First National Bank (FNB)",absa:"ABSA",capitec:"Capitec",nedbank:"Nedbank",discovery:"Discovery",investec:"Investec","standard bank":"Standard Bank",other:"Other (Please Specify)"},_=["Cheque","Current","Savings","Other","Credit"],D=["Gauteng","Free State","Eastern Cape","KwaZulu-Natal","Limpopo","Mpumalanga","Northern Cape","North West","Western Cape"];function w(e){return d(B,e)}function $(e,i){if(e==="eft")return O;const t=i==null?null:Math.round(Number(i)),n=Number.isFinite(t)?t:null;return e==="consignment"?n!=null&&b[n]?b[n]:(n!=null&&console.warn(`airtable: no known Consignment Airtable choice for ${n}%, falling back to "${m}". If the cockpit rate changed, add it to CONSIGNMENT_CHOICES_BY_PCT once the matching Airtable choice exists.`),m):e==="voucher"?n!=null&&A[n]?A[n]:(n!=null&&console.warn(`airtable: no known Voucher Airtable choice for ${n}%, falling back to "${S}". If the cockpit rate changed, add it to VOUCHER_CHOICES_BY_PCT once the matching Airtable choice exists.`),S):null}function v(e){return e&&(y[l(e)]||d(Object.values(y),e))||null}function k(e){return d(_,e)}function R(e){return d(D,e)}function C(e){return e?"Yes":"No"}function E(e){return String(e).replace(/"/g,'\\"')}async function N({brand:e,modelName:i}){const t=E(l(i)),n=await f(`${u}/${p}?`+new URLSearchParams({filterByFormula:`AND(LOWER(TRIM({Name}))="${t}", LOWER(TRIM({Brands}))="${E(l(e))}")`,maxRecords:"1"}));if(n.records?.length)return n.records[0].id;const r=await f(`${u}/${p}?`+new URLSearchParams({filterByFormula:`LOWER(TRIM({Name}))="${t}"`,maxRecords:"1"}));return r.records?.length?r.records[0].id:null}const MODEL_NAME_FILLER=new Set(["only","edition","version","inch","in","the","with","and"]);
/**
 * Models Strict is an externally synced table that names things its own way:
 * "PlayStation 5 (Digital Edition)" where we say "PlayStation 5 Digital",
 * "iPad Air 5th Gen (Wi-Fi Only)" where we say "iPad Air 5th Gen WiFi",
 * "Steam Deck (LCD Version)" where we say "Deck LCD". Exact matching missed
 * every one of those.
 *
 * Reducing both sides to a set of meaningful words -- punctuation and bracketed
 * qualifiers dropped, Wi-Fi spellings unified, the brand folded in so a bare
 * "Deck LCD" can still reach "Steam Deck" -- lines them up. Order stops
 * mattering too, which is what rescues 'iPad Pro 13 M4 WiFi' against
 * 'iPad Pro M4 13" (Wi-Fi Only)'.
 */
function canonicalModelKey(name,brand){const words=e=>String(e||"").toLowerCase().replace(/wi[-\s]?fi/g,"wifi").replace(/[^a-z0-9]+/g," ").split(" ").filter(Boolean);const meaningful=words(name).filter(w=>!MODEL_NAME_FILLER.has(w));if(meaningful.length===0)return"";return[...new Set([...words(brand),...meaningful])].sort().join(" ")}
/**
 * Extract Apple Silicon chip name from a model string.
 * "MacBook Pro 14 M3 Pro" -> "m3 pro"
 * "MacBook Pro 14 M3" -> "m3"
 * Returns null for non-Apple-Silicon models.
 */
function extractAppleChip(name){
const m=String(name||"").match(/\b(m[1-9]\d?)\s*(pro|max|ultra)?\b/i);
if(!m)return null;
return(m[1]+(m[2]?" "+m[2]:"")).toLowerCase();
}

/**
 * Subset matching with chip-aware disambiguation.
 * Instead of requiring exact canonical-key equality, checks that all
 * target words appear in the candidate's word set. Disambiguates by:
 *  1. Apple chip name (M3 vs M3 Pro vs M3 Max)
 *  2. Fewest extra words (closest match)
 * Any correct variant is better than a blank cell.
 */
async function findModelByCanonicalName({brand:e,modelName:i}){
const target=canonicalModelKey(i,e);
if(!target)return null;
const targetWords=new Set(target.split(" "));
const targetChip=extractAppleChip(i);
const tokens=String(i||"").toLowerCase().replace(/[^a-z0-9]+/g," ").split(" ").filter(w=>w.length>=3&&w!=="wifi"&&!MODEL_NAME_FILLER.has(w)).slice(0,2);
if(tokens.length===0)return null;
const clauses=tokens.map(t=>`SEARCH("${E(t)}", LOWER({Name}))`);
e&&clauses.unshift(`LOWER(TRIM({Brands}))="${E(l(e))}"`);
const formula=clauses.length>1?`AND(${clauses.join(", ")})`:clauses[0];
const candidates=[];
let offset=null;
for(let page=0;page<3;page++){
const params=new URLSearchParams({filterByFormula:formula,pageSize:"100"});
offset&&params.set("offset",offset);
const res=await f(`${u}/${p}?`+params);
for(const rec of res.records||[]){
const candKey=canonicalModelKey(rec.fields?.Name,rec.fields?.Brands);
const candWords=new Set(candKey.split(" "));
if([...targetWords].every(w=>candWords.has(w))){
candidates.push({id:rec.id,name:rec.fields?.Name,extra:candWords.size-targetWords.size,chip:extractAppleChip(rec.fields?.Name)});
}
}
if(!res.offset)break;
offset=res.offset;
}
if(candidates.length===0)return null;
if(candidates.length===1)return candidates[0].id;
if(targetChip){
const chipMatched=candidates.filter(c=>c.chip===targetChip);
if(chipMatched.length===1)return chipMatched[0].id;
if(chipMatched.length>1){chipMatched.sort((a,b)=>a.extra-b.extra);return chipMatched[0].id;}
}
candidates.sort((a,b)=>a.extra-b.extra);
if(candidates[0].extra<candidates[1].extra)return candidates[0].id;
console.warn(`airtable: "${i}" subset-matched ${candidates.length} Models Strict rows (${candidates.slice(0,3).map(c=>c.name).join(", ")}), picking closest`);
return candidates[0].id;
}

/**
* AI fallback: when subset matching finds nothing, fetch all Models Strict
* entries for the brand and ask Claude Haiku to pick the closest match.
* Gracefully no-ops if ANTHROPIC_API_KEY is not set or the call fails.
* Costs ~$0.0001 per invocation (Haiku input+output).
*/
async function aiMatchModel({brand,modelName}){
const apiKey=process.env.ANTHROPIC_API_KEY;
if(!apiKey)return null;
const candidates=[];
let offset=null;
const brandClause=brand?`LOWER(TRIM({Brands}))="${E(l(brand))}"`:null;
for(let page=0;page<5;page++){
const params=new URLSearchParams({pageSize:"100"});
if(brandClause)params.set("filterByFormula",brandClause);
if(offset)params.set("offset",offset);
const res=await f(`${u}/${p}?`+params);
for(const rec of res.records||[])candidates.push({id:rec.id,name:rec.fields?.Name});
if(!res.offset)break;
offset=res.offset;
}
if(candidates.length===0)return null;
const list=candidates.map((c,i)=>`${i}: ${c.name}`).join("\n");
try{
const res=await fetch("https://api.anthropic.com/v1/messages",{
method:"POST",
headers:{"x-api-key":apiKey,"anthropic-version":"2023-06-01","content-type":"application/json"},
body:JSON.stringify({model:"claude-haiku-4-5-20251001",max_tokens:20,messages:[{role:"user",content:`Which product name is the same device as "${modelName}"? Reply with ONLY the line number, or "none" if nothing matches.\n\n${list}`}]})
});
if(!res.ok){console.warn(`airtable: AI model-match returned ${res.status}, skipping`);return null;}
const data=await res.json();
const reply=(data.content?.[0]?.text||"").trim();
const idx=parseInt(reply,10);
if(Number.isFinite(idx)&&idx>=0&&idx<candidates.length){
console.log(`airtable: AI matched "${modelName}" -> "${candidates[idx].name}"`);
return candidates[idx].id;
}
return null;
}catch(err){console.warn("airtable: AI model-match failed",err);return null;}
}
async function L({brand:e,modelName:t}){if(!t)return null;const exact=await N({brand:e,modelName:t});if(exact)return exact;const near=await findModelByCanonicalName({brand:e,modelName:t});if(near)return near;const ai=await aiMatchModel({brand:e,modelName:t});if(ai)return ai;console.warn(`airtable: no Models Strict row matches "${t}"${e?` (${e})`:""}, leaving "Stated Device Model (Strict)" blank. That table is externally synced, so this app cannot create the missing row; add it at the source if the link matters.`);return null}async function T(e){if(!e)return null;try{return[{url:await P(e)}]}catch(i){return console.error(`airtable: could not create signed read URL for ${e}`,i),null}}function F(e){const i=String(e.fullName||"").trim().split(/\s+/),t=i[0]||"",n=i.slice(1).join(" "),r={"Status Select":"A1 - Awaiting Arrival","Submission Type":"Courier Collection","Client First Name":t,"Client Surname":n,"Client Phone Number":e.phone,"Website Sent From":e.siteDomain};e.email&&(r["Client Email"]=e.email),e.address&&(r["Client Street Number and Name"]=e.address),e.suburb&&(r["Client Suburb"]=e.suburb),e.city&&(r["Client City"]=e.city);const o=R(e.province);o&&(r["Client Province"]=o),e.idNumber&&(r["Client ID Number"]=e.idNumber),e.preferredCollectionDate&&(r["Collection / Drop Off Date"]=e.preferredCollectionDate),r["Collection=Residential?"]=C(e.residentialAddress),r["T's and C's Agreement?"]=C(e.termsAccepted),r["Privacy Policy Agreement?"]=C(e.privacyAccepted),r["Legal Owner?"]=C(e.ageConfirmed),e.couponCode&&(r["SY Voucher / Coupon"]=e.couponBonus?`${e.couponCode} (+${Z(e.couponBonus)} on this order)`:e.couponCode);const a=v(e.bankName);a&&(r["Bank Name (Client)"]=a),e.accountNumber&&(r["Bank Account Number (Client)"]=e.accountNumber);const c=k(e.accountType);c&&(r["Bank Account Type (Client)"]=c),e.branchCode&&(r["Client Bank Branch Code"]=e.branchCode);const notes=notesWithQuoteRef(e.notes,e.quoteRef);return notes&&(r["Notes"]=notes),r}async function M(e,i){const catalogBrand=String(e.brand||"").trim();const brand=resolveDeviceBrand(e.brand,i);const t={Source:e.airtableSource,"Device Model (Text)":e.model};brand&&(t["Device Brand (Select)"]=brand);const n=w(e.condition);n&&(t["Stated Condition"]=n);const r=$(e.paymentPreference,e.paymentBonusPct);r&&(t["Payment Preference"]=r);const o=resolveStatedCapacity(e.capacity);o&&(t["Stated Capacity"]=o),e.accessories?.length&&(t["Accessories Included"]=e.accessories.map(c=>c.label).join(", ")),e.faultDescription&&(t["Client Reported Issue (App)"]=e.faultDescription);const a=(e.faultDeductionTotal||0)+(e.aiFaultDeductionTotal||0);t["Quoted Value"]=Math.round((e.price+(e.accessoryBonusTotal||0)-a)*100)/100;try{const c=await L({brand:catalogBrand||brand||"",modelName:e.model});c&&(t["Stated Device Model (Strict)"]=[c])}catch(c){console.error(`airtable: model matching failed for "${e.model}"`,c)}return t}function x(e,i){const t=[];for(let n=0;n<e.length;n+=i)t.push(e.slice(n,n+i));return t}
/**
 * One unparseable cell used to take the entire lead down with it: the write
 * throws, and because the whole sync runs inside after() nobody sees it -- the
 * customer gets a success screen and ops never gets the lead. That is exactly
 * how four days of submissions went missing in Aug 2026, and how Epic Deals
 * trade-in lead 411 (EDT-6FED-JGAA) vanished in Sep 2026: Device Brand came
 * back INVALID_MULTIPLE_CHOICE_OPTIONS, which the old retry did not catch.
 *
 * Any named-field 422 -- Cannot parse, INVALID_VALUE_FOR_COLUMN,
 * INVALID_MULTIPLE_CHOICE_OPTIONS, UNKNOWN_FIELD_NAME -- is retried once with
 * that field stripped (Device Brand is rewritten as Other first). A record
 * with one blank cell is recoverable; a lead that never arrives is not.
 */
async function postLeadRecords(records){
try{return await f(`${u}/${g}`,{method:"POST",body:JSON.stringify({records})})}
catch(err){
const rewritten=rewriteRecordsForAirtableRetry(records,err);
if(!rewritten)throw err;
console.error(`airtable: Airtable rejected a named field on this lead, rewriting once so it still lands`,err);
return f(`${u}/${g}`,{method:"POST",body:JSON.stringify({records:rewritten})});
}
}

function syncEventName(result){
if(result.ok)return"airtable_sync_ok";
if(result.skipped)return"airtable_sync_skipped";
return"airtable_sync_failed";
}

function logSyncOutcome(payload){
const line=JSON.stringify(payload);
if(payload.ok)console.log(line);
else console.error(line);
}

async function persistSyncOutcome(leadId, result){
if(!leadId){
logSyncOutcome({event:syncEventName(result),...result,leadId:null});
return result;
}
logSyncOutcome({event:syncEventName(result),leadId,...result});
try{
const {query}=await import("@/lib/db");
await query(
`update calc.leads
    set airtable_record_id = $2,
        airtable_sync_error = $3,
        airtable_synced_at = case when $4 then now() else airtable_synced_at end
  where id = $1`,
[
leadId,
result.recordIds?.length?result.recordIds.join(","):null,
result.ok?null:String(result.error||"unknown airtable sync error").slice(0,2000),
Boolean(result.ok),
]
);
}catch(err){
console.error("airtable: could not persist sync outcome on calc.leads",err);
}
return result;
}

export async function syncLeadToAirtable({lead:e,items:i,brand:t,leadId:leadId}={}){
const quoteRef=e?.quoteRef||null;
if(!h){
const error="AIRTABLE_API_KEY not set, skipping Airtable sync";
console.warn(`airtable: ${error}`);
return persistSyncOutcome(leadId,{ok:false,skipped:true,recordIds:[],error,quoteRef});
}
try{
const[n,r]=await Promise.all([T(e.idDocumentPath),T(e.selfiePath)]);
const o=F(e);
n&&(o["Client ID Doc"]=n);
r&&(o["Client Photo"]=r);
const c=(await Promise.all(i.map(s=>M({...s,airtableSource:e.airtableSource,paymentPreference:e.paymentPreference,paymentBonusPct:e.paymentBonusPct},t)))).map(s=>({fields:{...o,...s}}));
const recordIds=[];
for(const s of x(c,10)){
const posted=await postLeadRecords(s);
for(const rec of posted?.records||[])if(rec?.id)recordIds.push(rec.id);
}
if(!recordIds.length)throw new Error("Airtable accepted the write but returned no record ids");
return persistSyncOutcome(leadId,{ok:true,skipped:false,recordIds,error:null,quoteRef});
}catch(err){
const error=String(err?.message||err);
return persistSyncOutcome(leadId,{ok:false,skipped:false,recordIds:[],error,quoteRef});
}
}

export async function replayLeadToAirtable(leadId){
const {query}=await import("@/lib/db");
const {getSiteConfig}=await import("@/lib/siteConfig");
const {rows}=await query(`select * from calc.leads where id = $1`,[leadId]);
const row=rows[0];
if(!row)throw new Error(`calc.leads id ${leadId} not found`);
if(row.status==="spam"){
console.warn(`airtable: refusing to replay spam lead ${leadId}`);
return {ok:false,skipped:true,recordIds:[],error:"spam lead, not replayed",quoteRef:row.quote_ref||null};
}
if(row.airtable_record_id){
console.warn(`airtable: lead ${leadId} already has Airtable record ${row.airtable_record_id}, skipping replay`);
return {ok:true,skipped:true,recordIds:String(row.airtable_record_id).split(",").filter(Boolean),error:null,quoteRef:row.quote_ref||null};
}
const site=await getSiteConfig({overrideKey:row.site});
const items=typeof row.items==="string"?JSON.parse(row.items):row.items||[];
return syncLeadToAirtable({
leadId,
lead:{
fullName:row.full_name,
phone:row.phone,
email:row.email,
address:row.address,
suburb:row.suburb,
city:row.city,
province:row.province,
residentialAddress:row.residential_address!==false,
preferredCollectionDate:row.preferred_collection_date,
notes:row.notes,
quoteRef:row.quote_ref,
idNumber:row.id_number,
idDocumentPath:row.id_document_path,
selfiePath:row.selfie_path,
ageConfirmed:Boolean(row.age_confirmed),
termsAccepted:Boolean(row.terms_accepted),
privacyAccepted:Boolean(row.privacy_accepted),
bankName:row.bank_name,
accountType:row.account_type,
branchCode:row.branch_code,
accountNumber:row.account_number,
paymentPreference:row.payment_preference,
paymentBonusPct:row.payment_bonus_pct,
siteDomain:site.domain,
airtableSource:site.airtableSource||row.site?.toUpperCase(),
couponCode:row.coupon_code,
couponBonus:row.coupon_bonus,
},
items,
brand:site.where?.brand||"",
});
}
