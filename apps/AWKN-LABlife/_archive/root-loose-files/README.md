# Root Loose Files Archive

This folder stores non-runtime files moved out of the repository root before Git cleanup.

Layout:
- `legacy-docs/`: old PRD, design, and planning documents
- `preview-html/`: standalone HTML preview files
- `test-scripts/`: one-off local test scripts and payloads
- `temp-scripts/`: temporary admin, ecosystem, and debug scripts
- `legacy-assets/`: loose design assets no longer needed at the root

Rules:
- Do not import runtime code from this folder.
- If a file becomes active again, move it back to an appropriate source or docs location.
