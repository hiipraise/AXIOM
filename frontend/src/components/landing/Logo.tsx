import { useState } from 'react'

export default function Logo() {
  const [imgError, setImgError] = useState(false)
  return (
    <div className="flex items-center gap-2">
      {!imgError && (
        <img
          src="/favicon.ico"
          alt=""
          className="h-7 w-7 object-contain"
          onError={() => setImgError(true)}
        />
      )}
      <span className="font-display font-bold text-xl tracking-tight text-ink">
        AXIOM
      </span>
    </div>
  )
}