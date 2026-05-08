import React, { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, Search, ArrowRight } from 'lucide-react'
import { PageHeader } from '../../components/PageHeader'
import { DataTable, type Column } from '../../components/DataTable'
import { Button } from '../../components/ui/button'
import { Input } from '../../components/ui/input'
import { Badge } from '../../components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '../../components/ui/dialog'
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '../../components/ui/select'
import { ConfirmDialog } from '../../components/ConfirmDialog'
import { Pagination } from '../../components/Pagination'
import { seoApi, type SeoRedirect } from '../../lib/api'

const STATUS_CODES = ['301', '302', '307', '308', '410']

function RedirectDialog({
  open,
  onOpenChange,
  editing,
}: {
  open: boolean
  onOpenChange: (o: boolean) => void
  editing: SeoRedirect | null
}) {
  const qc = useQueryClient()
  const [fromPath, setFromPath] = useState(editing?.fromPath ?? '')
  const [toPath, setToPath] = useState(editing?.toPath ?? '')
  const [statusCode, setStatusCode] = useState(String(editing?.statusCode ?? '301'))
  const [error, setError] = useState<string | null>(null)

  React.useEffect(() => {
    if (editing) {
      setFromPath(editing.fromPath); setToPath(editing.toPath); setStatusCode(String(editing.statusCode))
    } else {
      setFromPath(''); setToPath(''); setStatusCode('301')
    }
    setError(null)
  }, [editing, open])

  const createMutation = useMutation({
    mutationFn: () => seoApi.createRedirect({ fromPath, toPath, statusCode: Number(statusCode) }),
    onSuccess: () => { void qc.invalidateQueries({ queryKey: ['seo-redirects'] }); onOpenChange(false) },
    onError: (e: unknown) => setError((e as Error).message),
  })

  const updateMutation = useMutation({
    mutationFn: () => seoApi.updateRedirect(editing!.id, { fromPath, toPath, statusCode: Number(statusCode) }),
    onSuccess: () => { void qc.invalidateQueries({ queryKey: ['seo-redirects'] }); onOpenChange(false) },
    onError: (e: unknown) => setError((e as Error).message),
  })

  const isEdit = !!editing
  const isPending = createMutation.isPending || updateMutation.isPending

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Edit Redirect' : 'New Redirect'}</DialogTitle>
          <DialogDescription>Configure a URL redirect rule.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium block mb-1">From Path *</label>
            <Input value={fromPath} onChange={e => setFromPath(e.target.value)} placeholder="/old-page" />
          </div>
          <div className="flex items-center gap-2">
            <ArrowRight className="h-4 w-4 text-muted-foreground shrink-0" />
          </div>
          <div>
            <label className="text-sm font-medium block mb-1">To Path *</label>
            <Input value={toPath} onChange={e => setToPath(e.target.value)} placeholder="/new-page" />
          </div>
          <div>
            <label className="text-sm font-medium block mb-1">Status Code</label>
            <Select value={statusCode} onValueChange={setStatusCode}>
              <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
              <SelectContent>
                {STATUS_CODES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button
            onClick={() => isEdit ? updateMutation.mutate() : createMutation.mutate()}
            disabled={!fromPath || !toPath || isPending}
          >
            {isPending ? 'Saving…' : isEdit ? 'Save Changes' : 'Create Redirect'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export function SeoPage() {
  const qc = useQueryClient()
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [showDialog, setShowDialog] = useState(false)
  const [editing, setEditing] = useState<SeoRedirect | null>(null)
  const [deleting, setDeleting] = useState<SeoRedirect | null>(null)

  const { data, isLoading } = useQuery({
    queryKey: ['seo-redirects', { search, page }],
    queryFn: () => seoApi.listRedirects({ search: search || undefined, page, pageSize: 20 }),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => seoApi.deleteRedirect(id),
    onSuccess: () => { void qc.invalidateQueries({ queryKey: ['seo-redirects'] }); setDeleting(null) },
  })

  const columns: Column<SeoRedirect>[] = [
    {
      key: 'from', header: 'From',
      cell: (row) => <span className="font-mono text-sm">{row.fromPath}</span>,
    },
    {
      key: 'to', header: 'To',
      cell: (row) => <span className="font-mono text-sm text-muted-foreground">{row.toPath}</span>,
    },
    {
      key: 'code', header: 'Status',
      cell: (row) => (
        <Badge variant={row.statusCode === 301 || row.statusCode === 308 ? 'success' : 'secondary'}>
          {row.statusCode}
        </Badge>
      ),
    },
    {
      key: 'active', header: 'Active',
      cell: (row) => row.isActive ? <Badge variant="success">Active</Badge> : <Badge variant="secondary">Inactive</Badge>,
    },
    {
      key: 'created', header: 'Created',
      cell: (row) => <span className="text-sm text-muted-foreground">{new Date(row.createdAt).toLocaleDateString()}</span>,
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

  const list = (data?.data as unknown as { items?: SeoRedirect[] })?.items ?? []
  const meta = data?.data as unknown as { total?: number } | undefined

  return (
    <div>
      <PageHeader
        title="SEO Manager"
        description="URL redirects and search engine configuration"
        actions={
          <Button onClick={() => { setEditing(null); setShowDialog(true) }}>
            <Plus className="h-4 w-4" />New Redirect
          </Button>
        }
      />

      <div className="p-8">
        <div className="flex gap-3 mb-6">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input className="pl-9" placeholder="Search redirects…" value={search} onChange={e => { setSearch(e.target.value); setPage(1) }} />
          </div>
        </div>

        <DataTable
          columns={columns}
          data={list}
          keyFn={r => r.id}
          loading={isLoading}
          emptyMessage="No redirects configured."
        />

        {meta?.total && meta.total > 20 && (
          <Pagination page={page} pageSize={20} total={meta.total} onPageChange={setPage} />
        )}
      </div>

      <RedirectDialog
        open={showDialog}
        onOpenChange={o => { setShowDialog(o); if (!o) setEditing(null) }}
        editing={editing}
      />

      <ConfirmDialog
        open={!!deleting}
        onOpenChange={o => !o && setDeleting(null)}
        title={`Delete redirect "${deleting?.fromPath}"?`}
        description="This redirect will be permanently removed."
        confirmLabel="Delete"
        variant="destructive"
        onConfirm={() => deleting && deleteMutation.mutate(deleting.id)}
        loading={deleteMutation.isPending}
      />
    </div>
  )
}
