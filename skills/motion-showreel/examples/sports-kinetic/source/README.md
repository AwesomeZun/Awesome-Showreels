# VELMORA 42

**The official race app of the Velmora City Marathon.**

42 kilometres. 42 timing mats. 42 splits. Live.

> Fictional race, fictional app. VELMORA 42, the Velmora City Marathon, BIB 2417 and every number in this kit are
> demo content, written for the motion-showreel examples.

**SUN 18 APR 2027 · GUN 07:00 · HARBOUR GATE**

## EVERY KILOMETRE. LIVE.

You train for months. Race day is three hours. VELMORA 42 puts every kilometre of it in your pocket the second you
cross the mat.

- **A split at every kilometre.** A timing mat at every kilometre from KM 1 to KM 41, and one under the finish arch.
  42 mats. 42 splits. Not every five. Every one.
- **Mat to phone in under 2 seconds.** Your split is on your phone before you have run ten more strides.
- **Your pace against your plan.** Ahead or behind, to the second. −0:12 means you are 12 seconds up on your plan.
- **Follow five.** Follow up to five bibs. Your phone buzzes two minutes before they reach your spot on the course.
- **Your finish card.** All 42 splits on one card, the moment you cross the line.

## RACE DAY IN NUMBERS

| Runners | Distance | Timing mats | Live splits | Mat to phone | Bridges | Cut-off |
|---:|---:|---:|---:|---:|---:|---:|
| 31,500 | 42.195 km | 42 | 1,323,000 | < 2 s | 9 | 6:30:00 |

1,323,000 live splits = 31,500 runners × 42 mats.

## ONE RUNNER. 42 SPLITS.

Demo runner **BIB 2417**. Plan: **3:15:00**, 4:37 per kilometre. Result: **3:12:58**.
On plan at KM 21. Two minutes up at the line. That is a negative split.

| Mat | Elapsed | Last 5 km | Pace /km | vs plan |
|---|---:|---:|---:|---:|
| KM 5 | 0:23:17 | 23:17 | 4:39 | +0:11 |
| KM 10 | 0:46:26 | 23:09 | 4:38 | +0:13 |
| KM 15 | 1:09:28 | 23:02 | 4:36 | +0:09 |
| KM 20 | 1:32:28 | 23:00 | 4:36 | +0:02 |
| KM 25 | 1:55:26 | 22:58 | 4:36 | −0:06 |
| KM 30 | 2:18:11 | 22:45 | 4:33 | −0:28 |
| KM 35 | 2:40:52 | 22:41 | 4:32 | −0:53 |
| KM 40 | 3:03:18 | 22:26 | 4:29 | −1:33 |
| FINISH | 3:12:58 | 9:40 (2.195 km) | 4:24 | −2:02 |

All 42 splits, one row per mat: [`data/bib-2417-splits.csv`](data/bib-2417-splits.csv) (demo data). The nine slow
kilometres are the nine bridges.

## HOW A SPLIT REACHES YOU

1. The chip on your bib crosses a mat.
2. The mat sends the read to race control.
3. Race control pushes the split to your app, the course screens and everyone who follows your bib.

The app reads the mats. It does not track your location.

## RACE WEEK

- **MON 15 MAR 2027** VELMORA 42 opens for every registered runner. Set your plan. Link your bib.
- **MON 12 APR 2027** Spectators can follow bibs.
- **SUN 18 APR 2027, 07:00** The gun.

## BRAND

Colour, type, the 12° lean, stripes, motion, sound and voice: [`brand/BRAND.md`](brand/BRAND.md).
Design tokens: [`brand/tokens.css`](brand/tokens.css). The live race card: [`app/race-card.html`](app/race-card.html).
Fonts: Barlow Condensed and Barlow, SIL Open Font License 1.1 ([`fonts/`](fonts/)).
