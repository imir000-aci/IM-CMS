import React, { useState } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, Search, Tag } from 'lucide-react'
import { PageHeader } from '../../components/PageHeader'
import { DataTable, type Column } from '../../components/DataTable'
import { Button } from '../../components/ui/button'
import { Input } from '../../components/ui/input'
import { Badge } from '../../components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '../../components/ui/dialog'
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '../../components/ui/select'
import { ConfirmDialog } from '../../components/ConfirmDialog'
import { Pagination } from '../../components/Pagination'
import { instancesApi, componentsApi, type ComponentInstance, type MasterComponent } from '../../lib/api'

function CreateInstanceDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const qc = useQueryClient()
  const [name, setName] = useState('')
  const [masterComponentId, setMasterComponentId] = useState('')
  const [tagInput, setTagInput] = useState('')
  const [tags, setTags] = useState<string[]>([])
  const [error, setError] = useState<string | null>(null)

  const { data: componentsData } = useQuery({
    queryKey: ['components', { active: true }],
    queryFn: () => componentsApi.list({ pageSize: 100 }),
    enabled: open,
  })
  const components: MasterComponent[] = (componentsData?.data as unknown as { items?: MasterComponent[] })?.items ?? []

  const addTag = () => {
    const t = tagInput.trim()
    if (t && !tags.includes(t)) { setTags([...tags, t]); setTagInput('') }
  }

  const removeTag = (t: string) => setTags(tags.filter(x => x !== t))

  const mutation = useMutation({
    mutationFn: () => instancesApi.create({ name, masterComponentId, tags }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['component-instances'] })
      onOpenChange(false)
      setName(''); setMasterComponentId(''); setTags([]); setTagInput(''); setError(null)
    },
    onError: (e: unknown) => setError((e as Error).message),
  })

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>New Component Instance</DialogTitle>
          <DialogDescription>Create an instance of a master component with pre-filled attribute values.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium block mb-1">Name *</label>
            <Input value={name} onChange={e => setName(e.target.value)} placeholder="Homepage Hero" />
          </div>
          <div>
            <label className="text-sm font-medium block mb-1">Master Component *</label>
            <Select value={masterComponentId} onValueChange={setMasterComponentId}>
              <SelectTrigger><SelectValue placeholder="Select component…" /></SelectTrigger>
              <SelectContent>
                {components.filter(c => c.isActive && !c.isDeprecated).map(c => (
                  <SelectItem key={c.id} value={c.id}>{c.name} ({c.slug})</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="text-sm font-medium block mb-1">Tags</label>
            <div className="flex gap-2">
              <Input
                value={tagInput}
                onChange={e => setTagInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && addTag()}
                placeholder="hero, homepage, seasonal…"
              />
              <Button size="sm" variant="outline" onClick={addTag} disabled={!tagInput.trim()}>
                <Tag className="h-3.5 w-3.5" /> Add
              </Button>
            </div>
            {tags.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-2">
                {tags.map(t => (
                  <button
                    key={t}
                    onClick={() => removeTag(t)}
                    className="text-xs bg-muted px-2 py-0.5 rounded hover:bg-muted/70"
                  >
                    {t} ×
                  </button>
                ))}
              </div>
            )}
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={() => mutation.mutate()} disabled={!name || !masterComponentId || mutation.isPending}>
            {mutation.isPending ? 'Creating…' : 'Create Instance'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export function ComponentInstanceListPage() {
  const navigate = useNavigate()
  const qc = useQueryClient()
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [showCreate, setShowCreate] = useState(false)
  const [deleting, setDeleting] = useState<ComponentInstance | null>(null)

  const { data, isLoading } = useQuery({
    queryKey: ['component-instances', { search, page }],
    queryFn: () => instancesApi.list({ search: search || undefined, page, pageSize: 20 }),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => instancesApi.delete(id),
    onSuccess: () => { void qc.invalidateQueries({ queryKey: ['component-instances'] }); setDeleting(null) },
  })

  const columns: Column<ComponentInstance>[] = [
    {
      key: 'name', header: 'Instance',
      cell: (row) => (
        <div>
          <p className="font-medium">{row.name}</p>
          <p className="text-xs text-muted-foreground">{row.masterComponent?.slug ?? '—'}</p>
        </div>
      ),
    },
    {
      key: 'component', header: 'Component',
      cell: (row) => <Badge variant="secondary">{row.masterComponent?.name ?? '—'}</Badge>,
    },
    {
      key: 'tags', header: 'Tags',
      cell: (row) => (
        <div className="flex gap-1 flex-wrap">
          {row.tags.slice(0, 3).map(t => (
            <span key={t} className="text-xs bg-muted px-1.5 py-0.5 rounded">{t}</span>
          ))}
          {row.tags.length > 3 && <span className="text-xs text-muted-foreground">+{row.tags.length - 3}</span>}
        </div>
      ),
    },
    {
      key: 'prefilled', header: 'Pre-filled',
      cell: (row) => (
        <span className="text-sm text-muted-foreground">
          {Object.keys(row.prefilledAttributes).length} fields
        </span>
      ),
    },
    {
      key: 'status', header: 'Status',
      cell: (row) => row.isActive ? <Badge variant="success">Active</Badge> : <Badge variant="secondary">Inactive</Badge>,
    },
    {
      key: 'actions', header: '', className: 'w-16',
      cell: (row) => (
        <Button
          size="sm"
          variant="ghost"
          onClick={e => { e.stopPropagation(); setDeleting(row) }}
        >
          Delete
        </Button>
      ),
    },
  ]

  const list = (data?.data as unknown as { items?: ComponentInstance[] })?.items ?? []
  const meta = data?.data as unknown as { total?: number } | undefined

  return (
    <div>
      <PageHeader
        title="Component Instances"
        description="Instances of master components with pre-filled attribute values"
        actions={<Button onClick={() => setShowCreate(true)}><Plus className="h-4 w-4" />New Instance</Button>}
      />

      <div className="p-8">
        <div className="flex gap-3 mb-6">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input className="pl-9" placeholder="Search instances…" value={search} onChange={e => { setSearch(e.target.value); setPage(1) }} />
          </div>
        </div>

        <DataTable
          columns={columns}
          data={list}
          keyFn={r => r.id}
          loading={isLoading}
          emptyMessage="No component instances yet."
        />

        {meta?.total && meta.total > 20 && (
          <Pagination page={page} pageSize={20} total={meta.total} onPageChange={setPage} />
        )}
      </div>

      <CreateInstanceDialog open={showCreate} onOpenChange={setShowCreate} />

      <ConfirmDialog
        open={!!deleting}
        onOpenChange={o => !o && setDeleting(null)}
        title={`Delete "${deleting?.name}"?`}
        description="This instance will be deactivated. Existing experience assignments will be affected."
        confirmLabel="Delete"
        variant="destructive"
        onConfirm={() => deleting && deleteMutation.mutate(deleting.id)}
        loading={deleteMutation.isPending}
      />
    </div>
  )
}
