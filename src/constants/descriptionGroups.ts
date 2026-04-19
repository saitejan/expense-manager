/**
 * Description grouping rules for smart spend analysis.
 * Generated from historical transaction data.
 *
 * Each rule has a display name and keyword patterns (lowercased).
 * A description matches if it contains ANY of the keywords.
 * Rules are checked in order — first match wins.
 * Put more specific rules before broader ones.
 */

interface GroupRule {
  group: string;
  keywords: string[];
}

export const DESCRIPTION_GROUP_RULES: GroupRule[] = [
  // ── Grocery & Retail Stores ──────────────────────────────
  { group: 'KPN Fresh',           keywords: ['kpn fresh', 'kpn and reliance', 'kpn and instamart'] },
  { group: 'JioMart',             keywords: ['jiomart'] },
  { group: 'DMart',               keywords: ['dmart', 'd mart'] },
  { group: 'Big Basket',          keywords: ['big basket'] },
  { group: 'Blinkit',             keywords: ['blinkit'] },
  { group: 'Zepto',               keywords: ['zepto'] },
  { group: 'Instamart',           keywords: ['instamart'] },
  { group: 'Reliance',            keywords: ['reliance shopping', 'reliance smart'] },
  { group: 'Vishal Mart',         keywords: ['vishal mart'] },
  { group: 'Families Hypermart',  keywords: ['families hypermart'] },
  { group: 'Siri Supermarket',    keywords: ['siri supermarket'] },
  { group: 'Start Hypermarket',   keywords: ['start hypermarket'] },
  { group: 'Heritage',            keywords: ['at heritage', 'shopping at heritage'] },
  { group: 'More Supermarket',    keywords: ['more supermarket'] },
  { group: 'Lulu Hypermarket',    keywords: ['lulu hypermarket'] },
  { group: 'Star Bazaar',         keywords: ['star bazaar'] },
  { group: 'Kirana Store',        keywords: ['kirana store'] },
  { group: 'Gopal Store',         keywords: ['gopal general store', 'gopal store', 'gopal general'] },
  { group: 'Bmart',               keywords: ['bmart'] },
  { group: 'General Store',       keywords: ['general store'] },
  { group: 'Supermarket',         keywords: ['at supermarket'] },
  { group: 'Westside',            keywords: ['westside'] },

  // ── Online Shopping ──────────────────────────────────────
  { group: 'Flipkart',            keywords: ['flipkart minutes', 'flipkart grocery', 'shopping in flipkart', 'groceries on flipkart', 'flipkart table', 'flipkart'] },
  { group: 'Amazon',              keywords: ['amazon shopping', 'amazon', 'in amazon'] },
  { group: 'Meesho',              keywords: ['meesho'] },
  { group: 'Firstcry',            keywords: ['firstcry'] },
  { group: 'Ajio',                keywords: ['ajio'] },
  { group: 'Zudio',               keywords: ['zudio'] },
  { group: 'Lenskart',            keywords: ['lenskart'] },
  { group: 'Trends',              keywords: ['at trends', 'trends'] },
  { group: 'CRED',                keywords: ['in cred', 'cred'] },

  // ── Medical & Hospital ───────────────────────────────────
  { group: 'Meghana Hospital',    keywords: ['meghana hospital', 'meghana medical', 'expenses in meghana', 'near meghana'] },
  { group: 'Aster Hospital',      keywords: ['aster', 'baby: aster'] },
  { group: 'PM Medical',          keywords: ['pm medical'] },
  { group: 'Baptist Hospital',    keywords: ['baptist'] },
  { group: 'Currex Hospital',     keywords: ['currex hospital', 'currex'] },
  { group: 'Clove Dental',        keywords: ['clove dental'] },
  { group: 'Dental',              keywords: ['dental clinic', 'root canal', 'teeth extraction'] },
  { group: 'Apollo',              keywords: ['apollo'] },
  { group: 'Medical / Pharmacy',  keywords: ['medical expenses', 'pharmacy bill', 'hospital bill', 'medi expenses', 'hospital op', 'medicines', 'for tablets', 'tablets for', 'cold tablets', 'calcium tablets', 'for fever', 'health checkup', 'doctor', 'consultation', 'eye drops', 'cough syrup', 'cofsils', 'strepstrils', 'vitamin', 'd3 ', 'iron drops', 'arg 9', 'omega 3'] },

  // ── Dairy & Staples ──────────────────────────────────────
  { group: 'Milk & Curd',         keywords: ['milk and curd', 'milk and bru', 'milk and eggs', 'milk and banana', 'milk and mango', 'milk and tyre', 'milk packet', 'curd and', 'dosa batter, milk', 'milk, curd', 'milk and zepto'] },
  { group: 'Milk',                keywords: ['milk'] },
  { group: 'Curd',                keywords: ['curd'] },
  { group: 'Eggs',                keywords: ['eggs'] },
  { group: 'Idli Rice',           keywords: ['idli rice'] },
  { group: 'Rice',                keywords: ['rice 2'] },

  // ── Meat & Seafood ───────────────────────────────────────
  { group: 'Chicken',             keywords: ['chicken'] },
  { group: 'Mutton',              keywords: ['mutton'] },
  { group: 'Fish & Prawns',       keywords: ['fish', 'prawns'] },

  // ── Vegetables & Fruits ──────────────────────────────────
  { group: 'Vegetables',          keywords: ['vegetables', 'veges', 'brinjal', 'gobi', 'green leaves', 'palak'] },
  { group: 'Fruits',              keywords: ['fruits', 'apple', 'pomegranate', 'banana', 'sapota', 'papaya', 'custard apple', 'pineapple', 'grapes', 'orange', 'jack fruit', 'water melon', 'ice apple', 'sweet potato'] },
  { group: 'Onions',              keywords: ['onions', 'onion'] },
  { group: 'Tomato',              keywords: ['tomato'] },
  { group: 'Coconut',             keywords: ['coconut water', 'coconut'] },
  { group: 'Flowers',             keywords: ['flowers'] },

  // ── Snacks & Street Food ─────────────────────────────────
  { group: 'Hot Chips',           keywords: ['hot chips'] },
  { group: 'Gobi Noodles',        keywords: ['gobi noodles', 'gobi fried rice', 'schezwan noodles', 'chicken noodles', 'noodles'] },
  { group: 'Pani Puri',           keywords: ['pani puri', 'dahi puri', 'dahi poori', 'masala puri'] },
  { group: 'Samosa & Jalebi',     keywords: ['samosa and jalebi', 'jalebi'] },
  { group: 'Punugulu',            keywords: ['punugulu'] },
  { group: 'Pop Corn',            keywords: ['pop corn', 'popcorn'] },
  { group: 'Ice Cream',           keywords: ['ice cream'] },
  { group: 'Sugar Cane Juice',    keywords: ['sugar cane juice'] },
  { group: 'Sugar Cane',          keywords: ['sugar cane'] },
  { group: 'Chips & Snacks',      keywords: ['potato chips', 'chips', 'snacks', 'biscuits'] },
  { group: 'Juice',               keywords: ['juice'] },
  { group: 'Tea',                 keywords: ['tea'] },

  // ── Restaurants & Food Orders ────────────────────────────
  { group: 'Swiggy',              keywords: ['swiggy'] },
  { group: 'Zomato',              keywords: ['zomato'] },
  { group: 'KFC',                 keywords: ['kfc'] },
  { group: 'A2B',                 keywords: ['a2b'] },
  { group: 'Abhiruchi',           keywords: ['abhiruchi'] },
  { group: 'Nandhana Palace',     keywords: ['nandhana palace'] },
  { group: 'Prakruthi',           keywords: ['prakruthi'] },
  { group: 'Kaveri Restaurant',   keywords: ['kaveri restaurant'] },
  { group: 'Shubh Sagar',        keywords: ['shubh sagar'] },
  { group: 'Subway',              keywords: ['subway'] },
  { group: 'Burger King',         keywords: ['burger king'] },
  { group: 'Pizza Hut',           keywords: ['pizza hut'] },
  { group: "Domino's",            keywords: ["domino's", 'dominos'] },
  { group: "Amma's Pastries",     keywords: ["amma's pastries"] },
  { group: 'Frosty Bite',         keywords: ['frosty bite'] },
  { group: 'S2 Restaurant',       keywords: ['at s2'] },
  { group: 'Cafe Coffee Day',     keywords: ['cafe coffee day'] },
  { group: 'Mangalya',            keywords: ['mangalya'] },
  { group: 'Kala Grand',          keywords: ['kala grand'] },
  { group: 'Nandi Grand',         keywords: ['nandi grand'] },
  { group: 'MTC Parcel',          keywords: ['mtc parcel'] },
  { group: 'Bhayiji',             keywords: ['bhayiji'] },
  { group: 'Rs Patha Ruchulu',    keywords: ['rs patha ruchulu', 'palle ruchulu'] },
  { group: 'Bier Garden',         keywords: ['bier garden'] },
  { group: 'Lunch at Office',     keywords: ['lunch at office'] },
  { group: 'Dining Out',          keywords: ['lunch at', 'dinner at', 'breakfast at', 'food at'] },

  // ── Transport ────────────────────────────────────────────
  { group: 'Bike Petrol',         keywords: ['bike petrol', 'petrol at shell', 'petrol for xpulse', 'petrol at plvd', 'bike petrol'] },
  { group: 'Car Petrol',          keywords: ['car petrol', 'petrol for xl6', 'petrol for car', 'petrol for chitti', 'petrol for re'] },
  { group: 'Petrol',              keywords: ['petrol'] },
  { group: 'Auto Rides',          keywords: ['auto to', 'auto from', 'auto for'] },
  { group: 'Cab Rides',           keywords: ['cab to', 'cab from', 'cab for', 'rapido', 'uber'] },
  { group: 'Tolls',               keywords: ['tolls', 'toll gates', 'annual toll', 'fastag'] },
  { group: 'EV Charging',         keywords: ['ev charging'] },
  { group: 'Metro',               keywords: ['metro'] },
  { group: 'Office Travel',       keywords: ['ofc travel'] },
  { group: 'Bus Tickets',         keywords: ['bus ticket', 'bus stop', 'to blr', 'to plvd', 'blr to', 'plvd to', 'hyd to', 'vijayawada'] },
  { group: 'Bike Parking',        keywords: ['bike parking'] },
  { group: 'Parking',             keywords: ['parking'] },

  // ── Recurring Bills ──────────────────────────────────────
  { group: 'Rent',                keywords: ['rent'] },
  { group: 'Maintenance',         keywords: ['maintenance'] },
  { group: 'Electricity Bill',    keywords: ['ebill', 'current bill'] },
  { group: 'WiFi',                keywords: ['wifi connection'] },
  { group: 'Gas Cylinder',        keywords: ['gas cylinder'] },
  { group: 'Term Policy',         keywords: ['term policy'] },
  { group: 'Maid',                keywords: ['maid'] },
  { group: 'Water Can',           keywords: ['water can'] },

  // ── Personal Care ────────────────────────────────────────
  { group: 'Hair Cut',            keywords: ['hair cut'] },
  { group: 'Trimming',            keywords: ['trimming'] },
  { group: 'Skin Care',           keywords: ['reginald', 'cetaphil', 'minimalist', 'skin care', 'lotion', 'face wax', 'derma co'] },
  { group: 'Shampoo & Conditioner', keywords: ['shampoo', 'conditioner', 'bblunt'] },
  { group: 'Body Wash & Soap',    keywords: ['body wash', 'soaps', 'tedibar'] },
  { group: 'Toothpaste',          keywords: ['sensora toothpaste', 'toothpaste'] },

  // ── Recharges ────────────────────────────────────────────
  { group: 'Jio Recharge',        keywords: ['jio recharge', 'self jio', 'jio dongle', 'jio addon'] },
  { group: 'Moni Recharge',       keywords: ['recharge for moni', 'moni recharge', 'moni airtel'] },
  { group: 'Recharges',           keywords: ['recharge'] },

  // ── Baby & Family ────────────────────────────────────────
  { group: 'Diapers',             keywords: ['diapers'] },
  { group: 'Baby Expenses',       keywords: ['baby:', 'baby doctor', 'baby gajjalu', 'baby photoshoot', 'baby holder', 'baby body wash', 'baby corn'] },
  { group: 'Vaccination',         keywords: ['vaccination'] },
  { group: 'Sathvika',            keywords: ['sathvika'] },

  // ── Cooking Essentials ───────────────────────────────────
  { group: 'Cooking Oil',         keywords: ['ground nut oil', 'sunflower oil', 'sesame oil'] },
  { group: 'Ghee',                keywords: ['ghee'] },
  { group: 'Spices & Condiments', keywords: ['turmeric', 'garlic', 'ginger', 'mirchi', 'coriander', 'salt and'] },
  { group: 'Bru Coffee',          keywords: ['bru packets', 'bru sachets', 'bru and'] },
  { group: 'Dishwashing',         keywords: ['dishwashing'] },

  // ── Travel (Trips) ──────────────────────────────────────
  { group: 'Shirdi Trip',         keywords: ['shirdi'] },
  { group: 'Tirumala / Tirupati', keywords: ['tirumala', 'tirupati', 'tiruchanur'] },
  { group: 'Pulivendula',         keywords: ['plvd', 'pulivendula'] },
  { group: 'Goa Trip',            keywords: ['vasco residency', 'pristine resort', 'goa', 'calangute', 'utorda'] },
  { group: 'Mysore Trip',         keywords: ['mysore'] },

  // ── Temples & Religious ─────────────────────────────────
  { group: 'Temple Visit',        keywords: ['temple', 'hundi', 'prasadam', 'kanipakam', 'kadiri'] },

  // ── Entertainment ───────────────────────────────────────
  { group: 'Movies & Theatre',    keywords: ['movie ticket', 'theatre', 'cinema', 'at pvr', 'at inox', 'escape room'] },

  // ── EV / Bike Service ───────────────────────────────────
  { group: 'Vehicle Service',     keywords: ['bike service', 'ev bike service', 'ev car service', 'car service', 'bike repair', 'car outer wash', 'tyre', 'battery'] },
  { group: 'Car Insurance',       keywords: ['car insurance', 'super top up'] },

  // ── Chitti / Payments ───────────────────────────────────
  { group: 'Chitti',              keywords: ['chitti amount'] },

  // ── Home & Utilities ────────────────────────────────────
  { group: 'Home Improvement',    keywords: ['ac point', 'geyser', 'plumber', 'sink set', 'water purifier', 'vaccum cleaner', 'washing machine'] },

  // ── Specific places/restaurants that start with "At" ────
  { group: 'Chianti Hotel',       keywords: ['chianti hotel'] },
  { group: 'Neighborhood Store',  keywords: ['at neighborhood'] },
  { group: 'Ulimella Lake',       keywords: ['ulimella'] },
  { group: 'TMR Mall Plvd',       keywords: ['tmr mall'] },
  { group: 'Kalikamba Bakery',    keywords: ['kalikamba'] },
  { group: 'Bakery',              keywords: ['bakery', 'pastries'] },

  // ── Alcohol & Drinks ────────────────────────────────────
  { group: 'Drinks',              keywords: ['alcohol', 'red wine', 'budweiser', 'beer', 'coke', 'sprite', 'soda'] },
  { group: 'Dry Fruits',          keywords: ['dry fruits'] },

  // ── Moni Expenses ───────────────────────────────────────
  { group: 'Moni Expenses',       keywords: ['moni paid', 'moni ordered', 'moni lunch', 'moni expenses', 'for moni', 'dress for moni', 'slippers for moni'] },
  { group: 'Moni Office',         keywords: ['moni office'] },
];

/**
 * Stop-word prefixes stripped before fallback grouping.
 * Order matters — longer prefixes first so "shopping in" is stripped before "in".
 */
const STOP_PREFIXES = [
  'shopping at ', 'shopping in ', 'shopping : ',
  'order in ', 'ordered ',
  'lunch at ', 'dinner at ', 'breakfast at ', 'food at ',
  'tea at ', 'cake at ', 'juice at ', 'pizza at ',
  'parking at ', 'parking charges at ',
  'at ', 'for ', 'to ', 'from ', 'in ',
];

/**
 * Match a description against the group rules.
 * Returns the group name if matched, null otherwise.
 */
export function matchDescriptionGroup(description: string): string | null {
  const lower = description.trim().toLowerCase();
  for (const rule of DESCRIPTION_GROUP_RULES) {
    if (rule.keywords.some(kw => lower.includes(kw))) {
      return rule.group;
    }
  }
  return null;
}

/**
 * Strip common stop-word prefixes from a description for fallback grouping.
 * E.g. "At some unknown place" → "some unknown place"
 *      "Shopping in some store" → "some store"
 *      "For something random" → "something random"
 */
export function stripStopPrefix(description: string): string {
  const lower = description.trim().toLowerCase();
  for (const prefix of STOP_PREFIXES) {
    if (lower.startsWith(prefix)) {
      // Return original casing with prefix stripped
      return description.trim().slice(prefix.length).trim();
    }
  }
  return description.trim();
}
