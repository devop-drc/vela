# Debugging Log & Learnings

This file is a log of repeated or critical issues encountered during development and their solutions. The goal is to learn from mistakes and improve the development process.

## Issue: Repeated Component Crash - `Unexpected token ... Expected jsx identifier`

- **Date:** July 26, 2024
- **Files Affected:** `src/components/product-detail/ProductEditMode.tsx`, `src/components/CreateProductModal.tsx`
- **Symptom:** The application crashes with a Vite/SWC error pointing to a component tag (e.g., `<motion.div>`, `<Dialog>`).
- **Root Cause:** The component being used in the JSX was not imported at the top of the file. This is a fundamental React error.
- **Mistake Pattern:**
    1.  The AI (Dyad) incorrectly diagnosed the problem as a caching issue instead of a code issue.
    2.  The AI repeatedly failed to identify the missing import statement.
    3.  In one instance, the AI claimed to add the import but failed to include it in the generated code block.
- **Solution:** **ALWAYS verify all imports.** Before concluding a fix, every component used in the JSX must have a corresponding import statement at the top of the file.
    - **Example Fix:** Add `import { Dialog, DialogContent, ... } from "@/components/ui/dialog";` to the file using the Dialog component.
- **Learning:** Do not jump to conclusions like "caching." The most obvious cause (a missing import) is often the correct one. Meticulously check the basics before attempting more complex solutions. Double-check generated code before sending it to the user.