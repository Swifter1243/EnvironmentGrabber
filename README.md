# Environment Grabber

[This](https://github.com/Swifter1243/EnvironmentGrabber/blob/main/script.ts) script will allow you to snapshot any Chroma map to turn it's visuals at a given time into a [user shared environment.](https://github.com/Aeroluna/Heck/wiki/EnvironmentJSONS)

Simply edit the fields in the "**YOU CHANGE**" section and run the script with `deno run --allow-all --no-check script.ts`

**_Capable of_**:
- Loading V2 and V3 maps
- Loading from a timestamp (mm:ss) or beats
- Accounting for some Noodle Extensions [player movement](https://github.com/Aeroluna/Heck/wiki/Animation#AssignPlayerToTrack)
- Doing basic player transformations
- Doing basic HUD transformations

**_Known Limitations_**:
- Doesn't handle [modifiers](https://github.com/Aeroluna/Heck/wiki/Modifiers)
- Doesn't handle [repeat](https://github.com/Aeroluna/Heck/wiki/Animation#animatetrack)
- Doesn't account for [parent tracks](https://github.com/Aeroluna/Heck/wiki/Animation#AssignTrackParent)
- Has some issues with environment objects that are children to others
- Might have issues with missing data types which are implicity 0 in a beatmap

# Environment Repository

Take any environment from [this](https://github.com/Swifter1243/EnvironmentGrabber/blob/main/DOWNLOAD.md) page and place it in your `Beat Saber\UserData\Chroma\Environments` folder.
