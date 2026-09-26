// Abilities that change how much damage a Pokemon takes from an attacking type, keyed by PokeAPI slug.
// Left out on purpose: conditional abilities (Multiscale, Shadow Shield, Tera Shell, Ice Scales),
// weather abilities (Delta Stream), and move-based ones (Bulletproof, Soundproof, Wind Rider).
const ABILITY_DAMAGE_MODIFIERS = {
    "levitate":        { ground: 0 },
    "earth-eater":     { ground: 0 },
    "flash-fire":      { fire: 0 },
    "well-baked-body": { fire: 0 },
    "water-absorb":    { water: 0 },
    "storm-drain":     { water: 0 },
    "dry-skin":        { water: 0, fire: 1.25 },
    "volt-absorb":     { electric: 0 },
    "lightning-rod":   { electric: 0 },
    "motor-drive":     { electric: 0 },
    "sap-sipper":      { grass: 0 },
    "thick-fat":       { fire: 0.5, ice: 0.5 },
    "heatproof":       { fire: 0.5 },
    "water-bubble":    { fire: 0.5 },
    "purifying-salt":  { ghost: 0.5 },
    "fluffy":          { fire: 2 }
};

// Multiply super-effective damage by 0.75.
const SUPER_EFFECTIVE_REDUCERS = new Set(["filter", "solid-rock", "prism-armor"]);

// Only super-effective hits land.
const WONDER_GUARD = "wonder-guard";
