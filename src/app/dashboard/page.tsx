'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  Instagram, TrendingUp, Eye, Heart, MessageCircle, Share2,
  Bookmark, RefreshCw, Plus, Search, ExternalLink, Tag,
  Zap, Users, Play, Link, X, Check
} from 'lucide-react'
import type { Post, Account, Project } from '@/types'

function fmt(n: number): string {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M'
  if (n >= 1_000) return (n / 1_000).toFixed(1) + 'K'
  return String(n)
}

function fmtDate(d: string): string {
  return new Date(d).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' })
}

function engagementRate(post: Post): string {
  const eng = post.likes_count + post.comments_count + post.shares_count + post.saves_count
  const base = post.reach_count || post.views_count
  if (!base) return '—'
  return ((eng / base) * 100).toFixed(2) + '%'
}

const PLATFORM_ICON: Record<string, React.ReactNode> = {
  instagram: <Instagram size={14} />,
  tiktok: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
      <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-2.88 2.5 2.89 2.89 0 0 1-2.89-2.89 2.89 2.89 0 0 1 2.89-2.89c.28 0 .54.04.79.1V9.01a6.33 6.33 0 0 0-.79-.05 6.34 6.34 0 0 0-6.34 6.34 6.34 6.34 0 0 0 6.34 6.34 6.34 6.34 0 0 0 6.33-6.34V8.93a8.16 8.16 0 0 0 4.77 1.52V7.01a4.85 4.85 0 0 1-1-.32z"/>
    </svg>
  ),
}

const POST_TYPE_LABEL: Record<string, string> = {
  reel: 'Reel', image: 'Фото', carousel: 'Карусель', tiktok_video: 'Видео', story: 'Story',
}

// ── Add by URL Modal ────────────────────────────────────────────────────
function AddUrlModal({ projects, onClose, onAdded }: {
  projects: Project[]
  onClose: () => void
  onAdded: () => void
}) {
  const [url, setUrl] = useState('')
  const [projectId, setProjectId] = useState(projects[0]?.id || '')
  const [tags, setTags] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  async function handleAdd() {
    if (!url.trim()) return setError('Вставь ссылку')
    if (!url.includes('tiktok.com')) return setError('Пока поддерживается только TikTok. Instagram — скоро')
    setLoading(true)
    setError('')

    const res = await fetch('/api/tiktok/import', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        url: url.trim(),
        project_id: projectId || null,
        tags: tags ? tags.split(',').map(t => t.trim().toLowerCase()).filter(Boolean) : [],
      }),
    })
    const data = await res.json()
    setLoading(false)

    if (!res.ok) {
      setError(data.error || 'Ошибка')
    } else {
      setSuccess(true)
      setTimeout(() => { onAdded(); onClose() }, 1500)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">Добавить по ссылке</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
        </div>

        {success ? (
          <div className="flex flex-col items-center gap-3 py-6 text-green-600">
            <Check size={40} className="bg-green-50 rounded-full p-2" />
            <p className="font-medium">Публикация добавлена!</p>
          </div>
        ) : (
          <>
            <div className="mb-4">
              <label className="text-xs text-gray-500 font-medium mb-1 block">Ссылка на TikTok видео</label>
              <input
                value={url}
                onChange={e => setUrl(e.target.value)}
                placeholder="https://www.tiktok.com/@username/video/..."
                className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
              />
              <p className="text-xs text-gray-400 mt-1">Скопируй ссылку из TikTok → Поделиться → Копировать ссылку</p>
            </div>

            {projects.length > 0 && (
              <div className="mb-4">
                <label className="text-xs text-gray-500 font-medium mb-1 block">Проект</label>
                <select
                  value={projectId}
                  onChange={e => setProjectId(e.target.value)}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
                >
                  <option value="">Без проекта</option>
                  {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </div>
            )}

            <div className="mb-4">
              <label className="text-xs text-gray-500 font-medium mb-1 block">Теги (через запятую)</label>
              <input
                value={tags}
                onChange={e => setTags(e.target.value)}
                placeholder="реклама, акция, новинка"
                className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
              />
            </div>

            {error && <p className="text-sm text-red-500 mb-3">{error}</p>}

            <div className="bg-amber-50 rounded-xl p-3 mb-4">
              <p className="text-xs text-amber-700">⚠️ Просмотры и лайки будут показывать 0 — TikTok не даёт эти данные без подключения аккаунта. Описание и обложка загрузятся автоматически.</p>
            </div>

            <div className="flex gap-3">
              <button onClick={onClose} className="flex-1 py-2 border border-gray-200 rounded-xl text-sm text-gray-600 hover:bg-gray-50">
                Отмена
              </button>
              <button
                onClick={handleAdd}
                disabled={loading}
                className="flex-1 py-2 bg-indigo-600 text-white rounded-xl text-sm font-medium hover:bg-indigo-700 disabled:opacity-50"
              >
                {loading ? 'Добавляю...' : 'Добавить'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

// ── Add Project Modal ───────────────────────────────────────────────────
function AddProjectModal({ onClose, onAdded }: { onClose: () => void; onAdded: () => void }) {
  const [name, setName] = useState('')
  const [color, setColor] = useState('#6366f1')
  const [loading, setLoading] = useState(false)

  const colors = ['#6366f1', '#ec4899', '#f59e0b', '#10b981', '#3b82f6', '#ef4444', '#8b5cf6', '#14b8a6']

  async function handleCreate() {
    if (!name.trim()) return
    setLoading(true)
    await fetch('/api/projects', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: name.trim(), color }),
    })
    setLoading(false)
    onAdded()
    onClose()
  }

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-sm shadow-2xl p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">Новый проект</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
        </div>

        <div className="mb-4">
          <label className="text-xs text-gray-500 font-medium mb-1 block">Название</label>
          <input
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="Например: Клиент А"
            className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
          />
        </div>

        <div className="mb-6">
          <label className="text-xs text-gray-500 font-medium mb-2 block">Цвет</label>
          <div className="flex gap-2 flex-wrap">
            {colors.map(c => (
              <button
                key={c}
                onClick={() => setColor(c)}
                className={`w-8 h-8 rounded-full border-2 transition-all ${color === c ? 'border-gray-800 scale-110' : 'border-transparent'}`}
                style={{ backgroundColor: c }}
              />
            ))}
          </div>
        </div>

        <div className="flex gap-3">
          <button onClick={onClose} className="flex-1 py-2 border border-gray-200 rounded-xl text-sm text-gray-600">Отмена</button>
          <button
            onClick={handleCreate}
            disabled={loading || !name.trim()}
            className="flex-1 py-2 bg-indigo-600 text-white rounded-xl text-sm font-medium hover:bg-indigo-700 disabled:opacity-50"
          >
            Создать
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Post Card ───────────────────────────────────────────────────────────
function PostCard({ post, onTagEdit }: { post: Post; onTagEdit: (post: Post) => void }) {
  const account = post.account
  const project = account?.project

  return (
    <div className="bg-white rounded-2xl overflow-hidden border border-gray-100 hover:border-indigo-200 hover:shadow-lg transition-all duration-200 group">
      <div className="relative aspect-video bg-gray-100 overflow-hidden">
        {post.thumbnail_url ? (
          <img src={post.thumbnail_url} alt="" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-gray-300"><Play size={32} /></div>
        )}
        <div className={`absolute top-2 left-2 flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium text-white ${post.platform === 'instagram' ? 'bg-gradient-to-r from-purple-500 to-pink-500' : 'bg-black'}`}>
          {PLATFORM_ICON[post.platform]}
          {POST_TYPE_LABEL[post.post_type]}
        </div>
        {project && (
          <div className="absolute top-2 right-2 px-2 py-1 rounded-full text-xs font-medium text-white" style={{ backgroundColor: project.color }}>
            {project.name}
          </div>
        )}
      </div>

      <div className="p-4">
        <div className="flex items-center gap-2 mb-2">
          {account?.avatar_url && <img src={account.avatar_url} className="w-5 h-5 rounded-full" alt="" />}
          <span className="text-xs text-gray-500 font-medium">@{account?.username}</span>
          <span className="text-xs text-gray-300 ml-auto">{post.published_at ? fmtDate(post.published_at) : '—'}</span>
        </div>

        {post.caption && <p className="text-sm text-gray-700 line-clamp-2 mb-3 leading-relaxed">{post.caption}</p>}

        {post.tags.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-3">
            {post.tags.map(tag => (
              <span key={tag} className="text-xs px-2 py-0.5 bg-indigo-50 text-indigo-600 rounded-full">#{tag}</span>
            ))}
          </div>
        )}

        <div className="grid grid-cols-3 gap-2 text-center mt-3 pt-3 border-t border-gray-50">
          <MetricCell icon={<Eye size={12} />} label="Views" value={fmt(post.views_count)} />
          <MetricCell icon={<Heart size={12} />} label="Likes" value={fmt(post.likes_count)} />
          <MetricCell icon={<MessageCircle size={12} />} label="Comments" value={fmt(post.comments_count)} />
          <MetricCell icon={<Share2 size={12} />} label="Shares" value={fmt(post.shares_count)} />
          <MetricCell icon={<Bookmark size={12} />} label="Saves" value={fmt(post.saves_count)} />
          <MetricCell icon={<TrendingUp size={12} />} label="ER" value={engagementRate(post)} highlight />
        </div>

        <div className="flex gap-2 mt-3">
          <button onClick={() => onTagEdit(post)} className="flex items-center gap-1 text-xs text-gray-500 hover:text-indigo-600 transition-colors">
            <Tag size={12} /> Теги
          </button>
          {post.permalink && (
            <a href={post.permalink} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-xs text-gray-500 hover:text-indigo-600 transition-colors ml-auto">
              <ExternalLink size={12} /> Открыть
            </a>
          )}
        </div>
      </div>
    </div>
  )
}

function MetricCell({ icon, label, value, highlight }: { icon: React.ReactNode; label: string; value: string; highlight?: boolean }) {
  return (
    <div className="flex flex-col items-center gap-0.5">
      <div className={`flex items-center gap-0.5 text-xs ${highlight ? 'text-indigo-600 font-semibold' : 'text-gray-400'}`}>{icon}</div>
      <span className={`text-sm font-semibold ${highlight ? 'text-indigo-600' : 'text-gray-800'}`}>{value}</span>
      <span className="text-xs text-gray-400">{label}</span>
    </div>
  )
}

function StatsSummary({ posts }: { posts: Post[] }) {
  const totals = posts.reduce((acc, p) => ({
    views: acc.views + p.views_count,
    likes: acc.likes + p.likes_count,
    comments: acc.comments + p.comments_count,
    shares: acc.shares + p.shares_count,
    saves: acc.saves + p.saves_count,
  }), { views: 0, likes: 0, comments: 0, shares: 0, saves: 0 })

  const stats = [
    { label: 'Просмотры', value: fmt(totals.views), icon: <Eye size={18} />, color: 'text-blue-500', bg: 'bg-blue-50' },
    { label: 'Лайки', value: fmt(totals.likes), icon: <Heart size={18} />, color: 'text-rose-500', bg: 'bg-rose-50' },
    { label: 'Комментарии', value: fmt(totals.comments), icon: <MessageCircle size={18} />, color: 'text-amber-500', bg: 'bg-amber-50' },
    { label: 'Репосты', value: fmt(totals.shares), icon: <Share2 size={18} />, color: 'text-green-500', bg: 'bg-green-50' },
    { label: 'Сохранения', value: fmt(totals.saves), icon: <Bookmark size={18} />, color: 'text-purple-500', bg: 'bg-purple-50' },
    { label: 'Публикаций', value: String(posts.length), icon: <Play size={18} />, color: 'text-indigo-500', bg: 'bg-indigo-50' },
  ]

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
      {stats.map(s => (
        <div key={s.label} className="bg-white rounded-2xl p-4 border border-gray-100">
          <div className={`w-9 h-9 rounded-xl ${s.bg} ${s.color} flex items-center justify-center mb-3`}>{s.icon}</div>
          <div className="text-2xl font-bold text-gray-900">{s.value}</div>
          <div className="text-xs text-gray-400 mt-0.5">{s.label}</div>
        </div>
      ))}
    </div>
  )
}

function TagModal({ post, onClose, onSave }: { post: Post | null; onClose: () => void; onSave: (id: string, tags: string[], notes: string) => void }) {
  const [tags, setTags] = useState<string[]>(post?.tags || [])
  const [input, setInput] = useState('')
  const [notes, setNotes] = useState(post?.notes || '')

  if (!post) return null

  function addTag() {
    const t = input.trim().toLowerCase()
    if (t && !tags.includes(t)) setTags([...tags, t])
    setInput('')
  }

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl">
        <div className="p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Теги и заметки</h3>
          <div className="flex gap-2 mb-3">
            <input value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && addTag()} placeholder="Добавить тег..." className="flex-1 border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300" />
            <button onClick={addTag} className="px-4 py-2 bg-indigo-600 text-white rounded-xl text-sm font-medium hover:bg-indigo-700">Добавить</button>
          </div>
          <div className="flex flex-wrap gap-2 mb-4 min-h-8">
            {tags.map(tag => (
              <span key={tag} onClick={() => setTags(tags.filter(t => t !== tag))} className="flex items-center gap-1 px-3 py-1 bg-indigo-50 text-indigo-600 rounded-full text-sm cursor-pointer hover:bg-rose-50 hover:text-rose-500 transition-colors">
                #{tag} ×
              </span>
            ))}
          </div>
          <textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="Заметки..." rows={3} className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300 resize-none" />
        </div>
        <div className="flex gap-3 px-6 pb-6">
          <button onClick={onClose} className="flex-1 py-2 border border-gray-200 rounded-xl text-sm text-gray-600">Отмена</button>
          <button onClick={() => { onSave(post.id, tags, notes); onClose() }} className="flex-1 py-2 bg-indigo-600 text-white rounded-xl text-sm font-medium hover:bg-indigo-700">Сохранить</button>
        </div>
      </div>
    </div>
  )
}

// ── Main Dashboard ──────────────────────────────────────────────────────
export default function Dashboard() {
  const [posts, setPosts] = useState<Post[]>([])
  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [selectedProject, setSelectedProject] = useState('')
  const [selectedPlatform, setSelectedPlatform] = useState('')
  const [selectedTag, setSelectedTag] = useState('')
  const [tagPost, setTagPost] = useState<Post | null>(null)
  const [showAddUrl, setShowAddUrl] = useState(false)
  const [showAddProject, setShowAddProject] = useState(false)

  const fetchProjects = useCallback(async () => {
    const res = await fetch('/api/projects')
    const data = await res.json()
    setProjects(data || [])
  }, [])

  const fetchPosts = useCallback(async () => {
    setLoading(true)
    const params = new URLSearchParams()
    if (selectedProject) params.set('project_id', selectedProject)
    if (selectedPlatform) params.set('platform', selectedPlatform)
    if (search) params.set('keyword', search)
    if (selectedTag) params.set('tag', selectedTag)
    const res = await fetch(`/api/posts?${params}`)
    const { posts } = await res.json()
    setPosts(posts || [])
    setLoading(false)
  }, [selectedProject, selectedPlatform, search, selectedTag])

  useEffect(() => { fetchPosts() }, [fetchPosts])
  useEffect(() => { fetchProjects() }, [fetchProjects])

  async function savePostTags(id: string, tags: string[], notes: string) {
    await fetch('/api/posts', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, tags, notes }),
    })
    setPosts(prev => prev.map(p => p.id === id ? { ...p, tags, notes } : p))
  }

  const allTags = Array.from(new Set(posts.flatMap(p => p.tags))).sort()

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-100 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center gap-4">
          <div className="flex items-center gap-2 font-bold text-gray-900 text-lg">
            <Zap className="text-indigo-600" size={22} />
            SocialBoard
          </div>
          <div className="flex-1" />
          <button
            onClick={() => setShowAddProject(true)}
            className="flex items-center gap-2 px-4 py-2 border border-gray-200 rounded-xl text-sm text-gray-700 hover:bg-gray-50 transition-colors"
          >
            <Plus size={14} /> Проект
          </button>
          <a
            href="/api/instagram/auth"
            className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-xl text-sm font-medium hover:opacity-90 transition-opacity"
          >
            <Instagram size={14} /> Instagram
          </a>
          <button
            onClick={() => setShowAddUrl(true)}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-xl text-sm font-medium hover:bg-indigo-700 transition-colors"
          >
            <Link size={14} /> Добавить по ссылке
          </button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8">
        <StatsSummary posts={posts} />

        <div className="bg-white rounded-2xl border border-gray-100 p-4 mb-6 flex flex-wrap gap-3">
          <div className="relative flex-1 min-w-48">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Поиск по тексту..." className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300" />
          </div>
          <select value={selectedProject} onChange={e => setSelectedProject(e.target.value)} className="px-3 py-2 border border-gray-200 rounded-xl text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-300">
            <option value="">Все проекты</option>
            {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
          <select value={selectedPlatform} onChange={e => setSelectedPlatform(e.target.value)} className="px-3 py-2 border border-gray-200 rounded-xl text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-300">
            <option value="">Все платформы</option>
            <option value="instagram">Instagram</option>
            <option value="tiktok">TikTok</option>
          </select>
          {allTags.length > 0 && (
            <select value={selectedTag} onChange={e => setSelectedTag(e.target.value)} className="px-3 py-2 border border-gray-200 rounded-xl text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-300">
              <option value="">Все теги</option>
              {allTags.map(t => <option key={t} value={t}>#{t}</option>)}
            </select>
          )}
        </div>

        <div className="flex items-center justify-between mb-4">
          <span className="text-sm text-gray-500">{posts.length} публикаций</span>
        </div>

        {loading ? (
          <div className="flex items-center justify-center h-64 text-gray-400">
            <RefreshCw size={24} className="animate-spin mr-2" /> Загрузка...
          </div>
        ) : posts.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-gray-400 gap-4">
            <Play size={48} className="opacity-20" />
            <p className="text-lg font-medium">Нет публикаций</p>
            <p className="text-sm">Нажми «Добавить по ссылке» и вставь ссылку на TikTok видео</p>
            <button onClick={() => setShowAddUrl(true)} className="flex items-center gap-2 px-6 py-3 bg-indigo-600 text-white rounded-xl text-sm font-medium hover:bg-indigo-700">
              <Link size={16} /> Добавить по ссылке
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {posts.map(post => <PostCard key={post.id} post={post} onTagEdit={setTagPost} />)}
          </div>
        )}
      </main>

      {tagPost && <TagModal post={tagPost} onClose={() => setTagPost(null)} onSave={savePostTags} />}
      {showAddUrl && <AddUrlModal projects={projects} onClose={() => setShowAddUrl(false)} onAdded={fetchPosts} />}
      {showAddProject && <AddProjectModal onClose={() => setShowAddProject(false)} onAdded={fetchProjects} />}
    </div>
  )
}
