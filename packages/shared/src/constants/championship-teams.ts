/**
 * Championship teams from NFL, NHL, MLB, and NCAA Football (2012–2026).
 * Used for PII-safe user/clinic aliases — no real names ever leave the system.
 *
 * Each entry: { team, league, year }
 * Deduplicated by team name — repeat champions appear once with their most recent year.
 */

export interface ChampionshipTeam {
  team: string;
  league: 'NFL' | 'NHL' | 'MLB' | 'NCAA';
  year: number;
}

export const CHAMPIONSHIP_TEAMS: ChampionshipTeam[] = [
  // NFL Super Bowl Champions
  { team: 'Baltimore Ravens', league: 'NFL', year: 2012 },
  { team: 'Seattle Seahawks', league: 'NFL', year: 2013 },
  { team: 'New England Patriots', league: 'NFL', year: 2018 },
  { team: 'Denver Broncos', league: 'NFL', year: 2015 },
  { team: 'Philadelphia Eagles', league: 'NFL', year: 2024 },
  { team: 'Kansas City Chiefs', league: 'NFL', year: 2023 },
  { team: 'Tampa Bay Buccaneers', league: 'NFL', year: 2020 },
  { team: 'Los Angeles Rams', league: 'NFL', year: 2021 },

  // NHL Stanley Cup Champions
  { team: 'Los Angeles Kings', league: 'NHL', year: 2014 },
  { team: 'Chicago Blackhawks', league: 'NHL', year: 2015 },
  { team: 'Pittsburgh Penguins', league: 'NHL', year: 2017 },
  { team: 'Washington Capitals', league: 'NHL', year: 2018 },
  { team: 'St. Louis Blues', league: 'NHL', year: 2019 },
  { team: 'Tampa Bay Lightning', league: 'NHL', year: 2021 },
  { team: 'Colorado Avalanche', league: 'NHL', year: 2022 },
  { team: 'Vegas Golden Knights', league: 'NHL', year: 2023 },
  { team: 'Florida Panthers', league: 'NHL', year: 2024 },

  // MLB World Series Champions
  { team: 'San Francisco Giants', league: 'MLB', year: 2014 },
  { team: 'Boston Red Sox', league: 'MLB', year: 2018 },
  { team: 'Kansas City Royals', league: 'MLB', year: 2015 },
  { team: 'Chicago Cubs', league: 'MLB', year: 2016 },
  { team: 'Houston Astros', league: 'MLB', year: 2022 },
  { team: 'Washington Nationals', league: 'MLB', year: 2019 },
  { team: 'Los Angeles Dodgers', league: 'MLB', year: 2024 },
  { team: 'Atlanta Braves', league: 'MLB', year: 2021 },
  { team: 'Texas Rangers', league: 'MLB', year: 2023 },

  // NCAA Football Champions (CFP/BCS)
  { team: 'Alabama Crimson Tide', league: 'NCAA', year: 2020 },
  { team: 'Florida State Seminoles', league: 'NCAA', year: 2013 },
  { team: 'Ohio State Buckeyes', league: 'NCAA', year: 2024 },
  { team: 'Clemson Tigers', league: 'NCAA', year: 2018 },
  { team: 'LSU Tigers', league: 'NCAA', year: 2019 },
  { team: 'Georgia Bulldogs', league: 'NCAA', year: 2022 },
  { team: 'Michigan Wolverines', league: 'NCAA', year: 2023 },
];

/**
 * Assign a championship team alias based on a string identifier.
 * Uses a simple hash for deterministic, reproducible assignment.
 *
 * @param identifier - Any string (clinic name, phone number, user ID, etc.)
 *                     If it looks like a multi-word name, initials are extracted first
 *                     and used to seed the selection for consistency.
 * @returns A ChampionshipTeam object
 */
export function assignTeamAlias(identifier: string): ChampionshipTeam {
  // Extract initials from multi-word strings (e.g., "Metro Physical Therapy" → "MPT")
  const words = identifier.trim().split(/\s+/);
  const seed = words.length > 1
    ? words.map(w => w[0] || '').join('').toUpperCase()
    : identifier;

  // Simple deterministic hash (djb2)
  let hash = 5381;
  for (let i = 0; i < seed.length; i++) {
    hash = ((hash << 5) + hash + seed.charCodeAt(i)) >>> 0;
  }

  return CHAMPIONSHIP_TEAMS[hash % CHAMPIONSHIP_TEAMS.length]!;
}

/**
 * Get just the team name string from an identifier.
 */
export function getTeamAliasName(identifier: string): string {
  return assignTeamAlias(identifier).team;
}
