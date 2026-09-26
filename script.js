const pokeAPI = "https://pokeapi.co/api/v2";

const searchBtn = document.getElementById("searchBtn");
const randomBtn = document.getElementById("randomBtn");
const weaknessChart = document.getElementById("weaknessChart");
const pokemonInput = document.getElementById("pokemonInput");
const pokemonDisplay = document.getElementById("pokemonDisplay");
const teamContainer = document.getElementById("teamContainer");
const exportBtn = document.getElementById("exportBtn");
const scanBtn = document.getElementById("scanBtn");
const threatReport = document.getElementById("threatReport");

function loadTeam()
{
    try
    {
        const savedTeam = JSON.parse(localStorage.getItem("pokemonTeam"));
        return Array.isArray(savedTeam) ? savedTeam : [];
    }
    catch(error)
    {
        console.warn("Could not load saved team, starting with an empty team: ", error);
        return [];
    }
}

let team = loadTeam();
let currentPokemon = null;
let pokedexData = [];
let filteredData = [];
let sortKey = "id";
let sortDesc = false;

const AMOUNT_OF_POKEMON = 1025;

const MULTIPLIER_DISPLAY = {
    4:    { label: "4", className: "multQuadWeak" },
    2:    { label: "2", className: "multWeak" },
    1:    { label: "·", className: "multNeutral" },
    0.5:  { label: "½", className: "multResist" },
    0.25: { label: "¼", className: "multQuadResist" },
    0:    { label: "0", className: "multImmune" }
};

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

function formatName(name)
{
    return name.split("-").map(capitalize).join("-");
}

function formatAbility(ability)
{
    return ability.split(" ").map(capitalize).join(" ");
}

function toShowdownName(data)
{
    if (SHOWDOWN_NAME_OVERRIDES[data.name]) return SHOWDOWN_NAME_OVERRIDES[data.name];
    return formatName(data.is_default ? data.species.name : data.name);
}

function generateShowdownText(team)
{
    return team.map(pokemon => {
        const speciesLine = pokemon.showdownName ?? formatName(pokemon.name);
        const ability = pokemon.abilities?.[0];

        return ability ? `${speciesLine}\nAbility: ${formatAbility(ability)}` : speciesLine;
    }).join("\n\n");
}

function getMultiplier(attackType, defenderTypes)
{
    return defenderTypes.reduce((multiplier, defenderType) => multiplier * (TYPE_EFFECTIVENESS[attackType][defenderType] ?? 1), 1);
}

// Offensive answers carry a type that hits the threat super effectively (a STAB move of that type).
// Defensive answers resist or are immune to every one of the threat's STAB types.
function findThreatAnswers(threat, team)
{
    const offensive = team.filter(pokemon => (pokemon.types || []).some(type => getMultiplier(type, threat.types) >= 2));
    const defensive = team.filter(pokemon => threat.types.every(type => getMultiplier(type, pokemon.types || []) < 1));

    return {
        offensive: offensive.map(pokemon => pokemon.name),
        defensive: defensive.map(pokemon => pokemon.name)
    };
}

async function fetchThreatSprite(threat)
{
    try
    {
        const response = await fetch(`${pokeAPI}/pokemon/${threat.name}`);
        if (!response.ok) throw new Error(`PokeAPI returned ${response.status}`);
        const data = await response.json();

        return data.sprites.front_default;
    }
    catch(error)
    {
        console.warn(`Could not fetch sprite for ${threat.name}: `, error);
        return null;
    }
}

async function checkTeamVulnerabilities(team, threats)
{
    const sprites = await Promise.all(threats.map(fetchThreatSprite));

    return threats.map((threat, index) => {
        const answers = findThreatAnswers(threat, team);

        return {
            name: threat.name,
            threatReason: threat.threatReason,
            types: threat.types,
            sprite: sprites[index],
            offensiveAnswers: answers.offensive,
            defensiveAnswers: answers.defensive,
            covered: answers.offensive.length > 0 || answers.defensive.length > 0
        };
    });
}

async function loadPokedexData()
{
    const pokedexStatus = document.getElementById("pokedexStatus");
    pokedexStatus.textContent = "Loading Pokemon..."

    try
    {
        const listResponse = await fetch(`${pokeAPI}/pokemon?limit=1025&offset=0`);
        const listData = await listResponse.json();
        const batchSize = 250;
        pokedexData = [];

        for(let i = 0; i < listData.results.length; i += batchSize)
        {
            const batch = listData.results.slice(i, i + batchSize);
            const detailPromises = batch.map(p => {
                const cached = localStorage.getItem(`pokemon_${p.name}`);
                if (cached) {
                  console.count('CACHE HIT');
                } else {
                  console.count('CACHE MISS (network fetch)');
                }
                if(cached) return Promise.resolve(JSON.parse(cached));
                return fetch(p.url).then(r => r.json()).then(data => {
                    try
                    {
                        localStorage.setItem(`pokemon_${p.name}`, JSON.stringify(data));
                    }
                    catch(error)
                    {
                        console.warn(`Could not cache ${p.name}: ${error.name}`);
                    }
                    return data;
                });
            });
            const detailResults = await Promise.all(detailPromises);

            detailResults.forEach(data => {
                pokedexData.push({
                    id: data.id,
                    name: data.name,
                    showdownName: toShowdownName(data),
                    types: data.types.map(t => t.type.name),
                    image: data.sprites.front_default,
                    abilities: data.abilities.map(a => a.ability.name.replaceAll("-", " ")),
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
            applySort();
            renderTable(filteredData);
        }

        pokedexStatus.textContent = `Showing ${pokedexData.length} Pokemon`;

        document.getElementById("pokedexSearch").addEventListener("input", (e) => {
            const query = e.target.value.toLowerCase().trim();
            filteredData = pokedexData.filter(p => p.name.includes(query));
            applySort();
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

        emptyRow.appendChild(emptyCell);
        tBody.appendChild(emptyRow);
        document.getElementById("pokedexStatus").textContent = `Showing 0 of ${pokedexData.length} Pokémon`;
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
        });

        addCell.appendChild(addBtn);
        row.appendChild(addCell);
        tBody.appendChild(row);
    });

    document.getElementById("pokedexStatus").textContent = `Showing ${data.length} of ${pokedexData.length} Pokémon`;
}

function applySort()
{
    filteredData.sort((a, b) => {
        if(typeof a[sortKey] === "string")
        {
            return sortDesc ? b[sortKey].localeCompare(a[sortKey]) : a[sortKey].localeCompare(b[sortKey]);
        }
        return sortDesc ? b[sortKey] - a[sortKey] : a[sortKey] - b[sortKey];
    });
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

    applySort();

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

function buildCoverageHeader()
{
    const head = document.createElement("thead");
    const row = document.createElement("tr");

    const typeHeader = document.createElement("th");
    typeHeader.textContent = "ATK";
    row.appendChild(typeHeader);

    team.forEach(pokemon => {
        const memberHeader = document.createElement("th");
        memberHeader.title = capitalize(pokemon.name);

        if (pokemon.image)
        {
            const sprite = document.createElement("img");
            sprite.src = pokemon.image;
            sprite.alt = capitalize(pokemon.name);
            sprite.className = "coverageSprite";
            memberHeader.appendChild(sprite);
        }
        else
        {
            memberHeader.textContent = pokemon.name.slice(0, 4).toUpperCase();
        }

        row.appendChild(memberHeader);
    });

    const weakHeader = document.createElement("th");
    weakHeader.className = "coverageCount coverageWeakCount";
    weakHeader.textContent = "Weak";
    row.appendChild(weakHeader);

    const resistHeader = document.createElement("th");
    resistHeader.className = "coverageCount";
    resistHeader.textContent = "Resist";
    row.appendChild(resistHeader);

    head.appendChild(row);
    return head;
}

function buildCoverageRow(attackType)
{
    const row = document.createElement("tr");

    const typeCell = document.createElement("th");
    typeCell.scope = "row";
    const badge = document.createElement("span");
    badge.className = `typeBadge type-${attackType}`;
    badge.textContent = capitalize(attackType);
    typeCell.appendChild(badge);
    row.appendChild(typeCell);

    let weakCount = 0;
    let resistCount = 0;

    team.forEach(pokemon => {
        const multiplier = getMultiplier(attackType, pokemon.types || []);
        const display = MULTIPLIER_DISPLAY[multiplier];

        if (multiplier > 1) weakCount++;
        if (multiplier < 1) resistCount++;

        const cell = document.createElement("td");
        cell.className = `coverageCell ${display.className}`;
        cell.textContent = display.label;
        cell.title = `${capitalize(pokemon.name)} takes ${multiplier}× from ${capitalize(attackType)}`;
        row.appendChild(cell);
    });

    const weakCell = document.createElement("td");
    weakCell.className = "coverageCount coverageWeakCount";
    weakCell.textContent = weakCount;
    row.appendChild(weakCell);

    const resistCell = document.createElement("td");
    resistCell.className = "coverageCount";
    resistCell.textContent = resistCount;
    row.appendChild(resistCell);

    if (weakCount > resistCount) row.classList.add("coverageExposed");

    return row;
}

function displayWeaknessChart()
{
    if (team.length === 0)
    {
        weaknessChart.innerHTML = `<p class="emptyMessage">Add Pokémon to your team to see type weaknesses!</p>`;
        return;
    }

    const panel = document.createElement("div");
    panel.className = "chartPanel";

    const title = document.createElement("h3");
    title.className = "chartTitle";
    title.textContent = "Team Type Coverage";
    panel.appendChild(title);

    const table = document.createElement("table");
    table.className = "coverageTable";
    table.appendChild(buildCoverageHeader());

    const body = document.createElement("tbody");
    TYPE_ORDER.forEach(attackType => body.appendChild(buildCoverageRow(attackType)));
    table.appendChild(body);

    const wrapper = document.createElement("div");
    wrapper.className = "coverageWrapper";
    wrapper.appendChild(table);
    panel.appendChild(wrapper);

    const legend = document.createElement("p");
    legend.className = "coverageLegend";
    legend.textContent = "Damage each member takes from each attacking type. Highlighted rows: more members weak than resistant.";
    panel.appendChild(legend);

    weaknessChart.replaceChildren(panel);
}

function statColor(value)
{
    if (value >= 90) return "#48c048";
    if (value >= 60) return "#f8d030";
    return "#e63946";
}

function displayTeam()
{
    displayWeaknessChart();

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
}

function refreshPokedexTable()
{
    if (pokedexData.length === 0) return;
    renderTable(filteredData);
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
    refreshPokedexTable();
    showMessage(`${capitalize(currentPokemon.name)} added to your team!`);
}

function removeFromTeam(index)
{
    const removedPokemon = team[index];
    team.splice(index, 1);
    saveTeam();
    displayTeam();
    refreshPokedexTable();
    showMessage(`${capitalize(removedPokemon.name)} removed from your team.`);
}

// Converts user input like "Mr. Mime", "Farfetch'd" or "Flabébé" into PokeAPI slugs (mr-mime, farfetchd, flabebe).
function normalizeSearchQuery(input)
{
    return input
        .normalize("NFD")
        .replace(/[̀-ͯ]/g, "")
        .replace("♀", "-f")
        .replace("♂", "-m")
        .toLowerCase()
        .trim()
        .replace(/[\s_]+/g, "-")
        .replace(/[^a-z0-9-]/g, "")
        .replace(/-+/g, "-")
        .replace(/^-|-$/g, "");
}

// PokeAPI's /pokemon endpoint only knows form names (giratina-altered), so species names (giratina)
// fall back to /pokemon-species and resolve to its default variety. Returns null when nothing matches.
async function fetchPokemonByNameOrId(query)
{
    const response = await fetch(`${pokeAPI}/pokemon/${query}`);
    if (response.ok) return response.json();
    if (response.status !== 404) throw new Error(`PokeAPI returned ${response.status}`);

    const speciesResponse = await fetch(`${pokeAPI}/pokemon-species/${query}`);
    if (speciesResponse.status === 404) return null;
    if (!speciesResponse.ok) throw new Error(`PokeAPI returned ${speciesResponse.status}`);

    const species = await speciesResponse.json();
    const defaultVariety = species.varieties.find(variety => variety.is_default);
    if (!defaultVariety) return null;

    const varietyResponse = await fetch(defaultVariety.pokemon.url);
    if (!varietyResponse.ok) throw new Error(`PokeAPI returned ${varietyResponse.status}`);
    return varietyResponse.json();
}

async function searchPokemon()
{
    const query = normalizeSearchQuery(pokemonInput.value);

    if (!query)
    {
        pokemonDisplay.innerHTML = `<p class="message error">Please enter a Pokémon name.</p>`;
        return;
    }

    pokemonDisplay.innerHTML = `<p class="message">Searching...</p>`;

    try
    {
        const data = await fetchPokemonByNameOrId(query);
        if (!data)
        {
            currentPokemon = null;
            pokemonDisplay.innerHTML = `<p class="message error">Pokémon not found. Please try again.</p>`;
            return;
        }

        const stats = data.stats.map(s => ({ name: s.stat.name, value: s.base_stat }));
        const abilities = data.abilities.map(a => a.ability.name.replaceAll("-", " "));

        currentPokemon = {
            name: data.name,
            showdownName: toShowdownName(data),
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
        console.warn("Search failed: ", error);
        pokemonDisplay.innerHTML = `<p class="message error">Something went wrong while searching. Please try again.</p>`;
    }
}

async function randomPokemon()
{
    const randomId = Math.floor(Math.random() * AMOUNT_OF_POKEMON) + 1;
    pokemonInput.value = "";
    pokemonDisplay.innerHTML = `<p class="message">Getting a random Pokémon...</p>`;
    try {
        const response = await fetch(`${pokeAPI}/pokemon/${randomId}`);
        if (!response.ok) throw new Error("Not found");
        const data = await response.json();

        const stats = data.stats.map(a => ({
            name: a.stat.name,
            value: a.base_stat
        }));
        const abilities = data.abilities.map(a => a.ability.name.replaceAll("-", " "));

        currentPokemon = {
            name: data.name,
            showdownName: toShowdownName(data),
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
function buildThreatAnswerLine(label, pokemonNames)
{
    const line = document.createElement("p");
    line.className = "threatAnswer";

    const labelEl = document.createElement("span");
    labelEl.className = "threatAnswerLabel";
    labelEl.textContent = `${label}: `;
    line.appendChild(labelEl);

    line.append(pokemonNames.length > 0 ? pokemonNames.map(capitalize).join(", ") : "None");
    return line;
}

scanBtn.addEventListener("click", async () => {
    if(team.length === 0)
    {
        console.warn("Scan cannot be completed with empty team. Please add a Pokemon and try again.");
        threatReport.innerHTML = `<p class="emptyMessage">Your team is empty! Add some Pokémon to scan for threats.</p>`;
        return;
    }

    threatReport.innerHTML = `<p class="message">Scanning for threats...</p>`;

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

        card.appendChild(buildThreatAnswerLine("Hits it super effectively", result.offensiveAnswers));
        card.appendChild(buildThreatAnswerLine("Resists its STAB types", result.defensiveAnswers));

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