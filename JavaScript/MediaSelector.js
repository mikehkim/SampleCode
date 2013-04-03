MediaSelector = function (vname) {
	this._vname = vname;
	this._mgObj = null;
	this._cObj = new Array();
	this._init();
}
MediaSelector.prototype = {
	_init: function () {
		var that = this;
		$('#crg-media-select-find').click($.proxy(this._search, this));
		$("#mediaTypeChoice").change($.proxy(this._search, this));
		$("#crg-media-select-search").keyup(function () { that._filter(true); });
		$("li.left-nav[rel='selectContent']").click($.proxy(this._search, this));
	},
	_filter: function (doSlide) {
		value = $("#crg-media-select-search").val().replace(/([^\w])/gi, "\\$1");
		$hits = $("#crg-media-selector-content .media_texts .media_ed").filter(function () {
			if ($(this).children("input").length > 0) // exclude "Link" value
				return false;
			var rx = new RegExp(value, "i");
			return rx.test($(this).html());
		});
		if ($('#mediaTypeChoice').val() == 0)
			$items = $hits.parent().parent();
		else
			$items = $hits.parent().parent("[mt=" + $('#mediaTypeChoice').val() + "]");

		$items.addClass("newhit");
		$hideItems = $("#crg-media-selector-content li.media_content.hit:not(.newhit)");

		if ($items.length + $hideItems.length > 0) {

			if ($items.length > 50 || $hideItems.length > 50)
				doSlide = false;
			if (!doSlide) {
				$hideItems.hide();
				$items.show();
			} else {
				$hideItems.fadeOut(function () { $(this).show().css("opacity", "0").slideUp(function () { $(this).css("opacity", "") }); });
				$items.slideDown();
			}
			$hideItems.removeClass("hit");
			$items.removeClass("newhit").addClass("hit");
		}

		this._updateCount();

		updateCount();
	},
	_search: function () {
		var that = this;
		$('#crg-media-selector-content').html("<div class='crg loading'>Loading...</div>");
		$.ajax({
			url: '/WebServices/ControlsWebService.asmx/MediaLibrary',
			data: "{ 'mediaTypeId': '" + parseInt($('#mediaTypeChoice').val()) + "', 'search': '' }",
			dataType: "json",
			type: "POST",
			contentType: "application/json; charset=utf-8",
			dataFilter: function (data) { return data; },
			success: $.proxy(that._completedSearch, this)
		})
	},
	_completedSearch: function (data) {
		var myURL = location.protocol + "//" + location.hostname + (location.port == "80" ? "" : ":" + location.port);

		var tmpl = "<li key='#{MediaId}' class='media_content hit' mt='#{MediaType}'>"
					+ "<div class='media_td'>"
						+ "<a class='insert' href='javascript:void(0)' onclick='" + this._vname + ".InsertClick(#{row},this)'>Insert</a><br />"
						+ "<a class='delete' href='javascript:void(0)' onclick='" + this._vname + ".DeleteClick(\"#{MediaId}\",this)'>Delete</a>"
					+ "</div>"
					+ "<div class='media_td'><a rel='#crg-media-viewer#{MediaType}' mt='#{MediaType}' href='/mediaviewer?mediaid=#{MediaId}' title='Preview'>"
						+ "<img src='" + this._mgObj.MediaServerHostName + "/MediaThumbnail.ashx?mediaid=#{MediaId}&width=100' alt='#{Title}' class='media_image' />"
						+ "</a>"
						+ "<div class='media_info'></div></div>"
					+ "<dl class='media_texts'>"
						+ "<dt class='media_et'>Title:</dt><dd class='media_ed'>#{Title}</dd>"
						+ "<dt class='media_et'>Description:</dt><dd class='media_ed'>#{Description}</dd>"
						+ "<dt class='media_et'>Keywords:</dt><dd class='media_ed'>#{Keywords}</dd>"
						+ "<dt class='media_et'><a href='" + myURL + "/mediaviewer?MediaId=#{MediaId}' target='_blank'>Link</a>:</dt>"
						+ "<dd class='media_ed'><input type='text' class='mediaviewerurl' value='" + myURL + "/mediaviewer?MediaId=#{MediaId}' readonly='readonly' onclick='this.select()' /></dd>"
					+ "</dl>"
					+ "</li>";
		var table = '';
		var results = 0;
		var ca = data.d;

		var mediaIds = this._mgObj.GetMediaIds();

		this._cObj = new Array();

		if (ca.length) {
			for (var i = 0; i < ca.length; i++) {
				if ($.inArray(ca[i].MediaId, mediaIds) == -1) {
					results++;
					table += $.tmpl($.tmpl(tmpl, ca[i]), { row: i });
					this._cObj.push({ MediaId: ca[i].MediaId, Title: ca[i].Title, Description: ca[i].Description, Keywords: ca[i].Keywords, MediaType: ca[i].MediaType });
				}
			}
			table = "<span class='count'></span>"
					+ "<ul class='crg'>"
					+ table + "</ul>";
		} else {
			table = "<div class='crg'>No results</div>";
		}
		$("#crg-media-selector-content").html(table);
		this._loadImageDimensions();
		this._filter(false);
		this._mgObj.MediaOverlap($("#crg-media-selector-content a[rel]"));
	},
	_loadImageDimensions: function () {
		var that = this;
		$("#crg-media-selector-content li[mt=1] img.media_image").load(function () {
			$item = $(this).parent().parent().parent(".media_content");
			mediaId = $item.attr("key");
			var newImg = new Image();

			newImg.onload = function () {
				var height = newImg.height;
				var width = newImg.width;
				var rx = new RegExp(".*/(.*)");
				var mediaId = newImg.src.replace(rx, "$1");
				$("#crg-media-selector-content li[key='" + mediaId + "'] div.media_info").html(width + ' x ' + height);
				$("#crg-media-selector-content li[key='" + mediaId + "'] a[rel]").attr("width", width);
			}
			newImg.src = that._mgObj.MediaServerHostName + "/media/" + mediaId; // this must be done AFTER setting onload
		});
	},
	_updateCount: function () {
		results = $("#crg-media-selector-content li.media_content.hit").length;
		$("#crg-media-selector-content span.count").text(results + " result" + (results != 1 ? "s" : ""));
	},
	InsertClick: function (r, that) {
		mediaselector = this;
		$(that).attr('disabled', 'disabled');
		$(that).parent().parent(".media_content").fadeOut(function () {
			$(this).show().css("opacity", "0").slideUp(function () {
				$(this).remove();
				mediaselector._updateCount();
			});
		});
		var a = new Array();
		a.push(this._cObj[r]);
		this._mgObj.InsertMedias(a);
	},
	DeleteClick: function (mediaId, that) {
		if (confirm("Are you sure you want to DELETE this from the media library?")) {
			mediaselector = this;
			$.ajax({
				url: '/WebServices/ControlsWebService.asmx/MediaLibraryDelete',
				data: "{ 'mediaId': '" + mediaId + "' }",
				dataType: "json",
				type: "POST",
				contentType: "application/json; charset=utf-8",
				dataFilter: function (data) { return data; },
				success: function (data) {
					if (data.d) {
						$(that).parent().parent(".media_content").fadeOut(function () {
							$(this).show().css("opacity", "0").slideUp(function () {
								$(this).remove();
								mediaselector._updateCount();
							});
						});
					} else {
						alert("You do not have permission to delete that file.");
						$(that).remove();
					}
				}
			});
		}
	},
	SetMediaMngtObj: function (o) {
		this._mgObj = o;
	}

}