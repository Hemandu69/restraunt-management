interface LogoProps {
  size?: number;
}

// Crossed fork & spoon - matches public/favicon.svg's design so the navbar
// mark and the browser tab icon read as the same brand, not two logos.
export function Logo({ size = 18 }: LogoProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" fill="none" aria-hidden="true">
      <g fill="currentColor">
        <g transform="rotate(25 20 20)">
          <rect x="18.7" y="19" width="2.6" height="14" rx="1.3" />
          <ellipse cx="20" cy="12.5" rx="4.6" ry="6.2" />
        </g>
        <g transform="rotate(-25 20 20)">
          <rect x="18.7" y="19" width="2.6" height="14" rx="1.3" />
          <rect x="15.8" y="13.5" width="8.4" height="2.6" rx="1.3" />
          <rect x="16.4" y="7" width="1.6" height="7" rx="0.8" />
          <rect x="19.2" y="6.5" width="1.6" height="7.5" rx="0.8" />
          <rect x="22" y="7" width="1.6" height="7" rx="0.8" />
        </g>
      </g>
    </svg>
  );
}
