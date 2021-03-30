const algorithimiaApiKey = require("../credentials/algorithmia.json").apiKey;
const watsonApiKey = require("../credentials/watson.json").apikey;
const algorithimia = require("algorithmia");
const sentenceBoundaryDetection = require("sbd");
const NaturalLanguageUnderstandingV1 = require("ibm-watson/natural-language-understanding/v1");
const { IamAuthenticator } = require("ibm-watson/auth");

const nlu = new NaturalLanguageUnderstandingV1({
  authenticator: new IamAuthenticator({ apikey: watsonApiKey }),
  version: "2018-04-05",
  serviceUrl:
    "https://api.us-south.natural-language-understanding.watson.cloud.ibm.com",
});

async function robot(content) {
  await fetchContentFromWikipedia(content);
  sanitizeContent(content);
  breakContentIntoSentences(content);
  limitMaximumSentences(content);
  await fetchKeywordsOfAllSentences(content);
  console.log(content.sentences);

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
  function breakContentIntoSentences(content) {
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

  function limitMaximumSentences(content) {
    content.sentences = content.sentences.slice(0, content.maximumSentences);
  }

  async function fetchKeywordsOfAllSentences(content) {
    for (const sentence of content.sentences) {
      sentence.keywords = await fetchWatsonAndReturnKeywords(sentence.text);
    }
  }

  async function fetchWatsonAndReturnKeywords(sentence) {
    return new Promise((resolve, reject) => {
      nlu
        .analyze({
          text: sentence, // Buffer or String
          features: {
            //concepts: {},
            keywords: {},
          },
        })
        .then((response) => {
          const keywords = response.result.keywords.map(
            (keywords) => keywords.text
          );
          //console.log(JSON.stringify(response.result, null, 2));
          resolve(keywords);
        })
        .catch((err) => {
          reject(err);
        });
    });
  }
}

module.exports = robot;
