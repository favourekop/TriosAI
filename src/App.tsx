import { supabase } from "./lib/supabase";
import { useEffect, useMemo, useState, type FormEvent } from "react";
import {
  Activity, ArrowUpRight, AudioLines, Bot, Check, ChevronDown, CircleHelp, FileText,
  Image, LayoutDashboard, Menu, MessageSquare, Moon, Paperclip, Plus, Send,
  Settings, ShieldCheck, Sparkles, Sun, Video, X, Zap
} from "lucide-react";

type Tab = "Overview" | "AI Chat" | "AI Studio" | "Activity" | "Plans" | "Settings";
type Message = { role: "user" | "assistant"; content: string };
type Plan = { id: string; name: string; priceNgn: number | null; uploadBytes: number; features: readonly string[] };

const tabs: { name: Tab; icon: typeof LayoutDashboard }[] = [
  { name: "Overview", icon: LayoutDashboard }, { name: "AI Chat", icon: MessageSquare },
  { name: "AI Studio", icon: Sparkles }, { name: "Activity", icon: Activity },
  { name: "Plans", icon: Zap }, { name: "Settings", icon: Settings }
];

const starterPrompts = [
  "Help me plan a productive week",
  "Explain a complex topic simply",
  "Write a professional project proposal",
  "Brainstorm ideas for my next project"
];

function App() {
  const [tab, setTab] = useState<Tab>("Overview");
  const [dark, setDark] = useState(true);
  const [mobileNav, setMobileNav] = useState(false);
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [sending, setSending] = useState(false);
  const [apiStatus, setApiStatus] = useState<"checking" | "online" | "offline">("checking");
  const [plans, setPlans] = useState<Plan[]>([]);
  const [toast, setToast] = useState("");
  const [selectedTool, setSelectedTool] = useState("Image");\n  const [userEmail, setUserEmail] = useState<string | null>(null);\n  const [accessToken, setAccessToken] = useState<string | null>(null);\n  const [authBusy, setAuthBusy] = useState(false);

  useEffect(() => {
    if (!supabase) return;
    supabase.auth.getSession().then(({ data }) => {
      setUserEmail(data.session?.user.email ?? null);
      setAccessToken(data.session?.access_token ?? null);
    });
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setUserEmail(session?.user.email ?? null);
      setAccessToken(session?.access_token ?? null);
    });
    return () => listener.subscription.unsubscribe();
  }, []);

  async function signIn() {
    if (!supabase) { notify("Google sign-in needs the Supabase URL and anon key configured."); return; }
    setAuthBusy(true);
    const { error } = await supabase.auth.signInWithOAuth({ provider: "google", options: { redirectTo: window.location.origin } });
    if (error) notify(error.message);
    setAuthBusy(false);
  }

  async function signOut() {
    if (!supabase) return;
    const { error } = await supabase.auth.signOut();
    if (error) notify(error.message); else notify("You have signed out.");
  }

  useEffect(() => {
    fetch("/api/health").then(r => { if (!r.ok) throw new Error(); return r.json(); })
      .then(() => setApiStatus("online")).catch(() => setApiStatus("offline"));
    fetch("/api/plans").then(r => r.json()).then(data => setPlans(data.plans || [])).catch(() => setPlans([]));
  }, []);

  const greeting = useMemo(() => {
    const hour = new Date().getHours();
    return hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";
  }, []);

  function notify(text: string) {
    setToast(text);
    window.setTimeout(() => setToast(""), 3200);
  }

  async function sendMessage(event?: FormEvent) {
    event?.preventDefault();
    const content = message.trim();
    if (!content || sending) return;
    const next = [...messages, { role: "user" as const, content }];
    setMessages(next);
    setMessage("");
    setSending(true);
    try {
      const response = await fetch("/api/chat", {
        method: "POST", headers: { "Content-Type": "application/json", ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}) },
        body: JSON.stringify({ messages: next })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Unable to send message.");
      setMessages([...next, { role: "assistant", content: data.reply }]);
    } catch (error) {
      setMessages([...next, { role: "assistant", content: error instanceof Error ? error.message : "Something went wrong." }]);
    } finally { setSending(false); }
  }

  function chooseTab(next: Tab) { setTab(next); setMobileNav(false); }

  return (
    <div className={dark ? "app dark" : "app light"}>
      <aside className={mobileNav ? "sidebar open" : "sidebar"}>
        <div className="brand"><div className="brand-mark"><Sparkles size={19} /></div><div><strong>Trios<span>AI</span></strong><small>Your Intelligent AI Companion</small></div><button className="icon-btn close-nav" onClick={() => setMobileNav(false)} aria-label="Close menu"><X size={18}/></button></div>
        <button className="new-chat" onClick={() => { setMessages([]); chooseTab("AI Chat"); }}><Plus size={17}/> New conversation <span>⌘ K</span></button>
        <div className="nav-label">WORKSPACE</div>
        <nav>{tabs.map(item => { const Icon = item.icon; return <button key={item.name} className={tab === item.name ? "nav-item active" : "nav-item"} onClick={() => chooseTab(item.name)}><Icon size={18}/>{item.name}{item.name === "AI Chat" && <span className="nav-dot"/>}</button>; })}</nav>
        <div className="sidebar-bottom"><div className="upgrade-card"><div className="upgrade-icon"><Zap size={17}/></div><strong>Unlock your potential</strong><p>Get more from your AI workspace.</p><button onClick={() => chooseTab("Plans")}>Explore plans <ArrowUpRight size={14}/></button></div><div className="profile"><div className="avatar">FE</div><div className="profile-copy"><strong>Welcome, Explorer</strong><small>Regular workspace</small></div><button className="icon-btn" onClick={() => chooseTab("Settings")} aria-label="Profile settings"><ChevronDown size={17}/></button></div></div>
      </aside>
      {mobileNav && <button className="scrim" aria-label="Close navigation" onClick={() => setMobileNav(false)} />}
      <main className="main">
        <header className="topbar"><div className="top-left"><button className="icon-btn menu-btn" onClick={() => setMobileNav(true)} aria-label="Open menu"><Menu size={20}/></button><span className="breadcrumb">Workspace <span>/</span> {tab}</span></div><div className="top-actions"><div className="status"><i className={apiStatus === "online" ? "status-dot online" : "status-dot"}/>{apiStatus === "checking" ? "Checking API" : apiStatus === "online" ? "API connected" : "API unavailable"}</div><button className="icon-btn" onClick={() => setDark(!dark)} aria-label="Toggle theme">{dark ? <Sun size={18}/> : <Moon size={18}/>}</button><button className="help-btn" onClick={() => notify("Help centre is coming soon.")}><CircleHelp size={17}/><span>Help</span></button>{userEmail ? <button className="auth-btn" onClick={() => void signOut()} title={userEmail}>Sign out</button> : <button className="auth-btn" disabled={authBusy} onClick={() => void signIn()}>{authBusy ? "Connecting…" : "Continue with Google"}</button>}<div className="avatar small">{userEmail ? userEmail.slice(0,1).toUpperCase() : "FE"}</div></div></header>
        <div className="content">
          {tab === "Overview" && <section className="page">
            <div className="welcome-row"><div><div className="eyebrow"><span className="eyebrow-line"/> YOUR WORKSPACE</div><h1>{greeting}, <span>Explorer.</span></h1><p className="subheading">Your ideas deserve room to grow. What shall we create today?</p></div><div className="date-chip"><Activity size={15}/> Your creative space</div></div>
            <div className="hero"><div className="hero-orb orb-one"/><div className="hero-orb orb-two"/><div className="hero-copy"><div className="hero-tag"><Sparkles size={14}/> THE FUTURE OF WORKFLOW AND TECHNOLOGY</div><h2>Think bigger.<br/><span>Make it happen.</span></h2><p>One intelligent companion for your ideas, work and creativity.</p><button className="primary-btn" onClick={() => chooseTab("AI Chat")}>Start a conversation <ArrowUpRight size={16}/></button></div><div className="hero-art"><div className="orbit orbit-a"/><div className="orbit orbit-b"/><div className="core"><Sparkles size={34}/></div><div className="float-chip chip-a"><Bot size={17}/> AI companion</div><div className="float-chip chip-b"><Zap size={16}/> Your workflow</div><div className="float-chip chip-c"><ShieldCheck size={16}/> Built for you</div></div></div>
            <div className="section-heading"><div><h3>Quick access</h3><p>Jump back into your creative flow.</p></div><span className="muted-label">YOUR TOOLS</span></div>
            <div className="quick-grid"><button className="quick-card" onClick={() => chooseTab("AI Chat")}><div className="quick-icon green"><MessageSquare size={20}/></div><strong>AI Chat</strong><p>Think, write and solve with your AI companion.</p><span>Open chat <ArrowUpRight size={14}/></span></button><button className="quick-card" onClick={() => chooseTab("AI Studio")}><div className="quick-icon violet"><Sparkles size={20}/></div><strong>AI Studio</strong><p>Explore creative tools for image, video and audio.</p><span>Explore studio <ArrowUpRight size={14}/></span></button><button className="quick-card" onClick={() => chooseTab("Activity")}><div className="quick-icon amber"><Activity size={20}/></div><strong>Your activity</strong><p>Keep an eye on your workspace journey.</p><span>View activity <ArrowUpRight size={14}/></span></button></div>
            <div className="bottom-grid"><div className="panel prompt-panel"><div className="panel-title"><div><h3>Start with an idea</h3><p>Not sure where to begin? Try one of these.</p></div><Sparkles size={18}/></div><div className="prompt-list">{starterPrompts.map(p => <button key={p} onClick={() => { setMessage(p); chooseTab("AI Chat"); }}><span>{p}</span><ArrowUpRight size={15}/></button>)}</div></div><div className="panel plan-panel"><div className="plan-icon"><Zap size={20}/></div><span className="tiny-label">YOUR PLAN</span><h3>Regular</h3><p>You're on the free starter experience. Explore plans as your needs grow.</p><button className="text-btn" onClick={() => chooseTab("Plans")}>Compare plans <ArrowUpRight size={14}/></button></div></div>
          </section>}
          {tab === "AI Chat" && <section className="page chat-page"><div className="page-heading"><div className="eyebrow">YOUR AI COMPANION</div><h1>AI <span>Chat.</span></h1><p className="subheading">A space to think out loud, ask questions and make progress.</p></div><div className="chat-shell"><div className="chat-messages">{messages.length === 0 ? <div className="chat-empty"><div className="chat-empty-icon"><Sparkles size={26}/></div><h2>Where shall we start?</h2><p>Ask anything. Your next great idea could begin here.</p><div className="chat-suggestions">{starterPrompts.slice(0,3).map(p => <button key={p} onClick={() => setMessage(p)}>{p}<ArrowUpRight size={14}/></button>)}</div></div> : messages.map((m,i) => <div className={m.role === "user" ? "message user-message" : "message assistant-message"} key={i}><div className="message-avatar">{m.role === "user" ? "FE" : <Sparkles size={15}/>}</div><div className="message-body"><small>{m.role === "user" ? "YOU" : "TRIOSAI"}</small><p>{m.content}</p></div></div>)}{sending && <div className="message assistant-message"><div className="message-avatar"><Sparkles size={15}/></div><div className="message-body"><small>TRIOSAI</small><p className="typing">Thinking<span>.</span><span>.</span><span>.</span></p></div></div>}</div><form className="composer" onSubmit={sendMessage}><textarea value={message} onChange={e => setMessage(e.target.value)} onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); void sendMessage(); } }} placeholder="Message your AI companion..." rows={2}/><div className="composer-bottom"><span><Paperclip size={14}/> Shift + Enter for a new line</span><button className="send-btn" disabled={!message.trim() || sending} aria-label="Send message"><Send size={17}/></button></div></form><div className="disclaimer">AI can make mistakes. Check important information.</div></div></section>}
          {tab === "AI Studio" && <section className="page"><div className="page-heading"><div className="eyebrow">CREATIVE WORKSPACE</div><h1>AI <span>Studio.</span></h1><p className="subheading">A creative toolkit for turning imagination into something real.</p></div><div className="studio-banner"><div className="studio-banner-icon"><Sparkles size={23}/></div><div><strong>Your creative studio</strong><p>Choose a tool to explore. Generation services are not connected yet.</p></div><span className="coming-pill">IN DEVELOPMENT</span></div><div className="studio-grid">{[{name:"Image",desc:"Create visual concepts and artwork.",icon:Image,cls:"violet"},{name:"Video",desc:"Explore ideas for motion and storytelling.",icon:Video,cls:"blue"},{name:"Audio",desc:"Work with voice, sound and audio ideas.",icon:AudioLines,cls:"amber"}].map(tool => {const Icon=tool.icon;return <button className={selectedTool===tool.name?"studio-card selected":"studio-card"} key={tool.name} onClick={()=>setSelectedTool(tool.name)}><div className={"quick-icon "+tool.cls}><Icon size={22}/></div><strong>{tool.name} generation</strong><p>{tool.desc}</p><span>Explore tool <ArrowUpRight size={14}/></span></button>})}</div><div className="panel studio-detail"><div><span className="tiny-label">SELECTED TOOL</span><h3>{selectedTool} workspace</h3><p>The {selectedTool.toLowerCase()} generation provider and secure usage controls still need to be connected. No generation will be simulated or charged.</p></div><button className="secondary-btn" onClick={() => notify(selectedTool+" generation is not connected yet.")}>Check availability <ArrowUpRight size={15}/></button></div></section>}
          {tab === "Activity" && <section className="page"><div className="page-heading"><div className="eyebrow">YOUR PROGRESS</div><h1>Activity <span>hub.</span></h1><p className="subheading">A clear view of your work and the habits you're building.</p></div><div className="stats-grid"><div className="stat-card"><span>Current streak</span><strong>0 <small>days</small></strong><p>Streak tracking activates with your account.</p></div><div className="stat-card"><span>Conversations</span><strong>{messages.length ? 1 : 0}</strong><p>Chats in this current session.</p></div><div className="stat-card"><span>Plan</span><strong>Regular</strong><p>Starter workspace.</p></div></div><div className="panel empty-activity"><div className="quick-icon green"><Activity size={22}/></div><h3>Your journey starts here</h3><p>Sign-in, database-backed history and daily streak tracking will appear here after account services are configured.</p><button className="secondary-btn" onClick={() => chooseTab("AI Chat")}>Start your first chat <ArrowUpRight size={15}/></button></div></section>}
          {tab === "Plans" && <section className="page"><div className="page-heading centered"><div className="eyebrow">GROW AT YOUR OWN PACE</div><h1>Plans that move <span>with you.</span></h1><p className="subheading">Start simple. Unlock more as your workflow grows.</p></div><div className="plans-grid">{(plans.length?plans:[{id:"regular",name:"Regular",priceNgn:0,uploadBytes:2097152,features:["AI chat","3 demo file analyses","Daily streaks"]},{id:"geek",name:"Geek",priceNgn:null,uploadBytes:5242880,features:["Expanded AI usage","Larger uploads","Creative studio"]},{id:"pro",name:"Pro",priceNgn:null,uploadBytes:10485760,features:["Higher usage","10 MB uploads","Priority processing"]},{id:"ekop",name:"Ekop",priceNgn:null,uploadBytes:15728640,features:["Advanced workflows","15 MB uploads","More media credits"]},{id:"premium",name:"Premium",priceNgn:null,uploadBytes:52428800,features:["Highest usage tier","50 MB uploads","Priority support"]}] as Plan[]).map((plan,i)=><div className={i===2?"plan-card featured":"plan-card"} key={plan.id}>{i===2&&<span className="popular">POPULAR</span>}<span className="tiny-label">{plan.id.toUpperCase()} PLAN</span><h3>{plan.name}</h3><div className="price">{plan.priceNgn===0?"Free":plan.priceNgn? "₦"+plan.priceNgn.toLocaleString():"Coming soon"}{plan.priceNgn!==0&&<small>/ month</small>}</div><p className="plan-limit">Up to {(plan.uploadBytes/1024/1024).toFixed(0)} MB per file</p><ul>{plan.features.map(f=><li key={f}><Check size={15}/>{f}</li>)}</ul><button className={i===0?"secondary-btn":"primary-btn"} onClick={()=>notify("Subscriptions and checkout are not enabled yet.")}>{i===0?"Current plan":"Coming soon"}</button></div>)}</div><p className="pricing-note"><ShieldCheck size={15}/> Prices and payment checkout will be published after final review. No payments are currently accepted.</p></section>}
          {tab === "Settings" && <section className="page"><div className="page-heading"><div className="eyebrow">MAKE IT YOURS</div><h1>Workspace <span>settings.</span></h1><p className="subheading">Manage your appearance and workspace preferences.</p></div><div className="settings-list"><div className="setting-row"><div className="setting-icon"><Sun size={19}/></div><div className="setting-copy"><strong>Appearance</strong><p>Choose the look that feels right for your workspace.</p></div><button className="secondary-btn" onClick={()=>setDark(!dark)}>{dark?"Dark mode":"Light mode"} <ChevronDown size={15}/></button></div><div className="setting-row"><div className="setting-icon"><ShieldCheck size={19}/></div><div className="setting-copy"><strong>Privacy and security</strong><p>Authentication and account security setup is still pending.</p></div><span className="coming-pill">NOT CONNECTED</span></div><div className="setting-row"><div className="setting-icon"><FileText size={19}/></div><div className="setting-copy"><strong>Data and history</strong><p>Cloud conversation history will be available after database setup.</p></div><span className="coming-pill">COMING SOON</span></div><div className="setting-row"><div className="setting-icon"><CircleHelp size={19}/></div><div className="setting-copy"><strong>Help and support</strong><p>Support centre and documentation are being prepared.</p></div><button className="secondary-btn" onClick={()=>notify("Support centre is coming soon.")}>Learn more <ArrowUpRight size={15}/></button></div></div><div className="settings-foot">TriosAI · Your Intelligent AI Companion <span>Version 0.1.0 · Early development</span></div></section>}
        </div>
      </main>
      {toast && <div className="toast"><Check size={16}/>{toast}</div>}
    </div>
  );
}

export default App;