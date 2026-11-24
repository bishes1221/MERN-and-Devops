import { useEffect, useMemo, useState } from "react";
import { Link, Navigate, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { useForm } from "react-hook-form";
import toast from "react-hot-toast";
import { ArrowDown, ArrowLeft, ArrowRight, Bookmark, Check, ChevronRight, Clock3, Compass, Heart, MapPin, Pencil, ShieldCheck, Sparkles, Star, ThumbsUp, Trophy, Users } from "lucide-react";
import api, { isNetworkError } from "../lib/api";
import { useAuth } from "../auth/AuthContext";
import { demoGems } from "../data/demo";
import { categoryOptions, geoPointFromMap, leafletCoordinates, normalizeCategory, normalizeGem } from "../lib/gemAdapter";
import { Avatar, EmptyState, GemCard, GemMap, LoadingState, PageIntro, SearchBox } from "../components/Shared";

function useGems(sort = "newest") {
  const [state, setState] = useState({ loading: true, gems: [], demo: false, error: "" });
  useEffect(() => {
    let active = true;
    api.get("/gems", { params: { limit: 100, sort } }).then(({ data }) => {
      if (active) setState({ loading: false, gems: (data.gems || []).map(normalizeGem), demo: false, error: "" });
    }).catch((error) => {
      if (!active) return;
      if (isNetworkError(error)) {
        setState({ loading: false, gems: demoGems, demo: true, error: "" });
      } else {
        setState({ loading: false, gems: [], demo: false, error: error.response?.data?.message || "Places could not be loaded right now." });
      }
    });
    return () => { active = false; };
  }, [sort]);
  return state;
}

export function LandingPage() {
  const { gems, loading, demo, error } = useGems("popular");
  const [community, setCommunity] = useState(null);
  const [communityError, setCommunityError] = useState(false);
  useEffect(() => {
    let active = true;
    api.get("/public/stats")
      .then(({ data }) => { if (active) setCommunity(data); })
      .catch(() => { if (active) setCommunityError(true); });
    return () => { active = false; };
  }, []);
  const featured = [...gems].sort((a, b) => (b.upvoteCount || 0) - (a.upvoteCount || 0)).slice(0, 3);
  return (
    <main>
      <section className="hero">
        <div className="hero-copy">
          <span className="hero-kicker"><span className="kicker-line" /> A LOCAL'S GUIDE TO THE VALLEY</span>
          <h1>Find your own<br /><em>kind of</em> Kathmandu.</h1>
          <p>Beyond the guidebooks, there’s a city full of little wonders. Find the places locals love, one hidden gem at a time.</p>
          <div className="hero-actions"><Link to="/explore" className="button button-dark">Explore the map <ArrowRight size={17} /></Link><Link to="/gems/new" className="button button-quiet"><PlusIcon /> Share a hidden gem</Link></div>
          <div className="hero-proof">{community?.featuredCurators?.length > 0 && <div className="avatar-stack">{community.featuredCurators.slice(0, 3).map((curator) => <Avatar key={curator._id} src={curator.user?.avatarUrl} alt="" />)}</div>}<span><strong>{community ? `${community.stats.gemsMapped.toLocaleString()}${community.stats.gemsMapped > 0 ? "+" : ""}` : "Local"}</strong> places shared by locals</span></div>
        </div>
        <div className="hero-art">
          <img className="hero-photo" src="https://images.unsplash.com/photo-1605640840605-14ac1855827b?auto=format&fit=crop&w=1400&q=88" alt="Prayer flags and temple rooftops in Kathmandu" />
          <div className="photo-caption"><span className="caption-pin"><MapPin size={16} /></span><span><strong>Somewhere in Boudha</strong><small>There’s always more around the corner</small></span><Sparkles className="caption-sparkle" size={18} /></div>
          <div className="hero-stamp"><span>THE VALLEY</span><strong>IS YOURS<br />TO FIND</strong><span>◦ 27.7172° N ◦</span></div>
          <span className="hero-ornament" aria-hidden="true">✳</span>
        </div>
      </section>
      <section className="home-section community-stats-section">
        <div className="community-stats">{community ? [["Gems mapped", community.stats.gemsMapped], ["Neighborhoods covered", community.stats.neighborhoodsCovered], ["Local tips shared", community.stats.tipsShared]].map(([label, value]) => <div key={label}><strong>{Number(value).toLocaleString()}</strong><span>{label}</span></div>) : communityError ? <p className="intro-copy">Community stats are unavailable right now.</p> : <LoadingState label="Gathering community stats…" />}</div>
      </section>
      <section className="home-section category-section">
        <div className="section-heading"><div><p className="eyebrow">GO WHERE YOU FEEL</p><h2>A city, a thousand little stories.</h2></div><Link to="/explore" className="link-arrow">Browse all places <ArrowRight size={16} /></Link></div>
        <div className="category-row">
          {[["☕", "A really good cup", "Cafés & food"], ["⌂", "Old souls & stories", "Culture & history"], ["↟", "A breath of quiet", "Quiet corners"], ["✳", "Out in the open", "Nature & views"]].map(([icon, text, cat]) => <Link className="category-tile" key={cat} to={`/explore?category=${encodeURIComponent(cat)}`}><span className="category-glyph">{icon}</span><span>{text}</span><ArrowRight size={15} /></Link>)}
        </div>
      </section>
      <section className="home-section featured-section">
        <div className="section-heading"><div><p className="eyebrow">A FEW LOCAL FAVORITES</p><h2>Worth taking the long way for.</h2></div><Link to="/explore" className="link-arrow">Explore the map <ArrowRight size={16} /></Link></div>
        {demo && <p className="demo-label"><Sparkles size={14} /> Previewing demo places because the API is unreachable.</p>}
        {loading ? <LoadingState /> : error ? <EmptyState title="Places haven’t loaded" text={error} action={<Link to="/explore" className="button button-outline">Try exploring</Link>} /> : <div className="gem-grid">{featured.length ? featured.map((gem) => <GemCard key={gem._id || gem.id} gem={gem} />) : <EmptyState title="The first gems are on their way." text="Check back soon, or be the first to share a local favorite." action={<Link to="/gems/new" className="button button-dark">Share a gem</Link>} />}</div>}
      </section>
      <section className="home-section how-it-works" id="how-it-works">
        <div className="section-heading"><div><p className="eyebrow">HOW IT WORKS</p><h2>Small discoveries, shared well.</h2></div></div>
        <div className="steps-grid">{[["01", "Spot it", "Find a place that deserves a little more love."], ["02", "Pin & share", "Add its location, story, and practical local tips."], ["03", "Community review", "Our community team helps keep the map useful."], ["04", "Go explore", "Save the spots that make you curious."]].map(([number, title, description]) => <article className="step-card" key={number}><span>{number}</span><h3>{title}</h3><p>{description}</p></article>)}</div>
      </section>
      <section className="home-section featured-curators">
        <div className="section-heading"><div><p className="eyebrow">LOCAL KNOW-HOW</p><h2>Meet the people who know.</h2></div><Link to="/curators" className="link-arrow">Meet all curators <ArrowRight size={16} /></Link></div>
        {community?.featuredCurators?.length ? <div className="people-grid">{community.featuredCurators.map((curator) => <Link to={`/curators/${curator.user._id}`} className="person-card" key={curator._id}><Avatar src={curator.user.avatarUrl} alt="" /><div><span className="eyebrow">LOCAL CURATOR</span><h3>{curator.user.name}</h3><p>{curator.bio}</p><span className="person-stats">{curator.gemCount} places · {curator.points} upvotes</span></div></Link>)}</div> : <p className="intro-copy">{communityError ? "Curator highlights are temporarily unavailable." : "Local curator profiles will be featured here as they join."}</p>}
      </section>
      {community?.recentTips?.length > 0 && <section className="home-section community-tips">
        <div className="section-heading"><div><p className="eyebrow">FROM THE COMMUNITY</p><h2>Good advice travels.</h2></div></div>
        <div className="tips-grid">{community.recentTips.map((tip) => <article className="tip-quote" key={tip._id}><Star size={16} /><p>“{tip.comment}”</p><small>{tip.user?.name || "A local explorer"} · {tip.gem?.title || "Kathmandu Valley"}</small></article>)}</div>
      </section>}
      <section className="contribute-banner"><div className="contribute-mark"><Sparkles size={24} /></div><div><p className="eyebrow">KNOW A PLACE?</p><h2>Good things are better shared.</h2><p>Help someone else fall for the city. Add the place you keep coming back to.</p></div><Link to="/gems/new" className="button button-cream">Share a hidden gem <ArrowRight size={16} /></Link></section>
    </main>
  );
}

function PlusIcon() { return <span aria-hidden="true" className="plus-inline">＋</span>; }

export function ExplorePage() {
  const { gems, loading, demo, error } = useGems();
  const [searchParams, setSearchParams] = useSearchParams();
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState(searchParams.get("category") || "All places");
  const [neighborhood, setNeighborhood] = useState("All neighborhoods");
  const [vibe, setVibe] = useState("Any vibe");
  const [priceLevel, setPriceLevel] = useState("any");
  const [sort, setSort] = useState("popular");
  const [showMap, setShowMap] = useState(true);
  const filtered = useMemo(() => {
    const matches = gems.filter((gem) => {
      const text = `${gem.name} ${gem.description} ${gem.category} ${gem.address} ${(gem.tags || []).join(" ")}`.toLowerCase();
      const tags = (gem.tags || []).join(" ").toLowerCase();
      return (!query || text.includes(query.toLowerCase()))
        && (category === "All places" || normalizeCategory(gem.category) === normalizeCategory(category))
        && (neighborhood === "All neighborhoods" || (gem.address || "").toLowerCase().includes(neighborhood.toLowerCase()))
        && (vibe === "Any vibe" || tags.includes(vibe.toLowerCase()))
        && (priceLevel === "any" || Number(gem.priceLevel || 0) <= Number(priceLevel));
    });
    const coordsForSort = (gem) => leafletCoordinates(gem) || [27.7172, 85.324];
    return matches.sort((a, b) => {
      if (sort === "popular") return (b.upvoteCount || 0) - (a.upvoteCount || 0);
      if (sort === "rating") return (b.rating || 0) - (a.rating || 0);
      if (sort === "nearest") {
        const [alat, alng] = coordsForSort(a);
        const [blat, blng] = coordsForSort(b);
        return Math.hypot(alat - 27.7172, alng - 85.324) - Math.hypot(blat - 27.7172, blng - 85.324);
      }
      return new Date(b.createdAt || 0) - new Date(a.createdAt || 0);
    });
  }, [gems, query, category, neighborhood, vibe, priceLevel, sort]);
  const chooseCategory = (value) => { setCategory(value); setSearchParams(value === "All places" ? {} : { category: value }); };
  return <main className="content-page explore-page">
    <div className="explore-heading"><div><p className="eyebrow">THE CITY, YOUR WAY</p><h1>Find a little wonder.</h1><p className="intro-copy">A local favorite is never far away.</p></div><button className="button button-outline map-toggle" onClick={() => setShowMap((v) => !v)}><MapPin size={16} /> {showMap ? "Hide map" : "Show map"}</button></div>
    <div className="explore-tools">
      <SearchBox value={query} onChange={setQuery} />
      <div className="discovery-filters">
        <label className="field-label">Neighborhood<select value={neighborhood} onChange={(event) => setNeighborhood(event.target.value)}>{["All neighborhoods", "Thamel", "Patan", "Bhaktapur", "Boudha", "Kirtipur", "Jhamsikhel", "Lazimpat", "Swayambhu"].map((item) => <option key={item}>{item}</option>)}</select></label>
        <label className="field-label">Price<select value={priceLevel} onChange={(event) => setPriceLevel(event.target.value)}><option value="any">Any budget</option><option value="0">Free</option><option value="1">$ · Budget friendly</option><option value="2">$$ · Moderate</option><option value="3">$$$ · Higher price</option></select></label>
        <label className="field-label">Sort by<select value={sort} onChange={(event) => setSort(event.target.value)}><option value="popular">Most loved</option><option value="newest">Newest</option><option value="rating">Top rated</option><option value="nearest">Near Kathmandu center</option></select></label>
      </div>
      <div className="filter-chips" aria-label="Filter by category"><button className={`filter-chip ${category === "All places" ? "active" : ""}`} onClick={() => chooseCategory("All places")}>All places</button>{categoryOptions.map((item) => <button key={item.value} className={`filter-chip ${normalizeCategory(category) === item.value ? "active" : ""}`} onClick={() => chooseCategory(item.value)}>{item.label}</button>)}</div>
      <div className="filter-chips" aria-label="Filter by vibe">{["Any vibe", "Quiet", "Lively", "Budget-Friendly", "Sunset", "Morning Walk"].map((item) => <button key={item} className={`filter-chip ${vibe === item ? "active" : ""}`} onClick={() => setVibe(item)}>{item}</button>)}</div>
    </div>
    {demo && <p className="demo-label"><Sparkles size={14} /> Demo preview · the API is unreachable. These sample places aren’t live listings.</p>}
    <div className={`explore-layout ${!showMap ? "no-map" : ""}`}>
      <section className="results-panel" aria-live="polite">
        <div className="results-summary"><strong>{filtered.length} places to discover</strong><span>Sorted by {sort} <ArrowDown size={13} /></span></div>
        {loading ? <LoadingState /> : error ? <EmptyState title="Places haven’t loaded" text={error} /> : filtered.length ? <div className="gem-grid explore-grid">{filtered.map((gem) => <GemCard key={gem._id || gem.id} gem={gem} />)}</div> : <EmptyState title="No gems found" text="Try another search or clear the category filter." action={<button onClick={() => { setQuery(""); chooseCategory("All places"); }} className="button button-outline">Clear filters</button>} />}
      </section>
      {showMap && <aside className="explore-map"><GemMap gems={filtered} /><div className="map-legend"><span className="map-dot" /> Gems across Kathmandu Valley <span>·</span> OpenStreetMap</div></aside>}
    </div>
  </main>;
}

export function AuthPage({ mode }) {
  const { authenticate } = useAuth();
  const navigate = useNavigate();
  const register = mode === "register";
  const { register: field, handleSubmit, watch, formState: { errors, isSubmitting } } = useForm();
  const password = watch("password");
  const onSubmit = async (values) => {
    try {
      const { confirmPassword, ...payload } = values;
      await authenticate(register ? "/auth/register" : "/auth/login", payload);
      toast.success(register ? "Welcome to the neighborhood!" : "Welcome back!");
      navigate("/dashboard");
    } catch (error) {
      toast.error(error.response?.data?.message || (isNetworkError(error) ? "The API is unavailable. Please try again when it’s online." : "We couldn’t sign you in. Check your details and try again."));
    }
  };
  return <main className="auth-page"><div className="auth-visual"><img src="https://images.unsplash.com/photo-1544735716-392fe2489ffa?auto=format&fit=crop&w=1100&q=88" alt="Colorful Kathmandu streets" /><div className="auth-visual-copy"><span>THE BEST PLACES</span><h2>Are the ones<br />you stumble upon.</h2><p>A little local knowledge goes a long way.</p></div></div><section className="auth-form-wrap"><Link to="/" className="back-link"><ArrowLeft size={16} /> Back home</Link><div className="auth-form-inner"><p className="eyebrow">{register ? "PULL UP A CHAIR" : "GOOD TO SEE YOU"}</p><h1>{register ? "Join the neighborhood." : "Welcome back."}</h1><p className="intro-copy">{register ? "Create an account and start finding your own Kathmandu." : "Your next favorite place is waiting."}</p>
    <form className="form-stack" onSubmit={handleSubmit(onSubmit)} noValidate>
      {register && <label className="field-label">Your name<input {...field("name", { required: "Tell us your name.", minLength: { value: 2, message: "Use at least two characters." } })} placeholder="e.g. Maya Lama" autoComplete="name" />{errors.name && <span className="field-error">{errors.name.message}</span>}</label>}
      <label className="field-label">Email address<input type="email" {...field("email", { required: "Enter your email.", pattern: { value: /^\S+@\S+\.\S+$/, message: "Enter a valid email address." } })} placeholder="you@example.com" autoComplete="email" />{errors.email && <span className="field-error">{errors.email.message}</span>}</label>
      <label className="field-label">Password<input type="password" {...field("password", { required: "Enter your password.", minLength: { value: register ? 8 : 1, message: "Use at least 8 characters." } })} placeholder={register ? "At least 8 characters" : "Your password"} autoComplete={register ? "new-password" : "current-password"} />{errors.password && <span className="field-error">{errors.password.message}</span>}</label>
      {register && <label className="field-label">Confirm password<input type="password" {...field("confirmPassword", { required: "Confirm your password.", validate: (value) => value === password || "Passwords don’t match." })} autoComplete="new-password" />{errors.confirmPassword && <span className="field-error">{errors.confirmPassword.message}</span>}</label>}
      <button className="button button-dark button-wide" disabled={isSubmitting}>{isSubmitting ? "One moment…" : register ? "Create your account" : "Log in"} <ArrowRight size={17} /></button>
    </form><p className="auth-switch">{register ? "Already found us?" : "New around here?"} <Link to={register ? "/login" : "/register"}>{register ? "Log in" : "Create an account"}</Link></p>
    </div></section></main>;
}

export function GemDetailPage() {
  const { id } = useParams();
  const { user } = useAuth();
  const [gem, setGem] = useState(null);
  const [loading, setLoading] = useState(true);
  const [demo, setDemo] = useState(false);
  const [upvoted, setUpvoted] = useState(false);
  const [saved, setSaved] = useState(false);
  const [bucketLists, setBucketLists] = useState([]);
  const [selectedBucketList, setSelectedBucketList] = useState("");
  const [listPickerOpen, setListPickerOpen] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const [reviewBusy, setReviewBusy] = useState(false);
  useEffect(() => {
    let active = true;
    api.get(`/gems/${id}`).then(({ data }) => {
      if (!active) return;
      const nextGem = normalizeGem(data.gem);
      setGem(nextGem);
      setUpvoted(Boolean(nextGem.viewer?.upvoted));
      setSaved(Boolean(nextGem.viewer?.bookmarked));
    }).catch((error) => {
      if (active && isNetworkError(error)) {
        const found = demoGems.find((item) => item._id === id);
        if (found) { setGem(normalizeGem(found)); setDemo(true); }
      }
    }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [id]);
  useEffect(() => {
    if (!user) { setBucketLists([]); return; }
    let active = true;
    api.get("/bucket-lists")
      .then(({ data }) => {
        if (active) {
          const lists = data.lists || [];
          setBucketLists(lists);
          setSelectedBucketList((current) => current || lists[0]?._id || "");
        }
      })
      .catch((error) => {
        if (active) toast.error(error.response?.data?.message || "Your bucket lists couldn’t be loaded.");
      });
    return () => { active = false; };
  }, [user?._id]);
  const vote = async () => {
    if (!user) { toast("Log in to cheer on a local favorite."); return; }
    try {
      const { data } = await api.post(`/gems/${id}/upvote`);
      setUpvoted(Boolean(data.upvoted));
      setGem((current) => ({ ...current, upvoteCount: data.upvoteCount }));
      toast.success(data.upvoted ? "You gave this place some love." : "Your vote was removed.");
    } catch (error) { toast.error(error.response?.data?.message || "Your vote couldn’t be saved. Please try again."); }
  };
  const bookmark = async () => {
    if (!user) { toast("Log in to save places for later."); return; }
    try {
      if (saved) await api.delete(`/bookmarks/${id}`);
      else await api.post(`/bookmarks/${id}`);
      setSaved(!saved);
      toast.success(saved ? "Removed from saved places." : "Saved for your next wander.");
    } catch (error) { toast.error(error.response?.data?.message || "Your saved places couldn’t be updated."); }
  };
  const addToBucketList = async (event) => {
    event.preventDefault();
    if (!selectedBucketList) return;
    try {
      await api.put(`/bucket-lists/${selectedBucketList}/gems/${id}`);
      setListPickerOpen(false);
      toast.success("Added to your bucket list.");
    } catch (error) {
      toast.error(error.response?.data?.message || "This place couldn’t be added to your list.");
    }
  };
  const sendReport = async (event) => {
    event.preventDefault();
    if (!user) { toast("Log in to report a place."); return; }
    const form = new FormData(event.currentTarget);
    try {
      await api.post("/reports", {
        gemId: id,
        reason: form.get("reason"),
        details: form.get("details"),
      });
      setReportOpen(false);
      toast.success("Thanks. The community team will review this listing.");
    } catch (error) {
      toast.error(error.response?.data?.message || "Your report couldn’t be sent.");
    }
  };
  const saveReview = async (event) => {
    event.preventDefault();
    if (!user) { toast("Log in to share a local tip."); return; }
    const form = new FormData(event.currentTarget);
    const currentReview = gem.reviews?.find((review) => String(review.user?._id || review.user) === String(user._id));
    const payload = { rating: Number(form.get("rating")), comment: String(form.get("comment") || "") };
    setReviewBusy(true);
    try {
      if (currentReview) {
        await api.patch(`/gems/reviews/${currentReview._id}`, payload);
      } else {
        await api.post(`/gems/${id}/reviews`, payload);
      }
      const { data } = await api.get(`/gems/${id}`);
      setGem(normalizeGem(data.gem));
      toast.success(currentReview ? "Your review has been updated." : "Thanks for sharing a helpful local tip.");
    } catch (error) {
      toast.error(error.response?.data?.message || "Your review couldn’t be saved.");
    } finally {
      setReviewBusy(false);
    }
  };
  if (loading) return <main className="content-page"><LoadingState /></main>;
  if (!gem) return <main className="content-page"><EmptyState title="This gem is off the map" text="It may have moved, or the place is no longer listed." action={<Link className="button button-dark" to="/explore">Explore other places</Link>} /></main>;
  const image = gem.images?.[0] || gem.image;
  const coordinates = leafletCoordinates(gem);
  const currentUserId = user?._id || user?.id;
  const currentReview = gem.reviews?.find((review) => String(review.user?._id || review.user) === String(currentUserId));
  const canEdit = user && (user.role === "admin" || String(gem.createdBy?._id || gem.createdBy) === String(currentUserId));
  return <main className="content-page detail-page">
    <Link className="back-link" to="/explore"><ArrowLeft size={15} /> Back to exploring</Link>
    {demo && <p className="demo-label"><Sparkles size={14} /> Demo preview · this sample listing is not live.</p>}
    <div className="detail-grid">
      <article>
        <div className="detail-hero"><img src={image} alt={gem.name} /><span className="image-category">{gem.category}</span></div>
        <div className="detail-content">
          {gem.status === "pending" && <p className="demo-label">Pending community review · only you can see this listing.</p>}
          <p className="eyebrow">{gem.category || "A LOCAL FAVORITE"}</p>
          <h1>{gem.name}</h1>
          <p className="detail-location"><MapPin size={17} />{gem.address || "Kathmandu Valley"} <span>·</span> <Star size={15} fill="currentColor" /> {gem.rating ? Number(gem.rating).toFixed(1) : "New"}</p>
          <p className="detail-description">{gem.description}</p>
          {(gem.priceLevel !== undefined || gem.bestTimeToVisit || gem.insiderTip) && <div className="gem-practical">
            {gem.priceLevel !== undefined && <span><small>PRICE</small><strong>{["Free", "$", "$$", "$$$"][gem.priceLevel] || "Not specified"}</strong></span>}
            {gem.bestTimeToVisit && <span><small>BEST TIME</small><strong>{gem.bestTimeToVisit}</strong></span>}
          </div>}
          {gem.insiderTip && <p className="insider-tip"><strong>Local tip</strong>{gem.insiderTip}</p>}
          {gem.curatorUpdates?.length > 0 && <section className="curator-updates"><h2>Latest local updates</h2>{gem.curatorUpdates.map((update) => <article key={update._id}><p>{update.message || "Business information updated."}</p>{update.openingHours && <small>Opening hours: {update.openingHours}</small>}<small>{update.curator?.user?.name ? ` · From ${update.curator.user.name}` : ""}{update.createdAt ? ` · ${new Date(update.createdAt).toLocaleDateString()}` : ""}</small></article>)}</section>}
          <div className="tag-row">{(gem.tags || ["Local favorite", "Worth a visit"]).map((tag) => <span className="tag" key={tag}>{tag}</span>)}</div>
          <div className="detail-actions">
            {gem.status === "approved" ? <>
              <button className={`button ${upvoted ? "button-terracotta" : "button-dark"}`} onClick={vote}><ThumbsUp size={17} /> {upvoted ? "You love this" : "I love this"} · {gem.upvoteCount || 0}</button>
              <button className={`button button-outline ${saved ? "saved" : ""}`} onClick={bookmark}><Bookmark size={16} fill={saved ? "currentColor" : "none"} /> {saved ? "Saved" : "Save for later"}</button>
              {user && <button className="button button-outline" onClick={() => setListPickerOpen((open) => !open)}>Add to a list</button>}
              <button className="button button-outline" onClick={() => setReportOpen((open) => !open)}>Report a problem</button>
            </> : <span className="detail-state-note">Community actions are available once this gem is approved.</span>}
            {canEdit && <Link className="button button-outline" to={`/gems/${id}/edit`}><Pencil size={15} /> Edit place</Link>}
          </div>
          {listPickerOpen && user && <form className="review-form bucket-list-picker" onSubmit={addToBucketList}>
            {bucketLists.length ? <><label className="field-label">Choose a bucket list<select value={selectedBucketList} onChange={(event) => setSelectedBucketList(event.target.value)}>{bucketLists.map((list) => <option key={list._id} value={list._id}>{list.title}</option>)}</select></label><button className="button button-dark">Add to list</button></> : <p className="intro-copy">Create your first list from <Link to="/saved">Saved places</Link>.</p>}
          </form>}
          {reportOpen && <form className="review-form" onSubmit={sendReport}>
            <label className="field-label">What needs attention?<select name="reason" defaultValue="inaccurate"><option value="inaccurate">Inaccurate information</option><option value="closed">Permanently closed</option><option value="duplicate">Duplicate listing</option><option value="inappropriate">Spam or inappropriate</option><option value="other">Something else</option></select></label>
            <label className="field-label">Details<textarea name="details" maxLength="1500" rows="3" placeholder="Add helpful context (optional)" /></label>
            <button className="button button-dark">Send report</button>
          </form>}
          <div className="curator-card"><Avatar src={gem.submittedBy?.avatar} alt="" /><div><small>SHARED BY A LOCAL</small><strong>{gem.submittedBy?.name || "A neighborhood explorer"}</strong></div><ShieldCheck size={19} /></div>
          <section className="community-reviews">
            <div className="panel-heading"><h2>Community tips & reviews</h2><span>{gem.reviews?.length || 0} shared</span></div>
            {user && gem.status === "approved" && <form className="review-form" onSubmit={saveReview}>
              <label className="field-label">Your rating<select name="rating" defaultValue={currentReview?.rating || 5}><option value="5">5 — Loved it</option><option value="4">4 — Great</option><option value="3">3 — Good</option><option value="2">2 — Not for me</option><option value="1">1 — Needs a note</option></select></label>
              <label className="field-label">Helpful local tip<textarea name="comment" rows="3" minLength="2" maxLength="2000" required defaultValue={currentReview?.comment || ""} placeholder="What should a visitor know?" /></label>
              <button className="button button-dark" disabled={reviewBusy}>{reviewBusy ? "Saving…" : currentReview ? "Update your review" : "Share your tip"}</button>
            </form>}
            {(gem.reviews || []).map((review) => <article className="review-item" key={review._id}><strong>{review.user?.name || "Community explorer"}</strong><span> · {review.rating}/5</span><p>{review.comment}</p></article>)}
            {!user && <p className="intro-copy">Log in to share a helpful tip or rating.</p>}
          </section>
        </div>
      </article>
      <aside className="detail-aside">
        <div className="aside-map"><GemMap gems={[gem]} /></div>
        <p className="detail-location"><MapPin size={15} /> {gem.address || "Kathmandu Valley"}</p>
        {coordinates && <a className="aside-link" href={`https://www.google.com/maps/search/?api=1&query=${coordinates[0]},${coordinates[1]}`} target="_blank" rel="noreferrer">Open in Maps <ArrowRight size={15} /></a>}
        <p className="aside-note">Keep an eye out, and remember to be a thoughtful guest.</p>
        <Link to="/trails" className="aside-link">Find a trail nearby <ArrowRight size={15} /></Link>
      </aside>
    </div>
  </main>;
}

export function GemFormPage() {
  const { id } = useParams();
  const edit = Boolean(id);
  const navigate = useNavigate();
  const { user } = useAuth();
  const [coordinates, setCoordinates] = useState([27.7172, 85.324]);
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [existingImages, setExistingImages] = useState([]);
  const [loading, setLoading] = useState(edit);
  const { register: field, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm();
  useEffect(() => {
    if (!edit) return;
    api.get(`/gems/${id}`).then(({ data }) => {
      const gem = normalizeGem(data.gem);
      setExistingImages(gem.images || []);
      reset({
        name: gem.name || gem.title,
        category: normalizeCategory(gem.category),
        description: gem.description,
        address: gem.address,
        image: gem.images?.[0] || "",
        priceLevel: String(gem.priceLevel ?? 0),
        tags: (gem.tags || []).join(", "),
        bestTimeToVisit: gem.bestTimeToVisit || "",
        insiderTip: gem.insiderTip || "",
      });
      const point = leafletCoordinates(gem);
      if (point) setCoordinates(point);
    }).catch((error) => toast.error(error.response?.data?.message || "This place couldn’t be loaded for editing.")).finally(() => setLoading(false));
  }, [edit, id, reset]);
  if (loading) return <main className="content-page"><LoadingState label="Loading your place…" /></main>;
  const onSubmit = async (values) => {
    try {
      let images = edit ? [...existingImages] : [];
      if (values.image) {
        if (images.length) images[0] = values.image;
        else images.push(values.image);
      } else if (edit && images.length) {
        images.shift();
      }
      if (selectedFiles.length) {
        const formData = new FormData();
        selectedFiles.forEach((file) => formData.append("images", file));
        const { data: uploadData } = await api.post("/uploads/images", formData, {
          headers: { "Content-Type": "multipart/form-data" },
        });
        images = [...images, ...(uploadData.images || [])];
      }
      const payload = {
        title: values.name,
        category: normalizeCategory(values.category),
        description: values.description,
        address: values.address,
        priceLevel: Number(values.priceLevel),
        tags: values.tags.split(",").map((tag) => tag.trim()).filter(Boolean),
        bestTimeToVisit: values.bestTimeToVisit,
        insiderTip: values.insiderTip,
        location: geoPointFromMap(coordinates),
        images,
      };
      const { data } = edit ? await api.patch(`/gems/${id}`, payload) : await api.post("/gems", payload);
      toast.success(edit ? "Your place has been updated." : "Your place has been shared with the community.");
      const savedId = data.gem?._id || data.gem?.id || id;
      navigate(savedId ? `/gems/${savedId}` : "/explore");
    } catch (error) {
      toast.error(error.response?.data?.message || (isNetworkError(error) ? "The API is unavailable. Your place was not saved." : "Your place couldn’t be saved. Please check the details."));
    }
  };
  return <main className="content-page submit-page">
    <Link to="/explore" className="back-link"><ArrowLeft size={15} /> Back to exploring</Link>
    <PageIntro eyebrow={edit ? "MAKE IT JUST RIGHT" : "PASS IT ON"} title={edit ? "Edit your hidden gem." : "Share a hidden gem."} description="Tell us what makes this place worth finding. The best recommendations feel like a note from a friend." />
    <form className="submit-layout" onSubmit={handleSubmit(onSubmit)} noValidate>
      <section className="form-card">
        <label className="field-label">Place name<input {...field("name", { required: "Give your place a name.", minLength: { value: 3, message: "Use at least 3 characters." } })} placeholder="A name locals know it by" />{errors.name && <span className="field-error">{errors.name.message}</span>}</label>
        <label className="field-label">What kind of place?<select {...field("category", { required: "Choose a category." })}><option value="">Select a category</option>{categoryOptions.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}</select>{errors.category && <span className="field-error">{errors.category.message}</span>}</label>
        <label className="field-label">The story behind it<textarea rows="5" {...field("description", { required: "Tell us what makes it special.", minLength: { value: 25, message: "Add a little more detail (25 characters minimum)." } })} placeholder="What makes this place worth finding? Share the story behind it." />{errors.description && <span className="field-error">{errors.description.message}</span>}</label>
        <label className="field-label">Insider tip <span className="optional-text">optional</span><textarea rows="3" maxLength="1000" {...field("insiderTip")} placeholder="What should a visitor order, notice, or know before going?" /></label>
        <label className="field-label">Neighborhood or address<input {...field("address", { required: "Add a neighborhood or address." })} placeholder="e.g. Patan, Lalitpur" />{errors.address && <span className="field-error">{errors.address.message}</span>}</label>
        <div className="discovery-filters">
          <label className="field-label">Price<select {...field("priceLevel")}><option value="0">Free</option><option value="1">$ · Budget friendly</option><option value="2">$$ · Moderate</option><option value="3">$$$ · Higher price</option></select></label>
          <label className="field-label">Best time to visit <span className="optional-text">optional</span><input maxLength="120" {...field("bestTimeToVisit")} placeholder="e.g. Early morning or golden hour" /></label>
        </div>
        <label className="field-label">Vibes and tags <span className="optional-text">comma-separated, optional</span><input maxLength="400" {...field("tags")} placeholder="Quiet, sunset, budget-friendly" /></label>
        <label className="field-label">Photo URL <span className="optional-text">optional</span><input type="url" {...field("image", { pattern: { value: /^https?:\/\/.+/i, message: "Use a complete image URL." } })} placeholder="https://..." />{errors.image && <span className="field-error">{errors.image.message}</span>}</label>
        <label className="field-label">Upload photos <span className="optional-text">up to 8 images, 5 MB each</span><input type="file" accept="image/jpeg,image/png,image/webp,image/avif" multiple onChange={(event) => {
          const files = Array.from(event.target.files || []);
          if (files.length > 8 || files.some((file) => file.size > 5 * 1024 * 1024)) {
            toast.error("Choose up to 8 images, each no larger than 5 MB.");
            event.target.value = "";
            setSelectedFiles([]);
            return;
          }
          setSelectedFiles(files);
        }} />{selectedFiles.length > 0 && <span className="optional-text">{selectedFiles.length} photo{selectedFiles.length === 1 ? "" : "s"} ready to upload</span>}</label>
        <div className="field-label">Pin it on the map <span className="optional-text">Click to place the marker</span><GemMap value={coordinates} onPick={setCoordinates} className="picker-map" /><span className="coordinates">Coordinates: {coordinates[0].toFixed(5)}, {coordinates[1].toFixed(5)}</span></div>
        <p className="privacy-note"><ShieldCheck size={17} /> We’ll never share private or sensitive locations without permission.</p>
        <button className="button button-dark button-wide" disabled={isSubmitting}>{isSubmitting ? "Saving…" : edit ? "Save changes" : "Share this gem"} <ArrowRight size={16} /></button>
      </section>
      <aside className="submit-aside"><div className="tip-card"><Sparkles size={20} /><p className="eyebrow">A GOOD GEM HAS</p><ul><li>A detail you’d only know by going</li><li>A hint about the best time to visit</li><li>A respectful, specific location pin</li></ul></div><div className="submit-byline"><Avatar src={user?.avatarUrl} alt="" /><span>Shared by<br /><strong>{user?.name || "you, the local"}</strong></span></div></aside>
    </form>
  </main>;
}

export function SavedPage() {
  const { user, loading: authLoading } = useAuth();
  const [state, setState] = useState({ loading: true, gems: [], demo: false, error: "" });
  const [lists, setLists] = useState([]);
  const [listTitle, setListTitle] = useState("");
  const [listDescription, setListDescription] = useState("");
  const [creating, setCreating] = useState(false);
  const [editingListId, setEditingListId] = useState("");
  const [editingTitle, setEditingTitle] = useState("");
  const [editingDescription, setEditingDescription] = useState("");
  const [updatingList, setUpdatingList] = useState(false);
  useEffect(() => {
    if (!user) { setState({ loading: false, gems: [], demo: false, error: "" }); setLists([]); return; }
    let active = true;
    Promise.all([api.get("/bookmarks"), api.get("/bucket-lists")])
      .then(([bookmarks, bucketLists]) => {
        if (!active) return;
        setState({ loading: false, gems: (bookmarks.data.gems || []).map(normalizeGem), demo: false, error: "" });
        setLists(bucketLists.data.lists || []);
      })
      .catch((error) => { if (active) setState({ loading: false, gems: isNetworkError(error) ? demoGems.slice(0, 2) : [], demo: isNetworkError(error), error: error.response?.data?.message || "Your saved places couldn’t be loaded." }); });
    return () => { active = false; };
  }, [user]);
  const createList = async (event) => {
    event.preventDefault();
    setCreating(true);
    try {
      const { data } = await api.post("/bucket-lists", { title: listTitle, description: listDescription });
      setLists((current) => [data.list, ...current]);
      setListTitle("");
      setListDescription("");
      toast.success("Your bucket list is ready.");
    } catch (error) {
      toast.error(error.response?.data?.message || "Your bucket list couldn’t be created.");
    } finally {
      setCreating(false);
    }
  };
  const editList = (list) => {
    setEditingListId(list._id);
    setEditingTitle(list.title);
    setEditingDescription(list.description || "");
  };
  const updateList = async (event) => {
    event.preventDefault();
    setUpdatingList(true);
    try {
      const { data } = await api.patch(`/bucket-lists/${editingListId}`, { title: editingTitle, description: editingDescription });
      setLists((current) => current.map((list) => list._id === editingListId ? { ...list, ...data.list } : list));
      setEditingListId("");
      toast.success("Your bucket list was updated.");
    } catch (error) {
      toast.error(error.response?.data?.message || "Your bucket list couldn’t be updated.");
    } finally {
      setUpdatingList(false);
    }
  };
  const deleteList = async (list) => {
    if (!window.confirm(`Delete “${list.title}” and remove its saved places from this list?`)) return;
    try {
      await api.delete(`/bucket-lists/${list._id}`);
      setLists((current) => current.filter((item) => item._id !== list._id));
      toast.success("Bucket list deleted.");
    } catch (error) {
      toast.error(error.response?.data?.message || "The bucket list couldn’t be deleted.");
    }
  };
  if (!user && !authLoading) return <Navigate to="/login" replace />;
  return <main className="content-page"><PageIntro eyebrow="YOUR LITTLE BLACK BOOK" title="Saved for later." description="Keep the places you love in one spot, or make a list for your next kind of day." /><section className="saved-content">{authLoading || state.loading ? <LoadingState /> : state.error ? <EmptyState title="Saved places didn’t load" text={state.error} /> : <>
    {state.demo && <p className="demo-label">Demo preview · saved places are unavailable until the API connects.</p>}
    <form className="form-card bucket-list-create" onSubmit={createList}>
      <h2>Create a bucket list</h2>
      <label className="field-label">List name<input value={listTitle} onChange={(event) => setListTitle(event.target.value)} required minLength={2} maxLength={60} placeholder="A slow afternoon in Patan" /></label>
      <label className="field-label">Description <span className="optional-text">optional</span><textarea rows="2" value={listDescription} onChange={(event) => setListDescription(event.target.value)} maxLength={300} placeholder="Places to visit, taste, or share." /></label>
      <button className="button button-dark" disabled={creating}>{creating ? "Creating…" : "Create list"}</button>
    </form>
    {lists.length > 0 && <section className="bucket-list-section"><h2>Your bucket lists</h2><div className="bucket-list-grid">{lists.map((list) => <div className="bucket-list-item" key={list._id}>{editingListId === list._id ? <form className="bucket-list-edit form-card" onSubmit={updateList}><label className="field-label">List name<input value={editingTitle} onChange={(event) => setEditingTitle(event.target.value)} required minLength={2} maxLength={60} /></label><label className="field-label">Description<textarea rows="2" value={editingDescription} onChange={(event) => setEditingDescription(event.target.value)} maxLength={300} /></label><div><button className="button button-dark" disabled={updatingList}>{updatingList ? "Saving…" : "Save changes"}</button><button type="button" className="text-button" onClick={() => setEditingListId("")}>Cancel</button></div></form> : <><Link className="bucket-list-card" to={`/bucket-lists/${list._id}`}><span><Bookmark size={17} /></span><strong>{list.title}</strong><p>{list.description || "A little collection of places to find."}</p><small>{list.gemCount || 0} {(list.gemCount || 0) === 1 ? "place" : "places"} · Open list <ArrowRight size={13} /></small></Link><div className="bucket-list-actions"><button className="text-button" onClick={() => editList(list)}>Edit list</button><button className="text-button" onClick={() => deleteList(list)}>Delete</button></div></>}</div>)}</div></section>}
    <section className="bucket-list-section"><h2>Saved places</h2>{state.gems.length ? <><div className="saved-map"><GemMap gems={state.gems} /></div><div className="gem-grid">{state.gems.map((gem) => <GemCard key={gem._id || gem.id} gem={gem} />)}</div></> : <p className="intro-copy">No saved places yet. Add one from any gem page.</p>}</section>
  </>}</section></main>;
}

export function BucketListDetailPage() {
  const { id } = useParams();
  const [list, setList] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  useEffect(() => {
    let active = true;
    api.get(`/bucket-lists/${id}`)
      .then(({ data }) => { if (active) setList({ ...data.list, gems: (data.list.gems || []).map(normalizeGem) }); })
      .catch((requestError) => { if (active) setError(requestError.response?.data?.message || "This bucket list couldn’t be loaded."); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [id]);
  const removeGem = async (gemId) => {
    try {
      await api.delete(`/bucket-lists/${id}/gems/${gemId}`);
      setList((current) => ({ ...current, gems: current.gems.filter((gem) => gem._id !== gemId) }));
      toast.success("Place removed from this list.");
    } catch (requestError) {
      toast.error(requestError.response?.data?.message || "The place couldn’t be removed.");
    }
  };
  if (loading) return <main className="content-page"><LoadingState /></main>;
  if (error || !list) return <main className="content-page"><EmptyState title="Bucket list not found" text={error || "This list is no longer available."} action={<Link to="/saved" className="button button-dark">Back to saved places</Link>} /></main>;
  return <main className="content-page"><PageIntro eyebrow="YOUR BUCKET LIST" title={list.title} description={list.description || "A little collection of places to find."} action={<Link to="/saved" className="button button-outline">All saved places</Link>} />{list.gems.length ? <><div className="saved-map"><GemMap gems={list.gems} /></div><div className="gem-grid">{list.gems.map((gem) => <div className="submission-card" key={gem._id}><GemCard gem={gem} /><div className="submission-actions"><button className="text-button" onClick={() => removeGem(gem._id)}>Remove from list</button></div></div>)}</div></> : <EmptyState title="This list is ready for its first stop." text="Open a gem and add it to this list." action={<Link to="/explore" className="button button-dark">Explore places</Link>} />}</main>;
}

export function SubmittedGemsPage() {
  const [gems, setGems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  useEffect(() => {
    api.get("/gems/mine")
      .then(({ data }) => setGems((data.gems || []).map(normalizeGem)))
      .catch((requestError) => setError(requestError.response?.data?.message || "Your submitted places couldn’t be loaded."))
      .finally(() => setLoading(false));
  }, []);
  const removeGem = async (id) => {
    try {
      await api.delete(`/gems/${id}`);
      setGems((current) => current.filter((gem) => gem._id !== id));
      toast.success("Your place was removed.");
    } catch (requestError) {
      toast.error(requestError.response?.data?.message || "Your place couldn’t be removed.");
    }
  };
  return <main className="content-page"><PageIntro eyebrow="YOUR CONTRIBUTIONS" title="Places you’ve shared." description="See what’s approved, waiting for review, or needs another edit." action={<Link to="/gems/new" className="button button-dark"><PlusIcon /> Share a gem</Link>} />
    {loading ? <LoadingState /> : error ? <EmptyState title="Your places didn’t load" text={error} /> : gems.length ? <div className="gem-grid">{gems.map((gem) => <div className="submission-card" key={gem._id}><GemCard gem={gem} compact /><div className="submission-actions"><span className={`submission-status status-${gem.status}`}>{gem.status}</span><Link className="text-button" to={`/gems/${gem._id}/edit`}>Edit</Link><button className="text-button" onClick={() => removeGem(gem._id)}>Delete</button></div></div>)}</div> : <EmptyState title="Your map starts with one place." text="Share a local favorite and track its review status here." action={<Link to="/gems/new" className="button button-dark">Share a gem</Link>} />}
  </main>;
}

export function CuratorApplyPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { register: field, handleSubmit, formState: { errors, isSubmitting } } = useForm();
  const submit = async ({ bio, specialties, website }) => {
    try {
      await api.post("/curators/apply", {
        bio,
        specialties: specialties.split(",").map((item) => item.trim()).filter(Boolean),
        website: website || undefined,
      });
      toast.success("Your curator application is in the review queue.");
      navigate("/dashboard");
    } catch (error) {
      toast.error(error.response?.data?.message || "Your application couldn’t be sent.");
    }
  };
  if (user?.role === "curator") return <main className="content-page"><EmptyState title="You’re already a local curator." text="Your community profile is active." action={<Link to="/dashboard" className="button button-dark">Open your dashboard</Link>} /></main>;
  return <main className="content-page settings-page"><PageIntro eyebrow="LOCAL KNOW-HOW" title="Apply to become a curator." description="Tell us what you know about your neighborhood. Applications are reviewed by the community team." /><form className="form-card settings-card" onSubmit={handleSubmit(submit)}><label className="field-label">Your local story<textarea rows="5" {...field("bio", { required: "Tell us a little about your local knowledge.", minLength: { value: 20, message: "Add at least 20 characters." }, maxLength: 1000 })} placeholder="What places, stories, or routes do you know best?" />{errors.bio && <span className="field-error">{errors.bio.message}</span>}</label><label className="field-label">Areas of expertise <span className="optional-text">comma-separated</span><input {...field("specialties")} placeholder="Patan heritage, street food, walking routes" /></label><label className="field-label">Website or social profile <span className="optional-text">optional</span><input type="url" {...field("website", { pattern: { value: /^$|^https?:\/\/\S+$/i, message: "Use a complete http(s) URL." } })} placeholder="https://..." />{errors.website && <span className="field-error">{errors.website.message}</span>}</label><button className="button button-dark" disabled={isSubmitting}>{isSubmitting ? "Sending…" : "Submit application"} <ArrowRight size={16} /></button></form></main>;
}

export function CuratorProfilePage() {
  const { id } = useParams();
  const [profile, setProfile] = useState(null);
  const [gems, setGems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  useEffect(() => {
    let active = true;
    Promise.all([api.get(`/curators/${id}`), api.get(`/curators/${id}/gems`)])
      .then(([profileResponse, gemsResponse]) => {
        if (!active) return;
        setProfile(profileResponse.data.curator);
        setGems((gemsResponse.data.gems || []).map(normalizeGem));
      })
      .catch((requestError) => { if (active) setError(requestError.response?.data?.message || "This curator profile isn’t available."); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [id]);
  const curator = profile?.user;
  return <main className="content-page">{loading ? <LoadingState /> : error ? <EmptyState title="Curator not found" text={error} /> : <><PageIntro eyebrow="LOCAL KNOW-HOW" title={curator?.name || "Neighborhood curator"} description={profile.bio} /><p className="intro-copy">{profile.specialties?.join(" · ") || "Kathmandu Valley"} {profile.website && <>· <a href={profile.website} target="_blank" rel="noreferrer">Website</a></>}</p><section className="home-section"><h2>Places shared by this curator</h2>{gems.length ? <div className="gem-grid">{gems.map((gem) => <GemCard key={gem._id} gem={gem} />)}</div> : <EmptyState title="No approved places yet." text="This curator’s recommendations will appear here." />}</section></>}</main>;
}

export function CuratorManagePage() {
  const { user } = useAuth();
  const [gems, setGems] = useState([]);
  const [claims, setClaims] = useState([]);
  const [metrics, setMetrics] = useState({ gemCount: 0, views: 0, upvotes: 0, saves: 0 });
  const [managedGems, setManagedGems] = useState([]);
  const [claiming, setClaiming] = useState(false);
  const [selectedIds, setSelectedIds] = useState([]);
  const [loading, setLoading] = useState(true);
  const collectionForm = useForm();
  const trailForm = useForm();
  useEffect(() => {
    Promise.all([
      api.get("/gems", { params: { limit: 100 } }),
      api.get("/curators/me/metrics"),
      api.get("/curators/claims/mine"),
    ])
      .then(([gemsResponse, metricsResponse, claimsResponse]) => {
        setGems((gemsResponse.data.gems || []).map(normalizeGem));
        setMetrics(metricsResponse.data.metrics || {});
        setManagedGems(metricsResponse.data.gems || []);
        setClaims(claimsResponse.data.claims || []);
      })
      .catch((error) => toast.error(error.response?.data?.message || "Curator workspace data couldn’t be loaded."))
      .finally(() => setLoading(false));
  }, []);
  const claimableGems = gems.filter((gem) =>
    !gem.curator
    && String(gem.createdBy?._id || gem.createdBy || "") !== String(user?._id || "")
    && !claims.some((claim) => String(claim.gem?._id || claim.gem) === String(gem._id) && claim.status === "pending"),
  );
  const submitClaim = async (event) => {
    event.preventDefault();
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    setClaiming(true);
    try {
      const { data } = await api.post("/curators/claims", { gemId: form.get("gemId"), details: form.get("details") });
      const claimedGem = gems.find((gem) => gem._id === form.get("gemId"));
      setClaims((current) => [{ ...data.claim, gem: claimedGem }, ...current]);
      formElement.reset();
      toast.success("Your ownership claim is awaiting admin review.");
    } catch (error) {
      toast.error(error.response?.data?.message || "Your claim couldn’t be submitted.");
    } finally {
      setClaiming(false);
    }
  };
  const toggleGem = (id) => {
    setSelectedIds((current) => current.includes(id) ? current.filter((value) => value !== id) : [...current, id]);
  };
  const createCollection = async (values) => {
    try {
      await api.post("/collections", { ...values, gems: selectedIds });
      collectionForm.reset();
      toast.success("Your collection is now published.");
    } catch (error) {
      toast.error(error.response?.data?.message || "The collection couldn’t be created.");
    }
  };
  const createTrail = async (values) => {
    const stops = gems.filter((gem) => selectedIds.includes(gem._id));
    const coordinates = stops.map((gem) => gem.location?.coordinates).filter((point) => Array.isArray(point) && point.length === 2);
    if (coordinates.length < 2) {
      toast.error("Choose at least two mapped places to create a route.");
      return;
    }
    try {
      await api.post("/trails", { ...values, durationMinutes: Number(values.durationMinutes), stops: stops.map((gem) => gem._id), coordinates });
      trailForm.reset();
      toast.success("Your neighborhood trail is published.");
    } catch (error) {
      toast.error(error.response?.data?.message || "The trail couldn’t be created.");
    }
  };
  return <main className="content-page">
    <PageIntro eyebrow="CURATOR WORKSPACE" title="Bring a neighborhood walk to life." description="Build a collection or connect a few approved gems into a local trail." />
    {loading ? <LoadingState /> : <div className="curator-manage-grid">
      <section className="form-card curator-metrics"><h2>Your local impact</h2><div className="stat-grid">{[["Managed places", metrics.gemCount], ["Views", metrics.views], ["Upvotes", metrics.upvotes], ["Saves", metrics.saves]].map(([label, value]) => <div className="stat-card" key={label}><strong>{value || 0}</strong><small>{label}</small></div>)}</div></section>
      <section className="form-card curator-claim-section"><h2>Claim a local place</h2><p className="intro-copy">Request management of a community-listed spot you know or represent. An admin will review your connection to the place.</p><form className="form-stack" onSubmit={submitClaim}><label className="field-label">Approved place<select name="gemId" required defaultValue=""><option value="" disabled>Select a place</option>{claimableGems.map((gem) => <option value={gem._id} key={gem._id}>{gem.name} · {gem.address}</option>)}</select></label><label className="field-label">Your connection<textarea name="details" rows="3" minLength="20" maxLength="1500" required placeholder="Explain how you know or represent this place." /></label><button className="button button-dark" disabled={claiming || !claimableGems.length}>{claiming ? "Submitting…" : "Submit claim"}</button>{!claimableGems.length && <small className="optional-text">No eligible unclaimed places are available right now.</small>}</form>{claims.length > 0 && <div className="claim-status-list"><h3>Your recent claims</h3>{claims.slice(0, 5).map((claim) => <p key={claim._id}><strong>{claim.gem?.title || "Place"}</strong><span className={`submission-status status-${claim.status}`}>{claim.status}</span></p>)}</div>}</section>
      <section className="form-card"><h2>Create a collection</h2><form className="form-stack" onSubmit={collectionForm.handleSubmit(createCollection)}><label className="field-label">Collection name<input {...collectionForm.register("title", { required: true, minLength: 3 })} required /></label><label className="field-label">Description<textarea rows="3" {...collectionForm.register("description", { required: true, minLength: 10 })} required /></label><label className="field-label">Cover image URL <span className="optional-text">optional</span><input type="url" {...collectionForm.register("coverUrl")} /></label><button className="button button-dark" disabled={collectionForm.formState.isSubmitting}>Publish collection</button></form></section>
      <section className="form-card"><h2>Create a trail</h2><form className="form-stack" onSubmit={trailForm.handleSubmit(createTrail)}><label className="field-label">Trail name<input {...trailForm.register("title", { required: true, minLength: 3 })} required /></label><label className="field-label">Description<textarea rows="3" {...trailForm.register("description", { required: true, minLength: 10 })} required /></label><div className="discovery-filters"><label className="field-label">Difficulty<select {...trailForm.register("difficulty")}><option value="easy">Easy</option><option value="moderate">Moderate</option><option value="challenging">Challenging</option></select></label><label className="field-label">Minutes<input type="number" min="1" max="1440" {...trailForm.register("durationMinutes", { required: true, min: 1, max: 1440 })} required /></label></div><button className="button button-dark" disabled={trailForm.formState.isSubmitting}>Publish trail</button></form></section>
      <section className="form-card curator-stop-picker"><h2>Choose approved stops</h2><p className="intro-copy">Select at least two mapped places for a trail. The same selection can be added to your collection.</p>{gems.length ? gems.map((gem) => <label className="stop-option" key={gem._id}><input type="checkbox" checked={selectedIds.includes(gem._id)} onChange={() => toggleGem(gem._id)} /><span><strong>{gem.name}</strong><small>{gem.address}</small></span></label>) : <EmptyState title="No approved gems yet." text="Once places are approved, you can build curated routes." />}</section>
      <section className="form-card curator-managed-section"><h2>Your managed places</h2>{managedGems.filter((gem) => gem.curator).length ? managedGems.filter((gem) => gem.curator).map((gem) => <ManagedGemUpdateForm key={gem._id} gem={gem} />) : <p className="intro-copy">Approved ownership claims will appear here so you can share opening-hour changes and local notes.</p>}</section>
    </div>}
  </main>;
}

function ManagedGemUpdateForm({ gem }) {
  const [message, setMessage] = useState("");
  const [openingHours, setOpeningHours] = useState("");
  const [saving, setSaving] = useState(false);
  const submit = async (event) => {
    event.preventDefault();
    setSaving(true);
    try {
      await api.post(`/curators/gems/${gem._id}/updates`, { message, openingHours });
      setMessage("");
      setOpeningHours("");
      toast.success(`Update posted for ${gem.title}.`);
    } catch (error) {
      toast.error(error.response?.data?.message || "Your local update couldn’t be posted.");
    } finally {
      setSaving(false);
    }
  };
  return <form className="managed-gem-update" onSubmit={submit}><h3>{gem.title}</h3><small>{gem.address}</small><label className="field-label">Local note <span className="optional-text">optional if hours are provided</span><textarea rows="2" maxLength="1000" value={message} onChange={(event) => setMessage(event.target.value)} placeholder="Share a timely note for visitors." /></label><label className="field-label">Opening hours <span className="optional-text">optional</span><input maxLength="500" value={openingHours} onChange={(event) => setOpeningHours(event.target.value)} placeholder="e.g. Daily, 10 am–7 pm" /></label><button className="button button-outline" disabled={saving}>{saving ? "Posting…" : "Post local update"}</button></form>;
}

export function ExplorerProfilePage() {
  const { id } = useParams();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  useEffect(() => {
    api.get(`/users/${id}`).then(({ data }) => setProfile(data.user))
      .catch((requestError) => setError(requestError.response?.data?.message || "This explorer profile isn’t available."))
      .finally(() => setLoading(false));
  }, [id]);
  return <main className="content-page">{loading ? <LoadingState /> : error ? <EmptyState title="Explorer not found" text={error} /> : <><PageIntro eyebrow={profile.role === "curator" ? "LOCAL CURATOR" : "COMMUNITY EXPLORER"} title={profile.name} description={profile.bio || "A curious neighbor exploring the Kathmandu Valley."} /><p className="intro-copy">{profile.neighborhood || "Kathmandu Valley"} · {profile.gemCount} places shared · {profile.upvotesReceived} local upvotes</p>{profile.badges?.length > 0 && <section className="explorer-badges"><h2>Explorer badges</h2><div className="badge-row">{profile.badges.map((badge) => <article className="explorer-badge" key={badge.name}><Trophy size={17} /><strong>{badge.name}</strong><small>{badge.description}</small></article>)}</div></section>}</>}</main>;
}

export function DashboardPage() {
  const { user } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [demo, setDemo] = useState(false);
  useEffect(() => {
    api.get("/dashboard").then(({ data: result }) => setData(result.dashboard || result))
      .catch((error) => { if (isNetworkError(error)) setDemo(true); })
      .finally(() => setLoading(false));
  }, []);
  const role = user?.role || "explorer";
  const roleName = role === "admin" ? "Community admin" : role === "curator" ? "Local curator" : "Curious explorer";
  return <main className="content-page dashboard-page"><div className="dashboard-welcome"><div><p className="eyebrow">{roleName.toUpperCase()} DASHBOARD</p><h1>Good to see you, {user?.name?.split(" ")[0] || "friend"}.</h1><p className="intro-copy">A few little things from your corner of the city.</p></div><Link to="/gems/new" className="button button-terracotta"><PlusIcon /> Share a gem</Link></div>{demo && <p className="demo-label"><Sparkles size={14} /> Demo dashboard · activity will appear when the API is connected.</p>}{loading ? <LoadingState /> : <><div className="stat-grid"><div className="stat-card"><span><MapPin size={17} /></span><strong>{data?.gemCount ?? 0}</strong><small>Places approved</small></div><div className="stat-card"><span><Heart size={17} /></span><strong>{data?.savedCount ?? 0}</strong><small>Places saved</small></div><div className="stat-card"><span><ThumbsUp size={17} /></span><strong>{data?.upvotesReceived ?? 0}</strong><small>Upvotes received</small></div><div className="stat-card"><span><Clock3 size={17} /></span><strong>{data?.pendingGemCount ?? 0}</strong><small>Awaiting review</small></div></div>{data?.badges?.length > 0 && <section className="explorer-badges dashboard-badges"><h2>Your explorer badges</h2><div className="badge-row">{data.badges.map((badge) => <article className="explorer-badge" key={badge.name}><Trophy size={17} /><strong>{badge.name}</strong><small>{badge.description}</small></article>)}</div></section>}<div className="dashboard-grid"><section className="dashboard-panel"><div className="panel-heading"><h2>Your recent activity</h2><Link to="/notifications">See all <ArrowRight size={14} /></Link></div>{data?.activity?.length ? data.activity.map((item, index) => <div className="activity-row" key={item._id || index}><span className="activity-icon"><Heart size={15} /></span><span>{item.text || item.message}</span><small>{item.createdAt ? new Date(item.createdAt).toLocaleDateString() : "Recently"}</small></div>) : <div className="panel-empty"><Clock3 size={20} /><p>Your city story starts here.</p><Link to="/explore">Find your first favorite <ArrowRight size={14} /></Link></div>}</section><section className="dashboard-panel quick-panel"><div className="panel-heading"><h2>Make yourself at home</h2></div><Link to="/saved" className="quick-link"><Bookmark size={17} /><span><strong>Your saved places</strong><small>Keep your next outing close</small></span><ChevronRight size={16} /></Link><Link to="/my-gems" className="quick-link"><MapPin size={17} /><span><strong>Your contributions</strong><small>See the status of your submissions</small></span><ChevronRight size={16} /></Link>{role === "curator" && <Link to="/curator/manage" className="quick-link"><Compass size={17} /><span><strong>Curator workspace</strong><small>Create a collection or walking route</small></span><ChevronRight size={16} /></Link>}{role === "admin" && <Link to="/dashboard/admin" className="quick-link"><ShieldCheck size={17} /><span><strong>Admin tools</strong><small>Review the community</small></span><ChevronRight size={16} /></Link>}<Link to="/settings" className="quick-link"><Pencil size={17} /><span><strong>Profile & settings</strong><small>Make it yours</small></span><ChevronRight size={16} /></Link><Link to="/notifications" className="quick-link"><Sparkles size={17} /><span><strong>Notifications</strong><small>See what's new</small></span><ChevronRight size={16} /></Link></section></div></>}</main>;
}

export function AdminPage() {
  const { user } = useAuth();
  const [data, setData] = useState({ stats: {}, pending: [], reports: [], users: [], curators: [], claims: [] });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    Promise.all([
      api.get("/admin/stats"),
      api.get("/admin/gems"),
      api.get("/admin/reports"),
      api.get("/admin/users?limit=20"),
      api.get("/admin/curators"),
      api.get("/admin/claims"),
    ]).then(([stats, gems, reports, users, curators, claims]) => setData({
      stats: stats.data.stats || {},
      pending: (gems.data.gems || []).map(normalizeGem),
      reports: reports.data.reports || [],
      users: users.data.users || [],
      curators: curators.data.curators || [],
      claims: claims.data.claims || [],
    }))
      .catch((err) => setError(err.response?.data?.message || (isNetworkError(err) ? "The API is unavailable." : "Admin data couldn’t be loaded.")))
      .finally(() => setLoading(false));
  }, []);
  if (user?.role !== "admin") return <Navigate to="/dashboard" replace />;
  const moderate = async (id, status) => {
    try { await api.patch(`/admin/gems/${id}`, { status }); setData((current) => ({ ...current, pending: current.pending.filter((item) => item._id !== id) })); toast.success(`Place ${status}.`); }
    catch (err) { toast.error(err.response?.data?.message || "That change couldn’t be saved."); }
  };
  const setUserActive = async (id, isActive) => {
    try {
      await api.patch(`/admin/users/${id}`, { isActive: !isActive });
      setData((current) => ({ ...current, users: current.users.map((item) => item._id === id ? { ...item, isActive: !isActive } : item) }));
      toast.success(isActive ? "Account suspended." : "Account reactivated.");
    } catch (requestError) { toast.error(requestError.response?.data?.message || "Account status couldn’t be changed."); }
  };
  const resolveReport = async (id, status) => {
    try {
      await api.patch(`/admin/reports/${id}`, { status });
      setData((current) => ({ ...current, reports: current.reports.map((item) => item._id === id ? { ...item, status } : item) }));
      toast.success(`Report ${status}.`);
    } catch (requestError) { toast.error(requestError.response?.data?.message || "Report status couldn’t be changed."); }
  };
  const reviewCurator = async (id, status) => {
    try {
      await api.patch(`/admin/curators/${id}`, { status });
      setData((current) => ({ ...current, curators: current.curators.filter((item) => item._id !== id) }));
      toast.success(`Curator application ${status}.`);
    } catch (requestError) { toast.error(requestError.response?.data?.message || "Application status couldn’t be changed."); }
  };
  const reviewClaim = async (id, status) => {
    try {
      await api.patch(`/admin/claims/${id}`, { status });
      setData((current) => ({ ...current, claims: current.claims.filter((item) => item._id !== id) }));
      toast.success(`Ownership claim ${status}.`);
    } catch (requestError) {
      toast.error(requestError.response?.data?.message || "Ownership claim couldn’t be reviewed.");
    }
  };
  return <main className="content-page admin-page">
    <PageIntro eyebrow="COMMUNITY CARE" title="Admin review." description="Help keep our little guide thoughtful, useful, and safe." />
    {loading ? <LoadingState /> : error ? <EmptyState title="Admin workspace unavailable" text={error} /> : <>
      <div className="stat-grid">{[["Explorers", data.stats.users], ["Verified curators", data.stats.curators], ["Approved gems", data.stats.approvedGems], ["Awaiting review", data.stats.pendingGems], ["Upvotes", data.stats.upvotes], ["Tips shared", data.stats.tips], ["Open reports", data.stats.openReports]].map(([label, value]) => <div className="stat-card" key={label}><strong>{value ?? 0}</strong><small>{label}</small></div>)}</div>
      <section className="admin-section"><h2>Gem moderation</h2>{data.pending.length ? <div className="review-list">{data.pending.map((gem) => <article className="review-card" key={gem._id}><div><p className="eyebrow">{gem.category}</p><h3>{gem.name}</h3><p>{gem.description}</p><small>{gem.address} · Submitted by {gem.createdBy?.name || "Explorer"}</small></div><div className="review-actions"><button className="button button-dark" onClick={() => moderate(gem._id, "approved")}><Check size={16} /> Approve</button><button className="button button-outline" onClick={() => moderate(gem._id, "rejected")}>Decline</button></div></article>)}</div> : <p className="intro-copy">Nothing waiting for review.</p>}</section>
      <section className="admin-section"><h2>Curator applications</h2>{data.curators.length ? data.curators.map((item) => <article className="review-card" key={item._id}><div><h3>{item.user?.name || "Explorer"}</h3><p>{item.bio}</p><small>{item.specialties?.join(" · ")}</small></div><div className="review-actions"><button className="button button-dark" onClick={() => reviewCurator(item._id, "approved")}>Approve</button><button className="button button-outline" onClick={() => reviewCurator(item._id, "rejected")}>Decline</button></div></article>) : <p className="intro-copy">No curator applications to review.</p>}</section>
      <section className="admin-section"><h2>Place ownership claims</h2>{data.claims.length ? data.claims.map((claim) => <article className="review-card" key={claim._id}><div><h3>{claim.gem?.title || "Place claim"} · {claim.curator?.user?.name || "Curator"}</h3><p>{claim.details}</p><small>{claim.gem?.address || "Kathmandu Valley"} · Submitted {new Date(claim.createdAt).toLocaleDateString()}</small></div><div className="review-actions"><button className="button button-dark" onClick={() => reviewClaim(claim._id, "approved")}>Approve claim</button><button className="button button-outline" onClick={() => reviewClaim(claim._id, "rejected")}>Decline</button></div></article>) : <p className="intro-copy">No ownership claims are waiting for review.</p>}</section>
      <section className="admin-section"><h2>Community reports</h2>{data.reports.length ? data.reports.map((report) => <article className="review-card" key={report._id}><div><h3>{report.gem?.title || "Reported listing"} · {report.reason}</h3><p>{report.details || "No additional details."}</p><small>Reported by {report.reporter?.name || "Explorer"} · {report.status}</small></div>{report.status === "open" && <div className="review-actions"><button className="button button-dark" onClick={() => resolveReport(report._id, "resolved")}>Resolve</button><button className="button button-outline" onClick={() => resolveReport(report._id, "dismissed")}>Dismiss</button></div>}</article>) : <p className="intro-copy">No reports in the queue.</p>}</section>
      <section className="admin-section"><h2>User management</h2><div className="admin-users">{data.users.map((item) => <article className="user-row" key={item._id}><span><strong>{item.name}</strong><small>{item.email} · {item.role}</small></span>{item._id !== user._id && <button className="button button-outline" onClick={() => setUserActive(item._id, item.isActive)}>{item.isActive ? "Suspend" : "Reactivate"}</button>}</article>)}</div></section>
    </>}
  </main>;
}

function ResourcePage({ kind }) {
  const { user } = useAuth();
  const config = {
    curators: { title: "The people who know.", eyebrow: "LOCAL KNOW-HOW", description: "Meet the neighbors sharing their favorite corners of the Valley.", endpoint: "/curators", array: "curators" },
    trails: { title: "Take the scenic route.", eyebrow: "A DAY WELL WANDERED", description: "Thoughtful little routes through a city best explored slowly.", endpoint: "/trails", array: "trails" },
    leaderboard: { title: "A little local love.", eyebrow: "COMMUNITY SPOTLIGHT", description: "The curious locals helping everyone find a favorite place.", endpoint: "/leaderboard", array: "users" },
    notifications: { title: "A note from the neighborhood.", eyebrow: "WHAT'S NEW", description: "The latest little things happening around your saved places.", endpoint: "/notifications", array: "notifications" },
    collections: { title: "A few places, one lovely day.", eyebrow: "LOCAL COLLECTIONS", description: "Small lists of places worth finding together.", endpoint: "/collections", array: "collections" },
  }[kind];
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const markRead = async (id) => {
    try {
      await api.patch(`/notifications/${id}/read`);
      setItems((current) => current.map((item) => item._id === id ? { ...item, readAt: new Date().toISOString() } : item));
    } catch (requestError) {
      toast.error(requestError.response?.data?.message || "The notification couldn’t be updated.");
    }
  };
  useEffect(() => {
    api.get(config.endpoint).then(({ data }) => setItems(data[config.array] || []))
      .catch((err) => setError(err.response?.data?.message || (isNetworkError(err) ? "The API is currently unreachable." : "This page couldn’t be loaded right now.")))
      .finally(() => setLoading(false));
  }, [config.endpoint, config.array]);
  const curatorAction = kind === "curators" && user?.role === "explorer"
    ? <Link className="button button-dark" to="/curators/apply">Apply to curate</Link>
    : kind === "curators" && user?.role === "curator"
      ? <Link className="button button-dark" to="/curator/manage">Curator workspace</Link>
      : null;
  return <main className="content-page"><PageIntro eyebrow={config.eyebrow} title={config.title} description={config.description} action={curatorAction} />
    {kind === "trails" && !loading && !items.length && !error && <div className="trail-feature"><img src="https://images.unsplash.com/photo-1605640840605-14ac1855827b?auto=format&fit=crop&w=1200&q=85" alt="Kathmandu city rooftops" /><div><span className="eyebrow">A SLOW MORNING IN PATAN</span><h2>Courtyards, coffee & carved doors.</h2><p>Start with a warm cup, follow the old brick lanes, and leave room for one more turn.</p><span className="trail-meta"><MapPin size={15} /> Patan, Lalitpur <span>·</span> <Clock3 size={15} /> 2–3 hours</span></div></div>}
    {loading ? <LoadingState /> : error ? <EmptyState title="Not quite there yet" text={error} /> : items.length ? <div className={kind === "notifications" ? "notification-list" : "people-grid"}>{items.map((item, index) => <ResourceCard key={item._id || item.id || index} item={item} kind={kind} index={index} onRead={markRead} />)}</div> : kind === "trails" ? <EmptyState title="More trails are being found." text="Our local curators are mapping out their favorite little routes." action={<Link to="/explore" className="button button-dark">Explore places</Link>} /> : <EmptyState title={kind === "notifications" ? "All caught up." : "The neighborhood is growing."} text={kind === "notifications" ? "We’ll let you know when something lovely happens." : "Check back soon for more community recommendations."} action={kind !== "notifications" ? <Link to="/explore" className="button button-dark">Explore places</Link> : null} />}</main>;
}

function ResourceCard({ item, kind, index, onRead }) {
  if (kind === "notifications") return <article className={`notification-item ${item.readAt ? "is-read" : ""}`}><span className="activity-icon"><Sparkles size={16} /></span><div><strong>{item.title || item.type || "A little update"}</strong><p>{item.message || item.text}</p><small>{item.createdAt ? new Date(item.createdAt).toLocaleDateString() : "Recently"}</small>{!item.readAt && <button className="text-button" onClick={() => onRead(item._id)}>Mark as read</button>}</div></article>;
  if (kind === "trails") return <Link className="trail-card" to={`/trails/${item._id || item.id}`}><img src={item.image || item.images?.[0] || demoGems[index % demoGems.length].images[0]} alt="" /><div><span className="eyebrow">{item.duration || "A local favorite"}</span><h3>{item.name || item.title}</h3><p>{item.description}</p><span className="link-arrow">Explore trail <ArrowRight size={15} /></span></div></Link>;
  if (kind === "collections") return <Link className="trail-card" to={`/collections/${item._id}`}><img src={item.coverUrl || demoGems[index % demoGems.length].images[0]} alt="" /><div><span className="eyebrow">LOCAL COLLECTION</span><h3>{item.title}</h3><p>{item.description}</p><span className="link-arrow">{item.gems?.length || 0} places · View list <ArrowRight size={15} /></span></div></Link>;
  const person = item.user || item;
  const profileLink = kind === "curators" ? `/curators/${person._id}` : `/explorers/${item._id}`;
  return <Link to={profileLink} className="person-card"><Avatar src={person.avatarUrl || item.avatar} alt="" /><div><span className="eyebrow">{kind === "leaderboard" ? `#${item.rank || index + 1} COMMUNITY CONTRIBUTOR` : item.neighborhood || "KATHMANDU VALLEY"}</span><h3>{person.name || item.name || item.username || "Local curator"}</h3><p>{item.bio || `${item.gemCount || item.gemsCount || 0} places shared with the community.`}</p><span className="person-stats"><Heart size={14} /> {item.followers || item.points || item.gemCount || 0} {kind === "leaderboard" ? "local love" : "places shared"}</span></div></Link>;
}

export function CollectionsPage() { return <ResourcePage kind="collections" />; }

export function CollectionDetailPage() {
  const { id } = useParams();
  const [collection, setCollection] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  useEffect(() => {
    api.get(`/collections/${id}`).then(({ data }) => setCollection(data.collection))
      .catch((requestError) => setError(requestError.response?.data?.message || "This collection isn’t available."))
      .finally(() => setLoading(false));
  }, [id]);
  return <main className="content-page">{loading ? <LoadingState /> : error ? <EmptyState title="Collection not found" text={error} /> : <><PageIntro eyebrow="LOCAL COLLECTION" title={collection.title} description={collection.description} /><div className="gem-grid">{(collection.gems || []).map((gem) => <GemCard key={gem._id} gem={normalizeGem(gem)} />)}</div></>}</main>;
}

export function TrailDetailPage() {
  const { id } = useParams();
  const [trail, setTrail] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  useEffect(() => {
    api.get(`/trails/${id}`).then(({ data }) => setTrail(data.trail))
      .catch((requestError) => setError(requestError.response?.data?.message || "This trail isn’t available."))
      .finally(() => setLoading(false));
  }, [id]);
  const stops = (trail?.stops || []).map(normalizeGem);
  return <main className="content-page">{loading ? <LoadingState /> : error ? <EmptyState title="Trail not found" text={error} /> : <><PageIntro eyebrow="A DAY WELL WANDERED" title={trail.title} description={trail.description} /><p className="intro-copy">{trail.difficulty} · {trail.durationMinutes ? `${trail.durationMinutes} minutes` : "Take your time"} · {stops.length} stops</p><div className="detail-grid"><section className="gem-grid">{stops.map((gem) => <GemCard key={gem._id} gem={gem} compact />)}</section><aside className="explore-map"><GemMap gems={stops} /></aside></div></>}</main>;
}

export function SettingsPage() {
  const { user, refreshUser } = useAuth();
  const { register: field, handleSubmit, reset, formState: { isSubmitting } } = useForm({ defaultValues: { name: user?.name || "", bio: user?.bio || "", neighborhood: user?.neighborhood || "", avatarUrl: user?.avatarUrl || "", favoriteCategories: (user?.favoriteCategories || []).join(", ") } });
  useEffect(() => reset({ name: user?.name || "", bio: user?.bio || "", neighborhood: user?.neighborhood || "", avatarUrl: user?.avatarUrl || "", favoriteCategories: (user?.favoriteCategories || []).join(", ") }), [user, reset]);
  const onSubmit = async (values) => {
    try { await api.patch("/users/me", { ...values, favoriteCategories: values.favoriteCategories.split(",").map((item) => item.trim()).filter(Boolean) }); await refreshUser(); toast.success("Your profile has been updated."); }
    catch (error) { toast.error(error.response?.data?.message || "Your profile couldn’t be updated."); }
  };
  return <main className="content-page settings-page"><PageIntro eyebrow="MAKE YOURSELF AT HOME" title="A few details about you." description="A little context helps the community find the right kind of recommendations." /><form className="form-card settings-card" onSubmit={handleSubmit(onSubmit)}><label className="field-label">Your name<input {...field("name", { required: true, minLength: 2 })} /></label><label className="field-label">Profile image URL<input type="url" {...field("avatarUrl")} placeholder="https://..." /></label><label className="field-label">Neighborhood<input {...field("neighborhood")} placeholder="e.g. Patan" /></label><label className="field-label">Favorite categories <span className="optional-text">comma-separated</span><input {...field("favoriteCategories")} placeholder="Food, heritage, quiet walks" /></label><label className="field-label">A little about you<textarea rows="4" {...field("bio")} placeholder="The kinds of places you love finding…" /></label><button className="button button-dark" disabled={isSubmitting}>Save profile <Check size={16} /></button></form></main>;
}

export function NotFoundPage() {
  return <main className="not-found"><span className="not-found-mark"><Compass size={32} /></span><p className="eyebrow">A WRONG TURN, MAYBE?</p><h1>This page isn’t on the map.</h1><p>But there are plenty of good places left to find.</p><Link to="/explore" className="button button-dark">Back to exploring <ArrowRight size={16} /></Link></main>;
}

export function CuratorPage() { return <ResourcePage kind="curators" />; }
export function TrailsPage() { return <ResourcePage kind="trails" />; }
export function LeaderboardPage() { return <ResourcePage kind="leaderboard" />; }
export function NotificationsPage() { return <ResourcePage kind="notifications" />; }
