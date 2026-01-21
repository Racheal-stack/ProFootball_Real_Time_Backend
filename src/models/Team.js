import { supabase } from '../config/database.js';

class TeamModel {
  async findAll() {
    const { data, error } = await supabase
      .from('teams')
      .select('*')
      .order('name');
    
    if (error) throw error;
    return data;
  }

  async findById(teamId) {
    const { data, error } = await supabase
      .from('teams')
      .select(`
        *,
        players(*)
      `)
      .eq('id', teamId)
      .single();
    
    if (error) {
      if (error.code === 'PGRST116') return null;
      throw error;
    }
    return data;
  }

  async findByName(name) {
    const { data, error } = await supabase
      .from('teams')
      .select('*')
      .eq('name', name)
      .single();
    
    if (error) {
      if (error.code === 'PGRST116') return null;
      throw error;
    }
    return data;
  }

  async getPlayers(teamId) {
    const { data, error } = await supabase
      .from('players')
      .select('*')
      .eq('team_id', teamId);
    
    if (error) throw error;
    return data;
  }
}

export default new TeamModel();
