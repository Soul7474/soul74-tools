# SMARTIN TOOLS

SMARTIN TOOLS is a responsive React, TypeScript, and Vite workspace for practical networking and security utilities.

## Requirements

- Node.js 20 or newer (22+ recommended)
- npm

## Start locally

```sh
npm install
npm run dev
```

## Production build

```sh
npm run build
npm run preview
```

## Included tools

- **Network lab:** IPv4/CIDR subnet calculator with network, subnet mask, wildcard, broadcast, host range, and address counts.
- **Password lab:** configurable password generation using the browser's Web Crypto API. Password generation happens locally and requires a secure browser context.
- **Hash lab:** SHA-1 (legacy), SHA-256, SHA-384, and SHA-512 digests for text and files up to 50 MiB, plus comparison and heuristic format hints.
- **Encoding lab:** local UTF-8/Base64/hex/binary/URL/HTML/JSON transformations and ordered operation recipes.
- **JWT inspector:** local compact-token structure and claim display. It does not verify signatures or token authenticity.
- **Text & Regex lab:** Unicode-aware text metrics, on-demand transforms, literal search, worker-isolated Regex with time/input limits, line diff, syntactic indicator extraction, and local log filtering.
- **Timestamp lab:** explicit-seconds/milliseconds Unix conversion, local datetime and ISO handling, duration comparison, IANA time-zone formatting, epoch conversion, and a real system clock.

The application does not configure Cloudflare, change DNS settings, send tool inputs to a server, or persist submitted tool data. Files are hashed in memory and are not uploaded. The JWT inspector is read-only; do not paste session tokens or real credentials. Digesting a file larger than 50 MiB is not supported in this version. Text analysis is capped; regex execution runs in a local worker with a timeout but cannot be guaranteed immune to ReDoS. Local `datetime-local` values have no explicit timezone and may be ambiguous around daylight-saving transitions.
