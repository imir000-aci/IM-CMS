import React, { useState } from 'react'
import { useParams, useNavigate } from '@tanstack/react-router'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { ArrowLeft, Plus, Trash2, ChevronDown, ChevronUp } from 'lucide-react'
import { PageHeader } from '../../components/PageHeader'
import { Button } from '../../components/ui/button'
import { Input } from '../../components/ui/input'
import { Badge } from '../../components/ui/badge'
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '../../components/ui/select'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '../../components/ui/tabs'
import { componentsApi, type AttributeDefinition, type MasterComponent } from '../../lib/api'

const DATA_TYPES = ['text', 'richtext', 'number', 'boolean', 'url', 'image', 'video', 'date', 'json', 'reference', 'select']

function AttributeRow({
  attr,
  onChange,
  onRemove,
}: {
  attr: AttributeDefinition
  onChange: (updated: AttributeDefinition) => void
  onRemove: () => void
}) {
  const [expanded, setExpanded] = useState(false)

  return (
    <div className="border rounded-md mb-2">
      <div className="flex items-center gap-3 p-3">
        <div className="flex-1 grid grid-cols-3 gap-2">
          <Input
            value={attr.name}
            onChange={e => onChange({ ...attr, name: e.target.value })}
            placeholder="attributeName"
          />
          <Select value={attr.dataType} onValueChange={v => onChange({ ...attr, dataType: v })}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>{DATA_TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
          </Select>
          <div className="flex items-center gap-3">
            <label className="flex items-center gap-1.5 text-sm">
              <input type="checkbox" checked={attr.required} onChange={e => onChange({ ...attr, required: e.target.checked })} />
              Required
            </label>
            <label className="flex items-center gap-1.5 text-sm">
              <input type="checkbox" checked={attr.isAuthorFillable} onChange={e => onChange({ ...attr, isAuthorFillable: e.target.checked })} />
              Author
            </label>
          </div>
        </div>
        <Button variant="ghost" size="icon" onClick={() => setExpanded(x => !x)}>
          {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </Button>
        <Button variant="ghost" size="icon" onClick={onRemove}>
          <Trash2 className="h-4 w-4 text-destructive" />
        </Button>
      </div>

      {expanded && (
        <div className="px-3 pb-3 grid grid-cols-3 gap-2 border-t pt-3">
          <div>
            <label className="text-xs text-muted-foreground block mb-1">Max Length</label>
            <Input
              type="number"
              value={attr.validationRules?.maxLength ?? ''}
              onChange={e => onChange({ ...attr, validationRules: { ...attr.validationRules, maxLength: e.target.value ? Number(e.target.value) : undefined } })}
              placeholder="200"
            />
          </div>
          <div>
            <label className="text-xs text-muted-foreground block mb-1">Regex Pattern</label>
            <Input
              value={attr.validationRules?.regex ?? ''}
              onChange={e => onChange({ ...attr, validationRules: { ...attr.validationRules, regex: e.target.value || undefined } })}
              placeholder="^[a-z]+"
            />
          </div>
          <div>
            <label className="text-xs text-muted-foreground block mb-1">Allowed Values (comma-sep)</label>
            <Input
              value={(attr.validationRules?.allowedValues ?? []).join(', ')}
              onChange={e => onChange({
                ...attr,
                validationRules: {
                  ...attr.validationRules,
                  allowedValues: e.target.value ? e.target.value.split(',').map(s => s.trim()) : undefined,
                },
              })}
              placeholder="small, medium, large"
            />
          </div>
        </div>
      )}
    </div>
  )
}

export function ComponentDetailPage() {
  const { componentId } = useParams({ strict: false }) as { componentId: string }
  const navigate = useNavigate()
  const qc = useQueryClient()

  const { data, isLoading } = useQuery({
    queryKey: ['components', componentId],
    queryFn: () => componentsApi.get(componentId),
  })
  const { data: versionsData } = useQuery({
    queryKey: ['components', componentId, 'versions'],
    queryFn: () => componentsApi.getVersions(componentId),
  })

  const component = data?.data.data as MasterComponent | undefined
  const [schema, setSchema] = useState<AttributeDefinition[] | null>(null)
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [isDirty, setIsDirty] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)

  React.useEffect(() => {
    if (component && schema === null) {
      setSchema(component.attributeSchema)
      setName(component.name)
      setDescription(component.description ?? '')
    }
  }, [component, schema])

  const updateMutation = useMutation({
    mutationFn: () =>
      componentsApi.update(componentId, {
        name, description: description || undefined, attributeSchema: schema,
      }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['components', componentId] })
      setIsDirty(false)
      setSaveError(null)
    },
    onError: (e: unknown) => setSaveError((e as Error).message),
  })

  const restoreMutation = useMutation({
    mutationFn: (version: number) => componentsApi.restoreVersion(componentId, version),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['components', componentId] })
      setSchema(null) // reset local state to pick up restored version
    },
  })

  if (isLoading) return <div className="p-8 text-muted-foreground">Loading…</div>
  if (!component) return <div className="p-8 text-muted-foreground">Component not found.</div>

  const currentSchema = schema ?? component.attributeSchema

  const addAttribute = () => {
    setSchema([...currentSchema, { name: '', dataType: 'text', required: false, isAuthorFillable: true }])
    setIsDirty(true)
  }

  const updateAttr = (i: number, updated: AttributeDefinition) => {
    const next = [...currentSchema]
    next[i] = updated
    setSchema(next)
    setIsDirty(true)
  }

  const removeAttr = (i: number) => {
    setSchema(currentSchema.filter((_, idx) => idx !== i))
    setIsDirty(true)
  }

  return (
    <div>
      <PageHeader
        title={component.name}
        description={`v${component.currentVersion} · ${component.slug}`}
        actions={
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => void navigate({ to: '/components' })}>
              <ArrowLeft className="h-4 w-4" /> Back
            </Button>
            <Button variant="outline" onClick={() => void navigate({ to: '/components/$componentId/bento', params: { componentId } })}>
              Bento Layout
            </Button>
            {isDirty && (
              <Button onClick={() => updateMutation.mutate()} disabled={updateMutation.isPending}>
                {updateMutation.isPending ? 'Saving…' : 'Save Changes'}
              </Button>
            )}
          </div>
        }
      />

      <div className="p-8">
        {saveError && <p className="text-sm text-destructive mb-4">{saveError}</p>}

        <Tabs defaultValue="schema">
          <TabsList>
            <TabsTrigger value="schema">Attribute Schema</TabsTrigger>
            <TabsTrigger value="meta">Metadata</TabsTrigger>
            <TabsTrigger value="versions">Version History</TabsTrigger>
          </TabsList>

          <TabsContent value="schema" className="mt-6">
            <div className="flex items-center justify-between mb-4">
              <p className="text-sm text-muted-foreground">{currentSchema.length} attributes defined</p>
              <Button size="sm" variant="outline" onClick={addAttribute}>
                <Plus className="h-4 w-4" /> Add Attribute
              </Button>
            </div>

            {currentSchema.length === 0 ? (
              <div className="border border-dashed rounded-md p-8 text-center text-muted-foreground">
                No attributes yet. Click "Add Attribute" to define the component's data structure.
              </div>
            ) : (
              currentSchema.map((attr, i) => (
                <AttributeRow
                  key={i}
                  attr={attr}
                  onChange={updated => updateAttr(i, updated)}
                  onRemove={() => removeAttr(i)}
                />
              ))
            )}
          </TabsContent>

          <TabsContent value="meta" className="mt-6 space-y-4 max-w-lg">
            <div>
              <label className="text-sm font-medium block mb-1">Name</label>
              <Input value={name} onChange={e => { setName(e.target.value); setIsDirty(true) }} />
            </div>
            <div>
              <label className="text-sm font-medium block mb-1">Description</label>
              <Input value={description} onChange={e => { setDescription(e.target.value); setIsDirty(true) }} />
            </div>
            <div className="flex gap-2">
              {component.isDeprecated && <Badge variant="warning">Deprecated</Badge>}
              {!component.isActive && <Badge variant="secondary">Inactive</Badge>}
              {component.isActive && !component.isDeprecated && <Badge variant="success">Active</Badge>}
            </div>
          </TabsContent>

          <TabsContent value="versions" className="mt-6">
            <div className="space-y-2">
              {(versionsData?.data.data ?? []).map((v) => (
                <div key={v.id} className="flex items-center justify-between border rounded-md px-4 py-3">
                  <div>
                    <span className="font-medium text-sm">Version {v.version}</span>
                    {v.createdBy && <span className="text-xs text-muted-foreground ml-2">by {v.createdBy.displayName}</span>}
                    <p className="text-xs text-muted-foreground">{new Date(v.createdAt).toLocaleString()}</p>
                  </div>
                  {v.version !== component.currentVersion && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => restoreMutation.mutate(v.version)}
                      disabled={restoreMutation.isPending}
                    >
                      Restore
                    </Button>
                  )}
                </div>
              ))}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
