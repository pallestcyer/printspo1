// To fix webpack error with puppeteer
1. Add 'use server' at top of app/api/scrape/route.ts
2. Move puppeteer to peerDependencies in package.json
