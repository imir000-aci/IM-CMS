import React from 'react'
import { useParams, useNavigate } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { ArrowLeft } from 'lucide-react'
import { Button } from '../../components/ui/button'
import { Badge } from '../../components/ui/badge'
import { PageHeader } from '../../components/PageHeader'
import { pagesApi, type PageDetail } from '../../lib/api'

export function PageBuilderStub() {
  const { pageId } = useParams({ strict: false }) as { pageId: string }
  const navigate = useNavigate()

  const { data, isLoading } = useQuery({
    queryKey: ['pages', pageId],
    queryFn: () => pagesApi.get(pageId),
  })
  const page = (data?.data as unknown as { data: PageDetail })?.data

  if (isLoading) return <div className="p-8 text-muted-foreground">Loading…</div>
  if (!page) return <div className="p-8 text-muted-foreground">Page not found.</div>

  return (
    <div>
      <PageHeader
        title={page.name}
        description={`/${page.slug} · ${page.channel?.name ?? '—'}`}
        actions={
          <Button variant="outline" onClick={() => void navigate({ to: '/pages' })}>
            <ArrowLeft className="h-4 w-4" /> Back
          </Button>
        }
      />
      <div className="p-8 space-y-6">
        <div className="flex gap-2">
          {page.isPublished
            ? <Badge variant="success">Published</Badge>
            : <Badge variant="secondary">Draft</Badge>
          }
        </div>

        <div>
          <p className="text-sm font-medium mb-3">Zones ({page.zones.length})</p>
          {page.zones.length === 0
            ? <p className="text-sm text-muted-foreground border border-dashed rounded-md p-6 text-center">No zones defined. Add zones via the API.</p>
            : (
              <div className="space-y-3">
                {page.zones.map(zone => (
                  <div key={zone.id} className="border rounded-md p-4">
                    <p className="font-medium text-sm mb-2">{zone.name}</p>
                    <div className="space-y-2 ml-4">
                      {zone.slots.map(slot => (
                        <div key={slot.id} className="border rounded px-3 py-2 bg-muted/30">
                          <p className="text-sm">{slot.name}</p>
                          {slot.subSlots.length > 0 && (
                            <div className="ml-3 mt-1 space-y-1">
                              {slot.subSlots.map(sub => (
                                <p key={sub.id} className="text-xs text-muted-foreground">↳ {sub.name}</p>
                              ))}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )
          }
        </div>
        <p className="text-xs text-muted-foreground">Visual drag-and-drop editor with @dnd-kit is planned for Sprint 7.</p>
      </div>
    </div>
  )
}
