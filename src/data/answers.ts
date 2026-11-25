// The guess list. Every daily answer is here, plus many decoys that are never used.
// Format per line: canonical name | aliases (comma separated) | category
// Players pick from autocomplete, so the canonical id is what gets compared.

export type Category =
  | 'kitchen'
  | 'food'
  | 'nature'
  | 'tools'
  | 'home'
  | 'sports'
  | 'music'
  | 'clothing'
  | 'toys'
  | 'office'
  | 'animals'
  | 'transport';

export type Answer = {
  id: string;
  name: string;
  aliases: string[];
  category: Category;
};

const RAW = `
apple||food
avocado||food
bagel||food
banana||food
blueberry|blueberries|food
bread|loaf|food
broccoli||food
brussels sprout|sprout|food
cabbage||food
carrot||food
cauliflower||food
cheese||food
cherry|cherries|food
chili pepper|chilli,hot pepper|food
chocolate|chocolate bar|food
coconut||food
coffee beans|coffee bean|food
cookie|biscuit|food
corn on the cob|corn,sweetcorn,maize,corncob|food
croissant||food
cucumber||food
cupcake||food
donut|doughnut|food
egg||food
eggplant|aubergine|food
garlic||food
grapes|grape|food
green beans|string beans|food
honeycomb|honey|food
ice cream|gelato|food
kiwi fruit|kiwi,kiwifruit|food
lemon||food
lettuce||food
lime||food
mango||food
melon|cantaloupe|food
mushroom||food
noodles|ramen,spaghetti,pasta|food
olive|olives|food
onion||food
orange||food
pancake|pancakes|food
peach||food
peanut|peanuts|food
pear||food
peas|pea,pea pod|food
pepper|bell pepper,capsicum|food
pineapple||food
pizza||food
pomegranate||food
popcorn||food
potato||food
pretzel||food
pumpkin|squash|food
raspberry|raspberries|food
rice||food
salt||food
sandwich||food
strawberry|strawberries|food
sugar|sugar cubes|food
sushi||food
taco||food
tomato||food
walnut|walnuts|food
watermelon||food
artichoke||food
almond|almonds|food
date fruit|dates|food
fig||food
pistachio|pistachios|food
waffle||food
baking tray|baking sheet|kitchen
blender||kitchen
bottle||kitchen
bowl||kitchen
cheese grater|grater|kitchen
chopsticks||kitchen
colander|strainer,sieve|kitchen
cutting board|chopping board|kitchen
egg carton|egg box,egg tray|kitchen
fork||kitchen
frying pan|skillet,pan|kitchen
glass|drinking glass|kitchen
kettle||kitchen
knife||kitchen
ladle||kitchen
measuring cup||kitchen
microwave||kitchen
mug|cup,coffee cup,teacup|kitchen
oven mitt|oven glove|kitchen
plate|dish|kitchen
rolling pin||kitchen
salt shaker|pepper shaker|kitchen
saucepan|pot|kitchen
spatula||kitchen
spoon|wooden spoon,teaspoon,tablespoon|kitchen
sponge|kitchen sponge|kitchen
tea bag|teabag|kitchen
teapot||kitchen
toaster||kitchen
whisk||kitchen
wooden spoon|wooden spoon,teaspoon,tablespoon|kitchen
wine glass||kitchen
can opener|tin opener|kitchen
corkscrew||kitchen
paper towel|kitchen roll|kitchen
aluminium foil|foil,tin foil,aluminum foil|kitchen
ice cube tray||kitchen
lunchbox|lunch box|kitchen
thermos|flask|kitchen
acorn||nature
bark|tree bark|nature
cactus|cacti|nature
coral||nature
daisy||nature
feather||nature
fern||nature
flower||nature
grass||nature
leaf|leaves|nature
lichen||nature
log|firewood|nature
moss||nature
pebble|pebbles,stone,rock|nature
pine cone|pinecone,fir cone|nature
rose||nature
sand||nature
seashell|shell,sea shell|nature
snowflake|snow|nature
succulent||nature
sunflower||nature
tree||nature
tulip||nature
dandelion||nature
lotus||nature
lavender||nature
orchid||nature
palm tree|palm|nature
mushroom cap|toadstool|nature
starfish|sea star|nature
butterfly||animals
bee|honeybee|animals
cat|kitten|animals
dog|puppy|animals
fish||animals
frog||animals
horse||animals
ladybug|ladybird|animals
owl||animals
parrot||animals
peacock|peafowl|animals
snail||animals
snake||animals
spider||animals
turtle|tortoise|animals
zebra||animals
giraffe||animals
elephant||animals
camel||animals
chicken|hen|animals
cow||animals
sheep|lamb|animals
crab||animals
jellyfish||animals
hedgehog||animals
axe|ax|tools
bolt|nut and bolt|tools
brush|paintbrush,paint brush|tools
chain||tools
drill||tools
file|metal file|tools
hammer||tools
hose|garden hose|tools
key||tools
ladder||tools
nail|nails|tools
padlock|lock|tools
paint roller||tools
pliers||tools
rope||tools
saw||tools
screw|screws|tools
screwdriver||tools
shovel|spade|tools
tape measure|measuring tape|tools
wrench|spanner|tools
zip tie|cable tie|tools
toolbox||tools
wheelbarrow||tools
rake||tools
watering can||tools
level|spirit level|tools
sandpaper||tools
magnifying glass|magnifier,loupe|tools
flashlight|torch|tools
battery|batteries|tools
light bulb|lightbulb,bulb|home
basket||home
bed||home
blanket||home
book||home
broom||home
bucket|pail|home
candle||home
carpet|rug|home
chair||home
clock|wall clock|home
clothespin|clothes peg,peg|home
comb||home
curtain|curtains|home
door||home
doorknob|door handle|home
fan|electric fan|home
faucet|tap|home
hairbrush||home
lamp||home
lightswitch|light switch,switch|home
mirror||home
pillow|cushion|home
plug|power plug|home
radiator||home
remote control|remote,tv remote|home
scissors||home
shampoo||home
soap|bar of soap|home
sofa|couch|home
toilet paper|toilet roll,loo roll|home
toothbrush||home
toothpaste||home
towel||home
umbrella||home
vase||home
window||home
wicker basket||home
houseplant|plant,potted plant|home
match|matches,matchstick|home
lantern||home
safety pin||home
sewing needle|needle|home
thread|spool,cotton reel|home
thimble||home
button||clothing
belt||clothing
boot|boots|clothing
cap|baseball cap|clothing
denim|jeans|clothing
glove|gloves|clothing
hat||clothing
jacket|coat|clothing
necklace||clothing
ring||clothing
scarf||clothing
shoe|sneaker,trainer,trainers,sneakers|clothing
shoelace|lace,laces|clothing
sock|socks|clothing
sunglasses|shades|clothing
sweater|jumper,knitwear,wool sweater|clothing
tie|necktie|clothing
watch|wristwatch|clothing
zipper|zip|clothing
handbag|purse,bag|clothing
backpack|rucksack|clothing
earring|earrings|clothing
glasses|spectacles,eyeglasses|clothing
slipper|slippers|clothing
sandal|sandals,flip flop|clothing
wallet||clothing
baseball||sports
basketball||sports
bicycle|bike|transport
bowling ball||sports
boxing glove||sports
chess piece|chess,chessboard|sports
cricket ball||sports
dart|darts,dartboard|sports
dice|die|toys
football|soccer ball|sports
golf ball||sports
hockey puck|puck|sports
ice skate|skates|sports
ping pong ball|table tennis ball|sports
rugby ball|american football|sports
shuttlecock|birdie|sports
skateboard||sports
surfboard||sports
swimming goggles|goggles|sports
tennis ball||sports
tennis racket|racquet,racket|sports
volleyball||sports
whistle||sports
medal||sports
trophy||sports
dumbbell|weight|sports
accordion||music
drum||music
flute||music
guitar|acoustic guitar|music
harmonica||music
harp||music
headphones|earphones|music
microphone|mic|music
piano|keyboard instrument|music
saxophone|sax|music
speaker|loudspeaker|music
trumpet||music
violin|fiddle|music
vinyl record|record,vinyl|music
oud||music
xylophone||music
balloon||toys
building blocks|lego,bricks|toys
crayons|crayon|toys
jigsaw puzzle|jigsaw,puzzle piece|toys
kite||toys
marbles|marble|toys
playing cards|cards,deck of cards|toys
rubber duck||toys
rubik's cube|rubiks cube,puzzle cube|toys
spinning top|top|toys
teddy bear|teddy|toys
toy car||toys
yo-yo|yoyo|toys
slinky||toys
binder clip|bulldog clip|office
calculator||office
envelope||office
eraser|rubber|office
highlighter||office
keyboard|computer keyboard|office
laptop||office
mouse|computer mouse|office
notebook|notepad|office
paper clip|paperclip|office
pen|ballpoint|office
pencil||office
pencil sharpener|sharpener|office
pushpin|thumbtack,drawing pin|office
ruler||office
stapler||office
sticky note|post-it|office
tape|sticky tape,scotch tape|office
smartphone|phone,mobile phone,cell phone|office
globe||office
stamp|postage stamp|office
coin|coins|office
banknote|money,cash,bill|office
credit card|card|office
floppy disk||office
camera||office
airplane|plane,aeroplane|transport
boat||transport
bus||transport
car||transport
car tyre|tire,tyre,wheel|transport
motorcycle|motorbike|transport
sailboat||transport
scooter||transport
traffic cone|cone|transport
train||transport
anchor||transport
compass||transport
helmet|bike helmet|transport
license plate|number plate|transport
steering wheel||transport
`;

function slug(s: string) {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

export const ANSWERS: Answer[] = RAW.trim()
  .split('\n')
  .map((line) => {
    const [name, aliases, category] = line.split('|');
    return {
      id: slug(name),
      name,
      aliases: aliases ? aliases.split(',').map((a) => a.trim()).filter(Boolean) : [],
      category: category as Category,
    };
  });

export const ANSWERS_BY_ID: Record<string, Answer> = Object.fromEntries(
  ANSWERS.map((a) => [a.id, a]),
);

const norm = (s: string) =>
  s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9 ]/g, '')
    .trim();

/** Suggestions for the typed text. Prefix matches rank first, then word starts, then substrings. */
export function suggest(query: string, exclude: string[] = [], limit = 6): Answer[] {
  const q = norm(query);
  if (!q) return [];
  const scored: { a: Answer; s: number; via?: string }[] = [];
  for (const a of ANSWERS) {
    if (exclude.includes(a.id)) continue;
    let best = 0;
    for (const term of [a.name, ...a.aliases]) {
      const t = norm(term);
      let s = 0;
      if (t === q) s = 4;
      else if (t.startsWith(q)) s = 3;
      else if (t.split(' ').some((w) => w.startsWith(q))) s = 2;
      else if (q.length >= 3 && t.includes(q)) s = 1;
      if (s > best) best = s;
    }
    if (best) scored.push({ a, s: best });
  }
  scored.sort((x, y) => y.s - x.s || x.a.name.length - y.a.name.length);
  return scored.slice(0, limit).map((x) => x.a);
}
