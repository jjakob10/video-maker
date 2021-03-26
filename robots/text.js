const algorithimiaApiKey = require("../credentials/algorithmia.json").apiKey;
const algorithimia = require("algorithmia");
const sentenceBoundaryDetection = require("sbd");

async function robot(content) {
  await fetchContentFromWikipedia(content);
  sanitizeContent(content);
  breakCOntentIntoSentences(content);

  async function fetchContentFromWikipedia(content) {
    const algorithimiaAuthenticated = algorithimia(algorithimiaApiKey);
    const wikipediaAlgorithm = algorithimiaAuthenticated.algo(
      "web/WikipediaParser/0.1.2"
    );
    // console.log(content.searchTerm);
    const wikipediaResponse = await wikipediaAlgorithm.pipe(content.searchTerm);
    const wikipediaContent = wikipediaResponse.get();
    content.sourceContentOriginal = wikipediaContent.content;
  }

  function sanitizeContent(content) {
    const withoutBlankLinesAndMarkdown = removeBlankLinesAndMarkdonw(
      content.sourceContentOriginal
    );
    const withoutDateInParethenses = removeDataInParentheses(
      withoutBlankLinesAndMarkdown
    );

    content.sourceContentSanitized = withoutDateInParethenses;

    function removeBlankLinesAndMarkdonw(text) {
      const allLines = text.split("\n");

      const withoutBlankLinesAndMarkdown = allLines.filter((line) => {
        if (line.trim().length === 0 || line.trim().startsWith("=")) {
          return false;
        }
        return true;
      });
      return withoutBlankLinesAndMarkdown.join(" ");
    }

    function removeDataInParentheses(text) {
      return text
        .replace(/ *\([^)]*\) */g, " ")
        .replace(/[\/\\#^()*]/gm, "")
        .replace(/  /g, "");
    }
  }
  function breakCOntentIntoSentences(content) {
    content.sentences = [];

    const sentences = sentenceBoundaryDetection.sentences(
      content.sourceContentSanitized
    );
    sentences.forEach((sentence) => {
      content.sentences.push({
        text: sentence,
        keywords: [],
        images: [],
      });
    });
  }
}

module.exports = robot;
