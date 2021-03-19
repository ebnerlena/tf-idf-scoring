export default class Entry {
    constructor(term, documents = new Map()) {
        this.term = term;
        this.idf = 0;
        this.documents = documents;
    }

    calculateIDF(filesTotal) {
        this.idf = filesTotal / this.documents.size;
    }

    print() {
        console.log(`term: ${this.term}, idf: ${this.idf}, documents: ${this.documents.size}`);
    }
}
