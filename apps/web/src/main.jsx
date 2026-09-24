import React, { useEffect, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import Hls from "hls.js";
import "./styles.css";

const API = window.__STREAMFLIX_CONFIG__?.API_URL || import.meta.env.VITE_API_URL || "";
const getToken = () => localStorage.getItem("streamflix_token");

async function api(path, options = {}) {
  const headers = options.body instanceof FormData ? {} : {"Content-Type":"application/json"};
  const token = getToken();
  if (token) headers.Authorization = `Bearer ${token}`;
  const r = await fetch(API + path, {...options, headers: {...headers, ...(options.headers||{})}});
  const data = await r.json().catch(()=>({}));
  if (!r.ok) throw new Error(data.error || "Request failed");
  return data;
}

function App() {
  const [user, setUser] = useState(null);
  const [page, setPage] = useState("home");
  const [selected, setSelected] = useState(null);
  const [query, setQuery] = useState("");

  useEffect(() => {
    if (getToken()) api("/api/auth/me").then(setUser).catch(()=>localStorage.removeItem("streamflix_token"));
  }, []);

  function logout() { localStorage.removeItem("streamflix_token"); setUser(null); setPage("home"); }
  return <div className="app">
    <header>
      <div className="logo" onClick={()=>setPage("home")}>STREAM<span>FLIX</span></div>
      <nav>
        <button onClick={()=>setPage("home")}>Home</button>
        {user && <button onClick={()=>setPage("watchlist")}>Continue Watching</button>}
        {user?.role === "ADMIN" && <button onClick={()=>setPage("admin")}>Admin</button>}
      </nav>
      <div className="actions">
        <input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Search movies"/>
        {user ? <><span className="hello">{user.name}</span><button onClick={logout}>Logout</button></> :
          <button onClick={()=>setPage("login")}>Login</button>}
      </div>
    </header>
    {page === "home" && <Home query={query} onPlay={m=>{setSelected(m);setPage("player")}}/>}
    {page === "login" && <Auth onLogin={u=>{setUser(u);setPage("home")}}/>}
    {page === "admin" && <Admin/>}
    {page === "watchlist" && <Continue onPlay={m=>{setSelected(m);setPage("player")}}/>}
    {page === "player" && selected && <Player movie={selected} onBack={()=>setPage("home")}/>}
    {page === "subscription" && <Subscription/>}
  </div>
}

function Home({query,onPlay}) {
  const [movies,setMovies]=useState([]);
  useEffect(()=>{api("/api/movies"+(query?`?q=${encodeURIComponent(query)}`:"")).then(setMovies).catch(console.error)},[query]);
  return <main>
    <section className="hero">
      <div><p className="eyebrow">STREAMFLIX ORIGINAL</p><h1>Unlimited stories.<br/>One place.</h1>
      <p>Browse, search and stream your library with adaptive HLS playback.</p></div>
    </section>
    <section className="section"><h2>{query?`Search: ${query}`:"Popular on StreamFlix"}</h2>
      <div className="grid">{movies.map(m=><MovieCard key={m.id} movie={m} onPlay={onPlay}/>)}
      {!movies.length && <div className="empty">No published movies yet. Admin can upload the first one.</div>}</div>
    </section>
  </main>
}

function MovieCard({movie,onPlay}) {
  const thumbnailUrl = movie.thumbnail_key
    ? `${API}/api/movies/${movie.id}/thumbnail`
    : null;

  return <article className="card" onClick={()=>onPlay(movie)}>
    <div className="poster">
      {thumbnailUrl ? (
        <img src={thumbnailUrl} alt={`${movie.title} poster`} style={{width:"100%",height:"100%",objectFit:"cover",borderRadius:"8px"}} />
      ) : (
        <>
          <div className="posterTitle">{movie.title}</div>
          <div className="genre">{movie.genre}</div>
        </>
      )}
    </div>
    <h3>{movie.title}</h3><p>{movie.year} · {Math.round((movie.duration_seconds||0)/60)} min</p>
  </article>
}

function Auth({onLogin}) {
  const [mode,setMode]=useState("login"),[email,setEmail]=useState("user@streamflix.local"),[password,setPassword]=useState("User@123"),[name,setName]=useState(""),[error,setError]=useState("");
  async function submit(e){e.preventDefault();try{
    const data=mode==="login"?await api("/api/auth/login",{method:"POST",body:JSON.stringify({email,password})})
      :await api("/api/auth/register",{method:"POST",body:JSON.stringify({email,password,name})});
    localStorage.setItem("streamflix_token",data.token); onLogin(data.user);
  }catch(e){setError(e.message)}}
  return <div className="panel auth"><h2>{mode==="login"?"Welcome back":"Create account"}</h2>
    <form onSubmit={submit}>{mode==="register"&&<input placeholder="Name" value={name} onChange={e=>setName(e.target.value)} required/>}
    <input placeholder="Email" type="email" value={email} onChange={e=>setEmail(e.target.value)} required/>
    <input placeholder="Password" type="password" value={password} onChange={e=>setPassword(e.target.value)} required/>
    {error&&<p className="error">{error}</p>}<button className="primary">{mode==="login"?"Login":"Register"}</button></form>
    <button className="link" onClick={()=>setMode(mode==="login"?"register":"login")}>{mode==="login"?"Need an account? Register":"Already registered? Login"}</button>
  </div>
}

function Player({movie,onBack}) {
  const ref=useRef(null),[src,setSrc]=useState(null);
  useEffect(()=>{api(`/api/movies/${movie.id}/stream`).then(x=>setSrc(x.url)).catch(console.error)},[movie.id]);
  useEffect(()=>{
    if(!src||!ref.current)return;
    if(Hls.isSupported()){const hls=new Hls();hls.loadSource(src);hls.attachMedia(ref.current);return()=>hls.destroy();}
    ref.current.src=src;
  },[src]);
  useEffect(()=>{let timer; if(ref.current){timer=setInterval(()=>{const p=ref.current.currentTime;if(p>0)api(`/api/progress/${movie.id}`,{method:"PUT",body:JSON.stringify({positionSeconds:p})}).catch(()=>{})},10000)}return()=>clearInterval(timer)},[movie.id]);
  return <main className="player"><button onClick={onBack}>← Back</button><h1>{movie.title}</h1>
    <video ref={ref} controls autoPlay className="video"/><p>{movie.description}</p></main>
}

function Continue({onPlay}) {
  const [items,setItems]=useState([]);
  useEffect(()=>{api("/api/progress").then(setItems).catch(console.error)},[]);
  return <main className="section"><h1>Continue Watching</h1><div className="grid">{items.map(x=><MovieCard key={x.movie_id} movie={{...x,id:x.movie_id}} onPlay={onPlay}/>)}</div></main>
}

function Admin() {
  const [title,setTitle]=useState("My Demo Movie"),[description,setDescription]=useState("A locally uploaded StreamFlix demo."),
    [genre,setGenre]=useState("Drama"),[year,setYear]=useState(2026),[file,setFile]=useState(null),[thumbnail,setThumbnail]=useState(null),[msg,setMsg]=useState(""),[movies,setMovies]=useState([]);

  const load=()=>api("/api/movies/all").then(setMovies).catch(e=>setMsg(e.message));
  useEffect(load,[]);

  async function upload(e){
    e.preventDefault();
    if(!file) return setMsg("Please select a movie video.");
    if(!thumbnail) return setMsg("Please select a thumbnail image.");

    setMsg("Uploading video and thumbnail...");
    const fd=new FormData();
    fd.append("title",title);
    fd.append("description",description);
    fd.append("genre",genre);
    fd.append("year",year);
    fd.append("video",file);
    fd.append("thumbnail",thumbnail);

    try{
      await api("/api/movies",{method:"POST",body:fd});
      setMsg("Uploaded. FFmpeg worker is processing it.");
      e.target.reset();
      setFile(null);
      setThumbnail(null);
      load();
    }catch(e){setMsg(e.message)}
  }

  async function publish(id){
    try{await api(`/api/movies/${id}/publish`,{method:"POST"});load()}
    catch(e){setMsg(e.message)}
  }

  return <main className="section"><h1>Admin Console</h1><div className="admin-layout">
    <form className="panel" onSubmit={upload}>
      <h2>Upload movie</h2>
      <input value={title} onChange={e=>setTitle(e.target.value)} placeholder="Title" required/>
      <textarea value={description} onChange={e=>setDescription(e.target.value)} placeholder="Description"/>
      <input value={genre} onChange={e=>setGenre(e.target.value)} placeholder="Genre"/>
      <input type="number" value={year} onChange={e=>setYear(e.target.value)}/>

      <label><strong>Movie Video</strong></label>
      <input type="file" accept="video/*" onChange={e=>setFile(e.target.files[0]||null)} required/>

      <label><strong>Movie Thumbnail / Poster</strong></label>
      <input type="file" accept="image/jpeg,image/png,image/webp" onChange={e=>setThumbnail(e.target.files[0]||null)} required/>

      {thumbnail&&<img src={URL.createObjectURL(thumbnail)} alt="Thumbnail preview" style={{width:"180px",height:"260px",objectFit:"cover",marginTop:"10px",borderRadius:"8px"}}/>}

      <button className="primary">Upload & Process</button>
      {msg&&<p>{msg}</p>}
    </form>

    <div className="panel"><h2>Library</h2>{movies.map(m=><div className="row" key={m.id}>
      <div style={{display:"flex",alignItems:"center",gap:"10px"}}>
        {m.thumbnail_key&&<img src={`${API}/api/movies/${m.id}/thumbnail`} alt={m.title} style={{width:"60px",height:"80px",objectFit:"cover",borderRadius:"5px"}}/>}
        <div><b>{m.title}</b><small>{m.status} · {m.published?"PUBLISHED":"DRAFT"}</small></div>
      </div>
      {m.status==="READY"&&!m.published&&<button onClick={()=>publish(m.id)}>Publish</button>}
    </div>)}</div>
  </div></main>
}

function Subscription(){
  const [sub,setSub]=useState(null);
  useEffect(()=>api("/api/subscription").then(setSub),[]);
  async function choose(plan){setSub(await api("/api/subscription",{method:"POST",body:JSON.stringify({plan})}))}
  return <main className="panel auth"><h2>Subscription</h2><p>Current: {sub?.plan}</p><button onClick={()=>choose("BASIC")}>Basic</button><button onClick={()=>choose("PREMIUM")}>Premium</button></main>
}
createRoot(document.getElementById("root")).render(<App/>);
