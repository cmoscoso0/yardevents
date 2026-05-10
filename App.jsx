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
import { ContactPage, HelpPage, Footer } from "./ContactHelp.jsx";

// ─── STYLES ──────────────────────────────────────────────────────────────────
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
  .toast {
    position: fixed; bottom: 28px; left: 50%; transform: translateX(-50%);
    background: var(--bark); color: var(--cream); padding: 14px 28px;
    border-radius: 4px; font-size: 0.88rem; z-index: 9999;
    box-shadow: 0 8px 32px rgba(0,0,0,0.2);
    animation: toastIn 0.3s ease;
  }
  .toast.success { background: var(--green); }
  .toast.error { background: var(--red); }
  @keyframes toastIn { from { opacity:0; transform: translateX(-50%) translateY(16px); } to { opacity:1; transform: translateX(-50%) translateY(0); } }
  .overlay {
    position: fixed; inset: 0; background: rgba(59,46,34,0.55);
    backdrop-filter: blur(4px); z-index: 500;
    display: flex; align-items: center; justify-content: center; padding: 20px;
    animation: fadeIn 0.2s ease;
  }
  @keyframes fadeIn { from { opacity:0; } to { opacity:1; } }
  .modal {
    background: var(--warm); border-radius: 8px;
    padding: 40px; width: 100%; max-width: 460px;
    box-shadow: 0 24px 80px rgba(0,0,0,0.25);
    animation: slideUp 0.3s ease;
    max-height: 90vh; overflow-y: auto;
  }
  .modal-wide { max-width: 680px; }
  @keyframes slideUp { from { opacity:0; transform: translateY(24px); } to { opacity:1; transform: translateY(0); } }
  .nav {
    position: sticky; top: 0; z-index: 200;
    background: rgba(250,247,242,0.92); backdrop-filter: blur(12px);
    border-bottom: 1px solid rgba(201,168,76,0.2);
    display: flex; align-items: center; justify-content: space-between;
    padding: 0 5%; height: 68px;
  }
  .nav-logo { font-family: 'Cormorant Garamond', serif; font-size: 1.4rem; font-weight: 600; background: none; border: none; cursor: pointer; }
  .nav-logo span { color: var(--terra); }
  .nav-actions { display: flex; gap: 12px; align-items: center; }
  .nav-tab { background: none; border: none; padding: 8px 16px; font-size: 0.82rem; font-weight: 500; letter-spacing: 0.06em; text-transform: uppercase; color: var(--stone); border-radius: 2px; transition: all 0.2s; }
  .nav-tab:hover, .nav-tab.active { color: var(--bark); background: var(--cream); }
  .nav-avatar { width: 38px; height: 38px; border-radius: 50%; background: linear-gradient(135deg, var(--moss), var(--terra)); color: #fff; font-weight: 600; font-size: 0.9rem; display: flex; align-items: center; justify-content: center; border: none; }
  .btn { display: inline-flex; align-items: center; justify-content: center; gap: 8px; border: none; border-radius: 3px; font-weight: 500; letter-spacing: 0.06em; text-transform: uppercase; font-size: 0.82rem; padding: 12px 28px; transition: all 0.22s; cursor: pointer; }
  .btn-primary { background: var(--terra); color: #fff; box-shadow: 0 4px 16px rgba(192,107,58,0.3); }
  .btn-primary:hover { background: var(--bark); transform: translateY(-1px); }
  .btn-secondary { background: var(--cream); color: var(--bark); border: 1px solid var(--sand); }
  .btn-secondary:hover { background: var(--sand); }
  .btn-ghost { background: transparent; color: var(--terra); border: 1.5px solid var(--terra); }
  .btn-ghost:hover { background: var(--terra); color: #fff; }
  .btn-sm { padding: 8px 18px; font-size: 0.75rem; }
  .btn-lg { padding: 16px 40px; font-size: 0.88rem; }
  .btn-block { width: 100%; }
  .btn-danger { background: var(--red); color: #fff; }
  .btn-success { background: var(--green); color: #fff; }
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
  .input-group { position: relative; }
  .input-prefix { position: absolute; left: 14px; top: 50%; transform: translateY(-50%); color: var(--stone); font-size: 0.9rem; pointer-events: none; }
  .input-prefix + .form-input { padding-left: 28px; }
  .card { background: #fff; border-radius: 6px; overflow: hidden; box-shadow: 0 2px 16px var(--shadow); transition: transform 0.3s, box-shadow 0.3s; }
  .card:hover { transform: translateY(-4px); box-shadow: 0 8px 32px var(--shadow); }
  .card-img { height: 200px; position: relative; display: flex; align-items: center; justify-content: center; font-size: 3.5rem; overflow: hidden; }
  .card-body { padding: 18px 20px 22px; }
  .card-footer-row { display: flex; justify-content: space-between; align-items: center; padding-top: 12px; border-top: 1px solid var(--sand); margin-top: 12px; }
  .badge { display: inline-block; padding: 3px 10px; border-radius: 2px; font-size: 0.68rem; font-weight: 600; letter-spacing: 0.08em; text-transform: uppercase; }
  .badge-gold { background: var(--gold); color: var(--bark); }
  .badge-terra { background: var(--terra); color: #fff; }
  .badge-moss { background: var(--moss); color: #fff; }
  .badge-cream { background: var(--cream); color: var(--stone); }
  .badge-green { background: var(--green); color: #fff; }
  .badge-red { background: var(--red); color: #fff; }
  .section { padding: 64px 5%; }
  .section-label { font-size: 0.72rem; font-weight: 600; letter-spacing: 0.18em; text-transform: uppercase; color: var(--terra); margin-bottom: 12px; display: flex; align-items: center; gap: 10px; }
  .section-label::before { content: ''; display: block; width: 20px; height: 1.5px; background: var(--terra); }
  .serif { font-family: 'Cormorant Garamond', serif; }
  .grid-3 { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 24px; }
  .grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 24px; }
  .flex-row { display: flex; align-items: center; gap: 12px; }
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
  @media (max-width: 768px) {
    .detail-grid { grid-template-columns: 1fr; }
    .booking-panel { position: static; }
    .form-row { grid-template-columns: 1fr; }
    .grid-2 { grid-template-columns: 1fr; }
    .search-box { flex-direction: column; }
    .search-field { border-right: none; border-bottom: 1px solid var(--sand); }
    .search-submit { padding: 14px; }
    .stat-row { gap: 24px; }
  }
`;

// ─── SAMPLE SPACES DATA ───────────────────────────────────────────────────────
const SAMPLE_SPACES = [
  { id: "s1", title: "The Sundown Garden", hostName: "Maria L.", location: "Austin, TX", type: "Backyard", guests: 80, price: 350, rating: 4.97, reviews: 63, bg: "bg-yard", emoji: "🌿", amenities: ["Parking","Fire pit","Tables & chairs","String lights","Outdoor kitchen"], description: "A sprawling half-acre backyard with mature live oaks, a fire pit, and string lights already installed. The perfect backdrop for intimate celebrations.", events: ["Birthday","Baby Shower","Graduation"], booked: ["2025-08-10","2025-08-17"] },
  { id: "s2", title: "Hickory Hollow Barn", hostName: "James T.", location: "Nashville, TN", type: "Barn", guests: 200, price: 750, rating: 4.88, reviews: 21, bg: "bg-barn", emoji: "🏚", amenities: ["Large parking","Indoor + Outdoor","Bridal suite","Commercial kitchen","PA system"], description: "A beautifully restored 1940s barn sitting on 5 acres. Climate-controlled inside with rustic wooden beams and a wraparound porch.", events: ["Wedding","Corporate","Birthday"], booked: ["2025-08-03","2025-08-04"] },
  { id: "s3", title: "Lakeside Pine Estate", hostName: "Christine P.", location: "Lake Tahoe, CA", type: "Private Land", guests: 120, price: 1200, rating: 5.0, reviews: 44, bg: "bg-lake", emoji: "🌊", amenities: ["Private dock","Waterfront","Catering kitchen","Fire pit","Parking for 40"], description: "Exclusive lakeside property with 200 feet of private shoreline. Stunning mountain views with a dock, fire pit, and full catering kitchen.", events: ["Wedding","Birthday","Corporate"], booked: ["2025-08-15","2025-08-16"] },
  { id: "s4", title: "Magnolia Side Garden", hostName: "Dolores R.", location: "Savannah, GA", type: "Garden", guests: 50, price: 280, rating: 4.95, reviews: 87, bg: "bg-garden", emoji: "🌸", amenities: ["String lights","Bistro tables","Garden fountain","Parking","Restrooms"], description: "A romantic Southern garden overflowing with magnolias, gardenias, and jasmine. Includes bistro tables, string lights, and a vintage garden fountain.", events: ["Baby Shower","Birthday","Bridal Shower"], booked: ["2025-08-08"] },
  { id: "s5", title: "Desert Ridge Ranch", hostName: "Carlos M.", location: "Scottsdale, AZ", type: "Ranch", guests: 150, price: 900, rating: 4.91, reviews: 38, bg: "bg-ranch", emoji: "🐎", amenities: ["Desert views","Sunset patio","Tables & chairs","Parking","Fire pit"], description: "A working ranch with jaw-dropping desert sunset views. Perfect for western-themed events with a large covered patio and mesquite fire pit.", events: ["Wedding","Birthday","Corporate"], booked: [] },
  { id: "s6", title: "Indigo Grove Estate", hostName: "Patricia K.", location: "Charleston, SC", type: "Estate", guests: 250, price: 1800, rating: 4.98, reviews: 52, bg: "bg-estate", emoji: "✨", amenities: ["Catering kitchen","Bridal suite","Pool","Valet parking","Sound system","AC"], description: "A stunning antebellum estate with manicured grounds, a pool, and a full catering kitchen. The most luxurious private venue in the Lowcountry.", events: ["Wedding","Corporate","Gala"], booked: ["2025-08-20","2025-08-21"] },
];

// ─── HELPERS ──────────────────────────────────────────────────────────────────
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

// ─── CALENDAR ────────────────────────────────────────────────────────────────
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

// ─── AUTH MODAL ──────────────────────────────────────────────────────────────
function AuthModal({ onClose, onAuth, showToast }) {
  const [mode, setMode] = useState("login"); // login | signup
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
        // Save user profile to Firestore
        await addDoc(collection(db, "users"), {
          uid: cred.user.uid, name: name.trim(), email, role,
          createdAt: serverTimestamp()
        });
        onAuth({ uid: cred.user.uid, name: name.trim(), email, role });
        showToast(`Welcome to Yard Events, ${name.trim()}! 🎉`, "success");
      } else {
        const cred = await signInWithEmailAndPassword(auth, email, password);
        // Get role from Firestore
        const q = query(collection(db, "users"), where("uid","==",cred.user.uid));
        const snap = await getDocs(q);
        const userData = snap.empty ? { role: "guest" } : snap.docs[0].data();
        onAuth({ uid: cred.user.uid, name: cred.user.displayName || email, email, role: userData.role });
        showToast(`Welcome back! 👋`, "success");
      }
      onClose();
    } catch (e) {
      const msgs = {
        "auth/email-already-in-use": "An account with this email already exists.",
        "auth/weak-password": "Password must be at least 6 characters.",
        "auth/invalid-email": "Please enter a valid email address.",
        "auth/user-not-found": "No account found with this email.",
        "auth/wrong-password": "Incorrect password. Please try again.",
        "auth/invalid-credential": "Incorrect email or password.",
      };
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
            <input className="form-input" placeholder="Your full name" value={name} onChange={e=>setName(e.target.value)} />
          </div>
        )}
        <div className="form-group">
          <label className="form-label">Email Address</label>
          <input className="form-input" type="email" placeholder="you@example.com" value={email} onChange={e=>setEmail(e.target.value)} />
        </div>
        <div className="form-group">
          <label className="form-label">Password</label>
          <input className="form-input" type="password" placeholder={mode==="signup"?"At least 6 characters":"Your password"} value={password} onChange={e=>setPassword(e.target.value)} onKeyDown={e=>e.key==="Enter"&&submit()} />
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

// ─── SPACE CARD ──────────────────────────────────────────────────────────────
function SpaceCard({ space, onClick, onFav, isFaved }) {
  return (
    <div className="card" style={{cursor:"pointer"}} onClick={()=>onClick(space)}>
      <div className={`card-img ${space.bg}`}>
        <span style={{position:"relative",zIndex:1}}>{space.emoji}</span>
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
          {space.events.slice(0,2).map(e=><span key={e} className="tag">{e}</span>)}
        </div>
        <div className="card-footer-row">
          <div style={{fontFamily:"Cormorant Garamond,serif",fontSize:"1.3rem",fontWeight:300}}>{fmt(space.price)} <span style={{fontFamily:"DM Sans,sans-serif",fontSize:"0.75rem",color:"var(--stone)"}}>/ day</span></div>
          <div style={{display:"flex",alignItems:"center",gap:5,fontSize:"0.82rem",color:"var(--stone)"}}>
            <StarRating rating={space.rating} size="0.8rem"/> {space.rating} ({space.reviews})
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── PAYMENT MODAL ───────────────────────────────────────────────────────────
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
      // Save booking to Firestore
      const bookingRef = await addDoc(collection(db, "bookings"), {
        userId: user.uid, userName: user.name, userEmail: user.email,
        spaceId: space.id, spaceTitle: space.title, spaceLocation: space.location,
        hostName: space.hostName, checkIn: booking.checkIn, checkOut: booking.checkOut,
        guests: booking.guests, total, subtotal, serviceFee,
        status: "confirmed", createdAt: serverTimestamp(),
        bookingRef: `EVR-${Date.now().toString().slice(-6)}`
      });
      await sleep(1000);
      setLoading(false);
      setStep(3);
      onSuccess({ id: bookingRef.id, space, booking, total, ref: `EVR-${Date.now().toString().slice(-6)}` });
    } catch(e) {
      showToast("Payment failed. Please try again.", "error");
      setLoading(false);
    }
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
              <div className={`${space.bg} card-img`} style={{height:160,borderRadius:6,fontSize:"3rem"}}>{space.emoji}</div>
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
              <input className="form-input" placeholder="4242 4242 4242 4242" value={card.number} onChange={e=>setCard(c=>({...c,number:fmtCard(e.target.value)}))} maxLength={19}/>
              <span className="form-hint">Use test card: 4242 4242 4242 4242 (any future date, any CVC)</span>
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

// ─── SPACE DETAIL ─────────────────────────────────────────────────────────────
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
      <div className={`detail-hero ${space.bg}`} style={{marginBottom:32}}>
        <span style={{fontSize:"7rem"}}>{space.emoji}</span>
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
              <div style={{display:"flex",alignItems:"center",gap:6}}><StarRating rating={space.rating}/> <span style={{fontWeight:600}}>{space.rating}</span> <span style={{color:"var(--stone)"}}>({space.reviews} reviews)</span></div>
              <span style={{color:"var(--sand)"}}>·</span>
              <span style={{color:"var(--stone)",fontSize:"0.88rem"}}>Hosted by {space.hostName}</span>
            </div>
          </div>
          <hr className="divider"/>
          <div style={{marginBottom:28}}>
            <h3 className="serif" style={{fontSize:"1.3rem",marginBottom:14}}>About this space</h3>
            <p style={{lineHeight:1.75,color:"var(--stone)"}}>{space.description}</p>
          </div>
          <div style={{marginBottom:28}}>
            <h3 className="serif" style={{fontSize:"1.3rem",marginBottom:14}}>Amenities & Features</h3>
            <div className="amenity-grid">{space.amenities.map(a=><div key={a} className="amenity">✓ {a}</div>)}</div>
          </div>
          <div style={{marginBottom:28}}>
            <h3 className="serif" style={{fontSize:"1.3rem",marginBottom:14}}>Perfect for</h3>
            <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>{space.events.map(e=><span key={e} className="badge badge-cream" style={{fontSize:"0.82rem",padding:"6px 14px"}}>{e}</span>)}</div>
          </div>
          <hr className="divider"/>
          <div>
            <h3 className="serif" style={{fontSize:"1.3rem",marginBottom:16}}>Select Your Date</h3>
            <p style={{fontSize:"0.82rem",color:"var(--stone)",marginBottom:14}}>Click to select your event date. Greyed out dates are unavailable.</p>
            <Calendar bookedDates={space.booked} onSelect={handleCalSelect} checkIn={checkIn} checkOut={checkOut}/>
          </div>
        </div>
        <div className="booking-panel">
          <div style={{fontFamily:"Cormorant Garamond,serif",fontSize:"1.6rem",fontWeight:300,marginBottom:4}}>
            {fmt(space.price)} <span style={{fontFamily:"DM Sans,sans-serif",fontSize:"0.85rem",color:"var(--stone)",fontWeight:300}}>/ day</span>
          </div>
          <div style={{display:"flex",alignItems:"center",gap:6,marginBottom:20,fontSize:"0.82rem",color:"var(--stone)"}}>
            <StarRating rating={space.rating} size="0.8rem"/> {space.rating} · {space.reviews} reviews
          </div>
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
            <div style={{width:40,height:40,borderRadius:"50%",background:"linear-gradient(135deg,var(--moss),var(--terra))",display:"flex",alignItems:"center",justifyContent:"center",color:"#fff",fontWeight:600}}>{space.hostName[0]}</div>
            <div>
              <div style={{fontWeight:600,fontSize:"0.9rem"}}>{space.hostName}</div>
              <div style={{fontSize:"0.75rem",color:"var(--stone)"}}>Verified Host · Responds in &lt;2hrs</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── BROWSE PAGE ──────────────────────────────────────────────────────────────
function BrowsePage({ user, allSpaces, onViewSpace, showAuth }) {
  const [search, setSearch] = useState("");
  const [eventFilter, setEventFilter] = useState("All");
  const [typeFilter, setTypeFilter] = useState("All");
  const [maxPrice, setMaxPrice] = useState(2000);
  const [favs, setFavs] = useState([]);
  const eventTypes = ["All","Wedding","Birthday","Baby Shower","Graduation","Corporate"];
  const filtered = allSpaces.filter(s => {
    const ms = s.title.toLowerCase().includes(search.toLowerCase())||s.location.toLowerCase().includes(search.toLowerCase());
    const me = eventFilter==="All"||s.events.some(e=>e.toLowerCase().includes(eventFilter.toLowerCase()));
    const mt = typeFilter==="All"||s.type===typeFilter;
    return ms&&me&&mt&&s.price<=maxPrice;
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
            <label>Location</label>
            <input type="text" placeholder="City, state or ZIP" value={search} onChange={e=>setSearch(e.target.value)}/>
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
              <option value={2000}>Any price</option>
              <option value={300}>Under $300</option>
              <option value={600}>Under $600</option>
              <option value={1000}>Under $1,000</option>
              <option value={2000}>Under $2,000</option>
            </select>
          </div>
          <button className="search-submit">🔍</button>
        </div>
        <div className="stat-row">
          <div className="stat-item"><strong>{allSpaces.length}+</strong><span>Spaces Listed</span></div>
          <div className="stat-item"><strong>12K+</strong><span>Events Hosted</span></div>
          <div className="stat-item"><strong>4.9★</strong><span>Avg. Rating</span></div>
        </div>
      </div>
      <div style={{padding:"24px 5%",background:"var(--cream)",display:"flex",gap:8,flexWrap:"wrap",alignItems:"center"}}>
        <span style={{fontSize:"0.8rem",fontWeight:600,color:"var(--stone)",textTransform:"uppercase",letterSpacing:"0.08em",marginRight:4}}>Filter:</span>
        {eventTypes.map(t=>(
          <button key={t} onClick={()=>setEventFilter(t)} style={{padding:"6px 14px",borderRadius:2,border:`1.5px solid ${eventFilter===t?"var(--terra)":"var(--sand)"}`,background:eventFilter===t?"var(--terra)":"#fff",color:eventFilter===t?"#fff":"var(--bark)",fontSize:"0.78rem",cursor:"pointer",transition:"all 0.2s"}}>{t}</button>
        ))}
      </div>
      <div className="section">
        <div className="flex-between" style={{marginBottom:28}}>
          <h2 className="serif" style={{fontSize:"clamp(1.5rem,3vw,2.2rem)",fontWeight:300}}>{filtered.length} spaces <em style={{color:"var(--moss)"}}>available</em></h2>
        </div>
        {filtered.length===0 ? (
          <div style={{textAlign:"center",padding:"60px 20px",color:"var(--stone)"}}>
            <div style={{fontSize:"3rem",marginBottom:16}}>🔍</div>
            <p>No spaces match your search. Try adjusting your filters.</p>
          </div>
        ) : (
          <div className="grid-3">{filtered.map(s=><SpaceCard key={s.id} space={s} onClick={onViewSpace} onFav={toggleFav} isFaved={favs.includes(s.id)}/>)}</div>
        )}
      </div>
    </div>
  );
}

// ─── HOST DASHBOARD ───────────────────────────────────────────────────────────
function HostDashboard({ user, showToast }) {
  const [activeTab, setActiveTab] = useState("overview");
  const [myListings, setMyListings] = useState([]);
  const [myBookings, setMyBookings] = useState([]);
  const [showListForm, setShowListForm] = useState(false);
  const [editListing, setEditListing] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, [user]);

  const loadData = async () => {
    setLoading(true);
    try {
      const lq = query(collection(db,"listings"), where("hostId","==",user.uid));
      const lsnap = await getDocs(lq);
      setMyListings(lsnap.docs.map(d=>({id:d.id,...d.data()})));
      const bq = query(collection(db,"bookings"), where("hostId","==",user.uid));
      const bsnap = await getDocs(bq);
      setMyBookings(bsnap.docs.map(d=>({id:d.id,...d.data()})));
    } catch(e) { console.log(e); }
    setLoading(false);
  };

  const totalEarnings = myBookings.reduce((sum,b)=>sum+(b.total||0)*0.88,0);

  const tabs = [
    {id:"overview",label:"Overview",icon:"📊"},
    {id:"listings",label:"My Spaces",icon:"🏡"},
    {id:"bookings",label:"Bookings",icon:"📅"},
    {id:"earnings",label:"Earnings",icon:"💰"},
  ];

  return (
    <div className="section">
      <div style={{marginBottom:28}}>
        <div className="section-label">Host Portal</div>
        <h2 className="serif" style={{fontSize:"clamp(1.6rem,3vw,2.4rem)",fontWeight:300}}>Welcome back, <em style={{color:"var(--terra)"}}>{user.name.split(" ")[0]}</em></h2>
      </div>
      <div style={{display:"flex",gap:32,flexWrap:"wrap"}}>
        <div style={{width:200,flexShrink:0}}>
          <div className="dash-nav">
            {tabs.map(t=>(
              <button key={t.id} className={`dash-nav-item${activeTab===t.id?" active":""}`} onClick={()=>setActiveTab(t.id)}>
                <span>{t.icon}</span>{t.label}
              </button>
            ))}
          </div>
          <hr className="divider"/>
          <div style={{background:"var(--cream)",borderRadius:4,padding:16,fontSize:"0.82rem",color:"var(--stone)"}}>
            <div style={{fontWeight:700,color:"var(--bark)",marginBottom:6}}>✓ Verified Host</div>
            <div>{user.name}</div>
            <div style={{fontSize:"0.75rem",marginTop:4}}>{user.email}</div>
          </div>
        </div>
        <div style={{flex:1,minWidth:0}}>
          {loading && <div style={{textAlign:"center",padding:40,color:"var(--stone)"}}>Loading your dashboard…</div>}

          {!loading && activeTab==="overview" && (
            <div>
              <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(140px,1fr))",gap:16,marginBottom:32}}>
                {[
                  {label:"Total Earnings",value:fmt(totalEarnings),icon:"💰",color:"var(--green)"},
                  {label:"Active Listings",value:myListings.length,icon:"🏡",color:"var(--moss)"},
                  {label:"Total Bookings",value:myBookings.length,icon:"📅",color:"var(--terra)"},
                  {label:"Avg. Rating",value:"4.9 ★",icon:"⭐",color:"var(--gold)"},
                ].map(s=>(
                  <div key={s.label} style={{background:"#fff",borderRadius:6,padding:"20px 18px",boxShadow:"0 2px 12px var(--shadow)"}}>
                    <div style={{fontSize:"1.5rem",marginBottom:8}}>{s.icon}</div>
                    <div style={{fontFamily:"Cormorant Garamond,serif",fontSize:"1.8rem",fontWeight:300,color:s.color}}>{s.value}</div>
                    <div style={{fontSize:"0.75rem",color:"var(--stone)",marginTop:2}}>{s.label}</div>
                  </div>
                ))}
              </div>
              <h3 className="serif" style={{fontSize:"1.2rem",marginBottom:16}}>Quick Actions</h3>
              <div style={{display:"flex",gap:12,flexWrap:"wrap"}}>
                <button className="btn btn-primary" onClick={()=>{setEditListing(null);setShowListForm(true);}}>+ List New Space</button>
                <button className="btn btn-secondary" onClick={()=>setActiveTab("bookings")}>View Bookings</button>
                <button className="btn btn-secondary" onClick={()=>setActiveTab("earnings")}>View Earnings</button>
              </div>
            </div>
          )}

          {!loading && activeTab==="listings" && (
            <div>
              <div className="flex-between" style={{marginBottom:20}}>
                <h3 className="serif" style={{fontSize:"1.3rem"}}>My Spaces ({myListings.length})</h3>
                <button className="btn btn-primary btn-sm" onClick={()=>{setEditListing(null);setShowListForm(true);}}>+ Add New Space</button>
              </div>
              {myListings.length===0 ? (
                <div style={{textAlign:"center",padding:"60px 20px",background:"#fff",borderRadius:6,border:"2px dashed var(--sand)"}}>
                  <div style={{fontSize:"3rem",marginBottom:16}}>🏡</div>
                  <h3 className="serif" style={{marginBottom:12}}>No spaces listed yet</h3>
                  <p style={{color:"var(--stone)",marginBottom:24}}>List your first space and start earning.</p>
                  <button className="btn btn-primary" onClick={()=>setShowListForm(true)}>List My First Space</button>
                </div>
              ) : (
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
                          <button className="btn btn-danger btn-sm" onClick={async()=>{await deleteDoc(doc(db,"listings",l.id));setMyListings(prev=>prev.filter(x=>x.id!==l.id));showToast("Listing removed.","default");}}>Remove</button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {!loading && activeTab==="bookings" && (
            <div>
              <h3 className="serif" style={{fontSize:"1.3rem",marginBottom:20}}>Incoming Bookings ({myBookings.length})</h3>
              {myBookings.length===0 ? (
                <div style={{textAlign:"center",padding:"40px",color:"var(--stone)"}}>No bookings yet. List your space to start receiving bookings!</div>
              ) : (
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

          {!loading && activeTab==="earnings" && (
            <div>
              <h3 className="serif" style={{fontSize:"1.3rem",marginBottom:20}}>Earnings Summary</h3>
              <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(140px,1fr))",gap:16,marginBottom:28}}>
                {[
                  {label:"Total Earned",value:fmt(totalEarnings)},
                  {label:"Pending",value:fmt(0)},
                  {label:"Bookings",value:myBookings.length},
                ].map(e=>(
                  <div key={e.label} style={{background:"#fff",borderRadius:6,padding:20,boxShadow:"0 2px 12px var(--shadow)",textAlign:"center"}}>
                    <div style={{fontFamily:"Cormorant Garamond,serif",fontSize:"1.8rem",color:"var(--green)",marginBottom:4}}>{e.value}</div>
                    <div style={{fontSize:"0.75rem",color:"var(--stone)",textTransform:"uppercase",letterSpacing:"0.08em"}}>{e.label}</div>
                  </div>
                ))}
              </div>
              <div style={{background:"var(--cream)",borderRadius:4,padding:"14px 16px",fontSize:"0.82rem",color:"var(--stone)"}}>
                💳 Payouts are sent to your bank account within 24 hours of each completed event. Platform fee: 12%.
              </div>
            </div>
          )}
        </div>
      </div>
      {showListForm && (
        <ListSpaceModal
          existing={editListing}
          user={user}
          onClose={()=>{setShowListForm(false);setEditListing(null);}}
          onSave={async(listing)=>{
            try {
              if(editListing) {
                await updateDoc(doc(db,"listings",editListing.id),{...listing,updatedAt:serverTimestamp()});
                setMyListings(prev=>prev.map(l=>l.id===editListing.id?{...listing,id:editListing.id}:l));
                showToast("Listing updated!","success");
              } else {
                const ref = await addDoc(collection(db,"listings"),{...listing,hostId:user.uid,hostName:user.name,hostEmail:user.email,rating:0,reviews:0,booked:[],createdAt:serverTimestamp()});
                setMyListings(prev=>[...prev,{id:ref.id,...listing,hostId:user.uid,hostName:user.name,rating:0,reviews:0,booked:[]}]);
                showToast("Space listed! 🎉","success");
              }
              setShowListForm(false);setEditListing(null);
            } catch(e){showToast("Error saving listing.","error");}
          }}
        />
      )}
    </div>
  );
}

// ─── LIST SPACE MODAL ─────────────────────────────────────────────────────────
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
    await onSave({...form,price:Number(form.price),guests:Number(form.guests),amenities:form.amenities?form.amenities.split(",").map(a=>a.trim()):[]});
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
          <div className="form-group">
            <label className="form-label">Space Name *</label>
            <input className="form-input" placeholder="e.g. The Sundown Garden" value={form.title} onChange={e=>upd("title",e.target.value)}/>
          </div>
          <div className="form-group">
            <label className="form-label">Location *</label>
            <input className="form-input" placeholder="City, State" value={form.location} onChange={e=>upd("location",e.target.value)}/>
          </div>
        </div>
        <div className="form-row">
          <div className="form-group">
            <label className="form-label">Space Type</label>
            <select className="form-input" value={form.type} onChange={e=>upd("type",e.target.value)}>
              {["Backyard","Barn","Private Land","Garden","Ranch","Estate","Other"].map(t=><option key={t}>{t}</option>)}
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">Max Guests</label>
            <input className="form-input" type="number" placeholder="e.g. 75" value={form.guests} onChange={e=>upd("guests",e.target.value)}/>
          </div>
        </div>
        <div className="form-group">
          <label className="form-label">Price per Day (USD) *</label>
          <div className="input-group">
            <span className="input-prefix">$</span>
            <input className="form-input" type="number" placeholder="350" value={form.price} onChange={e=>upd("price",e.target.value)} style={{paddingLeft:28}}/>
          </div>
          <span className="form-hint">You keep 88% after the 12% platform fee.</span>
        </div>
        <div className="form-group">
          <label className="form-label">Description</label>
          <textarea className="form-input" placeholder="Describe your space — what makes it special, what's included, any rules..." value={form.description} onChange={e=>upd("description",e.target.value)}/>
        </div>
        <div className="form-group">
          <label className="form-label">Amenities (comma separated)</label>
          <input className="form-input" placeholder="Parking, Fire pit, Tables & chairs, String lights" value={form.amenities} onChange={e=>upd("amenities",e.target.value)}/>
        </div>
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
            <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
              {bgs.map(bg=><div key={bg} onClick={()=>upd("bg",bg)} className={bg} style={{width:32,height:32,borderRadius:3,cursor:"pointer",border:`3px solid ${form.bg===bg?"var(--terra)":"transparent"}`,transition:"all 0.2s"}}/>)}
            </div>
          </div>
          <div className="form-group">
            <label className="form-label">Emoji</label>
            <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
              {emojis.map(e=><button key={e} type="button" onClick={()=>upd("emoji",e)} style={{fontSize:"1.2rem",padding:"4px 6px",border:`2px solid ${form.emoji===e?"var(--terra)":"var(--sand)"}`,borderRadius:3,background:"#fff",cursor:"pointer"}}>{e}</button>)}
            </div>
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

// ─── GUEST DASHBOARD ──────────────────────────────────────────────────────────
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
      <div className="tabs">
        <button className="tab-btn active">My Bookings</button>
      </div>
      {loading && <div style={{textAlign:"center",padding:40,color:"var(--stone)"}}>Loading your bookings…</div>}
      {!loading && myBookings.length===0 && (
        <div style={{textAlign:"center",padding:"60px 20px",background:"#fff",borderRadius:6,border:"2px dashed var(--sand)"}}>
          <div style={{fontSize:"3rem",marginBottom:16}}>🗓</div>
          <h3 className="serif" style={{marginBottom:12}}>No bookings yet</h3>
          <p style={{color:"var(--stone)"}}>Browse spaces and book your first event venue!</p>
        </div>
      )}
      {!loading && myBookings.length>0 && (
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

// ─── MAIN APP ─────────────────────────────────────────────────────────────────
export default function App() {
  const [page, setPage] = useState("browse");
  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [selectedSpace, setSelectedSpace] = useState(null);
  const [bookingInfo, setBookingInfo] = useState(null);
  const [showPayment, setShowPayment] = useState(false);
  const [allSpaces, setAllSpaces] = useState(SAMPLE_SPACES);
  const [toast, showToast] = useToast();

  // Listen to Firebase auth state
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        const q = query(collection(db,"users"), where("uid","==",firebaseUser.uid));
        const snap = await getDocs(q);
        const userData = snap.empty ? {role:"guest"} : snap.docs[0].data();
        setUser({ uid: firebaseUser.uid, name: firebaseUser.displayName||firebaseUser.email, email: firebaseUser.email, role: userData.role||"guest" });
      } else {
        setUser(null);
      }
      setAuthLoading(false);
    });
    return unsub;
  }, []);

  // Load listings from Firestore and merge with sample data
  useEffect(() => {
    const load = async () => {
      try {
        const snap = await getDocs(collection(db,"listings"));
        const firestoreSpaces = snap.docs.map(d=>({id:d.id,...d.data()}));
        setAllSpaces([...SAMPLE_SPACES,...firestoreSpaces]);
      } catch(e) { console.log(e); }
    };
    load();
  }, []);

  const handleAuth = (userData) => setUser(userData);

  const handleViewSpace = (space) => {
    setSelectedSpace(space);
    setPage("detail");
    window.scrollTo({top:0,behavior:"smooth"});
  };

  const handleBook = (info) => { setBookingInfo(info); setShowPayment(true); };

  const handlePaymentSuccess = () => {
    setPage(user.role==="host"?"host-dash":"guest-dash");
    window.scrollTo({top:0,behavior:"smooth"});
    showToast("Booking confirmed! Check your email for details. 🎉","success");
  };

  const logout = async () => {
    await signOut(auth);
    setUser(null);
    setPage("browse");
    showToast("Signed out successfully.");
  };

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

      {/* NAV */}
      <nav className="nav">
        <button className="nav-logo" onClick={()=>setPage("browse")}>Yard<span>Events</span></button>
        <div className="nav-actions">
          {user ? (
            <>
              <button className={`nav-tab${page==="browse"?" active":""}`} onClick={()=>setPage("browse")}>Browse</button>
              {user.role==="host" ? (
                <button className={`nav-tab${page==="host-dash"?" active":""}`} onClick={()=>setPage("host-dash")}>Host Dashboard</button>
              ) : (
                <button className={`nav-tab${page==="guest-dash"?" active":""}`} onClick={()=>setPage("guest-dash")}>My Bookings</button>
              )}
              <button className="nav-avatar" title={user.name}>{user.name[0]}</button>
              <button className="nav-tab" onClick={logout} style={{fontSize:"0.75rem"}}>Sign out</button>
            </>
          ) : (
            <>
              <button className={`nav-tab${page==="browse"?" active":""}`} onClick={()=>setPage("browse")}>Browse Spaces</button>
              <button className={`nav-tab${page==="help"?" active":""}`} onClick={()=>setPage("help")}>Help</button>
              <button className={`nav-tab${page==="contact"?" active":""}`} onClick={()=>setPage("contact")}>Contact Us</button>
              <button className="btn btn-primary btn-sm" onClick={()=>setShowAuthModal(true)}>Sign In / Sign Up</button>
            </>
          )}
        </div>
      </nav>

      {/* PAGES */}
      {page==="browse" && <BrowsePage user={user} allSpaces={allSpaces} onViewSpace={handleViewSpace} showAuth={()=>setShowAuthModal(true)}/>}
      {page==="detail" && selectedSpace && (
        <div className="section">
          <SpaceDetail space={selectedSpace} user={user} onBack={()=>setPage("browse")} onBook={handleBook} showAuth={()=>setShowAuthModal(true)}/>
        </div>
      )}
      {page==="host-dash" && user && <HostDashboard user={user} showToast={showToast}/>}
      {page==="guest-dash" && user && <GuestDashboard user={user}/>}
      {page==="contact" && <ContactPage showToast={showToast}/>}
      {page==="help" && <HelpPage/>}

      <Footer onNavigate={setPage}/>

      {/* MODALS */}
      {showAuthModal && <AuthModal onClose={()=>setShowAuthModal(false)} onAuth={handleAuth} showToast={showToast}/>}
      {showPayment && selectedSpace && bookingInfo && (
        <PaymentModal booking={bookingInfo} space={selectedSpace} user={user} onClose={()=>setShowPayment(false)} onSuccess={handlePaymentSuccess} showToast={showToast}/>
      )}
    </>
  );
}
