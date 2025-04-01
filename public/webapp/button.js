function copyEditLink(fileID) {
    navigator.clipboard.writeText(getEditLink(fileID));
}
function copyImageLink(fileID) {
    navigator.clipboard.writeText(`![Drawing](assets/${fileID}.svg)`);
}

function refreshPage() {
    window.location.reload();
}

function addButton(document, fileID) {

    // Add floating button
    const floatingButton = document.createElement('button');
    floatingButton.id = 'floatingButton';
    floatingButton.innerHTML = '⚙️';
    document.body.appendChild(floatingButton);

    // Add popup menu
    const popupMenu = document.createElement('div');
    popupMenu.id = 'popupMenu';
    popupMenu.innerHTML = `
                        <button onclick="refreshPage()">Refresh</button>
                        <button onclick="copyEditLink('${fileID}')">Copy Direct Edit Link</button>
                        <button onclick="copyImageLink('${fileID}')">Copy Image Link</button>
                    `;
    document.body.appendChild(popupMenu);

    // Show/hide floating button on mouse move
    document.body.addEventListener('mousemove', () => {
        floatingButton.style.display = 'block';
    });

    document.body.addEventListener('mouseleave', () => {
        floatingButton.style.display = 'none';
        popupMenu.style.display = 'none';
    });

    // Toggle popup menu on button click
    floatingButton.addEventListener('click', (e) => {
        e.stopPropagation();
        popupMenu.style.display = popupMenu.style.display === 'block' ? 'none' : 'block';
    });

    // Hide popup menu when clicking outside
    document.addEventListener('click', () => {
        popupMenu.style.display = 'none';
    });

    // Set CSS variable for correct scaling of SVG
    const svg = document.body.querySelector('svg');
    if (svg) {
        const viewBox = svg.getAttribute('viewBox')?.split(' ') || [];
        const width = parseFloat(viewBox[2]) || svg.clientWidth;
        const height = parseFloat(viewBox[3]) || svg.clientHeight;
        document.documentElement.style.setProperty('--svg-aspect-ratio', width/height);
    }

}