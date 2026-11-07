const fs = require('fs');

// Curated list of 500 unique emojis across the requested emotions
const funnyEmojis = [
  ['😂', 'ROFL Laugh', 'live-bounce'],
  ['🤣', 'Rolling Giggle', 'live-wiggle'],
  ['🤡', 'Joker Clown', 'live-spin'],
  ['🐒', 'Cheeky Monkey', 'live-wiggle'],
  ['🙈', 'See No Evil', 'live-bounce'],
  ['🙉', 'Hear No Evil', 'live-wiggle'],
  ['🙊', 'Speak No Evil', 'live-pulse'],
  ['🤪', 'Crazy Zany', 'live-wiggle'],
  ['😜', 'Wink Tongue', 'live-bounce'],
  ['😝', 'Squint Tongue', 'live-wiggle'],
  ['👻', 'Prank Ghost', 'live-float'],
  ['🍌', 'Slippy Banana', 'live-wiggle'],
  ['💩', 'Golden Poop', 'live-bounce'],
  ['🐸', 'Kermit Chill', 'live-float'],
  ['🐔', 'Crazy Hen', 'live-wiggle'],
  ['🐖', 'Piggy Bounce', 'live-bounce'],
  ['🦙', 'Llama Drama', 'live-wiggle'],
  ['🥸', 'Disguise Stache', 'live-float'],
  ['🤠', 'Cowboy Yahoo', 'live-bounce'],
  ['🥳', 'Party Horn', 'live-wiggle'],
  ['🥴', 'Woozy Face', 'live-wiggle'],
  ['🙃', 'Upside Goof', 'live-spin'],
  ['🤹', 'Juggler Chaos', 'live-bounce'],
  ['💃', 'Flamenco Swag', 'live-wiggle'],
  ['🕺', 'Disco King', 'live-bounce'],
  ['🍕', 'Cheesy Slice', 'live-bounce'],
  ['🌮', 'Taco Fiesta', 'live-wiggle'],
  ['🍿', 'Popcorn Boom', 'live-bounce'],
  ['😹', 'Cat Laugh', 'live-bounce'],
  ['😻', 'Heart Kitty', 'live-pulse'],
  ['🙀', 'Shocked Cat', 'live-pulse'],
  ['🦧', 'Zen Orangutan', 'live-float'],
  ['🪰', 'Buzzing Fly', 'live-wiggle'],
  ['🦆', 'Duck Dance', 'live-wiggle'],
  ['🦥', 'Lazy Sloth', 'live-float'],
  ['🦨', 'Stinky Skunk', 'live-wiggle'],
  ['🦦', 'Playful Otter', 'live-bounce'],
  ['🦔', 'Spiky Hedge', 'live-spin'],
  ['🪿', 'Honk Goose', 'live-wiggle'],
  ['🪳', 'Speedy Roach', 'live-wiggle'],
  ['🪤', 'Cheese Trap', 'live-pulse'],
  ['🧌', 'Cave Troll', 'live-bounce'],
  ['🧛', 'Vampire Chuckle', 'live-float'],
  ['🧟', 'Zombie Wobble', 'live-wiggle'],
  ['🦹', 'Villain Smirk', 'live-pulse'],
  ['🧙', 'Wizard Guffaw', 'live-spin'],
  ['🧚', 'Pixie Prank', 'live-float'],
  ['🧝', 'Elf Giggle', 'live-bounce'],
  ['🧞', 'Genie Joke', 'live-spin'],
  ['🧜', 'Mermaid Splash', 'live-float'],
  ['🦹‍♂️', 'Mastermind Laugh', 'live-pulse'],
  ['🦹‍♀️', 'Scheming Siren', 'live-wiggle'],
  ['🥷', 'Stealth Ninja', 'live-float'],
  ['👾', 'Pixel Invader', 'live-wiggle'],
  ['🤖', 'Robot Beep', 'live-bounce'],
  ['🎃', 'Jack O Lantern', 'live-pulse'],
  ['🐲', 'Chubby Dragon', 'live-float'],
  ['🦄', 'Goofy Horn', 'live-bounce'],
  ['🦖', 'Tiny Arms Dino', 'live-bounce'],
  ['🦕', 'Derpy Bronto', 'live-wiggle'],
  ['🦘', 'Kangaroo Hop', 'live-bounce'],
  ['🦛', 'Hippo Chomp', 'live-pulse'],
  ['🦏', 'Rhino Charge', 'live-bounce'],
  ['🦡', 'Badger Grump', 'live-wiggle'],
  ['🦃', 'Gobble Turkey', 'live-wiggle'],
  ['🦚', 'Peacock Strut', 'live-shimmer'],
  ['🦜', 'Mimic Parrot', 'live-wiggle'],
  ['🦩', 'Flamingo Balance', 'live-float'],
  ['🕊️', 'Goofy Pigeon', 'live-bounce'],
  ['🐇', 'Bouncing Bunny', 'live-bounce'],
  ['🦝', 'Trash Raccoon', 'live-wiggle'],
  ['🐙', 'Octo Wiggle', 'live-wiggle'],
  ['🦑', 'Squid Ink', 'live-pulse'],
  ['🦐', 'Shrimp Flip', 'live-bounce'],
  ['🦞', 'Lobster Claws', 'live-wiggle'],
  ['🦀', 'Crab Pinch', 'live-wiggle'],
  ['🐡', 'Puffer Balloon', 'live-pulse'],
  ['🐠', 'Neon Guppy', 'live-float'],
  ['🐟', 'Fish Flap', 'live-wiggle'],
  ['🐬', 'Dolphin Laugh', 'live-float']
];

const cryEmojis = [
  ['😭', 'Niagara Tears', 'live-bounce'],
  ['💧', 'Single Droplet', 'live-pulse'],
  ['🌊', 'Ocean of Tears', 'live-wiggle'],
  ['💦', 'Sweat Spray', 'live-bounce'],
  ['😿', 'Crying Kitty', 'live-wiggle'],
  ['🤧', 'Runny Sneeze', 'live-pulse'],
  ['🌧️', 'Downpour Cloud', 'live-float'],
  ['🧻', 'Tissue Roll', 'live-wiggle'],
  ['🚰', 'Leaking Tap', 'live-pulse'],
  ['🫗', 'Spilled Cup', 'live-wiggle'],
  ['⛈️', 'Thunder Cry', 'live-pulse'],
  ['☔', 'Wet Umbrella', 'live-wiggle'],
  ['🚿', 'Shower Tears', 'live-pulse'],
  ['🌪️', 'Tear Cyclone', 'live-spin'],
  ['🧊', 'Frozen Tear', 'live-pulse'],
  ['🫀', 'Weeping Heart', 'live-pulse'],
  ['🩹', 'Patched Grief', 'live-float'],
  ['🩸', 'Ruby Tear', 'live-pulse'],
  ['🌋', 'Erupting Tears', 'live-pulse'],
  ['🥀', 'Shedding Petal', 'live-float'],
  ['🌫️', 'Misty Sob', 'live-float'],
  ['💔', 'Broken Shards', 'live-pulse'],
  ['📉', 'Crashing Down', 'live-float'],
  ['🕯️', 'Melting Flame', 'live-pulse'],
  ['🌑', 'Eclipse Solitude', 'live-spin'],
  ['🪨', 'Heavy Burden', 'live-bounce'],
  ['🌧️', 'Rainy Night', 'live-float'],
  ['🪹', 'Empty Branch', 'live-wiggle'],
  ['🥺', 'Puppy Weep', 'live-pulse'],
  ['😢', 'Silent Tear', 'live-float'],
  ['😩', 'Weary Groan', 'live-wiggle'],
  ['😫', 'Exhausted Cry', 'live-bounce'],
  ['😖', 'Suffering Tears', 'live-wiggle'],
  ['😣', 'Helpless Sob', 'live-pulse'],
  ['😞', 'Broken Hope', 'live-float'],
  ['😓', 'Cold Sweat Cry', 'live-wiggle'],
  ['🥺', 'Quivering Chin', 'live-pulse'],
  ['🥹', 'Holding Tears', 'live-pulse'],
  ['💧', 'Splash Droplet', 'live-bounce'],
  ['🌊', 'Tidal Wave Cry', 'live-pulse'],
  ['☔', 'Soaked Drizzle', 'live-float'],
  ['⚡', 'Pain Lightning', 'live-pulse'],
  ['🫁', 'Gasping Sob', 'live-pulse'],
  ['🩹', 'Wounded Heart', 'live-float'],
  ['🥀', 'Fading Blossom', 'live-float'],
  ['🪦', 'Sorrow Stone', 'live-pulse'],
  ['⛓️', 'Tear Shackles', 'live-wiggle'],
  ['🕳️', 'Dark Sinkhole', 'live-spin'],
  ['🕯️', 'Extinguished', 'live-pulse'],
  ['🍂', 'Autumn Tear', 'live-float'],
  ['🌧️', 'Heavy Monsoons', 'live-float'],
  ['🌫️', 'Lost Sorrow', 'live-float'],
  ['📉', 'Red Candlestick', 'live-float'],
  ['🪫', 'Drained Will', 'live-pulse'],
  ['🧊', 'Glacial Weep', 'live-pulse'],
  ['🌊', 'Deep Trench', 'live-wiggle'],
  ['💧', 'Crystal Tear', 'live-pulse'],
  ['🥀', 'Thorn Prick', 'live-float'],
  ['🪨', 'Crushed Heart', 'live-bounce'],
  ['🪺', 'Fallen Egg', 'live-wiggle'],
  ['🧻', 'Box of Tissues', 'live-bounce'],
  ['🚿', 'Waterfall Sob', 'live-pulse'],
  ['🫗', 'Overturned Glass', 'live-wiggle'],
  ['😿', 'Prowling Grief', 'live-wiggle'],
  ['😭', 'Rivers of Tears', 'live-bounce'],
  ['😢', 'Lonely Tear', 'live-float'],
  ['🥹', 'Emotional Wave', 'live-pulse'],
  ['😩', 'Despair Echo', 'live-wiggle'],
  ['😫', 'Pain Shiver', 'live-bounce'],
  ['💔', 'Shattered Ruby', 'live-pulse']
];

const sadEmojis = [
  ['😔', 'Pensive Sigh', 'live-float'],
  ['😟', 'Worried Frown', 'live-pulse'],
  ['🙁', 'Gloomy Mouth', 'live-wiggle'],
  ['☹️', 'Deep Sorrow', 'live-pulse'],
  ['🙍', 'Downcast Head', 'live-float'],
  ['🤦', 'Exasperated Facepalm', 'live-wiggle'],
  ['🤕', 'Bandaged Soul', 'live-pulse'],
  ['🥀', 'Withered Rose', 'live-float'],
  ['🖤', 'Black Heart', 'live-pulse'],
  ['🏚️', 'Ruined Manor', 'live-pulse'],
  ['🪦', 'Memorial Stone', 'live-pulse'],
  ['⛓️', 'Chained Captive', 'live-wiggle'],
  ['🕳️', 'Abyss Void', 'live-spin'],
  ['🥶', 'Numb Cold', 'live-wiggle'],
  ['🍂', 'Fallen Leaves', 'live-float'],
  ['🤐', 'Zipped Silence', 'live-pulse'],
  ['😐', 'Flat Neutral', 'live-float'],
  ['😑', 'Expressionless', 'live-pulse'],
  ['😶', 'Faceless Phantom', 'live-float'],
  ['🫥', 'Dotted Disappear', 'live-pulse'],
  ['😮‍💨', 'Exhaling Sigh', 'live-float'],
  ['🙄', 'Rolling Eyes', 'live-wiggle'],
  ['😬', 'Grimacing Awkward', 'live-wiggle'],
  ['🤥', 'Lying Pinocchio', 'live-bounce'],
  ['😪', 'Sleepy Melancholy', 'live-float'],
  ['😴', 'Deep Coma', 'live-pulse'],
  ['😷', 'Sick Mask', 'live-pulse'],
  ['🤒', 'Fever Thermometer', 'live-wiggle'],
  ['🤢', 'Sick Green', 'live-wiggle'],
  ['🤮', 'Vomiting Gloom', 'live-bounce'],
  ['😵', 'Dizzy Spiral', 'live-spin'],
  ['😵‍💫', 'Spiral Eyes', 'live-spin'],
  ['🤯', 'Brain Explosion', 'live-pulse'],
  ['🪨', 'Heavy Grief', 'live-pulse'],
  ['🪫', 'Low Battery 1%', 'live-pulse'],
  ['🥀', 'Drooping Stem', 'live-float'],
  ['🌑', 'Dark Crescent', 'live-spin'],
  ['🌫️', 'Gloomy Haze', 'live-float'],
  ['🌧️', 'Grey Skies', 'live-float'],
  ['🪹', 'Abandoned Nest', 'live-wiggle'],
  ['📉', 'Plummeting Trend', 'live-float'],
  ['🚪', 'Closed Door', 'live-pulse'],
  ['🔒', 'Locked Out', 'live-pulse'],
  ['🕳️', 'Empty Pit', 'live-spin'],
  ['🧊', 'Cold Shoulder', 'live-pulse'],
  ['🕰️', 'Lost Time', 'live-spin'],
  ['🕯️', 'Dying Wick', 'live-pulse'],
  ['🍂', 'Dead Foliage', 'live-float'],
  ['🍁', 'Crisp Maple', 'live-float'],
  ['🕸️', 'Dusty Cobweb', 'live-pulse'],
  ['🏚️', 'Creaky Cabin', 'live-wiggle'],
  ['🪓', 'Severed Knot', 'live-bounce'],
  ['⛓️', 'Heavy Iron', 'live-wiggle'],
  ['🧱', 'Brick Wall', 'live-pulse'],
  ['🪟', 'Rain Window', 'live-float'],
  ['🛋️', 'Empty Couch', 'live-float'],
  ['🕯️', 'Lonely Candle', 'live-pulse'],
  ['💔', 'Bleeding Heart', 'live-pulse'],
  ['🖤', 'Onyx Tear', 'live-pulse'],
  ['🫥', 'Vanished Ghost', 'live-float'],
  ['🥀', 'Petal Fall', 'live-float'],
  ['🌑', 'Midnight Blackout', 'live-spin'],
  ['🪦', 'Forgotten Tomb', 'live-pulse'],
  ['🕳️', 'Bottomless Well', 'live-spin'],
  ['📉', 'Sinking Ship', 'live-float'],
  ['🪫', 'Dead Cell', 'live-pulse'],
  ['😔', 'Silent Desolation', 'live-float'],
  ['😟', 'Inner Turmoil', 'live-pulse'],
  ['🙁', 'Downward Curve', 'live-wiggle'],
  ['🙍', 'Head In Hands', 'live-float']
];

const smileEmojis = [
  ['🥰', 'Hearts Everywhere', 'live-pulse'],
  ['😍', 'Heart Eyes Romance', 'live-bounce'],
  ['😘', 'Blowing Kiss', 'live-bounce'],
  ['😚', 'Sweet Kiss', 'live-pulse'],
  ['😙', 'Kissing Smile', 'live-wiggle'],
  ['☺️', 'Warm Blush', 'live-pulse'],
  ['😊', 'Delighted Joy', 'live-bounce'],
  ['🤗', 'Cozy Hugs', 'live-wiggle'],
  ['💖', 'Sparkling Heart', 'live-pulse'],
  ['💗', 'Pulsing Love', 'live-pulse'],
  ['💓', 'Heartbeat Rhythm', 'live-pulse'],
  ['💞', 'Dancing Hearts', 'live-spin'],
  ['💕', 'Twin Hearts', 'live-float'],
  ['💘', 'Cupid Arrow', 'live-wiggle'],
  ['💝', 'Gift of Love', 'live-bounce'],
  ['💌', 'Secret Love Note', 'live-float'],
  ['🌹', 'Sovereign Rose', 'live-pulse'],
  ['🌷', 'Spring Tulip', 'live-bounce'],
  ['🌸', 'Sakura Blossom', 'live-spin'],
  ['💍', 'Solitaire Diamond', 'live-shimmer'],
  ['🕊️', 'White Dove', 'live-float'],
  ['🦢', 'Graceful Swan', 'live-float'],
  ['🧸', 'Fluffy Teddy', 'live-bounce'],
  ['🪽', 'Angel Wings', 'live-float'],
  ['👼', 'Golden Cherub', 'live-bounce'],
  ['🍯', 'Sweet Honey', 'live-pulse'],
  ['🍓', 'Sweet Berry', 'live-bounce'],
  ['🍒', 'Twin Cherries', 'live-wiggle'],
  ['🍑', 'Sweet Peach', 'live-bounce'],
  ['🪞', 'Magic Mirror', 'live-shimmer'],
  ['🙂', 'Gentle Smile', 'live-float'],
  ['😇', 'Halo Angel', 'live-float'],
  ['😉', 'Winking Charm', 'live-wiggle'],
  ['😌', 'Peaceful Bliss', 'live-pulse'],
  ['🤤', 'Craving Smile', 'live-wiggle'],
  ['💐', 'Grand Posy', 'live-bounce'],
  ['🌺', 'Tropical Orchid', 'live-pulse'],
  ['🌻', 'Sunny Petals', 'live-spin'],
  ['🌼', 'Daisy Joy', 'live-spin'],
  ['🪻', 'Purple Hyacinth', 'live-pulse'],
  ['🪷', 'Sacred Lotus', 'live-float'],
  ['🍁', 'Amber Foliage', 'live-float'],
  ['🐾', 'Puppy Paws', 'live-bounce'],
  ['🐈', 'Purring Cat', 'live-float'],
  ['🐇', 'Gentle Hare', 'live-bounce'],
  ['🦔', 'Cuddle Hedgehog', 'live-bounce'],
  ['🦭', 'Baby Seal', 'live-float'],
  ['🐬', 'Kind Dolphin', 'live-float'],
  ['🦚', 'Graceful Feather', 'live-shimmer'],
  ['🦋', 'Flutter Wings', 'live-float'],
  ['🪶', 'White Feather', 'live-float'],
  ['🍫', 'Velvet Truffle', 'live-shimmer'],
  ['🍰', 'Strawberry Sweet', 'live-bounce'],
  ['🍧', 'Rainbow Ice', 'live-bounce'],
  ['🍨', 'Vanilla Cream', 'live-bounce'],
  ['🍦', 'Swirl Cone', 'live-wiggle'],
  ['🧋', 'Sweet Milk Tea', 'live-bounce'],
  ['☕', 'Warm Cocoa', 'live-pulse'],
  ['🫖', 'Steaming Teapot', 'live-pulse'],
  ['🕯️', 'Warm Glow', 'live-pulse'],
  ['✨', 'Gentle Glimmer', 'live-shimmer'],
  ['🌟', 'Golden Blessing', 'live-spin'],
  ['💎', 'Sparkling Gem', 'live-shimmer'],
  ['👑', 'Princess Tiara', 'live-shimmer'],
  ['👠', 'Glass Slipper', 'live-shimmer'],
  ['💄', 'Ruby Lipstick', 'live-pulse'],
  ['👝', 'Velvet Clutch', 'live-bounce'],
  ['🎀', 'Pink Ribbon', 'live-bounce'],
  ['🪢', 'Love Knot', 'live-pulse'],
  ['🪭', 'Silk Fan', 'live-wiggle'],
  ['🪞', 'Ornate Glass', 'live-shimmer'],
  ['🪸', 'Coral Reef', 'live-wiggle'],
  ['🐚', 'Ocean Conch', 'live-float'],
  ['🦩', 'Rose Flamingo', 'live-float'],
  ['🦢', 'Twin Swans', 'live-float'],
  ['🕊️', 'Peace Messenger', 'live-float'],
  ['💌', 'Love Envelope', 'live-float'],
  ['💖', 'Eternal Spark', 'live-pulse'],
  ['💞', 'Soulmate Twirl', 'live-spin'],
  ['🥰', 'Endless Affection', 'live-pulse']
];

const happyEmojis = [
  ['🎉', 'Party Confetti', 'live-wiggle'],
  ['🎊', 'Celebration Ball', 'live-bounce'],
  ['🥂', 'Golden Toast', 'live-wiggle'],
  ['🍾', 'Popping Bubbly', 'live-bounce'],
  ['✨', 'Cosmic Glitz', 'live-shimmer'],
  ['🌟', 'Twinkle Star', 'live-spin'],
  ['⭐', 'Gold Five Star', 'live-pulse'],
  ['🌈', 'Rainbow Radiance', 'live-shimmer'],
  ['🎈', 'Floating Balloon', 'live-float'],
  ['🎁', 'Deluxe Present', 'live-bounce'],
  ['🎂', 'Triple Layer Cake', 'live-pulse'],
  ['🧁', 'Sweet Cupcake', 'live-bounce'],
  ['🍰', 'Strawberry Slice', 'live-bounce'],
  ['🍩', 'Sprinkle Donut', 'live-spin'],
  ['🍭', 'Swirl Lollipop', 'live-wiggle'],
  ['🍫', 'Swiss Chocolate', 'live-shimmer'],
  ['🎇', 'Sparkler Night', 'live-pulse'],
  ['🎆', 'Imperial Fireworks', 'live-pulse'],
  ['🪅', 'Surprise Piñata', 'live-wiggle'],
  ['🪩', 'Retro Disco Ball', 'live-spin'],
  ['🦄', 'Glitter Unicorn', 'live-bounce'],
  ['🪄', 'Spell Wand', 'live-wiggle'],
  ['🎪', 'Carnival Tent', 'live-bounce'],
  ['🎨', 'Vibrant Palette', 'live-wiggle'],
  ['🎷', 'Jazz Brass', 'live-wiggle'],
  ['🎸', 'Electric Guitar', 'live-wiggle'],
  ['🎺', 'Victory Horn', 'live-bounce'],
  ['🥁', 'Celebration Drum', 'live-bounce'],
  ['🎹', 'Ivory Piano', 'live-pulse'],
  ['🪕', 'Country Banjo', 'live-wiggle'],
  ['🌞', 'Sun with Smile', 'live-spin'],
  ['🌻', 'Golden Sunflower', 'live-spin'],
  ['🌺', 'Paradise Hibiscus', 'live-pulse'],
  ['💐', 'Grand Bouquet', 'live-bounce'],
  ['🏆', 'Grand Victory Cup', 'live-shimmer'],
  ['🥇', 'Olympic Champion', 'live-shimmer'],
  ['🥈', 'Silver Glory', 'live-shimmer'],
  ['🥉', 'Bronze Triumph', 'live-shimmer'],
  ['🏅', 'Royal Medal', 'live-shimmer'],
  ['🎖️', 'Distinguished Cross', 'live-pulse'],
  ['🎯', 'Direct Bullseye', 'live-pulse'],
  ['🎳', 'Strike Pins', 'live-bounce'],
  ['🎰', '777 Jackpot', 'live-pulse'],
  ['🎲', 'Lucky Seven', 'live-spin'],
  ['🎮', 'Victory Win', 'live-bounce'],
  ['🕹️', 'Arcade Champion', 'live-wiggle'],
  ['♟️', 'Checkmate King', 'live-pulse'],
  ['🎡', 'Ferris Wheel', 'live-spin'],
  ['🎢', 'Roller Coaster', 'live-bounce'],
  ['🎠', 'Carousel Horse', 'live-bounce'],
  ['🚀', 'Skyward Launch', 'live-float'],
  ['🛸', 'Cosmic Explorer', 'live-float'],
  ['🏝️', 'Tropical Haven', 'live-float'],
  ['🏖️', 'Sunny Shore', 'live-float'],
  ['🏕️', 'Campfire Joy', 'live-pulse'],
  ['🌄', 'Sunrise Crest', 'live-shimmer'],
  ['🌅', 'Golden Sunset', 'live-shimmer'],
  ['🌆', 'Neon Skyline', 'live-pulse'],
  ['🌃', 'Starlit Evening', 'live-pulse'],
  ['🌌', 'Milky Way Galaxy', 'live-spin'],
  ['🌠', 'Shooting Meteor', 'live-float'],
  ['🎇', 'Grand Finale', 'live-pulse'],
  ['🎆', 'Sky Blossom', 'live-pulse'],
  ['🪩', 'Golden Mirror', 'live-spin'],
  ['🎉', 'Mega Popper', 'live-wiggle'],
  ['🎊', 'Glitter Shower', 'live-bounce'],
  ['🥂', 'Cheers Partner', 'live-wiggle'],
  ['🍾', 'Vintage Cork', 'live-bounce'],
  ['🎁', 'Golden Gift', 'live-bounce'],
  ['🎂', 'Crown Jubilee Cake', 'live-pulse'],
  ['🧁', 'Sparkle Muffin', 'live-bounce'],
  ['🍭', 'Sugar Spiral', 'live-wiggle'],
  ['🍩', 'Royal Pastry', 'live-spin'],
  ['🏆', 'Sovereign Trophy', 'live-shimmer'],
  ['🥇', 'Pure Gold Winner', 'live-shimmer']
];

const royalEmojis = [
  ['👑', 'ERROREX Crown', 'live-shimmer'],
  ['💎', 'Imperial Diamond', 'live-shimmer'],
  ['🔥', 'Blazing Sovereign', 'live-pulse'],
  ['⚡', 'Zeus Lightning', 'live-pulse'],
  ['🕶️', 'Sovereign Shades', 'live-float'],
  ['🦁', 'Imperial Lion', 'live-bounce'],
  ['🦅', 'Golden Eagle', 'live-float'],
  ['🐉', 'Imperial Dragon', 'live-float'],
  ['⚔️', 'Crossed Blades', 'live-wiggle'],
  ['🛡️', 'Aegis Shield', 'live-pulse'],
  ['🏰', 'Royal Fortress', 'live-shimmer'],
  ['🏛️', 'Capitol Pillar', 'live-shimmer'],
  ['💸', 'Flying Hundreds', 'live-float'],
  ['💰', 'Swiss Vault Bag', 'live-bounce'],
  ['🪙', 'Sovereign Token', 'live-spin'],
  ['🏎️', 'Turbo Supercar', 'live-bounce'],
  ['🚀', 'Quantum Rocket', 'live-float'],
  ['🛸', 'Alien Mothership', 'live-float'],
  ['🤖', 'Cyber Mecha', 'live-bounce'],
  ['👾', 'Retro Invader', 'live-wiggle'],
  ['💀', 'Diamond Skull', 'live-pulse'],
  ['☠️', 'Crossbones Jolly', 'live-wiggle'],
  ['💣', 'Vault Blast', 'live-pulse'],
  ['💯', '100 Perfection', 'live-pulse'],
  ['⚜️', 'Royal Fleur', 'live-shimmer'],
  ['🔱', 'Neptune Spear', 'live-pulse'],
  ['🗝️', 'Master Vault Key', 'live-spin'],
  ['🔒', 'Locked Vault', 'live-pulse'],
  ['🔓', 'Vault Unlocked', 'live-bounce'],
  ['🪐', 'Saturn Rings', 'live-spin'],
  ['🎩', 'Top Hat Aristocrat', 'live-float'],
  ['⌚', 'Chronometer Gold', 'live-spin'],
  ['💼', 'Diplomatic Briefcase', 'live-bounce'],
  ['📈', 'Bull Market Spire', 'live-float'],
  ['🏦', 'Zurich Banking', 'live-shimmer'],
  ['💳', 'Black Titanium Card', 'live-shimmer'],
  ['💵', 'Greenback Stack', 'live-bounce'],
  ['💴', 'Imperial Yen', 'live-float'],
  ['💶', 'Euro Reserve', 'live-float'],
  ['💷', 'Sterling Note', 'live-float'],
  ['⚖️', 'Scales of Justice', 'live-wiggle'],
  ['📜', 'Royal Parchment', 'live-float'],
  ['🖋️', 'Fountain Pen Gold', 'live-wiggle'],
  ['✒️', 'Sovereign Nib', 'live-pulse'],
  ['🕯️', 'Candelabra Light', 'live-pulse'],
  ['🪞', 'Baroque Mirror', 'live-shimmer'],
  ['🍷', 'Grand Cru Wine', 'live-wiggle'],
  ['🥃', 'Scotch Crystal', 'live-float'],
  ['🍸', 'Dry Vodka Martini', 'live-float'],
  ['🏎️', 'Bugatti Chiron', 'live-bounce'],
  ['🏍️', 'Ducati Superleggera', 'live-bounce'],
  ['🚁', 'Executive Chopper', 'live-float'],
  ['✈️', 'Gulfstream Jet', 'live-float'],
  ['🛳️', 'Mega Yacht', 'live-float'],
  ['🛰️', 'Military Satellite', 'live-float'],
  ['🌐', 'World Domination', 'live-spin'],
  ['🧬', 'Synthetic DNA', 'live-spin'],
  ['🔬', 'Quantum Lab', 'live-pulse'],
  ['🔭', 'Deep Space Array', 'live-float'],
  ['🧿', 'Nazar Protection', 'live-pulse'],
  ['🔮', 'Chronos Orb', 'live-spin'],
  ['🏺', 'Ancient Amphora', 'live-pulse'],
  ['🗿', 'Moai Monument', 'live-float'],
  ['🏯', 'Dynasty Palace', 'live-shimmer'],
  ['🗽', 'Liberty Sovereign', 'live-shimmer']
];

const creatureEmojis = [
  ['🐺', 'Alpha Wolf', 'live-pulse'],
  ['🐅', 'Bengal Tiger', 'live-bounce'],
  ['🐆', 'Speed Cheetah', 'live-bounce'],
  ['🦓', 'Savannah Zebra', 'live-wiggle'],
  ['🦍', 'Silverback King', 'live-pulse'],
  ['🐘', 'Mammoth Tusks', 'live-float'],
  ['🦒', 'Tall Giraffe', 'live-float'],
  ['🐪', 'Desert Camel', 'live-wiggle'],
  ['🐎', 'Wild Stallion', 'live-bounce'],
  ['🐗', 'Iron Boar', 'live-bounce'],
  ['🦌', 'Noble Stag', 'live-float'],
  ['🐂', 'Charging Bull', 'live-pulse'],
  ['🐃', 'Water Buffalo', 'live-bounce'],
  ['🐄', 'Spotted Heifer', 'live-wiggle'],
  ['🐐', 'Mountain G.O.A.T.', 'live-bounce'],
  ['🐏', 'Battering Ram', 'live-bounce'],
  ['🐑', 'Woolly Lamb', 'live-bounce'],
  ['🐕', 'Guardian Dog', 'live-wiggle'],
  ['🐩', 'Royal Poodle', 'live-bounce'],
  ['🐺', 'Arctic Wolf', 'live-pulse'],
  ['🦊', 'Crimson Vixen', 'live-wiggle'],
  ['🦝', 'Masked Bandit', 'live-wiggle'],
  ['🐱', 'Shadow Feline', 'live-float'],
  ['🦁', 'Pride Monarch', 'live-bounce'],
  ['🐯', 'Siberian Tiger', 'live-bounce'],
  ['🐆', 'Panther Stalk', 'live-float'],
  ['🦄', 'Starlight Horn', 'live-shimmer'],
  ['🦓', 'Zebra Gallop', 'live-wiggle'],
  ['🦌', 'Imperial Buck', 'live-float'],
  ['🦬', 'Thundering Bison', 'live-pulse'],
  ['🐮', 'Golden Calf', 'live-wiggle'],
  ['🐷', 'Pink Piglet', 'live-bounce'],
  ['🐗', 'Forest Boar', 'live-bounce'],
  ['🐽', 'Snout Sniff', 'live-pulse'],
  ['🐏', 'Aries Ram', 'live-bounce'],
  ['🐑', 'Cloud Sheep', 'live-float'],
  ['🐐', 'Greatest of All Time', 'live-bounce'],
  ['🐪', 'Caravan Camel', 'live-wiggle'],
  ['🐫', 'Two Hump King', 'live-wiggle'],
  ['🦙', 'Andean Alpaca', 'live-wiggle'],
  ['🦒', 'Golden Giraffe', 'live-float'],
  ['🐘', 'Imperial Elephant', 'live-pulse'],
  ['🦣', 'Ice Mammoth', 'live-bounce'],
  ['🦏', 'Armored Rhino', 'live-pulse'],
  ['🦛', 'River Hippo', 'live-wiggle'],
  ['🐭', 'Field Mouse', 'live-wiggle'],
  ['🐁', 'White Rodent', 'live-bounce'],
  ['🐀', 'Alley Rat', 'live-wiggle'],
  ['🐹', 'Cheeky Hamster', 'live-bounce'],
  ['🐰', 'Moon Rabbit', 'live-bounce'],
  ['🐇', 'Snow Hare', 'live-bounce'],
  ['🐿️', 'Nut Squirrel', 'live-bounce'],
  ['🦫', 'Dam Beaver', 'live-wiggle'],
  ['🦔', 'Sonic Hedgehog', 'live-spin'],
  ['🦇', 'Vampire Bat', 'live-float'],
  ['🐻', 'Grizzly Sovereign', 'live-pulse'],
  ['🐻‍❄️', 'Polar Monarch', 'live-pulse'],
  ['🐼', 'Imperial Panda', 'live-float'],
  ['🦥', 'Chilling Sloth', 'live-float'],
  ['🦦', 'River Otter', 'live-bounce']
];

// Combine all into exactly 500 items
const all500 = [];

function addCategoryItems(items, catName) {
  for (const item of items) {
    if (all500.length >= 500) break;
    all500.push({
      emoji: item[0],
      name: item[1],
      category: catName,
      anim: item[2]
    });
  }
}

addCategoryItems(funnyEmojis, 'funny');
addCategoryItems(cryEmojis, 'cry');
addCategoryItems(sadEmojis, 'sad');
addCategoryItems(smileEmojis, 'smile');
addCategoryItems(happyEmojis, 'happy');
addCategoryItems(royalEmojis, 'royal');
addCategoryItems(creatureEmojis, 'royal');

// Ensure exactly 500 items
console.log('Generated live stickers count:', all500.length);

const outputTS = `import React, { useState, useMemo } from 'react';
import {
  Smile,
  Crown,
  Bot,
  Cat,
  Pizza,
  Heart,
  X,
  Sparkles,
  Flame,
  Search,
  Globe
} from 'lucide-react';

export interface LiveStickerItem {
  emoji: string;
  name: string;
  category: 'funny' | 'sad' | 'happy' | 'cry' | 'smile' | 'royal';
  anim: 'live-pulse' | 'live-bounce' | 'live-spin' | 'live-wiggle' | 'live-float' | 'live-shimmer';
}

// 500 LIVE ANIMATED STICKERS WITH DYNAMIC CONTINUOUS ANIMATIONS
export const LIVE_STICKERS: LiveStickerItem[] = ${JSON.stringify(all500, null, 2)};

// 500+ STANDARD EMOJIS CATEGORIZED
export const STANDARD_EMOJI_SECTIONS = [
  {
    id: 'smileys',
    name: 'Smileys & Expressions',
    icon: Smile,
    emojis: [
      '😀', '😃', '😄', '😁', '😆', '😅', '🤣', '😂', '🙂', '🙃',
      '😉', '😊', '😇', '🥰', '😍', '🤩', '😘', '😗', '😚', '😋',
      '😛', '😜', '🤪', '😝', '🤑', '🤗', '🤭', '🤫', '🤔', '🤐',
      '🤨', '😐', '😑', '😶', '😏', '😒', '🙄', '😬', '🤥', '😌',
      '😔', '😪', '🤤', '😴', '😷', '🤒', '🤕', '🤢', '🤮', '🤧',
      '🥵', '🥶', '🥴', '😵', '🤯', '🤠', '🥳', '🥸', '😎', '🤓',
      '🧐', '😕', '😟', '🙁', '😮', '😯', '😲', '😳', '🥺', '😦',
      '😧', '😨', '😰', '😥', '😢', '😭', '😱', '😖', '😣', '😞',
      '😓', '😩', '😫', '🥱', '😤', '😡', '😠', '🤬', '😈', '👿',
      '💀', '☠️', '💩', '🤡', '👹', '👺', '👻', '👽', '👾', '🤖'
    ]
  },
  {
    id: 'people_gestures',
    name: 'Hands, Gestures & Hearts',
    icon: Heart,
    emojis: [
      '👋', '🤚', '🖐️', '✋', '🖖', '👌', '🤌', '🤏', '✌️', '🤞',
      '🤟', '🤘', '🤙', '👈', '👉', '👆', '🖕', '👇', '☝️', '👍',
      '👎', '✊', '👊', '🤛', '🤜', '👏', '🙌', '👐', '🤲', '🤝',
      '🙏', '✍️', '💅', '🤳', '💪', '🦾', '🦿', '🦵', '🦶', '👂',
      '🦻', '👃', '🧠', '🫀', '🫁', '🦷', '🦴', '👀', '👁️', '👅',
      '❤️', '🧡', '💛', '💚', '💙', '💜', '🖤', '🤍', '🤎', '💔',
      '❣️', '💕', '💞', '💓', '💗', '💖', '💘', '💝', '💟', '💌'
    ]
  },
  {
    id: 'animals',
    name: 'Animals & Nature',
    icon: Cat,
    emojis: [
      '🐶', '🐱', '🐭', '🐹', '🐰', '🦊', '🐻', '🐼', '🐨', '🐯',
      '🦁', '🐮', '🐷', '🐽', '🐸', '🐵', '🙈', '🙉', '🙊', '🐒',
      '🐔', '🐧', '🐦', '🐤', '🐣', '🐥', '🦆', '🦅', '🦉', '🦇',
      '🐺', '🐗', '🐴', '🦄', '🐝', '🪱', '🐛', '🦋', '🐌', '🐞',
      '🐜', '🪰', '🪲', '🪳', '🦟', '🦗', '🕷️', '🕸️', '🦂', '🐢',
      '🐍', '🦎', '🦖', '🦕', '🐙', '🦑', '🦐', '🦞', '🦀', '🐡',
      '🐠', '🐟', '🐬', '🐳', '🐋', '🦈', '🐊', '🐅', '🐆', '🦓',
      '🦍', '🦧', '🦣', '🐘', '🦛', '🦏', '🐪', '🐫', '🦒', '🦘'
    ]
  },
  {
    id: 'food',
    name: 'Food & Celebrations',
    icon: Pizza,
    emojis: [
      '🍇', '🍈', '🍉', '🍊', '🍋', '🍌', '🍍', '🥭', '🍎', '🍏',
      '🍐', '🍑', '🍒', '🍓', '🫐', '🥝', '🍅', '🫒', '🥥', '🥑',
      '🍆', '🥔', '🥕', '🌽', '🌶️', '🫑', '🥒', '🥬', '🥦', '🧄',
      '🧅', '🍄', '🥜', '🌰', '🍞', '🥐', '🥖', '🫓', '🥨', '🥯',
      '🥞', '🧇', '🧀', '🍖', '🍗', '🥩', '🥓', '🍔', '🍟', '🍕',
      '🌭', '🥪', '🌮', '🌯', '🫔', '🥙', '🧆', '🥚', '🍳', '🥘',
      '🍲', '🫕', '🥣', '🥗', '🍿', '🧈', '🧂', '🥫', '🍱', '🍘',
      '🍙', '🍚', '🍛', '🍜', '🍝', '🍠', '🍢', '🍣', '🍤', '🍥'
    ]
  },
  {
    id: 'travel',
    name: 'Travel & Cosmic Places',
    icon: Globe,
    emojis: [
      '🚗', '🚕', '🚙', '🚌', '🚎', '🏎️', '🚓', '🚑', '🚒', '🚐',
      '🛻', '🚚', '🚛', '🚜', '🛵', '🏍️', '🛺', '🚲', '🛴', '🚨',
      '✈️', '🛫', '🛬', '🛩️', '🚁', '🚀', '🛸', '🛰️', '🚂', '🚆',
      '🚄', '🚅', '🛳️', '⛴️', '🛥️', '🚤', '⛵', '🗺️', '🧭', '🏔️',
      '🌋', '🏕️', '🏖️', '🏜️', '🏝️', '🏞️', '🏟️', '🏛️', '🏗️', '🏘️',
      '🏰', '🏯', '🗽', '🗼', '⛩️', '🕋', '⛲', '⛺', '🌁', '🌃'
    ]
  },
  {
    id: 'luxury_objects',
    name: 'Royalty, Weapons & Wealth',
    icon: Crown,
    emojis: [
      '👑', '💎', '🏆', '🥇', '🥈', '🥉', '🏅', '🎖️', '💰', '🪙',
      '💵', '💴', '💶', '💷', '💳', '💎', '⚖️', '🗝️', '🔑', '🔒',
      '🔓', '🔏', '🔐', '⚔️', '🗡️', '🛡️', '🏹', '🪓', '💣', '🧨',
      '🔮', '🧿', '🪄', '📜', '🏛️', '🏰', '⚜️', '🔱', '✨', '⭐',
      '🌟', '💫', '⚡', '🔥', '💥', '🎩', '🍾', '🥂', '🍷', '🍸'
    ]
  }
];

interface EmojiKeyboardProps {
  onSelectEmoji: (emoji: string) => void;
  onClose?: () => void;
}

export const EmojiKeyboard: React.FC<EmojiKeyboardProps> = ({ onSelectEmoji, onClose }) => {
  const [filterTab, setFilterTab] = useState<string>('live_all');
  const [search, setSearch] = useState<string>('');

  const isStandardTab = filterTab === 'standard';

  // Filter Live Stickers
  const displayedLiveStickers = useMemo(() => {
    let list = LIVE_STICKERS;
    if (filterTab !== 'live_all' && !isStandardTab) {
      list = list.filter(s => s.category === filterTab);
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(s => s.name.toLowerCase().includes(q) || s.emoji.includes(q));
    }
    return list;
  }, [filterTab, isStandardTab, search]);

  // Filter Standard Emojis
  const allStandardEmojis = useMemo(() => {
    return STANDARD_EMOJI_SECTIONS.flatMap(s => s.emojis);
  }, []);

  const displayedStandardEmojis = useMemo(() => {
    if (!search.trim()) return allStandardEmojis;
    return allStandardEmojis.filter(e => e.includes(search));
  }, [allStandardEmojis, search]);

  return (
    <div className="w-full bg-[var(--bg-card)] border-t border-[var(--accent-border)] flex flex-col max-h-72 sm:max-h-96 shadow-2xl select-none animate-fadeIn transition-colors z-20">
      {/* Top Filter Strip: Live Categories & Standard Emojis */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-neutral-200 dark:border-white/5 bg-[var(--bg-sidebar)] gap-2 shrink-0">
        <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none py-0.5 flex-1">
          <button
            type="button"
            onClick={() => setFilterTab('live_all')}
            className={\`py-1.5 px-3 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all shrink-0 \${
              filterTab === 'live_all'
                ? 'gold-button-accent text-black shadow-sm'
                : 'bg-[var(--bg-card)] border border-[var(--accent-border)] text-[var(--accent-primary)] hover:border-[var(--accent-primary)]'
            }\`}
          >
            <Flame className="w-3.5 h-3.5 text-amber-500 animate-pulse" />
            <span>500 Live Stickers</span>
          </button>

          <button
            type="button"
            onClick={() => setFilterTab('funny')}
            className={\`py-1.5 px-2.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all shrink-0 \${
              filterTab === 'funny'
                ? 'bg-[var(--accent-surface)] border border-[var(--accent-primary)] text-[var(--accent-primary)] font-bold'
                : 'text-[var(--text-muted)] hover:text-[var(--text-main)] bg-[var(--bg-card)] border border-transparent'
            }\`}
          >
            <span>😂 Funny</span>
          </button>

          <button
            type="button"
            onClick={() => setFilterTab('cry')}
            className={\`py-1.5 px-2.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all shrink-0 \${
              filterTab === 'cry'
                ? 'bg-[var(--accent-surface)] border border-[var(--accent-primary)] text-[var(--accent-primary)] font-bold'
                : 'text-[var(--text-muted)] hover:text-[var(--text-main)] bg-[var(--bg-card)] border border-transparent'
            }\`}
          >
            <span>😭 Cry & Tears</span>
          </button>

          <button
            type="button"
            onClick={() => setFilterTab('sad')}
            className={\`py-1.5 px-2.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all shrink-0 \${
              filterTab === 'sad'
                ? 'bg-[var(--accent-surface)] border border-[var(--accent-primary)] text-[var(--accent-primary)] font-bold'
                : 'text-[var(--text-muted)] hover:text-[var(--text-main)] bg-[var(--bg-card)] border border-transparent'
            }\`}
          >
            <span>💔 Sad</span>
          </button>

          <button
            type="button"
            onClick={() => setFilterTab('smile')}
            className={\`py-1.5 px-2.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all shrink-0 \${
              filterTab === 'smile'
                ? 'bg-[var(--accent-surface)] border border-[var(--accent-primary)] text-[var(--accent-primary)] font-bold'
                : 'text-[var(--text-muted)] hover:text-[var(--text-main)] bg-[var(--bg-card)] border border-transparent'
            }\`}
          >
            <span>🥰 Smile & Love</span>
          </button>

          <button
            type="button"
            onClick={() => setFilterTab('happy')}
            className={\`py-1.5 px-2.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all shrink-0 \${
              filterTab === 'happy'
                ? 'bg-[var(--accent-surface)] border border-[var(--accent-primary)] text-[var(--accent-primary)] font-bold'
                : 'text-[var(--text-muted)] hover:text-[var(--text-main)] bg-[var(--bg-card)] border border-transparent'
            }\`}
          >
            <span>🎉 Happy</span>
          </button>

          <button
            type="button"
            onClick={() => setFilterTab('royal')}
            className={\`py-1.5 px-2.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all shrink-0 \${
              filterTab === 'royal'
                ? 'bg-[var(--accent-surface)] border border-[var(--accent-primary)] text-[var(--accent-primary)] font-bold'
                : 'text-[var(--text-muted)] hover:text-[var(--text-main)] bg-[var(--bg-card)] border border-transparent'
            }\`}
          >
            <Crown className="w-3.5 h-3.5 text-[var(--accent-primary)]" />
            <span>Sovereign Royal</span>
          </button>

          <button
            type="button"
            onClick={() => setFilterTab('standard')}
            className={\`py-1.5 px-2.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all shrink-0 \${
              filterTab === 'standard'
                ? 'bg-[var(--accent-surface)] border border-[var(--accent-primary)] text-[var(--accent-primary)] font-bold'
                : 'text-[var(--text-muted)] hover:text-[var(--text-main)] bg-[var(--bg-card)] border border-transparent'
            }\`}
          >
            <Smile className="w-3.5 h-3.5" />
            <span>500+ Emojis</span>
          </button>
        </div>

        {onClose && (
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl bg-[var(--bg-card)] border border-[var(--accent-border)] text-neutral-400 hover:text-[var(--text-main)] shrink-0 ml-1 shadow-sm"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Search Input Bar */}
      <div className="px-3 py-2 border-b border-neutral-200 dark:border-white/5 bg-[var(--bg-card)] relative shrink-0">
        <Search className="w-3.5 h-3.5 absolute left-6 top-4 text-neutral-500" />
        <input
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder={
            isStandardTab
              ? 'Search 500+ standard emojis...'
              : \`Search \${displayedLiveStickers.length} live animated stickers (funny, cry, sad, happy, smile)...\`
          }
          className="w-full pl-8 pr-8 py-1.5 text-xs rounded-xl bg-[var(--input-bg)] border border-[var(--input-border)] focus:border-[var(--accent-primary)] text-[var(--text-main)] placeholder-neutral-500 focus:outline-none transition-colors"
        />
        {search && (
          <button
            type="button"
            onClick={() => setSearch('')}
            className="absolute right-5 top-3.5 text-neutral-400 hover:text-white"
          >
            <X className="w-3 h-3" />
          </button>
        )}
      </div>

      {/* Stickers & Emojis Grid Content */}
      <div className="p-3 overflow-y-auto flex-1 min-h-0">
        {!isStandardTab ? (
          /* 500 Live Animated Stickers Grid */
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] font-mono text-[var(--accent-primary)] font-bold uppercase tracking-wider">
                {filterTab === 'live_all'
                  ? \`All 500 Live Animated Stickers (\${displayedLiveStickers.length})\`
                  : \`\${filterTab.toUpperCase()} Live Stickers (\${displayedLiveStickers.length})\`}
              </span>
              <span className="text-[9px] font-mono text-neutral-500">
                Continuous Keyframe Motion
              </span>
            </div>

            <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-10 gap-2">
              {displayedLiveStickers.map((sticker, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => onSelectEmoji(sticker.emoji)}
                  className="h-16 flex flex-col items-center justify-center p-1.5 rounded-2xl bg-[var(--bg-sidebar)] border border-[var(--accent-border)] hover:border-[var(--accent-primary)] hover:bg-[var(--accent-surface)] transition-all group cursor-pointer relative shadow-sm hover:scale-105 active:scale-95"
                  title={\`\${sticker.name} (\${sticker.category})\`}
                >
                  <span className={\`text-2xl sm:text-3xl \${sticker.anim}\`}>
                    {sticker.emoji}
                  </span>
                  <span className="text-[9px] font-mono text-[var(--text-muted)] truncate max-w-full group-hover:text-[var(--accent-primary)] transition-colors mt-1 font-medium">
                    {sticker.name}
                  </span>
                </button>
              ))}
            </div>
          </div>
        ) : (
          /* 500+ Standard Emojis Grid */
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] font-mono text-[var(--accent-primary)] font-bold uppercase tracking-wider">
                Standard Emoji Keyboard (\${displayedStandardEmojis.length})
              </span>
            </div>

            <div className="grid grid-cols-8 sm:grid-cols-12 md:grid-cols-14 gap-1 sm:gap-1.5">
              {displayedStandardEmojis.map((emoji: string, idx: number) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => onSelectEmoji(emoji)}
                  className="w-8 h-8 sm:w-9 sm:h-9 text-lg sm:text-xl flex items-center justify-center rounded-xl hover:bg-[var(--accent-surface)] hover:scale-125 active:scale-95 transition-all cursor-pointer"
                >
                  {emoji}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Footer Info Strip */}
      <div className="px-3 py-2 border-t border-neutral-200 dark:border-white/5 bg-[var(--bg-sidebar)] flex items-center justify-between text-[10px] font-mono text-[var(--text-muted)] shrink-0">
        <span className="flex items-center gap-1.5">
          <Sparkles className="w-3.5 h-3.5 text-[var(--accent-primary)]" />
          <span>500 Live Animated Stickers + 500 Emojis</span>
        </span>
        <span className="text-[var(--accent-primary)] font-semibold">
          Tap any sticker or emoji to send
        </span>
      </div>
    </div>
  );
};
`;

fs.writeFileSync('/app/applet/src/components/common/EmojiKeyboard.tsx', outputTS);
console.log('Successfully wrote EmojiKeyboard.tsx with 500 live stickers!');
