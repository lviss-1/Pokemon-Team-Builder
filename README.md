# Pokemon Team Builder

This is a web app that lets you search for Pokemon and build a team of 6. It is built with vanilla JavaScript with the intention of practicing/learning working with APIs and front-end development.

## Live Demo

👉 https://lviss-1.github.io/Pokemon-Team-Builder
 
## Features

### Team Builder
- Search for any Pokemon by name or Pokedex number
- View their sprite, types, abilities, and base stats with color coded animated stat bars
- Random Pokemon button that picks randomly from the 1025 available Pokemon
- Add up to 6 unique Pokemon to your team
- Team is saved in localStorage so it stays on the page even after refreshing

### Type Coverage Chart
- Shows the teams net weaknesses, immunities, and resistances
- Weaknesses are filtered out if there is a Pokemon on the team that either resists or is immune to said type of weakness
- Type data is cached to avoid redundant API calls and reduce the loading times of the page

### Exporting to Pokemon Showdown
- Copies the full team to the clipboard in Pokemon Showdown format after pressing the "Export to Showdown" button
- The button changes to "Copied" with a green success state for 2 seconds after copying

### Meta Threat Scanner
- Scans your current team and compares them agains the top 8 current competitive threats in the Pokemon competitive scene after pressing the "Scan for Meta Threats" button
- Shows the threats' types, sprites, their reason for being a threat, and whether or not your team covers them or not (whether your team has Pokemon that have strengths against said threats' types)
- Shows a green border for the threats that are covered and a red border for those that are not

### Pokedex
- Searchable and sortable table of all 1025 Pokemon
- Loads Pokemon in batches of 250 with a live progress indicator so the page does not get overwhelmed by too many API calls
- Table contains columns that shows all Pokemons sprite, name, type badges, and base stats
- User can click the column header to sort ascending or descending with arrow indicators to show what type
- Real-time search filtering by name as the user types
- Contains "Add" button that allows the user to add the Pokemon straight to their team from the Pokedex
- The "Add" button changes to "Added" to show whether a Pokemon has been added to the team
- Has a sticky header that stays visible while scrolling through the Pokedex

### General
- Pokemon generation 4 game inspired styling (my favorite generation of games and game design)
- Nintendo DS style panel borders and hard shadows throughout
- Color coded stat bars - Green for high, yellow for medium, and red for low stats
- Basic mobile responsiveness

## How To Use The App:

1. Type a Pokémon name or number into the search bar and press Search or hit Enter
2. Or press the Random button to get a surprise Pokémon
3. View their stats, abilities, and types on the search card
4. Click "Add to Team" to add them to your team
5. Check the type coverage chart to see your team's net weaknesses, resistances, and immunities
6. Click "Export to Showdown" to copy your team to clipboard in Pokémon Showdown format
7. Click "Scan for Meta Threats" to check your team against current competitive threats
8. Use the Pokédex table to browse, search, and sort all 1025 Pokémon and add them directly to your team
9. Click "Remove" on any team card to remove them

## Tech Stack/Technologies Used:

* HTML
* CSS
* JavaScript
* [PokeAPI](https://pokeapi.co/) - A free Pokemon API
* [Google Fonts](https://fonts.google.com/) — Press Start 2P and VT323 for the pixel aesthetic
* [Pokemon Showdown](https://pokemonshowdown.com/) - Export format

## What I learned:

* How to fetch data from a public API using async/await
* How to save and load data with localStorage
* DOM manipulation with JavaScript
* The debugging of cross-file errors between HTML, JavaScript, and CSS
* CSS Flexbox for layouts
* CSS transitions and animations for stat bars
* Caching API responses to reduce redundant network requests
* Using the navigator clipboard API for copy to clipboard funcionality
* How to use data attributes to pass information to event listeners
* Working with JavaScript Sets to avoid duplicate entries
* Caching API responses to reduce redundant network requests
* Batch loading API data with progress feedback for better user experience
* Using Promise.all() to fetch multiple resources in parallel
* Using the navigator clipboard API to copy to clipboard functionality
* Building searchable and sortable tables in Vanilla JavaScript
* Deploying a site with Vercel

## Features I want to implement:

* Pokedex description for each Pokemon?
* Use the type weakness chart to recommend types of Pokemon that may synergize with the team?
* Give user the ability to configure a Pokemons move set, ability, nature, or held item to add more build variety to export to showdown?
* Filter Pokedex by type?

**What Changed From the Last Version:
- Added the Pokedex feature that is searchable and sortable
- The Pokedex feature gives fans or new users who may not be familiar with many Pokemon the ability to look at all their options