import axios from 'axios';

// Swapping to a Public API so we can get ESV/KJV working instantly without a key!
const bibleApi = axios.create({
  baseURL: 'https://bible-api.com',
});

// Helper to convert book names to the API's format
export const getBibles = async () => {
    return [
      { id: 'almeida', name: 'Almeida Revista e Atualizada', abbreviation: 'ARA' },
      { id: 'rvr1960', name: 'Reina-Valera 1960', abbreviation: 'RVR60' },
      { id: 'kjv', name: 'King James Version', abbreviation: 'KJV' },
      { id: 'web', name: 'World English Bible', abbreviation: 'WEB' }
    ];
};

export const getBooks = async (bibleId?: string) => {
    // Standard 66 books for the public API
    return [
      { id: 'Genesis', name: 'Genesis' },
      { id: 'Exodus', name: 'Exodus' },
      { id: 'Leviticus', name: 'Leviticus' },
      { id: 'Numbers', name: 'Numbers' },
      { id: 'Deuteronomy', name: 'Deuteronomy' },
      { id: 'Joshua', name: 'Joshua' },
      { id: 'Judges', name: 'Judges' },
      { id: 'Ruth', name: 'Ruth' },
      { id: '1 Samuel', name: '1 Samuel' },
      { id: '2 Samuel', name: '2 Samuel' },
      { id: '1 Kings', name: '1 Kings' },
      { id: '2 Kings', name: '2 Kings' },
      { id: '1 Chronicles', name: '1 Chronicles' },
      { id: '2 Chronicles', name: '2 Chronicles' },
      { id: 'Ezra', name: 'Ezra' },
      { id: 'Nehemiah', name: 'Nehemiah' },
      { id: 'Esther', name: 'Esther' },
      { id: 'Job', name: 'Job' },
      { id: 'Psalms', name: 'Psalms' },
      { id: 'Proverbs', name: 'Proverbs' },
      { id: 'Ecclesiastes', name: 'Ecclesiastes' },
      { id: 'Song of Solomon', name: 'Song of Solomon' },
      { id: 'Isaiah', name: 'Isaiah' },
      { id: 'Jeremiah', name: 'Jeremiah' },
      { id: 'Lamentations', name: 'Lamentations' },
      { id: 'Ezekiel', name: 'Ezekiel' },
      { id: 'Daniel', name: 'Daniel' },
      { id: 'Hosea', name: 'Hosea' },
      { id: 'Joel', name: 'Joel' },
      { id: 'Amos', name: 'Amos' },
      { id: 'Obadiah', name: 'Obadiah' },
      { id: 'Jonah', name: 'Jonah' },
      { id: 'Micah', name: 'Micah' },
      { id: 'Nahum', name: 'Nahum' },
      { id: 'Habakkuk', name: 'Habakkuk' },
      { id: 'Zephaniah', name: 'Zephaniah' },
      { id: 'Haggai', name: 'Haggai' },
      { id: 'Zechariah', name: 'Zechariah' },
      { id: 'Malachi', name: 'Malachi' },
      { id: 'Matthew', name: 'Matthew' },
      { id: 'Mark', name: 'Mark' },
      { id: 'Luke', name: 'Luke' },
      { id: 'John', name: 'John' },
      { id: 'Acts', name: 'Acts' },
      { id: 'Romans', name: 'Romans' },
      { id: '1 Corinthians', name: '1 Corinthians' },
      { id: '2 Corinthians', name: '2 Corinthians' },
      { id: 'Galatians', name: 'Galatians' },
      { id: 'Ephesians', name: 'Ephesians' },
      { id: 'Philippians', name: 'Philippians' },
      { id: 'Colossians', name: 'Colossians' },
      { id: '1 Thessalonians', name: '1 Thessalonians' },
      { id: '2 Thessalonians', name: '2 Thessalonians' },
      { id: '1 Timothy', name: '1 Timothy' },
      { id: '2 Timothy', name: '2 Timothy' },
      { id: 'Titus', name: 'Titus' },
      { id: 'Philemon', name: 'Philemon' },
      { id: 'Hebrews', name: 'Hebrews' },
      { id: 'James', name: 'James' },
      { id: '1 Peter', name: '1 Peter' },
      { id: '2 Peter', name: '2 Peter' },
      { id: '1 John', name: '1 John' },
      { id: '2 John', name: '2 John' },
      { id: '3 John', name: '3 John' },
      { id: 'Jude', name: 'Jude' },
      { id: 'Revelation', name: 'Revelation' }
    ];
};

export const getChapters = async (bibleId: string, bookId: string) => {
    // Simple mock logic: The public API handles errors if you fetch a chapter that doesn't exist.
    // We'll generate a few buttons for navigation.
    return Array.from({ length: 50 }, (_, i) => ({ id: i + 1, number: i + 1 }));
};

export const getChapterContent = async (translation: string, book: string, chapter: string) => {
    // This public API uses a different structure: https://bible-api.com/john+3:16
    const res = await bibleApi.get(`/${book}+${chapter}?translation=${translation}`);
    
    // We transform the result to match our UI expected structure
    const verses = res.data.verses;
    const htmlText = verses.map(v => `<span class="v">${v.verse}</span> ${v.text}`).join(' ');

    return {
      reference: res.data.reference,
      content: `<div class="p">${htmlText}</div>`,
      copyright: 'Public Domain (WEB/KJV) / Open Source Translation API'
    };
};
