export default function SolanaLogo({ className = "w-5 h-5" }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 397.7 311.7"
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <linearGradient
          id="solana-gradient-1"
          x1="360.88"
          y1="351.46"
          x2="-8.55"
          y2="-8.42"
          gradientUnits="userSpaceOnUse"
        >
          <stop offset="0" stopColor="#00ffa3" />
          <stop offset="1" stopColor="#dc1fff" />
        </linearGradient>
        <linearGradient
          id="solana-gradient-2"
          x1="264.83"
          y1="401.6"
          x2="-104.6"
          y2="32.72"
          gradientUnits="userSpaceOnUse"
        >
          <stop offset="0" stopColor="#00ffa3" />
          <stop offset="1" stopColor="#dc1fff" />
        </linearGradient>
        <linearGradient
          id="solana-gradient-3"
          x1="312.55"
          y1="376.69"
          x2="-56.88"
          y2="7.81"
          gradientUnits="userSpaceOnUse"
        >
          <stop offset="0" stopColor="#00ffa3" />
          <stop offset="1" stopColor="#dc1fff" />
        </linearGradient>
      </defs>
      <path
        d="M64.6 237.9c2.4-2.4 5.7-3.8 9.2-3.8h317.4c5.8 0 8.7 7 4.6 11.1l-62.7 62.7c-2.4 2.4-5.7 3.8-9.2 3.8H6.5c-5.8 0-8.7-7-4.6-11.1l62.7-62.7z"
        fill="url(#solana-gradient-1)"
      />
      <path
        d="M64.6 3.8C67.1 1.4 70.4 0 73.8 0h317.4c5.8 0 8.7 7 4.6 11.1l-62.7 62.7c-2.4 2.4-5.7 3.8-9.2 3.8H6.5c-5.8 0-8.7-7-4.6-11.1L64.6 3.8z"
        fill="url(#solana-gradient-2)"
      />
      <path
        d="M333.1 120.1c-2.4-2.4-5.7-3.8-9.2-3.8H6.5c-5.8 0-8.7 7-4.6 11.1l62.7 62.7c2.4 2.4 5.7 3.8 9.2 3.8h317.4c5.8 0 8.7-7 4.6-11.1l-62.7-62.7z"
        fill="url(#solana-gradient-3)"
      />
    </svg>
  );
}
