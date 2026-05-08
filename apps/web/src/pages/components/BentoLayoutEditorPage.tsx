import React, { useState } from 'react'
import { useParams, useNavigate } from '@tanstack/react-router'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { ArrowLeft, Plus, Trash2 } from 'lucide-react'
import { PageHeader } from '../../components/PageHeader'
import { Button } from '../../components/ui/button'
import { Input } from '../../components/ui/input'
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '../../components/ui/select'
import { componentsApi, type MasterComponent } from '../../lib/api'

// Bento config is a free-form layout descriptor: an array of "tiles" each with
// a grid position, span, and display settings.
interface BentoTile {
  id: string
  label: string
  col: number
  row: number
  colSpan: number
  rowSpan: number
  bgColor?: string
}

interface BentoConfig {
  cols: number
  rows: number
  tiles: BentoTile[]
}

const COLORS = [
  { label: 'Default', value: '' },
  { label: 'Blue', value: 'bg-blue-100' },
  { label: 'Green', value: 'bg-green-100' },
  { label: 'Yellow', value: 'bg-yellow-100' },
  { label: 'Pink', value: 'bg-pink-100' },
  { label: 'Purple', value: 'bg-purple-100' },
]

function newTile(existing: BentoTile[]): BentoTile {
  return {
    id: crypto.randomUUID(),
    label: `Tile ${existing.length + 1}`,
    col: 1, row: 1, colSpan: 1, rowSpan: 1,
  }
}

function BentoGrid({ config, selected, onSelect }: { config: BentoConfig; selected: string | null; onSelect: (id: string) => void }) {
  const gridStyle: React.CSSProperties = {
    display: 'grid',
    gridTemplateColumns: `repeat(${config.cols}, 1fr)`,
    gridTemplateRows: `repeat(${config.rows}, 80px)`,
    gap: '8px',
    position: 'relative',
  }

  return (
    <div className="border rounded-lg p-4 bg-muted/20">
      <div style={gridStyle}>
        {config.tiles.map(tile => (
          <button
            key={tile.id}
            style={{
              gridColumn: `${tile.col} / span ${tile.colSpan}`,
              gridRow: `${tile.row} / span ${tile.rowSpan}`,
            }}
            onClick={() => onSelect(tile.id)}
            className={`rounded-md border-2 p-2 text-sm font-medium transition-all flex items-center justify-center text-center
              ${tile.bgColor || 'bg-background'}
              ${selected === tile.id ? 'border-primary shadow-md' : 'border-border hover:border-primary/40'}
            `}
          >
            {tile.label}
          </button>
        ))}
      </div>
    </div>
  )
}

export function BentoLayoutEditorPage() {
  const { componentId } = useParams({ strict: false }) as { componentId: string }
  const navigate = useNavigate()
  const qc = useQueryClient()

  const { data, isLoading } = useQuery({
    queryKey: ['components', componentId],
    queryFn: () => componentsApi.get(componentId),
  })
  const component: MasterComponent | undefined = (data?.data as unknown as { data: MasterComponent })?.data

  const defaultConfig: BentoConfig = { cols: 3, rows: 3, tiles: [] }
  const [config, setConfig] = useState<BentoConfig | null>(null)
  const [selectedTileId, setSelectedTileId] = useState<string | null>(null)
  const [isDirty, setIsDirty] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)

  React.useEffect(() => {
    if (component && config === null) {
      setConfig((component.bentoConfig as BentoConfig) ?? defaultConfig)
    }
  }, [component, config])

  const saveMutation = useMutation({
    mutationFn: () => componentsApi.update(componentId, { bentoConfig: config }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['components', componentId] })
      setIsDirty(false)
      setSaveError(null)
    },
    onError: (e: unknown) => setSaveError((e as Error).message),
  })

  if (isLoading) return <div className="p-8 text-muted-foreground">Loading…</div>
  if (!component || !config) return <div className="p-8 text-muted-foreground">Component not found.</div>

  const selectedTile = config.tiles.find(t => t.id === selectedTileId) ?? null

  const updateConfig = (next: BentoConfig) => { setConfig(next); setIsDirty(true) }

  const updateTile = (id: string, updates: Partial<BentoTile>) => {
    updateConfig({
      ...config,
      tiles: config.tiles.map(t => t.id === id ? { ...t, ...updates } : t),
    })
  }

  const addTile = () => {
    const tile = newTile(config.tiles)
    updateConfig({ ...config, tiles: [...config.tiles, tile] })
    setSelectedTileId(tile.id)
  }

  const removeTile = (id: string) => {
    updateConfig({ ...config, tiles: config.tiles.filter(t => t.id !== id) })
    if (selectedTileId === id) setSelectedTileId(null)
  }

  return (
    <div>
      <PageHeader
        title={`${component.name} — Bento Layout`}
        description="Design the bento grid layout for this component type"
        actions={
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => void navigate({ to: '/components/$componentId', params: { componentId } })}>
              <ArrowLeft className="h-4 w-4" /> Back
            </Button>
            {isDirty && (
              <Button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending}>
                {saveMutation.isPending ? 'Saving…' : 'Save Layout'}
              </Button>
            )}
          </div>
        }
      />

      <div className="p-8 grid grid-cols-3 gap-6">
        {/* Grid editor */}
        <div className="col-span-2 space-y-4">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <label className="text-sm text-muted-foreground">Columns</label>
              <Input
                type="number"
                className="w-16"
                min={1}
                max={12}
                value={config.cols}
                onChange={e => updateConfig({ ...config, cols: Math.max(1, Math.min(12, Number(e.target.value))) })}
              />
            </div>
            <div className="flex items-center gap-2">
              <label className="text-sm text-muted-foreground">Rows</label>
              <Input
                type="number"
                className="w-16"
                min={1}
                max={12}
                value={config.rows}
                onChange={e => updateConfig({ ...config, rows: Math.max(1, Math.min(12, Number(e.target.value))) })}
              />
            </div>
            <Button size="sm" variant="outline" onClick={addTile}>
              <Plus className="h-4 w-4" /> Add Tile
            </Button>
          </div>

          <BentoGrid config={config} selected={selectedTileId} onSelect={setSelectedTileId} />

          {saveError && <p className="text-sm text-destructive">{saveError}</p>}
        </div>

        {/* Tile properties panel */}
        <div>
          {selectedTile ? (
            <div className="border rounded-lg p-4 space-y-4">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium">Tile Properties</p>
                <Button variant="ghost" size="icon" onClick={() => removeTile(selectedTile.id)}>
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </div>
              <div>
                <label className="text-xs text-muted-foreground block mb-1">Label</label>
                <Input
                  value={selectedTile.label}
                  onChange={e => updateTile(selectedTile.id, { label: e.target.value })}
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs text-muted-foreground block mb-1">Column</label>
                  <Input
                    type="number"
                    min={1}
                    max={config.cols}
                    value={selectedTile.col}
                    onChange={e => updateTile(selectedTile.id, { col: Number(e.target.value) })}
                  />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground block mb-1">Row</label>
                  <Input
                    type="number"
                    min={1}
                    max={config.rows}
                    value={selectedTile.row}
                    onChange={e => updateTile(selectedTile.id, { row: Number(e.target.value) })}
                  />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground block mb-1">Col Span</label>
                  <Input
                    type="number"
                    min={1}
                    max={config.cols - selectedTile.col + 1}
                    value={selectedTile.colSpan}
                    onChange={e => updateTile(selectedTile.id, { colSpan: Number(e.target.value) })}
                  />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground block mb-1">Row Span</label>
                  <Input
                    type="number"
                    min={1}
                    max={config.rows - selectedTile.row + 1}
                    value={selectedTile.rowSpan}
                    onChange={e => updateTile(selectedTile.id, { rowSpan: Number(e.target.value) })}
                  />
                </div>
              </div>
              <div>
                <label className="text-xs text-muted-foreground block mb-1">Background</label>
                <Select value={selectedTile.bgColor ?? ''} onValueChange={v => updateTile(selectedTile.id, { bgColor: v || undefined })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {COLORS.map(c => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
          ) : (
            <div className="border border-dashed rounded-lg p-6 text-center text-sm text-muted-foreground">
              Click a tile to edit its properties.
            </div>
          )}

          {config.tiles.length > 0 && (
            <div className="mt-4 space-y-1">
              <p className="text-xs text-muted-foreground font-medium">All tiles</p>
              {config.tiles.map(t => (
                <button
                  key={t.id}
                  onClick={() => setSelectedTileId(t.id)}
                  className={`w-full text-left text-xs px-2 py-1.5 rounded transition-colors ${selectedTileId === t.id ? 'bg-primary/10' : 'hover:bg-muted/50'}`}
                >
                  {t.label} ({t.col},{t.row}) {t.colSpan}×{t.rowSpan}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
