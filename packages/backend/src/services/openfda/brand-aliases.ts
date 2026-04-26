// Curated brand-name → ingredient mapping for common veterinary medications.
// openFDA's brand_name aggregation only returns "MSK" so we hardcode the
// most-searched pet med brands with their generic equivalents.
export const PET_BRAND_ALIASES: Array<{
  brand: string;
  generic: string;
  ingredients: string[];
  drugClass: string[];
  routes: string[];
  species: string[];
  manufacturer?: string;
  indications?: string[];
}> = [
  // NSAIDs
  { brand: 'Rimadyl', generic: 'Carprofen', ingredients: ['Carprofen'], drugClass: ['nsaid'], routes: ['oral'], species: ['canine'], manufacturer: 'Zoetis' },
  { brand: 'Metacam', generic: 'Meloxicam', ingredients: ['Meloxicam'], drugClass: ['nsaid'], routes: ['oral', 'injectable'], species: ['canine', 'feline'], manufacturer: 'Boehringer Ingelheim' },
  { brand: 'Previcox', generic: 'Firocoxib', ingredients: ['Firocoxib'], drugClass: ['nsaid'], routes: ['oral'], species: ['canine', 'equine'], manufacturer: 'Boehringer Ingelheim' },
  { brand: 'Galliprant', generic: 'Grapiprant', ingredients: ['Grapiprant'], drugClass: ['nsaid'], routes: ['oral'], species: ['canine'], manufacturer: 'Elanco' },
  { brand: 'Onsior', generic: 'Robenacoxib', ingredients: ['Robenacoxib'], drugClass: ['nsaid'], routes: ['oral', 'injectable'], species: ['canine', 'feline'], manufacturer: 'Elanco' },
  { brand: 'Deramaxx', generic: 'Deracoxib', ingredients: ['Deracoxib'], drugClass: ['nsaid'], routes: ['oral'], species: ['canine'], manufacturer: 'Elanco' },
  { brand: 'EtoGesic', generic: 'Etodolac', ingredients: ['Etodolac'], drugClass: ['nsaid'], routes: ['oral'], species: ['canine'], manufacturer: 'Fort Dodge' },

  // Antiparasitics - flea/tick/heartworm
  { brand: 'Heartgard Plus', generic: 'Ivermectin/Pyrantel', ingredients: ['Ivermectin', 'Pyrantel Pamoate'], drugClass: ['antiparasitic'], routes: ['oral'], species: ['canine'], manufacturer: 'Boehringer Ingelheim' },
  { brand: 'Heartgard', generic: 'Ivermectin', ingredients: ['Ivermectin'], drugClass: ['antiparasitic'], routes: ['oral'], species: ['canine'], manufacturer: 'Boehringer Ingelheim' },
  { brand: 'Revolution', generic: 'Selamectin', ingredients: ['Selamectin'], drugClass: ['antiparasitic'], routes: ['topical'], species: ['canine', 'feline'], manufacturer: 'Zoetis' },
  { brand: 'Bravecto', generic: 'Fluralaner', ingredients: ['Fluralaner'], drugClass: ['antiparasitic'], routes: ['oral', 'topical'], species: ['canine', 'feline'], manufacturer: 'Merck Animal Health' },
  { brand: 'NexGard', generic: 'Afoxolaner', ingredients: ['Afoxolaner'], drugClass: ['antiparasitic'], routes: ['oral'], species: ['canine'], manufacturer: 'Boehringer Ingelheim' },
  { brand: 'Simparica', generic: 'Sarolaner', ingredients: ['Sarolaner'], drugClass: ['antiparasitic'], routes: ['oral'], species: ['canine'], manufacturer: 'Zoetis' },
  { brand: 'Simparica Trio', generic: 'Sarolaner/Moxidectin/Pyrantel', ingredients: ['Sarolaner', 'Moxidectin', 'Pyrantel Pamoate'], drugClass: ['antiparasitic'], routes: ['oral'], species: ['canine'], manufacturer: 'Zoetis' },
  { brand: 'Trifexis', generic: 'Spinosad/Milbemycin', ingredients: ['Spinosad', 'Milbemycin Oxime'], drugClass: ['antiparasitic'], routes: ['oral'], species: ['canine'], manufacturer: 'Elanco' },
  { brand: 'Frontline Plus', generic: 'Fipronil/(S)-methoprene', ingredients: ['Fipronil', '(S)-Methoprene'], drugClass: ['antiparasitic'], routes: ['topical'], species: ['canine', 'feline'], manufacturer: 'Boehringer Ingelheim' },
  { brand: 'Frontline', generic: 'Fipronil', ingredients: ['Fipronil'], drugClass: ['antiparasitic'], routes: ['topical'], species: ['canine', 'feline'], manufacturer: 'Boehringer Ingelheim' },
  { brand: 'Advantix', generic: 'Imidacloprid/Permethrin', ingredients: ['Imidacloprid', 'Permethrin'], drugClass: ['antiparasitic'], routes: ['topical'], species: ['canine'], manufacturer: 'Bayer' },
  { brand: 'Advantage Multi', generic: 'Imidacloprid/Moxidectin', ingredients: ['Imidacloprid', 'Moxidectin'], drugClass: ['antiparasitic'], routes: ['topical'], species: ['canine', 'feline'], manufacturer: 'Bayer' },
  { brand: 'Seresto', generic: 'Imidacloprid/Flumethrin', ingredients: ['Imidacloprid', 'Flumethrin'], drugClass: ['antiparasitic'], routes: ['topical'], species: ['canine', 'feline'], manufacturer: 'Bayer' },
  { brand: 'Comfortis', generic: 'Spinosad', ingredients: ['Spinosad'], drugClass: ['antiparasitic'], routes: ['oral'], species: ['canine', 'feline'], manufacturer: 'Elanco' },
  { brand: 'Capstar', generic: 'Nitenpyram', ingredients: ['Nitenpyram'], drugClass: ['antiparasitic'], routes: ['oral'], species: ['canine', 'feline'], manufacturer: 'Elanco' },
  { brand: 'Credelio', generic: 'Lotilaner', ingredients: ['Lotilaner'], drugClass: ['antiparasitic'], routes: ['oral'], species: ['canine', 'feline'], manufacturer: 'Elanco' },
  { brand: 'Interceptor Plus', generic: 'Milbemycin/Praziquantel', ingredients: ['Milbemycin Oxime', 'Praziquantel'], drugClass: ['antiparasitic'], routes: ['oral'], species: ['canine'], manufacturer: 'Elanco' },
  { brand: 'Interceptor', generic: 'Milbemycin Oxime', ingredients: ['Milbemycin Oxime'], drugClass: ['antiparasitic'], routes: ['oral'], species: ['canine', 'feline'], manufacturer: 'Elanco' },
  { brand: 'Sentinel', generic: 'Milbemycin/Lufenuron', ingredients: ['Milbemycin Oxime', 'Lufenuron'], drugClass: ['antiparasitic'], routes: ['oral'], species: ['canine'], manufacturer: 'Virbac' },
  { brand: 'ProHeart 12', generic: 'Moxidectin', ingredients: ['Moxidectin'], drugClass: ['antiparasitic'], routes: ['injectable'], species: ['canine'], manufacturer: 'Zoetis' },
  { brand: 'Drontal', generic: 'Praziquantel/Pyrantel/Febantel', ingredients: ['Praziquantel', 'Pyrantel Pamoate', 'Febantel'], drugClass: ['antiparasitic'], routes: ['oral'], species: ['canine', 'feline'], manufacturer: 'Bayer' },

  // Antibiotics
  { brand: 'Clavamox', generic: 'Amoxicillin/Clavulanate', ingredients: ['Amoxicillin', 'Clavulanic Acid'], drugClass: ['antibiotic'], routes: ['oral'], species: ['canine', 'feline'], manufacturer: 'Zoetis' },
  { brand: 'Convenia', generic: 'Cefovecin', ingredients: ['Cefovecin'], drugClass: ['antibiotic'], routes: ['injectable'], species: ['canine', 'feline'], manufacturer: 'Zoetis' },
  { brand: 'Baytril', generic: 'Enrofloxacin', ingredients: ['Enrofloxacin'], drugClass: ['antibiotic'], routes: ['oral', 'injectable'], species: ['canine', 'feline'], manufacturer: 'Bayer' },
  { brand: 'Simplicef', generic: 'Cefpodoxime', ingredients: ['Cefpodoxime'], drugClass: ['antibiotic'], routes: ['oral'], species: ['canine'], manufacturer: 'Zoetis' },
  { brand: 'Zeniquin', generic: 'Marbofloxacin', ingredients: ['Marbofloxacin'], drugClass: ['antibiotic'], routes: ['oral'], species: ['canine', 'feline'], manufacturer: 'Zoetis' },

  // Dermatology / Allergy
  { brand: 'Apoquel', generic: 'Oclacitinib', ingredients: ['Oclacitinib Maleate'], drugClass: ['immunosuppressant'], routes: ['oral'], species: ['canine'], manufacturer: 'Zoetis', indications: ['Atopic dermatitis', 'Allergic itch'] },
  { brand: 'Cytopoint', generic: 'Lokivetmab', ingredients: ['Lokivetmab'], drugClass: ['immunosuppressant'], routes: ['injectable'], species: ['canine'], manufacturer: 'Zoetis' },
  { brand: 'Atopica', generic: 'Cyclosporine', ingredients: ['Cyclosporine'], drugClass: ['immunosuppressant'], routes: ['oral'], species: ['canine', 'feline'], manufacturer: 'Elanco' },

  // GI / Antiemetic
  { brand: 'Cerenia', generic: 'Maropitant', ingredients: ['Maropitant Citrate'], drugClass: ['antiemetic'], routes: ['oral', 'injectable'], species: ['canine', 'feline'], manufacturer: 'Zoetis' },

  // Joint / Pain
  { brand: 'Adequan', generic: 'PSGAG', ingredients: ['Polysulfated Glycosaminoglycan'], drugClass: ['other'], routes: ['injectable'], species: ['canine', 'equine'], manufacturer: 'American Regent' },
  { brand: 'Librela', generic: 'Bedinvetmab', ingredients: ['Bedinvetmab'], drugClass: ['analgesic'], routes: ['injectable'], species: ['canine'], manufacturer: 'Zoetis' },
  { brand: 'Solensia', generic: 'Frunevetmab', ingredients: ['Frunevetmab'], drugClass: ['analgesic'], routes: ['injectable'], species: ['feline'], manufacturer: 'Zoetis' },

  // Behavior / Anxiety
  { brand: 'Reconcile', generic: 'Fluoxetine', ingredients: ['Fluoxetine'], drugClass: ['other'], routes: ['oral'], species: ['canine'], manufacturer: 'Elanco' },
  { brand: 'Clomicalm', generic: 'Clomipramine', ingredients: ['Clomipramine'], drugClass: ['other'], routes: ['oral'], species: ['canine'], manufacturer: 'Virbac' },
  { brand: 'Trazodone', generic: 'Trazodone', ingredients: ['Trazodone'], drugClass: ['other'], routes: ['oral'], species: ['canine', 'feline'], manufacturer: 'Various' },
  { brand: 'Sileo', generic: 'Dexmedetomidine', ingredients: ['Dexmedetomidine'], drugClass: ['other'], routes: ['oral'], species: ['canine'], manufacturer: 'Zoetis' },

  // Other common
  { brand: 'Vetmedin', generic: 'Pimobendan', ingredients: ['Pimobendan'], drugClass: ['other'], routes: ['oral'], species: ['canine'], manufacturer: 'Boehringer Ingelheim', indications: ['Congestive heart failure'] },
  { brand: 'Enacard', generic: 'Enalapril', ingredients: ['Enalapril'], drugClass: ['other'], routes: ['oral'], species: ['canine'], manufacturer: 'Various' },
  { brand: 'Vetoryl', generic: 'Trilostane', ingredients: ['Trilostane'], drugClass: ['other'], routes: ['oral'], species: ['canine'], manufacturer: 'Dechra' },
];
