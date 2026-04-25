# CliqueZoom — Design System

> The design language for a SaaS platform built for photographers in Brazil.

CliqueZoom is three surfaces that share DNA but speak different dialects:

| Surface | Audience | Aesthetic |
|---|---|---|
| **Marketing** (`cliquezoom.com.br`) | Photographers discovering the product | Editorial, monochrome, serif accents |
| **Admin Panel** (`/admin`) | Logged-in photographers managing their studio | Dark, dense, GitHub-inspired tooling |
| **Photographer Sites** (`{slug}.cliquezoom.com.br`) | End clients of each photographer | 5 opinionated themes — not CliqueZoom branded |

The system is designed so the photographer's site never feels like a template — each theme commits to a distinct voice. But the tools they use to run their business (admin) feel like one premium product.

## How to use this system

1. **Start from Content Fundamentals** — tone, voice, naming, localization rules.
2. **Learn the Visual Foundations** — shared primitives (spacing, radii, shadows) plus the three tokenized palettes (Marketing, Admin, Themes).
3. **Pick the right UI kit** for the surface you're building. Every page in the product belongs to exactly one surface; don't blend them.
4. **Check components before inventing.** If a pattern exists, use it. If not, design it inside the surface's tokens and propose it for the kit.

## Files

- `01-content.html` — Voice, tone, Portuguese copywriting, naming
- `02-foundations.html` — Color, type, spacing, radius, shadow
- `03-iconography.html` — Logo, icon grammar, illustration
- `04-ui-marketing.html` — Components for the public marketing site
- `05-ui-admin.html` — Components for the admin panel
- `06-ui-themes.html` — The 5 photographer-site themes side-by-side
- `index.html` — Table of contents (this doc, browsable)
