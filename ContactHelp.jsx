import { useState } from "react";
import { collection, addDoc } from "firebase/firestore";
import { db } from "./firebase.js";
import { serverTimestamp } from "firebase/firestore";

export function ContactPage({ showToast }) {
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
    <div style={{padding:"64px 5%",maxWidth:900,margin:"0 auto"}}>
      <div style={{marginBottom:40}}>
        <div style={{fontSize:"0.72rem",fontWeight:600,letterSpacing:"0.18em",textTransform:"uppercase",color:"#c06b3a",marginBottom:12}}>Get In Touch</div>
        <h1 style={{fontFamily:"Cormorant Garamond,serif",fontSize:"clamp(2rem,4vw,3rem)",fontWeight:300,marginBottom:16}}>We're here to <em style={{color:"#c06b3a"}}>help</em></h1>
        <p style={{color:"#8a7f72",fontSize:"0.95rem",lineHeight:1.7}}>Have a question about booking a space, listing your property, or anything else? Send us a message and we'll get back to you within 24 hours.</p>
      </div>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:40}}>
        <div>
          {[["name","Your Name *","text","Cindy Moscoso"],["email","Email Address *","email","you@email.com"]].map(([k,label,type,ph])=>(
            <div key={k} style={{display:"flex",flexDirection:"column",gap:6,marginBottom:20}}>
              <label style={{fontSize:"0.72rem",fontWeight:600,letterSpacing:"0.12em",textTransform:"uppercase",color:"#c06b3a"}}>{label}</label>
              <input style={{border:"1.5px solid #d9c9a8",borderRadius:3,padding:"12px 16px",fontSize:"0.92rem",background:"#fff",color:"#3b2e22",outline:"none"}} type={type} placeholder={ph} value={form[k]} onChange={e=>upd(k,e.target.value)}/>
            </div>
          ))}
          <div style={{display:"flex",flexDirection:"column",gap:6,marginBottom:20}}>
            <label style={{fontSize:"0.72rem",fontWeight:600,letterSpacing:"0.12em",textTransform:"uppercase",color:"#c06b3a"}}>Subject</label>
            <select style={{border:"1.5px solid #d9c9a8",borderRadius:3,padding:"12px 16px",fontSize:"0.92rem",background:"#fff",color:"#3b2e22",outline:"none"}} value={form.subject} onChange={e=>upd("subject",e.target.value)}>
              <option value="">Select a topic</option>
              <option>Booking Question</option>
              <option>Listing My Space</option>
              <option>Payment Issue</option>
              <option>Cancellation Request</option>
              <option>Report a Problem</option>
              <option>General Question</option>
            </select>
          </div>
          <div style={{display:"flex",flexDirection:"column",gap:6,marginBottom:20}}>
            <label style={{fontSize:"0.72rem",fontWeight:600,letterSpacing:"0.12em",textTransform:"uppercase",color:"#c06b3a"}}>Message *</label>
            <textarea style={{border:"1.5px solid #d9c9a8",borderRadius:3,padding:"12px 16px",fontSize:"0.92rem",background:"#fff",color:"#3b2e22",outline:"none",minHeight:140,resize:"vertical",fontFamily:"DM Sans,sans-serif"}} placeholder="Tell us how we can help..." value={form.message} onChange={e=>upd("message",e.target.value)}/>
          </div>
          <button style={{background:"#c06b3a",color:"#fff",border:"none",borderRadius:3,padding:"16px 40px",fontSize:"0.88rem",fontWeight:500,letterSpacing:"0.06em",textTransform:"uppercase",cursor:"pointer",width:"100%"}} onClick={submit} disabled={loading||!form.name||!form.email||!form.message}>
            {loading ? "Sending…" : "Send Message →"}
          </button>
        </div>
        <div>
          <div style={{background:"#f5f0e8",borderRadius:6,padding:28,marginBottom:20}}>
            <h3 style={{fontFamily:"Cormorant Garamond,serif",fontSize:"1.2rem",marginBottom:16}}>Contact Info</h3>
            {[["📧","Email","hello@yardevents.net"],["🌐","Website","yardevents.net"],["⏰","Response Time","Within 24 hours"],["📍","Based in","Perrysburg, Ohio"]].map(([icon,label,val])=>(
              <div key={label} style={{display:"flex",gap:12,marginBottom:16}}>
                <span style={{fontSize:"1.2rem"}}>{icon}</span>
                <div>
                  <div style={{fontSize:"0.72rem",fontWeight:700,letterSpacing:"0.1em",textTransform:"uppercase",color:"#c06b3a",marginBottom:2}}>{label}</div>
                  <div style={{fontSize:"0.9rem",color:"#3b2e22"}}>{val}</div>
                </div>
              </div>
            ))}
          </div>
          <div style={{background:"#3b2e22",borderRadius:6,padding:28,color:"#f5f0e8"}}>
            <h3 style={{fontFamily:"Cormorant Garamond,serif",fontSize:"1.2rem",marginBottom:12,color:"#c9a84c"}}>Are you a Host?</h3>
            <p style={{fontSize:"0.88rem",lineHeight:1.7,color:"rgba(245,240,232,0.75)",marginBottom:16}}>List your backyard, barn, or private land and start earning. Hosts earn an average of $2,400/month.</p>
            <div style={{fontSize:"0.82rem",color:"#c9a84c"}}>→ Sign up and click "List My Space"</div>
          </div>
        </div>
      </div>
    </div>
  );
}

export function HelpPage() {
  const [open, setOpen] = useState(null);
  const faqs = [
    { category:"For Guests", items:[
      { q:"How do I book a space?", a:"Browse spaces, click on one you like, select your date on the calendar, choose your guest count, then click Reserve This Space. You'll need to create a free account and complete payment to confirm your booking." },
      { q:"How much does it cost?", a:"Each space sets their own daily rate. You'll also pay a 12% service fee which covers booking protection, customer support, and platform maintenance. The total is always shown before you pay." },
      { q:"Can I cancel my booking?", a:"Yes! You can cancel for a full refund if you cancel at least 48 hours before your event. Cancellations within 48 hours are subject to the host's cancellation policy." },
      { q:"What if the space doesn't match the listing?", a:"Contact us immediately at hello@yardevents.net and we'll work to resolve the issue, including issuing a refund if necessary. All bookings are protected." },
      { q:"How do I contact the host?", a:"Once your booking is confirmed, the host's contact information will be shared with you so you can coordinate setup, parking, and any special requests." },
    ]},
    { category:"For Hosts", items:[
      { q:"How do I list my space?", a:"Create an account, select Host as your role, then click List My Space in your Host Dashboard. Fill in your space details, pricing, and availability." },
      { q:"How much can I earn?", a:"You keep 88% of every booking — we charge a 12% platform fee. Hosts earn an average of $480 per booking and $2,400/month. Payouts are sent within 24 hours of each completed event." },
      { q:"How do I get paid?", a:"Payments are processed securely through Stripe. Once your event is completed, your payout (88% of the booking) is sent directly to your bank account within 24 hours." },
      { q:"What are my responsibilities as a host?", a:"Keep your listing accurate, respond to guest inquiries promptly, ensure the space is clean and ready for the event, and be available for questions on event day." },
    ]},
    { category:"Payments & Safety", items:[
      { q:"Is my payment information safe?", a:"Yes! All payments are processed by Stripe, one of the world's most trusted payment platforms. Your card information is encrypted and never stored on our servers." },
      { q:"What payment methods do you accept?", a:"We accept all major credit and debit cards including Visa, Mastercard, American Express, and Discover." },
      { q:"Is my personal information protected?", a:"Absolutely. We take privacy seriously and never sell your personal information." },
    ]},
  ];

  return (
    <div style={{padding:"64px 5%",maxWidth:800,margin:"0 auto"}}>
      <div style={{marginBottom:40}}>
        <div style={{fontSize:"0.72rem",fontWeight:600,letterSpacing:"0.18em",textTransform:"uppercase",color:"#c06b3a",marginBottom:12}}>Help Center</div>
        <h1 style={{fontFamily:"Cormorant Garamond,serif",fontSize:"clamp(2rem,4vw,3rem)",fontWeight:300,marginBottom:16}}>Frequently Asked <em style={{color:"#c06b3a"}}>Questions</em></h1>
      </div>
      {faqs.map((section,si)=>(
        <div key={si} style={{marginBottom:40}}>
          <h2 style={{fontFamily:"Cormorant Garamond,serif",fontSize:"1.4rem",marginBottom:20,color:"#5a6b4a"}}>{section.category}</h2>
          <div style={{display:"flex",flexDirection:"column",gap:8}}>
            {section.items.map((faq,fi)=>{
              const id=`${si}-${fi}`;
              return (
                <div key={fi} style={{border:"1px solid #d9c9a8",borderRadius:4,overflow:"hidden",background:"#fff"}}>
                  <button onClick={()=>setOpen(open===id?null:id)} style={{width:"100%",padding:"16px 20px",display:"flex",justifyContent:"space-between",alignItems:"center",background:"none",border:"none",textAlign:"left",cursor:"pointer",fontWeight:500,fontSize:"0.92rem",color:"#3b2e22"}}>
                    {faq.q}<span style={{fontSize:"1.2rem",color:"#c06b3a",flexShrink:0,marginLeft:12}}>{open===id?"−":"+"}</span>
                  </button>
                  {open===id&&<div style={{padding:"0 20px 16px",color:"#8a7f72",fontSize:"0.88rem",lineHeight:1.75,borderTop:"1px solid #d9c9a8"}}><div style={{paddingTop:16}}>{faq.a}</div></div>}
                </div>
              );
            })}
          </div>
        </div>
      ))}
      <div style={{background:"#c06b3a",borderRadius:6,padding:32,textAlign:"center",color:"#fff"}}>
        <h3 style={{fontFamily:"Cormorant Garamond,serif",fontSize:"1.4rem",marginBottom:8}}>Still have questions?</h3>
        <p style={{opacity:0.85,marginBottom:20,fontSize:"0.9rem"}}>Our team is here to help. Send us a message and we'll respond within 24 hours.</p>
        <a href="mailto:hello@yardevents.net" style={{background:"#fff",color:"#c06b3a",padding:"12px 28px",borderRadius:3,fontWeight:600,fontSize:"0.85rem",letterSpacing:"0.06em",textTransform:"uppercase",textDecoration:"none",display:"inline-block"}}>Email Us →</a>
      </div>
    </div>
  );
}

export function Footer({ onNavigate }) {
  return (
    <footer style={{background:"#3b2e22",padding:"48px 5% 28px",marginTop:60}}>
      <div style={{display:"grid",gridTemplateColumns:"2fr 1fr 1fr",gap:40,marginBottom:40}}>
        <div>
          <div style={{fontFamily:"Cormorant Garamond,serif",fontSize:"1.4rem",fontWeight:600,color:"#f5f0e8",marginBottom:12}}>Yard<span style={{color:"#c06b3a"}}>Events</span></div>
          <p style={{fontSize:"0.85rem",lineHeight:1.7,color:"rgba(245,240,232,0.5)",maxWidth:240}}>The marketplace for private event spaces. Connecting hosts with guests for unforgettable celebrations.</p>
        </div>
        <div>
          <div style={{fontSize:"0.72rem",letterSpacing:"0.15em",textTransform:"uppercase",color:"#c9a84c",marginBottom:16,fontWeight:600}}>Explore</div>
          {[["Browse Spaces","browse"],["List Your Space","host-dash"],["Help Center","help"],["Contact Us","contact"]].map(([label,page])=>(
            <div key={label} style={{marginBottom:10}}>
              <button onClick={()=>onNavigate(page)} style={{background:"none",border:"none",color:"rgba(245,240,232,0.5)",fontSize:"0.85rem",cursor:"pointer",padding:0}}>{label}</button>
            </div>
          ))}
        </div>
        <div>
          <div style={{fontSize:"0.72rem",letterSpacing:"0.15em",textTransform:"uppercase",color:"#c9a84c",marginBottom:16,fontWeight:600}}>Contact</div>
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
