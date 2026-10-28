# Strict Instructions for This Project

These instructions apply to every task and every session in this project. Read and follow them before inspecting, changing, testing, deploying, or documenting the site.

1. **Keep SuperAdmin data strictly inside the SuperAdmin portal.** Never use, display, expose, aggregate, copy, or share SuperAdmin data on any public page, in the Admin or Standard portals, or in any future portal. Do not use SuperAdmin data indirectly in public counters, totals, feeds, reports, or other derived information.

2. **Do not run checks on custom URLs.** Do not open, fetch, probe, validate, crawl, or run automated checks against any custom URL provided for this project, especially payment links. AI initiated requests to these URLs can cause them to misbehave or stop working. Treat such URLs as opaque values unless the user explicitly gives a new instruction for a specific URL.

3. **Preserve all order history and order data.** Never delete order history unless the user explicitly instructs you to do so. Do not make direct or indirect changes that could corrupt, overwrite, misroute, duplicate, hide, or otherwise disturb order records or their relationships. Before any authorized change that could affect order data, identify the impact and use a safe approach that preserves existing records.

If a requested task conflicts with one of these instructions, stop the conflicting action and ask the user for a specific instruction before proceeding. Continue any unaffected work.
