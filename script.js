const POKE_API_BASE_URL = "https://pokeapi.co/api/v2";
const POKEDEX_SIZE = 1025;
const POKEDEX_BATCH_SIZE = 250;
const MAX_TEAM_SIZE = 6;
const MAX_BASE_STAT = 255;
const POKEDEX_STAT_KEYS = ["hp", "attack", "defense", "specialAttack", "specialDefense", "speed"];

// Storage keys are read back on every visit; renaming them would orphan existing saved teams and caches.
const TEAM_STORAGE_KEY = "pokemonTeam";
const POKEMON_CACHE_PREFIX = "pokemon_";

const MESSAGE_DURATION_MS = 3000;
const COPY_FEEDBACK_DURATION_MS = 2000;

const FRACTION_LABELS = { 0.5: "½", 0.25: "¼", 0.125: "⅛" };

const searchBtn = document.getElementById("searchBtn");
const randomBtn = document.getElementById("randomBtn");
const weaknessChart = document.getElementById("weaknessChart");
const pokemonInput = document.getElementById("pokemonInput");
const pokemonDisplay = document.getElementById("pokemonDisplay");
const teamContainer = document.getElementById("teamContainer");
const exportBtn = document.getElementById("exportBtn");
const scanBtn = document.getElementById("scanBtn");
const threatReport = document.getElementById("threatReport");
const pokedexStatus = document.getElementById("pokedexStatus");
const pokedexSearch = document.getElementById("pokedexSearch");
const pokedexBody = document.getElementById("pokedexBody");
const sortableHeaders = document.querySelectorAll("#pokedexTable th.sortable");
const POKEDEX_COLUMN_COUNT = document.querySelectorAll("#pokedexTable thead th").length;
const EXPORT_BUTTON_LABEL = exportBtn.textContent;

function getDefaultAbility(abilities)
{
    const defaultAbility = abilities.find(ability => ability.slot === 1) ?? abilities[0];
    return defaultAbility ? defaultAbility.name : null;
}

// Saved teams come in three shapes: abilities as display strings ("flash fire") from before ability slots
// existed, ability objects without a selectedAbility, and the current shape. All leave here as the current shape.
function migrateTeamMember(member)
{
    const abilities = (member.abilities || []).map(ability =>
        typeof ability === "string" ? { name: ability.replaceAll(" ", "-"), slot: null, isHidden: null } : ability
    );
    const hasValidSelection = abilities.some(ability => ability.name === member.selectedAbility);

    return {
        ...member,
        abilities,
        selectedAbility: hasValidSelection ? member.selectedAbility : getDefaultAbility(abilities)
    };
}

function loadTeam()
{
    try
    {
        const savedTeam = JSON.parse(localStorage.getItem(TEAM_STORAGE_KEY));
        if (!Array.isArray(savedTeam)) return [];

        return savedTeam
            .filter(member => member && typeof member.name === "string")
            .map(migrateTeamMember);
    }
    catch (error)
    {
        console.warn("Could not load saved team, starting with an empty team: ", error);
        return [];
    }
}

let team = loadTeam();
let currentPokemon = null;
let pokedexData = [];
let visiblePokedexData = [];
let sortKey = "id";
let sortDesc = false;

function saveTeam()
{
    try
    {
        localStorage.setItem(TEAM_STORAGE_KEY, JSON.stringify(team));
    }
    catch (error)
    {
        console.warn("Could not save team: ", error);
        showMessage("Couldn't save your team in this browser. Changes will be lost on refresh.", true);
    }
}

function showMessage(message, isError = false)
{
    const msg = document.createElement("p");

    msg.textContent = message;
    msg.className = isError ? "message error" : "message success";
    pokemonDisplay.prepend(msg);
    setTimeout(() => msg.remove(), MESSAGE_DURATION_MS);
}

function capitalize(str)
{
    return str.charAt(0).toUpperCase() + str.slice(1);
}

function formatName(name)
{
    return name.split("-").map(capitalize).join("-");
}

function formatAbilityLabel(abilitySlug)
{
    return abilitySlug.split("-").map(capitalize).join(" ");
}

function normalizePokemon(data)
{
    return {
        id: data.id,
        name: data.name,
        showdownName: toShowdownName(data),
        types: data.types.map(t => t.type.name),
        image: data.sprites.front_default,
        abilities: data.abilities.map(a => ({ name: a.ability.name, slot: a.slot, isHidden: a.is_hidden })),
        stats: data.stats.map(s => ({ name: s.stat.name, value: s.base_stat }))
    };
}

function toShowdownName(data)
{
    if (SHOWDOWN_NAME_OVERRIDES[data.name]) return SHOWDOWN_NAME_OVERRIDES[data.name];
    return formatName(data.is_default ? data.species.name : data.name);
}

function generateShowdownText(teamMembers)
{
    return teamMembers.map(pokemon => {
        const speciesLine = pokemon.showdownName ?? formatName(pokemon.name);
        const ability = pokemon.selectedAbility;

        return ability ? `${speciesLine}\nAbility: ${formatAbilityLabel(ability)}` : speciesLine;
    }).join("\n\n");
}

function getTypeMultiplier(attackType, defenderTypes)
{
    return defenderTypes.reduce((multiplier, defenderType) => multiplier * (TYPE_EFFECTIVENESS[attackType][defenderType] ?? 1), 1);
}

// Type-chart multiplier adjusted for the defender's selected ability. Use getTypeMultiplier for pure type math.
function getDamageTaken(attackType, pokemon)
{
    const typeMultiplier = getTypeMultiplier(attackType, pokemon.types || []);
    const ability = pokemon.selectedAbility;

    if (ability === WONDER_GUARD) return typeMultiplier >= 2 ? typeMultiplier : 0;
    if (SUPER_EFFECTIVE_REDUCERS.has(ability) && typeMultiplier > 1) return typeMultiplier * SUPER_EFFECTIVE_REDUCTION;

    return typeMultiplier * (ABILITY_DAMAGE_MODIFIERS[ability]?.[attackType] ?? 1);
}

function formatMultiplier(value)
{
    if (value === 1) return "·";
    return FRACTION_LABELS[value] ?? String(value);
}

function getMultiplierClass(value)
{
    if (value === 0) return "multImmune";
    if (value <= 0.25) return "multQuadResist";
    if (value < 1) return "multResist";
    if (value === 1) return "multNeutral";
    if (value < 4) return "multWeak";
    return "multQuadWeak";
}

// Offensive answers carry a type that hits the threat super effectively (a STAB move of that type).
// Defensive answers resist or are immune to every one of the threat's STAB types.
function findThreatAnswers(threat, teamMembers)
{
    const offensive = teamMembers.filter(pokemon => (pokemon.types || []).some(type => getTypeMultiplier(type, threat.types) >= 2));
    const defensive = teamMembers.filter(pokemon => threat.types.every(type => getDamageTaken(type, pokemon) < 1));

    return {
        offensive: offensive.map(pokemon => pokemon.name),
        defensive: defensive.map(pokemon => pokemon.name)
    };
}

async function fetchThreatSprite(threat)
{
    try
    {
        const response = await fetch(`${POKE_API_BASE_URL}/pokemon/${threat.name}`);
        if (!response.ok) throw new Error(`PokeAPI returned ${response.status}`);
        const data = await response.json();

        return data.sprites.front_default;
    }
    catch (error)
    {
        console.warn(`Could not fetch sprite for ${threat.name}: `, error);
        return null;
    }
}

async function checkTeamVulnerabilities(teamMembers, threats)
{
    const sprites = await Promise.all(threats.map(fetchThreatSprite));

    return threats.map((threat, index) => {
        const answers = findThreatAnswers(threat, teamMembers);

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

function getPokemonCacheKey(pokemonName)
{
    return `${POKEMON_CACHE_PREFIX}${pokemonName}`;
}

async function fetchAndCachePokemonDetail(entry)
{
    const response = await fetch(entry.url);
    const data = await response.json();

    try
    {
        localStorage.setItem(getPokemonCacheKey(entry.name), JSON.stringify(data));
    }
    catch (error)
    {
        console.warn(`Could not cache ${entry.name}: ${error.name}`);
    }

    return data;
}

function getPokemonDetail(entry)
{
    const cached = localStorage.getItem(getPokemonCacheKey(entry.name));

    if (cached)
    {
        console.count("CACHE HIT");
        return Promise.resolve(JSON.parse(cached));
    }

    console.count("CACHE MISS (network fetch)");
    return fetchAndCachePokemonDetail(entry);
}

function toPokedexRow(data)
{
    const [hp, attack, defense, specialAttack, specialDefense, speed] = data.stats.map(stat => stat.base_stat);
    return { ...normalizePokemon(data), hp, attack, defense, specialAttack, specialDefense, speed };
}

async function loadPokedexData()
{
    pokedexStatus.textContent = "Loading Pokemon...";

    try
    {
        const listResponse = await fetch(`${POKE_API_BASE_URL}/pokemon?limit=${POKEDEX_SIZE}&offset=0`);
        const entries = (await listResponse.json()).results;
        pokedexData = [];

        for (let i = 0; i < entries.length; i += POKEDEX_BATCH_SIZE)
        {
            const batch = entries.slice(i, i + POKEDEX_BATCH_SIZE);
            const details = await Promise.all(batch.map(entry => getPokemonDetail(entry)));
            pokedexData.push(...details.map(data => toPokedexRow(data)));

            pokedexStatus.textContent = `Loading... ${pokedexData.length} of ${entries.length} Pokemon`;

            visiblePokedexData = [...pokedexData];
            sortVisiblePokedexData();
            renderPokedexTable(visiblePokedexData);
        }

        pokedexStatus.textContent = `Showing ${pokedexData.length} Pokemon`;
        pokedexSearch.addEventListener("input", event => filterPokedex(event.target.value));
    }
    catch (error)
    {
        pokedexStatus.textContent = "Failed to load Pokedex. Please refresh the page.";
        console.warn("Pokedex load error: ", error);
    }
}

function filterPokedex(query)
{
    const normalizedQuery = query.toLowerCase().trim();
    visiblePokedexData = pokedexData.filter(pokemon => pokemon.name.includes(normalizedQuery));
    sortVisiblePokedexData();
    renderPokedexTable(visiblePokedexData);
}

function buildTextCell(text, className)
{
    const cell = document.createElement("td");
    if (className) cell.className = className;
    cell.textContent = text;
    return cell;
}

function buildPokedexRow(pokemon)
{
    const row = document.createElement("tr");

    const spriteCell = document.createElement("td");
    const sprite = document.createElement("img");
    sprite.src = pokemon.image;
    sprite.alt = pokemon.name;
    sprite.className = "pokedexSprite";
    spriteCell.appendChild(sprite);

    const typeCell = document.createElement("td");
    typeCell.append(...pokemon.types.map(type => createTypeBadge(type)));

    const statCells = POKEDEX_STAT_KEYS.map(key => buildTextCell(pokemon[key]));

    const addCell = document.createElement("td");
    const addButton = document.createElement("button");
    const isOnTeam = team.some(member => member.name === pokemon.name);
    addButton.className = "pokedexAddBtn";
    addButton.textContent = isOnTeam ? "Added" : "Add";
    addButton.disabled = isOnTeam;
    addButton.addEventListener("click", () => {
        currentPokemon = pokemon;
        addToTeam();
    });
    addCell.appendChild(addButton);

    row.append(
        buildTextCell(`#${String(pokemon.id).padStart(3, "0")}`, "pokedexId"),
        spriteCell,
        buildTextCell(capitalize(pokemon.name), "pokedexName"),
        typeCell,
        ...statCells,
        addCell
    );
    return row;
}

function buildEmptyPokedexRow()
{
    const cell = buildTextCell("No Pokemon found", "pokedexEmptyCell");
    cell.colSpan = POKEDEX_COLUMN_COUNT;

    const row = document.createElement("tr");
    row.appendChild(cell);
    return row;
}

function renderPokedexTable(rows)
{
    const tableRows = rows.length > 0 ? rows.map(pokemon => buildPokedexRow(pokemon)) : [buildEmptyPokedexRow()];
    pokedexBody.replaceChildren(...tableRows);
    pokedexStatus.textContent = `Showing ${rows.length} of ${pokedexData.length} Pokémon`;
}

function sortVisiblePokedexData()
{
    visiblePokedexData.sort((a, b) => {
        if (typeof a[sortKey] === "string")
        {
            return sortDesc ? b[sortKey].localeCompare(a[sortKey]) : a[sortKey].localeCompare(b[sortKey]);
        }
        return sortDesc ? b[sortKey] - a[sortKey] : a[sortKey] - b[sortKey];
    });
}

function toggleSort(key)
{
    if (sortKey === key)
    {
        sortDesc = !sortDesc;
    }
    else
    {
        sortKey = key;
        sortDesc = false;
    }

    sortVisiblePokedexData();
    updateSortIndicators();
    renderPokedexTable(visiblePokedexData);
}

function updateSortIndicators()
{
    sortableHeaders.forEach(header => {
        const isActive = header.dataset.key === sortKey;
        header.classList.toggle("sorted", isActive);
        header.classList.toggle("desc", isActive && sortDesc);
    });
}

function createTypeBadge(type)
{
    const badge = document.createElement("span");
    badge.className = `typeBadge type-${type}`;
    badge.textContent = capitalize(type);
    return badge;
}

function buildTypeContainer(types)
{
    const container = document.createElement("div");
    container.className = "typeContainer";
    container.append(...types.map(type => createTypeBadge(type)));
    return container;
}

function buildStatRow(stat)
{
    const row = document.createElement("div");
    row.className = "statRow";

    const label = document.createElement("span");
    label.className = "statLabel";
    label.textContent = stat.name;

    const barBackground = document.createElement("div");
    barBackground.className = "statBarBg";

    const barFill = document.createElement("div");
    barFill.className = "statBarFill";
    barFill.style.width = `${Math.min(stat.value / MAX_BASE_STAT * 100, 100)}%`;
    barFill.style.backgroundColor = getStatColor(stat.value);
    barBackground.appendChild(barFill);

    const value = document.createElement("span");
    value.className = "statValue";
    value.textContent = stat.value;

    row.append(label, barBackground, value);
    return row;
}

function buildStatBlock(stats)
{
    const block = document.createElement("div");
    block.className = "statBlock";
    block.append(...stats.map(stat => buildStatRow(stat)));
    return block;
}

function buildPokemonCard(pokemon)
{
    const card = document.createElement("div");
    card.className = "pokemonCard";

    const sprite = document.createElement("img");
    sprite.src = pokemon.image;
    sprite.alt = pokemon.name;

    const name = document.createElement("h2");
    name.textContent = capitalize(pokemon.name);

    const abilities = document.createElement("p");
    abilities.className = "abilityText";
    abilities.textContent = `Ability: ${pokemon.abilities.map(ability => formatAbilityLabel(ability.name)).join(" / ")}`;

    const addButton = document.createElement("button");
    addButton.id = "addBtn";
    addButton.textContent = "Add to Team";
    addButton.addEventListener("click", addToTeam);

    card.append(sprite, name, buildTypeContainer(pokemon.types), abilities, buildStatBlock(pokemon.stats), addButton);
    return card;
}

function buildTeamCard(pokemon, index)
{
    const card = document.createElement("div");
    card.className = "teamCard";

    const sprite = document.createElement("img");
    sprite.src = pokemon.image;
    sprite.alt = pokemon.name;

    const name = document.createElement("p");
    name.className = "teamMemberName";
    name.textContent = capitalize(pokemon.name);

    const removeButton = document.createElement("button");
    removeButton.className = "removeBtn";
    removeButton.textContent = "Remove";
    removeButton.addEventListener("click", () => removeFromTeam(index));

    card.append(
        sprite,
        name,
        buildTypeContainer(pokemon.types || []),
        buildAbilityPicker(pokemon),
        buildStatBlock(pokemon.stats || []),
        removeButton
    );
    return card;
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
    typeCell.appendChild(createTypeBadge(attackType));
    row.appendChild(typeCell);

    let weakCount = 0;
    let resistCount = 0;

    team.forEach(pokemon => {
        const multiplier = getDamageTaken(attackType, pokemon);
        const changedByAbility = multiplier !== getTypeMultiplier(attackType, pokemon.types || []);

        if (multiplier > 1) weakCount++;
        if (multiplier < 1) resistCount++;

        const cell = document.createElement("td");
        cell.className = `coverageCell ${getMultiplierClass(multiplier)}`;
        cell.textContent = formatMultiplier(multiplier);
        cell.title = `${capitalize(pokemon.name)} takes ${multiplier}× from ${capitalize(attackType)}`;

        if (changedByAbility)
        {
            const marker = document.createElement("span");
            marker.className = "abilityMarker";
            marker.textContent = "*";
            cell.appendChild(marker);
            cell.title += ` (${formatAbilityLabel(pokemon.selectedAbility)})`;
        }

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
    legend.textContent = "Damage each member takes from each attacking type. * = changed by the member's ability (ignored by attackers with Mold Breaker and similar). Highlighted rows: more members weak than resistant.";
    panel.appendChild(legend);

    weaknessChart.replaceChildren(panel);
}

function getStatColor(value)
{
    if (value >= 90) return "#48c048";
    if (value >= 60) return "#f8d030";
    return "#e63946";
}

function formatAbilityOption(ability)
{
    const label = formatAbilityLabel(ability.name);
    return ability.isHidden ? `${label} (Hidden)` : label;
}

function markThreatReportStale()
{
    if (!threatReport.hasChildNodes()) return;
    threatReport.innerHTML = `<p class="emptyMessage">Your team changed. Scan again to update threats.</p>`;
}

// Re-renders only the chart so the dropdown keeps focus; displayTeam() would rebuild every card.
function changeAbility(pokemon, abilityName)
{
    pokemon.selectedAbility = abilityName;
    displayWeaknessChart();
    markThreatReportStale();
    saveTeam();
}

function buildAbilityPicker(pokemon)
{
    const container = document.createElement("div");
    container.className = "abilityText";

    if (pokemon.abilities.length <= 1)
    {
        const onlyAbility = pokemon.abilities[0];
        container.textContent = `Ability: ${onlyAbility ? formatAbilityOption(onlyAbility) : "Unknown"}`;
        return container;
    }

    container.textContent = "Ability:";

    const select = document.createElement("select");
    select.className = "abilitySelect";
    select.setAttribute("aria-label", `Ability for ${capitalize(pokemon.name)}`);

    pokemon.abilities.forEach(ability => {
        const option = document.createElement("option");
        option.value = ability.name;
        option.textContent = formatAbilityOption(ability);
        option.selected = ability.name === pokemon.selectedAbility;
        select.appendChild(option);
    });

    select.addEventListener("change", () => changeAbility(pokemon, select.value));
    container.appendChild(select);
    return container;
}

function displayTeam()
{
    displayWeaknessChart();

    if (team.length === 0)
    {
        teamContainer.innerHTML = `<p class="emptyMessage">Your team is empty. Search for a Pokémon and add it to your team!</p>`;
        return;
    }

    teamContainer.replaceChildren(...team.map((pokemon, index) => buildTeamCard(pokemon, index)));
}

// Team members are copies so choosing an ability never mutates the Pokédex row or search result they came from.
function createTeamMember(pokemon)
{
    return {
        id: pokemon.id,
        name: pokemon.name,
        showdownName: pokemon.showdownName,
        types: [...pokemon.types],
        image: pokemon.image,
        abilities: pokemon.abilities.map(ability => ({ ...ability })),
        stats: pokemon.stats.map(stat => ({ ...stat })),
        selectedAbility: getDefaultAbility(pokemon.abilities)
    };
}

function refreshPokedexTable()
{
    if (pokedexData.length === 0) return;
    renderPokedexTable(visiblePokedexData);
}

function addToTeam()
{
    if (!currentPokemon) return;

    if (team.length >= MAX_TEAM_SIZE)
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

    team.push(createTeamMember(currentPokemon));
    saveTeam();
    displayTeam();
    markThreatReportStale();
    refreshPokedexTable();
    showMessage(`${capitalize(currentPokemon.name)} added to your team!`);
}

function removeFromTeam(index)
{
    const removedPokemon = team[index];
    team.splice(index, 1);
    saveTeam();
    displayTeam();
    markThreatReportStale();
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
    const response = await fetch(`${POKE_API_BASE_URL}/pokemon/${query}`);
    if (response.ok) return response.json();
    if (response.status !== 404) throw new Error(`PokeAPI returned ${response.status}`);

    const speciesResponse = await fetch(`${POKE_API_BASE_URL}/pokemon-species/${query}`);
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

        currentPokemon = normalizePokemon(data);
        pokemonDisplay.replaceChildren(buildPokemonCard(currentPokemon));
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
    const randomId = Math.floor(Math.random() * POKEDEX_SIZE) + 1;
    pokemonInput.value = "";
    pokemonDisplay.innerHTML = `<p class="message">Getting a random Pokémon...</p>`;

    try
    {
        const response = await fetch(`${POKE_API_BASE_URL}/pokemon/${randomId}`);
        if (!response.ok) throw new Error("Not found");
        const data = await response.json();

        currentPokemon = normalizePokemon(data);
        pokemonDisplay.replaceChildren(buildPokemonCard(currentPokemon));
    }
    catch (error)
    {
        currentPokemon = null;
        pokemonDisplay.innerHTML = `<p class="message error">Failed to get random Pokémon.</p>`;
    }
}

function exportTeamToShowdown()
{
    if (team.length === 0)
    {
        showMessage("Your team is empty! Add some Pokémon before exporting.", true);
        return;
    }

    navigator.clipboard.writeText(generateShowdownText(team)).then(() => {
        exportBtn.textContent = "Copied!";
        exportBtn.classList.add("copied");
        setTimeout(() => {
            exportBtn.textContent = EXPORT_BUTTON_LABEL;
            exportBtn.classList.remove("copied");
        }, COPY_FEEDBACK_DURATION_MS);
    }).catch(() => {
        showMessage("Failed to copy to clipboard. Please try again.", true);
    });
}

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

function buildThreatCard(result)
{
    const card = document.createElement("div");
    card.className = result.covered ? "threatCard covered" : "threatCard danger";

    if (result.sprite)
    {
        const sprite = document.createElement("img");
        sprite.src = result.sprite;
        sprite.alt = result.name;
        sprite.className = "threatSprite";
        card.appendChild(sprite);
    }

    const name = document.createElement("p");
    name.className = "threatName";
    name.textContent = capitalize(result.name);

    const reason = document.createElement("p");
    reason.className = "threatReason";
    reason.textContent = result.threatReason;

    const status = document.createElement("span");
    status.className = `threatStatus ${result.covered ? "covered" : "danger"}`;
    status.textContent = result.covered ? "Covered" : "No Counter";

    card.append(
        name,
        buildTypeContainer(result.types),
        reason,
        buildThreatAnswerLine("Hits it super effectively", result.offensiveAnswers),
        buildThreatAnswerLine("Resists its STAB types", result.defensiveAnswers),
        status
    );
    return card;
}

async function scanForThreats()
{
    if (team.length === 0)
    {
        console.warn("Scan cannot be completed with empty team. Please add a Pokemon and try again.");
        threatReport.innerHTML = `<p class="emptyMessage">Your team is empty! Add some Pokémon to scan for threats.</p>`;
        return;
    }

    threatReport.innerHTML = `<p class="message">Scanning for threats...</p>`;

    const results = await checkTeamVulnerabilities(team, TOP_THREATS);
    threatReport.replaceChildren(...results.map(result => buildThreatCard(result)));
}

function bindEventListeners()
{
    searchBtn.addEventListener("click", searchPokemon);
    randomBtn.addEventListener("click", randomPokemon);
    pokemonInput.addEventListener("keydown", event => {
        if (event.key === "Enter") searchPokemon();
    });
    exportBtn.addEventListener("click", exportTeamToShowdown);
    scanBtn.addEventListener("click", scanForThreats);
    sortableHeaders.forEach(header => {
        header.addEventListener("click", () => toggleSort(header.dataset.key));
    });
}

bindEventListeners();
displayTeam();
loadPokedexData();
