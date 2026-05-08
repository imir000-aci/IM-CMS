import React, { useState } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, Search, Globe } from 'lucide-react'
import { PageHeader } from '../../components/PageHeader'
import { DataTable, type Column } from '../../components/DataTable'
import { Button } from '../../components/ui/button'
import { Input } from '../../components/ui/input'
import { Badge } from '../../components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '../../components/ui/dialog'
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '../../components/ui/select'
import { Pagination } from '../../components/Pagination'
import { pagesApi, channelsApi, type Page, type Channel } from '../../lib/api'

function CreatePageDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const qc = useQueryClient()
  const navigate = useNavigate()
  const [name, setName] = useState('')
  const [slug, setSlug] = useState('')
  const [channelId, setChannelId] = useState('')
  const [metaTitle, setMetaTitle] = useState('')
  const [error, setError] = useState<string | null>(null)

  const { data: channelsData } = useQuery({
    queryKey: ['channels'],
    queryFn: () => channelsApi.list(),
  })
  const channels: Channel[] = (channelsData?.data as unknown as { items?: Channel[] })?.items ?? []

  const mutation = useMutation({
    mutationFn: () =>
      pagesApi.create({
        name,
        slug: slug || name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, ''),
        channelId,
        metaTitle: metaTitle || undefined,
      }),
    onSuccess: (res) => {
      void qc.invalidateQueries({ queryKey: ['pages'] })
      onOpenChange(false)
      const page = (res.data as unknown as { data: Page }).data
      void navigate({ to: '/pages/$pageId', params: { pageId: page.id } })
    },
    onError: (e: unknown) => setError((e as Error).message),
  })

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>New Page</DialogTitle>
          <DialogDescription>Create a page within a channel. You can add zones and slots after creation.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium block mb-1">Name *</label>
            <Input value={name} onChange={e => setName(e.target.value)} placeholder="Homepage" />
          </div>
          <div>
            <label className="text-sm font-medium block mb-1">Slug</label>
            <Input value={slug} onChange={e => setSlug(e.target.value)} placeholder="homepage (auto-generated)" />
          </div>
          <div>
            <label className="text-sm font-medium block mb-1">Channel *</label>
            <Select value={channelId} onValueChange={setChannelId}>
              <SelectTrigger><SelectValue placeholder="Select channel…" /></SelectTrigger>
              <SelectContent>
                {channels.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="text-sm font-medium block mb-1">Meta Title</label>
            <Input value={metaTitle} onChange={e => setMetaTitle(e.target.value)} placeholder="Page title for SEO" />
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={() => mutation.mutate()} disabled={!name || !channelId || mutation.isPending}>
            {mutation.isPending ? 'Creating…' : 'Create Page'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export function PagesListPage() {
  const navigate = useNavigate()
  const qc = useQueryClient()
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [showCreate, setShowCreate] = useState(false)

  const { data, isLoading } = useQuery({
    queryKey: ['pages', { search, page }],
    queryFn: () => pagesApi.list({ search: search || undefined, page, pageSize: 20 }),
  })

  const publishMutation = useMutation({
    mutationFn: (id: string) => pagesApi.publish(id),
    onSuccess: () => void qc.invalidateQueries({ queryKey: ['pages'] }),
  })

  const columns: Column<Page>[] = [
    {
      key: 'name', header: 'Page',
      cell: (row) => (
        <div>
          <p className="font-medium">{row.name}</p>
          <p className="text-xs text-muted-foreground font-mono">{row.slug}</p>
        </div>
      ),
    },
    {
      key: 'channel', header: 'Channel',
      cell: (row) => <Badge variant="secondary">{row.channel?.name ?? '—'}</Badge>,
    },
    {
      key: 'published', header: 'Status',
      cell: (row) => row.isPublished
        ? <Badge variant="success"><Globe className="h-3 w-3 mr-1" />Published</Badge>
        : <Badge variant="secondary">Draft</Badge>,
    },
    {
      key: 'publishedAt', header: 'Published',
      cell: (row) => <span className="text-sm text-muted-foreground">{row.publishedAt ? new Date(row.publishedAt).toLocaleDateString() : '—'}</span>,
    },
    {
      key: 'actions', header: '', className: 'w-24',
      cell: (row) => (
        <div onClick={e => e.stopPropagation()}>
          {!row.isPublished && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => publishMutation.mutate(row.id)}
              disabled={publishMutation.isPending}
            >
              Publish
            </Button>
          )}
        </div>
      ),
    },
  ]

  const list = (data?.data as unknown as { items?: Page[] })?.items ?? []
  const meta = data?.data as unknown as { total?: number } | undefined

  return (
    <div>
      <PageHeader
        title="Pages"
        description="Manage pages and their zone/slot structure"
        actions={<Button onClick={() => setShowCreate(true)}><Plus className="h-4 w-4" />New Page</Button>}
      />

      <div className="p-8">
        <div className="flex gap-3 mb-6">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input className="pl-9" placeholder="Search pages…" value={search} onChange={e => { setSearch(e.target.value); setPage(1) }} />
          </div>
        </div>

        <DataTable
          columns={columns}
          data={list}
          keyFn={r => r.id}
          loading={isLoading}
          emptyMessage="No pages yet."
          onRowClick={row => void navigate({ to: '/pages/$pageId', params: { pageId: row.id } })}
        />

        {meta?.total && meta.total > 20 && (
          <Pagination page={page} pageSize={20} total={meta.total} onPageChange={setPage} />
        )}
      </div>

      <CreatePageDialog open={showCreate} onOpenChange={setShowCreate} />
    </div>
  )
}
