# Pokémon Team Builder

Build a Pokémon team, see its real weaknesses, and check it against the current competitive meta — in one tool.

<img width="1470" height="956" alt="Screenshot 2026-08-24 at 4 14 22 PM" src="https://github.com/user-attachments/assets/cdba69c7-3210-474c-af7e-c00bf6f90b96" />


**[Live demo →](https://lviss-1.github.io/Pokemon-Team-Builder)**

## The problem

Planning a competitive Pokémon team means juggling three separate concerns — type coverage, team synergy, and the current meta — and no single free tool let you check all three cleanly. So I built one, and used it to learn how to work with a real external REST API in the process.

## Technical highlights

**Net type coverage, not raw type coverage.** The hard part of this project wasn't listing each Pokémon's weaknesses — it's computing what the *team* is actually weak to. If one teammate resists or is immune to a type another is weak to, that weakness doesn't matter at the team level. The engine pulls per-type `damage_relations` from PokeAPI and reduces them with JavaScript `Set` operations (union, difference) into the team's real net weaknesses, resistances, and immunities.

**Meta-aware, not just type-aware.** A team can have perfect type coverage and still lose to the current metagame. The team gets checked against the top 8 current Smogon OU threats (a structured, maintained dataset) and flags where the team has no answer.

**A Pokédex that doesn't choke the page.** All 1,025 Pokémon are fetched with `async/await` + `Promise.all()` in parallel batches of 250, with a live progress indicator — so the page stays responsive instead of blocking on a thousand sequential requests. Fetched Pokédex data is cached in `localStorage` (with `CACHE HIT` / `CACHE MISS` console logging) to skip redundant network calls on repeat visits.

**Persistence without a backend.** Team state survives page refreshes via `localStorage` — no account, no database, no server round-trip.

## Stack

![JavaScript](https://img.shields.io/badge/JavaScript-F7DF1E?style=flat-square&logo=javascript&logoColor=black)
![HTML5](https://img.shields.io/badge/HTML5-E34F26?style=flat-square&logo=html5&logoColor=white)
![CSS3](https://img.shields.io/badge/CSS3-1572B6?style=flat-square&logo=css3&logoColor=white)
![PokeAPI](https://img.shields.io/badge/PokeAPI-REST-red?style=flat-square)

No frameworks — vanilla JS, DOM manipulation with template literals, data attributes for event wiring. Deployed as a static site on GitHub Pages and Vercel.

## Known limitations

Being upfront about the current state, since it's checkable by anyone who opens the code:

- **Type-effectiveness data isn't cached.** Only the Pokédex roster uses `localStorage` caching — `displayWeaknessChart()` currently re-fetches `/type/{type}` from PokeAPI on every render. A `typeCache` variable exists but isn't wired up yet.
- **Showdown export produces invalid output.** `generateShowdownText()` currently emits stat lines like `- Hp: 78`, but Showdown's paste format reads any line starting with `-` as a *move*, so the output won't import. It works as a plain clipboard copy today, not a real Showdown export — fixing this means switching to EVs/IVs/nature/moveset format.

Both are on the list to fix.

## Run it locally

```
git clone this repo
cd pokemon-team-builder
open index.html
```
No build step — it's a static site that talks directly to PokeAPI.
