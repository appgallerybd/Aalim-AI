import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { Activity, ArrowDown, ArrowUp, Check, CheckCheck, ChevronDown, CircleHelp, Code2, Copy, ExternalLink, Globe2, Layers3, Menu, MessageSquare, Moon, MoreHorizontal, Plus, Send, Settings2, ShieldCheck, Sparkles, Sun, Trash2, X, Zap } from 'lucide-react';
import './style.css';

const API_BASE = 'https://helyxai.space/v1';
const STARTER_MODELS = [
  { id: 'gemini-3.1-flash-lite', name: 'Gemini 3.1 Flash Lite', provider: 'Google' },
  { id: 'deepseek-chat', name: 'DeepSeek Chat', provider: 'DeepSeek' },
  { id: 'deepseek-reasoner', name: 'DeepSeek Reasoner', provider: 'DeepSeek' },
  { id: 'glm-4.5-flash', name: 'GLM 4.5 Flash', provider: 'Zhipu AI' },
  { id: 'gemma-3-27b-it', name: 'Gemma 3 27B', provider: 'Google' },
];
const providerColors = { Google: '#4285f4', DeepSeek: '#4e7bff', 'Zhipu AI': '#9b75ff', Helyx: '#39d6a0' };
const uid = () => Math.random().toString(36).slice(2, 10);

function App() {
  const [apiKey, setApiKey] = useState(() => localStorage.getItem('aalim_api_key') || '');
  const [keyDraft, setKeyDraft] = useState('');
  const [keyOpen, setKeyOpen] = useState(false);
  const [connected, setConnected] = useState(false);
  const [keyError, setKeyError] = useState('');
  const [models, setModels] = useState(STARTER_MODELS);
  const [selected, setSelected] = useState([STARTER_MODELS[0].id]);
  const [modelMenu, setModelMenu] = useState(false);
  const [prompt, setPrompt] = useState('');
  const [threads, setThreads] = useState([]);
  const [activeThread, setActiveThread] = useState(null);
  const [activeModel, setActiveModel] = useState('');
  const [busy, setBusy] = useState([]);
  const [dark, setDark] = useState(() => localStorage.getItem('aalim_theme') !== 'light');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [toast, setToast] = useState('');
  const bottomRef = useRef(null);
  const inputRef = useRef(null);

  const current = threads.find(t => t.id === activeThread);
  const responses = current?.responses || [];
  const chosenModelNames = useMemo(() => selected.map(id => models.find(m => m.id === id)?.name || id), [selected, models]);

  useEffect(() => { document.documentElement.dataset.theme = dark ? 'dark' : 'light'; localStorage.setItem('aalim_theme', dark ? 'dark' : 'light'); }, [dark]);
  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' }); }, [responses, busy, activeModel]);
  useEffect(() => { if (apiKey) { setConnected(true); loadModels(apiKey, false); } }, []);
  useEffect(() => { if (!toast) return; const t = setTimeout(() => setToast(''), 2600); return () => clearTimeout(t); }, [toast]);

  async function loadModels(key, notify = true) {
    try {
      const r = await fetch(API_BASE + '/models', { headers: { Authorization: 'Bearer ' + key } });
      if (!r.ok) throw new Error(r.status === 401 ? 'API key rejected. Please check the key.' : 'Could not load models (' + r.status + ').');
      const data = await r.json();
      const rows = (data.data || data.models || []).map(m => {
        const id = m.id || m.name;
        const rawProvider = m.owned_by || m.provider || (id.toLowerCase().includes('deepseek') ? 'DeepSeek' : id.toLowerCase().includes('gemini') || id.toLowerCase().includes('gemma') ? 'Google' : 'Helyx');
        const provider = /google|gemini|gemma/i.test(rawProvider) ? 'Google' : /deepseek/i.test(rawProvider) ? 'DeepSeek' : /zhipu|glm/i.test(rawProvider) ? 'Zhipu AI' : rawProvider;
        return { id, name: m.name || id, provider };
      }).filter(m => m.id);
      if (rows.length) { setModels(rows); setSelected(prev => prev.filter(id => rows.some(m => m.id === id)).length ? prev.filter(id => rows.some(m => m.id === id)) : [rows[0].id]); }
      if (notify) setToast(rows.length ? rows.length + ' models ready' : 'Connected; using suggested models');
      return true;
    } catch (e) {
      if (notify) setToast(e.message || 'Could not load models');
      return false;
    }
  }

  async function connectKey() {
    const key = keyDraft.trim();
    if (!key) { setKeyError('Please enter your Helyx AI API key.'); return; }
    setKeyError('');
    const ok = await loadModels(key, false);
    if (!ok) { setKeyError('Could not verify this key. Check the key and your connection, then try again.'); return; }
    localStorage.setItem('aalim_api_key', key);
    setApiKey(key); setConnected(true); setKeyOpen(false); setKeyDraft(''); setToast('API connected successfully');
  }
  function disconnect() { localStorage.removeItem('aalim_api_key'); setApiKey(''); setConnected(false); setKeyOpen(false); setKeyError(''); setToast('API key disconnected'); }
  function toggleModel(id) { setSelected(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]); }
  function newChat() { setActiveThread(null); setActiveModel(''); setPrompt(''); setSidebarOpen(false); inputRef.current?.focus(); }
  function updateThread(id, fn) { setThreads(prev => prev.map(t => t.id === id ? fn(t) : t)); }

  async function sendMessage(e) {
    e?.preventDefault();
    const text = prompt.trim();
    if (!text || busy.length || !apiKey) { if (!apiKey) { setKeyOpen(true); setToast('Connect your API key to start chatting'); } return; }
    if (!selected.length) { setToast('Select at least one model first'); return; }
    const threadId = activeThread || uid();
    const isNew = !activeThread;
    const message = { id: uid(), role: 'user', content: text, createdAt: Date.now() };
    if (isNew) {
      setThreads(prev => [{ id: threadId, title: text.length > 36 ? text.slice(0, 36) + '…' : text, messages: [message], responses: [], createdAt: Date.now() }, ...prev]);
      setActiveThread(threadId);
    } else {
      updateThread(threadId, t => ({ ...t, messages: [...t.messages, message], responses: [] }));
    }
    const targets = [...selected];
    setBusy(targets);
    setActiveModel(targets[0]);
    setPrompt('');
    const previousMessages = isNew ? [] : (current?.messages || []);
    await Promise.all(targets.map(async modelId => {
      try {
        const model = models.find(m => m.id === modelId);
        const history = [...previousMessages, message].slice(-20).map(m => ({ role: m.role, content: m.content }));
        const r = await fetch(API_BASE + '/chat/completions', {
          method: 'POST',
          headers: { Authorization: 'Bearer ' + apiKey, 'Content-Type': 'application/json' },
          body: JSON.stringify({ model: modelId, messages: history, stream: false })
        });
        const data = await r.json().catch(() => ({}));
        if (!r.ok) throw new Error(data.error?.message || data.message || 'Request failed (' + r.status + ')');
        const answer = data.choices?.[0]?.message?.content ?? data.output_text ?? data.response ?? 'The model returned an empty response.';
        const content = typeof answer === 'string' ? answer : JSON.stringify(answer, null, 2);
        updateThread(threadId, t => ({ ...t, responses: [...t.responses.filter(x => x.modelId !== modelId), { id: uid(), modelId, modelName: model?.name || modelId, provider: model?.provider || 'AI', content, createdAt: Date.now() }] }));
      } catch (err) {
        updateThread(threadId, t => ({ ...t, responses: [...t.responses.filter(x => x.modelId !== modelId), { id: uid(), modelId, modelName: models.find(m => m.id === modelId)?.name || modelId, provider: models.find(m => m.id === modelId)?.provider || 'AI', error: err.message || 'Request failed', content: '' }] }));
      } finally {
        setBusy(prev => prev.filter(x => x !== modelId));
      }
    }));
    setActiveModel(targets[0]);
  }

  async function copyText(text) { try { await navigator.clipboard.writeText(text); setToast('Copied to clipboard'); } catch { setToast('Could not copy text'); } }
  function removeThread(id, e) { e?.stopPropagation(); setThreads(prev => prev.filter(t => t.id !== id)); if (activeThread === id) newChat(); }

  return <div className="app-shell">
    <aside className={'sidebar ' + (sidebarOpen ? 'sidebar-open' : '')}>
      <div className="brand-row"><div className="brand-mark"><Sparkles size={19} strokeWidth={2.4}/></div><div><div className="brand-name">aalim<span>.ai</span></div><div className="brand-caption">MULTI-MODEL WORKSPACE</div></div><button className="icon-btn sidebar-close" onClick={() => setSidebarOpen(false)} aria-label="Close sidebar"><X size={18}/></button></div>
      <button className="new-chat-btn" onClick={newChat}><Plus size={17}/> <span>New conversation</span><span className="shortcut">⌘ K</span></button>
      <div className="side-label">WORKSPACE</div>
      <div className="side-link active"><MessageSquare size={17}/><span>AI Chat</span><span className="live-dot"/></div>
      <div className="side-link" onClick={() => setToast('Select multiple models to compare their answers')}><Layers3 size={17}/><span>Compare models</span><span className="soon">LIVE</span></div>
      <div className="side-label history-label">RECENT CONVERSATIONS <span>{threads.length}</span></div>
      <div className="thread-list">{threads.length ? threads.map(t => <button className={'thread-item ' + (t.id === activeThread ? 'thread-active' : '')} key={t.id} onClick={() => { setActiveThread(t.id); setActiveModel(t.responses[0]?.modelId || ''); setSidebarOpen(false); }}><MessageSquare size={15}/><span>{t.title}</span><button className="thread-delete" onClick={e => removeThread(t.id, e)} aria-label="Delete conversation"><Trash2 size={13}/></button></button>) : <div className="empty-history">Your conversations will appear here.</div>}</div>
      <div className="sidebar-bottom"><div className="privacy-card"><ShieldCheck size={17}/><div><strong>Your keys, your control</strong><p>API key stays in this browser.</p></div></div><div className="profile-row"><div className="avatar">A</div><div className="profile-copy"><strong>Aalim AI</strong><span>Personal workspace</span></div><button className="icon-btn" onClick={() => setKeyOpen(true)} aria-label="Settings"><Settings2 size={17}/></button></div></div>
    </aside>
    {sidebarOpen && <button className="mobile-scrim" onClick={() => setSidebarOpen(false)} aria-label="Close menu"/>}
    <main className="main-area">
      <header className="topbar"><div className="top-left"><button className="icon-btn mobile-menu" onClick={() => setSidebarOpen(true)} aria-label="Open menu"><Menu size={20}/></button><div className="breadcrumb">Workspace <span>/</span> <strong>AI Chat</strong></div></div><div className="top-actions"><div className={'connection-status ' + (connected ? 'is-connected' : '')}><span className="status-light"/><span>{connected ? 'API connected' : 'Not connected'}</span></div><button className={'connect-btn ' + (connected ? 'connected' : '')} onClick={() => { setKeyDraft(''); setKeyError(''); setKeyOpen(true); }}><span className="btn-status-light"/><Zap size={15}/><span>{connected ? 'API Key' : 'Connect API Key'}</span><ChevronDown size={14}/></button><button className="icon-btn theme-toggle" onClick={() => setDark(!dark)} aria-label="Toggle theme">{dark ? <Sun size={18}/> : <Moon size={18}/>}</button></div></header>
      <section className="chat-workspace">
        <div className="workspace-heading"><div className="eyebrow"><span className="eyebrow-line"/> YOUR AI WORKSPACE</div><h1>{current ? current.title : <>One question.<br/><span>Every perspective.</span></>}</h1><p className="heading-desc">{current ? 'Continue the conversation or ask another question.' : 'Bring the best AI models together. Choose one, a few, or all — and get answers side by side.'}</p></div>
        {!current && <div className="feature-row"><div className="feature-pill"><span className="feature-icon"><Layers3 size={15}/></span>Multi-model answers</div><div className="feature-pill"><span className="feature-icon green"><Zap size={15}/></span>One prompt, parallel replies</div><div className="feature-pill"><span className="feature-icon violet"><ShieldCheck size={15}/></span>Your own API key</div></div>}
        <div className="model-select-card"><div className="model-card-top"><div><div className="section-kicker">01 <span>CHOOSE YOUR MODELS</span></div><div className="model-title">Who should answer?</div></div><button className="select-all-btn" onClick={() => setSelected(selected.length === models.length ? [] : models.map(m => m.id))}>{selected.length === models.length ? 'Deselect all' : 'Select all'} <CheckCheck size={14}/></button></div>
          <div className="model-grid">{models.map((m, i) => <button key={m.id} className={'model-chip ' + (selected.includes(m.id) ? 'model-selected' : '')} onClick={() => toggleModel(m.id)}><span className="provider-icon" style={{'--provider-color':providerColors[m.provider] || '#8b9ab8'}}>{(m.provider || m.name).slice(0,1).toUpperCase()}</span><span className="model-chip-copy"><strong>{m.name}</strong><small>{m.provider}</small></span><span className="check-circle">{selected.includes(m.id) && <Check size={12}/>}</span></button>)}</div>
          <div className="model-card-foot"><span><span className="tiny-live"/> {models.length} models available</span><span>{selected.length} selected <span className="foot-separator">·</span> {selected.length ? 'Ready to answer' : 'Choose a model'}</span></div>
        </div>
        <div className="conversation-area">
          {current && responses.length > 0 && <div className="answer-section"><div className="user-question"><div className="user-avatar">You</div><div><div className="answer-label">YOUR QUESTION</div><p>{current.messages[current.messages.length - 1]?.content}</p></div></div>
            <div className="response-tabs" role="tablist" aria-label="Model responses">{responses.map(r => <button key={r.modelId} role="tab" aria-selected={activeModel === r.modelId} className={'response-tab ' + (activeModel === r.modelId ? 'tab-active' : '')} onClick={() => setActiveModel(r.modelId)}><span className="tab-dot" style={{background:providerColors[r.provider] || '#8b9ab8'}}/>{r.modelName}{r.error && <span className="error-dot"/>}</button>)}{busy.map(id => !responses.some(r => r.modelId === id) && <button key={id} className="response-tab tab-loading" onClick={() => setActiveModel(id)}><span className="mini-spinner"/>{models.find(m => m.id === id)?.name || id}</button>)}</div>
            {responses.filter(r => r.modelId === activeModel).map(r => <article className="response-card" key={r.id}><div className="response-card-head"><div className="response-model-avatar" style={{'--provider-color':providerColors[r.provider] || '#8b9ab8'}}>{(r.provider || 'AI').slice(0,1)}</div><div className="response-model-info"><strong>{r.modelName}</strong><span>{r.provider} · {r.error ? 'Request failed' : 'Response'}</span></div><button className="copy-btn" onClick={() => copyText(r.error || r.content)}><Copy size={14}/> Copy</button></div>{r.error ? <div className="response-error"><CircleHelp size={17}/><div><strong>This model couldn't respond</strong><p>{r.error}</p></div></div> : <div className="markdown-content">{r.content.split('\n').map((line,i) => <p key={i}>{line || <br/>}</p>)}</div>}</article>)}
          </div>}
          {busy.length > 0 && <div className="running-status"><span className="loading-orbit"><Sparkles size={15}/></span><span>Getting answers from <strong>{busy.length} {busy.length === 1 ? 'model' : 'models'}</strong>…</span><div className="running-bars"><i/><i/><i/></div></div>}
          {!current && <div className="suggestions"><div className="suggestions-label">NOT SURE WHERE TO START?</div><div className="suggestion-grid"><button onClick={() => setPrompt('Explain a complex topic in simple Bengali, with practical examples.')}><span className="suggestion-icon"><Globe2 size={17}/></span><span><strong>Explain something</strong><small>Make any topic easy to understand</small></span><ArrowUp size={15}/></button><button onClick={() => setPrompt('Help me debug this code and explain the best solution.')}><span className="suggestion-icon purple"><Code2 size={17}/></span><span><strong>Write or debug code</strong><small>Build, improve, and troubleshoot</small></span><ArrowUp size={15}/></button><button onClick={() => setPrompt('Compare the strongest approaches to this problem and recommend one.')}><span className="suggestion-icon amber"><Activity size={17}/></span><span><strong>Compare ideas</strong><small>Explore multiple perspectives</small></span><ArrowUp size={15}/></button></div></div>}
          <div ref={bottomRef}/>
        </div>
        <form className="composer-wrap" onSubmit={sendMessage}><div className="composer"><textarea ref={inputRef} value={prompt} onChange={e => setPrompt(e.target.value)} onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); } }} placeholder={connected ? 'Ask anything… compare ideas, write code, explore a topic' : 'Connect your API key to start a conversation'} rows={2}/><div className="composer-bottom"><div className="composer-hints"><button type="button" className="composer-tool" onClick={() => setModelMenu(!modelMenu)}><Layers3 size={14}/>{selected.length} models <ChevronDown size={13}/></button><span className="hint-divider"/><span className="keyboard-hint">↵ to send <span>·</span> Shift + ↵ for new line</span></div><button className="send-btn" type="submit" disabled={!prompt.trim() || busy.length > 0}><span>{busy.length ? 'Working' : 'Send prompt'}</span><Send size={15}/></button></div></div>
          {modelMenu && <div className="quick-model-menu">{models.map(m => <button type="button" key={m.id} onClick={() => toggleModel(m.id)}><span className={'quick-check ' + (selected.includes(m.id) ? 'checked' : '')}>{selected.includes(m.id) && <Check size={11}/>}</span><span>{m.name}</span><small>{m.provider}</small></button>)}</div>}
          <div className="composer-note"><ShieldCheck size={12}/> Your API key is stored in this browser. AI responses may contain mistakes.</div>
        </form>
        <footer className="workspace-footer"><span>Made for thoughtful work <span className="footer-heart">✳</span></span><span>Powered by your Helyx AI connection <span className="footer-dot"/></span></footer>
      </section>
    </main>
    {keyOpen && <div className="modal-backdrop" onMouseDown={e => { if (e.target === e.currentTarget) setKeyOpen(false); }}><section className="api-modal" role="dialog" aria-modal="true" aria-labelledby="api-modal-title"><div className="modal-top"><div className="modal-icon"><Zap size={20}/></div><button className="icon-btn" onClick={() => setKeyOpen(false)} aria-label="Close dialog"><X size={19}/></button></div><div className="modal-eyebrow">CONNECTION SETTINGS</div><h2 id="api-modal-title">{connected ? 'Your API connection' : 'Connect your API key'}</h2><p className="modal-desc">{connected ? 'Your Helyx AI key is connected in this browser. You can reconnect with a different key at any time.' : 'Connect your Helyx AI account to unlock multi-model conversations and parallel responses.'}</p>
      {connected && <div className="connected-banner"><span className="status-light"/><div><strong>Connection saved</strong><small>Key stored locally in this browser</small></div><CheckCheck size={18}/></div>}
      <label className="input-label" htmlFor="api-key-input">HELYX AI API KEY</label><div className="key-input-wrap"><ShieldCheck size={17}/><input id="api-key-input" type="password" autoComplete="off" placeholder="Paste your API key here" value={keyDraft} onChange={e => { setKeyDraft(e.target.value); setKeyError(''); }} onKeyDown={e => e.key === 'Enter' && connectKey()}/></div>{keyError && <div className="form-error">{keyError}</div>}
      <div className="key-help"><ShieldCheck size={15}/><span>Your key is stored in this browser only and is sent to Helyx AI when you make requests. Avoid using a shared device.</span></div>
      <button className="modal-connect-btn" onClick={connectKey} disabled={!keyDraft.trim()}><Zap size={16}/>{connected ? 'Connect new key' : 'Connect API Key'}<ArrowDown size={15}/></button>
      {connected && <button className="disconnect-btn" onClick={disconnect}>Disconnect saved API key</button>}
      <div className="modal-bottom"><span>Need a key?</span><a href="https://helyxai.space/models-list" target="_blank" rel="noreferrer">Visit Helyx AI <ExternalLink size={12}/></a></div>
    </section></div>}
    {toast && <div className="toast"><span className="toast-check"><Check size={13}/></span>{toast}</div>}
  </div>;
}

createRoot(document.getElementById('root')).render(<React.StrictMode><App/></React.StrictMode>);