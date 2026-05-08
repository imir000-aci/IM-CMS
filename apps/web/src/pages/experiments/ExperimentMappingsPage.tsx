import React, { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, Search, FlaskConical } from 'lucide-react'
import { PageHeader } from '../../components/PageHeader'
import { DataTable, type Column } from '../../components/DataTable'
import { Button } from '../../components/ui/button'
import { Input } from '../../components/ui/input'
import { Badge } from '../../components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '../../components/ui/dialog'
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '../../components/ui/select'
import { ConfirmDialog } from '../../components/ConfirmDialog'
import { Pagination } from '../../components/Pagination'
import { experimentationApi, experiencesApi, type ExperimentMapping, type Experience } from '../../lib/api'

function CreateMappingDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const qc = useQueryClient()
  const [experimentKey, setExperimentKey] = useState('')
  const [variantKey, setVariantKey] = useState('')
  const [experienceId, setExperienceId] = useState('')
  const [error, setError] = useState<string | null>(null)

  const { data: expData } = useQuery({
    queryKey: ['experiences', { pageSize: 200 }],
    queryFn: () => experiencesApi.list({ pageSize: 200 }),
    enabled: open,
  })
  const experiences: Experience[] = (expData?.data as unknown as { items?: Experience[] })?.items ?? []

  const mutation = useMutation({
    mutationFn: () => experimentationApi.create({ experimentKey, variantKey, experienceId }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['experiment-mappings'] })
      onOpenChange(false)
      setExperimentKey(''); setVariantKey(''); setExperienceId(''); setError(null)
    },
    onError: (e: unknown) => setError((e as Error).message),
  })

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>New Experiment Mapping</DialogTitle>
          <DialogDescription>
            Map an external A/B experiment variant to a CMS experience. The delivery API uses
            this to serve the correct experience when an experiment key is present.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium block mb-1">Experiment Key *</label>
            <Input
              value={experimentKey}
              onChange={e => setExperimentKey(e.target.value)}
              placeholder="exp_homepage_hero"
              className="font-mono text-sm"
            />
            <p className="text-xs text-muted-foreground mt-1">The key from your A/B testing platform (e.g. Optimizely, LaunchDarkly)</p>
          </div>
          <div>
            <label className="text-sm font-medium block mb-1">Variant Key *</label>
            <Input
              value={variantKey}
              onChange={e => setVariantKey(e.target.value)}
              placeholder="variant_a"
              className="font-mono text-sm"
            />
          </div>
          <div>
            <label className="text-sm font-medium block mb-1">Experience *</label>
            <Select value={experienceId} onValueChange={setExperienceId}>
              <SelectTrigger><SelectValue placeholder="Select experience to serve…" /></SelectTrigger>
              <SelectContent>
                {experiences.map(e => (
                  <SelectItem key={e.id} value={e.id}>
                    {e.name}
                    {e.abTestKey && <span className="text-muted-foreground ml-1 text-xs">({e.abTestKey})</span>}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button
            onClick={() => mutation.mutate()}
            disabled={!experimentKey || !variantKey || !experienceId || mutation.isPending}
          >
            {mutation.isPending ? 'Creating…' : 'Create Mapping'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export function ExperimentMappingsPage() {
  const qc = useQueryClient()
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [showCreate, setShowCreate] = useState(false)
  const [deleting, setDeleting] = useState<ExperimentMapping | null>(null)

  const { data, isLoading } = useQuery({
    queryKey: ['experiment-mappings', { search, page }],
    queryFn: () => experimentationApi.list({ experimentKey: search || undefined, page, pageSize: 20 }),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => experimentationApi.delete(id),
    onSuccess: () => { void qc.invalidateQueries({ queryKey: ['experiment-mappings'] }); setDeleting(null) },
  })

  const columns: Column<ExperimentMapping>[] = [
    {
      key: 'experiment', header: 'Experiment Key',
      cell: (row) => (
        <div className="flex items-center gap-2">
          <FlaskConical className="h-4 w-4 text-purple-500 shrink-0" />
          <span className="font-mono text-sm">{row.experimentKey}</span>
        </div>
      ),
    },
    {
      key: 'variant', header: 'Variant Key',
      cell: (row) => <Badge variant="secondary" className="font-mono text-xs">{row.variantKey}</Badge>,
    },
    {
      key: 'experience', header: 'Experience',
      cell: (row) => (
        <div>
          <p className="text-sm font-medium">{row.experience?.name ?? '—'}</p>
          {row.experience?.componentInstance && (
            <p className="text-xs text-muted-foreground">{row.experience.componentInstance.name}</p>
          )}
        </div>
      ),
    },
    {
      key: 'status', header: 'Status',
      cell: (row) => row.isActive ? <Badge variant="success">Active</Badge> : <Badge variant="secondary">Inactive</Badge>,
    },
    {
      key: 'created', header: 'Created',
      cell: (row) => <span className="text-sm text-muted-foreground">{new Date(row.createdAt).toLocaleDateString()}</span>,
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

  const list = (data?.data as unknown as { items?: ExperimentMapping[] })?.items ?? []
  const meta = data?.data as unknown as { total?: number } | undefined

  return (
    <div>
      <PageHeader
        title="Experiment Mappings"
        description="Connect external A/B experiment variants to CMS experiences"
        actions={<Button onClick={() => setShowCreate(true)}><Plus className="h-4 w-4" />New Mapping</Button>}
      />

      <div className="p-8">
        <div className="flex gap-3 mb-6">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              className="pl-9"
              placeholder="Filter by experiment key…"
              value={search}
              onChange={e => { setSearch(e.target.value); setPage(1) }}
            />
          </div>
        </div>

        <DataTable
          columns={columns}
          data={list}
          keyFn={r => r.id}
          loading={isLoading}
          emptyMessage="No experiment mappings yet."
        />

        {meta?.total && meta.total > 20 && (
          <Pagination page={page} pageSize={20} total={meta.total} onPageChange={setPage} />
        )}

        {!isLoading && list.length === 0 && (
          <div className="mt-6 border rounded-lg p-6 bg-muted/20 text-sm">
            <p className="font-medium mb-1">How experiment mappings work</p>
            <p className="text-muted-foreground">
              When the delivery API receives a request with an <code className="bg-muted px-1 rounded text-xs">x-experiment-key</code> and{' '}
              <code className="bg-muted px-1 rounded text-xs">x-variant-key</code> header, it looks up the matching
              experience here and overrides the default slot content. This allows your A/B testing platform
              to control which CMS experience is served without requiring a code deploy.
            </p>
          </div>
        )}
      </div>

      <CreateMappingDialog open={showCreate} onOpenChange={setShowCreate} />

      <ConfirmDialog
        open={!!deleting}
        onOpenChange={o => !o && setDeleting(null)}
        title="Delete mapping?"
        description={`Remove the mapping for experiment "${deleting?.experimentKey}" variant "${deleting?.variantKey}"? The experiment will fall back to default content.`}
        confirmLabel="Delete"
        variant="destructive"
        onConfirm={() => deleting && deleteMutation.mutate(deleting.id)}
        loading={deleteMutation.isPending}
      />
    </div>
  )
}
