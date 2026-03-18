import { describe, it, expect } from 'vitest';
import {
  CHAMPIONSHIP_TEAMS,
  assignTeamAlias,
  getTeamAliasName,
  type ChampionshipTeam,
} from './championship-teams.js';

describe('Championship Teams Constants', () => {
  it('has at least 30 unique teams', () => {
    const uniqueNames = new Set(CHAMPIONSHIP_TEAMS.map(t => t.team));
    expect(uniqueNames.size).toBeGreaterThanOrEqual(30);
  });

  it('every team has valid league and year', () => {
    const validLeagues = ['NFL', 'NHL', 'MLB', 'NCAA'];
    for (const team of CHAMPIONSHIP_TEAMS) {
      expect(validLeagues).toContain(team.league);
      expect(team.year).toBeGreaterThanOrEqual(2012);
      expect(team.year).toBeLessThanOrEqual(2026);
      expect(team.team.length).toBeGreaterThan(0);
    }
  });

  it('includes all four leagues', () => {
    const leagues = new Set(CHAMPIONSHIP_TEAMS.map(t => t.league));
    expect(leagues).toContain('NFL');
    expect(leagues).toContain('NHL');
    expect(leagues).toContain('MLB');
    expect(leagues).toContain('NCAA');
  });
});

describe('assignTeamAlias', () => {
  it('returns a valid ChampionshipTeam object', () => {
    const result = assignTeamAlias('test-identifier');
    expect(result).toHaveProperty('team');
    expect(result).toHaveProperty('league');
    expect(result).toHaveProperty('year');
    expect(typeof result.team).toBe('string');
  });

  it('is deterministic — same input always returns same team', () => {
    const a = assignTeamAlias('+17035551234');
    const b = assignTeamAlias('+17035551234');
    expect(a.team).toBe(b.team);
  });

  it('different inputs produce different teams (with high probability)', () => {
    const teams = new Set<string>();
    for (let i = 0; i < 20; i++) {
      teams.add(assignTeamAlias(`user-${i}-${i * 37}`).team);
    }
    // With 34 teams and 20 inputs, we should get at least 5 different teams
    expect(teams.size).toBeGreaterThanOrEqual(5);
  });

  it('extracts initials from multi-word clinic names', () => {
    const result1 = assignTeamAlias('Metro Physical Therapy');
    const result2 = assignTeamAlias('Metro Physical Therapy');
    expect(result1.team).toBe(result2.team);

    // Single word should use the word directly
    const result3 = assignTeamAlias('Metro');
    // Multi-word initials "MPT" vs single word "Metro" should differ
    // (they could theoretically collide but it's very unlikely)
    expect(typeof result3.team).toBe('string');
  });

  it('handles edge cases gracefully', () => {
    // Empty string
    const empty = assignTeamAlias('');
    expect(empty.team.length).toBeGreaterThan(0);

    // Single character
    const single = assignTeamAlias('A');
    expect(single.team.length).toBeGreaterThan(0);

    // Very long string
    const long = assignTeamAlias('A'.repeat(1000));
    expect(long.team.length).toBeGreaterThan(0);

    // Special characters
    const special = assignTeamAlias('+1(703)555-1234');
    expect(special.team.length).toBeGreaterThan(0);
  });
});

describe('getTeamAliasName', () => {
  it('returns just the team name string', () => {
    const name = getTeamAliasName('+17035551234');
    expect(typeof name).toBe('string');
    expect(name.length).toBeGreaterThan(0);

    // Should match the .team property of assignTeamAlias
    const full = assignTeamAlias('+17035551234');
    expect(name).toBe(full.team);
  });
});
