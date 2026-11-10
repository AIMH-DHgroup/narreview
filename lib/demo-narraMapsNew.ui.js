"use strict";

// Builder UI module.
// Depends on globals from toolNew.html and builder modules loaded after/alongside it.

function getNarrativeRequestData(extraData) {
	var data = Object.assign({
		idNarra: narra.id_n,
		idNarr: narra.id_n,
		subjectId: narra.subjectID,
		subject: narra.subjectID,
		dbusername: narra.id_n && narra.user && narra.dbName ? narra.id_n + narra.user + '-' + narra.dbName : undefined,
		dbname: narra.dbName,
		dbuser: narra.user,
		dbIdNarra: narra.id_n
	}, extraData || {});

	Object.keys(data).forEach(function(key) {
		if (data[key] === undefined || data[key] === null) {
			delete data[key];
		}
	});

	return data;
}

function logAjaxError(response) {
	console.log(JSON.stringify(response));
}

function setMapPreviewLoading(isLoading) {
	$('#visMapButton span').toggle(!isLoading);
	$('#mapPreviewLoading').toggle(isLoading);
	$('#visMapButton').attr('aria-busy', String(isLoading));
}

function apiJsonRequest(options) {
	$.ajax({
		type: options.type || "GET",
		url: options.url,
		dataType: options.dataType || "JSON",
		data: options.data || {},
		cache: options.cache,
		contentType: options.contentType,
		processData: options.processData,
		success: options.success || function() {},
		error: options.error || logAjaxError
	});
}

function dismissTransientUi() {
	$('.popover').hide();
	$('.radioEntityBtn').prop('checked', false);
	resetEntityPopover();
	hideEntityPopover();
}

function makeCopyCoordsButtonMarkup(buttonId, value, qid, label) {
	return "<button type='button' class='btn btn-default btn-copy-coors js-copy-coors' id='" + buttonId + "' data-copy-type='" + value + "' data-qid='" + qid + "' data-copy-value='" + getCopyValueForEntity(value, qid) + "'><i class='fa-regular fa-copy'></i></button>" +
		"<label for='" + buttonId + "' class='radioButtonText radioEntities'>" + label + "</label>";
}

function getCopyValueForEntity(whatToCopy, qid) {
	// Snapshot the value into the button markup so copy still works
	// even if the popover content is rebuilt asynchronously.
	var item = narra.items[qid] || {};
	if (whatToCopy === 'pol') {
		return item.coordinatesPolygon || "";
	}

	if (!item.coordinatesPoint) {
		return "";
	}

	var matches = item.coordinatesPoint.match(/-?\d+(\.\d+)?/g);
	if (!matches || matches.length < 2) {
		return "";
	}

	if (whatToCopy === 'lat') {
		return matches[1] || "";
	}

	if (whatToCopy === 'long') {
		return matches[0] || "";
	}

	return "";
}

function makePointCopyMarkup(qid) {
	return "<br><h5 class='showEntity-title'>Copy the coordinates to the clipboard</h5>" + makePointCopyContentMarkup(qid);
}

function makePointCopyContentMarkup(qid) {
	return "<div class='div-copy-coors' id='copy-point'><div id='div-copy-lat' class='div-copy-coors'>" +
		makeCopyCoordsButtonMarkup('btn-copy-coors-lat' + qid, 'lat', qid, 'Latitude') +
		"</div><div id='div-copy-long' class='div-copy-coors'>" +
		makeCopyCoordsButtonMarkup('btn-copy-coors-long' + qid, 'long', qid, 'Longitude') +
		"</div></div>";
}

function makePolygonCopyMarkup(qid) {
	return "<br><h5 class='showEntity-title'>Copy the coordinates to the clipboard</h5>" + makePolygonCopyContentMarkup(qid);
}

function makePolygonCopyContentMarkup(qid) {
	return "<div class='div-copy-coors' id='copy-pol'>" +
		makeCopyCoordsButtonMarkup('btn-copy-pol' + qid, 'pol', qid, 'Polygon') +
		"</div>";
}

function bindDynamicUiEvents() {
	$(document).on('click', '.js-close-popover, .deleteButtonPopover', function(event) {
		event.preventDefault();
		event.stopImmediatePropagation();
		event.stopPropagation();
		var $popover = $(this).closest('.popover');
		if ($popover.length && $popover.attr('id')) {
			$('[aria-describedby="' + $popover.attr('id') + '"]').popover('hide');
		} else {
			$('.popover').hide();
		}
	});

	$(document).on('mouseenter', '.js-tooltip-entity-link', function() {
		$(this).tooltip();
		$(this).tooltip('show');
	});

	$(document).on('click', '.js-delete-narrative', function(event) {
		event.stopPropagation();
		deleteNarrative(this.id);
	});

	$(document).on('click', '.js-copy-coors', function() {
		copyToClipboard($(this).attr('data-copy-type'), $(this).attr('data-qid'), this.id, $(this).attr('data-copy-value'));
	});

	$(document).on('click', '.js-delete-entity', function(event) {
		event.preventDefault();
		event.stopPropagation();
		deleteEntity($(this).attr('data-qid'));
	});

	$(document).on('click', '.js-image-request', function(event) {
		event.preventDefault();
		event.stopPropagation();
		$(this).toggle();
		$(this).parent().next().toggle().css('display', 'inline-block');
		imageRequest($(this).attr('data-qid'), $(this));
	});

	$(document).on('keydown', '.popoverDesc', function(event) {
		if (event.which === 13) {
			event.preventDefault();
			$(this).blur();
		}
	});

	$(document).on('blur', '.popoverDesc', function() {
		setDescription($(this).attr('data-qid'), $(this).text());
	});

	$(document).on('change', '.radioEntityBtn', function() {
		addEntityListener(this);
	});

	$(document).on('click', '#addEntityButton', function() {
		addEntityFromIdOrURI();
		$('.popover').hide();
	});

	$(document).on('click', '.data', function(event) {
		if ($(this).attr('data-builder-click') === '1') {
			dataDivClick($(this), $(this).attr('data-without-arrow') === '1', event);
		}
	});

	$(document).on('click', '.js-show-modal-tooltip', function(event) {
		event.preventDefault();
		showModalTooltip($(this));
	});

	$(document).on('click', '#selectCoverImage', function() {
		var coverImgInput = document.getElementById('coverImgInput');
		coverImgInput.click();
		addImageListener(coverImgInput);
	});

	$(document).on('click', '#spoiler-cover-image', function() {
		showCoverImage($('#arrow-cover-image'));
	});

	$(document).on('change', '.js-switch-image', function() {
		switchImage($(this).val(), $(this).attr('data-slide-id'));
	});

	$(document).on('click', '.js-replace-image', function(event) {
		replaceImage($(event.target));
	});

	$(document).on('change', '.js-upload-image-input', function(event) {
		loadImageFromFile(event.target);
	});

	$(document).on('click', '.js-open-file-input', function(event) {
		$(event.target).siblings('input').first().click();
	});

	$(document).on('mouseenter', '.js-digobj-tooltip', function() {
		displayDigObjTooltip($(this));
	});

	$(document).on('click', '.remove-image', function() {
		removeImage(this);
	});
}

function bindStaticUiEvents() {
	function hideThreeDSubtypeSelector() {
		$('#event-type-buttons').css('display', 'flex');
		$('#three-d-event-options').hide();
	}

	function showThreeDSubtypeSelector() {
		$('#event-type-buttons').hide();
		$('#three-d-event-options').css('display', 'flex');
	}

	$(document).on('click', '.js-hide-popovers', function(event) {
		if (event.target !== this) {
			return;
		}
		dismissTransientUi();
	});

	$('.js-hide-popovers').on('scroll', dismissTransientUi);

	$('#settingsDropdown').on('click', function(event) {
		if ($(event.target).closest('#settingsMenu').length) {
			return;
		}

		var menu = $('#settingsMenu');
		var button = $('#settingsButton');
		var isExpanded = button.attr('aria-expanded') === 'true';
		menu.prop('hidden', isExpanded);
		button.attr('aria-expanded', String(!isExpanded));
	});
	$(document).on('click', function(event) {
		if (!$(event.target).closest('.settings-dropdown').length) {
			$('#settingsMenu').prop('hidden', true);
			$('#settingsButton').attr('aria-expanded', 'false');
		}
	});
	$(document).on('keydown', function(event) {
		if (event.key === 'Escape' && !$('#settingsMenu').prop('hidden')) {
			$('#settingsMenu').prop('hidden', true);
			$('#settingsButton').attr('aria-expanded', 'false').trigger('focus');
		}
	});

	$('#buttonSaveTitle').on('click', confirmUpdateTitle);
	$('#cover-page').on('click', confirmCoverPage);
	$('#addButton').on('click', function() {
		setCurrentTimelineEvent(null);
		switchContainerEventType(false, true);
	});
	$('#saveButton').on('click', function() {
		const evid = saveEvent(undefined);
		if (evid !== undefined) {
			displayEvent(undefined, evid);
		}
	});
	$('#cancelButton').on('click', confirmReset);
	$('#visMapButton').on('click', function() {
		setMapPreviewLoading(true);

		var workspace = $("#workspace");
		var currentEventId = workspace.attr("data-evid");
		var currentEventIsSaved = workspace.css("display") !== "none"
			&& currentEventId
			&& narra.events[currentEventId] !== undefined;
		var startFromEvent = null;

		if (currentEventIsSaved) {
			if (!checkNewChanges.call(this) && saveEvent(undefined) === undefined) {
				setMapPreviewLoading(false);
				return;
			}
			startFromEvent = currentEventId;
		}

		publishNarration(1, startFromEvent);
	});
	$('#exportOWLButton').on('click', downloadOwl);
	$('#publish-story-container').on('click', function() {
		publishNarration();
	});
	$('#account-btn').on('click', function() {
		toggleArrow($('#arrow-panel'));
	});
	$('#account-list').on('hidden.bs.dropdown', function() {
		$('#arrow-panel').removeClass('fa-caret-down').addClass('fa-caret-right');
	});
	$('#logout-link').on('click', confirmLogout);
	$('#map-event').on('click', function() {
		hideThreeDSubtypeSelector();
		loadEventType('map', false, false);
		$('#workspace').attr('data-evid', nextEvid());
	});
	$('#object3d-event').on('click', function() {
		showThreeDSubtypeSelector();
	});
	$('#three-d-back-event').on('click', function() {
		hideThreeDSubtypeSelector();
	});
	$('#sketchfab-option-event').on('click', function() {
		hideThreeDSubtypeSelector();
		loadEventType('sketchfab', false, false);
		$('#workspace').attr('data-evid', nextEvid());
	});
	$('#aton-option-event').on('click', function() {
		hideThreeDSubtypeSelector();
		loadEventType('Aton', false, false);
		$('#workspace').attr('data-evid', nextEvid());
	});
	$('#slide-event').on('click', function() {
		hideThreeDSubtypeSelector();
		loadEventType('slide', false, false);
		$('#workspace').attr('data-evid', nextEvid());
	});
	$('#change-event-type').on('click', function() {
		var isItalian = narra.currentLang === 'it';
		var options = [
			"<label><input type='radio' name='change-event-type-option' value='map' " + (formType === 'map' ? "checked" : "") + "> " + (isItalian ? "Map" : "Map") + "</label><br>",
			"<span>" + (isItalian ? "Modello 3D:" : "3D Model:") + "</span><br>",
			"<label><input type='radio' name='change-event-type-option' value='sketchfab' " + (formType === 'sketchfab' ? "checked" : "") + "> Sketchfab</label><br>",
			"<label><input type='radio' name='change-event-type-option' value='Aton' " + (formType === 'Aton' ? "checked" : "") + "> Aton</label><br>",
			"<label><input type='radio' name='change-event-type-option' value='slide' " + (formType === 'slide' ? "checked" : "") + "> Slide</label>"
		].join("");
		showModal(
			isItalian ? "Cambia tipo di evento" : "Change event type",
			"<span id='change-event-type-options'>" + options + "</span>",
			isItalian ? "Annulla" : "Cancel",
			isItalian ? "Conferma" : "Confirm",
			function() {},
			function() {
				var selectedType = $("#change-event-type-options input:checked").val();
				if (selectedType) {
					changeWorkspaceEventType(selectedType);
				}
			}
		);
	});
	$('#selectEventLocalBackgroundImage').on('click', function() {
		document.getElementById('backImgInput').click();
	});
	$('#selectEventLocalImage').on('click', function() {
		document.getElementById('eventImageInput').click();
	});
	$('#add-image-icon').on('click', function() {
		addImageGroup(false);
	});
	$('#openPopupSearchCoordinates').on('click', openPopupMap);
	$('#openPopupDrawPolygon').on('click', function() {
		window.open('HTML/drawPolygons.html', 'Draw_Polygons', 'width=900,height=700');
	});

	if (typeof narraAtonEditor !== 'undefined') {
		narraAtonEditor.init();
	}
	if (typeof narraMapEditor !== 'undefined') {
		narraMapEditor.init();
	}
	if (typeof narraSketchfabEditor !== 'undefined') {
		narraSketchfabEditor.init();
	}

	bindDynamicUiEvents();
}
