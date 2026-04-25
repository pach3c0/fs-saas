# Building with the CliqueZoom design system

A short reference for designers and developers shipping in this product.

## The three surfaces

CliqueZoom is **not one app** — it's three. Every screen, every component, belongs to exactly one of:

| Surface | URL pattern | Aesthetic |
|---|---|---|
| **A · Marketing** | `cliquezoom.com.br`, `/home`, `/login`, `/cadastro` | Editorial. Playfair + Inter. Black on warm white. Generous whitespace. |
| **B · Admin** | `/admin/*`, `/saas-admin/*` | Dense, dark, GitHub-adjacent. Inter only. 14px base. |
| **C · Photographer themes** | `{slug}.cliquezoom.com.br` | One of 5 opinionated themes. Branded as the photographer, not as us. |

**Never blend them.** A serif headline in admin is a bug. A 14px monospace label on the marketing page is a bug. A "CliqueZoom" branding mark on a photographer's site is a bug.

## Decision rules

### When you start a new screen

1. **Identify the surface.** What's the URL? Who's logged in?
2. **Open the right kit** — `04-components-marketing.html`, `05-components-admin.html`, or `06-components-themes.html`.
3. **Use existing components first.** If a button exists, don't re-style it. If a card pattern exists, copy it.
4. **If the pattern is missing**, design it inside that surface's tokens — never invent new colors, new fonts, or new radii.

### When the user asks for "a new variant"

- New button color → Reject unless it's a status (success/warning/danger).
- New font → Reject. Each surface has one display + one body.
- New radius → Reject unless documented in `02-foundations.html`.
- New layout → Fine. Compose existing primitives.
- New theme (Surface C) → See *Building a new theme* in `06-components-themes.html`.

## Filenames

When generating production files, follow this:

```
home/                # Marketing surface (Brazilian Portuguese)
admin/               # Photographer admin panel
saas-admin/          # Internal/superadmin panel (uses Admin kit)
site/templates/{theme}/  # The 5 photographer themes
```

For new explorations in this design-system project itself:

- `system/0X-{topic}.html` — A new section of the system.
- `explorations/{date}-{topic}.html` — Side experiments. Don't add to the index until promoted.

## Voice & copy

Always Portuguese-BR. Always *você*. Always lowercase first character on body sentences in admin. Always sentence case on marketing CTA buttons. Never exclamation marks in CTAs. See `01-content.html` for the full lexicon.

## Localization

The product launches in PT-BR only. Build assuming Portuguese is the source. Reserve room: Portuguese is ~20% longer than English. Don't fix-width buttons in CSS.

## Iconography

Lucide outline, 1.5px stroke. Five fixed sizes: 12, 14, 16, 20, 24, 32. **Never** mix in another icon library; **never** use filled icons except for selected states (a starred favorite, an active toggle).

## Imagery

- Marketing: real, licensed brand photography or none at all.
- Admin: checkerboard placeholders.
- Themes: nothing — the photographer brings their own work.

We never ship stock photography of generic faces.

## Pull requests

Before opening a PR, confirm:

- [ ] Surface is identified.
- [ ] No new tokens added — or if so, they're documented in `tokens.css` and `02-foundations.html`.
- [ ] Buttons follow the per-surface variant rules.
- [ ] Copy passes the lexicon (`01-content.html`).
- [ ] Iconography respects the rules above.
- [ ] No stock photography.

## Files in this system

- `index.html` — Browsable table of contents
- `tokens.css` — Single source of truth for all CSS variables
- `01-content.html` — Voice, tone, naming, lexicon
- `02-foundations.html` — Color, type, spacing, radii, shadow per surface
- `03-iconography.html` — Logo, icon grammar, placeholders
- `04-components-marketing.html` — Surface A components
- `05-components-admin.html` — Surface B components
- `06-components-themes.html` — Surface C themes
- `README.md` — Plain-text overview
- `SKILL.md` — This file
