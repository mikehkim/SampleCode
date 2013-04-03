/// Author: Mike Kim
/// Date: 2/15/2011
/// Desc  : Media Manager

Web2Media = function (id, u, s, edit, entryid, mediaserverhostname) {
	var myURL = location.protocol + "//" + location.hostname + (location.port == "80" ? "" : ":" + location.port);

	this.qentryid = (typeof (entryid) != 'undefined' && entryid.length > 0) ? 'entryid=' + entryid + '&' : '';

	this._entryid = entryid;
	this._editMode = edit;
	this._varname = null;
	this._id = '#' + id;  // root tagid        
	this._jrsel = $(this._id).children(':first-child'); // curr 
	this._curMtFilter = 0; // none
	this.player = null;
	this.flowplayerUrl = "http://releases.flowplayer.org/swf/flowplayer-3.2.7.swf"; // "/Controls/Web2/flowplayer/flowplayer-3.2.7.swf"; //;
	//this.flowplayerControlsUrl = "/Controls/Web2/flowplayer/flowplayer.controls.swf";
	this._vsel = $(this._id + ' > div.crg-media-viewer');
	this._contents = this._id + ' > div.crg-media-contents';
	this._uploader = '#' + u;
	this._selector = '#' + s;
	this._action = this._id + ' > div.crg-media-action';
	this.MediaServerHostName = mediaserverhostname;

	this._Tmpt1 = "<li key='#{MediaId}' mt='#{MediaType}' class='media_content'>"
					+ "<div class='media_td'>"
						+ "<a rel='#crg-media-viewer#{MediaType}' mt='#{MediaType}' href='/mediaviewer?mediaid=#{MediaId}' title='Preview'>"
							+ "<img src='#{ThumbnailUrl_100}' alt='#{Title}' class='media_image' />"
						 + "</a>"
						+ "<div class='media_info'></div>"					
					+ "</div>"
					+ "<dl class='media_texts'>"
					+ "#{ContentHolder}"
					+ "<div class='delete'>#{ActionHolder}</div>"
					+ "</dl>"
				+ "</li>";

	this._ActionHolderEdit = "<a href='javascript:void(0)' class='delete'>Delete</a>";

	this._ContentEdit = "<dt class='media_et'>Title:</dt><dd class='media_ed'><input type='text' f='title' value='#{Title}' /></dd>"
						+ "<dt class='media_et'>Description:</dt><dd class='media_ed'><input type='text' f='description' value='#{Description}' /></dd>"
						+ "<dt class='media_et'>Keywords:</dt><dd class='media_ed'><input type='text' f='keywords' value='#{Keywords}' /></dd>"					+ "<dt class='media_et'>Category:</dt><dd>"
					+ "<label><input type='checkbox' name='category' value='Primary' f='primary' #{IsPrimary} />Primary</label>"
					+ "<label><input type='checkbox' name='category' value='Background' f='background' #{IsBackground} />Background</label>"
					+ "<label><input type='checkbox' name='category' value='Logo' f='logo' #{IsLogo} />Logo</label>"
					+ "</dd>"
					+ "<dt class='media_et'><a href='/mediaviewer?MediaId=#{MediaId}' target='_blank'>Link</a>:</dt>"
					+ "<dd class='media_ed'><input type='text' class='mediaviewerurl' value='" + myURL + "/mediaviewer?MediaId=#{MediaId}' readonly='readonly' onclick='this.select()' /></dd>"
;

	this._ContentView = "<dt class='media_et'>Title:</dt><dd class='media_ed'>#{Title}</dd>"
						+ "<dt class='media_et'>Description:</dt><dd class='media_ed'>#{Description}</dd>"
						+ "<dt class='media_et'>Keywords:</dt><dd class='media_ed'>#{Keywords}</dd>";
	this._init();

}
Web2Media.prototype = {
	_getMedia: function (mid) {
		var r = null;
		var a = this.GetMedias();
		for (var i = 0; i < a.length; i++) {
			if (a[i].MediaCategoryId == 0) {
				a[i].IsPrimary = a[i].IsBackground = a[i].IsLogo = "";
			} else {
				a[i].IsPrimary = a[i].MediaCategoryId % 2 == 1 ? "checked" : "";
				a[i].IsBackground = parseInt(a[i].MediaCategoryId / 2) % 2 == 1 ? "checked" : "";
				a[i].IsLogo = parseInt(a[i].MediaCategoryId / 4) % 2 == 1 ? "checked" : "";
			}
			if (a[i].MediaId == mid) {
				r = a[i];
				break;
			}
		}
		return r;
	},
	_setMedia: function (o, d) {
		var a = this.GetMedias();
		var b = false;
		for (var i = 0; i < a.length; i++) {
			if (a[i].MediaId == o.MediaId) {
				a[i] = o;
				b = true;
				if (d) a.splice(i, 1);
				break;
			}
		}
		if (b) {
			this._jrsel.val(JSON.stringify(a));
		}
	},
	GetMediaIds: function () {
		var that = this;
		var a = new Array();
		var r = that._jrsel.val();
		if (r.length > 0) {
			var ca = JSON.parse(r);
			for (var i = 0; i < ca.length; i++) {
				a.push(ca[i].MediaId);
			}
		}
		return a;
	},
	GetMedias: function () {
		var a = new Array();
		var r = this._jrsel.val();
		if (r.length > 0) {
			a = JSON.parse(r);
		}
		return a;
	},
	InsertMedias: function (ra) {
		var cr = this._jrsel.val();
		var hash = this._hashMedia();
		var ira = new Array();
		if (ra.length > 0) {
			for (var i = 0; i < ra.length; i++) {
				if (typeof (hash[ra[i].MediaId]) == 'undefined') {
					hash[ra[i].MediaId] = null;
					ira.push(ra[i]);
				}
			}
			this._jrsel.val(JSON.stringify(this.GetMedias().concat(ira)));
			this._refreshContent();
		}
	},
	_hashMedia: function () {
		var o = this.GetMedias()
		var a = new Array();
		for (var i = 0; i < o.length; i++) {
			a[o[i].MediaId] = null;
		}
		return a;
	},
	_refreshContent: function (mt) {
		var that = this;
		var table = '';
		var r = that._jrsel.val();
		var fmt = 0;
		if (typeof (mt) != 'undefined') {
			fmt = mt;
		}


		var counts = [0, 0, 0, 0, 0];
		if (r.length > 0) {
			var ca = JSON.parse(r);
			counts[0] = ca.length;

			//table = "<table class='crg' border='0' cellpadding='2px' cellspacing='0'>";
			table = "<ul class='ui-helper-clearfix'>";
			for (var i = 0; i < ca.length; i++) {
				if (fmt == 0 || fmt == ca[i].MediaType) {
					if (ca[i].MediaType == 1 || ca[i].MediaType == 2) {
						ca[i].ThumbnailUrl_100 = that.MediaServerHostName + "/thumbnail/" + ca[i].MediaId + "?width=100";
					} else if (ca[i].MediaType == 3) {
						ca[i].ThumbnailUrl_100 = "http://mediaserverdev.civicresource.com/images/icons/audio.gif";
					} else if (ca[i].MediaType == 4) {
						ca[i].ThumbnailUrl_100 = "http://mediaserverdev.civicresource.com/images/icons/unknown.gif";
					}
					if (ca[i].MediaCategoryId == 0) {
						ca[i].IsPrimary = ca[i].IsBackground = ca[i].IsLogo = "";
					} else {
						ca[i].IsPrimary = ca[i].MediaCategoryId % 2 == 1 ? "checked" : "";
						ca[i].IsBackground = parseInt(ca[i].MediaCategoryId / 2) % 2 == 1 ? "checked" : "";
						ca[i].IsLogo = parseInt(ca[i].MediaCategoryId / 4) % 2 == 1 ? "checked" : "";
					}

					var s = $.tmpl(that._Tmpt1, { ActionHolder: this._editMode ? that._ActionHolderEdit : '', ContentHolder: this._editMode ? that._ContentEdit : that._ContentView });
					table += $.tmpl(s, ca[i]);
				}
				counts[ca[i].MediaType]++;
			}
			//table += '</table>';   
			table += "</ul>";
		}
		this._updateCount(counts);

		$(that._contents).fadeOut("fast", function () {
			$(this).show().css("visiblity", "hidden").html(table);
			$(this).fadeIn("fast", function () {
				that._loadImageDimensions();
				that.MediaOverlap($(this).find("a[rel]"));
			});
		});

		if (this._editMode) {
			$(that._contents).find(".media_texts input").live("change", function () {
				that.UpdateClick($(this).closest("li[key]"));
			});
			$(that._contents).find("a.delete").live("click", function () {
				that.DeleteClick($(this).closest("li[key]"));
			});
		}

	},
	_loadImageDimensions: function () {
		var that = this;
		$(that._contents).find("li[mt=1] img.media_image").load(function () {
			$item = $(this).parent().parent().parent(".media_content");
			mediaId = $item.attr("key");
			var newImg = new Image();

			newImg.onload = function () {
				var height = newImg.height;
				var width = newImg.width;
				var rx = new RegExp(".*/(.*)");
				var mediaId = newImg.src.replace(rx, "$1");
				$("li[key='" + mediaId + "'] div.media_info").html(width + ' x ' + height);
				$("li[key='" + mediaId + "'] a[rel]").attr("width", width);
			}
			newImg.src = that.MediaServerHostName + "/media/" + mediaId; // this must be done AFTER setting onload
		});
	},
	_updateCount: function (counts) {
		var that = this;
		for (i = 0; i < counts.length; i++) {
			$(that._id).find(".mt-filter[mt=" + i + "] > span.count:first").html("(" + counts[i] + ")");
		}
	},
	_init: function () {
		$("#crg-media-viewer1").draggable();
		$("#crg-media-viewer2").draggable();
		$("#crg-media-viewer3").draggable();
		$("#crg-media-viewer4").draggable();

		var that = this;

		var fo = $(this._action + ' .mt-filter');
		fo.click(function () {
			fo.removeClass('mt-filter-hover');
			$(this).addClass('mt-filter-hover');
			that._refreshContent($(this).attr('mt'));
		});

		// load left nav
		var lnav = $(that._uploader).find('.left-nav');
		var navcontent = $(that._uploader).find('.navpane-content');
		lnav.click(function () {
			lnav.removeClass('left-nav-hover');
			$(this).addClass('left-nav-hover');
			navcontent.children().hide();
			navcontent.find('.' + $(this).attr('rel')).show();
		});
		// upload dialog
		$(that._uploader).dialog({
			autoOpen: false,
			modal: true,
			title: 'Select Files to Add', //'Media Upload',
			height: 540,
			width: 700,
			resizable: false
		});

		// action
		$(that._action + ' > div > a.crg-media-upload').button().click(function () {
			$(that._uploader).dialog("open");
		});


		// left panel nav

		// refresh content  
		//if (that._jrsel.val().length > 0)
		that._refreshContent();


	},
	//        EditClick:function(o) {
	//            var root = $(o).parent().parent();
	//            var html = $.tmpl(this._ContentEdit, this._getMedia(root.attr('key')));
	//            root.find('.action').html(this._ActionHolderUpdate);
	//            root.children(':last-child').html(html);
	//        },
	DeleteClick: function (o) {
		var r = $(o);
		this._setMedia({ MediaId: r.attr('key') }, true);
		r.fadeOut(function () { $(this).show().css("opacity", "0").slideUp(function () { $(this).remove(); }); });
	},
	UpdateClick: function (o) {
		var r = $(o);
		var c = r.children(':last-child');
		var mediacategory = 0;
		if (r.find("[f=primary]").is(":checked"))
			mediacategory += 1;
		if (r.find("[f=background]").is(":checked"))
			mediacategory += 2;
		if (r.find("[f=logo]").is(":checked"))
			mediacategory += 4;

		this._setMedia({ MediaId: r.attr('key')
                , MediaType: r.attr('mt')
                , Title: c.find('[f=title]').val()
                , Description: c.find('[f=description]').val()
                , Keywords: c.find('[f=keywords]').val()
                , MediaCategoryId: mediacategory
		});
		//this.EditCancelClick(o, false);
		var html = $.tmpl(this._ContentEdit, this._getMedia(r.attr('key')));
		c.html(html);
	},
	EditCancelClick: function (o, b) {
		var root = $(o).parent().parent();
		var html = $.tmpl(b ? this._ContentEdit : this._ContentView, this._getMedia(root.attr('key')));
		root.find('.action').html(b ? this._ActionHolderUpdate : this._ActionHolderEdit);
		root.children(':last-child').html(html);
	},
	MediaDialogViewClick: function (qs) {
		var that = this;
		$.get('/mediaviewer?' + qs, function (data) {
			that._vsel.html($(data).find('#media-content').html());
		});
	},
	MediaOverlap: function (a) {
		var that = this;
		a.overlay({
			onBeforeLoad: function () {
				if (that.player != null) {
					that.player.unload();
					that.player = null;
				}
				// grab wrapper element inside content
				var mt = this.getTrigger().attr("mt");
				var wrap = this.getOverlay().find("#media-datum" + mt);
				wrap.html('');

				if (mt == 2 || mt == 3) {// audio or video

				} else {
					var maxwidth = 800;
					if (mt == 1)
						var width = (this.getTrigger().attr("width") > maxwidth ? maxwidth : this.getTrigger().attr("width")) + "px";
					$.ajax({
						url: this.getTrigger().attr("href") + "&maxwidth=" + maxwidth,
						success: function (data) {
							if (mt == 1 && width)
								$("#crg-media-viewer1").css("width", width);
							wrap.html($(data).find('#media-content').html());
						},
						async: false
					});
				}
			},
			onLoad: function () {
				var mt = this.getTrigger().attr("mt");
				if (mt == 2 || mt == 3) { // audio or video                                                   
					var href = this.getTrigger().attr("href");
					var ids = href.split('=');

					if (mt == 2) { //video
						that.player = $f("media-datum" + mt, that.flowplayerUrl, {
							playlist: [{
								url: that.MediaServerHostName + '/Thumbnail/' + ids[ids.length - 1] + '.jpg',
								scaling: 'orig'
							}, {
								url: that.MediaServerHostName + '/Media/' + ids[ids.length - 1],
								autoPlay: true,
								autoBuffering: true
							}]
										, plugins: {
											controls: {
											//url: that.flowplayerControlsUrl
										}
									}
						});
					} else if (mt == 3) { //audio
						that.player = $f("media-datum" + mt, that.flowplayerUrl, {
							playlist: [{
								url: that.MediaServerHostName + '/Thumbnail/' + ids[ids.length - 1] + ".jpg",
								scaling: 'orig'
							}, {
								url: that.MediaServerHostName + '/Media/' + ids[ids.length - 1] + ".mp3",
								autoPlay: true,
								autoBuffering: true
							}]
											, plugins: {
												controls: {
													autoHide: "never",
													fastForward: true,
													fastBackward: true,
													fullscreen: false
													//url: that.flowplayerControlsUrl
												}
											}
						});
					}

					that.player.load();
				}
			},
			onClose: function () {
				if (that.player != null) {
					that.player.unload();
					that.player = null;
				}
			}
		});
	}
}

/******************************************************************************************************************************/
/********Media Selector************/
/******************************************************************************************************************************/
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
						+ "<img src='#{ThumbnailUrl_100}' alt='#{Title}' class='media_image' />"
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
					if (ca[i].MediaType == 1 || ca[i].MediaType == 2) {
						ca[i].ThumbnailUrl_100 = this._mgObj.MediaServerHostName + "/thumbnail/" + ca[i].MediaId + "?width=100";
					} else if (ca[i].MediaType == 3) {
						ca[i].ThumbnailUrl_100 = "http://mediaserverdev.civicresource.com/images/icons/audio.gif";
					} else if (ca[i].MediaType == 4) {
						ca[i].ThumbnailUrl_100 = "http://mediaserverdev.civicresource.com/images/icons/unknown.gif";
					}
					table += $.tmpl($.tmpl(tmpl, ca[i]), { row: this._cObj.length });
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
		//this._loadImageDimensions();
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
		$(that).closest(".media_content").fadeOut(function () {
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
						$(that).closest(".media_content").fadeOut(function () {
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