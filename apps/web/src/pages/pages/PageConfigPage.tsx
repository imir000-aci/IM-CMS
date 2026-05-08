import React, { useState } from 'react'
import { useParams, useNavigate } from '@tanstack/react-router'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { ArrowLeft, Plus, Trash2, Layers } from 'lucide-react'
import { PageHeader } from '../../components/PageHeader'
import { Button } from '../../components/ui/button'
import { Badge } from '../../components/ui/badge'
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '../../components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '../../components/ui/dialog'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '../../components/ui/tabs'
import { Input } from '../../components/ui/input'
import {
  pageConfigApi, pagesApi, campaignsApi, experiencesApi,
  type PageConfig, type SlotConfig, type PageDetail, type DiffChange,
} from '../../lib/api'

function DiffView({ fromId, toId }: { fromId: string; toId: string }) {
  const { data, isLoading } = useQuery({
    queryKey: ['page-config-diff', fromId, toId],
    queryFn: () => pageConfigApi.diff(fromId, toId),
    enabled: !!fromId && !!toId,
  })

  const changes: DiffChange[] = (data?.data as unknown as { data: { changes: DiffChange[] } })?.data?.changes ?? []

  if (isLoading) return <p className="text-sm text-muted-foreground">Loading diff…</p>
  if (changes.length === 0) return <p className="text-sm text-muted-foreground">No differences found.</p>

  return (
    <div className="space-y-2">
      {changes.map((change, i) => (
        <div
          key={i}
          className={`border rounded-md px-4 py-3 text-sm ${
            change.type === 'added' ? 'border-green-200 bg-green-50 dark:bg-green-950/20'
            : change.type === 'removed' ? 'border-red-200 bg-red-50 dark:bg-red-950/20'
            : 'border-yellow-200 bg-yellow-50 dark:bg-yellow-950/20'
          }`}
        >
          <div className="flex items-center gap-2">
            <Badge
              variant={change.type === 'added' ? 'success' : change.type === 'removed' ? 'warning' : 'secondary'}
            >
              {change.type}
            </Badge>
            <span className="font-mono text-xs">
              {change.slotId ? `slot:${change.slotId.slice(0, 8)}` : `subslot:${change.subSlotId?.slice(0, 8)}`}
            </span>
          </div>
          {change.from && <p className="text-xs text-muted-foreground mt-1">From: {change.from.experience?.name ?? change.from.componentInstance?.name ?? '—'}</p>}
          {change.to && <p className="text-xs text-muted-foreground">To: {change.to.experience?.name ?? change.to.componentInstance?.name ?? '—'}</p>}
        </div>
      ))}
    </div>
  )
}

function AddSlotConfigDialog({
  open,
  onOpenChange,
  pageConfigId,
  page,
}: {
  open: boolean
  onOpenChange: (o: boolean) => void
  pageConfigId: string
  page: PageDetail
}) {
  const qc = useQueryClient()
  const [slotId, setSlotId] = useState('')
  const [experienceId, setExperienceId] = useState('')
  const [priority, setPriority] = useState('0')
  const [error, setError] = useState<string | null>(null)

  const { data: expData } = useQuery({
    queryKey: ['experiences', { pageSize: 100 }],
    queryFn: () => experiencesApi.list({ pageSize: 100 }),
    enabled: open,
  })
  const experiences = (expData?.data as unknown as { items?: Array<{ id: string; name: string }> })?.items ?? []

  // Flatten all slots across all zones
  const allSlots = page.zones.flatMap(z => z.slots.map(s => ({ id: s.id, label: `${z.name} → ${s.name}` })))

  const mutation = useMutation({
    mutationFn: () =>
      pageConfigApi.createSlotConfig(pageConfigId, {
        slotId: slotId || undefined,
        experienceId: experienceId || undefined,
        priority: Number(priority),
      }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['page-config', pageConfigId, 'slot-configs'] })
      onOpenChange(false)
      setSlotId(''); setExperienceId(''); setPriority('0'); setError(null)
    },
    onError: (e: unknown) => setError((e as Error).message),
  })

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add Slot Configuration</DialogTitle>
          <DialogDescription>Assign an experience to a slot for this page configuration layer.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium block mb-1">Slot *</label>
            <Select value={slotId} onValueChange={setSlotId}>
              <SelectTrigger><SelectValue placeholder="Select slot…" /></SelectTrigger>
              <SelectContent>
                {allSlots.map(s => <SelectItem key={s.id} value={s.id}>{s.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="text-sm font-medium block mb-1">Experience *</label>
            <Select value={experienceId} onValueChange={setExperienceId}>
              <SelectTrigger><SelectValue placeholder="Select experience…" /></SelectTrigger>
              <SelectContent>
                {experiences.map(e => <SelectItem key={e.id} value={e.id}>{e.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="text-sm font-medium block mb-1">Priority</label>
            <Input type="number" value={priority} onChange={e => setPriority(e.target.value)} />
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={() => mutation.mutate()} disabled={!slotId || !experienceId || mutation.isPending}>
            {mutation.isPending ? 'Saving…' : 'Add Configuration'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function SlotConfigList({ config, page, pageConfigId }: { config: PageConfig; page: PageDetail; pageConfigId: string }) {
  const qc = useQueryClient()
  const [showAdd, setShowAdd] = useState(false)

  const { data } = useQuery({
    queryKey: ['page-config', pageConfigId, 'slot-configs'],
    queryFn: () => pageConfigApi.listSlotConfigs(pageConfigId),
  })
  const slotConfigs: SlotConfig[] = (data?.data as unknown as { data: SlotConfig[] })?.data ?? []

  const deleteMutation = useMutation({
    mutationFn: (slotConfigId: string) => pageConfigApi.deleteSlotConfig(pageConfigId, slotConfigId),
    onSuccess: () => void qc.invalidateQueries({ queryKey: ['page-config', pageConfigId, 'slot-configs'] }),
  })

  // Build a slot label lookup
  const slotLabels = new Map<string, string>()
  page.zones.forEach(z => z.slots.forEach(s => slotLabels.set(s.id, `${z.name} → ${s.name}`)))

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">{slotConfigs.length} slot configuration{slotConfigs.length !== 1 ? 's' : ''}</p>
        <Button size="sm" variant="outline" onClick={() => setShowAdd(true)}>
          <Plus className="h-4 w-4" /> Add Slot Config
        </Button>
      </div>

      {slotConfigs.length === 0
        ? <div className="border border-dashed rounded-md p-6 text-center text-sm text-muted-foreground">No slot configurations yet.</div>
        : (
          <div className="space-y-2">
            {slotConfigs.map(sc => (
              <div key={sc.id} className="flex items-center justify-between border rounded-md px-4 py-3">
                <div className="text-sm">
                  <p className="font-medium">{sc.slotId ? slotLabels.get(sc.slotId) ?? sc.slotId.slice(0, 8) : `subslot:${sc.subSlotId?.slice(0, 8)}`}</p>
                  <p className="text-xs text-muted-foreground">{sc.experience?.name ?? sc.componentInstance?.name ?? '—'} · priority {sc.priority}</p>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => deleteMutation.mutate(sc.id)}
                  disabled={deleteMutation.isPending}
                >
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </div>
            ))}
          </div>
        )
      }

      <AddSlotConfigDialog
        open={showAdd}
        onOpenChange={setShowAdd}
        pageConfigId={pageConfigId}
        page={page}
      />
    </div>
  )
}

export function PageConfigPage() {
  const { pageId } = useParams({ strict: false }) as { pageId: string }
  const navigate = useNavigate()
  const qc = useQueryClient()
  const [selectedConfig, setSelectedConfig] = useState<string | null>(null)
  const [diffFrom, setDiffFrom] = useState('')
  const [diffTo, setDiffTo] = useState('')
  const [showCreateConfig, setShowCreateConfig] = useState(false)
  const [newPriority, setNewPriority] = useState('0')
  const [newCampaignId, setNewCampaignId] = useState('')
  const [createError, setCreateError] = useState<string | null>(null)

  const { data: pageData, isLoading: pageLoading } = useQuery({
    queryKey: ['pages', pageId],
    queryFn: () => pagesApi.get(pageId),
  })
  const { data: configsData, isLoading: configsLoading } = useQuery({
    queryKey: ['page-configs', pageId],
    queryFn: () => pageConfigApi.list(pageId),
  })
  const { data: campaignsData } = useQuery({
    queryKey: ['campaigns', { pageSize: 100 }],
    queryFn: () => campaignsApi.list({ pageSize: 100 }),
    enabled: showCreateConfig,
  })

  const page = (pageData?.data as unknown as { data: PageDetail })?.data
  const configs: PageConfig[] = (configsData?.data as unknown as { data: PageConfig[] })?.data ?? []
  const campaigns = (campaignsData?.data as unknown as { items?: Array<{ id: string; name: string; status: string }> })?.items ?? []

  const createConfigMutation = useMutation({
    mutationFn: () =>
      pageConfigApi.create({
        pageId,
        campaignId: newCampaignId || undefined,
        priority: Number(newPriority),
      }),
    onSuccess: (res) => {
      void qc.invalidateQueries({ queryKey: ['page-configs', pageId] })
      setShowCreateConfig(false)
      setNewCampaignId(''); setNewPriority('0'); setCreateError(null)
      const cfg = (res.data as unknown as { data: { id: string } }).data
      setSelectedConfig(cfg.id)
    },
    onError: (e: unknown) => setCreateError((e as Error).message),
  })

  if (pageLoading) return <div className="p-8 text-muted-foreground">Loading…</div>
  if (!page) return <div className="p-8 text-muted-foreground">Page not found.</div>

  const activeConfig = configs.find(c => c.id === selectedConfig) ?? null

  return (
    <div>
      <PageHeader
        title={`${page.name} — Configuration`}
        description="Manage slot configuration layers per campaign"
        actions={
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => void navigate({ to: '/pages/$pageId', params: { pageId } })}>
              <ArrowLeft className="h-4 w-4" /> Back to Page
            </Button>
          </div>
        }
      />

      <div className="p-8 grid grid-cols-3 gap-6">
        {/* Left: config layers list */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium">Configuration Layers</p>
            <Button size="sm" variant="outline" onClick={() => setShowCreateConfig(true)}>
              <Plus className="h-4 w-4" />
            </Button>
          </div>

          {configsLoading
            ? <p className="text-sm text-muted-foreground">Loading…</p>
            : configs.length === 0
              ? <p className="text-sm text-muted-foreground">No configurations yet.</p>
              : configs.map(cfg => (
                <button
                  key={cfg.id}
                  onClick={() => setSelectedConfig(cfg.id)}
                  className={`w-full text-left border rounded-md px-3 py-2.5 transition-colors ${selectedConfig === cfg.id ? 'bg-primary/5 border-primary/30' : 'hover:bg-muted/50'}`}
                >
                  <div className="flex items-center gap-2">
                    <Layers className="h-4 w-4 text-muted-foreground shrink-0" />
                    <div>
                      <p className="text-sm font-medium">{cfg.campaign?.name ?? 'Baseline'}</p>
                      <p className="text-xs text-muted-foreground">Priority {cfg.priority}</p>
                    </div>
                  </div>
                  {cfg.campaign?.status && (
                    <Badge variant="secondary" className="mt-1 text-xs">{cfg.campaign.status}</Badge>
                  )}
                </button>
              ))
          }
        </div>

        {/* Right: selected config details */}
        <div className="col-span-2">
          {!activeConfig
            ? <p className="text-sm text-muted-foreground">Select a configuration layer to manage slot assignments.</p>
            : (
              <Tabs defaultValue="slots">
                <TabsList>
                  <TabsTrigger value="slots">Slot Configs</TabsTrigger>
                  <TabsTrigger value="diff">Diff View</TabsTrigger>
                </TabsList>

                <TabsContent value="slots" className="mt-6">
                  <SlotConfigList config={activeConfig} page={page} pageConfigId={activeConfig.id} />
                </TabsContent>

                <TabsContent value="diff" className="mt-6 space-y-4">
                  <p className="text-sm text-muted-foreground">Compare two configuration layers to see what changed.</p>
                  <div className="flex gap-3 items-end">
                    <div className="flex-1">
                      <label className="text-xs text-muted-foreground block mb-1">From</label>
                      <Select value={diffFrom} onValueChange={setDiffFrom}>
                        <SelectTrigger><SelectValue placeholder="Select config…" /></SelectTrigger>
                        <SelectContent>
                          {configs.map(c => <SelectItem key={c.id} value={c.id}>{c.campaign?.name ?? 'Baseline'}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="flex-1">
                      <label className="text-xs text-muted-foreground block mb-1">To</label>
                      <Select value={diffTo} onValueChange={setDiffTo}>
                        <SelectTrigger><SelectValue placeholder="Select config…" /></SelectTrigger>
                        <SelectContent>
                          {configs.map(c => <SelectItem key={c.id} value={c.id}>{c.campaign?.name ?? 'Baseline'}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  {diffFrom && diffTo && diffFrom !== diffTo && <DiffView fromId={diffFrom} toId={diffTo} />}
                </TabsContent>
              </Tabs>
            )
          }
        </div>
      </div>

      {/* Create config dialog */}
      <Dialog open={showCreateConfig} onOpenChange={setShowCreateConfig}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>New Configuration Layer</DialogTitle>
            <DialogDescription>Create a baseline or campaign-scoped slot configuration.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium block mb-1">Campaign (leave blank for baseline)</label>
              <Select value={newCampaignId} onValueChange={setNewCampaignId}>
                <SelectTrigger><SelectValue placeholder="Baseline (no campaign)" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Baseline</SelectItem>
                  {campaigns.map(c => <SelectItem key={c.id} value={c.id}>{c.name} ({c.status})</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium block mb-1">Priority</label>
              <Input type="number" value={newPriority} onChange={e => setNewPriority(e.target.value)} />
            </div>
            {createError && <p className="text-sm text-destructive">{createError}</p>}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateConfig(false)}>Cancel</Button>
            <Button onClick={() => createConfigMutation.mutate()} disabled={createConfigMutation.isPending}>
              {createConfigMutation.isPending ? 'Creating…' : 'Create Layer'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
