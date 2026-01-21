import { supabase } from '../config/database.js';
import { v4 as uuidv4 } from 'uuid';

class MatchModel {
  async findAll() {
    const { data, error } = await supabase
      .from('matches')
      .select(`
        *,
        home_team:teams!matches_home_team_id_fkey(*),
        away_team:teams!matches_away_team_id_fkey(*)
      `)
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    return data;
  }

  async findById(matchId) {
    const { data, error } = await supabase
      .from('matches')
      .select(`
        *,
        home_team:teams!matches_home_team_id_fkey(*),
        away_team:teams!matches_away_team_id_fkey(*),
        events:match_events(*, player:players(*)),
        statistics:match_statistics(*)
      `)
      .eq('id', matchId)
      .single();
    
    if (error) {
      if (error.code === 'PGRST116') return null; // Not found
      throw error;
    }
    return data;
  }

  async create(matchData) {
    const match = {
      id: uuidv4(),
      home_team_id: matchData.homeTeamId,
      away_team_id: matchData.awayTeamId,
      home_score: 0,
      away_score: 0,
      minute: 0,
      status: 'NOT_STARTED',
      competition: matchData.competition || 'Premier League',
    };

    const { data, error } = await supabase
      .from('matches')
      .insert([match])
      .select(`
        *,
        home_team:teams!matches_home_team_id_fkey(*),
        away_team:teams!matches_away_team_id_fkey(*)
      `)
      .single();
    
    if (error) throw error;

    // Create initial statistics
    await this.createStatistics(data.id);
    
    return data;
  }

  async update(matchId, updates) {
    const updateData = {};
    
    if (updates.homeScore !== undefined) updateData.home_score = updates.homeScore;
    if (updates.awayScore !== undefined) updateData.away_score = updates.awayScore;
    if (updates.minute !== undefined) updateData.minute = updates.minute;
    if (updates.status !== undefined) updateData.status = updates.status;

    const { data, error } = await supabase
      .from('matches')
      .update(updateData)
      .eq('id', matchId)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  }

  async createStatistics(matchId) {
    const stats = {
      match_id: matchId,
      home_possession: 50,
      away_possession: 50,
      home_shots: 0,
      away_shots: 0,
      home_shots_on_target: 0,
      away_shots_on_target: 0,
      home_corners: 0,
      away_corners: 0,
      home_fouls: 0,
      away_fouls: 0,
      home_yellow_cards: 0,
      away_yellow_cards: 0,
      home_red_cards: 0,
      away_red_cards: 0,
    };

    const { data, error } = await supabase
      .from('match_statistics')
      .insert([stats])
      .select()
      .single();
    
    if (error) throw error;
    return data;
  }

  async updateStatistics(matchId, stats) {
    const { data, error } = await supabase
      .from('match_statistics')
      .update(stats)
      .eq('match_id', matchId)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  }

  async addEvent(matchId, eventData) {
    const event = {
      id: uuidv4(),
      match_id: matchId,
      event_type: eventData.type,
      minute: eventData.minute,
      team: eventData.team,
      player_id: eventData.playerId || null,
      description: eventData.description || null,
      metadata: eventData.metadata || null,
    };

    const { data, error } = await supabase
      .from('match_events')
      .insert([event])
      .select(`
        *,
        player:players(*)
      `)
      .single();
    
    if (error) throw error;
    return data;
  }

  async getEvents(matchId) {
    const { data, error } = await supabase
      .from('match_events')
      .select('*')
      .eq('match_id', matchId)
      .order('minute', { ascending: true });
    
    if (error) throw error;
    return data;
  }

  async delete(matchId) {
    const { error } = await supabase
      .from('matches')
      .delete()
      .eq('id', matchId);
    
    if (error) throw error;
  }
}

export default new MatchModel();
