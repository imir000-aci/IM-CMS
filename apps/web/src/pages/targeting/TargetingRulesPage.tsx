import React, { useState } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, Search, Trash2, ChevronDown, ChevronRight } from 'lucide-react'
import { PageHeader } from '../../components/PageHeader'
import { DataTable, type Column } from '../../components/DataTable'
import { Button } from '../../components/ui/button'
import { Input } from '../../components/ui/input'
import { Badge } from '../../components/ui/badge'
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '../../components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '../../components/ui/dialog'
import { Pagination } from '../../components/Pagination'
import { targetingApi, type TargetingRule } from '../../lib/api'

// ─── Condition tree types ─────────────────────────────────────────────────────

type Operator = 'AND' | 'OR' | 'NOT'
type ConditionOp = 'eq' | 'neq' | 'gt' | 'gte' | 'lt' | 'lte' | 'contains' | 'in' | 'not_in'

interface LeafNode {
  type: 'leaf'
  attribute: string
  operator: ConditionOp
  value: string
}

interface BranchNode {
  type: 'branch'
  operator: Operator
  children: ConditionNode[]
}

type ConditionNode = LeafNode | BranchNode

const CONDITION_OPS: ConditionOp[] = ['eq', 'neq', 'gt', 'gte', 'lt', 'lte', 'contains', 'in', 'not_in']
const SCOPES = ['GLOBAL', 'CAMPAIGN', 'EXPERIENCE']

function newLeaf(): LeafNode { return { type: 'leaf', attribute: '', operator: 'eq', value: '' } }
function newBranch(op: Operator): BranchNode { return { type: 'branch', operator: op, children: [newLeaf()] } }

// ─── Recursive ConditionBuilder ───────────────────────────────────────────────

function ConditionBuilder({
  node,
  onChange,
  onRemove,
  depth = 0,
}: {
  node: ConditionNode
  onChange: (n: ConditionNode) => void
  onRemove?: () => void
  depth?: number
}) {
  const [expanded, setExpanded] = useState(true)
  const indent = depth * 16

  if (node.type === 'leaf') {
    return (
      <div className="flex items-center gap-2" style={{ marginLeft: indent }}>
        <div className="w-2 h-px bg-border" />
        <Input
          className="w-36 text-sm"
          placeholder="attribute"
          value={node.attribute}
          onChange={e => onChange({ ...node, attribute: e.target.value })}
        />
        <Select value={node.operator} onValueChange={v => onChange({ ...node, operator: v as ConditionOp })}>
          <SelectTrigger className="w-28 text-sm"><SelectValue /></SelectTrigger>
          <SelectContent>{CONDITION_OPS.map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}</SelectContent>
        </Select>
        <Input
          className="w-36 text-sm"
          placeholder="value"
          value={node.value}
          onChange={e => onChange({ ...node, value: e.target.value })}
        />
        {onRemove && (
          <Button variant="ghost" size="icon" onClick={onRemove}>
            <Trash2 className="h-3.5 w-3.5 text-destructive" />
          </Button>
        )}
      </div>
    )
  }

  const updateChild = (i: number, updated: ConditionNode) => {
    const next = [...node.children]
    next[i] = updated
    onChange({ ...node, children: next })
  }

  const removeChild = (i: number) => {
    onChange({ ...node, children: node.children.filter((_, idx) => idx !== i) })
  }

  const addChild = (type: 'leaf' | 'branch') => {
    const child: ConditionNode = type === 'leaf' ? newLeaf() : newBranch('AND')
    onChange({ ...node, children: [...node.children, child] })
  }

  return (
    <div style={{ marginLeft: indent }}>
      <div className="flex items-center gap-2 mb-1">
        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setExpanded(e => !e)}>
          {expanded ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
        </Button>
        <Select value={node.operator} onValueChange={v => onChange({ ...node, operator: v as Operator })}>
          <SelectTrigger className="w-20 h-7 text-xs"><SelectValue /></SelectTrigger>
          <SelectContent>
            {(['AND', 'OR', 'NOT'] as Operator[]).map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}
          </SelectContent>
        </Select>
        <Badge variant="secondary" className="text-xs">{node.children.length} conditions</Badge>
        {onRemove && (
          <Button variant="ghost" size="icon" className="h-6 w-6" onClick={onRemove}>
            <Trash2 className="h-3.5 w-3.5 text-destructive" />
          </Button>
        )}
      </div>

      {expanded && (
        <div className="ml-4 border-l pl-2 space-y-2">
          {node.children.map((child, i) => (
            <ConditionBuilder
              key={i}
              node={child}
              onChange={updated => updateChild(i, updated)}
              onRemove={node.children.length > 1 ? () => removeChild(i) : undefined}
              depth={0}
            />
          ))}
          <div className="flex gap-1.5 pt-1">
            <Button size="sm" variant="outline" className="h-6 text-xs" onClick={() => addChild('leaf')}>
              <Plus className="h-3 w-3" /> Condition
            </Button>
            <Button size="sm" variant="outline" className="h-6 text-xs" onClick={() => addChild('branch')}>
              <Plus className="h-3 w-3" /> Group
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Rule editor dialog ───────────────────────────────────────────────────────

function RuleDialog({
  open,
  onOpenChange,
  editing,
}: {
  open: boolean
  onOpenChange: (o: boolean) => void
  editing: TargetingRule | null
}) {
  const qc = useQueryClient()
  const [name, setName] = useState(editing?.name ?? '')
  const [description, setDescription] = useState(editing?.description ?? '')
  const [scope, setScope] = useState(editing?.scope ?? 'GLOBAL')
  const [tree, setTree] = useState<ConditionNode>(
    editing?.conditionTree
      ? (editing.conditionTree as ConditionNode)
      : newBranch('AND')
  )
  const [error, setError] = useState<string | null>(null)

  React.useEffect(() => {
    if (editing) {
      setName(editing.name)
      setDescription(editing.description ?? '')
      setScope(editing.scope)
      setTree(editing.conditionTree as ConditionNode ?? newBranch('AND'))
    } else {
      setName(''); setDescription(''); setScope('GLOBAL'); setTree(newBranch('AND'))
    }
    setError(null)
  }, [editing, open])

  const createMutation = useMutation({
    mutationFn: () => targetingApi.create({ name, description: description || undefined, scope, conditionTree: tree }),
    onSuccess: () => { void qc.invalidateQueries({ queryKey: ['targeting-rules'] }); onOpenChange(false) },
    onError: (e: unknown) => setError((e as Error).message),
  })

  const updateMutation = useMutation({
    mutationFn: () => targetingApi.update(editing!.id, { name, description: description || undefined, scope, conditionTree: tree }),
    onSuccess: () => { void qc.invalidateQueries({ queryKey: ['targeting-rules'] }); onOpenChange(false) },
    onError: (e: unknown) => setError((e as Error).message),
  })

  const isEdit = !!editing
  const isPending = createMutation.isPending || updateMutation.isPending

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Edit Targeting Rule' : 'New Targeting Rule'}</DialogTitle>
          <DialogDescription>Define conditions for targeting specific audiences.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm font-medium block mb-1">Name *</label>
              <Input value={name} onChange={e => setName(e.target.value)} placeholder="EU Returning Users" />
            </div>
            <div>
              <label className="text-sm font-medium block mb-1">Scope</label>
              <Select value={scope} onValueChange={setScope}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{SCOPES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </div>
          <div>
            <label className="text-sm font-medium block mb-1">Description</label>
            <Input value={description} onChange={e => setDescription(e.target.value)} />
          </div>
          <div>
            <label className="text-sm font-medium block mb-2">Condition Tree</label>
            <div className="border rounded-md p-3 bg-muted/30 overflow-x-auto">
              <ConditionBuilder node={tree} onChange={setTree} />
            </div>
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button
            onClick={() => isEdit ? updateMutation.mutate() : createMutation.mutate()}
            disabled={!name || isPending}
          >
            {isPending ? 'Saving…' : isEdit ? 'Save Changes' : 'Create Rule'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ─── List page ────────────────────────────────────────────────────────────────

export function TargetingRulesPage() {
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [showDialog, setShowDialog] = useState(false)
  const [editing, setEditing] = useState<TargetingRule | null>(null)

  const { data, isLoading } = useQuery({
    queryKey: ['targeting-rules', { search, page }],
    queryFn: () => targetingApi.list({ search: search || undefined, page, pageSize: 20 }),
  })

  const columns: Column<TargetingRule>[] = [
    {
      key: 'name', header: 'Name',
      cell: (row) => (
        <div>
          <p className="font-medium">{row.name}</p>
          {row.description && <p className="text-xs text-muted-foreground">{row.description}</p>}
        </div>
      ),
    },
    { key: 'scope', header: 'Scope', cell: (row) => <Badge variant="secondary">{row.scope}</Badge> },
    { key: 'priority', header: 'Priority', cell: (row) => <span className="text-sm text-muted-foreground">{row.priority}</span> },
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
          onClick={e => { e.stopPropagation(); setEditing(row); setShowDialog(true) }}
        >
          Edit
        </Button>
      ),
    },
  ]

  const list = (data?.data as unknown as { items?: TargetingRule[] })?.items ?? []
  const meta = data?.data as unknown as { total?: number } | undefined

  return (
    <div>
      <PageHeader
        title="Targeting Rules"
        description="Define audience conditions for personalized experiences"
        actions={
          <Button onClick={() => { setEditing(null); setShowDialog(true) }}>
            <Plus className="h-4 w-4" />New Rule
          </Button>
        }
      />

      <div className="p-8">
        <div className="flex gap-3 mb-6">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input className="pl-9" placeholder="Search rules…" value={search} onChange={e => { setSearch(e.target.value); setPage(1) }} />
          </div>
        </div>

        <DataTable
          columns={columns}
          data={list}
          keyFn={r => r.id}
          loading={isLoading}
          emptyMessage="No targeting rules yet."
          onRowClick={row => { setEditing(row); setShowDialog(true) }}
        />

        {meta?.total && meta.total > 20 && (
          <Pagination page={page} pageSize={20} total={meta.total} onPageChange={setPage} />
        )}
      </div>

      <RuleDialog
        open={showDialog}
        onOpenChange={o => { setShowDialog(o); if (!o) setEditing(null) }}
        editing={editing}
      />
    </div>
  )
}
