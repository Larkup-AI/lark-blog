import { NextResponse } from "next/server";
import { getSession } from "@/lib/admin";
import { resolveStorageAdapter } from "@/lib/providers/storage";
import { getActiveWorkspaceId } from "@/lib/workspace";

/**
 * Presigned upload endpoint for the editor. Returns a direct-to-bucket PUT
 * target when the active storage provider is S3-compatible (configured via the
 * setup wizard or env). For UploadThing / Vercel Blob / local the client falls
 * back to its own hook, signalled by `{ strategy: "uploadthing" }`.
 */
export async function POST(req: Request) {
  const session = await getSession();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: { filename?: string; contentType?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  const filename = (body.filename || "file").toString();
  const contentType = (body.contentType || "application/octet-stream").toString();

  const adapter = await resolveStorageAdapter();
  if (!adapter) {
    // Non-presigned provider — let the client use its UploadThing hook.
    return NextResponse.json({ strategy: "uploadthing" });
  }

  try {
    const workspaceId = (await getActiveWorkspaceId()) || "shared";
    const upload = await adapter.createUpload({
      filename,
      contentType,
      prefix: workspaceId,
    });
    return NextResponse.json(upload);
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message || "Could not sign upload" },
      { status: 500 },
    );
  }
}
