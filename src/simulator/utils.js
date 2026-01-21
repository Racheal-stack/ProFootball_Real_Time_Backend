// Team IDs from seed data
const TEAM_PAIRS = [
  { 
    homeId: '11111111-1111-1111-1111-111111111111', 
    awayId: '22222222-2222-2222-2222-222222222222' 
  },
  { 
    homeId: '33333333-3333-3333-3333-333333333333', 
    awayId: '44444444-4444-4444-4444-444444444444' 
  },
  { 
    homeId: '55555555-5555-5555-5555-555555555555', 
    awayId: '66666666-6666-6666-6666-666666666666' 
  },
  { 
    homeId: '77777777-7777-7777-7777-777777777777', 
    awayId: '88888888-8888-8888-8888-888888888888' 
  },
  { 
    homeId: '99999999-9999-9999-9999-999999999999', 
    awayId: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa' 
  },
];

export const getRandomTeamPair = () => {
  return TEAM_PAIRS[Math.floor(Math.random() * TEAM_PAIRS.length)];
};

export const getRandomElement = (array) => {
  return array[Math.floor(Math.random() * array.length)];
};

export const randomBetween = (min, max) => {
  return Math.floor(Math.random() * (max - min + 1)) + min;
};

export const shouldEventOccur = (probability) => {
  return Math.random() < probability;
};
