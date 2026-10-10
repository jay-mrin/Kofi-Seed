// Run once after retiring Posts. Only the dedicated post-images bucket is touched.
const base = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!base || !key) throw new Error("Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.");
async function request(path, method, body) {
  const response = await fetch(`${base.replace(/\/$/, "")}/storage/v1/${path}`, {
    method,
    headers: { apikey: key, Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  if (!response.ok) throw new Error(`Storage cleanup failed (${response.status}).`);
  return response.json();
}
await request("bucket/post-images/empty", "POST", {});
await request("bucket/post-images", "DELETE");
console.log("Removed the post-images bucket. Order and payment data were not accessed.");
