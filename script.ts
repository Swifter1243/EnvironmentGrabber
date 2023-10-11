// deno-lint-ignore-file
import * as rm from 'https://deno.land/x/remapper@3.1.2/src/mod.ts'
import { existsSync } from 'https://deno.land/std@0.196.0/fs/mod.ts'

/*
? Environment Grabber by Swifter :)

? Run with "deno run --allow-all --no-check script.ts" in the terminal.
*/

// TODO: Do environments for 52 hearts and spells
/*
52 Hearts - Dusk (4:18)
52 Hearts - Vibrant Auroras (1:14)
52 Hearts - Purple Auroras (0:41) 
52 Hearts - Green Auroras (3:56)

Spells - Monolith (1:25)
Spells - Awakening (2:14)
Spells - Open Sky (2:50)
Spells - Chrysalis (3:06)
*/

//! ------ YOU CHANGE ------

/** The author of the environment. */
const AUTHOR = `Swifter`
/** What you want to name the environment. */
const NAME = `52 Hearts - Vibrant Auroras`
/** The version of the environment. (not game version) */
const VERSION = '0.0.1'
/** Describe the environment. */
const DESCRIPTION = `https://beatsaver.com/maps/355af`

/** Difficulty in the map to take the environment from. */
const INPUT_DIFFICULTY: rm.DIFFNAME = 'ExpertPlusStandard'
/** The directory of the map to take from. */
const PROJECT_DIR =
    `F:/Steam/steamapps/common/Beat Saber/Beat Saber_Data/CustomWIPLevels/52_Hearts`
/**
    Where to export the environment to.
    Environments are picked up by the game in "[your beat saber directory]/UserData/Chroma/Environments/"
*/
const EXPORT_LOCATION =
    'F:/Steam/steamapps/common/Beat Saber/UserData/Chroma/Environments'

/**
    Time to sample the environment at.
    Can be expressed as a single number for the beat or a timestamp (such as '0:00')
*/
const SAMPLE_TIME: Timestamp = '2:16'

/** Whether to force static lights in the environment (use only custom initializing events) */
const FORCE_STATIC_LIGHTS = true

/** Custom offsets for the player */
const PLAYER_POSITION_OFFSET: rm.Vec3 = [0, 0, 0]
const PLAYER_ROTATION_OFFSET: number = 0 // <-- Negative - Positive -->

/** Custom transformation for HUD */
const HUD_TRANSFORM: Transform = {
    // These transforms will give you a nice floor UI, for example
    // position: [0, 0.3, 2.5],
    // rotation: [90, 0, 0],
    // scale: [0.5, 0.5, 0],

    // The "untouched" distance the panel is from the origin
    // Used to rotate UI in a more intuitive way, around the bottom of the panel
    panelDefaultDistance: 7,
}

/** Whether to ignore any elements that move the HUD */
const DEFAULT_HUD = true

//! ------------------------

//! Import
rm.info.load(PROJECT_DIR + '/Info.dat')
const mapDir = PROJECT_DIR + '/' + INPUT_DIFFICULTY + '.dat'

if (!existsSync(PROJECT_DIR)) {
    throw (`${PROJECT_DIR} is not a valid map location!`)
}
if (!existsSync(mapDir)) {
    throw (`${INPUT_DIFFICULTY} does not exist in this map!`)
}
if (!existsSync(EXPORT_LOCATION)) {
    throw (`${EXPORT_LOCATION} is not a valid export location!`)
}

const map = JSON.parse(Deno.readTextFileSync(mapDir)) as Json
const V3 = Object.hasOwn(map, 'version')

//! Timestamp
type Tens = 0 | 1 | 2 | 3 | 4 | 5
type Ones = Tens | 6 | 7 | 8 | 9
type TimestampBase = `${number}:${Tens}${Ones}`
type Timestamp = number | TimestampBase | `${TimestampBase}.${number}`

let sampleBeats = 0

if (typeof SAMPLE_TIME === 'string') {
    const splitTime = (SAMPLE_TIME as string).split(':')
    const minutes = parseInt(splitTime[0])
    const seconds = parseFloat(splitTime[1])
    const totalSeconds = minutes *
            60 + seconds
    sampleBeats = (rm.info.BPM / 60) * totalSeconds
} else {
    sampleBeats = SAMPLE_TIME
}

//! Apply materials
function convertMaterial(data: Json) {
    return {
        shader: data._shader,
        color: data._color,
        shaderKeywords: data._shaderKeywords,
    }
}

const materials =
    ((V3 ? map.customData.materials : map._customData._materials) ?? {}) as Json

if (map._customData && map._customData._materials && !V3) {
    Object.keys(materials).forEach((x) => {
        materials[x] = convertMaterial(materials[x])
    })
}

//! Apply point definitions
let pointDefinitions =
    ((V3
        ? map.customData.pointDefinitions
        : map._customData._pointDefinitions) ?? {}) as Json

if (map._customData && map._customData._pointDefinitions && !V3) {
    const newPointDefinitions: Json = {}

    pointDefinitions.forEach((x: Json) => {
        newPointDefinitions[x._name] = x._points
    })

    pointDefinitions = newPointDefinitions
}

//! Apply custom events
let customEvents =
    ((V3 ? map.customData.customEvents : map._customData._customEvents) ??
        []) as Json[]

customEvents = customEvents.map((x) => {
    if (!V3) {
        const originalData = x._data

        x = {
            b: x._time,
            t: x._type,
            d: {
                track: x._data._track,
                easing: x._data._easing,
                duration: x._data._duration,
                position: x._data._position,
                localPosition: x._data._localPosition,
                rotation: x._data._rotation,
                localRotation: x._data._localRotation,
                scale: x._data._scale,
            },
        }

        if (
            originalData._attenuation || originalData._offset ||
            originalData._startY || originalData._height
        ) {
            x.d.BloomFogEnvironment = {
                attenuation: originalData._attenuation,
                offset: originalData._offset,
                startY: originalData._startY,
                height: originalData._height,
            }
            x.t = 'AnimateComponent'
        }
    }

    return x
}).sort((a, b) => a.b - b.b)

//! Find player position
const playerPosEvent = customEvents.findLast((x) =>
    x.t === 'AssignPlayerToTrack'
)
let playerPos: undefined | rm.Vec3 = undefined
let playerRot: undefined | number = undefined

if (playerPosEvent) {
    const playerTrack = playerPosEvent.d.track

    const obj = {} as Json

    customEvents.forEach((e) => {
        const data = e.d

        if (
            e.t === 'AnimateTrack' && trackHas(playerTrack, data.track) &&
            e.b <= sampleBeats
        ) {
            const fraction = findFraction(e)
            applyFractionTransform('position', e.d, fraction, obj)
            applyFractionTransform('localRotation', e.d, fraction, obj)
            applyFractionTransform('rotation', e.d, fraction, obj)
        }
    })

    obj.position ??= [0, 0, 0]
    obj.localRotation ??= [0, 0, 0]
    obj.rotation ??= [0, 0, 0]

    playerPos = obj.position
    playerRot = (obj.rotation[1] + obj.localRotation[1]) % 360
}

if (!PLAYER_POSITION_OFFSET.every((x) => x === 0)) {
    playerPos ??= [0, 0, 0]
    playerPos = rm.arrAdd(playerPos, PLAYER_POSITION_OFFSET)
}

if (PLAYER_ROTATION_OFFSET !== 0) {
    playerRot ??= 0
    playerRot -= PLAYER_ROTATION_OFFSET
}

//! Apply events
let events = (V3 ? map.basicBeatmapEvents : map._events) as Json[]

events = events.map((x) => {
    if (!V3) {
        const cd = x._customData

        x = {
            b: x._time,
            et: x._type,
            f: x._floatValue ?? 1,
            i: x._value,
        }

        if (cd) {
            x.customData = {
                direction: cd._direction,
                lockRotation: cd._lockPosition,
                speed: cd._preciseSpeed,
                color: cd._color,
                easing: cd._easing,
                lerpType: cd._lerpType,
                lightID: cd._lightID,
            }
        }
    }

    if (
        x.i === rm.EVENTACTION.BLUE_FADE || x.i === rm.EVENTACTION.RED_FADE ||
        x.i === rm.EVENTACTION.BLUE_FLASH || x.i === rm.EVENTACTION.RED_FLASH
    ) {
        x.i = rm.EVENTACTION.OFF
    }

    return x
}).filter((x) => x.b <= sampleBeats).sort((a, b) => a.b - b.b)

const optimizedEvents = [] as Json[]

const groupsToOptimize = new Set([
    rm.EVENTGROUP.BACK_LASERS,
    rm.EVENTGROUP.BILLIE_LEFT,
    rm.EVENTGROUP.BILLIE_RIGHT,
    rm.EVENTGROUP.CENTER_LASERS,
    rm.EVENTGROUP.GAGA_LEFT,
    rm.EVENTGROUP.GAGA_RIGHT,
    rm.EVENTGROUP.LEFT_EXTRA,
    rm.EVENTGROUP.LEFT_LASERS,
    rm.EVENTGROUP.RIGHT_EXTRA,
    rm.EVENTGROUP.RIGHT_LASERS,
    rm.EVENTGROUP.RING_LIGHTS,
])

const ignoreGroups = new Set()
const ignoreGroupIDs: Record<number, Set<number>> = {}

for (let i = events.length - 1; i >= 0; i--) {
    const event = events[i]
    event.b = 0
    const type = event.et

    const lightID = event.customData ? event.customData.lightID : undefined

    if (ignoreGroups.has(type)) {
        continue
    }

    const ignoredIDSet = ignoreGroupIDs[type]

    if (lightID !== undefined && ignoredIDSet !== undefined) {
        if (typeof lightID === 'number') {
            if (ignoredIDSet.has(lightID)) {
                continue
            }
        } else {
            if (!(lightID as number[]).some((x) => !ignoredIDSet.has(x))) {
                continue
            }
        }
    }

    if (groupsToOptimize.has(type)) {
        if (!lightID) {
            ignoreGroups.add(type)
        } else {
            if (ignoredIDSet === undefined) ignoreGroupIDs[type] = new Set()

            if (typeof lightID === 'number') {
                ignoreGroupIDs[type].add(lightID)
            } else {
                ;(lightID as number[]).forEach((x) => {
                    ignoreGroupIDs[type].add(x)
                })
            }
        }
    }

    optimizedEvents.push(event)
}

events = optimizedEvents.reverse()

//! Apply environment
function trackHas(track: string, value: string | string[]) {
    if (value === undefined) {
        return false
    }
    if (typeof value === 'string') {
        return track === value
    }
    return value.some((x) => x === track)
}

function applyFractionTransform(
    prop: rm.ANIM,
    obj: Json,
    fraction: number,
    objectToApply: Json,
    time: number | undefined = undefined,
) {
    const anim = obj[prop]

    if (!anim) {
        return
    }

    if (typeof anim === 'string') {
        objectToApply[prop] = pointDefinitions[anim]
    } else if (rm.isSimple(anim)) {
        objectToApply[prop] = anim
    } else {
        objectToApply[prop] = rm.getValuesAtTime(prop, anim, fraction)
    }

    if (objectToApply[prop].length === 1) {
        objectToApply[prop] = objectToApply[prop][0]
    }

    if (time !== undefined) {
        objectToApply.lastUpdatedBeat = time
    }
}

function findFraction(event: Json) {
    const data = event.d
    const time = event.b
    const dur = data.duration ?? 0
    let fraction = (sampleBeats - time) / (dur > 0 ? dur : 1)

    if (fraction > 1) fraction = 1

    if (data.easing) {
        fraction = rm.lerpEasing(data.easing, fraction)
    }

    return fraction
}

let environment =
    ((V3 ? map.customData.environment : map._customData._environment) ??
        []) as Json[]

environment = environment.map((x) => {
    if (!V3) {
        x = {
            id: x._id,
            lookupMethod: x._lookupMethod,
            active: x._active,
            duplicate: x._duplicate,
            components: x._lightID === undefined ? undefined : {
                ILightWithId: {
                    lightID: x._lightID,
                },
            },
            localPosition: x._localPosition,
            localRotation: x._localRotation,
            position: x._position,
            rotation: x._rotation,
            scale: x._scale,
            track: x._track,
            geometry: x._geometry !== undefined
                ? {
                    type: x._geometry._type,
                    collision: x._geometry._collision,
                    material: typeof x._geometry._material === 'string'
                        ? x._geometry._material
                        : convertMaterial(x._geometry._material),
                }
                : undefined,
        }
    }

    x.lastUpdatedBeat = 0

    const track = x.track
    delete x.track

    if (track !== undefined) {
        customEvents.forEach((e) => {
            const time = e.b
            const data = e.d

            if (
                e.t === 'AnimateTrack' && trackHas(track, data.track) &&
                time <= sampleBeats
            ) {
                const fraction = findFraction(e)

                applyFractionTransform('position', data, fraction, x, time)
                applyFractionTransform('localPosition', data, fraction, x, time)
                applyFractionTransform('rotation', data, fraction, x, time)
                applyFractionTransform('localRotation', data, fraction, x, time)
                applyFractionTransform('scale', data, fraction, x, time)
            }
        })
    }

    if (playerPos) {
        if (x.position) {
            x.position = rm.arrSubtract(x.position, playerPos)
        }
        if (x.localPosition) {
            x.localPosition = rm.arrSubtract(x.localPosition, playerPos)
        }
    }

    if (playerRot) {
        if (x.position) {
            const transform = rm.combineTransforms({
                pos: x.position,
                rot: x.rotation,
            }, {
                rot: [0, -playerRot, 0],
            })

            x.position = transform.pos
            x.rotation = transform.rot
        }
    }

    if (!V3) {
        if (x.position) {
            x.position = (x.position as number[]).map((x) => x * 0.6)
        }
        if (x.localPosition) {
            x.localPosition = (x.localPosition as number[]).map((x) => x * 0.6)
        }
    }

    return x
}).sort((a, b) => a.lastUpdatedBeat - b.lastUpdatedBeat)

if (DEFAULT_HUD) {
    environment = environment.filter((x) =>
        !x.id || (x.id && !x.id.includes('HUD'))
    )
}

environment.forEach((x) => {
    delete x.lastUpdatedBeat
})

type Transform = {
    position?: rm.Vec3
    scale?: rm.Vec3
    rotation?: rm.Vec3
    panelDefaultDistance: number
}

if (Object.keys(HUD_TRANSFORM).length > 0) {
    const env = new rm.Environment('NarrowGameHUD', 'EndsWith')
    Object.assign(env, HUD_TRANSFORM)

    if (HUD_TRANSFORM.rotation) {
        env.position = rm.applyAnchor(
            env.position ?? [0, 0, HUD_TRANSFORM.panelDefaultDistance],
            env.rotation ?? [0, 0, 0],
            env.scale ?? [1, 1, 1],
            [0, 0, -HUD_TRANSFORM.panelDefaultDistance],
        )
        delete env.json.panelDefaultDistance
    }

    environment.push(env.json)
}

//! Apply fog
const fogEvents = customEvents.filter((x) =>
    x.t === 'AnimateComponent' && x.d.BloomFogEnvironment && x.b <= sampleBeats
)

if (fogEvents.length > 0) {
    let fogEnv = environment.find((x) =>
        x.components && x.components.BloomFogEnvironment
    )

    if (!fogEnv) {
        fogEnv = {
            id: '[0]Environment',
            lookupMethod: 'EndsWith',
            components: {
                BloomFogEnvironment: {},
            },
        }

        environment.push(fogEnv)
    }

    const bloomFog = fogEnv.components.BloomFogEnvironment

    fogEvents.forEach((e) => {
        const fraction = findFraction(e)
        const eventFog = e.d.BloomFogEnvironment

        applyFractionTransform('attenuation', eventFog, fraction, bloomFog)
        applyFractionTransform('offset', eventFog, fraction, bloomFog)
        applyFractionTransform('startY', eventFog, fraction, bloomFog)
        applyFractionTransform('height', eventFog, fraction, bloomFog)
    })

    if (playerPos) {
        bloomFog.startY ??= 0
        bloomFog.startY -= playerPos[1] * 0.6
    }
}

//! Export
// deno-lint-ignore no-explicit-any
type Json = Record<string, any>

type Features = {
    useChromaEvents?: boolean
    forceEffectsFilter?: 'AllEffects' | 'StrobeFilter' | 'NoEffects'
    basicBeatmapEvents?: Json[]
}

const data = {
    version: '1.0.0',
    name: NAME,
    author: AUTHOR,
    environmentVersion: VERSION,
    environmentName: rm.info.environment,
    description: DESCRIPTION,
    features: {
        useChromaEvents: true,
        basicBeatmapEvents: events,
        forceEffectsFilter: FORCE_STATIC_LIGHTS ? 'NoEffects' : undefined,
    } as Features,
    environment: environment,
    materials: materials,
}

Deno.writeTextFileSync(
    EXPORT_LOCATION + '/' + NAME + '.dat',
    JSON.stringify(data),
)

console.log(`Successfully exported "${NAME}.dat" at beat ${sampleBeats}`)
