# Pokemon Team Builder

This is a web app that lets you search for Pokemon and build a team of 6. It is built with vanilla JavaScript with the intention of practicing/learning working with APIs and front-end development.

## Tech Stack/Technologies Used:

* HTML
* CSS
* JavaScript
* PokeAPI (https://pokeapi.co/) A free Pokemon API
* [Google Fonts](https://fonts.google.com/) — Press Start 2P and VT323 for the pixel aesthetic
* [Pokemon Showdown](https)
 
## Features:

* Allows searching for any Pokemon by name or Pokedex number
* Allows user to view their Pokemons types, abilities, base stats with an animated style stat bar, and their sprite
* Random Pokemon button that picks from all available Pokemon
* Adds up to 6 Pokemon per team, making sure there are no duplicates to ensure well rounded teams
* Users Pokemon team is saved in localStorage so it stays on the page after refreshing
* Allows for the removal of Pokemon as well
* Team type-coverage chart that shows your teams net weaknesses, immunities, and resistances
    - A teams weaknesses are weeded out if another Pokemon on the user's team resists or is immune to it
    - Type data is cached to avoid redundant API calls
* Ability to export to Pokemon Showdown by turning the team into text that can be copied and then pasted into Pokemon Showdown to allow users to test out their teams
* Basic mobile responsiveness

## How To Use The App:

1. Type a Pokemons name into the search bar and press search or press the random button to get a surprise Pokemon
2. View their stats, abilities, and types on the search card
3. Click "Add to Team" to start building your team
4. Check the type-coverage chart at the bottom to see your team's net weaknesses, immunities, and resistances
5. Click "Export to Showdown" to copy your team to the clipboard and practice using it in real battles
5. Click "Remove" on any Pokemon card to remove them from your team

## What I learned:

* How to fetch data from a public API using async/await
* How to save and load data with localStorage
* DOM manipulation with JavaScript
* The debugging of cross-file errors between HTML, JavaScript, and CSS
* How to use data attributes to pass information to event listeners
* Working with JavaScript Sets to avoid duplicate entries

## Features I want to implement:

* Pokedex description for each Pokemon?
* Use the type weakness chart to recommend types of Pokemon that may synergize with the team?
* Creating an ability to share or export the team the user made in the web app?
* Have the stat bars change color depending on the stat amount (eg. low amount of stat - red, medium amount of stat - orange, high amount of stat - green)

**What Changed From the Last Version:
- Added the generation 4 styling to the web app
- Added the previous planned features - random button, stats, abilities, weakness chart
- Added Google Fonts to further customize and add to the "pixelated" aesthetic
- Further deepened my knowledge on JavaScript coding by getting real experience with APIs, slight mobile responsiveness, and keeping different files (HTML, CSS, and JavaScript) organized and functioning all together
- Kept the planned features option for future implementations

## Live Demo

👉 https://lviss-1.github.io/Pokemon-Team-Builder