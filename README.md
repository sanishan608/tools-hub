# Nishan Expert Tools Web Edition

Premium, responsive, single-page collection of browser tools built with HTML, CSS, and JavaScript. No build step or backend required for most tools.

## Tools included
- Random number generator (Web Crypto)
- Password generator (Web Crypto)
- Arithmetic calculator (restricted parser; does not use `eval`)
- Text tools: uppercase, lowercase, reverse, count
- Public IP information via `ipwho.is` (requires internet; third-party API receives lookup request)
- QR scanner for uploaded images using `jsQR` from jsDelivr CDN
- Base64 encode/decode (UTF-8)
- URL component encode/decode

## Files
- `index.html` — page structure
- `styles.css` — minimal responsive UI
- `script.js` — tool functionality

## Deploy on GitHub Pages
1. Create a public GitHub repository, for example `nishan-expert-tools`.
2. Upload `index.html`, `styles.css`, and `script.js` to the repository root.
3. Open **Settings → Pages**.
4. Under **Build and deployment**, choose **Deploy from a branch**.
5. Select branch `main` and folder `/(root)`, then click **Save**.
6. Wait a few minutes. The site URL will look like `https://sanishan608.github.io/tools-hub/`.

## Notes
- QR scanning uses a JavaScript library from a CDN, so internet access is required for the first load.
- IP lookup sends the entered IP (or public-IP lookup request) to the third-party `ipwho.is` service.
- GitHub Pages is static hosting. Support/bug reports are not stored on a server, and no secret keys should be placed in this repository.
- Test with current browsers and do not use the site as the only means of making security-critical decisions.
