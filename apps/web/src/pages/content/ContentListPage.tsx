import React, { useState } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, Search } from 'lucide-react'
import { PageHeader } from '../../components/PageHeader'
import { DataTable, type Column } from '../../components/DataTable'
import { Button } from '../../components/ui/button'
import { Input } from '../../components/ui/input'
import { Badge } from '../../components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '../../components/ui/dialog'
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '../../components/ui/select'
import { Pagination } from '../../components/Pagination'
import { contentApi, type ContentObject } from '../../lib/api'

const CONTENT_TYPES = ['TEXT', 'IMAGE', 'VIDEO', 'HTML', 'JSON', 'RICH_TEXT']

const TYPE_COLORS: Record<string, 'default' | 'secondary' | 'info' | 'warning'> = {
  TEXT: 'secondary', RICH_TEXT: 'secondary', HTML: 'info',
  IMAGE: 'warning', VIDEO: 'warning', JSON: 'default',
}

function CreateContentDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const qc = useQueryClient()
  const [name, setName] = useState('')
  const [type, setType] = useState('TEXT')
  const [error, setError] = useState<string | null>(null)

  const mutation = useMutation({
    mutationFn: () => contentApi.create({ name, type }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['content'] })
      onOpenChange(false)
      setName(''); setType('TEXT'); setError(null)
    },
    onError: (e: unknown) => setError((e as Error).message),
  })

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>New Content Object</DialogTitle>
          <DialogDescription>Create a reusable content object to assign to experiences.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium block mb-1">Name *</label>
            <Input value={name} onChange={e => setName(e.target.value)} placeholder="Homepage Hero Copy" />
          </div>
          <div>
            <label className="text-sm font-medium block mb-1">Type *</label>
            <Select value={type} onValueChange={setType}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{CONTENT_TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
            </Select>
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

export function ContentListPage() {
  const navigate = useNavigate()
  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState<string>('all')
  const [page, setPage] = useState(1)
  const [showCreate, setShowCreate] = useState(false)

  const { data, isLoading } = useQuery({
    queryKey: ['content', { search, type: typeFilter, page }],
    queryFn: () =>
      contentApi.list({
        search: search || undefined,
        type: typeFilter !== 'all' ? typeFilter : undefined,
        page,
        pageSize: 20,
      }),
  })

  const columns: Column<ContentObject>[] = [
    {
      key: 'name', header: 'Name',
      cell: (row) => <span className="font-medium">{row.name}</span>,
    },
    {
      key: 'type', header: 'Type',
      cell: (row) => <Badge variant={TYPE_COLORS[row.type] ?? 'secondary'}>{row.type}</Badge>,
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
    { key: 'version', header: 'Version', cell: (row) => `v${row.currentVersion}` },
    {
      key: 'updated', header: 'Updated',
      cell: (row) => <span className="text-sm text-muted-foreground">{new Date(row.updatedAt).toLocaleDateString()}</span>,
    },
  ]

  const list = (data?.data as unknown as { items?: ContentObject[] })?.items ?? []
  const meta = data?.data as unknown as { total?: number } | undefined

  return (
    <div>
      <PageHeader
        title="Content Objects"
        description="Reusable content pieces (copy, images, rich text)"
        actions={<Button onClick={() => setShowCreate(true)}><Plus className="h-4 w-4" />New Content</Button>}
      />

      <div className="p-8">
        <div className="flex gap-3 mb-6">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input className="pl-9" placeholder="Search content…" value={search} onChange={e => { setSearch(e.target.value); setPage(1) }} />
          </div>
          <Select value={typeFilter} onValueChange={v => { setTypeFilter(v); setPage(1) }}>
            <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All types</SelectItem>
              {CONTENT_TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        <DataTable
          columns={columns}
          data={list}
          keyFn={r => r.id}
          loading={isLoading}
          emptyMessage="No content objects yet."
          onRowClick={row => void navigate({ to: '/content/$contentId', params: { contentId: row.id } })}
        />

        {meta?.total && meta.total > 20 && (
          <Pagination page={page} pageSize={20} total={meta.total} onPageChange={setPage} />
        )}
      </div>

      <CreateContentDialog open={showCreate} onOpenChange={setShowCreate} />
    </div>
  )
}
