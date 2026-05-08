import React, { useState } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, Search, MoreHorizontal } from 'lucide-react'
import { PageHeader } from '../../components/PageHeader'
import { DataTable, type Column } from '../../components/DataTable'
import { Button } from '../../components/ui/button'
import { Input } from '../../components/ui/input'
import { Badge } from '../../components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '../../components/ui/dialog'
import { ConfirmDialog } from '../../components/ConfirmDialog'
import { Pagination } from '../../components/Pagination'
import { componentsApi, type MasterComponent } from '../../lib/api'

function CreateComponentDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const qc = useQueryClient()
  const [name, setName] = useState('')
  const [slug, setSlug] = useState('')
  const [category, setCategory] = useState('')
  const [description, setDescription] = useState('')
  const [error, setError] = useState<string | null>(null)

  const mutation = useMutation({
    mutationFn: () =>
      componentsApi.create({
        name, slug: slug || name.toLowerCase().replace(/\s+/g, '-'),
        category: category || undefined, description: description || undefined,
        attributeSchema: [],
      }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['components'] })
      onOpenChange(false)
      setName(''); setSlug(''); setCategory(''); setDescription(''); setError(null)
    },
    onError: (e: unknown) => setError((e as Error).message),
  })

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>New Master Component</DialogTitle>
          <DialogDescription>Define the component type and its attribute schema.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium block mb-1">Name *</label>
            <Input value={name} onChange={e => setName(e.target.value)} placeholder="Hero Banner" />
          </div>
          <div>
            <label className="text-sm font-medium block mb-1">Slug</label>
            <Input value={slug} onChange={e => setSlug(e.target.value)} placeholder="hero-banner (auto-generated)" />
          </div>
          <div>
            <label className="text-sm font-medium block mb-1">Category</label>
            <Input value={category} onChange={e => setCategory(e.target.value)} placeholder="Layout, Commerce, Media…" />
          </div>
          <div>
            <label className="text-sm font-medium block mb-1">Description</label>
            <Input value={description} onChange={e => setDescription(e.target.value)} />
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={() => mutation.mutate()} disabled={!name || mutation.isPending}>
            {mutation.isPending ? 'Creating…' : 'Create'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export function ComponentLibraryPage() {
  const navigate = useNavigate()
  const qc = useQueryClient()
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [showCreate, setShowCreate] = useState(false)
  const [deprecating, setDeprecating] = useState<MasterComponent | null>(null)

  const { data, isLoading } = useQuery({
    queryKey: ['components', { search, page }],
    queryFn: () => componentsApi.list({ search: search || undefined, page, pageSize: 20 }),
  })

  const deprecateMutation = useMutation({
    mutationFn: (id: string) => componentsApi.deprecate(id),
    onSuccess: () => { void qc.invalidateQueries({ queryKey: ['components'] }); setDeprecating(null) },
  })

  const columns: Column<MasterComponent>[] = [
    {
      key: 'name', header: 'Name',
      cell: (row) => (
        <div>
          <p className="font-medium">{row.name}</p>
          <p className="text-xs text-muted-foreground">{row.slug}</p>
        </div>
      ),
    },
    { key: 'category', header: 'Category', cell: (row) => row.category ?? <span className="text-muted-foreground">—</span> },
    {
      key: 'status', header: 'Status',
      cell: (row) => (
        <div className="flex gap-1.5">
          {row.isDeprecated && <Badge variant="warning">Deprecated</Badge>}
          {!row.isActive && <Badge variant="secondary">Inactive</Badge>}
          {row.isActive && !row.isDeprecated && <Badge variant="success">Active</Badge>}
        </div>
      ),
    },
    { key: 'version', header: 'Version', cell: (row) => `v${row.currentVersion}` },
    {
      key: 'attributes', header: 'Attributes',
      cell: (row) => <span className="text-muted-foreground">{(row.attributeSchema as unknown[]).length} fields</span>,
    },
    {
      key: 'actions', header: '', className: 'w-16',
      cell: (row) => (
        <Button variant="ghost" size="icon" onClick={e => { e.stopPropagation(); setDeprecating(row) }}>
          <MoreHorizontal className="h-4 w-4" />
        </Button>
      ),
    },
  ]

  const list = data?.data ?? []
  const meta = data?.data as unknown as { total?: number; page?: number; pageSize?: number } | undefined

  return (
    <div>
      <PageHeader
        title="Component Library"
        description="Reusable component definitions with attribute schemas"
        actions={<Button onClick={() => setShowCreate(true)}><Plus className="h-4 w-4" />New Component</Button>}
      />

      <div className="p-8">
        <div className="flex gap-3 mb-6">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              className="pl-9"
              placeholder="Search components…"
              value={search}
              onChange={e => { setSearch(e.target.value); setPage(1) }}
            />
          </div>
        </div>

        <DataTable
          columns={columns}
          data={Array.isArray(list) ? list : []}
          keyFn={r => r.id}
          loading={isLoading}
          emptyMessage="No components yet. Create one to get started."
          onRowClick={row => void navigate({ to: '/components/$componentId', params: { componentId: row.id } })}
        />

        {meta?.total && meta.total > 20 && (
          <Pagination
            page={page}
            pageSize={20}
            total={meta.total}
            onPageChange={setPage}
          />
        )}
      </div>

      <CreateComponentDialog open={showCreate} onOpenChange={setShowCreate} />

      <ConfirmDialog
        open={!!deprecating}
        onOpenChange={o => !o && setDeprecating(null)}
        title={`Deprecate "${deprecating?.name}"?`}
        description="Deprecated components can no longer be used in new instances but existing instances continue to work."
        confirmLabel="Deprecate"
        variant="default"
        onConfirm={() => deprecating && deprecateMutation.mutate(deprecating.id)}
        loading={deprecateMutation.isPending}
      />
    </div>
  )
}
