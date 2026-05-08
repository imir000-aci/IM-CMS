import React, { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, Search } from 'lucide-react'
import { PageHeader } from '../../components/PageHeader'
import { DataTable, type Column } from '../../components/DataTable'
import { Button } from '../../components/ui/button'
import { Input } from '../../components/ui/input'
import { Badge } from '../../components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '../../components/ui/dialog'
import { ConfirmDialog } from '../../components/ConfirmDialog'
import { channelsApi, type Channel } from '../../lib/api'

function ChannelDialog({
  open,
  onOpenChange,
  editing,
}: {
  open: boolean
  onOpenChange: (o: boolean) => void
  editing: Channel | null
}) {
  const qc = useQueryClient()
  const [name, setName] = useState(editing?.name ?? '')
  const [slug, setSlug] = useState(editing?.slug ?? '')
  const [description, setDescription] = useState(editing?.description ?? '')
  const [defaultLocale, setDefaultLocale] = useState(editing?.defaultLocale ?? 'en')
  const [error, setError] = useState<string | null>(null)

  React.useEffect(() => {
    if (editing) {
      setName(editing.name)
      setSlug(editing.slug)
      setDescription(editing.description ?? '')
      setDefaultLocale(editing.defaultLocale)
    } else {
      setName(''); setSlug(''); setDescription(''); setDefaultLocale('en')
    }
    setError(null)
  }, [editing, open])

  const createMutation = useMutation({
    mutationFn: () => channelsApi.create({ name, slug: slug || name.toLowerCase().replace(/\s+/g, '-'), description: description || undefined, defaultLocale }),
    onSuccess: () => { void qc.invalidateQueries({ queryKey: ['channels'] }); onOpenChange(false) },
    onError: (e: unknown) => setError((e as Error).message),
  })

  const updateMutation = useMutation({
    mutationFn: () => channelsApi.update(editing!.id, { name, description: description || undefined, defaultLocale }),
    onSuccess: () => { void qc.invalidateQueries({ queryKey: ['channels'] }); onOpenChange(false) },
    onError: (e: unknown) => setError((e as Error).message),
  })

  const isEdit = !!editing
  const isPending = createMutation.isPending || updateMutation.isPending

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Edit Channel' : 'New Channel'}</DialogTitle>
          <DialogDescription>Channels represent publishing surfaces (web, mobile, email).</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium block mb-1">Name *</label>
            <Input value={name} onChange={e => setName(e.target.value)} placeholder="Website" />
          </div>
          {!isEdit && (
            <div>
              <label className="text-sm font-medium block mb-1">Slug</label>
              <Input value={slug} onChange={e => setSlug(e.target.value)} placeholder="website (auto-generated)" />
            </div>
          )}
          <div>
            <label className="text-sm font-medium block mb-1">Description</label>
            <Input value={description} onChange={e => setDescription(e.target.value)} />
          </div>
          <div>
            <label className="text-sm font-medium block mb-1">Default Locale</label>
            <Input value={defaultLocale} onChange={e => setDefaultLocale(e.target.value)} placeholder="en" />
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button
            onClick={() => isEdit ? updateMutation.mutate() : createMutation.mutate()}
            disabled={!name || isPending}
          >
            {isPending ? 'Saving…' : isEdit ? 'Save Changes' : 'Create Channel'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export function ChannelsPage() {
  const qc = useQueryClient()
  const [search, setSearch] = useState('')
  const [showDialog, setShowDialog] = useState(false)
  const [editing, setEditing] = useState<Channel | null>(null)
  const [deleting, setDeleting] = useState<Channel | null>(null)

  const { data, isLoading } = useQuery({
    queryKey: ['channels', { search }],
    queryFn: () => channelsApi.list({ search: search || undefined }),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => channelsApi.delete(id),
    onSuccess: () => { void qc.invalidateQueries({ queryKey: ['channels'] }); setDeleting(null) },
  })

  const columns: Column<Channel>[] = [
    {
      key: 'name', header: 'Channel',
      cell: (row) => (
        <div>
          <p className="font-medium">{row.name}</p>
          <p className="text-xs text-muted-foreground font-mono">{row.slug}</p>
        </div>
      ),
    },
    { key: 'locale', header: 'Default Locale', cell: (row) => <Badge variant="secondary">{row.defaultLocale}</Badge> },
    { key: 'pages', header: 'Pages', cell: (row) => <span className="text-sm text-muted-foreground">{row._count?.pages ?? 0} pages</span> },
    {
      key: 'status', header: 'Status',
      cell: (row) => row.isActive ? <Badge variant="success">Active</Badge> : <Badge variant="secondary">Inactive</Badge>,
    },
    {
      key: 'actions', header: '', className: 'w-28',
      cell: (row) => (
        <div className="flex gap-1" onClick={e => e.stopPropagation()}>
          <Button size="sm" variant="ghost" onClick={() => { setEditing(row); setShowDialog(true) }}>Edit</Button>
          <Button size="sm" variant="ghost" onClick={() => setDeleting(row)}>Delete</Button>
        </div>
      ),
    },
  ]

  const list = (data?.data as unknown as { items?: Channel[] })?.items ?? []

  return (
    <div>
      <PageHeader
        title="Channels"
        description="Publishing surfaces — web, mobile, email"
        actions={<Button onClick={() => { setEditing(null); setShowDialog(true) }}><Plus className="h-4 w-4" />New Channel</Button>}
      />

      <div className="p-8">
        <div className="flex gap-3 mb-6">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input className="pl-9" placeholder="Search channels…" value={search} onChange={e => setSearch(e.target.value)} />
          </div>
        </div>

        <DataTable
          columns={columns}
          data={list}
          keyFn={r => r.id}
          loading={isLoading}
          emptyMessage="No channels yet."
        />
      </div>

      <ChannelDialog open={showDialog} onOpenChange={o => { setShowDialog(o); if (!o) setEditing(null) }} editing={editing} />

      <ConfirmDialog
        open={!!deleting}
        onOpenChange={o => !o && setDeleting(null)}
        title={`Delete "${deleting?.name}"?`}
        description="This will delete the channel. Pages must be removed first."
        confirmLabel="Delete"
        variant="destructive"
        onConfirm={() => deleting && deleteMutation.mutate(deleting.id)}
        loading={deleteMutation.isPending}
      />
    </div>
  )
}
