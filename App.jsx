import { useState, useEffect, useCallback } from "react";
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  updateProfile,
} from "firebase/auth";
import {
  collection,
  addDoc,
  getDocs,
  doc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  serverTimestamp,
} from "firebase/firestore";
import { auth, db } from "./firebase.js";
import { stripePromise } from "./stripe.js";

const css = `
  @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;0,600;1,300;1,400&family=DM+Sans:wght@300;400;500;600&display=swap');
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  :root {
    --cream: #f5f0e8; --warm: #faf7f2; --bark: #3b2e22; --moss: #5a6b4a;
    --terra: #c06b3a; --gold: #c9a84c; --sand: #d9c9a8; --stone: #8a7f72;
    --shadow: rgba(59,46,34,0.12); --red: #e05050; --green: #4a9a6a;
  }
  body { font-family: 'DM Sans', sans-serif; background: var(--warm); color: var(--bark); }
  input, select, textarea, button { font-family: 'DM Sans', sans-serif; }
  button { cursor: pointer; }
  ::-webkit-scrollbar { width: 6px; }
  ::-webkit-scrollbar-track { background: var(--cream); }
  ::-webkit-scrollbar-thumb { background: var(--sand); border-radius: 3px; }
  .toast { position: fixed; bottom: 28px; left: 50%; transform: translateX(-50%); background: var(--bark); color: var(--cream); padding: 14px 28px; border-radius: 4px; font-size: 0.88rem; z-index: 9999; box-shadow: 0 8px 32px rgba(0,0,0,0.2); animation: toastIn 0.3s ease; }
  .toast.success { background: var(--green); }
  .toast.error { background: var(--red); }
  @keyframes toastIn { from { opacity:0; transform: translateX(-50%) translateY(16px); } to { opacity:1; transform: translateX(-50%) translateY(0); } }
  .overlay { position: fixed; inset: 0; background: rgba(59,46,34,0.55); backdrop-filter: blur(4px); z-index: 500; display: flex; align-items: center; justify-content: center; padding: 20px; animation: fadeIn 0.2s ease; }
  @keyframes fadeIn { from { opacity:0; } to { opacity:1; } }
  .modal { background: var(--warm); border-radius: 8px; padding: 40px; width: 100%; max-width: 460px; box-shadow: 0 24px 80px rgba(0,0,0,0.25); animation: slideUp 0.3s ease; max-height: 90vh; overflow-y: auto; }
  .modal-wide { max-width: 680px; }
  @keyframes slideUp { from { opacity:0; transform: translateY(24px); } to { opacity:1; transform: translateY(0); } }
  .nav { position: sticky; top: 0; z-index: 200; background: rgba(250,247,242,0.92); backdrop-filter: blur(12px); border-bottom: 1px solid rgba(201,168,76,0.2); display: flex; align-items: center; justify-content: space-between; padding: 0 5%; height: 68px; }
  .nav-logo { font-family: 'Cormorant Garamond', serif; font-size: 1.4rem; font-weight: 600; background: none; border: none; cursor: pointer; }
  .nav-logo span { color: var(--terra); }
  .nav-actions { display: flex; gap: 12px; align-items: center; flex-wrap: wrap; }
  .nav-tab { background: none; border: none; padding: 8px 16px; font-size: 0.82rem; font-weight: 500; letter-spacing: 0.06em; text-transform: uppercase; color: var(--stone); border-radius: 2px; transition: all 0.2s; }
  .nav-tab:hover, .nav-tab.active { color: var(--bark); background: var(--cream); }
  .nav-avatar { width: 38px; height: 38px; border-radius: 50%; background: linear-gradient(135deg, var(--moss), var(--terra)); color: #fff; font-weight: 600; font-size: 0.9rem; display: flex; align-items: center; justify-content: center; border: none; }
  .btn { display: inline-flex; align-items: center; justify-content: center; gap: 8px; border: none; border-radius: 3px; font-weight: 500; letter-spacing: 0.06em; text-transform: uppercase; font-size: 0.82rem; padding: 12px 28px; transition: all 0.22s; cursor: pointer; }
  .btn-primary { background: var(--terra); color: #fff; box-shadow: 0 4px 16px rgba(192,107,58,0.3); }
  .btn-primary:hover { background: var(--bark); transform: translateY(-1px); }
  .btn-secondary { background: var(--cream); color: var(--bark); border: 1px solid var(--sand); }
  .btn-secondary:hover { background: var(--sand); }
  .btn-sm { padding: 8px 18px; font-size: 0.75rem; }
  .btn-lg { padding: 16px 40px; font-size: 0.88rem; }
  .btn-block { width: 100%; }
  .btn-danger { background: var(--red); color: #fff; }
  .btn:disabled { opacity: 0.5; cursor: not-allowed; transform: none !important; }
  .form-group { display: flex; flex-direction: column; gap: 6px; margin-bottom: 20px; }
  .form-label { font-size: 0.72rem; font-weight: 600; letter-spacing: 0.12em; text-transform: uppercase; color: var(--terra); }
  .form-input { border: 1.5px solid var(--sand); border-radius: 3px; padding: 12px 16px; font-size: 0.92rem; background: #fff; color: var(--bark); outline: none; transition: border-color 0.2s; }
  .form-input:focus { border-color: var(--terra); }
  .form-input::placeholder { color: var(--stone); opacity: 0.6; }
  textarea.form-input { resize: vertical; min-height: 100px; }
  select.form-input { appearance: none; background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='8' viewBox='0 0 12 8'%3E%3Cpath d='M1 1l5 5 5-5' stroke='%238a7f72' stroke-width='1.5' fill='none' stroke-linecap='round'/%3E%3C/svg%3E"); background-repeat: no-repeat; background-position: right 14px center; padding-right: 36px; background-color: #fff; }
  .form-row { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
  .form-hint { font-size: 0.78rem; color: var(--stone); margin-top: 2px; }
  .card { background: #fff; border-radius: 6px; overflow: hidden; box-shadow: 0 2px 16px var(--shadow); transition: transform 0.3s, box-shadow 0.3s; }
  .card:hover { transform: translateY(-4px); box-shadow: 0 8px 32px var(--shadow); }
  .card-img { height: 200px; position: relative; display: flex; align-items: center; justify-content: center; font-size: 3.5rem; overflow: hidden; }
  .card-body { padding: 18px 20px 22px; }
  .card-footer-row { display: flex; justify-content: space-between; align-items: center; padding-top: 12px; border-top: 1px solid var(--sand); margin-top: 12px; }
  .badge { display: inline-block; padding: 3px 10px; border-radius: 2px; font-size: 0.68rem; font-weight: 600; letter-spacing: 0.08em; text-transform: uppercase; }
  .badge-gold { background: var(--gold); color: var(--bark); }
  .badge-green { background: var(--green); color: #fff; }
  .badge-red { background: var(--red); color: #fff; }
  .badge-cream { background: var(--cream); color: var(--stone); }
  .section { padding: 64px 5%; }
  .section-label { font-size: 0.72rem; font-weight: 600; letter-spacing: 0.18em; text-transform: uppercase; color: var(--terra); margin-bottom: 12px; display: flex; align-items: center; gap: 10px; }
  .section-label::before { content: ''; display: block; width: 20px; height: 1.5px; background: var(--terra); }
  .serif { font-family: 'Cormorant Garamond', serif; }
  .grid-3 { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 24px; }
  .grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 24px; }
  .flex-between { display: flex; align-items: center; justify-content: space-between; }
  .stars { color: var(--gold); letter-spacing: 2px; }
  .tag { display: inline-block; padding: 4px 10px; background: var(--cream); color: var(--stone); font-size: 0.72rem; border-radius: 2px; }
  .tabs { display: flex; gap: 0; border-bottom: 2px solid var(--sand); margin-bottom: 32px; }
  .tab-btn { background: none; border: none; padding: 12px 24px; font-size: 0.85rem; font-weight: 500; color: var(--stone); border-bottom: 2px solid transparent; margin-bottom: -2px; transition: all 0.2s; cursor: pointer; }
  .tab-btn.active { color: var(--terra); border-bottom-color: var(--terra); }
  .divider { border: none; border-top: 1px solid var(--sand); margin: 24px 0; }
  .search-hero { background: linear-gradient(160deg, var(--bark) 0%, var(--moss) 55%, var(--terra) 100%); padding: 80px 5% 60px; position: relative; overflow: hidden; }
  .search-hero::before { content: ''; position: absolute; inset: 0; background: url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='%23ffffff' fill-opacity='0.03'%3E%3Ccircle cx='30' cy='30' r='1'/%3E%3C/g%3E%3C/svg%3E"); }
  .search-box { display: flex; background: #fff; border-radius: 4px; overflow: hidden; box-shadow: 0 8px 40px rgba(0,0,0,0.2); max-width: 700px; border: 1px solid var(--sand); position: relative; z-index: 1; }
  .search-field { flex: 1; display: flex; flex-direction: column; padding: 12px 18px; border-right: 1px solid var(--sand); }
  .search-field label { font-size: 0.65rem; font-weight: 600; letter-spacing: 0.12em; text-transform: uppercase; color: var(--terra); margin-bottom: 3px; }
  .search-field input, .search-field select { border: none; outline: none; font-size: 0.9rem; font-weight: 500; color: var(--bark); background: transparent; font-family: 'DM Sans', sans-serif; }
  .search-submit { background: var(--terra); border: none; padding: 0 28px; color: #fff; font-size: 1.4rem; transition: background 0.2s; flex-shrink: 0; cursor: pointer; }
  .search-submit:hover { background: var(--bark); }
  .stat-row { display: flex; gap: 40px; flex-wrap: wrap; margin-top: 48px; position: relative; z-index: 1; }
  .stat-item strong { display: block; font-family: 'Cormorant Garamond', serif; font-size: 2rem; font-weight: 300; color: var(--gold); }
  .stat-item span { font-size: 0.72rem; letter-spacing: 0.1em; text-transform: uppercase; color: rgba(245,240,232,0.6); }
  .detail-hero { height: 380px; display: flex; align-items: center; justify-content: center; font-size: 8rem; position: relative; overflow: hidden; border-radius: 6px; }
  .detail-grid { display: grid; grid-template-columns: 1fr 360px; gap: 40px; align-items: flex-start; }
  .booking-panel { background: #fff; border-radius: 6px; padding: 28px; box-shadow: 0 4px 24px var(--shadow); position: sticky; top: 88px; }
  .dash-nav { display: flex; flex-direction: column; gap: 4px; }
  .dash-nav-item { display: flex; align-items: center; gap: 10px; padding: 10px 14px; border-radius: 4px; border: none; background: none; color: var(--stone); font-size: 0.88rem; font-weight: 500; transition: all 0.2s; text-align: left; cursor: pointer; }
  .dash-nav-item:hover { background: var(--cream); color: var(--bark); }
  .dash-nav-item.active { background: var(--terra); color: #fff; }
  .booking-row { display: flex; align-items: center; gap: 16px; padding: 16px 0; border-bottom: 1px solid var(--sand); }
  .booking-row:last-child { border-bottom: none; }
  .steps { display: flex; gap: 0; margin-bottom: 32px; }
  .step { flex: 1; text-align: center; padding: 12px; border-bottom: 2px solid var(--sand); }
  .step.done { border-bottom-color: var(--green); }
  .step.active { border-bottom-color: var(--terra); }
  .step-num { width: 28px; height: 28px; border-radius: 50%; border: 2px solid var(--sand); display: inline-flex; align-items: center; justify-content: center; font-size: 0.8rem; font-weight: 600; margin-bottom: 4px; }
  .step.active .step-num { border-color: var(--terra); background: var(--terra); color: #fff; }
  .step.done .step-num { border-color: var(--green); background: var(--green); color: #fff; }
  .step-label { font-size: 0.72rem; color: var(--stone); }
  .step.active .step-label { color: var(--terra); font-weight: 600; }
  .amenity { display: flex; align-items: center; gap: 6px; padding: 8px 14px; border: 1px solid var(--sand); border-radius: 3px; font-size: 0.82rem; color: var(--bark); }
  .amenity-grid { display: flex; flex-wrap: wrap; gap: 8px; }
  .cal-grid { display: grid; grid-template-columns: repeat(7, 1fr); gap: 4px; }
  .cal-day { aspect-ratio: 1; display: flex; align-items: center; justify-content: center; border-radius: 3px; font-size: 0.82rem; cursor: pointer; border: 1px solid transparent; transition: all 0.15s; }
  .cal-day:hover:not(.cal-disabled):not(.cal-selected) { background: var(--cream); border-color: var(--sand); }
  .cal-day.cal-selected { background: var(--terra); color: #fff; border-color: var(--terra); }
  .cal-day.cal-in-range { background: rgba(192,107,58,0.15); }
  .cal-day.cal-disabled { color: var(--sand); cursor: not-allowed; }
  .cal-day.cal-today { font-weight: 700; color: var(--terra); }
  .cal-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 12px; }
  .cal-nav { background: none; border: 1px solid var(--sand); border-radius: 3px; padding: 4px 10px; font-size: 1rem; cursor: pointer; }
  .cal-weekdays { display: grid; grid-template-columns: repeat(7, 1fr); gap: 4px; margin-bottom: 6px; }
  .cal-wday { text-align: center; font-size: 0.7rem; font-weight: 600; color: var(--stone); text-transform: uppercase; letter-spacing: 0.08em; padding: 4px; }
  .bg-yard { background: linear-gradient(135deg, #5a6b4a 0%, #8a9a72 60%, #c9a84c 100%); }
  .bg-barn { background: linear-gradient(135deg, #8a5a3a 0%, #c06b3a 60%, #d9c9a8 100%); }
  .bg-lake { background: linear-gradient(135deg, #3a6b7a 0%, #5a9aa8 60%, #8abbc8 100%); }
  .bg-garden { background: linear-gradient(135deg, #6b7a3a 0%, #9aaa5a 60%, #c8d88a 100%); }
  .bg-ranch { background: linear-gradient(135deg, #7a5a3a 0%, #aa8a5a 60%, #d9c9a8 100%); }
  .bg-estate { background: linear-gradient(135deg, #3a3a5a 0%, #5a5a8a 60%, #8a8ab8 100%); }
  .bg-moss { background: linear-gradient(135deg, #5a6b4a 0%, #c06b3a 100%); }
  .error-msg { background: rgba(224,80,80,0.1); border: 1px solid var(--red); color: var(--red); padding: 10px 14px; border-radius: 3px; font-size: 0.85rem; margin-bottom: 16px; }
  .loading-spinner { display: inline-block; width: 16px; height: 16px; border: 2px solid rgba(255,255,255,0.3); border-top-color: #fff; border-radius: 50%; animation: spin 0.7s linear infinite; }
  @keyframes spin { to { transform: rotate(360deg); } }
  .empty-state { text-align: center; padding: 80px 20px; background: #fff; border-radius: 6px; border: 2px dashed var(--sand); }
  .empty-state .icon { font-size: 4rem; margin-bottom: 20px; }
  @media (max-width: 768px) {
    .detail-grid { grid-template-columns: 1fr; }
    .booking-panel { position: static; }
    .form-row { grid-template-columns: 1fr; }
    .grid-2 { grid-template-columns: 1fr; }
    .search-box { flex-direction: column; }
    .search-field { border-right: none; border-bottom: 1px solid var(--sand); }
    .search-submit { padding: 14px; }
    .stat-row { gap: 24px; }
    .nav-actions { gap: 6px; }
    .nav-tab { padding: 6px 10px; font-size: 0.75rem; }
  }
`;

const fmt = (n) => new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 0 }).format(n);
const sleep = (ms) => new Promise(r => setTimeout(r, ms));

function useToast() {
  const [toast, setToast] = useState(null);
  const show = useCallback((msg, type = "default") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  }, []);
  return [toast, show];
}

function Toast({ toast }) {
  if (!toast) return null;
  return <div className={`toast ${toast.type}`}>{toast.msg}</div>;
}

function StarRating({ rating, size = "1rem" }) {
  return <span className="stars" style={{ fontSize: size }}>{"★".repeat(Math.floor(rating))}{rating % 1 >= 0.5 ? "½" : ""}</span>;
}

function Calendar({ bookedDates = [], onSelect, checkIn, checkOut }) {
  const today = new Date();
  const [month, setMonth] = useState(today.getMonth());
  const [year, setYear] = useState(today.getFullYear());
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  const ds = (d) => `${year}-${String(month+1).padStart(2,"0")}-${String(d).padStart(2,"0")}`;
  const cells = [...Array(firstDay).fill(null), ...Array.from({length:daysInMonth},(_,i)=>i+1)];
  return (
    <div>
      <div className="cal-header">
        <button className="cal-nav" onClick={() => month===0?(setMonth(11),setYear(y=>y-1)):setMonth(m=>m-1)}>‹</button>
        <span style={{fontWeight:600,fontSize:"0.9rem"}}>{months[month]} {year}</span>
        <button className="cal-nav" onClick={() => month===11?(setMonth(0),setYear(y=>y+1)):setMonth(m=>m+1)}>›</button>
      </div>
      <div className="cal-weekdays">{["Su","Mo","Tu","We","Th","Fr","Sa"].map(d=><div key={d} className="cal-wday">{d}</div>)}</div>
      <div className="cal-grid">
        {cells.map((d,i) => {
          if (!d) return <div key={i}/>;
          const disabled = bookedDates.includes(ds(d)) || new Date(ds(d)) < new Date(today.toDateString());
          const selected = checkIn===ds(d)||checkOut===ds(d);
          const inRange = checkIn&&checkOut&&new Date(ds(d))>new Date(checkIn)&&new Date(ds(d))<new Date(checkOut);
          const isToday = today.getDate()===d&&today.getMonth()===month&&today.getFullYear()===year;
          return <div key={i} className={`cal-day${disabled?" cal-disabled":""}${selected?" cal-selected":""}${inRange?" cal-in-range":""}${isToday&&!selected?" cal-today":""}`} onClick={()=>!disabled&&onSelect&&onSelect(ds(d))}>{d}</div>;
        })}
      </div>
    </div>
  );
}

function AuthModal({ onClose, onAuth, showToast }) {
  const [mode, setMode] = useState("login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("guest");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const submit = async () => {
    setError(""); setLoading(true);
    try {
      if (mode === "signup") {
        if (!name.trim()) { setError("Please enter your name."); setLoading(false); return; }
        const cred = await createUserWithEmailAndPassword(auth, email, password);
        await updateProfile(cred.user, { displayName: name.trim() });
        await addDoc(collection(db, "users"), { uid: cred.user.uid, name: name.trim(), email, role, createdAt: serverTimestamp() });
        onAuth({ uid: cred.user.uid, name: name.trim(), email, role });
        showToast(`Welcome to Yard Events, ${name.trim()}! 🎉`, "success");
      } else {
        const cred = await signInWithEmailAndPassword(auth, email, password);
        const q = query(collection(db, "users"), where("uid","==",cred.user.uid));
        const snap = await getDocs(q);
        const userData = snap.empty ? { role: "guest" } : snap.docs[0].data();
        onAuth({ uid: cred.user.uid, name: cred.user.displayName || email, email, role: userData.role || "guest" });
        showToast(`Welcome back! 👋`, "success");
      }
      onClose();
    } catch (e) {
      const msgs = { "auth/email-already-in-use": "An account with this email already exists.", "auth/weak-password": "Password must be at least 6 characters.", "auth/invalid-email": "Please enter a valid email address.", "auth/user-not-found": "No account found with this email.", "auth/wrong-password": "Incorrect password.", "auth/invalid-credential": "Incorrect email or password." };
      setError(msgs[e.code] || "Something went wrong. Please try again.");
    }
    setLoading(false);
  };

  return (
    <div className="overlay" onClick={e=>e.target===e.currentTarget&&onClose()}>
      <div className="modal">
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:28}}>
          <div>
            <div className="section-label" style={{marginBottom:6}}>Welcome</div>
            <h2 className="serif" style={{fontSize:"1.8rem",fontWeight:300}}>{mode==="login"?"Sign In":"Create Account"}</h2>
          </div>
          <button onClick={onClose} style={{background:"none",border:"none",fontSize:"1.4rem",color:"var(--stone)"}}>×</button>
        </div>
        {error && <div className="error-msg">{error}</div>}
        {mode==="signup" && (
          <div className="form-group">
            <label className="form-label">Full Name</label>
            <input className="form-input" placeholder="Your full name" value={name} onChange={e=>setName(e.target.value)}/>
          </div>
        )}
        <div className="form-group">
          <label className="form-label">Email Address</label>
          <input className="form-input" type="email" placeholder="you@example.com" value={email} onChange={e=>setEmail(e.target.value)}/>
        </div>
        <div className="form-group">
          <label className="form-label">Password</label>
          <input className="form-input" type="password" placeholder={mode==="signup"?"At least 6 characters":"Your password"} value={password} onChange={e=>setPassword(e.target.value)} onKeyDown={e=>e.key==="Enter"&&submit()}/>
        </div>
        {mode==="signup" && (
          <div className="form-group">
            <label className="form-label">I want to…</label>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
              {[["guest","🎉","Book Spaces"],["host","🏡","List My Space"]].map(([val,emoji,label])=>(
                <div key={val} onClick={()=>setRole(val)} style={{border:`2px solid ${role===val?"var(--terra)":"var(--sand)"}`,borderRadius:4,padding:"16px 12px",textAlign:"center",cursor:"pointer",background:role===val?"rgba(192,107,58,0.06)":"#fff",transition:"all 0.2s"}}>
                  <div style={{fontSize:"1.8rem",marginBottom:6}}>{emoji}</div>
                  <div style={{fontWeight:600,fontSize:"0.88rem"}}>{label}</div>
                </div>
              ))}
            </div>
          </div>
        )}
        <button className="btn btn-primary btn-block btn-lg" onClick={submit} disabled={loading||!email||!password}>
          {loading ? <span className="loading-spinner"/> : mode==="login" ? "Sign In" : "Create Account"}
        </button>
        <p style={{textAlign:"center",fontSize:"0.82rem",color:"var(--stone)",marginTop:16}}>
          {mode==="login" ? "Don't have an account? " : "Already have an account? "}
          <button onClick={()=>{setMode(mode==="login"?"signup":"login");setError("");}} style={{background:"none",border:"none",color:"var(--terra)",fontWeight:600,cursor:"pointer"}}>
            {mode==="login"?"Sign up free":"Sign in"}
          </button>
        </p>
      </div>
    </div>
  );
}

function SpaceCard({ space, onClick, onFav, isFaved }) {
  return (
    <div className="card" style={{cursor:"pointer"}} onClick={()=>onClick(space)}>
      <div className={`card-img ${space.bg||"bg-yard"}`}>
        <span style={{position:"relative",zIndex:1}}>{space.emoji||"🏡"}</span>
        <div style={{position:"absolute",top:12,left:12}}><span className="badge badge-gold">{space.type}</span></div>
        <button style={{position:"absolute",top:12,right:12,background:"rgba(255,255,255,0.9)",border:"none",borderRadius:"50%",width:34,height:34,fontSize:"1rem",display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer",zIndex:2}} onClick={e=>{e.stopPropagation();onFav(space.id);}}>
          {isFaved?"❤️":"🤍"}
        </button>
      </div>
      <div className="card-body">
        <div style={{fontSize:"0.72rem",color:"var(--stone)",letterSpacing:"0.06em",textTransform:"uppercase",marginBottom:4}}>📍 {space.location}</div>
        <h3 className="serif" style={{marginBottom:8,fontSize:"1.2rem"}}>{space.title}</h3>
        <div style={{display:"flex",gap:6,flexWrap:"wrap",marginBottom:14}}>
          <span className="tag">Up to {space.guests} guests</span>
          {(space.events||[]).slice(0,2).map(e=><span key={e} className="tag">{e}</span>)}
        </div>
        <div className="card-footer-row">
          <div style={{fontFamily:"Cormorant Garamond,serif",fontSize:"1.3rem",fontWeight:300}}>{fmt(space.price)} <span style={{fontFamily:"DM Sans,sans-serif",fontSize:"0.75rem",color:"var(--stone)"}}>/ day</span></div>
          {space.rating>0 && <div style={{display:"flex",alignItems:"center",gap:5,fontSize:"0.82rem",color:"var(--stone)"}}><StarRating rating={space.rating} size="0.8rem"/> {space.rating} ({space.reviews||0})</div>}
        </div>
      </div>
    </div>
  );
}

function PaymentModal({ booking, space, user, onClose, onSuccess, showToast }) {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [card, setCard] = useState({ number:"", expiry:"", cvc:"", name:"" });
  const nights = booking.checkIn&&booking.checkOut ? Math.max(1,Math.round((new Date(booking.checkOut)-new Date(booking.checkIn))/86400000)) : 1;
  const subtotal = space.price * nights;
  const serviceFee = Math.round(subtotal*0.12);
  const total = subtotal + serviceFee;
  const fmtCard = v=>v.replace(/\D/g,"").slice(0,16).replace(/(.{4})/g,"$1 ").trim();
  const fmtExp = v=>{const n=v.replace(/\D/g,"").slice(0,4);return n.length>2?n.slice(0,2)+"/"+n.slice(2):n;};

  const pay = async () => {
    setLoading(true);
    try {
      const ref = `EVR-${Date.now().toString().slice(-6)}`;
      await addDoc(collection(db, "bookings"), {
        userId: user.uid, userName: user.name, userEmail: user.email,
        spaceId: space.id, spaceTitle: space.title, spaceLocation: space.location,
        hostId: space.hostId||"", hostName: space.hostName||"", checkIn: booking.checkIn,
        checkOut: booking.checkOut, guests: booking.guests, total, subtotal, serviceFee,
        status: "confirmed", createdAt: serverTimestamp(), bookingRef: ref
      });
      await sleep(1000);
      setLoading(false);
      setStep(3);
      onSuccess({ space, booking, total, ref });
    } catch(e) { showToast("Payment failed. Please try again.", "error"); setLoading(false); }
  };

  return (
    <div className="overlay" onClick={e=>e.target===e.currentTarget&&onClose()}>
      <div className="modal modal-wide">
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:24}}>
          <div>
            <div className="section-label" style={{marginBottom:6}}>Secure Checkout</div>
            <h2 className="serif" style={{fontSize:"1.8rem",fontWeight:300}}>
              {step===1&&"Review Your Booking"}{step===2&&"Payment Details"}{step===3&&"You're Confirmed! 🎉"}
            </h2>
          </div>
          {step!==3&&<button onClick={onClose} style={{background:"none",border:"none",fontSize:"1.4rem",color:"var(--stone)"}}>×</button>}
        </div>
        {step<3&&(
          <div className="steps">
            {["Review","Payment","Confirmed"].map((s,i)=>(
              <div key={s} className={`step${i+1<step?" done":""}${i+1===step?" active":""}`}>
                <div className="step-num">{i+1<step?"✓":i+1}</div>
                <div className="step-label">{s}</div>
              </div>
            ))}
          </div>
        )}
        {step===1&&(
          <>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:20,marginBottom:24}}>
              <div className={`${space.bg||"bg-yard"} card-img`} style={{height:160,borderRadius:6,fontSize:"3rem"}}>{space.emoji||"🏡"}</div>
              <div>
                <h3 className="serif" style={{fontSize:"1.2rem",marginBottom:6}}>{space.title}</h3>
                <div style={{fontSize:"0.82rem",color:"var(--stone)",marginBottom:10}}>📍 {space.location}</div>
                <div style={{fontSize:"0.85rem",marginBottom:4}}>📅 <strong>Date:</strong> {booking.checkIn}</div>
                {booking.checkOut&&booking.checkOut!==booking.checkIn&&<div style={{fontSize:"0.85rem",marginBottom:4}}>📅 <strong>Until:</strong> {booking.checkOut}</div>}
                <div style={{fontSize:"0.85rem"}}>👥 <strong>Guests:</strong> {booking.guests}</div>
              </div>
            </div>
            <hr className="divider"/>
            <div style={{display:"flex",flexDirection:"column",gap:10,marginBottom:24}}>
              <div className="flex-between"><span style={{color:"var(--stone)"}}>{fmt(space.price)} × {nights} day{nights>1?"s":""}</span><span>{fmt(subtotal)}</span></div>
              <div className="flex-between"><span style={{color:"var(--stone)"}}>Service fee (12%)</span><span>{fmt(serviceFee)}</span></div>
              <hr className="divider" style={{margin:"8px 0"}}/>
              <div className="flex-between" style={{fontWeight:700,fontSize:"1.1rem"}}><span>Total</span><span style={{fontFamily:"Cormorant Garamond,serif",fontSize:"1.4rem"}}>{fmt(total)}</span></div>
            </div>
            <div style={{background:"var(--cream)",borderRadius:4,padding:"14px 16px",fontSize:"0.82rem",color:"var(--stone)",marginBottom:24,display:"flex",gap:10}}>
              🛡 <span><strong style={{color:"var(--bark)"}}>Booking Protection:</strong> Full refund if cancelled 48+ hours before event.</span>
            </div>
            <button className="btn btn-primary btn-block btn-lg" onClick={()=>setStep(2)}>Continue to Payment →</button>
          </>
        )}
        {step===2&&(
          <>
            <div style={{background:"var(--cream)",borderRadius:4,padding:"10px 14px",fontSize:"0.82rem",color:"var(--stone)",marginBottom:20,display:"flex",alignItems:"center",gap:8}}>
              🔒 <span>Payments processed securely via Stripe. Your card info is encrypted.</span>
            </div>
            <div className="form-group">
              <label className="form-label">Cardholder Name</label>
              <input className="form-input" placeholder="Name on card" value={card.name} onChange={e=>setCard(c=>({...c,name:e.target.value}))}/>
            </div>
            <div className="form-group">
              <label className="form-label">Card Number</label>
              <input className="form-input" placeholder="1234 5678 9012 3456" value={card.number} onChange={e=>setCard(c=>({...c,number:fmtCard(e.target.value)}))} maxLength={19}/>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Expiry</label>
                <input className="form-input" placeholder="MM/YY" value={card.expiry} onChange={e=>setCard(c=>({...c,expiry:fmtExp(e.target.value)}))} maxLength={5}/>
              </div>
              <div className="form-group">
                <label className="form-label">CVC</label>
                <input className="form-input" placeholder="123" value={card.cvc} onChange={e=>setCard(c=>({...c,cvc:e.target.value.replace(/\D/g,"").slice(0,4)}))} maxLength={4}/>
              </div>
            </div>
            <hr className="divider"/>
            <div className="flex-between" style={{fontWeight:700,fontSize:"1.1rem",marginBottom:20}}>
              <span>Total charged today</span>
              <span style={{fontFamily:"Cormorant Garamond,serif",fontSize:"1.5rem",color:"var(--terra)"}}>{fmt(total)}</span>
            </div>
            <button className="btn btn-primary btn-block btn-lg" onClick={pay} disabled={loading||!card.name||card.number.length<19||card.expiry.length<5||card.cvc.length<3}>
              {loading?<><span className="loading-spinner"/> Processing…</>:`Pay ${fmt(total)} Securely`}
            </button>
            <button className="btn btn-secondary btn-block" style={{marginTop:10}} onClick={()=>setStep(1)}>← Back</button>
          </>
        )}
        {step===3&&(
          <div style={{textAlign:"center"}}>
            <div style={{fontSize:"4rem",marginBottom:20}}>🎉</div>
            <h3 className="serif" style={{fontSize:"1.6rem",marginBottom:12}}>Booking Confirmed!</h3>
            <p style={{color:"var(--stone)",marginBottom:24,lineHeight:1.7}}>
              Your booking for <strong>{space.title}</strong> is confirmed.<br/>
              A confirmation has been sent to <strong>{user.email}</strong>.<br/>
              The host will contact you within 24 hours.
            </p>
            <div style={{background:"var(--cream)",borderRadius:6,padding:20,marginBottom:28,textAlign:"left"}}>
              <div style={{display:"flex",flexDirection:"column",gap:8}}>
                <div className="flex-between"><span style={{color:"var(--stone)",fontSize:"0.85rem"}}>Space</span><span>{space.title}</span></div>
                <div className="flex-between"><span style={{color:"var(--stone)",fontSize:"0.85rem"}}>Date</span><span>{booking.checkIn}</span></div>
                <div className="flex-between"><span style={{color:"var(--stone)",fontSize:"0.85rem"}}>Guests</span><span>{booking.guests}</span></div>
                <div className="flex-between"><span style={{color:"var(--stone)",fontSize:"0.85rem"}}>Amount paid</span><span style={{color:"var(--green)",fontWeight:600}}>{fmt(total)}</span></div>
              </div>
            </div>
            <button className="btn btn-primary btn-lg" onClick={onClose}>Done</button>
          </div>
        )}
      </div>
    </div>
  );
}

function SpaceDetail({ space, user, onBack, onBook, showAuth }) {
  const [checkIn, setCheckIn] = useState("");
  const [checkOut, setCheckOut] = useState("");
  const [guests, setGuests] = useState(2);
  const [calSelect, setCalSelect] = useState("checkin");
  const nights = checkIn&&checkOut ? Math.max(1,Math.round((new Date(checkOut)-new Date(checkIn))/86400000)) : 1;
  const subtotal = space.price * nights;
  const serviceFee = Math.round(subtotal*0.12);
  const handleCalSelect = (date) => {
    if (calSelect==="checkin"||!checkIn) { setCheckIn(date); setCheckOut(""); setCalSelect("checkout"); }
    else { if(date<=checkIn){setCheckIn(date);setCheckOut("");setCalSelect("checkout");}else{setCheckOut(date);setCalSelect("checkin");} }
  };
  return (
    <div>
      <button onClick={onBack} className="btn btn-secondary btn-sm" style={{marginBottom:20}}>← Back to Listings</button>
      <div className={`detail-hero ${space.bg||"bg-yard"}`} style={{marginBottom:32}}>
        <span style={{fontSize:"7rem"}}>{space.emoji||"🏡"}</span>
        <div style={{position:"absolute",bottom:20,left:20,display:"flex",gap:8}}>
          <span className="badge badge-gold">{space.type}</span>
          <span className="badge badge-cream">Up to {space.guests} guests</span>
        </div>
      </div>
      <div className="detail-grid">
        <div>
          <div style={{marginBottom:24}}>
            <div style={{fontSize:"0.78rem",color:"var(--stone)",marginBottom:6,letterSpacing:"0.06em",textTransform:"uppercase"}}>📍 {space.location}</div>
            <h1 className="serif" style={{fontSize:"clamp(2rem,4vw,3rem)",fontWeight:300,marginBottom:8}}>{space.title}</h1>
            <div style={{display:"flex",alignItems:"center",gap:12,flexWrap:"wrap"}}>
              {space.rating>0&&<div style={{display:"flex",alignItems:"center",gap:6}}><StarRating rating={space.rating}/> <span style={{fontWeight:600}}>{space.rating}</span> <span style={{color:"var(--stone)"}}>({space.reviews||0} reviews)</span></div>}
              <span style={{color:"var(--stone)",fontSize:"0.88rem"}}>Hosted by {space.hostName}</span>
            </div>
          </div>
          <hr className="divider"/>
          {space.description&&<div style={{marginBottom:28}}><h3 className="serif" style={{fontSize:"1.3rem",marginBottom:14}}>About this space</h3><p style={{lineHeight:1.75,color:"var(--stone)"}}>{space.description}</p></div>}
          {space.amenities&&space.amenities.length>0&&<div style={{marginBottom:28}}><h3 className="serif" style={{fontSize:"1.3rem",marginBottom:14}}>Amenities</h3><div className="amenity-grid">{space.amenities.map(a=><div key={a} className="amenity">✓ {a}</div>)}</div></div>}
          {space.events&&space.events.length>0&&<div style={{marginBottom:28}}><h3 className="serif" style={{fontSize:"1.3rem",marginBottom:14}}>Perfect for</h3><div style={{display:"flex",gap:8,flexWrap:"wrap"}}>{space.events.map(e=><span key={e} className="badge badge-cream" style={{fontSize:"0.82rem",padding:"6px 14px"}}>{e}</span>)}</div></div>}
          <hr className="divider"/>
          <div><h3 className="serif" style={{fontSize:"1.3rem",marginBottom:16}}>Select Your Date</h3><Calendar bookedDates={space.booked||[]} onSelect={handleCalSelect} checkIn={checkIn} checkOut={checkOut}/></div>
        </div>
        <div className="booking-panel">
          <div style={{fontFamily:"Cormorant Garamond,serif",fontSize:"1.6rem",fontWeight:300,marginBottom:4}}>{fmt(space.price)} <span style={{fontFamily:"DM Sans,sans-serif",fontSize:"0.85rem",color:"var(--stone)",fontWeight:300}}>/ day</span></div>
          {space.rating>0&&<div style={{display:"flex",alignItems:"center",gap:6,marginBottom:20,fontSize:"0.82rem",color:"var(--stone)"}}><StarRating rating={space.rating} size="0.8rem"/> {space.rating} · {space.reviews||0} reviews</div>}
          <div style={{border:"1.5px solid var(--sand)",borderRadius:4,overflow:"hidden",marginBottom:12}}>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr"}}>
              <div style={{padding:"12px 14px",borderRight:"1px solid var(--sand)",borderBottom:"1px solid var(--sand)"}}>
                <div style={{fontSize:"0.65rem",fontWeight:700,letterSpacing:"0.1em",textTransform:"uppercase",color:"var(--terra)",marginBottom:4}}>Check-in</div>
                <div style={{fontSize:"0.9rem",fontWeight:500}}>{checkIn||"Select date"}</div>
              </div>
              <div style={{padding:"12px 14px",borderBottom:"1px solid var(--sand)"}}>
                <div style={{fontSize:"0.65rem",fontWeight:700,letterSpacing:"0.1em",textTransform:"uppercase",color:"var(--terra)",marginBottom:4}}>Check-out</div>
                <div style={{fontSize:"0.9rem",fontWeight:500}}>{checkOut||"Select date"}</div>
              </div>
            </div>
            <div style={{padding:"12px 14px"}}>
              <div style={{fontSize:"0.65rem",fontWeight:700,letterSpacing:"0.1em",textTransform:"uppercase",color:"var(--terra)",marginBottom:4}}>Guests</div>
              <select className="form-input" style={{border:"none",padding:"0",fontSize:"0.9rem",width:"100%"}} value={guests} onChange={e=>setGuests(Number(e.target.value))}>
                {Array.from({length:Math.min(space.guests,20)},(_,i)=>i+1).map(n=><option key={n} value={n}>{n} guest{n>1?"s":""}</option>)}
                {space.guests>20&&<option value={50}>50+ guests</option>}
              </select>
            </div>
          </div>
          <button className="btn btn-primary btn-block btn-lg" onClick={()=>{ if(!user){showAuth();return;} if(!checkIn){alert("Please select a date.");return;} onBook({checkIn,checkOut:checkOut||checkIn,guests}); }} style={{marginBottom:12}}>
            {user?"Reserve This Space":"Sign In to Book"}
          </button>
          {checkIn&&(
            <div style={{display:"flex",flexDirection:"column",gap:8,fontSize:"0.85rem",padding:"16px 0"}}>
              <div className="flex-between"><span style={{color:"var(--stone)"}}>{fmt(space.price)} × {nights} day{nights>1?"s":""}</span><span>{fmt(subtotal)}</span></div>
              <div className="flex-between"><span style={{color:"var(--stone)"}}>Service fee</span><span>{fmt(serviceFee)}</span></div>
              <hr className="divider" style={{margin:"6px 0"}}/>
              <div className="flex-between" style={{fontWeight:700}}><span>Total</span><span style={{fontFamily:"Cormorant Garamond,serif",fontSize:"1.2rem"}}>{fmt(subtotal+serviceFee)}</span></div>
            </div>
          )}
          <p style={{fontSize:"0.75rem",color:"var(--stone)",textAlign:"center",marginTop:8}}>🛡 Free cancellation 48+ hours before event</p>
          <hr className="divider"/>
          <div style={{display:"flex",alignItems:"center",gap:10}}>
            <div style={{width:40,height:40,borderRadius:"50%",background:"linear-gradient(135deg,var(--moss),var(--terra))",display:"flex",alignItems:"center",justifyContent:"center",color:"#fff",fontWeight:600}}>{(space.hostName||"H")[0]}</div>
            <div>
              <div style={{fontWeight:600,fontSize:"0.9rem"}}>{space.hostName}</div>
              <div style={{fontSize:"0.75rem",color:"var(--stone)"}}>Verified Host</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function BrowsePage({ user, allSpaces, onViewSpace, showAuth }) {
  const [search, setSearch] = useState("");
  const [eventFilter, setEventFilter] = useState("All");
  const [maxPrice, setMaxPrice] = useState(5000);
  const [favs, setFavs] = useState([]);
  const eventTypes = ["All","Wedding","Birthday","Baby Shower","Graduation","Corporate"];
  const filtered = allSpaces.filter(s => {
    const ms = s.title.toLowerCase().includes(search.toLowerCase())||s.location.toLowerCase().includes(search.toLowerCase());
    const me = eventFilter==="All"||(s.events||[]).some(e=>e.toLowerCase().includes(eventFilter.toLowerCase()));
    return ms&&me&&s.price<=maxPrice;
  });
  const toggleFav = id => setFavs(f=>f.includes(id)?f.filter(x=>x!==id):[...f,id]);
  return (
    <div>
      <div className="search-hero">
        <div style={{position:"relative",zIndex:1,marginBottom:32}}>
          <div className="section-label" style={{color:"var(--gold)"}}>Find Your Perfect Space</div>
          <h1 className="serif" style={{fontSize:"clamp(2.5rem,6vw,4.5rem)",fontWeight:300,color:"var(--cream)",lineHeight:1.1,marginBottom:8}}>Where will you<br/><em>celebrate?</em></h1>
        </div>
        <div className="search-box">
          <div className="search-field">
            <label>Location or Name</label>
            <input type="text" placeholder="City, state or space name" value={search} onChange={e=>setSearch(e.target.value)}/>
          </div>
          <div className="search-field">
            <label>Event Type</label>
            <select value={eventFilter} onChange={e=>setEventFilter(e.target.value)}>
              {eventTypes.map(t=><option key={t}>{t}</option>)}
            </select>
          </div>
          <div className="search-field" style={{borderRight:"none"}}>
            <label>Max Price</label>
            <select value={maxPrice} onChange={e=>setMaxPrice(Number(e.target.value))}>
              <option value={5000}>Any price</option>
              <option value={300}>Under $300</option>
              <option value={600}>Under $600</option>
              <option value={1000}>Under $1,000</option>
              <option value={2000}>Under $2,000</option>
            </select>
          </div>
          <button className="search-submit">🔍</button>
        </div>
        <div className="stat-row">
          <div className="stat-item"><strong>{allSpaces.length}</strong><span>Spaces Listed</span></div>
          <div className="stat-item"><strong>4.9★</strong><span>Avg. Rating</span></div>
          <div className="stat-item"><strong>Free</strong><span>To Browse</span></div>
        </div>
      </div>
      <div style={{padding:"24px 5%",background:"var(--cream)",display:"flex",gap:8,flexWrap:"wrap",alignItems:"center"}}>
        <span style={{fontSize:"0.8rem",fontWeight:600,color:"var(--stone)",textTransform:"uppercase",letterSpacing:"0.08em",marginRight:4}}>Filter:</span>
        {eventTypes.map(t=>(
          <button key={t} onClick={()=>setEventFilter(t)} style={{padding:"6px 14px",borderRadius:2,border:`1.5px solid ${eventFilter===t?"var(--terra)":"var(--sand)"}`,background:eventFilter===t?"var(--terra)":"#fff",color:eventFilter===t?"#fff":"var(--bark)",fontSize:"0.78rem",cursor:"pointer",transition:"all 0.2s"}}>{t}</button>
        ))}
      </div>
      <div className="section">
        {filtered.length===0 ? (
          <div className="empty-state">
            <div className="icon">🌿</div>
            <h2 className="serif" style={{fontSize:"1.8rem",fontWeight:300,marginBottom:16}}>No spaces listed yet</h2>
            <p style={{color:"var(--stone)",marginBottom:28,lineHeight:1.7,maxWidth:400,margin:"0 auto 28px"}}>
              Be the first to list your backyard, barn, or private land!<br/>Sign up as a host and start earning today.
            </p>
            <button className="btn btn-primary btn-lg" onClick={showAuth}>List Your Space →</button>
          </div>
        ) : (
          <>
            <div className="flex-between" style={{marginBottom:28}}>
              <h2 className="serif" style={{fontSize:"clamp(1.5rem,3vw,2.2rem)",fontWeight:300}}>{filtered.length} space{filtered.length!==1?"s":""} <em style={{color:"var(--moss)"}}>available</em></h2>
            </div>
            <div className="grid-3">{filtered.map(s=><SpaceCard key={s.id} space={s} onClick={onViewSpace} onFav={toggleFav} isFaved={favs.includes(s.id)}/>)}</div>
          </>
        )}
      </div>
      {allSpaces.length===0&&(
        <div style={{background:"var(--bark)",padding:"60px 5%",textAlign:"center"}}>
          <h2 className="serif" style={{fontSize:"2rem",fontWeight:300,color:"var(--cream)",marginBottom:16}}>Own a backyard, barn, or land?</h2>
          <p style={{color:"rgba(245,240,232,0.7)",marginBottom:28,fontSize:"0.95rem"}}>List your space on Yard Events and start earning. Hosts earn an average of $480 per booking.</p>
          <button className="btn btn-primary btn-lg" onClick={showAuth}>Become a Host →</button>
        </div>
      )}
    </div>
  );
}

function ListSpaceModal({ existing, user, onClose, onSave }) {
  const bgs = ["bg-yard","bg-barn","bg-lake","bg-garden","bg-ranch","bg-estate","bg-moss"];
  const emojis = ["🌿","🏚","🌊","🌸","🐎","✨","🌳","🏡","🌻","🎋"];
  const [form, setForm] = useState(existing||{title:"",location:"",type:"Backyard",price:"",guests:"",description:"",events:[],bg:"bg-yard",emoji:"🏡",amenities:""});
  const [loading, setLoading] = useState(false);
  const upd = (k,v) => setForm(f=>({...f,[k]:v}));
  const toggleEvent = e => upd("events",form.events.includes(e)?form.events.filter(x=>x!==e):[...form.events,e]);
  const submit = async () => {
    if(!form.title||!form.location||!form.price){return;}
    setLoading(true);
    await onSave({...form,price:Number(form.price),guests:Number(form.guests),amenities:form.amenities?form.amenities.split(",").map(a=>a.trim()).filter(Boolean):[]});
    setLoading(false);
  };
  return (
    <div className="overlay" onClick={e=>e.target===e.currentTarget&&onClose()}>
      <div className="modal modal-wide">
        <div className="flex-between" style={{marginBottom:24}}>
          <div>
            <div className="section-label" style={{marginBottom:6}}>{existing?"Edit Listing":"New Listing"}</div>
            <h2 className="serif" style={{fontSize:"1.8rem",fontWeight:300}}>{existing?"Update your space":"List your space"}</h2>
          </div>
          <button onClick={onClose} style={{background:"none",border:"none",fontSize:"1.4rem",color:"var(--stone)"}}>×</button>
        </div>
        <div className="form-row">
          <div className="form-group"><label className="form-label">Space Name *</label><input className="form-input" placeholder="e.g. The Sundown Garden" value={form.title} onChange={e=>upd("title",e.target.value)}/></div>
          <div className="form-group"><label className="form-label">Location *</label><input className="form-input" placeholder="City, State" value={form.location} onChange={e=>upd("location",e.target.value)}/></div>
        </div>
        <div className="form-row">
          <div className="form-group">
            <label className="form-label">Space Type</label>
            <select className="form-input" value={form.type} onChange={e=>upd("type",e.target.value)}>
              {["Backyard","Barn","Private Land","Garden","Ranch","Estate","Other"].map(t=><option key={t}>{t}</option>)}
            </select>
          </div>
          <div className="form-group"><label className="form-label">Max Guests</label><input className="form-input" type="number" placeholder="e.g. 75" value={form.guests} onChange={e=>upd("guests",e.target.value)}/></div>
        </div>
        <div className="form-group">
          <label className="form-label">Price per Day (USD) *</label>
          <input className="form-input" type="number" placeholder="350" value={form.price} onChange={e=>upd("price",e.target.value)}/>
          <span className="form-hint">You keep 88% after the 12% platform fee.</span>
        </div>
        <div className="form-group"><label className="form-label">Description</label><textarea className="form-input" placeholder="Describe your space — what makes it special, what's included, any rules..." value={form.description} onChange={e=>upd("description",e.target.value)}/></div>
        <div className="form-group"><label className="form-label">Amenities (comma separated)</label><input className="form-input" placeholder="Parking, Fire pit, Tables & chairs, String lights" value={form.amenities} onChange={e=>upd("amenities",e.target.value)}/></div>
        <div className="form-group">
          <label className="form-label">Great For</label>
          <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
            {["Wedding","Birthday","Baby Shower","Graduation","Corporate","Bridal Shower","Holiday Party"].map(ev=>(
              <button key={ev} type="button" onClick={()=>toggleEvent(ev)} style={{padding:"7px 14px",borderRadius:2,border:`1.5px solid ${form.events.includes(ev)?"var(--terra)":"var(--sand)"}`,background:form.events.includes(ev)?"var(--terra)":"#fff",color:form.events.includes(ev)?"#fff":"var(--bark)",fontSize:"0.78rem",cursor:"pointer",transition:"all 0.2s"}}>{ev}</button>
            ))}
          </div>
        </div>
        <div className="form-row">
          <div className="form-group">
            <label className="form-label">Card Color</label>
            <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>{bgs.map(bg=><div key={bg} onClick={()=>upd("bg",bg)} className={bg} style={{width:32,height:32,borderRadius:3,cursor:"pointer",border:`3px solid ${form.bg===bg?"var(--terra)":"transparent"}`,transition:"all 0.2s"}}/>)}</div>
          </div>
          <div className="form-group">
            <label className="form-label">Emoji</label>
            <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>{emojis.map(e=><button key={e} type="button" onClick={()=>upd("emoji",e)} style={{fontSize:"1.2rem",padding:"4px 6px",border:`2px solid ${form.emoji===e?"var(--terra)":"var(--sand)"}`,borderRadius:3,background:"#fff",cursor:"pointer"}}>{e}</button>)}</div>
          </div>
        </div>
        <div style={{display:"flex",gap:12,marginTop:8}}>
          <button className="btn btn-primary btn-lg" style={{flex:1}} onClick={submit} disabled={loading||!form.title||!form.location||!form.price}>
            {loading?<><span className="loading-spinner"/> Saving…</>:existing?"Update Listing":"Publish Space 🎉"}
          </button>
          <button className="btn btn-secondary btn-lg" onClick={onClose}>Cancel</button>
        </div>
      </div>
    </div>
  );
}

function HostDashboard({ user, showToast, onSpacesUpdate }) {
  const [activeTab, setActiveTab] = useState("overview");
  const [myListings, setMyListings] = useState([]);
  const [myBookings, setMyBookings] = useState([]);
  const [showListForm, setShowListForm] = useState(false);
  const [editListing, setEditListing] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => { loadData(); }, [user]);

  const loadData = async () => {
    setLoading(true);
    try {
      const lq = query(collection(db,"listings"), where("hostId","==",user.uid));
      const lsnap = await getDocs(lq);
      const listings = lsnap.docs.map(d=>({id:d.id,...d.data()}));
      setMyListings(listings);
      const bq = query(collection(db,"bookings"), where("hostId","==",user.uid));
      const bsnap = await getDocs(bq);
      setMyBookings(bsnap.docs.map(d=>({id:d.id,...d.data()})));
    } catch(e) { console.log(e); }
    setLoading(false);
  };

  const totalEarnings = myBookings.reduce((sum,b)=>sum+(b.total||0)*0.88,0);
  const tabs = [{id:"overview",label:"Overview",icon:"📊"},{id:"listings",label:"My Spaces",icon:"🏡"},{id:"bookings",label:"Bookings",icon:"📅"},{id:"earnings",label:"Earnings",icon:"💰"}];

  return (
    <div className="section">
      <div style={{marginBottom:28}}>
        <div className="section-label">Host Portal</div>
        <h2 className="serif" style={{fontSize:"clamp(1.6rem,3vw,2.4rem)",fontWeight:300}}>Welcome back, <em style={{color:"var(--terra)"}}>{user.name.split(" ")[0]}</em></h2>
      </div>
      <div style={{display:"flex",gap:32,flexWrap:"wrap"}}>
        <div style={{width:200,flexShrink:0}}>
          <div className="dash-nav">
            {tabs.map(t=><button key={t.id} className={`dash-nav-item${activeTab===t.id?" active":""}`} onClick={()=>setActiveTab(t.id)}><span>{t.icon}</span>{t.label}</button>)}
          </div>
          <hr className="divider"/>
          <div style={{background:"var(--cream)",borderRadius:4,padding:16,fontSize:"0.82rem",color:"var(--stone)"}}>
            <div style={{fontWeight:700,color:"var(--bark)",marginBottom:6}}>✓ Verified Host</div>
            <div>{user.name}</div>
            <div style={{fontSize:"0.75rem",marginTop:4}}>{user.email}</div>
          </div>
        </div>
        <div style={{flex:1,minWidth:0}}>
          {loading&&<div style={{textAlign:"center",padding:40,color:"var(--stone)"}}>Loading…</div>}
          {!loading&&activeTab==="overview"&&(
            <div>
              <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(140px,1fr))",gap:16,marginBottom:32}}>
                {[{label:"Total Earnings",value:fmt(totalEarnings),icon:"💰",color:"var(--green)"},{label:"Active Listings",value:myListings.length,icon:"🏡",color:"var(--moss)"},{label:"Total Bookings",value:myBookings.length,icon:"📅",color:"var(--terra)"},{label:"Avg. Rating",value:"New",icon:"⭐",color:"var(--gold)"}].map(s=>(
                  <div key={s.label} style={{background:"#fff",borderRadius:6,padding:"20px 18px",boxShadow:"0 2px 12px var(--shadow)"}}>
                    <div style={{fontSize:"1.5rem",marginBottom:8}}>{s.icon}</div>
                    <div style={{fontFamily:"Cormorant Garamond,serif",fontSize:"1.8rem",fontWeight:300,color:s.color}}>{s.value}</div>
                    <div style={{fontSize:"0.75rem",color:"var(--stone)",marginTop:2}}>{s.label}</div>
                  </div>
                ))}
              </div>
              <button className="btn btn-primary btn-lg" onClick={()=>{setEditListing(null);setShowListForm(true);}}>+ List New Space</button>
            </div>
          )}
          {!loading&&activeTab==="listings"&&(
            <div>
              <div className="flex-between" style={{marginBottom:20}}>
                <h3 className="serif" style={{fontSize:"1.3rem"}}>My Spaces ({myListings.length})</h3>
                <button className="btn btn-primary btn-sm" onClick={()=>{setEditListing(null);setShowListForm(true);}}>+ Add New Space</button>
              </div>
              {myListings.length===0?(
                <div className="empty-state">
                  <div className="icon">🏡</div>
                  <h3 className="serif" style={{marginBottom:12}}>No spaces listed yet</h3>
                  <p style={{color:"var(--stone)",marginBottom:24}}>List your first space and start earning.</p>
                  <button className="btn btn-primary" onClick={()=>setShowListForm(true)}>List My First Space</button>
                </div>
              ):(
                <div className="grid-2">
                  {myListings.map(l=>(
                    <div key={l.id} style={{background:"#fff",borderRadius:6,overflow:"hidden",boxShadow:"0 2px 12px var(--shadow)"}}>
                      <div className={`card-img ${l.bg||"bg-yard"}`} style={{height:140,fontSize:"2.5rem"}}>{l.emoji||"🏡"}</div>
                      <div style={{padding:16}}>
                        <div className="flex-between" style={{marginBottom:8}}>
                          <h3 className="serif" style={{fontSize:"1.1rem"}}>{l.title}</h3>
                          <span className="badge badge-green">Active</span>
                        </div>
                        <div style={{fontSize:"0.8rem",color:"var(--stone)",marginBottom:12}}>📍 {l.location} · {fmt(l.price)}/day · Up to {l.guests} guests</div>
                        <div style={{display:"flex",gap:8}}>
                          <button className="btn btn-secondary btn-sm" onClick={()=>{setEditListing(l);setShowListForm(true);}}>Edit</button>
                          <button className="btn btn-danger btn-sm" onClick={async()=>{await deleteDoc(doc(db,"listings",l.id));setMyListings(prev=>prev.filter(x=>x.id!==l.id));onSpacesUpdate();showToast("Listing removed.","default");}}>Remove</button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
          {!loading&&activeTab==="bookings"&&(
            <div>
              <h3 className="serif" style={{fontSize:"1.3rem",marginBottom:20}}>Incoming Bookings ({myBookings.length})</h3>
              {myBookings.length===0?(
                <div style={{textAlign:"center",padding:"40px",color:"var(--stone)"}}>No bookings yet. Once guests book your space they'll appear here!</div>
              ):(
                <div style={{background:"#fff",borderRadius:6,boxShadow:"0 2px 12px var(--shadow)",padding:"8px 20px"}}>
                  {myBookings.map((b,i)=>(
                    <div key={i} className="booking-row">
                      <div style={{width:40,height:40,borderRadius:"50%",background:"var(--cream)",display:"flex",alignItems:"center",justifyContent:"center",fontWeight:700,color:"var(--terra)",flexShrink:0}}>{(b.userName||"G")[0]}</div>
                      <div style={{flex:1}}>
                        <div style={{fontWeight:600,fontSize:"0.9rem"}}>{b.userName}</div>
                        <div style={{fontSize:"0.78rem",color:"var(--stone)"}}>{b.spaceTitle} · {b.checkIn} · {b.guests} guests</div>
                      </div>
                      <div style={{textAlign:"right"}}>
                        <div style={{fontFamily:"Cormorant Garamond,serif",fontSize:"1.1rem",color:"var(--green)"}}>{fmt((b.total||0)*0.88)}</div>
                        <span className="badge badge-green">{b.status}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
          {!loading&&activeTab==="earnings"&&(
            <div>
              <h3 className="serif" style={{fontSize:"1.3rem",marginBottom:20}}>Earnings Summary</h3>
              <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(140px,1fr))",gap:16,marginBottom:28}}>
                {[{label:"Total Earned",value:fmt(totalEarnings)},{label:"Bookings",value:myBookings.length},{label:"Platform Fee",value:"12%"}].map(e=>(
                  <div key={e.label} style={{background:"#fff",borderRadius:6,padding:20,boxShadow:"0 2px 12px var(--shadow)",textAlign:"center"}}>
                    <div style={{fontFamily:"Cormorant Garamond,serif",fontSize:"1.8rem",color:"var(--green)",marginBottom:4}}>{e.value}</div>
                    <div style={{fontSize:"0.75rem",color:"var(--stone)",textTransform:"uppercase",letterSpacing:"0.08em"}}>{e.label}</div>
                  </div>
                ))}
              </div>
              <div style={{background:"var(--cream)",borderRadius:4,padding:"14px 16px",fontSize:"0.82rem",color:"var(--stone)"}}>
                💳 Payouts are sent to your bank account within 24 hours of each completed event.
              </div>
            </div>
          )}
        </div>
      </div>
      {showListForm&&(
        <ListSpaceModal existing={editListing} user={user} onClose={()=>{setShowListForm(false);setEditListing(null);}}
          onSave={async(listing)=>{
            try {
              if(editListing){
                await updateDoc(doc(db,"listings",editListing.id),{...listing,updatedAt:serverTimestamp()});
                setMyListings(prev=>prev.map(l=>l.id===editListing.id?{...listing,id:editListing.id}:l));
                showToast("Listing updated!","success");
              } else {
                const ref = await addDoc(collection(db,"listings"),{...listing,hostId:user.uid,hostName:user.name,hostEmail:user.email,rating:0,reviews:0,booked:[],createdAt:serverTimestamp()});
                setMyListings(prev=>[...prev,{id:ref.id,...listing,hostId:user.uid,hostName:user.name,rating:0,reviews:0,booked:[]}]);
                showToast("Space listed! 🎉","success");
              }
              onSpacesUpdate();
              setShowListForm(false);setEditListing(null);
            } catch(e){showToast("Error saving listing.","error");}
          }}
        />
      )}
    </div>
  );
}

function GuestDashboard({ user }) {
  const [myBookings, setMyBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const q = query(collection(db,"bookings"), where("userId","==",user.uid), orderBy("createdAt","desc"));
        const snap = await getDocs(q);
        setMyBookings(snap.docs.map(d=>({id:d.id,...d.data()})));
      } catch(e) { console.log(e); }
      setLoading(false);
    };
    load();
  }, [user]);
  return (
    <div className="section">
      <div style={{marginBottom:28}}>
        <div className="section-label">My Account</div>
        <h2 className="serif" style={{fontSize:"clamp(1.6rem,3vw,2.4rem)",fontWeight:300}}>Hi, <em style={{color:"var(--terra)"}}>{user.name.split(" ")[0]}</em> 👋</h2>
      </div>
      {loading&&<div style={{textAlign:"center",padding:40,color:"var(--stone)"}}>Loading your bookings…</div>}
      {!loading&&myBookings.length===0&&(
        <div className="empty-state">
          <div className="icon">🗓</div>
          <h3 className="serif" style={{marginBottom:12}}>No bookings yet</h3>
          <p style={{color:"var(--stone)"}}>Browse spaces and book your first event venue!</p>
        </div>
      )}
      {!loading&&myBookings.length>0&&(
        <div style={{display:"flex",flexDirection:"column",gap:16}}>
          {myBookings.map((b,i)=>(
            <div key={i} style={{background:"#fff",borderRadius:6,boxShadow:"0 2px 12px var(--shadow)",padding:20,display:"flex",gap:20,alignItems:"center",flexWrap:"wrap"}}>
              <div style={{width:80,height:60,borderRadius:4,background:"linear-gradient(135deg,var(--moss),var(--terra))",display:"flex",alignItems:"center",justifyContent:"center",fontSize:"1.8rem",flexShrink:0}}>🌿</div>
              <div style={{flex:1}}>
                <h3 className="serif" style={{fontSize:"1.1rem",marginBottom:4}}>{b.spaceTitle}</h3>
                <div style={{fontSize:"0.82rem",color:"var(--stone)",marginBottom:4}}>📍 {b.spaceLocation} · 📅 {b.checkIn} · 👥 {b.guests} guests</div>
                <div style={{fontSize:"0.78rem",color:"var(--stone)"}}>Ref: {b.bookingRef}</div>
              </div>
              <div style={{textAlign:"right"}}>
                <div style={{fontFamily:"Cormorant Garamond,serif",fontSize:"1.3rem",color:"var(--green)"}}>{fmt(b.total)}</div>
                <span className="badge badge-green">{b.status}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function ContactPage({ showToast }) {
  const [form, setForm] = useState({ name:"", email:"", subject:"", message:"" });
  const [loading, setLoading] = useState(false);
  const upd = (k,v) => setForm(f=>({...f,[k]:v}));
  const submit = async () => {
    if(!form.name||!form.email||!form.message) return;
    setLoading(true);
    try {
      await addDoc(collection(db,"contacts"), { ...form, createdAt: serverTimestamp() });
      showToast("Message sent! We'll get back to you within 24 hours. 🎉", "success");
      setForm({ name:"", email:"", subject:"", message:"" });
    } catch(e) { showToast("Error sending message. Please try again.", "error"); }
    setLoading(false);
  };
  return (
    <div className="section" style={{maxWidth:900,margin:"0 auto"}}>
      <div style={{marginBottom:40}}>
        <div className="section-label">Get In Touch</div>
        <h1 className="serif" style={{fontSize:"clamp(2rem,4vw,3rem)",fontWeight:300,marginBottom:16}}>We're here to <em style={{color:"var(--terra)"}}>help</em></h1>
        <p style={{color:"var(--stone)",fontSize:"0.95rem",lineHeight:1.7}}>Have a question about booking or listing? Send us a message and we'll get back to you within 24 hours.</p>
      </div>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:40}}>
        <div>
          <div className="form-group"><label className="form-label">Your Name *</label><input className="form-input" placeholder="Your name" value={form.name} onChange={e=>upd("name",e.target.value)}/></div>
          <div className="form-group"><label className="form-label">Email Address *</label><input className="form-input" type="email" placeholder="you@email.com" value={form.email} onChange={e=>upd("email",e.target.value)}/></div>
          <div className="form-group">
            <label className="form-label">Subject</label>
            <select className="form-input" value={form.subject} onChange={e=>upd("subject",e.target.value)}>
              <option value="">Select a topic</option>
              <option>Booking Question</option>
              <option>Listing My Space</option>
              <option>Payment Issue</option>
              <option>Cancellation Request</option>
              <option>Report a Problem</option>
              <option>General Question</option>
            </select>
          </div>
          <div className="form-group"><label className="form-label">Message *</label><textarea className="form-input" placeholder="Tell us how we can help..." value={form.message} onChange={e=>upd("message",e.target.value)} style={{minHeight:140}}/></div>
          <button className="btn btn-primary btn-lg btn-block" onClick={submit} disabled={loading||!form.name||!form.email||!form.message}>
            {loading?"Sending…":"Send Message →"}
          </button>
        </div>
        <div>
          <div style={{background:"var(--cream)",borderRadius:6,padding:28,marginBottom:20}}>
            <h3 className="serif" style={{fontSize:"1.2rem",marginBottom:16}}>Contact Info</h3>
            {[["📧","Email","hello@yardevents.net"],["🌐","Website","yardevents.net"],["⏰","Response Time","Within 24 hours"],["📍","Based in","Perrysburg, Ohio"]].map(([icon,label,val])=>(
              <div key={label} style={{display:"flex",gap:12,marginBottom:16}}>
                <span style={{fontSize:"1.2rem"}}>{icon}</span>
                <div>
                  <div style={{fontSize:"0.72rem",fontWeight:700,letterSpacing:"0.1em",textTransform:"uppercase",color:"var(--terra)",marginBottom:2}}>{label}</div>
                  <div style={{fontSize:"0.9rem",color:"var(--bark)"}}>{val}</div>
                </div>
              </div>
            ))}
          </div>
          <div style={{background:"var(--bark)",borderRadius:6,padding:28,color:"var(--cream)"}}>
            <h3 className="serif" style={{fontSize:"1.2rem",marginBottom:12,color:"var(--gold)"}}>Are you a Host?</h3>
            <p style={{fontSize:"0.88rem",lineHeight:1.7,color:"rgba(245,240,232,0.75)",marginBottom:16}}>List your backyard, barn, or private land and start earning today.</p>
            <div style={{fontSize:"0.82rem",color:"var(--gold)"}}>→ Sign up and click "List My Space"</div>
          </div>
        </div>
      </div>
    </div>
  );
}

function HelpPage() {
  const [open, setOpen] = useState(null);
  const faqs = [
    { category:"For Guests", items:[
      { q:"How do I book a space?", a:"Browse spaces, click on one you like, select your date, choose your guest count, then click Reserve This Space. You need a free account and payment to confirm." },
      { q:"How much does it cost?", a:"Each space sets their own daily rate. You also pay a 12% service fee which covers booking protection and customer support. The total is always shown before you pay." },
      { q:"Can I cancel my booking?", a:"Yes! Full refund if you cancel at least 48 hours before your event. Cancellations within 48 hours are subject to the host's policy." },
      { q:"How do I contact the host?", a:"Once your booking is confirmed, the host's contact info is shared so you can coordinate setup, parking, and special requests." },
    ]},
    { category:"For Hosts", items:[
      { q:"How do I list my space?", a:"Create an account, select Host as your role, then click List My Space in your Host Dashboard. Fill in your space details, pricing, and availability." },
      { q:"How much can I earn?", a:"You keep 88% of every booking — we charge a 12% platform fee. Payouts are sent to your bank within 24 hours of each completed event." },
      { q:"What are my responsibilities?", a:"Keep your listing accurate, respond to guests promptly, ensure the space is clean and ready, and be available on event day." },
    ]},
    { category:"Payments & Safety", items:[
      { q:"Is my payment information safe?", a:"Yes! All payments are processed by Stripe, one of the world's most trusted payment platforms. Your card info is never stored on our servers." },
      { q:"What payment methods do you accept?", a:"All major credit and debit cards including Visa, Mastercard, American Express, and Discover." },
    ]},
  ];
  return (
    <div className="section" style={{maxWidth:800,margin:"0 auto"}}>
      <div style={{marginBottom:40}}>
        <div className="section-label">Help Center</div>
        <h1 className="serif" style={{fontSize:"clamp(2rem,4vw,3rem)",fontWeight:300,marginBottom:16}}>Frequently Asked <em style={{color:"var(--terra)"}}>Questions</em></h1>
      </div>
      {faqs.map((section,si)=>(
        <div key={si} style={{marginBottom:40}}>
          <h2 className="serif" style={{fontSize:"1.4rem",marginBottom:20,color:"var(--moss)"}}>{section.category}</h2>
          <div style={{display:"flex",flexDirection:"column",gap:8}}>
            {section.items.map((faq,fi)=>{
              const id=`${si}-${fi}`;
              return (
                <div key={fi} style={{border:"1px solid var(--sand)",borderRadius:4,overflow:"hidden",background:"#fff"}}>
                  <button onClick={()=>setOpen(open===id?null:id)} style={{width:"100%",padding:"16px 20px",display:"flex",justifyContent:"space-between",alignItems:"center",background:"none",border:"none",textAlign:"left",cursor:"pointer",fontWeight:500,fontSize:"0.92rem",color:"var(--bark)"}}>
                    {faq.q}<span style={{fontSize:"1.2rem",color:"var(--terra)",flexShrink:0,marginLeft:12}}>{open===id?"−":"+"}</span>
                  </button>
                  {open===id&&<div style={{padding:"0 20px 16px",color:"var(--stone)",fontSize:"0.88rem",lineHeight:1.75,borderTop:"1px solid var(--sand)"}}><div style={{paddingTop:16}}>{faq.a}</div></div>}
                </div>
              );
            })}
          </div>
        </div>
      ))}
      <div style={{background:"var(--terra)",borderRadius:6,padding:32,textAlign:"center",color:"#fff"}}>
        <h3 className="serif" style={{fontSize:"1.4rem",marginBottom:8}}>Still have questions?</h3>
        <p style={{opacity:0.85,marginBottom:20,fontSize:"0.9rem"}}>Our team responds within 24 hours.</p>
        <a href="mailto:hello@yardevents.net" style={{background:"#fff",color:"var(--terra)",padding:"12px 28px",borderRadius:3,fontWeight:600,fontSize:"0.85rem",letterSpacing:"0.06em",textTransform:"uppercase",textDecoration:"none",display:"inline-block"}}>Email Us →</a>
      </div>
    </div>
  );
}

function Footer({ onNavigate }) {
  return (
    <footer style={{background:"var(--bark)",padding:"48px 5% 28px",marginTop:60}}>
      <div style={{display:"grid",gridTemplateColumns:"2fr 1fr 1fr",gap:40,marginBottom:40,flexWrap:"wrap"}}>
        <div>
          <div style={{fontFamily:"Cormorant Garamond,serif",fontSize:"1.4rem",fontWeight:600,color:"var(--cream)",marginBottom:12}}>Yard<span style={{color:"var(--terra)"}}>Events</span></div>
          <p style={{fontSize:"0.85rem",lineHeight:1.7,color:"rgba(245,240,232,0.5)",maxWidth:260}}>The marketplace for private event spaces. Connecting hosts with guests for celebrations that last a lifetime.</p>
        </div>
        <div>
          <div style={{fontSize:"0.72rem",letterSpacing:"0.15em",textTransform:"uppercase",color:"var(--gold)",marginBottom:16,fontWeight:600}}>Explore</div>
          {[["Browse Spaces","browse"],["List Your Space","host-dash"],["Help Center","help"],["Contact Us","contact"]].map(([label,page])=>(
            <div key={label} style={{marginBottom:10}}>
              <button onClick={()=>onNavigate(page)} style={{background:"none",border:"none",color:"rgba(245,240,232,0.5)",fontSize:"0.85rem",cursor:"pointer",padding:0,textAlign:"left"}}>{label}</button>
            </div>
          ))}
        </div>
        <div>
          <div style={{fontSize:"0.72rem",letterSpacing:"0.15em",textTransform:"uppercase",color:"var(--gold)",marginBottom:16,fontWeight:600}}>Contact</div>
          <div style={{fontSize:"0.85rem",color:"rgba(245,240,232,0.5)",lineHeight:2}}>
            <div>📧 hello@yardevents.net</div>
            <div>🌐 yardevents.net</div>
            <div>📍 Perrysburg, Ohio</div>
          </div>
        </div>
      </div>
      <div style={{borderTop:"1px solid rgba(245,240,232,0.1)",paddingTop:24,display:"flex",justifyContent:"space-between",alignItems:"center",flexWrap:"wrap",gap:12}}>
        <p style={{fontSize:"0.78rem",color:"rgba(245,240,232,0.4)"}}>© 2026 Yard Events LLC. All rights reserved.</p>
        <p style={{fontSize:"0.78rem",color:"rgba(245,240,232,0.4)"}}>Made with ❤️ in Perrysburg, Ohio</p>
      </div>
    </footer>
  );
}

export default function App() {
  const [page, setPage] = useState("browse");
  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [selectedSpace, setSelectedSpace] = useState(null);
  const [bookingInfo, setBookingInfo] = useState(null);
  const [showPayment, setShowPayment] = useState(false);
  const [allSpaces, setAllSpaces] = useState([]);
  const [toast, showToast] = useToast();

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        const q = query(collection(db,"users"), where("uid","==",firebaseUser.uid));
        const snap = await getDocs(q);
        const userData = snap.empty ? {role:"guest"} : snap.docs[0].data();
        setUser({ uid: firebaseUser.uid, name: firebaseUser.displayName||firebaseUser.email, email: firebaseUser.email, role: userData.role||"guest" });
      } else { setUser(null); }
      setAuthLoading(false);
    });
    return unsub;
  }, []);

  const loadSpaces = async () => {
    try {
      const snap = await getDocs(collection(db,"listings"));
      setAllSpaces(snap.docs.map(d=>({id:d.id,...d.data()})));
    } catch(e) { console.log(e); }
  };

  useEffect(() => { loadSpaces(); }, []);

  const handleAuth = (userData) => {
    setUser(userData);
    if(userData.role==="host") setPage("host-dash");
  };

  const handleViewSpace = (space) => { setSelectedSpace(space); setPage("detail"); window.scrollTo({top:0,behavior:"smooth"}); };
  const handleBook = (info) => { setBookingInfo(info); setShowPayment(true); };
  const handlePaymentSuccess = () => { loadSpaces(); setPage("guest-dash"); window.scrollTo({top:0,behavior:"smooth"}); showToast("Booking confirmed! 🎉","success"); };
  const logout = async () => { await signOut(auth); setUser(null); setPage("browse"); showToast("Signed out successfully."); };

  if (authLoading) {
    return (
      <div style={{minHeight:"100vh",display:"flex",alignItems:"center",justifyContent:"center",background:"var(--warm)"}}>
        <div style={{textAlign:"center"}}>
          <div style={{fontSize:"3rem",marginBottom:16}}>🌿</div>
          <div style={{fontFamily:"Cormorant Garamond,serif",fontSize:"1.4rem",color:"var(--bark)"}}>Loading Yard Events…</div>
        </div>
      </div>
    );
  }

  return (
    <>
      <style dangerouslySetInnerHTML={{__html:css}}/>
      <Toast toast={toast}/>
      <nav className="nav">
        <button className="nav-logo" onClick={()=>setPage("browse")}>Yard<span>Events</span></button>
        <div className="nav-actions">
          <button className={`nav-tab${page==="browse"?" active":""}`} onClick={()=>setPage("browse")}>Browse</button>
          <button className={`nav-tab${page==="help"?" active":""}`} onClick={()=>setPage("help")}>Help</button>
          <button className={`nav-tab${page==="contact"?" active":""}`} onClick={()=>setPage("contact")}>Contact</button>
          {user ? (
            <>
              {user.role==="host" ? (
                <button className={`nav-tab${page==="host-dash"?" active":""}`} onClick={()=>setPage("host-dash")}>Host Dashboard</button>
              ) : (
                <button className={`nav-tab${page==="guest-dash"?" active":""}`} onClick={()=>setPage("guest-dash")}>My Bookings</button>
              )}
              <button className="nav-avatar" title={user.name}>{user.name[0]}</button>
              <button className="nav-tab" onClick={logout} style={{fontSize:"0.75rem"}}>Sign out</button>
            </>
          ) : (
            <button className="btn btn-primary btn-sm" onClick={()=>setShowAuthModal(true)}>Sign In / Sign Up</button>
          )}
        </div>
      </nav>

      {page==="browse" && <BrowsePage user={user} allSpaces={allSpaces} onViewSpace={handleViewSpace} showAuth={()=>setShowAuthModal(true)}/>}
      {page==="detail" && selectedSpace && <div className="section"><SpaceDetail space={selectedSpace} user={user} onBack={()=>setPage("browse")} onBook={handleBook} showAuth={()=>setShowAuthModal(true)}/></div>}
      {page==="host-dash" && user && <HostDashboard user={user} showToast={showToast} onSpacesUpdate={loadSpaces}/>}
      {page==="guest-dash" && user && <GuestDashboard user={user}/>}
      {page==="contact" && <ContactPage showToast={showToast}/>}
      {page==="help" && <HelpPage/>}

      <Footer onNavigate={setPage}/>

      {showAuthModal && <AuthModal onClose={()=>setShowAuthModal(false)} onAuth={handleAuth} showToast={showToast}/>}
      {showPayment && selectedSpace && bookingInfo && (
        <PaymentModal booking={bookingInfo} space={selectedSpace} user={user} onClose={()=>setShowPayment(false)} onSuccess={handlePaymentSuccess} showToast={showToast}/>
      )}
    </>
  );
}
