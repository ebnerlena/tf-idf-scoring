import fs from "fs";
import stopwords from './stopwords.json';
import Entry from './entry';

export default class Searcher {
    constructor(files) {

        // TODO: Build the Inverted Index.
        // Note that using a regular Object for the index might cause problems with terms such as "constructor".

        // some notes of intersection and difference on mdn
        //e.g. var intersection = new Set([...set1].filter(x => set2.has(x)));
        //https://developer.mozilla.org/de/docs/Web/JavaScript/Reference/Global_Objects/Set

        //using a map instead of object cause mdn says it is performanter
        //https://developer.mozilla.org/de/docs/Web/JavaScript/Reference/Global_Objects/Map
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
        for(let entry of this.dictionary.values()) {
            entry.calculateIDF(this.documents.size);

            if (entry.term == "salzburg") {
                entry.print();
            }
            
        }
    }

    setupDictionary(terms, file) {

        //calculate frequency of each term in file (distinct)
        const termsFreqs = this.calculateTermsFrequencies(terms);

        for(let [term, values] of termsFreqs.entries()) {

            if (!this.dictionary.has(term)) {
                this.dictionary.set(term, 
                    new Entry( term, 

                        //postingsList = Map with files as key and frequencies of term as value
                        new Map().set(file, values.length)
                    )
                );
            } else {
                this.dictionary.get(term).documents.set(file, values.length) 
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
            if(termsFreqs.has(term)){
                //add position index in array - maybe can do something with it later
                termsFreqs.get(term).push[index];
            } else {
                termsFreqs.set(term, [index]);
            }
        })
        return termsFreqs;
    }

    preProcessData(data){
        //tolowercase, remove punctuations, remove stopwords
        return data
            .split(" ")
            .map(term => term.toLowerCase())
            .map(term => term.replace(/[^A-Za-z0-9-]/g, ""))
            .filter(this.isNotAStopWord);
    }

    // used at query time
    calculateScore(searchTerms) {

        let postingsList = new Map();

        searchTerms.forEach((term) => {
            let score = 0;
            const entry = this.dictionary.get(term)

            //calculate score of query term for each document
            for (let [file, tf] of entry.documents.entries()) {
                score = entry.idf * tf;
                if (postingsList.has(file)) {
                    let entry = postingsList.get(file);
                    entry.score += score;
                    entry.terms[term] = score
                } else {
                    postingsList.set(file, {
                        filename: file.split("/")[1],
                        score: score,
                        terms: { [term] : score }
                    });
                }
            }
        })
        return postingsList;
    }

    search(query) {

        //query time
        //1. preprocess query terms
        let searchTerms = this.preProcessData(query);
        
        //2. for each query term calculate score for each document
        let postingsList = this.calculateScore(searchTerms);

        //3. prepare results
        let result = Array.from(postingsList.values())
        result.sort((a,b) => this.compareByScore(a,b));

        //console.log(result)
        // todo: sort positingsList by total score and name descending -> return array of ordered list
        return result;
    }

    compareByScore(a, b) {

        //sort filenames descending if score is same
        if(a.score === b.score) {
            return b.filename.localeCompare(a.filename)
        }
        return a.score - b.score
    }

    isNotAStopWord(value) {
        return !stopwords.includes(value);
    }
}
