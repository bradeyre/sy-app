import { headers } from "next/headers";
import { getSiteConfig } from "@/lib/siteConfig";
import { renderTermsHtml } from "@/lib/terms";

async function resolveSite(searchParams) {
  const h = await headers();
  const { site } = await searchParams;
  return getSiteConfig({ host: h.get("host"), overrideKey: site });
}

export async function generateMetadata({ searchParams }) {
  const site = await resolveSite(searchParams);
  return {
    title: `Terms and Conditions | ${site.siteName}`,
    description: `Buyback and consignment terms for ${site.siteName}.`,
    robots: { index: false, follow: true },
    alternates: { canonical: `https://${site.domain}/terms-and-conditions` },
  };
}

/**
 * Standalone terms page, linked from the calculator's accept checkbox so a
 * seller on any tenant reads that tenant's terms. The storefronts show the
 * same text on their own domains via /api/terms; this copy is noindex with
 * a canonical to the storefront so the two never compete in search.
 */
export default async function TermsPage({ searchParams }) {
  const site = await resolveSite(searchParams);
  return (
    <main className="min-h-dvh bg-page px-4 py-10 text-fg sm:py-16">
      <article
        className="mx-auto max-w-3xl rounded-2xl border border-line bg-card px-5 py-8 sm:px-10 sm:py-12
          [&_h2]:mb-4 [&_h2]:mt-12 [&_h2]:text-2xl [&_h2]:font-bold [&_h2]:text-brand sm:[&_h2]:text-3xl
          [&_h3]:mb-2 [&_h3]:text-lg [&_h3]:font-semibold
          [&_p]:mb-2 [&_p]:leading-relaxed [&_strong]:font-semibold
          [&_.terms-clause]:mt-6 [&_.terms-intro]:text-lg [&_.terms-intro]:text-muted
          [&_.terms-contact]:mt-12 [&_.terms-contact]:border-t [&_.terms-contact]:border-line [&_.terms-contact]:pt-6 [&_.terms-contact]:text-muted
          [&_a]:text-brand [&_a:hover]:underline"
      >
        <h1 className="text-3xl font-bold sm:text-4xl">Terms and Conditions</h1>
        <div className="mt-3" dangerouslySetInnerHTML={{ __html: renderTermsHtml(site) }} />
      </article>
    </main>
  );
}
