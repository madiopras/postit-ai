# Frontend Third-Party Notices

> Audit date: 1 August 2026  
> Scope: direct dependencies and copied source material used by the PostIt AI
> frontend and its browser validation

This inventory complements `package-lock.json` and is not legal advice.
Package versions and license identifiers were read from the installed package
metadata used for the Phase 7 validation.

| Material | Version/source | License | Use |
|---|---|---|---|
| Untitled UI React adopted source | commit `eaee6a5b9798fa6867b4d896c6cfecf6ce706a73` | MIT | Eight locally adapted UI primitive files |
| `react-aria-components` | 1.20.0 | Apache-2.0 | Accessible interaction primitives |
| `tailwindcss-react-aria-components` | 2.2.0 | Apache-2.0 | React Aria state variants |
| `lucide-react` | 1.26.0 | ISC | Product and navigation icons |
| `clsx` | 2.1.1 | MIT | Conditional classes through canonical `cn()` |
| `tailwind-merge` | 3.6.0 | MIT | Tailwind conflict resolution through `cn()` |
| `tw-animate-css` | 1.4.0 | MIT | Modal, slideout, tooltip motion utilities |
| `sonner` | 2.0.7 | MIT | Toast feedback |
| `recharts` | 3.8.0 | MIT | Dashboard activity chart |
| `react-markdown` | 10.1.0 | MIT | Assistant answer rendering |
| `remark-gfm` | 4.0.1 | MIT | GFM table/code support |
| `@axe-core/playwright` / `axe-core` | 4.12.1 | MPL-2.0 | Test-only WCAG automation; excluded from production bundle |

The retained Untitled UI license text is
[`untitled-ui-LICENSE.txt`](./untitled-ui-LICENSE.txt). No Untitled UI PRO,
private registry, Figma/illustration pack, avatar pack, or Untitled UI Icons PRO
material is present.
