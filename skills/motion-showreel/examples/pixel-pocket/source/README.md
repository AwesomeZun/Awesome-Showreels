# RIDGELINE POCKET

**Trail maps that work without signal.** A tiny offline companion for day hikes.

Ridgeline Pocket was built for the moment your phone says *No Service* halfway up a ridge. Everything it needs is
already on the device: the map, the trail, the elevation, the way back.

## What it does

- **Offline maps.** Download a region once (about 12 MB for a national park). Pan, zoom and follow the trail with no signal.
- **Trail cards.** Each trail fits on one screen: distance, climb, time, water, and the turn you will miss.
- **Elevation that tells the truth.** The profile shows the steep part *before* you reach it.
- **Summit check-ins.** Stamp a summit, even offline. It syncs when you are back in range.
- **Battery first.** Four shades, no animations you did not ask for, GPS only when the screen is on.
  A full day uses about 9% battery.

## Example trail

| Trail | Distance | Climb | Time | Summit | Water | The turn you will miss |
|---|---|---|---|---|---|---|
| Granite Saddle Loop | 12.4 km | +860 m | 4 h 30 | Pika Point, 1,847 m (km 6.2) | spring at km 3.4 | left at km 7.9 |

The last 0.8 km to Pika Point is the steep part: +287 m.

## Design notes

- Four greens, like the handhelds we grew up with: readable in direct sun.
- Pixel type only (5x7). No anti-aliasing, no gradients: dithering instead.
- Motion steps, it never glides. Things move a whole pixel at a time.
- Sound: soft square-wave blips, never loud. It should feel like a pocket toy, not a dashboard.

> Ridgeline Pocket is a fictional app made for this example. Trail, numbers and screens are demo content.
