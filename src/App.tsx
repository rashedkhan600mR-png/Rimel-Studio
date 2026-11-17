import { useEffect, useMemo, useRef, useState } from 'react'
import type { ChangeEvent } from 'react'
import { QRCodeSVG } from 'qrcode.react'
import {
  LayoutDashboard, Images, WandSparkles, Printer, CalendarDays, LogIn, LogOut,
  UploadCloud, Download, Search, FileText, Image as ImageIcon, ChevronLeft,
  ChevronRight, Trash2, RotateCcw, ArrowRight, ShieldCheck, Menu, X, RefreshCw
} from 'lucide-react'
import { supabase, isConfigured, ADMIN_EMAIL, SHOP_NAME, BUCKET } from './supabase'
import type { Session } from '@supabase/supabase-js'

type UploadRow = {
  id: string; filename: string; mime_type: string; size_bytes: number;
  storage_path: string; status: string; created_at: string
}
type Job = { id: string; job_date: string; customer_name: string; upload_id: string | null; filename: string | null }

const bn = (n: number | string) => String(n).replace(/\d/g, d => '০১২৩৪৫৬৭৮৯'[Number(d)])
const prettySize = (n: number) => n < 1024 ? `${n} B` : n < 1048576 ? `${(n/1024).toFixed(1)} KB` : `${(n/1048576).toFixed(1)} MB`
const monthNames = ['জানুয়ারি','ফেব্রুয়ারি','মার্চ','এপ্রিল','মে','জুন','জুলাই','আগস্ট','সেপ্টেম্বর','অক্টোবর','নভেম্বর','ডিসেম্বর']
const todayKey = () => new Date().toISOString().slice(0,10)

export default function App() {
  const [session, setSession] = useState<Session | null>(null)
  const [authChecked, setAuthChecked] = useState(false)
  const [page, setPage] = useState<'dashboard'|'collection'|'edit'|'print'|'calendar'|'upload'>('dashboard')
  const [rows, setRows] = useState<UploadRow[]>([])
  const [selected, setSelected] = useState<UploadRow | null>(null)
  const [signedUrl, setSignedUrl] = useState('')
  const [filter, setFilter] = useState('')
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')
  const [mobileNav, setMobileNav] = useState(false)
  const [month, setMonth] = useState(new Date().getMonth())
  const [year, setYear] = useState(new Date().getFullYear())
  const [day, setDay] = useState(new Date().getDate())
  const [jobs, setJobs] = useState<Job[]>([])
  const [customerName, setCustomerName] = useState('')
  const [jobFile, setJobFile] = useState('')
  const [brightness, setBrightness] = useState(100)
  const [contrast, setContrast] = useState(100)
  const [saturation, setSaturation] = useState(100)
  const [preset, setPreset] = useState('original')
  const [background, setBackground] = useState('transparent')
  const [cropCanvasUrl, setCropCanvasUrl] = useState('')
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const publicUploadUrl = `${window.location.origin}/upload`
  const isAdmin = !!session?.user?.email && session.user.email.toLowerCase() === ADMIN_EMAIL

  useEffect(() => {
    if (!supabase) { setAuthChecked(true); return }
    supabase.auth.getSession().then(({ data }) => { setSession(data.session); setAuthChecked(true) })
    const { data: listener } = supabase.auth.onAuthStateChange((_event, next) => {
      setSession(next)
      setAuthChecked(true)
    })
    return () => listener.subscription.unsubscribe()
  }, [])

  useEffect(() => {
    const path = window.location.pathname
    if (path === '/upload') setPage('upload')
  }, [])

  useEffect(() => {
    if (isAdmin) { void loadUploads(); void loadJobs() }
  }, [isAdmin])

  useEffect(() => {
    if (selected && supabase && isAdmin) {
      supabase.storage.from(BUCKET).createSignedUrl(selected.storage_path, 60 * 30)
        .then(({ data, error }) => { if (error) setMessage(error.message); else setSignedUrl(data.signedUrl) })
    } else setSignedUrl('')
  }, [selected, isAdmin])

  async function signIn() {
    if (!supabase) return
    setBusy(true)
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: window.location.origin }
    })
    if (error) setMessage(error.message)
    setBusy(false)
  }
  async function signOut() { if (supabase) await supabase.auth.signOut(); setRows([]); setSelected(null) }

  async function loadUploads() {
    if (!supabase) return
    const { data, error } = await supabase.from('uploads').select('*').order('created_at', { ascending: false })
    if (error) setMessage(error.message); else setRows((data || []) as UploadRow[])
  }
  async function loadJobs() {
    if (!supabase) return
    const { data, error } = await supabase.from('print_jobs').select('*').order('job_date', { ascending: true })
    if (error) setMessage(error.message); else setJobs((data || []) as Job[])
  }

  async function uploadFiles(files: FileList | File[], publicMode = false) {
    if (!supabase) { setMessage('আগে Supabase সেটআপ সম্পন্ন করুন।'); return }
    if (!files.length) return
    setBusy(true); setMessage('')
    try {
      for (const file of Array.from(files)) {
        if (file.size > 20 * 1024 * 1024) throw new Error(`${file.name}: সর্বোচ্চ ২০ MB ফাইল আপলোড করা যাবে।`)
        const safeName = file.name.replace(/[^\w.\-\u0980-\u09FF]/g, '_')
        const path = `inbox/${crypto.randomUUID()}-${safeName}`
        const { error: storageError } = await supabase.storage.from(BUCKET).upload(path, file, {
          contentType: file.type || 'application/octet-stream', upsert: false
        })
        if (storageError) throw storageError
        const { error: rowError } = await supabase.from('uploads').insert({
          filename: file.name, mime_type: file.type || 'application/octet-stream',
          size_bytes: file.size, storage_path: path, status: 'new'
        })
        if (rowError) {
          await supabase.storage.from(BUCKET).remove([path])
          throw rowError
        }
      }
      setMessage(publicMode ? 'আপনার ফাইল স্টুডিওতে পাঠানো হয়েছে। ধন্যবাদ!' : 'ফাইল সফলভাবে সংগ্রহে যোগ হয়েছে।')
      if (!publicMode) await loadUploads()
    } catch (e) { setMessage(e instanceof Error ? e.message : 'আপলোড করা যায়নি।') }
    finally { setBusy(false) }
  }

  async function downloadFile(row: UploadRow) {
    if (!supabase) return
    const { data, error } = await supabase.storage.from(BUCKET).createSignedUrl(row.storage_path, 60)
    if (error) { setMessage(error.message); return }
    const a = document.createElement('a'); a.href = data.signedUrl; a.download = row.filename; a.target = '_blank'; a.click()
  }
  async function deleteFile(row: UploadRow) {
    if (!supabase || !confirm(`“${row.filename}” মুছে ফেলবেন?`)) return
    const { error: storageError } = await supabase.storage.from(BUCKET).remove([row.storage_path])
    if (storageError) { setMessage(storageError.message); return }
    const { error } = await supabase.from('uploads').delete().eq('id', row.id)
    if (error) setMessage(error.message)
    else { if (selected?.id === row.id) setSelected(null); await loadUploads() }
  }

  function openFile(row: UploadRow, target: 'edit'|'print' = 'edit') {
    setSelected(row); setPage(target); setPreset('original'); setBrightness(100); setContrast(100); setSaturation(100); setBackground('transparent')
  }

  async function saveJob() {
    if (!supabase || !customerName.trim()) { setMessage('গ্রাহকের নাম লিখুন।'); return }
    const linked = rows.find(r => r.id === jobFile)
    const { error } = await supabase.from('print_jobs').insert({
      job_date: `${year}-${String(month+1).padStart(2,'0')}-${String(day).padStart(2,'0')}`,
      customer_name: customerName.trim(), upload_id: linked?.id || null, filename: linked?.filename || null
    })
    if (error) setMessage(error.message)
    else { setCustomerName(''); setMessage('ক্যালেন্ডারে কাজ সংরক্ষণ হয়েছে।'); await loadJobs() }
  }

  const filteredRows = useMemo(() => rows.filter(r => r.filename.toLowerCase().includes(filter.toLowerCase())), [rows, filter])
  const selectedJobs = jobs.filter(j => j.job_date === `${year}-${String(month+1).padStart(2,'0')}-${String(day).padStart(2,'0')}`)
  const stats = { total: rows.length, images: rows.filter(r => r.mime_type.startsWith('image/')).length, docs: rows.filter(r => !r.mime_type.startsWith('image/')).length }

  function drawPreview() {
    if (!signedUrl || !selected?.mime_type.startsWith('image/')) return
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => {
      const c = canvasRef.current
      if (!c) return
      const ratio = preset === 'passport' ? 35/45 : preset === 'stamp' ? 25/30 : img.width/img.height
      let w = img.width, h = img.height
      if (preset !== 'original') { const maxW = 900, maxH = maxW / ratio; const scale = Math.min(maxW/img.width, maxH/img.height); w = Math.round(img.width*scale); h = Math.round(img.height*scale) }
      c.width = w; c.height = h
      const ctx = c.getContext('2d')
      if (!ctx) return
      if (background !== 'transparent') { ctx.fillStyle = background; ctx.fillRect(0,0,w,h) }
      ctx.filter = `brightness(${brightness}%) contrast(${contrast}%) saturate(${saturation}%)`
      const scale = Math.max(w/img.width, h/img.height)
      const dw = img.width*scale, dh = img.height*scale
      ctx.drawImage(img, (w-dw)/2, (h-dh)/2, dw, dh)
      setCropCanvasUrl(c.toDataURL('image/png'))
    }
    img.src = signedUrl
  }
  useEffect(() => { drawPreview() }, [signedUrl, selected, brightness, contrast, saturation, preset, background])

  function go(next: typeof page) { setPage(next); setMobileNav(false); if (next !== 'upload') window.history.replaceState({}, '', '/') }

  if (page === 'upload' || window.location.pathname === '/upload') {
    return <PublicUpload busy={busy} message={message} onUpload={files => uploadFiles(files, true)} />
  }

  if (!authChecked) return <div className="center-screen"><div className="spinner"/><p>লোড হচ্ছে...</p></div>
  if (!isConfigured) return <SetupScreen />
  if (!session || !isAdmin) return <LoginScreen busy={busy} message={message || (!isAdmin && session ? `এই Gmail Admin হিসেবে অনুমোদিত নয়। অনুমোদিত Gmail: ${ADMIN_EMAIL}` : '')} onLogin={signIn} onLogout={signOut} />

  const nav = [
    { id: 'dashboard' as const, label: 'ড্যাশবোর্ড', icon: LayoutDashboard },
    { id: 'collection' as const, label: 'ছবি সংগ্রহ', icon: Images },
    { id: 'edit' as const, label: 'Edit', icon: WandSparkles },
    { id: 'print' as const, label: 'Print', icon: Printer },
    { id: 'calendar' as const, label: 'ক্যালেন্ডার', icon: CalendarDays },
  ]

  return <div className="app-shell">
    <aside className={`sidebar ${mobileNav ? 'open' : ''}`}>
      <div className="brand"><div className="brand-mark"><img src="/assets/rimel-profile.png" alt="Rimel Studio" /></div><div><b>{SHOP_NAME}</b><small>PHOTO • DOCUMENT • PRINT</small></div><button className="mobile-close" onClick={() => setMobileNav(false)}><X size={18}/></button></div>
      <div className="nav-label">WORKSPACE</div>
      <nav>{nav.map(item => <button key={item.id} className={page === item.id ? 'active' : ''} onClick={() => go(item.id)}><item.icon size={19}/><span>{item.label}</span></button>)}</nav>
      <div className="sidebar-bottom"><ShieldCheck size={16}/> Admin access secured</div>
    </aside>
    {mobileNav && <div className="scrim" onClick={() => setMobileNav(false)}/>}
    <main className="main-area">
      <header className="topbar"><div className="top-title"><button className="mobile-menu" onClick={() => setMobileNav(true)}><Menu/></button><div><span className="eyebrow">STUDIO MANAGEMENT</span><h1>{nav.find(n => n.id === page)?.label || 'ড্যাশবোর্ড'}</h1></div></div><div className="user-pill"><div className="avatar"><img src="/assets/rimel-profile.png" alt="Admin profile" /></div><div><b>Studio Admin</b><small>{session.user.email}</small></div><button title="লগআউট" onClick={signOut}><LogOut size={17}/></button></div></header>
      {message && <div className="toast" role="status"><span>{message}</span><button onClick={() => setMessage('')}>×</button></div>}

      {page === 'dashboard' && <section>
        <div className="welcome"><span className="eyebrow">WELCOME BACK</span><h2>{SHOP_NAME}-এ স্বাগতম</h2><p>আপনার ছবি, ডকুমেন্ট, প্রিন্ট ও গ্রাহকের কাজ এক জায়গা থেকে পরিচালনা করুন।</p><button className="gold-btn" onClick={() => go('collection')}>ছবি সংগ্রহ খুলুন <ArrowRight size={16}/></button></div>
        <div className="stats-grid"><Stat label="মোট ফাইল" value={stats.total} hint="সংগ্রহে থাকা ফাইল"/><Stat label="ছবি" value={stats.images} hint="ইমেজ ফাইল"/><Stat label="ডকুমেন্ট" value={stats.docs} hint="PDF / অন্যান্য"/><Stat label="ক্যালেন্ডার কাজ" value={jobs.length} hint="সংরক্ষিত প্রিন্ট কাজ"/></div>
        <div className="section-heading"><h2>সাম্প্রতিক ফাইল</h2><button className="text-btn" onClick={() => go('collection')}>সব দেখুন <ArrowRight size={15}/></button></div>
        <FileGrid rows={rows.slice(0,4)} onOpen={r => openFile(r)} onDownload={downloadFile}/>
      </section>}

      {page === 'collection' && <section>
        <div className="welcome compact"><span className="eyebrow">INBOX / CUSTOMER UPLOAD</span><h2>ছবি ও ডকুমেন্ট সংগ্রহ</h2><p>QR স্ক্যান করে গ্রাহক ছবি বা ডকুমেন্ট পাঠাতে পারবেন।</p></div>
        <div className="collection-top">
          <div className="panel qr-panel"><div><span className="eyebrow">CUSTOMER QR CODE</span><h3>গ্রাহককে এই QR কোড স্ক্যান করতে বলুন</h3><p>স্ক্যান করলে সরাসরি পাবলিক Upload পেজ খুলবে।</p><div className="qr-wrap"><QRCodeSVG value={publicUploadUrl} size={180} level="H" includeMargin/></div><button className="outline-btn" onClick={() => {navigator.clipboard.writeText(publicUploadUrl);setMessage('Upload লিংক কপি হয়েছে।')}}>Upload লিংক কপি</button></div></div>
          <div className="panel upload-panel"><div className="upload-icon"><UploadCloud size={26}/></div><h3>Admin হিসেবে ফাইল যোগ করুন</h3><p>কম্পিউটার থেকে ছবি বা ডকুমেন্ট নির্বাচন করুন।</p><input ref={fileInputRef} type="file" multiple accept="image/*,.pdf,.doc,.docx,.txt" onChange={e => e.target.files && uploadFiles(e.target.files)} /><small>সর্বোচ্চ ২০ MB / ফাইল</small></div>
        </div>
        <div className="section-heading"><h2>সংগৃহীত ফাইল <span className="count">{bn(rows.length)}</span></h2><div className="search-box"><Search size={16}/><input value={filter} onChange={e => setFilter(e.target.value)} placeholder="ফাইল খুঁজুন..."/></div></div>
        <FileGrid rows={filteredRows} onOpen={r => openFile(r)} onDownload={downloadFile} onDelete={deleteFile}/>
        <div className="refresh-row"><button className="outline-btn" onClick={loadUploads}><RefreshCw size={15}/> রিফ্রেশ</button></div>
      </section>}

      {page === 'edit' && <section>
        <div className="section-heading"><div><h2>ছবি এডিট</h2><p className="muted">সংগ্রহ থেকে একটি ছবি নির্বাচন করুন।</p></div><button className="outline-btn" onClick={() => go('collection')}><ChevronLeft size={16}/> ছবি সংগ্রহ</button></div>
        {!selected ? <Empty text="এডিট করার জন্য ছবি সংগ্রহ থেকে একটি ছবি নির্বাচন করুন।"/> :
          <div className="editor-layout"><div className="preview-panel">
            {selected.mime_type.startsWith('image/') ? <>{cropCanvasUrl ? <img src={cropCanvasUrl} alt="এডিট প্রিভিউ"/> : <div className="muted">প্রিভিউ তৈরি হচ্ছে...</div>}<canvas ref={canvasRef} className="hidden-canvas"/></> : <div className="doc-preview"><FileText size={60}/><b>{selected.filename}</b><span>এই ফাইলটি ছবি নয়। ডকুমেন্ট প্রিভিউ/এডিটের জন্য আলাদা PDF/OCR মডিউল প্রয়োজন।</span></div>}
          </div><div className="editor-controls">
            <div className="panel"><h3>ছবির মান</h3><Range label="Brightness" value={brightness} onChange={setBrightness}/><Range label="Contrast" value={contrast} onChange={setContrast}/><Range label="Saturation" value={saturation} onChange={setSaturation}/><button className="outline-btn full" onClick={() => {setBrightness(100);setContrast(100);setSaturation(100);setPreset('original');setBackground('transparent')}}><RotateCcw size={15}/> Reset</button></div>
            <div className="panel"><h3>সাইজ ও ব্যাকগ্রাউন্ড</h3><label className="field-label">ছবির সাইজ</label><select value={preset} onChange={e => setPreset(e.target.value)}><option value="original">Original</option><option value="passport">পাসপোর্ট সাইজ (৩৫ × ৪৫ mm অনুপাত)</option><option value="stamp">স্ট্যাম্প সাইজ (২৫ × ৩০ mm অনুপাত)</option></select><label className="field-label">ব্যাকগ্রাউন্ড</label><select value={background} onChange={e => setBackground(e.target.value)}><option value="transparent">Original</option><option value="#ffffff">White</option><option value="#d9e9f7">Light Blue</option><option value="#d7ead7">Light Green</option><option value="#e8e8e8">Light Grey</option></select><p className="small-note">ব্যাকগ্রাউন্ড রং পরিবর্তনটি ছবির পেছনে ক্যানভাসে প্রয়োগ হয়; স্বয়ংক্রিয় subject cutout নয়।</p></div>
            <div className="panel"><h3>AI এডিটিং</h3><button className="outline-btn full" disabled>AI দিয়ে ব্যাকগ্রাউন্ড সরান — API প্রয়োজন</button><button className="outline-btn full" disabled>AI দিয়ে পোশাক পরিবর্তন — API প্রয়োজন</button><button className="outline-btn full" disabled>AI দিয়ে ছবি পরিষ্কার — API প্রয়োজন</button></div>
            <button className="gold-btn full" onClick={() => go('print')}>Next → Print</button>
          </div></div>}
      </section>}

      {page === 'print' && <section>
        <div className="section-heading"><div><h2>প্রিন্ট</h2><p className="muted">প্রিন্টের আগে পেপার ও কপি নির্বাচন করুন।</p></div><button className="outline-btn" onClick={() => go('collection')}><ChevronLeft size={16}/> ছবি সংগ্রহ</button></div>
        {!selected ? <Empty text="প্রিন্ট করার জন্য ছবি সংগ্রহ থেকে ফাইল নির্বাচন করুন।"/> : <div className="print-layout"><div className="paper-preview">{selected.mime_type.startsWith('image/') && cropCanvasUrl ? <img src={cropCanvasUrl} alt="Print preview"/> : selected.mime_type === 'application/pdf' && signedUrl ? <iframe src={signedUrl} title="PDF preview"/> : <div className="doc-preview"><FileText size={52}/><b>{selected.filename}</b></div>}</div><div className="panel print-settings"><h3>Print Settings</h3><label className="field-label">Paper Size</label><select><option>A4</option><option>4R (৪ × ৬ inch)</option><option>Letter</option></select><label className="field-label">Copies</label><input type="number" min="1" max="99" defaultValue="1"/><label className="field-label">Orientation</label><select><option>Portrait</option><option>Landscape</option></select><button className="gold-btn full" onClick={() => window.print()}><Printer size={17}/> Print Now</button><button className="outline-btn full" onClick={() => downloadFile(selected)}><Download size={16}/> ডাউনলোড</button><button className="outline-btn full" onClick={() => go('calendar')}><CalendarDays size={16}/> ক্যালেন্ডারে কাজ সেভ</button></div></div>}
      </section>}

      {page === 'calendar' && <section>
        <div className="welcome compact"><span className="eyebrow">PRINT JOB ARCHIVE</span><h2>ক্যালেন্ডার</h2><p>প্রিন্টের পর মাস, তারিখ ও গ্রাহকের নাম দিয়ে কাজ সংরক্ষণ করুন।</p></div>
        <div className="calendar-layout"><div className="panel calendar-panel"><div className="calendar-head"><button className="icon-btn" onClick={() => shiftMonth(-1)}><ChevronLeft/></button><h3>{monthNames[month]} {bn(year)}</h3><button className="icon-btn" onClick={() => shiftMonth(1)}><ChevronRight/></button></div><div className="calendar-grid">{['রবি','সোম','মঙ্গল','বুধ','বৃহঃ','শুক্র','শনি'].map(x => <div className="weekday" key={x}>{x}</div>)}{Array.from({length:new Date(year,month,1).getDay()},(_,i)=><div key={'blank'+i}/>)}{Array.from({length:new Date(year,month+1,0).getDate()},(_,i)=>{const d=i+1;const date=`${year}-${String(month+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;const has=jobs.some(j=>j.job_date===date);return <button key={d} className={`day-cell ${day===d?'selected':''} ${has?'has-job':''}`} onClick={() => setDay(d)}>{bn(d)}{has&&<i/>}</button>})}</div></div>
          <div className="panel job-panel"><h3>কাজ সংরক্ষণ</h3><div className="form-field"><label>মাস</label><select value={month} onChange={e => {setMonth(Number(e.target.value));setDay(1)}}>{monthNames.map((m,i)=><option value={i} key={m}>{m}</option>)}</select></div><div className="form-field"><label>তারিখ</label><select value={day} onChange={e => setDay(Number(e.target.value))}>{Array.from({length:new Date(year,month+1,0).getDate()},(_,i)=><option value={i+1} key={i}>{bn(i+1)}</option>)}</select></div><div className="form-field"><label>পাবলিকের নাম / ফাইলের নাম</label><input value={customerName} onChange={e => setCustomerName(e.target.value)} placeholder="গ্রাহকের নাম লিখুন"/></div><div className="form-field"><label>ছবি বা ডকুমেন্ট (ঐচ্ছিক)</label><select value={jobFile} onChange={e => setJobFile(e.target.value)}><option value="">ফাইল নির্বাচন করুন</option>{rows.map(r=><option value={r.id} key={r.id}>{r.filename}</option>)}</select></div><button className="gold-btn full" onClick={saveJob}>সেভ করুন</button><div className="section-heading slim"><h3>এই দিনের কাজ</h3></div><div className="job-list">{selectedJobs.length ? selectedJobs.map(j=><div className="job-item" key={j.id}><b>{j.customer_name}</b><small>{j.filename || 'ফাইল সংযুক্ত নেই'}</small></div>) : <p className="muted">এই তারিখে কোনো কাজ সেভ নেই।</p>}</div></div>
        </div>
      </section>}
    </main>
  </div>

  function shiftMonth(delta: number) {
    const next = new Date(year, month + delta, 1); setMonth(next.getMonth()); setYear(next.getFullYear()); setDay(1)
  }
}

function Stat({label,value,hint}:{label:string,value:number,hint:string}) { return <div className="stat-card"><small>{label}</small><strong>{bn(value)}</strong><em>{hint}</em></div> }
function Empty({text}:{text:string}) { return <div className="empty-state"><Images size={34}/><p>{text}</p></div> }
function Range({label,value,onChange}:{label:string,value:number,onChange:(n:number)=>void}) { return <label className="range-field"><span>{label}<b>{value}%</b></span><input type="range" min="50" max="160" value={value} onChange={e=>onChange(Number(e.target.value))}/></label> }
function FileGrid({rows,onOpen,onDownload,onDelete}:{rows:UploadRow[],onOpen:(r:UploadRow)=>void,onDownload:(r:UploadRow)=>void,onDelete?:(r:UploadRow)=>void}) {
  if (!rows.length) return <Empty text="এখনো কোনো ফাইল জমা হয়নি। QR কোড দিয়ে গ্রাহককে ছবি পাঠাতে বলুন।"/>
  return <div className="file-grid">{rows.map(r=><div className="file-card" key={r.id}><button className="file-open" onClick={()=>onOpen(r)}><div className="file-thumb">{r.mime_type.startsWith('image/')?<ImageIcon size={35}/>:<FileText size={35}/>}</div><b title={r.filename}>{r.filename}</b><small>{prettySize(r.size_bytes)} • {new Date(r.created_at).toLocaleDateString('bn-BD')}</small></button><div className="file-actions"><button title="ডাউনলোড" onClick={()=>onDownload(r)}><Download size={15}/></button>{onDelete&&<button title="মুছুন" onClick={()=>onDelete(r)}><Trash2 size={15}/></button>}</div></div>)}</div>
}
function LoginScreen({busy,message,onLogin,onLogout}:{busy:boolean,message:string,onLogin:()=>void,onLogout:()=>void}) {
  return <div className="login-screen"><div className="login-card"><div className="login-logo-placeholder"><img src="/assets/rimel-profile.png" alt="Rimel Studio profile" /></div><span className="eyebrow">PRIVATE STUDIO ADMIN</span><h1>রিমেল স্টুডিও</h1><p>আপনার স্টুডিও পরিচালনা করতে Admin Gmail দিয়ে প্রবেশ করুন।</p>{message&&<div className="error-box">{message}</div>}<button className="google-btn" onClick={onLogin} disabled={busy}><LogIn size={18}/> {busy?'অপেক্ষা করুন...':'Continue with Google'}</button><small>শুধু অনুমোদিত Admin Gmail প্রবেশ করতে পারবে।</small><button className="text-btn" onClick={onLogout}>অন্য অ্যাকাউন্ট দিয়ে চেষ্টা করুন</button></div><div className="login-footer">PHOTO • DOCUMENT • PRINT</div></div>
}
function SetupScreen() {
  return <div className="center-screen"><div className="setup-card"><div className="brand-mark large">RS</div><h1>রিমেল স্টুডিও সেটআপ বাকি</h1><p>প্রথমে Supabase প্রজেক্ট তৈরি করে `.env` ফাইলে Project URL ও Anon Key বসাতে হবে। নিচের README-তে ধাপগুলো দেওয়া আছে।</p><code>VITE_SUPABASE_URL<br/>VITE_SUPABASE_ANON_KEY</code></div></div>
}
function PublicUpload({busy,message,onUpload}:{busy:boolean,message:string,onUpload:(f:FileList)=>void}) {
  const [files,setFiles] = useState<FileList|null>(null)
  return <div className="public-upload-screen"><div className="public-upload-card"><div className="brand-mark"><img src="/assets/rimel-profile.png" alt="Rimel Studio" /></div><span className="eyebrow">CUSTOMER FILE UPLOAD</span><h1>রিমেল স্টুডিও</h1><h2>ছবি সংগ্রহ</h2><p>আপনার ফোনের গ্যালারি থেকে ছবি বা ডকুমেন্ট নির্বাচন করে পাঠান।</p><label className="choose-files"><UploadCloud/> গ্যালারি থেকে নির্বাচন<input type="file" accept="image/*,.pdf,.doc,.docx,.txt" multiple onChange={e=>setFiles(e.target.files)}/></label>{files&&<div className="selected-files">{Array.from(files).map(f=><span key={f.name}>{f.name}</span>)}</div>}<button className="gold-btn full" disabled={!files?.length||busy} onClick={()=>files&&onUpload(files)}>{busy?'আপলোড হচ্ছে...':'আপলোড পাঠান'}</button>{message&&<div className="upload-message">{message}</div>}<small>আপনার পাঠানো ফাইল স্টুডিওর Admin সংগ্রহে জমা হবে।</small></div></div>
}
