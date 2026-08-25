import{NextResponse}from"next/server";import{query}from"@/lib/db";import{getSiteConfig}from"@/lib/siteConfig";import{readQuoteRef,newQuoteRef,attachQuoteRef}from"@/lib/quoteRef";export const dynamic="force-dynamic";const PREFERRED_FAMILY=(process.env.ANTHROPIC_FAULT_MODEL_FAMILY||"haiku").toLowerCase(),TIMEOUT_MS=8e3,MODEL_LIST_CACHE_MS=600*1e3;let modelListCache={fetchedAt:0,models:[]};async function fetchWithTimeout(url,options){const controller=new AbortController,timeout=setTimeout(()=>controller.abort(),TIMEOUT_MS);try{return await fetch(url,{...options,signal:controller.signal})}finally{clearTimeout(timeout)}}async function fetchLiveModels(apiKey){const now=Date.now();if(modelListCache.models.length>0&&now-modelListCache.fetchedAt<MODEL_LIST_CACHE_MS)return modelListCache.models;const models=[];let afterId=null;for(let page=0;page<5;page++){const url=new URL("https://api.anthropic.com/v1/models");url.searchParams.set("limit","100"),afterId&&url.searchParams.set("after_id",afterId);let res;try{res=await fetchWithTimeout(url.toString(),{headers:{"x-api-key":apiKey,"anthropic-version":"2023-06-01"}})}catch{break}if(!res.ok)break;const listBody=await res.json().catch(()=>null);if(!listBody||!Array.isArray(listBody.data)||(models.push(...listBody.data),!listBody.has_more||!listBody.last_id))break;afterId=listBody.last_id}return models.length>0&&(modelListCache={fetchedAt:now,models}),models}function rankModels(models,alreadyTried=[]){const tried=new Set(alreadyTried),candidates=(models||[]).filter(m=>m&&m.id&&(!m.type||m.type==="model")&&!tried.has(m.id)),byRecency=(a,b)=>new Date(b.created_at||0)-new Date(a.created_at||0),preferred=candidates.filter(m=>m.id.toLowerCase().includes(PREFERRED_FAMILY)).sort(byRecency),rest=candidates.filter(m=>!m.id.toLowerCase().includes(PREFERRED_FAMILY)).sort(byRecency);return[...preferred,...rest].map(m=>m.id)}async function callAI(apiKey,requestBody){const liveModels=await fetchLiveModels(apiKey),candidates=rankModels(liveModels);for(const modelId of candidates){try{const res=await fetchWithTimeout("https://api.anthropic.com/v1/messages",{method:"POST",headers:{"Content-Type":"application/json","x-api-key":apiKey,"anthropic-version":"2023-06-01"},body:JSON.stringify({...requestBody,model:modelId})});if(res.ok)return res}catch{continue}}return null}
/**
 * A priced extra needs no model call.
 *
 * Accessory values live on the option in pricing.site_catalog and are already
 * what we pay (50% of second-hand). Before this, every extra went to the
 * model and the model had nothing to ground itself on: calc.buy_prices_public
 * carries no accessory rows at all. It answered with NEW retail described as
 * used, then halved that, so a Magic Keyboard came back at R3,850 against a
 * real used price nearer R2,500, and an Apple Pencil at R1,450 against a
 * pre-owned iStore price of R999. Consistently over, on every quote,
 * invisibly.
 */
function storedExtraValues(site, category) {
  const group = site?.extraAccessoryOptions?.[category];
  const out = new Map();
  for (const opt of group?.options || []) {
    if (typeof opt.value === "number" && Number.isFinite(opt.value)) {
      out.set(opt.key, { value: Math.round(opt.value), label: opt.label });
    }
  }
  return out;
}

/**
 * Ceiling for anything still estimated by the model, which is now only
 * free-text items and options deliberately left unpriced.
 *
 * An accessory bundled with a device is not worth a quarter of the device.
 * This cannot make a wrong estimate right; it stops one being wrong by
 * thousands, which is the failure that actually costs money.
 */
const AI_EXTRA_ABSOLUTE_CAP = 1500;
function capEstimate(value, devicePrice) {
  const relative =
    Number.isFinite(devicePrice) && devicePrice > 0
      ? Math.round(devicePrice * 0.25)
      : AI_EXTRA_ABSOLUTE_CAP;
  return Math.max(0, Math.min(value, AI_EXTRA_ABSOLUTE_CAP, relative));
}

export async function POST(request){const existingQuoteRef=readQuoteRef(request);const body=await request.json().catch(()=>null);if(!body)return NextResponse.json({estimates:[]});if(!Array.isArray(body.extras))body.extras=[];if(body.extras.length===0&&!String(body.extrasText||"").trim())return NextResponse.json({estimates:[]});const apiKey=process.env.ANTHROPIC_API_KEY;if(!apiKey)return NextResponse.json({estimates:[]});const{category,model,capacity,extras,extrasText,devicePrice}=body,requested=extras.filter(e=>e&&e.key&&e.label).map(e=>({key:String(e.key),label:String(e.label)}));if(requested.length===0&&!extrasText)return NextResponse.json({estimates:[]});let siteCfg=null;try{siteCfg=await getSiteConfig({host:request.headers.get("host"),overrideKey:new URL(request.url).searchParams.get("site")})}catch{}const priced=storedExtraValues(siteCfg,category),storedEstimates=requested.filter(e=>priced.has(e.key)).map(e=>({key:e.key,label:priced.get(e.key).label||e.label,value:priced.get(e.key).value,reasoning:"Standard accessory value."})),safeExtras=requested.filter(e=>!priced.has(e.key));if(safeExtras.length===0&&!extrasText)return NextResponse.json({estimates:storedEstimates});const extrasList=safeExtras.map(e=>`- ${e.label}`).join("\n"),freeTextSection=extrasText?`\nThe customer also described these additional items:\n"${String(extrasText).slice(0,500)}"\n`:"",prompt=`You estimate the trade-in value of extra accessories bundled with a second-hand ${category} (${model}${capacity&&capacity!=="N/A"?`, ${capacity}`:""}) for Epic Deals, a South African tech reseller.

The customer wants to include these extra accessories with their ${String(category||"device").toLowerCase()} trade-in:
${extrasList}${freeTextSection}
For each item, estimate a fair trade-in value in ZAR (South African Rand) that Epic Deals would pay. This should be 50% of the item's SECOND-HAND price in South Africa, giving Epic Deals room for resale margin. Use 50%, not a range and not less.\n\nCritical: base it on the second-hand price a private seller actually gets locally, NOT the new retail price. New retail is typically two to three times the second-hand price, and quoting new retail as though it were the used price is the specific mistake to avoid here. If you are unsure of the local second-hand price, estimate low rather than high. These are accessories bundled with a device, so any single item you value above R1500 is almost certainly wrong.

For any free-text described items, create a separate estimate entry with a descriptive label and key "freetext_item_N" (where N is 1, 2, etc.).

Respond with ONLY strict JSON in this exact shape, no other text:
{"estimates":[{"key":"<exact key from the list>","label":"<exact label>","value":<integer rand amount>,"reasoning":"<one short sentence>"}]}`,res=await callAI(apiKey,{max_tokens:512,messages:[{role:"user",content:prompt}]});if(!res)return NextResponse.json({estimates:storedEstimates});try{const jsonMatch=((await res.json())?.content?.[0]?.text||"").match(/\{[\s\S]*\}/);if(!jsonMatch)return NextResponse.json({estimates:storedEstimates});const parsed=JSON.parse(jsonMatch[0]),estimates=(Array.isArray(parsed.estimates)?parsed.estimates:[]).map(e=>{const value=Math.round(Number(e.value));return!e.key||!Number.isFinite(value)||value<0?null:{key:String(e.key),label:String(e.label||e.key),value:Math.max(0,value),reasoning:String(e.reasoning||"").slice(0,300)}}).filter(Boolean);let quoteRef=existingQuoteRef;if(estimates.length>0){if(!quoteRef){let prefix="SY";try{const site=await getSiteConfig({host:request.headers.get("host"),overrideKey:new URL(request.url).searchParams.get("site")});prefix=site.airtableSource||"SY"}catch(refErr){console.error("POST /api/extra-price: could not resolve site for quote reference, using generic prefix",refErr)}quoteRef=newQuoteRef(prefix)}const refForLog=quoteRef;await query(`insert into calc.ai_extra_estimates
(category, model, capacity, extra_key, extra_label, estimated_value, reasoning, quote_ref)
select $1, $2, $3, e.key, e.label, e.value, e.reasoning, $5
from jsonb_to_recordset($4::jsonb) as e(key text, label text, value numeric, reasoning text)`,[category,model,capacity||"N/A",JSON.stringify(estimates),refForLog]).catch(err=>console.error("POST /api/extra-price: audit log insert failed",err))}const response=NextResponse.json({estimates:[...storedEstimates,...estimates.map(e=>({...e,value:capEstimate(e.value,Number(devicePrice))}))]});return quoteRef?attachQuoteRef(response,quoteRef):response}catch(err){return console.error("POST /api/extra-price: could not parse AI response",err),NextResponse.json({estimates:storedEstimates})}}