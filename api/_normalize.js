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
  josh: 'joshua', joshy: 'joshua',
  jeff: 'jeffrey', jeffy: 'jeffrey',
  doug: 'douglas',
  brad: 'bradley',
  tim: 'timothy', timmy: 'timothy',
  fred: 'frederick', freddie: 'frederick', freddy: 'frederick',
  phil: 'philip', philly: 'philip', phillip: 'philip',
  russ: 'russell',
  curt: 'curtis',
  cliff: 'clifford',
  ron: 'ronald', ronny: 'ronald', ronnie: 'ronald',
  gerry: 'gerald', jerry: 'gerald',
  marty: 'martin',
  mo: 'maurice',
  jon: 'jonathan',
  wes: 'wesley',
  cam: 'cameron',
  conor: 'connor',
  reggie: 'reginald',
  raj: 'rajesh',
  stan: 'stanley',
  louie: 'louis', lou: 'louis',
  moe: 'maurice',

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
  angie: 'angela',
  val: 'valerie',
  tess: 'teresa', tessa: 'teresa',
  fran: 'frances', franny: 'frances',
  gerri: 'geraldine',
  connie: 'constance',
  dolly: 'dorothy', dot: 'dorothy', dottie: 'dorothy',
  edie: 'edith',
  hetty: 'henrietta',
  jodi: 'josephine', jody: 'josephine',
  josie: 'josephine',
  millie: 'mildred',
  molly: 'mary', polly: 'mary',
  trudy: 'gertrude',
};

const KNOWN_NAMES = new Set([...Object.keys(NICKNAMES), ...Object.values(NICKNAMES)]);

export function damerauLevenshtein(a, b) {
  if (a === b) return 0;
  const m = a.length, n = b.length;
  if (Math.abs(m - n) > 2) return 99;
  const d = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));
  for (let i = 0; i <= m; i++) d[i][0] = i;
  for (let j = 0; j <= n; j++) d[0][j] = j;
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      d[i][j] = Math.min(
        d[i - 1][j] + 1,
        d[i][j - 1] + 1,
        d[i - 1][j - 1] + cost
      );
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) {
        d[i][j] = Math.min(d[i][j], d[i - 2][j - 2] + 1);
      }
    }
  }
  return d[m][n];
}

export function similarFirstnames(a, b, minLen = 3) {
  if (a === b) return false;
  if (a.length < minLen || b.length < minLen) return false;
  if (a[0] !== b[0]) return false;
  if (a[1] !== b[1]) return false;
  return damerauLevenshtein(a, b) <= 1;
}

function fuzzyKnownName(name) {
  if (name.length < 5) return null;
  for (const candidate of KNOWN_NAMES) {
    if (similarFirstnames(name, candidate, 5)) return candidate;
  }
  return null;
}

export function normalizeName(raw) {
  const cleaned = String(raw || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  if (!cleaned) return null;
  const parts = cleaned.split(' ');
  let first = parts[0];
  if (NICKNAMES[first]) {
    first = NICKNAMES[first];
  } else if (!KNOWN_NAMES.has(first)) {
    const fuzzy = fuzzyKnownName(first);
    if (fuzzy) first = NICKNAMES[fuzzy] || fuzzy;
  }
  const lastInitial = parts[1] ? parts[1][0] : '';
  const key = lastInitial ? `${first}-${lastInitial}` : first;
  return { key, first, lastInitial, raw: String(raw).trim() };
}
