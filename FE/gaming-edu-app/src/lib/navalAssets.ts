/**
 * NAVAL_ASSETS: Quản lý toàn bộ đường dẫn hình ảnh chiến hạm, hiệu ứng hoạt ảnh và âm thanh
 * cho trò chơi Hải Chiến Tri Thức.
 * Tất cả tài nguyên đã được xác thực trong thư mục public/assets/naval-war/
 */

export const NAVAL_ASSETS = {
  // 5 loại tàu chiến chuẩn theo kích thước 1, 2, 3, 4, 5 ô (Kenney Ships Pack)
  ships: {
    1: "/assets/naval-war/ships/Previews/ship-small.png",        // Tàu Tuần Tra (1 ô)
    2: "/assets/naval-war/ships/Previews/boat-speed-a.png",      // Cano Pháo Kích (2 ô)
    3: "/assets/naval-war/ships/Previews/ship-cargo-a.png",      // Hộ Vệ Hạm (3 ô)
    4: "/assets/naval-war/ships/Previews/ship-large.png",        // Khu Trục Hạm (4 ô)
    5: "/assets/naval-war/ships/Previews/ship-ocean-liner.png",  // Thiết Giáp Hạm (5 ô)
  } as Record<number, string>,

  // Tên phân loại tàu
  shipNames: {
    1: "Tàu Tuần Tra (1 ô)",
    2: "Cano Pháo Kích (2 ô)",
    3: "Hộ Vệ Hạm (3 ô)",
    4: "Khu Trục Hạm (4 ô)",
    5: "Thiết Giáp Hạm (5 ô)",
  } as Record<number, string>,

  // Các mẫu tàu phụ trợ và biến thể mở rộng
  shipVariants: {
    speedBoatB: "/assets/naval-war/ships/Previews/boat-speed-b.png",
    speedBoatC: "/assets/naval-war/ships/Previews/boat-speed-c.png",
    cargoShipB: "/assets/naval-war/ships/Previews/ship-cargo-b.png",
    tugBoatA: "/assets/naval-war/ships/Previews/boat-tug-a.png",
    oceanLinerSmall: "/assets/naval-war/ships/Previews/ship-ocean-liner-small.png",
    ghostShip: "/assets/naval-war/ships/Previews/ship-small-ghost.png",
  },

  // Hiệu ứng hình ảnh, Sprite Particles & Frame Sequences
  animations: {
    // Ngọn lửa bốc cháy trên ô tàu bị trúng đạn
    hitFlame: "/assets/naval-war/animations/PNG (Transparent)/fire_01.png",
    hitFlameAlt: "/assets/naval-war/animations/PNG (Transparent)/fire_02.png",

    // Vụ nổ đạn pháo chính
    hitExplosion: "/assets/naval-war/animations/PNG/Explosion/explosion04.png",
    
    // Chuỗi 9 frame diễn hoạt vụ nổ (Frame animation)
    explosionFrames: [
      "/assets/naval-war/animations/PNG/Explosion/explosion00.png",
      "/assets/naval-war/animations/PNG/Explosion/explosion01.png",
      "/assets/naval-war/animations/PNG/Explosion/explosion02.png",
      "/assets/naval-war/animations/PNG/Explosion/explosion03.png",
      "/assets/naval-war/animations/PNG/Explosion/explosion04.png",
      "/assets/naval-war/animations/PNG/Explosion/explosion05.png",
      "/assets/naval-war/animations/PNG/Explosion/explosion06.png",
      "/assets/naval-war/animations/PNG/Explosion/explosion07.png",
      "/assets/naval-war/animations/PNG/Explosion/explosion08.png",
    ],

    // Nước bắn tung tóe khi bắn trượt (White Puff Splash)
    waterSplash: "/assets/naval-war/animations/PNG/White puff/whitePuff08.png",
    splashFrames: [
      "/assets/naval-war/animations/PNG/White puff/whitePuff00.png",
      "/assets/naval-war/animations/PNG/White puff/whitePuff04.png",
      "/assets/naval-war/animations/PNG/White puff/whitePuff08.png",
      "/assets/naval-war/animations/PNG/White puff/whitePuff12.png",
      "/assets/naval-war/animations/PNG/White puff/whitePuff16.png",
    ],

    // Khói đen bốc lên từ tàu bị thương nặng
    blackSmoke: "/assets/naval-war/animations/PNG/Black smoke/blackSmoke00.png",

    // Lá chắn năng lượng bảo vệ
    shieldGlow: "/assets/naval-war/animations/PNG (Transparent)/magic_01.png",
    shieldGlowAlt: "/assets/naval-war/animations/PNG (Transparent)/magic_02.png",

    // Sóng Radar quét sonar
    radarWave: "/assets/naval-war/animations/PNG (Transparent)/circle_01.png",
    radarWaveAlt: "/assets/naval-war/animations/PNG (Transparent)/circle_03.png",

    // Hồng tâm ngắm bắn tác chiến
    crosshair: "/assets/naval-war/animations/PNG/Glow/crosshair-029.png",
    crosshairTarget: "/assets/naval-war/animations/PNG/Glow/crosshair-008.png",

    // Vết cháy đen / tàn tích khi tàu bị bắn chìm
    scorch: "/assets/naval-war/animations/PNG (Transparent)/scorch_01.png",
    smoke: "/assets/naval-war/animations/PNG (Transparent)/smoke_01.png",
  },

  // Hiệu ứng Lottie JSON dự phòng (nếu người dùng bổ sung các file JSON tương ứng)
  lottie: {
    explosion: "/assets/naval-war/animations/explosion.json",
    waterSplash: "/assets/naval-war/animations/splash.json",
    radar: "/assets/naval-war/animations/radar.json",
    shield: "/assets/naval-war/animations/shield.json",
  },

  // Danh mục file âm thanh Audio (Ưu tiên MP3 nếu có, tự động fallback về WAV/OGG gốc)
  sounds: {
    // Tiếng nổ đại bác
    cannon: [
      "/assets/naval-war/sounds/cannon.mp3",
      "/assets/naval-war/sounds/qubodup-NavalBattleSoundSet-cc0/GunShot.wav",
      "/assets/naval-war/sounds/qubodup-NavalBattleSoundSet-cc0/ogg/GunShot.ogg",
    ],
    // Tiếng đạn trúng thân vỏ kim loại tàu chiến
    hit: [
      "/assets/naval-war/sounds/hit.mp3",
      "/assets/naval-war/sounds/qubodup-NavalBattleSoundSet-cc0/ExplosionMetal.wav",
      "/assets/naval-war/sounds/qubodup-NavalBattleSoundSet-cc0/ogg/ExplosionMetal.ogg",
    ],
    // Tiếng đạn rơi tõm xuống biển (Bắn trượt)
    miss: [
      "/assets/naval-war/sounds/miss.mp3",
      "/assets/naval-war/sounds/qubodup-NavalBattleSoundSet-cc0/Splash.wav",
      "/assets/naval-war/sounds/qubodup-NavalBattleSoundSet-cc0/ogg/Splash.ogg",
    ],
    // Tiếng nổ xé nước khi chiến hạm bị đánh chìm
    sunk: [
      "/assets/naval-war/sounds/sunk.mp3",
      "/assets/naval-war/sounds/qubodup-NavalBattleSoundSet-cc0/WaterSurfaceExplosion01.wav",
      "/assets/naval-war/sounds/qubodup-NavalBattleSoundSet-cc0/ogg/WaterSurfaceExplosion01.ogg",
    ],
    // Tiếng kích hoạt Lá chắn năng lượng
    shield: [
      "/assets/naval-war/sounds/shield.mp3",
      "/assets/naval-war/sounds/Audio/forceField_000.ogg",
    ],
    // Tiếng sóng sonar Radar quét mục tiêu
    radar: [
      "/assets/naval-war/sounds/radar.mp3",
      "/assets/naval-war/sounds/Audio/computerNoise_000.ogg",
    ],
    // Tiếng đại bác chính xác cao (Tia laser định hướng)
    laser: [
      "/assets/naval-war/sounds/laser.mp3",
      "/assets/naval-war/sounds/Audio/laserLarge_000.ogg",
    ],
    // Âm thanh môi trường: Tiếng sóng đại dương và động cơ tàu hạm đội rền vang
    ambient: [
      "/assets/naval-war/sounds/ambient.mp3",
      "/assets/naval-war/sounds/qubodup-NavalBattleSoundSet-cc0/BattleShipMovementAmbient.wav",
      "/assets/naval-war/sounds/qubodup-NavalBattleSoundSet-cc0/ogg/BattleShipMovementAmbient.ogg",
    ],
  },
};
