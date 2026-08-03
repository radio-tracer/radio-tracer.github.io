# radio-tracer.github.io

Landing site for **[RadioTracer](https://github.com/radio-tracer)** — dynamic reachability for known dependency vulnerabilities.

**Live:** https://radio-tracer.github.io/

## Local preview

```bash
# from repo root
python3 -m http.server 8765
# open http://localhost:8765
```

## Deploy

Pushes to `main` run [`.github/workflows/pages.yml`](.github/workflows/pages.yml), which publishes this repo as the org GitHub Pages site.

## Related

- [radio-tracer-java](https://github.com/radio-tracer/radio-tracer-java) — JVM agent
- [radio-tracer-cve-import](https://github.com/radio-tracer/radio-tracer-cve-import) — SCA → methods.json
