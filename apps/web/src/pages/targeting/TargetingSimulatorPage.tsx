import React, { useState } from 'react'
import { useParams, useNavigate } from '@tanstack/react-router'
import { useQuery, useMutation } from '@tanstack/react-query'
import { ArrowLeft, Plus, Trash2, Play, CheckCircle, XCircle } from 'lucide-react'
import { PageHeader } from '../../components/PageHeader'
import { Button } from '../../components/ui/button'
import { Input } from '../../components/ui/input'
import { Badge } from '../../components/ui/badge'
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '../../components/ui/select'
import { targetingApi, type TargetingRule, type SimulateResult } from '../../lib/api'

const ATTRIBUTE_SUGGESTIONS = [
  'user.country', 'user.segment', 'user.returning', 'user.loggedIn',
  'device.type', 'device.os', 'browser.name',
  'session.source', 'session.referrer',
  'page.url', 'page.category',
]

interface ContextEntry { key: string; value: string }

export function TargetingSimulatorPage() {
  const { ruleId } = useParams({ strict: false }) as { ruleId: string }
  const navigate = useNavigate()
  const [contextEntries, setContextEntries] = useState<ContextEntry[]>([
    { key: 'user.country', value: 'US' },
  ])
  const [result, setResult] = useState<SimulateResult | null>(null)

  const { data, isLoading } = useQuery({
    queryKey: ['targeting-rules', ruleId],
    queryFn: () => targetingApi.get(ruleId),
  })
  const rule: TargetingRule | undefined = (data?.data as unknown as { data: TargetingRule })?.data

  const simulateMutation = useMutation({
    mutationFn: () => {
      const context = Object.fromEntries(contextEntries.map(e => [e.key, e.value]))
      return targetingApi.simulate(ruleId, context)
    },
    onSuccess: (res) => {
      setResult((res.data as unknown as { data: SimulateResult }).data)
    },
  })

  const addEntry = () => setContextEntries(prev => [...prev, { key: '', value: '' }])
  const removeEntry = (i: number) => setContextEntries(prev => prev.filter((_, idx) => idx !== i))
  const updateEntry = (i: number, field: 'key' | 'value', val: string) => {
    setContextEntries(prev => prev.map((e, idx) => idx === i ? { ...e, [field]: val } : e))
  }

  if (isLoading) return <div className="p-8 text-muted-foreground">Loading…</div>
  if (!rule) return <div className="p-8 text-muted-foreground">Rule not found.</div>

  return (
    <div>
      <PageHeader
        title={`Simulate: ${rule.name}`}
        description={`${rule.scope} rule · priority ${rule.priority}`}
        actions={
          <Button variant="outline" onClick={() => void navigate({ to: '/targeting' })}>
            <ArrowLeft className="h-4 w-4" /> Back
          </Button>
        }
      />

      <div className="p-8 max-w-2xl space-y-6">
        {/* Context builder */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm font-medium">Evaluation Context</p>
            <Button size="sm" variant="outline" onClick={addEntry}>
              <Plus className="h-4 w-4" /> Add Attribute
            </Button>
          </div>

          <div className="space-y-2">
            {contextEntries.map((entry, i) => (
              <div key={i} className="flex items-center gap-2">
                <div className="flex-1">
                  <Input
                    list="attr-suggestions"
                    value={entry.key}
                    onChange={e => updateEntry(i, 'key', e.target.value)}
                    placeholder="attribute.path"
                    className="text-sm font-mono"
                  />
                </div>
                <span className="text-muted-foreground text-sm">=</span>
                <div className="flex-1">
                  <Input
                    value={entry.value}
                    onChange={e => updateEntry(i, 'value', e.target.value)}
                    placeholder="value"
                    className="text-sm"
                  />
                </div>
                <Button variant="ghost" size="icon" onClick={() => removeEntry(i)}>
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </div>
            ))}
          </div>

          <datalist id="attr-suggestions">
            {ATTRIBUTE_SUGGESTIONS.map(s => <option key={s} value={s} />)}
          </datalist>
        </div>

        {/* Simulate button */}
        <Button
          className="w-full"
          onClick={() => simulateMutation.mutate()}
          disabled={simulateMutation.isPending || contextEntries.some(e => !e.key)}
        >
          <Play className="h-4 w-4" />
          {simulateMutation.isPending ? 'Evaluating…' : 'Run Simulation'}
        </Button>

        {/* Result */}
        {result && (
          <div
            className={`border rounded-lg p-6 ${
              result.error
                ? 'border-destructive/30 bg-destructive/5'
                : result.matched
                  ? 'border-green-200 bg-green-50 dark:bg-green-950/20'
                  : 'border-red-200 bg-red-50 dark:bg-red-950/20'
            }`}
          >
            <div className="flex items-center gap-3 mb-4">
              {result.error ? (
                <XCircle className="h-6 w-6 text-destructive" />
              ) : result.matched ? (
                <CheckCircle className="h-6 w-6 text-green-600" />
              ) : (
                <XCircle className="h-6 w-6 text-red-500" />
              )}
              <div>
                <p className="font-semibold text-lg">
                  {result.error ? 'Evaluation Error' : result.matched ? 'Rule Matched' : 'No Match'}
                </p>
                {result.error && <p className="text-sm text-destructive">{result.error}</p>}
              </div>
              {!result.error && (
                <Badge variant={result.matched ? 'success' : 'warning'} className="ml-auto">
                  {result.matched ? 'MATCH' : 'NO MATCH'}
                </Badge>
              )}
            </div>

            <div>
              <p className="text-xs text-muted-foreground font-medium mb-2">Context evaluated:</p>
              <div className="font-mono text-xs bg-background/50 rounded p-3 space-y-1">
                {Object.entries(result.context as Record<string, unknown>).map(([k, v]) => (
                  <div key={k} className="flex gap-2">
                    <span className="text-blue-600 dark:text-blue-400">{k}</span>
                    <span className="text-muted-foreground">=</span>
                    <span>{String(v)}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Condition tree display */}
        <div>
          <p className="text-sm font-medium mb-2">Rule Condition Tree</p>
          <pre className="text-xs bg-muted rounded-md p-3 overflow-x-auto">
            {JSON.stringify(rule.conditionTree, null, 2)}
          </pre>
        </div>
      </div>
    </div>
  )
}
