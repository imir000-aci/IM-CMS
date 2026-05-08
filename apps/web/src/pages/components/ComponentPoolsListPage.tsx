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
import { componentPoolsApi, type ComponentPool } from '../../lib/api'

function CreatePoolDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const qc = useQueryClient()
  const navigate = useNavigate()
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [error, setError] = useState<string | null>(null)

  const mutation = useMutation({
    mutationFn: () => componentPoolsApi.create({ name, description: description || undefined }),
    onSuccess: (res) => {
      void qc.invalidateQueries({ queryKey: ['component-pools'] })
      onOpenChange(false)
      setName(''); setDescription(''); setError(null)
      const pool = (res.data as unknown as { data: { id: string } }).data
      void navigate({ to: '/component-pools/$poolId', params: { poolId: pool.id } })
    },
    onError: (e: unknown) => setError((e as Error).message),
  })

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>New Component Pool</DialogTitle>
          <DialogDescription>Group component instances into a reusable pool for campaigns.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium block mb-1">Name *</label>
            <Input value={name} onChange={e => setName(e.target.value)} placeholder="Summer Sale Components" />
          </div>
          <div>
            <label className="text-sm font-medium block mb-1">Description</label>
            <Input value={description} onChange={e => setDescription(e.target.value)} placeholder="Optional description" />
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={() => mutation.mutate()} disabled={!name || mutation.isPending}>
            {mutation.isPending ? 'Creating…' : 'Create Pool'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export function ComponentPoolsListPage() {
  const navigate = useNavigate()
  const [search, setSearch] = useState('')
  const [showCreate, setShowCreate] = useState(false)

  const { data, isLoading } = useQuery({
    queryKey: ['component-pools', { search }],
    queryFn: () => componentPoolsApi.list({ search: search || undefined }),
  })

  const columns: Column<ComponentPool>[] = [
    {
      key: 'name', header: 'Pool',
      cell: (row) => (
        <div>
          <p className="font-medium">{row.name}</p>
          {row.description && <p className="text-xs text-muted-foreground">{row.description}</p>}
        </div>
      ),
    },
    {
      key: 'items', header: 'Items',
      cell: (row) => <span className="text-sm text-muted-foreground">{row.items?.length ?? 0} instances</span>,
    },
    {
      key: 'status', header: 'Status',
      cell: (row) => row.isActive ? <Badge variant="success">Active</Badge> : <Badge variant="secondary">Inactive</Badge>,
    },
    {
      key: 'created', header: 'Created',
      cell: (row) => <span className="text-sm text-muted-foreground">{new Date(row.createdAt).toLocaleDateString()}</span>,
    },
  ]

  const list = (data?.data as unknown as { items?: ComponentPool[] })?.items ?? []

  return (
    <div>
      <PageHeader
        title="Component Pools"
        description="Groups of component instances assigned to campaigns"
        actions={<Button onClick={() => setShowCreate(true)}><Plus className="h-4 w-4" />New Pool</Button>}
      />

      <div className="p-8">
        <div className="flex gap-3 mb-6">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input className="pl-9" placeholder="Search pools…" value={search} onChange={e => setSearch(e.target.value)} />
          </div>
        </div>

        <DataTable
          columns={columns}
          data={list}
          keyFn={r => r.id}
          loading={isLoading}
          emptyMessage="No component pools yet."
          onRowClick={row => void navigate({ to: '/component-pools/$poolId', params: { poolId: row.id } })}
        />
      </div>

      <CreatePoolDialog open={showCreate} onOpenChange={setShowCreate} />
    </div>
  )
}
