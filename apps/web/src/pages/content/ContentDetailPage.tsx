import React, { useState } from 'react'
import { useParams, useNavigate } from '@tanstack/react-router'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { ArrowLeft, Plus, Trash2 } from 'lucide-react'
import { PageHeader } from '../../components/PageHeader'
import { Button } from '../../components/ui/button'
import { Input } from '../../components/ui/input'
import { Textarea } from '../../components/ui/textarea'
import { Badge } from '../../components/ui/badge'
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '../../components/ui/select'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '../../components/ui/tabs'
import { TranslationStatusBadge } from '../../components/StatusBadge'
import { contentApi, type ContentObject, type ContentVersion, type ContentLocale } from '../../lib/api'

const TRANSLATION_STATUSES = ['DRAFT', 'IN_REVIEW', 'APPROVED', 'PUBLISHED']

function FieldEditor({
  fields,
  onChange,
}: {
  fields: Record<string, unknown>
  onChange: (f: Record<string, unknown>) => void
}) {
  const [newKey, setNewKey] = useState('')
  const entries = Object.entries(fields)

  const addField = () => {
    if (!newKey.trim()) return
    onChange({ ...fields, [newKey.trim()]: '' })
    setNewKey('')
  }

  const updateValue = (key: string, value: string) => {
    onChange({ ...fields, [key]: value })
  }

  const removeField = (key: string) => {
    const next = { ...fields }
    delete next[key]
    onChange(next)
  }

  return (
    <div className="space-y-2">
      {entries.map(([key, val]) => (
        <div key={key} className="flex items-start gap-2">
          <div className="w-40 shrink-0">
            <p className="text-xs text-muted-foreground font-mono pt-2.5">{key}</p>
          </div>
          <Textarea
            className="text-sm flex-1 h-16"
            value={typeof val === 'string' ? val : JSON.stringify(val, null, 2)}
            onChange={e => updateValue(key, e.target.value)}
          />
          <Button variant="ghost" size="icon" onClick={() => removeField(key)}>
            <Trash2 className="h-4 w-4 text-destructive" />
          </Button>
        </div>
      ))}
      <div className="flex gap-2 mt-3">
        <Input
          className="w-40"
          placeholder="fieldName"
          value={newKey}
          onChange={e => setNewKey(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && addField()}
        />
        <Button size="sm" variant="outline" onClick={addField} disabled={!newKey.trim()}>
          <Plus className="h-4 w-4" /> Add Field
        </Button>
      </div>
    </div>
  )
}

function LocaleTab({ contentId, localeCode }: { contentId: string; localeCode: string }) {
  const qc = useQueryClient()
  const [fields, setFields] = useState<Record<string, unknown> | null>(null)
  const [status, setStatus] = useState('DRAFT')

  const { data } = useQuery({
    queryKey: ['content', contentId, 'locale', localeCode],
    queryFn: () => contentApi.getLocale(contentId, localeCode),
  })
  const locale: ContentLocale | undefined = (data?.data as unknown as { data: ContentLocale })?.data

  React.useEffect(() => {
    if (locale && fields === null) {
      setFields(locale.fields)
      setStatus(locale.translationStatus)
    }
  }, [locale, fields])

  const saveMutation = useMutation({
    mutationFn: () =>
      contentApi.upsertLocale(contentId, localeCode, { fields: fields ?? {}, translationStatus: status }),
    onSuccess: () => void qc.invalidateQueries({ queryKey: ['content', contentId, 'locale', localeCode] }),
  })

  const currentFields = fields ?? {}

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        {locale && <TranslationStatusBadge status={locale.translationStatus} />}
        <div className="flex items-center gap-2">
          <Select value={status} onValueChange={setStatus}>
            <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
            <SelectContent>
              {TRANSLATION_STATUSES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
            </SelectContent>
          </Select>
          <Button size="sm" onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending}>
            {saveMutation.isPending ? 'Saving…' : 'Save'}
          </Button>
        </div>
      </div>
      <FieldEditor fields={currentFields} onChange={f => setFields(f)} />
    </div>
  )
}

export function ContentDetailPage() {
  const { contentId } = useParams({ strict: false }) as { contentId: string }
  const navigate = useNavigate()
  const qc = useQueryClient()
  const [fields, setFields] = useState<Record<string, unknown> | null>(null)
  const [isDirty, setIsDirty] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)

  const { data, isLoading } = useQuery({
    queryKey: ['content', contentId],
    queryFn: () => contentApi.get(contentId),
  })
  const { data: versionsData } = useQuery({
    queryKey: ['content', contentId, 'versions'],
    queryFn: () => contentApi.getVersions(contentId),
  })

  const content: ContentObject | undefined = (data?.data as unknown as { data: ContentObject })?.data
  const versions: ContentVersion[] = (versionsData?.data as unknown as { data: ContentVersion[] })?.data ?? []

  React.useEffect(() => {
    if (content && fields === null) {
      setFields(content.fields)
    }
  }, [content, fields])

  const updateMutation = useMutation({
    mutationFn: () => contentApi.update(contentId, { fields: fields ?? {} }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['content', contentId] })
      void qc.invalidateQueries({ queryKey: ['content', contentId, 'versions'] })
      setIsDirty(false)
      setSaveError(null)
    },
    onError: (e: unknown) => setSaveError((e as Error).message),
  })

  if (isLoading) return <div className="p-8 text-muted-foreground">Loading…</div>
  if (!content) return <div className="p-8 text-muted-foreground">Content not found.</div>

  const currentFields = fields ?? content.fields

  return (
    <div>
      <PageHeader
        title={content.name}
        description={`${content.type} · v${content.currentVersion}`}
        actions={
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => void navigate({ to: '/content' })}>
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

        <Tabs defaultValue="fields">
          <TabsList>
            <TabsTrigger value="fields">Fields</TabsTrigger>
            <TabsTrigger value="locales">Locales</TabsTrigger>
            <TabsTrigger value="versions">Version History</TabsTrigger>
          </TabsList>

          <TabsContent value="fields" className="mt-6">
            <FieldEditor
              fields={currentFields}
              onChange={f => { setFields(f); setIsDirty(true) }}
            />
          </TabsContent>

          <TabsContent value="locales" className="mt-6">
            <p className="text-sm text-muted-foreground mb-4">Enter a locale code to create or edit a locale variant.</p>
            <LocaleTabManager contentId={contentId} />
          </TabsContent>

          <TabsContent value="versions" className="mt-6">
            <div className="space-y-2">
              {versions.map(v => (
                <div key={v.id} className="flex items-center justify-between border rounded-md px-4 py-3">
                  <div>
                    <span className="font-medium text-sm">Version {v.version}</span>
                    {v.createdBy && <span className="text-xs text-muted-foreground ml-2">by {v.createdBy.displayName}</span>}
                    <p className="text-xs text-muted-foreground">{new Date(v.createdAt).toLocaleString()}</p>
                  </div>
                  <div className="flex gap-1">
                    {Object.keys(v.fields).map(k => (
                      <Badge key={k} variant="secondary" className="text-xs">{k}</Badge>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}

function LocaleTabManager({ contentId }: { contentId: string }) {
  const [activeLocale, setActiveLocale] = useState('en')
  const [inputLocale, setInputLocale] = useState('en')

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <Input
          className="w-28"
          placeholder="en"
          value={inputLocale}
          onChange={e => setInputLocale(e.target.value)}
        />
        <Button size="sm" onClick={() => setActiveLocale(inputLocale)} disabled={!inputLocale}>
          Load Locale
        </Button>
      </div>
      {activeLocale && <LocaleTab contentId={contentId} localeCode={activeLocale} />}
    </div>
  )
}
