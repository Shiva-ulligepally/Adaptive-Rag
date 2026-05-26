// Advanced sliding window word-based chunker with Heading Propagation and Metadata extraction
export function chunkText(text, chunkSizeWords = 150, overlapWords = 30) {
  if (!text) return [];
  const normalizedText = text.replace(/\s+/g, ' ').trim();
  
  // Parse all legal article headings and their character indices in the normalized string
  const headingRegex = /\b(12|13|14|15|16|17|18|19|20|21|22|23|24|25|26|27|28|29|30|31|32|33|34|35)[A-Z]?\.\s+([A-Z][a-zA-Z]+)/g;
  const headings = [];
  let match;
  while ((match = headingRegex.exec(normalizedText)) !== null) {
    headings.push({
      index: match.index,
      articleNum: match[1],
      title: match[2]
    });
  }

  const words = normalizedText.split(' ');
  const chunks = [];
  
  let index = 0;
  let chunkCount = 0;

  // Resolves the active article heading at any given character index
  function getActiveArticle(charIndex) {
    let active = null;
    for (let i = 0; i < headings.length; i++) {
      if (headings[i].index <= charIndex) {
        active = headings[i];
      } else {
        break;
      }
    }
    return active;
  }

  while (index < words.length) {
    const chunkWords = words.slice(index, index + chunkSizeWords);
    const chunkText = chunkWords.join(' ');
    
    // Track position in normalizedText to propagate the active heading
    const charPos = normalizedText.indexOf(chunkText);
    const activeArticle = getActiveArticle(charPos !== -1 ? charPos : 0);
    
    let prefix = "";
    if (activeArticle) {
      prefix = `[Article ${activeArticle.articleNum} - ${activeArticle.title}] `;
    }

    chunks.push({
      id: `chunk_${chunkCount++}`,
      text: prefix + chunkText,
      metadata: {
        startWord: index,
        endWord: index + chunkWords.length,
        article: activeArticle ? `Article ${activeArticle.articleNum}` : null
      }
    });

    // Move forward by chunk size minus overlap
    index += (chunkSizeWords - overlapWords);

    // Safeguard to prevent infinite loops if overlap >= chunk size
    if (chunkSizeWords <= overlapWords) {
      index += 1;
    }
  }

  return chunks;
}
