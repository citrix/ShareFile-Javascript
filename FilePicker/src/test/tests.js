var expect = chai.expect;
var selectors = {
    contentsSection: "#contentsSection",
    selectAllChk: "#chkSelectAll",
    allFilesBtn: "#allFiles",
    photosBtn: "#photosFilter",
    searchTextbox: "#searchTxt",
    clearSearchBtn: "#clearSearch",
    downloadBtn: "#download",
    copyLinkBtn: "#copyLink",
    currentFolderBtn: "#currentFolder",
    breakcrumbNav: "#breadcrumbLinks",
    frameDownloader: "#frameDownloader"
};

var fpicker;
var mochaTimeout = 10000;
var timerLength = 9000;

describe("FilePicker", function () {

    describe("FilePicker", function () {
        it("FilePicker library is successfully loaded.", function () {
            expect(FilePicker).to.not.be.an("undefined");
        });
    });

    describe("FilePicker #start()", function () {
        it("FilePicker has one public method.", function () {
            fpicker = new FilePicker();
            expect(fpicker.start).to.not.be.an("undefined");
        });

        it("Calling start method without mandtory parameter should throw an Error.", function () {
            expect(function () {
                fpicker = new FilePicker();
                FilePicker.start();
            }).to.throw(Error);
        });

        it("Calling start method with a single missing or invalid selector should thrown an Error.", function () {
            expect(function () {
                fpicker = new FilePicker();
                fpicker.start({});
            }).to.throw(Error);
        });
    });


    describe("FilePicker #events()", function () {

        it("Calling initialize method by passing valid parameter will initialize selectors.", function (done) {
            this.timeout(mochaTimeout);
            expect(function () {
                fpicker = new FilePicker();
                fpicker.start(selectors);

                setTimeout(function () {
                    try {
                        done();
                    } catch (err) {
                        done(err);
                    }
                }, timerLength);

            }).to.not.throw(Error);
        });

        it("(MUST PASS) Contents rendered in conentsSection successfully.", function () {
            var contentsLength = $(selectors.contentsSection).html().trim().length;
            expect(contentsLength).to.not.equal(0);
        });

        it("Click on Photos filter button", function () {
            $(selectors.photosBtn).click();
            var isSelected = $(selectors.photosBtn).hasClass("strong");
            expect(isSelected).to.equal(true);
        });

        it("Click on All Files button", function () {
            $(selectors.allFilesBtn).click();
            var isSelected = $(selectors.allFilesBtn).hasClass("strong");
            expect(isSelected).to.equal(true);
        });

        it("Click on Search button", function (done) {
            this.timeout(mochaTimeout);
            $(selectors.searchTextbox).val("share");
            $(selectors.searchTextbox).keyup();
            setTimeout(function () {
                try {
                    var srchClear = $("#clearSearch").css("display");

                    expect(srchClear).to.not.be.equal("none");
                    done();
                } catch (err) {
                    done(err);
                }
            }, timerLength);
        });

        it("Click on Clear Search button", function (done) {
            this.timeout(mochaTimeout);
            $(selectors.clearSearchBtn).click();

            setTimeout(function () {
                try {
                    var srchClear = $("#clearSearch").css("display");

                    expect(srchClear).to.be.equal("none");
                    done();
                } catch (err) {
                    done(err);
                }
            }, timerLength);
        });

        it("Click on download button to download a file", function (done) {
            this.timeout(mochaTimeout);
            var $fileN = $(selectors.contentsSection).find("span.name:last a");
            $fileN.click();

            setTimeout(function () {
                try {
                    var frmSrc = $(selectors.frameDownloader).attr("src");
                    expect(frmSrc).to.not.be.an("undefined");
                    expect(frmSrc).to.not.be.equal("");
                    done();
                } catch (err) {
                    done(err);
                }
            }, timerLength);
        });

        it("Click on last File to download its contents", function (done) {
            this.timeout(mochaTimeout);
            var $chkboxN = $(selectors.contentsSection).find("span.checkBox:last input");
            $chkboxN.click();
            $(selectors.downloadBtn).click();

            setTimeout(function () {
                try {
                    var frmSrc = $(selectors.frameDownloader).attr("src");
                    expect(frmSrc).to.not.be.an("undefined");
                    expect(frmSrc).to.not.be.equal("");
                    done();
                } catch (err) {
                    done(err);
                }
            }, timerLength);

        });

        it("Click on Folder to load & display its contents", function (done) {
            this.timeout(mochaTimeout);
            var $folder1 = $(selectors.contentsSection).find("span.name:first a");
            var fname = $folder1.text();
            $folder1.click();

            setTimeout(function () {
                try {
                    var currText = $(".currentDir a").text();
                    expect(currText).to.be.equal(fname);
                    done();
                } catch (err) {
                    done(err);
                }
            }, timerLength);
        });

    });

});