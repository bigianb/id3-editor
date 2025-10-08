

/*
*   Given an image name, look for the it in the filesystem.
*   Various file extensions will be tried.
*/
export
async function findImage(imageName: string): Promise<string | null>
{
    let exits = await basefs.exists(imageName);
    if (exits) {
        return imageName;
    }
    const ext = imageName.slice(-4).toLowerCase();
    let basename = imageName;
    if (ext[0] === '.') {
        basename = imageName.slice(0, -4);
    }
    const candidates = [basename + '.jpg', basename + '.ftx', basename + '.png', basename + '.tga'];
    for (const candidate of candidates) {
        exits = await basefs.exists(candidate);
        if (exits) {
            return candidate;
        }
    }
    return null;
}

