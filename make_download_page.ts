type Song = {
    name: string
    subtitle: string
}

const songs: Record<string, Song[]> = {}
let file = ''

const append = (text: string) => file += text + '\n'

function makeTagReference(name: string) {
    return '#' +
        name.toLowerCase().replaceAll(' ', '-').replace(new RegExp(`[,.']`), '')
            .trim()
}

function makeJumpLink(name: string) {
    return `[${name}](${makeTagReference(name)})`
}

function makeImageLink(url: string) {
    return `![${url}](Screenshots/${encodeURI(url)})`
}

function makeLink(name: string, url: string) {
    return `[${name}](${encodeURI(url)})`
}

for (const file of Deno.readDirSync('./Screenshots')) {
    const name = file.name.replace('.png', '')
    const split = name.split(' - ')
    const song = split[0]
    const subtitle = split[1]

    if (songs[song] === undefined) songs[song] = []

    songs[song].push({
        name: name,
        subtitle: subtitle,
    })
}

for (const song of Object.keys(songs)) {
    append(`* ${makeJumpLink(song)}`)
}

for (const entry of Object.entries(songs)) {
    const song = entry[0]
    const songArr = entry[1]

    append(`# ${song}`)

    const filename = './Environments/' + songArr[0].name + '.dat'
    const json = JSON.parse(Deno.readTextFileSync(filename))
    const beatsaver = json.description

    append(beatsaver)

    songArr.forEach((x) => {
        const url = `https://github.com/Swifter1243/EnvironmentGrabber/blob/main/Environments/` + x.name + '.dat'
        append(`### ${x.subtitle} ${makeLink('(Download)', url)}`)
        append(makeImageLink(x.name + '.png'))
    })
}

Deno.writeTextFileSync('DOWNLOAD.md', file, undefined)
