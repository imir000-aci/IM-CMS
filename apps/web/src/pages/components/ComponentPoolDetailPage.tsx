import React, { useState } from 'react'
import { useParams, useNavigate } from '@tanstack/react-router'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { ArrowLeft, Plus, Trash2, GripVertical } from 'lucide-react'
import { PageHeader } from '../../components/PageHeader'
import { Button } from '../../components/ui/button'
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '../../components/ui/select'
import { ConfirmDialog } from '../../components/ConfirmDialog'
import { componentPoolsApi, instancesApi, type ComponentPoolItem, type ComponentInstance } from '../../lib/api'

export function ComponentPoolDetailPage() {
  const { poolId } = useParams({ strict: false }) as { poolId: string }
  const navigate = useNavigate()
  const qc = useQueryClient()
  const [addInstanceId, setAddInstanceId] = useState('')
  const [removingItem, setRemovingItem] = useState<ComponentPoolItem | null>(null)
  const [addError, setAddError] = useState<string | null>(null)

  const { data, isLoading } = useQuery({
    queryKey: ['component-pools', poolId],
    queryFn: () => componentPoolsApi.get(poolId),
  })
  const { data: instancesData } = useQuery({
    queryKey: ['component-instances', { pageSize: 200 }],
    queryFn: () => instancesApi.list({ pageSize: 200 }),
  })

  const pool = (data?.data as unknown as { data: typeof data })?.data as unknown as {
    id: string; name: string; description?: string; isActive: boolean
    items?: ComponentPoolItem[]
  } | undefined
  const poolItems: ComponentPoolItem[] = (data?.data as unknown as { data: { items?: ComponentPoolItem[] } })?.data?.items ?? []
  const instances: ComponentInstance[] = (instancesData?.data as unknown as { items?: ComponentInstance[] })?.items ?? []

  const addMutation = useMutation({
    mutationFn: () => componentPoolsApi.addItem(poolId, addInstanceId),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['component-pools', poolId] })
      setAddInstanceId('')
      setAddError(null)
    },
    onError: (e: unknown) => setAddError((e as Error).message),
  })

  const removeMutation = useMutation({
    mutationFn: (itemId: string) => componentPoolsApi.removeItem(poolId, itemId),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['component-pools', poolId] })
      setRemovingItem(null)
    },
  })

  const reorderMutation = useMutation({
    mutationFn: (ids: string[]) => componentPoolsApi.reorderItems(poolId, ids),
    onSuccess: () => void qc.invalidateQueries({ queryKey: ['component-pools', poolId] }),
  })

  const moveItem = (fromIdx: number, toIdx: number) => {
    const ids = poolItems.map(i => i.id)
    const moved = ids.splice(fromIdx, 1)[0]!
    ids.splice(toIdx, 0, moved)
    reorderMutation.mutate(ids)
  }

  if (isLoading) return <div className="p-8 text-muted-foreground">Loading…</div>

  const existingInstanceIds = new Set(poolItems.map(i => i.componentInstanceId))
  const availableInstances = instances.filter(i => !existingInstanceIds.has(i.id))

  return (
    <div>
      <PageHeader
        title={pool?.name ?? 'Component Pool'}
        description={pool?.description ?? `${poolItems.length} items`}
        actions={
          <Button variant="outline" onClick={() => void navigate({ to: '/component-pools' })}>
            <ArrowLeft className="h-4 w-4" /> Back
          </Button>
        }
      />

      <div className="p-8 max-w-2xl space-y-6">
        {/* Add item */}
        <div className="space-y-2">
          <p className="text-sm font-medium">Add Instance to Pool</p>
          <div className="flex gap-2">
            <Select value={addInstanceId} onValueChange={setAddInstanceId}>
              <SelectTrigger className="flex-1">
                <SelectValue placeholder="Select component instance…" />
              </SelectTrigger>
              <SelectContent>
                {availableInstances.map(i => (
                  <SelectItem key={i.id} value={i.id}>
                    {i.name} <span className="text-muted-foreground">({i.masterComponent?.slug ?? '—'})</span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button onClick={() => addMutation.mutate()} disabled={!addInstanceId || addMutation.isPending}>
              <Plus className="h-4 w-4" /> Add
            </Button>
          </div>
          {addError && <p className="text-sm text-destructive">{addError}</p>}
        </div>

        {/* Pool items */}
        <div>
          <p className="text-sm font-medium mb-3">Pool Items ({poolItems.length})</p>
          {poolItems.length === 0 ? (
            <div className="border border-dashed rounded-md p-8 text-center text-sm text-muted-foreground">
              No items in this pool. Add component instances above.
            </div>
          ) : (
            <div className="space-y-2">
              {poolItems.map((item, idx) => (
                <div key={item.id} className="flex items-center gap-3 border rounded-md px-3 py-2.5 bg-background">
                  <div className="flex flex-col gap-0.5">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-5 w-5"
                      disabled={idx === 0 || reorderMutation.isPending}
                      onClick={() => moveItem(idx, idx - 1)}
                    >
                      <GripVertical className="h-3 w-3" />
                    </Button>
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium">{item.componentInstance?.name ?? item.componentInstanceId}</p>
                    <p className="text-xs text-muted-foreground">{item.componentInstance?.masterComponent?.slug ?? '—'}</p>
                  </div>
                  <span className="text-xs text-muted-foreground">#{idx + 1}</span>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setRemovingItem(item)}
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <ConfirmDialog
        open={!!removingItem}
        onOpenChange={o => !o && setRemovingItem(null)}
        title="Remove from pool?"
        description={`Remove "${removingItem?.componentInstance?.name}" from this pool?`}
        confirmLabel="Remove"
        variant="default"
        onConfirm={() => removingItem && removeMutation.mutate(removingItem.id)}
        loading={removeMutation.isPending}
      />
    </div>
  )
}

