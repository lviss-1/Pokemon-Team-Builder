# Pokémon Team Builder

Build a Pokémon team, see its real weaknesses, and check it against the current competitive meta — in one tool.

<img width="1470" height="956" alt="Screenshot 2026-08-24 at 4 14 22 PM" src="https://github.com/user-attachments/assets/cdba69c7-3210-474c-af7e-c00bf6f90b96" />


**[Live demo →](https://lviss-1.github.io/Pokemon-Team-Builder)**

## The problem

Planning a competitive Pokémon team means juggling three separate concerns — type coverage, team synergy, and the current meta — and no single free tool let you check all three cleanly. So I built one, and used it to learn how to work with a real external REST API in the process.

## Technical highlights

**Net type coverage, not raw type coverage.** The hard part of this project wasn't listing each Pokémon's weaknesses — it's computing what the *team* is actually weak to. If one teammate resists or is immune to a type another is weak to, that weakness doesn't matter at the team level. The coverage chart multiplies every attacking type against each member's types using a local 18×18 effectiveness chart, adjusts for the member's selected ability (Levitate, Flash Fire, Wonder Guard, Filter, and others), and highlights the types where more members are weak than resistant.

**Meta-aware, not just type-aware.** A team can have perfect type coverage and still lose to the current metagame. The team gets checked against the top 8 current Smogon OU threats (a structured, maintained dataset) and flags where the team has no answer.

**A Pokédex that doesn't choke the page.** All 1,025 Pokémon are fetched with `async/await` + `Promise.all()` in parallel batches of 250, with a live progress indicator — so the page stays responsive instead of blocking on a thousand sequential requests. Fetched Pokédex data is cached in `localStorage` (with `CACHE HIT` / `CACHE MISS` console logging) to skip redundant network calls on repeat visits.

**Persistence without a backend.** Team state survives page refreshes via `localStorage` — no account, no database, no server round-trip.

## Stack

![JavaScript](https://img.shields.io/badge/JavaScript-F7DF1E?style=flat-square&logo=javascript&logoColor=black)
![HTML5](https://img.shields.io/badge/HTML5-E34F26?style=flat-square&logo=html5&logoColor=white)
![CSS3](https://img.shields.io/badge/CSS3-1572B6?style=flat-square&logo=css3&logoColor=white)
![PokeAPI](https://img.shields.io/badge/PokeAPI-REST-red?style=flat-square)

No frameworks — vanilla JS, DOM built with small `createElement` helpers, data attributes for sortable columns. Deployed as a static site on GitHub Pages and Vercel.

## Run it locally

```
git clone this repo
cd pokemon-team-builder
open index.html
```
No build step — it's a static site that talks directly to PokeAPI.
