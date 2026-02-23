const searchBtn = document.getElementById("searchBtn");
const pokemonInput = document.getElementById("pokemonInput");
const pokemonDisplay = document.getElementById("pokemonDisplay");
const teamContainer = document.getElementById("teamContainer");

let team = JSON.parse(localStorage.getItem("pokemonTeam")) || [];
let currentPokemon = null;

function saveTeam()
{
    localStorage.setItem("pokemonTeam", JSON.stringify(team));
}

function showMessage(message, isError = false)
{
    const message = document.createElement("p");
    message.textContent = message;
    message.className = isError ? "message error" : "message success";
    pokemonDisplay.prepend(message);
    setTimeout(() => message.remove(), 3000);
}

function capitalize(str)
{
    return str.charAt(0).toUpperCase() + str.slice(1);
}

function displayTeam() {
    if (team.length === 0) {
        teamContainer.innerHTML = `<p>Your team is empty. Add some Pokémon!</p>`;
        return;
    }
    teamContainer.innerHTML = team.map((pokemon, index) => `
        <div style="border: 1px solid #ccc; padding: 10px; margin: 5px 0;">
            <p><strong>${pokemon.name}</strong></p>
            <img src="${pokemon.image}" alt="${pokemon.name}" style="width: 100px;">
            <button onclick="removeFromTeam(${index})">Remove</button>
        </div>
    `).join("");
}

// Add to team
function addToTeam(pokemon) {
    if (team.length >= 6) {
        alert("Your team is full! (Maximum 6 Pokémon)");
        return;
    }
    team.push(pokemon);
    localStorage.setItem("pokemonTeam", JSON.stringify(team));
    displayTeam();
    alert(`${pokemon.name} added to your team!`);
}

// Remove from team
function removeFromTeam(index) {
    const removed = team[index];
    team.splice(index, 1);
    localStorage.setItem("pokemonTeam", JSON.stringify(team));
    displayTeam();
    alert(`${removed.name} removed from your team!`);
}

// Search functionality
searchBtn.addEventListener("click", async () => {
    const pokemonName = pokemonInput.value.toLowerCase().trim();
    if (!pokemonName) {
        pokemonDisplay.innerHTML = `<p>Please enter a Pokémon name.</p>`;
        return;
    }
    try {
        const response = await fetch(`https://pokeapi.co/api/v2/pokemon/${pokemonName}`);
        if (!response.ok) throw new Error("Not found");
        const data = await response.json();

        pokemonDisplay.innerHTML = `
            <h2>${data.name.toUpperCase()}</h2>
            <img src="${data.sprites.front_default}" alt="${data.name}">
            <button onclick="addToTeam({name: '${data.name}', image: '${data.sprites.front_default}'})">Add to Team</button>
        `;
        pokemonInput.value = "";
    } catch (error) {
        pokemonDisplay.innerHTML = `<p>Pokémon not found. Please try again.</p>`;
    }
});

// Display team on page load
displayTeam();