import React, { useEffect, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { Activity, ArrowDown, Check, CheckCheck, ChevronDown, CircleHelp, Code2, Copy, ExternalLink, Globe2, Layers3, Menu, MessageSquare, Moon, Plus, Send, Settings2, ShieldCheck, Sparkles, Sun, Trash2, X, Zap, PanelLeftClose } from 'lucide-react';
import './style.css';

const API_BASE = 'https://helyxai.space/v1';
const STARTER_MODELS = [
  { id: 'gemini-3.1-flash-lite', name: 'Gemini 3.1 Flash Lite', provider: 'Google' },
  { id: 'deepseek-chat', name: 'DeepSeek Chat', provider: 'DeepSeek' },
  { id: 'deepseek-reasoner', name: 'DeepSeek Reasoner', provider: 'DeepSeek' },
  { id: 'glm-4.5-flash', name: 'GLM 4.5 Flash', provider: 'Zhipu AI' },
  { id: 'gemma-3-27b-it', name: 'Gemma 3 27B', provider: 'Google' },
];
const providerColors = { Google:'#4285f4', DeepSeek:'#4e7bff', 'Zhipu AI':'#9b75ff', Helyx:'#39d6a0' };
const uid = () => Math.random().toString(36).slice(2,10);

function App() {
  const [apiKey,setApiKey] = useState(() => localStorage.getItem('aalim_api_key') || '');
  const [keyDraft,setKeyDraft] = useState('');
  const [keyOpen,setKeyOpen] = useState(false);
  const [connected,setConnected] = useState(false);
  const [keyError,setKeyError] = useState('');
  const [settingsOpen,setSettingsOpen] = useState(false);
  const [temperature,setTemperature] = useState(() => Number(localStorage.getItem('aalim_temperature') ?? 0.7));
  const [maxTokens,setMaxTokens] = useState(() => Number(localStorage.getItem('aalim_max_tokens') ?? 2048));
  const [systemPrompt,setSystemPrompt] = useState(() => localStorage.getItem('aalim_system_prompt') || 'You are a helpful, accurate assistant. Reply in the same language as the user unless they ask otherwise.');
  const [loadingModels,setLoadingModels] = useState(false);
  const [models,setModels] = useState(STARTER_MODELS);
  const [selected,setSelected] = useState([STARTER_MODELS[0].id]);
  const [prompt,setPrompt] = useState('');
  const [threads,setThreads] = useState(() => { try { return JSON.parse(localStorage.getItem('aalim_chats') || '[]'); } catch { return []; } });
  const [activeThread,setActiveThread] = useState(null);
  const [activeModel,setActiveModel] = useState('');
  const [busy,setBusy] = useState([]);
  const [dark,setDark] = useState(() => localStorage.getItem('aalim_theme') !== 'light');
  const [sidebarOpen,setSidebarOpen] = useState(false);
  const [toast,setToast] = useState('');
  const [modelSearch,setModelSearch] = useState('');
  const inputRef = useRef(null);
  const bottomRef = useRef(null);
  const current = threads.find(t => t.id === activeThread);
  const responses = current?.responses || [];
  const selectedModels = models.filter(m => selected.includes(m.id));
  const grouped = models.filter(m => (m.name+' '+m.provider).toLowerCase().includes(modelSearch.toLowerCase())).reduce((acc,m) => { (acc[m.provider] ||= []).push(m); return acc; }, {});

  useEffect(() => { document.documentElement.dataset.theme = dark ? 'dark' : 'light'; localStorage.setItem('aalim_theme',dark?'dark':'light'); },[dark]);
  useEffect(() => { localStorage.setItem('aalim_chats',JSON.stringify(threads.slice(0,40))); },[threads]);
  useEffect(() => { localStorage.setItem('aalim_temperature',String(temperature)); },[temperature]);
  useEffect(() => { localStorage.setItem('aalim_max_tokens',String(maxTokens)); },[maxTokens]);
  useEffect(() => { localStorage.setItem('aalim_system_prompt',systemPrompt); },[systemPrompt]);
  useEffect(() => { if(apiKey){loadModels(apiKey,false).then(ok=>setConnected(ok));} },[]);
  useEffect(() => { bottomRef.current?.scrollIntoView({behavior:'smooth',block:'end'}); },[threads,busy,activeModel]);
  useEffect(() => { if(!toast)return; const t=setTimeout(()=>setToast(''),2600); return ()=>clearTimeout(t); },[toast]);

  async function loadModels(key,notify=true) {
    setLoadingModels(true);
    try {
      const r=await fetch(API_BASE+'/models',{headers:{Authorization:'Bearer '+key}});
      if(!r.ok) throw new Error(r.status===401?'API key rejected. Please check the key.':'Could not load models ('+r.status+').');
      const data=await r.json();
      const rows=(data.data||data.models||[]).map(m=>{
        const id=m.id||m.name||'';
        const raw=m.owned_by||m.provider||(id.toLowerCase().includes('deepseek')?'DeepSeek':id.toLowerCase().includes('gemini')||id.toLowerCase().includes('gemma')?'Google':'Helyx');
        const provider=/google|gemini|gemma/i.test(raw+' '+id)?'Google':/deepseek/i.test(raw+' '+id)?'DeepSeek':/zhipu|glm/i.test(raw+' '+id)?'Zhipu AI':raw;
        return {id,name:m.name||id,provider};
      }).filter(m=>m.id);
      if(rows.length){setModels(rows);setSelected(prev=>{const valid=prev.filter(id=>rows.some(m=>m.id===id));return valid.length?valid:[rows[0].id];});}
      if(notify)setToast(rows.length?rows.length+' models loaded':'Connected; showing suggested models');
      return true;
    } catch(e){if(notify)setToast(e.message||'Connection failed');return false;}
    finally { setLoadingModels(false); }
  }
  async function connectKey(){
    const key=keyDraft.trim(); if(!key){setKeyError('Please enter your Helyx AI API key.');return;}
    setKeyError(''); const ok=await loadModels(key,false);
    if(!ok){setKeyError('Could not verify this key. Check the key and try again.');return;}
    localStorage.setItem('aalim_api_key',key);setApiKey(key);setConnected(true);setKeyOpen(false);setKeyDraft('');setToast('API connected successfully');
  }
  function disconnect(){localStorage.removeItem('aalim_api_key');setApiKey('');setConnected(false);setKeyOpen(false);setKeyError('');setToast('API key disconnected');}
  function toggleModel(id){setSelected(prev=>prev.includes(id)?prev.filter(x=>x!==id):[...prev,id]);}
  function newChat(){setActiveThread(null);setActiveModel('');setPrompt('');setSidebarOpen(false);setTimeout(()=>inputRef.current?.focus(),50);}
  function updateThread(id,fn){setThreads(prev=>prev.map(t=>t.id===id?fn(t):t));}
  async function sendMessage(e){
    e?.preventDefault();const text=prompt.trim();if(!text||busy.length)return;
    if(!apiKey){setKeyOpen(true);setToast('Connect your API key to start chatting');return;}
    if(!selected.length){setToast('Choose at least one model from the sidebar');setSidebarOpen(true);return;}
    const threadId=activeThread||uid(),isNew=!activeThread;
    const message={id:uid(),role:'user',content:text,createdAt:Date.now()};
    const prior=isNew?[]:(current?.messages||[]);
    if(isNew){setThreads(prev=>[{id:threadId,title:text.length>44?text.slice(0,44)+'…':text,messages:[message],responses:[],createdAt:Date.now()},...prev]);setActiveThread(threadId);}
    else updateThread(threadId,t=>({...t,messages:[...t.messages,message],responses:[]}));
    const targets=[...selected];setBusy(targets);setActiveModel(targets[0]);setPrompt('');setSidebarOpen(false);
    await Promise.all(targets.map(async modelId=>{
      const model=models.find(m=>m.id===modelId);
      try{
        const history=[{role:'system',content:systemPrompt},...prior,message].slice(-25).map(m=>({role:m.role,content:m.content}));
        const startedAt=Date.now();
        const r=await fetch(API_BASE+'/chat/completions',{method:'POST',headers:{Authorization:'Bearer '+apiKey,'Content-Type':'application/json'},body:JSON.stringify({model:modelId,messages:history,temperature,max_tokens:maxTokens,stream:false})});
        const data=await r.json().catch(()=>({}));if(!r.ok)throw new Error(data.error?.message||data.message||'Request failed ('+r.status+')');
        const answer=data.choices?.[0]?.message?.content??data.output_text??data.response??'The model returned an empty response.';
        updateThread(threadId,t=>({...t,responses:[...t.responses.filter(x=>x.modelId!==modelId),{id:uid(),modelId,modelName:model?.name||modelId,provider:model?.provider||'AI',content:typeof answer==='string'?answer:JSON.stringify(answer,null,2),latencyMs:Date.now()-startedAt,usage:data.usage||null,createdAt:Date.now()}]}));
      }catch(err){updateThread(threadId,t=>({...t,responses:[...t.responses.filter(x=>x.modelId!==modelId),{id:uid(),modelId,modelName:model?.name||modelId,provider:model?.provider||'AI',error:err.message||'Request failed',content:''}]}));}
      finally{setBusy(prev=>prev.filter(x=>x!==modelId));}
    }));
  }
  async function copyText(text){try{await navigator.clipboard.writeText(text);setToast('Copied to clipboard');}catch{setToast('Could not copy text');}}
  function exportChat(){if(!current){setToast('Open a conversation first');return;}const blob=new Blob([JSON.stringify(current,null,2)],{type:'application/json'});const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download=(current.title||'aalim-ai-chat').replace(/[^a-z0-9-]+/gi,'-').slice(0,60)+'.json';a.click();URL.revokeObjectURL(url);setToast('Conversation exported');}
  function clearHistory(){if(!window.confirm('Delete all saved conversations from this browser?'))return;setThreads([]);setActiveThread(null);setActiveModel('');setToast('Conversation history cleared');}
  function removeThread(id,e){e?.stopPropagation();setThreads(prev=>prev.filter(t=>t.id!==id));if(activeThread===id)newChat();}
  const activeResponse=responses.find(r=>r.modelId===activeModel)||responses[0];
  const hasConversation=Boolean(current);

  return <div className="app-shell">
    <aside className={'sidebar '+(sidebarOpen?'sidebar-open':'')}>
      <div className="brand-row"><div className="brand-mark"><Sparkles size={19}/></div><div className="brand-copy"><div className="brand-name">aalim<span>.ai</span></div><div className="brand-caption">AI WORKSPACE</div></div><button className="icon-btn sidebar-close" onClick={()=>setSidebarOpen(false)} aria-label="Close menu"><X size={18}/></button></div>
      <button className="new-chat-btn" onClick={newChat}><Plus size={17}/><span>New chat</span><kbd>⌘ K</kbd></button>
      <div className="sidebar-section-head"><span>YOUR MODELS</span><span className="count-badge">{selected.length}</span></div>
      <div className="model-sidebar-tools"><input value={modelSearch} onChange={e=>setModelSearch(e.target.value)} placeholder="Find a model…"/><button title={loadingModels?"Refreshing models…":"Refresh model catalog"} disabled={loadingModels} onClick={()=>apiKey?loadModels(apiKey,true):(setKeyOpen(true),setToast("Connect your API key to load models"))}>{loadingModels?<span className="mini-spinner"/>:<Activity size={15}/>}</button></div>
      <div className="sidebar-model-list">
        {Object.entries(grouped).map(([provider,items])=><div className="provider-group" key={provider}><div className="provider-heading"><span className="provider-dot" style={{background:providerColors[provider]||'#8b9ab8'}}/>{provider}<span>{items.length}</span></div>{items.map(m=><button key={m.id} className={'sidebar-model '+(selected.includes(m.id)?'model-on':'')} onClick={()=>toggleModel(m.id)}><span className="model-check">{selected.includes(m.id)&&<Check size={11}/>}</span><span className="sidebar-model-name">{m.name}</span></button>)}</div>)}
        {!Object.keys(grouped).length&&<div className="sidebar-empty">No matching models.</div>}
      </div>
      <div className="selected-summary"><Layers3 size={14}/><span>{selected.length} model{selected.length===1?'':'s'} selected for replies</span><button className="select-all-text" onClick={()=>setSelected(selected.length===models.length?[]:models.map(m=>m.id))}>{selected.length===models.length?"Clear":"All"}</button></div>
      <div className="sidebar-section-head history-head"><span>RECENT CHATS</span><div className="history-actions"><span className="count-badge">{threads.length}</span>{threads.length>0&&<button title="Clear all history" onClick={clearHistory}><Trash2 size={12}/></button>}</div></div>
      <div className="thread-list">{threads.length?threads.map(t=><div className={'thread-item '+(t.id===activeThread?'thread-active':'')} key={t.id}><button className="thread-open" onClick={()=>{setActiveThread(t.id);setActiveModel(t.responses[0]?.modelId||'');setSidebarOpen(false);}}><MessageSquare size={15}/><span>{t.title}</span></button><button className="thread-delete" onClick={e=>removeThread(t.id,e)} aria-label="Delete chat"><Trash2 size={13}/></button></div>):<div className="empty-history">Your conversations will appear here.</div>}</div>
      <div className="sidebar-bottom"><div className="privacy-card"><ShieldCheck size={16}/><div><strong>Private workspace</strong><p>Your API key stays in this browser.</p></div></div><div className="profile-row"><div className="avatar">A</div><div className="profile-copy"><strong>Aalim AI</strong><span>Personal workspace</span></div><button className="icon-btn" onClick={()=>setKeyOpen(true)} aria-label="API settings"><Settings2 size={17}/></button></div></div>
    </aside>
    {sidebarOpen&&<button className="mobile-scrim" onClick={()=>setSidebarOpen(false)} aria-label="Close menu"/>}
    <main className="main-area">
      <header className="topbar"><div className="top-left"><button className="icon-btn mobile-menu" onClick={()=>setSidebarOpen(true)} aria-label="Open navigation"><Menu size={21}/></button><button className="desktop-sidebar-toggle icon-btn" onClick={()=>setSidebarOpen(!sidebarOpen)} title="Toggle sidebar"><PanelLeftClose size={18}/></button><div className="top-title">{hasConversation?current.title:'New chat'}</div></div><div className="top-actions"><span className={'connection-indicator '+(connected?'online':'')}><i/>{connected?'Connected':'Offline'}</span><button className={'connect-btn '+(connected?'connected':'')} onClick={()=>{setKeyDraft('');setKeyError('');setKeyOpen(true);}}><i/><Zap size={14}/><span>{connected?'API connected':'Connect API Key'}</span></button><button className="icon-btn top-tool" onClick={()=>setSettingsOpen(true)} aria-label="Chat settings" title="Chat settings"><Settings2 size={17}/></button><button className="icon-btn top-tool" onClick={exportChat} aria-label="Export conversation" title="Export conversation" disabled={!hasConversation}><ExternalLink size={16}/></button><button className="icon-btn theme-toggle" onClick={()=>setDark(!dark)} aria-label="Toggle theme">{dark?<Sun size={18}/>:<Moon size={18}/>}</button></div></header>
      <section className={'chat-screen '+(!hasConversation?'empty-chat':'')}>
        {!hasConversation?<div className="welcome-state"><div className="welcome-symbol"><Sparkles size={25}/></div><div className="welcome-kicker">YOUR PERSONAL AI SPACE</div><h1>What can I help<br/><span>you with today?</span></h1><p>একটি প্রশ্ন করুন। আপনার পছন্দের AI মডেলগুলো একসঙ্গে উত্তর দেবে।</p><div className="quick-prompts"><button onClick={()=>setPrompt('Explain a complex topic in simple Bengali, with examples.')}><Globe2 size={17}/><span>কোনো বিষয় সহজ করে বুঝিয়ে দাও</span><ArrowDown size={14}/></button><button onClick={()=>setPrompt('Help me write, review, or debug this code.')}><Code2 size={17}/><span>কোড লিখতে বা সমস্যা সমাধান করতে সাহায্য করো</span><ArrowDown size={14}/></button><button onClick={()=>setPrompt('Compare multiple approaches and recommend the best one.')}><Activity size={17}/><span>একাধিক ধারণার তুলনা করো</span><ArrowDown size={14}/></button></div></div>:<div className="messages-area">
          {current.messages.map(m=><div className="message-row user-row" key={m.id}><div className="message-avatar user-avatar">You</div><div className="message-body"><div className="message-author">You</div><div className="message-text">{m.content}</div></div></div>)}
          {responses.length>0&&<section className="assistant-section"><div className="assistant-heading"><div className="assistant-avatar"><Sparkles size={15}/></div><div><strong>AI responses</strong><span>{responses.length} model{responses.length===1?'':'s'} responded</span></div></div><div className="response-tabs">{responses.map(r=><button key={r.modelId} className={'response-tab '+(activeModel===r.modelId?'tab-active':'')} onClick={()=>setActiveModel(r.modelId)}><i style={{background:providerColors[r.provider]||'#8b9ab8'}}/>{r.modelName}{r.error&&<b/>}</button>)}{busy.filter(id=>!responses.some(r=>r.modelId===id)).map(id=><button key={id} className="response-tab tab-loading" onClick={()=>setActiveModel(id)}><span className="mini-spinner"/>{models.find(m=>m.id===id)?.name||id}</button>)}</div>
            {activeResponse&&<article className="response-card"><div className="response-card-head"><div className="response-model-avatar" style={{'--provider-color':providerColors[activeResponse.provider]||'#8b9ab8'}}>{activeResponse.provider.slice(0,1)}</div><div className="response-model-info"><strong>{activeResponse.modelName}</strong><span>{activeResponse.provider} · {activeResponse.error?'Could not respond':activeResponse.latencyMs?(activeResponse.latencyMs/1000).toFixed(1)+'s response':'AI response'}{activeResponse.usage?.total_tokens?' · '+activeResponse.usage.total_tokens+' tokens':''}</span></div><button className="copy-btn" onClick={()=>copyText(activeResponse.error||activeResponse.content)}><Copy size={14}/> Copy</button></div>{activeResponse.error?<div className="response-error"><CircleHelp size={17}/><div><strong>This model couldn't respond</strong><p>{activeResponse.error}</p></div></div>:<div className="markdown-content">{activeResponse.content.split('\n').map((line,i)=><p key={i}>{line||<br/>}</p>)}</div>}</article>}
          </section>}
          {busy.length>0&&<div className="running-status"><span className="mini-spinner"/><span>Getting answers from <strong>{busy.length} model{busy.length===1?'':'s'}</strong>…</span></div>}
          <div ref={bottomRef}/>
        </div>}
        <form className="composer-wrap" onSubmit={sendMessage}><div className="composer"><textarea ref={inputRef} value={prompt} onChange={e=>setPrompt(e.target.value)} onKeyDown={e=>{if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();sendMessage();}}} placeholder={connected?'Message Aalim AI…':'Connect your API key to start chatting'} rows={1}/><div className="composer-bottom"><div className="composer-meta"><button type="button" className="composer-model-count" onClick={()=>setSidebarOpen(true)}><Layers3 size={14}/>{selected.length} models selected<ChevronDown size={13}/></button><span className="composer-hint">AI can make mistakes. Check important info.</span></div><button className="send-btn" type="submit" disabled={!prompt.trim()||busy.length>0} aria-label="Send message"><Send size={17}/></button></div></div></form>
        <div className="bottom-caption">Aalim AI · One workspace, many perspectives</div>
      </section>
    </main>
    {settingsOpen&&<div className="modal-backdrop" onMouseDown={e=>{if(e.target===e.currentTarget)setSettingsOpen(false);}}><section className="api-modal settings-modal" role="dialog" aria-modal="true" aria-labelledby="settings-modal-title"><div className="modal-top"><div className="modal-icon"><Settings2 size={20}/></div><button className="icon-btn" onClick={()=>setSettingsOpen(false)} aria-label="Close settings"><X size={19}/></button></div><div className="modal-eyebrow">CHAT CONFIGURATION</div><h2 id="settings-modal-title">Model settings</h2><p className="modal-desc">Set shared generation preferences for all selected models.</p><label className="input-label" htmlFor="system-prompt">SYSTEM INSTRUCTION</label><textarea id="system-prompt" className="settings-textarea" value={systemPrompt} onChange={e=>setSystemPrompt(e.target.value)} rows={4}/><div className="setting-range-row"><label htmlFor="temperature-range">Temperature <strong>{temperature.toFixed(1)}</strong></label><input id="temperature-range" type="range" min="0" max="2" step="0.1" value={temperature} onChange={e=>setTemperature(Number(e.target.value))}/><div className="setting-range-hints"><span>Precise</span><span>Creative</span></div></div><label className="input-label token-label" htmlFor="max-tokens">MAXIMUM RESPONSE TOKENS</label><select id="max-tokens" className="settings-select" value={maxTokens} onChange={e=>setMaxTokens(Number(e.target.value))}><option value={512}>512 — Short</option><option value={1024}>1,024 — Medium</option><option value={2048}>2,048 — Long</option><option value={4096}>4,096 — Very long</option><option value={8192}>8,192 — Maximum</option></select><div className="key-help"><ShieldCheck size={15}/><span>Some models may ignore unsupported settings or enforce their own limits.</span></div><button className="modal-connect-btn" onClick={()=>{setSettingsOpen(false);setToast("Model settings saved");}}><Check size={16}/>Save settings</button><div className="modal-bottom"><span>Saved in this browser</span></div></section></div>}
    {keyOpen&&<div className="modal-backdrop" onMouseDown={e=>{if(e.target===e.currentTarget)setKeyOpen(false);}}><section className="api-modal" role="dialog" aria-modal="true" aria-labelledby="api-modal-title"><div className="modal-top"><div className="modal-icon"><Zap size={20}/></div><button className="icon-btn" onClick={()=>setKeyOpen(false)} aria-label="Close"><X size={19}/></button></div><div className="modal-eyebrow">CONNECTION SETTINGS</div><h2 id="api-modal-title">{connected?'Your API connection':'Connect your API key'}</h2><p className="modal-desc">{connected?'Your Helyx AI key is connected in this browser.':'Connect Helyx AI to use the available models in your workspace.'}</p>{connected&&<div className="connected-banner"><span className="status-light"/><div><strong>Connection saved</strong><small>Key stored locally in this browser</small></div><CheckCheck size={18}/></div>}<label className="input-label" htmlFor="api-key-input">HELYX AI API KEY</label><div className="key-input-wrap"><ShieldCheck size={17}/><input id="api-key-input" type="password" autoComplete="off" placeholder="Paste your API key here" value={keyDraft} onChange={e=>{setKeyDraft(e.target.value);setKeyError('');}} onKeyDown={e=>e.key==='Enter'&&connectKey()}/></div>{keyError&&<div className="form-error">{keyError}</div>}<div className="key-help"><ShieldCheck size={15}/><span>Your key is stored in this browser and sent to Helyx AI when you make requests. Avoid shared devices.</span></div><button className="modal-connect-btn" onClick={connectKey} disabled={!keyDraft.trim()}><Zap size={16}/>{connected?'Connect new key':'Connect API Key'}</button>{connected&&<button className="disconnect-btn" onClick={disconnect}>Disconnect saved API key</button>}<div className="modal-bottom"><span>Need a key?</span><a href="https://helyxai.space/models-list" target="_blank" rel="noreferrer">Visit Helyx AI <ExternalLink size={12}/></a></div></section></div>}
    {toast&&<div className="toast"><Check size={14}/>{toast}</div>}
  </div>;
}
createRoot(document.getElementById('root')).render(<React.StrictMode><App/></React.StrictMode>);