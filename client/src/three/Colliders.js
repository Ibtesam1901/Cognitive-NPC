/**
 * Colliders.js
 * Axis-Aligned Bounding Box (AABB) and Cylinder obstacle registry for Bhima's Hollow.
 * Used by PlayerController to prevent walking through buildings, trees, fences, and well.
 */

export const VILLAGE_OBSTACLES = [
  // Farmhouse Main Structure (centered around [0.2, 0.3, -2.0])
  { id: "farmhouse", type: "box", minX: -2.3, maxX: 2.7, minZ: -3.8, maxZ: -0.2 },
  
  // Farmhouse Verandah Base & Charpai area
  { id: "verandah_left", type: "box", minX: -2.2, maxX: -0.6, minZ: -0.2, maxZ: 1.5 },
  { id: "verandah_right", type: "box", minX: 0.8, maxX: 2.6, minZ: -0.2, maxZ: 1.5 },

  // Cattle Barn & Lakshmi (centered at [5.2, 0, 0.2])
  { id: "cattle_barn", type: "box", minX: 3.5, maxX: 7.0, minZ: -1.8, maxZ: 2.2 },

  // Ancient Stone Well (at North Grove Spring Glade [3.8, 0, -4.5])
  { id: "stone_well", type: "cylinder", x: 3.8, z: -4.5, radius: 1.15 },

  // Irrigation Canal Trench (running z: -5.5 to 5.5 at x: 2.4)
  { id: "canal_pump", type: "box", minX: 1.8, maxX: 3.2, minZ: -3.0, maxZ: -1.8 },

  // Ancient Banyan Tree trunk (at [-6.2, 0, -7.0])
  { id: "banyan_tree", type: "cylinder", x: -6.2, z: -7.0, radius: 2.2 },

  // Raghu Character Collision (at [0.2, 0, 1.6])
  { id: "raghu_npc", type: "cylinder", x: 0.2, z: 1.6, radius: 0.65 },

  // Village Market & Trading Post (situated on East road [9.5, 0, 0.5])
  { id: "market_stall_main", type: "box", minX: 8.0, maxX: 11.2, minZ: -1.2, maxZ: 2.2 },
  { id: "market_stall_grain", type: "box", minX: 8.5, maxX: 10.8, minZ: 2.8, maxZ: 5.2 },

  // Village Windmill (centered at [6.5, 0, -8.5])
  { id: "windmill_tower", type: "cylinder", x: 6.5, z: -8.5, radius: 1.6 },

  // Cooking Chulha (at [-2.8, 0, 1.4])
  { id: "chulha_hearth", type: "box", minX: -3.4, maxX: -2.2, minZ: 0.9, maxZ: 1.9 },

  // Village Campfire & Rest Bench (at [1.6, 0, 3.6])
  { id: "campfire_bench", type: "box", minX: 1.0, maxX: 2.2, minZ: 3.2, maxZ: 4.6 },

  // Expanded North Border Wall & Dense Forest Trees
  { id: "north_boundary", type: "box", minX: -18, maxX: 18, minZ: -16.5, maxZ: -14.8 },
  // Expanded South Boundary
  { id: "south_boundary", type: "box", minX: -18, maxX: 18, minZ: 14.8, maxZ: 17 },
  // Expanded West Boundary
  { id: "west_boundary", type: "box", minX: -16.8, maxX: -14.8, minZ: -16, maxZ: 16 },
  // Expanded East Boundary
  { id: "east_boundary", type: "box", minX: 14.8, maxX: 16.8, minZ: -16, maxZ: 16 },

  // Key Trees around perimeter
  { id: "tree_east_1", type: "cylinder", x: 6.8, z: -4.5, radius: 0.7 },
  { id: "tree_east_2", type: "cylinder", x: 12.5, z: -2.5, radius: 0.7 },
  { id: "tree_east_3", type: "cylinder", x: 12.5, z: 3.5, radius: 0.7 },
  { id: "tree_west_1", type: "cylinder", x: -10.8, z: -4.5, radius: 0.7 },
  { id: "tree_west_2", type: "cylinder", x: -10.5, z: -1.0, radius: 0.7 },
  { id: "tree_west_3", type: "cylinder", x: -10.5, z: 2.5, radius: 0.7 },
];

/**
 * Checks if a given position [x, z] with player radius collides with any village obstacle
 * @param {number} x
 * @param {number} z
 * @param {number} playerRadius - Collision radius of the player (default 0.35m)
 * @returns {boolean} True if collides
 */
export function checkCollision(x, z, playerRadius = 0.35) {
  for (const obs of VILLAGE_OBSTACLES) {
    if (obs.type === "box") {
      // Check expanded AABB with player radius
      if (
        x + playerRadius > obs.minX &&
        x - playerRadius < obs.maxX &&
        z + playerRadius > obs.minZ &&
        z - playerRadius < obs.maxZ
      ) {
        return true;
      }
    } else if (obs.type === "cylinder") {
      const dx = x - obs.x;
      const dz = z - obs.z;
      const distSq = dx * dx + dz * dz;
      const minDist = obs.radius + playerRadius;
      if (distSq < minDist * minDist) {
        return true;
      }
    }
  }
  return false;
}
