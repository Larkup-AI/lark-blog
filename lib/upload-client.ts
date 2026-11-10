/**
 * Client-side upload helper used by the editor.
 *
 * It first asks `/api/upload` for a presigned target. If the active storage
 * provider is S3-compatible, it PUTs the file straight to the bucket and
 * returns the public URL. Otherwise it returns `null`, signalling the caller to
 * fall back to its UploadThing hook (so the single code path supports every
 * provider the setup wizard can configure).
 */
export async function uploadViaStorage(file: File): Promise<string | null> {
  let res: Response;
  try {
    res = await fetch("/api/upload", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ filename: file.name, contentType: file.type }),
    });
  } catch {
    return null; // network issue → let caller fall back
  }

  if (!res.ok) return null;
  const data = await res.json();

  // Non-presigned provider → caller should use UploadThing.
  if (!data || data.strategy !== "presigned-put") return null;

  const put = await fetch(data.uploadUrl, {
    method: "PUT",
    headers: data.headers || { "Content-Type": file.type },
    body: file,
  });
  if (!put.ok) throw new Error("Upload failed");
  return data.publicUrl as string;
}
