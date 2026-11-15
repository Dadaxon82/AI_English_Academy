/**
 * 2D xarita sahnasi geometriyasi — GENERATSIYA QILINADI:
 * `python3 scripts/map-assets/build_map_assets.py`. Qo'lda tahrirlamang.
 * Koordinatalar `public/map/scene.webp` piksellarida (kenglik 1448).
 */
export const SCENE = {
  "width": 1448,
  "sceneHeight": 1002,
  "bandHeight": 440,
  "discs": {
    "start": {
      "x": 306,
      "y": 333,
      "w": 200,
      "h": 138,
      "base": "green"
    },
    "vocab": {
      "x": 726,
      "y": 257,
      "w": 151,
      "h": 115,
      "base": "gold"
    },
    "gram": {
      "x": 974,
      "y": 433,
      "w": 151,
      "h": 109,
      "base": "gold"
    },
    "read": {
      "x": 531,
      "y": 480,
      "w": 159,
      "h": 120,
      "base": "green"
    },
    "listen": {
      "x": 516,
      "y": 699,
      "w": 156,
      "h": 118,
      "base": "green"
    },
    "write": {
      "x": 927,
      "y": 701,
      "w": 157,
      "h": 121,
      "base": "green"
    }
  },
  "medal": {
    "w": 230,
    "h": 215,
    "cx": 115,
    "cy": 98
  },
  "slots": {
    "start": {
      "x": 405,
      "y": 400
    },
    "vocabulary": {
      "x": 800,
      "y": 321
    },
    "grammar": {
      "x": 1050,
      "y": 491
    },
    "reading": {
      "x": 610,
      "y": 546
    },
    "listening": {
      "x": 595,
      "y": 768
    },
    "writing": {
      "x": 1005,
      "y": 768
    }
  },
  "labels": {
    "start": {
      "x": 432.0,
      "y": 404.5
    },
    "vocabulary": {
      "x": 804.5,
      "y": 395.0
    },
    "grammar": {
      "x": 1048.0,
      "y": 562.5
    },
    "reading": {
      "x": 612.5,
      "y": 621.5
    },
    "listening": {
      "x": 595.0,
      "y": 837.0
    },
    "writing": {
      "x": 1006.0,
      "y": 841.0
    }
  },
  "banner": {
    "x": 365,
    "y": 24,
    "w": 715,
    "h": 70
  },
  "panel": {
    "x": 120,
    "y": 111,
    "w": 1205,
    "h": 105,
    "textY": 142,
    "barX": 228,
    "barY": 168,
    "barW": 952,
    "barH": 24
  },
  "ach": {
    "x": 10,
    "y": 801,
    "w": 410,
    "h": 177,
    "titleX": 140,
    "titleY": 853,
    "valY": 928,
    "vals": [
      96,
      210,
      332
    ]
  }
} as const
