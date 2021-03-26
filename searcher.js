import fs from "fs";
import stopwords from "./stopwords.json";
import Entry from "./entry";

export default class Searcher {
    constructor(files) {
        this.dictionary = new Map();

        //for storing file lengths needed for normalization
        this.documents = new Map();

        //var merged = new Map([...map1, ...map2, ...map3])

        //index time
        files.forEach(file => {
            let data = fs.readFileSync(file, "utf8");
            file = file.split("/").pop();
            //1. retrieve data and preprocess
            let terms = this.preProcessData(data);

            // 2. safe document length of file for normalisation
            this.documents.set(file, data.length);

            // 3. index time: calculate frequencies and setup postingsList of terms
            this.setupDictionary(terms, file);
        });

        //4. calculate the inversed document frequency
        for (let entry of this.dictionary.values()) {
            entry.calculateIDF(this.documents.size);
        }
    }

    setupDictionary(terms, file) {
        //calculate frequency of each term in file (distinct)
        let termsFreqs = this.calculateTermsFrequencies(terms);

        for (let [term, values] of termsFreqs.entries()) {
            if (!this.dictionary.has(term)) {
                this.dictionary.set(
                    term,
                    new Entry(
                        term,
                        //postingsList = Map with files as key and frequencies of term as value
                        new Map().set(file, values.length)

                        //normalized variant - but then the result are completly different
                        //e.g. lost of austria_bundesliga cause they are short files in comparision to Archbishopric_of_Salzburg
                        //new Map().set(file, values.length/this.documents.get(file))  
                    )
                );
            } else {
                this.dictionary.get(term).documents.set(file, values.length);
                //this.dictionary.get(term).documents.set(file, values.length/this.documents.get(file));
            }
        }
    }

    calculateTermsFrequencies(terms) {
        let termsFreqs = new Map();
        terms.forEach((term, index) => {
            if (termsFreqs.has(term)) {
                //add position index in array - maybe can do something with it later
                termsFreqs.get(term).push(index);
            } else {
                termsFreqs.set(term, [index]);
            }
        });
        return termsFreqs;
    }

    preProcessData(data) {
        //tolowercase, remove punctuations, remove stopwords

        var splitWords = data
            .toLowerCase()
            .replace(new RegExp("\r?\n", "g"), " ") //remove line ends
            .split(/\s+|\.+|\,/); //split by whitespace . ,

        //filters whitespace out that is left from the split
        splitWords = splitWords.filter(word => {
            return word;
        });

        //handle - delimiter
        splitWords.forEach(term => {
            let delimiters;
            if (term.includes("-")) {
                delimiters = term.split("-");
                delimiters.forEach(part => {
                    splitWords.push(part);
                });
            }
        });

        return splitWords
            .map(term => term.replace(/[^0-9a-z-A-Z]/g, ""))
            .map(term => term.replace(/s$/g, "")) //remove plural s
            .filter(this.isNotAStopWord);
    }

    // used at query time
    calculateScore(searchTerms) {
        let postingsList = new Map();

        // prevent spam of words
        searchTerms = searchTerms.filter(this.distinct);

        searchTerms.forEach(term => {
            let score = 0;
            const termEntry = this.dictionary.get(term);

            // if term is not found in any file
            if (!termEntry) {
                return postingsList;
            }

            //calculate score of query term for each document
            for (let [file, tf] of termEntry.documents.entries()) {
                score = termEntry.idf * tf;

                if (postingsList.has(file)) {
                    let post = postingsList.get(file);
                    post.score += score;
                    post.terms[term] = score;
                } else {
                    postingsList.set(file, {
                        filename: file,
                        score: score,
                        terms: { [term]: score }
                    });
                }
            }
        });
        return postingsList;
    }

    search(query) {
        //query time
        //1. preprocess query terms
        let searchTerms = this.preProcessData(query);
        let postingsList = new Map();

        //returning all files when searchterm = ""
        if (searchTerms.length < 1) {
            for (let [file, length] of this.documents.entries()) {
                postingsList.set(file, {
                    filename: file
                });
            }
            return Array.from(postingsList.values());
        }

        //2. for each query term calculate score for each document
        postingsList = this.calculateScore(searchTerms);

        //3. prepare results
        let result = Array.from(postingsList.values());

        //4. sort results descending
        return result.sort((a, b) => this.compareByScore(a, b));
    }

    compareByScore(a, b) {
        //sort filenames descending if score is same
        if (a.score == b.score) {
            return a.filename < b.filename ? -1 : b.filename < a.filename ? 1 : 0;
        }
        return b.score - a.score;
    }

    isNotAStopWord(value) {
        return !stopwords.includes(value);
    }

    distinct(value, index, self) {
        return self.indexOf(value) === index;
    }
}
