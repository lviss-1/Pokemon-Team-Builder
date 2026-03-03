const searchBtn = document.getElementById("searchBtn");
const randomBtn = document.getElementById("randomBtn");
const weaknessChart = document.getElementById("weaknessChart");
const pokemonInput = document.getElementById("pokemonInput");
const pokemonDisplay = document.getElementById("pokemonDisplay");
const teamContainer = document.getElementById("teamContainer");

let team = JSON.parse(localStorage.getItem("pokemonTeam")) || [];
let currentPokemon = null;

const AMOUNT_OF_POKEMON = 1025;

function saveTeam()
{
    localStorage.setItem("pokemonTeam", JSON.stringify(team));
}

function showMessage(message, isError = false)
{
    const msg = document.createElement("p");
    msg.textContent = message;
    msg.className = isError ? "message error" : "message success";
    pokemonDisplay.prepend(msg);
    setTimeout(() => msg.remove(), 3000);
}

function capitalize(str)
{
    return str.charAt(0).toUpperCase() + str.slice(1);
}

async function displayWeaknessChart()
{
    if (team.length === 0)
    {
        weaknessChart.innerHTML = `<p class="emptyMessage">Add Pokémon to your team to see type weaknesses!</p>`;
        return;
    }

    weaknessChart.innerHTML = `<p class="message">Loading type data...</p>`;

    const weaknesses = {};
    const resistances = {};
    const immunes = {};

    try
    {
        for (const pokemon of team)
        {
            for (const type of pokemon.types)
            {
                const response = await fetch(`https://pokeapi.co/api/v2/type/${type}`);
                const data = await response.json();

                data.damage_relations.double_damage_from.forEach(t => {weaknesses[t.name] = (weaknesses[t.name] || 0) + 1;});
                data.damage_relations.half_damage_from.forEach(t => {resistances[t.name] = (resistances[t.name] || 0) + 1;});
                data.damage_relations.no_damage_from.forEach(t => {immunes[t.name] = (immunes[t.name] || 0) + 1;});
            }
        }

        const weaknessList = Object.keys(weaknesses);
        const resistanceList = Object.keys(resistances).filter(type => {return resistances[type] === team.length;});
        const immuneList = Object.keys(immunes).filter(type => {return immunes[type] === team.length;});

        function buildBadgeList(typeArray)
        {
            if (typeArray.length === 0)
                {
                    return `<p class="emptyMessage">None</p>`;
                }
            return typeArray.map(t => `<span class="typeBadge type-${t}">${capitalize(t)}</span>`).join("");
        }

        weaknessChart.innerHTML = `
        <div class="chartPanel">
            <h3 class="chartTitle">Team Type Coverage</h3>
            <div class="chartColumns">
                <div class="chartColumn">
                    <p class="chartLabel weakLabel">Weak To</p>
                    <div class="chartBadges">${buildBadgeList(weaknessList)}</div>
                </div>
                <div class="chartColumn">
                    <p class="chartLabel resistLabel">Resists</p>
                    <div class="chartBadges">${buildBadgeList(resistanceList)}</div>
                </div>
                <div class="chartColumn">
                    <p class="chartLabel immuneLabel">Immune To</p>
                    <div class="chartBadges">${buildBadgeList(immuneList)}</div>
                </div>
            </div>
        </div>
        `;
    } catch (error)
    {
        weaknessChart.innerHTML = `<p class="message error">Failed to load type data. Please try again later.</p>`;
    }
}

function displayTeam()
{
    if (team.length === 0)
    {
        teamContainer.innerHTML = `<p class="emptyMessage">Your team is empty. Search for a Pokémon and add it to your team!</p>`;
        return;
    }

    teamContainer.innerHTML = "";

    team.forEach((pokemon, index) => {
        const card = document.createElement("div");
        card.className = "teamCard";

        const typeBadges = (pokemon.types || []).map(t => `<span class="typeBadge type-${t}">${capitalize(t)}</span>`).join("");

        const statBars = (pokemon.stats || []).map(s => `
            <div class="statRow">
                <span class="statLabel">${s.name}</span>
                <div class="statBarBg">
                    <div class="statBarFill" style="width: ${Math.min(s.value / 255 * 100, 100)}%"></div>
                </div>
                <span class="statValue">${s.value}</span>
            </div>
        `).join("");

        const abilities = (pokemon.abilities || []).map(a => capitalize(a)).join(" / ");

        card.innerHTML = `<img src="${pokemon.image}" alt="${pokemon.name}"/>
            <p class="pokemon-name">${capitalize(pokemon.name)}</p>
            <div class="type-container">${typeBadges}</div>
            <p class="ability-text">Ability: ${abilities}</p>
            <div class="statBlock">${statBars}</div>
            <button class="remove-btn" data-index="${index}">Remove</button>`;

        teamContainer.appendChild(card);
    });

    document.querySelectorAll(".remove-btn").forEach(btn => {
        btn.addEventListener("click", (e) => {
            const index = parseInt(e.target.dataset.index);
            removeFromTeam(index);
        });
    });

    displayWeaknessChart();
}

function addToTeam()
{
    if (!currentPokemon) return;

    if (team.length >= 6)
    {
        showMessage("Your team is full! (Maximum 6 Pokémon)", true);
        return;
    }

    const alreadyOnTeam = team.some(p => p.name === currentPokemon.name);
    if (alreadyOnTeam)
    {
        showMessage(`${capitalize(currentPokemon.name)} is already on your team!`, true);
        return;
    }

    team.push(currentPokemon);
    saveTeam();
    displayTeam();
    showMessage(`${capitalize(currentPokemon.name)} added to your team!`);
}

function removeFromTeam(index)
{
    const removedPokemon = team[index];
    team.splice(index, 1);
    saveTeam();
    displayTeam();
    showMessage(`${capitalize(removedPokemon.name)} removed from your team.`);
}

async function searchPokemon()
{
    const pokemonName = pokemonInput.value.toLowerCase().trim();

    if (!pokemonName)
    {
        pokemonDisplay.innerHTML = `<p class="message error">Please enter a Pokémon name.</p>`;
        return;
    }

    pokemonDisplay.innerHTML = `<p class="message">Searching...</p>`;

    try
    {
        const response = await fetch(`https://pokeapi.co/api/v2/pokemon/${pokemonName}`);
        if (!response.ok) throw new Error("Not found");
        const data = await response.json();

        const stats = data.stats.map(s => ({ name: s.stat.name, value: s.base_stat }));
        const abilities = data.abilities.map(a => a.ability.name.replace("-", " "));

        currentPokemon = {
            name: data.name,
            image: data.sprites.front_default,
            types: data.types.map(t => t.type.name),
            stats: stats,
            abilities: abilities
        };

        const statBars = currentPokemon.stats.map(s => `
        <div class="statRow">
            <span class="statLabel">${s.name}</span>
            <div class="statBarBg">
                <div class="statBarFill" style="width: ${Math.min(s.value / 255 * 100, 100)}%"></div>
            </div>
            <span class="statValue">${s.value}</span>
        </div>
        `).join("");

        const abilitiesDisplay = currentPokemon.abilities.map(a => capitalize(a)).join(" / ");
        const typeBadges = currentPokemon.types.map(t => `<span class="typeBadge type-${t}">${capitalize(t)}</span>`).join("");
        pokemonDisplay.innerHTML = `
            <div class="pokemonCard">
                <h2>${capitalize(currentPokemon.name)}</h2>
                <img src="${currentPokemon.image}" alt="${currentPokemon.name}">
                <div class="typeContainer">${typeBadges}</div>
                <p class="ability-text">Ability: ${abilitiesDisplay}</p>
                <div class="statBlock">${statBars}</div>
                <button id="addBtn">Add to Team</button>
            </div>
        `;

        document.getElementById("addBtn").addEventListener("click", addToTeam);
        pokemonInput.value = "";
    } 
    catch (error)
    {
        currentPokemon = null;
        pokemonDisplay.innerHTML = `<p class="messageError">Pokémon not found. Please try again.</p>`;
    }
}

async function randomPokemon()
{
    const randomId = Math.floor(Math.random() * AMOUNT_OF_POKEMON) + 1;
    pokemonInput.value = "";
    pokemonDisplay.innerHTML = `<p class="message">Getting a random Pokémon...</p>`;
    try {
        const response = await fetch(`https://pokeapi.co/api/v2/pokemon/${randomId}`);
        if (!response.ok) throw new Error("Not found");
        const data = await response.json();

        const stats = data.stats.map(a => ({
            name: a.stat.name,
            value: a.base_stat
        }));
        const abilities = data.abilities.map(a => a.ability.name.replace("-", " "));

        currentPokemon = {
            name: data.name,
            image: data.sprites.front_default,
            types: data.types.map(t => t.type.name),
            stats: stats,
            abilities: abilities
        };

        const typeBadges = currentPokemon.types.map(t => `<span class="typeBadge type-${t}">${capitalize(t)}</span>`).join("");
        const statsBars = currentPokemon.stats.map(s => `
            <div class="statRow">
                <span class="statLabel">${s.name}</span>
                <div class="statBarBg">
                    <div class="statBarFill" style="width: ${Math.min(s.value / 255 * 100, 100)}%"></div>
                </div>
                <span class="statValue">${s.value}</span>
            </div>
        `).join("");

        const abilitiesDisplay = currentPokemon.abilities.map(a => capitalize(a)).join(" / ");
        pokemonDisplay.innerHTML = `
            <div class="pokemonCard">
                <img src="${currentPokemon.image}" alt="${currentPokemon.name}" class="searchSprite"/>
                <h2 class="pokemonName">${capitalize(currentPokemon.name)}</h2>
                <div class="typeContainer">${typeBadges}</div>
                <p class="ability-text">Ability: ${abilitiesDisplay}</p>
                <div class="statBlock">${statsBars}</div>
                <button id="addBtn">Add to Team</button>
            </div>
        `;

        document.getElementById("addBtn").addEventListener("click", addToTeam);
    
    } catch (error)
    {
        currentPokemon = null;
        pokemonDisplay.innerHTML = `<p class="message error">Failed to get random Pokémon.</p>`;
    }
}

searchBtn.addEventListener("click", searchPokemon);
randomBtn.addEventListener("click", randomPokemon);

pokemonInput.addEventListener("keydown", (e) => {
    if(e.key === "Enter") 
    {
        searchPokemon();
    }
});

displayTeam();