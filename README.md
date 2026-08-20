 # Market Pulse

Market Pulse is a static GitHub Pages dashboard for scanning market headlines, public tech signals, and a personal stock/ETF watchlist. It is designed as a quick research surface, not a trading terminal or financial advice.

## Run locally

Use Node.js 20.19+ (the GitHub Actions workflow uses Node.js 22), then run:

```bash
npm install
npm run dev
```

Build the production site with:

```bash
npm run build
npm run preview
```

## Included in the first release

- News flow with market, technology, and investing signals
- Search and selection for the starter stock/ETF universe
- Browser-local watchlist persistence
- Price-action detail panel with compact trend chart
- Normalized watchlist comparison view
- Live Hacker News refresh with fallback content when public endpoints are unavailable
- Responsive layout and reduced-motion support

## Deployment

The workflow in `.github/workflows/blank.yml` builds the Vite `dist` directory and deploys it through GitHub Pages on pushes to `main`. In the repository settings, set **Pages → Build and deployment → Source** to **GitHub Actions**.

The site is static and does not contain API keys. Public endpoints can be rate-limited, delayed, or unavailable, so the interface intentionally keeps a small fallback dataset and labels data as delayed. A future scheduled Action can publish cached JSON if a more reliable data pipeline is needed.

## Data note

Market values shown in the initial interface are an illustrative starter dataset. The public Hacker News refresh is opportunistic and should not be interpreted as real-time or complete market coverage. Verify all information with an authoritative provider before making financial decisions.
