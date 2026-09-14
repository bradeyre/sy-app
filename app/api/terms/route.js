import { NextResponse } from "next/server";
import { getSiteConfig } from "@/lib/siteConfig";
import { renderTermsHtml, TERMS_UPDATED } from "@/lib/terms";

export const dynamic = "force-dynamic";

/**
 * The tenant's terms as an HTML fragment, for the storefronts'
 * /terms-and-conditions pages to render inside their own layout.
 * See lib/terms.js for why there is only one copy.
 */
export async function GET(request) {
  try {
    const site = await getSiteConfig({
      host: request.headers.get("host"),
      overrideKey: new URL(request.url).searchParams.get("site"),
    });
    return NextResponse.json(
      { site: site.key, siteName: site.siteName, updated: TERMS_UPDATED, html: renderTermsHtml(site) },
      { headers: { "Cache-Control": "public, s-maxage=300, stale-while-revalidate=86400" } }
    );
  } catch (err) {
    console.error("GET /api/terms failed", err);
    return NextResponse.json({ error: "Could not load terms" }, { status: 500 });
  }
}
