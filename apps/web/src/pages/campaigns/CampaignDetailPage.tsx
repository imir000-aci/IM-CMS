import React, { useState } from 'react'
import { useParams, useNavigate } from '@tanstack/react-router'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { ArrowLeft, AlertTriangle, Send } from 'lucide-react'
import { PageHeader } from '../../components/PageHeader'
import { Button } from '../../components/ui/button'
import { Badge } from '../../components/ui/badge'
import { Textarea } from '../../components/ui/textarea'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '../../components/ui/tabs'
import { CampaignStatusBadge } from '../../components/StatusBadge'
import { campaignsApi, type Campaign, type ApprovalStep, type Comment, type CollisionReport } from '../../lib/api'

const STATUS_TRANSITIONS: Record<string, { label: string; fn: (id: string, c?: string) => Promise<unknown> }[]> = {
  DRAFT: [{ label: 'Submit for Review', fn: (id, c) => campaignsApi.submit(id, c) }],
  REVIEW: [
    { label: 'Schedule', fn: (id, c) => campaignsApi.schedule(id, c) },
    { label: 'Revert to Draft', fn: (id, c) => campaignsApi.revert(id, c) },
  ],
  SCHEDULED: [
    { label: 'Move to Preview', fn: (id, c) => campaignsApi.preview(id, c) },
    { label: 'Revert to Draft', fn: (id, c) => campaignsApi.revert(id, c) },
  ],
  PREVIEW: [
    { label: 'Publish', fn: (id, c) => campaignsApi.publish(id, c) },
    { label: 'Revert to Draft', fn: (id, c) => campaignsApi.revert(id, c) },
  ],
  PRODUCTION: [{ label: 'Archive', fn: (id, c) => campaignsApi.archive(id, c) }],
  ARCHIVED: [],
}

function ApprovalPanel({ campaign }: { campaign: Campaign }) {
  const qc = useQueryClient()
  const { data } = useQuery({
    queryKey: ['campaigns', campaign.id, 'approvals'],
    queryFn: () => campaignsApi.getApprovals(campaign.id),
  })
  const steps: ApprovalStep[] = (data?.data as unknown as { data: ApprovalStep[] })?.data ?? []

  const decideMutation = useMutation({
    mutationFn: ({ stepId, decision, comment }: { stepId: string; decision: string; comment?: string }) =>
      campaignsApi.decide(campaign.id, stepId, comment !== undefined ? { decision, comment } : { decision }),
    onSuccess: () => { void qc.invalidateQueries({ queryKey: ['campaigns', campaign.id] }) },
  })

  if (steps.length === 0) {
    return <p className="text-sm text-muted-foreground">No approval steps defined.</p>
  }

  return (
    <div className="space-y-2">
      {steps.map(step => (
        <div key={step.id} className="flex items-center justify-between border rounded-md px-4 py-3">
          <div>
            <p className="text-sm font-medium">{step.approver.displayName}</p>
            <p className="text-xs text-muted-foreground">Step {step.stepOrder}</p>
          </div>
          <div className="flex items-center gap-2">
            <Badge
              variant={step.status === 'APPROVED' ? 'success' : step.status === 'REJECTED' ? 'warning' : 'secondary'}
            >
              {step.status}
            </Badge>
            {step.status === 'PENDING' && (
              <>
                <Button
                  size="sm"
                  onClick={() => decideMutation.mutate({ stepId: step.id, decision: 'APPROVED' })}
                  disabled={decideMutation.isPending}
                >
                  Approve
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => decideMutation.mutate({ stepId: step.id, decision: 'REJECTED' })}
                  disabled={decideMutation.isPending}
                >
                  Reject
                </Button>
              </>
            )}
          </div>
        </div>
      ))}
    </div>
  )
}

function CommentThread({ comment, campaignId }: { comment: Comment; campaignId: string }) {
  const qc = useQueryClient()
  const [replyBody, setReplyBody] = useState('')
  const [showReply, setShowReply] = useState(false)

  const replyMutation = useMutation({
    mutationFn: () => campaignsApi.addComment(campaignId, replyBody, comment.id),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['campaigns', campaignId, 'comments'] })
      setReplyBody('')
      setShowReply(false)
    },
  })

  const resolveMutation = useMutation({
    mutationFn: () => campaignsApi.resolveComment(campaignId, comment.id),
    onSuccess: () => void qc.invalidateQueries({ queryKey: ['campaigns', campaignId, 'comments'] }),
  })

  return (
    <div className={`border rounded-md p-3 ${comment.isResolved ? 'opacity-50' : ''}`}>
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1">
          <p className="text-xs font-medium text-muted-foreground">{comment.author.displayName} · {new Date(comment.createdAt).toLocaleString()}</p>
          <p className="text-sm mt-1">{comment.body}</p>
        </div>
        <div className="flex gap-1.5 shrink-0">
          {!comment.isResolved && (
            <Button size="sm" variant="ghost" onClick={() => resolveMutation.mutate()} disabled={resolveMutation.isPending}>
              Resolve
            </Button>
          )}
          <Button size="sm" variant="ghost" onClick={() => setShowReply(r => !r)}>Reply</Button>
        </div>
      </div>
      {comment.replies && comment.replies.length > 0 && (
        <div className="ml-4 mt-2 space-y-2 border-l pl-3">
          {comment.replies.map(r => (
            <div key={r.id}>
              <p className="text-xs text-muted-foreground">{r.author.displayName} · {new Date(r.createdAt).toLocaleString()}</p>
              <p className="text-sm">{r.body}</p>
            </div>
          ))}
        </div>
      )}
      {showReply && (
        <div className="mt-2 flex gap-2">
          <Textarea
            className="text-sm h-16"
            placeholder="Add a reply…"
            value={replyBody}
            onChange={e => setReplyBody(e.target.value)}
          />
          <Button size="sm" onClick={() => replyMutation.mutate()} disabled={!replyBody || replyMutation.isPending}>
            <Send className="h-3 w-3" />
          </Button>
        </div>
      )}
    </div>
  )
}

function CommentsPanel({ campaignId }: { campaignId: string }) {
  const qc = useQueryClient()
  const [newComment, setNewComment] = useState('')

  const { data } = useQuery({
    queryKey: ['campaigns', campaignId, 'comments'],
    queryFn: () => campaignsApi.getComments(campaignId),
  })
  const comments: Comment[] = (data?.data as unknown as { data: Comment[] })?.data ?? []

  const addMutation = useMutation({
    mutationFn: () => campaignsApi.addComment(campaignId, newComment),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['campaigns', campaignId, 'comments'] })
      setNewComment('')
    },
  })

  const topLevel = comments.filter(c => !c.parentId)

  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        <Textarea
          className="text-sm h-20"
          placeholder="Add a comment…"
          value={newComment}
          onChange={e => setNewComment(e.target.value)}
        />
        <Button onClick={() => addMutation.mutate()} disabled={!newComment || addMutation.isPending}>
          <Send className="h-4 w-4" />
        </Button>
      </div>
      {topLevel.length === 0
        ? <p className="text-sm text-muted-foreground">No comments yet.</p>
        : topLevel.map(c => <CommentThread key={c.id} comment={c} campaignId={campaignId} />)
      }
    </div>
  )
}

function CollisionsPanel({ campaignId }: { campaignId: string }) {
  const qc = useQueryClient()
  const { data } = useQuery({
    queryKey: ['campaigns', campaignId, 'collisions'],
    queryFn: () => campaignsApi.getCollisions(campaignId),
  })
  const reports: CollisionReport[] = (data?.data as unknown as { data: CollisionReport[] })?.data ?? []

  const checkMutation = useMutation({
    mutationFn: () => campaignsApi.checkCollisions(campaignId),
    onSuccess: () => void qc.invalidateQueries({ queryKey: ['campaigns', campaignId, 'collisions'] }),
  })

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">{reports.length} collision{reports.length !== 1 ? 's' : ''} detected</p>
        <Button size="sm" variant="outline" onClick={() => checkMutation.mutate()} disabled={checkMutation.isPending}>
          {checkMutation.isPending ? 'Checking…' : 'Run Collision Check'}
        </Button>
      </div>
      {reports.length > 0 && (
        <div className="space-y-2">
          {reports.map(r => (
            <div key={r.id} className="flex items-center gap-3 border rounded-md px-4 py-3 bg-yellow-50 dark:bg-yellow-950/20">
              <AlertTriangle className="h-4 w-4 text-yellow-600 shrink-0" />
              <div className="text-sm">
                <p>Conflicts with campaign <span className="font-mono text-xs">{r.conflictsWith.slice(0, 8)}</span></p>
                <p className="text-xs text-muted-foreground">Slot {r.slotId.slice(0, 8)} · {r.resolution}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export function CampaignDetailPage() {
  const { campaignId } = useParams({ strict: false }) as { campaignId: string }
  const navigate = useNavigate()
  const qc = useQueryClient()
  const [transitionComment, setTransitionComment] = useState('')
  const [transitionError, setTransitionError] = useState<string | null>(null)

  const { data, isLoading } = useQuery({
    queryKey: ['campaigns', campaignId],
    queryFn: () => campaignsApi.get(campaignId),
  })
  const campaign = (data?.data as unknown as { data: Campaign })?.data

  const transitionMutation = useMutation({
    mutationFn: ({ fn }: { fn: (id: string, c?: string) => Promise<unknown> }) =>
      fn(campaignId, transitionComment || undefined),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['campaigns', campaignId] })
      void qc.invalidateQueries({ queryKey: ['campaigns'] })
      setTransitionComment('')
      setTransitionError(null)
    },
    onError: (e: unknown) => setTransitionError((e as Error).message),
  })

  if (isLoading) return <div className="p-8 text-muted-foreground">Loading…</div>
  if (!campaign) return <div className="p-8 text-muted-foreground">Campaign not found.</div>

  const transitions = STATUS_TRANSITIONS[campaign.status] ?? []

  return (
    <div>
      <PageHeader
        title={campaign.name}
        description={campaign.description ?? `Priority ${campaign.priority}`}
        actions={
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => void navigate({ to: '/campaigns' })}>
              <ArrowLeft className="h-4 w-4" /> Back
            </Button>
            <CampaignStatusBadge status={campaign.status} />
          </div>
        }
      />

      <div className="p-8 grid grid-cols-3 gap-6">
        {/* Left: info + transitions */}
        <div className="col-span-2 space-y-6">
          <Tabs defaultValue="overview">
            <TabsList>
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="approvals">Approvals</TabsTrigger>
              <TabsTrigger value="collisions">Collisions</TabsTrigger>
              <TabsTrigger value="comments">Comments</TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="mt-6 space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground">Start</p>
                  <p>{campaign.startDate ? new Date(campaign.startDate).toLocaleString() : '—'}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">End</p>
                  <p>{campaign.endDate ? new Date(campaign.endDate).toLocaleString() : '—'}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Priority</p>
                  <p>{campaign.priority}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Created</p>
                  <p>{new Date(campaign.createdAt).toLocaleDateString()}</p>
                </div>
              </div>

              <div>
                <p className="text-sm font-medium mb-2">Channels</p>
                {campaign.channels && campaign.channels.length > 0
                  ? <div className="flex flex-wrap gap-1.5">{campaign.channels.map(cc => <Badge key={cc.channel.id} variant="secondary">{cc.channel.name}</Badge>)}</div>
                  : <p className="text-sm text-muted-foreground">No channels attached.</p>
                }
              </div>

              <div>
                <p className="text-sm font-medium mb-2">Pages ({campaign.pages?.length ?? 0})</p>
                {campaign.pages && campaign.pages.length > 0
                  ? (
                    <div className="space-y-1">
                      {campaign.pages.map(cp => (
                        <div key={cp.page.id} className="flex items-center justify-between text-sm border rounded px-3 py-2">
                          <span>{cp.page.name}</span>
                          <span className="text-xs text-muted-foreground font-mono">{cp.page.slug}</span>
                        </div>
                      ))}
                    </div>
                  )
                  : <p className="text-sm text-muted-foreground">No pages attached.</p>
                }
              </div>
            </TabsContent>

            <TabsContent value="approvals" className="mt-6">
              <ApprovalPanel campaign={campaign} />
            </TabsContent>

            <TabsContent value="collisions" className="mt-6">
              <CollisionsPanel campaignId={campaignId} />
            </TabsContent>

            <TabsContent value="comments" className="mt-6">
              <CommentsPanel campaignId={campaignId} />
            </TabsContent>
          </Tabs>
        </div>

        {/* Right: workflow transitions */}
        <div className="space-y-4">
          <div className="border rounded-lg p-4">
            <p className="text-sm font-medium mb-4">Workflow</p>
            {transitions.length === 0
              ? <p className="text-sm text-muted-foreground">No transitions available.</p>
              : (
                <div className="space-y-3">
                  <Textarea
                    placeholder="Optional comment…"
                    className="text-sm h-20"
                    value={transitionComment}
                    onChange={e => setTransitionComment(e.target.value)}
                  />
                  {transitionError && <p className="text-xs text-destructive">{transitionError}</p>}
                  <div className="space-y-2">
                    {transitions.map(t => (
                      <Button
                        key={t.label}
                        className="w-full"
                        onClick={() => transitionMutation.mutate({ fn: t.fn })}
                        disabled={transitionMutation.isPending}
                      >
                        {t.label}
                      </Button>
                    ))}
                  </div>
                </div>
              )
            }
          </div>
        </div>
      </div>
    </div>
  )
}
