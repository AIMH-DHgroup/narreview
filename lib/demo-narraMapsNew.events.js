"use strict";

// Builder events module.
// Owns form <-> event payload mapping, validation, reset, load, and save helpers.

function makeDigObjArray() {
	var arrayResults = [];
	var results = {};
	$("#digobjTable .digobjPreview").each(function () {
		results = {};
		results.url = (decodeURIComponent($(this).attr("data-url")));
		results.title = ($(this).find(".hidden-true-value").text());
		arrayResults.push(results);
	});
	if (Object.keys(results).length > 0) return arrayResults;
	else return "";
}

function getPosition(positionAfter, positionBefore, evid) {
	var pos;
	var positionEvent = $("#positionEvent option");

	if (positionAfter.is(':checked')) {
		pos = switchPositionEvent("after", positionEvent.filter(':selected').val(), evid);
	} else if (positionBefore.is(':checked')) {
		pos = switchPositionEvent("before", positionEvent.filter(':selected').val(), evid);
	} else if (narra.events[evid] != undefined) {
		pos = parseInt(narra.events[evid].position);
	} else {
		pos = nextEventPosition();
	}

	return pos;
}

function makeMapColor(typeInput) {
	var mc;

	if (typeInput.val() == "history" || typeInput.val() == "historical event") {
		mc = "#e6e600";
	} else if (typeInput.val() == "descriptive event") {
		mc = "#0000CD";
	} else if (typeInput.val() == "nature" || typeInput.val() == "natural event") {
		mc = "#2eb82e";
	} else if (typeInput.val() == "value chain" || typeInput.val() == "valorisation event") {
		mc = "#ff9900";
	} else {
		mc = "#a5a5a5";
	}

	return mc;
}

function getImagesAndVideo(evid, imageButton, eventBackImg, eventMedia, eventMediaCaption, eventVideoSelector, eventVideo, eventVideoCaption, videoRadio, fromSaveEvent) {
	var mediaChanged = false;

	eventBackImg = $("#backImgArea").val().trim();
	if ($('#selectEventLocalBackgroundImage').text() != 'Upload image' && fromSaveEvent) {
		mediaChanged = true;
	}
	var localBackgroundImageEvent = $('#backImgInput').prop('files');
	if (localBackgroundImageEvent.length > 0) {
		eventBackImg = "images/" + narra.id_n + "-" + narra.user + "-" + evid + "-SlideBg." + localBackgroundImageEvent[0].type.split("/")[1];
		uploadEventImg(localBackgroundImageEvent[0], evid, "SlideBg");
		$('#backImgArea').val(eventBackImg);
	}

	var eventMediaSelector = $(".eventMedia");

	if (eventMediaSelector.length < 2) {
		if ($("#image-radio").is(':checked')) {
			eventVideoSelector.val('');
			$("#eventVideoCaption").val('');

			eventMedia = $("#eventMedia").val().trim();
			imageButton = $('#selectEventLocalImage').text();

			if (imageButton != 'Upload image' && fromSaveEvent) {
				mediaChanged = true;
			}

			var localImageEvent = $('#eventImageInput').prop('files');
			eventMediaCaption = $("#eventMediaCaption").val().trim();

			if (localImageEvent.length > 0) {
				eventMedia = "images/" + narra.id_n + "-" + narra.user + "-" + evid + "." + localImageEvent[0].type.split("/")[1];
				uploadEventImg(localImageEvent[0], evid);
				$('#eventMedia').val(eventMedia);
			}
		} else {
			eventMedia = "";
			eventMediaCaption = "";
		}
	} else if ($("#image-radio").is(':checked')) {
		eventVideoSelector.val('');
		$("#eventVideoCaption").val('');

		eventMedia = [];
		eventMediaCaption = [];
		var countCaptions = 0;
		eventMediaSelector.each(function (){
			imageButton = $(this).parent().siblings('div.button-image-div').children('button.selectEventLocalImage').text();

			if (imageButton != 'Upload image' && fromSaveEvent) {
				mediaChanged = true;
			}

			var imageEventUrl = $(this).val().trim();
			var localImageEvent = $(this).parent().siblings('input.eventImageInput').prop('files');
			var thisCaption = $(this).parent().parent().parent().siblings(':first').children(':nth-child(2)').val().trim();
			eventMediaCaption.push(thisCaption);

			if (localImageEvent.length > 0) {
				imageEventUrl = "images/" + narra.id_n + "-" + narra.user + "-" + evid + "-" + countCaptions + "." + localImageEvent[0].type.split("/")[1];
				uploadEventImg(localImageEvent[0], evid, countCaptions);
				$(this).val(imageEventUrl);
			}

			eventMedia.push(imageEventUrl);
			countCaptions += 1;
		});
	} else {
		eventMedia = "";
		eventMediaCaption = "";
	}

	if (videoRadio.is(':checked')) {
		eventVideo = eventVideoSelector.val().trim();
		eventVideoCaption = $("#eventVideoCaption").val().trim();
		eventMediaSelector.each(function (){
			$(this).parent().siblings('div.button-image-div').children('button.selectEventLocalImage').text('Upload image');
			$(this).val('');
			$(this).parent().siblings('input.eventImageInput').val('');
			$(this).parent().parent().parent().siblings(':first').children(':nth-child(2)').val('');
		});
	} else {
		eventVideo = "";
		eventVideoCaption = "";
	}

	return [imageButton, eventBackImg, eventMedia, eventMediaCaption, eventVideo, eventVideoCaption, mediaChanged];
}

function getCoords(polygonArea, polygon, lat, long, latitud, longitud) {
	polygon = polygonArea.val().trim();
	lat = latitud.val().trim();
	long = longitud.val().trim();

	if (polygon) {
		lat = '';
		long = '';
	} else {
		polygon = '';
	}

	return [polygon, lat, long];
}

function collectEventFormValues(eventTitle, dateInputStart, dateInputEnd, typeInput, idText, numberText, digobjs, currentFormType) {
	var atonSelectionData = {annotationNumber3DModelCustom: null};
	var sketchfabSelectionData = {annotationNumber3DModel: numberText.val().trim(), annotationNumber3DModelCustom: null};
	var mapSelectionData = {mapZoom: $("#mapZoomInput").val().trim()};
	if (typeof narraAtonEditor !== 'undefined') {
		atonSelectionData = narraAtonEditor.getSelectionData();
	}
	if (typeof narraSketchfabEditor !== 'undefined') {
		sketchfabSelectionData = narraSketchfabEditor.getSelectionData();
	}
	if (typeof narraMapEditor !== 'undefined') {
		mapSelectionData = narraMapEditor.getSelectionData();
	}
	var normalizedFormType = normalizeEventFormType(currentFormType);

	return {
		title: eventTitle.val().trim(),
		start: dateFromString(dateInputStart.val().trim(), false),
		end: dateFromString(dateInputEnd.val().trim(), false),
		type: typeInput.val().trim(),
		description: $("#descArea").val().trim(),
		source: $("#event-source").val().trim(),
		eventPlaceLabel: $("#placeLabel").val().trim(),
		objurl: digobjs,
		sketchfabid: idText.val().trim(),
		annotationNumber3DModel: normalizedFormType === 'Aton' ? numberText.val().trim() : sketchfabSelectionData.annotationNumber3DModel,
		annotationNumber3DModelCustom: normalizedFormType === 'Aton' ? atonSelectionData.annotationNumber3DModelCustom : sketchfabSelectionData.annotationNumber3DModelCustom,
		mapZoom: mapSelectionData.mapZoom
	};
}

function getEffectiveEventFormType(evid, currentFormType) {
	if (narra.events[evid] === undefined) {
		return currentFormType === '' ? 'map' : normalizeEventFormType(currentFormType);
	}

	if (narra.events[evid].formType !== undefined) {
		return normalizeEventFormType(narra.events[evid].formType);
	}

	if (narra.events[evid].Atonid !== undefined && narra.events[evid].Atonid !== '') {
		return 'Aton';
	}

	return 'map';
}

function resetUploadedEventImageButtons() {
	$(".eventMedia").each(function () {
		$(this).parent().siblings('div.button-image-div').children('button.selectEventLocalImage').text('Upload image');
	});
}

function cloneEventValue(value) {
	return value === undefined ? undefined : JSON.parse(JSON.stringify(value));
}

function getEventMediaEntries(eventMedia, eventMediaCaption) {
	var urls = Array.isArray(eventMedia) ? eventMedia : [eventMedia];
	return urls.reduce(function(entries, url, index) {
		if (typeof url !== 'string' || url.trim() === '') {
			return entries;
		}

		entries.push({
			url: url.trim(),
			caption: Array.isArray(eventMediaCaption) ? eventMediaCaption[index] : eventMediaCaption
		});
		return entries;
	}, []);
}

function getPopoverRoleValue($popover) {
	if ($popover.find(".roleInput").hasClass("hidden")) {
		return $popover.find(".roleSelect").val();
	}

	return $popover.find(".roleInput").val();
}

function collectEventProps(evid, trackChangeState) {
	var props = {};
	var propsNotChanged = true;
	var eventExists = evid in narra.events;

	$("#inputDiv .data").each(function () {
		var thisId = $(this).attr("data-id");
		var existingProp = eventExists && thisId in narra.events[evid].props ? narra.events[evid].props[thisId] : undefined;

		if ($(this).attr("aria-describedby") === undefined) {
			if (existingProp !== undefined) {
				props[thisId] = cloneEventValue(existingProp);
			}
			return;
		}

		var $popover = $("#" + $(this).attr("aria-describedby"));
		var radioFilterValue = $popover.find(".radioButtons:checked").val();
		var nextProp = {
			"title": $popover.find("span").first().text(),
			"class": $(this).attr("data-class"),
			"role": getPopoverRoleValue($popover),
			"description": $popover.find(".descArea").val(),
			"notes": $popover.find(".event-source").val(),
			"showOnMap": radioFilterValue
		};

		if (existingProp !== undefined) {
			if (existingProp.primary !== undefined) {
				nextProp.primary = existingProp.primary;
			}
			if (existingProp.secondary !== undefined) {
				nextProp.secondary = existingProp.secondary;
			}
			if (existingProp.notes !== undefined && nextProp.notes === undefined) {
				nextProp.notes = existingProp.notes;
			}
		}

		nextProp = Object.fromEntries(Object.entries(nextProp).filter(function(entry) {
			return entry[1] !== undefined;
		}));

		props[thisId] = nextProp;

		if (trackChangeState) {
			if (!(eventExists) || existingProp === undefined) {
				propsNotChanged = false;
			} else if (radioFilterValue !== existingProp.showOnMap) {
				propsNotChanged = false;
			}

			if (existingProp !== undefined) {
				Object.entries(nextProp).forEach(function(entry) {
					var key = entry[0];
					var value = entry[1];
					if (key != 'showOnMap' && existingProp[key] === undefined) {
						existingProp[key] = value;
					}
				});
			}
		}
	});

	return {props: props, propsNotChanged: propsNotChanged};
}

function collectEventDisplayState(evid, eventVideoSelector, videoRadio, polygonArea, latitud, longitud, fromSaveEvent) {
	var imageButton;
	var eventBackImg;
	var eventMedia;
	var eventMediaCaption;
	var eventVideo;
	var eventVideoCaption;
	var imageState = getImagesAndVideo(evid, imageButton, eventBackImg, eventMedia, eventMediaCaption, eventVideoSelector, eventVideo, eventVideoCaption, videoRadio, fromSaveEvent);
	var coordsState = getCoords(polygonArea, undefined, undefined, undefined, latitud, longitud);

	return {
		imageButton: imageState[0],
		eventBackImg: imageState[1],
		eventMedia: imageState[2],
		eventMediaCaption: imageState[3],
		eventVideo: imageState[4],
		eventVideoCaption: imageState[5],
		mediaChanged: imageState[6],
		polygon: coordsState[0],
		lat: coordsState[1],
		long: coordsState[2]
	};
}

function makeTemp(evid, formValues, props, coords, mediaState, position, mapColor, formType) {
	var t = {
		"_id": evid,
		"_rev": (narra.events[evid] === undefined ? undefined : narra.events[evid]._rev),
		"title": formValues.title,
		"start": formValues.start,
		"end": formValues.end,
		"type": formValues.type,
		"description": formValues.description,
		"source": formValues.source,
		"objurl": formValues.objurl,
		"props": props,
		"eventVideo": mediaState.eventVideo,
		"eventVideoCaption": mediaState.eventVideoCaption,
		"eventMedia": mediaState.eventMedia,
		"eventMediaCaption": mediaState.eventMediaCaption,
		"position": position,
		"formType": formType
	};

	if (formType == "map") {
		t.eventPlaceLabel = formValues.eventPlaceLabel;
		t.latitud = coords.lat;
		t.longitud = coords.long;
		t.polygon = coords.polygon;
		t.mapMarkerColor = mapColor;
		t.mapZoom = formValues.mapZoom;
	} else if (formType == 'sketchfab') {
		t.sketchfabid = formValues.sketchfabid;
		if (formValues.annotationNumber3DModelCustom) {
			t.annotationNumber3DModelCustom = formValues.annotationNumber3DModelCustom;
			delete t.annotationNumber3DModel;
		} else {
			t.annotationNumber3DModel = formValues.annotationNumber3DModel;
			delete t.annotationNumber3DModelCustom;
		}
	} else if (formType == 'Aton') {
		t.Atonid = formValues.sketchfabid;
		if (formValues.annotationNumber3DModelCustom) {
			t.annotationNumber3DModelCustom = formValues.annotationNumber3DModelCustom;
			delete t.annotationNumber3DModel;
		} else {
			t.annotationNumber3DModel = formValues.annotationNumber3DModel;
			delete t.annotationNumber3DModelCustom;
		}
	} else {
		t.backgroundImg = mediaState.eventBackImg;
		t.slidePosition = "";
		t.textBackground = "";
	}

	return t;
}

function buildEventPayloadFromForm(evid, currentFormType, fromSaveEvent) {
	var dateInputStart = $("#dateInputStart");
	var dateInputEnd = $("#dateInputEnd");
	var typeInput = $("#typeInput");
	var eventTitle = $("#eventTitle");
	var idText = $("#id-text");
	var numberText = $("#number-text");
	var eventVideoSelector = $("#eventVideo");
	var videoRadio = $("#video-radio");
	var polygonArea = $("#polygonArea");
	var latitud = $("#latitud");
	var longitud = $("#longitud");
	var positionAfter = $('#positionAfter');
	var positionBefore = $('#positionBefore');
	var propsState = collectEventProps(evid, true);
	var displayState = collectEventDisplayState(evid, eventVideoSelector, videoRadio, polygonArea, latitud, longitud, fromSaveEvent);
	var formValues = collectEventFormValues(eventTitle, dateInputStart, dateInputEnd, typeInput, idText, numberText, makeDigObjArray(), getEffectiveEventFormType(evid, currentFormType));
	var payload = makeTemp(evid, formValues, propsState.props, {polygon: displayState.polygon, lat: displayState.lat, long: displayState.long}, {
		eventBackImg: displayState.eventBackImg,
		eventVideo: displayState.eventVideo,
		eventVideoCaption: displayState.eventVideoCaption,
		eventMedia: displayState.eventMedia,
		eventMediaCaption: displayState.eventMediaCaption
	}, getPosition(positionAfter, positionBefore, evid), makeMapColor(typeInput), getEffectiveEventFormType(evid, currentFormType));

	return {
		propsState: propsState,
		displayState: displayState,
		payload: payload
	};
}

function manageDifferentProperties(event, temp) {
	if (event.hasOwnProperty('location')) {
		temp.location = event.location;
	}
	if (event.hasOwnProperty('media')) {
		var oldMediaUrls = event.media && event.media.url
			? getEventMediaEntries(event.media.url, event.media.caption).map(function(media) { return media.url; })
			: [];
		var oldEventMedia = getEventMediaEntries(event.eventMedia, event.eventMediaCaption);
		var mediaMirrorsEventMedia = oldMediaUrls.some(function(mediaUrl) {
			return oldEventMedia.some(function(media) {
				return media.url === mediaUrl;
			});
		});

		if (mediaMirrorsEventMedia) {
			var newEventMedia = getEventMediaEntries(temp.eventMedia, temp.eventMediaCaption);
			if (newEventMedia.length === 0) {
				delete temp.media;
			} else {
				temp.media = newEventMedia[0];
			}
		} else {
			temp.media = cloneEventValue(event.media);
		}
	}
	if (event.hasOwnProperty('text')) {
		temp.text = event.text;
	}
	if (event.hasOwnProperty('start_date')) {
		temp.start_date = event.start_date;
	}
	if (event.hasOwnProperty('end_date')) {
		temp.end_date = event.end_date;
	}
	if (event.hasOwnProperty('date')) {
		temp.date = event.date;
	}
	if (event.hasOwnProperty('itTitle')) {
		temp.itTitle = event.itTitle;
	}
	if (event.hasOwnProperty('notes')) {
		if (event.notes == "") {
			delete event.notes;
		} else {
			event.source = event.notes;
			delete event.notes;
		}
	}
	if (!event.hasOwnProperty('formType')) {
		event.formType = event.hasOwnProperty('Atonid') && event.Atonid !== '' ? 'Aton' : 'map';
	} else {
		event.formType = normalizeEventFormType(event.formType);
	}
	if (!event.hasOwnProperty('polygon') && (event.formType == "map")) {
		event.polygon = "";
	} else if (event.hasOwnProperty('polygon') && (event.formType != "map")) {
		delete event.polygon;
	}
	if (!event.hasOwnProperty('source')) {
		event.source = "";
	}
	if (!event.hasOwnProperty('eventPlaceLabel') && (event.formType == 'map')) {
		event.eventPlaceLabel = "";
	}
	if (!event.hasOwnProperty('mapZoom') && (event.formType == 'map')) {
		event.mapZoom = "";
		temp.mapZoom = "";
	}
	if (!event.hasOwnProperty('backgroundImg') && (event.formType == 'slide')) {
		event.backgroundImg = "";
	}
	if (!event.hasOwnProperty('slidePosition') && (event.formType == 'slide')) {
		event.slidePosition = "";
		temp.slidePosition = "";
	}
	if (!event.hasOwnProperty('textBackground') && (event.formType == 'slide')) {
		event.textBackground = "";
		temp.textBackground = "";
	}
	if (event.hasOwnProperty('unique_id')) {
		temp.unique_id = event.unique_id;
	}
}

function checkNewChanges() {
	const pattern = /ev/;
	var id = $(this).attr("id");
	var parentId = $(this).parent().attr("id");
	var workspace = $("#workspace");
	var workspaceEvid = workspace.attr("data-evid");
	var propsNotChanged = true;

	if ((pattern.test(workspaceEvid)) || (pattern.test(id)) || (pattern.test(parentId))) {
		try {
			var evid = workspace.attr("data-evid");
			if (!evid) {
				if ((pattern.test(id)) || (pattern.test(parentId))) {
					evid = $(this).attr("id");
				} else {
					return true;
				}
			}
			if (typeof evid === 'undefined') {
				return true;
			}

			if (narra.events[evid] === undefined) {
				return false;
			}
			formType = getEffectiveEventFormType(evid, formType);

			var dateInputStart = $("#dateInputStart");
			var dateInputEnd = $("#dateInputEnd");
			if (!dateInputEnd.val()) {
				dateInputEnd.val(dateInputStart.val());
			}

			var eventBuildState = buildEventPayloadFromForm(evid, formType, false);
			propsNotChanged = eventBuildState.propsState.propsNotChanged;
			var temp = eventBuildState.payload;
			var event = narra.events[evid];

			if (typeof temp._rev === 'undefined') {
				delete temp._rev;
			}
			if (event.hasOwnProperty('date') && event.date == 'NaN-NaN') {
				delete event.date;
			}

			manageDifferentProperties(event, temp);
			return checkChangesFromLastSave(event, temp) && propsNotChanged;
		} catch (error) {
			console.error("An error occurred while checking the event:", error);
			showAlert('failed-checking', 'Error while checking the event!', 'warning', 1200);
		}
	} else {
		return true;
	}
}

function loadEventType(typeString, returnToUI, checkChanges) {
	resetWorkspace();
	displayWorkspace(typeString, returnToUI, checkChanges);
}

function confirmReset() {
	if (!workspaceIsEmpty()) {
		showModal(
			"Clear form",
			"Are you sure you want to clear all the event information?",
			"Cancel",
			"Clear Form",
			function() {},
			function() {
				try {
					resetWorkspace();
					$("#workspace").attr("data-evid", nextEvid());
					showAlert('clear-form', 'Workspace cleared!', 'success');
				} catch (error) {
					console.error("An error occurred while clearing the form:", error);
					showAlert('failed-clear', 'Error, unable to clear form correctly!', 'warning', 1200);
				}
			}
		);
	} else {
		try {
			resetWorkspace();
			$("#workspace").attr("data-evid", nextEvid());
			showAlert('clear-form', 'Workspace cleared!', 'success');
		} catch (error) {
			console.error("An error occurred while clearing the form:", error);
			showAlert('failed-clear', 'Error, unable to clear form correctly!', 'warning', 1200);
		}
	}
}

function resetWorkspace() {
	var latitud = $("#latitud");
	var longitud = $("#longitud");
	var polygonArea = $("#polygonArea");
	var dateInputStart = $("#dateInputStart");
	var dateInputEnd = $("#dateInputEnd");
	var inputDiv = $("#inputDiv");
	var idText = $("#id-text");
	var numberText = $("#number-text");

	$(".spinner").hide();
	$('#eventTitle').val("");

	updateEventTypes();
	updateTitle();

	$("label").css("background-color", function () {
		return getColor($(this).attr("data-class"));
	});
	$(".nav").css("background-color", function () {
		return getColor($(this).attr("data-class"));
	});

	$("#workspace .form-group, #workspace .form-inline, #workspace .input-group, #entitiesDiv, .twitter-typeahead, .radioCoorsLabel").removeClass("has-error");
	$(".radioCoorsLabel").removeClass("has-error-coors");
	latitud.removeClass("has-error-coors");
	longitud.removeClass("has-error-coors");
	polygonArea.removeClass("has-error-coors");
	dateInputStart.removeClass("has-error-date");
	dateInputEnd.removeClass("has-error-date");
	idText.removeClass("has-error-sketch");
	numberText.removeClass("has-error-sketch");

	if (narra.currentLang === "en") {
		inputDiv.empty().css("vertical-align", "middle").append("<div id='inputHelp'>Drop entities here!</div>");
	} else if (narra.currentLang === "it") {
		inputDiv.empty().css("vertical-align", "middle").append("<div id='inputHelp'>Trascina le entità qui!</div>");
	}

	$("#typeInput").val("");
	$("#topicInput").val("");
	$(".dateInput").val("");
	$("#backImgArea").val('');
	$("#eventVideo").val("");
	$("#eventMedia").val("");
	$('#eventVideoCaption').val("");
	$('#eventMediaCaption').val("");

	if ($(".image-caption-group").length > 1) {
		$(".image-caption-group:not(#image-caption-group)").each(function (){
			$(this).remove();
		});
	}

	$(".radioVideoBtn").prop('checked', false);
	$(".radioCoorsBtn").prop('checked', false);
	$("#video-caption-group").css("display", "none");
	$("#image-caption-group, #add-image").css("display", "none");
	$("#backImgInput").val('');
	$("#eventImageInput").val('');
	polygonArea.val('');
	latitud.val('');
	longitud.val('');
	$("#placeLabel").val('');
	$("#selectEventLocalBackgroundImage").text("Upload image");
	$("#selectEventLocalImage").text("Upload image");
	idText.val('');
	numberText.val('');
	document.getElementById("positionBefore").checked = false;
	document.getElementById("positionAfter").checked = false;
	$("#positionEvent").val('');
	$("#coors-map").css("display", "none");
	$("#polygon").css("display", "none");

	dateInputStart.off('click').on('click', function (event) {
		event.stopPropagation();
		if (dateIsValid(dateInputStart.val())) {
			dateInputStart.popover("show");
		}
	});

	dateInputEnd.off('click').on('click', function (event) {
		event.stopPropagation();
		if (dateIsValid(dateInputEnd.val())) {
			dateInputEnd.popover("show");
		}
	});

	$("#descArea").val("");
	$("#event-source").val("");
	$("#digobjInput").val("");
	$("#digobjTitle").val("");
	$("#digobjTable").empty();

	if (typeof narraAtonEditor !== 'undefined') {
		narraAtonEditor.reset();
	}
	if (typeof narraSketchfabEditor !== 'undefined') {
		narraSketchfabEditor.reset();
	}
	if (typeof narraMapEditor !== 'undefined') {
		narraMapEditor.reset();
	}

	inputDiv.droppable({
		drop: function (ignore, ui) {
			var evid = $("#workspace").attr("data-evid");
			var qidK = ui.draggable.attr("data-id");
			var eventTypeText = $('#event-type-text').text();

			if (ui.draggable.attr("data-class") === "place" && eventTypeText == 'Map') {
				var url = "/sparql/narratives/query?query=";
				var queryOSM = url + encodeURIComponent("PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#> PREFIX geo: <http://www.opengis.net/ont/geosparql#> PREFIX osm: <https://www.openstreetmap.org/> PREFIX wd: <http://www.wikidata.org/entity/> PREFIX osm2rdfkey: <https://osm2rdf.cs.uni-freiburg.de/rdf/key#> SELECT ?wkt WHERE { SERVICE <https://qlever.cs.uni-freiburg.de/api/osm-planet> { ?osm_id osm2rdfkey:wikidata wd:"+ qidK +" . ?osm_id geo:hasGeometry ?geometry . ?geometry geo:asWKT ?wkt . } }");

				$.getJSON(queryOSM, function(data) {
					var aria = $("#inputDiv").children(".data[data-id=" + qidK + "]").attr("aria-describedby");
					var radioDiv = $(".popover[id="+ aria + "]").find('#popover-radio-div-' + qidK);
					radioDiv.empty();

					if (data.results.bindings.length > 0) {
						var radioPoint = "";
						var radioPolygon = "";
						var copyTitle = "";
						var copyPoint = "";
						var copyPol = "";

						for (var h=0; h < data.results.bindings.length; h++) {
							if (data.results.bindings[h].wkt.value.toUpperCase().startsWith("POINT")) {
								narra.items[qidK].coordinatesPoint = data.results.bindings[h].wkt.value;
								copyTitle = "<br><h5 class='showEntity-title'>Copy the coordinates to the clipboard</h5>";
								copyPoint = makePointCopyContentMarkup(qidK);

								if (radioPoint == '' && narra.items[qidK].hasOwnProperty('coordinatesPoint')) {
									if (evid in narra.events && qidK in narra.events[evid].props && 'showOnMap' in narra.events[evid].props[qidK]) {
										if (narra.events[evid].props[qidK].showOnMap == 'showPoint') {
											radioPoint += "<input type='radio' id='showEntityPoint" + qidK + "' class='radioButtons' name='show-entity" + qidK + "' value='showPoint' checked='checked'/>" +
												"<label for='showEntityPoint" + qidK + "' id='showEntityPointLabel" + qidK + "' class='radioButtonText radioEntities'>Show point</label><br>";
										} else {
											radioPoint += "<input type='radio' id='showEntityPoint" + qidK + "' class='radioButtons' name='show-entity" + qidK + "' value='showPoint'/>" +
												"<label for='showEntityPoint" + qidK + "' id='showEntityPointLabel" + qidK + "' class='radioButtonText radioEntities'>Show point</label><br>";
										}
									} else {
										radioPoint += "<input type='radio' id='showEntityPoint" + qidK + "' class='radioButtons' name='show-entity" + qidK + "' value='showPoint'/>" +
											"<label for='showEntityPoint" + qidK + "' id='showEntityPointLabel" + qidK + "' class='radioButtonText radioEntities'>Show point</label><br>";
									}
								}
							} else if (data.results.bindings[h].wkt.value.toUpperCase().startsWith("MULTIPOLYGON") || data.results.bindings[h].wkt.value.toUpperCase().startsWith("POLYGON")) {
								narra.items[qidK].coordinatesPolygon = data.results.bindings[h].wkt.value;
								copyTitle = "<br><h5 class='showEntity-title'>Copy the coordinates to the clipboard</h5>";
								copyPol = makePolygonCopyContentMarkup(qidK);
								if (radioPolygon == '' && narra.items[qidK].hasOwnProperty('coordinatesPolygon')) {
									if (evid in narra.events && qidK in narra.events[evid].props && 'showOnMap' in narra.events[evid].props[qidK]) {
										if (narra.events[evid].props[qidK].showOnMap == 'showPol') {
											radioPolygon += "<input type='radio' id='showEntityPolygon" + qidK + "' class='radioButtons' name='show-entity" + qidK + "' value='showPol' checked='checked'/>" +
												"<label for='showEntityPolygon" + qidK + "' id='showEntityPolygonLabel" + qidK + "' class='radioButtonText radioEntities'>Show polygon</label><br>";
										} else {
											radioPolygon += "<input type='radio' id='showEntityPolygon" + qidK + "' class='radioButtons' name='show-entity" + qidK + "' value='showPol'/>" +
												"<label for='showEntityPolygon" + qidK + "' id='showEntityPolygonLabel" + qidK + "' class='radioButtonText radioEntities'>Show polygon</label><br>";
										}
									} else {
										radioPolygon += "<input type='radio' id='showEntityPolygon" + qidK + "' class='radioButtons' name='show-entity" + qidK + "' value='showPol'/>" +
											"<label for='showEntityPolygon" + qidK + "' id='showEntityPolygonLabel" + qidK + "' class='radioButtonText radioEntities'>Show polygon</label><br>";
									}
								}
							}
						}

						if (!radioPoint && narra.items[qidK].hasOwnProperty('coordinatesPoint')) {
							if (evid in narra.events && qidK in narra.events[evid].props && narra.events[evid].props[qidK].showOnMap == 'showPoint') {
								radioPoint += "<input type='radio' id='showEntityPoint" + qidK + "' class='radioButtons' name='show-entity" + qidK + "' value='showPoint' checked='checked'/>" +
									"<label for='showEntityPoint" + qidK + "' id='showEntityPointLabel" + qidK + "' class='radioButtonText radioEntities'>Show point</label><br>";
							} else {
								radioPoint += "<input type='radio' id='showEntityPoint" + qidK + "' class='radioButtons' name='show-entity" + qidK + "' value='showPoint'/>" +
									"<label for='showEntityPoint" + qidK + "' id='showEntityPointLabel" + qidK + "' class='radioButtonText radioEntities'>Show point</label><br>";
							}
							copyPoint = makePointCopyContentMarkup(qidK);
						}
						if (!radioPolygon && narra.items[qidK].hasOwnProperty('coordinatesPolygon')) {
							if (evid in narra.events && qidK in narra.events[evid].props && narra.events[evid].props[qidK].showOnMap == 'showPol') {
								radioPolygon += "<input type='radio' id='showEntityPolygon" + qidK + "' class='radioButtons' name='show-entity" + qidK + "' value='showPol' checked='checked'/>" +
									"<label for='showEntityPolygon" + qidK + "' id='showEntityPolygonLabel" + qidK + "' class='radioButtonText radioEntities'>Show polygon</label><br>";
							} else {
								radioPolygon += "<input type='radio' id='showEntityPolygon" + qidK + "' class='radioButtons' name='show-entity" + qidK + "' value='showPol'/>" +
									"<label for='showEntityPolygon" + qidK + "' id='showEntityPolygonLabel" + qidK + "' class='radioButtonText radioEntities'>Show polygon</label><br>";
							}
							copyPol = makePolygonCopyContentMarkup(qidK);
						}

						if (evid in narra.events && qidK in narra.events[evid].props && 'showOnMap' in narra.events[evid].props[qidK] && narra.events[evid].props[qidK].showOnMap == 'showNothing') {
							radioDiv.append("<h5 class='showEntity-title'>Visual filter on the map</h5>" +
								"<div class='form-group'>" + radioPoint + radioPolygon +
								"<input type='radio' id='showEntityNothing" + qidK + "' class='radioButtons' name='show-entity" + qidK + "' value='showNothing' checked='checked'/>" +
								"<label for='showEntityNothing" + qidK + "' class='radioButtonText radioEntities'>Show nothing</label><br>" +
								"<br><h5 class='showEntity-title'>Copy the coordinates to the clipboard</h5>" + copyPoint + copyPol);
						} else if (radioPoint != '' || radioPolygon != '') {
							radioDiv.append("<h5 class='showEntity-title'>Visual filter on the map</h5>" +
								"<div class='form-group'>" + radioPoint + radioPolygon +
								"<input type='radio' id='showEntityNothing" + qidK + "' class='radioButtons' name='show-entity" + qidK + "' value='showNothing'/>" +
								"<label for='showEntityNothing" + qidK + "' class='radioButtonText radioEntities'>Show nothing</label><br>");
						} else {
							radioDiv.append("<h5 class='showEntity-title'>Visual filter on the map</h5>" +
								"<div class='form-group'><p class='no-coords-popover'>No coordinates found.</p></div>");
						}

						if ((!(evid in narra.events) || !(qidK in narra.events[evid].props) || !('showOnMap' in narra.events[evid].props[qidK]) || (narra.events[evid].props[qidK].showOnMap == undefined)) && (radioPoint != '' || radioPolygon != '')) {
							radioDiv.append("<br><h5 class='showEntity-title'>Copy the coordinates to the clipboard</h5>" + copyPoint + copyPol + "</div>");
						} else {
							radioDiv.append("</div>");
						}

						saveObjectToDB(narra.items, qidK);
					} else {
						radioDiv.append("<h5 class='showEntity-title'>Visual filter on the map</h5><div class='form-group'><p class='no-coords-popover'>No coordinates found.</p></div>");
					}

					$(function () {
						$.fn.popover.Constructor.prototype.reposition = function () {
							var $tip = this.tip();
							var placement = typeof this.options.placement === 'function' ? this.options.placement.call(this, $tip[0], this.$element[0]) : this.options.placement;
							var pos = this.getPosition();
							var actualWidth = $tip[0].offsetWidth;
							var actualHeight = $tip[0].offsetHeight;
							var orgPlacement = placement;
							var viewportDim = this.getPosition(this.$viewport);
							placement = placement === 'bottom' && pos.bottom + actualHeight > viewportDim.bottom ? 'top' : placement === 'top' && pos.top - actualHeight < viewportDim.top ? 'bottom' : placement === 'right' && pos.right + actualWidth > viewportDim.width ? 'left' : placement === 'left' && pos.left - actualWidth < viewportDim.left ? 'right' : placement;
							$tip.removeClass(orgPlacement).addClass(placement);
							var calculatedOffset = this.getCalculatedOffset(placement, pos, actualWidth, actualHeight);
							this.applyPlacement(calculatedOffset, placement);
						};

						$(".popover[id="+ aria + "]").popover('reposition');
					});
				}).fail(function() { console.log("OSM Query error"); });
			}

			ui.helper.data("dropped", true);
			$(this).parents('.form-group, .form-inline, #entitiesDiv, .twitter-typeahead').removeClass("has-error");
			$(this).css("vertical-align", "top");
			$("#inputHelp").hide();
			if ($("#inputDiv .data[data-id=" + ui.draggable.attr("data-id") + "]").length === 0) {
				var $drag = ui.draggable.clone();
				makeDraggable($drag);
				$drag.popover("destroy");
				addPopoverTo($drag, true);
				$drag.mousedown(function () {
					$(".popover:not([attr=" + $(this).attr("data-id") + "])").hide();
				});
				$(this).append($drag.css("opacity", 1));
				updateDataText($drag, narra.currentLang);
				$drag.click();
				$drag.focus();
				showPopoverForDiv($drag);
			}
		},
		out: function () {
			$(this).text($(this).attr("data-default"));
		}
	});

	$('.optionSel').show();
	$("#markerMapColor").val("#a5a5a5");

	var textareas = document.getElementsByTagName('textarea');
	for (var elem of textareas) {
		setTextareaHeight(elem);
	}
}

function deleteEvent(evid) {
	var title = narra.events[evid].title;
	showModal(
		"Delete Event",
		"Are you sure you want to delete the event \"" + title + "\"?",
		"Keep Event",
		"Delete Event",
		function() {},
		function() {
			$("#" + evid).remove();
			delete narra.events[evid];
			deleteObjectFromDB(evid);
			fixPositionAfterSwitch();
			createHTMLSelect();
			showAlert('delete-event', 'Event deleted successfully!', 'success');
		}
	);
}

function clearAllHasError(eventTitle, dateInputStart, dateInputEnd, latitud, longitud, polygonArea, inputDiv, idText, numberText, eventVideoSelector) {
	$("#positionEvent").parents('.form-group, .form-inline').removeClass("has-error");
	eventTitle.parents('.form-group, .form-inline').removeClass("has-error");
	dateInputStart.removeClass("has-error-date");
	dateInputEnd.removeClass("has-error-date");
	latitud.removeClass("has-error-coors");
	longitud.removeClass("has-error-coors");
	polygonArea.removeClass("has-error-coors");
	inputDiv.parents('.form-control').removeClass("has-error");
	inputDiv.removeClass("has-error-input-div");
	$('.radioCoorsLabel').removeClass("has-error-coors");
	idText.removeClass('has-error-sketch');
	numberText.removeClass('has-error-sketch');
	eventVideoSelector.parent('.video-label-group').removeClass('has-error');
}

function saveEvent(data, defaultEvent=false) {
	try {
		function isFloat(value) {
			return /\d+\.\d+/.test(value);
		}

		var evid = $("#workspace").attr("data-evid");
		if (!evid) {
			evid = nextEvid();
		}

		var nothingChanged = true;

		if (data == undefined) {
			var missingData = false;
			var positionAfter = $('#positionAfter');
			var positionBefore = $('#positionBefore');
			var eventTitle = $("#eventTitle");
			var dateInputEnd = $("#dateInputEnd");
			var dateInputStart = $("#dateInputStart");
			var latitud = $("#latitud");
			var longitud = $("#longitud");
			var polygonArea = $("#polygonArea");
			var typeInput = $("#typeInput");
			var inputDiv = $("#inputDiv");
			var eventVideoSelector = $("#eventVideo");
			var idText = $("#id-text");
			var numberText = $("#number-text");

			if (positionAfter.is(':checked') || positionBefore.is(':checked')) {
				if ($('#positionEvent option').filter(':selected').val() == "empty") {
					$("#positionEvent").parents('.form-group, .form-inline').addClass("has-error");
					missingData = true;
				}
			}

			if (!eventTitle.val()) {
				eventTitle.parents('.form-group, .form-inline').addClass("has-error");
				missingData = true;
			}

			if (!dateInputEnd.val()) {
				dateInputEnd.val(dateInputStart.val());
			}
			if (!dateIsValid(dateInputStart.val()) && dateInputStart.val() != '') {
				dateInputStart.addClass("has-error-date");
				missingData = true;
			}
			if (!dateIsValid(dateInputEnd.val(), true) && dateInputEnd.val() != '') {
				dateInputEnd.addClass("has-error-date");
				missingData = true;
			}

			if (!typeInput.val()) {
				typeInput.val("no type");
			}

			if (formType == 'map') {
				if (polygonArea.val().trim()) {
					if (polygonArea.val().trim().indexOf('POLYGON') !== 0 && polygonArea.val().trim().indexOf('MULTIPOLYGON') !== 0) {
						polygonArea.addClass("has-error-coors");
						missingData = true;
					}
				} else if (latitud.val().trim() || longitud.val().trim()) {
					if (!latitud.val().trim() || !isFloat(latitud.val().trim()) || isNaN(latitud.val().trim())) {
						latitud.addClass("has-error-coors");
						missingData = true;
					}
					if (!longitud.val().trim() || !isFloat(longitud.val().trim()) || isNaN(longitud.val().trim())) {
						longitud.addClass("has-error-coors");
						missingData = true;
					}
				} else if (typeof narraMapEditor !== 'undefined' && !narraMapEditor.hasEventGeometry()) {
					polygonArea.addClass("has-error-coors");
					missingData = true;
				}
			}

			if (inputDiv.find(".data").length === 0) {
				inputDiv.parents('.form-control').addClass("has-error");
				inputDiv.addClass("has-error-input-div");
				missingData = true;
			}

			if (isThreeDModelFormType(formType)) {
				if (!idText.val()) {
					idText.addClass('has-error-sketch');
					missingData = true;
				}
				if (formType == 'sketchfab' && isNaN(numberText.val())) {
					var sketchfabSelectionData = typeof narraSketchfabEditor !== 'undefined' ? narraSketchfabEditor.getSelectionData() : null;
					if (sketchfabSelectionData && sketchfabSelectionData.annotationNumber3DModelCustom) {
						// free camera selection is valid for Sketchfab events
					} else {
						numberText.addClass('has-error-sketch');
						missingData = true;
					}
				}
				if (formType == 'Aton' && !numberText.val().trim()) {
					var atonSelectionData = typeof narraAtonEditor !== 'undefined' ? narraAtonEditor.getSelectionData() : null;
					if (atonSelectionData && atonSelectionData.annotationNumber3DModelCustom) {
						// free camera selection is valid for ATON events
					} else {
					numberText.addClass('has-error-sketch');
					missingData = true;
					}
				}
			}

			var videoURL = eventVideoSelector.val();
			var videoRadio = $("#video-radio");
			if (videoURL.indexOf('https://www.youtube.com/watch?') == -1 && videoRadio.is(':checked')) {
				eventVideoSelector.parent('.video-label-group').addClass('has-error');
				missingData = true;
			}

			if (missingData) {
				showAlert('failed-form', 'Error, event not saved correctly!', 'warning', 1000);
				return undefined;
			}

			var digobjs = makeDigObjArray();
			if (digobjs.length == 1 && typeof digobjs[0] === "string") {
				showAlert('old-digobj-warning', 'Warning: Digital Object seems to be from an older version. Please ensure that each Digital Object has both title and URL.', 'warning', 2500);
				return undefined;
			}

			var eventBuildState = buildEventPayloadFromForm(evid, formType, true);
			var propsState = eventBuildState.propsState;
			nothingChanged = nothingChanged && propsState.propsNotChanged;
			var displayState = eventBuildState.displayState;
			nothingChanged = nothingChanged && !displayState.mediaChanged;
			var temp = eventBuildState.payload;
			var event = narra.events[evid];

			if (event == undefined) {
				nothingChanged = false;
				narra.events[evid] = temp;
			} else {
				if (typeof temp._rev === 'undefined') {
					delete temp._rev;
				}
				manageDifferentProperties(event, temp);
				if ((!checkChangesFromLastSave(event, temp)) || (!nothingChanged)) {
					nothingChanged = false;
					narra.events[evid] = temp;
					resetUploadedEventImageButtons();
				} else {
					dateInputEnd.parents('.form-group, .form-inline').removeClass("has-error");
				}
			}
		} else {
			narra.events[evid] = data;
			narra.events[evid]._id = evid;
		}

		if (!nothingChanged) {
			saveObjectToDB(narra.events, evid);
			$(".popover").hide();
			$(".popover").remove();
			$("#markerMapColor").val("#a5a5a5");
			fixPositionAfterSwitch();

			var inputDiv = $("#inputDiv");
			if (narra.currentLang === "en") {
				inputDiv.empty().css("vertical-align", "middle");
			} else if (narra.currentLang === "it") {
				inputDiv.empty().css("vertical-align", "middle");
			}

			var itemsToAdd = [];
			for (var prop in narra.events[evid].props) {
				(function (){
					if (prop in narra.items && $("#inputDiv .data[data-id=" + prop + "]").length === 0) {
						try {
							var $drag = $(makeDataDiv(prop));
							makeDraggable($drag);
							addPopoverTo($drag, true, evid);
							$drag.mousedown(function () {
								$(".popover:not([attr=" + $drag.attr("data-id") + "])").hide();
							});
							itemsToAdd.push($drag);
						} catch (e) {
							console.log(currentTime() + "TypeError: " + e + " " + narra.items[prop]);
						}
					}
				})();
			}
			itemsToAdd.sort(sortByClass);
			$(itemsToAdd).each(function ($i, $item){$("#inputDiv").append($item); updateDataText($item, narra.currentLang);});
			showAlert('saved-form', 'Event saved successfully!', 'success');
		} else if (!defaultEvent) {
			showAlert("nothing-changed", 'No changes made since last save.', 'warning');
		}

		if (!defaultEvent) {
			clearAllHasError(eventTitle, dateInputStart, dateInputEnd, latitud, longitud, polygonArea, inputDiv, idText, numberText, eventVideoSelector);
		}

		createHTMLSelect();
		return evid;
	} catch (error) {
		console.error("An error occurred while saving the event:", error);
		showAlert('failed-form', 'Error, event not saved correctly!', 'warning', 1000);
	}
}

function deleteEventTimelineElementHandler(evid) {
	return function(e) {
		e.stopPropagation();
		deleteEvent(evid);
	};
}

function initializeTimelineSortable() {
	var timeline = $("#timeline");
	if (timeline.length === 0 || timeline.hasClass("withArrows")) {
		return;
	}

	if (timeline.data("ui-sortable")) {
		timeline.sortable("destroy");
	}

	timeline.sortable({
		items: "> .timelineEvent",
		axis: "y",
		containment: "parent",
		tolerance: "pointer",
		helper: function(event, item) {
			var $helper = item.clone();
			$helper.width(item.outerWidth());
			$helper.addClass("timelineEventDragHelper");
			return $helper;
		},
		placeholder: "timelineEventPlaceholder",
		forcePlaceholderSize: true,
		start: function(event, ui) {
			ui.item.data("initial-index", ui.item.index());
			ui.placeholder.height(ui.item.outerHeight());
		},
		stop: function(event, ui) {
			var initialIndex = ui.item.data("initial-index");
			var newIndex = ui.item.index();
			if (initialIndex === newIndex) {
				return;
			}

			ui.item.data("skipClick", true);
			persistTimelineOrder();
		}
	});
}

function persistTimelineOrder() {
	$("#timeline .timelineEvent").each(function(index) {
		var evid = $(this).attr("id");
		if (!evid || !(evid in narra.events)) {
			return;
		}

		var nextPosition = index + 1;
		if (parseInt(narra.events[evid].position) !== nextPosition) {
			narra.events[evid].position = nextPosition;
			saveObjectToDB(narra.events, evid);
		}

		$(this).attr("position", nextPosition);
	});

	createHTMLSelect();
	showAlert('reordered-events', 'Events reordered successfully!', 'success');
}

function displayAllEvents() {
	var timeline = document.createElement("div");
	timeline.setAttribute("id", "timeline");
	timeline.setAttribute("class", "js-hide-popovers");

	timeline.addEventListener("click", function() {
		$('.popover').hide();
	});

	Object.keys(narra.events).forEach(function (evid) {
		if (narra.events[evid] !== undefined) {
			var data = narra.events[evid];
			var eventDiv = document.createElement("div");
			eventDiv.setAttribute("id", evid);
			eventDiv.setAttribute("class", "timelineEvent");
			eventDiv.setAttribute("data-start", data["start"]);
			eventDiv.setAttribute("data-end", data["end"]);
			eventDiv.setAttribute("position", data["position"]);

			var deleteX = document.createElement("b");
			deleteX.setAttribute("class", "x");
			deleteX.textContent = "×";

			var deleteButton = document.createElement("div");
			deleteButton.setAttribute("class", "deleteButton");
			deleteButton.appendChild(deleteX);

			var titleHeading = document.createElement("span");
			titleHeading.setAttribute("class", "titleHeading");
			titleHeading.textContent = data["title"];

			eventDiv.appendChild(deleteButton);
			eventDiv.appendChild(titleHeading);

			if (!isThreeDModelFormType(narra.events[evid]["formType"])) {
				var dateHeading = document.createElement("h4");
				dateHeading.setAttribute("class", "dateHeading");
				dateHeading.textContent = dateInterval(data["start"], data["end"]);
				eventDiv.appendChild(dateHeading);
			}

			deleteButton.addEventListener("click", deleteEventTimelineElementHandler(evid));
			eventDiv.addEventListener("click", function() {
				confirmEventLoad(evid);
			});

			timeline.appendChild(eventDiv);
		}
	});

	timeline = sortEventsByPosition(timeline);

	var container = document.getElementById("sidebar");
	container.replaceChild(timeline, document.getElementById("timeline"));
	initializeTimelineSortable();

	return true;
}

function displayEvent(data, evid) {
	var position;
	if (narra.events[evid] != undefined) {
		position = narra.events[evid].position;
	} else {
		position = nextEventPosition();
	}

	$("#" + evid).remove();
	if (evid === undefined) return false;

	var $eventDiv = $("<div class='timelineEvent'>")
	.attr("id", evid)
	.click(function (){
		if ($(this).data("skipClick")) {
			$(this).removeData("skipClick");
			return;
		}
		confirmEventLoad($(this).attr("id"));
	})
	.append(
		$("<div class='deleteButton'>").append("<b class='x'>×</b>").click(function (e) {
			e.stopPropagation(); deleteEvent(evid);
		}),
		$("<span class='titleHeading'>"),
		$("<h4 class='dateHeading'>")
	);

	var dateInputStart = $("#dateInputStart");
	var dateInputEnd = $("#dateInputEnd");

	if (data == undefined) {
		$eventDiv.find(".titleHeading").text($("#eventTitle").val());
		$eventDiv.find(".dateHeading").text(dateInterval(dateInputStart.val(), dateInputEnd.val()));
		if (!isThreeDModelFormType(formType)) {
			$eventDiv.attr("data-start", dateFromString(dateInputStart.val(), false));
			$eventDiv.attr("data-end", dateFromString(dateInputEnd.val(), false));
		}
		$eventDiv.attr("position", position);
	} else {
		$eventDiv.find(".titleHeading").html(data["title"]);
		if (data["start"] != data["end"]) $eventDiv.find("h4").text(data["start"] + " – " + data["end"]);
		else $eventDiv.find(".dateHeading").text(dateInterval(data["start"], data["end"]));
		$eventDiv.attr("data-start", data["start"]);
		$eventDiv.attr("data-end", data["end"]);
		$eventDiv.attr("position", data["position"]);
	}

	$("#ev" + evid).remove();
	$("#timeline").append($eventDiv);
	if ($("#workspace").css("display") !== "none" && $("#workspace").attr("data-evid") === evid) {
		setCurrentTimelineEvent(evid);
	}
	$eventDiv.find(".data").each(function () {
		updateDataText($(this), narra.currentLang);
	});

	sortEventsByPosition();
	initializeTimelineSortable();
	return true;
}

function workspaceIsEmpty() {
	var eventMedia = $(".eventMedia");

	if (eventMedia.length < 2) {
		if ($("#eventTitle").val().trim() || $("#dateInputStart").val().trim() || $("#dateInputEnd").val().trim() || $("#typeInput").val().trim() || $("#inputDiv").find(".data").length > 0 || $("#descArea").val().trim() || $("#eventVideo").val().trim() || $("#eventVideoCaption").val().trim() || $("#eventMedia").val().trim() || $("#eventMediaCaption").val().trim() || $("#event-source").val().trim() || $("#digobjInput").val().trim()) return false;
	} else {
		var valueFound = false;
		if ($("#eventTitle").val().trim() || $("#dateInputStart").val().trim() || $("#dateInputEnd").val().trim() || $("#typeInput").val().trim() || $("#inputDiv").find(".data").length > 0 || $("#descArea").val().trim() || $("#event-source").val().trim() || $("#digobjInput").val().trim()) return false;
		eventMedia.each(function () {
			if ($(this).val().trim()) {
				valueFound = true;
			}
		});
		$(".eventMediaCaption").each(function () {
			if ($(this).val().trim()) {
				valueFound = true;
			}
		});
		if (valueFound) {
			return false;
		}
	}

	return true;
}

function ensureEventMediaDefaults(event) {
	if (!event.hasOwnProperty('eventVideo')) {
		event.eventVideo = "";
		event.eventVideoCaption = "";
	}

	if (!event.hasOwnProperty('eventMedia')) {
		event.eventMedia = "";
		event.eventMediaCaption = "";
	}
}

function applyCommonEventFieldsToForm(event) {
	$("#eventTitle").val(event.title);
	$(".dateInput").css("color", "#555");
	$("#dateInputStart").val(dateFromString(event.start, true));
	$("#dateInputEnd").val(dateFromString(event.end, true));
	$("#typeInput").val(event.type);
	$("#topicInput").val(event.topic);
	$("#descArea").val(event.description);
	$("#event-source").val(event.source);
	$("#backImgArea").val(event.backgroundImg);
	$("#latitud").val(event.latitud);
	$("#longitud").val(event.longitud);
	$("#polygonArea").val(event.polygon);
	$("#placeLabel").val(event.eventPlaceLabel);
	$("#markerMapColor").val(event.mapMarkerColor);
	$("#id-text").val(event.sketchfabid || event.Atonid || '');
	$("#number-text").val(event.annotationNumber3DModel);
}

function applyMapEventFieldsToForm(event) {
	if (event.formType != "map") {
		return;
	}
	$("#coors-map").css("display", "none");
	$("#polygon").css("display", "none");
}

function applyEventMediaToForm(event) {
	ensureEventMediaDefaults(event);

	if (getEventMediaEntries(event.eventMedia, event.eventMediaCaption).length === 0
		&& event.media && event.media.url) {
		if (Array.isArray(event.media.url)) {
			event.eventMedia = event.media.url;
			event.eventMediaCaption = Array.isArray(event.media.caption)
				? event.media.caption
				: event.media.url.map(function() { return event.media.caption || ""; });
		} else {
			event.eventMedia = event.media.url;
			event.eventMediaCaption = Array.isArray(event.media.caption)
				? (event.media.caption[0] || "")
				: (event.media.caption || "");
		}
	}

	$("#eventVideo").val(event.eventVideo);
	$("#eventVideoCaption").val(event.eventVideoCaption);

	if ((event.eventVideo != "") || (event.eventVideoCaption != "")) {
		$("#video-caption-group").css("display", "block");
		$("#video-radio").prop("checked", true);
	} else {
		$("#video-caption-group").css("display", "none");
	}

	if ((event.eventMedia != "") || (event.eventMediaCaption != "")) {
		if (typeof event.eventMedia === "string") {
			$("#eventMedia").val(event.eventMedia);
			$("#eventMediaCaption").val(event.eventMediaCaption);
		} else {
			$("#eventMedia").val(event.eventMedia[0]);
			$("#eventMediaCaption").val(event.eventMediaCaption[0]);
			for (var i = 1; i < event.eventMedia.length; i++) {
				addImageGroup(true, event.eventMedia[i], event.eventMediaCaption[i]);
			}
		}

		$(".image-caption-group").each(function() {
			$(this).css("display", "table");
		});

		$("#add-image").css("display", "flex");
		$("#image-radio").prop("checked", true);
	}
}

function loadEventDigitalObjects(event) {
	if ($.type(event.objurl) === "array" && $.type(event.objurl[0]) === "object") {
		for (var i = 0; i < event.objurl.length; i++) {
			addDigitalObject(event.objurl[i].url, event.objurl[i].title);
		}
	} else if ($.type(event.objurl) === "array") {
		$(event.objurl).each(function() {
			addDigitalObject(this, "", true);
		});
	} else if ($.type(event.objurl) === "string") {
		addDigitalObject(event.objurl, "", true);
	}
}

function confirmEventLoad(evid) {
	if ((!workspaceIsEmpty()) && (!checkNewChanges())) {
		showModal(
			"Load event",
			"If you load this event you will lose the event information that you have inserted.\nAre you sure to proceed?",
			"Cancel",
			"Load event",
			function() {},
			function() {
				resetWorkspace();
				loadEvent(evid);
				showAlert('load-event', 'Event loaded successfully!', 'success');
			}
		);
	} else {
		resetWorkspace();
		loadEvent(evid);
		showAlert('load-event', 'Event loaded successfully!', 'success');
	}
}

function setCurrentTimelineEvent(evid) {
	$("#timeline .timelineEvent").removeClass("timelineEvent--current");
	if (evid) {
		$("#timeline .timelineEvent").filter(function() {
			return $(this).attr("id") === evid;
		}).addClass("timelineEvent--current");
	}
}

function loadEvent(evid) {
	var event = narra.events[evid];

	if (event["polygon"] === undefined) {
		event["polygon"] = "";
	}

	if (event["formType"] === undefined) {
		if (((event["latitud"] != "") || (event["longitud"] != "")) || ((event["polygon"] != ""))) {
			formType = "map";
		} else if (event["Atonid"] !== undefined && event["Atonid"] !== '') {
			formType = 'Aton';
		} else {
			formType = "slide";
		}
		event["formType"] = formType;
	} else {
		formType = normalizeEventFormType(event["formType"]);
		event["formType"] = formType;
	}

	$('.optionSel').show();
	$('#optionSel' + evid).hide();
	$(".popover").remove();
	$('#eventTitle').attr("placeholder", "");
	updateEventTypes();
	$("#workspace").attr("data-evid", evid);
	setCurrentTimelineEvent(evid);
	loadEventType(formType, true, true);

	var addButton = $("#addButton");
	var inputDiv = $("#inputDiv");
	if (addButton.hasClass("add-button-active")) {
		addButton.toggleClass("add-button-active");
	}

	inputDiv.empty();
	inputDiv.css("vertical-align", "top");
	applyCommonEventFieldsToForm(event);
	applyMapEventFieldsToForm(event);
	applyEventMediaToForm(event);
	loadEventDigitalObjects(event);
	if (typeof narraMapEditor !== 'undefined') {
		narraMapEditor.loadFromEvent(event);
	}
	if (typeof narraSketchfabEditor !== 'undefined') {
		narraSketchfabEditor.loadFromEvent(event);
	}
	if (typeof narraAtonEditor !== 'undefined') {
		narraAtonEditor.loadFromEvent(event);
	}

	var itemsToAdd = [];
	for (var prop in event.props) {
		(function (){
			if (prop in narra.items && $("#inputDiv .data[data-id=" + prop + "]").length === 0) {
				try {
					var $drag = $(makeDataDiv(prop));
					makeDraggable($drag);
					addPopoverTo($drag, true, evid);
					$drag.mousedown(function () {
						$(".popover:not([attr=" + $drag.attr("data-id") + "])").hide();
					});
					itemsToAdd.push($drag);
				} catch (e) {
					console.log(currentTime() + "TypeError: " + e + " " + narra.items[prop]);
				}
			}
		})();
	}
	itemsToAdd.sort(sortByClass);
	$(itemsToAdd).each(function ($i, $item){$("#inputDiv").append($item); updateDataText($item, narra.currentLang);});
	if (typeof narraMapEditor !== 'undefined') {
		narraMapEditor.refreshAfterEntityLoad();
		window.setTimeout(function() {
			narraMapEditor.refreshAfterEntityLoad();
		}, 180);
		window.setTimeout(function() {
			narraMapEditor.refreshAfterEntityLoad();
		}, 420);
	}

	var textareas = document.getElementsByTagName('textarea');
	for (var elem of textareas) {
		setTextareaHeight(elem);
	}

	$("#eventSearch").val("");
	$("#timeline .timelineEvent").show();
}

function dateInterval(start, end) {
	start = dateFromString(start, true);
	end = dateFromString(end, true);
	if (start != end) return start + " – " + end;
	else return start;
}

function fixYear(date, year) {
	date.setFullYear(year);
	return date;
}

function parseDate(d) {
	if (d.constructor === String) {
		d = d.split('-');
	}
	if (d.constructor === Array) {
		if (d[0] === "") {
			d = d.splice(1);
			d[0] = '-' + d[0];
		}
		if (d.length === 1) {
			d[1] = 1;
		}
		if (d.length === 2) {
			d[2] = 1;
		}
	}
	return (
		d.constructor === Date ? d :
		d.constructor === Array ? fixYear(new Date(d[0], d[1]-1, d[2]), d[0]) :
		d.constructor === Number ? fixYear(new Date(d, 0, 1), d) :
		typeof d === "object" ? new Date(d.year,d.month,d.date) :
		NaN
	);
}

function dateFromString(string, yearLast) {
	string = string.toString();
	if (string !== undefined) {
		var date;
		var splits = [];
		if (splits.length < 2) splits = string.split("-");
		if (splits.length < 2) splits = string.split("/");
		if (splits.length < 2) splits = string.split(".");
		for (var i = 0; i < splits.length; i++) {
			if (splits[i] && splits[i].length < 2) splits[i] = "0" + splits[i];
		}
		if (!yearLast && splits.indexOf(Math.max.apply(this, splits).toString()) === 2) date = splits.reverse().join("-");
		else if (yearLast && splits.indexOf(Math.max.apply(this, splits).toString()) === 0) date = splits.reverse().join("-");
		else date = splits.join("-");
		return date;
	}
	return "";
}

function incorrectFormatDate(dateInput) {
	var regex_dd_mm_yyyy = /^(0[1-9]|[12][0-9]|3[01])-(0[1-9]|1[0-2])-\d{1,4}$/;
	var regex_yyyy = /^\d{1,4}$/;
	var regex_mm_dd_yyyy = /^(0[1-9]|1[0-2])-(0[1-9]|[12][0-9]|3[01])-\d{1,4}$/;
	var regex_negative_yyyy = /^-\d{1,4}$/;
	var regex_yyyy_mm_dd = /^\d{1,4}-(0[1-9]|1[0-2])-(0[1-9]|[12][0-9]|3[01])$/;
	var regex_yyyy_dd_mm = /^\d{1,4}-(0[1-9]|[12][0-9]|3[01])-(0[1-9]|1[0-2])$/;

	return !regex_dd_mm_yyyy.test(dateInput) && !regex_yyyy.test(dateInput) && !regex_mm_dd_yyyy.test(dateInput) && !regex_negative_yyyy.test(dateInput) && !regex_yyyy_mm_dd.test(dateInput) && !regex_yyyy_dd_mm.test(dateInput);
}

function dateIsValid(date, checkConsistency=false) {
	date = dateFromString(date, false);
	if (!isNaN(Date.parse(date))) {
		if (incorrectFormatDate(date)) {
			return false;
		}
	} else {
		return false;
	}
	return !(checkConsistency && !checkTemporalConsistency(date));
}

function checkTemporalConsistency(dateEnd) {
	var dateStart = dateFromString($("#dateInputStart").val(), false);
	return dateEnd >= dateStart;
}
