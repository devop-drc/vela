# Debugging Log & Learnings

This file is a log of repeated or critical issues encountered during development and their solutions. The goal is to learn from mistakes and improve the development process.

## Issue: Repeated Component Crash - `Unexpected token ... Expected jsx identifier`

- **Date:** July 26, 2024
- **Files Affected:** `src/components/product-detail/ProductEditMode.tsx`, `src/components/CreateProductModal.tsx`
- **Symptom:** The application crashes with a Vite/SWC error pointing to a component tag (e.g., `<motion.div>`, `<Dialog>`). The error message is often misleading and points to a line of code that is syntactically correct.
- **Root Cause:** The issue stemmed from incorrect import paths. While the import statements existed, they used relative paths (e.g., `./ui/card`) instead of the project's configured path alias (e.g., `@{/components/ui/card}`). This inconsistency can cause the Vite bundler to fail to resolve the module correctly, leading to an invalid component being passed to the JSX parser. The parser then fails, reporting an error on the first token it doesn't understand, which may be unrelated to the actual source of the problem.
- **Mistake Pattern:**
    1.  The AI (Dyad) incorrectly diagnosed the problem as a caching issue.
    2.  The AI then fixated on *missing* imports, failing to identify that the imports were present but *incorrectly pathed*.
    3.  This led to repeated failed attempts and user frustration.
- **Solution:** **ALWAYS verify all import paths.** Ensure they conform to the project's conventions, using path aliases (`@/`) instead of relative paths (`../` or `./`) for modules within the `src` directory.
    - **Example Fix:** Change `import { Card } from "./ui/card";` to `import { Card } from "@/components/ui/card";`.
- **Learning:** A misleading syntax error from the build tool can often point to a problem with module resolution. Do not trust the line number blindly. Scrutinize all imports for correctness, including pathing, not just existence.