const FALLBACK = "<p>Nothing here yet! Click me to open the editor.</p>"
async function getFile(path) {

    const response = await fetch('/api/file/getFile', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({path: path})
    });

    if (!response.ok) {
        console.log('Failed to fetch HTML content');
        return null;
    }

    const blob = await response.blob();
    const resTxt =  await blob.text();

    // if we got a 404 api response, we will return null
    try {
        const res = JSON.parse(resTxt);
        if(res.code === 404) {
            return null;
        }
    }catch {}

    return resTxt;

}

async function getSVG(fileID) {

    const resp = await getFile("/data/assets/" + fileID + '.svg');
    if(resp == null) {
        return FALLBACK;
    }
    return resp;

}

function getEditLink(fileID) {
    const data = encodeURIComponent(
        JSON.stringify({
            id: fileID
        })
    )
    return `siyuan://plugins/siyuan-jsdraw-pluginwhiteboard/?icon=iconDraw&title=Drawing&data=${data}`;
}