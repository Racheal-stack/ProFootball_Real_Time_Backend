import MatchModel from '../models/Match.js';
import TeamModel from '../models/Team.js';
import PlayerModel from '../models/Player.js';
import WebSocketManager from '../websocket/WebSocketManager.js';
import { supabase } from '../config/database.js';
import config from '../config/index.js';
import { 
  getRandomTeamPair, 
  randomBetween, 
  shouldEventOccur,
  getRandomElement
} from './utils.js';

class MatchSimulator {
  constructor() {
    this.activeMatches = new Map();
    this.simulatorSpeed = config.simulator.speed;
    this.tickInterval = null;
  }

  async start() {
    console.log('Starting match simulator...');
    
    // Create initial matches
    await this.initializeMatches();
    
    // Start simulation loop
    this.tickInterval = setInterval(() => {
      this.tick();
    }, 1000 * this.simulatorSpeed);

    console.log(`✓ Match simulator started (${this.activeMatches.size} matches)`);
  }

  async initializeMatches() {
    const numMatches = config.simulator.concurrentMatches;
    
    for (let i = 0; i < numMatches; i++) {
      const teamPair = getRandomTeamPair();
      
      try {
        const match = await MatchModel.create({
          homeTeamId: teamPair.homeId,
          awayTeamId: teamPair.awayId,
          competition: 'Premier League',
        });

        // Get team and player data
        const homeTeam = await TeamModel.findById(match.home_team_id);
        const awayTeam = await TeamModel.findById(match.away_team_id);
        const homePlayers = await PlayerModel.findByTeam(match.home_team_id);
        const awayPlayers = await PlayerModel.findByTeam(match.away_team_id);

        this.activeMatches.set(match.id, {
          id: match.id,
          homeTeamId: match.home_team_id,
          awayTeamId: match.away_team_id,
          homeTeam: homeTeam.name,
          awayTeam: awayTeam.name,
          homePlayers,
          awayPlayers,
          homeScore: 0,
          awayScore: 0,
          minute: 0,
          status: 'NOT_STARTED',
          nextEventTime: randomBetween(5, 10),
          homeSubstitutions: 0,
          awaySubstitutions: 0,
        });
      } catch (error) {
        console.error('Error creating match:', error);
      }
    }
  }

  tick() {
    this.activeMatches.forEach((match, matchId) => {
      this.processMatch(matchId, match);
    });
  }

  async processMatch(matchId, match) {
    // Progress match through different stages
    if (match.status === 'NOT_STARTED' && match.minute === 0) {
      match.status = 'FIRST_HALF';
      match.minute = 1;
      await this.updateMatchInDB(matchId, match);
      this.broadcastMatchUpdate(matchId, match, 'MATCH_STARTED');
      return;
    }

    if (match.status === 'FIRST_HALF') {
      match.minute++;
      
      // Check for events
      if (match.minute >= match.nextEventTime) {
        await this.generateEvent(matchId, match);
        match.nextEventTime = match.minute + randomBetween(2, 5);
      }

      // Half time
      if (match.minute >= 45) {
        match.status = 'HALF_TIME';
        await this.updateMatchInDB(matchId, match);
        this.broadcastMatchUpdate(matchId, match, 'HALF_TIME');
        
        // Reset for second half
        setTimeout(() => {
          match.status = 'SECOND_HALF';
          match.minute = 46;
          this.updateMatchInDB(matchId, match);
          this.broadcastMatchUpdate(matchId, match, 'SECOND_HALF_STARTED');
        }, 3000);
      }
    }

    if (match.status === 'SECOND_HALF') {
      match.minute++;
      
      // Check for events
      if (match.minute >= match.nextEventTime) {
        await this.generateEvent(matchId, match);
        match.nextEventTime = match.minute + randomBetween(2, 5);
      }

      // Full time
      if (match.minute >= 90) {
        match.status = 'FULL_TIME';
        await this.updateMatchInDB(matchId, match);
        this.broadcastMatchUpdate(matchId, match, 'FULL_TIME');
        
        // Remove match and create a new one
        setTimeout(async () => {
          this.activeMatches.delete(matchId);
          await this.createNewMatch();
        }, 5000);
      }
    }
  }

  async generateEvent(matchId, match) {
    const eventTypes = [
      { type: 'SHOT', probability: 0.37 },
      { type: 'FOUL', probability: 0.3 },
      { type: 'CORNER', probability: 0.14 },
      { type: 'YELLOW_CARD', probability: 0.08 },
      { type: 'GOAL', probability: 0.05 },
      { type: 'RED_CARD', probability: 0.01 },
      { type: 'SUBSTITUTION', probability: match.minute > 60 ? 0.02 : 0 },
    ];

    // Pick event type based on probabilities
    const rand = Math.random();
    let cumulative = 0;
    let selectedEvent = null;

    for (const event of eventTypes) {
      cumulative += event.probability;
      if (rand <= cumulative) {
        selectedEvent = event.type;
        break;
      }
    }

    if (!selectedEvent) return;

    const team = Math.random() > 0.5 ? 'home' : 'away';
    const teamName = team === 'home' ? match.homeTeam : match.awayTeam;
    const players = team === 'home' ? match.homePlayers : match.awayPlayers;
    
    if (!players || players.length === 0) return;
    
    const player = getRandomElement(players);

    const eventData = {
      type: selectedEvent,
      minute: match.minute,
      team,
      playerId: player.id,
      playerName: player.name,
      description: this.getEventDescription(selectedEvent, player.name, teamName),
    };

    // Handle goal
    if (selectedEvent === 'GOAL') {
      if (team === 'home') {
        match.homeScore++;
      } else {
        match.awayScore++;
      }
      await this.updateMatchInDB(matchId, match);
    }

    // Handle substitution
    if (selectedEvent === 'SUBSTITUTION') {
      if ((team === 'home' && match.homeSubstitutions >= 5) ||
          (team === 'away' && match.awaySubstitutions >= 5)) {
        return; // Max substitutions reached
      }
      
      if (team === 'home') {
        match.homeSubstitutions++;
      } else {
        match.awaySubstitutions++;
      }

      const playerOut = getRandomElement(players);
      eventData.description = `${player.name} replaces ${playerOut.name}`;
    }

    // Save event to database
    try {
      await MatchModel.addEvent(matchId, eventData);
      
      // Update statistics
      await this.updateStatistics(matchId, selectedEvent, team);
      
      // Broadcast event
      this.broadcastEvent(matchId, eventData, match);
    } catch (error) {
      console.error('Error generating event:', error);
    }
  }

  getEventDescription(type, playerName, teamName) {
    const descriptions = {
      GOAL: `⚽ GOAL! ${playerName} scores for ${teamName}!`,
      YELLOW_CARD: `🟨 Yellow card for ${playerName}`,
      RED_CARD: `🟥 Red card for ${playerName}`,
      SHOT: `Shot by ${playerName}`,
      FOUL: `Foul committed by ${playerName}`,
      CORNER: `Corner kick for ${teamName}`,
      SUBSTITUTION: `Substitution for ${teamName}`,
    };
    return descriptions[type] || `${type} - ${playerName}`;
  }

  async updateMatchInDB(matchId, match) {
    try {
      await MatchModel.update(matchId, {
        homeScore: match.homeScore,
        awayScore: match.awayScore,
        minute: match.minute,
        status: match.status,
      });
    } catch (error) {
      console.error('Error updating match:', error);
    }
  }

  async updateStatistics(matchId, eventType, team) {
    try {
      // First, get current stats
      const { data: currentStats } = await supabase
        .from('match_statistics')
        .select('*')
        .eq('match_id', matchId)
        .single();

      if (!currentStats) return;

      const updates = {};
      const prefix = team === 'home' ? 'home' : 'away';

      switch (eventType) {
        case 'SHOT':
          updates[`${prefix}_shots`] = currentStats[`${prefix}_shots`] + 1;
          if (shouldEventOccur(0.4)) {
            updates[`${prefix}_shots_on_target`] = currentStats[`${prefix}_shots_on_target`] + 1;
          }
          break;
        case 'CORNER':
          updates[`${prefix}_corners`] = currentStats[`${prefix}_corners`] + 1;
          break;
        case 'FOUL':
          updates[`${prefix}_fouls`] = currentStats[`${prefix}_fouls`] + 1;
          break;
        case 'YELLOW_CARD':
          updates[`${prefix}_yellow_cards`] = currentStats[`${prefix}_yellow_cards`] + 1;
          break;
        case 'RED_CARD':
          updates[`${prefix}_red_cards`] = currentStats[`${prefix}_red_cards`] + 1;
          break;
      }

      // Update possession slightly
      const possessionChange = randomBetween(-2, 2);
      const homePossession = 50 + possessionChange;
      updates.home_possession = Math.max(30, Math.min(70, homePossession));
      updates.away_possession = 100 - updates.home_possession;

      if (Object.keys(updates).length > 0) {
        const updatedStats = await MatchModel.updateStatistics(matchId, updates);
        if (updatedStats) {
          this.broadcastStatsUpdate(matchId, updatedStats);
        }
      }
    } catch (error) {
      console.error('Error updating statistics:', error);
    }
  }

  broadcastMatchUpdate(matchId, match, updateType) {
    WebSocketManager.broadcastToMatch(matchId, {
      type: 'match_update',
      updateType,
      data: {
        matchId,
        homeTeam: match.homeTeam,
        awayTeam: match.awayTeam,
        score: {
          home: match.homeScore,
          away: match.awayScore,
        },
        minute: match.minute,
        status: match.status,
      },
    });
  }

  broadcastEvent(matchId, event, match) {
    WebSocketManager.broadcastToMatch(matchId, {
      type: 'match_event',
      data: {
        matchId,
        event: {
          type: event.type,
          minute: event.minute,
          team: event.team,
          playerId: event.playerId,
          playerName: event.playerName,
          description: event.description,
        },
        currentScore: {
          home: match.homeScore,
          away: match.awayScore,
        },
      },
    });
  }

  broadcastStatsUpdate(matchId, stats) {
    const formattedStats = {
      matchId,
      statistics: {
        possession: {
          home: stats.home_possession,
          away: stats.away_possession,
        },
        shots: {
          home: stats.home_shots,
          away: stats.away_shots,
        },
        shotsOnTarget: {
          home: stats.home_shots_on_target,
          away: stats.away_shots_on_target,
        },
        corners: {
          home: stats.home_corners,
          away: stats.away_corners,
        },
        fouls: {
          home: stats.home_fouls,
          away: stats.away_fouls,
        },
        cards: {
          yellow: {
            home: stats.home_yellow_cards,
            away: stats.away_yellow_cards,
          },
          red: {
            home: stats.home_red_cards,
            away: stats.away_red_cards,
          },
        },
      },
    };

    WebSocketManager.broadcastToMatch(matchId, {
      type: 'stats_update',
      data: formattedStats,
    });

    return formattedStats;
  }

  async createNewMatch() {
    const teamPair = getRandomTeamPair();
    
    try {
      const match = await MatchModel.create({
        homeTeamId: teamPair.homeId,
        awayTeamId: teamPair.awayId,
        competition: 'Premier League',
      });

      // Get team and player data
      const homeTeam = await TeamModel.findById(match.home_team_id);
      const awayTeam = await TeamModel.findById(match.away_team_id);
      const homePlayers = await PlayerModel.findByTeam(match.home_team_id);
      const awayPlayers = await PlayerModel.findByTeam(match.away_team_id);

      this.activeMatches.set(match.id, {
        id: match.id,
        homeTeamId: match.home_team_id,
        awayTeamId: match.away_team_id,
        homeTeam: homeTeam.name,
        awayTeam: awayTeam.name,
        homePlayers,
        awayPlayers,
        homeScore: 0,
        awayScore: 0,
        minute: 0,
        status: 'NOT_STARTED',
        nextEventTime: randomBetween(5, 10),
        homeSubstitutions: 0,
        awaySubstitutions: 0,
      });

      console.log(`New match created: ${homeTeam.name} vs ${awayTeam.name}`);
    } catch (error) {
      console.error('Error creating new match:', error);
    }
  }

  stop() {
    if (this.tickInterval) {
      clearInterval(this.tickInterval);
      this.tickInterval = null;
    }
    console.log('Match simulator stopped');
  }

  getActiveMatches() {
    return Array.from(this.activeMatches.values());
  }
}

export default new MatchSimulator();
