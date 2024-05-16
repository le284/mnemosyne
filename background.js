chrome.runtime.onInstalled.addListener(() => {
    chrome.contextMenus.create({
        id: "translateAndAdd",
        title: "Translate and Add to Mnemosyne",
        contexts: ["selection"]
    });
});

chrome.contextMenus.onClicked.addListener((info, tab) => {
    if (info.menuItemId === "translateAndAdd" && info.selectionText) {
        chrome.scripting.executeScript({
            target: { tabId: tab.id },
            function: translateAndAddWord,
            args: [info.selectionText]
        });
    }
});

async function translateAndAddWord(selectedText) {
    const translatedText = await fetchTranslation(selectedText);
    const word = selectedText.trim();
    const definition = translatedText.trim();

    chrome.storage.sync.get('words', (data) => {
        const words = data.words || [];
        words.push({
            word,
            definition,
            phonetic: "",
            phrases: [],
            examples: [],
            image: "",
            archived: false
        });
        chrome.storage.sync.set({ words });
    });
}

async function fetchTranslation(text) {
    const response = await fetch(`https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=en|zh`);
    const data = await response.json();
    return data.responseData.translatedText;
}
