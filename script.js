const searchBtn = document.getElementById("searchBtn");
const randomBtn = document.getElementById("randomBtn");
const weaknessChart = document.getElementById("weaknessChart");
const pokemonInput = document.getElementById("pokemonInput");
const pokemonDisplay = document.getElementById("pokemonDisplay");
const teamContainer = document.getElementById("teamContainer");
const exportBtn = document.getElementById("exportBtn");
const scanBtn = document.getElementById("scanBtn");
const threatReport = document.getElementById("threatReport");

let team = JSON.parse(localStorage.getItem("pokemonTeam")) || [];
let currentPokemon = null;
let pokedexData = [];
let filteredData = [];
let sortKey = "id";
let sortDesc = false;

const AMOUNT_OF_POKEMON = 1025;
const typeCache = {};

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

function generateShowdownText(team)
{
    return team.map(pokemon => {
        const nameLine = capitalize(pokemon.name);
        const abilityLine = (pokemon.abilities && pokemon.abilities.length > 0) ? `Ability: ${capitalize(pokemon.abilities[0])}` : null;

        const statLines = (pokemon.stats || []).map(s => {
            if(s.value === undefined || s.value === null) return null;
            return `- ${capitalize(s.name)}: ${s.value}`;
        }).filter(line => line !== null);
        
        const lines = [nameLine, abilityLine, ...statLines].filter(line => line !== null);
        return lines.join("\n");
    }).join("\n\n");
}

async function checkTeamVulnerabilities(team, threats)
{
    const results = [];
    
    for(const threat of threats)
    {
        let hasCounter = false;

        for(const pokemon of team)
        {
            for(const pokemonType of pokemon.types)
            {
                if(threat.counters.includes(pokemonType)) hasCounter = true;
            }
        }

        let spriteUrl = null;

        try
        {
            const response = await fetch(`https://pokeapi.co/api/v2/pokemon/${threat.name.toLowerCase()}`);
            const data = await response.json();

            spriteUrl = data.sprites.front_default;
        }
        catch(error)
        {
            console.warn(`Could not fetch sprite for ${threat.name}`);
        }

        results.push({
            name: threat.name,
            threatReason: threat.threatReason,
            types: threat.types,
            covered: hasCounter,
            sprite: spriteUrl
        });
    }

    return results;
}

async function loadPokedexData()
{
    const pokedexStatus = document.getElementById("pokedexStatus");
    pokedexStatus.textContent = "Loading Pokemon..."

    try
    {
        const listResponse = await fetch("https://pokeapi.co/api/v2/pokemon?limit=1025&offset=0");
        const listData = await listResponse.json();
        const batchSize = 250;
        pokedexData = [];

        for(let i = 0; i < listData.results.length; i += batchSize)
        {
            const batch = listData.results.slice(i, i + batchSize);
            const detailPromises = batch.map(p => fetch(p.url).then(r => r.json()));
            const detailResults = await Promise.all(detailPromises);

            detailResults.forEach(data => {
                pokedexData.push({
                    id: data.id,
                    name: data.name,
                    types: data.types.map(t => t.type.name),
                    image: data.sprites.front_default,
                    abilities: data.abilities.map(a => a.ability.name.replace("-", " ")),
                    stats: data.stats.map(s => ({ name: s.stat.name, value: s.base_stat })),
                    hp: data.stats[0].base_stat,
                    attack: data.stats[1].base_stat,
                    defense: data.stats[2].base_stat,
                    specialAttack: data.stats[3].base_stat,
                    specialDefense: data.stats[4].base_stat,
                    speed: data.stats[5].base_stat
                });
            });

            pokedexStatus.textContent = `Loading... ${pokedexData.length} of ${listData.results.length} Pokemon`;
            
            filteredData = [...pokedexData];
            renderTable(filteredData);
        }

        pokedexStatus.textContent = `Showing ${pokedexData.length} Pokemon`;

        document.getElementById("pokedexSearch").addEventListener("input", (e) => {
            const query = e.target.value.toLowerCase().trim();
            filteredData = pokedexData.filter(p => p.name.includes(query));
            renderTable(filteredData);
        });
    } catch(error) {
        document.getElementById("pokedexStatus").textContent = "Failed to load Pokedex. Please refresh the page.";
        console.warn("Pokedex load error: ", error);
    }
}

function renderTable(data)
{
    const tBody = document.getElementById("pokedexBody");
    tBody.innerHTML = "";

    if(data.length === 0)
    {
        const emptyRow = document.createElement("tr");
        const emptyCell = document.createElement("td");

        emptyCell.colSpan = 11;
        emptyCell.textContent = "No Pokemon found";
        emptyCell.style.textAlign = "center";
        emptyCell.style.padding = "20px";

        emptyRow = appendChild(emptyCell);
        tBody.appendChild(emptyRow);
        return;
    }

    data.forEach(pokemon => {
        const row = document.createElement("tr");
        const idCell = document.createElement("td");
        idCell.className = "pokedexId";
        idCell.textContent = `#${String(pokemon.id).padStart(3, "0")}`;
        row.appendChild(idCell);

        const spriteCell = document.createElement("td");
        const sprite = document.createElement("img");
        sprite.src = pokemon.image;
        sprite.alt = pokemon.name;
        sprite.className = "pokedexSprite";
        spriteCell.appendChild(sprite);
        row.appendChild(spriteCell);

        const nameCell = document.createElement("td");
        nameCell.className = "pokedexName";
        nameCell.textContent = capitalize(pokemon.name);
        row.appendChild(nameCell);

        const typeCell = document.createElement("td");
        pokemon.types.forEach(t => {
            const badge = document.createElement("span");
            badge.className = `typeBadge type-${t}`;
            badge.textContent = capitalize(t);
            typeCell.appendChild(badge);
        });

        row.appendChild(typeCell);

        [pokemon.hp, pokemon.attack, pokemon.defense, pokemon.specialAttack, pokemon.specialDefense, pokemon.speed].forEach(stat => {
            const statCell = document.createElement("td");
            statCell.textContent = stat;
            row.appendChild(statCell);
        });

        const addCell = document.createElement("td");
        const addBtn = document.createElement("button");
        const isOnTeam = team.some(p => p.name === pokemon.name);
        addBtn.className = "pokedexAddBtn";
        addBtn.textContent = isOnTeam ? "Added" : "Add";
        addBtn.disabled = isOnTeam;

        addBtn.addEventListener("click", () => {
            currentPokemon = pokemon;
            addToTeam();
            renderTable(filteredData);
        });

        addCell.appendChild(addBtn);
        row.appendChild(addCell);
        tBody.appendChild(row);
    });

    document.getElementById("pokedexStatus").textContent = `Showing ${data.length} of ${pokedexData.length} Pokémon`;
}

function sortData(key)
{
    if(sortKey === key)
    {
        sortDesc = !sortDesc;
    }
    else
    {
        sortKey = key;
        sortDesc = false;
    }

    filteredData.sort((a, b) => {
        if(typeof a[key] === "string")
        {
            return sortdesc ? b[key].localeCompare(a[key]) : a[key].localeCompare(b[key]);
        }
        return sortDesc ? b[key] - a[key] : a[key] - b[key];
    });

    document.querySelectorAll("#pokedexTable th.sortable").forEach(th => {
        th.classList.remove("sorted", "desc");
    });

    const activeHeader = document.querySelector(`#pokedexTable th[data-key="${key}"]`);
    if(activeHeader)
    {
        activeHeader.classList.add("sorted");
        if(sortDesc)
        {
            activeHeader.classList.add("desc");
        }
    }

    renderTable(filteredData);
}

async function displayWeaknessChart()
{
    if (team.length === 0)
    {
        weaknessChart.innerHTML = `<p class="emptyMessage">Add Pokémon to your team to see type weaknesses!</p>`;
        return;
    }

    weaknessChart.innerHTML = `<p class="message">Loading type data...</p>`;

    const weaknessSet = new Set();
    const resistanceSet = new Set();
    const immuneSet = new Set();

    try
    {
        for (const pokemon of team)
        {
            const pokemonWeaknesses = new Set();
            const pokemonResistances = new Set();
            const pokemonImmunes = new Set();

            for (const type of pokemon.types)
            {
                const response = await fetch(`https://pokeapi.co/api/v2/type/${type}`);
                const data = await response.json();

                data.damage_relations.double_damage_from.forEach(t => {pokemonWeaknesses.add(t.name);});
                data.damage_relations.half_damage_from.forEach(t => {pokemonResistances.add(t.name);});
                data.damage_relations.no_damage_from.forEach(t => {pokemonImmunes.add(t.name);});
            }

        pokemonImmunes.forEach(t => pokemonWeaknesses.delete(t));

        pokemonWeaknesses.forEach(t => weaknessSet.add(t));
        pokemonResistances.forEach(t => resistanceSet.add(t));
        pokemonImmunes.forEach(t => immuneSet.add(t));
        }

        const filteredWeaknesses = Array.from(weaknessSet).filter(t => {return !resistanceSet.has(t) && !immuneSet.has(t);});
        const resistances = Array.from(resistanceSet);
        const immunities = Array.from(immuneSet);


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
                    <div class="chartBadges">${buildBadgeList(filteredWeaknesses)}</div>
                </div>
                <div class="chartColumn">
                    <p class="chartLabel resistLabel">Resists</p>
                    <div class="chartBadges">${buildBadgeList(resistances)}</div>
                </div>
                <div class="chartColumn">
                    <p class="chartLabel immuneLabel">Immune To</p>
                    <div class="chartBadges">${buildBadgeList(immunities)}</div>
                </div>
            </div>
        </div>
        `;
    } catch (error)
    {
        weaknessChart.innerHTML = `<p class="message error">Failed to load type data. Please try again later.</p>`;
    }
}

function statColor(value)
{
    if (value >= 90) return "#48c048";
    if (value >= 60) return "#f8d030";
    return "#e63946";
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
                    <div class="statBarFill" style="width: ${Math.min(s.value / 255 * 100, 100)}%; background-color: ${statColor(s.value)}"></div>
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
                <div class="statBarFill" style="width: ${Math.min(s.value / 255 * 100, 100)}%; background-color: ${statColor(s.value)}"></div>
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
                    <div class="statBarFill" style="width: ${Math.min(s.value / 255 * 100, 100)}%; background-color: ${statColor(s.value)}"></div>
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

exportBtn.addEventListener("click", () => {
    if(team.length === 0)
    {
        showMessage("Your team is empty! Add some Pokémon before exporting.", true);
        return;
    }

    const showdownText = generateShowdownText(team);

    navigator.clipboard.writeText(showdownText).then(() => {
        exportBtn.textContent = "Copied!";
        exportBtn.classList.add("copied");
        setTimeout(() => {
            exportBtn.textContent = "Export To Pokemon Showdown";
            exportBtn.classList.remove("copied");
        }, 2000);
    }).catch(() => {
        showMessage("Failed to copy to clipboard. Please try again.", true);
    });
});
scanBtn.addEventListener("click", async () => {
    if(team.length === 0)
    {
        console.warn("Scan cannot be completed with empty team. Please add a Pokemon and try again.");
        threatReport.innerHTML = `<p class="emptyMessage">Your team is empty! Add some Pokémon to scan for threats.</p>`;
        return;
    }

    threatReport.innerHTML = `<p class=message">Scanning for threats...</p>`;

    const results = await checkTeamVulnerabilities(team, TOP_THREATS);

    threatReport.innerHTML = "";

    results.forEach(result => {
        const card = document.createElement("div");
        card.className = result.covered ? "threatCard covered" : "threatCard danger";

        if (result.sprite) {
            const img = document.createElement("img");
            img.src       = result.sprite;
            img.alt       = result.name;
            img.className = "threatSprite";
            card.appendChild(img);
        }

        const nameEl = document.createElement("p");
        nameEl.className   = "threatName";
        nameEl.textContent = capitalize(result.name);
        card.appendChild(nameEl);

        const typeContainer = document.createElement("div");
        typeContainer.className = "type-container";
        result.types.forEach(t => {
            const badge = document.createElement("span");
            badge.className   = `typeBadge type-${t}`;
            badge.textContent = capitalize(t);
            typeContainer.appendChild(badge);
        });
        card.appendChild(typeContainer);

        const reasonEl = document.createElement("p");
        reasonEl.className   = "threatReason";
        reasonEl.textContent = result.threatReason;
        card.appendChild(reasonEl);

        const statusEl = document.createElement("span");
        statusEl.className   = `threatStatus ${result.covered ? "covered" : "danger"}`;
        statusEl.textContent = result.covered ? "Covered" : "No Counter";
        card.appendChild(statusEl);

        threatReport.appendChild(card);
    });
});
document.querySelectorAll("#pokedexTable th.sortable").forEach(th => {
    th.addEventListener("click", () => sortData(th.dataset.key));
});
searchBtn.addEventListener("click", searchPokemon);
randomBtn.addEventListener("click", randomPokemon);
pokemonInput.addEventListener("keydown", (e) => {
    if(e.key === "Enter") 
    {
        searchPokemon();
    }
});

displayTeam();
loadPokedexData();