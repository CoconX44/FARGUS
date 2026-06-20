const RARITY_WEIGHTS = { trash: 5, common: 55, uncommon: 25, rare: 12, legendary: 3 };

const RARITY_COLORS = {
  trash:     0x95a5a6,
  common:    0x2ecc71,
  uncommon:  0x3498db,
  rare:      0x9b59b6,
  legendary: 0xf1c40f,
};

const RARITY_LABELS = {
  trash:     '🗑️ Trash',
  common:    '⚪ Common',
  uncommon:  '🔵 Uncommon',
  rare:      '🟣 Rare',
  legendary: '🌟 Legendary',
};

const FISH_TYPES = [
  // Trash
  { id: 'boot',      name: 'Old Boot',      emoji: '👢', rarity: 'trash',     baseValue: 1,    min: 0.3,  max: 0.8  },
  { id: 'can',       name: 'Rusty Can',     emoji: '🥫', rarity: 'trash',     baseValue: 1,    min: 0.1,  max: 0.4  },
  // Common
  { id: 'sardine',   name: 'Sardine',       emoji: '🐟', rarity: 'common',    baseValue: 8,    min: 0.1,  max: 0.5  },
  { id: 'tilapia',   name: 'Tilapia',       emoji: '🐠', rarity: 'common',    baseValue: 12,   min: 0.3,  max: 1.2  },
  { id: 'carp',      name: 'Carp',          emoji: '🐡', rarity: 'common',    baseValue: 10,   min: 0.5,  max: 2.0  },
  // Uncommon
  { id: 'bass',      name: 'Bass',          emoji: '🐟', rarity: 'uncommon',  baseValue: 35,   min: 1.0,  max: 3.5  },
  { id: 'trout',     name: 'Trout',         emoji: '🐡', rarity: 'uncommon',  baseValue: 40,   min: 1.5,  max: 4.0  },
  { id: 'salmon',    name: 'Salmon',        emoji: '🐠', rarity: 'uncommon',  baseValue: 55,   min: 2.0,  max: 6.0  },
  // Rare
  { id: 'swordfish', name: 'Swordfish',     emoji: '🗡️', rarity: 'rare',      baseValue: 150,  min: 8.0,  max: 20.0 },
  { id: 'tuna',      name: 'Tuna',          emoji: '🐟', rarity: 'rare',      baseValue: 180,  min: 10.0, max: 25.0 },
  { id: 'shark',     name: 'Baby Shark',    emoji: '🦈', rarity: 'rare',      baseValue: 220,  min: 15.0, max: 40.0 },
  // Legendary
  { id: 'goldenkoi', name: 'Golden Koi',    emoji: '✨', rarity: 'legendary', baseValue: 600,  min: 1.0,  max: 5.0  },
  { id: 'krakenarm', name: 'Kraken Arm',    emoji: '🦑', rarity: 'legendary', baseValue: 900,  min: 15.0, max: 50.0 },
  { id: 'mermaid',   name: 'Mermaid Scale', emoji: '💎', rarity: 'legendary', baseValue: 1200, min: 0.1,  max: 0.5  },
];

function pickRandomFish() {
  const total = Object.values(RARITY_WEIGHTS).reduce((a, b) => a + b, 0);
  let roll = Math.random() * total;
  let rarity = 'common';
  for (const [r, w] of Object.entries(RARITY_WEIGHTS)) {
    roll -= w;
    if (roll <= 0) { rarity = r; break; }
  }

  const pool = FISH_TYPES.filter(f => f.rarity === rarity);
  const fish = pool[Math.floor(Math.random() * pool.length)];
  const weight = +(fish.min + Math.random() * (fish.max - fish.min)).toFixed(2);
  const avgWeight = (fish.min + fish.max) / 2;
  const value = Math.max(1, Math.round(fish.baseValue * (weight / avgWeight)));

  return { id: fish.id, name: fish.name, emoji: fish.emoji, rarity, weight, value };
}

module.exports = { FISH_TYPES, RARITY_COLORS, RARITY_LABELS, pickRandomFish };
