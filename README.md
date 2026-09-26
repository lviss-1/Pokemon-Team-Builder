# Pokemon Team Builder

I've been a Pokemon fan since I was a kid. Gen 5 is what got me started, but Gen 4 — specifically Platinum — is what turned me into the Pokemon lover I am today. Something about the artwork and aesthetic of that era just hit different, and it's never really left me.

This project started because I wanted to plan out a team for a Renegade Platinum run (a difficulty romhack of Platinum, highly recommend). I was trying to figure out what my team looked like on paper, how it held up type-wise, and whether it could realistically handle tough fights — and I couldn't find a single place that did all of that cleanly. So I built one.

Along the way it grew into something I actually want competitive players to use. I follow the competitive scene more as a spectator than a player, but I always found myself wondering: *if I built this team, how would it actually hold up against what people are running right now?* The meta threat scanner came from that question — I hadn't seen anything like it anywhere else, and it felt like the kind of tool that would genuinely save time when you're trying out different team compositions.

This was also my first major project I built fully on my own, with the goal of learning how to work with RESTful APIs. The type coverage chart was by far the hardest thing to figure out — pulling and processing type effectiveness data from the API, caching it properly, and making the net weaknesses actually meaningful took a lot of trial and error. I'm proud of how it came out.

The aesthetic was intentional from the start. The Gen 4 games have some of the best visual identity in the series and I wanted this to feel like it lived in that world — the pixel fonts, the DS-style panel borders, the color scheme. If you open this and immediately feel like you're looking at something from that era, that's the goal.

---

## Live Demo

👉 https://lviss-1.github.io/Pokemon-Team-Builder

---

## What It Does

### Team Builder
- Search any Pokemon by name or Pokedex number
- Random button pulls from all 1025 available Pokemon
- View sprite, types, abilities, and base stats with color-coded animated stat bars
- Add up to 6 unique Pokemon to your team
- Team is saved to localStorage so it persists across page refreshes

### Type Coverage Chart
- Shows your team's net weaknesses, resistances, and immunities
- Weaknesses are filtered out if any team member resists or is immune to that type — so you see your *actual* vulnerabilities, not just raw ones
- Type data is cached to avoid redundant API calls

### Meta Threat Scanner
- Checks your team against the top 8 current competitive threats in the Smogon OU tier
- Shows each threat's sprite, types, and why they're dangerous in the current meta
- Green border = your team has coverage. Red border = you're exposed.
- The fastest way I know to spot holes in a team before you commit to it

### Export to Pokemon Showdown
- One button copies your full team to clipboard in Showdown format
- Button turns green and says "Copied!" for 2 seconds so you know it worked

### Pokedex
- All 1025 Pokemon in a searchable, sortable table
- Loads in batches of 250 with a live progress indicator
- Sort by any stat column, ascending or descending
- Real-time name filtering as you type
- Add directly to your team from the table without having to search separately
- Sticky header so you don't lose track of columns while scrolling

---

## How To Use It

1. Type a Pokemon name or number and press Search (or hit Enter)
2. Or hit Random for a surprise pick
3. View their stats, types, and abilities on the card
4. Click "Add to Team" to add them
5. Check the type coverage chart to see your team's net weaknesses, resistances, and immunities
6. Click "Scan for Meta Threats" to see how your team stacks up against current top threats
7. Click "Export to Showdown" to copy your team to clipboard in Showdown format
8. Use the Pokedex table to browse all 1025 Pokemon and add them directly to your team
9. Click "Remove" on any team card to drop them

---

## Tech Stack

- HTML, CSS, Vanilla JavaScript — no frameworks
- [PokeAPI](https://pokeapi.co/) — free Pokemon API powering all the data
- [Google Fonts](https://fonts.google.com/) — Press Start 2P and VT323 for the pixel aesthetic
- [Pokemon Showdown](https://pokemonshowdown.com/) — export format

---

## What I Learned Building This

- Fetching and processing data from a public REST API using async/await
- Caching API responses to cut down on redundant network requests
- Working with type effectiveness data and building net coverage logic from scratch
- Batch loading large datasets with progress feedback so the page doesn't choke
- Using Promise.all() to fetch multiple resources in parallel
- Building searchable and sortable tables in Vanilla JavaScript
- Persisting state with localStorage
- DOM manipulation and dynamic HTML templating with template literals
- The navigator clipboard API for copy-to-clipboard functionality
- Using JavaScript Sets to handle deduplication
- Using data attributes to pass information through event listeners
- Deploying a static site with GitHub Pages

---

## What's Next

- Pokedex entries / flavor text for each Pokemon
- Type-based recommendations — use the weakness chart to suggest what types would fill gaps on the team
- Move set, ability, nature, and held item configuration for a fuller Showdown export
- Filter the Pokedex by type
