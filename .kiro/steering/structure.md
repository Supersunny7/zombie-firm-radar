# Project Structure

## Current layout
```
.kiro/steering/   Kiro steering rules (product.md, tech.md, structure.md)
LICENSE
README.md
```

## Guidelines
- Place all new project files inside the repo root.
- Keep a clear separation between data ingestion, metric computation, and presentation code.
- Keep raw and cached data separate from source code, and git-ignore large or generated data.
- Add a `.gitignore` when the first tooling is introduced.
- Update this file when top-level folders are added.
