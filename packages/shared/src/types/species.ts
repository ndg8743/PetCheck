/**
 * Species definitions for veterinary drug safety
 */

export type SpeciesCategory =
  | 'canine'      // Dogs
  | 'feline'      // Cats
  | 'equine'      // Horses
  | 'bovine'      // Cattle
  | 'porcine'     // Pigs
  | 'ovine'       // Sheep
  | 'caprine'     // Goats
  | 'avian'       // Birds
  | 'fish'        // Fish
  | 'reptile'     // Reptiles
  | 'lagomorph'   // Rabbits
  | 'rodent'      // Rodents
  | 'exotic'      // Other exotic pets
  | 'other';

export interface Species {
  id: SpeciesCategory;
  name: string;
  commonNames: string[];
  openFdaTerms: string[];  // Terms used in openFDA queries
}

export const SPECIES_LIST: Species[] = [
  {
    id: 'canine',
    name: 'Dog',
    commonNames: ['Dog', 'Canine', 'Puppy'],
    openFdaTerms: ['Dog', 'Canine']
  },
  {
    id: 'feline',
    name: 'Cat',
    commonNames: ['Cat', 'Feline', 'Kitten'],
    openFdaTerms: ['Cat', 'Feline']
  },
  {
    id: 'equine',
    name: 'Horse',
    commonNames: ['Horse', 'Equine', 'Pony', 'Foal'],
    openFdaTerms: ['Horse', 'Equine']
  },
  {
    id: 'bovine',
    name: 'Cattle',
    commonNames: ['Cattle', 'Cow', 'Bovine', 'Calf', 'Bull'],
    openFdaTerms: ['Cattle', 'Bovine', 'Cow']
  },
  {
    id: 'porcine',
    name: 'Pig',
    commonNames: ['Pig', 'Swine', 'Porcine', 'Hog'],
    openFdaTerms: ['Pig', 'Swine', 'Porcine']
  },
  {
    id: 'ovine',
    name: 'Sheep',
    commonNames: ['Sheep', 'Ovine', 'Lamb'],
    openFdaTerms: ['Sheep', 'Ovine']
  },
  {
    id: 'caprine',
    name: 'Goat',
    commonNames: ['Goat', 'Caprine', 'Kid'],
    openFdaTerms: ['Goat', 'Caprine']
  },
  {
    id: 'avian',
    name: 'Bird',
    commonNames: ['Bird', 'Avian', 'Poultry', 'Chicken', 'Turkey', 'Parrot'],
    openFdaTerms: ['Bird', 'Avian', 'Poultry', 'Chicken']
  },
  {
    id: 'fish',
    name: 'Fish',
    commonNames: ['Fish', 'Aquatic'],
    openFdaTerms: ['Fish']
  },
  {
    id: 'reptile',
    name: 'Reptile',
    commonNames: ['Reptile', 'Snake', 'Lizard', 'Turtle', 'Tortoise'],
    openFdaTerms: ['Reptile']
  },
  {
    id: 'lagomorph',
    name: 'Rabbit',
    commonNames: ['Rabbit', 'Lagomorph', 'Bunny', 'Hare'],
    openFdaTerms: ['Rabbit', 'Lagomorph']
  },
  {
    id: 'rodent',
    name: 'Rodent',
    commonNames: ['Rodent', 'Mouse', 'Rat', 'Hamster', 'Guinea Pig', 'Gerbil'],
    openFdaTerms: ['Rodent', 'Mouse', 'Rat']
  },
  {
    id: 'exotic',
    name: 'Exotic',
    commonNames: ['Exotic', 'Ferret', 'Hedgehog'],
    openFdaTerms: ['Exotic', 'Ferret']
  },
  {
    id: 'other',
    name: 'Other',
    commonNames: ['Other', 'Unknown'],
    openFdaTerms: ['Other']
  }
];

export function getSpeciesById(id: SpeciesCategory): Species | undefined {
  return SPECIES_LIST.find(s => s.id === id);
}

export function getSpeciesByName(name: string): Species | undefined {
  const normalized = name.toLowerCase();
  return SPECIES_LIST.find(s =>
    s.name.toLowerCase() === normalized ||
    s.commonNames.some(n => n.toLowerCase() === normalized) ||
    s.openFdaTerms.some(t => t.toLowerCase() === normalized)
  );
}
