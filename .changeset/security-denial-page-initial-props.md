---
'@jperezmart/next-casl': patch
---

`withDenialPage(App)` keeps the custom App's `getInitialProps`. It used to return a component without it, so Next.js silently stopped running an App-level gate placed there (a login redirect, a tenant check), and pages that relied on it were served to anyone.
