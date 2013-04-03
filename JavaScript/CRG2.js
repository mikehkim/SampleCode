/// <reference path="jquery/jquery-1.2.6-intellisense.js" />

function popUp(URL) {
day = new Date();
id = day.getTime();
eval("page" + id + " = window.open(URL, '" + id + "', 'toolbar=0,scrollbars=yes,location=0,statusbar=0,menubar=0,resizable=0,width=750,height=650,left = 300,top = 250');");
}



function OpenPopup(clientId) {
	document.getElementById(clientId).style.visibility = "visible";
	var elem = $("#" + clientId);
	var top = (getClientDimensions().height / 2) - (elem.height());
	var left = (getClientDimensions().width / 2) - (elem.width());
	elem.css("top", top + "px").css("left", left + "px").show();
}

function ClosePopup(clientId) {
	document.getElementById(clientId).style.visibility = "hidden";
	$("#" + clientId).hide();
}


function isNumberKey(evt) {
	var charCode = (evt.which) ? evt.which : event.keyCode
	if (charCode == 46) return true; // For DOT
	if (charCode > 31 && (charCode < 48 || charCode > 57))
		return false;

	return true;
}

//------------------
// Email
function loadEmailPopup(popupDiv, url, title, entryId) {
    var url = "/Profile/Email.aspx?url=" + url + "&title=" + title + "&entryId=" + entryId + "&time=" + (new Date()).getTime();
	$("#" + popupDiv).load(url, emailPopupLoad);
	$("#" + popupDiv).hide();
}

function emailPopupLoad(r, s, x) {
	$("#__EVENTTARGET,#__EVENTARGUMENT,#__VIEWSTATE", $(this)).remove();	
}

function emailClick(popupDiv) {
	$("#" + popupDiv).dialog(
		{
			open: function(e, ui) { $(this).show(); },
			close: function(e, ui) { $(this).dialog("destroy"); },
			resizable: true,
			height: 550,
			width: 620,
			modal: true,
			overlay: { opacity: 0.5, background: "gray" }
		}
	).dialog("open");
}

function sendEmail() {
	var fromAddr = $("#txtFrom").val();
	var title = $("#hidHeader").val();
	var link = $("#hidFooter").val();
	var description = $("#HiddenField1").val();
	var subject = "WyomingTourism.org: " + title;
	var emailBody = ("<body>" + $("#emailTemplate").html() + "</body>").replace("ATTREMAIL", fromAddr).replace("ATTREMAIL", fromAddr).replace("visibility:hidden", "visibility:visible");
	emailBody = emailBody.replace("MAILLINK", link).replace("MAILTITLE", title).replace("MAILLINK", link);
	emailBody = emailBody.replace("MESSAGE", $("#txtMessage").val());
	emailBody = emailBody.replace("DESCRIPTION", description);
	$.ajax({
		type: "POST",
		url: "/WebServices/ProfileFront.asmx/SendEmail",
		data: "{'from':'" + $("#txtFrom").val() + "','to':'" + $("#txtTo").val() + "','cc':'" + $("#txtBcc").val() + "','subject':'" + subject + "','message':'" + emailBody + "'}",
		contentType: "application/json; charset=utf-8",
		dataType: "json",
		success: function(message) {
			//Hide the contact form and show the message letting the user know the email has been sent
			$("#email").hide();
			$("#sent").text("Your email has been sent.");
			$("#sent").show();
		},
		error: function(errormessage) {
			//you would not show the real error to the user - this is just to see if everything is working
			var jsonobj = eval("(" + errormessage.responseText + ")");
			$("#sent").text(jsonobj["Message"]);
			$("#sent").css("color", "Red");
			$("#sent").show();
			//$("#sent").text(errormessage.responseText);
		}
	});
}

//------------------
// Filtering 
// FeatureFilterControl.ascx
//$(document).ready(function() {
//	$("ul.hide").hide();
//	$("div.CategoryTitle").click(function(e) { toggleCategory(this, e); });
//});

function initFeatureFilterControl() {
	$("ul.hide").hide();
	$("div.CategoryTitle").click(function(e) { toggleCategory(this, e); });
}

function toggleCategory(element, e) {
	var category = "";
	if (jQuery.browser.msie)
		category = element.innerText.replace(/ /, "").replace(/\//, "");
	if (jQuery.browser.mozilla)
		category = element.textContent.replace(/ /, "").replace(/\//, "");

	$("ul." + category).toggle();

	if (element.innerHTML.search(/expand/) > -1) {
		element.innerHTML = element.innerHTML.replace(/expand/, "collapse");
	}
	else {
		element.innerHTML = element.innerHTML.replace(/collapse/, "expand");
	}
}

function initFilterPanel() {
	$("div.hide").hide();
	
	//Update expand icon
	$("div.hide.filter-items").prev("div.filter-category").children("img").attr("src", "/images/icons/expand.gif");
	
	//Update collapse icon
	$("div:has(ul li sup).filter-items").prev("div.filter-category").children("img").attr("src", "/images/icons/collapse.gif");

	//Auto expand the selected categories
	$("div:has(ul li sup).filter-items").css("display", "block");
	
	//Prepare click event
	$("div.filter-category").click(function(e) { toggleFilterCategory(this, e); });
}
function toggleFilterCategory(element, e) {
	$(element).next("div.filter-items").toggle();
	var imgsrc = $("img", element).attr("src");
	if (imgsrc.search(/expand/) > -1) {
		imgsrc = imgsrc.replace(/expand/, "collapse");
	}
	else {
		imgsrc = imgsrc.replace(/collapse/, "expand");
	}
	$("img", element).attr("src", imgsrc);
}

function featureCheckboxRedirect(checkbox, url, featureid) {
	if (checkbox.checked) {
		window.location = url;
	} else {    //"?features=(209,209)"

		url = url.replace("," + featureid, ""); //1st time removal
		url = url.replace(featureid + ",", "");
		url = url.replace("," + featureid, ""); //2nd time removal
		url = url.replace(featureid + ",", "");

		var pattern = "[&]?features=\\(" + featureid + "\\)";
		var reg = new RegExp(pattern);

		url = url.replace(reg, "");

		window.location = url;
	}
}

function filterFeatureCheckboxRedirect(basedurl) {

	//Build the feature filter from checkboxes, e.g. features=(14,15,16)(17,18)
	var featureurl = "features=";

	var checkboxGroups = $("ul[name='filterFeatureCheckboxGroup']");
	for (var cg = 0; cg < checkboxGroups.length; cg++) {
		var checkboxes = $(checkboxGroups[cg]).find("input");

		var featureOr = "";
		for (var cb = 0; cb < checkboxes.length; cb++) {
			if (checkboxes[cb].checked) {
				featureOr += checkboxes[cb].value + ",";
			}
        }
		if (featureOr != "") {
			featureurl += "(" + featureOr.substring(0, featureOr.length - 1) + ")";
		}
    }

    var dropdowns = $("select[name='advancedFilterDropdown']");
    for (var dd = 0; dd < dropdowns.length; dd++) {
        var selectedLists = $(dropdowns[dd]).find("option");

        var featureOr = "";
        for (var i = 0; i < selectedLists.length; i++) {
            if (selectedLists[i].selected && selectedLists[i].value != "All") {
                featureOr += selectedLists[i].value + ",";
            }
        }
        if (featureOr != "") {
            featureurl += "(" + featureOr.substring(0, featureOr.length - 1) + ")";
        }
    }
    
	//    //Hack for Kind Filter
	//    var kindcheckbox = $("ul[name='filterKindCheckboxGroup'] li input:checked:first").val();

    if (featureurl != "features=") { // || kindcheckbox != null) {
        var url = basedurl;
        if (featureurl != "features=") {
            //Redirect to the new URL
            var pattern = "features=[^&]*";
            var reg = new RegExp(pattern);

            if (reg.test(url)) {     //if url has feature parameter, replace all of the old one
                url = url.replace(reg, featureurl);
            }
            else {                  //if url hasn't filter parameter, add a new one
                if (url.search("\\?") == -1) {
                    url += "?" + featureurl;
                } else {
                    url += "&" + featureurl;
                }
            }
        }

        //        //Hack for Kind Filter
        //        if (kindcheckbox != null) {
        //            if (kindcheckbox != "1001") {
        //                pattern = "filter=[^&]*";
        //                var reg = new RegExp(pattern);

        //                if (reg.test(url)) {     //if url has feature parameter, replace all of the old one
        //                    url = url.replace(reg, "filter=kindid=" + kindcheckbox);
        //                }
        //                else {                  //if url hasn't filter parameter, add a new one
        //                    if (url.search("\\?") == -1) {
        //                        url += "?" + "filter=kindid=" + kindcheckbox;
        //                    } else {
        //                        url += "&" + "filter=kindid=" + kindcheckbox;
        //                    }
        //                }
        //            } else {
        //                pattern = "hasrelated=[^&]*";
        //                var reg = new RegExp(pattern);

        //                if (reg.test(url)) {     //if url has feature parameter, replace all of the old one
        //                    url = url.replace(reg, "hasrelated=otherKindId=" + kindcheckbox);
        //                }
        //                else {                  //if url hasn't filter parameter, add a new one
        //                    if (url.search("\\?") == -1) {
        //                        url += "?" + "hasrelated=otherKindId=" + kindcheckbox;
        //                    } else {
        //                        url += "&" + "hasrelated=otherKindId=" + kindcheckbox;
        //                    }
        //                }
        //            }
        //        }

        window.location = url;
    } else {
        window.location = basedurl;
    }
}

//SearchControl.ascx
function onSearchKeyEntry(e, textbox) {
	var characterCode

	if (e && e.which) {
		e = e
		characterCode = e.which
	}
	else {
		e = event
		characterCode = e.keyCode
	}

	if (characterCode == 13) {  //Enter Key
		onSearchButtonClick(textbox.id);
		return false;
	}
	return true;
}

function onSearchButtonClick(textboxid, dropdown) {
	var text = escape(document.getElementById(textboxid).value.trim());
	if (text == "Search..." || text == "")
		return false;

	//overwrite the url
	if (typeof (dropdown) != "undefined") {
		var kindid = $("#" + dropdown).val();
		if (kindid == "Users") {
			searchBoxRedirectUrl = "/goms/users";
		}
	}
		
	var url = "";
	if (searchBoxRedirectUrl && searchBoxRedirectUrl != "") {
		url = searchBoxRedirectUrl;
	} else {
		url = window.location.toString();
	}

	var newurl = "";
	if (url.search(/search=[^&]*/) != -1) {
		newurl = url.replace(/search=[^&]*/, "search=" + text);
	} else {
		if (url.search("\\?") == -1) {
			newurl = url + "?search=" + text;
		} else {
			newurl = url + "&search=" + text;
		}
	}

	if (typeof (dropdown) != "undefined") {
		var kindid = $("#" + dropdown).val();
		if (kindid == "Users") {
			
		}
		else if (kindid != "0") {
			if (newurl.search(/filter=[^&]*/) != -1) {
				newurl = newurl.replace(/filter=[^&]*/, "filter=kindid=" + kindid);
			} else {
				if (newurl.search("\\?") == -1) {
					newurl = newurl + "?filter=kindid=" + kindid;
				} else {
					newurl = newurl + "&filter=kindid=" + kindid;
				}
			}
		}
	}
	window.location = newurl;
	return false;
}

function menuFilterRedirect(select) {
    var url = select.options[select.selectedIndex].value;
    if (url == "") return;
    window.location = url.replace(/['']/g,"");
}

//NumericFilterControl.ascx
function HandleValueChanged(sender, eventArgs) {
	//get the name of Label
	var name = sender.get_id().replace("RadSlider", "Slider_Label");

	var label = document.getElementById(name);
	label.innerHTML = sender.get_selectionStart() + ".." + sender.get_selectionEnd();
}

function numericRedirect(sender, eventArgs) {
	var label = sender.get_id().replace("RadSlider", "Slider_Label");
	var columnName = sender.get_id().replace("RadSlider", "Name_Txt");

	var newUrl = numericConstructNewUrl(window.location.toString(), document.getElementById(columnName), document.getElementById(label));
	window.location = newUrl;
}

function numericConstructNewUrl(oldUrl, columnName, label) {
	var pattern = columnName.value + "(%20|\\+)\\d*..\\d*";
	var reg = new RegExp(pattern);
	var newstr = "";
	if (reg.test(oldUrl)) {     //if url has the columnName
		newstr = columnName.value + "%20" + label.innerHTML;
		return oldUrl.replace(reg, newstr);
	}
	else {
		var filterPattern = "filter=[^&]*";
		reg = new RegExp(filterPattern);

		if (reg.test(oldUrl)) {     //if url has filter parameter, but hasn't the columnName
			var oldFilter = oldUrl.match(reg);
			newstr = " and " + columnName.value + "%20" + label.innerHTML;
			return oldUrl.replace(oldFilter, oldFilter + newstr);
		}
		else {      //if url hasn't filter parameter
			newstr = columnName.value + "%20" + label.innerHTML;
			if (oldUrl.search("\\?") == -1) {
				return oldUrl + "?filter=" + newstr;
			} else {
				return oldUrl + "&filter=" + newstr;
			}
		}
	}
}

//GeoFilterControl.ascx
function geoRedirect(radiusTxt, addressTxt) {
	var radiusControl = document.getElementById(radiusTxt);
	var addressControl = document.getElementById(addressTxt);
	if (radiusControl.value != "" && addressControl.value != "") {

		var newUrl = geoConstructNewUrl(window.location.toString(), addressControl.value, radiusControl.value);

		window.location = newUrl;
	} else if (reimers.map.GMap) {
		ShowAddress(addressControl.value, true);
		//if (window.DrawCircle) DrawCircle(center, radiusControl.value, 40, true);
	}
}

function geoConstructNewUrl(oldUrl, location, radius) {

	var filterPattern = "geo=[^&]*";
	var reg = new RegExp(filterPattern);
	var newstr = "";

	if (reg.test(oldUrl)) {     //if url has filter parameter, but hasn't the columnName
		var oldFilter = oldUrl.match(reg);
		newstr = "geo=%40'" + location.replace(" ", "+") + "'+" + radius + "mi";
		return oldUrl.replace(oldFilter, newstr);
	}
	else {                      //if url hasn't filter parameter
		newstr = "geo=%40'" + location.replace(" ", "+") + "'+" + radius + "mi";
		if (oldUrl.search("\\?") == -1) {
			return oldUrl + "?" + newstr;
		} else {
			return oldUrl + "&" + newstr;
		}
	}
}

var centerMarker = null;

function ShowAddress(address, isSetCenter) {
	var geocoder = new GClientGeocoder();
	if (geocoder && reimers.map.GMap) {
		geocoder.getLatLng(
          address,
          function(point) {
          	if (!point) {
          		alert("address is not found");
          	} else {
          		if (isSetCenter) {
          			reimers.map.GMap.setCenter(point, 13);
          		}
          		if (centerMarker) {
          			reimers.map.GMap.removeOverlay(centerMarker);
          		}
          		centerMarker = new GMarker(point);
          		reimers.map.GMap.addOverlay(centerMarker);
          	}
          }
        );
	}
}

//------------------
// FilterMode
//$(document).ready(function() {
//	initFilters();
//});


function toggleFilterMenu(menuType) {
	if (menuType == 'AdvancedFilter') {
		$(".Filter li:lt(2)").hide();
		$(".Filter li:gt(1)").show();
	} else {
		$(".Filter li:lt(2)").show();
		$(".Filter li:gt(1)").hide();
	}
	toggleFilter(menuType);
}

function initFilters() {
	var url = window.location.toString();
	if (url.search("filtertype=advanced") != -1) {
		toggleFilter("AdvancedFilter");
	}
}

function toggleFilter(id) {
	$("#SimpleFilterLink").removeClass("highlight");
	$("#MenuFilterLink").removeClass("highlight");
	$("#AdvancedFilterLink").removeClass("highlight");
	($("#" + id + "Link")).addClass("highlight");

	$("#SimpleFilter").hide();
	$("#MenuFilter").hide();
	$("#AdvancedFilter").hide();
	$("#" + id).show();

	setCookie("filtertype", id, null, "/");
}

function getCookie(c_name) {
	if (document.cookie.length > 0) {
		c_start = document.cookie.indexOf(c_name + "=");
		if (c_start != -1) {
			c_start = c_start + c_name.length + 1;
			c_end = document.cookie.indexOf(";", c_start);
			if (c_end == -1) c_end = document.cookie.length;
			return unescape(document.cookie.substring(c_start, c_end));
		}
	}
	return "";
}

function setCookie(c_name, value, expiredays, path) {
	var exdate = new Date();
	exdate.setDate(exdate.getDate() + expiredays);
	document.cookie = c_name + "="
        + escape(value)
        + ((expiredays == null) ? "" : ";expires=" + exdate.toGMTString())
        + ((path == null) ? "" : ";path=" + path);
}

function delCookie(name) {
	document.cookie = name +
'=; expires=Thu, 01-Jan-70 00:00:01 GMT;';
}

//------------------
// FileUploadHandler
var TableColumns = 6;
var CurrentTable, CurrentRow;
var CurrentEntryIdCSV = "";
var UploadCount = 0;

function fileQueueError(file, errorCode, message) {
	try {
		var imageName = "error.gif";
		var errorName = "";
		if (errorCode === SWFUpload.errorCode_QUEUE_LIMIT_EXCEEDED) {
			errorName = "You have attempted to queue too many files.";
		}

		if (errorName !== "") {
			alert(errorName);
			return;
		}

		switch (errorCode) {
			case SWFUpload.QUEUE_ERROR.ZERO_BYTE_FILE:
				imageName = "zerobyte.gif";
				break;
			case SWFUpload.QUEUE_ERROR.FILE_EXCEEDS_SIZE_LIMIT:
				imageName = "toobig.gif";
				break;
			case SWFUpload.QUEUE_ERROR.ZERO_BYTE_FILE:
			case SWFUpload.QUEUE_ERROR.INVALID_FILETYPE:
			default:
				alert(message);
				break;
		}

		addImageAndTitle("/Images/FileUpload/" + imageName);

	} catch (ex) {
		this.debug(ex);
	}

}

function fileDialogComplete(numFilesSelected, numFilesQueued) {
	try {
		if (numFilesQueued > 0) {
			this.startUpload();
		}
	} catch (ex) {
		this.debug(ex);
	}
}

function uploadProgress(file, bytesLoaded) {
	try {
		var percent = Math.ceil((bytesLoaded / file.size) * 100);

		var progress = new FileProgress(file, this.customSettings.upload_target);
		progress.setProgress(percent);
		if (percent === 100) {
			progress.setStatus("Creating thumbnail...");
			progress.toggleCancel(false, this);
		} else {
			progress.setStatus("Uploading...");
			progress.toggleCancel(true, this);
		}
	} catch (ex) {
		this.debug(ex);
	}
}

function uploadSuccess(file, serverData) {
	try {
		//alert(serverData);
		var temp = new Array();
		temp = serverData.split(',');
		var entryId = temp[0];
		var entryTitle = temp[1];
		CurrentEntryIdCSV += entryId + ",";
		UploadCount++;
		//addImageAndTitle("/Test/FileUploadThumbnail.aspx?id=" + serverData, file.name, file.index);
		//var img = addImageAndTitle("/stream/?entryId=" + serverData + "&width=100", file.name, file.index);

		if (file.index == 0) {
			CurrentTable = document.createElement("table");
			CurrentTable.border = 1;
			CurrentTable.cellPadding = 10;
			//CurrentTable.cellSpacing = 5;
		}
		var quotient = parseInt(file.index / TableColumns);
		var remainder = file.index % TableColumns;
		if (remainder == 0) {
			CurrentRow = CurrentTable.insertRow(quotient);
		}
		var oTD = CurrentRow.insertCell(remainder);

		oTD.innerHTML = entryTitle + "<br/>";

		var newImg = document.createElement("img");
		oTD.appendChild(newImg);
		if (newImg.filters) {
			try {
				newImg.filters.item("DXImageTransform.Microsoft.Alpha").opacity = 0;
			} catch (e) {
				// If it is not set initially, the browser will throw an error.  This will set it if it is not set yet.
				newImg.style.filter = 'progid:DXImageTransform.Microsoft.Alpha(opacity=' + 0 + ')';
			}
		} else {
			newImg.style.opacity = 0;
		}
		newImg.onload = function() {
			fadeIn(newImg, 0);
		};
		newImg.src = "/stream/" + entryId + "?width=125";

		var progress = new FileProgress(file, this.customSettings.upload_target);
		progress.setStatus("Thumbnail Created.");
		progress.toggleCancel(false);
	} catch (ex) {
		this.debug(ex);
	}
}

function uploadComplete(file) {
	try {
		/*  I want the next upload to continue automatically so I'll call startUpload here */
		if (this.getStats().files_queued > 0) {
			this.startUpload();
		} else {
			var progress = new FileProgress(file, this.customSettings.upload_target);
			progress.setComplete();
			progress.setStatus("All files received.");
			progress.toggleCancel(false);

			document.getElementById("uploadContainer").appendChild(CurrentTable);
			//alert(document.getElementById("uploadContainer").innerHTML);

			var buttonText;
			if (UploadCount > 1) {
				buttonText = "Edit Batch Attributes";
			}
			else {
				buttonText = "Edit File Attributes";
			}
			//alert(CurrentEntryIdCSV.substr(0, CurrentEntryIdCSV.length - 1));
			batchContainer.innerHTML = "<button onClick=\"window.open('/Pages/Profile.aspx?EntryId=("
                                        + CurrentEntryIdCSV.substr(0, CurrentEntryIdCSV.length - 1)
                                        + ")&Edit=true')\">" + buttonText + "</button>";
		}
	} catch (ex) {
		this.debug(ex);
	}
}

function uploadError(file, errorCode, message) {
	var imageName = "error.gif";
	var progress;
	try {
		switch (errorCode) {
			case SWFUpload.UPLOAD_ERROR.FILE_CANCELLED:
				try {
					progress = new FileProgress(file, this.customSettings.upload_target);
					progress.setCancelled();
					progress.setStatus("Cancelled");
					progress.toggleCancel(false);
				}
				catch (ex1) {
					this.debug(ex1);
				}
				break;
			case SWFUpload.UPLOAD_ERROR.UPLOAD_STOPPED:
				try {
					progress = new FileProgress(file, this.customSettings.upload_target);
					progress.setCancelled();
					progress.setStatus("Stopped");
					progress.toggleCancel(true);
				}
				catch (ex2) {
					this.debug(ex2);
				}
			case SWFUpload.UPLOAD_ERROR.UPLOAD_LIMIT_EXCEEDED:
				imageName = "uploadlimit.gif";
				break;
			default:
				alert(message);
				break;
		}
		addImageAndTitle("/Images/FileUpload/" + imageName);

	} catch (ex3) {
		this.debug(ex3);
	}

}

function fadeIn(element, opacity) {
	var reduceOpacityBy = 5;
	var rate = 30; // 15 fps
	if (opacity < 100) {
		opacity += reduceOpacityBy;
		if (opacity > 100) {
			opacity = 100;
		}

		if (element.filters) {
			try {
				element.filters.item("DXImageTransform.Microsoft.Alpha").opacity = opacity;
			} catch (e) {
				// If it is not set initially, the browser will throw an error.  This will set it if it is not set yet.
				element.style.filter = 'progid:DXImageTransform.Microsoft.Alpha(opacity=' + opacity + ')';
			}
		} else {
			element.style.opacity = opacity / 100;
		}
	}
	if (opacity < 100) {
		setTimeout(function() {
			fadeIn(element, opacity);
		}, rate);
	}
}


/* ******************************************
*	FileProgress Object
*	Control object for displaying file info 
*/
function FileProgress(file, targetID) {
	this.fileProgressID = "divFileProgress";

	this.fileProgressWrapper = document.getElementById(this.fileProgressID);
	if (!this.fileProgressWrapper) {
		this.fileProgressWrapper = document.createElement("div");
		this.fileProgressWrapper.className = "progressWrapper";
		this.fileProgressWrapper.id = this.fileProgressID;

		this.fileProgressElement = document.createElement("div");
		this.fileProgressElement.className = "progressContainer";

		var progressCancel = document.createElement("a");
		progressCancel.className = "progressCancel";
		progressCancel.href = "#";
		progressCancel.style.visibility = "hidden";
		progressCancel.appendChild(document.createTextNode(" "));

		var progressText = document.createElement("div");
		progressText.className = "progressName";
		progressText.appendChild(document.createTextNode(""));

		var progressBar = document.createElement("div");
		progressBar.className = "progressBarInProgress";

		var progressStatus = document.createElement("div");
		progressStatus.className = "progressBarStatus";
		progressStatus.innerHTML = "&nbsp;";

		this.fileProgressElement.appendChild(progressCancel);
		this.fileProgressElement.appendChild(progressText);
		this.fileProgressElement.appendChild(progressStatus);
		this.fileProgressElement.appendChild(progressBar);

		this.fileProgressWrapper.appendChild(this.fileProgressElement);

		document.getElementById(targetID).appendChild(this.fileProgressWrapper);
		fadeIn(this.fileProgressWrapper, 0);

	} else {
		this.fileProgressElement = this.fileProgressWrapper.firstChild;
		this.fileProgressElement.childNodes[1].firstChild.nodeValue = ""; //file.name;
	}

	this.height = this.fileProgressWrapper.offsetHeight;

}
FileProgress.prototype.setProgress = function(percentage) {
	this.fileProgressElement.className = "progressContainer green";
	this.fileProgressElement.childNodes[3].className = "progressBarInProgress";
	this.fileProgressElement.childNodes[3].style.width = percentage + "%";
};
FileProgress.prototype.setComplete = function() {
	this.fileProgressElement.className = "progressContainer blue";
	this.fileProgressElement.childNodes[3].className = "progressBarComplete";
	this.fileProgressElement.childNodes[3].style.width = "";

};
FileProgress.prototype.setError = function() {
	this.fileProgressElement.className = "progressContainer red";
	this.fileProgressElement.childNodes[3].className = "progressBarError";
	this.fileProgressElement.childNodes[3].style.width = "";

};
FileProgress.prototype.setCancelled = function() {
	this.fileProgressElement.className = "progressContainer";
	this.fileProgressElement.childNodes[3].className = "progressBarError";
	this.fileProgressElement.childNodes[3].style.width = "";

};
FileProgress.prototype.setStatus = function(status) {
	this.fileProgressElement.childNodes[2].innerHTML = status;
};

FileProgress.prototype.toggleCancel = function(show, swfuploadInstance) {
	this.fileProgressElement.childNodes[0].style.visibility = show ? "visible" : "hidden";
	if (swfuploadInstance) {
		var fileID = this.fileProgressID;
		this.fileProgressElement.childNodes[0].onclick = function() {
			swfuploadInstance.cancelUpload(fileID);
			return false;
		};
	}
};


//-----------
// Galleyr Popup
function galleryClick() {
	displayGalleryDialog();
}

function displayGalleryDialog() {
	$("#GalleryPopup").dialog(
        {
        	open: function(e, ui) { $(this).show(); $(".ui-dialog-titlebar-close").text("CLOSE X").css("color", "Black"); },
        	close: function(e, ui) { $(this).dialog("destroy"); },
        	resizable: false,
        	height: 550,
        	width: 700,
        	modal: true,
        	overlay: { opacity: 0.5, background: "gray" }
        }).dialog("open");
}
/*
function viewGallery(entryId) {
$("#GalleryPopup").load("/Profile/Gallery.aspx?time=" + (new Date()).getTime() + "&entryId=" + entryId + " #gallery", viewGalleryLoad);
}

function galleryLoad(responseText, textStatus, XMLHttpRequest) {
if ($("#GalleryPopup #images li").html() != null) {
$("#GalleryPopup .widget .jCarouselLite").jCarouselLite({
btnNext: ".widget .next",
btnPrev: ".widget .prev",
speed: 400,
circular: false,
visible: 6
});
$(".widget img").click(thumbImageClick);
}
$("#GalleryPopup").hide();
}
function viewGalleryLoad(responseText, textStatus, XMLHttpRequest) {
if ($("#GalleryPopup #images li").html() != null) {
$("#GalleryPopup .widget .jCarouselLite").jCarouselLite({
btnNext: ".widget .next",
btnPrev: ".widget .prev",
speed: 400,
circular: true,
visible: 6
});
$(".widget img").click(thumbImageClick);
}
displayGalleryDialog();
}

function thumbImageClick(e) {
$(".widget .mid img").attr("src", $(this).attr("src"));
$(".widget .mid .imageTitle").text($(this).attr("title"));
$(".widget .mid .imageDescription").text($(this).attr("summary"));
}
*/

//--------------
// Image View
function initImageView() {
	$("div.ivPlaceholder").hover(entryImageMouseOver, entryImageMouseOut);

	var iconHtml = "<div class='image-view-hover'><img src='/images/icons/quickinfo6.png' alt='Quick Info' /></div>";
	var popupHtml = "<div class='image-view-hover-contentbox popup'><div class='title cursor-pointer'>" +
	"<img src='/Images/icons/close.png' alt='Close' /></div><div class='content'></div></div>";

	$("body").append(iconHtml).append(popupHtml);
	//$("body").append(popupHtml);

	$("div.image-view-hover").click(imageIconClick);
	$("div.image-view-hover-contentbox div.title").click(function() { $(this).parent().hide(); });
	//var profileObj = $("div.image-view-hover-contentbox");

	//$("#EntryImageHover").click(imageIconClick);
	//$("#EntryImageProfile .profile-title").click(function() { $("#EntryImageProfile").hide(); });
	fadeInactiveImages();
}

function fadeInactiveImages() {
	var images = $("div.ivPlaceholder img");
	for (var i = 0; i < images.length; i++) {
		imageId = images[i].id;
		$("#" + imageId).fadeTo("fast", 0.7);
	}
}

function getClientDimensions() {
	var dimensions = { width: 0, height: 0 };
	if (document.documentElement) {
		dimensions.width = document.documentElement.offsetWidth;
		dimensions.height = document.documentElement.offsetHeight;
	} else if (window.innerWidth && window.innerHeight) {
		dimensions.width = window.innerWidth;
		dimensions.height = window.innerHeight;
	}
	return dimensions;
}

var currentEntryId = 0;
function entryImageMouseOver(e) {
	var entryId = getEntryId(this.id);
	var offset = $(this).offset();
	$("img", this).fadeTo(100, 1);
	var offsetTop = offset.top; //offset.top - 210;
	var offsetLeft = offset.left; //$(this).position().left;

	//var iconHtml = "<div class='image-view-hover'><img src='/images/icons/quickinfo6.png' alt='Quick Info' /></div>";
	//$("body").append(iconHtml);

	//var imgViewHover = $("div.image-view-hover");
	$("div.image-view-hover").css("top", offsetTop).css("left", offsetLeft).attr("entryId", entryId).show();
	//imgViewHover.click(imageIconClick);

	/*
	<div id="EntryImageHover" style="height: 10px; width: 10px; z-index: 100; position: absolute;
	display: none; cursor: pointer;">
	<asp:Image ID="infoImage" runat="server" ImageUrl="/images/icons/quickinfo6.png"
	AlternateText="Quick Info" />
	</div>
	*/

	//$("#EntryImageHover").css("top", offsetTop).css("left", offsetLeft).show();
	//right side: $("#EntryImageHover").css("top", offset.top).css("left", offset.left + $(this).width()).show();
	//$("#EntryImageHover").attr("entryId", entryId);
}
function entryImageMouseOut(e) {
	$("img", this).fadeTo(100, 0.7);
	//$("div.image-view-hover").remove();
}
function getObjectProp(o) {
	var oString = "";
	for (var p in o) {
		oString += p + ":" + o[p] + ", ";
	}
	return oString;
}
function imageIconClick(e) {
	var entryId = $(this).attr("entryId");
	var offset = $(this).offset();

	var offsetTop = offset.top;
	var offsetLeft = offset.left;

	//var popupHtml = "<div class='image-view-hover-contentbox popup'><div class='title'>" +
	//"Close <img src='/Images/icons/close.png' alt='Close' /></div><div class='content'></div></div>";

	//$("body").append(popupHtml);

	var profileObj = $("div.image-view-hover-contentbox");

	var profileWidth = profileObj.width() + 50; //50 = padding
	var profileHeight = profileObj.height() + 50; //50 = padding	

	if (getClientDimensions().width - e.pageX < profileWidth) {
		offsetLeft -= profileObj.width(); //120;
	}
	else {
		offsetLeft += 50; //profileObj.width();  //- 50;
	}

	if (getClientDimensions().height - e.pageY < profileHeight) {
		offsetTop -= profileObj.height(); // ;
	}
	else {
		offsetTop += 40;
	}

	profileObj.css("top", offsetTop).css("left", offsetLeft).fadeIn("normal");

	var progressHtml = "<h4>Loading ...</h4><img src='/images/icons/ajax-loader.gif' />";
	$("div.content", profileObj).html(progressHtml)
		.load("/Profile/Popup.aspx?time=" + (new Date()).getTime() + "&entryId=" + entryId + " #profile", profilePopupLoad);
	//	$("#EntryImageProfile .profile-content").html(progressHtml)//;
	//        .load("/Profile/Popup.aspx?time=" + (new Date()).getTime() + "&entryId=" + entryId + " #profile", profilePopupLoad);
}

function profilePopupLoad(responseText, textStatus, XMLHttpRequest) {
	$("div.image-view-hover-contentbox .content").html(null);
	//$("#EntryImageProfile .profile-content").html(null);
}

//Helper functions
function getEntryId(id) {
	var index = id.indexOf("eId") + 3;
	return id.slice(index); //, id.indexOf("_", index));
}
function getImageId(id) {
	var index = id.indexOf("imgId") + 5;
	return id.slice(index);
}


//-------------
// Site Master
function initSiteMaster() {
	var show = false;
	if (jQuery.browser.msie && jQuery.browser.version < 7) {
		$("img", $("div.logo")).attr("src", "/App/Wyoming/images/logo_ie6.gif");
		show = true;
	}
	else if (jQuery.browser.mozilla && jQuery.browser.version < 2) {
		show = true;
	}
	if (show) {
		showPopupTip();
	}
}
function showPopupTip() {
	var popupHtml = "<div id='HomePopUpTip' class='popup-tip'>Site best viewed with Firefox 3, IE7+, Safari 3+, and Chrome." +
		" <a class='close'>CLOSE</a></div>";

	$("body").append(popupHtml);
	var popup = $("#HomePopUpTip");
	popup.css("top", popup.height() + 150)
					.css("left", (getClientDimensions().width / 2) - (popup.width() / 2))
					.show()
					.fadeTo("normal", .75);

	$("#HomePopUpTip a.close").click(function() {
		$(this).parent().hide();
	});
}
function initMyTripsButton() {
	$("#myTripsLabel").click(function() {
		$("#MyItinerary").slideToggle("slow", updateMyTripsArrowImage);
	});
	$("#MyItineraryStatus span").click(function() {
		$("#MyItinerary").slideToggle("slow", updateMyTripsArrowImage);
	});
}
function updateMyTripsArrowImage() {
	var bgImg = $("#myTripsLabel").css("background");
	if (bgImg && bgImg.search(/Up/) > -1) {
		$("#myTripsLabel").css("background", "url(/images/icons/arrowGreen.png) no-repeat").css("background-position", "right center");
	} else {
		$("#myTripsLabel").css("background", "url(/images/icons/arrowGreenUp.png) no-repeat").css("background-position", "right center");
	}
}
function updateMyItineraryCount(count) {
	$("#myTripsLabel").text("MyTrips (" + count + " Items)");
}

function popupAddedToShoppingCartItem(addedItem) {
	if ($("#MyItinerary").is(":hidden")) {
		$("#AddedToShoppingCartItem ul li").html(addedItem);
		$("#AddedToShoppingCart").fadeIn("slow", function() { setTimeout('$("#AddedToShoppingCart").fadeOut("slow");', 2000); });
	}
}

function popupShoppingCartNotification(html) {
	$("#AddedToShoppingCartItem ul li").html(html);
	$("#AddedToShoppingCart").fadeIn("slow", function() { setTimeout('$("#AddedToShoppingCart").fadeOut("slow");', 2000); });
}

//------------
// Map View
//$(document).ready(function() {
//	$("ul.mapViewList li").hover(
//        function() { $(this).css("background-color", "#343434").css("color", "#be9f66").css("font-weight", "bold"); },
//        function() { $(this).css("background-color", "").css("color", "").css("font-weight", ""); });
//});

function initMapView() {
	$("ul.map-view li").hover(
		function() { $(this).css("background-color", "#343434").css("color", "#be9f66").css("font-weight", "bold"); },
		function() { $(this).css("background-color", "").css("color", "").css("font-weight", ""); });
}

//------------
// Master Entry Control
//$(document).ready(function() {
function initMasterEntryControl() {
	$("form").keydown(function(e) {
		if (e.keyCode == 13) {
			return false;
		}
	});
}
//});

function pageLoad() {
	unbindEvents();
	wireEvents();
}

function unbindEvents() {
	$("div.baseUIControl div.Editheading:not(.associations)").unbind("click");
	$("div.associationContainer div.associationHeading").unbind("click");
}

function wireEvents() {
	//$("div.collapsible:not(.expand)").hide();

	//$("div.baseUIControl").listen('click', 'div.Editheading', function() {
	$("div.baseUIControl div.Editheading:not(.associations)").click(function() {
		//$(this).next("div.collapsible").toggle();
		$(this).next("div.collapsible").toggleClass("expanded");
		toggleExpansionImage($("img.toggle", this));
	});

	//$("div.associationContainer").listen('click', 'div.associationHeading', function() {
	$("div.associationContainer div.associationHeading").click(function() {
		$(this).next("div.collapsible").toggleClass("expanded"); //.toggle();
		toggleExpansionImage($("img.toggle", this));
	});
}


function toggleExpansionImage(img) {
	var imgSrc = $(img).attr("src");
	if (imgSrc != null && imgSrc != '') {
		if (imgSrc.search(/expand/) > -1) {
			imgSrc = imgSrc.replace(/expand/, "collapse");
		}
		else {
			imgSrc = imgSrc.replace(/collapse/, "expand");
		}
		$(img).attr("src", imgSrc);
	}
}



function toggleFilterPanel(isHidden) {
	if (isHidden) {
		$(".LfMenu").hide();
		$("div.expand_filter").show();
		//        if (!/MSIE (\d+\.\d+);/.test(navigator.userAgent)) {
		//            $(".dialog").css("margin-left", "0px");
		//        }

	}
	else {
		$("div.expand_filter").hide();
		$(".LfMenu").show();
		//        if (!/MSIE (\d+\.\d+);/.test(navigator.userAgent)) {
		//            $(".dialog").css("margin-left", "180px");
		//        }
	}
}
//$(document).ready(function() {
function initProfileMaster() {
	toggleFilterPanel(true);
}
//});

/*************  Front End Profile Page **************************/


/*************  Things You Might Like **************************/

function fmtTripInnerHTML(result) {
	var tripInnerHTML = '<a class="TipsImg" href="' + result.EntryUrl + '" title="' + result.Title +
	'"><img src="' + result.MainImageUrl + '" alt="' + result.Title + '"/><\/a><br>';
	tripInnerHTML += '<a style="float: left;"  href="' + result.EntryUrl + '">' + result.Title + '<\/a>';
	return tripInnerHTML;
}

/**
* Called via the YUI Connection manager (see makeRequest).
*/
function handleSuccess(callbackResponse) {
	var start = callbackResponse.argument[0];
	var numResults = callbackResponse.argument[1];
	var carousel = callbackResponse.argument[2];
	
	if (callbackResponse.responseText == "null") {
		$("#recommBox").css("display", "none");
	}
	else if (callbackResponse.responseText !== undefined) {
		var theTrip = eval('(' + callbackResponse.responseText + ')');
		
		for (var i = 0; i < theTrip.length; i++) {
			var result = theTrip[i];
			carousel.addItem(start + i, fmtTripInnerHTML(result));
		}

	}
	$(".carousel-list li").css("background-image", "none");
}

function handleFailure(o) {
	var result = o.status + " " + o.statusText;
	$("#recommBox").css("display", "none");
	//alert("Transaction failed.  The error is: " + result);
}

function makeRequest(carousel, url, kindID, start, numResults) {
	var params = '?kindID=' + kindID +
                            '&start=' + start +
                            '&results=' + numResults;
	var callback =
    {
    	success: handleSuccess,
    	failure: handleFailure,
    	argument: [start, numResults, carousel]
    };
    var sUrl = url + params;
	YAHOO.util.Connect.asyncRequest("GET", sUrl, callback, null);
}

var recommedationURL = "/Profile/Recommendation.aspx";
function loadInitialItems(type, args) {
	var start = args[0];
	var last = args[1];
	makeRequest(this, recommedationURL, kindToLoad, start, last);
}

function loadNextItems(type, args) {
	var start = args[0];
	var last = args[1];
	var alreadyCached = args[2];
	//alert("start=" + start + ", last=" + last + ", cached=" + alreadyCached);
	if (!alreadyCached) {
		makeRequest(this, recommedationURL, kindToLoad, start, last);
	}
}

function loadPrevItems(type, args) {
	var start = args[0];
	var last = args[1];
	var alreadyCached = args[2];

	if (!alreadyCached) {
		makeRequest(this, recommedationURL, kindToLoad, start, last);
	}
}

function handlePrevButtonState(type, args) {
	var enabling = args[0];
	var leftImage = args[1];
}

function handleNextButtonState(type, args) {
	var enabling = args[0];
	var rightImage = args[1];
}


function GetVisibleItems(winWidth) {
	
	if (winWidth < 400)
		return 1;
	if (winWidth < 500)
		return 2;
	else if (winWidth < 660)
		return 3;
	else if (winWidth < 760)
		return 4;
	else return 5;
}

function RecomPageLoad() {
	
	carousel = new YAHOO.extension.Carousel("dhtml-carousel",
		{
			numVisible: GetVisibleItems($("#recommBox").width()),
			animationSpeed: 0.4,
			animationMethod: YAHOO.util.Easing.easeBoth,
			scrollInc: GetVisibleItems($("#recommBox").width()),
			navMargin: 40,
			size: 200,
			wrap: true,
			loadInitHandler: loadInitialItems,
			prevElement: "prev-arrow",
			nextElement: "next-arrow",
			loadNextHandler: loadNextItems,
			loadPrevHandler: loadPrevItems,
			prevButtonStateHandler: handlePrevButtonState,
			nextButtonStateHandler: handleNextButtonState
		}
	);
}

function toggleRecommendation() {
	RecomPageLoad();
}

function ProfileOnLoad() {
	var initHeight = $("#DesDiv").height();
	$("#readLess").css("display", "none");
	if (initHeight < 303) {
		$("#readMore").css("display", "none");
	}
	else {
		$("#DesDiv").css("max-height", "300px");
		$("#DesDiv").css("overflow", "hidden");
	}
	$("#readMore").click(function() {
		$("#DesDiv").css({ 'max-height': '10000px' });
		$("#DesDiv").animate({
			height: "100%"
		}, 500);
		$("#readMore").css("display", "none");
		$("#readLess").css("display", "block");
	});

	$("#readLess").click(function() {
		$("#DesDiv").css("overflow", "hidden");
		$("#DesDiv").animate({
			height: "302"
		}, 500);
		$("#readLess").css("display", "none");
		$("#readMore").css("display", "block");
	});
}

function EventProfileLoad(triggle) {
	var initHeight = $("#EventTimes").height();
	if (initHeight < 100) {
		$("#toggleDates").css("display", "none");
	}
	else {
		$("#EventTimes").css({ 'height': '100px', "overflow": "hidden" });
	}

	$("#toggleDates").click(function() {
		var divHeight = $("#EventTimes").height();
		if (divHeight <= 100) {
			$("#EventTimes").animate({
				height: "100%"
			}, 500);
			$("#toggleDates").text("< Fewer Dates");
		}
		else {
			$("#EventTimes").animate({
				height: "100"
			}, 500);
			$("#toggleDates").text("View More Dates >");
		}
	});
}

/******************************************************************/

// Read More Feature Functions
function DivToggle(control) {
	control.slideToggle('slow');
	if ($("#vTrigger").attr("src") == "/Images/icons/viewless.png")
		$("#vTrigger").attr("src", "/Images/icons/viewmore.png");
	else
		$("#vTrigger").attr("src", "/Images/icons/viewless.png");

}


//--------------
// ShoppingCart.js

var shoppingCartTitle = "";
var shoppingCartDiv = "";
var isShoppingCartEditable = false;

var cart_isShowMapIcons = false;
var cart_isCapTitle = true;
var cart_isShowDescription = false;
var cart_isEditable = true;
var cart_isClippedImage = true;
var cart_isAddNotes = false;
var cart_imageSize = true;
var geoLetter = 97;

var constructShoppingCartInnerHTML = function(li) {
	var html = '';

	if (cart_isShowMapIcons && li.HasGeos) {
		html += '<div class=\"floatLf\"><a href=\"javascript:openMarkerInfoWindow(' + li.ProductId + ')\"><img src="/Images/MapIcons/&#' + (geoLetter++) + ';.png" /></a></div>';
	}

	var titleHtml = '<div>';

	if (cart_isCapTitle) {
		titleHtml += '<a style=\"color:black\" href=\'/Profile.aspx?entryid=' + li.ProductId + '\'>';
		if (li.Title.length > 16) {
			titleHtml += li.Title.substr(0, 14) + '..';
		} else {
			titleHtml += li.Title + ' ';
		}
		titleHtml += '</a>';
	} else {
		titleHtml += '<a style=\"font-size:15px; color:black\" href=\'/Profile.aspx?entryid=' + li.ProductId + '\'>';
		titleHtml += li.Title + ' ';
		titleHtml += '</a>';
	}

	titleHtml += '</div>';

	if (cart_isShowDescription) {
		html += titleHtml;
	}

	if (cart_isEditable) {
		html += '<div class=\"floatRt\"><img alt="reorder me" style="cursor: move;" src="/images/icons/drug.png" /></div>';
	}

	if (li.ImageId > 0) {
		if (cart_isClippedImage) {
			html += '<div><a href=\'/Profile.aspx?entryid=' + li.ProductId + '\'><img src=\'/stream/' + li.ImageId + '?width=' + cart_imageSize + '&height=' + cart_imageSize + '&clip=true\' /></a></div>';
		} else {
			html += '<div><a href=\'/Profile.aspx?entryid=' + li.ProductId + '\'><img src=\'/stream/' + li.ImageId + '?width=' + cart_imageSize + '\' /></a></div>';
		}
	}

	if (!cart_isShowDescription) {
		html += titleHtml;
	}

	if (cart_isShowDescription) {
		html += '<div style=\"min-height: 70px\">';
		if (li.Description.length > 200) {
			html += li.Description.substr(0, 200) + '... <a href=\'/Profile.aspx?entryid=' + li.ProductId + '\'>Read More</a>';
		} else {
			html += li.Description;
		}
		html += '</div>';
	}

	if (cart_isEditable) {
		html += '<div class=\"floatRt\"><a class=\"removeBtn\" style=\"color: white\" href=\"javascript:removeShoppingCartItem(\'' + li.id + '\')\"></a></div>';
		if (cart_isAddNotes) {
			html += '<div class=\"floatLfFluid\"><hr style="width:100%;" /><b>Notes: </b>';
			html += '<span style=\"display: none\"><input style="border-width:2px;border-style:Inset;" type=\"text\" onfocus=\"this.select();\" style=\"width:90%; font-size:11px\" class=\"shoppingcartTextboxNotes\" value=\"' + li.Notes + '\" /></span>';
			html += '<span class=\"shoppingcartNotes\" title=\"Click to edit\">' + li.Notes + '</span></div>';
		}

		//            if (cart_isAddNotes) {
		//                html += '<div class=\"floatRt\" style=\"vertical-align: text-bottom\"><a class=\"addnotesBtn\" style=\"color: white\" href=\"javascript:toggleNotes(\'' + li.id + '\')\">Show Notes</a></div>';
		//            }
	}

	return html;
};

function initShoppingCart(cartId, div, isEditable, isShowMapIcons, isCapTitle
                        , isShowDescription, isClippedImage
                        , isAddNotes, imageSize) {
	shoppingCartId = cartId;  //cartId is in cookie
	shoppingCartDiv = div;
	isShoppingCartEditable = isEditable;

	//constructShoppingCartInnerHTML configues
	cart_isShowMapIcons = isShowMapIcons;
	cart_isCapTitle = isCapTitle;
	cart_isShowDescription = isShowDescription;
	cart_isEditable = isEditable;
	cart_isClippedImage = isClippedImage;
	cart_isAddNotes = isAddNotes;
	cart_imageSize = imageSize;

	getShoppingCartItems(shoppingCartId);

	//add Notes listener
	if (isEditable) {
		initialAddNotes();
	}
}

// initial Add Notes listener
function initialAddNotes() {
	if ($.listen) {
		$("#" + shoppingCartDiv).listen('click', '.shoppingcartNotes', function() {
			$(this).prev().children(":input").attr("value", this.innerHTML);
			$(this).parent().children("span").toggle();
			$(this).prev().children(":input").focus();
		});

		$("#" + shoppingCartDiv).listen('mouseover', '.shoppingcartNotes', function() {
			$(this).css("background-color", "#ffff99");
		});

		$("#" + shoppingCartDiv).listen('mouseout', '.shoppingcartNotes', function() {
			$(this).css("background-color", "");
		});

		$("#" + shoppingCartDiv).listen('blur', '.shoppingcartTextboxNotes', function() {
			var li = $(this).parent().parent().parent("li")[0];
			li.Notes = this.value;

			$(this).parent().siblings("span.shoppingcartNotes").css("background-color", "");

			updateShoppingCartItemNote(li.ItemNumber, this.value);
			$(this).parent().siblings("span").html(this.value);
			$(this).parent().parent().children("span").toggle();
		});
	}

}

// Get
function getShoppingCartItems(cartId) {
	if (cartId) {
		$.ajax({
			type: "POST",
			contentType: "application/json; charset=utf-8",
			url: "/WebServices/ShoppingCartWebService.asmx/Get",
			dataType: "json",
			data: "{'cartId':" + cartId + "}",
			success: getSuccess,
			error: function(xhr, txt) { /*alert("Get ShoppingCart: " + txt);*/ }
		});
	}
}

function getSuccess(data, txtStatus) {
	if (data && data.d) {
		//shoppingCartId = data.d.EntryId;
		shoppingCartTitle = data.d.Title;

		var ul = document.createElement("ul");
		ul.setAttribute("id", "shoppingCartList");

		for (var i in data.d.Items) {
			var item = data.d.Items[i];
			var li = document.createElement("li");
			li.setAttribute("id", "shoppingCartItems_" + item.ItemNumber);
			li.ItemNumber = item.ItemNumber;
			li.Title = item.Title;
			li.ProductId = item.ProductId;
			li.Description = (item.Description == null || item.Description == "") ? "" : item.Description;
			li.Notes = (item.Notes == null || item.Notes == "") ? "Click here to add notes" : item.Notes;
			li.HasGeos = item.HasGeos;
			li.ImageId = item.ImageId;
			li.innerHTML = constructShoppingCartInnerHTML(li);

			ul.appendChild(li);
		}

		$("#" + shoppingCartDiv).prepend(ul);

		if (isShoppingCartEditable) {
			$("#shoppingCartList").sortable({ update: reorderShoppingCartItem });
		}
		if (window.updateMyItineraryCount) {
			updateMyItineraryCount(getNumberOfItems());
		}
	}
}

// Reorder
function reorderShoppingCartItem(e, ui) {
	var list = $("#shoppingCartList li[id*='shoppingCartItems']");

	var newIndex = -1;
	var oldIndex = -1;

	for (var i = 0; i < list.length; i++) {
		var li = list.get(i);
		var oldLi = li.ItemNumber;
		if (i != oldLi) {
			if (li.id == ui.item[0].id && newIndex == -1 && oldIndex == -1) {
				newIndex = i;
				oldIndex = oldLi;
			}
		}
		//changes value in an reorder item
		li.ItemNumber = i;
	}

	$.ajax({
		type: "POST",
		contentType: "application/json; charset=utf-8",
		url: "/WebServices/ShoppingCartWebService.asmx/Reorder",
		data: "{'newIndex':" + newIndex + ", 'oldIndex':" + oldIndex + "}",
		dataType: "json"
	});

}

// Insert
function insertShoppingCartItem(linkObj, entryId) {
	var img = $("img", linkObj);
	var link = $(linkObj);
	if (img.length == 0) {
		img = $("#" + linkObj + " img");
		link = $("#" + linkObj);
	}

	var imgSrc = $(img).attr("src");

	if (imgSrc != null && imgSrc != "" && imgSrc.search(/addedmytrip/) == -1) {
		$.ajax({
			type: "POST",
			contentType: "application/json; charset=utf-8",
			url: "/WebServices/ShoppingCartWebService.asmx/Insert",
			data: "{'entryId':" + entryId + "}",
			dataType: "json",
			success: insertSuccess,
			error: insertError,
			complete: function(xhr, text) {
				if (text == "success") {
					toggleAddToTripImage(img);
					link.css("cursor", "default");
				}
			}
		});
	}
}

function insertSuccess(data) {

	//    var id = getCookie("CartId");
	//    if (id <= 0) { //if it is a new shopping cart, get it from the server
	//        getShoppingCartItems(id);
	//    }

	if ($("#" + shoppingCartDiv + " ul").length == 0) { //if it is a new shopping cart, get it from the server
		getShoppingCartItems(getCookie("CartId"));
	}

	if (data.d) {
		var item = data.d;
		var li = document.createElement("li");
		li.setAttribute("id", "shoppingCartItems_" + item.ItemNumber);
		li.ItemNumber = item.ItemNumber;
		li.Title = item.Title;
		li.ProductId = item.ProductId;
		li.Description = (item.Description == null || item.Description == "") ? "" : item.Description;
		li.Notes = (item.Notes == null || item.Notes == "") ? "Click here to add notes" : item.Notes;
		li.HasGeos = item.HasGeos;
		li.ImageId = item.ImageId;
		li.innerHTML = constructShoppingCartInnerHTML(li);

		$("#shoppingCartList").append(li);

		var htmlTxt = "";
		if (li.ImageId > 0) {
			htmlTxt += "<div class=\"floatLf\"><img src=\"/stream/" + li.ImageId + "?width=50&height=50&clip=true\" /></div>";
		}
		if (data.d.Title.length > 16) {
			htmlTxt += "<div>" + data.d.Title.substr(0, 14) + ".. </div>";
		} else {
			htmlTxt += "<div>" + data.d.Title + " </div>";
		}

		if (window.updateMyItineraryCount) {
			updateMyItineraryCount(getNumberOfItems());
		}
		popupAddedToShoppingCartItem(htmlTxt);
	} else {
		insertError();
	}
}

function insertError() {
	var html = "Cannot add the item to Trip.<br /> Please try again.";
	popupShoppingCartNotification(html);
}

// Remove
function removeShoppingCartItem(id) {
	var index = $("#" + id)[0].ItemNumber;

	$.ajax({
		type: "POST",
		contentType: "application/json; charset=utf-8",
		url: "/WebServices/ShoppingCartWebService.asmx/RemoveAt",
		data: "{'index':" + index + "}",
		dataType: "json",
		success: removeSuccess,
		error: removeError
	});

}

function removeSuccess(data) {
	if (data.d > -1) {
		$("#shoppingCartList > li:eq(" + data.d + ")").remove();

		var list = $("#shoppingCartList li[id*='shoppingCartItems']");

		for (var i = 0; i < list.length; i++) {
			var li = list.get(i);
			if (i != li.ItemNumber) {
				//changes value in an reorder item
				li.ItemNumber = i;
			}
		}

		if (window.updateMyItineraryCount) {
			updateMyItineraryCount(getNumberOfItems());
		}
	} else {
		removeError();
	}
}

function removeError() {
	var html = "Unable to remove the item. Please try again.";
	popupShoppingCartNotification(html);
}

// Shoppingcart Util
function getNumberOfItems() {
	var list = $("#shoppingCartList li[id*='shoppingCartItems']");
	return list.length;
}

function toggleAddToTripImage(img) {
	var imgSrc = $(img).attr("src");
	if (imgSrc != null && imgSrc != '') {
		if (imgSrc.search(/addedmytrip/) > -1) {
			//imgSrc = imgSrc.replace(/addedmytrip/, "mytrip");
			return 0;
		}
		else {
			imgSrc = imgSrc.replace(/mytrip/, "addedmytrip");
			$(img).attr("src", imgSrc);
			return 1;
		}

	}
}

function toggleNotes(id) {
	var noteArea = $("#" + id + " div.floatLfFluid");
	var link = $("#" + id + " div.floatRt:contains('Notes') a")
	if (noteArea.is(":hidden")) {
		noteArea.fadeIn("slow");
		link.html("Hide Notes");
	} else {
		noteArea.fadeOut("slow");
		link.html("Show Notes");
	}
}

// Note
function updateShoppingCartItemNote(itemNumber, notes) {
	$.ajax({
		type: "POST",
		contentType: "application/json; charset=utf-8",
		url: "/WebServices/ShoppingCartWebService.asmx/UpdateNotes",
		data: "{'itemNumber':" + itemNumber + ", 'notes':'" + notes + "'}",
		dataType: "json",
		error: function(xhr, text) { alert(text); }
	});
}

// TextControl
function StretchTextbox(tb) {
	if (tb.getAttribute("wrap") == "off") {
		var numNewlines = tb.value.length - tb.value.replace(/\n/g, "").length;
		tb.rows = 2 + numNewlines;
	}
	else {
		rows = 0;
		var lines = tb.value.split("\n");
		for (var i = 0; i < lines.length; i++) {
			rows += 1 + Math.floor(lines[i].length / tb.cols);
		}
		if (rows < 2)
			rows = 2;
		tb.rows = rows;
	}
}

// NumberControl
function FormatMoney(tb) {
	strValue = tb.value.toString().replace(/\$|\,/g, '');
	if (strValue == "")
		return;
	dblValue = parseFloat(strValue);

	blnSign = (dblValue == (dblValue = Math.abs(dblValue)));
	dblValue = Math.floor(dblValue * 100 + 0.50000000001);
	intCents = dblValue % 100;
	strCents = intCents.toString();
	dblValue = Math.floor(dblValue / 100).toString();
	if (intCents < 10)
		strCents = "0" + strCents;
	for (var i = 0; i < Math.floor((dblValue.length - (1 + i)) / 3); i++) {
		dblValue = dblValue.substring(0, dblValue.length - (4 * i + 3)) + ',' +
						dblValue.substring(dblValue.length - (4 * i + 3));
	}
	strValue = (blnSign ? '' : '-') + '$' + dblValue + '.' + strCents;
	tb.value = strValue.replace(".00", "");
}

//-----------------
// Small Image Gallery
function initSmallImageGallery() {
	$("ul.gallery").galleria({
		history: false, // activates the history object for bookmarking, back-button etc.
		clickNext: true, // helper for making the image clickable
		insert: '#main_image', // the containing selector for our main image
		onImage: function(image, caption, thumb) { // let's add some image effects for demonstration purposes

			// fade in the image & caption
			if (!($.browser.mozilla && navigator.appVersion.indexOf("Win") != -1)) { // FF/Win fades large images terribly slow
				image.css('display', 'none').fadeIn(1000);
			}
			caption.css('display', 'none'); //.fadeIn(1000);

			// fetch the thumbnail container
			var _li = thumb.parents('li');

			// fade out inactive thumbnail
			_li.siblings().children('img.selected').fadeTo(500, 0.3);

			// fade in active thumbnail
			thumb.fadeTo('fast', 1).addClass('selected');

			// add a title for the clickable image
			image.attr('title', 'Next image >>');
		},
		onThumb: function(thumb) { // thumbnail effects goes here

			// fetch the thumbnail container
			var _li = thumb.parents('li');

			// if thumbnail is active, fade all the way.
			var _fadeTo = _li.is('.active') ? '1' : '0.3';

			// fade in the thumbnail when finnished loading
			thumb.css({ display: 'none', opacity: _fadeTo }).fadeIn(1500);

			// hover effects
			thumb.hover(
					function() { thumb.fadeTo('fast', 1); },
					function() { _li.not('.active').children('img').fadeTo('fast', 0.3); } // don't fade out if the parent is active
				)
		}
	});
}

function initENewsSignUp() {
	$("div.popup div.title").click(function() { $(this).parent().hide(); });
	$("#ENewsLink").click(eNewsClick);
}

function eNewsClick(e) {
	$(".newsletter-container").show();
	$("#ENewsletter").html("<h4>Loading ...</h4><img src='/Images/ajax-loader.gif' />").load("/App/Wyoming/NewsletterPopup.aspx?time=" + (new Date()).getTime(), eNewsletterLoad);
}

function eNewsletterLoad(responseText, textStatus, XMLHttpRequest) {
	//this; // dom element

	//remove unnecessary hidden fields
	$("#__EVENTTARGET,#__EVENTARGUMENT,#__VIEWSTATE", $(this)).remove();

	var options = {
		target: '#output1',   // target element(s) to be updated with server response 
		beforeSubmit: eNewsSubmit  // pre-submit callback 
		//,success: showResponse  // post-submit callback 

		// other available options: 
		//url:       url         // override for form's 'action' attribute 
		//type:      type        // 'get' or 'post', override for form's 'method' attribute 
		//dataType:  null        // 'xml', 'script', or 'json' (expected server response type) 
		//clearForm: true        // clear all form fields after successful submit 
		//resetForm: true        // reset the form after successful submit 

		// $.ajax options can be used here too, for example: 
		//timeout:   3000 
	};

	// bind form using 'ajaxForm'
	$("#ENewsletter form").ajaxForm(options);
}

// pre-submit callback
function eNewsSubmit(formData, jqForm, options) {
	// formData is an array; here we use $.param to convert it to a string to display it 
	// but the form plugin does this for you automatically when it submits the data
	var queryString = $.param(formData);

	// jqForm is a jQuery object encapsulating the form element.  To access the 
	// DOM element for the form do this:
	var formElement = jqForm[0];
	//var jsonData = $(":input", jqForm[0]).serializeArray();

	$(formElement).validate({
		rules: {
			interests: "required",
			email: {
				required: true,
				email: true
			},
			zip: "required",
			state: {
				required: function(e) {
					return $("#country").val() == 'United States';
				}
			}
		}
	});

	if ($(formElement).valid()) {
		$.ajax({
			type: "POST",
			url: "/WebServices/UserProfile.asmx/ENewsSignUp",
			data: queryString, //jsonData,
			dataType: "xml",
			contentType: "application/x-www-form-urlencoded", //"application/json; charset=utf-8",
			//dataType: "json"
			success: eNewsSignUpSuccess,
			error: wsAjaxError
		});
	}

	return false; //do not continue w/ regular form submit
}

function eNewsSignUpSuccess(data, textStatus) {
	// data could be xmlDoc, jsonObj, html, text, etc...
	//this; // the options for this ajax request
	//alert($(data).get(1).nodeValue);
	//alert(data);

	//temp hack: couldn't figure out how to access xmlDoc in firefox & ie
	var response = "";
	//For tracking.
	var axel = Math.random() + "";
	var a = axel * 10000000000000;

	response += "<img height='1' width='1' border='0' src='https://www.matracking.com/Event.gif?maKey=1021&maEventType=E-News Signup' />";
	response += "<img height='1' width='1' border='0' src='http://ad.doubleclick.net/activity;src=1804530;type=wyomi660;cat=newsl065;ord=" + a + "?' />";
	response += "<h3>Thank You!</h3>";
	response += "On behalf of Wyoming and its residents, Nancy and I thank you for taking an interest in our beautiful state. From the thrill seeker to the nature lover, the cultural ";
	response += "enthusiast to the historian, Wyoming offers something for everyone.";
	response += "<br /><br />";
	response += "Wyoming is full of activities such as mountain climbing, river rafting, camping,  fishing, hunting, horseback riding, snowmobiling, skiing and sight seeing.";
	response += "<br /><br />";
	response += "We invite you to experience and discover for yourself the wide-open spaces, true ";
	response += "Western hospitality and some of the most striking scenery you will ever find. You ";
	response += "<br /><br />";
	response += "won’t be disappointed. ";
	response += "<br /><br />";
	response += "Thank you for looking into spending a little time in Wyoming. We hope to see you on the trail. ";
	response += "<br /><br />";
	response += "-Governor Dave and Nancy Freudenthal";
	$("#ENewsletter").html(response);
}


function wsAjaxError(XMLHttpRequest, textStatus, errorThrown) {
	//alert(errorThrown);
	alert(XMLHttpRequest.responseText);
	// typically only one of textStatus or errorThrown 
	// will have info
	this; // the options for this ajax request
}


// post-submit callback 
function showResponse(responseText, statusText) {
	// for normal html responses, the first argument to the success callback 
	// is the XMLHttpRequest object's responseText property 

	// if the ajaxForm method was passed an Options Object with the dataType 
	// property set to 'xml' then the first argument to the success callback 
	// is the XMLHttpRequest object's responseXML property 

	// if the ajaxForm method was passed an Options Object with the dataType 
	// property set to 'json' then the first argument to the success callback 
	// is the json data object returned by the server 

	alert('status: ' + statusText + '\n\nresponseText: \n' + responseText +
        '\n\nThe output div should have already been updated with the responseText.');
}

//-----------------
// MyTrips
function myTripsCtrlEmailClick(url) {
    var urlStr = url;
    urlStr += getCookie("CartId");
    var title = "";
    if (shoppingCartTitle == "") {
        title = "[Enter New Trip Name] Trip";
    } else {
        title = shoppingCartTitle + ' Trip';
    }
    loadEmailPopup('EmailPopup2', urlStr, escape(title), getCookie("CartId"));
    emailClick('EmailPopup2');
}


//// Approval & ListView Control bulk check checkboxes
function bulkCheckCheckBox(cb) {
	$(cb).parent("th").parent("tr").siblings("tr").children("td").children("input").attr("checked", cb.checked);
}

function initPartnerPage() {
	$("div.associationContainer .Editheading").click(partnerContainerClick);
	$("div.associationContainer .Editheading").css("cursor", "pointer");
}

function partnerContainerClick(e) {
	//var div = $(this).parent().next("div.collapsible");
	var div = $(this).next("div.collapsible");
	$(div).toggleClass("expanded"); //.toggle();
	toggleExpansionImage($("img.toggle", this));
}


function toggleAllCheckboxes(divId, isChk) {
	$("INPUT[type='checkbox']", $("#" + divId)).attr('checked', isChk);
}
/*
// Select all
        $("A[href='#select_all']").click( function() {
            $("#" + $(this).attr('rel') + " INPUT[type='checkbox']").attr('checked', true);
            return false;
        });
       
        // Select none
        $("A[href='#select_none']").click( function() {
            $("#" + $(this).attr('rel') + " INPUT[type='checkbox']").attr('checked', false);
            return false;
        });
       
        // Invert selection
        $("A[href='#invert_selection']").click( function() {
            $("#" + $(this).attr('rel') + " INPUT[type='checkbox']").each( function() {
                $(this).attr('checked', !$(this).attr('checked'));
            });
            return false;
        }); 
*/
//function toggleExpansionImage(img) {
//	var imgSrc = $(img).attr("src");
//	if (imgSrc != null && imgSrc != '') {
//		if (imgSrc.search(/expand/) > -1) {
//			imgSrc = imgSrc.replace(/expand/, "collapse");
//		}
//		else {
//			imgSrc = imgSrc.replace(/collapse/, "expand");
//		}
//		$(img).attr("src", imgSrc);
//	}
//}

/*---------------------
Calendar View - Front End
---------------------*/
function initDailyEvents() {
    $("div.CalendarEventDay").hover(CalendarCellMouseOver, CalendarCellMouseOut);
    $("div.CalendarEventLink").click(popupMiniProfile);

    var iconHtml = "<div class='calendar-view-hover'><img src='/images/Icons/seemore.png' alt='More events...' /></div>";
    var profileHtml = "<div class='calendar-view-hover-profilebox popup'><div class='title cursor-pointer'>" +
	                    "<img src='/Images/icons/close.png' alt='Close' /></div><div class='content'></div></div>";
    var moreEventHtml = "<div class='calendar-view-hover-moreeventbox popup'><div class='title cursor-pointer'>" +
	                    "<img src='/Images/icons/close.png' alt='Close' /></div><div class='content'></div></div>";

    $("body").append(iconHtml).append(profileHtml).append(moreEventHtml);
    $("div.calendar-view-hover").click(moreEvents);
    $("div.calendar-view-hover-profilebox div.title").click(function() { $(this).parent().hide(); });
    $("div.calendar-view-hover-moreeventbox div.title").click(function() { $(this).parent().hide(); });
}

function CalendarCellMouseOver(e) {
    var date = getDate(this.id);
    var offset = $(this).offset();
    var offsetTop = offset.top + $(this).height() + 5; //offset.top - 210;
    var offsetLeft = offset.left; //$(this).position().left;
    var iconWidth = $("div.calendar-view-hover").width();
    $("div.calendar-view-hover").css("top", offsetTop)
                                    .css("left", offsetLeft + ($(this).width() - iconWidth))
                                    .attr("date", date).show();
}

function CalendarCellMouseOut(e) {
}

//Helper functions
function getDate(id) {
    //var index = id.indexOf("eId") + 3;
    var index = id.indexOf("Cell") + 4;
    return id.slice(index); //, id.indexOf("_", index));
}

function getEventEntryId(id) {
    var index = id.indexOf("Event") + 5;
    return id.slice(index); //, id.indexOf("_", index));
}

function popupMiniProfile(e) {
    $("div.calendar-view-hover-moreeventbox").hide();
    var entryId = getEventEntryId(this.id);
    var offset = $(this).offset();

    var offsetTop = offset.top;
    var offsetLeft = offset.left;

    var profileObj = $("div.calendar-view-hover-profilebox");

    var profileWidth = profileObj.width() + 50; //50 = padding
    var profileHeight = profileObj.height() + 50; //50 = padding	

    if (getClientDimensions().width - e.pageX < profileWidth) {
        offsetLeft -= profileObj.width(); //120;
    }
    else {
        offsetLeft += 50; //profileObj.width();  //- 50;
    }

    if (getClientDimensions().height - e.pageY < profileHeight) {
        offsetTop -= profileObj.height(); // ;
    }
    else {
        offsetTop += 40;
    }
    profileObj.css("top", offsetTop).css("left", offsetLeft).fadeIn("normal");

    var progressHtml = "<h4>Loading ...</h4><img src='/images/icons/ajax-loader.gif' />";
    $("div.content", profileObj).html(progressHtml)
		.load("/Profile/Popup.aspx?time=" + (new Date()).getTime() + "&entryId=" + entryId + " #profile", profilePopupLoadForCalendar);
}

function profilePopupLoadForCalendar(responseText, textStatus, XMLHttpRequest) {
    $("div.calendar-view-hover-profilebox .content").html(null);
}

function moreEvents(e) {
    $("div.calendar-view-hover-profilebox").hide();

    var eventBox = $("div.calendar-view-hover-moreeventbox");
    var date = $(this).attr("date");
    var offset = $(this).offset();

    var x = offset.left + 100;                                      //Pop it up next to the cursor on the right
    if (x + eventBox.width() > getClientDimensions().width - 50)    //If its right edge is off-screen
        x = offset.left - eventBox.width() - 50;                    //Pop it up on the left side of the cursor instead
    if (x < 0)                                                      //If its left edge is off-screen
        x = 50;                                                     //Move it a little bit to the right
    var y = offset.top - (eventBox.height() / 2);
    eventBox.css("left", x).css("top", y).fadeIn("normal");

    var features = $.getURLParam("features");
    if (features != null)
        features = "&features=" + features;
    else
        features = "";
    var progressHtml = "<h4>Loading ...</h4><img src='/images/icons/ajax-loader.gif' />";
    $("div.content", eventBox).html(progressHtml)
		.load("/Profile/DailyEvents.aspx?date=" + date + features, eventPopupLoad);
}

function eventPopupLoad(responseText, textStatus, XMLHttpRequest) {
    $("div.calendar-view-hover-moreeventbox .content").html(null);
}

//add watermarks quick and easy
$(document).ready(function () {
    /*$("input").each(function(i, el) {
    var $el = $(el);
    var wm = $el.attr("crg_wm");
    if (wm) {
    $el.removeAttr("crg_wm");
    $el.addClass("watermark");
    $el.attr("value", wm);
    var cbFocus = function(el) {
    $el.removeClass("watermark");
    $el.attr("value", "");
    $el.unbind("focus", cbFocus);
    $el.unbind("keypress", cbFocus);
    };
    $el.focus(cbFocus);
    $el.keypress(cbFocus);
    }
    })*/

    //Change Password popup dialog
    $('#changePasswdLink').simpleDialog();

    validateForm();
});

   function disableEnterKey(e) {
   	var key;
   	if (window.event)
   		key = window.event.keyCode; //IE
   	else
   		key = e.which; //firefox      

   	return (key != 13);
   }

function popUpFixedSize(URL, width, height, left, top) {
    day = new Date();
    id = day.getTime();
    if (width == undefined) {
        width = 750;
    }
    if (height == undefined) {
        height = 650;
    }
    if (left == undefined || top == undefined) {
        left = (screen.width / 2) - (width / 2);
        top = (screen.height / 2) - (height / 2);
    }
    eval("page" + id + " = window.open(URL, '" + id + "', 'toolbar=0,scrollbars=yes,location=0,statusbar=0,menubar=0,resizable=1,width=" + width + ",height=" + height + ",left = " + left + ",top = " + top + "');");
}

var frmValidator;
function validateForm() {
    $(document).ready(function () {
        frmValidator = $("form").validate({
            meta: "validate",
            onsubmit: false,
            focusInvalid: true,
            errorClass: "label_error",
            onkeyup: false,
            //errorElement: "img",
            //                errorContainer: $("#Address_messageBox"),
            //                errorLabelContainer: "#Address_messageBox ul",
            errorPlacement: function (error, element) {
                //                    error.insertAfter(element);
                if (error.text() != "") {
                    var existsErr = $("[for='" + element.attr("id") + "']");
                    if (existsErr.length > 0)
                        existsErr.remove();
                    error.appendTo($("#messageBox"));


                    $(document.createElement("img"))
                        .attr("src", "/Images/exclamation.gif")
                        .attr("alt", error.text())
                        .addClass("Img_Error")
                        .addClass("label.label_error")
                        .insertAfter(element)
                        .attr("for", element.attr("id"));
                }
            },
            wrapper: "li",
            ignore: ".ignore",
            highlight: function (element, errorClass) {
                //                    $(element).addClass(errorClass);
                var errLabel = $("label[for='" + $(element).attr("id") + "']");
                var errImg = $("img[for='" + $(element).attr("id") + "']");
                if (errImg.size() > 0 && errLabel.size() > 0)
                    $(errImg).attr("alt", errLabel.text());
                $(element).addClass(errorClass);
            },
            unhighlight: function (element, errorClass) {
                var errLabel = $("label[for='" + $(element).attr("id") + "']");
                var errImg = $("img[for='" + $(element).attr("id") + "']");
                if (errImg.size() > 0 && errLabel.size() > 0) {
                    errLabel.parent().remove();
                    errImg.remove();
                }
                $(element).removeClass(errorClass);
            },
            invalidHandler: function () {
                AddWatermark();
            },
            success: function (element) {
                if ($(element).attr("for") != undefined) {
                    var forElement = $(element).attr("for");
                    if ($("#" + forElement).length > 0) {
                        $("#" + forElement).parent("").children(".Img_Error").remove();
                        $("label[for='" + forElement + "']").parent().remove();
                    }
                }
            }
        });
    });
}