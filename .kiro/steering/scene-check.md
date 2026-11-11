---
inclusion: manual
---

# Scene check (manual)

Include this with `#scene-check` and name the scene (graveyard or lab).

1. Invoke the scene-critic agent on the running dev server (do not start it).
2. Screenshot the named scene and compare with `/reference`.
3. Return only the top 5 differences, ranked by visual impact, each with the file and value to change.
4. Do not edit code.
