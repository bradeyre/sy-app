"use client";import{useEffect as _,useMemo as se,useRef as le,useState as m}from"react";import{formatZAR as B}from"@/lib/format";import{validateIdOrPassport as ft,digitsOnly as Me}from"@/lib/validation";import{isCourierCollectionDay as bt}from"@/lib/publicHolidays";function V(e){if(typeof window>"u")return e;const n=new URLSearchParams(window.location.search).get("site");if(!n)return e;const a=e.includes("?")?"&":"?";return`${e}${a}site=${encodeURIComponent(n)}`}const s={CATEGORY:"category",MODEL:"model",QUOTE:"quote",FAULTS:"faults",ACCESSORIES:"accessories",EXTRAS:"extras",PAYMENT:"payment",CALCULATING:"calculating",REVEAL:"reveal",DETAILS:"details",DONE:"done"},ie=[s.CATEGORY,s.MODEL,s.QUOTE,s.PAYMENT,s.DETAILS],ht={[s.CATEGORY]:"Device",[s.MODEL]:"Model",[s.QUOTE]:"Condition",[s.PAYMENT]:"Payment",[s.DETAILS]:"Your info"},$e={[s.FAULTS]:s.QUOTE,[s.ACCESSORIES]:s.QUOTE,[s.EXTRAS]:s.QUOTE,[s.CALCULATING]:s.PAYMENT,[s.REVEAL]:s.PAYMENT},gt={Sealed:"Brand new and unopened, still in its original packaging.",Mint:"Looks and works like new, no visible marks or faults.",Good:"Normal signs of everyday use, but fully working with no faults.",Poor:"Heavily used, or has a real fault, e.g. a cracked screen, a non-working button or port, or reduced battery health. Note: some faults may mean we're not able to buy back that particular item, you'll see if that applies on the next step."},je={Phone:<svg viewBox="0 0 24 24"fill="none"stroke="currentColor"strokeWidth="1.6"strokeLinecap="round"strokeLinejoin="round">
      <rect x="7"y="2"width="10"height="20"rx="2"/>
      <line x1="11"y1="18"x2="13"y2="18"/>
    </svg>,Laptop:<svg viewBox="0 0 24 24"fill="none"stroke="currentColor"strokeWidth="1.6"strokeLinecap="round"strokeLinejoin="round">
      <rect x="4"y="4"width="16"height="11"rx="1"/>
      <path d="M2 18.5h20l-1.6 2.2a1 1 0 0 1-.8.4H4.4a1 1 0 0 1-.8-.4z"/>
    </svg>,Desktop:<svg viewBox="0 0 24 24"fill="none"stroke="currentColor"strokeWidth="1.6"strokeLinecap="round"strokeLinejoin="round">
      <rect x="4"y="3"width="16"height="11"rx="1"/>
      <line x1="12"y1="14"x2="12"y2="18"/>
      <line x1="8"y1="20.5"x2="16"y2="20.5"/>
    </svg>,Tablet:<svg viewBox="0 0 24 24"fill="none"stroke="currentColor"strokeWidth="1.6"strokeLinecap="round"strokeLinejoin="round">
      <rect x="4"y="3"width="16"height="18"rx="2"/>
      <line x1="10"y1="18"x2="14"y2="18"/>
    </svg>,Watch:<svg viewBox="0 0 24 24"fill="none"stroke="currentColor"strokeWidth="1.6"strokeLinecap="round"strokeLinejoin="round">
      <rect x="8"y="6.5"width="8"height="11"rx="2.2"/>
      <line x1="10"y1="2"x2="10"y2="6.5"/>
      <line x1="14"y1="2"x2="14"y2="6.5"/>
      <line x1="10"y1="17.5"x2="10"y2="22"/>
      <line x1="14"y1="17.5"x2="14"y2="22"/>
    </svg>,Earphone:<svg viewBox="0 0 24 24"fill="none"stroke="currentColor"strokeWidth="1.6"strokeLinecap="round"strokeLinejoin="round">
      <circle cx="7"cy="8.5"r="3"/>
      <line x1="7"y1="11.5"x2="7"y2="18"/>
      <circle cx="17"cy="8.5"r="3"/>
      <line x1="17"y1="11.5"x2="17"y2="18"/>
    </svg>,Console:<svg viewBox="0 0 24 24"fill="none"stroke="currentColor"strokeWidth="1.6"strokeLinecap="round"strokeLinejoin="round">
      <path d="M6 9h4M8 7v4"/>
      <circle cx="16.5"cy="8.5"r="0.9"fill="currentColor"stroke="none"/>
      <circle cx="14.5"cy="10.5"r="0.9"fill="currentColor"stroke="none"/>
      <path d="M5.5 9c-2 0-3.2 2-3 4.3.2 2 1.5 4.2 3.3 4.2 1.3 0 1.7-1.2 2.7-2 .8-.6 1.6-.9 2.5-.9h2c.9 0 1.7.3 2.5.9 1 .8 1.4 2 2.7 2 1.8 0 3.1-2.2 3.3-4.2.2-2.3-1-4.3-3-4.3z"/>
    </svg>},Q={Phone:{bg:"bg-brand/10",text:"text-brand"},Laptop:{bg:"bg-[#7c6ff0]/10",text:"text-[#7c6ff0]"},Desktop:{bg:"bg-[#14b8a6]/10",text:"text-[#14b8a6]"},Tablet:{bg:"bg-[#ec4899]/10",text:"text-[#ec4899]"},Watch:{bg:"bg-[#f59e0b]/10",text:"text-[#f59e0b]"},Earphone:{bg:"bg-[#22c55e]/10",text:"text-[#22c55e]"},Console:{bg:"bg-[#6366f1]/10",text:"text-[#6366f1]"}},xt={Sealed:"var(--brand)",Mint:"#22c55e",Good:"#f59e0b",Poor:"#9ca3af"};function faultAppliesTo(k,mk){const inc=k.appliesTo,exc=k.excludes;if(Array.isArray(exc)&&exc.some(x=>mk.includes(String(x).toLowerCase())))return!1;if(Array.isArray(inc)&&inc.length)return inc.some(x=>mk.includes(String(x).toLowerCase()));return!0}
export default function yt(){const[e,n]=m(s.CATEGORY),[a,l]=m(null),[bnd,setBnd]=m(null),[f,p]=m(!0),[i,u]=m(null),[r,b]=m(null),[A,x]=m(""),[g,z]=m(null),[T,v]=m(null),[j,c]=m(null),[qNote,setQNote]=m(null),[w,R]=m(null),[P,Te]=m(null),[ze,G]=m([]),[Se,H]=m([]),[J,Z]=m(""),[Ee,X]=m(""),[Ue,Ae]=m({faultDeductionTotal:0,appliedFaults:[],pendingReviewFaults:[]}),[ke,we]=m([]),[Ce,ve]=m(""),[M,qe]=m("consignment"),[D,ee]=m([]),[We,Y]=m(!1),[De,L]=m(null),[Oe,Fe]=m({fullName:"",phone:"",email:"",address:"",suburb:"",city:"",province:"",postalCode:"",residentialAddress:!0,preferredCollectionDate:"",notes:"",idNumber:"",ageConfirmed:!1,termsAccepted:!1,privacyAccepted:!1,idDocumentPath:"",selfiePath:"",bankName:"",accountType:"",branchCode:"",accountNumber:"",website:""}),[Ve,Qe]=m({status:"idle",fileName:"",error:null}),[Ke,He]=m({status:"idle",fileName:"",error:null}),[Je,Pe]=m(!1),[Ze,Xe]=m(null),[cpn,setCpn]=m(null),[cpnIn,setCpnIn]=m(""),[cpnErr,setCpnErr]=m(null),[cpnBusy,setCpnBusy]=m(!1),Le=le(null),te=le(null),ye=le(!1);_(()=>{Le.current=Date.now()},[]),_(()=>{console.log("%cPsst, poking around the code?","color:#00a2ff;font-weight:bold;font-size:14px;"),console.log("We like that. If you build things too, say hi: sell@epicdeals.co.za")},[]),_(()=>{if(!te.current||typeof ResizeObserver>"u")return;const t=te.current,o=()=>{window.parent?.postMessage({type:"epic-calc-resize",height:t.scrollHeight},"*")},d=new ResizeObserver(o);return d.observe(t),o(),()=>d.disconnect()},[e,a,r,j,D]),_(()=>{fetch(V("/api/categories")).then(t=>t.json()).then(t=>{if(t.error)throw new Error(t.error);l(t.categories),setBnd(t.brand||null)}).catch(t=>L(t.message)).finally(()=>p(!1)),fetch("/api/settings").then(t=>t.json()).then(t=>{if(t.error)throw new Error(t.error);u(t)}).catch(t=>L(t.message))},[]),_(()=>{e===s.CATEGORY&&!f&&a&&a.length===1&&D.length===0&&!ye.current&&(ye.current=!0,et(a[0]))},[e,f,a]);function et(t){z(t),b(null),x(""),Y(!0),L(null),fetch(V(`/api/models?type=${encodeURIComponent(t.type)}`)).then(o=>o.json()).then(o=>{if(o.error)throw new Error(o.error);const d=[...o.models].sort((k,N)=>k.label.localeCompare(N.label));b(d),n(s.MODEL)}).catch(o=>L(o.message)).finally(()=>Y(!1))}function tt(t){v(t),c(null),R(null),setQNote(null),Y(!0),L(null),fetch(V(`/api/quote?model=${encodeURIComponent(t.model)}`)).then(o=>o.json()).then(o=>{if(o.error)throw new Error(o.error);c(o.capacities),setQNote(o.notice||null),o.capacities.length===1&&R(o.capacities[0]),n(s.QUOTE)}).catch(o=>L(o.message)).finally(()=>Y(!1))}/* Fault rules are keyed by category, and a category is not always one kind
   of thing: Desktop spans iMacs and Studio Displays, which have screens,
   and Mac minis and Mac Studios, which do not. Earphone spans in-ear buds
   with a charging case and over-ear AirPods Max with neither. Asking a Mac
   mini seller about a cracked screen is the sort of thing that makes a form
   feel like it was written for someone else.
   So a rule may narrow itself to the models it actually applies to, by
   substring against the canonical model key: `appliesTo` to opt in,
   `excludes` to opt out. A rule with neither still applies to the whole
   category, which is what most of them want. */
function U(t,o){const mk=(T?.model||"").toLowerCase();return(i?.conditionFaults?.[t]||[]).filter(k=>k.decline||k.type==="battery_threshold"?o!=="Sealed":o==="Good"||o==="Poor").filter(k=>faultAppliesTo(k,mk)).map(k=>{const N=bnd&&k.byBrand&&k.byBrand[bnd];return N?{...k,...N}:k})}function q(t,o){return(i?.freeTextFaultCategories||[]).includes(t)&&(o==="Good"||o==="Poor")}function ot(t){const d=(i?.aiDeductionCategories||[]).includes(g.type)&&t.condition==="Poor"?w.conditions.find(C=>C.condition==="Good"):null,k={key:`${T.model}-${w.capacity}-${t.condition}-${D.length}`,type:g.label,categoryType:g.type,model:T.label,capacity:w.capacity,condition:t.conditionLabel,conditionRaw:t.condition,basePrice:t.price,entryId:t.entryId,modelKey:T.model,goodPrice:d?.price??null,goodEntryId:d?.entryId??null};Te(k);const N=U(g.type,t.condition),y=q(g.type,t.condition);N.length>0||y||t.condition==="Mint"?(H([]),Z(""),X(""),n(s.FAULTS)):g.accessoryOptions?(G([]),n(s.ACCESSORIES)):g.extraAccessoryOptions?(we([]),ve(""),n(s.EXTRAS)):oe(k,[],{faultDeductionTotal:0,appliedFaults:[],pendingReviewFaults:[]})}function nt(t){Ae(t),g.accessoryOptions?(G([]),n(s.ACCESSORIES)):g.extraAccessoryOptions?(we([]),ve(""),n(s.EXTRAS)):oe(P,[],t)}function at(){const t=U(g?.type,P?.conditionRaw),o=t.filter(h=>h.type==="checkbox"),d=t.find(h=>h.type==="battery_threshold"),k=o.filter(h=>Se.includes(h.key)),N=[],y=[];let C=0;for(const h of k)h.deduction==null?y.push({key:h.key,label:h.label}):(N.push({key:h.key,label:h.label,deduction:h.deduction}),C+=h.deduction);if(d&&J!==""){const h=Number(J);if(Number.isFinite(h)&&h<d.threshold_pct){const E=`${d.label} (reported ${h}%)`;d.deduction==null?y.push({key:d.key,label:E}):(N.push({key:d.key,label:E,deduction:d.deduction}),C+=d.deduction)}}const S=Ee.trim().slice(0,500);q(g?.type,P?.conditionRaw)&&S&&y.push({key:"customer_described_issue",label:`Customer-described issue: "${S}"`}),nt({faultDeductionTotal:C,appliedFaults:N,pendingReviewFaults:y,hasReportedFault:N.length>0||y.length>0,faultDescriptionText:S})}function st(){const t=U(g?.type,P?.conditionRaw),o=q(g?.type,P?.conditionRaw);return t.length>0||o?s.FAULTS:s.QUOTE}function lt(t){fetch("/api/fault-price",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({category:t.categoryType,model:t.model,capacity:t.capacity,condition:t.condition,basePrice:t.basePrice,faults:t.pendingReviewFaults,appliedFaults:t.appliedFaults||[]})}).then(o=>o.ok?o.json():{proposals:[]}).then(o=>{const d=o.proposals||[];d.length!==0&&ee(k=>k.map(N=>{if(N.key!==t.key)return N;const y=[],C=[...N.aiProposedFaults||[]];let S=N.aiFaultDeductionTotal||0;for(const h of N.pendingReviewFaults||[]){const E=d.find(ae=>ae.key===h.key);E&&Number.isFinite(E.deduction)?(C.push({key:h.key,label:h.label,deduction:E.deduction,reasoning:E.reasoning||"",decline:!!E.decline}),S+=E.deduction):y.push(h)}const declined=N.declined||C.some(x=>x.decline);return{...N,pendingReviewFaults:y,aiProposedFaults:C,aiFaultDeductionTotal:S,declined}}))}).catch(()=>{})}function oe(t,o,d,F){const k=g?.accessoryOptions,N=k&&i?.accessoryBonus?.[k.settingsKey]||{},y=(k?.options||[]).filter(O=>o.includes(O.key)).map(O=>({key:O.key,label:O.label,bonus:Number(N[O.key])||0})),C=y.reduce((O,mt)=>O+mt.bonus,0),{faultDeductionTotal:S=0,appliedFaults:h=[],pendingReviewFaults:E=[],hasReportedFault:ae=!1,faultDescriptionText:dt=""}=d||{},Re=t.goodPrice!=null&&ae,ut=Re?t.goodPrice:t.basePrice,pt=Re?t.goodEntryId:t.entryId,{selectedExtras:eo=[],extrasText:to=""}=F||{},Be={...t,basePrice:ut,entryId:pt,accessories:y,accessoryBonusTotal:C,faultDeductionTotal:S,appliedFaults:h,pendingReviewFaults:E,faultDescription:dt,aiFaultDeductionTotal:0,aiProposedFaults:[],extras:eo.map(O=>({key:O.key,label:O.label,value:0,pending:!0})),extrasText:to,extrasTotalValue:0};ee(O=>[...O,Be]),(eo.length>0||to)&&yt_extraPrice(Be),E.length>0&&lt(Be),Te(null),G([]),H([]),Z(""),X(""),Ae({faultDeductionTotal:0,appliedFaults:[],pendingReviewFaults:[]}),we([]),ve(""),z(null),v(null),c(null),R(null),n(s.CATEGORY)}function yt_extraPrice(t){const F=g?.extraAccessoryOptions;if(!F)return;fetch("/api/extra-price",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({category:t.categoryType,model:t.model,capacity:t.capacity,extras:t.extras.map(o=>({key:o.key,label:o.label})),extrasText:t.extrasText||""})}).then(o=>o.ok?o.json():{estimates:[]}).then(o=>{const d=o.estimates||[];d.length!==0&&ee(k=>k.map(N=>{if(N.key!==t.key)return N;const y=N.extras.map(S=>{const h=d.find(E=>E.key===S.key);return h?{...S,value:h.value,reasoning:h.reasoning||"",pending:!1}:S}),C=d.filter(S=>S.key.startsWith("freetext_item_")).map(S=>({key:S.key,label:S.label,value:S.value,reasoning:S.reasoning||"",pending:!1}));return{...N,extras:[...y,...C],extrasTotalValue:[...y,...C].reduce((S,h)=>S+h.value,0)}}))}).catch(()=>{})}function it(t){ee(o=>o.filter(d=>d.key!==t))}function Ie(t,o){const d=t==="selfie"?He:Qe,k=t==="selfie"?"selfiePath":"idDocumentPath";if(!o)return;d({status:"uploading",fileName:o.name,error:null});const N=(o.name.split(".").pop()||"jpg").toLowerCase();fetch("/api/upload-url",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({fileExt:N})}).then(y=>y.json()).then(({uploadUrl:y,path:C,error:S})=>{if(S)throw new Error(S);return fetch(y,{method:"PUT",headers:{"Content-Type":o.type||"application/octet-stream"},body:o}).then(h=>{if(!h.ok)throw new Error("Upload failed");return C})}).then(y=>{Fe(C=>({...C,[k]:y})),d({status:"done",fileName:o.name,error:null})}).catch(y=>d({status:"error",fileName:o.name,error:y.message}))}const rt=D.reduce((t,o)=>t+Math.max(0,o.basePrice+o.accessoryBonusTotal+(o.extrasTotalValue||0)-(o.faultDeductionTotal||0)-(o.aiFaultDeductionTotal||0)),0),ne=se(()=>i?[{key:"consignment",pct:i.consignmentPct,shortLabel:"Epic Deals Consignment",label:`Epic Deals Consignment (${i.consignmentPct}% Extra)`,helper:`If you don't mind waiting for your payment, consignment is for you. Average sale period is around 13 days, and you'll get an extra ${i.consignmentPct}% for the wait.`},{key:"voucher",pct:i.voucherPct,shortLabel:"Epic Deals Voucher",label:`Epic Deals Voucher (${i.voucherPct}% Extra!)`,helper:"The biggest bonus we offer, redeemable in our online store on whatever you like."},{key:"eft",pct:0,shortLabel:"EFT",label:"EFT",helper:"Paid as soon as we've tested your device, no bonus, straight into your bank account."}]:[],[i]),_e=ne.find(t=>t.key===M)?.pct||0,W=Math.round((rt*(1+_e/100)+(cpn?.bonus||0))*100)/100;_(()=>{setCpn(null),setCpnErr(null)},[rt,D.length]);function applyCoupon(){const t=cpnIn.trim();if(t){setCpnBusy(!0),setCpnErr(null),fetch(V("/api/coupon"),{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({code:t,subtotal:rt,itemCount:D.length})}).then(o=>o.json()).then(o=>{o.ok?(setCpn({code:o.code,bonus:o.bonus,description:o.description}),setCpnErr(null)):(setCpn(null),setCpnErr(o.error||"That coupon code isn't valid"))}).catch(()=>{setCpn(null),setCpnErr("Could not check that code right now")}).finally(()=>setCpnBusy(!1))}}function ct(t){if(t.preventDefault(),D.some(o=>o.declined))return void L("One of your items can't be bought in its current condition, please remove it to continue.");Pe(!0),L(null),fetch(V("/api/lead"),{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({items:D.map(o=>({type:o.type,categoryType:o.categoryType,model:o.model,modelKey:o.modelKey,capacity:o.capacity,condition:o.conditionRaw,price:o.basePrice,entryId:o.entryId,accessories:o.accessories,accessoryBonusTotal:o.accessoryBonusTotal,faultDeductionTotal:o.faultDeductionTotal||0,appliedFaults:o.appliedFaults||[],pendingReviewFaults:o.pendingReviewFaults||[],aiFaultDeductionTotal:o.aiFaultDeductionTotal||0,aiProposedFaults:o.aiProposedFaults||[],faultDescription:o.faultDescription||"",extras:o.extras||[],extrasText:o.extrasText||"",extrasTotalValue:o.extrasTotalValue||0})),quotedTotal:W,paymentPreference:M,paymentBonusPct:_e,couponCode:cpn?.code||null,...Oe,renderedAt:Le.current})}).then(o=>o.json()).then(o=>{if(o.error)throw new Error(o.error);Xe(o.reference||o.id),n(s.DONE)}).catch(o=>L(o.message)).finally(()=>Pe(!1))}return<div ref={te}className="mx-auto w-full max-w-xl px-4 py-6 font-sans">
      <Nt/>

      {e!==s.DONE&&<Ct step={e}/>}

      {D.length>0&&e!==s.DONE&&e!==s.REVEAL&&e!==s.CALCULATING&&<Tt items={D}onRemove={it}/>}

      {De&&<p className="mb-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">{De}</p>}

      <div key={e}className="step-enter">
        {e===s.CATEGORY&&<Et categories={a}loading={f}onChoose={et}hasItems={D.length>0}onProceed={()=>n(s.PAYMENT)}/>}

        {e===s.MODEL&&<At category={g}models={r}loading={We}search={A}onSearch={x}onChoose={tt}onBack={()=>n(s.CATEGORY)}/>}

        {e===s.QUOTE&&<Dt model={T}capacities={j}notice={qNote}activeCapacity={w}onChooseCapacity={R}onChooseCondition={ot}onBack={()=>n(s.MODEL)}/>}

        {e===s.FAULTS&&<Ft brand={bnd}conditionRaw={P?.conditionRaw}faultRules={U(g?.type,P?.conditionRaw)}selectedFaultKeys={Se}onToggleFault={t=>H(o=>o.includes(t)?o.filter(d=>d!==t):[...o,t])}batteryPctInput={J}onBatteryPctChange={Z}showFreeText={q(g?.type,P?.conditionRaw)}faultDescription={Ee}onFaultDescriptionChange={X}onContinue={at}onBack={()=>n(s.QUOTE)}/>}

        {e===s.ACCESSORIES&&<Ot config={g.accessoryOptions}selected={ze}onToggle={t=>G(o=>{if(t==="__none__")return["__none__"];const d=o.filter(k=>k!=="__none__");return d.includes(t)?d.filter(k=>k!==t):[...d,t]})}onContinue={()=>{if(g.extraAccessoryOptions){we([]),ve(""),n(s.EXTRAS)}else oe(P,ze,Ue)}}onBack={()=>n(st())}/>}

        {e===s.EXTRAS&&<Xt config={g.extraAccessoryOptions}selected={ke}onToggle={t=>we(o=>o.includes(t)?o.filter(d=>d!==t):[...o,t])}freeText={Ce}onFreeTextChange={ve}onContinue={()=>{const t=ke.map(o=>{const d=g.extraAccessoryOptions.options.find(k=>k.key===o);return d?{key:d.key,label:d.label}:null}).filter(Boolean);oe(P,ze,Ue,{selectedExtras:t,extrasText:Ce})}}onBack={()=>g.accessoryOptions?n(s.ACCESSORIES):n(st())}onSkip={()=>oe(P,ze,Ue)}/>}

        {e===s.PAYMENT&&<Pt options={ne}selected={M}onSelect={qe}onContinue={()=>n(s.CALCULATING)}onBack={()=>n(s.CATEGORY)}/>}

        {e===s.CALCULATING&&<Lt onDone={()=>n(s.REVEAL)}/>}

        {e===s.REVEAL&&<It total={W}items={D}paymentLabel={ne.find(t=>t.key===M)?.shortLabel}coupon={cpn}couponInput={cpnIn}onCouponInput={setCpnIn}couponError={cpnErr}couponBusy={cpnBusy}onApplyCoupon={applyCoupon}onRemoveCoupon={()=>{setCpn(null),setCpnErr(null),setCpnIn("")}}onContinue={()=>n(s.DETAILS)}onBack={()=>n(s.PAYMENT)}/>}

        {e===s.DETAILS&&<Mt form={Oe}setForm={Fe}onSubmit={ct}submitting={Je}onBack={()=>n(s.REVEAL)}total={W}paymentPreference={M}idUpload={Ve}onIdFile={t=>Ie("id",t)}selfieUpload={Ke}onSelfieFile={t=>Ie("selfie",t)}/>}

        {e===s.DONE&&<$t leadId={Ze}total={W}items={D}/>}
      </div>
    </div>}function Nt(){const[e,n]=m(0),[a,l]=m(!1),f=le(null);function p(){n(i=>i+1),f.current&&clearTimeout(f.current),f.current=setTimeout(()=>n(0),1500)}return _(()=>{if(e<5)return;l(!0),n(0);const i=setTimeout(()=>l(!1),2800);return()=>clearTimeout(i)},[e]),<div className="relative mb-6">
      <button type="button"onClick={p}aria-label="Epic Deals"className="mb-3 h-1 w-12 origin-left rounded-full bg-brand transition-transform hover:scale-x-125"/>
      {a&&<p className="egg-pop absolute left-16 top-0 max-w-[220px] text-xs font-medium text-brand">
          🎉 You found the secret. There&apos;s no bonus, but we like your curiosity.
        </p>}
      <h1 className="text-2xl font-bold text-fg">Get an instant offer</h1>
      <p className="mt-1 text-sm text-muted">
        Pick what you&apos;re selling below, no waiting, no haggling, no obligation to sell.
      </p>
    </div>}function Ct({step:e}){const n=ie.indexOf($e[e]||e);return<div className="mb-5">
      <div className="flex items-center gap-1.5">
        {ie.map((a,l)=><div key={a}className={`h-1.5 flex-1 rounded-full transition-colors ${l<=n?"bg-brand":"bg-line"}`}/>)}
      </div>
      <p className="mt-1.5 text-xs font-medium text-muted">
        Step {n+1} of {ie.length}, {ht[$e[e]||e]}
      </p>
    </div>}function Tt({items:e,onRemove:n}){return<div className="mb-6 overflow-hidden rounded-2xl border border-line bg-card shadow-sm">
      <div className="flex items-center justify-between px-4 py-3">
        <p className="text-sm font-semibold text-fg">Your items</p>
        <span className="rounded-full bg-brand/10 px-2.5 py-1 text-xs font-semibold text-brand">
          {e.length} item{e.length===1?"":"s"}
        </span>
      </div>
      <ul>
        {e.map(a=><li key={a.key}className="item-in flex items-center gap-3 border-t border-line px-4 py-3">
            <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${Q[a.categoryType]?.bg||"bg-brand/10"} ${Q[a.categoryType]?.text||"text-brand"}`}>
              <span className="h-4 w-4">{je[a.categoryType]}</span>
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm font-medium text-fg">
                {a.model} {a.capacity!=="N/A"?`(${a.capacity})`:""}
              </span>
              <span className="block truncate text-xs text-muted">
                {a.condition}
                {a.accessories?.length>0&&` \xB7 ${a.accessories.map(l=>l.label).join(", ")}`}
              </span>
              {(a.appliedFaults?.length>0||a.aiProposedFaults?.length>0||a.pendingReviewFaults?.length>0)&&<span className="block text-xs text-red-500">
                  {[...(a.appliedFaults||[]).map(l=>l.label),...(a.aiProposedFaults||[]).map(l=>`${l.label} (estimate, pending review)`),...(a.pendingReviewFaults||[]).map(l=>`${l.label} (pending review)`)].join(", ")}
                </span>}
              {a.declined&&<span className="mt-1 block rounded-md bg-red-50 px-2 py-1 text-xs font-semibold text-red-700">
                  Sorry, we can&apos;t buy this item in its current condition. Please remove it to continue.
                </span>}
              {a.extras?.length>0&&<span className="block text-xs text-positive">
                  {a.extras.map(l=>l.pending?`${l.label} (estimating...)`:`${l.label} (+${B(l.value)})`).join(", ")}
                </span>}
            </span>
            <button onClick={()=>n(a.key)}type="button"aria-label={`Remove ${a.model}`}className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-muted transition-colors hover:bg-red-50 hover:text-red-500">
              <svg viewBox="0 0 24 24"className="h-3.5 w-3.5"fill="none"stroke="currentColor"strokeWidth="2"strokeLinecap="round">
                <line x1="6"y1="6"x2="18"y2="18"/>
                <line x1="18"y1="6"x2="6"y2="18"/>
              </svg>
            </button>
          </li>)}
      </ul>
      <p className="border-t border-line px-4 py-2.5 text-xs text-muted">
        {e.length>=4?"Officially a clear-out. ":""}
        Your offer will be calculated once you&apos;ve picked a payment option.
      </p>
    </div>}function Ne({onClick:e,children:n,sub:a,icon:l,iconBg:f,iconText:p,dot:i}){return<button type="button"onClick={e}className="group flex w-full items-center justify-between rounded-xl border border-line bg-card px-4 py-3.5 text-left shadow-sm transition hover:border-brand hover:shadow-md active:scale-[0.99]">
      <span className="flex items-center gap-3">
        {l&&<span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full transition-transform duration-200 group-hover:-rotate-6 group-hover:scale-110 ${f||"bg-brand/10"} ${p||"text-brand"}`}>
            <span className="h-5 w-5">{l}</span>
          </span>}
        {i&&<span className="h-2.5 w-2.5 shrink-0 rounded-full"style={{backgroundColor:i}}/>}
        <span className="font-medium text-fg">{n}</span>
      </span>
      {a&&<span className="text-sm text-muted">{a}</span>}
    </button>}function St({onClick:e,label:n,explainer:a,dot:l}){return<button type="button"onClick={e}className="group flex w-full items-start gap-3 rounded-xl border border-line bg-card px-4 py-3.5 text-left shadow-sm transition hover:border-brand hover:shadow-md active:scale-[0.99]">
      {l&&<span className="mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full"style={{backgroundColor:l}}/>}
      <span className="min-w-0">
        <span className="block font-medium text-fg">{n}</span>
        {a&&<span className="mt-0.5 block text-xs text-muted">{a}</span>}
      </span>
    </button>}function Et({categories:e,loading:n,onChoose:a,hasItems:l,onProceed:f}){return n?<Ce rows={4}/>:!e||e.length===0?<p className="text-sm text-muted">No products available right now, please check back soon.</p>:<div className="space-y-2">
      {l&&<button type="button"onClick={f}className="mb-4 w-full rounded-xl bg-brand px-4 py-3.5 font-semibold text-white shadow-sm transition hover:brightness-95 hover:shadow-[0_0_20px_color-mix(in srgb, var(--brand) 35%, transparent)]">
          Continue to get your offer
        </button>}
      <p className="mb-2 text-sm font-medium text-muted">
        {l?"Or add another item":"What would you like to sell?"}
      </p>
      {e.map(p=><Ne key={p.type}onClick={()=>a(p)}icon={je[p.type]}iconBg={Q[p.type]?.bg}iconText={Q[p.type]?.text}>
          {p.label}
        </Ne>)}
    </div>}function At({category:e,models:n,loading:a,search:l,onSearch:f,onChoose:p,onBack:i}){const u=n?.filter(r=>r.label.toLowerCase().includes(l.trim().toLowerCase()));return<div className="space-y-2">
      <I onClick={i}label="Back"/>
      <p className="mb-2 text-sm font-medium text-muted">Which {e.label} do you have?</p>
      {!a&&n&&n.length>8&&<input type="text"autoFocus value={l}onChange={r=>f(r.target.value)}placeholder={`Search ${n.length} ${e.label} models…`}className="mb-2 w-full rounded-xl border border-line bg-card px-4 py-3 text-sm text-fg focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand"/>}
      {a&&<Ce rows={5}/>}
      {!a&&u?.map(r=><Ne key={r.model}onClick={()=>p(r)}>
            {r.label}
          </Ne>)}
      {!a&&u&&u.length===0&&<p className="px-1 py-4 text-sm text-muted">
          No match for &quot;{l}&quot;, try a shorter search, or go back and check the category.
        </p>}
    </div>}function Dt({model:e,capacities:n,notice:no,activeCapacity:a,onChooseCapacity:l,onChooseCondition:f,onBack:p}){const i=!a&&n?.length>1;return<div className="space-y-2">
      <I onClick={p}label="Back"/>
      {no&&<div className="rounded-xl border border-brand/30 bg-brand/5 p-4 mb-1">
          <p className="text-sm font-semibold text-fg mb-1">Sealed and unopened only</p>
          <p className="text-sm text-muted leading-relaxed">{no}</p>
        </div>}
      {no&&n?.length===0&&<p className="text-sm text-muted">We are not buying this model at the moment.</p>}
      {i&&<>
          <p className="mb-2 text-sm font-medium text-muted">{e.label}, storage size?</p>
          {n.map(u=><Ne key={u.capacity}onClick={()=>l(u)}>
              {u.capacity}
            </Ne>)}
        </>}
      {a&&<>
          <p className="mb-2 text-sm font-medium text-muted">
            {e.label} {a.capacity!=="N/A"?`(${a.capacity})`:""}, what condition?
          </p>
          {a.conditions.map(u=><St key={u.condition}onClick={()=>f(u)}dot={xt[u.condition]||"#9ca3af"}label={u.conditionLabel}explainer={gt[u.condition]}/>)}
        </>}
    </div>}function Ot({config:e,selected:n,onToggle:a,onContinue:l,onBack:f}){const p=n.includes("__none__"),i=n.length>0;return<div className="space-y-2">
      <I onClick={f}label="Back"/>
      <p className="mb-2 text-sm font-medium text-muted">{e.groupLabel}</p>
      <K checked={p}onClick={()=>a("__none__")}>
        None
      </K>
      {e.options.map(u=><K key={u.key}checked={!p&&n.includes(u.key)}onClick={()=>a(u.key)}>
          {u.label}
        </K>)}
      <p className="px-1 pt-1 text-xs text-muted">
        Select all the original, undamaged accessories you&apos;d like to include, in good cosmetic and fully
        working condition.
      </p>
      <button type="button"disabled={!i}onClick={l}className="mt-4 w-full rounded-xl bg-brand px-4 py-3.5 font-semibold text-white shadow-sm transition hover:brightness-95 hover:shadow-[0_0_20px_color-mix(in srgb, var(--brand) 35%, transparent)] disabled:opacity-60 disabled:hover:shadow-none">
        Continue
      </button>
    </div>}function Xt({config:e,selected:n,onToggle:a,freeText:l,onFreeTextChange:f,onContinue:p,onBack:i,onSkip:u}){const r=n.length>0||l.trim().length>0;return<div className="space-y-2">
      <I onClick={i}label="Back"/>
      <p className="mb-2 text-sm font-medium text-muted">{e.groupLabel}</p>
      <p className="mb-3 text-xs text-muted">Got extra accessories to include? We&apos;ll estimate what we can offer for each one and add it to your total. Accessory values are estimates. We confirm them once your device arrives and we&apos;ve tested everything.</p>
      {e.options.map(b=><K key={b.key}checked={n.includes(b.key)}onClick={()=>a(b.key)}>
          {b.label}
        </K>)}
      <div className="mt-3">
        <label className="mb-1 block text-xs font-medium text-muted">Anything else?</label>
        <textarea value={l}onChange={b=>f(b.target.value)}placeholder="e.g. 3 extra games, a VR headset..."maxLength={500}rows={2}className="w-full rounded-xl border border-line bg-card px-4 py-3 text-sm text-fg placeholder-muted focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand"/>
      </div>
      <button type="button"onClick={p}disabled={!r}className="mt-4 w-full rounded-xl bg-brand px-4 py-3.5 font-semibold text-white shadow-sm transition hover:brightness-95 hover:shadow-[0_0_20px_color-mix(in srgb, var(--brand) 35%, transparent)] disabled:opacity-60 disabled:hover:shadow-none">
        Continue with extras
      </button>
      <button type="button"onClick={u}className="mt-1 w-full rounded-xl border border-line bg-card px-4 py-3 text-sm font-medium text-muted shadow-sm transition hover:bg-canvas">
        Skip, no extras
      </button>
    </div>}function Ft({brand:et,conditionRaw:Qe,faultRules:e,selectedFaultKeys:n,onToggleFault:a,batteryPctInput:l,onBatteryPctChange:f,showFreeText:p,faultDescription:i,onFaultDescriptionChange:u,onContinue:r,onBack:b}){const A=e.find(v=>v.type==="battery_threshold"),x=e.filter(v=>v.type==="checkbox"),g=x.find(v=>v.decline&&n.includes(v.key)),gB=!!g&&g.blocks!==!1,Un=n.length>0||!!(p&&i.trim()),[z,T]=m(!!A),
/* Excellent pays a premium for a device that is genuinely nearly new, and
   the grade itself already asserts "no faults" -- so instead of a fault
   list it takes an explicit confirmation, and says out loud that most used
   phones are Good. Cheap to tick, and it puts the claim on record. */
Je=Qe==="Mint",[Ze,Xe]=m(!1);return A&&z?<div className="space-y-2">
        <I onClick={b}label="Back"/>
        <p className="mb-2 text-sm font-medium text-muted">What&apos;s the battery health?</p>
        <div className="rounded-xl border border-line bg-card px-4 py-3.5 shadow-sm">
          <label className="mb-1 block text-sm font-medium text-fg">Battery health %</label>
          <p className="mb-2 text-xs text-muted">
            {et==="Samsung"
              ?"Check Settings, Battery and device care, then Diagnostics, or the Samsung Members app."
              :et==="Apple"
                ?"Check Settings → Battery → Battery Health on the device."
                :"Check your phone's battery health in its settings."}{" "}
            Leave blank if you&apos;re not sure.
          </p>
          <input type="number"inputMode="numeric"min="0"max="100"value={l}onChange={v=>f(v.target.value)}placeholder="e.g. 87"className="w-full rounded-lg border border-line bg-card px-3 py-2 text-sm text-fg focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand"/>
        </div>
        <p className="px-1 pt-1 text-xs text-muted">Not sure, or it&apos;s fine? Just hit continue.</p>
        <button type="button"onClick={()=>{x.length>0||p||Je?T(!1):r()}}className="mt-4 w-full rounded-xl bg-brand px-4 py-3.5 font-semibold text-white shadow-sm transition hover:brightness-95 hover:shadow-[0_0_20px_color-mix(in srgb, var(--brand) 35%, transparent)]">
          Continue
        </button>
      </div>:<div className="space-y-2">
      <I onClick={A?()=>T(!0):b}label="Back"/>
      {!Je&&<button type="button"disabled={Un}onClick={r}className={`mb-1 flex w-full items-center gap-2 rounded-xl border-2 px-4 py-3.5 text-left font-semibold shadow-sm transition ${Un?"border-line bg-card text-muted opacity-60":"border-brand bg-brand/5 text-brand hover:bg-brand/10"}`}>
        <span className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-md border-2 transition-colors ${Un?"border-line":"border-brand bg-brand"}`}>
          {!Un&&<svg viewBox="0 0 24 24"className="h-3.5 w-3.5 text-white"fill="none"stroke="currentColor"strokeWidth="3">
            <polyline points="20 6 9 17 4 12"/>
          </svg>}
        </span>
        Nothing below applies, it works perfectly
      </button>}
      {Je&&<div className="mb-3">
        <p className="mb-2 text-sm font-medium text-muted">Just to confirm</p>
        <K checked={Ze}onClick={()=>Xe(v=>!v)}>
          It looks new, no marks or signs of use, and everything works perfectly
        </K>
        <p className="px-1 pt-2 text-xs text-muted">
          Excellent is for a nearly new device. Most used ones are Good, so if yours has any wear at all, please go back and choose Good, it is still a strong price.
        </p>
      </div>}
      {(x.length>0||p)&&<p className="mb-2 text-sm font-medium text-muted">
        {Je?"Anything that would stop us buying it?":A?"Any other faults we should know about?":"Any faults we should know about?"}
      </p>}

      {x.map(v=><K key={v.key}checked={n.includes(v.key)}onClick={()=>a(v.key)}>
          {v.label}
        </K>)}

      {p&&<div className="rounded-xl border border-line bg-card px-4 py-3.5 shadow-sm">
          <label className="mb-1 block text-sm font-medium text-fg">Describe what&apos;s wrong (optional)</label>
          <textarea value={i}onChange={v=>u(v.target.value)}rows={3}maxLength={500}placeholder="e.g. won&apos;t power on, three dead keys, hinge is loose…"className="w-full rounded-lg border border-line bg-card px-3 py-2 text-sm text-fg focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand"/>
          <p className="mt-1 text-xs text-muted">
            The more detail you give us, the better we can price it, our system reviews this to propose a fair
            deduction.
          </p>
        </div>}

      {g?<p className={`rounded-lg px-4 py-3 text-sm ${gB?"bg-red-500/10 text-red-500":"bg-amber-500/10 text-fg"}`}>
          {g.declineMessage||"We are not able to buy a device in this condition. If you selected that by mistake, please go back and choose the condition that matches."}
        </p>:(x.length>0||p)&&<p className="px-1 pt-1 text-xs text-muted">
          {Je?"Leave it unticked if it does not apply.":"Select anything that applies. What we take off is our estimate from your description, and it is usually close. We check it against the device when it reaches us, then come back to you with a firm offer. Nothing to report? Just hit continue."}
        </p>}

      <button type="button"disabled={gB||Je&&!Ze}onClick={r}className="mt-4 w-full rounded-xl bg-brand px-4 py-3.5 font-semibold text-white shadow-sm transition hover:brightness-95 hover:shadow-[0_0_20px_color-mix(in srgb, var(--brand) 35%, transparent)] disabled:opacity-60 disabled:hover:shadow-none">
        Continue
      </button>
    </div>}function K({checked:e,onClick:n,children:a}){return<button type="button"onClick={n}className={`flex w-full items-center gap-3 rounded-xl border px-4 py-3.5 text-left shadow-sm transition active:scale-[0.99] ${e?"border-brand bg-brand/5":"border-line bg-card hover:border-brand"}`}>
      <span className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-md border-2 transition-colors ${e?"border-brand bg-brand":"border-line"}`}>
        {e&&<svg viewBox="0 0 24 24"className="check-pop h-3.5 w-3.5 text-white"fill="none"stroke="currentColor"strokeWidth="3">
            <polyline points="20 6 9 17 4 12"/>
          </svg>}
      </span>
      <span className="font-medium text-fg">{a}</span>
    </button>}function Pt({options:e,selected:n,onSelect:a,onContinue:l,onBack:f}){if(e.length===0)return<Ce rows={3}/>;const p=e.find(i=>i.key===n)||e[0];return<div className="space-y-2">
      <I onClick={f}label="Back"/>
      <p className="mb-2 text-sm font-medium text-muted">How would you like to be paid?</p>
      {e.map(i=><K key={i.key}checked={i.key===n}onClick={()=>a(i.key)}>
          {i.label}
        </K>)}
      <p className="px-1 pt-1 text-xs text-muted">{p.helper}</p>
      <button type="button"onClick={l}className="mt-4 w-full rounded-xl bg-brand px-4 py-3.5 font-semibold text-white shadow-sm transition hover:brightness-95 hover:shadow-[0_0_20px_color-mix(in srgb, var(--brand) 35%, transparent)]">
        Calculate Offer
      </button>
    </div>}const $=[{text:"Crunching the numbers…",duration:1500},{text:"Checking today's going rate…",duration:1600},{text:"Comparing against today's market (no lowballing here)…",duration:1900},{text:"Making sure you're not leaving money on the table…",duration:1900},{text:"Politely arguing with our pricing bot…",duration:1700},{text:"Weighing up your accessories (yes, the cable counts)…",duration:1900},{text:"Double-checking everything adds up…",duration:1700},{text:"Almost there…",duration:1300},{text:"Locking in your best offer…",duration:1500}];function Lt({onDone:e}){const[n,a]=m(0);return _(()=>{const l=[];let f=0;for(let i=1;i<$.length;i++)f+=$[i-1].duration,l.push(setTimeout(()=>a(i),f));f+=$[$.length-1].duration;const p=setTimeout(e,f);return()=>{l.forEach(clearTimeout),clearTimeout(p)}},[e]),<div className="flex flex-col items-center justify-center gap-5 rounded-2xl border border-brand/30 bg-gradient-to-b from-brand/10 to-[var(--card)] px-4 py-20 text-center">
      <span className="h-12 w-12 animate-spin rounded-full border-4 border-brand/20 border-t-brand"/>
      <p key={n}className="msg-in text-sm font-medium text-muted"aria-live="polite">
        {$[n].text}
      </p>
    </div>}/**
 * The offer reveal: the one screen in this flow that exists to make someone
 * feel something. It used to do that with confetti, a pulsing brand ring, a
 * party emoji and a bounce-eased pop on the figure. The storefronts it is
 * embedded in ban all four -- brand colour is reserved for the primary
 * action, active links, the counter's pulse dot and a single hairline
 * accent, and there is no bounce easing anywhere in that system -- so the
 * celebration is re-authored in their language instead of removed: one
 * staggered rise on the site's own exponential ease, the count-up (which is
 * the storefronts' own live-payout-counter pattern), and the one sanctioned
 * brand hairline under the figure.
 */
function It({total:e,items:n,paymentLabel:a,onContinue:l,onBack:f,coupon:S,couponInput:E,onCouponInput:C,couponError:N,couponBusy:k,onApplyCoupon:y,onRemoveCoupon:h}){
  const[p,i]=m(0),Fe=le(0),
  // Only the fault deduction is provisional. The device price itself is
  // fixed, and saying "some of this is an estimate" without saying which
  // part reads as though the whole number might move.
  Ge=n.reduce((t,r)=>t+(r.aiFaultDeductionTotal||0),0),
  Ve=n.some(r=>r.pendingReviewFaults?.length>0),
  He=Ge>0||Ve;
  return _(()=>{
    const r=Fe.current,A=e;
    Fe.current=e;
    if(r===A){i(A);return}
    if(typeof window<"u"&&window.matchMedia?.("(prefers-reduced-motion: reduce)").matches){i(A);return}
    /* The first reveal earns a long, theatrical count from zero. A coupon
       is a top-up on a number already on screen, so it counts from where
       it is over a much shorter move -- restarting from zero there threw
       away the total the customer had just read and made the coupon feel
       like a reset rather than a gain. */
    const x=r===0?2200:850,g=performance.now();
    let z,Ie;
    function T(Ke){
      const Ne=Math.min(1,(Ke-g)/x),qe=1-Math.pow(1-Ne,3);
      i(r+(A-r)*qe),Ne<1&&(z=requestAnimationFrame(T))
    }
    /* Safety net. requestAnimationFrame is the only thing that moves the
       figure, and a browser that is throttling frames -- a backgrounded
       tab, an iframe the visitor has scrolled away from and returned to --
       simply never calls it back. Without this the customer is left looking
       at whatever the number was before, which on the very first reveal is
       R0. The timeout lands the true total regardless; when the animation
       did run it is a no-op setting the value it already holds. */
    return z=requestAnimationFrame(T),Ie=setTimeout(()=>i(A),x+300),()=>{cancelAnimationFrame(z),clearTimeout(Ie)}
  },[e]),
  <div className="space-y-4">
    <I onClick={f}label="Back"/>
    <div className="rounded-2xl border border-line bg-card px-5 py-10 text-center">
      <p className="reveal-rise text-[0.7rem] font-medium uppercase tracking-[0.18em] text-muted">
        Your offer
      </p>
      {n.length>1&&<ul className="reveal-rise reveal-delay-1 mt-6 space-y-2 border-t border-line pt-5 text-left">
          {n.map(r=><li key={r.key}className="flex items-start justify-between gap-3 text-sm">
              <span className="text-muted">
                {r.model} {r.capacity!=="N/A"?`(${r.capacity})`:""}, {r.condition}
                {r.accessories?.length>0&&<span className="block text-xs text-muted opacity-70">
                    {r.accessories.map(b=>b.label).join(", ")}
                  </span>}
                {(r.appliedFaults?.length>0||r.aiProposedFaults?.length>0)&&<span className="block text-xs text-red-500">
                    {[...r.appliedFaults.map(b=>`${b.label}${b.deduction?` (-${B(b.deduction)})`:""}`),...(r.aiProposedFaults||[]).map(b=>`${b.label} (-${B(b.deduction)}, pending review)`)].join(", ")}
                  </span>}
                {r.extras?.filter(b=>b.value>0).length>0&&<span className="block text-xs text-positive">
                    Extras (estimated, confirmed on testing): {r.extras.filter(b=>b.value>0).map(b=>`${b.label} (+${B(b.value)})`).join(", ")}
                  </span>}
              </span>
              <span className="tabular shrink-0 font-medium text-fg">
                {B(Math.max(0,r.basePrice+r.accessoryBonusTotal+(r.extrasTotalValue||0)-(r.faultDeductionTotal||0)-(r.aiFaultDeductionTotal||0)))}
              </span>
            </li>)}
        </ul>}
      <p className="reveal-rise reveal-delay-1 tabular mt-8 text-[clamp(2.75rem,13vw,4.5rem)] font-bold leading-[0.95] tracking-[-0.03em] text-fg">
        {B(p)}
      </p>
      {S&&<p key={S.code}className="gain-in tabular mt-3 text-sm font-medium text-positive">
          +{B(S.bonus)} added with {S.code}
        </p>}
      <div className="reveal-rise reveal-delay-2 mx-auto mt-6 h-px w-12 bg-brand"/>
      <p className="reveal-rise reveal-delay-3 mt-7 text-sm text-muted">
        {He?`Paid via ${a}, that's your total, all in.`:`Paid via ${a}, that's your total, all in, no surprises.`}
      </p>
      {/* Names the one moving part and its amount, and says outright that
          everything else is settled. The earlier version said "anything we
          priced from what you told us is an estimate", which was true and
          useless: it read as though the whole offer might be a guess, at
          the exact moment the customer is deciding whether to trust it. */}
      {He&&<p className="reveal-rise reveal-delay-3 mx-auto mt-4 max-w-sm rounded-lg border border-line bg-canvas px-4 py-3 text-left text-xs leading-relaxed text-muted">
          {Ge>0
            ?<>The price for the device itself is fixed. The <span className="font-semibold text-fg">{B(Ge)}</span> we have taken off for the faults you reported is our estimate, and it is usually close.</>
            :<>The price for the device itself is fixed. What we take off for the faults you reported is still to be worked out.</>}
          {" "}We check the faults properly once your device reaches us, then come back to you with a firm offer.
        </p>}
      {e>=2e4&&<p className="reveal-rise reveal-delay-3 mt-1.5 text-sm font-medium text-fg">
          That&apos;s a proper number. Nice work.
        </p>}
    </div>
    <div className="rounded-2xl border border-line bg-card p-4">
      {S?<div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-sm font-semibold text-positive">Coupon {S.code} applied</p>
            <p className="mt-0.5 text-xs text-positive opacity-80">
              {S.description||"Bonus added to your offer"} (+{B(S.bonus)})
            </p>
          </div>
          <button type="button"onClick={h}className="shrink-0 text-xs font-medium text-muted transition hover:text-fg hover:underline">
            Remove
          </button>
        </div>
      :<div>
          <label className="mb-1.5 block text-sm font-medium text-fg">Have a coupon code?</label>
          <div className="flex gap-2">
            <input value={E}onChange={c=>C(c.target.value.toUpperCase())}onKeyDown={c=>{c.key==="Enter"&&(c.preventDefault(),y())}}placeholder="Enter your code"className="w-full rounded-lg border border-line bg-card px-3 py-2 text-sm tracking-wider text-fg placeholder-muted focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand"/>
            <button type="button"onClick={y}disabled={k||!E.trim()}className="shrink-0 rounded-lg border border-brand px-4 py-2 text-sm font-semibold text-brand transition hover:bg-brand/5 disabled:cursor-not-allowed disabled:opacity-40">
              {k?"Checking":"Apply"}
            </button>
          </div>
          {N&&<p className="mt-2 text-xs text-red-500">{N}</p>}
        </div>}
    </div>
    <button type="button"onClick={l}className="w-full rounded-xl bg-brand px-4 py-3.5 font-semibold text-white transition hover:bg-brand-600">
      Continue
    </button>
  </div>}const _t=["First National Bank (FNB)","Absa","Capitec","Nedbank","Discovery","Investec","Standard Bank","Other"],Rt=["Cheque","Savings","Current","Credit","Other"],Bt=["Gauteng","Free State","Eastern Cape","KwaZulu-Natal","Limpopo","Mpumalanga","Northern Cape","North West","Western Cape"];function Mt({form:e,setForm:n,onSubmit:a,submitting:l,onBack:f,total:p,paymentPreference:i,idUpload:u,onIdFile:r,selfieUpload:b,onSelfieFile:A}){function x(c){return w=>n(R=>({...R,[c]:w.target.value}))}const g=i==="eft"||i==="consignment",z=ft(e.idNumber),T=bt(e.preferredCollectionDate),[dn,fn]=m(!1),Wn=e.idNumber.trim().replace(/\s/g,""),Yn=/^\d+$/.test(Wn),Kn=Yn?Wn.length===13?"That ID number doesn't check out, please double-check it.":"Should be 13 digits for an SA ID number, or 6-9 characters for a passport number.":"That doesn't look like a valid SA ID or passport number, please double-check it.",v=se(()=>{const c=new Date;return c.setDate(c.getDate()+1),`${c.getFullYear()}-${String(c.getMonth()+1).padStart(2,"0")}-${String(c.getDate()).padStart(2,"0")}`},[]),j=u.status==="done"&&b.status==="done"&&z.valid&&T&&e.ageConfirmed&&e.termsAccepted&&e.privacyAccepted&&(!g||e.bankName&&e.accountType&&e.branchCode&&e.accountNumber)&&!l;return<form onSubmit={a}className="space-y-3">
      <I onClick={f}label="Back to my offer"/>
      <p className="mb-1 text-sm font-medium text-muted">
        Your offer: <span className="font-bold text-fg">{B(p)}</span>. Almost done, where should we collect from?
      </p>
      <div className="mb-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted">
        <span>🔒 Encrypted &amp; secure</span>
        <span>📋 Second-Hand Goods Act compliant</span>
        <span>💳 Multiple payout options</span>
      </div>
      <F label="Full name"required value={e.fullName}onChange={x("fullName")}/>
      <F label="Cellphone number"required type="tel"value={e.phone}onChange={x("phone")}/>
      <F label="Email"type="email"value={e.email}onChange={x("email")}/>
      <F label="Street address"value={e.address}onChange={x("address")}/>
      <div className="grid grid-cols-2 gap-3">
        <F label="Suburb"value={e.suburb}onChange={x("suburb")}/>
        <F label="City"value={e.city}onChange={x("city")}/>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="mb-1 block text-sm font-medium text-fg">Province</label>
          <select value={e.province}onChange={x("province")}className="w-full rounded-lg border border-line bg-card px-3 py-2 text-sm text-fg focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand">
            <option value="">Select a province</option>
            {Bt.map(c=><option key={c}value={c}>
                {c}
              </option>)}
          </select>
        </div>
        <F label="Postal code"value={e.postalCode}onChange={x("postalCode")}/>
      </div>
      <div>
        <label className="mb-1 block text-sm font-medium text-fg">Is this your residential address?</label>
        <select value={e.residentialAddress?"yes":"no"}onChange={c=>n(w=>({...w,residentialAddress:c.target.value==="yes"}))}className="w-full rounded-lg border border-line bg-card px-3 py-2 text-sm text-fg focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand">
          <option value="yes">Yes</option>
          <option value="no">No</option>
        </select>
        <p className="mt-1 text-xs text-muted">
          We&apos;re legally required to keep your residential address and ID documents on record for 5 years from the
          transaction date.
        </p>
      </div>
      <div>
        <label className="mb-1 block text-sm font-medium text-fg">Preferred collection date</label>
        <input type="date"min={v}value={e.preferredCollectionDate}onChange={x("preferredCollectionDate")}className={`w-full rounded-lg border bg-card px-3 py-2 text-sm text-fg focus:outline-none focus:ring-1 ${e.preferredCollectionDate&&!T?"border-red-300 focus:border-red-400 focus:ring-red-400":"border-line focus:border-brand focus:ring-brand"}`}/>
        <p className="mt-1 text-xs text-muted">
          Our couriers only collect on weekdays, not weekends or SA public holidays.
        </p>
        {e.preferredCollectionDate&&!T&&<p className="mt-1 text-xs text-red-600">
            That date&apos;s a weekend or public holiday, our couriers don&apos;t collect then, please pick a weekday.
          </p>}
      </div>
      <div>
        <label className="mb-1 block text-sm font-medium text-fg">Anything we should know?</label>
        <textarea value={e.notes}onChange={x("notes")}rows={3}className="w-full rounded-lg border border-line bg-card px-3 py-2 text-sm text-fg focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand"/>
      </div>

      {g&&<div className="rounded-lg border border-line bg-canvas p-3">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted">
            Banking details, for your payout
          </p>
          <p className="mb-2 text-xs text-muted">🔒 Used only to pay you for this sale.</p>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-sm font-medium text-fg">
                Bank name <span className="text-red-500">*</span>
              </label>
              <select value={e.bankName}onChange={x("bankName")}className="w-full rounded-lg border border-line bg-card px-3 py-2 text-sm text-fg focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand">
                <option value="">Select a bank</option>
                {_t.map(c=><option key={c}value={c}>
                    {c}
                  </option>)}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-fg">
                Account type <span className="text-red-500">*</span>
              </label>
              <select value={e.accountType}onChange={x("accountType")}className="w-full rounded-lg border border-line bg-card px-3 py-2 text-sm text-fg focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand">
                <option value="">Select a type</option>
                {Rt.map(c=><option key={c}value={c}>
                    {c}
                  </option>)}
              </select>
            </div>
          </div>
          <div className="mt-3 grid grid-cols-2 gap-3">
            <F label="Branch code"required inputMode="numeric"value={e.branchCode}onChange={c=>n(w=>({...w,branchCode:Me(c.target.value)}))}/>
            <F label="Account number"required inputMode="numeric"value={e.accountNumber}onChange={c=>n(w=>({...w,accountNumber:Me(c.target.value)}))}/>
          </div>
        </div>}

      <div className="rounded-lg border border-line bg-canvas p-3">
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted">
          Required by law for buying second-hand goods
        </p>
        <div>
          <label className="mb-1 block text-sm font-medium text-fg">
            ID or passport number <span className="text-red-500">*</span>
          </label>
          <input type="text"required value={e.idNumber}onChange={x("idNumber")}onBlur={()=>fn(!0)}className={`w-full rounded-lg border bg-card px-3 py-2 text-sm text-fg focus:outline-none focus:ring-1 ${dn&&e.idNumber&&!z.valid?"border-red-300 focus:border-red-400 focus:ring-red-400":"border-line focus:border-brand focus:ring-brand"}`}/>
          {dn&&e.idNumber&&!z.valid&&<p className="mt-1 text-xs text-red-600">
              {Kn}
            </p>}
        </div>

        <div className="mt-3">
          <label className="mb-1 block text-sm font-medium text-fg">
            Photo of your ID or passport <span className="text-red-500">*</span>
          </label>
          <p className="mb-1 text-xs text-muted">A clear colour photo, no black-and-white copies, showing your photo and ID number.</p>
          <input type="file"accept="image/*,application/pdf"required={u.status!=="done"}onChange={c=>r(c.target.files?.[0])}className="block w-full text-sm text-muted file:mr-3 file:rounded-lg file:border-0 file:bg-brand file:px-3 file:py-2 file:text-sm file:font-semibold file:text-white hover:file:brightness-95"/>
          {u.status==="uploading"&&<p className="mt-1 text-xs text-muted">Uploading {u.fileName}…</p>}
          {u.status==="done"&&<p className="mt-1 text-xs text-positive">Uploaded, {u.fileName}</p>}
          {u.status==="error"&&<p className="mt-1 text-xs text-red-600">Couldn&apos;t upload that file, {u.error}. Try again.</p>}
        </div>

        <div className="mt-3">
          <label className="mb-1 block text-sm font-medium text-fg">
            A selfie of you <span className="text-red-500">*</span>
          </label>
          <p className="mb-1 text-xs text-muted">
            Face the camera directly with nothing covering your face, so we can confirm it&apos;s really you selling.
          </p>
          <input type="file"accept="image/*"required={b.status!=="done"}onChange={c=>A(c.target.files?.[0])}className="block w-full text-sm text-muted file:mr-3 file:rounded-lg file:border-0 file:bg-brand file:px-3 file:py-2 file:text-sm file:font-semibold file:text-white hover:file:brightness-95"/>
          {b.status==="uploading"&&<p className="mt-1 text-xs text-muted">Uploading {b.fileName}…</p>}
          {b.status==="done"&&<p className="mt-1 text-xs text-positive">Uploaded, {b.fileName}</p>}
          {b.status==="error"&&<p className="mt-1 text-xs text-red-600">Couldn&apos;t upload that file, {b.error}. Try again.</p>}
        </div>

        <p className="mt-3 text-xs text-muted">
          🔒 Your ID and selfie are encrypted and only ever used to verify your identity for this sale, as required
          under the Second-Hand Goods Act.
        </p>

        <label className="mt-3 flex items-start gap-2 text-sm text-fg">
          <input type="checkbox"required checked={e.ageConfirmed}onChange={c=>n(w=>({...w,ageConfirmed:c.target.checked}))}className="mt-0.5 h-4 w-4 rounded border-line text-brand focus:ring-brand"/>
          <span>
            I confirm I am 18 years or older, that this device is legally mine to sell, and that it is not
            currently on any contract.
          </span>
        </label>

        <label className="mt-3 flex items-start gap-2 text-sm text-fg">
          <input type="checkbox"required checked={e.termsAccepted}onChange={c=>n(w=>({...w,termsAccepted:c.target.checked}))}className="mt-0.5 h-4 w-4 rounded border-line text-brand focus:ring-brand"/>
          <span>
            I accept the{" "}
            <a href="https://sellyouriphone.co.za/terms-and-conditions-2/"target="_blank"rel="noreferrer"className="text-brand hover:underline">
              buy-back terms
            </a>{" "}
            and{" "}
            <a href="https://sellyouriphone.co.za/consignment-terms-and-conditions-2/"target="_blank"rel="noreferrer"className="text-brand hover:underline">
              consignment terms
            </a>
            .
          </span>
        </label>

        <label className="mt-3 flex items-start gap-2 text-sm text-fg">
          <input type="checkbox"required checked={e.privacyAccepted}onChange={c=>n(w=>({...w,privacyAccepted:c.target.checked}))}className="mt-0.5 h-4 w-4 rounded border-line text-brand focus:ring-brand"/>
          <span>
            I agree to the{" "}
            <a href="https://epicdeals.co.za/privacy-policy/"target="_blank"rel="noreferrer"className="text-brand hover:underline">
              privacy policy
            </a>
            .
          </span>
        </label>
      </div>

      {}
      <div className="hidden"aria-hidden="true">
        <label>
          Website
          <input tabIndex={-1}autoComplete="off"value={e.website}onChange={x("website")}/>
        </label>
      </div>
      <button type="submit"disabled={!j}className="w-full rounded-xl bg-brand px-4 py-3.5 font-semibold text-white shadow-sm transition hover:brightness-95 hover:shadow-[0_0_20px_color-mix(in srgb, var(--brand) 35%, transparent)] disabled:opacity-60 disabled:hover:shadow-none">
        {l?"Submitting…":"Let's do it!"}
      </button>
    </form>}const Ye=["We'll take it from here.","Kettle's on, we won't be long.","No further haggling required, promise.","Sit back, we've got this one."];function $t({leadId:e,total:n,items:a}){const[l]=m(()=>Ye[Math.floor(Math.random()*Ye.length)]);return<div className="rounded-xl border border-green-200 bg-green-50 p-5 text-center">
      <p className="text-lg font-semibold text-positive">Thanks, we&apos;ve got your details!</p>
      <p className="mt-2 text-sm text-positive">
        Your quoted offer of <span className="font-bold">{B(n)}</span> for {a.length}{" "}
        item{a.length===1?"":"s"} has been submitted. We&apos;ll be in touch
        shortly to arrange collection.
      </p>
      {e&&<p className="mt-3 text-sm text-positive">
        Your reference: <span className="font-mono font-bold tracking-wider">{e}</span>
      </p>}
      <p className="mt-2 text-xs text-positive">{l}</p>
    </div>}function F({label:e,required:n,type:a="text",value:l,onChange:f,...p}){return<div>
      <label className="mb-1 block text-sm font-medium text-fg">
        {e} {n&&<span className="text-red-500">*</span>}
      </label>
      <input type={a}required={n}value={l}onChange={f}className="w-full rounded-lg border border-line bg-card px-3 py-2 text-sm text-fg focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand"{...p}/>
    </div>}function I({onClick:e,label:n}){return<button type="button"onClick={e}className="mb-1 text-sm font-medium text-brand hover:underline">
      ← {n}
    </button>}function Ce({rows:e}){return<div className="space-y-2">
      {Array.from({length:e}).map((n,a)=><div key={a}className="skeleton-shimmer h-14 rounded-xl"/>)}
    </div>}
