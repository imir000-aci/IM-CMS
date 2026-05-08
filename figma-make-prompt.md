# IM-CMS — Content Management System UI

## App Overview

IM-CMS is an enterprise content management platform for campaign authoring. It replaces Adobe Experience Manager. The product is used by 500+ concurrent content authors, campaign managers, and approvers. The UI is a desktop-first web app with a persistent left sidebar and a main content area.

---

## Design Language

**Style:** Clean, professional, data-dense enterprise SaaS. Similar to Linear, Vercel Dashboard, or Retool. No decorative elements. Monochrome base with accent colors for status and actions.

**Color Palette:**
- Background: `#ffffff` (light) / `#0a0a0a` (dark)
- Surface / card: `#f9fafb`
- Border: `#e5e7eb`
- Muted text: `#6b7280`
- Primary action: `#111827` (near-black button)
- Primary text: `#111827`
- Success green: `#16a34a`
- Warning amber: `#d97706`
- Destructive red: `#dc2626`
- Blue accent: `#2563eb`

**Typography:**
- Font: Inter (system fallback: -apple-system, sans-serif)
- Page title: 20px / 600 weight
- Section heading: 14px / 500 weight
- Body: 14px / 400 weight
- Muted label: 12px / 400 weight / `#6b7280`
- Monospace (IDs, slugs): `font-mono` 12px

**Spacing:** 8px base unit. Padding inside cards: 16px. Page padding: 32px. Gap between cards: 16px.

**Border Radius:** 6px for cards/inputs, 4px for badges, 8px for dialogs.

**Shadows:** Subtle — `0 1px 3px rgba(0,0,0,0.08)` for cards.

---

## Layout Shell

### Sidebar (240px wide, full height, fixed)

Left-side navigation with:
- Top: App logo "IM-CMS" + org name in small muted text
- Nav sections with section labels in uppercase 11px muted text
- Nav items: 14px, icon (16px) + label, 36px tall, 8px horizontal padding
- Active item: light primary background tint, primary text color
- Hover: subtle gray background
- Bottom: User avatar + name + logout icon

**Nav items in order:**
1. Dashboard (grid icon)
2. — *Content* section label —
3. Components (puzzle piece icon)
4. Component Instances (layers icon)
5. Component Pools (stack icon)
6. Content Objects (file-text icon)
7. — *Publishing* section label —
8. Channels (radio icon)
9. Pages (layout icon)
10. Assets / DAM (image icon)
11. — *Personalization* section label —
12. Targeting Rules (filter icon)
13. Experiences (sparkles icon)
14. Experiments (beaker icon)
15. — *Campaigns* section label —
16. Campaigns (megaphone icon)
17. — *Settings* section label —
18. Users (users icon)
19. Locales (globe icon)
20. SEO (search icon)

---

## Page Header Component

Appears at the top of every page, below which is the main content.

- Left: Page title (20px/600) + subtitle below it in muted 13px
- Right: Action buttons (outline secondary + filled primary)
- Bottom border separates header from content
- Height: ~64px
- Horizontal padding: 32px

---

## Screens

---

### 1. Dashboard

**URL:** `/dashboard`

Three-column grid layout (1fr 1fr 1fr) at top, then two-column below.

**Top row — Stat Cards (4 cards in a row):**
Each card: white surface, 1px border, 16px padding
- "Active Campaigns" — large number (e.g. 12) + small delta badge "+3 this week" in green
- "Awaiting Review" — number with amber badge
- "Components" — total count
- "Live Pages" — total count

**Middle section — Two columns:**

Left (2/3 width): **Upcoming Campaigns** table
- Columns: Name, Status badge, Start, End, Priority
- Status badges: DRAFT (gray), REVIEW (blue), SCHEDULED (amber), PREVIEW (purple), PRODUCTION (green), ARCHIVED (muted)
- Rows are clickable, hover state

Right (1/3 width): **Action Required** panel
- Card with title "Action Required"
- List of items needing approval — each item shows campaign name, type of action (e.g. "Approval pending"), and a small "Review" button

**Bottom section:** Calendar strip showing campaigns on a weekly timeline. Colored bars per campaign status spanning their date range.

---

### 2. Component Library

**URL:** `/components`

**Page header:** "Component Library" + "New Component" button (primary)

**Filter bar:** Search input (left) + "Active Only" toggle (right)

**Data table:**
- Columns: Name, Slug (monospace, muted), Attributes (number badge), Version (v1, v2…), Status badge (Active/Deprecated), Created date, Actions column
- Row actions: "Edit" ghost button → navigates to detail page
- Empty state: dashed border box, centered text "No components yet. Create your first master component."

---

### 3. Component Detail

**URL:** `/components/:id`

**Page header:** Component name + "v2 · hero-banner" subtitle. Actions: Back (outline), Bento Layout (outline), Save Changes (primary, only visible when dirty)

**Tabs:** Attribute Schema | Metadata | Version History

**Attribute Schema tab:**
- Count label "6 attributes defined" + "Add Attribute" button (outline, right)
- List of attribute rows, each in a bordered card:
  - Row: [Name input] [Data type select] [Required checkbox] [Author checkbox] [Expand ›] [Delete icon]
  - Expanded section (accordion): Max Length input, Regex Pattern input, Allowed Values (comma-separated) input
  - Data types in select: text, richtext, number, boolean, url, image, video, date, json, reference, select

**Metadata tab:**
- Name field
- Description field
- Status badges: Active (green) / Deprecated (amber) / Inactive (gray)

**Version History tab:**
- List rows: Version number + created by username + timestamp + "Restore" button (only on non-current versions)
- Current version row has no restore button, highlighted subtly

---

### 4. Bento Layout Editor

**URL:** `/components/:id/bento`

**Page header:** "HeroBanner — Bento Layout" + Back + Save Layout buttons

**Left 2/3 — Grid editor:**
- Top controls: Columns spinner (1–12) + Rows spinner (1–12) + "Add Tile" button
- Visual CSS grid rendered as a bordered container with colored tile cells
- Each tile is a button with label centered, colored background, highlighted border when selected

**Right 1/3 — Tile properties panel:**
- When tile selected: Label input, Column/Row/ColSpan/RowSpan number inputs (2×2 grid), Background color select
- When no tile: dashed border, "Click a tile to edit its properties."
- Below panel: All Tiles list — clickable text rows showing position and span

---

### 5. Campaign List

**URL:** `/campaigns`

**Page header:** "Campaigns" + "New Campaign" button

**Filter bar:** Search input + Status filter select (All / DRAFT / REVIEW / SCHEDULED / PREVIEW / PRODUCTION / ARCHIVED)

**Data table:**
- Columns: Name, Status (colored badge), Priority (number), Start, End, Channels (badges), Actions
- Row click → navigate to detail
- Status badge colors match dashboard

---

### 6. Campaign Detail

**URL:** `/campaigns/:id`

**Page header:** Campaign name + "Priority 10 · Travel Campaign" subtitle. Actions: Back, Status badge display

**Two-column layout (2/3 + 1/3):**

Left — **Tabs:** Overview | Approvals | Collisions | Comments

*Overview tab:*
- 2×2 info grid: Start date, End date, Priority, Created
- Channels section: badge list of attached channels
- Pages section: list rows of attached pages with slug

*Approvals tab:*
- List of approval steps: approver name + step number + status badge (PENDING/APPROVED/REJECTED)
- PENDING steps show Approve (primary) + Reject (outline) buttons

*Collisions tab:*
- Count label + "Run Collision Check" button
- Collision rows: amber background, warning triangle icon, "Conflicts with campaign [id]", slot info + resolution

*Comments tab:*
- Textarea + Send button at top
- Threaded comment list: author name + timestamp + body text
- Reply button + Resolve button per comment
- Replies indented with left border

Right — **Workflow panel:**
- "Workflow" heading
- Optional comment textarea
- Transition buttons stacked: "Submit for Review", "Schedule", "Revert to Draft" etc depending on current status

---

### 7. Content Objects

**URL:** `/content`

**Page header:** "Content Objects" + "New Content Object" button

**Filter bar:** Search + Content Type filter (ARTICLE / VIDEO / BANNER / PRODUCT / etc.)

**Data table:**
- Columns: Title, Type (badge), Status (Published/Draft), Locale count, Updated, Actions

---

### 8. Content Object Detail

**URL:** `/content/:id`

**Tabs:** Fields | Locales | Versions

*Fields tab:*
- Dynamic key-value rows: [Key input] [Value input/richtext] [Remove button]
- "Add Field" button at bottom
- Save button in header when dirty

*Locales tab:*
- Tab list of available locales (en-US, es-MX, fr-CA…)
- Per locale: same field editor + Translation Status select (PENDING / IN_PROGRESS / COMPLETE / NEEDS_REVIEW)

*Versions tab:*
- Version list rows with timestamp + field count + Restore button

---

### 9. Asset Library (DAM)

**URL:** `/dam`

**Page header:** "Asset Library" + "Upload Asset" button

**Filter bar:** Search + Type filter (IMAGE / VIDEO / PDF / DOCUMENT)

**Grid layout (4 columns):**
- Asset cards: thumbnail image (or file type icon), filename below, file size in muted text, type badge
- Hover state reveals "Copy URL" and "Delete" actions

**Upload dialog:**
- Drag-and-drop zone with dashed border: "Drag & drop a file or click to browse"
- File name + size display after selection
- Progress bar (blue fill, animated) during upload
- Error state: red border + error message

---

### 10. Targeting Rules

**URL:** `/targeting`

**Page header:** "Targeting Rules" + "New Rule" button

**Data table:**
- Columns: Name, Scope badge (GLOBAL/CAMPAIGN/EXPERIENCE), Conditions count, Created, Actions (Edit + Simulate buttons)

**Rule Editor Dialog:**
- Name input + Scope select at top
- Recursive condition builder:
  - Branch node: AND/OR/NOT operator select + expand/collapse toggle + Add Condition / Add Group buttons
  - Leaf node: [Attribute select] [Operator select] [Value input] [Remove button]
  - Indented with left border lines showing tree depth
  - Max 4 levels of nesting shown

---

### 11. Targeting Simulator

**URL:** `/targeting/:id/simulate`

**Page header:** Rule name + "Simulate" subtitle. Back button.

**Two-column layout:**

Left — Context Builder:
- "Context" heading
- Key-value rows: [Key input with datalist suggestions] [Value input] [Remove button]
- "Add Context Field" button
- "Run Simulation" primary button

Right — Result panel:
- Empty state: "Run a simulation to see results."
- Match result: large green check icon + "Rule matches" heading + matched conditions listed
- No-match result: red X icon + "Rule does not match" + first failed condition highlighted

---

### 12. Experiences

**URL:** `/experiences`

**Data table:**
- Columns: Name, Component Instance, Content Object, A/B Test Key (monospace), Priority, Status, Actions

**Experience Detail** `/experiences/:id`:
- **Tabs:** Settings | Targeting Rules
- Settings: Name, component instance select, content object select, A/B test key, priority, start/end dates
- Targeting Rules tab: attached rules list with detach button + available rules selector with attach button

---

### 13. Pages

**URL:** `/pages`

**Data table:**
- Columns: Name, Slug (monospace), Channel badge, Published status, Zone count, Actions

**Page Builder** `/pages/:id`:
- Header: page name + slug + channel
- Zone list: bordered cards, each with zone name heading
  - Slot rows inside: indented, shows slot name + sub-slot count
  - Sub-slot rows: further indented, muted text with ↳ prefix

**Page Config** `/pages/:id/config`:
- Configuration layers panel: list of PageConfiguration rows (baseline + per-campaign)
- Per-layer: slot config list showing which experience fills each slot
- Diff view: side-by-side or inline showing added (green background), removed (red background), modified (amber background) slot assignments

---

### 14. Users Settings

**URL:** `/settings/users`

**Data table:**
- Columns: Avatar (initials), Display Name, Email, Role badge (color-coded), Status, Actions

**Role badge colors:**
- PLATFORM_ADMIN: purple
- CONTENT_AUTHOR: blue
- CAMPAIGN_MANAGER: indigo
- DEVELOPER: gray
- APPROVER: amber
- ANALYST: teal

---

## Reusable Components

### Badges
Small pill labels, 11px uppercase, rounded-full.
- `success`: green background/text
- `warning`: amber background/text
- `secondary`: gray background/text
- `destructive`: red background/text
- `outline`: border only

### Buttons
- `primary`: dark fill (#111827), white text, hover darkens
- `outline`: transparent fill, border, dark text
- `ghost`: no border/fill, hover shows gray bg
- `destructive`: red fill
- Sizes: `sm` (28px h, 12px text), `default` (36px h, 14px text), `lg` (44px h)
- Icon buttons: square, same height

### Data Table
- Header row: muted background, 12px uppercase labels, sortable columns show sort arrows
- Body rows: 44px height, hover shows subtle gray bg
- Row click navigates (cursor: pointer)
- Loading state: skeleton rows (animated gray shimmer)
- Empty state: centered muted text in body area

### Dialog / Modal
- Centered overlay, 480px wide (sm) or 640px (md)
- Header: title + optional description in muted text
- Footer: Cancel (outline) + Confirm (primary) buttons right-aligned
- Close X button top-right

### Pagination
- "Showing X–Y of Z" label (left)
- Previous / Next buttons with arrow icons (right)
- Disabled state when at first/last page

### Tabs
- Underline style: active tab has bottom border in primary color
- Tab list at top, content below with 24px top margin

### Select / Dropdown
- Trigger shows current value + chevron-down icon
- Dropdown panel: white, bordered, shadow, max-height 240px with scroll
- Items: 36px height, hover gray bg, selected item shows checkmark

### Input
- 36px height, 1px border, 6px radius
- Focus: 2px primary color ring
- Error: red border + red helper text below
- Placeholder: muted gray

### Textarea
- Same styling as Input but variable height
- Resize: vertical only

---

## Empty States

All empty states use the same pattern:
- Dashed border box
- Centered vertically
- Icon (48px, muted gray)
- Heading "No [items] yet."
- Subtext with action hint
- Optional CTA button

---

## Loading States

- Page-level: single line centered muted text "Loading…"
- Table: 5 skeleton rows with shimmer animation
- Button: spinner icon replaces label, button disabled

---

## Key Interactions

1. **Save pattern:** "Save Changes" button only appears in header when form is dirty (isDirty state). Disappears after successful save.
2. **Confirm destructive actions:** Delete/Archive operations open a confirmation dialog before proceeding.
3. **Inline validation:** Required fields show red border on blur if empty; error text appears below.
4. **Toast notifications:** Success/error toasts appear bottom-right, auto-dismiss after 4 seconds.
5. **Navigation:** Sidebar nav item for current route is highlighted. Breadcrumb is not used — Back button in page header serves that purpose.
