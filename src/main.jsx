import React,{useEffect,useMemo,useRef,useState} from 'react';
import{createRoot}from'react-dom/client';
import{Sparkles,Menu,Plus,MessageSquare,Trash2,Settings2,Sun,Moon,Send,Copy,Check,ChevronDown,KeyRound,ShieldCheck,RefreshCw,AlertCircle,ExternalLink,X,PanelLeftClose,SquarePen,Zap,Brain,SlidersHorizontal,Clock3,CheckCircle2,LogOut}from'lucide-react';
import'./style.css';

const API='https://generativelanguage.googleapis.com/v1beta';
const uid=()=>Math.random().toString(36).slice(2,10);
const getModelId=m=>(m.name||'').replace(/^models\//,'');
function App(){
 const[showWelcome,setShowWelcome]=useState(true);
 const[apiKey,setApiKey]=useState(()=>localStorage.getItem('aalim_gemini_key')||'');
 const[keyDraft,setKeyDraft]=useState('');const[keyOpen,setKeyOpen]=useState(false);const[keyError,setKeyError]=useState('');
 const[connected,setConnected]=useState(false);const[connecting,setConnecting]=useState(false);
 const[models,setModels]=useState([]);const[modelId,setModelId]=useState(()=>localStorage.getItem('aalim_gemini_model')||'');
 const[prompt,setPrompt]=useState('');const[threads,setThreads]=useState(()=>{try{return JSON.parse(localStorage.getItem('aalim_gemini_chats')||'[]')}catch{return[]}});
 const[activeId,setActiveId]=useState(null);const[busy,setBusy]=useState(false);const[dark,setDark]=useState(()=>localStorage.getItem('aalim_theme')!=='light');
 const[sidebarOpen,setSidebarOpen]=useState(false);const[settingsOpen,setSettingsOpen]=useState(false);const[modelSearch,setModelSearch]=useState('');
 const[temperature,setTemperature]=useState(()=>Number(localStorage.getItem('aalim_gemini_temperature')??0.7));
 const[maxTokens,setMaxTokens]=useState(()=>Number(localStorage.getItem('aalim_gemini_tokens')??2048));
 const[systemPrompt,setSystemPrompt]=useState(()=>localStorage.getItem('aalim_gemini_system')||'You are Safee AI, a helpful, accurate assistant. Reply in the same language as the user unless asked otherwise.');
 const[toast,setToast]=useState('');const[showKey,setShowKey]=useState(false);const inputRef=useRef(null);const bottomRef=useRef(null);
 const current=threads.find(t=>t.id===activeId);const filteredModels=useMemo(()=>models.filter(m=>(m.displayName+' '+m.description).toLowerCase().includes(modelSearch.toLowerCase())),[models,modelSearch]);
 useEffect(()=>{document.documentElement.dataset.theme=dark?'dark':'light';localStorage.setItem('aalim_theme',dark?'dark':'light')},[dark]);
 useEffect(()=>{localStorage.setItem('aalim_gemini_chats',JSON.stringify(threads.slice(0,60)))},[threads]);
 useEffect(()=>{localStorage.setItem('aalim_gemini_model',modelId)},[modelId]);
 useEffect(()=>{localStorage.setItem('aalim_gemini_temperature',String(temperature))},[temperature]);
 useEffect(()=>{localStorage.setItem('aalim_gemini_tokens',String(maxTokens))},[maxTokens]);
 useEffect(()=>{localStorage.setItem('aalim_gemini_system',systemPrompt)},[systemPrompt]);
 useEffect(()=>{bottomRef.current?.scrollIntoView({behavior:'smooth',block:'end'})},[threads,busy,activeId]);
 useEffect(()=>{if(!toast)return;const t=setTimeout(()=>setToast(''),3000);return()=>clearTimeout(t)},[toast]);
 useEffect(()=>{if(apiKey)connectKey(apiKey,true)},[]);
 async function requestModels(key){
  const rows=[];let pageToken='';
  for(let page=0;page<10;page++){
   const query=new URLSearchParams({pageSize:'1000'});if(pageToken)query.set('pageToken',pageToken);
   const r=await fetch(API+'/models?'+query.toString(),{headers:{'x-goog-api-key':key}});
   const data=await r.json().catch(()=>({}));
   if(!r.ok)throw apiError(r.status,data);
   rows.push(...(data.models||[]).filter(m=>(m.supportedGenerationMethods||[]).includes('generateContent')));
   pageToken=data.nextPageToken||'';if(!pageToken)break;
  }
  const unique=[...new Map(rows.filter(m=>m.name&&getModelId(m)).map(m=>[getModelId(m),m])).values()]
   .sort((a,b)=>(a.displayName||a.name).localeCompare(b.displayName||b.name));
  if(!unique.length)throw new Error('এই API Key দিয়ে generateContent সমর্থন করে এমন কোনো মডেল পাওয়া যায়নি। Google AI Studio-তে API Key, Project এবং API access যাচাই করুন।');
  return unique;
 }
 function apiError(status,data){
  const message=data?.error?.message||data?.message||'';
  const statusName=data?.error?.status||'';
  const lower=(message+' '+statusName).toLowerCase();
  if(status===400)return new Error('Gemini অনুরোধটি গ্রহণ করেনি। মডেলের সীমা বা Request Parameter মিলছে না। '+message);
  if(status===401)return new Error('API Key ভুল বা আর বৈধ নেই। Google AI Studio থেকে Key যাচাই করে আবার Connect করুন।');
  if(status===403)return new Error(lower.includes('leaked')||lower.includes('blocked')?'Google এই API Key-টি নিরাপত্তার কারণে ব্লক করেছে। Google AI Studio-তে নতুন Key তৈরি করুন।':'এই API Key/Project-এ Gemini API ব্যবহারের অনুমতি নেই। Google AI Studio-তে Project, API access ও Billing status যাচাই করুন। '+message);
  if(status===404)return new Error('নির্বাচিত মডেলটি এই API সংস্করণে পাওয়া যাচ্ছে না। মডেল তালিকা Refresh করে API থেকে আসা অন্য মডেল নির্বাচন করুন। '+message);
  if(status===429){
   if(lower.includes('quota')||lower.includes('billing')||lower.includes('resource_exhausted'))return new Error('Google Gemini API-এর Quota/Billing সীমা শেষ হয়েছে। অন্য মডেল বেছে নিলেও একই Project-এর quota শেষ থাকলে উত্তর আসবে না। Google AI Studio-এর Usage & Billing দেখুন। '+message);
   return new Error('Google Gemini API-তে সাময়িক Rate Limit হয়েছে। কিছুক্ষণ অপেক্ষা করে আবার চেষ্টা করুন। '+message);
  }
  if(status===408||status>=500)return new Error('Google Gemini সার্ভার বা নেটওয়ার্কে সাময়িক সমস্যা হয়েছে। আবার চেষ্টা করুন। '+message);
  return new Error(message||'Gemini API request ব্যর্থ হয়েছে ('+status+')।');
 }
 async function connectKey(keyOverride,quiet=false){
  const key=(keyOverride||keyDraft).trim();if(!key){setKeyError('Google Gemini API Key লিখুন।');return false}
  setConnecting(true);setKeyError('');
  try{
   const rows=await requestModels(key);setModels(rows);
   const savedModel=localStorage.getItem('aalim_gemini_model')||modelId;
   const preferred=rows.some(m=>getModelId(m)===savedModel)?savedModel:getModelId(rows[0]);
   setModelId(preferred);localStorage.setItem('aalim_gemini_key',key);setApiKey(key);setConnected(true);setKeyOpen(false);setKeyDraft('');
   if(!quiet)setToast('Gemini API সফলভাবে কানেক্ট হয়েছে');return true;
  }catch(e){setConnected(false);if(quiet){setKeyOpen(true);setKeyError(e.message)}else setKeyError(e.message);return false}
  finally{setConnecting(false)}
 }
 function disconnect(){localStorage.removeItem('aalim_gemini_key');setApiKey('');setConnected(false);setKeyOpen(false);setKeyDraft('');setKeyError('');setToast('Gemini API সংযোগ বিচ্ছিন্ন হয়েছে')}
 async function refreshModels(){if(!apiKey){setKeyOpen(true);return}setConnecting(true);try{const rows=await requestModels(apiKey);setModels(rows);if(!rows.some(m=>getModelId(m)===modelId))setModelId(getModelId(rows[0]));setToast('API Key-তে পাওয়া '+rows.length+'টি Gemini মডেল লোড হয়েছে')}catch(e){setToast(e.message)}finally{setConnecting(false)}}
 function newChat(){setActiveId(null);setPrompt('');setSidebarOpen(false);setTimeout(()=>inputRef.current?.focus(),60)}
 function updateThread(id,fn){setThreads(prev=>prev.map(t=>t.id===id?fn(t):t))}
 async function sendMessage(e){
  e?.preventDefault();const text=prompt.trim();if(!text||busy)return;
  if(!apiKey){setKeyOpen(true);setToast('চ্যাট করতে আগে Gemini API Key কানেক্ট করুন');return}
  const threadId=activeId||uid();const isNew=!activeId;const old=current?.messages||[];
  const userMessage={id:uid(),role:'user',content:text,createdAt:Date.now()};
  const allMessages=[...old,userMessage];
  if(isNew){setThreads(prev=>[{id:threadId,title:text.length>52?text.slice(0,52)+'…':text,messages:allMessages,createdAt:Date.now()},...prev]);setActiveId(threadId)}
  else updateThread(threadId,t=>({...t,messages:allMessages,updatedAt:Date.now()}));
  setPrompt('');setBusy(true);setSidebarOpen(false);
  try{
   const chosen=models.find(m=>getModelId(m)===modelId);
   if(!chosen)throw new Error('মডেল তালিকায় নির্বাচিত মডেলটি নেই। API Key Connect করে মডেল তালিকা Refresh করুন।');
   const contents=allMessages.filter(m=>m.role==='user'||m.role==='assistant').map(m=>({role:m.role==='assistant'?'model':'user',parts:[{text:m.content}]}));
   const tokenLimit=Math.max(1,Math.min(Number(maxTokens)||2048,Number(chosen.outputTokenLimit)||8192));
   const tempLimit=Number.isFinite(Number(chosen.maxTemperature))?Number(chosen.maxTemperature):1;
   const safeTemperature=Math.max(0,Math.min(Number(temperature)||0,tempLimit,1));
   const requestBody={contents,generationConfig:{maxOutputTokens:tokenLimit}};
   // Gemini 3.6+ and Gemini 4 ignore sampling controls; omit temperature to avoid INVALID_ARGUMENT.
   const newerModel=/^gemini-(?:3\.(?:[6-9]|[1-9]\d)|[4-9]\.)/.test(getModelId(chosen));
   if(!newerModel&&Number.isFinite(safeTemperature))requestBody.generationConfig.temperature=safeTemperature;
   if(systemPrompt.trim())requestBody.systemInstruction={parts:[{text:systemPrompt}]};
   let response,data;
   for(let attempt=0;attempt<3;attempt++){
    try{
     response=await fetch(API+'/models/'+encodeURIComponent(getModelId(chosen))+':generateContent',{method:'POST',headers:{'Content-Type':'application/json','x-goog-api-key':apiKey},body:JSON.stringify(requestBody)});
     data=await response.json().catch(()=>({}));
    }catch(networkError){
     if(attempt<2){await new Promise(resolve=>setTimeout(resolve,500*(2**attempt)));continue}
     throw new Error('Google Gemini API-তে সংযোগ করা যাচ্ছে না। ইন্টারনেট/CORS সংযোগ পরীক্ষা করে আবার চেষ্টা করুন। '+(networkError.message||''));
    }
    if(response.ok)break;
    const apiMessage=(data?.error?.message||'').toLowerCase();
    const isHardQuota=response.status===429&&(apiMessage.includes('quota')||apiMessage.includes('billing')||apiMessage.includes('resource_exhausted'));
    const retryable=(response.status===408||response.status===503||response.status===504||(response.status===429&&!isHardQuota));
    if(!retryable||attempt===2)throw apiError(response.status,data);
    await new Promise(resolve=>setTimeout(resolve,700*(2**attempt)));
   }
   if(!response?.ok)throw apiError(response?.status||500,data||{});
   const answer=(data.candidates?.[0]?.content?.parts||[]).map(p=>p.text||'').filter(Boolean).join('\n').trim();
   if(!answer){const reason=data.promptFeedback?.blockReason;throw new Error(reason?'এই অনুরোধটি Gemini-এর নিরাপত্তা ফিল্টারে আটকে গেছে ('+reason+')।':'মডেল খালি উত্তর দিয়েছে। অন্য মডেল বেছে নিয়ে আবার চেষ্টা করুন।')}
   const reply={id:uid(),role:'assistant',content:answer,modelId,modelName:chosen.displayName||modelId,createdAt:Date.now(),usage:data.usageMetadata||null};
   updateThread(threadId,t=>({...t,messages:[...t.messages,reply],updatedAt:Date.now()}));
  }catch(err){const errorMessage=err.message||'অজানা সমস্যা হয়েছে';updateThread(threadId,t=>({...t,messages:[...t.messages,{id:uid(),role:'error',content:errorMessage,createdAt:Date.now()}]}))}
  finally{setBusy(false);setTimeout(()=>inputRef.current?.focus(),30)}
 }
 async function copyText(text){try{await navigator.clipboard.writeText(text);setToast('কপি করা হয়েছে')}catch{setToast('কপি করা যায়নি')}}
 function deleteThread(id){setThreads(prev=>prev.filter(t=>t.id!==id));if(activeId===id)setActiveId(null)}
 function exportChat(){if(!current){setToast('আগে একটি চ্যাট খুলুন');return}const blob=new Blob([JSON.stringify(current,null,2)],{type:'application/json'});const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download=(current.title||'aalim-ai-chat').replace(/[^a-z0-9-]+/gi,'-').slice(0,60)+'.json';a.click();URL.revokeObjectURL(url)}
 function renderText(text){return text.split('\n').map((line,i)=><p key={i}>{line||<br/>}</p>)}
 if(showWelcome)return <main className="launch-screen">
  <div className="launch-glow launch-glow-one"/><div className="launch-glow launch-glow-two"/>
  <div className="launch-top"><div className="launch-brand-icon"><Sparkles size={30}/></div><span>SAFEE AI</span></div>
  <section className="launch-content">
   <div className="launch-badge"><span/> YOUR PERSONAL AI ASSISTANT</div>
   <h1>ভাবুন মুক্তভাবে।<br/><span>সমাধান খুঁজুন।</span></h1>
   <p>আপনার প্রশ্ন, চিন্তা ও সৃজনশীলতার সঙ্গী। Google Gemini-এর শক্তিতে সহজ, সুন্দর ও বুদ্ধিদীপ্ত AI অভিজ্ঞতা।</p>
   <button className="launch-start" onClick={()=>{setShowWelcome(false);if(!apiKey)setTimeout(()=>setKeyOpen(true),180)}}>শুরু করুন <span>→</span></button>
   <div className="launch-footnote"><ShieldCheck size={16}/> আপনার নিজস্ব Gemini API Key দিয়ে ব্যবহার করুন</div>
  </section>
  <div className="launch-bottom"><span>SAFEE AI</span><span>POWERED BY GOOGLE GEMINI</span></div>
 </main>;
 return <div className="app-shell gemini-app">
  <aside className={'sidebar '+(sidebarOpen?'sidebar-open':'')}>
   <div className="brand-row"><div className="brand-mark"><Sparkles size={19}/></div><div className="brand-copy"><div className="brand-name">Safee<span> AI</span></div><div className="brand-caption">YOUR AI ASSISTANT</div></div><button className="icon-btn sidebar-close" onClick={()=>setSidebarOpen(false)} aria-label="মেনু বন্ধ করুন"><X size={18}/></button></div>
   <button className="new-chat-btn" onClick={newChat}><Plus size={20}/><span>নতুন চ্যাট</span></button>
   <div className="sidebar-section-head"><span>মডেল নির্বাচন</span><button className="refresh-models" onClick={refreshModels} disabled={connecting} title="মডেল তালিকা রিফ্রেশ"><RefreshCw size={13}/></button></div>
   <div className="model-sidebar-tools"><input value={modelSearch} onChange={e=>setModelSearch(e.target.value)} placeholder="মডেল খুঁজুন…"/><button onClick={refreshModels} disabled={connecting} aria-label="মডেল রিফ্রেশ"><RefreshCw size={14}/></button></div>
   <div className="sidebar-model-list gemini-model-list">{filteredModels.map(m=><button key={m.name} className={'sidebar-model '+(modelId===getModelId(m)?'model-on':'')} onClick={()=>{setModelId(getModelId(m));setSidebarOpen(false)}}><span className="gemini-model-icon"><Sparkles size={13}/></span><span className="sidebar-model-label"><span className="sidebar-model-name">{m.displayName||getModelId(m)}</span><small>{m.description||'Google Gemini model'}</small></span>{modelId===getModelId(m)&&<Check size={14} className="model-selected-check"/>}</button>)}</div>
   
   <div className="sidebar-section-head history-head"><span>চ্যাটের ইতিহাস</span><span className="count-badge">{threads.length}</span></div>
   <div className="thread-list">{threads.length?threads.map(t=><div className={'thread-item '+(t.id===activeId?'thread-active':'')} key={t.id}><button className="thread-open" onClick={()=>{setActiveId(t.id);setSidebarOpen(false)}}><MessageSquare size={15}/><span>{t.title}</span></button><button className="thread-delete" onClick={()=>deleteThread(t.id)} aria-label="চ্যাট মুছুন"><Trash2 size={13}/></button></div>):<div className="empty-history">আপনার চ্যাট এখানে জমা থাকবে।</div>}</div>
   <div className="sidebar-bottom"><div className="privacy-card"><ShieldCheck size={16}/><div><strong>আপনার API Key</strong><p>এই ব্রাউজারেই সংরক্ষিত থাকে।</p></div></div><div className="profile-row"><div className="avatar">A</div><div className="profile-copy"><strong>Safee AI</strong><span>{connected?'Gemini সংযুক্ত':'API সংযুক্ত নয়'}</span></div><button className="icon-btn" onClick={()=>{setKeyDraft('');setKeyError('');setKeyOpen(true)}} aria-label="API সেটিংস"><Settings2 size={17}/></button></div></div>
  </aside>
  {sidebarOpen&&<button className="mobile-scrim" onClick={()=>setSidebarOpen(false)} aria-label="মেনু বন্ধ করুন"/>}
  <main className="main-area">
   <header className="topbar"><div className="top-left"><button className="icon-btn mobile-menu" onClick={()=>setSidebarOpen(true)} aria-label="মেনু খুলুন"><Menu size={21}/></button><button className="desktop-sidebar-toggle icon-btn" onClick={()=>setSidebarOpen(!sidebarOpen)} aria-label="সাইডবার"><PanelLeftClose size={18}/></button><div className="top-title">{current?.title||'Safee AI'}</div></div><div className="top-actions"><span className={'connection-indicator '+(connected?'online':'')}><i/>{connected?'Gemini সংযুক্ত':'সংযুক্ত নয়'}</span><button className={'connect-btn '+(connected?'connected':'')} onClick={()=>{setKeyDraft('');setKeyError('');setKeyOpen(true)}}><i/><KeyRound size={14}/><span>{connected?'Gemini সংযুক্ত':'Gemini API সংযোগ'}</span></button></div></header>
   <section className={'chat-screen gemini-chat-screen '+(!current?'empty-chat':'')}>
    {!current?<div className="welcome-state gemini-welcome"><div className="welcome-symbol"><Sparkles size={25}/></div><h1>কী জানতে<br/><span>চান আজ?</span></h1><p>আপনার প্রশ্ন লিখুন। Safee AI আপনাকে সাহায্য করতে প্রস্তুত।</p>{!connected&&<button className="welcome-connect" onClick={()=>setKeyOpen(true)}><KeyRound size={15}/> Gemini API Key Connect করুন</button>}</div>:<div className="messages-area gemini-messages">
     {current.messages.map(m=><div key={m.id} className={'gemini-message '+(m.role==='user'?'gemini-user-message':m.role==='error'?'gemini-error-message':'gemini-ai-message')}><div className="gemini-message-avatar">{m.role==='user'?'তুমি':m.role==='error'?<AlertCircle size={16}/>:<Sparkles size={16}/>}</div><div className="gemini-message-main"><div className="gemini-message-label">{m.role==='user'?'আপনি':m.role==='error'?'সমস্যা হয়েছে':(m.modelName||'Gemini')}</div><div className="markdown-content">{renderText(m.content)}</div>{m.role==='assistant'&&<div className="gemini-message-actions"><button onClick={()=>copyText(m.content)}><Copy size={13}/> কপি</button>{m.usage?.totalTokenCount&&<span>{m.usage.totalTokenCount} tokens</span>}</div>}</div></div>)}
     {busy&&<div className="gemini-message gemini-ai-message"><div className="gemini-message-avatar"><Sparkles size={16}/></div><div className="gemini-message-main"><div className="gemini-message-label">{models.find(m=>getModelId(m)===modelId)?.displayName||modelId}</div><div className="gemini-thinking"><span/><span/><span/> Gemini উত্তর তৈরি করছে…</div></div></div>}<div ref={bottomRef}/>
    </div>}
    <form className="composer-wrap" onSubmit={sendMessage}><div className="composer gemini-composer"><textarea ref={inputRef} value={prompt} onChange={e=>setPrompt(e.target.value)} onKeyDown={e=>{if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();sendMessage()}}} placeholder={connected?'Safee AI-কে কিছু জিজ্ঞেস করুন…':'আগে Gemini API Key Connect করুন…'} rows={1}/><div className="composer-bottom"><div className="composer-meta"><button type="button" className="composer-model-count" onClick={()=>setSidebarOpen(true)}><Sparkles size={14}/>{models.find(m=>getModelId(m)===modelId)?.displayName||modelId}<ChevronDown size={13}/></button><span className="composer-hint">AI-এর উত্তর যাচাই করে নিন</span></div><button className="send-btn" type="submit" disabled={!prompt.trim()||busy} aria-label="মেসেজ পাঠান">{busy?<span className="mini-spinner"/>:<Send size={17}/>}</button></div></div></form><div className="bottom-caption">Safee AI · Google Gemini · AI ভুল করতে পারে, গুরুত্বপূর্ণ তথ্য যাচাই করুন</div>
   </section>
  </main>
  {keyOpen&&<div className="modal-backdrop" onMouseDown={e=>{if(e.target===e.currentTarget){setKeyOpen(false);setKeyError('')}}}><section className="api-modal gemini-key-modal" role="dialog" aria-modal="true" aria-labelledby="gemini-key-title"><div className="modal-top"><div className="modal-icon gemini-modal-logo"><Sparkles size={21}/></div><button className="icon-btn" onClick={()=>{setKeyOpen(false);setKeyError('')}} aria-label="বন্ধ করুন"><X size={19}/></button></div><div className="modal-eyebrow">GOOGLE AI STUDIO</div><h2 id="gemini-key-title">Gemini API Connect</h2><p className="modal-desc">আপনার Google Gemini API Key দিয়ে সংযোগ করুন। সংযোগ যাচাই করতে অ্যাপটি Gemini-এর মডেল তালিকা লোড করবে।</p>{connected&&<div className="connected-banner"><span className="status-light"/><div><strong>Gemini API সংযুক্ত</strong><small>{models.length}টি ব্যবহারযোগ্য মডেল পাওয়া গেছে</small></div><CheckCircle2 size={17}/></div>}<label className="input-label" htmlFor="gemini-api-key">GEMINI API KEY</label><div className="key-input-wrap"><KeyRound size={15}/><input id="gemini-api-key" type={showKey?'text':'password'} autoComplete="off" placeholder="AIza..." value={keyDraft} onChange={e=>{setKeyDraft(e.target.value);setKeyError('')}} onKeyDown={e=>{if(e.key==='Enter')connectKey()}}/><button type="button" className="icon-btn" onClick={()=>setShowKey(!showKey)}>{showKey?'Hide':'Show'}</button></div>{keyError&&<div className="form-error gemini-form-error"><AlertCircle size={14}/><span>{keyError}</span></div>}<div className="key-help"><ShieldCheck size={15}/><span>Key কখনো GitHub-এ আপলোড করা হবে না। ব্যক্তিগত পরীক্ষায় এটি এই ব্রাউজারে রাখা হয়; পাবলিক প্রোডাকশনে সার্ভার-সাইড Key ব্যবহার করুন।</span></div><button className="modal-connect-btn" onClick={()=>connectKey()} disabled={connecting}>{connecting?<><span className="mini-spinner"/> সংযোগ যাচাই হচ্ছে…</>:<><Zap size={15}/> Connect & Verify Key</>}</button>{connected&&<button className="disconnect-btn" onClick={disconnect}><LogOut size={14}/> API Key Disconnect</button>}<div className="modal-bottom"><span>API Key তৈরি করুন</span><a href="https://aistudio.google.com/apikey" target="_blank" rel="noreferrer">Google AI Studio <ExternalLink size={12}/></a></div></section></div>}
  {toast&&<div className="toast"><Check size={15}/>{toast}</div>}
 </div>
}
createRoot(document.getElementById('root')).render(<App/>);
