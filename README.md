# Codex Analytics | Stock Ticker V2

Static site (no build step, no server). Open `index.html` or host it with GitHub Pages.

Files
- index.html: screener, scoring, 3-level sorting
- chart.html: candlestick window (1D, 4H, 2H, 1H, 15 Min) with volume, RSI, MACD, Keltner, support and resistance
- portfolio.html: Watch List, paper trades with reports, Blacklist, JSON/CSV backup
- diagnostics.html: offline checks, live API checks, review of the last screener run
- core.js: API calls, usage tracking, indicators, scoring
- All files live in one folder, next to index.html. Logos are included.
- Business Quant supplies the stock list, net income filter and daily prices (20 stocks per call). Twelve Data supplies 4H candles and chart timeframes.

API keys are typed into Settings and stay in your browser. Never commit them.
Some browsers block calls from a page opened as a file; if so, use GitHub Pages or run `python -m http.server` in this folder.
