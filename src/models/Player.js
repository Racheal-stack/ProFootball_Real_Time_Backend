import { supabase } from '../config/database.js';

class PlayerModel {
  async findByTeam(teamId) {
    const { data, error } = await supabase
      .from('players')
      .select('*')
      .eq('team_id', teamId);
    
    if (error) throw error;
    return data;
  }

  async findById(playerId) {
    const { data, error} = await supabase
      .from('players')
      .select('*')
      .eq('id', playerId)
      .single();
    
    if (error) {
      if (error.code === 'PGRST116') return null;
      throw error;
    }
    return data;
  }

  async getRandomPlayer(teamId) {
    const players = await this.findByTeam(teamId);
    if (!players || players.length === 0) return null;
    return players[Math.floor(Math.random() * players.length)];
  }
}

export default new PlayerModel();
