import React, { useState, useRef } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Upload, Search, ImageIcon, FileVideo, File } from 'lucide-react'
import { PageHeader } from '../../components/PageHeader'
import { DataTable, type Column } from '../../components/DataTable'
import { Button } from '../../components/ui/button'
import { Input } from '../../components/ui/input'
import { Badge } from '../../components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '../../components/ui/dialog'
import { Pagination } from '../../components/Pagination'
import { assetsApi, type Asset } from '../../lib/api'

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function MimeIcon({ mime }: { mime: string }) {
  if (mime.startsWith('image/')) return <ImageIcon className="h-4 w-4 text-blue-500" />
  if (mime.startsWith('video/')) return <FileVideo className="h-4 w-4 text-purple-500" />
  return <File className="h-4 w-4 text-muted-foreground" />
}

function UploadDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const qc = useQueryClient()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [file, setFile] = useState<File | null>(null)
  const [altText, setAltText] = useState('')
  const [phase, setPhase] = useState<'select' | 'uploading' | 'confirming' | 'done'>('select')
  const [progress, setProgress] = useState(0)
  const [error, setError] = useState<string | null>(null)

  const reset = () => {
    setFile(null); setAltText(''); setPhase('select'); setProgress(0); setError(null)
  }

  const handleUpload = async () => {
    if (!file) return
    setError(null)
    try {
      setPhase('uploading')
      const urlRes = await assetsApi.requestUploadUrl({
        filename: file.name,
        mimeType: file.type,
        sizeBytes: file.size,
        altText: altText || undefined,
      })
      const { assetId, uploadUrl } = (urlRes.data as unknown as { data: { assetId: string; uploadUrl: string } }).data

      // Direct upload to S3
      await new Promise<void>((resolve, reject) => {
        const xhr = new XMLHttpRequest()
        xhr.upload.onprogress = e => { if (e.lengthComputable) setProgress(Math.round((e.loaded / e.total) * 100)) }
        xhr.onload = () => (xhr.status < 300 ? resolve() : reject(new Error(`Upload failed: ${xhr.status}`)))
        xhr.onerror = () => reject(new Error('Network error during upload'))
        xhr.open('PUT', uploadUrl)
        xhr.setRequestHeader('Content-Type', file.type)
        xhr.send(file)
      })

      setPhase('confirming')
      await assetsApi.confirm(assetId)
      setPhase('done')
      void qc.invalidateQueries({ queryKey: ['assets'] })
    } catch (e: unknown) {
      setError((e as Error).message)
      setPhase('select')
    }
  }

  return (
    <Dialog open={open} onOpenChange={o => { onOpenChange(o); if (!o) reset() }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Upload Asset</DialogTitle>
          <DialogDescription>Select a file to upload. Images will have renditions generated automatically.</DialogDescription>
        </DialogHeader>

        {phase === 'done' ? (
          <div className="py-6 text-center">
            <p className="text-sm font-medium text-green-600">Upload complete!</p>
            <p className="text-xs text-muted-foreground mt-1">Renditions are being generated in the background.</p>
          </div>
        ) : (
          <div className="space-y-4">
            <div
              className="border-2 border-dashed rounded-lg p-8 text-center cursor-pointer hover:bg-muted/50 transition-colors"
              onClick={() => fileInputRef.current?.click()}
            >
              <Upload className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
              {file
                ? <p className="text-sm font-medium">{file.name} ({formatBytes(file.size)})</p>
                : <p className="text-sm text-muted-foreground">Click to select a file</p>
              }
            </div>
            <input
              ref={fileInputRef}
              type="file"
              className="hidden"
              onChange={e => { const f = e.target.files?.[0]; if (f) setFile(f) }}
            />
            <div>
              <label className="text-sm font-medium block mb-1">Alt Text</label>
              <Input value={altText} onChange={e => setAltText(e.target.value)} placeholder="Describe the image for accessibility" />
            </div>
            {phase === 'uploading' && (
              <div className="space-y-1">
                <div className="h-2 bg-muted rounded-full overflow-hidden">
                  <div className="h-full bg-primary transition-all" style={{ width: `${progress}%` }} />
                </div>
                <p className="text-xs text-muted-foreground text-right">{progress}%</p>
              </div>
            )}
            {error && <p className="text-sm text-destructive">{error}</p>}
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => { onOpenChange(false); reset() }}>
            {phase === 'done' ? 'Close' : 'Cancel'}
          </Button>
          {phase !== 'done' && (
            <Button
              onClick={() => void handleUpload()}
              disabled={!file || phase === 'uploading' || phase === 'confirming'}
            >
              {phase === 'uploading' ? `Uploading ${progress}%…` : phase === 'confirming' ? 'Confirming…' : 'Upload'}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function AssetDetailDialog({ asset, onClose }: { asset: Asset | null; onClose: () => void }) {
  if (!asset) return null
  return (
    <Dialog open={!!asset} onOpenChange={o => !o && onClose()}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{asset.filename}</DialogTitle>
        </DialogHeader>
        <div className="grid grid-cols-2 gap-4">
          <div>
            {asset.mimeType.startsWith('image/') && asset.uploadStatus === 'COMPLETED' && (
              <img src={asset.cdnUrl} alt={asset.altText ?? asset.filename} className="rounded-md w-full object-cover max-h-64" />
            )}
            <div className="mt-3 space-y-1 text-sm">
              <div className="flex justify-between"><span className="text-muted-foreground">Type</span><span>{asset.mimeType}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Size</span><span>{formatBytes(asset.sizeBytes)}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Status</span><Badge variant={asset.uploadStatus === 'COMPLETED' ? 'success' : 'secondary'}>{asset.uploadStatus}</Badge></div>
            </div>
          </div>
          <div>
            <p className="text-sm font-medium mb-2">Renditions</p>
            {asset.renditions.length === 0
              ? <p className="text-xs text-muted-foreground">No renditions yet.</p>
              : (
                <div className="space-y-1">
                  {asset.renditions.map(r => (
                    <div key={r.id} className="text-xs flex justify-between border rounded px-2 py-1">
                      <span className="font-medium">{r.name}</span>
                      <span className="text-muted-foreground">{r.width}×{r.height} {r.format}</span>
                    </div>
                  ))}
                </div>
              )
            }
            <div className="mt-3">
              <p className="text-xs text-muted-foreground break-all">{asset.cdnUrl}</p>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

export function AssetLibraryPage() {
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [showUpload, setShowUpload] = useState(false)
  const [selectedAsset, setSelectedAsset] = useState<Asset | null>(null)

  const { data, isLoading } = useQuery({
    queryKey: ['assets', { search, page }],
    queryFn: () => assetsApi.list({ search: search || undefined, page, pageSize: 20 }),
  })

  const columns: Column<Asset>[] = [
    {
      key: 'file', header: 'File',
      cell: (row) => (
        <div className="flex items-center gap-3">
          <MimeIcon mime={row.mimeType} />
          <div>
            <p className="font-medium text-sm">{row.filename}</p>
            {row.altText && <p className="text-xs text-muted-foreground truncate max-w-xs">{row.altText}</p>}
          </div>
        </div>
      ),
    },
    { key: 'type', header: 'Type', cell: (row) => <span className="text-xs text-muted-foreground">{row.mimeType}</span> },
    { key: 'size', header: 'Size', cell: (row) => <span className="text-sm text-muted-foreground">{formatBytes(row.sizeBytes)}</span> },
    {
      key: 'status', header: 'Status',
      cell: (row) => (
        <Badge variant={row.uploadStatus === 'COMPLETED' ? 'success' : row.uploadStatus === 'FAILED' ? 'warning' : 'secondary'}>
          {row.uploadStatus}
        </Badge>
      ),
    },
    {
      key: 'renditions', header: 'Renditions',
      cell: (row) => <span className="text-sm text-muted-foreground">{row.renditions.length}</span>,
    },
    {
      key: 'uploaded', header: 'Uploaded',
      cell: (row) => <span className="text-sm text-muted-foreground">{new Date(row.createdAt).toLocaleDateString()}</span>,
    },
  ]

  const list = (data?.data as unknown as { items?: Asset[] })?.items ?? []
  const meta = data?.data as unknown as { total?: number } | undefined

  return (
    <div>
      <PageHeader
        title="Asset Library"
        description="Images, videos, and files with automatic rendition generation"
        actions={
          <Button onClick={() => setShowUpload(true)}>
            <Upload className="h-4 w-4" />Upload Asset
          </Button>
        }
      />

      <div className="p-8">
        <div className="flex gap-3 mb-6">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input className="pl-9" placeholder="Search assets…" value={search} onChange={e => { setSearch(e.target.value); setPage(1) }} />
          </div>
        </div>

        <DataTable
          columns={columns}
          data={list}
          keyFn={r => r.id}
          loading={isLoading}
          emptyMessage="No assets yet. Upload one to get started."
          onRowClick={row => setSelectedAsset(row)}
        />

        {meta?.total && meta.total > 20 && (
          <Pagination page={page} pageSize={20} total={meta.total} onPageChange={setPage} />
        )}
      </div>

      <UploadDialog open={showUpload} onOpenChange={setShowUpload} />
      <AssetDetailDialog asset={selectedAsset} onClose={() => setSelectedAsset(null)} />
    </div>
  )
}
