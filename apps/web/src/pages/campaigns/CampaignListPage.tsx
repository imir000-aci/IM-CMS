import React, { useState } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, Search, Copy } from 'lucide-react'
import { PageHeader } from '../../components/PageHeader'
import { DataTable, type Column } from '../../components/DataTable'
import { Button } from '../../components/ui/button'
import { Input } from '../../components/ui/input'
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '../../components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '../../components/ui/dialog'
import { CampaignStatusBadge } from '../../components/StatusBadge'
import { Pagination } from '../../components/Pagination'
import { campaignsApi, type Campaign } from '../../lib/api'

const STATUSES = ['DRAFT', 'REVIEW', 'SCHEDULED', 'PREVIEW', 'PRODUCTION', 'ARCHIVED']

function CreateCampaignDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const qc = useQueryClient()
  const navigate = useNavigate()
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [error, setError] = useState<string | null>(null)

  const mutation = useMutation({
    mutationFn: () => campaignsApi.create({ name, description: description || undefined, startDate: startDate || undefined, endDate: endDate || undefined }),
    onSuccess: (res) => {
      void qc.invalidateQueries({ queryKey: ['campaigns'] })
      onOpenChange(false)
      void navigate({ to: '/campaigns/$campaignId', params: { campaignId: (res.data as { data: Campaign }).data.id } })
    },
    onError: (e: unknown) => setError((e as Error).message),
  })

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>New Campaign</DialogTitle>
          <DialogDescription>Create a new campaign. You can attach channels, pages, and experiences after creation.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium block mb-1">Campaign Name *</label>
            <Input value={name} onChange={e => setName(e.target.value)} placeholder="Summer Sale 2026" />
          </div>
          <div>
            <label className="text-sm font-medium block mb-1">Description</label>
            <Input value={description} onChange={e => setDescription(e.target.value)} placeholder="Optional description…" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm font-medium block mb-1">Start Date</label>
              <Input type="datetime-local" value={startDate} onChange={e => setStartDate(e.target.value)} />
            </div>
            <div>
              <label className="text-sm font-medium block mb-1">End Date</label>
              <Input type="datetime-local" value={endDate} onChange={e => setEndDate(e.target.value)} />
            </div>
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={() => mutation.mutate()} disabled={!name || mutation.isPending}>
            {mutation.isPending ? 'Creating…' : 'Create Campaign'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export function CampaignListPage() {
  const navigate = useNavigate()
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [page, setPage] = useState(1)
  const [showCreate, setShowCreate] = useState(false)

  const { data, isLoading } = useQuery({
    queryKey: ['campaigns', { search, status: statusFilter, page }],
    queryFn: () =>
      campaignsApi.list({
        search: search || undefined,
        status: statusFilter !== 'all' ? statusFilter : undefined,
        page, pageSize: 20,
      }),
  })

  const columns: Column<Campaign>[] = [
    {
      key: 'name', header: 'Campaign',
      cell: (row) => (
        <div>
          <p className="font-medium">{row.name}</p>
          {row.description && <p className="text-xs text-muted-foreground truncate max-w-xs">{row.description}</p>}
        </div>
      ),
    },
    {
      key: 'status', header: 'Status',
      cell: (row) => <CampaignStatusBadge status={row.status} />,
    },
    {
      key: 'dates', header: 'Dates',
      cell: (row) => (
        <span className="text-sm text-muted-foreground">
          {row.startDate ? new Date(row.startDate).toLocaleDateString() : '—'}{' '}
          {row.endDate ? `→ ${new Date(row.endDate).toLocaleDateString()}` : ''}
        </span>
      ),
    },
    {
      key: 'approvals', header: 'Steps',
      cell: (row) => (
        <span className="text-sm text-muted-foreground">
          {row._count?.approvalSteps ?? 0} approval{row._count?.approvalSteps !== 1 ? 's' : ''}
        </span>
      ),
    },
    {
      key: 'updated', header: 'Updated',
      cell: (row) => <span className="text-sm text-muted-foreground">{new Date(row.updatedAt).toLocaleDateString()}</span>,
    },
    {
      key: 'actions', header: '', className: 'w-10',
      cell: (row) => (
        <Button
          variant="ghost" size="icon"
          onClick={e => { e.stopPropagation(); void navigate({ to: '/campaigns/$campaignId', params: { campaignId: row.id } }) }}
        >
          <Copy className="h-4 w-4" />
        </Button>
      ),
    },
  ]

  const list = (data?.data as unknown as { items?: Campaign[] })?.items ?? []
  const meta = data?.data as unknown as { total?: number } | undefined

  return (
    <div>
      <PageHeader
        title="Campaigns"
        description="Manage campaign lifecycle from draft to production"
        actions={<Button onClick={() => setShowCreate(true)}><Plus className="h-4 w-4" />New Campaign</Button>}
      />

      <div className="p-8">
        <div className="flex gap-3 mb-6">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input className="pl-9" placeholder="Search campaigns…" value={search} onChange={e => { setSearch(e.target.value); setPage(1) }} />
          </div>
          <Select value={statusFilter} onValueChange={v => { setStatusFilter(v); setPage(1) }}>
            <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              {STATUSES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        <DataTable
          columns={columns}
          data={list}
          keyFn={r => r.id}
          loading={isLoading}
          emptyMessage="No campaigns yet."
          onRowClick={row => void navigate({ to: '/campaigns/$campaignId', params: { campaignId: row.id } })}
        />

        {meta?.total && meta.total > 20 && (
          <Pagination page={page} pageSize={20} total={meta.total} onPageChange={setPage} />
        )}
      </div>

      <CreateCampaignDialog open={showCreate} onOpenChange={setShowCreate} />
    </div>
  )
}
