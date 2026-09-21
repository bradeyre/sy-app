import { NextResponse } from "next/server";
import { createSignedUploadUrl } from "@/lib/storage";
import { ALLOWED_UPLOAD_EXT } from "@/lib/mimeForUpload";

export const dynamic = "force-dynamic";

export async function POST(request) {
  try {
    const rawExt = ((await request.json().catch(() => ({}))).fileExt || "jpg")
      .toLowerCase()
      .replace(/[^a-z0-9]/g, "");
    const ext = ALLOWED_UPLOAD_EXT.has(rawExt) ? rawExt : "jpg";
    const path = `${crypto.randomUUID()}.${ext}`;
    const { uploadUrl } = await createSignedUploadUrl(path);
    return NextResponse.json({ uploadUrl, path });
  } catch (err) {
    console.error("POST /api/upload-url failed", err);
    return NextResponse.json({ error: "Could not prepare upload" }, { status: 500 });
  }
}
