"use client"
import React from 'react'

const ProgressBar = ({ value = 0, goal = 100, height = 12, className = '' }) => {
  const pct = Math.max(0, Math.min(100, Math.round((value / (goal || 1)) * 100)))
  return (
    <div className={className} style={{ width: '100%' }}>
      <div style={{ background: '#e6e6e6', borderRadius: 9999, height, overflow: 'hidden' }}>
        <div
          style={{
            width: `${pct}%`,
            height: '100%',
            background: 'linear-gradient(90deg,#6ee7b7,#3b82f6)',
            transition: 'width 400ms ease',
          }}
        />
      </div>
      <div style={{ fontSize: 12, marginTop: 6, color: '#374151' }}>{pct}% of goal</div>
    </div>
  )
}

export default ProgressBar
