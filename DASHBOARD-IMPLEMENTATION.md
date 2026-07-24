# Dashboard Implementation Plan

## Routing (English)

| Route | Component | Description |
|-------|-----------|-------------|
| `/` | `DashboardPage` | Board list (Miro-style) |
| `/editor` | `EditorPage` | New board (redirects to `/editor/:id` after creation) |
| `/editor/:id` | `EditorPage` | Edit existing board |

`App.tsx` changes from `"/" → redirect to "/editor"` to `"/" → <DashboardPage />`.

## Files to create

| File | Role |
|------|------|
| `src/stores/project-store.ts` | Zustand store with mock data + localStorage persistence |
| `src/routes/dashboard.tsx` | Dashboard page component |
| `src/styles/dashboard.css` | Dashboard layout & card styles |
| `src/components/layout/dashboard-header.tsx` | Dashboard header (distinct from editor header) |

## Files to modify

| File | Change |
|------|--------|
| `src/App.tsx` | Add `/` → Dashboard route |
| `src/styles/index.css` | Remove `overflow:hidden` from `body` (editor-only) |
| `src/main.tsx` | Import `dashboard.css` |

## project-store.ts — Mock data

```typescript
interface Project {
  id: string
  name: string
  updatedAt: string   // ISO date
  createdAt: string
}
```

Seed 5 mock projects. Store persists to `localStorage["drawwwy.projects"]` and survives refresh.

**Store API:**
- `projects: Project[]`
- `loading: boolean` — false for now (simulates async)
- `createProject(name): Project` — creates project, navigates to `/editor/:newId`
- `deleteProject(id): void` — removes from list
- `renameProject(id, name): void` — renames

## Dashboard UI (Miro-style)

**dashboard-header.tsx:**
- Logo "draw<b>wwy</b>" left
- "Create board" primary button right
- Inline input or modal for naming new board

**dashboard.tsx:**
- Header top, responsive card grid below
- Grid: 4 cols desktop, 2 tablet, 1 mobile
- Each card:
  - Preview area (grid background, project name centered large)
  - Project name (clickable inline edit)
  - Last modified date (relative: "2 days ago")
  - Context menu (three dots) → Rename / Delete
  - Click card → navigate to `/editor/:id`
- Empty state: "Create your first board" with large CTA button

## Style tokens

Use existing CSS variables (`--bg`, `--surface`, `--text`, `--brand`, etc.). Dashboard does NOT have `overflow:hidden` (editor needs it). Page scrolls normally.

## Editor integration

On board creation:
1. `createProject("My board")` → generates UUID, saves to store + localStorage
2. Navigates to `/editor/:id`
3. Editor saves doc to `localStorage["drawwwy.project.<id>"]`

For now (v1), editor ignores `:id` and always starts fresh. Local save/load per project ID comes later.

## Edge cases

- Delete: show confirmation modal (reuse `.overlay` + `.card` from editor.css)
- Rename: click name → turns into input → Enter/blur saves
- Empty localStorage: seed with 5 mock projects