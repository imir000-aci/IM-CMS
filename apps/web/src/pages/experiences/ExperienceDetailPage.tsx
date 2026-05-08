import React, { useState } from 'react'
import { useParams, useNavigate } from '@tanstack/react-router'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { ArrowLeft, Plus, Trash2 } from 'lucide-react'
import { PageHeader } from '../../components/PageHeader'
import { Button } from '../../components/ui/button'
import { Input } from '../../components/ui/input'
import { Badge } from '../../components/ui/badge'
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '../../components/ui/select'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '../../components/ui/tabs'
import { experiencesApi, targetingApi, type Experience, type TargetingRule } from '../../lib/api'

export function ExperienceDetailPage() {
  const { experienceId } = useParams({ strict: false }) as { experienceId: string }
  const navigate = useNavigate()
  const qc = useQueryClient()

  const { data, isLoading } = useQuery({
    queryKey: ['experiences', experienceId],
    queryFn: () => experiencesApi.get(experienceId),
  })
  const { data: rulesData } = useQuery({
    queryKey: ['targeting-rules', { pageSize: 100 }],
    queryFn: () => targetingApi.list({ pageSize: 100 }),
  })

  const experience: Experience | undefined = (data?.data as unknown as { data: Experience })?.data
  const allRules: TargetingRule[] = (rulesData?.data as unknown as { items?: TargetingRule[] })?.items ?? []

  const [name, setName] = useState('')
  const [abTestKey, setAbTestKey] = useState('')
  const [priority, setPriority] = useState('0')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [isDirty, setIsDirty] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [addRuleId, setAddRuleId] = useState('')

  React.useEffect(() => {
    if (experience && !isDirty) {
      setName(experience.name)
      setAbTestKey(experience.abTestKey ?? '')
      setPriority(String(experience.priority))
      setStartDate(experience.startDate ? experience.startDate.slice(0, 16) : '')
      setEndDate(experience.endDate ? experience.endDate.slice(0, 16) : '')
    }
  }, [experience, isDirty])

  const updateMutation = useMutation({
    mutationFn: () =>
      experiencesApi.update(experienceId, {
        name,
        abTestKey: abTestKey || undefined,
        priority: Number(priority),
        startDate: startDate || undefined,
        endDate: endDate || undefined,
      }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['experiences', experienceId] })
      setIsDirty(false)
      setSaveError(null)
    },
    onError: (e: unknown) => setSaveError((e as Error).message),
  })

  const attachMutation = useMutation({
    mutationFn: (ruleId: string) => experiencesApi.attachRule(experienceId, ruleId),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['experiences', experienceId] })
      setAddRuleId('')
    },
  })

  const detachMutation = useMutation({
    mutationFn: (ruleId: string) => experiencesApi.detachRule(experienceId, ruleId),
    onSuccess: () => void qc.invalidateQueries({ queryKey: ['experiences', experienceId] }),
  })

  if (isLoading) return <div className="p-8 text-muted-foreground">Loading…</div>
  if (!experience) return <div className="p-8 text-muted-foreground">Experience not found.</div>

  const attachedRuleIds = new Set((experience.targetingRules ?? []).map(r => r.targetingRule.id))
  const availableRules = allRules.filter(r => !attachedRuleIds.has(r.id))

  const mark = () => setIsDirty(true)

  return (
    <div>
      <PageHeader
        title={experience.name}
        description={`Priority ${experience.priority}${experience.abTestKey ? ` · A/B: ${experience.abTestKey}` : ''}`}
        actions={
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => void navigate({ to: '/experiences' })}>
              <ArrowLeft className="h-4 w-4" /> Back
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

        <Tabs defaultValue="settings">
          <TabsList>
            <TabsTrigger value="settings">Settings</TabsTrigger>
            <TabsTrigger value="targeting">Targeting Rules</TabsTrigger>
          </TabsList>

          <TabsContent value="settings" className="mt-6 max-w-lg space-y-4">
            <div>
              <label className="text-sm font-medium block mb-1">Name</label>
              <Input value={name} onChange={e => { setName(e.target.value); mark() }} />
            </div>
            <div>
              <label className="text-sm font-medium block mb-1">A/B Test Key</label>
              <Input value={abTestKey} onChange={e => { setAbTestKey(e.target.value); mark() }} placeholder="exp_hero_variant_a" />
            </div>
            <div>
              <label className="text-sm font-medium block mb-1">Priority</label>
              <Input type="number" value={priority} onChange={e => { setPriority(e.target.value); mark() }} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-medium block mb-1">Start Date</label>
                <Input type="datetime-local" value={startDate} onChange={e => { setStartDate(e.target.value); mark() }} />
              </div>
              <div>
                <label className="text-sm font-medium block mb-1">End Date</label>
                <Input type="datetime-local" value={endDate} onChange={e => { setEndDate(e.target.value); mark() }} />
              </div>
            </div>

            <div className="pt-2 border-t space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Component</span>
                <span>{experience.componentInstance?.name ?? '—'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Content Object</span>
                <span>{experience.contentObject?.name ?? '—'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Status</span>
                {experience.isActive ? <Badge variant="success">Active</Badge> : <Badge variant="secondary">Inactive</Badge>}
              </div>
            </div>
          </TabsContent>

          <TabsContent value="targeting" className="mt-6 max-w-lg space-y-4">
            <div className="flex gap-2">
              <Select value={addRuleId} onValueChange={setAddRuleId}>
                <SelectTrigger className="flex-1">
                  <SelectValue placeholder="Add targeting rule…" />
                </SelectTrigger>
                <SelectContent>
                  {availableRules.map(r => (
                    <SelectItem key={r.id} value={r.id}>{r.name} ({r.scope})</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button
                onClick={() => attachMutation.mutate(addRuleId)}
                disabled={!addRuleId || attachMutation.isPending}
              >
                <Plus className="h-4 w-4" /> Attach
              </Button>
            </div>

            {(experience.targetingRules ?? []).length === 0
              ? <p className="text-sm text-muted-foreground">No targeting rules attached. This experience will always apply.</p>
              : (
                <div className="space-y-2">
                  {(experience.targetingRules ?? []).map(({ targetingRule: rule }) => (
                    <div key={rule.id} className="flex items-center justify-between border rounded-md px-4 py-3">
                      <div>
                        <p className="text-sm font-medium">{rule.name}</p>
                        <div className="flex gap-1.5 mt-0.5">
                          <Badge variant="secondary" className="text-xs">{rule.scope}</Badge>
                          <Badge variant={rule.isActive ? 'success' : 'secondary'} className="text-xs">{rule.isActive ? 'Active' : 'Inactive'}</Badge>
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => detachMutation.mutate(rule.id)}
                        disabled={detachMutation.isPending}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  ))}
                </div>
              )
            }
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
