
interface GameConfig {
    name: string;
    pk3Files: string[];
}

const RTCWConfig: GameConfig = {
    name: 'Return to Castle Wolfenstein',
    pk3Files: ['pak0.pk3', 'sp_pak1.pk3', 'sp_pak2.pk3', 'sp_pak3.pk3', 'sp_pak4.pk3'],
};

const AliceConfig: GameConfig = {
    name: 'American McGees Alice',
    pk3Files: ['pak0.pk3', 'pak1_large.pk3', 'pak2.pk3', 'pak3.pk3', 'pak4_english.pk3', 'pak5_mod.pk3']
};

const FAKK2Config: GameConfig = {
    name: 'Heavy Metal: F.A.K.K.²',
    pk3Files: ['pak0.pk3', 'pak1.pk3']
};

export type GameType = 'rtcw' | 'alice' | 'fakk2';

const GameConfigs: Record<GameType, GameConfig> = {
    'rtcw': RTCWConfig,
    'alice': AliceConfig,
    'fakk2': FAKK2Config
};

export function getGameConfig(gameType: GameType): GameConfig {
    const config = GameConfigs[gameType];
    if (!config) {
        throw new Error(`Unsupported game type: ${gameType}`);
    }
    return config;
}

