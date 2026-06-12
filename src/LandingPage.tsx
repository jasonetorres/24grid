import { useEffect, useRef, useState } from 'react';
import { ArrowRight, LayoutGrid, Clock, Download, Play } from 'lucide-react';

interface Props {
  onEnter: () => void;
}

const GRID_EXAMPLES = [
  // 2 side-by-side
  [{ x: 0, y: 0, w: 0.5, h: 1 }, { x: 0.5, y: 0, w: 0.5, h: 1 }],
  // 3-left-main
  [{ x: 0, y: 0, w: 0.6, h: 1 }, { x: 0.6, y: 0, w: 0.4, h: 0.5 }, { x: 0.6, y: 0.5, w: 0.4, h: 0.5 }],
  // 4-grid
  [{ x: 0, y: 0, w: 0.5, h: 0.5 }, { x: 0.5, y: 0, w: 0.5, h: 0.5 }, { x: 0, y: 0.5, w: 0.5, h: 0.5 }, { x: 0.5, y: 0.5, w: 0.5, h: 0.5 }],
  // 3-top-main
  [{ x: 0, y: 0, w: 1, h: 0.6 }, { x: 0, y: 0.6, w: 0.5, h: 0.4 }, { x: 0.5, y: 0.6, w: 0.5, h: 0.4 }],
];

function GridThumb({ panels, active }: { panels: { x: number; y: number; w: number; h: number }[]; active: boolean }) {
  return (
    <div
      className="relative w-full aspect-video rounded-lg overflow-hidden border transition-all duration-500"
      style={{
        background: '#0a0a0a',
        borderColor: active ? 'rgba(251,191,36,0.5)' : 'rgba(255,255,255,0.06)',
        boxShadow: active ? '0 0 30px rgba(251,191,36,0.15)' : 'none',
      }}
    >
      {panels.map((p, i) => (
        <div
          key={i}
          className="absolute rounded-sm transition-all duration-500"
          style={{
            left: `calc(${p.x * 100}% + 2px)`,
            top: `calc(${p.y * 100}% + 2px)`,
            width: `calc(${p.w * 100}% - 4px)`,
            height: `calc(${p.h * 100}% - 4px)`,
            background: active
              ? `rgba(251,191,36,${0.1 + i * 0.04})`
              : `rgba(255,255,255,${0.04 + i * 0.02})`,
          }}
        />
      ))}
    </div>
  );
}

const FEATURES = [
  {
    icon: <LayoutGrid className="w-5 h-5" />,
    title: 'Eight layouts',
    body: 'Side-by-side, stacked, left main, PIP overlays, 2×2 grid — or drag any edge to create your own proportions.',
  },
  {
    icon: <Clock className="w-5 h-5" />,
    title: 'Per-clip timing',
    body: 'Set each panel\'s start time independently. One clip begins at 0:00, another at 0:15 — full cinematic control.',
  },
  {
    icon: <Download className="w-5 h-5" />,
    title: 'Export MP4',
    body: 'H.264 encoding direct in the browser via WebCodecs. No uploads, no waiting. Your file, instantly.',
  },
  {
    icon: <Play className="w-5 h-5" />,
    title: 'Live canvas preview',
    body: 'Every change renders in real time on an HTML5 canvas at up to 1280×720 or 720×1280 for portrait.',
  },
];

export default function LandingPage({ onEnter }: Props) {
  const [activeGrid, setActiveGrid] = useState(0);
  const [visible, setVisible] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 60);
    intervalRef.current = setInterval(() => {
      setActiveGrid(g => (g + 1) % GRID_EXAMPLES.length);
    }, 2200);
    return () => {
      clearTimeout(t);
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  return (
    <div
      className="min-h-screen flex flex-col bg-gray-950 overflow-x-hidden"
      style={{ fontFamily: "'Inter', system-ui, sans-serif" }}
    >
      {/* ── Noise texture overlay ── */}
      <div
        className="pointer-events-none fixed inset-0 z-0 opacity-[0.025]"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`,
          backgroundSize: '128px 128px',
        }}
      />

      {/* ── Nav ── */}
      <nav className="relative z-10 flex items-center justify-between px-8 py-6">
        <Logo />
        <button
          onClick={onEnter}
          className="flex items-center gap-2 px-4 py-2 rounded-xl border border-gray-800 text-sm font-semibold text-gray-400 hover:text-white hover:border-gray-600 transition-all duration-200"
        >
          Open Studio
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </nav>

      {/* ── Hero ── */}
      <section className="relative z-10 flex-1 flex flex-col items-center justify-center px-6 pt-12 pb-24 text-center">

        {/* Ambient glow */}
        <div
          className="pointer-events-none absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[400px] rounded-full opacity-20"
          style={{ background: 'radial-gradient(ellipse, rgba(251,191,36,0.35) 0%, transparent 70%)', filter: 'blur(60px)' }}
        />

        <div
          className="transition-all duration-700"
          style={{ opacity: visible ? 1 : 0, transform: visible ? 'translateY(0)' : 'translateY(20px)' }}
        >
          {/* Episode badge */}
          <div className="inline-flex items-center gap-2 px-3 py-1.5 mb-8 rounded-full border border-amber-400/20 bg-amber-400/5">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
            <span className="text-xs font-semibold text-amber-400 tracking-widest uppercase">Browser-native · No uploads required</span>
          </div>

          {/* Headline */}
          <h1 className="text-6xl sm:text-7xl lg:text-8xl font-black text-white leading-none tracking-tight mb-6" style={{ letterSpacing: '-0.03em' }}>
            Split-screen
            <br />
            <span className="text-amber-400">without limits.</span>
          </h1>

          <p className="max-w-xl mx-auto text-lg text-gray-400 leading-relaxed mb-10">
            Compose cinematic multi-panel videos directly in your browser.
            Set layouts, sync timings, drag edges — export H.264 MP4 instantly.
          </p>

          <button
            onClick={onEnter}
            className="group inline-flex items-center gap-3 px-8 py-4 bg-amber-400 hover:bg-amber-300 text-black text-base font-bold rounded-2xl transition-all duration-200 shadow-2xl shadow-amber-400/25 hover:shadow-amber-400/40 hover:scale-[1.02] active:scale-[0.98]"
          >
            Enter the Studio
            <ArrowRight className="w-5 h-5 transition-transform duration-200 group-hover:translate-x-0.5" />
          </button>
        </div>

        {/* Grid preview carousel */}
        <div
          className="mt-20 w-full max-w-2xl transition-all duration-700 delay-150"
          style={{ opacity: visible ? 1 : 0, transform: visible ? 'translateY(0)' : 'translateY(24px)' }}
        >
          <div className="relative">
            {/* Vignette */}
            <div className="absolute inset-0 rounded-2xl z-10 pointer-events-none" style={{ boxShadow: 'inset 0 0 60px rgba(9,9,11,0.8)' }} />
            <div className="rounded-2xl overflow-hidden border border-gray-800/80 shadow-2xl">
              <GridThumb panels={GRID_EXAMPLES[activeGrid]} active />
            </div>
          </div>

          {/* Dots */}
          <div className="flex justify-center gap-2 mt-4">
            {GRID_EXAMPLES.map((_, i) => (
              <button
                key={i}
                onClick={() => setActiveGrid(i)}
                className="w-1.5 h-1.5 rounded-full transition-all duration-300"
                style={{ background: activeGrid === i ? '#fbbf24' : 'rgba(255,255,255,0.15)' }}
              />
            ))}
          </div>
        </div>
      </section>

      {/* ── Features ── */}
      <section
        className="relative z-10 border-t border-gray-800/60 px-8 py-20"
        style={{ background: 'linear-gradient(to bottom, rgba(9,9,11,0), rgba(17,17,23,1))' }}
      >
        <div className="max-w-5xl mx-auto">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {FEATURES.map((f) => (
              <div key={f.title} className="group p-5 rounded-2xl border border-gray-800/60 bg-gray-900/30 hover:border-gray-700 hover:bg-gray-900/60 transition-all duration-300">
                <div className="w-9 h-9 rounded-xl bg-amber-400/10 text-amber-400 flex items-center justify-center mb-4 group-hover:bg-amber-400/15 transition-colors">
                  {f.icon}
                </div>
                <h3 className="text-sm font-bold text-white mb-2">{f.title}</h3>
                <p className="text-xs text-gray-500 leading-relaxed">{f.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="relative z-10 border-t border-gray-800/40 px-8 py-6 flex items-center justify-between">
        <Logo small />
        <p className="text-xs text-gray-700">
          Inspired by the split-screen countdown of <span className="text-gray-600 font-semibold italic">24</span>
        </p>
      </footer>
    </div>
  );
}

function Logo({ small = false }: { small?: boolean }) {
  return (
    <div className="flex items-center gap-2.5">
      {/* Icon: 4-square grid */}
      <div
        className="rounded-lg bg-amber-400 flex items-center justify-center flex-shrink-0"
        style={{ width: small ? 28 : 36, height: small ? 28 : 36 }}
      >
        <svg
          viewBox="0 0 20 20"
          fill="none"
          style={{ width: small ? 16 : 20, height: small ? 16 : 20 }}
        >
          <rect x="2" y="2" width="7" height="7" rx="1.5" fill="black" />
          <rect x="11" y="2" width="7" height="7" rx="1.5" fill="black" />
          <rect x="2" y="11" width="7" height="7" rx="1.5" fill="black" />
          <rect x="11" y="11" width="7" height="7" rx="1.5" fill="black" />
        </svg>
      </div>

      <div>
        <div
          className="font-black text-white leading-none"
          style={{ fontSize: small ? 13 : 17, letterSpacing: '-0.03em' }}
        >
          24grid
          <span className="text-amber-400" style={{ fontWeight: 400, fontSize: small ? 12 : 15 }}>.studio</span>
        </div>
        {!small && (
          <div className="text-gray-600 leading-tight" style={{ fontSize: 10, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
            Split-screen composer
          </div>
        )}
      </div>
    </div>
  );
}

export { Logo };
