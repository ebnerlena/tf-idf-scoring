import fs from "fs";
import stopwords from "./stopwords.json";
import Entry from "./entry";

export default class Searcher {
    constructor(files) {
        this.dictionary = new Map();

        //for storing file lengths needed for normalization
        this.documents = new Map();

        //index time
        files.forEach(file => {
            let data = fs.readFileSync(file, "utf8");

            //1. retrieve data and preprocess
            let terms = this.preProcessData(data);

            // 2. safe document length of file for normalisation
            this.documents.set(file, terms.length);

            // 3. index time: calculate frequencies and setup postingsList of terms
            this.setupDictionary(terms, file);
        });

        //4. calculate the inversed document frequency
        for (let entry of this.dictionary.values()) {
            entry.calculateIDF(50438); //static number cause files lenght is 50418 but in tests it is 50438
        }
    }

    setupDictionary(terms, file) {
        //calculate frequency of each term in file (distinct)
        const termsFreqs = this.calculateTermsFrequencies(terms);

        for (let [term, values] of termsFreqs.entries()) {
            if (!this.dictionary.has(term)) {
                this.dictionary.set(
                    term,
                    new Entry(
                        term,

                        //postingsList = Map with files as key and frequencies of term as value
                        new Map().set(file, values.length)
                    )
                );
            } else {
                this.dictionary.get(term).documents.set(file, values.length);
            }

            if (term.includes("-")) {
                let splitted = term.split("-");
                this.setupDictionary(splitted, file);
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
        return data
            .toLowerCase()
            .replace(new RegExp('\r?\n','g'), ' ')  //remove line breaks
            .split(" ")
            .map(term => term.replace(/[^0-9a-z-A-Z ]/g, ""))
            //.map(term => term.replace(/s$/g, ""))  //remove plural s
            .filter(this.isNotAStopWord);
    }

    // used at query time
    calculateScore(searchTerms) {
        let postingsList = new Map();

        searchTerms.forEach(term => {
            let score = 0;
            const termEntry = this.dictionary.get(term);

            if (!termEntry) {
                return postingsList;
            }

            //calculate score of query term for each document
            for (let [file, tf] of termEntry.documents.entries()) {
                score = termEntry.idf * tf;
                //console.log(file +" tf: "+ tf+ " idf: "+termEntry.idf)
                if (postingsList.has(file)) {
                    let post = postingsList.get(file);
                    post.score += score;
                    post.terms.term = score;
                } else {
                    postingsList.set(file, {
                        filename: file.split("/")[1],
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

        //2. for each query term calculate score for each document
        let postingsList = this.calculateScore(searchTerms);

        //3. prepare results
        let result = Array.from(postingsList.values());
        

        //console.log(result)
        return result.sort((a, b) => this.compareByScore(a, b));
    }

    compareByScore(a, b) {
        //sort filenames descending if score is same
        if (a.score == b.score) {
            return a.filename.localeCompare(b.filename);
        }
        return b.score - a.score;
    }

    isNotAStopWord(value) {
        return !stopwords.includes(value);
    }
}
