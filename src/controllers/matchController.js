import MatchModel from '../models/Match.js';
import { successResponse, errorResponse } from '../utils/response.js';

class MatchController {
  async getAllMatches(req, res) {
    try {
      const matches = await MatchModel.findAll();
      
      // Transform to match the expected format
      const formattedMatches = matches.map(match => ({
        id: match.id,
        homeTeam: match.home_team?.name || 'Unknown',
        awayTeam: match.away_team?.name || 'Unknown',
        score: {
          home: match.home_score,
          away: match.away_score,
        },
        minute: match.minute,
        status: match.status,
        competition: match.competition,
        stadium: match.home_team?.stadium || null,
      }));

      res.json(successResponse(formattedMatches));
    } catch (error) {
      console.error('Error fetching matches:', error);
      res.status(500).json(errorResponse('Failed to fetch matches'));
    }
  }

  async getMatchById(req, res) {
    try {
      const { id } = req.params;
      
      if (!id) {
        return res.status(400).json(errorResponse('Match ID is required', 400));
      }

      const match = await MatchModel.findById(id);
      
      if (!match) {
        return res.status(404).json(errorResponse('Match not found', 404));
      }

      // Format the response
      const formattedMatch = {
        id: match.id,
        homeTeam: match.home_team?.name || 'Unknown',
        awayTeam: match.away_team?.name || 'Unknown',
        score: {
          home: match.home_score,
          away: match.away_score,
        },
        minute: match.minute,
        status: match.status,
        competition: match.competition,
        stadium: match.home_team?.stadium || null,
        events: match.events?.map(event => ({
          id: event.id,
          type: event.event_type,
          minute: event.minute,
          team: event.team,
          playerName: event.player?.name || 'Unknown Player',
          playerId: event.player_id,
          description: event.description,
          timestamp: event.created_at,
        })) || [],
        statistics: match.statistics?.[0] ? {
          possession: {
            home: match.statistics[0].home_possession,
            away: match.statistics[0].away_possession,
          },
          shots: {
            home: match.statistics[0].home_shots,
            away: match.statistics[0].away_shots,
          },
          shotsOnTarget: {
            home: match.statistics[0].home_shots_on_target,
            away: match.statistics[0].away_shots_on_target,
          },
          corners: {
            home: match.statistics[0].home_corners,
            away: match.statistics[0].away_corners,
          },
          fouls: {
            home: match.statistics[0].home_fouls,
            away: match.statistics[0].away_fouls,
          },
          cards: {
            yellow: {
              home: match.statistics[0].home_yellow_cards,
              away: match.statistics[0].away_yellow_cards,
            },
            red: {
              home: match.statistics[0].home_red_cards,
              away: match.statistics[0].away_red_cards,
            },
          },
        } : null,
      };

      res.json(successResponse(formattedMatch));
    } catch (error) {
      console.error('Error fetching match:', error);
      res.status(500).json(errorResponse('Failed to fetch match details'));
    }
  }
}

export default new MatchController();
