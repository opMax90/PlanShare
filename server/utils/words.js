const words = [
    'airplane', 'birthday', 'butterfly', 'camera', 'castle',
    'diamond', 'dinosaur', 'elephant', 'fireworks', 'garden',
    'guitar', 'hamburger', 'helicopter', 'iceberg', 'jungle',
    'keyboard', 'lighthouse', 'mountain', 'notebook', 'octopus',
    'parachute', 'penguin', 'pyramid', 'rainbow', 'rocket',
    'satellite', 'snowflake', 'submarine', 'telescope', 'tornado',
    'umbrella', 'volcano', 'waterfall', 'windmill', 'treasure',
    'bridge', 'compass', 'dolphin', 'eclipse', 'fountain',
    'galaxy', 'horizon', 'island', 'jellyfish', 'kangaroo',
    'lantern', 'magnet', 'necklace', 'orchestra', 'pirate',
    'robot', 'skeleton', 'thunderstorm', 'unicorn', 'vampire',
    'wizard', 'anchor', 'balloon', 'candle', 'dragon'
];

const getRandomWord = () => {
    return words[Math.floor(Math.random() * words.length)];
};

module.exports = { words, getRandomWord };
