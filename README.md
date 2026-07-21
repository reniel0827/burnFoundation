# Firefighters of Southern Nevada Burn Foundation

Homepage for the Firefighters of Southern Nevada Burn Foundation — a static site
with an ember/charcoal theme, GSAP ScrollTrigger motion, and a light/dark toggle.

## Running locally

No build step. Serve the folder over HTTP (the page uses `fetch`-free vanilla JS,
but opening it via `file://` will break the Google Fonts and CDN requests):

```bash
python -m http.server 5173
# then open http://127.0.0.1:5173
```

## Structure

```
index.html            markup and content
css/styles.css        all styling; the light theme is an override layer at the end
js/main.js            GSAP timelines, ScrollTrigger, ember canvas, theme toggle
assets/images/        logo, event poster, program photography
```

## Notes

- **Dark is the default** and is not persisted — every load starts dark.
  The toggle applies `data-theme="light"` to `<html>` for the current view only.
- **Program card photos** are wired by filename in `index.html`
  (`after-the-fire-is-out.png`, `burn-survivor-initiative.png`, `save-a-life.png`,
  `fill-the-firetruck.png`). Any missing image is hidden by a JS `error` handler
  so the card falls back to its ember gradient rather than a broken-image icon.
- **Stat counters** read `data-count`, and `data-suffix="+"` appends a plus.
  A `data-count` of `0` renders as an em dash instead of a misleading zero.
- **The contact form is front-end only.** It validates and resets but does not
  send; wire it to an email service (Formspree, Netlify Forms, etc.) before launch.

## Security

Applied in the page itself:

- **Subresource Integrity** on both GSAP CDN scripts. Hashes are pinned to
  3.12.5 — **recompute them if you bump the version** or the scripts will be
  blocked.
- **Content-Security-Policy** meta tag restricting script/style/font/img
  origins. `'unsafe-inline'` is granted to `style-src` only, because GSAP
  animates by writing to `element.style`.
- `referrer` policy and `rel="noopener noreferrer"` on outbound links.

Still required **at the host** (a `<meta>` CSP cannot set these):

```
X-Frame-Options: DENY                 # or CSP frame-ancestors 'none'
X-Content-Type-Options: nosniff
Strict-Transport-Security: max-age=31536000; includeSubDomains
```

Also before launch:

- Do **not** upload the `.git/` directory to the web root — it exposes full
  source history. Deploy the tracked files only.
- The contact form is client-side only. When wiring it to a backend, validate
  and escape server-side (never trust the browser), and add spam protection.

## Credits

GSAP + ScrollTrigger via CDN. Fonts: Bebas Neue, Oswald, Inter.
