import React, { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, Search } from 'lucide-react'
import { PageHeader } from '../../components/PageHeader'
import { DataTable, type Column } from '../../components/DataTable'
import { Button } from '../../components/ui/button'
import { Input } from '../../components/ui/input'
import { Badge } from '../../components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '../../components/ui/dialog'
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '../../components/ui/select'
import { ConfirmDialog } from '../../components/ConfirmDialog'
import { Pagination } from '../../components/Pagination'
import { usersApi, type UserRecord } from '../../lib/api'

const ROLES = ['PLATFORM_ADMIN', 'CONTENT_AUTHOR', 'CAMPAIGN_MANAGER', 'DEVELOPER', 'APPROVER', 'ANALYST']

const ROLE_COLORS: Record<string, 'default' | 'secondary' | 'info' | 'warning' | 'success'> = {
  PLATFORM_ADMIN: 'warning',
  CAMPAIGN_MANAGER: 'info',
  APPROVER: 'success',
  CONTENT_AUTHOR: 'secondary',
  DEVELOPER: 'secondary',
  ANALYST: 'secondary',
}

function UserDialog({
  open,
  onOpenChange,
  editing,
}: {
  open: boolean
  onOpenChange: (o: boolean) => void
  editing: UserRecord | null
}) {
  const qc = useQueryClient()
  const [email, setEmail] = useState(editing?.email ?? '')
  const [displayName, setDisplayName] = useState(editing?.displayName ?? '')
  const [role, setRole] = useState(editing?.role ?? 'CONTENT_AUTHOR')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)

  React.useEffect(() => {
    if (editing) {
      setEmail(editing.email); setDisplayName(editing.displayName); setRole(editing.role)
    } else {
      setEmail(''); setDisplayName(''); setRole('CONTENT_AUTHOR'); setPassword('')
    }
    setError(null)
  }, [editing, open])

  const createMutation = useMutation({
    mutationFn: () => usersApi.create({ email, displayName, role, password }),
    onSuccess: () => { void qc.invalidateQueries({ queryKey: ['users'] }); onOpenChange(false) },
    onError: (e: unknown) => setError((e as Error).message),
  })

  const updateMutation = useMutation({
    mutationFn: () => usersApi.update(editing!.id, { displayName, role }),
    onSuccess: () => { void qc.invalidateQueries({ queryKey: ['users'] }); onOpenChange(false) },
    onError: (e: unknown) => setError((e as Error).message),
  })

  const isEdit = !!editing
  const isPending = createMutation.isPending || updateMutation.isPending

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Edit User' : 'Invite User'}</DialogTitle>
          <DialogDescription>{isEdit ? 'Update display name or role.' : 'Create a new user account.'}</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium block mb-1">Email *</label>
            <Input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="user@example.com"
              disabled={isEdit}
            />
          </div>
          <div>
            <label className="text-sm font-medium block mb-1">Display Name *</label>
            <Input value={displayName} onChange={e => setDisplayName(e.target.value)} placeholder="Jane Smith" />
          </div>
          <div>
            <label className="text-sm font-medium block mb-1">Role *</label>
            <Select value={role} onValueChange={setRole}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{ROLES.map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          {!isEdit && (
            <div>
              <label className="text-sm font-medium block mb-1">Password *</label>
              <Input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Min 8 characters" />
            </div>
          )}
          {error && <p className="text-sm text-destructive">{error}</p>}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button
            onClick={() => isEdit ? updateMutation.mutate() : createMutation.mutate()}
            disabled={!email || !displayName || (!isEdit && !password) || isPending}
          >
            {isPending ? 'Saving…' : isEdit ? 'Save Changes' : 'Invite User'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export function UsersPage() {
  const qc = useQueryClient()
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [showDialog, setShowDialog] = useState(false)
  const [editing, setEditing] = useState<UserRecord | null>(null)
  const [deactivating, setDeactivating] = useState<UserRecord | null>(null)

  const { data, isLoading } = useQuery({
    queryKey: ['users', { search, page }],
    queryFn: () => usersApi.list({ search: search || undefined, page, pageSize: 20 }),
  })

  const deactivateMutation = useMutation({
    mutationFn: (id: string) => usersApi.deactivate(id),
    onSuccess: () => { void qc.invalidateQueries({ queryKey: ['users'] }); setDeactivating(null) },
  })

  const columns: Column<UserRecord>[] = [
    {
      key: 'user', header: 'User',
      cell: (row) => (
        <div>
          <p className="font-medium">{row.displayName}</p>
          <p className="text-xs text-muted-foreground">{row.email}</p>
        </div>
      ),
    },
    {
      key: 'role', header: 'Role',
      cell: (row) => <Badge variant={ROLE_COLORS[row.role] ?? 'secondary'}>{row.role}</Badge>,
    },
    {
      key: 'status', header: 'Status',
      cell: (row) => row.isActive ? <Badge variant="success">Active</Badge> : <Badge variant="secondary">Inactive</Badge>,
    },
    {
      key: 'joined', header: 'Joined',
      cell: (row) => <span className="text-sm text-muted-foreground">{new Date(row.createdAt).toLocaleDateString()}</span>,
    },
    {
      key: 'actions', header: '', className: 'w-28',
      cell: (row) => (
        <div className="flex gap-1" onClick={e => e.stopPropagation()}>
          <Button size="sm" variant="ghost" onClick={() => { setEditing(row); setShowDialog(true) }}>Edit</Button>
          {row.isActive && (
            <Button size="sm" variant="ghost" onClick={() => setDeactivating(row)}>Deactivate</Button>
          )}
        </div>
      ),
    },
  ]

  const list = (data?.data as unknown as { items?: UserRecord[] })?.items ?? []
  const meta = data?.data as unknown as { total?: number } | undefined

  return (
    <div>
      <PageHeader
        title="Users"
        description="Manage user accounts and role assignments"
        actions={<Button onClick={() => { setEditing(null); setShowDialog(true) }}><Plus className="h-4 w-4" />Invite User</Button>}
      />

      <div className="p-8">
        <div className="flex gap-3 mb-6">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input className="pl-9" placeholder="Search users…" value={search} onChange={e => { setSearch(e.target.value); setPage(1) }} />
          </div>
        </div>

        <DataTable
          columns={columns}
          data={list}
          keyFn={r => r.id}
          loading={isLoading}
          emptyMessage="No users found."
        />

        {meta?.total && meta.total > 20 && (
          <Pagination page={page} pageSize={20} total={meta.total} onPageChange={setPage} />
        )}
      </div>

      <UserDialog
        open={showDialog}
        onOpenChange={o => { setShowDialog(o); if (!o) setEditing(null) }}
        editing={editing}
      />

      <ConfirmDialog
        open={!!deactivating}
        onOpenChange={o => !o && setDeactivating(null)}
        title={`Deactivate "${deactivating?.displayName}"?`}
        description="The user will be unable to log in. This can be reversed by re-activating the account."
        confirmLabel="Deactivate"
        variant="default"
        onConfirm={() => deactivating && deactivateMutation.mutate(deactivating.id)}
        loading={deactivateMutation.isPending}
      />
    </div>
  )
}
