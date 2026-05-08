'use client'

import { useEffect } from 'react'

// Wires up IntersectionObserver for all reveal/reveal-left/reveal-right/reveal-pop
// elements on the homepage. Renders nothing — purely behavioral.
export default function HomepageAnimations() {
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('visible')
          }
        })
      },
      { threshold: 0.15, rootMargin: '0px 0px -40px 0px' }
    )

    const targets = document.querySelectorAll('.reveal, .reveal-left, .reveal-right, .reveal-pop')
    targets.forEach((el) => observer.observe(el))

    return () => observer.disconnect()
  }, [])

  return null
}
