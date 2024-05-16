const ITEMS_PER_PAGE = 20;
let currentPage = { words: 1, archived: 1 };
let editTargetWord = null;

document.getElementById('addWord').addEventListener('click', () => {
    const word = document.getElementById('word').value.trim();
    const definition = document.getElementById('definition').value.trim() || '';
    const phonetic = document.getElementById('phonetic').value.trim() || '';
    const phrases = document.getElementById('phrases').value.trim().split(';').map(phrase => phrase.trim());
    const examples = document.getElementById('examples').value.trim().split(';').map(example => example.trim());
    const image = document.getElementById('image').value.trim() || '';

    if (word) {
        chrome.storage.sync.get('words', (data) => {
            const words = data.words || [];
            words.push({ word, definition, archived: false, phonetic, phrases, examples, image });
            chrome.storage.sync.set({ words }, () => {
                updateWordList();
                document.getElementById('word').value = '';
                document.getElementById('definition').value = '';
                document.getElementById('phonetic').value = '';
                document.getElementById('phrases').value = '';
                document.getElementById('examples').value = '';
                document.getElementById('image').value = '';
            });
        });
    }
});

document.getElementById('clearData').addEventListener('click', () => {
    chrome.storage.sync.clear(() => {
        updateWordList();
    });
});

document.getElementById('saveEdit').addEventListener('click', () => {
    const word = document.getElementById('editWord').value.trim();
    const definition = document.getElementById('editDefinition').value.trim() || '';
    const phonetic = document.getElementById('editPhonetic').value.trim() || '';
    const phrases = document.getElementById('editPhrases').value.trim().split(';').map(phrase => phrase.trim());
    const examples = document.getElementById('editExamples').value.trim().split(';').map(example => example.trim());
    const image = document.getElementById('editImage').value.trim() || '';

    if (word && editTargetWord !== null) {
        chrome.storage.sync.get('words', (data) => {
            const words = data.words.map(w => {
                if (w.word === editTargetWord) {
                    return { word, definition, archived: w.archived, phonetic, phrases, examples, image };
                }
                return w;
            });
            chrome.storage.sync.set({ words }, () => {
                updateWordList();
                document.getElementById('editModal').style.display = 'none';
            });
        });
    }
});

document.getElementById('exportWords').addEventListener('click', () => {
    chrome.storage.sync.get('words', (data) => {
        const words = data.words || [];
        const blob = new Blob([JSON.stringify(words, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'words.json';
        a.click();
        URL.revokeObjectURL(url);
    });
});

document.getElementById('importWordsButton').addEventListener('click', () => {
    document.getElementById('importWords').click();
});

document.getElementById('importWords').addEventListener('change', (event) => {
    const file = event.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = (e) => {
            const words = JSON.parse(e.target.result);
            chrome.storage.sync.set({ words }, () => {
                updateWordList();
            });
        };
        reader.readAsText(file);
    }
});

function addWordToList(word, definition, archived, phonetic, phrases, examples, image) {
    const wordList = archived ? document.getElementById('archivedWordList') : document.getElementById('wordList');
    const li = document.createElement('li');
    li.innerHTML = `
        <span class="word-text ${archived ? 'archived' : ''}" title="${definition}" data-word="${word}" data-definition="${definition}" data-phonetic="${phonetic}" data-phrases="${phrases.join('; ')}" data-examples="${examples.join('; ')}" data-image="${image}">${word || ''}</span>
        <div class="buttons">
            <button class="edit-btn" data-word="${word}">Edit</button>
            <button class="archive-btn" data-word="${word}">${archived ? 'Unarchive' : 'Archive'}</button>
            <button class="delete-btn" data-word="${word}">Delete</button>
        </div>
    `;
    wordList.appendChild(li);

    li.querySelector('.edit-btn').addEventListener('click', (event) => {
        const targetWord = event.target.getAttribute('data-word');
        chrome.storage.sync.get('words', (data) => {
            const wordData = data.words.find(w => w.word === targetWord);
            if (wordData) {
                editTargetWord = targetWord;
                document.getElementById('editWord').value = wordData.word;
                document.getElementById('editDefinition').value = wordData.definition;
                document.getElementById('editPhonetic').value = wordData.phonetic;
                document.getElementById('editPhrases').value = wordData.phrases.join('; ');
                document.getElementById('editExamples').value = wordData.examples.join('; ');
                document.getElementById('editImage').value = wordData.image;
                document.getElementById('editModal').style.display = 'block';
            }
        });
    });

    li.querySelector('.archive-btn').addEventListener('click', (event) => {
        const targetWord = event.target.getAttribute('data-word');
        chrome.storage.sync.get('words', (data) => {
            const words = data.words.map(w => {
                if (w.word === targetWord) {
                    w.archived = !w.archived;
                }
                return w;
            });
            chrome.storage.sync.set({ words }, () => {
                updateWordList();
            });
        });
    });

    li.querySelector('.delete-btn').addEventListener('click', (event) => {
        const targetWord = event.target.getAttribute('data-word');
        chrome.storage.sync.get('words', (data) => {
            const words = data.words.filter(w => w.word !== targetWord);
            chrome.storage.sync.set({ words }, () => {
                updateWordList();
            });
        });
    });

    li.querySelector('.word-text').addEventListener('click', (event) => {
        const word = event.target.getAttribute('data-word');
        const definition = event.target.getAttribute('data-definition');
        const phonetic = event.target.getAttribute('data-phonetic');
        const phrases = event.target.getAttribute('data-phrases').split('; ');
        const examples = event.target.getAttribute('data-examples').split('; ');
        const image = event.target.getAttribute('data-image');

        document.getElementById('modalWord').innerText = word;
        document.getElementById('modalDefinition').innerText = definition;
        document.getElementById('modalPhonetic').innerText = phonetic;
        document.getElementById('modalPhrases').innerText = phrases.join(', ');
        document.getElementById('modalExamples').innerText = examples.join(', ');
        document.getElementById('modalImage').src = image;

        document.getElementById('wordModal').style.display = 'block';
    });
}

function updateWordList() {
    chrome.storage.sync.get('words', (data) => {
        const words = data.words || [];
        const wordList = document.getElementById('wordList');
        const archivedWordList = document.getElementById('archivedWordList');
        wordList.innerHTML = '';
        archivedWordList.innerHTML = '';

        const activeWords = words.filter(w => !w.archived);
        const archivedWords = words.filter(w => w.archived);

        paginateList(activeWords, wordList, currentPage.words, 'words');
        paginateList(archivedWords, archivedWordList, currentPage.archived, 'archived');

        updatePagination(activeWords.length, 'wordPagination', 'words');
        updatePagination(archivedWords.length, 'archivedPagination', 'archived');
    });
}

function paginateList(items, listElement, page, type) {
    listElement.innerHTML = '';
    const start = (page - 1) * ITEMS_PER_PAGE;
    const end = start + ITEMS_PER_PAGE;
    const paginatedItems = items.slice(start, end);

    paginatedItems.forEach(({ word, definition, archived, phonetic, phrases, examples, image }) => {
        addWordToList(word, definition, archived, phonetic, phrases, examples, image);
    });
}

function updatePagination(totalItems, paginationElementId, type) {
    const totalPages = Math.ceil(totalItems / ITEMS_PER_PAGE);
    const paginationElement = document.getElementById(paginationElementId);
    paginationElement.innerHTML = '';

    for (let i = 1; i <= totalPages; i++) {
        const button = document.createElement('button');
        button.innerText = i;
        if (i === currentPage[type]) {
            button.classList.add('active');
        }
        button.addEventListener('click', () => {
            currentPage[type] = i;
            updateWordList();
        });
        paginationElement.appendChild(button);
    }
}

document.addEventListener('DOMContentLoaded', () => {
    updateWordList();

    // 选项卡切换逻辑
    document.querySelectorAll('.tab').forEach(tab => {
        tab.addEventListener('click', () => {
            document.querySelectorAll('.tab, .tab-content').forEach(el => {
                el.classList.remove('active');
            });
            tab.classList.add('active');
            document.getElementById(tab.getAttribute('data-tab')).classList.add('active');
        });
    });

    // 模态对话框关闭逻辑
    const modals = document.querySelectorAll('.modal');
    modals.forEach(modal => {
        const span = modal.querySelector('.close');
        span.onclick = function() {
            modal.style.display = 'none';
        }

        window.onclick = function(event) {
            if (event.target == modal) {
                modal.style.display = 'none';
            }
        }
    });
});
