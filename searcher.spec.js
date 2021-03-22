import glob from "glob";
import Searcher from "./searcher";

describe("Searcher", () => {
    let searcher;

    beforeAll(() => {
        searcher = new Searcher(glob.sync("corpus/*.txt"), true);
    });

    function expectSearchResultsFor(query) {
        return expect(searcher.search(query));
    }

    function expectTop5SearchResultsFor(query) {
        return expect(searcher.search(query).slice(0, 5));
    }

    it("finds one word", () => {
        expectSearchResultsFor("salzburg").toHaveLength(28);
        expectTop5SearchResultsFor("salzburg").toEqual([
            {
                filename: "Archbishopric_of_Salzburg.txt",
                score: 41414.78571428571,
                terms: { salzburg: 41414.78571428571 }
            },
            {
                filename: "Herbert_von_Karajan.txt",
                score: 10803.857142857143,
                terms: { salzburg: 10803.857142857143 }
            },
            {
                filename: "Wolfgang_Amadeus_Mozart.txt",
                score: 10803.857142857143,
                terms: { salzburg: 10803.857142857143 }
            },
            {
                filename: "Alfons_Schuhbeck.txt",
                score: 3601.285714285714,
                terms: { salzburg: 3601.285714285714 }
            },
            {
                filename: "Carl_Maria_von_Weber.txt",
                score: 3601.285714285714,
                terms: { salzburg: 3601.285714285714 }
            }
        ]);
    });

    it("finds two words", () => {
        expectSearchResultsFor("austria germany").toHaveLength(1711);
        expectTop5SearchResultsFor("austria germany").toEqual([
            {
                filename: "Anschluss.txt",
                score: 3890.2073049227843,
                terms: {
                    austria: 3728.0915492957747,
                    germany: 162.11575562700966
                }
            },
            {
                filename: "Austria.txt",
                score: 3792.9378515465787,
                terms: {
                    austria: 3728.0915492957747,
                    germany: 64.84630225080386
                }
            },
            {
                filename: "Germany.txt",
                score: 2687.924894705856,
                terms: {
                    austria: 710.112676056338,
                    germany: 1977.8122186495177
                }
            },
            {
                filename: "Treaty_of_Versailles.txt",
                score: 2650.7067705266973,
                terms: {
                    austria: 1775.281690140845,
                    germany: 875.4250803858521
                }
            },
            {
                filename: "Prussia.txt",
                score: 1858.7370544812281,
                terms: {
                    austria: 1242.6971830985915,
                    germany: 616.0398713826366
                }
            }
        ]);
    });

    it("sorts results with same score alphabetically descending", () => {
        expectTop5SearchResultsFor("blueprint").toEqual([
            {
                filename: "RNA.txt",
                score: 25209,
                terms: {
                    blueprint: 25209
                }
            },
            {
                filename: "_03_Bonnie_Clyde.txt",
                score: 25209,
                terms: {
                    blueprint: 25209
                }
            }
        ]);
    });

    it("ignores order of search terms", () => {
        const expectedFilenames1 = searcher.search("austria germany").map(result => result.filename);
        const expectedFilenames2 = searcher.search("germany austria").map(result => result.filename);
        expect(expectedFilenames1).toEqual(expectedFilenames2);
    });

    test("returns empty result when single word is not found", () => {
        expectSearchResultsFor("blubbergurken").toEqual([]);
    });

    test("ignores unknown words", () => {
        const expectedResults = searcher.search("salzburg");
        expectSearchResultsFor("salzburg blubbergurken").toEqual(expectedResults);
        expectSearchResultsFor("blubbergurken salzburg").toEqual(expectedResults);
    });

    test("returns all documents for empty search", () => {
        expectSearchResultsFor("").toHaveLength(50418);
    });
});
