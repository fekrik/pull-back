import { ImageSourcePropType } from 'react-native';

export type Puzzle = {
  id: string;
  answerId: string;
  image: ImageSourcePropType;
  /** Focal point in 0..1 coordinates of the square image. */
  focal: { x: number; y: number };
  /** Optional per-puzzle override of the six level shares. */
  levels?: number[];
  difficulty: 'easy' | 'medium' | 'hard';
  credit: { title: string; author: string; license: string; url?: string };
};

export const PUZZLES: Puzzle[] = [
  {
    id: "croissant",
    answerId: "croissant",
    image: require('../../assets/puzzles/croissant.jpg'),
    focal: { x: 0.5, y: 0.4 },
    difficulty: "medium",
    credit: {"title": "Croissant - Massachusetts", "author": "Daderot", "license": "CC0", "url": "https://commons.wikimedia.org/wiki/File:Croissant_-_Massachusetts.jpg"},
  },
  {
    id: "sunflower",
    answerId: "sunflower",
    image: require('../../assets/puzzles/sunflower.jpg'),
    focal: { x: 0.35, y: 0.32 },
    difficulty: "medium",
    credit: {"title": "Sunflower head 2026 G1", "author": "George Chernilevsky", "license": "CC BY 4.0", "url": "https://commons.wikimedia.org/wiki/File:Sunflower_head_2026_G1.jpg"},
  },
  {
    id: "honeycomb",
    answerId: "honeycomb",
    image: require('../../assets/puzzles/honeycomb.jpg'),
    focal: { x: 0.5, y: 0.45 },
    difficulty: "medium",
    credit: {"title": "Abandoned bee honeycomb", "author": "Charles J. Sharp", "license": "CC BY-SA 4.0", "url": "https://commons.wikimedia.org/wiki/File:Abandoned_bee_honeycomb.jpg"},
  },
  {
    id: "pine-cone",
    answerId: "pine-cone",
    image: require('../../assets/puzzles/pine-cone.jpg'),
    focal: { x: 0.42, y: 0.5 },
    difficulty: "hard",
    credit: {"title": "A pine cone", "author": "Petar Milo\u0161evi\u0107", "license": "CC BY-SA 4.0", "url": "https://commons.wikimedia.org/wiki/File:A_pine_cone.jpg"},
  },
  {
    id: "padlock",
    answerId: "padlock",
    image: require('../../assets/puzzles/padlock.jpg'),
    focal: { x: 0.45, y: 0.62 },
    difficulty: "hard",
    credit: {"title": "Rusty padlock on Blacks, Oban, July 2020", "author": "Blood Red Sandman", "license": "CC BY 4.0", "url": "https://commons.wikimedia.org/wiki/File:Rusty_padlock_on_Blacks,_Oban,_July_2020.jpg"},
  },
  {
    id: "strawberry",
    answerId: "strawberry",
    image: require('../../assets/puzzles/strawberry.jpg'),
    focal: { x: 0.575, y: 0.45 },
    difficulty: "easy",
    credit: {"title": "Garden strawberry (Fragaria \u00d7 ananassa) single2", "author": "Ivar Leidus", "license": "CC BY-SA 4.0", "url": "https://commons.wikimedia.org/wiki/File:Garden_strawberry_(Fragaria_%C3%97_ananassa)_single2.jpg"},
  },
  {
    id: "tennis-ball",
    answerId: "tennis-ball",
    image: require('../../assets/puzzles/tennis-ball.jpg'),
    focal: { x: 0.4, y: 0.45 },
    difficulty: "easy",
    credit: {"title": "A type of tennis ball", "author": "Bertoka", "license": "CC0", "url": "https://commons.wikimedia.org/wiki/File:A_type_of_tennis_ball.jpg"},
  },
  {
    id: "guitar",
    answerId: "guitar",
    image: require('../../assets/puzzles/guitar.jpg'),
    focal: { x: 0.72, y: 0.5 },
    difficulty: "medium",
    credit: {"title": "Guitar May 2009-1", "author": "Alvesgaspar", "license": "CC BY 3.0", "url": "https://commons.wikimedia.org/wiki/File:Guitar_May_2009-1.jpg"},
  },
  {
    id: "cactus",
    answerId: "cactus",
    image: require('../../assets/puzzles/cactus.jpg'),
    focal: { x: 0.6, y: 0.35 },
    difficulty: "medium",
    credit: {"title": "Pine View Nursery - Cactus - Cleistocactus winteri - Golden Rat Tail 03", "author": "Sumit Surai", "license": "CC BY-SA 4.0", "url": "https://commons.wikimedia.org/wiki/File:Pine_View_Nursery_-_Cactus_-_Cleistocactus_winteri_-_Golden_Rat_Tail_03.jpg"},
  },
  {
    id: "spoon",
    answerId: "spoon",
    image: require('../../assets/puzzles/spoon.jpg'),
    focal: { x: 0.25, y: 0.45 },
    levels: [0.015, 0.04, 0.1, 0.25, 0.5, 1],
    difficulty: "medium",
    credit: {"title": "Wooden Spoon and Fork 01", "author": "PagesAndPathsPH", "license": "CC0", "url": "https://commons.wikimedia.org/wiki/File:Wooden_Spoon_and_Fork_01.jpg"},
  },
  {
    id: "cauliflower",
    answerId: "cauliflower",
    image: require('../../assets/puzzles/cauliflower.jpg'),
    focal: { x: 0.35, y: 0.45 },
    difficulty: "hard",
    credit: {"title": "Cauliflower (20240611)", "author": "Fumikas Sagisavas", "license": "CC0", "url": "https://commons.wikimedia.org/wiki/File:Cauliflower_(20240611).jpg"},
  },
  {
    id: "pineapple",
    answerId: "pineapple",
    image: require('../../assets/puzzles/pineapple.jpg'),
    focal: { x: 0.395, y: 0.45 },
    levels: [0.02, 0.045, 0.1, 0.25, 0.5, 1],
    difficulty: "hard",
    credit: {"title": "Ananas (Ananas comosus), Fr\u00fcchte", "author": "flowcomm", "license": "CC BY 2.0", "url": "https://commons.wikimedia.org/wiki/File:Ananas_(Ananas_comosus),_Fr%C3%BCchte.jpg"},
  },
  {
    id: "corn-on-the-cob",
    answerId: "corn-on-the-cob",
    image: require('../../assets/puzzles/corn-on-the-cob.jpg'),
    focal: { x: 0.57, y: 0.4 },
    difficulty: "easy",
    credit: {"title": "Corn on the cob - Massachusetts", "author": "Daderot", "license": "CC0", "url": "https://commons.wikimedia.org/wiki/File:Corn_on_the_cob_-_Massachusetts.jpg"},
  },
  {
    id: "kiwi-fruit",
    answerId: "kiwi-fruit",
    image: require('../../assets/puzzles/kiwi-fruit.jpg'),
    focal: { x: 0.6, y: 0.42 },
    difficulty: "easy",
    credit: {"title": "Kiwifruit cross section", "author": "Ivar Leidus", "license": "CC BY-SA 4.0", "url": "https://commons.wikimedia.org/wiki/File:Kiwifruit_cross_section.jpg"},
  },
];
