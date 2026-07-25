export function AssignmentIcon({
  reassign = false,
  className = 'h-4 w-4',
}: {
  reassign?: boolean
  className?: string
}) {
  if (reassign) {
    return (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={1.8}
        className={className}
        aria-hidden="true"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M20 7.5V4m0 3.5h-3.5M4 16.5V20m0-3.5h3.5"
        />
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M6.05 7.2A7.5 7.5 0 0 1 18.8 6M5.2 18A7.5 7.5 0 0 0 17.95 16.8"
        />
        <circle cx="12" cy="9.25" r="2.25" />
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M8.25 15.25c.55-1.55 1.88-2.5 3.75-2.5s3.2.95 3.75 2.5"
        />
      </svg>
    )
  }

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      className={className}
      aria-hidden="true"
    >
      <circle cx="9" cy="8" r="3" />
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M3.75 19.25c.65-3.65 2.4-5.5 5.25-5.5s4.6 1.85 5.25 5.5M18 7.25v6M21 10.25h-6"
      />
    </svg>
  )
}
