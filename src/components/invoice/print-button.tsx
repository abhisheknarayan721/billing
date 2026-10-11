'use client'

import React from 'react'

const PrintButton = ({ label = 'Print bill' }: { label?: string }) => {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="btn-primary"
    >
      {label}
    </button>
  )
}

export default PrintButton
