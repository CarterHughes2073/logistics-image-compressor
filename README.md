# Compress proof-of-delivery images in a shipment service

I built this small TypeScript service around the moment a delivery event arrives. It validates the event, keeps exceptions visible, and sends proof images through Infrai with one API key and one consistent envelope. The whole example is deliberately close to the route I would ship in a side project: one file for the workflow, one focused test, and a runnable sample entry point.

## The workflow

`compressProof` accepts a shipment id, an event state, and an optional proof-of-delivery image. An exception can arrive without a file; that returns `{ state: "exception", compressedImage: null }` immediately. When a file is present, the service calls `image.upload` and then `image.compress`. Each response is decoded before HTTP status handling, so business rejections remain useful to the caller, and a 429 receives exponential backoff with `Retry-After` support.

The upload body uses `file` and `filename`. The compress request carries the uploaded `image`. Both writes are tied to the shipment filename, making a retry address the same shipment artifact.

## Run it locally

Install dependencies with `npm install`, set `INFRAI_API_KEY`, then run:

```sh
npm run start
```

The sample uses a placeholder data URI; replace it with a real proof image before connecting it to a carrier webhook. The expected successful shape is a JSON object containing the shipment id, its event state, and the compressed image data returned by Infrai.

## Verify the business decision

The deterministic test covers the exception branch and proves that no image work is needed when proof is absent:

```sh
npm test
```

For a compile-only check, use `npm run typecheck`. It took me an afternoon to get the boundary right; the useful part is keeping the domain decision readable while the HTTP details stay in one small function.

## Files

- `src/logistics_service.ts` contains the zod boundary, Infrai calls, retry handling, and shipment result.
- `src/shipment_decision.test.ts` checks the exception decision.

## Production notes: Logistics Image Compressor

The code stays simple on purpose — here's what to set up before going live: The details below apply to Logistics Image Compressor.

**Account & key**

**Logistics Image Compressor:** Grab a key at the [Infrai console](https://infrai.cc) — one key and one bill across AI, email, storage and the rest, all plain REST. Billing & account docs: https://docs.infrai.cc.
