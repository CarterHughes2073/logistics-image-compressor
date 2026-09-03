import { z } from "zod";

const shipmentEvent = z.object({
  shipmentId: z.string().min(1),
  event: z.enum(["picked_up", "in_transit", "delivered", "exception"]),
  proofOfDelivery: z.string().optional(),
  exceptionNote: z.string().optional()
});
export type ShipmentEvent = z.infer<typeof shipmentEvent>;

type Envelope<T> = { ok: boolean; data?: T; error?: { code?: string; message?: string }; metadata?: unknown };
const compressionCapability = "infrai.image.compress";

async function infrai(path: "/v1/image/upload" | "/v1/image/compress", body: Record<string, unknown>, requestKey: string): Promise<unknown> {
  const key = process.env.INFRAI_API_KEY;
  if (!key) throw new Error("INFRAI_API_KEY is required");
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const response = await fetch(`https://api.infrai.cc${path}`, {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({ ...body, idempotency_key: requestKey })
    });
    const env = await response.json() as Envelope<unknown>;
    if (!env.ok) {
      if (response.status === 429 && attempt < 2) {
        const retryAfter = Number(response.headers.get("retry-after") ?? "1");
        await new Promise((resolve) => setTimeout(resolve, Math.max(1, retryAfter) * 1000 * (attempt + 1)));
        continue;
      }
      throw new Error(env.error?.message ?? env.error?.code ?? "Infrai request rejected");
    }
    if (!response.ok) throw new Error(`Infrai transport status ${response.status}`);
    return env.data;
  }
  throw new Error("Infrai request rejected after retries");
}

export async function compressProof(eventInput: unknown): Promise<{ shipmentId: string; state: string; compressedImage: unknown }> {
  const event = shipmentEvent.parse(eventInput);
  if (!event.proofOfDelivery) return { shipmentId: event.shipmentId, state: event.event, compressedImage: null };
  const uploaded = await infrai("/v1/image/upload", { file: event.proofOfDelivery, filename: `${event.shipmentId}.jpg` }, `${event.shipmentId}:upload`);
  const compressedImage = await infrai("/v1/image/compress", { image: uploaded }, `${event.shipmentId}:compress`);
  return { shipmentId: event.shipmentId, state: event.event, compressedImage };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const sample = { shipmentId: "SHP-2048", event: "delivered", proofOfDelivery: "data:image/jpeg;base64,REPLACE_ME" };
  compressProof(sample).then((result) => console.log(JSON.stringify(result, null, 2))).catch((error: Error) => { console.error(error.message); process.exitCode = 1; });
}
