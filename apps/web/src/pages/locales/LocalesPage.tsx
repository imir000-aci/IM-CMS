import React, { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus } from 'lucide-react'
import { PageHeader } from '../../components/PageHeader'
import { DataTable, type Column } from '../../components/DataTable'
import { Button } from '../../components/ui/button'
import { Input } from '../../components/ui/input'
import { Badge } from '../../components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '../../components/ui/dialog'
import { ConfirmDialog } from '../../components/ConfirmDialog'
import { localesApi, type Locale } from '../../lib/api'

function LocaleDialog({
  open,
  onOpenChange,
  editing,
}: {
  open: boolean
  onOpenChange: (o: boolean) => void
  editing: Locale | null
}) {
  const qc = useQueryClient()
  const [code, setCode] = useState(editing?.code ?? '')
  const [name, setName] = useState(editing?.name ?? '')
  const [isDefault, setIsDefault] = useState(editing?.isDefault ?? false)
  const [error, setError] = useState<string | null>(null)

  React.useEffect(() => {
    if (editing) {
      setCode(editing.code); setName(editing.name); setIsDefault(editing.isDefault)
    } else {
      setCode(''); setName(''); setIsDefault(false)
    }
    setError(null)
  }, [editing, open])

  const createMutation = useMutation({
    mutationFn: () => localesApi.create({ code, name, isDefault }),
    onSuccess: () => { void qc.invalidateQueries({ queryKey: ['locales'] }); onOpenChange(false) },
    onError: (e: unknown) => setError((e as Error).message),
  })

  const updateMutation = useMutation({
    mutationFn: () => localesApi.update(editing!.code, { name, isDefault }),
    onSuccess: () => { void qc.invalidateQueries({ queryKey: ['locales'] }); onOpenChange(false) },
    onError: (e: unknown) => setError((e as Error).message),
  })

  const isEdit = !!editing
  const isPending = createMutation.isPending || updateMutation.isPending

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Edit Locale' : 'Add Locale'}</DialogTitle>
          <DialogDescription>Locales define supported languages for content translation.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium block mb-1">Code *</label>
            <Input
              value={code}
              onChange={e => setCode(e.target.value.toLowerCase())}
              placeholder="en, fr, de, zh-Hans…"
              disabled={isEdit}
            />
          </div>
          <div>
            <label className="text-sm font-medium block mb-1">Name *</label>
            <Input value={name} onChange={e => setName(e.target.value)} placeholder="English" />
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={isDefault}
              onChange={e => setIsDefault(e.target.checked)}
              className="rounded"
            />
            Set as default locale
          </label>
          {error && <p className="text-sm text-destructive">{error}</p>}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button
            onClick={() => isEdit ? updateMutation.mutate() : createMutation.mutate()}
            disabled={!code || !name || isPending}
          >
            {isPending ? 'Saving…' : isEdit ? 'Save Changes' : 'Add Locale'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export function LocalesPage() {
  const qc = useQueryClient()
  const [showDialog, setShowDialog] = useState(false)
  const [editing, setEditing] = useState<Locale | null>(null)
  const [deleting, setDeleting] = useState<Locale | null>(null)

  const { data, isLoading } = useQuery({
    queryKey: ['locales'],
    queryFn: () => localesApi.list(),
  })

  const deleteMutation = useMutation({
    mutationFn: (code: string) => localesApi.delete(code),
    onSuccess: () => { void qc.invalidateQueries({ queryKey: ['locales'] }); setDeleting(null) },
  })

  const locales: Locale[] = (data?.data as unknown as { data: Locale[] })?.data ?? []

  const columns: Column<Locale>[] = [
    {
      key: 'code', header: 'Code',
      cell: (row) => <Badge variant="secondary" className="font-mono">{row.code}</Badge>,
    },
    { key: 'name', header: 'Name', cell: (row) => <span className="font-medium">{row.name}</span> },
    {
      key: 'default', header: 'Default',
      cell: (row) => row.isDefault ? <Badge variant="success">Default</Badge> : null,
    },
    {
      key: 'status', header: 'Status',
      cell: (row) => row.isActive ? <Badge variant="success">Active</Badge> : <Badge variant="secondary">Inactive</Badge>,
    },
    {
      key: 'actions', header: '', className: 'w-28',
      cell: (row) => (
        <div className="flex gap-1" onClick={e => e.stopPropagation()}>
          <Button size="sm" variant="ghost" onClick={() => { setEditing(row); setShowDialog(true) }}>Edit</Button>
          {!row.isDefault && (
            <Button size="sm" variant="ghost" onClick={() => setDeleting(row)}>Delete</Button>
          )}
        </div>
      ),
    },
  ]

  return (
    <div>
      <PageHeader
        title="Localization"
        description="Manage supported locales for content translation"
        actions={<Button onClick={() => { setEditing(null); setShowDialog(true) }}><Plus className="h-4 w-4" />Add Locale</Button>}
      />

      <div className="p-8">
        <DataTable
          columns={columns}
          data={locales}
          keyFn={r => r.id}
          loading={isLoading}
          emptyMessage="No locales configured."
          onRowClick={row => { setEditing(row); setShowDialog(true) }}
        />
      </div>

      <LocaleDialog
        open={showDialog}
        onOpenChange={o => { setShowDialog(o); if (!o) setEditing(null) }}
        editing={editing}
      />

      <ConfirmDialog
        open={!!deleting}
        onOpenChange={o => !o && setDeleting(null)}
        title={`Delete locale "${deleting?.code}"?`}
        description="All locale-specific content for this locale will be removed."
        confirmLabel="Delete"
        variant="destructive"
        onConfirm={() => deleting && deleteMutation.mutate(deleting.code)}
        loading={deleteMutation.isPending}
      />
    </div>
  )
}
