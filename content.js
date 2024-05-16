chrome.storage.sync.get('words', (data) => {
    const words = data.words.filter(word => !word.archived) || [];
    if (words.length > 0) {
        walk(document.body, words);
    }
});

function walk(node, words) {
    let child, next;
    switch (node.nodeType) {
        case 1:
        case 9:
        case 11:
            child = node.firstChild;
            while (child) {
                next = child.nextSibling;
                walk(child, words);
                child = next;
            }
            break;
        case 3:
            handleText(node, words);
            break;
    }
}

function handleText(textNode, words) {
    let text = textNode.nodeValue;
    let hasMatch = false;

    words.forEach(({ word, definition, phonetic, phrases, examples, image }) => {
        const regex = new RegExp(`\\b${word}\\b`, 'gi');
        if (regex.test(text)) {
            hasMatch = true;
            text = text.replace(regex, match => {
                return `<span class="highlight" title="${definition}" data-word="${word}" data-definition="${definition}" data-phonetic="${phonetic}" data-phrases="${phrases.join('; ')}" data-examples="${examples.join('; ')}" data-image="${image}">${match}</span>`;
            });
        }
    });

    if (hasMatch) {
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = text;
        const frag = document.createDocumentFragment();
        let child;
        while (child = tempDiv.firstChild) {
            frag.appendChild(child);
        }
        textNode.parentNode.replaceChild(frag, textNode);
    }
}

document.addEventListener('mouseover', (event) => {
    if (event.target.classList.contains('highlight')) {
        const word = event.target.getAttribute('data-word');
        const definition = event.target.getAttribute('data-definition');
        const phonetic = event.target.getAttribute('data-phonetic');
        const phrases = event.target.getAttribute('data-phrases').split('; ');
        const examples = event.target.getAttribute('data-examples').split('; ');
        const image = event.target.getAttribute('data-image');

        const card = document.createElement('div');
        card.classList.add('word-card');
        card.innerHTML = `
            <h2>${word}</h2>
            <p><strong>Phonetic:</strong> ${phonetic}</p>
            <p><strong>Definition:</strong> ${definition}</p>
            <p><strong>Phrases:</strong> ${phrases.join(', ')}</p>
            <p><strong>Examples:</strong> ${examples.join(', ')}</p>
            <img src="${image}" alt="Image" style="max-width: 100%;">
        `;

        document.body.appendChild(card);

        card.style.position = 'absolute';
        card.style.top = `${event.pageY}px`;
        card.style.left = `${event.pageX}px`;

        event.target.addEventListener('mouseout', () => {
            card.remove();
        }, { once: true });
    }
});
