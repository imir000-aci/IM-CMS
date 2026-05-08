# IM-CMS — Full-Stack CMS Application

## What to Build

A complete, working React + TypeScript single-page application. All pages must have real state, real API calls, real form validation, and real navigation. Use React Router for routing, TanStack Query for server state, Zustand for auth state, and Axios for HTTP. Every screen described below must be fully interactive — no placeholder text, no "coming soon" panels.

---

## Tech Stack

- **React 18** with TypeScript (strict mode)
- **React Router v6** — `<BrowserRouter>`, `useNavigate`, `useParams`
- **TanStack Query v5** — `useQuery`, `useMutation`, `useQueryClient`
- **Zustand** — auth store: `{ user, token, setAuth, logout }`
- **Axios** — base URL from `VITE_API_URL` env var, Bearer token injected via request interceptor
- **Tailwind CSS** + shadcn/ui primitives (Button, Input, Select, Tabs, Dialog, Badge, Textarea)
- **Lucide React** for all icons
- **date-fns** for date formatting

---

## Design Tokens

```css
:root {
  --bg: #ffffff;
  --surface: #f9fafb;
  --border: #e5e7eb;
  --muted: #6b7280;
  --primary: #111827;
  --success: #16a34a;
  --warning: #d97706;
  --destructive: #dc2626;
  --accent: #2563eb;
  --radius: 6px;
}
```

Font: Inter. Base size: 14px. Page padding: 32px. Card padding: 16px. Gap: 16px.

Badge pill: 11px, font-medium, rounded-full, 4px vertical padding, 8px horizontal.
- success → `bg-green-100 text-green-700`
- warning → `bg-amber-100 text-amber-700`
- secondary → `bg-gray-100 text-gray-600`
- destructive → `bg-red-100 text-red-700`
- blue → `bg-blue-100 text-blue-700`
- purple → `bg-purple-100 text-purple-700`

---

## API Client

```ts
// src/lib/api.ts
import axios from 'axios'
import { useAuthStore } from './auth-store'

export const apiClient = axios.create({ baseURL: import.meta.env.VITE_API_URL })

apiClient.interceptors.request.use(cfg => {
  const token = useAuthStore.getState().token
  if (token) cfg.headers.Authorization = `Bearer ${token}`
  return cfg
})

// Auto-logout on 401
apiClient.interceptors.response.use(
  r => r,
  err => {
    if (err.response?.status === 401) useAuthStore.getState().logout()
    return Promise.reject(err)
  }
)
```

All API functions return `Promise<AxiosResponse<{ data: T }>>`.

---

## Auth Store

```ts
// src/lib/auth-store.ts
interface AuthState {
  user: { id: string; displayName: string; email: string; role: string } | null
  token: string | null
  setAuth: (user: AuthState['user'], token: string) => void
  logout: () => void
}
// persist to localStorage key 'im-cms-auth'
```

---

## App Router

```
/login                          LoginPage (no shell)
/                               redirect → /dashboard
/dashboard                      DashboardPage
/components                     ComponentLibraryPage
/components/:componentId        ComponentDetailPage
/components/:componentId/bento  BentoLayoutEditorPage
/component-instances            ComponentInstanceListPage
/component-pools                ComponentPoolsListPage
/component-pools/:poolId        ComponentPoolDetailPage
/content                        ContentListPage
/content/:contentId             ContentDetailPage
/channels                       ChannelsPage
/pages                          PagesListPage
/pages/:pageId                  PageBuilderPage
/pages/:pageId/config           PageConfigPage
/dam                            AssetLibraryPage
/targeting                      TargetingRulesPage
/targeting/:ruleId/simulate     TargetingSimulatorPage
/experiences                    ExperiencesPage
/experiences/:experienceId      ExperienceDetailPage
/experiments                    ExperimentMappingsPage
/campaigns                      CampaignListPage
/campaigns/:campaignId          CampaignDetailPage
/settings/users                 UsersPage
/settings/locales               LocalesPage
/settings/seo                   SeoPage
```

Protected routes: redirect to `/login` if `token` is null.

---

## Layout Shell

### AppShell component

Renders for all protected routes. Two-column: fixed 240px sidebar + `flex-1` main area.

### Sidebar

```
┌──────────────────────────┐
│ IM-CMS    [org name]     │  ← logo + small muted org text
├──────────────────────────┤
│ Dashboard                │
├─ CONTENT ────────────────┤
│ Components               │
│ Component Instances      │
│ Component Pools          │
│ Content Objects          │
├─ PUBLISHING ─────────────┤
│ Channels                 │
│ Pages                    │
│ Assets                   │
├─ PERSONALIZATION ────────┤
│ Targeting Rules          │
│ Experiences              │
│ Experiments              │
├─ CAMPAIGNS ──────────────┤
│ Campaigns                │
├─ SETTINGS ───────────────┤
│ Users                    │
│ Locales                  │
│ SEO                      │
├──────────────────────────┤
│ [avatar] Name  [logout]  │  ← bottom of sidebar
└──────────────────────────┘
```

**Active state logic:** compare `location.pathname` with each nav item's path. If pathname starts with the nav item path, apply active styles: `bg-gray-100 font-medium text-gray-900`. Default: `text-gray-600 hover:bg-gray-50`.

**Logout:** call `POST /api/v1/auth/logout`, then `authStore.logout()`, then navigate to `/login`.

### PageHeader component

```tsx
interface PageHeaderProps {
  title: string
  description?: string
  actions?: React.ReactNode
}
```

Full-width, 64px min-height, horizontal padding 32px, bottom border `border-b border-gray-200`.
Title: 20px/600. Description: 13px muted below title. Actions: flex row gap-2, right-aligned.

---

## Screen 1 — Login

**Route:** `/login`

**State:**
```ts
const [email, setEmail] = useState('')
const [password, setPassword] = useState('')
const [error, setError] = useState<string | null>(null)
const [loading, setLoading] = useState(false)
```

**Layout:** centered card (400px wide), vertically centered in viewport.
- "IM-CMS" heading + "Sign in to your account" subtitle
- Email input (type=email, required, autofocus)
- Password input (type=password, required)
- Error banner: red bg, error message text (only when `error !== null`)
- "Sign In" primary button (full width, disabled while loading, shows spinner when loading)

**Submit handler:**
```ts
async function handleSubmit(e: FormEvent) {
  e.preventDefault()
  setError(null)
  setLoading(true)
  try {
    const res = await apiClient.post('/api/v1/auth/login', { email, password })
    authStore.setAuth(res.data.data.user, res.data.data.accessToken)
    navigate('/dashboard')
  } catch (err) {
    setError('Invalid email or password')
  } finally {
    setLoading(false)
  }
}
```

**Validation:** email must match `/^[^\s@]+@[^\s@]+\.[^\s@]+$/`. Show inline error below field on blur if invalid.

---

## Screen 2 — Dashboard

**Route:** `/dashboard`

**API calls:**
```ts
useQuery({ queryKey: ['campaigns', { status: 'PRODUCTION' }],
  queryFn: () => apiClient.get('/api/v1/campaigns?status=PRODUCTION&pageSize=5') })

useQuery({ queryKey: ['campaigns', { status: 'REVIEW' }],
  queryFn: () => apiClient.get('/api/v1/campaigns?status=REVIEW&pageSize=10') })

useQuery({ queryKey: ['campaigns', { upcoming: true }],
  queryFn: () => apiClient.get('/api/v1/campaigns?status=SCHEDULED&pageSize=8') })

useQuery({ queryKey: ['components', { stats: true }],
  queryFn: () => apiClient.get('/api/v1/components?pageSize=1') })
```

**Layout:**

Top row — 4 stat cards in `grid grid-cols-4 gap-4`:
1. **Active Campaigns** — count of PRODUCTION campaigns + green "+X this week" delta
2. **Awaiting Review** — count of REVIEW campaigns + amber badge
3. **Total Components** — from components total
4. **Live Pages** — query `/api/v1/pages?isPublished=true&pageSize=1` for total

Each stat card:
```
┌─────────────────┐
│ Active Campaigns│  ← 12px muted label
│      12         │  ← 36px bold number
│  +3 this week ● │  ← 12px green badge
└─────────────────┘
```

Middle row — `grid grid-cols-3 gap-6`:

Left (col-span-2): **Upcoming Campaigns** table
- Columns: Name (clickable link → campaign detail), Status badge, Start, End, Priority
- `format(new Date(row.startDate), 'MMM d, yyyy')` for dates
- Clicking a row navigates to `/campaigns/:id`
- Skeleton rows while loading

Right (col-span-1): **Action Required** card
- Title "Action Required" + count badge
- Each item: campaign name (bold) + "Approval pending" label + "Review →" ghost button
- Clicking "Review →" navigates to `/campaigns/:id` with approvals tab
- Empty: "Nothing requires your attention" in muted text

Bottom: **Campaign Timeline** — horizontal scrollable strip
- 7-day range starting today
- Day headers across top (Mon 5, Tue 6…)
- Each campaign is a colored horizontal bar spanning its start–end dates
- Bar color by status: green=PRODUCTION, amber=SCHEDULED, blue=REVIEW, gray=DRAFT
- Bar shows campaign name truncated, tooltip on hover with full name + dates
- Bars that extend beyond the 7-day view are clipped with a fade edge

---

## Screen 3 — Component Library

**Route:** `/components`

**State:**
```ts
const [search, setSearch] = useState('')
const [activeOnly, setActiveOnly] = useState(false)
const [page, setPage] = useState(1)
const [showCreate, setShowCreate] = useState(false)
```

**API call:**
```ts
useQuery({
  queryKey: ['components', { search, activeOnly, page }],
  queryFn: () => apiClient.get('/api/v1/components', {
    params: { search: search || undefined, isActive: activeOnly || undefined, page, pageSize: 20 }
  })
})
```

**Create component mutation:**
```ts
useMutation({
  mutationFn: (data: { name: string; slug: string; description?: string }) =>
    apiClient.post('/api/v1/components', data),
  onSuccess: (res) => {
    qc.invalidateQueries({ queryKey: ['components'] })
    setShowCreate(false)
    navigate(`/components/${res.data.data.id}`)
  }
})
```

**Create Dialog state:**
```ts
const [name, setName] = useState('')
const [slug, setSlug] = useState('')
const [description, setDescription] = useState('')
const [error, setError] = useState<string | null>(null)
```

**Slug auto-generation:** when name changes, set slug to `name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')`. User can override manually.

**Validation:** name required (min 2 chars), slug required, matches `/^[a-z0-9-]+$/`.

**Table columns:**
| Column | Render |
|--------|--------|
| Name | Bold text, clickable → `/components/:id` |
| Slug | `font-mono text-xs text-muted-foreground` |
| Attributes | Gray badge with count |
| Version | `v{currentVersion}` in muted text |
| Status | Badge: Active=success, Deprecated=warning, Inactive=secondary |
| Created | `format(date, 'MMM d, yyyy')` |
| Actions | "Edit" ghost button → navigate to detail |

**Search:** debounced 300ms. Resets page to 1 on change.

**Pagination:** shows when `total > 20`. "Showing X–Y of Z results".

---

## Screen 4 — Component Detail

**Route:** `/components/:componentId`

**State:**
```ts
const [schema, setSchema] = useState<AttributeDefinition[] | null>(null)
const [name, setName] = useState('')
const [description, setDescription] = useState('')
const [isDirty, setIsDirty] = useState(false)
const [saveError, setSaveError] = useState<string | null>(null)
const [activeTab, setActiveTab] = useState('schema')
```

**API calls:**
```ts
// Fetch component
useQuery({ queryKey: ['components', componentId],
  queryFn: () => apiClient.get(`/api/v1/components/${componentId}`) })

// Fetch versions
useQuery({ queryKey: ['components', componentId, 'versions'],
  queryFn: () => apiClient.get(`/api/v1/components/${componentId}/versions`) })
```

**Initialize local state:** `useEffect` — when component loads and `schema === null`, set `schema = component.attributeSchema`, `name = component.name`, `description = component.description ?? ''`.

**Save mutation:**
```ts
useMutation({
  mutationFn: () => apiClient.patch(`/api/v1/components/${componentId}`, {
    name, description: description || undefined, attributeSchema: schema
  }),
  onSuccess: () => {
    qc.invalidateQueries({ queryKey: ['components', componentId] })
    setIsDirty(false)
    setSaveError(null)
  },
  onError: (e) => setSaveError(e.message)
})
```

**Restore version mutation:**
```ts
useMutation({
  mutationFn: (version: number) =>
    apiClient.post(`/api/v1/components/${componentId}/versions/${version}/restore`),
  onSuccess: () => {
    qc.invalidateQueries({ queryKey: ['components', componentId] })
    setSchema(null) // triggers re-init from refreshed data
  }
})
```

**AttributeDefinition type:**
```ts
interface AttributeDefinition {
  name: string
  dataType: 'text' | 'richtext' | 'number' | 'boolean' | 'url' | 'image' | 'video' | 'date' | 'json' | 'reference' | 'select'
  required: boolean
  isAuthorFillable: boolean
  validationRules?: {
    maxLength?: number
    regex?: string
    allowedValues?: string[]
  }
}
```

**Add attribute:** append `{ name: '', dataType: 'text', required: false, isAuthorFillable: true }` to schema array. Set isDirty=true.

**Remove attribute:** filter by index. Set isDirty=true.

**Update attribute:** replace at index. Set isDirty=true.

**AttributeRow component (accordion):**
- Collapsed: shows name input + dataType select + required checkbox + isAuthorFillable checkbox + expand button + delete button in a horizontal flex row
- Expanded: shows additional grid with maxLength number input, regex text input, allowedValues comma-separated input
- Expand/collapse: local `expanded` boolean state per row
- Setting validationRules: use `delete rules.key` (not `= undefined`) when field is cleared, to satisfy TypeScript `exactOptionalPropertyTypes`

**Save Changes button:** only rendered when `isDirty === true`. Label: "Saving…" while mutation pending.

---

## Screen 5 — Bento Layout Editor

**Route:** `/components/:componentId/bento`

**BentoConfig type:**
```ts
interface BentoTile {
  id: string       // crypto.randomUUID()
  label: string
  col: number      // 1-based
  row: number      // 1-based
  colSpan: number
  rowSpan: number
  bgColor?: string // Tailwind class e.g. 'bg-blue-100'
}
interface BentoConfig {
  cols: number   // 1–12
  rows: number   // 1–12
  tiles: BentoTile[]
}
```

**State:**
```ts
const [config, setConfig] = useState<BentoConfig | null>(null)
const [selectedTileId, setSelectedTileId] = useState<string | null>(null)
const [isDirty, setIsDirty] = useState(false)
```

**Initialize:** useEffect when component loads and config is null: `setConfig(component.bentoConfig ?? { cols: 3, rows: 3, tiles: [] })`.

**Grid render logic:**
```tsx
<div style={{
  display: 'grid',
  gridTemplateColumns: `repeat(${config.cols}, 1fr)`,
  gridTemplateRows: `repeat(${config.rows}, 80px)`,
  gap: '8px'
}}>
  {config.tiles.map(tile => (
    <button
      style={{
        gridColumn: `${tile.col} / span ${tile.colSpan}`,
        gridRow: `${tile.row} / span ${tile.rowSpan}`
      }}
      className={`${tile.bgColor || 'bg-white'} border-2 rounded-md
        ${selectedTileId === tile.id ? 'border-blue-500 shadow-md' : 'border-gray-200 hover:border-gray-400'}`}
      onClick={() => setSelectedTileId(tile.id)}
    >
      {tile.label}
    </button>
  ))}
</div>
```

**Add tile:** creates tile at col=1, row=1, colSpan=1, rowSpan=1 with label "Tile N". Immediately selects it.

**Update tile:** replace tile in array by id. Set isDirty=true.

**Remove tile:** filter array by id. If removed tile was selected, setSelectedTileId(null).

**Properties panel:** shown when `selectedTile !== null`. Inputs bound to tile values. Col/Row/Span inputs use `min`/`max` constraints based on grid dimensions.

**Background color select:** options: Default (empty), Blue (bg-blue-100), Green (bg-green-100), Yellow (bg-yellow-100), Pink (bg-pink-100), Purple (bg-purple-100). When "Default" selected, delete bgColor key from tile.

**Save:** `PATCH /api/v1/components/:id` with `{ bentoConfig: config }`.

---

## Screen 6 — Component Instances

**Route:** `/component-instances`

**State:** `search`, `page`, `showCreate`, `masterComponentId` filter

**API:** `GET /api/v1/component-instances?search=&masterComponentId=&page=&pageSize=20`

**Create dialog:**
- Master Component select (fetches `/api/v1/components?pageSize=100`)
- Tags: inline tag input — type tag name, press Enter or comma to add; × to remove each tag
- Tags stored as `string[]`
- On create: `POST /api/v1/component-instances` → invalidate list query

**Table columns:** Name, Master Component (link), Tags (badge list), Created, Actions (Edit ghost button)

---

## Screen 7 — Component Pools

**Route:** `/component-pools`

**Create dialog:** name + description inputs. On success: navigate to `/component-pools/:id`.

**Pool Detail route:** `/component-pools/:poolId`

**State:**
```ts
const [showAddDialog, setShowAddDialog] = useState(false)
```

**API calls:**
```ts
// Pool details
useQuery({ queryKey: ['component-pools', poolId],
  queryFn: () => apiClient.get(`/api/v1/component-pools/${poolId}`) })

// Pool items (ordered)
useQuery({ queryKey: ['component-pools', poolId, 'items'],
  queryFn: () => apiClient.get(`/api/v1/component-pools/${poolId}/items`) })

// All instances for picker
useQuery({ queryKey: ['component-instances', { pageSize: 100 }],
  queryFn: () => apiClient.get('/api/v1/component-instances?pageSize=100') })
```

**Reorder mutation:**
```ts
useMutation({
  mutationFn: (orderedIds: string[]) =>
    apiClient.patch(`/api/v1/component-pools/${poolId}/items/reorder`, { orderedIds }),
  onSuccess: () => qc.invalidateQueries({ queryKey: ['component-pools', poolId, 'items'] })
})
```

**Move item logic:**
```ts
function moveItem(fromIdx: number, toIdx: number) {
  const ids = poolItems.map(i => i.id)
  const moved = ids.splice(fromIdx, 1)[0]!
  ids.splice(toIdx, 0, moved)
  reorderMutation.mutate(ids)
}
```

**Pool items list:** each row shows component instance name + master component badge + ↑↓ move buttons + remove button. ↑ button disabled at index 0. ↓ button disabled at last index.

**Add item dialog:** multi-select from instances not already in pool. "Add Selected" button.

---

## Screen 8 — Content Objects List

**Route:** `/content`

**State:** `search`, `type` filter, `page`, `showCreate`

**Content types enum:** `ARTICLE | VIDEO | BANNER | PRODUCT | PROMO | GENERIC`

**API:** `GET /api/v1/content?search=&type=&page=&pageSize=20`

**Create dialog fields:** title (required), type select (required), locale select (default 'en-US').

**Table:** Title, Type badge, Status (Published/Draft), Locale count, Updated at, Actions.

---

## Screen 9 — Content Object Detail

**Route:** `/content/:contentId`

**State:**
```ts
const [fields, setFields] = useState<Record<string, string> | null>(null)
const [isDirty, setIsDirty] = useState(false)
const [activeLocale, setActiveLocale] = useState('en-US')
```

**Tabs:** Fields | Locales | Versions

**Fields tab logic:**
- `fields` is a key-value map
- Render as a list of rows: [key input (text)] [value textarea] [remove × button]
- "Add Field" button appends `{ '': '' }` row
- Editing key or value marks isDirty=true
- Save: `PATCH /api/v1/content/:id` with `{ fields }`

**Locales tab logic:**
- Fetch locales list: `GET /api/v1/content/:id/locales`
- Each locale rendered as a sub-tab
- Per locale: same field editor + Translation Status select
  - Statuses: PENDING (gray) | IN_PROGRESS (blue) | COMPLETE (green) | NEEDS_REVIEW (amber)
- Save locale: `PUT /api/v1/content/:id/locales/:locale`

**Versions tab:**
- List of versions with version number, created by, timestamp
- Restore button (not shown for current version)
- Restore: `POST /api/v1/content/:id/versions/:version/restore`
- After restore: invalidate query, reset fields state to null so it re-initializes

---

## Screen 10 — Channels

**Route:** `/channels`

**State:** `showCreate`, `editTarget: Channel | null`

**Channel type:**
```ts
interface Channel {
  id: string
  name: string
  slug: string
  description?: string
  createdAt: string
}
```

**Create/Edit Dialog:**
- Name input (required)
- Slug input: auto-generated from name on create, disabled (read-only) on edit
- Description textarea (optional)
- On submit: POST (create) or PATCH (edit) to `/api/v1/channels`

**Table:** Name, Slug (monospace), Description (truncated 60 chars), Created, Actions (Edit button).

---

## Screen 11 — Pages List

**Route:** `/pages`

**State:** `search`, `channelId` filter, `page`, `showCreate`

**Create dialog:**
- Page name (required)
- Slug (required, auto-generated, editable)
- Channel select — fetches `GET /api/v1/channels?pageSize=100`
- On success: navigate to `/pages/:id`

**Table:** Name, Slug, Channel (badge), Published (✓ or —), Zones count, Actions (Edit → page builder, Config → page config).

---

## Screen 12 — Page Builder

**Route:** `/pages/:pageId`

**API:** `GET /api/v1/pages/:id` (includes nested zones → slots → subSlots)

**Layout:**
- PageHeader: page name + `/{slug} · {channel.name}`. Actions: Back, Slot Config button (→ `/pages/:id/config`)
- Published badge (green) or Draft badge (gray)
- Zones list: each zone is a bordered card
  - Zone name heading (font-medium)
  - Slots inside: each slot is a row showing slot name + subSlot count badge
  - SubSlots: indented rows with `↳` prefix in muted text

**No drag-and-drop required.** Display only (read-only tree view). Editing zones/slots is done via API.

---

## Screen 13 — Page Config

**Route:** `/pages/:pageId/config`

**API calls:**
```ts
// Page config layers
useQuery({ queryKey: ['page-config', pageId],
  queryFn: () => apiClient.get(`/api/v1/page-configurations?pageId=${pageId}`) })

// Diff between two configs
// Triggered manually by user selecting two layers and clicking "Compare"
apiClient.get(`/api/v1/page-configurations/diff?from=${fromId}&to=${toId}`)
```

**State:**
```ts
const [selectedFromId, setSelectedFromId] = useState<string | null>(null)
const [selectedToId, setSelectedToId] = useState<string | null>(null)
const [diffResult, setDiffResult] = useState<DiffResult | null>(null)
const [diffLoading, setDiffLoading] = useState(false)
```

**Left panel — Config Layers:**
- List of PageConfiguration rows sorted by priority
- Each row: campaign name (or "Baseline") + priority badge + slot count
- Clicking a layer row selects it as "from" (first click) or "to" (second click)
- Selected rows highlighted

**Right panel — Slot Configs:**
- Shows slot configurations for the selected layer
- Each slot row: slot name + experience name assigned

**Diff panel (shows when both from and to are selected):**
- "Compare" button triggers API call
- Diff result rendered as a list of changes:
  - Added (not in from, in to): green background row with `+` prefix
  - Removed (in from, not in to): red background row with `-` prefix
  - Modified (in both, different experience): amber background row with `~` prefix
  - Unchanged: white row, no prefix (can be toggled hidden)

---

## Screen 14 — Asset Library (DAM)

**Route:** `/dam`

**State:**
```ts
const [search, setSearch] = useState('')
const [type, setType] = useState<string>('')
const [showUpload, setShowUpload] = useState(false)
const [page, setPage] = useState(1)
```

**API:** `GET /api/v1/assets?search=&type=&page=&pageSize=24`

**Upload flow:**
1. User opens dialog, selects or drops file
2. On file select: `POST /api/v1/assets/upload-url` with `{ filename, contentType: file.type }`
   → returns `{ uploadUrl: string, assetId: string }`
3. PUT file directly to `uploadUrl` via XHR (not axios, to get progress events):
   ```ts
   const xhr = new XMLHttpRequest()
   xhr.upload.onprogress = e => {
     if (e.lengthComputable) setProgress(Math.round(e.loaded / e.total * 100))
   }
   xhr.onload = () => xhr.status < 300 ? resolve() : reject(new Error(`${xhr.status}`))
   xhr.open('PUT', uploadUrl)
   xhr.setRequestHeader('Content-Type', file.type)
   xhr.send(file)
   ```
4. On success: `POST /api/v1/assets/:assetId/confirm` → invalidate assets query, close dialog

**Upload dialog states:**
- Idle: dashed border drop zone "Drag & drop a file or click to browse" + hidden `<input type="file">`
- File selected: filename + size displayed + "Upload" button enabled
- Uploading: progress bar (blue fill, animated width = progress%), percentage text, cancel button
- Success: green checkmark + "Upload complete" + "Done" button
- Error: red border on zone + error message + "Try again" button

**Asset grid (4 columns):**
- Image assets: thumbnail via `<img src={asset.thumbnailUrl}>`
- Non-image: file type icon (PDF icon, video icon, etc.)
- Card: filename (truncated) + formatted file size + type badge
- Hover overlay: semi-transparent dark overlay with "Copy URL" icon button + "Delete" icon button
- Copy URL: `navigator.clipboard.writeText(asset.url)` → show "Copied!" tooltip for 2s
- Delete: confirm dialog → `DELETE /api/v1/assets/:id` → invalidate query

---

## Screen 15 — Targeting Rules

**Route:** `/targeting`

**State:** `search`, `page`, `showDialog`, `editing: TargetingRule | null`

**ConditionNode types:**
```ts
type Operator = 'AND' | 'OR' | 'NOT'
type ConditionOperator = 'eq' | 'neq' | 'gt' | 'gte' | 'lt' | 'lte' | 'contains' | 'startsWith' | 'in'

interface LeafNode {
  type: 'leaf'
  attribute: string
  operator: ConditionOperator
  value: string
}
interface BranchNode {
  type: 'branch'
  operator: Operator
  children: ConditionNode[]
}
type ConditionNode = LeafNode | BranchNode
```

**ConditionBuilder component (recursive):**

Props: `{ node, onChange, onRemove?, depth? }`

If `node.type === 'leaf'`:
```
[Attribute select ▾] [Operator select ▾] [Value input] [× remove]
```
- Attribute options: `user.country`, `user.age`, `user.segment`, `device.type`, `device.os`, `page.url`, `campaign.priority`, `time.hour`, `time.dayOfWeek`
- Operator options depend on attribute type (text → eq/neq/contains/startsWith, number → eq/neq/gt/gte/lt/lte, set → in)

If `node.type === 'branch'`:
```
[AND/OR/NOT ▾] [+ Condition] [+ Group] [↕ collapse] [× remove if not root]
  └─ [child 1]
  └─ [child 2]
  └─ ...
```
- Collapse/expand local boolean state
- `removeChild(i)`: only enabled when `node.children.length > 1`
- `addChild('leaf')`: append a new leaf node
- `addChild('branch')`: append a new AND branch with one leaf child
- `updateChild(i, updated)`: replace child at index i
- `onRemove` prop uses conditional spread: `{...(canRemove ? { onRemove: () => remove() } : {})}`
- Depth indentation: `marginLeft: depth * 16` px, left border `border-l border-gray-200 pl-2`

**Rule Dialog:**
- Name input + Scope select (GLOBAL / CAMPAIGN / EXPERIENCE)
- Condition tree initialized to `{ type: 'branch', operator: 'AND', children: [newLeaf()] }`
- On edit: clone existing `conditionTree`
- Validation: all leaf nodes must have non-empty attribute + value
- Submit: POST (create) or PATCH (edit) → invalidate list

**Table:** Name, Scope badge, Conditions (leaf node count), Created, Actions: Edit button + Simulate button → navigate to `/targeting/:id/simulate`

---

## Screen 16 — Targeting Simulator

**Route:** `/targeting/:ruleId/simulate`

**State:**
```ts
const [contextEntries, setContextEntries] = useState<Array<{key: string, value: string}>>([
  { key: '', value: '' }
])
const [result, setResult] = useState<{ matched: boolean; matchedConditions: string[]; failedCondition?: string } | null>(null)
const [simLoading, setSimLoading] = useState(false)
const [simError, setSimError] = useState<string | null>(null)
```

**Layout:** 2 columns (1fr 1fr), gap 24px.

**Left — Context Builder:**
- "Context Variables" heading
- Rows: `[key input (with datalist)] [= label] [value input] [× button]`
  - datalist suggestions: `user.country`, `user.age`, `user.segment`, `device.type`, `device.os`, `page.url`, `time.hour`, `time.dayOfWeek`
- "+ Add Variable" button: appends `{ key: '', value: '' }`
- Remove button: disabled if only 1 entry
- "Run Simulation" primary button (disabled if any key is empty, disabled while loading)

**Simulate handler:**
```ts
async function runSimulation() {
  setSimLoading(true)
  setSimError(null)
  const context = Object.fromEntries(contextEntries.filter(e => e.key).map(e => [e.key, e.value]))
  try {
    const res = await apiClient.post(`/api/v1/targeting-rules/${ruleId}/simulate`, { context })
    setResult(res.data.data)
  } catch (e) {
    setSimError('Simulation failed. Check your context values.')
  } finally {
    setSimLoading(false)
  }
}
```

**Right — Result Panel:**
- Null state: dashed border card, muted text "Run a simulation to see results"
- Loading: centered spinner
- Match (`result.matched === true`):
  - Large `CheckCircle` icon (48px, green)
  - "Rule matches" heading (green)
  - "Matched conditions:" label + list of matched condition descriptions
- No match (`result.matched === false`):
  - Large `XCircle` icon (48px, red)
  - "Rule does not match" heading (red)
  - "Failed at:" label + `result.failedCondition` highlighted in amber bg
- Error: red border, error message

---

## Screen 17 — Experiences List

**Route:** `/experiences`

**State:** `search`, `page`, `showCreate`

**Create dialog:**
- Name input (required)
- Component Instance select (fetches `/api/v1/component-instances?pageSize=100`)
- Content Object select (fetches `/api/v1/content?pageSize=100`)
- A/B Test Key input (optional, for external experiment integration)
- Priority number input (default 0)
- On create: `POST /api/v1/experiences` → navigate to `/experiences/:id`

**Table:** Name, Component (link), Content (link), A/B Key (monospace), Priority, Actions (click row → detail).

---

## Screen 18 — Experience Detail

**Route:** `/experiences/:experienceId`

**State:** `activeTab`, `isDirty` + form fields for settings

**Tabs:** Settings | Targeting Rules

**Settings tab:**
- Name input
- Component Instance select
- Content Object select
- A/B Test Key input
- Priority number input (min 0)
- Start Date + End Date (datetime-local inputs, optional)
- Save on dirty

**Targeting Rules tab:**

Left side — Attached rules:
```ts
useQuery({ queryKey: ['experiences', experienceId, 'rules'],
  queryFn: () => apiClient.get(`/api/v1/experiences/${experienceId}/targeting-rules`) })
```
- Each attached rule: name + scope badge + "Detach" ghost button
- Detach: `DELETE /api/v1/experiences/:id/targeting-rules/:ruleId`

Right side — Available rules:
```ts
useQuery({ queryKey: ['targeting-rules', { pageSize: 100 }],
  queryFn: () => apiClient.get('/api/v1/targeting-rules?pageSize=100') })
```
- Filtered to exclude already-attached rule IDs
- Each available rule: name + scope badge + "Attach" ghost button
- Attach: `POST /api/v1/experiences/:id/targeting-rules` with `{ ruleId }`

---

## Screen 19 — Campaigns List

**Route:** `/campaigns`

**State:** `search`, `status: CampaignStatus | ''`, `page`, `showCreate`

**CampaignStatus enum:** `DRAFT | REVIEW | SCHEDULED | PREVIEW | PRODUCTION | ARCHIVED`

**Status badge colors:**
```ts
const STATUS_COLORS: Record<string, string> = {
  DRAFT: 'secondary',
  REVIEW: 'blue',
  SCHEDULED: 'warning',
  PREVIEW: 'purple',
  PRODUCTION: 'success',
  ARCHIVED: 'secondary'
}
```

**Create dialog:**
- Name input (required)
- Description textarea (optional)
- Priority number (required, min 0, default 0)
- Start Date + End Date (date inputs, optional)
- On success: navigate to `/campaigns/:id`

**Table:** Name, Status badge, Priority, Start, End, Channels (first 2 badges + "+N more"), Actions.

---

## Screen 20 — Campaign Detail

**Route:** `/campaigns/:campaignId`

**State:**
```ts
const [transitionComment, setTransitionComment] = useState('')
const [transitionError, setTransitionError] = useState<string | null>(null)
const [activeTab, setActiveTab] = useState('overview')
```

**API:** `GET /api/v1/campaigns/:id` — returns campaign with channels, pages, approvalSteps

**Status transition map:**
```ts
const TRANSITIONS = {
  DRAFT:      [{ label: 'Submit for Review', endpoint: 'submit' }],
  REVIEW:     [{ label: 'Schedule', endpoint: 'schedule' },
               { label: 'Revert to Draft', endpoint: 'revert' }],
  SCHEDULED:  [{ label: 'Move to Preview', endpoint: 'preview' },
               { label: 'Revert to Draft', endpoint: 'revert' }],
  PREVIEW:    [{ label: 'Publish', endpoint: 'publish' },
               { label: 'Revert to Draft', endpoint: 'revert' }],
  PRODUCTION: [{ label: 'Archive', endpoint: 'archive' }],
  ARCHIVED:   []
}
```

**Transition mutation:**
```ts
useMutation({
  mutationFn: ({ endpoint }: { endpoint: string }) =>
    apiClient.post(`/api/v1/campaigns/${campaignId}/${endpoint}`,
      transitionComment ? { comment: transitionComment } : {}),
  onSuccess: () => {
    qc.invalidateQueries({ queryKey: ['campaigns', campaignId] })
    qc.invalidateQueries({ queryKey: ['campaigns'] })
    setTransitionComment('')
    setTransitionError(null)
  },
  onError: e => setTransitionError(e.message)
})
```

**Left side — Tabs:**

*Overview tab:*
- Info grid: Start, End, Priority, Created (2×2)
- Channels: badge list from `campaign.channels`
- Pages: rows with page name + monospace slug

*Approvals tab:*
```ts
useQuery({ queryKey: ['campaigns', campaignId, 'approvals'],
  queryFn: () => apiClient.get(`/api/v1/campaigns/${campaignId}/approvals`) })
```
Approve/Reject mutation:
```ts
mutationFn: ({ stepId, decision }: { stepId: string, decision: 'APPROVED' | 'REJECTED' }) =>
  apiClient.post(`/api/v1/campaigns/${campaignId}/approvals/${stepId}/decide`, { decision })
```

*Collisions tab:*
```ts
useQuery({ queryKey: ['campaigns', campaignId, 'collisions'],
  queryFn: () => apiClient.get(`/api/v1/campaigns/${campaignId}/collisions`) })
```
Check collision mutation: `POST /api/v1/campaigns/:id/check-collisions`
Each collision row: amber bg, AlertTriangle icon, "Conflicts with {conflictsWith.slice(0,8)}", slot info + resolution strategy.

*Comments tab:*
```ts
useQuery({ queryKey: ['campaigns', campaignId, 'comments'],
  queryFn: () => apiClient.get(`/api/v1/campaigns/${campaignId}/comments`) })
```
Top: textarea + Send button. `POST /api/v1/campaigns/:id/comments` with `{ body: newComment }`.

Comment component (recursive for replies):
- Body text + author + timestamp
- "Reply" button: toggles reply textarea inline
- "Resolve" button: `PATCH /api/v1/campaigns/:id/comments/:commentId/resolve` — dims the comment (opacity-50)
- Replies: indented with left border, show author + timestamp + body (no further nesting)
- Reply mutation: `POST /api/v1/campaigns/:id/comments` with `{ body, parentId: comment.id }`

**Right side — Workflow panel:**
- "Workflow" heading
- If no transitions: "No transitions available." in muted text
- If transitions exist:
  - Optional comment textarea ("Optional comment…")
  - Error text (red, small) when `transitionError !== null`
  - Stacked transition buttons (one per transition), full width
  - All buttons disabled while `transitionMutation.isPending`

---

## Screen 21 — Experiment Mappings

**Route:** `/experiments`

**ExperimentMapping type:**
```ts
interface ExperimentMapping {
  id: string
  experimentKey: string
  variantKey: string
  experienceId: string
  experience: { id: string; name: string }
  isActive: boolean
  createdAt: string
}
```

**State:** `showCreate`, `editTarget`

**Create/Edit dialog:**
- Experiment Key input (required) — matches external A/B test experiment identifier
- Variant Key input (required) — matches the variant identifier within the experiment
- Experience select (fetches `/api/v1/experiences?pageSize=100`)
- Active checkbox (default true)

**Table:** Experiment Key (monospace), Variant Key (monospace), Experience (link name), Active (toggle), Actions.

**Active toggle:** `PATCH /api/v1/experimentation/mappings/:id` with `{ isActive: !current }` — optimistic update.

**Info banner at top of page:**
> Experiment mappings connect external A/B test variants to CMS experiences. The delivery API reads the `x-experiment-key` and `x-variant-key` request headers and resolves the matching experience.

---

## Screen 22 — Users

**Route:** `/settings/users`

**Role enum:** `PLATFORM_ADMIN | CONTENT_AUTHOR | CAMPAIGN_MANAGER | DEVELOPER | APPROVER | ANALYST`

**Role badge colors:**
```ts
{ PLATFORM_ADMIN: 'purple', CONTENT_AUTHOR: 'blue', CAMPAIGN_MANAGER: 'indigo',
  DEVELOPER: 'secondary', APPROVER: 'warning', ANALYST: 'teal' }
```

**Invite dialog:** Email input + Role select. `POST /api/v1/users/invite`.

**Table:** Avatar initials (2-char circle badge in primary color), Display Name, Email, Role badge, Status (Active/Inactive), Actions (Edit role, Deactivate).

**Edit role dialog:** role select only. `PATCH /api/v1/users/:id`.

**Deactivate:** confirm dialog → `PATCH /api/v1/users/:id` with `{ isActive: false }`.

---

## Reusable Components

### DataTable
```tsx
interface Column<T> {
  key: string
  header: string
  cell: (row: T) => React.ReactNode
  className?: string
}

interface DataTableProps<T> {
  columns: Column<T>[]
  data: T[]
  keyFn: (row: T) => string
  loading?: boolean
  emptyMessage?: string
  onRowClick?: (row: T) => void
}
```
- Header: `bg-gray-50 text-xs font-medium text-gray-500 uppercase tracking-wide`
- Row: `border-b hover:bg-gray-50 transition-colors cursor-pointer` (if onRowClick)
- Loading: 5 skeleton rows with `animate-pulse bg-gray-200 rounded h-4` cells
- Empty: single cell colspan-all, centered muted text

### Pagination
```tsx
interface PaginationProps {
  page: number
  pageSize: number
  total: number
  onPageChange: (page: number) => void
}
```
- "Showing {start}–{end} of {total} results" left
- Previous / Next buttons right
- Previous disabled when `page === 1`
- Next disabled when `page * pageSize >= total`

### Toast (global)
- Stack at bottom-right, `z-50`
- Types: success (green left border), error (red left border), info (blue left border)
- Auto-dismiss after 4000ms
- Slide-in animation on appear, fade-out on dismiss
- API: `useToast()` hook → `toast.success('Saved')`, `toast.error('Failed')`
- Call `toast.success` in every mutation `onSuccess`, `toast.error` in every `onError`

### ConfirmDialog
```tsx
interface ConfirmDialogProps {
  open: boolean
  title: string
  description: string
  confirmLabel?: string  // default "Confirm"
  variant?: 'destructive' | 'default'
  onConfirm: () => void
  onCancel: () => void
}
```
Used for: delete operations, deactivate user, archive campaign, restore version.

### FilterBar
```tsx
// Horizontal flex row, gap-3, mb-4
// Left: Search Input with Search icon inside
// Right: any additional filters (Select, Toggle, etc.)
```

---

## Global Error Handling

Wrap the entire app in an ErrorBoundary. On unhandled errors: show centered card with "Something went wrong" + error message in monospace + "Reload" button.

For query errors: each page shows an inline error card when `isError === true`:
```tsx
{isError && (
  <div className="m-8 p-4 border border-red-200 bg-red-50 rounded-md text-sm text-red-700">
    Failed to load data. <button onClick={() => refetch()} className="underline">Retry</button>
  </div>
)}
```

---

## Form Validation Rules

All forms validate on submit. Show inline error below each field when validation fails.

| Field | Rule |
|-------|------|
| Name | Required, min 2 chars, max 120 chars |
| Slug | Required, `/^[a-z0-9-]+$/`, max 80 chars |
| Email | Required, valid email regex |
| Priority | Number, min 0, max 9999 |
| A/B Test Key | Optional, `/^[a-zA-Z0-9_-]+$/` if provided |
| Regex Pattern | Must be valid JS regex if provided (test with `new RegExp(value)`) |
| Date fields | End date must be after start date if both provided |

Error message style: `text-xs text-red-600 mt-1`.
Input error state: `border-red-500 focus:ring-red-500`.

---

## Loading & Skeleton States

Every data-fetching page must handle 3 states:

1. **Loading** (`isLoading === true`): show skeleton or spinner
2. **Error** (`isError === true`): show inline error with retry
3. **Empty** (`data.length === 0`): show empty state component

Page-level loading (detail pages): `<div className="p-8 text-sm text-muted-foreground">Loading…</div>`

Table loading: DataTable with `loading={true}` prop renders 5 shimmer rows.

Button loading: spinner icon (16px `animate-spin`) replaces button text, button disabled.

---

## Sample Mock Data

Use this data shape when previewing. All IDs are UUIDs.

```ts
const MOCK_CAMPAIGNS = [
  { id: '1a2b3c4d', name: 'Summer Sale 2025', status: 'PRODUCTION', priority: 10,
    startDate: '2025-06-01', endDate: '2025-08-31',
    channels: [{ channel: { id: 'c1', name: 'Web' } }, { channel: { id: 'c2', name: 'Mobile' } }] },
  { id: '2b3c4d5e', name: 'Back to School', status: 'REVIEW', priority: 8,
    startDate: '2025-08-15', endDate: '2025-09-15',
    channels: [{ channel: { id: 'c1', name: 'Web' } }] },
  { id: '3c4d5e6f', name: 'Holiday Preview', status: 'DRAFT', priority: 5,
    startDate: '2025-11-01', endDate: '2025-12-31', channels: [] },
]

const MOCK_COMPONENTS = [
  { id: 'comp1', name: 'Hero Banner', slug: 'hero-banner', currentVersion: 3,
    isActive: true, isDeprecated: false,
    attributeSchema: [
      { name: 'headline', dataType: 'text', required: true, isAuthorFillable: true },
      { name: 'subheadline', dataType: 'text', required: false, isAuthorFillable: true },
      { name: 'backgroundImage', dataType: 'image', required: true, isAuthorFillable: true },
      { name: 'ctaLabel', dataType: 'text', required: false, isAuthorFillable: true },
      { name: 'ctaUrl', dataType: 'url', required: false, isAuthorFillable: true },
    ]},
  { id: 'comp2', name: 'Product Carousel', slug: 'product-carousel', currentVersion: 1,
    isActive: true, isDeprecated: false, attributeSchema: [] },
]
```
