// ═══════════════════════════════════════════════════════════
//  NetPulse Dashboard — Version Conteneurisé (npm run build)
//  ISET Sousse — Cours Cloud & Réseaux Modernes 2026
// ═══════════════════════════════════════════════════════════
import React, { useState, useEffect, useCallback, useRef } from 'react';
import './App.css';

/* ─── Helpers ─────────────────────────────────────────────── */
const rand = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
const pad  = n => String(n).padStart(2, '0');
const now  = () => { const d = new Date(); return `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`; };

/* ─── Données statiques ───────────────────────────────────── */
const SERVICES_INIT = [
  { name: 'Nginx Reverse Proxy', port: '443',  status: 'up'   },
  { name: 'API Gateway',         port: '8080', status: 'up'   },
  { name: 'PostgreSQL 15',       port: '5432', status: 'up'   },
  { name: 'Redis Cache',         port: '6379', status: 'warn' },
  { name: 'Prometheus',          port: '9090', status: 'up'   },
  { name: 'Kubernetes API',      port: '6443', status: 'down' },
];

const LOG_TPL = [
  { lvl:'INFO',  msg:'Connexion établie depuis 192.168.{a}.{b}' },
  { lvl:'OK',    msg:'Certificat TLS renouvelé — api.local' },
  { lvl:'WARN',  msg:'Latence élevée sur eth0 : {lat}ms' },
  { lvl:'INFO',  msg:'Backup Kubernetes terminé avec succès' },
  { lvl:'ERR',   msg:'Timeout connexion pod backend-{n}' },
  { lvl:'OK',    msg:'Nouveau nœud enregistré : node-{n}.cluster' },
  { lvl:'INFO',  msg:'ArgoCD sync : révision {rev}' },
  { lvl:'WARN',  msg:'CPU > 80%% sur worker-node-{n}' },
  { lvl:'OK',    msg:'Istio injection réussie — namespace prod' },
  { lvl:'DEBUG', msg:'VPN tunnel up : 10.8.0.{b} → 10.8.0.{c}' },
  { lvl:'INFO',  msg:'Terraform plan : 3 to add, 0 to destroy' },
  { lvl:'OK',    msg:'Déploiement canary — 10%% trafic routé' },
];

const mkLog = () => {
  const t = LOG_TPL[rand(0, LOG_TPL.length - 1)];
  return {
    id:  Date.now() + Math.random(),
    ts:  now(),
    lvl: t.lvl,
    msg: t.msg
      .replace('{a}', rand(1,254)).replace('{b}', rand(1,254))
      .replace('{c}', rand(1,254)).replace('{lat}', rand(80,900))
      .replace(/{n}/g, rand(1,9)).replace('{rev}', `a${rand(1000,9999)}f`),
  };
};

/* ─── Sous-composants ─────────────────────────────────────── */
function DonutChart({ data, size = 110 }) {
  const r  = 40;
  const cx = size / 2;
  const cy = size / 2;
  let cum = 0;
  const total = data.reduce((s, d) => s + d.value, 0);
  const slices = data.map(d => {
    const angle = (d.value / total) * 2 * Math.PI;
    const x1 = cx + r * Math.cos(cum);
    const y1 = cy + r * Math.sin(cum);
    cum += angle;
    const x2 = cx + r * Math.cos(cum);
    const y2 = cy + r * Math.sin(cum);
    return { ...d, x1, y1, x2, y2, large: angle > Math.PI ? 1 : 0 };
  });
  return (
    <svg width={size} height={size} className="donut-svg">
      {slices.map((s, i) => (
        <path key={i} d={`M${cx},${cy} L${s.x1},${s.y1} A${r},${r} 0 ${s.large},1 ${s.x2},${s.y2}Z`}
          fill={s.color} opacity={0.85} />
      ))}
      <circle cx={cx} cy={cy} r={r * 0.55} fill="var(--panel)" />
      <text x={cx} y={cy+4} textAnchor="middle"
        style={{fill:'var(--text)',fontSize:13,fontFamily:'var(--font-mono)',transform:'rotate(90deg)',transformOrigin:`${cx}px ${cy}px`}}>
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
          height: `${(v / max) * 100}%`,
          background: v > 75 ? 'var(--accent2)' : v > 50 ? 'var(--warn)' : 'var(--accent)',
        }} />
      ))}
    </div>
  );
}

function ServiceRow({ name, port, status, latency }) {
  const dotColor = { up:'var(--accent3)', warn:'var(--warn)', down:'var(--accent2)' }[status];
  return (
    <div className="service-row">
      <div className="service-name">
        <div className="svc-dot" style={{ background: dotColor }} />
        {name}
      </div>
      <div className="svc-right">
        <span className="svc-latency">:{port} — {latency}ms</span>
        <span className={`svc-badge svc-${status}`}>{status.toUpperCase()}</span>
      </div>
    </div>
  );
}

function TopoMap() {
  const nodes = [
    { id:'core',  x:160, y:90,  r:18, c:'var(--accent)',  lbl:'Core SW' },
    { id:'ws1',   x:50,  y:50,  r:12, c:'var(--accent3)', lbl:'WS-01'   },
    { id:'srv2',  x:270, y:50,  r:12, c:'var(--accent3)', lbl:'SRV-02'  },
    { id:'ap1',   x:50,  y:150, r:12, c:'var(--accent2)', lbl:'AP-01'   },
    { id:'db1',   x:270, y:150, r:12, c:'var(--accent3)', lbl:'DB-01'   },
    { id:'fw',    x:160, y:18,  r:10, c:'var(--warn)',     lbl:'FW'      },
  ];
  const links = [
    ['core','ws1'],['core','srv2'],['core','ap1'],['core','db1'],['core','fw']
  ];
  const byId = Object.fromEntries(nodes.map(n => [n.id, n]));
  return (
    <svg className="topo-svg" viewBox="0 0 320 195">
      {links.map(([a,b],i) => {
        const A=byId[a], B=byId[b];
        return <line key={i} className="topo-link" x1={A.x} y1={A.y} x2={B.x} y2={B.y}/>;
      })}
      {nodes.map(n => (
        <g key={n.id} className="topo-node">
          <circle cx={n.x} cy={n.y} r={n.r * 2.2} className="topo-ring" fill={n.c} opacity={0.08}/>
          <circle cx={n.x} cy={n.y} r={n.r} fill={n.c} opacity={0.18}/>
          <circle cx={n.x} cy={n.y} r={n.r * 0.55} fill={n.c}/>
          <text x={n.x} y={n.y + n.r + 13} className="topo-label">{n.lbl}</text>
        </g>
      ))}
    </svg>
  );
}

/* ─── Composant principal ─────────────────────────────────── */
export default function App() {
  const [tick, setTick]       = useState(0);
  const [clock, setClock]     = useState(new Date());
  const [latency, setLatency] = useState(rand(8,45));
  const [bw, setBw]           = useState({ in: rand(200,700), out: rand(50,300) });
  const [packets, setPackets] = useState(rand(15000,60000));
  const [spark, setSpark]     = useState(() => Array.from({length:22}, () => rand(10,90)));
  const [services, setServices] = useState(SERVICES_INIT.map(s => ({...s, latency: rand(2,120)})));
  const [logs, setLogs]       = useState(() => Array.from({length:7}, mkLog));
  const termRef               = useRef(null);

  const [cpuData] = useState(() => {
    const k = rand(20,35), a = rand(25,45);
    return [
      { label:'kernel',  value: k,       color:'var(--accent)'  },
      { label:'apps',    value: a,       color:'var(--accent2)' },
      { label:'idle',    value: 100-k-a, color:'var(--dim)'     },
    ];
  });

  const [bwIfaces] = useState(() =>
    ['eth0','eth1','wlan0','docker0'].map(n => ({ name:n, val: rand(10,220) }))
  );

  // ─── Tick toutes les 2 secondes ─────────────────────────
  const doTick = useCallback(() => {
    setClock(new Date());
    setLatency(rand(6,90));
    setPackets(p => p + rand(400,3500));
    setBw({ in: rand(120,950), out: rand(40,420) });
    setSpark(prev => [...prev.slice(1), rand(8,98)]);
    setServices(prev => prev.map(s => ({ ...s, latency: rand(2,250) })));
    if (Math.random() > 0.3) setLogs(prev => [...prev.slice(-11), mkLog()]);
    setTick(t => t + 1);
  }, []);

  useEffect(() => {
    const id = setInterval(doTick, 2000);
    return () => clearInterval(id);
  }, [doTick]);

  // Auto-scroll terminal
  useEffect(() => {
    if (termRef.current) termRef.current.scrollTop = termRef.current.scrollHeight;
  }, [logs]);

  const dateStr = clock.toLocaleDateString('fr-FR', {weekday:'long', day:'numeric', month:'long', year:'numeric'});
  const timeStr = clock.toLocaleTimeString('fr-FR');
  const BW_MAX  = 1000;

  return (
    <div className="app">

      {/* Badge version */}
      <div className="version-badge">⬡ VERSION CONTENEURISEE — NODE.JS DEV SERVER</div>

      {/* ─── Header ─── */}
      <header className="header">
        <div className="header-logo">
          <div className="logo-icon" />
          <div>
            <div className="logo-text">NETPULSE</div>
            <div className="logo-sub">NETWORK OPERATIONS CENTER</div>
            <div className="logo-env">▸ MODE : DÉVELOPPEMENT LOCAL</div>
          </div>
        </div>
        <div className="header-right">
          <div className="status-live">
            <div className="status-dot" />
            LIVE — tick #{tick}
          </div>
          <div className="header-time">{dateStr} · {timeStr}</div>
        </div>
      </header>

      {/* ─── Main Grid ─── */}
      <main className="main">

        {/* KPI Latence */}
        <div className="panel">
          <div className="panel-title">Latence réseau<div className="panel-title-line"/></div>
          <div className="kpi-value">{latency}<span className="kpi-unit">ms</span></div>
          <div className="kpi-label">Ping moyen LAN/WAN</div>
          <div className={`kpi-trend ${latency < 30 ? 'trend-up' : 'trend-down'}`}>
            {latency < 30 ? '▲ Optimal' : latency < 60 ? '► Acceptable' : '▼ Dégradé'}
          </div>
          <Sparkline data={spark} />
        </div>

        {/* KPI Paquets */}
        <div className="panel">
          <div className="panel-title">Paquets traités<div className="panel-title-line"/></div>
          <div className="kpi-value" style={{fontSize:36}}>
            {(packets/1000).toFixed(1)}<span className="kpi-unit">K</span>
          </div>
          <div className="kpi-label">Total depuis démarrage</div>
          <div className="kpi-trend trend-up">▲ +{rand(400,3500)} / 2s</div>
          <div className="proto-tags">
            {['TCP','UDP','ICMP','ARP','HTTPS'].map(p => (
              <span key={p} className="proto-tag">{p}</span>
            ))}
          </div>
        </div>

        {/* Donut CPU */}
        <div className="panel">
          <div className="panel-title">CPU Process<div className="panel-title-line"/></div>
          <div className="donut-wrap">
            <DonutChart data={cpuData} size={108} />
            <div className="donut-legend">
              {cpuData.map((d, i) => (
                <div key={i} className="legend-item">
                  <div className="legend-dot" style={{background: d.color}}/>
                  <span style={{color:'var(--dim)'}}>{d.label}</span>
                  <span style={{color:'var(--text)', marginLeft:'auto', paddingLeft:8}}>{d.value}%</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Bandwidth */}
        <div className="panel panel-wide">
          <div className="panel-title">Bande passante — Interfaces<div className="panel-title-line"/></div>
          <div style={{marginTop:4}}>
            <div className="bw-row">
              <div className="bw-label">↓ Entrant</div>
              <div className="bw-track">
                <div className="bw-fill" style={{
                  width:`${(bw.in/BW_MAX)*100}%`,
                  background:'linear-gradient(90deg,var(--accent),rgba(0,229,255,.35))'
                }}/>
              </div>
              <div className="bw-val">{bw.in} Mb/s</div>
            </div>
            <div className="bw-row">
              <div className="bw-label">↑ Sortant</div>
              <div className="bw-track">
                <div className="bw-fill" style={{
                  width:`${(bw.out/BW_MAX)*100}%`,
                  background:'linear-gradient(90deg,var(--accent2),rgba(255,61,113,.35))'
                }}/>
              </div>
              <div className="bw-val">{bw.out} Mb/s</div>
            </div>
            {bwIfaces.map(ifc => (
              <div key={ifc.name} className="bw-row" style={{opacity:.65}}>
                <div className="bw-label">{ifc.name}</div>
                <div className="bw-track">
                  <div className="bw-fill" style={{
                    width:`${(ifc.val/300)*100}%`,
                    background:'linear-gradient(90deg,var(--dim),rgba(74,96,128,.3))'
                  }}/>
                </div>
                <div className="bw-val">{ifc.val} Mb/s</div>
              </div>
            ))}
          </div>
        </div>

        {/* Services */}
        <div className="panel panel-tall">
          <div className="panel-title">Services & Ports<div className="panel-title-line"/></div>
          {services.map((s, i) => (
            <ServiceRow key={i} {...s} />
          ))}
        </div>

        {/* Topologie */}
        <div className="panel">
          <div className="panel-title">Topologie réseau<div className="panel-title-line"/></div>
          <TopoMap />
        </div>

        {/* Journal Logs */}
        <div className="panel panel-full">
          <div className="panel-title">Journal système — Temps réel<div className="panel-title-line"/></div>
          <div className="terminal" ref={termRef}>
            {logs.map(l => (
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
        <span>React 18 · Webpack Dev Server · ISET Sousse 2026</span>
        <span className="footer-env">🟢 NODE.JS {process.env.NODE_ENV?.toUpperCase()}</span>
      </footer>

    </div>
  );
}
