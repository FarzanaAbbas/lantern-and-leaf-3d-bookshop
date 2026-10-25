// Store layout + procedurally generated (but stable) book catalogue.

export const SECTION_LEN = 6
export const FIRST_Z = -4 // z where the first section's sign hangs
export const CAMERA_START_Z = 3
export const CHECKOUT_Z = -43

export const sectionStartZ = (i) => FIRST_Z - i * SECTION_LEN
// rail position (t) that frames a section nicely: camera just before its sign
export const sectionT = (i) => CAMERA_START_Z - (sectionStartZ(i) + 1)
export const END_T = CAMERA_START_Z - (CHECKOUT_Z + 2.2)

export const SECTIONS = [
  {
    id: 'new',
    name: 'New Arrivals',
    sub: 'Fresh off the press',
    palette: ['#e3a33b', '#d9534f', '#2f6f8f', '#f2e8cf', '#3f7d58', '#8c3b5e', '#1f2d3a', '#e86a33'],
    words: {
      adj: ['Bright', 'Restless', 'Open', 'Golden', 'Quiet', 'Electric', 'Late', 'Small'],
      noun: ['Hours', 'Summer', 'Weather', 'Rooms', 'Signals', 'Harbour', 'Orchard', 'Machines'],
    },
    blurb: 'The book everyone at the counter has been talking about this month.',
  },
  {
    id: 'fiction',
    name: 'Fiction',
    sub: 'Stories that stay with you',
    palette: ['#7a1f2b', '#1f3a5f', '#efe3c8', '#2e4a35', '#a35c2c', '#4b3b5c', '#c9a227', '#3b2a22'],
    words: {
      adj: ['Salt', 'Borrowed', 'Lost', 'Last', 'Hollow', 'Paper', 'Winter', 'Distant'],
      noun: ['Daughters', 'River', 'Garden', 'Letters', 'Lantern', 'House', 'Season', 'Shore'],
    },
    blurb: 'A sweeping, tender novel about family, distance and the stories we inherit.',
  },
  {
    id: 'mystery',
    name: 'Mystery & Thriller',
    sub: 'Lock the door first',
    palette: ['#141414', '#8b0e12', '#2b2b2b', '#c8a03a', '#3a3f44', '#5c0f14', '#e6e1d6', '#1d2b33'],
    words: {
      adj: ['Silent', 'Midnight', 'Crooked', 'Cold', 'Seventh', 'Broken', 'Hidden', 'Narrow'],
      noun: ['Witness', 'Alibi', 'Staircase', 'Ledger', 'Platform', 'Key', 'Verdict', 'Lake'],
    },
    blurb: 'One missing ledger, three suspects and a detective who never sleeps.',
  },
  {
    id: 'scifi',
    name: 'Science Fiction',
    sub: 'Tomorrow, today',
    palette: ['#0e7c86', '#4b2a8a', '#1747c9', '#c0c6cf', '#0b1a2e', '#ff6b35', '#25b59a', '#6c2bd9'],
    words: {
      adj: ['Orbital', 'Hollow', 'Quantum', 'Red', 'Infinite', 'Second', 'Drifting', 'Neon'],
      noun: ['Stars', 'Colony', 'Engine', 'Archive', 'Signal', 'Moons', 'Frontier', 'Atlas'],
    },
    blurb: 'A generation ship, a failing AI and the last message from Earth.',
  },
  {
    id: 'poetry',
    name: 'Poetry & Essays',
    sub: 'Read slowly',
    palette: ['#f4c7c3', '#c7d8c6', '#f6e7b4', '#b9c9e6', '#e8d5c4', '#d6c2e3', '#9fb8ad', '#f2d0a4'],
    words: {
      adj: ['Soft', 'Blue', 'Tender', 'Small', 'Morning', 'Wild', 'Unfinished', 'Gentle'],
      noun: ['Weather', 'Prayers', 'Notes', 'Rain', 'Birds', 'Hands', 'Psalms', 'Light'],
    },
    blurb: 'Short poems and essays on rain, cities and the people we keep.',
  },
  {
    id: 'kids',
    name: "Children's",
    sub: 'Big adventures, small readers',
    palette: ['#ff595e', '#ffca3a', '#8ac926', '#1982c4', '#6a4c93', '#ff924c', '#52a675', '#f15bb5'],
    words: {
      adj: ['Brave', 'Tiny', 'Sleepy', 'Giant', 'Magic', 'Funny', 'Busy', 'Lucky'],
      noun: ['Dragon', 'Penguin', 'Rocket', 'Bear', 'Kite', 'Robot', 'Tiger', 'Moon'],
    },
    blurb: 'A bedtime favourite full of bright pictures and a very brave little hero.',
  },
]

// stable PRNG
export function rng(seed) {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}
const pick = (r, arr) => arr[Math.floor(r() * arr.length)]

export const SHELF_TOPS = [0.13, 0.58, 1.03, 1.48, 1.93]
export const UNIT_W = 2.4

// Physical layout of every book in one shelving unit.
export function unitBooks(sectionIdx, unitIdx) {
  const r = rng(1000 + sectionIdx * 97 + unitIdx * 13)
  const { palette } = SECTIONS[sectionIdx]
  const kids = SECTIONS[sectionIdx].id === 'kids'
  const books = []
  for (const top of SHELF_TOPS) {
    let x = -UNIT_W / 2 + 0.08
    while (true) {
      const w = kids ? 0.03 + r() * 0.05 : 0.035 + r() * 0.05
      if (x + w > UNIT_W / 2 - 0.08) break
      if (r() < 0.03) {
        x += 0.06 + r() * 0.08 // a gap where someone took a book
        continue
      }
      const h = kids ? 0.24 + r() * 0.14 : 0.25 + r() * 0.1
      const d = 0.22 + r() * 0.08
      books.push({
        x: x + w / 2,
        y: top + h / 2,
        z: 0.18 - d / 2 - r() * 0.015,
        w,
        h,
        d,
        color: pick(r, palette),
        band: r() < 0.45 ? (r() < 0.6 ? '#d8b25a' : '#f1ead8') : null,
      })
      x += w + 0.002
    }
  }
  return books
}

const FIRST = ['Amara', 'Ilan', 'Noor', 'Theo', 'Maya', 'Kabir', 'Elena', 'Rafi', 'Iris', 'Jonah', 'Leila', 'Sana', 'Oskar', 'Priya', 'Mateo', 'Hana']
const LAST = ['Ashby', 'Mehta', 'Okafor', 'Lindqvist', 'Rao', 'Delacroix', 'Haddad', 'Moreau', 'Kapoor', 'Whitlock', 'Ferreira', 'Sato', 'Bianchi', 'Nair', 'Holloway', 'Quinn']

// Shop-facing details for a single book, derived from where it sits.
export function bookInfo(sectionIdx, unitIdx, idx) {
  const s = SECTIONS[sectionIdx]
  const r = rng(sectionIdx * 100003 + unitIdx * 1009 + idx * 7 + 11)
  const adj = pick(r, s.words.adj)
  const noun = pick(r, s.words.noun)
  const templates = [
    `The ${adj} ${noun}`,
    `${adj} ${noun}`,
    `A ${noun} of ${pick(r, s.words.noun)}`,
    `${noun} & ${pick(r, s.words.noun)}`,
    `The ${noun} Keeper`,
  ]
  const title = pick(r, templates)
  return {
    key: `${sectionIdx}-${unitIdx}-${idx}`,
    title,
    author: `${pick(r, FIRST)} ${pick(r, LAST)}`,
    section: s.name,
    price: 299 + Math.floor(r() * 12) * 50,
    rating: Math.round((3.8 + r() * 1.2) * 10) / 10,
    pages: 120 + Math.floor(r() * 380),
    blurb: s.blurb,
  }
}
