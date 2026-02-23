// ═══════════════════════════════════════════════════════════
//  NetPulse Dashboard — Version DOCKER (Nginx Container)
//  ISET Sousse — Cours Cloud & Réseaux Modernes 2026
//  Thème : Orange/Rouge (distinct de la version Classique)
// ═══════════════════════════════════════════════════════════
import React, { useState, useEffect, useCallback, useRef } from 'react';
import './App.css';

/* ─── Helpers ─────────────────────────────────────────────── */
const rand  = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
const pad   = n => String(n).padStart(2, '0');
const nowTs = () => { const d = new Date(); return `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`; };

/* ─── Infos "container" simulées ──────────────────────────── */
const CONTAINER_INFO = {
  id:      'a3f8c2d91e04',
  image:   'netpulse-docker:latest',
  runtime: 'containerd',
  nginx:   '1.25-alpine',
  port:    '3000:80',
  network: 'bridge',
  ip:      '172.17.0.2',
  uptime:  () => {
    const s = Math.floor(Date.now() / 1000) % 86400;
    const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60);
    return `${pad(h)}h ${pad(m)}m`;
  }
};

/* ─── Données statiques ───────────────────────────────────── */
const SERVICES_INIT = [
  { name: 'Nginx :80 (conteneur)',   port: '80',   status: 'up'   },
  { name: 'Host port mapping',       port: '3000', status: 'up'   },
  { name: 'Docker bridge network',   port: '—',    status: 'up'   },
  { name: 'containerd runtime',      port: '—',    status: 'up'   },
  { name: 'Registry mirror',         port: '5000', status: 'warn' },
  { name: 'Kubernetes scheduler',    port: '10259',status: 'down' },
];

const LOG_TPL = [
  { lvl:'INFO',  msg:'nginx: [notice] {n} worker process(es) started' },
  { lvl:'OK',    msg:'Requête GET / → 200 OK ({lat}ms)' },
  { lvl:'INFO',  msg:'Couche SPA : try_files activé — route /dashboard' },
  { lvl:'OK',    msg:'Healthcheck HTTP 200 — conteneur healthy' },
  { lvl:'INFO',  msg:'Image netpulse-docker:{rev} — {n} layers cached' },
  { lvl:'WARN',  msg:'Memory usage conteneur : {lat}MB / 512MB' },
  { lvl:'OK',    msg:'Gzip compression activée — ratio {n}:{n}' },
  { lvl:'INFO',  msg:'Docker daemon : event container/{a} start' },
  { lvl:'DEBUG', msg:'Bridge 172.17.0.{b} → host NAT masquerade' },
  { lvl:'OK',    msg:'Build multi-stage : image finale {lat}MB' },
  { lvl:'INFO',  msg:'Dockerfile COPY --from=builder : {n} fichiers' },
  { lvl:'WARN',  msg:'OOM score container {n} : {lat} points' },
];

const mkLog = () => {
  const t = LOG_TPL[rand(0, LOG_TPL.length - 1)];
  return {
    id:  Date.now() + Math.random(),
    ts:  nowTs(),
    lvl: t.lvl,
    msg: t.msg
      .replace('{a}', rand(1,9)).replace(/{b}/g, rand(1,254))
      .replace(/{lat}/g, rand(20,250)).replace(/{n}/g, rand(1,9))
      .replace('{rev}', `1.${rand(0,9)}.${rand(0,9)}`),
  };
};

/* ─── Sous-composants ─────────────────────────────────────── */
function DonutChart({ data, size = 110 }) {
  const r = 40, cx = size/2, cy = size/2;
  let cum = 0;
  const total = data.reduce((s, d) => s + d.value, 0);
  const slices = data.map(d => {
    const angle = (d.value / total) * 2 * Math.PI;
    const x1 = cx + r * Math.cos(cum), y1 = cy + r * Math.sin(cum);
    cum += angle;
    const x2 = cx + r * Math.cos(cum), y2 = cy + r * Math.sin(cum);
    return { ...d, x1, y1, x2, y2, large: angle > Math.PI ? 1 : 0 };
  });
  return (
    <svg width={size} height={size} className="donut-svg">
      {slices.map((s, i) => (
        <path key={i} d={`M${cx},${cy}L${s.x1},${s.y1}A${r},${r} 0 ${s.large},1 ${s.x2},${s.y2}Z`}
          fill={s.color} opacity={0.85}/>
      ))}
      <circle cx={cx} cy={cy} r={r*0.55} fill="var(--panel)"/>
      <text x={cx} y={cy+4} textAnchor="middle"
        style={{fill:'var(--text)',fontSize:12,fontFamily:'var(--font-mono)',
          transform:`rotate(90deg)`,transformOrigin:`${cx}px ${cy}px`}}>
        {data[0].value}%
      </text>
    </svg>
  );
}

function Sparkline({ data }) {
  const max = Math.max(...data, 1);
  return (
    <div className="sparkline">
      {data.map((v, i) => (
        <div key={i} className="spark-bar" style={{
          height: `${(v/max)*100}%`,
          background: v > 75 ? '#ff3d71' : v > 50 ? 'var(--warn)' : 'var(--accent)',
        }}/>
      ))}
    </div>
  );
}

function ServiceRow({ name, port, status, latency }) {
  const dotColor = { up:'var(--accent3)', warn:'var(--warn)', down:'var(--accent2)' }[status];
  return (
    <div className="service-row">
      <div className="service-name">
        <div className="svc-dot" style={{background: dotColor}}/>
        {name}
      </div>
      <div className="svc-right">
        <span className="svc-latency">{port !== '—' ? `:${port}` : '  —  '} {latency ? `${latency}ms` : ''}</span>
        <span className={`svc-badge svc-${status}`}>{status.toUpperCase()}</span>
      </div>
    </div>
  );
}

function TopoMap() {
  const nodes = [
    { id:'host', x:160,y:95, r:18,c:'var(--accent)', lbl:'Ubuntu Host'},
    { id:'dkr',  x:80, y:40, r:13,c:'#0db7ed',       lbl:'Docker Engine'},
    { id:'ctn',  x:250,y:40, r:13,c:'var(--accent)',  lbl:'Container'},
    { id:'ngx',  x:250,y:155,r:11,c:'#009639',        lbl:'Nginx'},
    { id:'br',   x:80, y:155,r:11,c:'var(--dim)',      lbl:'Bridge Net'},
    { id:'ext',  x:160,y:15, r:9, c:'var(--warn)',     lbl:'Browser :3000'},
  ];
  const links=[['host','dkr'],['host','ctn'],['ctn','ngx'],['host','br'],['br','ctn'],['ext','host']];
  const byId = Object.fromEntries(nodes.map(n=>[n.id,n]));
  return (
    <svg className="topo-svg" viewBox="0 0 320 195">
      {links.map(([a,b],i)=>{
        const A=byId[a],B=byId[b];
        return <line key={i} className="topo-link" x1={A.x} y1={A.y} x2={B.x} y2={B.y}/>;
      })}
      {nodes.map(n=>(
        <g key={n.id} className="topo-node">
          <circle cx={n.x} cy={n.y} r={n.r*2.2} className="topo-ring" fill={n.c} opacity={0.1}/>
          <circle cx={n.x} cy={n.y} r={n.r} fill={n.c} opacity={0.2}/>
          <circle cx={n.x} cy={n.y} r={n.r*0.55} fill={n.c}/>
          <text x={n.x} y={n.y+n.r+13} className="topo-label">{n.lbl}</text>
        </g>
      ))}
    </svg>
  );
}

/* ─── Composant principal ─────────────────────────────────── */
export default function App() {
  const [tick, setTick]       = useState(0);
  const [clock, setClock]     = useState(new Date());
  const [latency, setLatency] = useState(rand(3,25));
  const [bw, setBw]           = useState({ in: rand(100,600), out: rand(30,200) });
  const [requests, setRequests] = useState(rand(1000,8000));
  const [spark, setSpark]     = useState(()=>Array.from({length:22},()=>rand(10,90)));
  const [services, setServices] = useState(SERVICES_INIT.map(s=>({...s,latency:s.port!=='—'?rand(1,50):null})));
  const [logs, setLogs]       = useState(()=>Array.from({length:7},mkLog));
  const termRef               = useRef(null);

  const [memData] = useState(()=>{
    const used=rand(30,65), cache=rand(10,25);
    return [
      {label:'used',  value:used,       color:'var(--accent)'},
      {label:'cache', value:cache,      color:'#c05020'},
      {label:'free',  value:100-used-cache, color:'var(--dim)'},
    ];
  });

  const [bwIfaces] = useState(()=>
    ['eth0 (host)','docker0','veth0a3f','lo'].map(n=>({name:n,val:rand(5,180)}))
  );

  // ─── Tick ────────────────────────────────────────────────
  const doTick = useCallback(() => {
    setClock(new Date());
    setLatency(rand(2,40));
    setRequests(r=>r+rand(50,400));
    setBw({in:rand(80,700),out:rand(20,300)});
    setSpark(prev=>[...prev.slice(1),rand(8,95)]);
    setServices(prev=>prev.map(s=>({...s,latency:s.port!=='—'?rand(1,60):null})));
    if(Math.random()>.3) setLogs(prev=>[...prev.slice(-11),mkLog()]);
    setTick(t=>t+1);
  }, []);

  useEffect(()=>{
    const id=setInterval(doTick,2000);
    return ()=>clearInterval(id);
  },[doTick]);

  useEffect(()=>{
    if(termRef.current) termRef.current.scrollTop=termRef.current.scrollHeight;
  },[logs]);

  const dateStr = clock.toLocaleDateString('fr-FR',{weekday:'long',day:'numeric',month:'long',year:'numeric'});
  const timeStr = clock.toLocaleTimeString('fr-FR');
  const BW_MAX  = 800;

  return (
    <div className="app">

      {/* Badge version */}
      <div className="version-badge">🐳 VERSION DOCKER — NGINX ALPINE CONTAINER</div>

      {/* ─── Header ─── */}
      <header className="header">
        <div className="header-logo">
          <div className="logo-icon"/>
          <div>
            <div className="logo-text">NETPULSE</div>
            <div className="logo-sub">NETWORK OPERATIONS CENTER</div>
            <div className="logo-env">▸ MODE : CONTENEUR DOCKER · NGINX</div>
          </div>
        </div>
        <div className="header-right">
          <div className="status-live">
            <div className="status-dot"/>
            CONTAINER — tick #{tick}
          </div>
          <div className="header-time">{dateStr} · {timeStr}</div>
        </div>
      </header>

      {/* ─── Docker Info Bar ─── */}
      <div className="docker-bar">
        <div className="docker-item">
          <span className="docker-key">CONTAINER ID</span>
          <span className="docker-val">{CONTAINER_INFO.id}</span>
        </div>
        <span className="docker-sep">│</span>
        <div className="docker-item">
          <span className="docker-key">IMAGE</span>
          <span className="docker-val">{CONTAINER_INFO.image}</span>
        </div>
        <span className="docker-sep">│</span>
        <div className="docker-item">
          <span className="docker-key">PORT</span>
          <span className="docker-val">{CONTAINER_INFO.port}</span>
        </div>
        <span className="docker-sep">│</span>
        <div className="docker-item">
          <span className="docker-key">IP</span>
          <span className="docker-val">{CONTAINER_INFO.ip}</span>
        </div>
        <span className="docker-sep">│</span>
        <div className="docker-item">
          <span className="docker-key">NGINX</span>
          <span className="docker-val">{CONTAINER_INFO.nginx}</span>
        </div>
        <span className="docker-sep">│</span>
        <div className="docker-item">
          <span className="docker-key">UPTIME</span>
          <span className="docker-val">{CONTAINER_INFO.uptime()}</span>
        </div>
        <span className="docker-sep">│</span>
        <div className="docker-item">
          <span className="docker-key">NETWORK</span>
          <span className="docker-val">{CONTAINER_INFO.network}</span>
        </div>
      </div>

      {/* ─── Main Grid ─── */}
      <main className="main">

        {/* KPI Requêtes Nginx */}
        <div className="panel">
          <div className="panel-title">Requêtes Nginx<div className="panel-title-line"/></div>
          <div className="kpi-value" style={{fontSize:36}}>
            {(requests/1000).toFixed(1)}<span className="kpi-unit">K</span>
          </div>
          <div className="kpi-label">Requêtes servies par Nginx</div>
          <div className="kpi-trend trend-up">▲ +{rand(50,400)} / 2s</div>
          <Sparkline data={spark}/>
        </div>

        {/* KPI Latence */}
        <div className="panel">
          <div className="panel-title">Latence container<div className="panel-title-line"/></div>
          <div className="kpi-value">{latency}<span className="kpi-unit">ms</span></div>
          <div className="kpi-label">Temps de réponse Nginx</div>
          <div className={`kpi-trend ${latency < 15 ? 'trend-up' : 'trend-dn'}`}>
            {latency < 15 ? '▲ Excellent' : latency < 30 ? '► Normal' : '▼ Lent'}
          </div>
          <div style={{marginTop:12,display:'flex',gap:8,flexWrap:'wrap'}}>
            {['GET','POST','PUT','DELETE'].map(m=>(
              <span key={m} style={{
                padding:'2px 8px',border:'1px solid var(--border)',
                borderRadius:2,fontSize:10,fontFamily:'var(--font-mono)',color:'var(--dim)'
              }}>{m}</span>
            ))}
          </div>
        </div>

        {/* Container Stats */}
        <div className="panel">
          <div className="panel-title">Stats Container<div className="panel-title-line"/></div>
          <div className="container-stats">
            <div className="cstat">
              <div className="cstat-val">{rand(15,45)}<span style={{fontSize:14}}>MB</span></div>
              <div className="cstat-label">IMAGE SIZE</div>
            </div>
            <div className="cstat">
              <div className="cstat-val">{rand(20,80)}<span style={{fontSize:14}}>MB</span></div>
              <div className="cstat-label">RAM USAGE</div>
            </div>
            <div className="cstat">
              <div className="cstat-val">{rand(1,8)}<span style={{fontSize:14}}>%</span></div>
              <div className="cstat-label">CPU USAGE</div>
            </div>
            <div className="cstat">
              <div className="cstat-val">2</div>
              <div className="cstat-label">LAYERS ACTIVE</div>
            </div>
          </div>
        </div>

        {/* Bandwidth */}
        <div className="panel panel-wide">
          <div className="panel-title">Trafic réseau — Docker bridge<div className="panel-title-line"/></div>
          <div style={{marginTop:4}}>
            <div className="bw-row">
              <div className="bw-label">↓ Entrant</div>
              <div className="bw-track">
                <div className="bw-fill" style={{
                  width:`${(bw.in/BW_MAX)*100}%`,
                  background:'linear-gradient(90deg,var(--accent),rgba(255,107,53,.3))'
                }}/>
              </div>
              <div className="bw-val">{bw.in} Mb/s</div>
            </div>
            <div className="bw-row">
              <div className="bw-label">↑ Sortant</div>
              <div className="bw-track">
                <div className="bw-fill" style={{
                  width:`${(bw.out/BW_MAX)*100}%`,
                  background:'linear-gradient(90deg,var(--accent2),rgba(255,61,113,.3))'
                }}/>
              </div>
              <div className="bw-val">{bw.out} Mb/s</div>
            </div>
            {bwIfaces.map(ifc=>(
              <div key={ifc.name} className="bw-row" style={{opacity:.65}}>
                <div className="bw-label">{ifc.name}</div>
                <div className="bw-track">
                  <div className="bw-fill" style={{
                    width:`${(ifc.val/250)*100}%`,
                    background:'linear-gradient(90deg,var(--dim),rgba(122,80,64,.3))'
                  }}/>
                </div>
                <div className="bw-val">{ifc.val} Mb/s</div>
              </div>
            ))}
          </div>
        </div>

        {/* Services */}
        <div className="panel panel-tall">
          <div className="panel-title">Services Docker<div className="panel-title-line"/></div>
          {services.map((s,i)=>(<ServiceRow key={i} {...s}/>))}
        </div>

        {/* Topologie Docker */}
        <div className="panel">
          <div className="panel-title">Architecture Docker<div className="panel-title-line"/></div>
          <TopoMap/>
        </div>

        {/* Logs Nginx */}
        <div className="panel panel-full">
          <div className="panel-title">Logs Nginx — Conteneur en temps réel<div className="panel-title-line"/></div>
          <div className="terminal" ref={termRef}>
            {logs.map(l=>(
              <div key={l.id} className="log-line">
                <span className="log-time">[{l.ts}]</span>
                <span className={`log-${l.lvl}`}>[{l.lvl.padEnd(5)}]</span>
                <span>{l.msg}</span>
              </div>
            ))}
          </div>
        </div>

      </main>

      {/* ─── Footer ─── */}
      <footer className="footer">
        <span className="footer-brand">NETPULSE v1.0</span>
        <span>React 18 → Build → Nginx:alpine · ISET Sousse 2026</span>
        <span className="footer-env">🐳 DOCKER · {CONTAINER_INFO.image}</span>
      </footer>

    </div>
  );
}
