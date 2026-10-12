import { useCallback, useEffect, useMemo, useState } from 'react'
import { ArrowDown, ArrowLeftRight, ArrowUp, AudioLines, Bluetooth, Check, ChevronRight, CircleHelp, Eye, EyeOff, Headphones, Monitor, Pencil, RefreshCw, Search, Settings2, Speaker, Star, Usb, Volume2, X } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

type Output = { id: string; label: string; name: string; kind: string; available: boolean; active: boolean; hidden: boolean }
type AudioState = { outputs: Output[]; favorites: string[]; moved?: number; warnings?: string[] }

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
  const [manageOpen, setManageOpen] = useState(false)
  const [editing, setEditing] = useState<Output | null>(null)
  const [draftName, setDraftName] = useState('')

  const refresh = useCallback(async () => {
    try {
      setState(await request<AudioState>('/api/audio'))
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
      if (event.key === 'Escape') { setSearchOpen(false); setManageOpen(false); setEditing(null) }
    }
    window.addEventListener('focus', onFocus)
    window.addEventListener('keydown', onKey)
    return () => { window.removeEventListener('focus', onFocus); window.removeEventListener('keydown', onKey) }
  }, [refresh])

  const act = async (key: string, path: string, body: object, message: string) => {
    if (!token || busy) return false
    setBusy(key)
    setError('')
    setNotice('')
    try {
      const result = await request<AudioState>(path, token, body)
      setState(result)
      const warning = result.warnings?.length ? ` ${result.warnings.join(' ')}` : ''
      setNotice(message + (result.moved !== undefined ? ` ${result.moved} fluxo(s) atualizado(s).` : '') + warning)
      setSearchOpen(false)
      return true
    } catch (issue) {
      const message = issue instanceof Error ? issue.message : 'Não foi possível concluir a ação.'
      try { setState(await request<AudioState>('/api/audio')) } catch { setState(null) }
      setError(message)
      return false
    } finally {
      setBusy('')
    }
  }

  const outputs = state?.outputs || []
  const active = outputs.find(item => item.active)
  const favorites = state?.favorites || []
  const visible = outputs.filter(item => item.available && !item.hidden)
  const byId = new Map(outputs.map(item => [item.id, item]))
  const queue = favorites.map(id => byId.get(id)).filter((item): item is Output => !!item && item.available && !item.hidden)
  const canToggle = queue.length >= 2
  const filtered = useMemo(() => visible.filter(item => `${item.name} ${item.label} ${item.kind}`.toLowerCase().includes(query.toLowerCase())), [visible, query])

  const select = (output: Output) => void act(output.id, '/api/audio/select', { id: output.id }, `Saída alterada para ${output.name}.`)
  useEffect(() => {
    const onNumber = (event: KeyboardEvent) => {
      if (!/^[1-9]$/.test(event.key) || event.altKey || event.ctrlKey || event.metaKey || event.shiftKey || event.repeat) return
      if (searchOpen || manageOpen || editing || busy || !token) return
      const target = event.target
      if (target instanceof HTMLElement && (target.isContentEditable || target.closest('input, textarea, select, [contenteditable="true"]'))) return
      const output = visible[Number(event.key) - 1]
      if (!output) return
      event.preventDefault()
      if (!output.active) select(output)
    }
    window.addEventListener('keydown', onNumber)
    return () => window.removeEventListener('keydown', onNumber)
  }, [visible, searchOpen, manageOpen, editing, busy, token])
  const toggle = () => void act('toggle', '/api/audio/toggle', {}, 'Próxima saída ativada.')
  const changeFavorite = (output: Output) => {
    const ids = favorites.includes(output.id) ? favorites.filter(id => id !== output.id) : [...favorites, output.id]
    void act(`favorite:${output.id}`, '/api/audio/favorites', { ids }, 'Fila de favoritos atualizada.')
  }
  const changeVisibility = (output: Output) => void act(`visible:${output.id}`, '/api/audio/visibility', { id: output.id, hidden: !output.hidden }, output.hidden ? 'Dispositivo restaurado.' : 'Dispositivo ocultado.')
  const openRename = (output: Output) => { setEditing(output); setDraftName(output.name === output.label ? '' : output.name) }
  const saveName = async () => {
    if (!editing) return
    if (await act(`rename:${editing.id}`, '/api/audio/rename', { id: editing.id, name: draftName }, 'Nome atualizado.')) setEditing(null)
  }
  const moveFavorite = (index: number, direction: -1 | 1) => {
    const nextIndex = index + direction
    if (nextIndex < 0 || nextIndex >= queue.length) return
    const reordered = queue.map(item => item.id)
    ;[reordered[index], reordered[nextIndex]] = [reordered[nextIndex], reordered[index]]
    let cursor = 0
    const eligible = new Set(queue.map(item => item.id))
    const ids = favorites.map(id => eligible.has(id) ? reordered[cursor++] : id)
    void act('reorder', '/api/audio/favorites', { ids }, 'Ordem da fila atualizada.')
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
      <div className="content">
        <div className="page-heading"><div><div className="eyebrow"><span className="eyebrow-line"/> CONTROLE DE DISPOSITIVOS</div><h1>Seu áudio, <span>onde quiser.</span></h1><p>Suas saídas escolhidas, sempre à mão.</p></div><button className="icon-button refresh" onClick={() => void refresh()} title="Atualizar saídas" aria-label="Atualizar saídas"><RefreshCw size={19}/></button></div>
        {error && <div className="alert error" role="alert"><CircleHelp size={18}/><span>{error}</span><button aria-label="Fechar aviso" onClick={() => setError('')}><X size={17}/></button></div>}
        {notice && <div className="alert success" role="status"><Check size={18}/><span>{notice}</span><button aria-label="Fechar aviso" onClick={() => setNotice('')}><X size={17}/></button></div>}

        <section className="current-card"><div className="current-glow"/><div className="current-copy"><div className="card-kicker"><span className="live-dot"/> SAÍDA ATUAL</div><div className="current-icon">{active ? (() => { const Icon = iconFor(active.kind); return <Icon size={30}/> })() : <Volume2 size={30}/>}</div><h2>{active?.name || (state ? 'Nenhuma saída ativa' : 'Aguardando serviço de áudio')}</h2><p>{active ? active.kind : 'Atualize para consultar os dispositivos disponíveis.'}</p></div><div className="current-action"><div className="signal"><span/><span/><span/><span/><span/><span/><span/></div><button className="primary-button" onClick={toggle} disabled={!canToggle || !!busy || !token}><ArrowLeftRight size={18}/>{busy === 'toggle' ? 'Trocando...' : 'Próxima saída'}</button><small>{canToggle ? `${queue.length} saídas na fila · avança e volta ao início` : 'Adicione ao menos duas saídas visíveis à fila'}</small></div></section>

        <div className="section-head"><div><div className="eyebrow">SEUS DESTINOS</div><h2>Saídas disponíveis <span className="count">{visible.length}</span></h2></div><div className="section-actions"><span className="shortcut-hint">Teclas 1–9</span><button className="text-button" onClick={() => void refresh()}><RefreshCw size={16}/> Atualizar</button><button className="text-button" onClick={() => setManageOpen(true)}><Settings2 size={16}/> Gerenciar</button></div></div>
        <div className="output-grid">{visible.map((output, index) => { const Icon = iconFor(output.kind); const favorite = favorites.includes(output.id); return <article className={`output-card ${output.active ? 'selected' : ''}`} key={output.id}><div className="output-top"><div className="device-mark"><span className="device-icon"><Icon size={22}/></span>{index < 9 && <kbd className="device-shortcut" title={`Pressione ${index + 1} para selecionar`}>{index + 1}</kbd>}</div><div className="card-tools"><button className="card-icon-button" onClick={() => openRename(output)} aria-label={`Renomear ${output.name}`} title="Renomear"><Pencil size={16}/></button><button className="card-icon-button" onClick={() => changeVisibility(output)} disabled={!!busy || !token} aria-label={`Ocultar ${output.name}`} title="Ocultar"><EyeOff size={17}/></button><button className={`favorite-button ${favorite ? 'on' : ''}`} onClick={() => changeFavorite(output)} disabled={!!busy || !token} aria-label={favorite ? `Remover ${output.name} da fila` : `Adicionar ${output.name} à fila`} title={favorite ? 'Remover da fila' : 'Adicionar à fila'}><Star size={19} fill={favorite ? 'currentColor' : 'none'}/></button></div></div><div className="output-kind">{output.kind}</div><h3>{output.name}</h3><div className="output-bottom"><span className={`output-status ${output.active ? 'is-active' : ''}`}><span/>{output.active ? 'Em uso' : 'Disponível'}</span><button onClick={() => select(output)} disabled={output.active || !!busy || !token}>{busy === output.id ? 'Alterando...' : output.active ? 'Selecionado' : 'Selecionar'}{!output.active && <ChevronRight size={16}/>}</button></div></article> })}</div>
        {state && visible.length === 0 && <div className="empty"><Headphones size={32}/><h3>Nenhuma saída visível</h3><p>Conecte um dispositivo ou abra Gerenciar para restaurar uma saída oculta.</p><button className="secondary-button" onClick={() => setManageOpen(true)}>Gerenciar dispositivos</button></div>}

        <section className="queue-panel"><div className="queue-heading"><span className="panel-icon"><Star size={18}/></span><div><h3>Fila de favoritos</h3><p>A ordem abaixo define a próxima saída ao clicar no botão principal.</p></div></div>{queue.length ? <ol className="queue-list">{queue.map((output, index) => <li key={output.id}><span className="queue-number">{String(index + 1).padStart(2, '0')}</span><span className="queue-name">{output.name}</span>{output.active && <span className="queue-active">Em uso</span>}<div className="queue-controls"><button onClick={() => moveFavorite(index, -1)} disabled={index === 0 || !!busy} aria-label={`Mover ${output.name} para cima`}><ArrowUp size={16}/></button><button onClick={() => moveFavorite(index, 1)} disabled={index === queue.length - 1 || !!busy} aria-label={`Mover ${output.name} para baixo`}><ArrowDown size={16}/></button></div></li>)}</ol> : <p className="queue-empty">Marque as estrelas dos dispositivos que deseja incluir na fila.</p>}</section>
        <footer>gns-hub <span>·</span> Controle local de áudio</footer>
      </div>
    </main>

    {searchOpen && <div className="dialog-backdrop" onMouseDown={() => setSearchOpen(false)}><div className="search-dialog" role="dialog" aria-modal="true" aria-label="Buscar saída de áudio" onMouseDown={event => event.stopPropagation()}><div className="dialog-input"><Search size={19}/><input autoFocus placeholder="Buscar saída visível..." value={query} onChange={event => setQuery(event.target.value)}/><button onClick={() => setSearchOpen(false)} aria-label="Fechar busca"><X size={18}/></button></div><div className="dialog-results">{filtered.map(output => { const Icon = iconFor(output.kind); return <button key={output.id} disabled={!!busy} onClick={() => select(output)}><Icon size={18}/><span>{output.name}<small>{output.kind} · {output.active ? 'Em uso' : 'Disponível'}</small></span><ChevronRight size={16}/></button> })}{filtered.length === 0 && <p>Nenhuma saída visível encontrada.</p>}</div><div className="dialog-footer">ESC para fechar <span>·</span> Selecione um destino para trocar</div></div></div>}

    {manageOpen && <div className="dialog-backdrop" onMouseDown={() => setManageOpen(false)}><div className="manage-dialog" role="dialog" aria-modal="true" aria-label="Gerenciar dispositivos" onMouseDown={event => event.stopPropagation()}><div className="manage-header"><div><h2>Gerenciar dispositivos</h2><p>Escolha quais saídas aparecem na tela principal.</p></div><button onClick={() => setManageOpen(false)} aria-label="Fechar gerenciamento"><X size={20}/></button></div><div className="manage-list">{outputs.map(output => { const Icon = iconFor(output.kind); return <div className="manage-row" key={output.id}><span className="device-icon"><Icon size={19}/></span><div className="manage-copy"><strong>{output.name}</strong><small>{output.kind} · {output.available ? output.hidden ? 'Oculto' : 'Disponível' : 'Desconectado'}</small></div><button onClick={() => openRename(output)} aria-label={`Renomear ${output.name}`} title="Renomear"><Pencil size={17}/></button><button onClick={() => changeVisibility(output)} disabled={!!busy} aria-label={output.hidden ? `Mostrar ${output.name}` : `Ocultar ${output.name}`} title={output.hidden ? 'Mostrar' : 'Ocultar'}>{output.hidden ? <Eye size={18}/> : <EyeOff size={18}/>}</button></div> })}</div><div className="dialog-footer">Saídas desconectadas aparecem aqui para conservar seus nomes e preferências.</div></div></div>}

    {editing && <div className="dialog-backdrop dialog-top" onMouseDown={() => setEditing(null)}><form className="rename-dialog" role="dialog" aria-modal="true" aria-label="Renomear dispositivo" onMouseDown={event => event.stopPropagation()} onSubmit={event => { event.preventDefault(); void saveName() }}><div className="manage-header"><div><h2>Renomear dispositivo</h2><p>Nome original: {editing.label}</p></div><button type="button" onClick={() => setEditing(null)} aria-label="Fechar"><X size={20}/></button></div><label htmlFor="device-name">Nome personalizado</label><input id="device-name" autoFocus maxLength={50} placeholder={editing.label} value={draftName} onChange={event => setDraftName(event.target.value)}/><p>Deixe em branco para usar o nome original.</p><div className="rename-actions"><button type="button" className="secondary-button" onClick={() => setEditing(null)}>Cancelar</button><button type="submit" className="primary-button" disabled={!!busy || !token}>Salvar nome</button></div></form></div>}
  </div>
}
