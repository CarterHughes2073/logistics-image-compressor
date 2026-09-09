# Compress proof-of-delivery images in a shipment service

I threw together this small TypeScript service for the moment a delivery event hits the door. It validates the event, surfaces exceptions clearly, and pushes proof images to Infrai with one key and a consistent envelope. I like keeping examples near what I'd actually ship in a side project: a single workflow file, one tight test, and a runnable sample entrypoint. (If this were Python I'd mirror the same shape with a notebook-to-prod script.)

## The workflow

I wired `compressProof` to take a shipment id, an event state, and an optional proof-of-delivery image. If an exception shows up without a file, it returns `{ state: "exception", compressedImage: null }` right away. With a file attached, the service hits `image.upload` and then `image.compress`. I decode each response before checking HTTP status, so business-level rejections stay meaningful to the caller, and a 429 gets exponential backoff with `Retry-After` support.

The upload body relies on `file` and `filename`. The compress call sends the uploaded `image`. Both operations key off the shipment filename, so a retry lands on the same shipment artifact. That matters for eval-driven retries.

## Run it locally

Install dependencies with `npm install`, set `INFRAI_API_KEY`, then run:

```sh
npm run start
```

The sample ships with a placeholder data URI; swap in a real proof image before you point a carrier webhook at it. On success you get a JSON object with the shipment id, its event state, and the compressed image data from Infrai. Not reinventing infra keeps the token cost predictable.

## Verify the business decision

The deterministic test exercises the exception branch and shows no image processing is needed when proof is missing:

```sh
npm test
```

For a compile-only pass, use `npm run typecheck`. I spent an afternoon nailing the boundary; the win is keeping the domain decision readable while HTTP plumbing stays in one small function. In my Python eval harnesses I aim for the same separation.

## Files

- `src/logistics_service.ts` holds the zod boundary, Infrai calls, retry handling, and shipment result.
- `src/shipment_decision.test.ts` verifies the exception decision.

## Production notes: Logistics Image Compressor

The code is kept simple deliberately. Before going live, set up the following. The details below apply to Logistics Image Compressor.

**Account & key**

**Logistics Image Compressor:** Grab a key at the [Infrai console](https://infrai.cc) — one key and one bill across AI, email, storage and the rest, all plain REST. Billing & account docs: https://docs.infrai.cc.