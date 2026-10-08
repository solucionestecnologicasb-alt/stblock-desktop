# Pending Technical Debt & Future Plans

## 1. scratch-vm Fork & Publish Strategy

### Current State
- `scratch-vm/` is a **local workspace package** forked from `scratchfoundation/scratch-vm@5.0.300` (SHA `e6f5711f`)
- **22 modified source files** adding STBlock device/Arduino support:
  - Device manifests: `stBoardExtension`, `stbBoardV2`, `arduinoNano`, `arduinoUno`
  - Arduino generators: `board-fixes`, `device-extensions`, `events`, `io`, `stbext`, `stboard`, `stbv2`
  - Bluetooth/Arduino peripherals, extension catalog, SB3 serialization

### Problem
- Cannot accept upstream updates easily (no clean rebase/merge path)
- Local changes mixed with upstream code
- No independent versioning
- Blocks using scratch-vm as npm dependency in other projects

### Recommended Solution: Fork + Publish as `@stb/scratch-vm`

```bash
# 1. Create fork on GitHub
gh repo create stb/scratch-vm --private --clone

# 2. Push current modified version
cd scratch-vm
git remote add fork https://github.com/stb/scratch-vm.git
git push fork main

# 3. Publish to npm (or GitHub Packages)
npm publish --access public  # or --registry=https://npm.pkg.github.com

# 4. Update scratch-gui/package.json
"dependencies": {
  "scratch-vm": "@stb/scratch-vm@^5.0.300"
}

# 5. Remove from pnpm-workspace.yaml
packages:
  - "scratch-gui"
  - "sketchforge"
  # scratch-vm removed
```

### Benefits
- Clean upstream sync via `git fetch upstream && git rebase upstream/main`
- Independent versioning (`@stb/scratch-vm@5.0.301-stb.1`, etc.)
- Shareable across projects
- Reduces monorepo size

### Alternative: Git Subtree
```bash
git subtree add --prefix=scratch-vm https://github.com/stb/scratch-vm-fork main
git subtree push --prefix=scratch-vm https://github.com/stb/scratch-vm-fork main
```

---

## 2. scratch-gui Patch Maintenance

### Current Patches (via `patch-package`)
| Package | Patch File | Description |
|---------|------------|-------------|
| `scratch-blocks@1.3.0` | `scratch-blocks+1.3.0.patch` | Reduced motion accessibility (jump scroll) |
| `scratch-paint@3.0.339` | `scratch-paint+3.0.339.patch` | React 16 lifecycle fixes, CSS overflow, ref forwarding |

### Action
- Monitor upstream for these fixes
- Remove patches when upstream includes them
- Consider contributing patches upstream

---

## 3. Monorepo Structure Reorganization (Lighter)

### Current
```
stblock-desktop/
├── scratch-gui/
├── scratch-vm/
├── sketchforge/
├── src-tauri/
├── scripts/
└── package.json
```

### Proposed
```
stblock-desktop/
├── apps/
│   ├── gui/          # ← scratch-gui
│   ├── vm/           # ← scratch-vm (until fork published)
│   └── electronics/  # ← sketchforge
├── src-tauri/
├── scripts/
└── package.json
```

### Paths to Update
| File/Config | Changes Needed |
|-------------|----------------|
| `pnpm-workspace.yaml` | Package paths |
| `package.json` scripts | `--filter` paths, `build:app`, `dev:servers` |
| `src-tauri/tauri.conf.json` | `frontendDist: "../apps/gui/build"` |
| `scripts/start-dev.mjs` | Working directories |
| `scripts/copy-sketchforge-to-build.mjs` | Source/dest paths |
| `scratch-gui/webpack.config.js` | Any relative paths |
| `sketchforge/apps/web/next.config.ts` | Output paths |
| `.github/workflows/*.yml` | CI paths |
| Root `package.json` | `install:all`, `prepublish` |

---

## 4. Upstream Contribution Opportunities

### scratch-gui
- [ ] Reduced motion fix for flyout scroll (scratch-blocks patch)
- [ ] Spanish translations for block search placeholder
- [ ] Custom zoom controls (if generally useful)

### scratch-vm
- [ ] Device extension manifest schema enhancements
- [ ] Arduino generator improvements

---

## 5. Build System Modernization (Long-term)

### Current
- scratch-gui: Webpack 5 (custom config)
- sketchforge: Next.js 14
- scratch-vm: Webpack 5

### Target
- Single **Vite** config for all frontends
- Or **Turborepo** for monorepo orchestration
- Shared TypeScript/ESLint config

---

## Priority Order
1. ✅ Document this plan (this file)
2. 🔄 Lighter monorepo reorganization (`apps/` folder)
3. ⏳ Fork & publish `@stb/scratch-vm`
4. ⏳ Remove `scratch-vm` from workspace
5. ⏳ Migrate build to Vite (optional)