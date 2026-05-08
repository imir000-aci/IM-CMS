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
import { experiencesApi, instancesApi, contentApi, type Experience, type ComponentInstance, type ContentObject } from '../../lib/api'

function CreateExperienceDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const qc = useQueryClient()
  const [name, setName] = useState('')
  const [componentInstanceId, setComponentInstanceId] = useState('')
  const [contentObjectId, setContentObjectId] = useState('')
  const [abTestKey, setAbTestKey] = useState('')
  const [priority, setPriority] = useState('0')
  const [error, setError] = useState<string | null>(null)

  const { data: instancesData } = useQuery({
    queryKey: ['component-instances'],
    queryFn: () => instancesApi.list({ pageSize: 100 }),
    enabled: open,
  })
  const { data: contentData } = useQuery({
    queryKey: ['content', { pageSize: 100 }],
    queryFn: () => contentApi.list({ pageSize: 100 }),
    enabled: open,
  })

  const instances: ComponentInstance[] = (instancesData?.data as unknown as { items?: ComponentInstance[] })?.items ?? []
  const contentObjects: ContentObject[] = (contentData?.data as unknown as { items?: ContentObject[] })?.items ?? []

  const mutation = useMutation({
    mutationFn: () =>
      experiencesApi.create({
        name,
        componentInstanceId,
        contentObjectId,
        abTestKey: abTestKey || undefined,
        priority: Number(priority),
      }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['experiences'] })
      onOpenChange(false)
      setName(''); setComponentInstanceId(''); setContentObjectId(''); setAbTestKey(''); setPriority('0'); setError(null)
    },
    onError: (e: unknown) => setError((e as Error).message),
  })

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>New Experience</DialogTitle>
          <DialogDescription>Link a component instance with a content object to create a targeted experience.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium block mb-1">Name *</label>
            <Input value={name} onChange={e => setName(e.target.value)} placeholder="Hero – Summer Sale Variant" />
          </div>
          <div>
            <label className="text-sm font-medium block mb-1">Component Instance *</label>
            <Select value={componentInstanceId} onValueChange={setComponentInstanceId}>
              <SelectTrigger><SelectValue placeholder="Select instance…" /></SelectTrigger>
              <SelectContent>
                {instances.map(i => (
                  <SelectItem key={i.id} value={i.id}>
                    {i.name} ({i.masterComponent?.slug ?? '—'})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="text-sm font-medium block mb-1">Content Object *</label>
            <Select value={contentObjectId} onValueChange={setContentObjectId}>
              <SelectTrigger><SelectValue placeholder="Select content…" /></SelectTrigger>
              <SelectContent>
                {contentObjects.map(c => (
                  <SelectItem key={c.id} value={c.id}>{c.name} ({c.type})</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm font-medium block mb-1">A/B Test Key</label>
              <Input value={abTestKey} onChange={e => setAbTestKey(e.target.value)} placeholder="exp_hero_summer" />
            </div>
            <div>
              <label className="text-sm font-medium block mb-1">Priority</label>
              <Input type="number" value={priority} onChange={e => setPriority(e.target.value)} />
            </div>
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button
            onClick={() => mutation.mutate()}
            disabled={!name || !componentInstanceId || !contentObjectId || mutation.isPending}
          >
            {mutation.isPending ? 'Creating…' : 'Create Experience'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export function ExperiencesPage() {
  const navigate = useNavigate()
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [showCreate, setShowCreate] = useState(false)

  const { data, isLoading } = useQuery({
    queryKey: ['experiences', { search, page }],
    queryFn: () => experiencesApi.list({ search: search || undefined, page, pageSize: 20 }),
  })

  const columns: Column<Experience>[] = [
    {
      key: 'name', header: 'Experience',
      cell: (row) => (
        <div>
          <p className="font-medium">{row.name}</p>
          {row.abTestKey && <p className="text-xs font-mono text-muted-foreground">{row.abTestKey}</p>}
        </div>
      ),
    },
    {
      key: 'component', header: 'Component',
      cell: (row) => <span className="text-sm text-muted-foreground">{row.componentInstance?.name ?? '—'}</span>,
    },
    {
      key: 'content', header: 'Content',
      cell: (row) => (
        <div>
          <span className="text-sm">{row.contentObject?.name ?? '—'}</span>
          {row.contentObject?.type && <Badge variant="secondary" className="ml-1 text-xs">{row.contentObject.type}</Badge>}
        </div>
      ),
    },
    {
      key: 'targeting', header: 'Targeting Rules',
      cell: (row) => <span className="text-sm text-muted-foreground">{row.targetingRules?.length ?? 0} rules</span>,
    },
    { key: 'priority', header: 'Priority', cell: (row) => <span className="text-sm text-muted-foreground">{row.priority}</span> },
    {
      key: 'status', header: 'Status',
      cell: (row) => row.isActive ? <Badge variant="success">Active</Badge> : <Badge variant="secondary">Inactive</Badge>,
    },
  ]

  const list = (data?.data as unknown as { items?: Experience[] })?.items ?? []
  const meta = data?.data as unknown as { total?: number } | undefined

  return (
    <div>
      <PageHeader
        title="Experiences"
        description="Component + content pairs with optional targeting and A/B test keys"
        actions={<Button onClick={() => setShowCreate(true)}><Plus className="h-4 w-4" />New Experience</Button>}
      />

      <div className="p-8">
        <div className="flex gap-3 mb-6">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input className="pl-9" placeholder="Search experiences…" value={search} onChange={e => { setSearch(e.target.value); setPage(1) }} />
          </div>
        </div>

        <DataTable
          columns={columns}
          data={list}
          keyFn={r => r.id}
          loading={isLoading}
          emptyMessage="No experiences yet."
          onRowClick={row => void navigate({ to: '/experiences/$experienceId', params: { experienceId: row.id } })}
        />

        {meta?.total && meta.total > 20 && (
          <Pagination page={page} pageSize={20} total={meta.total} onPageChange={setPage} />
        )}
      </div>

      <CreateExperienceDialog open={showCreate} onOpenChange={setShowCreate} />
    </div>
  )
}
