import { useCallback, useEffect, useMemo, useState } from 'react'
import { Activity, ArrowLeftRight, AudioLines, Bluetooth, Check, ChevronRight, CircleHelp, Headphones, Laptop, Monitor, RefreshCw, Search, Speaker, Star, Usb, Volume2, X } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

type Output = { id: string; label: string; kind: string; available: boolean; active: boolean; sink: string; port: string | null }
type AudioState = { outputs: Output[]; favorites: string[]; lastFavorite: string | null; moved?: number; warnings?: string[] }

function iconFor(kind: string): LucideIcon {
  if (kind === 'Bluetooth') return Bluetooth
  if (kind === 'Fone') return Headphones
  if (kind === 'Alto-falante') return Speaker
  if (kind === 'USB') return Usb
  if (kind === 'HDMI / DisplayPort') return Monitor
  return Volume2
}

async function request<T>(path: string, token?: string, body?: object): Promise<T> {
  const response = await fetch(path, {
    method: body ? 'POST' : 'GET',
    headers: body ? { 'Content-Type': 'application/json', 'X-GNS-Token': token || '' } : {},
    body: body ? JSON.stringify(body) : undefined,
    cache: 'no-store',
  })
  const data = await response.json()
  if (!response.ok) throw new Error(data.error || 'A operação falhou.')
  return data as T
}

export function App() {
  const [token, setToken] = useState('')
  const [state, setState] = useState<AudioState | null>(null)
  const [busy, setBusy] = useState('')
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [query, setQuery] = useState('')
  const [searchOpen, setSearchOpen] = useState(false)

  const refresh = useCallback(async () => {
    try {
      const next = await request<AudioState>('/api/audio')
      setState(next)
      setError('')
    } catch (issue) {
      setState(null)
      setError(issue instanceof Error ? issue.message : 'Não foi possível ler as saídas.')
    }
  }, [])

  useEffect(() => {
    request<{ token: string }>('/api/session').then(result => setToken(result.token)).catch(() => setError('O serviço local não está disponível.'))
    void refresh()
    const onFocus = () => void refresh()
    const onKey = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault()
        setSearchOpen(open => !open)
      }
      if (event.key === 'Escape') setSearchOpen(false)
    }
    window.addEventListener('focus', onFocus)
    window.addEventListener('keydown', onKey)
    return () => { window.removeEventListener('focus', onFocus); window.removeEventListener('keydown', onKey) }
  }, [refresh])

  const act = async (key: string, path: string, body: object, message: string) => {
    if (!token || busy) return
    setBusy(key)
    setError('')
    setNotice('')
    try {
      const result = await request<AudioState>(path, token, body)
      setState(result)
      const warning = result.warnings?.length ? ` ${result.warnings.join(' ')}` : ''
      setNotice(message + (result.moved !== undefined ? ` ${result.moved} fluxo(s) atualizado(s).` : '') + warning)
      setSearchOpen(false)
    } catch (issue) {
      setError(issue instanceof Error ? issue.message : 'Não foi possível concluir a ação.')
      await refresh()
    } finally {
      setBusy('')
    }
  }

  const outputs = state?.outputs || []
  const active = outputs.find(item => item.active)
  const favorites = state?.favorites || []
  const favoriteOutputs = favorites.map(id => outputs.find(item => item.id === id))
  const canToggle = favorites.length === 2 && favoriteOutputs.every(item => item?.available)
  const filtered = useMemo(() => outputs.filter(item => `${item.label} ${item.kind}`.toLowerCase().includes(query.toLowerCase())), [outputs, query])

  const select = (output: Output) => void act(output.id, '/api/audio/select', { id: output.id }, `Saída alterada para ${output.label}.`)
  const toggle = () => void act('toggle', '/api/audio/toggle', {}, 'Troca rápida concluída.')
  const changeFavorite = (output: Output) => {
    const ids = favorites.includes(output.id) ? favorites.filter(id => id !== output.id) : [...favorites, output.id]
    if (ids.length > 2) { setError('Você já escolheu dois favoritos. Remova um deles antes de adicionar outro.'); return }
    void act(`favorite:${output.id}`, '/api/audio/favorites', { ids }, 'Favoritos atualizados.')
  }

  return <div className="shell">
    <aside className="sidebar">
      <div className="brand"><span className="brand-mark"><AudioLines size={25} strokeWidth={2.4}/></span><span>gns<span className="brand-accent">-hub</span><small>CONTROLE PESSOAL</small></span></div>
      <div className="side-label">ESPAÇO DE TRABALHO</div>
      <nav><a className="nav-item active" href="#audio"><Volume2 size={20}/><span>Áudio</span><span className="nav-indicator"/></a></nav>
      <div className="sidebar-bottom"><div className="side-info"><span className="status-dot"/> Serviço local <span className="side-connection">{error && !state ? 'indisponível' : 'conectado'}</span></div><p>Seu centro de controle, começando pelo essencial.</p></div>
    </aside>
    <main className="main" id="audio">
      <header className="topbar"><div className="breadcrumb">Workspace <ChevronRight size={15}/> <strong>Áudio</strong></div><button className="search-trigger" onClick={() => setSearchOpen(true)}><Search size={17}/><span>Buscar uma saída...</span><kbd>Ctrl K</kbd></button><div className="avatar">GN</div></header>
      <div className="content"><div className="page-heading"><div><div className="eyebrow"><span className="eyebrow-line"/> CONTROLE DE DISPOSITIVOS</div><h1>Seu áudio, <span>onde quiser.</span></h1><p>Escolha o destino do som sem interromper o que você está fazendo.</p></div><button className="icon-button refresh" onClick={() => void refresh()} title="Atualizar saídas" aria-label="Atualizar saídas"><RefreshCw size={19}/></button></div>

      {error && <div className="alert error" role="alert"><CircleHelp size={18}/><span>{error}</span><button aria-label="Fechar aviso" onClick={() => setError('')}><X size={17}/></button></div>}
      {notice && <div className="alert success" role="status"><Check size={18}/><span>{notice}</span><button aria-label="Fechar aviso" onClick={() => setNotice('')}><X size={17}/></button></div>}

      <section className="current-card"><div className="current-glow"/><div className="current-copy"><div className="card-kicker"><span className="live-dot"/> SAÍDA ATUAL</div><div className="current-icon">{active ? (() => { const Icon = iconFor(active.kind); return <Icon size={30}/> })() : <Volume2 size={30}/>}</div><h2>{active?.label || (state ? 'Nenhuma saída ativa' : 'Aguardando serviço de áudio')}</h2><p>{active ? `${active.kind} · Reprodução direcionada para este dispositivo` : 'Atualize para consultar os dispositivos disponíveis.'}</p></div><div className="current-action"><div className="signal"><span/><span/><span/><span/><span/><span/><span/></div><button className="primary-button" onClick={toggle} disabled={!canToggle || !!busy || !token}><ArrowLeftRight size={18}/>{busy === 'toggle' ? 'Trocando...' : 'Trocar saída'}</button><small>{favorites.length < 2 ? 'Escolha dois favoritos para a troca rápida' : !canToggle ? 'Um favorito está indisponível' : 'Alternar entre seus favoritos'}</small></div></section>

      <div className="section-head"><div><div className="eyebrow">SEUS DESTINOS</div><h2>Saídas disponíveis <span className="count">{outputs.length}</span></h2></div><button className="text-button" onClick={() => void refresh()}><RefreshCw size={16}/> Atualizar lista</button></div>
      <div className="output-grid">{outputs.map(output => { const Icon = iconFor(output.kind); const favorite = favorites.includes(output.id); return <article className={`output-card ${output.active ? 'selected' : ''} ${!output.available ? 'unavailable' : ''}`} key={output.id}><div className="output-top"><span className="device-icon"><Icon size={22}/></span><button className={`favorite-button ${favorite ? 'on' : ''}`} onClick={() => changeFavorite(output)} disabled={!!busy || !token} aria-label={favorite ? `Remover ${output.label} dos favoritos` : `Adicionar ${output.label} aos favoritos`} title={favorite ? 'Remover dos favoritos' : 'Adicionar aos favoritos'}><Star size={19} fill={favorite ? 'currentColor' : 'none'}/></button></div><div className="output-kind">{output.kind}</div><h3>{output.label}</h3><div className="output-bottom"><span className={`output-status ${output.active ? 'is-active' : output.available ? '' : 'is-offline'}`}><span/>{output.active ? 'Em uso' : output.available ? 'Disponível' : 'Indisponível'}</span><button onClick={() => select(output)} disabled={output.active || !output.available || !!busy || !token}>{busy === output.id ? 'Alterando...' : output.active ? 'Selecionado' : 'Selecionar'}{!output.active && <ChevronRight size={16}/>}</button></div></article> })}</div>
      {state && outputs.length === 0 && <div className="empty"><Headphones size={32}/><h3>Nenhuma saída encontrada</h3><p>Conecte um dispositivo de áudio e atualize a lista.</p></div>}

      <div className="bottom-grid"><section className="panel"><div className="panel-icon"><Star size={18}/></div><div><h3>Troca rápida</h3><p>Escolha até dois destinos favoritos. O botão principal alterna entre eles com um clique.</p><div className="favorite-list">{[0, 1].map(index => <span key={index}><b>0{index + 1}</b>{favoriteOutputs[index]?.label || 'Escolha um dispositivo'}</span>)}</div></div></section><section className="panel help-panel"><div className="panel-icon"><Activity size={18}/></div><div><h3>Sem pausar sua música</h3><p>Ao selecionar uma saída, o hub muda o destino padrão e move os aplicativos que já estão reproduzindo áudio.</p><span className="help-note"><Laptop size={15}/> Feito para o seu Linux Mint</span></div></section></div>
      <footer>gns-hub <span>·</span> Controle local de áudio</footer>
      </div>
    </main>
    {searchOpen && <div className="dialog-backdrop" onMouseDown={() => setSearchOpen(false)}><div className="search-dialog" role="dialog" aria-modal="true" aria-label="Buscar saída de áudio" onMouseDown={event => event.stopPropagation()}><div className="dialog-input"><Search size={19}/><input autoFocus placeholder="Buscar saída de áudio..." value={query} onChange={event => setQuery(event.target.value)}/><button onClick={() => setSearchOpen(false)} aria-label="Fechar busca"><X size={18}/></button></div><div className="dialog-results">{filtered.map(output => { const Icon = iconFor(output.kind); return <button key={output.id} disabled={!output.available || !!busy} onClick={() => select(output)}><Icon size={18}/><span>{output.label}<small>{output.kind} · {output.available ? output.active ? 'Em uso' : 'Disponível' : 'Indisponível'}</small></span><ChevronRight size={16}/></button> })}{filtered.length === 0 && <p>Nenhuma saída encontrada.</p>}</div><div className="dialog-footer">ESC para fechar <span>·</span> Selecione um destino para trocar</div></div></div>}
  </div>
}
