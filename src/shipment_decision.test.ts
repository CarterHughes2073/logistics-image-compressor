import assert from "node:assert/strict";
import test from "node:test";
import { compressProof } from "./logistics_service.ts";

test("an exception without proof stays actionable and does not call the image service", async () => {
  const result = await compressProof({ shipmentId: "SHP-7", event: "exception", exceptionNote: "Dock closed" });
  assert.deepEqual(result, { shipmentId: "SHP-7", state: "exception", compressedImage: null });
});
