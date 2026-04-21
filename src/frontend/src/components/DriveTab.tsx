import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { File as FileIcon, Link as LinkIcon, Plus, Trash2, Download, ExternalLink } from 'lucide-react'
import { getResources, createResource, deleteResource, uploadFile, API_BASE } from '@/lib/api'
import Button from './ui/Button'
import Input from './ui/Input'
import { Card, CardContent } from './ui/Card'

interface Props {
  unitId: number
  isAdmin?: boolean
}

interface ResourcePayload {
  resource_type: 'file' | 'link'
  title: string
  url: string
  file_id?: number
}

export default function DriveTab({ unitId, isAdmin }: Props) {
  const queryClient = useQueryClient()
  const [isAdding, setIsAdding] = useState(false)
  const [type, setType] = useState<'file' | 'link'>('file')
  const [title, setTitle] = useState('')
  const [url, setUrl] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [isUploading, setIsUploading] = useState(false)

  const { data: resources, isLoading } = useQuery({
    queryKey: ['resources', unitId],
    queryFn: async () => {
      const res = await getResources(unitId)
      return res.data
    },
  })

  const addResourceMutation = useMutation({
    mutationFn: (data: ResourcePayload) => createResource(unitId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['resources', unitId] })
      resetForm()
    },
  })

  const deleteResourceMutation = useMutation({
    mutationFn: deleteResource,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['resources', unitId] })
    },
  })

  const [error, setError] = useState<string | null>(null)

  const resetForm = () => {
    setIsAdding(false)
    setTitle('')
    setUrl('')
    setFile(null)
    setIsUploading(false)
    setError(null)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!title) return
    setError(null)

    if (type === 'file' && file) {
      setIsUploading(true)
      try {
        const fileRes = await uploadFile(file)
        addResourceMutation.mutate({
          resource_type: 'file',
          title: title || file.name,
          url: fileRes.data.storage_path,
          file_id: fileRes.data.id,
        })
      } catch (err: any) {
        console.error('Upload failed:', err)
        setError(err.response?.status === 415 ? 'Unsupported file type.' : 'Upload failed. Please try again.')
      } finally {
        setIsUploading(false)
      }
    } else if (type === 'link' && url) {
      addResourceMutation.mutate({
        resource_type: 'link',
        title,
        url,
      })
    }
  }

  if (isLoading) return <div className="p-8 text-center text-muted-foreground">Loading resources...</div>

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center px-2">
        <h2 className="text-xl font-bold">Unit Drive</h2>
        {isAdmin && (
          <Button onClick={() => setIsAdding(true)} size="sm">
            <Plus className="w-4 h-4 mr-2" />
            Add Resource
          </Button>
        )}
      </div>

      {isAdding && (
        <Card className="border-primary/20 bg-primary/5">
          <CardContent className="pt-6">
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <div className="p-3 bg-destructive/10 border border-destructive/20 text-destructive text-xs rounded-lg font-medium">
                  {error}
                </div>
              )}
              <div className="flex gap-2 p-1 bg-muted rounded-lg w-fit">
                <button
                  type="button"
                  onClick={() => setType('file')}
                  className={`px-3 py-1 text-sm rounded-md transition-all ${type === 'file' ? 'bg-white shadow-sm' : 'text-muted-foreground'}`}
                >
                  File
                </button>
                <button
                  type="button"
                  onClick={() => setType('link')}
                  className={`px-3 py-1 text-sm rounded-md transition-all ${type === 'link' ? 'bg-white shadow-sm' : 'text-muted-foreground'}`}
                >
                  Link
                </button>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1 block">Title</label>
                  <Input value={title} onChange={e => setTitle(e.target.value)} placeholder="Resource name..." required />
                </div>
                {type === 'link' ? (
                  <div>
                    <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1 block">URL</label>
                    <Input value={url} onChange={e => setUrl(e.target.value)} placeholder="https://..." required />
                  </div>
                ) : (
                  <div>
                    <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1 block">File (Max 10MB)</label>
                    <Input type="file" onChange={e => setFile(e.target.files?.[0] || null)} required />
                  </div>
                )}
              </div>

              <div className="flex gap-2 justify-end">
                <Button variant="ghost" type="button" onClick={resetForm}>Cancel</Button>
                <Button type="submit" disabled={isUploading || addResourceMutation.isPending}>
                  {isUploading ? 'Uploading...' : 'Save Resource'}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {resources?.map((resource) => (
          <Card key={resource.id} className="group hover-lift border-border/40">
            <CardContent className="p-4 flex items-center justify-between">
              <div className="flex items-center gap-3 min-w-0">
                <div className={`p-2 rounded-lg ${resource.resource_type === 'file' ? 'bg-blue-50 text-blue-600' : 'bg-purple-50 text-purple-600'}`}>
                  {resource.resource_type === 'file' ? <FileIcon className="w-5 h-5" /> : <LinkIcon className="w-5 h-5" />}
                </div>
                <div className="min-w-0">
                  <p className="font-medium text-sm truncate">{resource.title}</p>
                  <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-tight">
                    {resource.resource_type}
                  </p>
                </div>
              </div>
              
              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                {resource.resource_type === 'file' ? (
                  <a
                    href={
                      resource.file_id
                        ? `${API_BASE}/api/files/${resource.file_id}/download`
                        : `${API_BASE}/${resource.url}`
                    }
                    target="_blank"
                    rel="noreferrer"
                    download
                  >
                    <Button variant="ghost" size="sm">
                      <Download className="w-4 h-4" />
                    </Button>
                  </a>
                ) : (
                  <a href={resource.url} target="_blank" rel="noreferrer">
                    <Button variant="ghost" size="sm">
                      <ExternalLink className="w-4 h-4" />
                    </Button>
                  </a>
                )}
                {isAdmin && (
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={() => { if(confirm('Delete resource?')) deleteResourceMutation.mutate(resource.id) }}
                  >
                    <Trash2 className="w-4 h-4 text-muted-foreground hover:text-destructive" />
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        ))}

        {resources?.length === 0 && !isAdding && (
          <div className="col-span-full py-12 text-center border-2 border-dashed rounded-xl border-border/50">
            <FileIcon className="w-8 h-8 mx-auto text-muted-foreground/30 mb-2" />
            <p className="text-sm text-muted-foreground">No resources in this drive yet.</p>
          </div>
        )}
      </div>
    </div>
  )
}
