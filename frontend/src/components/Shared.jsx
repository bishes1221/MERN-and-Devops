import { lazy, Suspense, useState } from "react";
import { Link, NavLink, useNavigate } from "react-router-dom";
import { Compass, Heart, MapPin, Menu, Plus, Search, Sparkles, X } from "lucide-react";
import { useAuth } from "../auth/AuthContext";
import defaultAvatar from "../assets/default-avatar.svg";

const LazyGemMap = lazy(() => import("./GemMap"));

export function Avatar({ src, alt = "", className = "" }) {
  const [failedSrc, setFailedSrc] = useState(null);
  const imageSrc = src && failedSrc !== src ? src : defaultAvatar;
  return <img className={className} src={imageSrc} alt={alt} onError={() => { if (src) setFailedSrc(src); }} />;
}

export function Header() {
  const [menuOpen, setMenuOpen] = useState(false);
  const { user, logout, apiUnavailable } = useAuth();
  const navigate = useNavigate();
  const links = [
    ["/explore", "Explore"],
    ["/curators", "Curators"],
    ["/collections", "Collections"],
    ["/trails", "Trails"],
    ["/leaderboard", "Leaderboard"],
  ];
  const handleLogout = async () => {
    try { await logout(); navigate("/"); } catch { /* Keep the current session when logout cannot reach the API. */ }
  };
  return (
    <>
      {apiUnavailable && <div className="offline-banner" role="status">Demo browsing · API is unavailable. Changes won’t be saved.</div>}
      <header className="site-header">
        <div className="nav-wrap">
          <Link className="brand" to="/" aria-label="Hidden Gems home">
            <span className="brand-mark"><Sparkles size={18} /></span>
            <span>hidden<span className="brand-light">gems</span><small>KATHMANDU, FOUND</small></span>
          </Link>
          <nav className={`main-nav ${menuOpen ? "is-open" : ""}`} aria-label="Main navigation">
            {links.map(([to, label]) => <NavLink key={to} to={to} onClick={() => setMenuOpen(false)}>{label}</NavLink>)}
            {user && <NavLink to="/my-gems" onClick={() => setMenuOpen(false)}>My places</NavLink>}
          </nav>
          <div className="nav-actions">
            <Link to="/saved" className="icon-link" aria-label="Saved places"><Heart size={19} /></Link>
            {user ? (
              <>
                <Link to="/dashboard" className="avatar-link" title="Your dashboard">
                  <Avatar src={user.avatarUrl || user.avatar} alt="" />
                </Link>
                <button className="text-button desktop-only" onClick={handleLogout}>Log out</button>
              </>
            ) : <Link to="/login" className="button button-small button-dark">Log in</Link>}
            <Link to="/gems/new" className="button button-small button-terracotta hide-small"><Plus size={16} /> Share a gem</Link>
            <button className="menu-toggle" onClick={() => setMenuOpen((v) => !v)} aria-label={menuOpen ? "Close menu" : "Open menu"} aria-expanded={menuOpen}>{menuOpen ? <X /> : <Menu />}</button>
          </div>
        </div>
      </header>
    </>
  );
}

export function Shell({ children }) {
  return <><Header />{children}<footer className="site-footer"><Link className="brand footer-brand" to="/"><span className="brand-mark"><Sparkles size={17} /></span><span>hidden<span className="brand-light">gems</span><small>KATHMANDU, FOUND</small></span></Link><p>Find the places that make a city feel like yours.</p><span>Made for curious souls · Kathmandu, Nepal</span></footer></>;
}

export function PageIntro({ eyebrow, title, description, action }) {
  return <div className="page-intro"><div><p className="eyebrow">{eyebrow}</p><h1>{title}</h1>{description && <p className="intro-copy">{description}</p>}</div>{action}</div>;
}

export function GemCard({ gem, compact = false }) {
  const image = gem.images?.[0] || gem.image || "https://images.unsplash.com/photo-1544735716-392fe2489ffa?auto=format&fit=crop&w=1200&q=80";
  const place = gem.location?.address || gem.address || "Kathmandu Valley";
  return (
    <article className={`gem-card ${compact ? "gem-card-compact" : ""}`}>
      <Link to={`/gems/${gem._id || gem.id}`} className="gem-image-link" aria-label={`View ${gem.name}`}>
        <img className="gem-image" src={image} alt={gem.name} loading="lazy" />
        <span className="image-category">{gem.category || "Local favorite"}</span>
      </Link>
      <div className="gem-card-body">
        <div className="gem-card-heading"><Link to={`/gems/${gem._id || gem.id}`}><h3>{gem.name}</h3></Link><span className="rating">✦ {gem.rating || "4.9"}</span></div>
        <p className="gem-location"><MapPin size={14} />{place}</p>
        {!compact && <p className="gem-description">{gem.description}</p>}
        <div className="gem-card-foot"><span className="curator-mini"><Avatar src={gem.submittedBy?.avatar} alt="" /> by {gem.submittedBy?.name || gem.curator?.name || "a local curator"}</span><span className="vote-count">♡ {gem.upvoteCount || gem.upvotes || 0}</span></div>
      </div>
    </article>
  );
}

export function LoadingState({ label = "Finding the good stuff…" }) {
  return <div className="state-card" role="status"><span className="loader" />{label}</div>;
}

export function EmptyState({ title, text, action }) {
  return <div className="state-card empty-state"><span className="empty-icon"><Compass size={23} /></span><h2>{title}</h2><p>{text}</p>{action}</div>;
}

export function SearchBox({ value, onChange, placeholder = "Search places, neighborhoods..." }) {
  return <label className="search-box"><Search size={18} /><input value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} aria-label="Search places" /></label>;
}

export function GemMap(props) {
  return <Suspense fallback={<div className={`map-frame ${props.className || ""}`} role="status">Loading map…</div>}><LazyGemMap {...props} /></Suspense>;
}
