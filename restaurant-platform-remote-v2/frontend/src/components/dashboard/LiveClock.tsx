/**
 * Live Clock Component
 * Isolated to prevent parent component re-renders
 * Uses React.memo to optimize performance
 */

import React, { useState, useEffect, useMemo, memo } from 'react'

interface LiveClockProps {
  className?: string
}

export const LiveClock = memo(({ className = "text-xs text-gray-500 font-mono" }: LiveClockProps) => {
  const [currentTime, setCurrentTime] = useState(new Date(0))
  const [mounted, setMounted] = useState(false)

  // Memoize time formatter
  const timeFormatter = useMemo(
    () => new Intl.DateTimeFormat('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    }),
    []
  )

  // Live time updates
  useEffect(() => {
    setMounted(true)
    setCurrentTime(new Date())

    const timer = setInterval(() => {
      setCurrentTime(new Date())
    }, 1000)

    return () => clearInterval(timer)
  }, [])

  const formatTime = (date: Date) => {
    if (!mounted || !date || date.getTime() === new Date(0).getTime()) {
      return '--:--:--'
    }
    return timeFormatter.format(date)
  }

  return <div className={className}>{formatTime(currentTime)}</div>
})

LiveClock.displayName = 'LiveClock'

export default LiveClock
