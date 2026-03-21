import { useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import clsx from 'clsx'

const SEQUENCE = ['A', 'X', 'I', 'O', 'M', 'AXIOM']
const LETTER_MS = 500
const FULL_MS = 1600

export default function SpellingWord({
  className,
  widthClassName = 'w-[3.2ch]',
}: {
  className?: string
  widthClassName?: string
}) {
  const [index, setIndex] = useState(0)

  useEffect(() => {
    const isLast = index === SEQUENCE.length - 1
    const timeout = window.setTimeout(
      () => setIndex((current) => (current + 1) % SEQUENCE.length),
      isLast ? FULL_MS : LETTER_MS,
    )

    return () => window.clearTimeout(timeout)
  }, [index])

  return (
    <span className={clsx('inline-flex justify-center overflow-hidden', widthClassName, className)}>
      <AnimatePresence mode="wait">
        <motion.span
          key={SEQUENCE[index]}
          initial={{ opacity: 0, y: 3 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -3 }}
          transition={{ duration: 0.18, ease: 'easeInOut' }}
          className="inline-block"
        >
          {SEQUENCE[index]}
        </motion.span>
      </AnimatePresence>
    </span>
  )
}
