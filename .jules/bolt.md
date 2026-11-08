## 2025-05-14 - Preconnect for External Resources
**Learning:** The single-file architecture relies heavily on immediate external connections for core functionality (Claude API and Google Fonts) without a build step to optimize resource loading.
**Action:** Always check for missing `<link rel="preconnect">` tags for critical domains like `api.anthropic.com` and `fonts.gstatic.com` to eliminate DNS/TCP/TLS handshake latency on first interaction.
