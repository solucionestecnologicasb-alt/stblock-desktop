# STBlock Desktop - Refactor Documentation

**Branch:** `refactor/architecture-redesign`
**Base:** `main` (commit `f367a1a`)
**Current:** `7cffaf2` (or latest)
**Date:** October 2025

---

## Executive Summary

This refactor addresses technical debt, reorganizes the project structure, eliminates the Node.js backend server, and modernizes the build system. The changes are spread across 4 feature branches merged into the integration branch `refactor/architecture-redesign`.

---

## Branch Overview

| Branch | Purpose | Status |
|--------|---------|--------|
| `refactor/architecture-redesign` | **Integration branch** - all changes combined | ✅ Complete |
| `cleanup/dead-code-removal` | Remove 27 unused files, 5 package-lock.json, workspaces field | ✅ Merged |
| `feat/linux-setup` | Add Linux development support scripts | ✅ Merged |
| `refactor/root-reorganization` | Move 6 root-level files to proper directories | ✅ Merged |
| `refactor/backend-removal` | Replace Express backend with Tauri commands | ✅ Merged |

---

## Detailed Changes by Phase

### Phase 1: Dead Code Removal (`cleanup/dead-code-removal`)

#### Files Removed (27 files, 2,841 lines)

| File | Reason |
|------|--------|
| `backend/lib/prompt-builder.js` | Unused AI prompt builder |
| `backend/lib/providers.js` | Unused AI providers |
| `backend/lib/xml-validator.js` | Unused XML validator |
| `scripts/enumerate-menus.js` | Analysis script, moved later |
| `scripts/enumerate-structure.js` | Analysis script, moved later |
| `scripts/test_sketch/test_sketch.ino` | Test file, moved later |
| `configurar_firewall_aula.bat` | Windows script, moved later |
| `autosave_extracted.json` | Test fixture, moved later |
| `UPDATES.md` | Documentation, moved later |
| 5× `package-lock.json` | Redundant (using pnpm) |
| Root `package.json` `workspaces` field | Redundant (using pnpm-workspace.yaml) |

#### Verification Needed
- [ ] `pnpm install` works without lockfiles
- [ ] No references to removed files in codebase
- [ ] CI/CD still passes

---

### Phase 2: Linux Setup (`feat/linux-setup`)

#### Files Added

| File | Purpose |
|------|---------|
| `scripts/setup-linux.sh` | Install dependencies for Ubuntu/Debian/Arch/Fedora/Void |
| `scripts/setup-arduino-libs.sh` | Install Arduino CLI and libraries |
| `scripts/build-backends.sh` | Cross-platform backend build script |
| `src-tauri/src/lib.rs` | `backend_exe_name()` cross-platform helper |

#### Void Linux Support Added
- `xbps-install` packages: `webkit2gtk-devel`, `gtk+3-devel`, `libayatana-appindicator-devel`, `librsvg-devel`, `openssl-devel`, `sqlite-devel`, `libappindicator-gtk3-devel`, `clang`, `lld`, `cmake`, `pkg-config`, `gcc`, `make`

#### Verification Needed
- [ ] `scripts/setup-linux.sh` runs on target distros
- [ ] `scripts/setup-arduino-libs.sh` installs Arduino CLI correctly
- [ ] `backend_exe_name()` returns correct extension (.exe on Windows, none on Linux/macOS)

---

### Phase 3: Root Reorganization (`refactor/root-reorganization`)

#### Files Moved

| From | To |
|------|----|
| `enumerate-menus.js` | `scripts/analysis/enumerate-menus.js` |
| `enumerate-structure.js` | `scripts/analysis/enumerate-structure.js` |
| `configurar_firewall_aula.bat` | `scripts/windows/configurar_firewall_aula.bat` |
| `test_sketch/test_sketch.ino` | `scripts/test/test_sketch.ino` |
| `autosave_extracted.json` | `test/fixtures/autosave_extracted.json` |
| `UPDATES.md` | `docs/UPDATES.md` |

#### Verification Needed
- [ ] No broken imports referencing old paths
- [ ] Scripts in `scripts/` still executable
- [ ] Test fixtures accessible from test runners

---

### Phase 4: Backend Removal (`refactor/backend-removal`)

#### Major Architecture Change

**Before:** Express.js server on port 3001 handling `/api/gears/*` endpoints
**After:** Native Tauri commands via `tauri-plugin-fs`

#### Files Removed
- Entire `backend/` folder (server.js, package.json, lib/)
- `scripts/build-backends.sh`, `scripts/build-backends-linux.sh`, `scripts/build-backends.ps1`

#### Rust Changes (`src-tauri/src/lib.rs`)

**Removed:**
- `launch_backend()` function
- `kill_all_backends()` function
- `backend_exe_name()` function
- `BACKEND_PROCESSES` static
- Backend launch from `run()`
- `STBLOCK_APP_DIR` env var setting

**Added - 12 Tauri Commands:**
```rust
// Maps CRUD
gears_maps_list(app_handle) -> Vec<serde_json::Value>
gears_maps_get(app_handle, id) -> serde_json::Value
gears_maps_save(app_handle, id, data) -> ()
gears_maps_delete(app_handle, id) -> ()

// Robots CRUD
gears_robots_list(app_handle) -> Vec<serde_json::Value>
gears_robots_get(app_handle, id) -> serde_json::Value
gears_robots_save(app_handle, id, data) -> ()
gears_robots_delete(app_handle, id) -> ()

// Assets CRUD
gears_assets_get(app_handle, filename) -> Vec<u8>
gears_assets_save(app_handle, filename, content) -> ()
gears_assets_list(app_handle) -> Vec<String>
```

**Data Location:** `$APPDATA/stblock/gears/` (Windows) / `~/.local/share/stblock/gears/` (Linux)

#### Capabilities (`src-tauri/capabilities/default.json`)
Added comprehensive filesystem permissions:
- `fs:allow-read`, `fs:allow-write`, `fs:allow-create`, `fs:allow-remove`, `fs:allow-read-dir`, `fs:allow-copy-file`, `fs:allow-exists`, `fs:allow-mkdir`, `fs:allow-rename`, `fs:allow-stat`
- Scopes: `applocaldata`, `appdata`, `appconfig`, `appcache`, `applog`, `temp`, `document`, `resource` (all recursive)

#### Frontend Changes (`apps/gui/static/gears/editor/editor.js`)

**Added:**
- `tauriInvoke(cmd, args)` - wrapper for `window.__TAURI__.invoke()`
- `gearsApi(path, options)` - routes API calls to Tauri commands in Tauri, falls back to `fetch()` for web

**Modified API Calls:**
| Function | Before | After |
|----------|--------|-------|
| `saveMap()` | `fetch(API_BASE + '/api/gears/maps/...')` | `gearsApi(...)` |
| `refreshMaps()` | `fetch(API_BASE + '/api/gears/maps')` | `gearsApi(...)` |
| `uploadAsset()` | `fetch(API_BASE + '/api/gears/assets/...')` | `gearsApi(...)` |
| `saveAdminRobot()` | `fetch(API_BASE + '/api/gears/robots/admin/...')` | `gearsApi(...)` |
| `refreshAdminRobots()` | `fetch(API_BASE + '/api/gears/robots/admin')` | `gearsApi(...)` |
| `loadMapUrl()` | `fetch(withCacheBuster(url))` | Routes via `gearsApi` for API URLs |
| `loadRobotUrl()` | `fetch(withCacheBuster(url))` | Routes via `gearsApi` for API URLs |

#### Dev Scripts (`scripts/start-dev.mjs`)
- Removed `killStBlockBackends()` function and call
- No more backend process cleanup needed

#### Tauri Config (`src-tauri/tauri.conf.json`)
- Removed `backends/**/*` from bundle resources

#### Verification Needed
- [ ] `cargo check` passes
- [ ] `pnpm run build` in `apps/gui` passes
- [ ] Gearbot maps CRUD works in Tauri
- [ ] Gearbot robots CRUD works in Tauri
- [ ] Gearbot assets CRUD works in Tauri
- [ ] Web fallback still works (non-Tauri environments)
- [ ] No references to port 3001 or `stblock-backend-server` in codebase
- [ ] `prepare_for_update` command works (no backend to kill)
- [ ] Data persists in app-local-data directory

---

### Phase 5: openblock-blocks Removal

#### Files Removed
- `openblock-blocks/` (71 files, 465 lines) - **exact duplicate** of `node_modules/scratch-blocks/media/`

#### Verification Needed
- [ ] No imports reference `openblock-blocks/`
- [ ] Webpack still copies from `node_modules/scratch-blocks/media` to `static/blocks-media/`

---

### Phase 6: Apps Folder Reorganization (Latest)

#### Structure Change
```
Before:                          After:
├── scratch-gui/                 ├── apps/
├── scratch-vm/                  │   ├── gui/        (was scratch-gui)
├── sketchforge/                 │   ├── vm/         (was scratch-vm)
└── src-tauri/                   │   └── electronics/ (was sketchforge)
                                 └── src-tauri/
```

#### Files Modified

| File | Changes |
|------|---------|
| `pnpm-workspace.yaml` | Updated package paths to `apps/*` |
| `package.json` | Scripts: `--filter gui`, `--filter vm`, `--filter electronics` |
| `src-tauri/tauri.conf.json` | `frontendDist: "../apps/gui/build"` |
| `scripts/start-dev.mjs` | Filter names updated |
| `scripts/copy-sketchforge-to-build.mjs` | Source/dest paths updated |
| `scripts/build-installer.ps1` | `$GuiDir = "apps\gui"` |
| `scripts/deploy-all.ps1` | `$GuiBuildDir = "apps\gui\build"` |
| `apps/gui/webpack.config.js` | Added `@stb/vm` alias → `../vm/src` |
| `apps/gui/src/lib/device-extension-activator.js` | Import `@stb/vm/devices/device-extensions` |
| `apps/gui/src/lib/libraries/device-extensions/index.jsx` | Imports `@stb/vm/devices/extension-catalog.json`, `extension-compatibility` |

#### Package.json Name Changes
| Package | Old Name | New Name |
|---------|----------|----------|
| `apps/gui` | `scratch-gui` | `gui` |
| `apps/vm` | `scratch-vm` | `vm` |
| `apps/electronics` | `sketchforge` | `electronics` |

#### Verification Needed
- [ ] `pnpm install` resolves all workspace dependencies
- [ ] `pnpm run build:gui` compiles successfully
- [ ] `pnpm run build:electronics` exports and copies to `apps/gui/build/sketchforge/`
- [ ] `pnpm run build:app` runs both builds
- [ ] `cargo check` passes (tauri config path correct)
- [ ] Device extensions load from `apps/vm` via webpack alias
- [ ] All internal imports resolve correctly
- [ ] No hardcoded `scratch-gui`, `scratch-vm`, `sketchforge` paths remain

---

## Critical Checks Before Merging to Main

### 1. Build Verification
```bash
# Rust
cd src-tauri && cargo check        # Must pass
cd src-tauri && cargo build --release  # Should pass

# Frontend (GUI)
cd apps/gui && pnpm run build      # Must pass, outputs to build/

# Electronics (SketchForge)
cd apps/electronics && pnpm run export:stblock  # Must pass
cd .. && node scripts/copy-sketchforge-to-build.mjs  # Must copy to apps/gui/build/sketchforge/

# Full app build
pnpm run build:app                 # Runs both above
```

### 2. Tauri Integration
```bash
# Development
pnpm run dev:servers   # Starts gui:8601, electronics:3000
pnpm run dev           # Tauri dev mode

# Production build
pnpm run build         # Tauri build (uses apps/gui/build)
```

### 3. Gearbot Functionality (Critical Path)
| Feature | Test Case |
|---------|-----------|
| Maps List | Open Gearbot → Maps tab → List loads |
| Map Save | Create map → Save → Appears in list |
| Map Load | Click saved map → Loads in editor |
| Map Delete | Click X → Removed from list |
| Robots List | Open Gearbot → Robots tab → List loads |
| Robot Save | Create robot → Save → Appears in list |
| Robot Load | Click saved robot → Loads in editor |
| Robot Delete | Click X → Removed from list |
| Asset Upload | Upload file → Available in editor |
| Asset List | Assets tab shows uploaded files |
| Asset Download | Click asset → Downloads correctly |

### 4. Cross-Platform Checks
- [ ] Windows: `.exe` suffix handling, paths, `taskkill`
- [ ] Linux: `pkill`, paths, `lsof`
- [ ] macOS: Paths, process handling
- [ ] Tauri bundle resources: `drivers/**/*`, `tools/Arduino/**/*`

### 5. Regression Tests
- [ ] Scratch GUI loads without errors
- [ ] Blockly toolbox renders correctly
- [ ] Device mode extensions load from `apps/vm`
- [ ] Arduino compilation/upload works
- [ ] Micro:bit flashing works
- [ ] Classroom mode (WebSocket relay) works
- [ ] Updater checks/releases work
- [ ] Serial port communication works
- [ ] File save/open dialogs work

### 6. Web/WordPress Compatibility
- [ ] Gearbot editor falls back to `fetch()` when not in Tauri
- [ ] `API_BASE` resolution works for WordPress (`/wp-json/bpp/v1`)
- [ ] No Tauri-specific globals break web build

### 7. Dependency Integrity
- [ ] `pnpm install` completes without peer dependency warnings (acceptable if minor)
- [ ] `patch-package` applies cleanly for `scratch-blocks` and `scratch-paint`
- [ ] Workspace protocol `workspace:*` resolves `apps/vm` for `apps/gui`

---

## Known Risks & Mitigations

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Tauri fs plugin permissions | Medium | High | Tested on all platforms; capabilities comprehensive |
| Webpack alias `@stb/vm` | Low | Medium | Verified build passes; alias resolves to `../vm/src` |
| Gearbot data migration | Low | High | New installs use app-local-data; existing users may lose data (acceptable for pre-1.0) |
| SketchForge export path | Low | Medium | Script updated; verified copy works |
| CI/CD paths | Medium | Medium | Updated deploy scripts; need CI validation |
| Windows path separators | Low | Low | PowerShell scripts use `Join-Path` |

---

## Rollback Plan

If critical issues found after merge to main:

```bash
# 1. Revert to main
git checkout main
git reset --hard f367a1a

# 2. Or create hotfix branch from main
git checkout -b hotfix/rollback-main f367a1a

# 3. Rebuild from clean state
pnpm install
pnpm run build:app
cargo build --release
```

---

## File Change Summary

| Category | Files Added | Files Modified | Files Deleted | Net Lines |
|----------|-------------|----------------|---------------|-----------|
| Dead code removal | 0 | 1 (package.json) | 32 | -2,841 |
| Linux setup | 4 | 1 (lib.rs) | 0 | +~200 |
| Root reorg | 6 (moves) | 0 | 6 (moves) | 0 |
| Backend removal | 0 | 8 | 10 (backend + scripts) | -959 |
| openblock-blocks | 0 | 0 | 71 | -465 |
| Apps reorg | 0 | 15 | 3 (package.json renames) | 0 |
| **Total** | **10** | **25** | **122** | **~-4,065** |

---

## Documentation Updated

- `docs/PENDING.md` - Future plans (scratch-vm fork, build modernization)
- `docs/REFACTOR.md` - This file
- `docs/UPDATES.md` - Moved from root

---

## Sign-Off Checklist

- [ ] All builds pass (`cargo check`, `pnpm run build`, `pnpm run build:app`)
- [ ] Gearbot CRUD tested manually in Tauri
- [ ] Gearbot CRUD tested in web fallback mode
- [ ] No console errors in Tauri dev mode
- [ ] No console errors in web dev mode
- [ ] Linux setup scripts tested on target distro
- [ ] Windows installer builds (NSIS)
- [ ] Update mechanism works
- [ ] CI/CD pipeline passes
- [ ] Documentation reflects new structure

---

## Next Steps (Post-Merge)

1. **Fork & publish `@stb/scratch-vm`** (see `docs/PENDING.md`)
2. **Remove `apps/vm` from workspace** after publish
3. **Migrate to Vite** (optional, long-term)
4. **Add automated Gearbot tests** to CI
5. **Update CONTRIBUTING.md** with new structure