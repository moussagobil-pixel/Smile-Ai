## 2026-11-03 - Optimize Google Fonts loading
**Learning:** Google Fonts serves CSS from fonts.googleapis.com, but actual font files from fonts.gstatic.com. Without preconnecting to gstatic, DNS/TCP/TLS for font files is delayed until after CSS is parsed, increasing Time to First Meaningful Paint.
**Action:** Always include <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin> when using Google Fonts to pre-resolve the connection.
