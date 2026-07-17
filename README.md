# Hairlist Widget

A **pluggable, zero-dependency web widget** that lets any website surface a
salon's hairstylist information *in full* and give customers **easy, one-click
booking**.

It works with any salon on the [hairlist.ch](https://www.hairlist.ch) / Belbo
platform (URL pattern `https://<shop>.hairlist.ch/termin`). The complete online
booking page — every service, price, stylist, availability slot and the booking
flow itself — is loaded **live** inside a modal or inline frame in the visitor's
own browser. An optional info panel (opening hours, team, service menu, contact)
can be rendered from a small JSON file.

- **One `<script>` tag.** No build step, no framework, no dependencies.
- **Drop into any site** — plain HTML, WordPress, Squarespace, Wix, Webflow, …
- **The shop key is enterable per shop** — point the widget at any salon by its key.
- **Accessible** — focus trap, `Esc` to close, ARIA dialog, restores focus.
- **Responsive & theme-aware** — light/dark, mobile-friendly.
- **~15 KB, self-contained** — styles and icons are injected by the script.

---

## Quick start

Add one script tag. The floating **“Termin buchen”** button appears; clicking it
opens the full booking flow in a modal.

```html
<script src="https://your-cdn.example/hairlist-widget.js"
        data-shop="steiner"
        data-lang="de"
        data-color="#111827"></script>
```

`data-shop="steiner"` targets `https://steiner.hairlist.ch/termin`.

### Inline embed

Render the booking directly inside a container instead of a floating button:

```html
<div id="hairlist-booking"></div>

<script src="https://your-cdn.example/hairlist-widget.js"
        data-shop="steiner"
        data-mode="inline"
        data-mount="#hairlist-booking"
        data-height="640px"></script>
```

### Programmatic use

```html
<script src="hairlist-widget.js" data-auto="false"></script>
<script>
  const widget = HairlistWidget.init({
    shop: 'steiner',
    mode: 'modal',
    color: '#b8860b',
    lang: 'de',
    info: 'salon.json'   // optional info panel
  });

  // Open/close the booking modal from your own UI:
  document.querySelector('#book-now').onclick = () => widget.open();
</script>
```

---

## The shop key

Each salon is identified by its **shop key** — its hairlist subdomain. Set it
with `data-shop` (or `data-salon`, an alias), or `shop:` in code. This is what
makes the widget point at *a specific shop*:

| Shop key        | Booking target                          |
| --------------- | --------------------------------------- |
| `steiner`       | `https://steiner.hairlist.ch/termin`    |
| `my-salon`      | `https://my-salon.hairlist.ch/termin`   |

You can also pass a full custom URL with `data-url` (overrides the shop key), or
a full custom host in `data-shop` (e.g. `data-shop="booking.my-salon.ch"`).

If your shop uses a separate **booking key / API key**, set `data-key="…"` — it
is appended to the booking URL as `?key=…` (change the parameter name with
`data-key-param` if needed). The [demo](demo/index.html) includes an input field
so the key can be typed in and applied live.

---

## Options

Every option is settable as a `data-*` attribute on the script tag **or** as a
key in `HairlistWidget.init({...})`.

| Option           | `data-*`             | Default          | Description |
| ---------------- | -------------------- | ---------------- | ----------- |
| `shop` / `salon` | `data-shop`          | —                | Shop key (hairlist subdomain). **Required** unless `url` is set. |
| `key`            | `data-key`           | —                | Optional booking/API key for the shop, appended as `?key=`. |
| `keyParam`       | `data-key-param`     | `key`            | Query-parameter name used for `key`. |
| `url`            | `data-url`           | —                | Explicit full booking URL (overrides `shop`). |
| `path`           | `data-path`          | `/termin`        | Booking path appended to the shop host. |
| `mode`           | `data-mode`          | `modal`          | `modal` (floating button + dialog), `inline` (embed in a container), or `button` (your own button target). |
| `mount`          | `data-mount`         | —                | CSS selector for the container (`inline`) or button host (`button`). |
| `lang`           | `data-lang`          | `de`             | UI language: `de`, `fr`, `it`, `en`. Also passed to the booking page as `?lang=`. |
| `color`          | `data-color`         | `#111827`        | Accent color for buttons and highlights. |
| `label`          | `data-label`         | localized “Book” | Text on the launcher button. |
| `title`          | `data-title`         | shop name        | Heading shown in the modal / inline header. |
| `position`       | `data-position`      | `bottom-right`   | Floating button position: `bottom-right`, `bottom-left`, `top-right`, `top-left`, or `inline`. |
| `height`         | `data-height`        | `640px`          | Iframe height in `inline` mode. |
| `info`           | `data-info`          | —                | URL to a salon-info JSON (or an object in code) for the info panel. |
| `showInfoPanel`  | `data-show-info-panel` | `true`         | Show the info panel next to the booking frame. |
| `autoOpen`       | `data-auto-open`     | `false`          | Open the modal automatically on load. |
| `passLang`       | `data-pass-lang`     | `true`           | Append `?lang=` to the booking URL. |
| `auto`           | `data-auto`          | `true`           | Auto-init from the script tag. Set `false` to init manually. |

---

## JavaScript API

```js
HairlistWidget.init(config)      // create + render an instance, returns it
HairlistWidget.render(sel, cfg)  // shorthand for an inline embed into `sel`
HairlistWidget.open()            // open the first auto-initialized modal
HairlistWidget.close()           // close it

// Instance methods (returned by init):
widget.open()
widget.close()
widget.destroy()                 // remove the widget from the page
widget.bookingUrl()              // the resolved booking URL
```

---

## The optional info panel

Booking availability is always live from hairlist. The info panel is an optional
static summary (opening hours, team, service menu, contact) you provide as JSON.
See [`salon.example.json`](salon.example.json) for the full schema — copy it,
fill in your salon's real data, host it, and point `data-info` at it:

```html
<script src="hairlist-widget.js"
        data-shop="steiner"
        data-info="/salon.json"></script>
```

---

## How it works & limitations

The booking page is loaded in an **iframe in the visitor's browser**, so it uses
their own session — there's no server, no scraping, and no CORS/API key needed
just to show it. This is why the widget can embed the *full* booking experience.

Some hairlist pages may send `X-Frame-Options` / `Content-Security-Policy`
headers that forbid embedding in a frame. The widget detects when the frame
fails to load within a few seconds and automatically shows an **“Open the
booking page in a new tab”** fallback, so customers can always reach the booking.
An “open in new tab” affordance is present at all times regardless.

---

## Files

| File                     | Purpose |
| ------------------------ | ------- |
| `hairlist-widget.js`     | The widget (drop-in, self-contained). |
| `demo/index.html`        | Interactive demo — enter a shop key and preview. |
| `salon.example.json`     | Template for the optional info panel. |

## Development / preview

No build required. Serve the folder and open the demo:

```bash
python3 -m http.server 8000
# then open http://localhost:8000/demo/
```

## License

MIT
