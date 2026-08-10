const NICKNAMES = {
  mike: 'michael', mikey: 'michael', mick: 'michael', mickey: 'michael',
  rob: 'robert', robbie: 'robert', bob: 'robert', bobby: 'robert',
  will: 'william', willy: 'william', bill: 'william', billy: 'william',
  rich: 'richard', richie: 'richard', rick: 'richard', ricky: 'richard',
  jim: 'james', jimmy: 'james', jamie: 'james',
  johnny: 'john', jack: 'john',
  joe: 'joseph', joey: 'joseph',
  chuck: 'charles', charlie: 'charles',
  chris: 'christopher', topher: 'christopher',
  dan: 'daniel', danny: 'daniel',
  dave: 'david',
  eddie: 'edward', ted: 'edward', teddy: 'edward',
  tony: 'anthony',
  matt: 'matthew', matty: 'matthew',
  nick: 'nicholas', nicky: 'nicholas',
  ben: 'benjamin', benny: 'benjamin',
  alex: 'alexander', xander: 'alexander', alec: 'alexander',
  sam: 'samuel',
  tom: 'thomas', tommy: 'thomas',
  steve: 'steven', stevie: 'steven', stephen: 'steven',
  pat: 'patrick',
  ken: 'kenneth', kenny: 'kenneth',
  greg: 'gregory',
  hank: 'henry', harry: 'henry',
  larry: 'lawrence',
  vince: 'vincent', vinny: 'vincent',
  zack: 'zachary', zach: 'zachary',
  andy: 'andrew', drew: 'andrew',
  gabe: 'gabriel',
  nate: 'nathan',
  ollie: 'oliver',
  frankie: 'frank', franky: 'frank',
  theo: 'theodore',

  kate: 'katherine', katie: 'katherine', kathy: 'katherine', kat: 'katherine', kathleen: 'katherine', cathy: 'katherine', catherine: 'katherine',
  liz: 'elizabeth', beth: 'elizabeth', lizzie: 'elizabeth', betty: 'elizabeth', betsy: 'elizabeth',
  jen: 'jennifer', jenny: 'jennifer', jenn: 'jennifer',
  jess: 'jessica', jessie: 'jessica',
  maggie: 'margaret', meg: 'margaret', peggy: 'margaret',
  patty: 'patricia', tricia: 'patricia',
  becky: 'rebecca', becca: 'rebecca',
  deb: 'deborah', debbie: 'deborah',
  sue: 'susan', susie: 'susan',
  barb: 'barbara', barbie: 'barbara',
  christy: 'christina', tina: 'christina', chrissy: 'christina', christine: 'christina',
  kim: 'kimberly',
  mandy: 'amanda',
  steph: 'stephanie',
  liv: 'olivia', livvy: 'olivia',
  bella: 'isabella', izzy: 'isabella',
  abby: 'abigail',
  ally: 'alison', allie: 'alison',
  ella: 'eleanor', ellie: 'eleanor',
  emmy: 'emma',
  evie: 'evelyn',
  julie: 'julia',
  lily: 'lillian',
  lucy: 'lucille',
  mel: 'melissa',
  nikki: 'nicole',
  penny: 'penelope',
  sophie: 'sophia',
  vicky: 'victoria',
};

export function normalizeName(raw) {
  const cleaned = String(raw || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  if (!cleaned) return null;
  const parts = cleaned.split(' ');
  const first = NICKNAMES[parts[0]] || parts[0];
  const lastInitial = parts[1] ? parts[1][0] : '';
  const key = lastInitial ? `${first}-${lastInitial}` : first;
  return { key, first, lastInitial, raw: String(raw).trim() };
}
