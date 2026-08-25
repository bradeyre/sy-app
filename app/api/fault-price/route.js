import { NextResponse } from "next/server";
import { after } from "next/server";
import { query } from "@/lib/db";
import { getSiteConfig } from "@/lib/siteConfig";
import { readQuoteRef, newQuoteRef, attachQuoteRef } from "@/lib/quoteRef";

export const dynamic = "force-dynamic";

const PINNED_MODEL = process.env.ANTHROPIC_FAULT_MODEL || null;
const PREFERRED_FAMILY = (process.env.ANTHROPIC_FAULT_MODEL_FAMILY || "haiku").toLowerCase();
const TIMEOUT_MS = 8000;
const MODEL_LIST_CACHE_MS = 600 * 1000;
let modelListCache = { fetchedAt: 0, models: [] };

async function fetchWithTimeout(url, options) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(timeout);
  }
}

async function fetchLiveModels(apiKey) {
  const now = Date.now();
  if (modelListCache.models.length > 0 && now - modelListCache.fetchedAt < MODEL_LIST_CACHE_MS) {
    return modelListCache.models;
  }
  const models = [];
  let afterId = null;
  for (let page = 0; page < 5; page++) {
    const url = new URL("https://api.anthropic.com/v1/models");
    url.searchParams.set("limit", "100");
    if (afterId) url.searchParams.set("after_id", afterId);
    let res;
    try {
      res = await fetchWithTimeout(url.toString(), {
        headers: { "x-api-key": apiKey, "anthropic-version": "2023-06-01" },
      });
    } catch (err) {
      console.error("POST /api/fault-price: fetching live model list failed", err);
      break;
    }
    if (!res.ok) {
      console.error(`POST /api/fault-price: /v1/models returned ${res.status}, cannot discover live models this request`);
      break;
    }
    const listBody = await res.json().catch(() => null);
    if (!listBody || !Array.isArray(listBody.data)) break;
    models.push(...listBody.data);
    if (!listBody.has_more || !listBody.last_id) break;
    afterId = listBody.last_id;
  }
  if (models.length > 0) modelListCache = { fetchedAt: now, models };
  return models;
}

export function rankModels(models, alreadyTried = []) {
  const tried = new Set(alreadyTried);
  const candidates = (models || []).filter((m) => m && m.id && (!m.type || m.type === "model") && !tried.has(m.id));
  const byRecency = (a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0);
  const preferred = candidates.filter((m) => m.id.toLowerCase().includes(PREFERRED_FAMILY)).sort(byRecency);
  const rest = candidates.filter((m) => !m.id.toLowerCase().includes(PREFERRED_FAMILY)).sort(byRecency);
  return [...preferred, ...rest].map((m) => m.id);
}

function isModelNotFoundError(status, bodyText) {
  if (status !== 404) return false;
  try {
    return JSON.parse(bodyText)?.error?.type === "not_found_error";
  } catch {
    return /model/i.test(bodyText) && /not.?found/i.test(bodyText);
  }
}

async function tryModel(apiKey, requestBody, modelId) {
  try {
    const res = await fetchWithTimeout("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-api-key": apiKey, "anthropic-version": "2023-06-01" },
      body: JSON.stringify({ ...requestBody, model: modelId }),
    });
    if (res.ok) return { ok: true, res };
    const bodyText = await res.text().catch(() => "");
    return { ok: false, status: res.status, bodyText, notFound: isModelNotFoundError(res.status, bodyText) };
  } catch (err) {
    return { ok: false, err };
  }
}

async function callAnthropicWithFallback(apiKey, requestBody) {
  const tried = [];
  if (PINNED_MODEL) {
    tried.push(PINNED_MODEL);
    const result = await tryModel(apiKey, requestBody, PINNED_MODEL);
    if (result.ok) return result.res;
    if (result.notFound) {
      console.error(`POST /api/fault-price: pinned model "${PINNED_MODEL}" (ANTHROPIC_FAULT_MODEL) appears deprecated or renamed, discovering a live replacement`);
    } else if (result.err) {
      console.error(`POST /api/fault-price: request to Anthropic failed (model: ${PINNED_MODEL})`, result.err);
    } else {
      console.error(`POST /api/fault-price: Anthropic API error (model: ${PINNED_MODEL})`, result.status, result.bodyText);
    }
  }
  const liveModels = await fetchLiveModels(apiKey);
  const candidates = rankModels(liveModels, tried);
  if (candidates.length === 0) {
    console.error("POST /api/fault-price: no live models discovered from Anthropic, cannot price this request");
    return null;
  }
  for (const modelId of candidates) {
    const result = await tryModel(apiKey, requestBody, modelId);
    if (result.ok) {
      if (PINNED_MODEL && modelId !== PINNED_MODEL) {
        console.warn(`POST /api/fault-price: self-healed by discovering and using "${modelId}" after "${PINNED_MODEL}" failed. Consider updating ANTHROPIC_FAULT_MODEL, or leaving it unset to always use the best live model automatically.`);
      }
      return result.res;
    }
    if (result.notFound) {
      console.error(`POST /api/fault-price: discovered model "${modelId}" also unavailable (404 not_found_error), trying next candidate`);
    } else if (result.err) {
      console.error(`POST /api/fault-price: request to Anthropic failed (model: ${modelId})`, result.err);
    } else {
      console.error(`POST /api/fault-price: Anthropic API error (model: ${modelId})`, result.status, result.bodyText);
    }
  }
  console.error(`POST /api/fault-price: every discovered model failed (tried: ${candidates.join(", ")})`);
  return null;
}

export async function POST(request) {
  const existingQuoteRef = readQuoteRef(request);
  const body = await request.json().catch(() => null);
  if (!body || !Array.isArray(body.faults) || body.faults.length === 0) {
    return NextResponse.json({ proposals: [] });
  }
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return NextResponse.json({ proposals: [] });

  const { category, model, capacity, condition, basePrice, faults, appliedFaults } = body;
  const safeBasePrice = Number(basePrice) || 0;
  const safeFaults = faults.filter((f) => f && f.key && f.label).map((f) => ({ key: String(f.key), label: String(f.label) }));
  if (safeFaults.length === 0) return NextResponse.json({ proposals: [] });

  const safeApplied = Array.isArray(appliedFaults)
    ? appliedFaults
        .filter((f) => f && f.label && Number.isFinite(Number(f.deduction)))
        .map((f) => ({ label: String(f.label), deduction: Math.round(Number(f.deduction)) }))
    : [];
  const alreadyDeductedSection =
    safeApplied.length > 0
      ? `

The following faults on this SAME item ALREADY have a confirmed deduction applied separately (do not price these again, they're listed only so you know what's already covered):
${safeApplied.map((f) => `- ${f.label}: R${f.deduction} already deducted`).join("\n")}`
      : "";

  const prompt = `You price buyback deductions for Epic Deals, a second-hand tech reseller in South Africa. A customer trading in a ${category} (${model}${capacity && capacity !== "N/A" ? `, ${capacity}` : ""}, condition: ${condition}) reported the following faults, none of which have a confirmed deduction yet:
${safeFaults.map((f) => `- ${f.label}`).join("\n")}${alreadyDeductedSection}

The item's trade-in value before any deduction is R${safeBasePrice}. For reference, Epic Deals already deducts R249 for an iPhone with battery health under 80%, a fault that's cheap and quick to address. Propose a fair rand (ZAR) deduction for each fault above, reflecting realistic South African repair or part-replacement cost for that specific fault on that specific device, while leaving Epic Deals a reasonable resale margin. Never propose a deduction greater than R${safeBasePrice} (the item's full value).

CRITICAL - avoid double-charging: some faults above may describe the SAME physical damage as each other, or the same damage already listed as "already deducted" above (this commonly happens with a free-text entry labelled "Customer-described issue: ..." that restates a checkbox fault in the customer's own words, e.g. a checkbox for "Cracked back glass" plus a free-text note saying "back is cracked"). If a fault's damage is already covered by another fault in this same list, or by an already-deducted fault above, propose R0 for it (or only the cost of any genuinely NEW damage it describes beyond what's already covered), and say so briefly in your reasoning. Only propose a full-price deduction when the damage is genuinely not covered anywhere else.

DECLINING AN ITEM: most faults, even serious ones, are still worth buying, propose a deduction reflecting realistic repair cost, up to the full item value if needed. Only set "decline" to true for a fault when the damage described means the device has no realistic path to repair or resale as a working unit, for example: the casing or frame is shattered, crushed, or in multiple pieces; it was run over by a vehicle, dropped from height onto concrete with structural damage, or otherwise destroyed; it is bent, warped, or broken apart. Do NOT decline for damage that is merely expensive to fix or purely cosmetic: a cracked screen alone, a dead or swollen battery, a broken port or button, water exposure where the device still powers on, or heavy cosmetic wear are all still buyable and should get a normal deduction, not a decline. When declining a fault, still propose a "deduction" equal to the full item value (so the numbers stay consistent) and explain briefly why in "reasoning".

Respond with ONLY strict JSON in this exact shape, no other text:
{"proposals":[{"label":"<exact label from the list above>","deduction":<integer rand amount>,"reasoning":"<one short sentence>","decline":<true or false>}]}`;

  const res = await callAnthropicWithFallback(apiKey, { max_tokens: 512, messages: [{ role: "user", content: prompt }] });
  if (!res) return NextResponse.json({ proposals: [] });

  try {
    const jsonMatch = ((await res.json())?.content?.[0]?.text || "").match(/\{[\s\S]*\}/);
    if (!jsonMatch) return NextResponse.json({ proposals: [] });
    const parsed = JSON.parse(jsonMatch[0]);
    const proposals = (Array.isArray(parsed.proposals) ? parsed.proposals : [])
      .map((p) => {
        const fault = safeFaults.find((f) => f.label === p.label);
        const deduction = Math.round(Number(p.deduction));
        if (!fault || !Number.isFinite(deduction) || deduction < 0) return null;
        return {
          key: fault.key,
          label: fault.label,
          deduction: Math.min(deduction, safeBasePrice),
          reasoning: String(p.reasoning || "").slice(0, 300),
          decline: p.decline === true,
        };
      })
      .filter(Boolean);

    const alreadyDeductedTotal = safeApplied.reduce((sum, f) => sum + f.deduction, 0);
    const remainingBudget = Math.max(0, safeBasePrice - alreadyDeductedTotal);
    const proposalsTotal = proposals.reduce((sum, p) => sum + p.deduction, 0);
    if (proposalsTotal > remainingBudget && proposalsTotal > 0) {
      const scale = remainingBudget / proposalsTotal;
      for (const p of proposals) p.deduction = Math.round(p.deduction * scale);
    }

    try {
      const settingsRes = await query("select max_deduction_pct from calc.public_settings limit 1");
      const maxPctMap = settingsRes.rows?.[0]?.max_deduction_pct || {};
      const maxPct = maxPctMap[category];
      if (maxPct != null && safeBasePrice > 0) {
        const maxDeduction = Math.round((safeBasePrice * maxPct) / 100);
        const aiTotal = proposals.reduce((s, p) => s + p.deduction, 0);
        if (aiTotal > maxDeduction && aiTotal > 0) {
          const capScale = maxDeduction / aiTotal;
          for (const p of proposals) p.deduction = Math.round(p.deduction * capScale);
          console.log(`POST /api/fault-price: capped ${category} AI deductions from R${aiTotal} to R${maxDeduction} (${maxPct}% of R${safeBasePrice})`);
        }
      }
    } catch (capErr) {
      console.error("POST /api/fault-price: max deduction cap query failed, proceeding uncapped", capErr);
    }

    let quoteRef = existingQuoteRef;
    if (proposals.length > 0) {
      if (!quoteRef) {
        let prefix = "SY";
        try {
          const site = await getSiteConfig({
            host: request.headers.get("host"),
            overrideKey: new URL(request.url).searchParams.get("site"),
          });
          prefix = site.airtableSource || "SY";
        } catch (refErr) {
          console.error("POST /api/fault-price: could not resolve site for quote reference, using generic prefix", refErr);
        }
        quoteRef = newQuoteRef(prefix);
      }
      const proposalsForLog = proposals;
      const refForLog = quoteRef;
      after(() =>
        query(
          `insert into calc.ai_fault_proposals
           (category, fault_key, fault_label, model, capacity, condition, item_base_price, proposed_deduction, reasoning, quote_ref, declined)
           select $1, p.key, p.label, $2, $3, $4, $5, p.deduction, p.reasoning, $7, p.decline
           from jsonb_to_recordset($6::jsonb) as p(key text, label text, deduction numeric, reasoning text, decline boolean)`,
          [category, model, capacity, condition, safeBasePrice, JSON.stringify(proposalsForLog), refForLog]
        ).catch((err) => console.error("POST /api/fault-price: audit log insert failed", err))
      );
    }

    const response = NextResponse.json({ proposals });
    return quoteRef ? attachQuoteRef(response, quoteRef) : response;
  } catch (err) {
    console.error("POST /api/fault-price: could not parse Anthropic response", err);
    return NextResponse.json({ proposals: [] });
  }
}
