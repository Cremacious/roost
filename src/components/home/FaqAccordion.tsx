'use client'

import { useState } from 'react'

const ITEMS = [
  {
    q: 'Is Roost actually free?',
    a: "Yep. Most features are completely free, forever. Premium is $4/month and unlocks receipt scanning, spending insights, rich text notes, and more. One subscription covers every member of your household. Think of it as buying the solo dev behind this a coffee — except the coffee comes with perks.",
  },
  {
    q: 'How do child accounts work?',
    a: "Kids can log in with a simple custom PIN from the household code screen — no email required. During onboarding you create your household and invite members. Kids get their own experience: chores, rewards, and the stuff they need. Admins control exactly what each member can see and do.",
  },
  {
    q: "What's the deal with ads?",
    a: "Roost is a free app built by a solo developer. Ads on the free tier help keep the lights on. They're not aggressive — no pop-ups, no video ads, nothing sketchy. Premium ($4/month) removes them entirely. As a bonus you also get receipt scanning and extra features.",
  },
  {
    q: 'Can I control what my kids see?',
    a: "Absolutely. As the admin you can toggle every feature on or off individually for each member. Don't want kids adding expenses? Toggle it off. Want them on chores only? Done. Changes take effect immediately.",
  },
  {
    q: 'Does Roost work on desktop and mobile?',
    a: "Roost is available as a web app that works great on any browser, desktop or mobile. Native iOS and Android apps with push notifications are coming after the web launch.",
  },
  {
    q: 'How does receipt scanning work?',
    a: "Snap a photo of any receipt. Roost reads the line items automatically and lets you split them however you want — equally, by item, or custom amounts. It's a Premium feature.",
  },
  {
    q: 'Is this just for families?',
    a: "Nope. Roost works for roommates, couples, families — anyone sharing a home. If you split bills, share groceries, or argue about whose turn it is to clean the bathroom, Roost is for you.",
  },
]

export default function FaqAccordion() {
  const [open, setOpen] = useState<number | null>(null)

  return (
    <div className="faq-list">
      {ITEMS.map((item, i) => (
        <div key={i} className={`faq-item${open === i ? ' open' : ''}`}>
          <button
            className="faq-q"
            type="button"
            onClick={() => setOpen(open === i ? null : i)}
          >
            {item.q}
          </button>
          <div className="faq-a">
            <p>{item.a}</p>
          </div>
        </div>
      ))}
    </div>
  )
}
