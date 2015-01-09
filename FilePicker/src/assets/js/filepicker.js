/* !
* FilePicker JavaScript Utility v.1.0
*/

// global variables
var fpGlobals = {
    "ROOT_NAME": "ShareFile",
    "IMAGES": ["jpg", "jpeg", "jpe", "jfif", "tif", "tiff", "gif", "png", "bmp", "dib", "psd"]
};

/*
* FilePicker class
*/
(function (exports) {
    "use strict";

    var
        queries = { // sharefile Rest APIs (currently only 5 APIs are supported)
            "GET_ROOT": "/sf/v3/Items?$expand=Children&$select=Id,Name,CreatorNameShort,Info,Info/IsAHomeFolder,Children/Id,Children/Name,Children/CreationDate,Children/FileSizeBytes,Children/CreatorNameShort,Children/FileCount",
            "GET_FOLDER": "/sf/v3/Items(##MARKER1##)?$expand=Children&$select=Id,Name,CreatorNameShort,Info,Info/IsAHomeFolder,Children/Id,Children/Name,Children/CreationDate,Children/FileSizeBytes,Children/CreatorNameShort,Children/FileCount",
            "DOWNLOAD_FILE": "/sf/v3/Items(##MARKER1##)/Download",
            "FOLDER_TREE": "/sf/v3/Items(##MARKER1##)/Breadcrumbs",//?$expand=value&$select=value/Name,value/Id",
            "SEARCH_FILES": "/sf/v3/Items/Search?query=##MARKER1##",//&$expand=Results&$select=Results/ItemID,Results/FileName,Results/CreationDate,Results/Size,Results/CreatorName,Results/CreatorLastName,Results/ItemType"
			"UPLOAD_FILES": "/sf/v3/Items(##MARKER1##)/Upload?method=Standard"
        },
        markers = { // list of markers to be used for custom parameters
            "MARKER1": "##MARKER1##",
            "MARKER2": "##MARKER2##"
        },
        messages = {
            ERR_SLU: "Selectors object is 'undefined'.",
            ERR_DWN: "Please select an item to download or copy link.",
            ERR_TKN: "Access token is expired.\nPlease re-login to proceed.",
            ERR_PRM: "Please check parameters and try again.",
            ERR_01: "Error occurred.\n",
            ERR_NR: "No results",
            ERR_SLC: "Few of selectors couldn't loaded properly"
        },
        hostName, // Rest API host name fetched from url hashtag
        accessToken, // access token key after successful login
        currentFolder = { // current folder info (id, name etc.)
            "id": 0,
            "name": "",
            "isRoot": true
        },
        copyDownloadLink,
        searchTimer, // search timer object, will be used to clear timer
		uploadIndex = 1,
		cancelCurrentFile = false,
		$contentsSection,
		selectors = {}; // selector variables & all selector objects

    // set jquery selectors
    var initi$electors = function (options) {
		selectors = options;
        $contentsSection = $(selectors.contentsSection || "contentsSection");
		// if contentsection area used to display items is not exist
        if (!$contentsSection.length) {
            throw new Error(messages.ERR_SLC);
        }
		
        if(!selectors.selectAllChk) selectors.selectAllChk = "#chkSelectAll";
        if(!selectors.allFilesBtn) selectors.allFilesBtn = "#allFiles";
        if(!selectors.photosBtn) selectors.photosBtn = "#photosFilter";
        if(!selectors.searchTextbox) selectors.searchTextbox = "#searchTxt";
        if(!selectors.clearSearchBtn) selectors.clearSearchBtn = "#clearSearch";
        if(!selectors.downloadBtn) selectors.downloadBtn = "#download";
		if(!selectors.copyLinkBtn) selectors.copyLinkBtn = "#copyLink";
		if(!selectors.uploadBtn) selectors.uploadBtn = "#upload";
		if(!selectors.fileInput) selectors.fileInput = "#fileInput";
        if(!selectors.currentFolderBtn) selectors.currentFolderBtn = "#currentFolder";
        if(!selectors.breakcrumbNav) selectors.breakcrumbNav = "#breadcrumbLinks";
        if(!selectors.frameDownloader) selectors.frameDownloader = "#frameDownloader";
		if(!selectors.progressBar) selectors.progressBar = "#progressBar";
		
		copyDownloadLink = selectors.copyLinkBtn;
    }

    // binding events
    var bindEvents = function () {
		$("body").on("click", "a", function(e) {
			var $this = $(e.target);
			if($this.hasClass("cancel")){
				var tempFileId = $(this).parents("li:first").attr("uploadid");
				var uploadData = $(document).data().fileData;
				for(var i=0; i<uploadData.length; i++) {
					if(uploadData[i].fileId == tempFileId) {
						
						var isCurrentFile = uploadData[i].uploading;
						uploadData.splice(i, 1);
						if(isCurrentFile) {
							cancelCurrentFile = true;
							uploadRequest(uploadData);
						}
						$(this).parents("li").remove();
						break;
					}
				}
				return false;
			} else if($this.hasClass("icon") || $this.hasClass("filename")){
				// if clicked on folders or files
				var fdata = $(this).parents("li:first").data(); // fetch associated data from item
				execute(fdata); // call execute method to load folder contents or download file
				return false;
			} else if($this.is(selectors.clearSearchBtn)){
				var data = "";
				$(selectors.searchTextbox).val(data);
				search(data);
				$this.hide();
				return false;
			} else if($this.is(selectors.downloadBtn) || $this.is(selectors.copyLinkBtn)){
				var $selectedItem = $contentsSection.find("input[type=checkbox]:checked:first"); // locate the first selected item
				if ($selectedItem.length > 0) {
					var fdata = $selectedItem.parents("li:first").data(); // fetch associated data from item
					// download an item, if folder then change its type to document for zipped download
					execute(
						{ "id": fdata.id, "type": "document" },
						arguments[0].target.id
					);
				} else {
					notifyUser(messages.ERR_DWN);
				}
				return false;
			} else if($this.is(selectors.uploadBtn)){
				$(selectors.fileInput).click();
				return false;
			} else if($this.is(selectors.currentFolderBtn)){
				var data = $(this).data("id"); // fetch associated data from item
				execute(data); // call execute method to load folder contents 
				return false;
			} else if($this.parent().is(selectors.breakcrumbNav)){
				var fdata = $(this).data(); // fetch associated data from item
				execute(fdata); // call execute method to load folder contents 
				return false;
			} else if($this.is(selectors.photosBtn)){
				filter();
				$this.addClass("strong");
				$(selectors.allFilesBtn).removeClass("strong");
				return false;
			} else if($this.is(selectors.allFilesBtn)){
				unfilter();
				$(this).addClass("strong");
				$(selectors.photosBtn).removeClass("strong");
				return false;
			}  else if($this.hasClass("showprog")){
				$(selectors.progressBar).show();
				return false;
			} else if($this.hasClass("hide") && $(selectors.progressBar).find($this).length === 1){
				$(selectors.progressBar).hide();
				return false;
			} else if($this.is("#help,#privacy,#contact,#inbox,#trash,#myfiles,#shared,#favorite")){
				// these features are not available in this release.
				return false;
			}
		}).on("click", "input[type=checkbox]", function(e) {
			// select all click, toggle folder items selection
			if(this.id === "chkSelectAll"){
				var $fitems = $contentsSection.find("input[type=checkbox]");
				if ($(this).filter(":checked").length === 0) {
					$fitems.prop("checked", false);
				} else {
					$fitems.prop("checked", true);
				}
			} else {
				// toggle select checkbox on folder items selection
				// if all items are selected then check Select All checkbox and vice versa
				var $fitems = $contentsSection.find("input[type=checkbox]");
				var checkedCount = $fitems.filter(":checked").length;
				if ($fitems.length === checkedCount) {
					$(selectors.selectAllChk).prop("checked", true);
				} else {
					$(selectors.selectAllChk).prop("checked", false);
				}
			}
		}).on("keyup", selectors.searchTextbox, function(e) {
			// on search field if enter key is pressed
			var data = $(this).val();
			if (searchTimer) {
				clearTimeout(searchTimer);
			}
			searchTimer = setTimeout(search, 300, data);
			if (data) {
				$(selectors.clearSearchBtn).show();
			} else {
				$(selectors.clearSearchBtn).hide();
			}
		}).on("change", selectors.fileInput, function(e) {
			// on selecting files, create new files DOM and start uploading
			var $selectedFiles = this.files;
			if ($selectedFiles.length > 0) {
				createFilesDom($selectedFiles);
			}
			return false;
		});
    }

    // build and return app hostname
    var getHostName = function (params) {
        if (params.subdomain) {
            return "https://" + params.subdomain + "." + params.appcp;
        } else {
            return "";
        }
    }

    // parse & read parameters from url hashtag
    var parseUrlParams = function () {
        // if location hashtag is empty then exit with empty object
        if (location.hash.length === 0) {
            return {};
        }

        // initialize hashParams and paramObj local variables
        // hashparams is array having key/value of url hashtag parameter
        var hashParams = location.hash.substr(1).split("&"),
          paramObj = {};

        // popuplating paramObj object with hashtag parameters
        for (var i = 0; i < hashParams.length; i++) {
            // split the key/value object
            var hashTag = hashParams[i].split("="),
                key = decodeURIComponent(hashTag[0]),
                value = decodeURIComponent(hashTag[1]);

            paramObj[key] = value;
        }

        return paramObj;
    }

    // generate and return file size in B, KB or MB form (depends on size of file)
    var getFileSize = function (sizeB) {
        if (!sizeB) {
            return "0";
        }

        sizeB = parseInt(sizeB, 10);
        if (sizeB < 1024) {
            return "1 KB";
        } else if (sizeB < 1022976) {
            return (sizeB / 1024).toFixed(0) + " KB";
        } else {
            return (sizeB / 1048576).toFixed(0) + " MB";
        }
    }

    // get file extension from filename
    var getFileType = function (filename) {
        var pos = filename.lastIndexOf(".");
        return (pos > -1 && filename.length > 0) ? filename.substring(pos + 1).toLowerCase() : "unknown";
    }

    // format data object
    var formatDate = function (dtStr) {
        try {
            var date = new Date(dtStr);
            var ampm = date.getHours() < 12 ? " am" : " pm";
            return date.getShortMonthName() + " " + date.getDay() + ", " + date.getFullYear() + " " + (date.getHours() % 12) + ":"
                 + date.getMinutes() + ":" + date.getSeconds() + ampm;
        } catch (e) {
            return dtStr;
        }
    }

    // execute method to run the queries
    var execute = function (data, callbackParamVal) {
        // if data is available then load the folder accordingly or download file otherwise display root folder
        if (data) {
            var fid = data.id,
                ftype = data.type;

            if (ftype === "document") {
                var dataParams = { redirect: false };
                if (callbackParamVal) {
                    dataParams.callbackParam = callbackParamVal;
                }
                runQueries(queries.DOWNLOAD_FILE, dataParams, fid);
            } else {
                $(selectors.searchTextbox).val(""); // clear searchbox field
                runQueries(queries.GET_FOLDER, null, fid);
            }
        } else {
            runQueries(queries.GET_ROOT);
        }
    };

    // search files by using search API
    var search = function (data) {
        if (data) {
            runQueries(queries.SEARCH_FILES, null, data);
        } else {
            runQueries(queries.GET_FOLDER, null, currentFolder.id);
        }
    };

    // filter images results in current query
    var filter = function () {
        var allItems = $contentsSection.data().Children;
        if (allItems) {
            populateContents(allItems, true);
        }
    };

    // remove image filter and display all contents of current query
    var unfilter = function () {
        var allItems = $contentsSection.data().Children;
        if (allItems) {
            populateContents(allItems);
        }
    };
	
	var setUploadStatus = function(resetProg) {
		var documentData = $(document).data();
		try {
			var $progressbar = $(selectors.progressBar);
			var isAllUploaded = documentData.fileData.length === 0;
			
			if(!resetProg) {
				var uploadingCount = documentData.uploadedFiles.length + 1;
				var totalFiles = documentData.uploadedFiles.length + documentData.fileData.length;
				var progressTxt = isAllUploaded ? 
					totalFiles > 0 ? "All "+ totalFiles +" files(s) uploaded successfully" : "File uploading cancelled" : 
					"Uploading "+ uploadingCount +" of "+ totalFiles +" files(s)";
							
				$progressbar.find(".text").text(progressTxt);
			}
			
			if(!isAllUploaded) {
				var uploadedSize = 0, totalSize = 0;
				for(var i=0; i<documentData.uploadedFiles.length; i++) {
					uploadedSize += documentData.uploadedFiles[i].size;
					totalSize += documentData.uploadedFiles[i].size
				}
				
				for(var i=0; i<documentData.fileData.length; i++) {
					if(documentData.fileData[i].uploading) {
						uploadedSize += documentData.fileData[i].upsize;
					}
					totalSize += documentData.fileData[i].size;
				}
				var percentDone = parseInt(uploadedSize * 100 / totalSize, 10);
				$progressbar.find(".inner").css("width", percentDone + "%");
				$progressbar.find(".percent").text(percentDone + "%");
			} else {
				$progressbar.find(".outer").addClass("success");
				$progressbar.find(".inner").css("width", "100%");
				$progressbar.find(".percent").text("100%");
			}
			
		} catch(e){
			//console.log("Error occurred while setting progress");
		}
	}
	
	var createFilesDom = function(selectedFiles){
		var documentData = $(document).data() || {};
		var uploadAlreadyStarted = false;
		
		if(!documentData.fileData || documentData.fileData.length === 0) {
			documentData.fileData = [];
			documentData.uploadedFiles = [];
			$(selectors.progressBar).show();
		} else  if(documentData.fileData.length > 0) {
			uploadAlreadyStarted = true;
		}
		
		for(var i=0; i<selectedFiles.length; i++) {
			var fileToUp = selectedFiles[i];
			var iconClass = getFileType(fileToUp.name);
			var toggleClass = uploadIndex%2 ? "" : "active";
			var tempFileId = "upFile" + uploadIndex++;
			var contents = "<li uploadid='"+ tempFileId +"' class='"+ toggleClass +"'>" +
				"<span class='checkBox'></span>" +
				"<a href='javascript:void(0);' class='icon " + iconClass + "'></a>" +
				"<span class='name'><a class='filename' href='javascript:void(0);'>" + fileToUp.name + "</a></span>" +
				"<span class='size'>" + getFileSize(fileToUp.size) + "</span>" +
				"<span class='type'><div class='outer'><div name='"+ tempFileId +"' class='inner'></div><div class='percent'></div></div></span>" +
				"<span class='modified'><a href='javascript:void(0);' class='cancel'>x</a></span></li>";

			var $dupElem = $contentsSection.find("a.filename:contains("+ fileToUp.name +")");
			if($dupElem.length > 0 && $dupElem.text() === fileToUp.name) {
				$dupElem.css("text-decoration", "line-through");
			}
			$contentsSection.children("ul").prepend(contents);
			var fileObj = {
				"fileId": tempFileId,
				"file": fileToUp,
				"name": fileToUp.name, 
				"size": fileToUp.size,
				"upsize": 0,
				"uploading": false,
				"done": false
			};
			
			documentData.fileData.push(fileObj);
		}
		
		if(!uploadAlreadyStarted) {
			uploadRequest(documentData.fileData);
		} else {
			setUploadStatus();
		}
	};
	
	var uploadRequest = function(fileData){
		var documentData = $(document).data();
		setUploadStatus();
		if(fileData && fileData.length > 0) {
			
			var fileObj = fileData[0];
			fileObj.uploading = true;
			runQueries(queries.UPLOAD_FILES + "&fileName=" + fileObj.name, null, currentFolder.id);
		} else {
			setTimeout(function(){
					$(selectors.progressBar).hide();
					$(selectors.progressBar).find(".outer").removeClass("success");
				},
				3000
			);
		}
	}
	
	var startUploading = function(data){
		var url = data.ChunkUri + "&byteOffset=0&index=0&finish=true&unzip=false&fmt=json&overwrite=false";
		var uploadData = $(document).data().fileData;
		var uploadedFiles = $(document).data().uploadedFiles;
		if(uploadData.length < 1) {
			return;
		}
		var uploadFileData = uploadData[0];
		var fileData = new FormData();
		fileData.append("File1", uploadFileData.file);
		
		var options = {
			type: "POST",
			url: url,
			data: fileData,
			cache: false,
			contentType: false,
			processData: false,
			success: function(e){
				if(!e.error) {
					var fid = e.value[0].id;
					var $innerDiv = $contentsSection.find(".inner[name='"+uploadFileData.fileId+"']");
					var $lstItem = $innerDiv.parents("li:first");
					
					setTimeout( function() {
							$lstItem.children(".checkBox").html("<input type='checkbox' />");
							$lstItem.children(".type").text(formatDate(new Date()));
						},
						3000
					);
					
					$innerDiv.parent().addClass("success");
					$innerDiv.next().text("Upload Complete");
					$lstItem.children(".modified").text("");
					
					$lstItem.data({
						"id": fid,
						"type": "document"
					});
					
					uploadedFiles.push(uploadData.shift());
					uploadRequest(uploadData);
				} else {
					console.log("failed:: " + e);
				}
			},
			error: function(a){
				console.log("failed:: " + a);
			},
			xhr: function () {
				var myXhr = $.ajaxSettings.xhr();
				
				if (myXhr.upload) {
					myXhr.upload.addEventListener(
						'progress', 
						function (e) {
							if (e.lengthComputable) {
								var percent = parseInt((e.loaded / e.total) * 100);
								var $progInner = $contentsSection.find(".inner[name='"+uploadFileData.fileId+"']");
								$progInner.css("width", percent + "%");
								$progInner.next().text(percent + "%");
								
								uploadFileData.upsize = e.loaded;
								setUploadStatus(true);
							}							
							if(cancelCurrentFile) {
								cancelCurrentFile = false;
								myXhr.abort();
								myXhr = null;
							}
						}, 
						false
					);
				}
				return myXhr;
			}
		};
		$.ajax(options);
	}

    // populate folder contents from Rest API json response
    var populateContents = function (allItems, loadImages) {
        var
            counter = 0,
            index = 0,
            contents = "<ul>";
        if (allItems.length === 0) {
            // if folder is empty then notify user
            contents += ("<li style='text-align: center;'>" +
                            "<div class='warningtip'>" +
                                "Folder is empty." +
                            "</div>" +
                        "</li>");
        } else {
            for (; index < allItems.length; index++) {
                var
                    sfItem = allItems[index],
                    name = sfItem.Name || sfItem.DisplayName || sfItem.FileName, // different fields for get folder and search API
                    isFolder = sfItem.FileCount || sfItem.FileCount === 0 || sfItem.ItemType === "folder",
                    iconClass = isFolder ? "folder" : getFileType(name);

                if (!loadImages || fpGlobals.IMAGES.indexOf(iconClass) > -1) {
                    var
                        date = formatDate(sfItem.CreationDate),
                        size = getFileSize(sfItem.FileSizeBytes || sfItem.Size), // different fields for get folder and search API
                        user = sfItem.CreatorNameShort || sfItem.CreatorName + " " + sfItem.CreatorLastName; // different fields for get folder and search API
                        //toggleClass = (counter % 2) ? "" : "active";

                    contents += "<li>" +
                        "<span class='checkBox'><input type='checkbox' /></span>" +
                        "<a href='javascript:void(0);' class='icon " + iconClass + "'></a>" +
                        "<span class='name'><a class='filename' href='javascript:void(0);'>" + name + "</a></span>" +
                        "<span class='size'>" + size + "</span>" +
                        "<span class='type'>" + date + "</span>" +
                        "<span class='modified'>" + user + "</span></li>";
                    counter++;
                }
            }
        }
        contents += "</ul>";
        $contentsSection.html(contents);

        if (allItems.length > 0) {
            index = 0;
            // set data of each item
            $contentsSection.find("li").each(function () {
                var sfItem = allItems[index], ctype;
                ctype = typeof sfItem.FileCount != "undefined" || sfItem.ItemType === "folder" ? "folder" : "document";

                $(this).data({
                    "id": sfItem.Id || sfItem.ItemID,
                    "type": ctype
                });

                index++;
            }).filter(":even").addClass("active");
        }
    }

    // display contents after reading data from Rest api response
    var onQuerySuccess = function (data) {
        // if clicked item is file then download it
        if (data.DownloadToken) {
            if (copyDownloadLink.indexOf(arguments[1]) > -1) {
                promptUser(data.DownloadUrl);
            } else {
                $(selectors.frameDownloader).attr("src", data.DownloadUrl);
            }
            return;
        } else if (data.ChunkUri) {
			startUploading(data);
			return;
		}

        // initialize local variables
        var allItems = data.Children || data.Results || data.value;

        // if no children object then return
        if (!allItems) {
            return;
        }

        if (data.value) {
            // reset breadcrumbs/folder tree
            updateFolderNav(allItems);
        } else {
            // populating records
            populateContents(allItems);

            // preserve data
            $contentsSection.data(data);

            if (data.Results) {
                // show results summary in label
                updateResultsLabel(allItems.length);
            } else {
                var folderName = data.Info.IsAHomeFolder ? fpGlobals.ROOT_NAME : data.Name;

                currentFolder.id = data.Id;
                currentFolder.name = folderName;
                currentFolder.isRoot = data.Info.IsAHomeFolder;

                $(selectors.currentFolderBtn).text(folderName).data("id", data.Id);

                // call to fetch breadcrumbs (folder navigation hierarchy links)
                runQueries(queries.FOLDER_TREE, null, data.Id);
                $(selectors.currentFolderBtn).removeClass("searchLabel").addClass("current");
            }
        }
    }

    // update results label
    var updateResultsLabel = function (count) {
        var totalRecords = (count === 0 ? messages.ERR_NR : (count === 1 ? "1 record" : count) + " records");
        $(selectors.currentFolderBtn).removeClass("current").addClass("searchLabel").text("Search Results:: " + totalRecords + " found");
    }

    // updating folder navigation links (breadcrumbs links)
    var updateFolderNav = function (allItems) {
        var $navHtml = document.createDocumentFragment();
        if (!currentFolder.isRoot) {
            for (var i = 1; i < allItems.length; i++) {
                var fName = (i == 1) ? fpGlobals.ROOT_NAME : allItems[i].Name;
                $("<a/>", {
                    href: "javascript:void(0);",
                    class: "active",
                    text: fName
                }).data("id", allItems[i].Id).appendTo($navHtml);
            }
		}
		$("<a/>", {
			href: "javascript:void(0);",
			class: "active",
			text: currentFolder.name
		}).data("id", currentFolder.id).appendTo($navHtml);

        $(selectors.breakcrumbNav).empty().append($navHtml);

        // reset classes, the current opened folder will be inactive (can't be clicked)
        $(selectors.breakcrumbNav).find("a:last").attr("class", "inactive");
    }

    // show error message if Rest API call is failed
    var onQueryFail = function (errObj) {
        var errMsgStr = "";
        if (errObj.status === 401) {
            errMsgStr = messages.ERR_TKN;
        } else {
            if (errObj.responseJSON && errObj.responseJSON.message && errObj.responseJSON.message.value) {
                errMsgStr = errObj.responseJSON.message.value;
            } else {
                errMsgStr = messages.ERR_PRM;
            }
        }
        notifyUser(messages.ERR_01 + errMsgStr);
    }

    // prompt user with error, warning or info
    var notifyUser = function (errMsg) {
        alert(errMsg);
    }

    // prompt user with message to copy
    var promptUser = function (text) {
        window.prompt("Copy to clipboard: Ctrl+C, Enter", text);
    }
    
    // calling ShareFile Rest API
    // pass query string, data (optional) and custom parameters (optional)
    // param1 & param2 are custom parameters which will be replaced with markers (MARKER1 & MARKER2)
    var runQueries = function (query, data, param1, param2) {
        if (!hostName || !query) {
            return;
        }
        // repelace markers with custom parameters 
        if (param1) {
            query = query.replace(markers.MARKER1, param1);
        }
        if (param2) {
            query = query.replace(markers.MARKER2, param2);
        }

        // if query is still holding any marker string then return
        if (query.search(/##MARKER\w##/i) > -1) {
            return;
        }

        // initalize data with empty object if null
        if (!data) {
            data = {};
        }

        // building full url
        var url = hostName + query;

        // ajax call to ShareFile Rest APIs
        $.ajax({
            type: "GET",
            beforeSend: function (xhr) {
                xhr.setRequestHeader("Authorization", "Bearer " + accessToken);
                xhr.setRequestHeader("Content-Type", "application/x-www-form-urlencoded");
            },
            url: url,
            data: data,
            success: function (result) {
                onQuerySuccess(result, data.callbackParam);
            },
            error: onQueryFail
        });
    }

    // initialize FilePicker 
    function FilePicker() {
        var urlParams = parseUrlParams(); // url parameters object fetched from url hashtag
        hostName = getHostName(urlParams);
        accessToken = urlParams.access_token;
        jQuery.support.cors = true;
    }

    // initialize the filerpicker, bind events and load root folder
    FilePicker.prototype.start = function (options) {
        if (!options) {
            throw new Error(messages.ERR_SLU);
        }
        initi$electors(options);
        bindEvents();
        execute();
    }

    exports.FilePicker = FilePicker;
})(this);

/*
* list of month names to support new Date method for getting month name
* two new methods will be associated i.e. getMonthName & getShortMonthName (for 3 letter moth name)
*/
Date.prototype.monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
Date.prototype.getMonthName = function () {
    return this.monthNames[this.getMonth()];
};
Date.prototype.getShortMonthName = function () {
    return this.getMonthName().substr(0, 3);
};