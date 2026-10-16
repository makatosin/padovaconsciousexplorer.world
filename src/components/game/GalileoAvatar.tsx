import { useId } from "react";

// Galileo Galilei in versione cartoon, disegnato in SVG e animato con CSS
// (classi gal-* in styles.css): respira, sbatte le palpebre, muove la testa,
// parla quando `talking` è attivo e agita il cannocchiale quando `excited`.
export function GalileoAvatar({
  className = "size-10",
  talking = false,
  excited = false,
  framed = true,
}: {
  className?: string;
  talking?: boolean;
  excited?: boolean;
  framed?: boolean;
}) {
  const uid = useId().replace(/:/g, "");
  const sky = `gal-sky-${uid}`;
  const clip = `gal-clip-${uid}`;
  return (
    <svg
      viewBox="0 0 160 160"
      role="img"
      aria-label="Galileo Galilei"
      className={`gal-root shrink-0 ${talking ? "gal-talking" : ""} ${excited ? "gal-excited" : ""} ${className}`}
    >
      <defs>
        <linearGradient id={sky} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#2b1b5e" />
          <stop offset="1" stopColor="#5b2a86" />
        </linearGradient>
        <clipPath id={clip}>
          {framed ? <circle cx="80" cy="80" r="80" /> : <rect width="160" height="160" />}
        </clipPath>
      </defs>
      <g clipPath={`url(#${clip})`}>
        {framed && (
          <>
            <rect width="160" height="160" fill={`url(#${sky})`} />
            <g fill="#ffd166">
              <path className="gal-twinkle" d="M26 30l2.5 6 6 2.5-6 2.5-2.5 6-2.5-6-6-2.5 6-2.5z" />
              <circle className="gal-twinkle gal-d1" cx="132" cy="26" r="2.4" />
              <circle className="gal-twinkle gal-d2" cx="16" cy="78" r="1.8" />
              <circle className="gal-twinkle gal-d3" cx="146" cy="70" r="2" />
            </g>
          </>
        )}

        <g className="gal-bob">
          {/* veste */}
          <path d="M22 176 C24 134 52 120 80 120 C108 120 136 134 138 176 Z" fill="#3b2a6b" />
          <path d="M80 122 V176" stroke="#2b1b5e" strokeWidth="3" />
          {/* gorgiera */}
          <g fill="#fbf6ea" stroke="#d9cfba" strokeWidth="1.2">
            {[52, 61, 70, 80, 90, 99, 108].map((x, i) => (
              <circle key={x} cx={x} cy={124 + Math.abs(i - 3) * -1.2} r="7" />
            ))}
          </g>

          {/* braccio con cannocchiale */}
          <g className="gal-arm">
            <path d="M118 150 Q126 136 122 126" stroke="#3b2a6b" strokeWidth="13" strokeLinecap="round" fill="none" />
            <g transform="rotate(-48 122 124)">
              <rect x="118" y="117" width="46" height="13" rx="3.5" fill="#d9a441" stroke="#8a5a1f" strokeWidth="1.5" />
              <rect x="158" y="114" width="9" height="19" rx="2.5" fill="#8a5a1f" />
              <rect x="133" y="117" width="3.5" height="13" fill="#8a5a1f" />
            </g>
            <circle cx="122" cy="125" r="7.5" fill="#f6cfa9" stroke="#e2ae86" strokeWidth="1" />
          </g>

          {/* testa */}
          <g className="gal-head">
            <ellipse cx="45" cy="80" rx="6" ry="8.5" fill="#efb990" />
            <ellipse cx="115" cy="80" rx="6" ry="8.5" fill="#efb990" />
            <ellipse cx="80" cy="77" rx="34" ry="37" fill="#f6cfa9" />
            {/* capelli bianchi ai lati e ciuffo sulla fronte stempiata */}
            <path d="M45 88 Q36 76 41 64 Q40 54 50 52 Q47 60 52 66 Q49 76 54 84 Z" fill="#ece6da" stroke="#bdb2a0" strokeWidth="1.2" />
            <path d="M115 88 Q124 76 119 64 Q120 54 110 52 Q113 60 108 66 Q111 76 106 84 Z" fill="#ece6da" stroke="#bdb2a0" strokeWidth="1.2" />
            <path d="M72 42 Q78 34 84 40 Q88 34 92 42" fill="none" stroke="#bdb2a0" strokeWidth="2.2" strokeLinecap="round" />
            <ellipse cx="70" cy="52" rx="9" ry="4.5" fill="#fff" opacity="0.35" transform="rotate(-20 70 52)" />
            {/* sopracciglia */}
            <g className="gal-brows" fill="none" stroke="#a89d8c" strokeWidth="4.5" strokeLinecap="round">
              <path d="M58 64 Q65 58 73 62" />
              <path d="M87 62 Q95 58 102 64" />
            </g>
            {/* occhi */}
            <g className="gal-eyes">
              <ellipse cx="66" cy="75" rx="7.5" ry="8.5" fill="#fff" />
              <ellipse cx="94" cy="75" rx="7.5" ry="8.5" fill="#fff" />
              <circle className="gal-pupil" cx="67" cy="76" r="4.6" fill="#2b2233" />
              <circle className="gal-pupil" cx="95" cy="76" r="4.6" fill="#2b2233" />
              <circle cx="68.6" cy="74" r="1.6" fill="#fff" />
              <circle cx="96.6" cy="74" r="1.6" fill="#fff" />
            </g>
            {/* guance */}
            <circle cx="56" cy="88" r="6" fill="#f08a7e" opacity="0.35" />
            <circle cx="104" cy="88" r="6" fill="#f08a7e" opacity="0.35" />
            {/* barba */}
            <path
              d="M45 82 Q44 112 58 126 Q64 136 72 132 Q76 142 84 136 Q92 140 96 130 Q106 132 108 120 Q117 106 115 82 Q108 100 92 104 Q80 108 68 104 Q52 100 45 82 Z"
              fill="#efe9de"
              stroke="#c9bfae"
              strokeWidth="1.4"
            />
            {/* bocca */}
            <ellipse className="gal-mouth" cx="80" cy="107" rx="6.5" ry="3.6" fill="#7a2e2e" />
            {/* baffi */}
            <path d="M80 98 Q71 92 62 99 Q66 103 72 102 Q77 101 80 100 Z" fill="#e2dccf" stroke="#bdb2a0" strokeWidth="1" />
            <path d="M80 98 Q89 92 98 99 Q94 103 88 102 Q83 101 80 100 Z" fill="#e2dccf" stroke="#bdb2a0" strokeWidth="1" />
            {/* naso */}
            <ellipse cx="80" cy="89" rx="6.5" ry="6" fill="#eda27c" />
            <ellipse cx="78" cy="87" rx="2" ry="1.5" fill="#fff" opacity="0.5" />
          </g>
        </g>
      </g>
    </svg>
  );
}
