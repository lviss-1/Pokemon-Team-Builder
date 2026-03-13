# Pokemon Team Builder

This is a web app that lets you search for Pokemon and build a team of 6. It is built with vanilla JavaScript with the intention of practicing/learning working with APIs and front-end development.

## Tech Stack/Technologies Used:

* HTML
* CSS
* JavaScript
* [PokeAPI](https://pokeapi.co/) - A free Pokemon API
* [Google Fonts](https://fonts.google.com/) — Press Start 2P and VT323 for the pixel aesthetic
* [Pokemon Showdown](https://pokemonshowdown.com/) - Export format
 
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
5. Click the "
5. Click "Export to Showdown" to copy your team to the clipboard and practice using it in real battles
5. Click "Remove" on any Pokemon card to remove them from your team

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

## Features I want to implement:

* Pokedex description for each Pokemon?
* Use the type weakness chart to recommend types of Pokemon that may synergize with the team?
* Give user the ability to configure a Pokemons move set, ability, nature, or held item to add more build variety to export to showdown?
* Allow user the ability to scroll through the Pokedex to find a certain Pokemon they do not know the name/Pokedex num of

**What Changed From the Last Version:
- Added a type-coverage chart that actually reflects the type weaknesses, immunities, and resistances of a team rather than just stacking all of the Pokemons weaknesses into a list
- Added the export Pokemon to Pokemon Showdown
- Added color coded stat bars to feature whether a Pokemon is strong/weak in certain stats
- Expanded what I learned with caching, and clipboard API
- Added different planned/wanted features

## Live Demo

👉 https://lviss-1.github.io/Pokemon-Team-Builder