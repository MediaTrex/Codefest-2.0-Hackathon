import React from 'react'

/**
 * CarePilot Ai mark — pilot pointer + care pulse.
 * variant: "badge" (black tile + white mark) | "mark" (currentColor paths)
 */
export default function CarePilotLogo({
  size = 32,
  variant = 'badge',
  className = '',
  title = 'CarePilot Ai',
}) {
  const paths = (
    <>
      <path
        d="M16 6.5L24.2 22.4h-4.6L16 15.2l-3.6 7.2H7.8L16 6.5z"
        fill="currentColor"
      />
      <path
        d="M9 25.2h3.2l1.2-2.4 1.6 4.2 1.4-3.2H23"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </>
  )

  if (variant === 'mark') {
    return (
      <svg
        width={size}
        height={size}
        viewBox="0 0 32 32"
        className={className}
        role="img"
        aria-label={title}
      >
        <title>{title}</title>
        {paths}
      </svg>
    )
  }

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      className={className}
      role="img"
      aria-label={title}
    >
      <title>{title}</title>
      <rect width="32" height="32" rx="8" fill="#0a0a0b" />
      <g className="text-white" style={{ color: '#ffffff' }}>
        {paths}
      </g>
    </svg>
  )
}
