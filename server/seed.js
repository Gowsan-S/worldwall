const bcrypt = require('bcryptjs');
const { db, getTodayUtcDate } = require('./db');

const SEED_USERS = [
  { username: 'admin', email: 'admin@kwall.world', displayName: 'World Wall Curator', role: 'admin', location: 'Geneva, Switzerland', bio: 'Curator & guardian of the global human wall.' },
  { username: 'demo', email: 'demo@kwall.world', displayName: 'Alex Chen', role: 'user', location: 'San Francisco, USA', bio: 'Street photographer and poster artist.' },
  { username: 'kenji_tokyo', email: 'kenji@kwall.world', displayName: 'Kenji Takahashi', location: 'Tokyo, Japan', bio: 'Finding quiet zen moments in a neon metropolis.' },
  { username: 'amara_nairobi', email: 'amara@kwall.world', displayName: 'Amara Kiprono', location: 'Nairobi, Kenya', bio: 'Coffee lover, solar engineer, sunrise chaser.' },
  { username: 'chloe_paris', email: 'chloe@kwall.world', displayName: 'Chloé Mercier', location: 'Paris, France', bio: 'Books, rain on zinc rooftops, and fresh baguettes.' },
  { username: 'mateo_sp', email: 'mateo@kwall.world', displayName: 'Mateo Silva', location: 'São Paulo, Brazil', bio: 'Bossa nova rhythms in an endless concrete forest.' },
  { username: 'priya_mumbai', email: 'priya@kwall.world', displayName: 'Priya Sharma', location: 'Mumbai, India', bio: 'Monsoon chai and stories by Marine Drive.' },
  { username: 'olafur_reyk', email: 'olafur@kwall.world', displayName: 'Ólafur Vidarsson', location: 'Reykjavík, Iceland', bio: 'Glacial breeze, thermal pools, aurora hunter.' },
  { username: 'liam_sydney', email: 'liam@kwall.world', displayName: 'Liam O’Connor', location: 'Sydney, Australia', bio: 'Catching dawn waves before the city awakens.' },
  { username: 'nour_cairo', email: 'nour@kwall.world', displayName: 'Nour Hassan', location: 'Cairo, Egypt', bio: 'Ancient stone, warm evenings, and hibiscus tea.' },
  { username: 'sofia_ba', email: 'sofia@kwall.world', displayName: 'Sofía Bianchi', location: 'Buenos Aires, Argentina', bio: 'Tango alleys of San Telmo and weekend asados.' },
  { username: 'minjun_seoul', email: 'minjun@kwall.world', displayName: 'Min-jun Kim', location: 'Seoul, South Korea', bio: 'Midnight cycling along the Han River.' },
  { username: 'elena_vancouver', email: 'elena@kwall.world', displayName: 'Elena Rostova', location: 'Vancouver, Canada', bio: 'Where pine mountains drop straight into the Pacific.' },
  { username: 'thabo_ct', email: 'thabo@kwall.world', displayName: 'Thabo Ndlovu', location: 'Cape Town, South Africa', bio: 'Table Mountain silhouette at golden hour.' },
  { username: 'marco_rome', email: 'marco@kwall.world', displayName: 'Marco Bellini', location: 'Rome, Italy', bio: 'Espresso standing at the counter, always.' },
  { username: 'astrid_stockholm', email: 'astrid@kwall.world', displayName: 'Astrid Lind', location: 'Stockholm, Sweden', bio: 'Archipelago wanderer and cinnamon bun connoisseur.' },
  { username: 'wei_singapore', email: 'wei@kwall.world', displayName: 'Wei Long Tan', location: 'Singapore', bio: 'Gardens in the sky and laksa at midnight.' },
  { username: 'carlos_cdmx', email: 'carlos@kwall.world', displayName: 'Carlos Morales', location: 'Mexico City, Mexico', bio: 'Vibrant colors of Coyoacán and street tacos.' },
  { username: 'hannah_berlin', email: 'hannah@kwall.world', displayName: 'Hannah Weber', location: 'Berlin, Germany', bio: 'Analog film, flea markets, and autumn leaves.' },
  { username: 'narin_bkk', email: 'narin@kwall.world', displayName: 'Narin Phrom', location: 'Bangkok, Thailand', bio: 'Floating markets, temple bells, and street smiles.' },
  { username: 'oliver_london', email: 'oliver@kwall.world', displayName: 'Oliver Jenkins', location: 'London, UK', bio: 'Brick lane vinyls, misty bridges, and black tea.' },
  { username: 'sanne_ams', email: 'sanne@kwall.world', displayName: 'Sanne van Dijk', location: 'Amsterdam, Netherlands', bio: 'Cycling beside the canals through autumn mist.' },
  { username: 'elif_istanbul', email: 'elif@kwall.world', displayName: 'Elif Kaya', location: 'Istanbul, Turkey', bio: 'Where two continents gaze at each other across blue waters.' },
  { username: 'lucia_barca', email: 'lucia@kwall.world', displayName: 'Lucía Gomez', location: 'Barcelona, Spain', bio: 'Gothic quarters, Mediterranean breeze, tapas.' },
  { username: 'tiago_lisbon', email: 'tiago@kwall.world', displayName: 'Tiago Pereira', location: 'Lisbon, Portugal', bio: 'Yellow tram 28 clattering up Alfama hills.' },
  { username: 'lukas_zurich', email: 'lukas@kwall.world', displayName: 'Lukas Meier', location: 'Zurich, Switzerland', bio: 'Crystal alpine lakes and clean crisp mountain air.' },
  { username: 'greta_vienna', email: 'greta@kwall.world', displayName: 'Greta Holzer', location: 'Vienna, Austria', bio: 'Classical chords in grand marble coffeehouses.' },
  { username: 'sean_dublin', email: 'sean@kwall.world', displayName: 'Seán Murphy', location: 'Dublin, Ireland', bio: 'A warm fiddle tune on a rainy Thursday.' },
  { username: 'zayd_dubai', email: 'zayd@kwall.world', displayName: 'Zayd Al-Maktoum', location: 'Dubai, UAE', bio: 'Desert dunes meeting architectural wonders.' },
  { username: 'diego_santiago', email: 'diego@kwall.world', displayName: 'Diego Valenzuela', location: 'Santiago, Chile', bio: 'Andes peaks towering over evening lights.' },
  { username: 'freja_oslo', email: 'freja@kwall.world', displayName: 'Freja Nygård', location: 'Oslo, Norway', bio: 'Nordic quietude, fjord reflections, and woolen scarves.' },
  { username: 'yuki_kyoto', email: 'yuki@kwall.world', displayName: 'Yuki Sato', location: 'Kyoto, Japan', bio: 'Bamboo groves whispering in the early morning fog.' },
  { username: 'kai_honolulu', email: 'kai@kwall.world', displayName: 'Kai Kalani', location: 'Honolulu, Hawaii', bio: 'Aloha spirit and warm trade winds at sunset.' },
  { username: 'mads_cph', email: 'mads@kwall.world', displayName: 'Mads Kjaer', location: 'Copenhagen, Denmark', bio: 'Hygge candlelit evenings and bicycle lanes.' },
  { username: 'isla_edinburgh', email: 'isla@kwall.world', displayName: 'Isla MacLeod', location: 'Edinburgh, Scotland', bio: 'Cobbled Royal Mile, haunting bagpipes, gray stone.' },
  { username: 'karim_marrakech', email: 'karim@kwall.world', displayName: 'Karim Fassi', location: 'Marrakech, Morocco', bio: 'Scent of saffron, mint, and lanterns glowing in the Medina.' },
  { username: 'maya_austin', email: 'maya@kwall.world', displayName: 'Maya Brooks', location: 'Austin, USA', bio: 'Live music outdoors and wide open Texas skies.' },
  { username: 'arjun_bangalore', email: 'arjun@kwall.world', displayName: 'Arjun Rao', location: 'Bangalore, India', bio: 'Coding, filter coffee, and rooftop rains.' },
  { username: 'leila_beirut', email: 'leila@kwall.world', displayName: 'Leila Chedid', location: 'Beirut, Lebanon', bio: 'Cedar forests and Mediterranean sunsets.' },
  { username: 'jonas_helsinki', email: 'jonas@kwall.world', displayName: 'Jonas Koski', location: 'Helsinki, Finland', bio: 'Sauna smoke, birch leaves, and northern calm.' },
  { username: 'chiara_milan', email: 'chiara@kwall.world', displayName: 'Chiara Rossi', location: 'Milan, Italy', bio: 'Design sketches, aperitivo, and golden hour light.' },
  { username: 'tariq_doha', email: 'tariq@kwall.world', displayName: 'Tariq Al-Thani', location: 'Doha, Qatar', bio: 'Futuristic silhouettes over peaceful waters.' },
  { username: 'valeria_bogota', email: 'valeria@kwall.world', displayName: 'Valeria Restrepo', location: 'Bogota, Colombia', bio: 'High Andean mornings and rich mountain coffee.' },
  { username: 'kofi_accra', email: 'kofi@kwall.world', displayName: 'Kofi Mensah', location: 'Accra, Ghana', bio: 'Drumbeats by Labadi beach at sunset.' },
  { username: 'polina_prague', email: 'polina@kwall.world', displayName: 'Polina Dvorak', location: 'Prague, Czechia', bio: 'Old town spires under November fog.' },
  { username: 'ben_auckland', email: 'ben@kwall.world', displayName: 'Ben Taylor', location: 'Auckland, New Zealand', bio: 'Sailing Hauraki Gulf and green volcanic hills.' },
  { username: 'fatima_casablanca', email: 'fatima@kwall.world', displayName: 'Fatima Zahra', location: 'Casablanca, Morocco', bio: 'Atlantic ocean breeze and art deco alleys.' },
  { username: 'dmitri_tallinn', email: 'dmitri@kwall.world', displayName: 'Dmitri Tamm', location: 'Tallinn, Estonia', bio: 'Medieval towers and digital frontiers.' },
  { username: 'camila_rio', email: 'camila@kwall.world', displayName: 'Camila Santos', location: 'Rio de Janeiro, Brazil', bio: 'Ipanema sands and tropical evening warmth.' },
  { username: 'ken_osaka', email: 'ken@kwall.world', displayName: 'Kenjiro Maeda', location: 'Osaka, Japan', bio: 'Street food sizzle and friendly neon lights.' },
  { username: 'nadia_tunis', email: 'nadia@kwall.world', displayName: 'Nadia Trabelsi', location: 'Tunis, Tunisia', bio: 'Blue and white doors of Sidi Bou Said.' },
  { username: 'sam_seattle', email: 'sam@kwall.world', displayName: 'Samira Patel', location: 'Seattle, USA', bio: 'Pine scents, evergreen ferries, and dark espresso.' },
  { username: 'leo_montreal', email: 'leo@kwall.world', displayName: 'Léo Tremblay', location: 'Montreal, Canada', bio: 'Autumn maple colors and Mile End bagels.' },
  { username: 'anja_ljubljana', email: 'anja@kwall.world', displayName: 'Anja Vidmar', location: 'Ljubljana, Slovenia', bio: 'Emerald river waters under the castle hill.' },
  { username: 'lucas_manila', email: 'lucas@kwall.world', displayName: 'Lucas Reyes', location: 'Manila, Philippines', bio: 'Sunset over Manila bay and vibrant street art.' },
  { username: 'mei_taipei', email: 'mei@kwall.world', displayName: 'Mei-Ling Chen', location: 'Taipei, Taiwan', bio: 'Night market aromas and misty mountain trails.' },
  { username: 'aleks_warsaw', email: 'aleks@kwall.world', displayName: 'Aleksander Wisniewski', location: 'Warsaw, Poland', bio: 'Modern energy amidst reconstructed history.' },
  { username: 'dimitris_athens', email: 'dimitris@kwall.world', displayName: 'Dimitris Kostas', location: 'Athens, Greece', bio: 'Olive groves and ancient marble under golden sun.' },
  { username: 'zofia_krakow', email: 'zofia@kwall.world', displayName: 'Zofia Nowak', location: 'Krakow, Poland', bio: 'Jazz cellars and snow falling on cobblestones.' },
  { username: 'tariq_amman', email: 'tariq_a@kwall.world', displayName: 'Tariq Mansoor', location: 'Amman, Jordan', bio: 'Desert tea around the evening fire.' },
  { username: 'inga_bergen', email: 'inga@kwall.world', displayName: 'Inga Hansen', location: 'Bergen, Norway', bio: 'Seven mountains and rainy harbor reflections.' },
  { username: 'hugo_porto', email: 'hugo@kwall.world', displayName: 'Hugo Ribeiro', location: 'Porto, Portugal', bio: 'Rooftops glowing terracotta at sunset.' },
  { username: 'siti_kl', email: 'siti@kwall.world', displayName: 'Siti Nurhaliza', location: 'Kuala Lumpur, Malaysia', bio: 'Twin towers rising above tropical rain.' },
  { username: 'budi_jakarta', email: 'budi@kwall.world', displayName: 'Budi Hartono', location: 'Jakarta, Indonesia', bio: 'City that never sleeps, endless warmth.' },
  { username: 'clara_valpo', email: 'clara@kwall.world', displayName: 'Clara Soto', location: 'Valparaiso, Chile', bio: 'Bohemian murals and Pacific sea air.' },
  { username: 'gabriel_havana', email: 'gabriel@kwall.world', displayName: 'Gabriel Diaz', location: 'Havana, Cuba', bio: 'Classic cars, trumpet solos, and salt air.' },
  { username: 'mia_melbourne', email: 'mia@kwall.world', displayName: 'Mia Watson', location: 'Melbourne, Australia', bio: 'Laneway espresso and street art murals.' },
  { username: 'oscar_stockholm', email: 'oscar@kwall.world', displayName: 'Oscar Berg', location: 'Stockholm, Sweden', bio: 'Fika conversations and Baltic sailing.' },
  { username: 'leonie_lyon', email: 'leonie@kwall.world', displayName: 'Léonie Blanc', location: 'Lyon, France', bio: 'Bistros, silk history, and two rivers meeting.' },
  { username: 'artur_riga', email: 'artur@kwall.world', displayName: 'Arturs Kalnins', location: 'Riga, Latvia', bio: 'Art Nouveau spires and Baltic amber.' },
  { username: 'mariam_tbilisi', email: 'mariam@kwall.world', displayName: 'Mariam Beridze', location: 'Tbilisi, Georgia', bio: 'Balconies carved in wood, mountain wine.' },
  { username: 'fernando_lima', email: 'fernando@kwall.world', displayName: 'Fernando Vargas', location: 'Lima, Peru', bio: 'Cliffs of Miraflores and fresh ceviche.' },
  { username: 'chi_saigon', email: 'chi@kwall.world', displayName: 'Nguyen Chi', location: 'Ho Chi Minh City, Vietnam', bio: 'Motorbike waves and iced coffee.' },
  { username: 'yasmin_doha', email: 'yasmin@kwall.world', displayName: 'Yasmin Al-Kaabi', location: 'Doha, Qatar', bio: 'Pearl waters and modern skylines.' },
  { username: 'dante_florence', email: 'dante@kwall.world', displayName: 'Dante Moretti', location: 'Florence, Italy', bio: 'Arno reflections and renaissance bells.' },
  { username: 'sara_reynosa', email: 'sara@kwall.world', displayName: 'Sara Mendez', location: 'Monterrey, Mexico', bio: 'Cerro de la Silla against purple dawn.' },
  { username: 'kenan_sarajevo', email: 'kenan@kwall.world', displayName: 'Kenan Hadzic', location: 'Sarajevo, Bosnia', bio: 'Where east meets west across stone bridges.' },
  { username: 'nadine_zurich', email: 'nadine@kwall.world', displayName: 'Nadine Keller', location: 'Geneva, Switzerland', bio: 'Lakeside breezes and crisp Alpine snow.' },
  { username: 'matias_montevideo', email: 'matias@kwall.world', displayName: 'Matias Suarez', location: 'Montevideo, Uruguay', bio: 'Rambla walks and sunset mate.' },
  { username: 'linnea_gothenburg', email: 'linnea@kwall.world', displayName: 'Linnea Eklund', location: 'Gothenburg, Sweden', bio: 'Harbor lights and archipelago ferries.' },
  { username: 'youssef_alexandria', email: 'youssef@kwall.world', displayName: 'Youssef Nabil', location: 'Alexandria, Egypt', bio: 'Mediterranean sea spray and ancient wisdom.' },
  { username: 'claudia_cusco', email: 'claudia@kwall.world', displayName: 'Claudia Quispe', location: 'Cusco, Peru', bio: 'High altitude cobblestones and starry nights.' }
];

// Rich, authentic poster moments strictly inspired by Reference Image 2
const SEED_MOMENTS = [
  { img: 'https://images.unsplash.com/photo-1534447677768-be436bb09401?auto=format&fit=crop&w=600&q=80', msg: 'Good Vibes only!', style: 'bold-yellow', aspect: 'tall' },
  { img: 'https://images.unsplash.com/photo-1579783900882-c0d3dad7b119?auto=format&fit=crop&w=600&q=80', msg: 'Your Comfort Zone Will Kill You', style: 'distressed-red', aspect: 'xtall' },
  { img: 'https://images.unsplash.com/photo-1517838277536-f5f99be501cd?auto=format&fit=crop&w=600&q=80', msg: 'THE WILL MUST BE STRONGER THAN THE SKILL', style: 'dark-gritty', aspect: 'xtall' },
  { img: 'https://images.unsplash.com/photo-1507679799987-c73779587ccf?auto=format&fit=crop&w=600&q=80', msg: 'IDEAS ARE WORTHLESS WITHOUT EXECUTION', style: 'framed-white', aspect: 'tall' },
  { img: 'https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=600&q=80', msg: 'dream. plan. do.', style: 'navy-quote', aspect: 'tall' },
  { img: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=600&q=80', msg: 'ARE YOU WORKING HARD ENOUGH?', style: 'minimal-dark', aspect: 'xtall' },
  { img: 'https://images.unsplash.com/photo-1550684848-fac1c5b4e853?auto=format&fit=crop&w=600&q=80', msg: 'Rise & Grind', style: 'retro-pop', aspect: 'tall' },
  { img: 'https://images.unsplash.com/photo-1549880338-65ddcdfd017b?auto=format&fit=crop&w=600&q=80', msg: 'NO PRESSURE. NO DIAMONDS', style: 'framed-white', aspect: 'standard' },
  { img: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=600&q=80', msg: 'CONQUER.', style: 'dark-gritty', aspect: 'tall' },
  { img: 'https://images.unsplash.com/photo-1513151233558-d860c5398176?auto=format&fit=crop&w=600&q=80', msg: 'DON’T PANIC', style: 'bold-yellow', aspect: 'standard' },
  { img: 'https://images.unsplash.com/photo-1492562080023-ab3db95bfbce?auto=format&fit=crop&w=600&q=80', msg: 'just TRY.', style: 'minimal-dark', aspect: 'tall' },
  { img: 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=600&q=80', msg: 'good things take time.', style: 'vintage-cream', aspect: 'xtall' },
  { img: 'https://images.unsplash.com/photo-1568602471122-7832951cc4c5?auto=format&fit=crop&w=600&q=80', msg: 'DON’T GIVE UP', style: 'distressed-red', aspect: 'tall' },
  { img: 'https://images.unsplash.com/photo-1546182990-dffeafbe841d?auto=format&fit=crop&w=600&q=80', msg: 'WE NEED TO BE HURT IN ORDER TO GROW', style: 'dark-gritty', aspect: 'tall' },
  { img: 'https://images.unsplash.com/photo-1509198397868-475647b2a1e5?auto=format&fit=crop&w=600&q=80', msg: 'NEVER FORGET WHY YOU STARTED', style: 'minimal-dark', aspect: 'xtall' },
  { img: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=600&q=80', msg: 'Trust the process', style: 'navy-quote', aspect: 'standard' },
  { img: 'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&w=600&q=80', msg: 'OF MY DREAMS', style: 'framed-white', aspect: 'xtall' },
  { img: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?auto=format&fit=crop&w=600&q=80', msg: 'STAY HUMBLE HUSTLE HARD', style: 'dark-gritty', aspect: 'tall' },
  { img: 'https://images.unsplash.com/photo-1508214751196-bcfd4ca60f91?auto=format&fit=crop&w=600&q=80', msg: 'Reminder: keep going', style: 'framed-white', aspect: 'standard' },
  { img: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=600&q=80', msg: 'First cup of coffee before the city wakes up.', style: 'fullbleed', aspect: 'tall' },
  { img: 'https://images.unsplash.com/photo-1501196354995-cbb51c65aaea?auto=format&fit=crop&w=600&q=80', msg: 'FIND YOUR FIRE', style: 'distressed-red', aspect: 'xtall' },
  { img: 'https://images.unsplash.com/photo-1516726817505-f5ed825624d8?auto=format&fit=crop&w=600&q=80', msg: 'Silence is where strength is born.', style: 'navy-quote', aspect: 'standard' },
  { img: 'https://images.unsplash.com/photo-1529626455594-4ff0802cfb7e?auto=format&fit=crop&w=600&q=80', msg: 'VIVA LA VIDA', style: 'retro-pop', aspect: 'tall' },
  { img: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=600&q=80', msg: 'LOOKING BEYOND THE HORIZON', style: 'framed-white', aspect: 'xtall' },
  { img: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&w=600&q=80', msg: 'Breathe deep. You are alive.', style: 'fullbleed', aspect: 'tall' },
  { img: 'https://images.unsplash.com/photo-1541577141970-eebc83ebe30e?auto=format&fit=crop&w=600&q=80', msg: 'CREATE DON’T WAIT', style: 'bold-yellow', aspect: 'tall' },
  { img: 'https://images.unsplash.com/photo-1517849845537-4d257902454a?auto=format&fit=crop&w=600&q=80', msg: 'Unfiltered joy is contagious.', style: 'framed-white', aspect: 'standard' },
  { img: 'https://images.unsplash.com/photo-1463453091185-61582044d556?auto=format&fit=crop&w=600&q=80', msg: 'SMILE, HUMANITY IS BEAUTIFUL', style: 'minimal-dark', aspect: 'tall' },
  { img: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&w=600&q=80', msg: 'The cold sea wind makes me feel awake.', style: 'fullbleed', aspect: 'xtall' },
  { img: 'https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?auto=format&fit=crop&w=600&q=80', msg: 'MAKE SOMETHING TODAY', style: 'vintage-cream', aspect: 'tall' },
  { img: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=600&q=80', msg: 'YOUR ONLY LIMIT IS YOU', style: 'dark-gritty', aspect: 'xtall' },
  { img: 'https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=600&q=80', msg: 'YOU HAVE TO DO', style: 'bold-yellow', aspect: 'tall' },
  { img: 'https://images.unsplash.com/photo-1519058082700-08a0b56da9b4?auto=format&fit=crop&w=600&q=80', msg: 'discipline. ambition. resilience.', style: 'navy-quote', aspect: 'xtall' },
  { img: 'https://images.unsplash.com/photo-1502082553048-f009c37129b9?auto=format&fit=crop&w=600&q=80', msg: 'good things are coming.', style: 'vintage-cream', aspect: 'tall' },
  { img: 'https://images.unsplash.com/photo-1498050108023-c5249f4df085?auto=format&fit=crop&w=600&q=80', msg: 'DO WHAT OTHERS WON’T', style: 'minimal-dark', aspect: 'standard' },
  { img: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=600&q=80', msg: 'BE THE GREATEST', style: 'dark-gritty', aspect: 'xtall' },
  { img: 'https://images.unsplash.com/photo-1534447677768-be436bb09401?auto=format&fit=crop&w=600&q=80', msg: 'FOCUS ON THE STEP IN FRONT OF YOU', style: 'framed-white', aspect: 'tall' },
  { img: 'https://images.unsplash.com/photo-1550684848-fac1c5b4e853?auto=format&fit=crop&w=600&q=80', msg: 'HUSTLE IN SILENCE', style: 'retro-pop', aspect: 'tall' },
  { img: 'https://images.unsplash.com/photo-1579783900882-c0d3dad7b119?auto=format&fit=crop&w=600&q=80', msg: 'FALL SEVEN TIMES STAND UP EIGHT', style: 'distressed-red', aspect: 'xtall' },
  { img: 'https://images.unsplash.com/photo-1509198397868-475647b2a1e5?auto=format&fit=crop&w=600&q=80', msg: 'ONE DAY OR DAY ONE', style: 'minimal-dark', aspect: 'tall' },
  { img: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=600&q=80', msg: 'BREATHE & BELIEVE', style: 'navy-quote', aspect: 'standard' },
  { img: 'https://images.unsplash.com/photo-1513151233558-d860c5398176?auto=format&fit=crop&w=600&q=80', msg: 'CHASE DREAMS NOT PEOPLE', style: 'bold-yellow', aspect: 'tall' },
  { img: 'https://images.unsplash.com/photo-1507679799987-c73779587ccf?auto=format&fit=crop&w=600&q=80', msg: 'EVERY PRO WAS ONCE AN AMATEUR', style: 'framed-white', aspect: 'xtall' },
  { img: 'https://images.unsplash.com/photo-1517838277536-f5f99be501cd?auto=format&fit=crop&w=600&q=80', msg: 'WORK WHILE THEY SLEEP', style: 'dark-gritty', aspect: 'tall' },
  { img: 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=600&q=80', msg: 'DO IT WITH PASSION OR NOT AT ALL', style: 'distressed-red', aspect: 'xtall' },
  { img: 'https://images.unsplash.com/photo-1549880338-65ddcdfd017b?auto=format&fit=crop&w=600&q=80', msg: 'IT ALWAYS SEEMS IMPOSSIBLE UNTIL IT IS DONE', style: 'framed-white', aspect: 'tall' },
  { img: 'https://images.unsplash.com/photo-1529626455594-4ff0802cfb7e?auto=format&fit=crop&w=600&q=80', msg: 'STAY HUNGRY. STAY FOOLISH.', style: 'retro-pop', aspect: 'standard' },
  { img: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=600&q=80', msg: 'ACTION CURES FEAR', style: 'minimal-dark', aspect: 'xtall' },
  { img: 'https://images.unsplash.com/photo-1516726817505-f5ed825624d8?auto=format&fit=crop&w=600&q=80', msg: 'PROGRESS OVER PERFECTION', style: 'navy-quote', aspect: 'tall' },
  { img: 'https://images.unsplash.com/photo-1541577141970-eebc83ebe30e?auto=format&fit=crop&w=600&q=80', msg: 'ENERGY FLOWS WHERE ATTENTION GOES', style: 'bold-yellow', aspect: 'xtall' },
  { img: 'https://images.unsplash.com/photo-1546182990-dffeafbe841d?auto=format&fit=crop&w=600&q=80', msg: 'FEAR IS A LIAR', style: 'dark-gritty', aspect: 'tall' },
  { img: 'https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?auto=format&fit=crop&w=600&q=80', msg: 'SMALL STEPS EVERY SINGLE DAY', style: 'vintage-cream', aspect: 'standard' },
  { img: 'https://images.unsplash.com/photo-1501196354995-cbb51c65aaea?auto=format&fit=crop&w=600&q=80', msg: 'PRESSURE MAKES DIAMONDS', style: 'distressed-red', aspect: 'tall' },
  { img: 'https://images.unsplash.com/photo-1508214751196-bcfd4ca60f91?auto=format&fit=crop&w=600&q=80', msg: 'KEEP LOOKING UP', style: 'framed-white', aspect: 'xtall' },
  { img: 'https://images.unsplash.com/photo-1492691527719-9d1e07e534b4?auto=format&fit=crop&w=600&q=80', msg: 'STAY CURIOUS ALWAYS', style: 'bold-yellow', aspect: 'tall' },
  { img: 'https://images.unsplash.com/photo-1488161628813-04466f872be2?auto=format&fit=crop&w=600&q=80', msg: 'HUMBLE BEGINNINGS', style: 'dark-gritty', aspect: 'xtall' },
  { img: 'https://images.unsplash.com/photo-1520813792240-56fc4a3765a7?auto=format&fit=crop&w=600&q=80', msg: 'GRATITUDE CHANGES EVERYTHING', style: 'vintage-cream', aspect: 'standard' },
  { img: 'https://images.unsplash.com/photo-1517486808906-6ca8b3f04846?auto=format&fit=crop&w=600&q=80', msg: 'CREATE YOUR OWN REALITY', style: 'retro-pop', aspect: 'tall' },
  { img: 'https://images.unsplash.com/photo-1528740561666-dc2479dc08ab?auto=format&fit=crop&w=600&q=80', msg: 'LISTEN TO THE SILENCE', style: 'navy-quote', aspect: 'xtall' },
  { img: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=600&q=80', msg: 'WANDER OFTEN WONDER ALWAYS', style: 'fullbleed', aspect: 'standard' },
  { img: 'https://images.unsplash.com/photo-1534447677768-be436bb09401?auto=format&fit=crop&w=600&q=80', msg: 'RISE ABOVE THE NOISE', style: 'distressed-red', aspect: 'tall' },
  { img: 'https://images.unsplash.com/photo-1517849845537-4d257902454a?auto=format&fit=crop&w=600&q=80', msg: 'KINDNESS IS A SUPERPOWER', style: 'framed-white', aspect: 'tall' },
  { img: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?auto=format&fit=crop&w=600&q=80', msg: 'STAY HUNGRY FOR GROWTH', style: 'minimal-dark', aspect: 'xtall' },
  { img: 'https://images.unsplash.com/photo-1550684848-fac1c5b4e853?auto=format&fit=crop&w=600&q=80', msg: 'BE THE LIGHT', style: 'bold-yellow', aspect: 'standard' },
  { img: 'https://images.unsplash.com/photo-1509198397868-475647b2a1e5?auto=format&fit=crop&w=600&q=80', msg: 'KEEP PUSHING FORWARD', style: 'dark-gritty', aspect: 'tall' },
  { img: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=600&q=80', msg: 'PEACE WITHIN STRENGTH WITHOUT', style: 'navy-quote', aspect: 'tall' },
  { img: 'https://images.unsplash.com/photo-1498050108023-c5249f4df085?auto=format&fit=crop&w=600&q=80', msg: 'CODE IS POETRY', style: 'minimal-dark', aspect: 'standard' },
  { img: 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=600&q=80', msg: 'THE WORLD IS BEAUTIFUL', style: 'fullbleed', aspect: 'xtall' },
  { img: 'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&w=600&q=80', msg: 'DREAM BEYOND BORDERS', style: 'framed-white', aspect: 'tall' },
  { img: 'https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=600&q=80', msg: 'FOCUS ON WHAT MATTERS', style: 'vintage-cream', aspect: 'standard' },
  { img: 'https://images.unsplash.com/photo-1568602471122-7832951cc4c5?auto=format&fit=crop&w=600&q=80', msg: 'STAND TALL ALWAYS', style: 'dark-gritty', aspect: 'tall' },
  { img: 'https://images.unsplash.com/photo-1513151233558-d860c5398176?auto=format&fit=crop&w=600&q=80', msg: 'COLOR YOUR WORLD', style: 'retro-pop', aspect: 'xtall' },
  { img: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=600&q=80', msg: 'SEE THE GOOD IN ALL', style: 'framed-white', aspect: 'standard' },
  { img: 'https://images.unsplash.com/photo-1549880338-65ddcdfd017b?auto=format&fit=crop&w=600&q=80', msg: 'CONQUER FROM WITHIN', style: 'distressed-red', aspect: 'tall' },
  { img: 'https://images.unsplash.com/photo-1579783900882-c0d3dad7b119?auto=format&fit=crop&w=600&q=80', msg: 'BOLD STEPS ONLY', style: 'bold-yellow', aspect: 'xtall' },
  { img: 'https://images.unsplash.com/photo-1502082553048-f009c37129b9?auto=format&fit=crop&w=600&q=80', msg: 'MOMENTS MAKE LIFE', style: 'vintage-cream', aspect: 'tall' },
  { img: 'https://images.unsplash.com/photo-1516726817505-f5ed825624d8?auto=format&fit=crop&w=600&q=80', msg: 'STRENGTH IN UNITY', style: 'navy-quote', aspect: 'standard' },
  { img: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&w=600&q=80', msg: 'LIVE WITH PURPOSE', style: 'fullbleed', aspect: 'tall' },
  { img: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=600&q=80', msg: 'DISCIPLINE IS FREEDOM', style: 'minimal-dark', aspect: 'xtall' },
  { img: 'https://images.unsplash.com/photo-1517838277536-f5f99be501cd?auto=format&fit=crop&w=600&q=80', msg: 'NO RETREAT NO SURRENDER', style: 'dark-gritty', aspect: 'tall' },
  { img: 'https://images.unsplash.com/photo-1529626455594-4ff0802cfb7e?auto=format&fit=crop&w=600&q=80', msg: 'FOREVER UNSTOPPABLE', style: 'retro-pop', aspect: 'standard' }
];

async function seed(force = false) {
  console.log('Seeding K-Wall database with dense global poster collage moments...');

  const userCount = db.prepare('SELECT COUNT(*) as count FROM users').get().count;
  const postCount = db.prepare('SELECT COUNT(*) as count FROM posts').get().count;

  if (!force && userCount >= 80 && postCount >= 85) {
    console.log(`Database already has ${userCount} users and ${postCount} posts.`);
    return;
  }

  // Clear existing if force
  if (force || userCount < 40 || postCount < 50) {
    db.prepare('DELETE FROM daily_uploads').run();
    db.prepare('DELETE FROM messages').run();
    db.prepare('DELETE FROM conversations').run();
    db.prepare('DELETE FROM reports').run();
    db.prepare('DELETE FROM posts').run();
    db.prepare('DELETE FROM users').run();
  }

  const defaultPasswordHash = await bcrypt.hash('kwall2026', 10);
  const adminPasswordHash = await bcrypt.hash('admin123', 10);
  const demoPasswordHash = await bcrypt.hash('demo123', 10);

  const insertUser = db.prepare(`
    INSERT OR IGNORE INTO users (username, email, password_hash, display_name, bio, location, avatar_url, role, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const insertPost = db.prepare(`
    INSERT INTO posts (user_id, image_url, message, location, date_utc, created_at, status, views_count, poster_style, aspect_ratio)
    VALUES (?, ?, ?, ?, ?, ?, 'published', ?, ?, ?)
  `);

  const insertDaily = db.prepare(`
    INSERT OR IGNORE INTO daily_uploads (user_id, date_utc, post_id, created_at)
    VALUES (?, ?, ?, ?)
  `);

  const todayUtc = getTodayUtcDate();
  const now = new Date();

  // Create users
  const userIds = [];

  for (let i = 0; i < SEED_USERS.length; i++) {
    const u = SEED_USERS[i];
    let pass = defaultPasswordHash;
    if (u.username === 'admin') pass = adminPasswordHash;
    if (u.username === 'demo') pass = demoPasswordHash;

    const avatar = `https://api.dicebear.com/7.x/identicon/svg?seed=${u.username}`;
    const createdAt = new Date(now.getTime() - (SEED_USERS.length - i) * 3600 * 1000 * 12).toISOString();

    const res = insertUser.run(
      u.username,
      u.email,
      pass,
      u.displayName,
      u.bio || '',
      u.location || '',
      avatar,
      u.role || 'user',
      createdAt
    );

    const userId = res.lastInsertRowid || db.prepare('SELECT id FROM users WHERE username = ?').get(u.username).id;
    userIds.push({ id: userId, username: u.username, displayName: u.displayName, location: u.location });
  }

  console.log(`Inserted ${userIds.length} community members.`);

  // Create seed poster moments (distribute across today and yesterday to fulfill unique constraint)
  for (let i = 0; i < SEED_MOMENTS.length; i++) {
    const user = userIds[i % userIds.length];
    const moment = SEED_MOMENTS[i];

    // Assign date_utc: demo and admin get yesterday so their daily upload is immediately available today!
    const isSpecialUser = user.username === 'demo' || user.username === 'admin';
    const daysAgo = isSpecialUser ? 1 : (i < userIds.length ? 0 : 1);
    const postDate = new Date(now.getTime() - (daysAgo * 86400 * 1000) - ((i * 13) % 86400 * 1000));
    const dateUtc = postDate.toISOString().split('T')[0];
    const views = Math.floor(Math.random() * 85) + 24;

    try {
      const pRes = insertPost.run(
        user.id,
        moment.img,
        moment.msg,
        user.location,
        dateUtc,
        postDate.toISOString(),
        views,
        moment.style,
        moment.aspect
      );

      const postId = pRes.lastInsertRowid;
      insertDaily.run(user.id, dateUtc, postId, postDate.toISOString());
    } catch (e) {
      console.warn(`Post insert skip: ${e.message}`);
    }
  }

  // Add demo conversations
  try {
    const demoUser = userIds.find(u => u.username === 'demo');
    const kenjiUser = userIds.find(u => u.username === 'kenji_tokyo');

    if (demoUser && kenjiUser) {
      const convTime = new Date(now.getTime() - 3600 * 1000 * 2).toISOString();
      const c1 = db.prepare(`
        INSERT OR IGNORE INTO conversations (user1_id, user2_id, last_message_at, created_at)
        VALUES (?, ?, ?, ?)
      `).run(Math.min(demoUser.id, kenjiUser.id), Math.max(demoUser.id, kenjiUser.id), convTime, convTime);

      const convId = c1.lastInsertRowid || db.prepare('SELECT id FROM conversations WHERE user1_id = ? AND user2_id = ?').get(Math.min(demoUser.id, kenjiUser.id), Math.max(demoUser.id, kenjiUser.id)).id;

      db.prepare(`
        INSERT INTO messages (conversation_id, sender_id, receiver_id, content, is_read, created_at)
        VALUES (?, ?, ?, ?, 1, ?)
      `).run(convId, kenjiUser.id, demoUser.id, 'Loved your poster on K-Wall today! The typography was incredible.', convTime);
    }
  } catch (convErr) {
    console.error('Conversation seed error:', convErr);
  }

  const finalPostCount = db.prepare('SELECT COUNT(*) as count FROM posts').get().count;
  console.log(`Seeding complete! ${finalPostCount} K-Wall poster moments are now active.`);
}

if (require.main === module) {
  const isForce = process.argv.includes('--force');
  seed(isForce).then(() => process.exit(0)).catch(err => {
    console.error(err);
    process.exit(1);
  });
}

module.exports = { seed };
