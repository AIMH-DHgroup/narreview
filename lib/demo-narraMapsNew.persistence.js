"use strict";

// Builder persistence module.
// Owns server-backed narrative/object save, publish, upload, and OWL helpers.

// Update title of narrative
function updateTitle() {
	var title = $('meta[name=subjectName]').attr("content");
	$(document).prop("title", title);

	apiJsonRequest({
		type: "GET",
		url: API.narrationTitle,
		data: getNarrativeRequestData({firstTitle:narra.items[narra.subjectID].enName}),
		success: function(resp) {
			if (resp.title == "") {
				$("#bigName").text(titlecase(narra.items[narra.subjectID].enName));
				console.log(titlecase(narra.items[narra.subjectID].enName));
				$("#page-title").text( "SMBVT - No narration title");
				$(".activeMenu a").text(titlecase(narra.items[narra.subjectID].enName));
				narra.info.name = titlecase(narra.items[narra.subjectID].enName);
			} else {
				$("#bigName").text(resp.title);
				$("#page-title").text( "SMBVT - " +  resp.title);
				$(".activeMenu a").text(resp.title);
				narra.info.name = resp.title;
			}
		},
		error: logAjaxError
	});
}

// modify subject title (of wikidata or previously modified) of a narration with another
function insertTitle(){
	var title = $("#newBigTitle").val();

	apiJsonRequest({
		type: "POST",
		url: API.narrationTitle,
		data: getNarrativeRequestData({newtitle: title}),
		success: function() {
			updateTitle();
		},
		error: logAjaxError
	});
}

function insertCoverImage() {
	var coverImg = $('#coverImgInput').prop('files');
	var narrationCoverImg = $("#coverImage").val().trim();
	if (coverImg.length > 0) {
		narrationCoverImg = "images/" + narra.id_n + "-" + narra.user + "-coverImg." + coverImg[0].type.split("/")[1];
		uploadEventImg(coverImg[0], null, "coverImg");
	}
	narra.info["coverImg"] = narrationCoverImg;
	saveObjectToDB({"A1": narra.info}, "A1");
}

// Delete object from database
function deleteObjectFromDB(objID) {
	apiJsonRequest({
		type: "POST",
		url: API.deleteDb,
		data: getNarrativeRequestData({objId: objID}),
		success: function(resp) {
			console.log(resp.msg);
		},
		error: logAjaxError
	});
}

// Save object to database
function saveObjectToDB(objList, objID) {
	apiJsonRequest({
		type: "POST",
		url: API.insertDb,
		data: getNarrativeRequestData({objclist: JSON.stringify(objList[objID]), objcid:objID}),
		success: function(resp) {
			console.log(resp.msg);
		},
		error: logAjaxError
	});
}

// Save object to database
function forceSaveObjectToDB(objList, objID) {
	return saveObjectToDB(objList, objID);
}

function saveObjectsBatchToDB(objList, objIDs) {
	if (!Array.isArray(objIDs) || objIDs.length === 0) {
		return;
	}

	var objects = [];
	for (var i = 0; i < objIDs.length; i++) {
		var objID = objIDs[i];
		if (objID in objList) {
			objects.push({id: objID, value: objList[objID]});
		}
	}

	if (objects.length === 0) {
		return;
	}

	apiJsonRequest({
		type: "POST",
		url: API.saveObjectsBatch,
		data: getNarrativeRequestData({objects: JSON.stringify(objects)}),
		success: function(resp) {
			console.log(resp.msg + ": " + resp.saved);
		},
		error: logAjaxError
	});
}

//upload an image of an event
function uploadEventImg(localImage, eventId, imageNumber=null){
	var form_data = new FormData();

	form_data.append("file", localImage);
	if (eventId == null && imageNumber == "coverImg") {
		form_data.append("imgName", narra.id_n + "-" + narra.user + "-" + imageNumber + "."+ localImage.type.split("/")[1]);
	} else {
		if (imageNumber == null) {
			form_data.append("imgName", narra.id_n + "-" + narra.user + "-" + eventId + "." + localImage.type.split("/")[1]);
		} else {
			form_data.append("imgName", narra.id_n + "-" + narra.user + "-" + eventId + "-" + imageNumber + "." + localImage.type.split("/")[1]);
		}
	}
	console.log(localImage);
	for (var p of form_data) {
		console.log(p);
	}

	apiJsonRequest({
		url: API.uploadEventImage,
		type: "POST",
		data: form_data,
		cache: false,
		contentType: false,
		processData: false,
		success: function(resp) {
			console.log(resp);
		},
		error: logAjaxError
	});
}

// Save relations between events
function saveRelations() {
	narra.rels = {};
	$(".relContainer").each(function (k, v) {
		v = $(v);
		if (v.find(".timelineEvent").length > 0) {
			var evid = v.attr("data-for");
			var causedBy = [];
			var partOf = [];
			v.find(".causedBy").children(".timelineEvent").each(function (j, x) {
				causedBy.push($(x).attr("data-id"));
			});
			v.find(".partOf").children(".timelineEvent").each(function (j, x) {
			   partOf.push($(x).attr("data-id"));
			});
			narra.rels[evid] = {"causedBy": causedBy, "partOf": partOf, "id": evid};

			saveRelationsToDB();
		}
	});
}

// Save relations to database
function saveRelationsToDB() {
	var relsDoc = {"_id": "D1", "rels": narra.rels};
	var relsList = {"D1": relsDoc};
	console.log(relsList);
	saveObjectToDB(relsList, "D1");
}

function publishNarration(preview=0, startFromEvent=null){
	performance.now();

	var title = $('#bigName').text();
	narra.usedImages = {};

	var sort_by_position = function(a, b){
		a = narra.events[a].position;
		b = narra.events[b].position;
		if(a > b) return 1;
		if(a < b) return -1;
		return 0;
	};

	var events = Object.keys(narra.events).sort(sort_by_position);

	narra.slides = events.map(function (key) {
		var event = cloneEventValue(narra.events[key]);
		event.unique_id = "slide-" + event._id;
		var sDate = parseDate(event.start);
		var eDate = parseDate(event.end);

		event.start_date = {
			'year': sDate.getFullYear(),
			'month': event.start.length > 5 ? sDate.getMonth() + 1 : "",
			'day': event.start.length > 8 ? sDate.getDate() : "",
		};

		event.end_date = {
			'year': eDate.getFullYear(),
			'month': event.end.length > 5 ? eDate.getMonth() + 1 : "",
			'day': event.end.length > 8 ? eDate.getDate() : "",
		};

		event.date = sDate.getFullYear() + "-" + eDate.getFullYear();

		var fragment = "";
		var source;
		var secondaryAppend = "";
		var primaryAppend = "";
		var entitiesList = [];

		event.text = {
			'headline': event.title,
			'text': event.description ? event.description : ""
		};

		event.location = {
			"name": "",
			"lat": parseFloat(event.latitud),
			"lon": parseFloat(event.longitud),
			"zoom": 10,
			"line": true
		};

		function createLinkWithTooltip(qid, lang) {
			var linkIri;

			if(qid.startsWith("Q")){
				linkIri = "https://www.wikidata.org/wiki/" + narra.items[qid]['_id'];
			} else {
				linkIri = "https://tool.dlnarratives.eu/CustomEntity/?idU="+qid+"&user="+narra.user+"&idN="+narra.id_n+"&subject="+narra.subjectID;
			}

			return "<a class='js-tooltip-entity-link' data-toggle='tooltip' title='" + getDescription(qid) + "' target='_blank' target='_blank' href='"+linkIri+"'>" + narra.items[qid][lang + 'Name'] + "</a>";
		}

		for (var qid in event.props) {
			var prop = event.props[qid];

			if (qid !== undefined && qid in narra.items) {
				if (narra.currentLang == "en") {
					if ("enName" in narra.items[qid] && narra.items[qid].enName !== "") {
						entitiesList.push(createLinkWithTooltip(qid, "en"));
					} else if ("itName" in narra.items[qid] && narra.items[qid].itName !== "") {
						entitiesList.push(createLinkWithTooltip(qid, "it"));
					}
				} else {
					if ("itName" in narra.items[qid] && narra.items[qid].itName !== "") {
						entitiesList.push(createLinkWithTooltip(qid, "it"));
					} else if ("enName" in narra.items[qid] && narra.items[qid].enName !== "") {
						entitiesList.push(createLinkWithTooltip(qid, "en"));
					}
				}
			}

			if (prop !== undefined) {
				if (event.eventMedia != "") {
					event.media = {'url' : event.eventMedia, 'caption' : event.eventMediaCaption};
				}

				var j;
				if ('secondary' in prop && prop.secondary.length > 0) {
					for (j = 0; j < prop.secondary.length; j++) {
						if (!event.text.text && prop.secondary[j].text) {
							event.text.text = prop.secondary[j].text;
						}
						if (prop.secondary[j].title) {
							source = '\<li>' + prop.secondary[j].author + ', ' + prop.secondary[j].title;
							if (prop.secondary[j].reference != "") {
								source += ", " + prop.secondary[j].reference;
							}
							source += '\</li>';
							if (secondaryAppend.indexOf(source) < 0) {
								secondaryAppend += source;
							}
						}
					}
				}

				if ('primary' in prop && prop.primary.length > 0) {
					for (j = 0; j < prop.primary.length; j++) {
						if (prop.primary[j].title) {
							source = '\<li>' + prop.primary[j].author + ', ' + prop.primary[j].title;
							if (prop.primary[j].reference != "") {
								source += ", " + prop.primary[j].reference;
							}
							source += '\</li>';
							if (primaryAppend.indexOf(source) < 0) {
								primaryAppend += source;
							}
						}
					}
				}
			}
			if (fragment.length > 0) break;
		}

		event.text.text += fragment;
		var textToAppend = "";

		function makeDigObjList(urls) {
			var results = [];
			var l;
			var a;

			if (urls && $.type(urls) === "array" && $.type(urls[0]) === "object") {
				for(l = 0; l < urls.length; l++) {
					a = document.createElement("a");
					a.setAttribute("href", urls[l].url);
					a.setAttribute("target", "_blank");
					a.text = urls[l].title;
					results.push(a.outerHTML);
				}
			} else if (urls && $.type(urls) === "array") {
				for (l = 0; l < urls.length; l++) {
					a = document.createElement("a");
					a.setAttribute("href", urls[l]);
					a.setAttribute("target", "_blank");
					a.text = l + 1;
					results.push(a.outerHTML);
				}
			} else if (urls && $.type(urls) === "string") {
				a = document.createElement("a");
				a.setAttribute("href", urls);
				a.setAttribute("target", "_blank");
				a.text = "1";
				results.push(a.outerHTML);
			}
			return results.join(" • ");
		}

		var digObjList = makeDigObjList(event.objurl);

		if (secondaryAppend)
			textToAppend += '<h5>Secondary Sources</h5><ul>' + secondaryAppend + '</ul>';

		if (primaryAppend) {
			textToAppend += '<h5>Primary Sources</h5><ul>' + primaryAppend + '</ul>';
		}

		if (entitiesList) {
			textToAppend += '<h5>Entities</h5><span class="tl-entities">' + entitiesList.join(' • ') + '</span>';
		}

		if (digObjList) {
			textToAppend += '<h5>Digital Objects</h5><span class="digObjList">' + digObjList + '</span>';
		}

		if (textToAppend) {
			event.text.text += textToAppend;
		}

		return event;
	});

	var eventsForPreview = {};
	if (preview == 1) {
		narra.slides.forEach(function(event) {
			eventsForPreview[event._id] = event;
		});
	}
	var slidesObject= {
		"slides": narra.slides,
		"items": narra.items,
		"events": preview == 1 ? eventsForPreview : narra.events,
		"A1": narra.info
	};
	var baseUrl= window.location.host;

	if (preview == 0) {
		$("#publish-story-container span").hide();
		$("#loading").fadeIn();

		apiJsonRequest({
			type: "POST",
			url: API.publishNarration,
			data: getNarrativeRequestData({user : narra.user, baseURL: baseUrl}),
			success: function(resp) {
				$("#loading").hide();
				$("#publish-story-container span").fadeIn();
				if (Number(resp.exitCode) !== 0 || typeof resp.owlLink !== "string" || !resp.owlLink) {
					console.error("Graph generation failed:", resp.output);
					showAlert("publish-graph-error", "Graph creation failed. Check the server logs for details.", "danger", 8000);
					return;
				}
				console.log(resp.output);

				showModal(
					"Graph created",
					"OWL file: <a href='" + resp.owlLink + "' target='_blank' rel='noopener'>" + resp.owlLink + "</a>",
					"back",
					"ok",
					function() {},
					function() {}
				);
			},
			error: function(response) {
				$("#loading").hide();
				$("#publish-story-container span").fadeIn();
				logAjaxError(response);
				showAlert(
					"publish-error",
					"Storymap publication failed. Check that the server can write to its JSON, OWL, and storymap folders.",
					"danger",
					8000
				);
			}
		});
	} else if (preview == 1) {
		apiJsonRequest({
			type: "POST",
			url: API.saveTempPreview,
			data: getNarrativeRequestData({user : narra.user, narrationTitle : title, slides : JSON.stringify(slidesObject), baseURL: baseUrl}),
			success: function() {
				setMapPreviewLoading(false);
				var startQuery = startFromEvent && narra.events[startFromEvent]
					? "&start=" + encodeURIComponent(startFromEvent)
					: "";
				window.open("verticalstorymap3D/previewStorymap.php?user="+narra.user+"&id=N"+narra.id_n+"&preview=1"+startQuery, '_blank');
			},
			error: function(response) {
				setMapPreviewLoading(false);
				logAjaxError(response);
			}
		});
	}
}

function uploadImage(element, blob, fileName) {
	var xhr = new XMLHttpRequest();
	xhr.open("POST", API.uploadImage, true);
	var formData = new FormData();
	formData.append("file", blob);
	formData.append("fileName", fileName);
	xhr.send(formData);

	xhr.onreadystatechange = function() {
		if (xhr.readyState == XMLHttpRequest.DONE) {
			console.log(xhr.responseText);
			$(element).parents('.ui-front').find('.image-upload-spinner').hide();
			console.log(currentTime() + 'Uploaded image: ' + fileName);
			replaceImage($(element), "images/" + fileName);
			$(element).parents('.ui-front').find('.popoverImage').show();
		}
	}
}

// Confirm logout
function confirmLogout() {
	showModal(
		"Logout",
		"Do you really want to logout? You will lose all unsaved data.",
		"Don't Logout",
		"Logout",
		function() {},
		function() {
			apiJsonRequest({
				type: "POST",
				url: API.sessionClose,
				data: {},
				success: function(resp) {
					console.log(resp.msg);
					console.log(currentTime() + "Successfully logged out");
					window.open(HOME_PAGE,"_self");
				},
				error: logAjaxError
			});
		}
	);
}

// Call triplifier and display results
function startTriplify() {
	apiJsonRequest({
		type: "POST",
		url: API.triplify,
		data: {currentDbName: narra.id_n + narra.user +"-"+narra.dbName, idNarration: "N" + narra.info.id},
		success: function(resp) {
			console.log(resp.en);
			$("#loading").hide();
			$("#publish-story-container span").fadeIn();
			showModal(
				"Triplification Results",
				resp.id + "<br/>" + resp.numberEvents + "<br/>"+  resp.consistent +
				"<br><a target='_blank' href='" + resp.pathFileOwl + "'>Download the OWL file of your narrative</a><br><hr>🚧 <b>Work in Progress</b> 🚧<br><i>Soon you will be able to easily publish the narrative and its visualizations.</i>",
				"Cancel",
				"OK",
				function() {},
				function() {}
			);
		},
		error: logAjaxError
	});
}

// Triplify the narrative
function triplify() {
	$("#publish-story-container span").hide();
	$("#loading").fadeIn();
	performance.now();

	apiJsonRequest({
		type: "GET",
		url: API.a1ForTriplify,
		data: {dbusername: narra.id_n + narra.user +'-'+narra.dbName},
		success: function(resp) {
			if (resp.info != "") {
				narra.info = JSON.parse(resp.info);
				console.log(currentTime() + 'Load Narrative info (A1) From DB: ' + narra.info);
				startTriplify();
			} else {
				console.log(currentTime() + 'Narrative info not found in database; will create and save in DB');
				narra.info = {
					_id: "A1",
					id: Math.round(Math.random() * 1000000000),
					name: "",
					author: narra.user
				};
				saveObjectToDB({"A1": narra.info}, "A1");
				startTriplify();
			}
		},
		error: logAjaxError
	});
}

function deleteNarrative(ids){
	const arrayOfidsForDeleting = ids.split("-");

	showModal(
		"DELETE NARRATIVE",
		"</br><b>WARNING: </b> you are about to permanently delete the narration <i>"+arrayOfidsForDeleting[3]+"</i> from database. Do you want to continue?",
		"Don't delete",
		"Delete",
		function() {},
		function() {
			apiJsonRequest({
				type: "POST",
				url: API.deleteNarration,
				data: getNarrativeRequestData({subject: arrayOfidsForDeleting[1], user: arrayOfidsForDeleting[2], id: arrayOfidsForDeleting[0]}),
				success: function() {
					window.location.href = HOME_PAGE;
				},
				error: function(response){
					alert(JSON.stringify(response));
				}
			});
		}
	);
}

function downloadOwl(){
	apiJsonRequest({
		url: API.downloadOwl,
		type: "GET",
		data: getNarrativeRequestData({user:narra.info.author, id:narra.info.id}),
		success: function(resp) {
			if(resp.fileExists==1){
				window.open("owl/narratives/"+narra.info.author+"_N"+narra.info.id+".owl", '_blank').focus();
			} else {
				showAlert('failed-owl', 'Error! Please, publish the story before downloading the OWL file.', 'warning', 3000);
			}
		},
		error: logAjaxError
	});
}
