
// Use ECMAScript strict mode
// noinspection EqualityComparisonWithCoercionJS

"use strict";

var HOME_PAGE = "SMBVT_2.0.html";
var BUILDER_PAGE = "toolNew.html";
var SEARCH_PAGE = "Search/?dataset=narratives";
var API = {
	initNarrative: "PHP/initNarrative.php",
	insertDb: "PHP//insertDb.php",
	deleteDb: "PHP//deleteDb.php",
	saveObjectsBatch: "PHP/saveObjectsBatch.php",
	narrationTitle: "PHP//narrationTitle.php",
	uploadEventImage: "PHP//uploadEventImage.php",
	publishNarration: "PHP/publishAndTriplifyNarration.php",
	saveTempPreview: "PHP//saveTempJsonPreviewStorymap.php",
	sessionClose: "PHP//sessionClose.php",
	triplify: "PHP//triplify.php",
	a1ForTriplify: "PHP//A1forTriplify.php",
	deleteNarration: "PHP//deleteNarration.php",
	downloadOwl: "PHP/downloadOwl.php",
	uploadImage: "PHP/uploadImage.php"
};

// Tell UploadCare to start only when needed
var UPLOADCARE_MANUAL_START = true;

// Main global variable
var narra = {
    // ID of the subject of the narrative
    subjectID: $('meta[name=subjectID]').attr("content"),

	// id of narration postgres table (to attach at tables of each narration
	id_n: null,


    // Current mouse positions
    currentMousePos: {x: -1, y: -1},

    // Main language
    currentLang: "en",

    // Alternative language (inactive)
    otherLang: "it",

    // Contains suggestions for autocomplete
    suggestions: {},

    // Contains all events of the narrative
    events: {},

    // Contains the type of event (map, sketchfab, Aton or slide)
    formType: '',

    // Contains the slides of the visualization timeline
    slides: {},

    // Contains all images
    images: {},

    // Contains all Wikidata entities (item = entity)
    items: {},

    // Contains authors of primary/secondary sources
    authorMap: {},

    // Contains primary/secondary sources
    sourceMap: {},

    // Contains authors in array form
    authorArray: [],

    // Contains sources in array form
    sourceArray: [],

    // Contains event types (e.g. Birth, Creation...)
    eventTypes: {},

    // Contains roles that people can play in an event
    roles: {},

    // Contains relations among events
    rels: {},

    // Contains BibTex bibliography (inactive)
    bib: {},

    // Counter for SPARQL query pagination
    counter: 0,

    // Remote database
    remote: null,

    // Local database (inactive)
    db: null,

    // Synchronization database (inactive)
    sync: null,

    // Database name (taken from narrative subject ID)
    dbName: null,

    // Narrative metadata
    info: {},

    // Name of the current user (for creating table in db: for simple users it's the same of userNameToDisplay; for VRE users it's different)
    user: "",

    // Name of the current user (for displaying in menu)
    userNameToDisplay: "",

    // Wikidata classes mapped to our defaults
    mainClasses: [
        "234460",    // Work (text)
        "14204246",  // Page (hidden)
        "11471",     // Time (hidden)
        "1190554",   // Event (hidden)
        "8436",      // Person (family)
        "5",         // Person
        "15222213",  // Object (artificial physical)
        "17334923",  // Place
        "43229",     // Organization
        "386724",    // Work
        "7184903",   // Concept (abstract object)
        "4026292",   // Concept (action)
        "488383"     // Object
    ]

};

// Declaring global variables
// Switch form based on user choice
let formType = "map";

// Manage image sections
let countImageGroup = 1;

// Handle entities search filter
let entityClass = '';

// Handle the type of coordinates mainly for popovers
let coorType = '';

var bootstrapProgressState = {
	active: false,
	percent: 0
};

function showBootstrapProgress(message, percent) {
	bootstrapProgressState.active = true;
	setBootstrapProgress(percent, message);
	$("#bootstrap-progress-overlay").css("display", "flex");
	$(".spinner").hide();
}

function setBootstrapProgress(percent, message) {
	var nextPercent = Math.max(0, Math.min(100, Number(percent) || 0));
	if (nextPercent < bootstrapProgressState.percent) {
		nextPercent = bootstrapProgressState.percent;
	}
	bootstrapProgressState.percent = nextPercent;
	$("#bootstrap-progress-bar").css("width", nextPercent + "%");
	$("#bootstrap-progress-percent").text(Math.round(nextPercent) + "%");
	if (message) {
		$("#bootstrap-progress-message").text(message);
	}
}

function hideBootstrapProgress() {
	bootstrapProgressState.active = false;
	bootstrapProgressState.percent = 0;
	$("#bootstrap-progress-overlay").hide();
	$("#bootstrap-progress-bar").css("width", "0%");
	$("#bootstrap-progress-percent").text("0%");
	$("#bootstrap-progress-message").text("Starting...");
}

function bootstrapProgressIsActive() {
	return bootstrapProgressState.active;
}

function normalizeEventFormType(typeString) {
	if (typeString === undefined || typeString === null || typeString === '') {
		return 'map';
	}

	if (typeString === 'Aton' || typeString === 'Aton 2') {
		return 'Aton';
	}

	return typeString;
}

function isThreeDModelFormType(typeString) {
	var normalizedType = normalizeEventFormType(typeString);
	return normalizedType === 'sketchfab' || normalizedType === 'Aton';
}


// calculate a position of a new events based on timeline events length
function nextEventPosition() {
	return parseInt($("#timeline .timelineEvent").length) + 1;
}

// create HTML select for switch position of an event
function createHTMLSelect(){

	// order events by positions and make list
	var sort_by_position = function( a , b){
			a = narra.events[a].position;
			b = narra.events[b].position;
			if(a > b) return 1;
			if(a < b) return -1;
			return 0;
	}
	var eventsList = Object.keys(narra.events).sort(sort_by_position);

	var positionEvent = $('#positionEvent');

	// empty last select and append first blank line
	positionEvent.empty().append('<option value="empty" ></option>');

	// empty radio buttons
	$("#positionBefore").prop('checked', false);
	$("#positionAfter").prop('checked', false);

	// append titles of events <option> ordered by position
	for (var i= 0; i < eventsList.length; i++) {

		positionEvent.append('<option class="optionSel" id="optionSel' + narra.events[eventsList[i]]._id + '" value="' + narra.events[eventsList[i]]._id + '">' + narra.events[eventsList[i]].title + "</option>");

	}

	// uncheck radio button for "after/before" append
	$('.radioPositionButton').prop('checked', false);

}

// switch a new event or a modified event after or before another event
function switchPositionEvent(afterBefore, eventToSwitch, evid){

	// order events by positions and make list
	var sort_by_position = function( a , b){
			a = narra.events[a].position;
			b = narra.events[b].position;
			if(a > b) return 1;
			if(a < b) return -1;
			return 0;
	}
	var eventsList = Object.keys(narra.events).sort(sort_by_position);

	// get position of event with which I want to switch my new or modified event
	var position;
	if (eventToSwitch in narra.events) {
		position = parseInt(narra.events[eventToSwitch].position);
	} else {
		position = narra.events[evid].position;
	}

	var toSwitch;
	var i;
	if (afterBefore == "before") {
		toSwitch = false;
		for (i=0; i < eventsList.length; i++) {

			if (eventsList[i] == eventToSwitch) {
				toSwitch = true;
			}

			if (toSwitch) {

				// change position in object and in #timeline event div of the events after my event + 1
				narra.events[eventsList[i]].position = parseInt(narra.events[eventsList[i]].position) + 1;
				$('#timeline #' + narra.events[eventsList[i]]._id).attr('position', parseInt(narra.events[eventsList[i]].position));

				console.log("è stato cambiato " + narra.events[eventsList[i]].title);

			}


		}
	} else if (afterBefore == "after") {

		toSwitch = false;
		for (i=eventsList.length -1; i > -1; i--) {

			if (eventsList[i] == eventToSwitch) {
				toSwitch = true;
			}

			if (toSwitch) {

				// change position in object and in #timeline event div of the events before my event -1
				narra.events[eventsList[i]].position = parseInt(narra.events[eventsList[i]].position) - 1;
				$('#timeline #' + narra.events[eventsList[i]]._id).attr('position', parseInt(narra.events[eventsList[i]].position));

				console.log("è stato cambiato " + narra.events[eventsList[i]].title);

			}

		}

	}

	return position;

}

// fix order position of events after a switch/delete of an event
function fixPositionAfterSwitch(){

	// order events by positions and make list
	var sort_by_position = function( a , b){
			a = narra.events[a].position;
			b = narra.events[b].position;
			if(a > b) return 1;
			if(a < b) return -1;
			return 0;
	}

	var eventsList = Object.keys(narra.events).sort(sort_by_position);

	// change position in object and in #timeline event div based on timeline length (from 1 to last number of timeline)
	for(var i=0; i < eventsList.length; i++){

		narra.events[eventsList[i]].position = i + 1;
		$('#timeline #' + narra.events[eventsList[i]]._id).attr('position', parseInt(narra.events[eventsList[i]].position));

		saveObjectToDB(narra.events, narra.events[eventsList[i]]._id);

	}

}

// Check if workspace is empty before exiting the tool
window.onbeforeunload = function() {
    if (!workspaceIsEmpty()) {
        return true;
    }
    return null;
};

// On window load...
window.onload = function () {
    // Check database name (Wikidata ID)

	const params = new URLSearchParams(window.location.search);
	narra.subjectID = params.get('idwiki');
	narra.dbName = narra.subjectID.toLowerCase();

	// if is null, narration is new. else is already in db
	narra.id_n = params.get('idnar');


    $('body').on('focus', '[contenteditable]', function() {
        var $this = $(this);
        $this.data('before', $this.html());
        return $this;
    }).on('blur keyup paste input', '[contenteditable]', function() {
        var $this = $(this);
        if ($this.data('before') !== $this.html()) {
            $this.data('before', $this.html());
            $this.trigger('change');
        }
        return $this;
    });


    // Track mouse movements for dragging
	$(document).on("mousemove", function (event) {
        narra.currentMousePos.x = event.pageX;
        narra.currentMousePos.y = event.pageY;
    });

    // Make :contains case-insensitive in jQuery
    $.expr[":"].contains = $.expr.createPseudo(function (arg) {
        return function (elem) {
            return $(elem).text().toUpperCase().indexOf(arg.toUpperCase()) > -1;
        };
    });

    // Load event types from JSON file
    $.getJSON("../json/newtypes.json", function (data) {
        console.log(currentTime() + "Loaded event types");
        narra.eventTypes = data.types;
    });

    // Start loading CouchDB database
    initTest(narra.dbName);

	$(document).ready(function() {
		bindStaticUiEvents();

		// prevent control panel from closing when clicked
		$("#dropdown-menu-header").on("click", function(event) {
			event.stopPropagation();
		});

		// truncate text of digital objects if window is resized
		$(window).on('resize', function() {
			selectDigObjs();
		});

		// manage entities div
		var lastEntityClass;

		// Hide other entity classes when a class is selected
		$('.toggle-btn-entities').on("click", function() {

			if (typeof lastEntityClass == 'undefined') {
				lastEntityClass = 'all';
			}

			var dataClassValue = $(this).attr('data-class');
			var dataContainer = $('#data-container');
			var entitiesNotSelected = $('#entities-not-selected');
			entityClass = $(this).attr('data-class');

			if (dataClassValue == 'all') {
				$('#controls .data').show();
			} else {
				$('#controls .data').hide();
				$('#controls .data').filter(function() {
					return entityHasType(this, dataClassValue);
				}).show();
			}

			$('#searchInput').val('');

			if ((lastEntityClass.length > 0) && (lastEntityClass != dataClassValue) && !($(this).hasClass("add-button-active-entities"))) {
				dataContainer.css("display", "block");
				entitiesNotSelected.css("display", "none");
			} else if (dataContainer.css("display") == "block") {
				dataContainer.css("display", "none");
				var children = dataContainer.children();
				var hasChild = false;
				for (var i = 0; i < children.length; i++) {
					var child = $(children[i]);
					if (child.css("display") == "block") {
					  hasChild = true;
					}
				}
				if (!hasChild) {
					entitiesNotSelected.css("display", "block");
				}
			} else if (dataContainer.css("display") == "none") {
				dataContainer.css("display", "block");
				entitiesNotSelected.css("display", "none");
			}

			lastEntityClass = $(this).attr('data-class');
			$(this).siblings().removeClass('add-button-active-entities');
			$(this).toggleClass('add-button-active-entities');

			// if there are no entities and a class is selected, show 'No entities' message
			manageNoEntities();
		});
		// end of managing entities div

		// manage authentication
        $("#auth-form").bind("submit", function (event) {
            event.preventDefault();
            authenticate($("#inputName").val(), $("#inputPassword").val(), narra.dbName);
        });

		var dropdownClass = $('.dropdown');

        // Add slideDown animation to Bootstrap dropdown when expanding.
        dropdownClass.on('show.bs.dropdown', function() {
            $(this).find('.dropdown-menu').first().stop(true, true).slideDown("fast");
        });

        // Add slideUp animation to Bootstrap dropdown when collapsing.
        dropdownClass.on('hide.bs.dropdown', function() {
            $(this).find('.dropdown-menu').first().stop(true, true).slideUp("fast");
        });

        // Set click event on home button
        $("#home").click(function() {
            $('.popover').hide();
            if ($(this).text() === "LOGOUT") {
                confirmLogout();
            } else if ($(this).text() === "BACK") {
                restoreInitialView();
            } else {
                confirmHome();
            }
        });

		$(".radioVideoBtn").each(function (){
			addRadioListener($(this));
		});

		$(".radioCoorsBtn").each(function (){
			addCoorsListener($(this));
		});

		$(".backImgInput").each(function (){
			addBackgroundImageListener($(this));
		});

		$(".eventImageInput").each(function (){
			addImageListener($(this));
		});

		$('[data-toggle="tooltip"]').tooltip({
			animated: 'fade',
			placement: 'auto',
			trigger: 'manual'
		}).on('click', function() {
			// if the tooltip is visible, hide it, otherwise, show it
			if ($(this).attr('aria-describedby')) {
				$(this).tooltip('hide');
			} else {
				$(this).tooltip('show');
			}
		});

		// close the tooltip when click is outside of it
		$(document).on('click', function (e) {
			$('[data-toggle="tooltip"]').each(function () {
				// check if click is inside the tooltip
				if (!$(this).is(e.target) && $(this).has(e.target).length === 0 && $('.tooltip').has(e.target).length === 0) {
					$(this).tooltip('hide');
				}
			});
		});

		// close all tooltips when the user scroll the page
		$('body, div').add(document).add(window).on('scroll', function() {
			$(".tooltip").tooltip('hide');
		});

		var coverPage = $("#cover-page");

		coverPage.on("mouseenter", function () {
			$(this).tooltip();
			$(this).tooltip('show');
		});

		coverPage.on("mouseleave", function () {
			$(this).tooltip();
			$(this).tooltip('hide');
		});

		// fix arrow behaviour in the control panel

		$(window).on('click', function() {
			var arrowPanel = $("#arrow-panel");
			var dropdownMenuHeader = $("#dropdown-menu-header");
			if ($(dropdownMenuHeader).css('display') == 'block') {
				$(arrowPanel).removeClass('fa-caret-down');
				$(arrowPanel).addClass('fa-caret-right');
			}
		});

		// show popover on click on "New Entity" button
		$("#plusButton").on("click", function(event) {
			event.cancelBubble = true;
			if (event.stopPropagation) {
				event.stopPropagation();
			}
			$('#plusButton').popover('show');
		});

        // Set keypress keydown event on auth elements
        $("#auth-div input").on("keypress keydown", function() {
            $(this).parents("#auth-div").removeClass("has-error");
            $("#auth-div .help-inline").text("");
        });

        // Set keypress keydown event on form elements
        $(".form-control").on("keypress keydown", function() {
            $(this).parents(".form-group, .form-inline, .input-group, .twitter-typeahead").removeClass("has-error");
        });

		// Set keypress keydown event on video URL input
        $("#eventVideo").on("keypress keydown", function() {
            $(this).removeClass("has-error");
        });

		// Set change event on video URL input
        $("input[type=radio][name=media_type]").change(function() {
            $("#eventVideo").parent('.video-label-group').removeClass("has-error");
        });

		// Set keypress keydown event on Start date
        $("#dateInputStart").on("keypress keydown", function() {
            $(this).removeClass("has-error-date");
        });

		// Set keypress keydown event on End date
        $("#dateInputEnd").on("keypress keydown", function() {
            $(this).removeClass("has-error-date");
        });

		// Set change event on coordinates radio buttons
		$("input[type=radio][name=coors-type]").change(function() {
			$(".radioCoorsLabel").removeClass("has-error-coors");
		});

		// Set keypress keydown event on latitude and longitude coordinates
		$("#latitud").on("keypress keydown", function() {
			$("#latitud").removeClass("has-error-coors");
		});
		$("#longitud").on("keypress keydown", function() {
			$("#longitud").removeClass("has-error-coors");
		});

		// Set keypress keydown event on polygon coordinates
		$("#polygonArea").on("keypress keydown", function() {
			$("#polygonArea").removeClass("has-error-coors");
		});

		// Set keypress keydown event on sketchfab ID
		$("#id-text").on("keypress keydown", function() {
			$("#id-text").removeClass("has-error-sketch");
		});

		// Set keypress keydown event on sketchfab annotation
		$("#number-text").on("keypress keydown", function() {
			$("#number-text").removeClass("has-error-sketch");
		});

        // Set keypress keydown event on digital object input
        $('#digobjInput').on("keypress keydown", function (e) {
          if (e.which == 13) {
            addDigitalObject($('#digobjInput').val().trim(), $('#digobjTitle').val());
            return false;
          }
        });

        $('#exportButton').click(function() {

			for (var key in narra.events) {
				var fragment = "";
				var source = "";
				var secondaryAppend = "";
				var primaryAppend = "";
				var entitiesList = [];

				narra.events[key].text = {
					'headline': narra.events[key].title,
					'text': narra.events[key].description ? narra.events[key].description : ""
				};

				narra.events[key].location = {

					"name": "",
					"lat": parseFloat(narra.events[key].latitud),
					"lon": parseFloat(narra.events[key].longitud),
					"zoom": 10,
					"line": true

				};

				// Function to link to English or Italian Wikipedia
				function createLinkWithTooltip(qid, lang) {

					var linkIri;

					if(qid.startsWith("Q")){
							linkIri= "https://www.wikidata.org/wiki/" + narra.items[qid]['_id'];
					} else {
						linkIri = "https://tool.dlnarratives.eu/CustomEntity/?idU="+qid+"&user="+narra.user+"&idN="+narra.id_n+"&subject="+narra.subjectID;
					}

					return "<a class='js-tooltip-entity-link' data-toggle='tooltip' title='" + getDescription(qid) + "' target='_blank' target='_blank' href='"+linkIri+"'>" + narra.items[qid][lang + 'Name'] + "</a>"
				}

				// Get list of entities and link to Wikipedia
				for (var qid in narra.events[key].props) {
					var prop = narra.events[key].props[qid];
					if (qid !== undefined && qid in narra.items) {
						//en entities
						if(narra.currentLang == "en"){
							if ("enName" in narra.items[qid] && narra.items[qid].enName !== "") {
								entitiesList.push(createLinkWithTooltip(qid, "en"));
							} else if ("itName" in narra.items[qid] && narra.items[qid].itName !== "") {
								entitiesList.push(createLinkWithTooltip(qid, "it"));
							}
						// it entities
						} else {
							if ("itName" in narra.items[qid] && narra.items[qid].itName !== "") {
								entitiesList.push(createLinkWithTooltip(qid, "it"));
							} else if ("enName" in narra.items[qid] && narra.items[qid].enName !== "") {
								entitiesList.push(createLinkWithTooltip(qid, "en"));
							}
						}
					}

					// Handle event images (or other media)
					if (prop !== undefined) {

						// load media of event if any
						if(narra.events[key].eventMedia != ""){

							narra.events[key].media = {'url' : narra.events[key].eventMedia, 'caption' : narra.events[key].eventMediaCaption}

						}

						var j;

						// Handle secondary sources of events
						if ('secondary' in prop && prop.secondary.length > 0) {
							for (j = 0; j < prop.secondary.length; j++) {
								if (!narra.events[key].text.text && prop.secondary[j].text) {
									narra.events[key].text.text = prop.secondary[j].text;
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

						// Handle primary sources of events
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

				// Set event text
				narra.events[key].text.text += fragment;
				var textToAppend = "";

				// Function to make a list of digital objects
				function makeDigObjList(urls) {
					var results = [];
					var l;
					var a;

					//if digital objets is array of objects (url + title))
					if (urls && $.type(urls) === "array" && $.type(urls[0]) === "object") {

						for(l=0; l < urls.length; l++){
							a = document.createElement("a");
							a.setAttribute("href", urls[l].url);
							a.setAttribute("target", "_blank");
							a.text = urls[l].title;
							results.push(a.outerHTML);
						}
					//if digital objets are old djobj (only array of urls)
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

				// Display digital object list
				var digObjList = makeDigObjList(narra.events[key].objurl);

				// Append secondary sources to HTML
				if (secondaryAppend)
					textToAppend += '<h5>Secondary Sources</h5><ul>' + secondaryAppend + '</ul>';

				// Append primary sources to HTML
				if (primaryAppend) {
					textToAppend += '<h5>Primary Sources</h5><ul>' + primaryAppend + '</ul>';
				}

				// Append list of entities to HTML
				if (entitiesList) {
					textToAppend += '<h5>Entities</h5><span class="tl-entities">' + entitiesList.join(' • ') + '</span>';
				}

				// Append list of digital objects to HTML
				if (digObjList) {
					textToAppend += '<h5>Digital Objects</h5><span class="digObjList">'
						+ digObjList + '</span>';
				}

				// Set final event text
				if (textToAppend) {
					narra.events[key].text.text += textToAppend;
				}

				var a;

				//////////////////////////////////////////////
				if(narra.events[key].type.includes(',')){
					a = narra.events[key].type.split(",");
					narra.events[key].sketchfabid= a[0];
					narra.events[key].annotationNumber3DModel= a[1];
				} else if(narra.events[key].type.includes('*')){
					a = narra.events[key].type.split("*");
					narra.events[key].backgroundImg= a[0];
					narra.events[key].slidePosition= a[1];
				} else if(narra.events[key].type.includes('+')){
					a = narra.events[key].type.split("+");
					narra.events[key].eventMediaWidth= a[0];

				}

			}

            var data = {
                "narra": narra.info,
                "events": narra.events,
                "entities": narra.items
            };
            download(
                JSON.stringify(data),
				"slide.json"
            );
        });

        // Set click event on digital object button
        $('#digObjButton').click(function () {
            addDigitalObject($('#digobjInput').val().trim(), $('#digobjTitle').val());
            return false;
        });

		//set inout to search event bar
		// When the text in the input changes
		$("#eventSearch").on("input", function() {
			// Retrieve input text
			var searchText = $(this).val().toLowerCase();

			// Retrieve all divs with class "contents" in div "container"
			$(".timelineEvent").each(function() {
				// Retrieves the title of the current div
				var title= $(this).find("span").text().toLowerCase();

				// Show the div if its title contains the input text, otherwise hide it
				if (title.indexOf(searchText) !== -1) {
					$(this).show();
				} else {
					$(this).hide();
				}
			});
		});

        // Textarea height fit with content when user inserts an input
        $('textarea:not(#polygonArea)').on('input', function() {
            this.style.height = '';
            this.style.height = (this.scrollHeight) + 'px';
        });

        // Initialize autocomplete for Wikidata entities
        narra.suggestions = new Bloodhound({
          datumTokenizer: function(results) {
            return Bloodhound.tokenizers.whitespace(results);
          },
          queryTokenizer: Bloodhound.tokenizers.whitespace,
          remote: {
			  url: 'https://www.wikidata.org/w/api.php?action=wbsearchentities&search=%QUERY&language=en&limit=20&format=json&callback=?',
			  wildcard: '%QUERY',
			  filter: function(response) {
				  var results = [];
				  response.search.forEach(function (qid, ignore) {
                    if (qid.description !== undefined && qid.description.indexOf('disambiguation') > 0) {}
                    else {
                        results.push(qid);
                    }
                });
                  return results;
                }
              }
        });
        narra.suggestions.initialize();
    });
};

function renderNarrativesMenu(narratives, currentNarrativeId, currentUsername) {
	$("#narratives-menu .narra-list-item, #narratives-menu a").remove();
	for (var i = 0; i < narratives.length; i++) {
		var narrative = narratives[i];
		var classMenu = currentNarrativeId == narrative[0] ? "activeMenu" : "";
		$("#narratives-menu").append("<div class='narra-list-item " + classMenu + "' id='storyMenu" + i + "'><a href='" + BUILDER_PAGE + "?idwiki=" + narrative[2].toUpperCase() + "&idnar=" + narrative[0] + "' class='data' target = '_blank'>" + narrative[1] + "</a><div class='deleteButton js-delete-narrative' id='" + narrative[0] + "-" + narrative[2] + "-" + currentUsername + "-" + narrative[1] + "'> <b class='x'>×</b></div></div>");
	}
	$("#narratives-menu").append('<a href="' + SEARCH_PAGE + '"><li  class="dropdown-header">Search Other Narratives</li></a>');
}

function applyLoggedInBuilderUI(username, usernameToDisplayInMenu) {
	narra.userNameToDisplay = usernameToDisplayInMenu;
	var userName = $("#userName");
	userName.text(usernameToDisplayInMenu.toUpperCase()).show();
	$("#home").show();
	$("#userMenu").show();
	$('#userMenu').css({ 'right' : userName.width() + 10 });
	$('.dropdown-menu-right')
		.css({ 'right' : userName.width() + 10 })
		.css({ 'top' : userName.height() +10});
	if (username != usernameToDisplayInMenu) {
		$("#account-menu").hide();
	}
}

function bootstrapNarrativeData(resp) {
	var i;
	for (i = 0; i < resp.events.length; i++) {
		narra.events[JSON.parse(resp.events[i])._id] = JSON.parse(resp.events[i]);
	}
	for (i = 0; i < resp.entitys.length; i++) {
		narra.items[JSON.parse(resp.entitys[i])._id] = JSON.parse(resp.entitys[i]);
	}

	$("#container").css("display", "flex");
	$("#workspace").css("display", "none");
	$("#event-type").css("display", "flex");
	$("#exit-type").css("display", "none");
	$("#addButton,#saveButton,#cancelButton").toggleClass("disabledButton");
	$("#account-list").css("visibility", "visible");

	if (resp.info != "") {
		narra.info = JSON.parse(resp.info);
	} else {
		narra.info = {
			_id: "A1",
			id: narra.id_n,
			name: "",
			author: narra.user,
			idNarra: narra.id_n
		};
		saveObjectToDB({"A1": narra.info}, "A1");
	}

	if (resp.relations != "") {
		narra.rels = JSON.parse(resp.relations).rels;
	}

	updateEventsCounter();
	createHTMLSelect();

	if (narra.subjectID in narra.items && resp.entitys.length > 0) {
		hideBootstrapProgress();
		makeEntities(narra.items, true);
		$(".spinner-loader").remove();
		finalLoad();
	} else {
		setBootstrapProgress(25, "Loading main subject from Wikidata...");
		sparqlRequest([narra.subjectID], narra.counter + 1, undefined, undefined, true);
	}
}

function initTest(dbName) {
	showBootstrapProgress("Initializing narrative...", 10);
	apiJsonRequest({
		type: "POST",
		url: API.initNarrative,
		data: {subjectId: narra.subjectID, idNarra: narra.id_n},
		success: function(resp) {
			if (resp.username == "") {
				window.location.href = HOME_PAGE;
				return;
			}

			applyLoggedInBuilderUI(resp.username, resp.usernameToDisplayInMenu);
			narra.id_n = resp.idNarra;
			narra.user = resp.storageUser;

			var queryParams = new URLSearchParams(window.location.search);
			queryParams.set("idnar", resp.idNarra);
			history.replaceState(null, null, "?" + queryParams.toString());

			renderNarrativesMenu(resp.narratives, narra.id_n, resp.username);
			bootstrapNarrativeData(resp);
		},
		error: logAjaxError
	});
}

// Function for autocomplete
var substringMatcher = function(strs, lang) {
  return function findMatches(q, cb) {

    var matches = [];
    var substrRegex = new RegExp(q, 'i');

    $.each(strs, function(i, str) {
      if (substrRegex.test(str[lang])) {
        matches.push(str);
      }
    });

    cb(matches);
  };
};

// Load list of narratives and show it in user menu
function showUserMenu() {
    narra.remote.getUser(narra.user, function (err, response) {
      if (err) {
        if (err.name === 'not_found') {
            console.log(currentTime() + "User database not found");
        } else {
            console.log(currentTime() + "Error with user database: " + err.name);
        }
      } else { console.log(response);
          $("#narratives-menu .narra-list-item").remove();
          for (var narraID in response.narratives) {
              var narrative = response.narratives[narraID];
                $("#narratives-menu").append("<li class='narra-list-item'><a href='" + BUILDER_PAGE + "?idwiki=" + narrative.qid + "' class='data' style='background-color: " + getColor(narrative.type) + "' target = '_blank'>" + narrative.name + "</a></li>");
          }
      }
    });
}

// Return current time
function currentTime() {
    var d = new Date();
    return d.toISOString().split("T")[1].replace("Z", "") + " -- ";
}

// Return the highest-priority item type from its Wikidata classes
function typeFromArray(array) {
    if ((array.indexOf("Q4271324") > -1) || array.indexOf("Q95074") > -1) return "fictionalCharacter";
    if (array.indexOf("Q23413") > -1) return "castle";
    if (array.indexOf("Q16970") > -1) return "church";
    if (array.indexOf("Q44613") > -1) return "monastery";
    if (array.indexOf("Q1640824") > -1) return "epigraph";
    if (array.indexOf("Q42195") > -1) return "rock engraving";
    if (array.indexOf("Q839954") > -1 || array.indexOf("Q120964921") > -1) return "site";
    if (array.indexOf("Q41176") > -1 || array.indexOf("Q33506") > -1 ||
        array.indexOf("Q16970") > -1 || array.indexOf("Q3947") > -1 ||
        array.indexOf("Q16560") > -1 || array.indexOf("Q23413") > -1 ||
        array.indexOf("Q44613") > -1) {
        return "building";
    }
    if (array.indexOf("other") > -1) {
        return "other";
    }
    if (array.indexOf("Q15474042") > -1) {
        return "hidden";
    }
    if (array.indexOf("Q4167836") > -1) {
        return "hidden";
    }
	if (array.indexOf("Q27096213") > -1) {
        return "place";
    }
    if (array.indexOf("Q5") > -1 || array.indexOf("Q8436") > -1) {
        return "person";
    }
    if (array.indexOf("Q234460") > -1) {
        return "work";
    }
    if (array.indexOf("Q223557") > -1 || array.indexOf("Q4406616") > -1) {
        return "object";
    }
    if (array.indexOf("Q17334923") > -1) {
        return "place";
    }
    if (array.indexOf("Q43229") > -1) {
        return "organization";
    }
    if (array.indexOf("Q386724") > -1) {
        return "work";
    }
    if (array.indexOf("Q7184903") > -1 || array.indexOf("Q4026292") > -1 || array.indexOf("Q5127848") > -1 || array.indexOf("Q15401699") > -1 || array.indexOf("Q7184903") > -1) {
        return "concept";
    }
    if (array.indexOf("Q1190554") > -1) {
        return "other";
    }
    if (array.indexOf("Q41176") > -1) { 
        return "object";
    }
    if (array.indexOf("Q8205328") > -1) {
        return "object";
    }
    if (array.indexOf("Q186081") > -1) {
        return "hidden";
    }
    if (array.indexOf("Q488383") > -1) {
        return "object";
    }
    if (array.indexOf("Q15222213") > -1) {
        return "object";
    }
    return "other";
}

function getEntityClassificationTypes(entity) {
    if (entity && entity.classOverride) {
        return [getClassID(entity.classOverride)];
    }

    var types = [];
    var fields = ["type", "specificType", "occupationType", "wikidataTypes"];
    for (var i = 0; i < fields.length; i++) {
        var values = entity && entity[fields[i]];
        if (!Array.isArray(values)) continue;
        for (var j = 0; j < values.length; j++) {
            if (types.indexOf(values[j]) === -1) types.push(values[j]);
        }
    }
    return types;
}

function getEntityFilterTypes(array, primaryType) {
    var types = [primaryType];
    var buildingTypes = ["Q41176", "Q33506", "Q16970", "Q3947", "Q16560", "Q23413", "Q44613"];
    if (primaryType !== "building" && buildingTypes.some(function(type) {
        return array.indexOf(type) > -1;
    })) {
        types.push("building");
    }
    if (primaryType === "building") {
        if (array.indexOf("Q23413") > -1) types.push("castle");
        if (array.indexOf("Q16970") > -1) types.push("church");
        if (array.indexOf("Q44613") > -1) types.push("monastery");
    }
    return types;
}

function entityHasType(element, type) {
    var types = element.getAttribute("data-types");
    return types
        ? types.indexOf("|" + type + "|") > -1
        : element.getAttribute("data-class") === type;
}

function getEntityEventClass(element) {
    var $element = $(element);
    var selectedClass = $("#leftNav .add-button-active-entities").attr("data-class");
    if (selectedClass && selectedClass !== "all" && entityHasType(element, selectedClass)) {
        return selectedClass;
    }
    return $element.attr("data-event-class") || $element.attr("data-class");
}

function isMapSpatialEntityClass(entityClass) {
    return ["place", "site", "castle", "church", "monastery", "building"].indexOf(entityClass) > -1;
}

// Sort elements based on their data-class attribute
function sortByClassFaster(a, b) {
    if (a.getAttribute("data-id") === narra.subjectID) {
        return -1;
    }
    if (b.getAttribute("data-id") === narra.subjectID) {
        return 1;
    }
    var classes = ["person", "organization", "object", "concept", "place", "work"];
    var compare = classes.indexOf(a.getAttribute("data-class")).toString().localeCompare(classes.indexOf(b.getAttribute("data-class")).toString());

    if (compare === 0) {
        return a.textContent.localeCompare(b.textContent);
    } else {
        return compare;
    }
}

// Sort elements based on their data-class attribute
function sortByClass(a, b) {
    if ($(a).attr("data-id") === narra.subjectID) {
        return -1;
    }
    if ($(b).attr("data-id") === narra.subjectID) {
        return 1;
    }
    var classes = ["person", "organization", "object", "concept", "place", "work"];
    var compare = classes.indexOf($(a).attr("data-class")).toString().localeCompare(classes.indexOf($(b).attr("data-class")).toString());

    if (compare === 0) {
        return $(a).text().localeCompare($(b).text());
    } else {
        return compare;
    }
}

function updateEventsCounter() {
    // Add eventCounter to events-counter
    var eventCounter = $('#timeline').children().length;
    $('#events-counter').text(eventCounter);
    var observer = new MutationObserver(function(mutations) {
        mutations.forEach(function() {
            eventCounter = $('#timeline').children().length;
            $('#events-counter').text(eventCounter);
        });
    });
    var config_obs = {childList: true};
    var targetNode = document.getElementById('timeline');
    observer.observe(targetNode, config_obs);
}

// Perform final load: reset workspace and load default events
function finalLoad() {
    $(".spinner").hide();
	hideBootstrapProgress();
    $("#auth-div").hide();
    resetWorkspace();
    console.log(currentTime() + "Reset workspace");
    addNewEntityPopoverTo($("#plusButton"));

    // if there are no events, load default ones
    if (narra.events === undefined || Object.keys(narra.events).length === 0) {
        //defaultEvents();
        console.log(currentTime() + "Created default events");
    } else { // else, display events
        displayAllEvents();
        $("#timeline .timelineEvent").each(function (index, event) {
            $(event).delay(200 * index).fadeIn(200);
        });
        console.log(currentTime() + "Displayed events");
    }

    // Update title of narrative
    updateTitle();

}

// Download data (used for export)
function download(text, filename) {
    var pom = document.createElement("a");
    pom.setAttribute("href", "data:text/plain;charset=utf-8," + encodeURIComponent(text));
    pom.setAttribute("download", filename);
    if (document.createEvent) {
        var event = document.createEvent("MouseEvents");
        event.initEvent("click", true, true);
        pom.dispatchEvent(event);
    } else {
        pom.click();
    }
}

// Truncate entity names
function truncate(string, len) {
    if (string.length > len) {
        return string.substring(0, len).trim() + "...";
    } else {
        return string;
    }
}

// Capitalize first word in a string
function capitalize(string) {
    return string.charAt(0).toUpperCase() + string.slice(1);
}

// Capitalize all words in a string
function titlecase(str) {
    return str.replace(/\w\S*/g, function(txt) {
		return txt.charAt(0).toUpperCase() + txt.substr(1);
	});
}

// Get sources based on author name
function getSources(authorName) {
    var resultArray = [];
    var sources = narra.sourceMap[narra.authorMap[authorName]];
    if (sources) {
        $.each(sources, function (ignore, source) {
            resultArray.push(source.title);
        });
    }
    return resultArray;
}

// Get list of roles based on event type
function getRolesFromEventType(roles) {
    for (var i = 0; i < narra.eventTypes.length; i += 1) {
        if (narra.eventTypes[i][narra.currentLang] === $("#typeInput").val()) {
            itemsByLang($(narra.eventTypes[i].roles)).forEach(function(item) {
                if (roles.indexOf(item) === undefined) {
                    roles.push(item);
                }
            });
            break;
        }
    }
    return roles;
}

// Create element to select roles for people
function makeRoleSelect(entityID) {
	var evid = $("#workspace").attr("data-evid");
    var qids = getRoles(entityID);
    var currentRoles = [];
    var i;

    currentRoles = getRolesFromEventType(currentRoles);

    for (i = 0; i < narra.eventTypes.length; i += 1) {
        if (narra.eventTypes[i][narra.currentLang] === $("#typeInput").val()) {
            currentRoles = itemsByLang($(narra.eventTypes[i].roles)).sort();
            break;
        }
    }
    var participant = {"en": "participant", "it": "partecipante"};
    var other = {"en": "other", "it": "altro"};
    var roles = [];
    var $roleSelect = $("<select class='roleSelect' data-id='" + entityID + "'>").append(
		$("<option selected>").text(participant[narra.currentLang]))
        .change(
        function () {
            if ($(this).val() === "other") {
                $(this).hide();
                $(this).parent().find(".roleInput").removeClass("hidden");
            }
            else {
                $(this).show();
                $(this).parent().find(".roleInput").addClass("hidden");
            }
        }
    );
    if (qids !== undefined) {
        qids.forEach(function (qid, ignore) {
            var role = narra.roles[qid];
            if (role !== undefined) {

				var roleName;

                if (narra.currentLang == 'en' && role.enName !== undefined) {
                    roleName = truncate(role.enName, 32);
                    if (roles.indexOf(roleName) < 0) {
                        roles.push(roleName);
                    }
                }
                else if (narra.currentLang == 'it' && role.enName !== undefined) {
                    roleName = truncate(role.itName, 32);
                    if (roles.indexOf(roleName) < 0) {
                        roles.push(roleName);
                    }
                }
            }
        });
    }
    currentRoles.forEach(function (role, ignore) {
        roles.push(role);
    });
    Object.keys(roles.sort()).forEach(function (item, ignore) {
        $roleSelect.append(
            $("<option>").text(roles[item])
        );
    });
    $roleSelect.append(
        $("<option>").text(other[narra.currentLang])
    );
    if ($roleSelect.find("option").length === 0) {
        $roleSelect = $("<input>").addClass("roleSelect");
    }

	// fix role bug on entity popover
	if (evid in narra.events && entityID in narra.events[evid].props) {
		$roleSelect.append($("<option selected>").text(narra.events[evid].props[entityID].role));
	}
    return $roleSelect;
}

// Load BibTex file from disk
function loadBibFile(e) {
	var file = e.target.files[0];
	if (!file) {
		return;
	}
	var reader = new FileReader();
	reader.onload = function(e) {
		var contents = e.target.result;
		narra.bib = BibtexParser(contents);
		narra.bib._id = "B1";
		var bibList = {"B1": narra.bib};
		saveObjectToDB(bibList, "B1");
		$('.popover').each(function() {
			sourceComplete($(this))
		});
	};
	reader.readAsText(file);
}

// Toggle source details for compact visualization
function toggleSource(element) {
    $(element).parents(".sourceDiv").find(".upperMargin").toggle();
    if ($(element).find('.btn-arrow').text() === "▶") {
        $(element).find('.btn-arrow').text("▼");
    } else {
        $(element).find('.btn-arrow').text("▶");
    }
}

// Hide source details for compact visualization
function hideSource(element) {
    $(element).parents(".sourceDiv").find(".upperMargin").hide();
    $(element).find('.btn-arrow').text("▶");
}

function deleteSource(element) {
    showModal(
        "Delete Source",
        "Are you sure you want to delete this source?",
        "Keep Source",
        "Delete Source",
        function() {},
        function() {
            if ($(element).parents(".sourcesDiv").children().length > 1) {
                $(element).parents(".sourceDiv").remove();
            } else {
                $(element).parents(".sourceDiv").find("input").val("");
                $(element).parents(".sourceDiv").find("textarea").val("");
            }
        }
    );
}

// Bibliography autocomplete
var bibMatcher = function(strs) {
	return function findMatches(q, cb) {

		var matches = [];
		var substrRegex = new RegExp(q, 'i');

		$.each(strs, function(i, str) {
		  if (substrRegex.test(str.Fields.author)) {
			matches.push(str);
		  }
		});

		cb(matches);

	};
};

// Update autocomplete for bibliography
function sourceComplete($sourceBibDiv) {
    $sourceBibDiv.find(".bibInput").typeahead("destroy");
    $sourceBibDiv.find(".bibInput").typeahead(
        {
            minLength: 0,
            hint: false
        },
        {
            source: bibMatcher(narra.bib.entries),
            display: function(obj) {return obj.EntryKey},
            limit: 1000,
        }
    ).bind("typeahead:select", function (ignore, suggestion) {
        $(this).parents(".sourceDiv").find(".titleInput").val(suggestion.Fields.title);
        $(this).parents(".sourceDiv").find(".authorInput").val(suggestion.Fields.author);
    });
}

// Create popover div for source
function makeSourceDiv(heading, author, title, ref, text, coorType, qid, valueRadio=undefined) {

	var eventTypeText = $('#event-type-text').text();

	// display coordinates only in Map events
	if (eventTypeText == 'Map') {

		var $sourceHead = $("<div class='popoverContent' id='popover-radio-div-" + qid + "'>" +
			"<h5 class='showEntity-title'>Visual filter on the map</h5>" +
			"<div class='form-group'>");

		// first check is for displaying the right buttons
		if (coorType == 'point') {
			// second one is for checking the right button
			if (valueRadio == 'isPoint') {
				$sourceHead.append("<input type='radio' id='showEntityPoint" + qid + "' class='radioButtons' name='show-entity" + qid + "' value='showPoint' checked='checked'/>" +
					"<label for='showEntityPoint" + qid + "' id='showEntityPointLabel" + qid + "' class='radioButtonText radioEntities'>Show point</label><br>" +
					"<input type='radio' id='showEntityNothing" + qid + "' class='radioButtons' name='show-entity" + qid + "' value='showNothing'/>" +
					"<label for='showEntityNothing" + qid + "' class='radioButtonText radioEntities'>Show nothing</label><br>" +
					"</div>"
				);
			} else if (valueRadio == 'isNothing') {
				$sourceHead.append("<input type='radio' id='showEntityPoint" + qid + "' class='radioButtons' name='show-entity" + qid + "' value='showPoint'/>" +
					"<label for='showEntityPoint" + qid + "' id='showEntityPointLabel" + qid + "' class='radioButtonText radioEntities'>Show point</label><br>" +
					"<input type='radio' id='showEntityNothing" + qid + "' class='radioButtons' name='show-entity" + qid + "' value='showNothing' checked='checked'/>" +
					"<label for='showEntityNothing" + qid + "' class='radioButtonText radioEntities'>Show nothing</label><br>" +
					makePointCopyMarkup(qid) +
					"</div>"
				);
			} else {
				$sourceHead.append("<input type='radio' id='showEntityPoint" + qid + "' class='radioButtons' name='show-entity" + qid + "' value='showPoint'/>" +
					"<label for='showEntityPoint" + qid + "' id='showEntityPointLabel" + qid + "' class='radioButtonText radioEntities'>Show point</label><br>" +
					"<input type='radio' id='showEntityNothing" + qid + "' class='radioButtons' name='show-entity" + qid + "' value='showNothing'/>" +
					"<label for='showEntityNothing" + qid + "' class='radioButtonText radioEntities'>Show nothing</label><br>" +
					makePointCopyMarkup(qid) +
					"</div>"
				);
			}
		} else if (coorType == 'polygon') {
			if (valueRadio == 'isPolygon') {
				$sourceHead.append("<input type='radio' id='showEntityPolygon" + qid + "' class='radioButtons' name='show-entity" + qid + "' value='showPol' checked='checked'/>" +
					"<label for='showEntityPolygon" + qid + "' id='showEntityPolygonLabel" + qid + "' class='radioButtonText radioEntities'>Show polygon</label><br>" +
					"<input type='radio' id='showEntityNothing" + qid + "' class='radioButtons' name='show-entity" + qid + "' value='showNothing'/>" +
					"<label for='showEntityNothing" + qid + "' class='radioButtonText radioEntities'>Show nothing</label><br>" +
					"</div>"
				);
			} else if (valueRadio == 'isNothing') {
				$sourceHead.append("<input type='radio' id='showEntityPolygon" + qid + "' class='radioButtons' name='show-entity" + qid + "' value='showPol'/>" +
					"<label for='showEntityPolygon" + qid + "' id='showEntityPolygonLabel" + qid + "' class='radioButtonText radioEntities'>Show polygon</label><br>" +
					"<input type='radio' id='showEntityNothing" + qid + "' class='radioButtons' name='show-entity" + qid + "' value='showNothing' checked='checked'/>" +
					"<label for='showEntityNothing" + qid + "' class='radioButtonText radioEntities'>Show nothing</label><br>" +
					makePolygonCopyMarkup(qid) +
					"</div>"
				);
			} else {
				$sourceHead.append("<input type='radio' id='showEntityPolygon" + qid + "' class='radioButtons' name='show-entity" + qid + "' value='showPol'/>" +
					"<label for='showEntityPolygon" + qid + "' id='showEntityPolygonLabel" + qid + "' class='radioButtonText radioEntities'>Show polygon</label><br>" +
					"<input type='radio' id='showEntityNothing" + qid + "' class='radioButtons' name='show-entity" + qid + "' value='showNothing'/>" +
					"<label for='showEntityNothing" + qid + "' class='radioButtonText radioEntities'>Show nothing</label><br>" +
					makePolygonCopyMarkup(qid) +
					"</div>"
				);
			}
		} else if (coorType == 'both') {
			if (valueRadio == 'isPoint') {
				$sourceHead.append("<input type='radio' id='showEntityPoint" + qid + "' class='radioButtons' name='show-entity" + qid + "' value='showPoint' checked='checked'/>" +
					"<label for='showEntityPoint" + qid + "' id='showEntityPointLabel" + qid + "' class='radioButtonText radioEntities'>Show point</label><br>" +
					"<input type='radio' id='showEntityPolygon" + qid + "' class='radioButtons' name='show-entity" + qid + "' value='showPol'/>" +
					"<label for='showEntityPolygon" + qid + "' id='showEntityPolygonLabel" + qid + "' class='radioButtonText radioEntities'>Show polygon</label><br>" +
					"<input type='radio' id='showEntityNothing" + qid + "' class='radioButtons' name='show-entity" + qid + "' value='showNothing'/>" +
					"<label for='showEntityNothing" + qid + "' class='radioButtonText radioEntities'>Show nothing</label><br>" +
					"</div>"
				);
			} else if (valueRadio == 'isPolygon') {
				$sourceHead.append("<input type='radio' id='showEntityPoint" + qid + "' class='radioButtons' name='show-entity" + qid + "' value='showPoint'/>" +
					"<label for='showEntityPoint" + qid + "' id='showEntityPointLabel" + qid + "' class='radioButtonText radioEntities'>Show point</label><br>" +
					"<input type='radio' id='showEntityPolygon" + qid + "' class='radioButtons' name='show-entity" + qid + "' value='showPol' checked='checked'/>" +
					"<label for='showEntityPolygon" + qid + "' id='showEntityPolygonLabel" + qid + "' class='radioButtonText radioEntities'>Show polygon</label><br>" +
					"<input type='radio' id='showEntityNothing" + qid + "' class='radioButtons' name='show-entity" + qid + "' value='showNothing'/>" +
					"<label for='showEntityNothing" + qid + "' class='radioButtonText radioEntities'>Show nothing</label><br>" +
					"</div>"
				);
			} else if (valueRadio == 'isNothing') {
				$sourceHead.append("<input type='radio' id='showEntityPoint" + qid + "' class='radioButtons' name='show-entity" + qid + "' value='showPoint'/>" +
					"<label for='showEntityPoint" + qid + "' id='showEntityPointLabel" + qid + "' class='radioButtonText radioEntities'>Show point</label><br>" +
					"<input type='radio' id='showEntityPolygon" + qid + "' class='radioButtons' name='show-entity" + qid + "' value='showPol'/>" +
					"<label for='showEntityPolygon" + qid + "' id='showEntityPolygonLabel" + qid + "' class='radioButtonText radioEntities'>Show polygon</label><br>" +
					"<input type='radio' id='showEntityNothing" + qid + "' class='radioButtons' name='show-entity" + qid + "' value='showNothing' checked='checked'/>" +
					"<label for='showEntityNothing" + qid + "' class='radioButtonText radioEntities'>Show nothing</label><br>" +
					makePointCopyMarkup(qid) +
					makePolygonCopyContentMarkup(qid) +
					"</div>"
				);
			} else {
				$sourceHead.append("<input type='radio' id='showEntityPoint" + qid + "' class='radioButtons' name='show-entity" + qid + "' value='showPoint'/>" +
					"<label for='showEntityPoint" + qid + "' id='showEntityPointLabel" + qid + "' class='radioButtonText radioEntities'>Show point</label><br>" +
					"<input type='radio' id='showEntityPolygon" + qid + "' class='radioButtons' name='show-entity" + qid + "' value='showPol'/>" +
					"<label for='showEntityPolygon" + qid + "' id='showEntityPolygonLabel" + qid + "' class='radioButtonText radioEntities'>Show polygon</label><br>" +
					"<input type='radio' id='showEntityNothing" + qid + "' class='radioButtons' name='show-entity" + qid + "' value='showNothing'/>" +
					"<label for='showEntityNothing" + qid + "' class='radioButtonText radioEntities'>Show nothing</label><br>" +
					makePointCopyMarkup(qid) +
					makePolygonCopyContentMarkup(qid) +
					"</div>"
				);
			}
		} else {
			$sourceHead.append("<p class='no-coords-popover'>No coordinates found.</p>");
		}

		return $("<div class='popoverContent sourceDiv'>").append($sourceHead);

	}

    return "";
}

function makeEntityClassTypeControl(qid) {
    var isItalian = narra.currentLang === "it";
    var currentClass = typeFromArray(getEntityClassificationTypes(narra.items[qid]));
    var $container = $("<div class='popoverContent popoverCenter lowerMargin entityClassTypeDiv'>");
    var $link = $("<a class='pointer js-class-type-request'>")
        .attr("data-qid", qid)
        .text(isItalian ? "Cambia tipo di classe" : "Change class type");
    var $content = $("<div class='class-type-content' style='display:none;'>");
    var $options = $("<div class='form-group class-type-options'>");

    $("#leftNav .toggle-btn-entities").not("#allButton").each(function(index) {
        var $button = $(this);
        var className = $button.attr("data-class");
        var optionId = "entity-class-" + qid + "-" + index;
        var $radio = $("<input type='radio' class='radioButtons'>")
            .attr("id", optionId)
            .attr("name", "entity-class-" + qid)
            .attr("value", className)
            .prop("checked", className === currentClass);
        var $label = $("<label class='radioButtonText'>")
            .attr("for", optionId)
            .text($button.children("span").text() || className);
        $options.append($radio, $label, "<br>");
    });

    var $confirm = $("<button type='button' class='btn btn-default js-class-type-confirm'>")
        .attr("data-qid", qid)
        .text(isItalian ? "Conferma" : "Confirm");
    var $message = $("<div class='class-type-message' aria-live='polite' style='display:none;'>");
    $content.append($options, $confirm, $message);
    return $container.append($link, $content);
}

// Create popover for entities
function makePopoverContent(self, withForm, evid) {
    var qid = self.attr("data-id");
    var dataClass = self.attr("data-event-class") || self.attr("data-class");

    if (qid === undefined) {
        return "";
    }

    var role = "Role in the event: ";
    var frag = "• Reference: ";
    var textArea = "• Text: ";
    var src = "• Title: ";
    var auth = "• Author: ";
    var primary = "Show on map";
    var deleteLabel = "Delete Entity";
    var addImageLabel = "Add Image";
    var changeImageLabel = "Change Image";
    var $changeClassDiv = makeEntityClassTypeControl(qid);

    if (narra.currentLang === "it") {
        role = "Ruolo nell\"evento: ";
        frag = "• Riferimento: ";
        textArea = "• Testo: ";
        src = "• Titolo: ";
        auth = "• Autore: ";
        primary = "Mostra su mappa";
        deleteLabel = "Cancella entità";
        addImageLabel = "Aggiungi entità";
        changeImageLabel = "Cambia entità";
    }

	var $mainDiv = $("<div class= 'popoverContent ui-front'>")
	.attr("data-id", qid);

	var $deleteDiv = $("<div class='popoverContent popoverCenter lowerMargin'>").append(
		"<div class='popoverDiv'><a class='pointer js-delete-entity' data-qid='" + qid + "'>" + deleteLabel + "</a></div>"
	);

    var image = getImage(qid);

	var $addImageDiv = $("<div class='popoverContent popoverCenter lowerMargin'>").append(
		"<div class='popoverDiv imageLabelDiv'><a class='pointer js-image-request' data-qid='" + qid + "'>" +
		(image !== "" ? changeImageLabel : addImageLabel)
		 + "</a></div>",
        "<div class='popoverDiv imageContentDiv' style='display: none;'>Loading...</div>"
    );

    var $imageDiv = $("<div class='popoverContent popoverCenter lowerMargin'>").append(
        "<div class='popoverDiv'>" +
            (image !== "" ? "<img class='popoverImage' src='" + image.replace("http:", "https:").replace('Special:FilePath', 'Special:Redirect/file').replace('/wiki/', '/w/index.php?title=') + "" + "' alt='Entity image' />" + "</div><hr>" : "<img class='popoverImage' src='' alt='Empty entity image' style='display:none'></div><hr class='popoverImageSeparator' style='display:none'>")
    );

    if (!withForm && qid[0] !== "Q") {
        return $mainDiv.append($imageDiv, $addImageDiv, $changeClassDiv, $deleteDiv);
    }

    if (isMapSpatialEntityClass(dataClass)) {
		// start coords check

		if (narra.items[qid].hasOwnProperty("coordinatesPolygon") && !narra.items[qid].hasOwnProperty("coordinatesPoint")) {
			coorType = 'polygon';
		} else if (narra.items[qid].hasOwnProperty("coordinatesPoint") && !narra.items[qid].hasOwnProperty("coordinatesPolygon")) {
			coorType = 'point';
		} else if (narra.items[qid].hasOwnProperty("coordinatesPolygon") && narra.items[qid].hasOwnProperty("coordinatesPoint")) {
			coorType = 'both';
		} else {
			coorType = '';
		}
		// end coords check

		// start showOnMap property check
		evid = $("#workspace").attr("data-evid");
		var valueRadio = '';

		if (evid !== undefined && evid in narra.events && qid in narra.events[evid].props && narra.events[evid].props[qid].hasOwnProperty('showOnMap')) {
			if (narra.events[evid].props[qid].showOnMap == 'showPoint') {
				valueRadio = 'isPoint';
			} else if (narra.events[evid].props[qid].showOnMap == 'showPol') {
				valueRadio = 'isPolygon';
			} else if (narra.events[evid].props[qid].showOnMap == 'showNothing') {
				valueRadio = 'isNothing';
			}
		}
		// end showOnMap property check

        var $primaryContainer = $("<div class='popoverContent sourcesDiv primaryContainer'>").append(makeSourceDiv(primary, auth, src, frag, textArea, coorType, qid, valueRadio));
    }

    var $wikiDiv = $("<div class='popoverContent popoverCenter lowerMargin'>").append(
        "<div class='popoverDiv'>" +
            "<a class='popoverLink' target='_blank' href='https://" + narra.currentLang + ".wikipedia.org/wiki/" + getLabel(qid).replace(" ", "_").replace(" ", "_").replace(" ", "_") + "'>" +
                "Wikipedia" +
            "</a>" +
            " • " +
            "<a class='popoverLink' target='_blank' href='https://wikidata.org/wiki/" + qid + "'>" +
                "Wikidata" +
            "</a>" +
        "</div>"
    );

    if (withForm && self.attr("data-class") === "person") {
        $mainDiv.append(
            "<div class='popoverContent'>" +
                    "<div class='popoverDiv'>" +
                    "<div class='popoverCell'>" +
                    "<label class='popoverLabel'>" + role + "</label>" +
                    "</div>" +
                    "<div class='popoverCell popoverCell-70'>" +
                    "<input type='text' class='roleInput hidden' autocomplete='off'>" +
                    "</div>" +
                    "</div>" +
                    "</div>"
        );
        $mainDiv.find(".roleInput").before(
            makeRoleSelect(qid)
        );
    }

    if (withForm && narra.events[evid] !== undefined && narra.events[evid].props !== undefined && narra.events[evid].props[qid] !== undefined) {
        var prop = narra.events[evid].props[qid];
        if (prop.role !== undefined) {
            $mainDiv.find(".roleSelect").val(prop.role);
        }
        if (prop.notes !== undefined) {
            $mainDiv.find(".event-source").val(prop.notes);
        }

        if (prop.primary !== undefined) {
            prop.primary.forEach(function (source, i) {
                if (i > 0) {
                    $primaryContainer.find(".sourceDiv:last").after(
                        makeSourceDiv(primary, auth, src, frag, textArea, coorType, qid, undefined)
                    );
                }
            });
        }
    }

    if (withForm) {
        $mainDiv.append($primaryContainer);
    }

    // noinspection PointlessBooleanExpressionJS
	if (qid !== undefined) {
        if ($mainDiv.children().length > 0) {
            $mainDiv.append("<hr>");
        }
        if (!withForm && narra.images[qid] !== undefined) {
            $mainDiv.append(
                "<div class='popoverContent'>" +
                        "<div class='popoverDiv'>" +
                        "<div class='popoverCell popoverCenter'>" +
                        "<img src='" + narra.images[qid] + "' alt='Entity image' >" +
                        "</div>" +
                        "</div>" +
                        "</div>"
            );
        }

        if (!withForm) {
            $mainDiv.append($imageDiv);
            $mainDiv.append($addImageDiv, '<hr>');
        }

        $mainDiv.append($wikiDiv);

        if (!withForm) {
            $mainDiv.append('<hr>', $changeClassDiv, '<hr>', $deleteDiv);
        }

    }
    return $mainDiv.attr("data-id", qid);
}

// Load roles for person
function getRoles(qid) {
    var results = [];
    if (narra.items[qid] !== undefined && narra.items[qid].role !== undefined) {
        results = narra.items[qid].role;
    }
    return results;
}

// Get description for entity
function getDescription(qid) {
    if (qid in narra.items) {
        var desc = narra.items[qid][narra.currentLang + "Desc"].replace(/'/g, "&rsquo;");
        return (desc ? desc : typeFromArray(getEntityClassificationTypes(narra.items[qid])));
    }
    return "";
}

// Set description for entity
function setDescription(qid, desc) {
    if (qid in narra.items) {
        narra.items[qid][narra.currentLang + "Desc"] = desc;
        saveObjectToDB(narra.items, qid);
        return true;
    }
    return false;
}

// Create popover title for entities
function makePopoverTitle(qid) {
    var size = "160%";
    if (getLabel(qid).length > 20) {
        size = "140%";
    }
	var deleteButton = "<div class='deleteButtonPopover js-close-popover'><b class='x'>×</b></div>";
	var title = "<span style='font-size: " + size + "'>" + getLabel(qid) + "</span>";
	var description = "<div class='popoverDesc' data-qid='" + qid + "' contenteditable='true'>" + getDescription(qid) + "</div>";
    return deleteButton + title + description;
}

// Add popover to element
function addPopoverTo($element, withForm, evid, withoutArrow=false) {

	if (withoutArrow) {
		$element.popover({
			html: true,
			placement: function (context, source) {
				var position = $(source).position();

				if (position.left > 515 && position.bottom < 400) {
					return "left";
				}

				if (position.left < 515 && position.bottom < 400) {
					return "right";
				}

				if (position.top < 400) {
					return "bottom";
				}

				return "top";
			},
			container: "body",
			trigger: "manual",
			template: '<div class="popover withoutArrow" role="tooltip"><div class="popover-title"></div><div class="popover-content"></div></div>',
			title: function () {
				return makePopoverTitle($element.attr("data-id"));
			},
			content: makePopoverContent($element, withForm, evid),
			delay: {show: 70, hide: 70}
		});
	} else {
		$element.popover({
			html: true,
			placement: function (context, source) {
				var position = $(source).position();

				if (position.left > 515 && position.bottom < 400) {
					return "left";
				}

				if (position.left < 515 && position.bottom < 400) {
					return "right";
				}

				if (position.top < 400) {
					return "bottom";
				}

				return "top";
			},
			container: "body",
			trigger: "manual",
			title: function () {
				return makePopoverTitle($element.attr("data-id"));
			},
			content: makePopoverContent($element, withForm, evid),
			delay: {show: 70, hide: 70}
		});
	}

    $element.on("show.bs.popover", function(){
        $(this).data("bs.popover").tip().css("width", "28%");
    });

	$element.on("shown.bs.popover", function() {
		var $tip = $(this).data("bs.popover").tip();

		$tip.off("click.opencodeClose", ".js-close-popover").on("click.opencodeClose", ".js-close-popover", function(event) {
			event.preventDefault();
			event.stopPropagation();
			$element.popover("hide");
		});

		$tip.off("click.opencodeDelete", ".js-delete-entity").on("click.opencodeDelete", ".js-delete-entity", function(event) {
			event.preventDefault();
			event.stopPropagation();
			deleteEntity($(this).attr("data-qid"));
		});

		$tip.off("click.opencodeImage", ".js-image-request").on("click.opencodeImage", ".js-image-request", function(event) {
			event.preventDefault();
			event.stopPropagation();
			$(this).toggle();
			$(this).parent().next().toggle().css("display", "inline-block");
			imageRequest($(this).attr("data-qid"), $(this));
		});

		$tip.off("click.opencodeClassType", ".js-class-type-request").on("click.opencodeClassType", ".js-class-type-request", function(event) {
			event.preventDefault();
			event.stopPropagation();
			var $classContent = $(this).siblings(".class-type-content");
			$classContent.toggle();
			$classContent.find(".class-type-message").hide().text("");
		});

		$tip.off("click.opencodeClassTypeConfirm", ".js-class-type-confirm").on("click.opencodeClassTypeConfirm", ".js-class-type-confirm", function(event) {
			event.preventDefault();
			event.stopPropagation();
			var $button = $(this);
			var $classContent = $button.closest(".class-type-content");
			var $message = $classContent.find(".class-type-message");
			var selectedClass = $classContent.find(".class-type-options input:checked").val();
			if (!selectedClass) {
				$message.text(narra.currentLang === "it" ? "Seleziona una classe." : "Select a class.").show();
				return;
			}
			changeEntityClassType($button.attr("data-qid"), selectedClass, $tip);
		});

		$tip.off("click.opencodeCopy", ".js-copy-coors").on("click.opencodeCopy", ".js-copy-coors", function(event) {
			event.preventDefault();
			event.stopPropagation();
			copyToClipboard($(this).attr("data-copy-type"), $(this).attr("data-qid"), this.id, $(this).attr("data-copy-value"));
		});

		$tip.off("keydown.opencodeDesc", ".popoverDesc").on("keydown.opencodeDesc", ".popoverDesc", function(event) {
				if (event.which === 13) {
					event.preventDefault();
					$(this).blur();
				}
			})
			.off("blur.opencodeDesc", ".popoverDesc").on("blur.opencodeDesc", ".popoverDesc", function() {
				setDescription($(this).attr("data-qid"), $(this).text());
			});
	});

    return $element;
}

// Add popover to new entity element
function addNewEntityPopoverTo($element) {

    var addNewLabel = "Add New Entity";

    if (narra.currentLang === "it") {
        addNewLabel = "Aggiungi Nuova Entità";
    }

    $element.popover({
        html: true,
        placement: "right",
        container: "body",
		trigger: "focus",
		title: "<div class='deleteButtonPopover js-close-popover'><b class='x'>×</b></div><span style='font-size: 160%'>" + addNewLabel + "</span>",
        content: makeNewEntityPopoverContent(),
        delay: {show: 70, hide: 70}
    });

    $element.on("show.bs.popover", function(){
		$(this).data("bs.popover").tip().css("width", "24%").attr("data-stop-propagation", "true");
    });

    $element.on("shown.bs.popover", function(){
		var $tip = $(this).data("bs.popover").tip();
		$tip.find(".js-close-popover").off("click.opencode").on("click.opencode", function(event) {
			event.preventDefault();
			event.stopPropagation();
			$element.popover("hide");
		});
		var newItemURI = $('#newItemURI');
        newItemURI.typeahead({
          hint: false,
          highlight: false,
          minLength: 3,
        }, {
          name: 'obj',
          limit: 10,
          display: function(obj) {return obj.label + (obj.description !== undefined ? ' (' + obj.description + ')' : '');},
          source: narra.suggestions
        });
        newItemURI.unbind('typeahead:select');
        newItemURI.val("").bind('typeahead:select', function(ev, suggestion) {
            $(this).parents('.popover').hide();
            addEntityFromIdOrURI(suggestion.id);
        });
    });

    return $element;
}

// Create content for new entity popover
function makeNewEntityPopoverContent() {
    var $mainDiv = $("<div>");
	var $inputChoice = $("<div class='popoverDiv form-group' id='entity-choice'>")
		.append(
			$("<span id='entity-choice-text'>Choose how you want to add a new entity:</span><br>" +
				"<input type='radio' id='uri-radio' class='radioButtons radioEntityBtn' name='entity-choice' value='uri'>" +
				"<label for='uri-radio' class='radioButtonText'>Wikidata URI</label><br>" +
				"<input type='radio' id='manual-radio' class='radioButtons radioEntityBtn' name='entity-choice' value='manual'>" +
				"<label for='manual-radio' class='radioButtonText'>Manual</label><br>")
		);

	var $mainDiv2 = $("<div id='entity-content' style='display: block; visibility: hidden;'>").addClass("popoverContent");

    var $selectDiv = $("<div>").addClass("popoverContent").append(
        $("<div>")
            .addClass("popoverDiv")
            .append(
                $("<div>")
                    .addClass("popoverCell")
                    .append(
                        $("<label>")
                            .text("Class:")
                            .addClass("popoverLabel")
                    ),
                $("<div>")
                    .addClass("popoverCell")
                    .css("text-align", "right")
                    .css("width", "60%")
                    .append(
                        $("<select required>")
                            .attr("id", "newEntityType")
                            .attr("class", "typeSelect")
                            .append(
                                $("<option disabled selected hidden>Select Class</option>"),
                                $("<option>").text("person"),
                                $("<option>").text("organization"),
                                $("<option>").text("object"),
                                $("<option>").text("concept"),
                                $("<option>").text("place"),
                                $("<option>").text("work"),
                                $("<option>").text("other")
                            )
                    )
            )
    );

    var hr = "<hr>";

    var $newEntityName = $("<div>").addClass("popoverContent").append(
        $("<div>")
            .addClass("popoverDiv")
            .append(
                $("<div>")
                    .addClass("popoverCell")
                    .append(
                        $("<label>")
                            .text("Name:")
                            .addClass("popoverLabel")
                            .css("margin-top", "1%")
                            .css("margin-bottom", "1%")
                    ),
                $("<div>")
                    .addClass("popoverCell")
                    .css("text-align", "right")
                    .css("width", "60%")
                    .append(
                        $("<input>")
                            .attr("id", "newEntityName")
                    )
            )
    );

    var $newEntityDesc = $("<div>").addClass("popoverContent").css("margin-top", "2%").append(
        $("<div>")
            .addClass("popoverDiv")
            .append(
                $("<div>")
                    .addClass("popoverCell")
                    .append(
                        $("<label>")
                            .text("Description:")
                            .addClass("popoverLabel")
                            .css("margin-top", "1%")
                            .css("margin-bottom", "1%")
                    ),
                $("<div>")
                    .addClass("popoverCell")
                    .css("text-align", "right")
                    .css("width", "60%")
                    .append(
                        $("<input>")
                            .attr("id", "newEntityDesc")
                    )
            )
    );

    var $newItemURI = $("<div id='uri-div' style='display: table; visibility: hidden;'>").addClass("popoverContent").css("margin-top", "2%").append(
        $("<div>")
            .addClass("popoverDiv")
            .append(
                $("<div>")
                    .addClass("popoverCell")
                    .append(
                        $("<label>")
                            .text("Search Wikidata:")
                            .addClass("popoverLabel")
                            .css("margin-top", "1%")
                            .css("margin-bottom", "1%")
                    ),
                $("<div>")
                    .addClass("popoverCell")
                    .css("text-align", "right")
                    .css("width", "60%")
                    .append(
                        $("<input>")
                            .attr("id", "newItemURI")
                    )
            )
    );

	var $addButtonDiv = $("<div id='div-entity-btn' style='display: block; visibility: hidden;'>").append(
		$("<div id='addEntityButton' class='btn btn-default' style='display: table'>Add</div>")
	);
    var $secondDiv = $("<div id='secondChoice' style='display: block; visibility: hidden;'>").append(
        hr,
        $selectDiv,
        hr,
        $newEntityName,
        $newEntityDesc
    );
    return $mainDiv.append($inputChoice, $mainDiv2.append($newItemURI, $secondDiv, $addButtonDiv));
}

// Function to add new entities from Wikidata ID or Wikidata/Wikipedia URI
function addEntityFromIdOrURI(value) {

	var missingData = false;

	// data validation
	if ($('#uri-radio').is(':checked')) {

		if ($('#newItemURI').val() == '') {
			missingData = true;
		}

	} else if ($('#manual-radio').is(':checked')) {
		var selectedOption = $("#newEntityType").find(":selected").text();

		if (selectedOption == 'Select Class' || selectedOption == '') {
			missingData = true;
		}

		if ($('#newEntityName').val() == '' || $('#newEntityDesc').val() == '') {
			missingData = true;
		}

	} else {
		missingData = true;
	}

	if (missingData) {
		showAlert('new-entity-error', 'Please insert all required information.', 'warning');
		return;
	}

    if (!value) {
        addEntity();
    } else {
        if (value.indexOf("wikipedia.org") > -1) {
            var title = value.split("/wiki/")[1];
            var lang = value.split("https://")[1].split(".wikipedia.org")[0];
            newEntityRequest(title, lang);
        } else if (value.startsWith("Q")) {
			var searchEntities = $("#controls .data[data-id=" + value + "]");
            if (searchEntities.length == 0) {
				sparqlRequest([value], narra.counter + 1, function (item) {
					addEntity(item);
				}, true, true);
			} else {
				$('.inner-shadow').removeClass("inner-shadow");
				searchEntities.addClass("inner-shadow");
				searchEntities.get(0).scrollIntoView();
			}
		} else if (value.indexOf("wikidata.org") > -1) {
            value = value.split("/wiki/").slice(-1)[0];
            sparqlRequest([value], narra.counter + 1, function (item) {
                addEntity(item);
            }, true, true);
        }
    }

	resetEntityPopover();
	hideEntityPopover();
	showAlert('new-entity-success', 'Entity saved successfully.', 'success');
}

// Get Wikidata class ID from class/type name
function getClassID(type) {
    type = type.toLowerCase();

    if (type === "other") {
        return "other";
    }
    if (type === "event") {
        return "Q1190554";
    }
    if (type === "person") {
        return "Q5";
    }
    if (type === "organization") {
        return "Q43229";
    }
    if (type === "concept") {
        return "Q7184903";
    }
    if (type === "object") {
        return "Q15222213";
    }
    if (type === "place") {
        return "Q17334923";
    }
    if (type === "work") {
        return "Q386724";
    }
    if (type === "fictionalcharacter") {
        return "Q4271324";
    }
    if (type === "epigraph") {
        return "Q1640824";
    }
    if (type === "rock engraving") {
        return "Q42195";
    }
    if (type === "site") {
        return "Q839954";
    }
    if (type === "castle") {
        return "Q23413";
    }
    if (type === "monastery") {
        return "Q44613";
    }
    if (type === "church") {
        return "Q16970";
    }
    if (type === "building") {
        return "Q41176";
    }
}

function changeEntityClassType(qid, selectedClass, $popover) {
    var entity = narra.items[qid];
    var $message = $popover.find(".class-type-message");
    var isItalian = narra.currentLang === "it";

    if (!entity) {
        console.error("Cannot change class for missing entity:", qid);
        $message.text(isItalian ? "Entità non trovata." : "Entity not found.").show();
        return;
    }

    var currentClass = typeFromArray(getEntityClassificationTypes(entity));
    if (selectedClass === currentClass) {
        $message.text(isItalian ? "La classe selezionata è già quella attuale." : "This entity already has that class.").show();
        return;
    }

    var selectedTypeId = getClassID(selectedClass);
    if (!selectedTypeId) {
        console.error("Cannot change entity to an unsupported class:", selectedClass);
        $message.text(isItalian ? "La classe selezionata non è valida." : "The selected class is invalid.").show();
        return;
    }

    entity.type = [selectedTypeId];
    entity.classOverride = selectedClass;
    var classificationTypes = getEntityClassificationTypes(entity);
    var entityClass = typeFromArray(classificationTypes);
    var dataTypes = "|" + getEntityFilterTypes(classificationTypes, entityClass).join("|") + "|";

    $(".data").filter(function() {
        return $(this).attr("data-id") === qid;
    }).each(function() {
        var $element = $(this);
        var previousClass = $element.attr("data-class");
        if (previousClass) {
            $element.removeClass(previousClass);
        }
        $element.addClass(entityClass)
            .attr("data-class", entityClass)
            .attr("data-types", dataTypes)
            .css("background-color", getColor(entityClass));
        if ($element.attr("data-event-class") !== undefined) {
            $element.attr("data-event-class", entityClass);
        }
    });

    var changedEventIds = [];
    Object.keys(narra.events).forEach(function(eventId) {
        var event = narra.events[eventId];
        if (event && event.props && Object.prototype.hasOwnProperty.call(event.props, qid)) {
            if (!event.props[qid] || typeof event.props[qid] !== "object") {
                event.props[qid] = {};
            }
            event.props[qid].class = entityClass;
            changedEventIds.push(eventId);
        }
    });

    saveObjectToDB(narra.items, qid);
    changedEventIds.forEach(function(eventId) {
        saveObjectToDB(narra.events, eventId);
    });

    showEntityClassInControls(entity);
    $popover.find(".class-type-options input").prop("checked", false).filter(function() {
        return this.value === entityClass;
    }).prop("checked", true);
    $message.text(isItalian ? "Classe aggiornata." : "Class updated.").show();
}

function getNextUid() {
    return "U" + new Date().getTime() + Math.floor(Math.random() * 10000000);
}

function showEntityClassInControls(item) {
    var entityClass = typeFromArray(getEntityClassificationTypes(item));
    var $classButton = $("#leftNav .toggle-btn-entities").filter(function() {
        return $(this).attr("data-class") === entityClass;
    });

    if ($classButton.length === 0) {
        $classButton = $("#allButton");
    }

    if (!$classButton.hasClass("add-button-active-entities")) {
        $classButton.trigger("click");
    }
}

// Add new entity
function addEntity(item) {
	var newEntityName = $("#newEntityName");
	var newEntityDesc = $("#newEntityDesc");
	var newEntityType = $("#newEntityType");
    if (!item) {
        if (newEntityName.val() !== "") {
            item = {
                "_id": getNextUid(),
                "_rev": undefined,
                "itName": newEntityName.val(),
                "enName": newEntityName.val(),
                "itDesc": newEntityDesc.val(),
                "enDesc": newEntityDesc.val(),
                "type": [getClassID(newEntityType.val())]
            };
            narra.items[item._id] = item;
            saveObjectToDB(narra.items, item._id);
        }
        else {
            return false;
        }
    }
	newEntityType.val("");
    newEntityName.val("");
    newEntityDesc.val("");
    $("#newItemURI").val("");

    var $element = makeStaticDraggable($(makeDataDiv(item._id, true)));

    var inserted = false;
    $("#controls .data").each(function () {
        if ($(this).attr("data-id") === narra.subjectID) {
            return true;
        }
        if ($(this).text() > capitalize(item[narra.currentLang + "Name"])) {
            $element.insertBefore($(this)).fadeIn("fast");
            inserted = true;
            return false;
        }
    });
    if (!inserted) {
        $("#data-container").append($element);
        $element.fadeIn("fast");
    }

    showEntityClassInControls(item);

    $('.inner-shadow').removeClass("inner-shadow");
	var searchId = $("#controls .data[data-id=" + item._id + "]");
    searchId.addClass("inner-shadow");
    var itemToScrollTo = searchId.get(0);
    if (itemToScrollTo !== undefined) {
        console.log(currentTime() + 'Added ' + item._id + ' to list');
        itemToScrollTo.scrollIntoView();
    } else {
        console.log(currentTime() + 'Cannot load entity ' + item._id);
    }
}

function dataDivClick(div, withoutArrow=false, clickEvent) {
    if (div.parent().prop("className").indexOf("eventBottom") === -1) {
		if (clickEvent) {
			clickEvent.stopPropagation();
		}
        $(".popover:not([attr=" + div.attr("data-id") + "])").hide();
        if (!div.data("bs.popover")) {
			if (withoutArrow) { // it means that the entity is in #container #data-container, not in the workspace
				addPopoverTo(div, undefined, undefined, withoutArrow);
			} else {
				addPopoverTo(div);
			}
        } else {
            var ppvr = $(".popover[id='" + div.attr("aria-describedby") + "']");
			ppvr.find('.imageContentDiv').hide();
			ppvr.find('.imageLabelDiv > a').show();
		}
		div.popover("show");
	}
}

// Create div representing an entity
function makeDataDiv(qid, withoutArrow=false) {
    if (narra.items[qid] !== undefined) {
        var classificationTypes = getEntityClassificationTypes(narra.items[qid]);
        var type = typeFromArray(classificationTypes);
        var dataTypes = "|" + getEntityFilterTypes(classificationTypes, type).join("|") + "|";
		var originalTitle = narra.items[qid].enName;
		if (withoutArrow) {
			return "<a class='data " + type + "' role='button' tabindex=-1 data-id='" + qid + "' data-class='" + type + "' data-types='" + dataTypes + "' style='background-color: " + getColor(type) + "' data-originalTitle='" + originalTitle +"' data-builder-click='1' data-without-arrow='1'>" +
				truncate(capitalize(getLabel(qid)), Math.floor(($("#controls").width() / 10) * parseInt($("body").css("font-size").replace("px", "")) / 40)) + "</a>";
		} else {
			return "<a class='data " + type + "' role='button' tabindex=-1 data-id='" + qid + "' data-class='" + type + "' data-types='" + dataTypes + "' style='background-color: " + getColor(type) + "' data-originalTitle='" + originalTitle +"' data-builder-click='1' data-without-arrow='0'>" +
				truncate(capitalize(getLabel(qid)), Math.floor(($("#controls").width() / 10) * parseInt($("body").css("font-size").replace("px", "")) / 40)) + "</a>";
		}
    } else {
        return false;
    }
}

// Confirm removal of entity from event
function confirmRemove(entity) {
    showModal(
        "Remove Entity",
        "Removing the entity from the event will delete all the data you inserted in it. Are you sure you want to remove the entity?",
        "Keep Entity",
        "Remove Entity",
        function() {
            $("#inputDiv").children('.data').css("opacity", 1);
        },
        function() {
            entity.parent().find(".data[data-id=" +
                entity.attr("data-id") + "]").remove();

			// remove popover of the entity
			var aria = entity.attr("aria-describedby");
			if (aria !== undefined) {
				$(".popover[id=" + aria + "]").remove();
			}

			var inputDiv = $("#inputDiv");
            if (inputDiv.children().length === 1 && inputDiv.children().first().attr("id") === "inputHelp") {
                inputDiv.css("vertical-align", "middle");
                $("#inputHelp").show();
            }
        }
    );
}

// Make element draggable (with clone)
function makeStaticDraggable($element) {
    $element
        .draggable({
            helper: function (withPopover) {
                var $copy = $(this).clone();
                $copy.css("width", $(this).width());
				$copy.css("border-radius", 10);
                if (withPopover !== undefined) {
                    addPopoverTo($copy, true);
                }
                return $copy;
            },
            appendTo: "body",
            revert: false,
            scroll: false
        });
    return $element;
}

// Make element draggable (without clone)
function makeDraggable($element) {
    $element
        .draggable({
            helper: function () {
                $(".popover").hide();
                var $copy = $(this).clone();
                $copy.css("width", $(this).width());
				$copy.css("border-radius", 10);
                $(this).css("opacity", 0);
                addPopoverTo($copy, true);
                return $copy;
            },
            start: function (ignore, ui) {
                ui.helper.data('dropped', false);
            },
            stop: function (ignore, ui) {
                if (!ui.helper.data('dropped')) {
                    confirmRemove($(this));
                }
                else {
                    $(this).parent().find(".data[data-id=" + $(this).attr("data-id") + "]").css("opacity", 1);
                }
            },
            appendTo: "body",
            revert: "valid",
            scroll: false
        });
    return $element;
}

function manageWorkspace(addButton, workspace, buttonsToDisable, forceWorkspace) {
	if (forceWorkspace) {
		$("#event-type").css("display", "none");
		workspace.css("display", "block");
		if (buttonsToDisable.hasClass("disabledButton")) {
			buttonsToDisable.toggleClass("disabledButton");
		}
	} else {
		if (workspace.css("display") == "none") {
			$("#event-type").css("display", "none");
			workspace.css("display", "block");
			if (buttonsToDisable.hasClass("disabledButton")) {
				buttonsToDisable.toggleClass("disabledButton");
			}
			if (addButton.hasClass("add-button-active")) {
				addButton.toggleClass("add-button-active");
			}
		} else {
			workspace.css("display", "none");
			$("#event-type").css("display", "flex");
			buttonsToDisable.toggleClass("disabledButton");
			addButton.toggleClass("add-button-active");
		}
	}
}

function switchContainerEventType(forceWorkspace, checkChanges) {
	$('#three-d-event-options').hide();

	// always set workspace on top
	document.getElementById('workspace').scrollTop = 0;
	window.scrollTo(0, 0);

	var addButton = $("#addButton");
	var workspace = $("#workspace");
	var buttonsToDisable = $("#saveButton,#cancelButton");

	// remove class after the first load, set in startQueries()
	if (addButton.hasClass("disabledButton")) {
		addButton.toggleClass("disabledButton");
	}

	// show modal if it is allowed to check changes, workspace is not empty, there are no new changes and 'New Event' button is not active
    if ((checkChanges) && (!workspaceIsEmpty()) && (!checkNewChanges()) && (!addButton.hasClass("add-button-active"))) {
        showModal(
            "Confirm new event",
            "Changes made to the current event will be lost. Are you sure to proceed?",
            "Cancel",
            "Create new event",
            function () {
            },
            function () {
				resetWorkspace();
				manageWorkspace(addButton, workspace, buttonsToDisable, forceWorkspace);
            }
        );
    } else {
        manageWorkspace(addButton, workspace, buttonsToDisable, forceWorkspace);
    }
}

function returnToInterface(toSwitch, checkChanges) {
    if (toSwitch){
        switchContainerEventType(true, checkChanges);
    } else {
        switchContainerEventType(false, checkChanges);
    }
}

// Textarea height fit with content on load
function setTextareaHeight(textarea) {
    if (textarea.value != '' && textarea.id != 'polygonArea') {
        textarea.style.height = 'auto';
        textarea.style.height = (textarea.scrollHeight) + 'px';
    } else {
        textarea.style.height = 'auto';
    }
}

function adjustText(container) {

	var url = $(container).attr("data-url");
	var $textElement = $(container).children('.truncated-value');
	var originalText;

	var evid = $("#workspace").attr("data-evid");

	if (evid && evid in narra.events) {
		var array_objects = narra.events[evid].objurl;
		var notFound = true;
		for (var i=0; i<array_objects.length; i++) {
			if (array_objects[i].url == url) {
				originalText = array_objects[i].title;
				notFound = false;
			}
		}

		// in case it is a new digital object
		if (notFound) {
			originalText = $(container).children(".hidden-true-value").text();
		}

	} else {
		originalText = $(container).children(".hidden-true-value").text();
	}

	// Calculate the available width
	var containerWidth = container.width();
	var characterWidth = 10; // Average of the width of a character

	// Calculate the number of character that can stay inside the container
	var maxLength = Math.floor(containerWidth / characterWidth);

	// Truncate the text, if necessary, and innerHTML decodes HTML entities
	$textElement.html(truncate(originalText, maxLength));
}

function selectDigObjs() {

	var $container;

	$container = $("#digobjTable .digobjPreview");
	$container.each(function() {
		adjustText($(this));
	});
}

function displayWorkspace(typeString, returnToUI, checkChanges) {
	var eventTypeText = $('#event-type-text');
	var eventTypeIcon = $('#event-type-icon');
	var modelDetailLabel = $('#model-detail-label');
	var modelDetailHelp = $('#model-detail-help');
	formType = normalizeEventFormType(typeString);
    // Show common fields for all types
    document.getElementById('place-group').style.display = "none";
    document.getElementById('title-group').style.display = "block";
    document.getElementById('entitiesDiv').style.display = "table";
    document.getElementById('entitiesLabel').style.display = "table-row";
    document.getElementById('descDiv').style.display = "table";
    document.getElementById('even-source-div').style.display = "table";
    document.querySelector('.image-group').style.display = "flex";
    document.getElementById('caption-group').style.display = "block";
    document.getElementById('digobjDiv').style.display = "table";
    document.getElementById('digobjTable').style.display = "block";
    document.getElementById('position-group').style.display = "block";
	document.getElementById('coors-map').style.display = "none";
	document.getElementById('polygon').style.display = "none";
	eventTypeIcon.css("display", "block").empty();
	eventTypeText.css("display", "block").empty();

	eventTypeText.text(capitalize(formType));

	if (formType == "map") {
		document.getElementById('location-title').style.display = "block";
		document.getElementById('choose-coors').style.display = "none";
		document.getElementById('date-group').style.display = "table";
		document.getElementById('typeDiv').style.display = "block";
		document.getElementById('id-group').style.display = "none";
		document.getElementById('number-group').style.display = "none";
		document.getElementById('map-editor-group').style.display = "table";
		document.getElementById('place-group').style.display = "block";
		document.getElementById('backImgDiv').style.display = "none";
		eventTypeIcon.prepend("<i id='map-icon-event-type' class='fa-solid fa-map'></i>");
	} else if (formType == "sketchfab") {
		document.getElementById('location-title').style.display = "none";
		document.getElementById('choose-coors').style.display = "none";
		document.getElementById('date-group').style.display = "none";
		document.getElementById('typeDiv').style.display = "none";
		document.getElementById('id-group').style.display = "block";
		document.getElementById('number-group').style.display = "block";
		document.getElementById('map-editor-group').style.display = "none";
		document.getElementById('place-group').style.display = "none";
		document.getElementById('backImgDiv').style.display = "none";
		modelDetailLabel.text('Sketchfab annotation');
		modelDetailHelp.attr('data-original-title', 'It is the number of the sketchfab annotation.');
		// noinspection HtmlUnknownTarget
		eventTypeIcon.prepend("<img id='sketch-icon-event-type' src='img/sketchfab.png' alt='Sketchfab icon' width='20' height='20'>");
	} else if (formType == "Aton") {
		document.getElementById('location-title').style.display = "none";
		document.getElementById('choose-coors').style.display = "none";
		document.getElementById('date-group').style.display = "none";
		document.getElementById('typeDiv').style.display = "none";
		document.getElementById('id-group').style.display = "block";
		document.getElementById('number-group').style.display = "block";
		document.getElementById('map-editor-group').style.display = "none";
		document.getElementById('place-group').style.display = "none";
		document.getElementById('backImgDiv').style.display = "none";
		modelDetailLabel.text('Aton view point');
		modelDetailHelp.attr('data-original-title', 'The selected viewpoint is filled automatically from the embedded ATON viewer.');
		eventTypeIcon.prepend("<i id='aton-icon-event-type' class='fa-solid fa-cube'></i>");
    } else {
		document.getElementById('location-title').style.display = "none";
		document.getElementById('choose-coors').style.display = "none";
		document.getElementById('date-group').style.display = "table";
		document.getElementById('typeDiv').style.display = "block";
		document.getElementById('id-group').style.display = "none";
		document.getElementById('number-group').style.display = "none";
		document.getElementById('map-editor-group').style.display = "none";
		document.getElementById('place-group').style.display = "none";
		document.getElementById('backImgDiv').style.display = "flex";
		eventTypeIcon.prepend("<i id='slide-icon-event-type' class='fa-solid fa-file-powerpoint'></i>");
    }

	if (returnToUI) {
        returnToInterface(true, checkChanges);
    } else {
        returnToInterface(false, checkChanges);
    }

	if (typeof narraAtonEditor !== 'undefined') {
		narraAtonEditor.setFormType(formType);
	}
	if (typeof narraMapEditor !== 'undefined') {
		narraMapEditor.setFormType(formType);
	}
	if (typeof narraSketchfabEditor !== 'undefined') {
		narraSketchfabEditor.setFormType(formType);
	}
}





// Reset all elements in the workspace
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

	// check if there are more than one image sections
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

    dateInputStart.click(function () {
        event.cancelBubble = true;
        if (event.stopPropagation) {
            event.stopPropagation();
        }
        if (dateIsValid(dateInputStart.val())) {
            dateInputStart.popover("show");
        }
    });

    dateInputEnd.click(function () {
        event.cancelBubble = true;
        if (event.stopPropagation) {
            event.stopPropagation();
        }
        if (dateIsValid(dateInputEnd.val())) {
            dateInputEnd.popover("show");
        }
    });

    $("#descArea").val("");
    $("#event-source").val("");
    $("#digobjInput").val("");
    $("#digobjTitle").val("");
    $("#digobjTable").empty();

    inputDiv.droppable({
        drop: function (ignore, ui) {

			// start polygon check
			var evid = $("#workspace").attr("data-evid");
            var qidK = ui.draggable.attr("data-id");
			var eventTypeText = $('#event-type-text').text();

			if (isMapSpatialEntityClass(getEntityEventClass(ui.draggable[0])) && eventTypeText == 'Map') {

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

							// if the query result is a point
							if (data.results.bindings[h].wkt.value.toUpperCase().startsWith("POINT")) {

								narra.items[qidK].coordinatesPoint = data.results.bindings[h].wkt.value;
							copyTitle = "<br><h5 class='showEntity-title'>Copy the coordinates to the clipboard</h5>";
							copyPoint = makePointCopyContentMarkup(qidK);

								if (radioPoint == '' && narra.items[qidK].hasOwnProperty('coordinatesPoint')) {
									if (evid in narra.events && qidK in narra.events[evid].props && 'showOnMap' in narra.events[evid].props[qidK]) {
										if (narra.events[evid].props[qidK].showOnMap == 'showPoint') {

											// checked
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

							// if the query result is a polygon
							} else if (data.results.bindings[h].wkt.value.toUpperCase().startsWith("MULTIPOLYGON") || data.results.bindings[h].wkt.value.toUpperCase().startsWith("POLYGON")) {

								narra.items[qidK].coordinatesPolygon = data.results.bindings[h].wkt.value;
							copyTitle = "<br><h5 class='showEntity-title'>Copy the coordinates to the clipboard</h5>";
							copyPol = makePolygonCopyContentMarkup(qidK);

								if (radioPolygon == '' && narra.items[qidK].hasOwnProperty('coordinatesPolygon')) {
									if (evid in narra.events && qidK in narra.events[evid].props && 'showOnMap' in narra.events[evid].props[qidK]) {
										if (narra.events[evid].props[qidK].showOnMap == 'showPol') {

											// checked
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

						// those two serve when .droppable() is not able to find the entity's property whereas it is actually saved in narra.items
                        if (!radioPoint && narra.items[qidK].hasOwnProperty('coordinatesPoint')) {

							if (evid in narra.events && qidK in narra.events[evid].props && narra.events[evid].props[qidK].showOnMap == 'showPoint') {

								// checked
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

								 // checked
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
								"<br><h5 class='showEntity-title'>Copy the coordinates to the clipboard</h5>" +
								copyPoint +
								copyPol);
						} else if (radioPoint != '' || radioPolygon != '') {
							radioDiv.append("<h5 class='showEntity-title'>Visual filter on the map</h5>" +
								"<div class='form-group'>" + radioPoint + radioPolygon +
								"<input type='radio' id='showEntityNothing" + qidK + "' class='radioButtons' name='show-entity" + qidK + "' value='showNothing'/>" +
								"<label for='showEntityNothing" + qidK + "' class='radioButtonText radioEntities'>Show nothing</label><br></div>");
						} else {
							radioDiv.append("<h5 class='showEntity-title'>Visual filter on the map</h5>" +
								"<div class='form-group'>" + "<p class='no-coords-popover'>No coordinates found.</p>" +
								"</div>"
							);
						}

						if ((!(evid in narra.events) || !(qidK in narra.events[evid].props) || !('showOnMap' in narra.events[evid].props[qidK]) || (narra.events[evid].props[qidK].showOnMap == undefined)) && (radioPoint != '' || radioPolygon != '')) {
							radioDiv.append("<br><h5 class='showEntity-title'>Copy the coordinates to the clipboard</h5>" +
								copyPoint +
								copyPol +
								"</div>");
						} else {
							radioDiv.append("");
						}

						//save entity with point and polygon updated
						saveObjectToDB(narra.items, qidK);
					} else {
						radioDiv.append("<h5 class='showEntity-title'>Visual filter on the map</h5>" +
							"<div class='form-group'>" + "<p class='no-coords-popover'>No coordinates found.</p>" +
							"</div>"
						);
					}

					// update popover position
					$(function () {
						$.fn.popover.Constructor.prototype.reposition = function () {
							var $tip = this.tip();

							var placement = typeof this.options.placement === 'function' ? this.options.placement.call(this, $tip[0], this.$element[0]) : this.options.placement;

							var pos = this.getPosition();
							var actualWidth = $tip[0].offsetWidth;
							var actualHeight = $tip[0].offsetHeight;

							var orgPlacement = placement;
							var viewportDim = this.getPosition(this.$viewport);

							placement = placement === 'bottom' &&
							pos.bottom + actualHeight > viewportDim.bottom ? 'top' : placement === 'top' &&
							pos.top - actualHeight < viewportDim.top ? 'bottom' : placement === 'right' &&
							pos.right + actualWidth > viewportDim.width ? 'left' : placement === 'left' &&
							pos.left - actualWidth < viewportDim.left ? 'right' : placement;

							$tip.removeClass(orgPlacement).addClass(placement);

							var calculatedOffset = this.getCalculatedOffset(placement, pos, actualWidth, actualHeight);

							this.applyPlacement(calculatedOffset, placement);
						}

						$(".popover[id="+ aria + "]").popover('reposition');
					});

				}).fail(function() { console.log("OSM Query error"); });

			}
            // end polygon check

            ui.helper.data("dropped", true);
            $(this).parents('.form-group, .form-inline, #entitiesDiv, .twitter-typeahead').removeClass("has-error");
            $(this).css("vertical-align", "top");
            $("#inputHelp").hide();
            if ($("#inputDiv .data[data-id=" + ui.draggable.attr("data-id") + "]").length === 0) {
                var $drag = ui.draggable.clone();
                makeDraggable($drag);
                $drag.popover("destroy");
                addPopoverTo($drag, true);
                $drag.mousedown(
                    function () {
                        $(".popover:not([attr=" + $(this).attr("data-id") + "])").hide();
                    }
                );
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

    // markerMapColor default
    $("#markerMapColor").val("#a5a5a5");

    // Set textarea height
    var textareas = document.getElementsByTagName('textarea');
    for (var elem of textareas) {
        setTextareaHeight(elem);
    }

}

// Show popover for specific element
function showPopoverForDiv(element) {
    $(".popover:not([attr='" + element.attr("data-id") + "'])").hide();
    if (element.attr("aria-describedby") != undefined) {
        $(".popover[id='" + element.attr("aria-describedby") + "']").show();
    } else element.popover("show");
}

// Update text of an entity element
function updateDataText($element) {
    $element.text(function () {
        return truncate(capitalize(getLabel($element.attr("data-id"))), Math.floor(($element.width() * 0.39) * parseInt($("body").css("font-size").replace("px", "")) / 40));
    });
}

// Update language of labels of all entity elements
function updateDataLang() {
    $(".data").each(function () {
        $(this).text(truncate(capitalize(getLabel($(this).attr("data-id"))), Math.floor(($(this).width() * 0.39) * parseInt($("body").css("font-size").replace("px", "")) / 40)));
    });
    $("#inputDiv .data").each(function () {
        $(this).popover("destroy");
        addPopoverTo($(this), false);
    });
}

// Make title of narrative
function makeTitle() {

	var type = typeFromArray(getEntityClassificationTypes(narra.items[narra.subjectID]));

   if (narra.currentLang === "it") {
        if (type === "person") {
			return "";
        } else {
            return "";
        }
    } else {
        if (type === "person") {
			return "";
        } else {
            return "";
        }
    }
}


function confirmUpdateTitle(){

	var currentTitle = $("#bigName").text();
	var inputTitle= "<input type='text' id='newBigTitle' value='"+currentTitle+"'>";

	showModal(
		"Change narrative title",
		"<label for='newBigTitle' class='entitiesLabel'>New title</label>" + inputTitle,
		"Back",
		"Confirm",
		function() {
		},
		function() {
			insertTitle();
		}
	);

}

function showModalTooltip(thisElement) {

	$(thisElement).tooltip({
		animated: 'fade',
		placement: 'auto',
		trigger: 'manual'
	});
	// if the tooltip is visible, hide it, otherwise, show it
	if ($(thisElement).attr('aria-describedby')) {
		$(thisElement).tooltip('hide');
	} else {
		$(thisElement).tooltip('show');
	}

}

function toggleArrow(thisElement) {
	if ($(thisElement).hasClass('fa-caret-right')) {
		$(thisElement).removeClass('fa-caret-right');
		$(thisElement).addClass('fa-caret-down');
	} else {
		$(thisElement).removeClass('fa-caret-down');
		$(thisElement).addClass('fa-caret-right');
	}
}

function showCoverImage(thisElement) {
	toggleArrow(thisElement);

	var coverImage = document.getElementById('cover-image');

	$(coverImage).empty();

	var coverImgValue = narra.info["coverImg"];

	if (coverImgValue) {
		$(coverImage).append("<img src='" + coverImgValue + "' alt='Narrative cover image' id='cover-image-file'>");
	}
}

function confirmCoverPage() {

	// if narra.info["coverImg"] is undefined set an empty string
	var currentCoverImage = narra.info["coverImg"] === undefined ? "" : narra.info["coverImg"];

	var inputCoverImage;

    if (currentCoverImage) {

		inputCoverImage = "<div id='cover-image-modal'><div id='cover-image-div'><label for='coverImage' class='entitiesLabel label-tooltip'>New cover image</label><a class='tooltips js-show-modal-tooltip' data-toggle='tooltip' data-original-title='Default value shows a map in the background.'><i class='fa-solid fa-circle-info'></i></a><input autocomplete='off' id='coverImage' type='text' value='" + currentCoverImage + "' class='input-append form-control' placeholder='Insert URL of an image' style='font-size: 14px; text-align: left !important;'></div>" +
			"<div id='cover-image-button-div' class='button-image-div'><button type='button' id='selectCoverImage' class='btn btn-default selectEventLocalImage' style='overflow: hidden;'>Upload image</button></div>" +
			"<input style='display: none;' type='file' id='coverImgInput' class='coverImgInput'></div>" +
			"<span id='spoiler-cover-image' data-toggle='collapse' data-target='#cover-image'>Show image <i class='fa-solid fa-caret-right toggle-arrow' id='arrow-cover-image'></i></span>" +
			"<div id='cover-image' class='collapse'></div>";

	} else {

		inputCoverImage = "<div id='cover-image-modal'><div id='cover-image-div'><label for='coverImage' class='entitiesLabel label-tooltip'>New cover image</label><a class='tooltips js-show-modal-tooltip' data-toggle='tooltip' data-original-title='Default value shows a map in the background.'><i class='fa-solid fa-circle-info'></i></a><input autocomplete='off' id='coverImage' type='text' value='" + currentCoverImage + "' class='input-append form-control' placeholder='Insert URL of an image' style='font-size: 14px; text-align: left !important;'></div>" +
			"<div id='cover-image-button-div' class='button-image-div'><button type='button' id='selectCoverImage' class='btn btn-default selectEventLocalImage' style='overflow: hidden;'>Upload image</button></div>" +
			"<input style='display: none;' type='file' id='coverImgInput' class='coverImgInput'></div>";

	}

	showModal(
		"Change the narrative cover image",
		inputCoverImage,
		"Back",
		"Confirm",
		function() {
		},
		function() {
			insertCoverImage();
		}
	);

}

// Update interface language
function setLang(fast) {
    updateTitle();

	var inputHelp = $("#inputHelp");

    if (narra.currentLang === "en") {
        $("#entitiesLabel").text("ENTITIES");
        $("#saveButton span").text("SAVE");
        $("#cancelButton span").text("CLEAR");
        $("#allButton span").text("ALL");
        $("#peopleButton span").text("PEOPLE");
        $("#fictionalCharacterButton span").text("FICTIONAL CHARACTER");
        $("#organizationButton span").text("ORGS");
        $("#conceptButton span").text("CONCEPTS");
        $("#objectButton span").text("OBJECTS");
        $("#placeButton span").text("PLACES");
        $("#workButton span").text("WORKS");
        $("#epigraphButton span").text("EPIGRAPHS");
        $("#rockEngravingButton span").text("ROCK ENGRAVINGS");
        $("#siteButton span").text("SITES");
        $("#castleButton span").text("CASTLES");
        $("#monasteryButton span").text("MONASTERIES");
        $("#churchButton span").text("CHURCHES");
        $("#buildingButton span").text("BUILDINGS");
        $("#searchButton span").text("SEARCH");
        $("#loadBibButton").text("LOAD BIB");
        $("#exportButton span").text("EXPORT");
        $("#plusButton span").text("NEW");
        $("#relButton span").text("RELATIONS");
        $("#datePickerStart").find("label").text("START DATE");
        $("#datePickerEnd").find("label").text("END DATE");
        $("#event-source-div").find("label").text("EVENT SOURCE");
        $("#descDiv").find("label").text("DESCRIPTION");
        $("#digobjDiv").find("label").text("DIGITAL OBJECTS");
        $("#typeDiv").find("label").text("EVENT TYPE");
        inputHelp.text("Drop entities here!");
    } else if (narra.currentLang === "it") {
        $("#entitiesLabel").text("ENTITÀ");
        $("#saveButton span").text("SALVA");
        $("#cancelButton span").text("CANCELLA");
        $("#allButton span").text("TUTTE");
        $("#peopleButton span").text("PERSONE");
        $("#fictionalCharacterButton span").text("PERSONAGGIO IMMAGINARIO");
        $("#organizationButton span").text("ORGANIZZ.");
        $("#conceptButton span").text("CONCETTI");
        $("#objectButton span").text("OGGETTI");
        $("#placeButton span").text("LUOGHI");
        $("#workButton span").text("OPERE");
        $("#epigraphButton span").text("EPIGRAFI");
        $("#rockEngravingButton span").text("INCISIONI RUPESTRI");
        $("#siteButton span").text("SITI");
        $("#castleButton span").text("CASTELLI");
        $("#monasteryButton span").text("MONASTERI");
        $("#churchButton span").text("CHIESE");
        $("#buildingButton span").text("EDIFICI");
        $("#searchButton span").text("CERCA");
        $("#loadBibButton").text("CARICA BIB");
        $("#exportButton span").text("ESPORTA");
        $("#plusButton span").text("NUOVA");
        $("#relButton span").text("RELAZIONI");
        $("#datePickerStart").find("label").text("DATA INIZIO");
        $("#datePickerEnd").find("label").text("DATA FINE");
        $("#event-source-div").find("label").text("NOTE");
        $("#descDiv").find("label").text("DESCRIZIONE");
        $("#digobjDiv").find("label").text("OGGETTI DIGITALI");
        $("#typeDiv").find("label").text("TIPO EVENTO");
        inputHelp.text("Trascina le entità qui!");
    }
    inputHelp.show();
    $("#controls .data[data-class='event']").remove();
    $("#eventTitle", "#typeInput", "#topicInput", ".dateInput, .twitter-typeahead").focus(function () {
        $(this).parents('.form-group, .form-inline').removeClass("has-error");
    });

    if (!fast) {
        updateEventTypes();
        updateDataLang();
    }
}

// Get items by language (for event types)
function itemsByLang($items) {
    var results = [];
    $items.each(
        function () {
            results.push(this[narra.currentLang]);
        }
    );
    return results;
}

// Update list of event types
function updateEventTypes() {
	var typeInput = $("#typeInput");
    typeInput.val("");
    typeInput.typeahead("destroy");
    typeInput.typeahead(
        {
            minLength: 0,
            hint: false
        },
        {
            name: 'types',
            limit: 20,
            source: substringMatcher(narra.eventTypes, narra.currentLang),
            display: function(obj) {return obj[narra.currentLang]},
        }
    )
    .bind("typeahead:select", function (ignore, suggestion) {
        typeInput.blur();
        for (var i = 0; i < narra.eventTypes.length; i += 1) {
            if (narra.eventTypes[i][narra.currentLang] === suggestion[narra.currentLang]) {
                $(".roleSelect").each(function() {
                    $(this).replaceWith(makeRoleSelect($(this).attr("data-id")));
                });
                break;
            }
        }
    });
}

// Delete a specific entity
function deleteEntity(qid) {
    var title = narra.items[qid][narra.currentLang + "Name"];
    showModal(
        "Delete Entity",
        "Are you sure you want to delete the entity \"" + title + "\"?",
        "Keep Entity",
        "Delete Entity",
        function() {
        },
        function() {
            // Delete entity from workspace
            $("[data-id=" + qid + "]").remove();

            // Delete entity from entity list
            delete narra.items[qid];

            // Delete entity from database
            deleteObjectFromDB(qid);

            // Hide popover after deletion
            $('.popover').hide();
        }
    );
}


function objectEquals(x, y) {
	'use strict';

	if (x === null || x === undefined || y === null || y === undefined) { return x === y; }
	// after this just checking type of one would be enough
	if (x.constructor !== y.constructor) { return false; }
	// if they are functions, they should exactly refer to same one (because of closures)
	if (x instanceof Function) { return x === y; }
	// if they are regexps, they should exactly refer to same one (it is hard to better equality check on current ES)
	if (x instanceof RegExp) { return x === y; }
	if (x === y || x.valueOf() === y.valueOf()) { return true; }
	if (Array.isArray(x) && x.length !== y.length) { return false; }

	// if they are dates, they must had equal valueOf
	if (x instanceof Date) { return false; }

	// if they are strictly equal, they both need to be an object at least
	if (!(x instanceof Object)) { return false; }
	if (!(y instanceof Object)) { return false; }

	// recursive object equality check
	var p = Object.keys(x);
	return Object.keys(y).every(function (i) { return p.indexOf(i) !== -1; }) &&
		p.every(function (i) { return objectEquals(x[i], y[i]); });
}

// Check if there are changes from last save, in order to not confuse the user with useless modals
function checkChangesFromLastSave(a1, a2) {
    return objectEquals(a1, a2);
}



function showAlert(id, message, level, time=1000) {

	var $alert = "<div class='alert alert-" + level + " fade show " + id + "' role='alert'>" +
		"<span class='not-selectable'>" + message + "</span>" +
		"</div>";

	$("#alertPlaceholder").empty().append($alert);

	var thisAlert = $("." + id);

    thisAlert.css({
		"display": "block",
		"opacity": 1
	});

	thisAlert.delay(time).fadeOut("fast", function () {
		$(this).remove();
	});

}



// Compare two dates for sorting
function compareDates(a, b) {
    return (
        isFinite(a = parseDate(a).valueOf()) &&
        isFinite(b = parseDate(b).valueOf()) ?
        (a > b) - (a < b) :
        NaN
    );
}

// Sort events based on their ID
function sortEvents(timeline) {
    var sort_by_time = function (a, b) {
        var compare = compareDates(a.getAttribute("data-start"), b.getAttribute("data-start"));
        if (compare === 0) return a.getAttribute("id").localeCompare(b.getAttribute("id"));
        else return compare;
    }

    if (timeline === undefined) {
        timeline = document.getElementById("timeline");
    }
    var items = timeline.childNodes;

    var list = [];
	var i;
    for (i in items) {
        if (items[i].nodeType === 1) {
            list.push(items[i]);
        }
    }
    list.sort(sort_by_time);

    for (i = 0; i < list.length; i++) {
        timeline.appendChild(list[i]);
    }
    return timeline;
}

// Sort events based on position
function sortEventsByPosition(timeline) {
    var sort_by_position = function (a, b) {
		a = a.getAttribute("position");
		b = b.getAttribute("position");
		return a.localeCompare(b, 'en', {numeric: true});
    }

    if (timeline === undefined) {
        timeline = document.getElementById("timeline");
    }
    var items = timeline.childNodes;

    var list = [];
	var i;
    for (i in items) {
        if (items[i].nodeType === 1) {
            list.push(items[i]);
        }
    }
    list.sort(sort_by_position);
    for (i = 0; i < list.length; i++) {
        timeline.appendChild(list[i]);
    }
    return timeline;
}


// Select next event ID
function nextEvid() {
    var max = 0;
    for (var key in narra.events) {
        var numPart = parseInt(key.split("ev")[1]);
        if (numPart > max) max = numPart;
    }
    var next = new Date().getTime() + Math.floor(Math.random() * 10000000);
    return("ev" + next.toString());
}



// Load default events
function defaultEvents() {
    var subj = narra.items[narra.subjectID];

    if (subj === undefined) return false;

	var props;
	var data;
	var evid;
	var date;

    // Birth
    if ("birth" in subj) {
        props = {};
        props[narra.subjectID] = {"class": "person", "role": "child"};

        if ("father" in subj) props[subj.father] = {"class": "person", "role": "father"};
        if ("mother" in subj) props[subj.mother] = {"class": "person", "role": "mother"};
        if ("birthPlace" in subj) props[subj.birthPlace] = {"class": "place"};

		data = makeDefaultSlideEventData("Birth of " + subj["enName"], "Nascita di " + subj["itName"], subj.birth, props);
		evid = saveEvent(data, true);
		if (evid) displayEvent(data, evid);
		fetchMissingPlacePolygons(props);

    }

    // Death
    if ("death" in subj) {
        props = {};
        props[narra.subjectID] = {"class": "person", "role": "dead"};

        if ("deathPlace" in subj) props[subj.deathPlace] = {"class": "place"};

		data = makeDefaultSlideEventData("Death of " + subj["enName"], "Morte di " + subj["itName"], subj.death, props);
		evid = saveEvent(data, true);
		if (evid) displayEvent(data, evid);
		fetchMissingPlacePolygons(props);
    }

    // Marriage
    if ("spouse" in subj && "marriageDate" in subj) {
        date = subj.marriageDate.replace("+", "").split("T")[0].split("-01-01")[0];

        props = {};
        props[narra.subjectID] = {"class": "person", "role": "spouse"};

        if ("spouse" in subj) props[subj.spouse] = {"class": "person", "role": "spouse"};
        if ("marriagePlace" in subj) props[subj.marriagePlace] = {"class": "place"};

		data = makeDefaultSlideEventData("Marriage of " + subj["enName"], "Matrimonio di " + subj["itName"], date, props);
		evid = saveEvent(data, true);
		if (evid) displayEvent(data, evid);
		fetchMissingPlacePolygons(props);
    }

    // Foundation
    if ("foundation" in subj) {
        console.log(currentTime() + "Creating foundation event");

        date = subj.foundation.replace("+", "").split("T")[0].split("-01-01")[0];

        props = {};
        props[narra.subjectID] = {"class": typeFromArray(getEntityClassificationTypes(narra.items[narra.subjectID]))};

		data = makeDefaultSlideEventData("Foundation of " + subj["enName"], "Fondazione di " + subj["itName"], date, props);
		evid = saveEvent(data, true);
		if (evid) displayEvent(data, evid);
		fetchMissingPlacePolygons(props);
    }

    if ("foundation2" in subj) {
        console.log(currentTime() + "Creating foundation event");

        date = subj.foundation2.replace("+", "").split("T")[0].split("-01-01")[0];

        props = {};
        props[narra.subjectID] = {"class": typeFromArray(getEntityClassificationTypes(narra.items[narra.subjectID]))};

		data = makeDefaultSlideEventData("Foundation of " + subj["enName"], "Fondazione di " + subj["itName"], date, props);
		evid = saveEvent(data, true);
		if (evid) displayEvent(data, evid);
		fetchMissingPlacePolygons(props);
    }

    // Completion
    if ("completion" in subj) {
        console.log(currentTime() + "Creating completion event");

        date = subj.completion.replace("+", "").split("T")[0].split("-01-01")[0];

        props = {};
        props[narra.subjectID] = {"class": typeFromArray(getEntityClassificationTypes(narra.items[narra.subjectID]))};

		data = makeDefaultSlideEventData("Completion of " + subj["enName"], "Completamento di " + subj["itName"], date, props);
		evid = saveEvent(data, true);
		if (evid) displayEvent(data, evid);
		fetchMissingPlacePolygons(props);
    }
}



// Get color of entity based on type
function getColor(type) {
    if (type != undefined) type = type.toLowerCase();
    if (type == "event") return "rgb(200, 255, 200)";
    if (type == "person") return "#dba2e7";
	if (type == "organization") return "#eda5bd";
    if (type == "object") return "#f5afa9";
	if (type == "concept") return "#ffe2df";
	if (type == "place") return "#f5c695";
    if (type == "work") return "#f2eb96";
    if (type == "other") return "rgb(255, 255, 255)";
    if (type == "fictionalcharacter") return getColor("person");
    if (type == "epigraph" || type == "rock engraving") return getColor("work");
    if (type == "site") return getColor("place");
    if (type == "building" || type == "castle" || type == "church" || type == "monastery") return getColor("object");
}

// Get image for entity
function getImage(qid) {
    if (qid in narra.items && "image" in narra.items[qid]) {
        return narra.items[qid]["image"];
    }
    return "";
}

// Get label for entity
function getLabel(qid) {
    if (qid in narra.items) {
        return narra.items[qid][narra.currentLang + "Name"] || narra.items[qid][narra.otherLang + "Name"];
    }
    return "";
}



// Sort entities by label
function sortByLabel(keys) {
    keys.sort(function (a, b) {
        var nameA = capitalize(getLabel(a));
        var nameB = capitalize(getLabel(b));
        if (nameA < nameB) return -1;
        if (nameA > nameB) return 1;
        return 0;
    });
    return keys;
}

// Make a div for each entity
function makeEntities(items, withoutArrow=false) {
    console.log(currentTime() + "Making entities");

	var container = $("#container");

    var showContainer;
    if (container.css("display") == "flex") {
        showContainer = true;
    } else {
        container.css("visibility", "hidden");
        container.css("display", "flex");
        showContainer = false;
    }

    var keys = sortByLabel(Object.keys(items));

    keys.splice(keys.indexOf(narra.subjectID), 1);
    keys.unshift(narra.subjectID);

    var $container = $("<div id='data-container' />");

    for (var i = 0; i < keys.length; i++) {
        try {
            $container.append(makeStaticDraggable($(makeDataDiv(keys[i], withoutArrow))));
        }
        catch (TypeError) {
            console.log(currentTime() + "TypeError: " + keys[i]);
        }
    }
    $('#controls').append($container);
    console.log(currentTime() + "Made entities");

    if (!showContainer) {
        container.css("display", "none");
        container.css("visibility", "visible");
    }
}

// Load relations between events
function loadRelations() {
    for (var key in narra.rels) {
        var event = narra.rels[key];

		console.log("ora");
		console.log(key);

        if (event !== undefined && 'causedBy' in event) {
            event.causedBy.forEach(function (item) {
                if (item !== undefined)
                    dropOnRelation($(".relContainer[data-for=" + key + "]").find(".causedBy"),
                    $("#bottomTimeline").find(".timelineEvent[data-id=" + item + "]"));
            });
        }

        if (event !== undefined && 'partOf' in event) {
            event.partOf.forEach(function (item) {
                if (item !== undefined)
                    dropOnRelation($(".relContainer[data-for=" + key + "]").find(".partOf"),
                    $("#bottomTimeline").find(".timelineEvent[data-id=" + item + "]"));
            });
        }
    }
}

function dropOnRelation(rel, drag, save) {
    $(rel).css("vertical-align", "top");
            if ($(rel).find(".timelineEvent#" + $(drag).attr("id")).length === 0) {
                var thisID = $(rel).parent().attr("data-for");

                var $drag = drag.clone();
                $drag.find(".deleteButton").click(function () {
                    if ($(rel).hasClass("causedBy")) {
                        narra.rels[thisID]["causedBy"].splice(drag.attr("data-id"), 1);
                    }
                    else if ($(rel).hasClass("partOf")) {
                        narra.rels[thisID]["partOf"].splice(drag.attr("data-id"), 1);
                    }
                    $(this).parent().remove();
                    saveRelationsToDB();
                });
                $drag.mouseenter(function () { $(this).find(".deleteButton").fadeToggle("fast") });
                $drag.mouseleave(function () { $(this).find(".deleteButton").fadeToggle("fast") });
                $(rel).append($drag);
    }
    if (save) {
        saveRelations();
        saveRelationsToDB();
    }
}

function notAllowed(title, reason) {
    if (!workspaceIsEmpty()) {
        showModal(
            title,
            "Please add at least one event before " + reason,
            "OK",
            "Cancel",
            function() {
            },
            function() {
            }
        );
    }
}

// Open relations view
function openRelations() {
    if (Object.keys(narra.events).length < 1) {
        notAllowed("Load Relations", " loading the relations view.");
        return false;
    }

	if ($("#timeline").data("ui-sortable")) {
		$("#timeline").sortable("destroy");
	}

	var timeline = $("#timeline");
	var overlay = $("#overlay");
	var bottomTimeline = $("#bottomTimeline");

    $("#home").text("BACK");
    $("#backButton").fadeToggle("slow");
    $("#container").slideToggle("slow");
    $("#bigName").text("Causal and Mereological Relations");
    timeline.addClass("withArrows").css("height", "70%");
    overlay.empty();
    bottomTimeline.empty();
    $("#timeline .timelineEvent").each(function (k, v) {
        var oldID = $(this).attr('id');
         bottomTimeline.append(makeStaticDraggable($(this).clone().attr("data-id", oldID).addClass("draggableEvent").removeAttr("id").show()));
         $(this).css("height", "40%");
        overlay.append("<div class='relContainer' data-for='" + $(v).attr('id') + "'><div class='relation causedBy'><h3>Caused by</h3></div><div class='relation partOf'><h3>Part of</h3></div></div>");
    });
    timeline.append(overlay);
    overlay.fadeToggle("slow");
    $("#bottomTimeline .timelineEvent .eventBottom .data").remove();
    bottomTimeline.fadeToggle("slow");
    $("#relHelpContainer").fadeToggle("slow");
    $(".relation")
    .droppable({
        drop: function (event, ui) {
			dropOnRelation(this, ui.draggable, true);
		}
    });
    loadRelations();
}

// Restore initial view
function restoreInitialView() {
    saveRelations();
    updateTitle();

	var topTitle = $('#topTitle');
	var timeline = $("#timeline");

    $("#home").text("HOME");
    $('#mainSource').remove();
    $("#container").slideToggle();
    $("#backButton").fadeToggle("slow");
    topTitle.css('height', '6%');
    timeline.removeClass("withArrows").css("height", "32%");
    timeline.children(".timelineEvent").css("height", "");
    $("#overlay, #bottomTimeline, #relHelpContainer").hide("slow");
    $("body").append($("#overlay"));
    timeline.show();
    $('#footer').hide();
    $("#timeline-embed").hide();
	$("#mapdiv").hide();
    topTitle.css("margin-bottom", "0");
	$('.dropdown').css( 'top', '-5%');
    window.timeline = undefined;
	$("#eventSearchDiv").show();

	// for map slide bug visualization
	currentSlide=0;
	arraySlide=[];
	$(document).off( "click", ".vco-slidenav-next");
	$(document).off( "click", ".vco-slidenav-previous");

	$('#mapdiv').empty();
	window.storymap = undefined;

	//change size of title
	$('.subjectName').css('font-size', '2.0em');
}

// Create modal dialogs
function showModal(title, text, btnCancel, btnOK, callbackCancel, callbackOK) {

	// clean the page from other modals
	$(".modal").remove();

	var $modal = $("<div class='modal fade'>" +
		"<div class='modal-content'>" +
		"<div class='modal-header'>" +
		"<button type='button' class='close' data-dismiss='modal' aria-label='Close'><span aria-hidden='true'>&times;</span></button>" +
		"<h5 class='modal-title'>" + title + "</h5>" +
		"</div>" +
		"<div class='modal-body'>" +
		"<p class='modal-text'>" + text + "</p>" +
		"</div>" +
		"<div class='modal-footer'>" +
		"<button type='button' class='btn btn-secondary' data-dismiss='modal'>" + btnCancel + "</button>" +
		"<button type='button' class='btn btn-primary' data-dismiss='modal'>" + btnOK + "</button>" +
		"</div></div></div></div>");

    $modal.find(".btn-secondary").click(callbackCancel);
    $modal.find(".btn-primary").click(callbackOK);
    $modal.modal("show");

}

function b64toBlob(b64, qid, onsuccess, onerror) {
    var img = new Image();
    img.src = b64;

    img.onerror = onerror;

    img.onload = function onload() {
        var canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;

        var ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

        canvas.toBlob(function(blob) {
            narra.usedImages[qid] = true;
            uploadcare.fileFrom('object', blob)
            .done(function(fileInfo) {
                narra.items[qid].image = fileInfo.cdnUrl + "image.jpg";
                saveObjectToDB(narra.items, qid);
            }).fail(function(error) {
                  console.log(error);
            });
        }, function(error) {
            console.log(error);
        });
    }
}

// control if there are dates on events
function controlDateOnEvents() {

	var dateOk= true;
	var eventsNotDates="";
	var eventsWithDates= {};
	var numberOfEventsNotDates= 0;

	// control if there are events with no coordinates and save events with coordinate in an object
	for (var i in narra.events) {
			if (narra.events[i].hasOwnProperty('start') &&  narra.events[i].start != "" ) {
				eventsWithDates[i]=narra.events[i];
				numberOfEventsNotDates++;

			} else {
				dateOk = false;
				eventsNotDates += narra.events[i].title + '</br>';
			}
	}

	if (numberOfEventsNotDates > 0) {

		// Not all events have coordinates. Visualize only events with coordinates if press continue
		if(!dateOk){

			showModal(
				"Visualize Timeline",
				"These events have no date: </br></br>" + eventsNotDates + "</br>Do you want to continue excluding them?",
				"Back",
				"Continue",
				function() {
				},
				function() {
					visualizeTimeline(eventsWithDates);
				}
			);

		// All events have coordinates
		} else {
			visualizeTimeline(narra.events);
		}

	} else {

		// All events haven't coordinates
		showModal(
			"Visualize Timeline",
			"There are no events with date",
			"Back",
			"Continue",
			function() {
			},
			function() {
			}
		);

	}

}

// Ask user to save before visualizing
function confirmVisualizeTimeline() {
    if (!workspaceIsEmpty()) {
        showModal(
            "Visualize Timeline",
            "Do you want to save the current event before visualizing?",
            "Don't Save",
            "Save",
            function() {
            },
            function() {
                if (saveEvent() !== undefined) {
                    resetWorkspace();
                    controlDateOnEvents();
                }
                else {
                    // TODO INSERT VALIDATION
                }
            }
        );
    }
    else {
        controlDateOnEvents();
    }
}

// Visualize on a timeline
function visualizeTimeline(eventsOfNarration) {

	var mainSource = $('meta[name=mainSource]');
	var topTitle = $('#topTitle');

    if (mainSource.attr("content") !== undefined) {
        topTitle.append('<div id="mainSource"><i>' + mainSource.attr("content") + '</i></div>');
        topTitle.css('height', '7%');
    }

    if (Object.keys(narra.events).length < 1) {
        notAllowed("Visualize Timeline", " visualizing the timeline.");
        return false;
    }

    $("#home").text("BACK");
    $("#backButton").fadeToggle("slow");
    $("#container").hide();
	$("#eventSearchDiv").hide();
    $("#timeline").hide();
    $('#timeline-embed').show();
    $('#footer').show();
    topTitle.css("margin-bottom", "2%");
	$('.dropdown').css( 'top', '-8%');

    narra.usedImages = {};

	// Function to sort events by position first of time
	var sort_by_position = function( a , b){
			a = narra.events[a].position;
			b = narra.events[b].position;
			if(a > b) return 1;
			if(a < b) return -1;
			return 0;
	}

    // Sort events by time
    var events = Object.keys(eventsOfNarration).sort(sort_by_position);

    // Define the slides of the timeline
    narra.slides = events.map(
        function (key) {
            var event = narra.events[key];

            // Set ID of timeline slide
            event.unique_id = "slide-" + event._id;

            // Parse dates from arrays
            var sDate = parseDate(event.start);
            var eDate = parseDate(event.end);

            // Set start date of timeline slide
            event.start_date = {
                'year': sDate.getFullYear(),
                'month': event.start.length > 5 ? sDate.getMonth() + 1 : "",
                'day': event.start.length > 8 ? sDate.getDate() : "",
            };

            // Set end date of timeline slide
            event.end_date = {
                'year': eDate.getFullYear(),
                'month': event.end.length > 5 ? eDate.getMonth() + 1 : "",
                'day': event.end.length > 8 ? eDate.getDate() : "",
            };

            var fragment = "";
            var source;
            var secondaryAppend = "";
            var primaryAppend = "";
            var entitiesList = [];

            event.text = {
                'headline': event.title,
                'text': event.description ? event.description : ""
            };

            // Function to link to English or Italian Wikipedia
			function createLinkWithTooltip(qid, lang) {

				var linkIri;

					if(qid.startsWith("Q")){
						linkIri = "https://www.wikidata.org/wiki/" + narra.items[qid]['_id'];
					} else {
						linkIri = "https://tool.dlnarratives.eu/CustomEntity/?idU="+qid+"&user="+narra.user+"&idN="+narra.id_n+"&subject="+narra.subjectID;
					}

					return "<a class='js-tooltip-entity-link' data-toggle='tooltip' title='" + getDescription(qid) + "' target='_blank' target='_blank' href='"+linkIri+"'>" + narra.items[qid][lang + 'Name'] + "</a>";
			}

            // Get list of entities and link to Wikipedia
            for (var qid in event.props) {
                var prop = event.props[qid];
                if (qid !== undefined && qid in narra.items) {
						//en entities
						if (narra.currentLang == "en") {
							if ("enName" in narra.items[qid] && narra.items[qid].enName !== "") {
								entitiesList.push(createLinkWithTooltip(qid, "en"));
							} else if ("itName" in narra.items[qid] && narra.items[qid].itName !== "") {
								entitiesList.push(createLinkWithTooltip(qid, "it"));
							}
						// it entities
						} else {
							if ("itName" in narra.items[qid] && narra.items[qid].itName !== "") {
								entitiesList.push(createLinkWithTooltip(qid, "it"));
							} else if ("enName" in narra.items[qid] && narra.items[qid].enName !== "") {
								entitiesList.push(createLinkWithTooltip(qid, "en"));
							}
						}
                }

                // Handle event images (or other media)
                if (prop !== undefined) {

					// load media of event if any
					if(event.eventMedia != ""){

						event.media = {'url' : event.eventMedia, 'caption' : event.eventMediaCaption};

					// else load entities images
					} else {

						if (event.media && event.media.url && event.media.url.startsWith('data')) {
							event.media = undefined;
						}

						if (event.media === undefined) {

							if (narra.items[qid] !== undefined && 'image' in narra.items[qid] && ! (qid in narra.usedImages)) {

								var image = narra.items[qid].image;

								if (image.startsWith("http")) {
									event.media = {'url': narra.items[qid].image
										.replace('http:', 'https:')
										.replace('Special:FilePath', 'Special:Redirect/file')
										.replace('/wiki/', '/w/index.php?title=')};
									narra.usedImages[qid] = true;

									if (event.media && "url" in event.media && event.media.url.indexOf('/w/index.php?title=') > -1) {
										event.media.url = event.media.url + '&width=700&type=.jpg';
									}
								}
							}
						}

					}

					var j;

                    // Handle secondary sources of events
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

                    // Handle primary sources of events
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

            // Set event text
            event.text.text += fragment;
            var textToAppend = "";

            // Function to make a list of digital objects
            function makeDigObjList(urls) {
                var results = [];
				var l;
				var a;

				//if digital objets is array of objects (url + title))
				if (urls && $.type(urls) === "array" && $.type(urls[0]) === "object") {

					for(l = 0; l < urls.length; l++){
						a = document.createElement("a");
						a.setAttribute("href", urls[l].url);
						a.setAttribute("target", "_blank");
						a.text = urls[l].title;
						results.push(a.outerHTML);
					}
				//if digital objets are old djobj (only array of urls)
				} else if (urls && $.type(urls) === "array") {
                    for (l = 0; l < urls.length; l++) {
                        a = document.createElement("a");
                        a.setAttribute("href", urls[l]);
                        a.setAttribute("target", "_blank");
                        a.text = l + 1;
                        a.setAttribute("onclick", "showDigObjImage(this)");
                        results.push(a.outerHTML);
                    }
                } else if (urls && $.type(urls) === "string") {
                    a = document.createElement("a");
                    a.setAttribute("href", urls);
                    a.setAttribute("target", "_blank");
                    a.text = "1";
                    a.setAttribute("onclick", "showDigObjImage(this)");
                    results.push(a.outerHTML);
                }
                return results.join(" • ");
            }

            // Display digital object list
            var digObjList = makeDigObjList(event.objurl);

            // Append secondary sources to HTML
            if (secondaryAppend)
                textToAppend += '<h5>Secondary Sources</h5><ul>' + secondaryAppend + '</ul>';

            // Append primary sources to HTML
            if (primaryAppend) {
				textToAppend += '<h5>Primary Sources</h5><ul>' + primaryAppend + '</ul>';
			}

            // Append list of entities to HTML
            if (entitiesList) {
                textToAppend += '<h5>Entities</h5><span class="tl-entities">' + entitiesList.join(' • ') + '</span>';
            }

            // Append list of digital objects to HTML
            if (digObjList) {
                textToAppend += '<h5>Digital Objects</h5><span class="digObjList">'
                    + digObjList + '</span>';
            }

            // Set final event text
            if (textToAppend) {
                event.text.text += textToAppend;
            }

			console.log(event);
            return event;
        }
    );

    // Reload image selection list in case of changes
    var observer = new MutationObserver(function (m) {
		console.log(observer);
        if (m[0].addedNodes[0].nodeName === "#text" || m[0].addedNodes[0].nodeName == "IMG") {
			makeImageSelect(window.timeline.getSlide(0).data.unique_id);
            this.disconnect();
		}
    });

    // Observe timeline for changes
    observer.observe(document.getElementById('timeline-embed'), { childList:true, subtree:true});

    // Create timeline object
    window.timeline = new TL.Timeline('timeline-embed', {'events': narra.slides},
        {
            scale_factor: 1,
            height: 700,
            timenav_height_percentage: 42,
            start_at_slide: 0
        }
    )
    .on("change", function(data) {
        makeImageSelect(data.unique_id);
    });
}

// Confirm removal of entity from event
function confirmVisualizeMap() {

	var coordinateOk= true;
	var eventsNotCoordinates="";
	var eventsWithCoordinates= {};
	var numberOfEventsNotCoordinates= 0;

	// control if there are events with no coordinates and save events with coordinate in an object
	for (var i in narra.events) {
			if (narra.events[i].hasOwnProperty('latitud') &&  narra.events[i].hasOwnProperty('longitud')  &&  narra.events[i].latitud != "" && narra.events[i].longitud != "") {
				eventsWithCoordinates[i]=narra.events[i];
				numberOfEventsNotCoordinates++;

			} else {
				coordinateOk = false;
				eventsNotCoordinates += narra.events[i].title + '</br>';
			}
	}

	if (numberOfEventsNotCoordinates > 0) {

		// Not all events have coordinates. Visualize only events with coordinates if 'continue' is pressed
		if (!coordinateOk) {

			showModal(
				"Visualize Map",
				"These events have no coordinates: </br></br>" + eventsNotCoordinates + "</br>Do you want to continue excluding them?",
				"Back",
				"Continue",
				function() {
				},
				function() {

					if(narra.info.hasOwnProperty("CSVnumber")){
						window.open("PHP//previewStorymapPolygons.php?preview=" + narra.id_n + narra.user +'-'+narra.dbName +"&user="+ narra.user);
					} else {
						window.open("PHP//previewStorymapPolygons.php?preview=" + narra.id_n + narra.user +'-'+narra.dbName +"&user="+ narra.user);
					}

				}
			);

		// All events have coordinates
		} else{

			if (narra.info.hasOwnProperty("CSVnumber")) {
					window.open("PHP//previewStorymapPolygons.php?preview=" + narra.id_n + narra.user +'-'+narra.dbName +"&user="+ narra.user);
			} else {
					window.open("PHP//previewStorymapPolygons.php?preview=" + narra.id_n + narra.user +'-'+narra.dbName +"&user="+ narra.user);
			}

		}

	} else {

		// All events haven't coordinates
		showAlert('failed-map', 'Error! There are no events with coordinates.', 'warning', 1500);

	}

}

//visualize map
 // array of slides (for bug visualization)
var arraySlide= [];
// index for current slide (for bug visualization)
var currentSlide= 0;

function visualizeMap(eventsOfNarration) {

		//change size of title
		$('.subjectName').css('font-size', '2.5em');

		var mainSource = $('meta[name=mainSource]');
		var topTitle = $('#topTitle');

		if (mainSource.attr("content") !== undefined) {
			topTitle.append('<div id="mainSource"><i>' + mainSource.attr("content") + '</i></div>');
			topTitle.css('height', '7%');
		}

		if (Object.keys(narra.events).length < 1) {
			notAllowed("Visualize Timeline", " visualizing the timeline.");
			return false;
		}

		$("#home").text("BACK");
		$("#backButton").fadeToggle("slow");
		$("#container").hide();
		$("#eventSearchDiv").hide();
		$("#timeline").hide();
		$('#timeline-embed').hide();
		$('#mapdiv').show();
		$('#footer').show();

		// display button publishMap in table, and position near "username" button

		topTitle.css("margin-bottom", "2%");

		$('.dropdown').css( 'top', '-8%');

		narra.usedImages = {};

		var sort_by_position = function( a , b){
			a = narra.events[a].position;
			b = narra.events[b].position;
			if(a > b) return 1;
			if(a < b) return -1;
			return 0;
		}

		// Sort events by position
		var events = Object.keys(eventsOfNarration).sort(sort_by_position);

		// Define the slides of the map
		narra.slides = events.map(
			function (key) {
				var event = narra.events[key];

				// Set ID of timeline slide
				event.unique_id = "slide-" + event._id;

				// Parse dates from arrays
				var sDate = parseDate(event.start);
				var eDate = parseDate(event.end);


				// Set start date of timeline slide
				event.start_date = {
					'year': sDate.getFullYear(),
					'month': event.start.length > 5 ? sDate.getMonth() + 1 : "",
					'day': event.start.length > 8 ? sDate.getDate() : "",
				};

				// Set end date of timeline slide
				event.end_date = {
					'year': eDate.getFullYear(),
					'month': event.end.length > 5 ? eDate.getMonth() + 1 : "",
					'day': event.end.length > 8 ? eDate.getDate() : "",
				};


				event.date= sDate.getFullYear() + "-" + eDate.getFullYear();

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

					"name": "Kent County, Maryland",
					"lat": parseFloat(event.latitud),
					"lon": parseFloat(event.longitud),
					"zoom": 10,
					"line": true

				};

				// Function to link to English or Italian Wikipedia
				function createLinkWithTooltip(qid, lang) {

					var linkIri;

					if(qid.startsWith("Q")){
						linkIri = "https://www.wikidata.org/wiki/" + narra.items[qid]['_id'];
					} else {
						linkIri = "https://tool.dlnarratives.eu/CustomEntity/?idU="+qid+"&user="+narra.user+"&idN="+narra.id_n+"&subject="+narra.subjectID;
					}

					return "<a class='js-tooltip-entity-link' data-toggle='tooltip' title='" + getDescription(qid) + "' target='_blank' target='_blank' href='"+linkIri+"'>" + narra.items[qid][lang + 'Name'] + "</a>";
				}

				// Get list of entities and link to Wikipedia
				for (var qid in event.props) {

					var prop = event.props[qid];

					if (qid !== undefined && qid in narra.items) {
						//en entities
						if (narra.currentLang == "en") {
							if ("enName" in narra.items[qid] && narra.items[qid].enName !== "") {
								entitiesList.push(createLinkWithTooltip(qid, "en"));
							} else if ("itName" in narra.items[qid] && narra.items[qid].itName !== "") {
								entitiesList.push(createLinkWithTooltip(qid, "it"));
							}
						// it entities
						} else {
							if ("itName" in narra.items[qid] && narra.items[qid].itName !== "") {
								entitiesList.push(createLinkWithTooltip(qid, "it"));
							} else if ("enName" in narra.items[qid] && narra.items[qid].enName !== "") {
								entitiesList.push(createLinkWithTooltip(qid, "en"));
							}
						}

					}

					// Handle event images (or other media)
					if (prop !== undefined) {

						// load media of event if any
						if (event.eventMedia != "") {

							event.media = {'url' : event.eventMedia, 'caption' : event.eventMediaCaption};

						// else load entities images
						} else {

							if (event.media && event.media.url && event.media.url.startsWith('data')) {
								event.media = undefined;
							}

							if (event.media === undefined) {

								if (narra.items[qid] !== undefined && 'image' in narra.items[qid] && ! (qid in narra.usedImages)) {

									var image = narra.items[qid].image;

									if (image.startsWith("http")) {
										event.media = {'url': narra.items[qid].image
											.replace('http:', 'https:')
											.replace('Special:FilePath', 'Special:Redirect/file')
											.replace('/wiki/', '/w/index.php?title=')};
										narra.usedImages[qid] = true;

										if (event.media && "url" in event.media && event.media.url.indexOf('/w/index.php?title=') > -1) {
											event.media.url = event.media.url + '&width=700&type=.jpg';
										}
									}
								}
							}

						}

						var j;

						// Handle secondary sources of events
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

						// Handle primary sources of events
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

				// Set event text
				event.text.text += fragment;
				var textToAppend = "";

				// Function to make a list of digital objects
				function makeDigObjList(urls) {
					var results = [];
					var l;
					var a;

					//if digital objets is array of objects (url + title))
					if (urls && $.type(urls) === "array" && $.type(urls[0]) === "object") {

						for(l = 0; l < urls.length; l++){
							a = document.createElement("a");
							a.setAttribute("href", urls[l].url);
							a.setAttribute("target", "_blank");
							a.text = urls[l].title;
							results.push(a.outerHTML);
						}
					//if digital objets are old (only array of URLs)
					} else if (urls && $.type(urls) === "array") {
						for (l = 0; l < urls.length; l++) {
							a = document.createElement("a");
							a.setAttribute("href", urls[l]);
							a.setAttribute("target", "_blank");
							a.text = l + 1;
							results.push(a.outerHTML);
						}
					}
					else if (urls && $.type(urls) === "string") {
						a = document.createElement("a");
						a.setAttribute("href", urls);
						a.setAttribute("target", "_blank");
						a.text = "1";
						results.push(a.outerHTML);
					}
					return results.join(" • ");
				}

				// Display digital object list
				var digObjList = makeDigObjList(event.objurl);

				// Append secondary sources to HTML
				if (secondaryAppend)
					textToAppend += '<h5>Secondary Sources</h5><ul>' + secondaryAppend + '</ul>';

				// Append primary sources to HTML
				if (primaryAppend) {
					textToAppend += '<h5>Primary Sources</h5><ul>' + primaryAppend + '</ul>';
				}

				// Append list of entities to HTML
				if (entitiesList) {
					textToAppend += '<h5>Entities</h5><span class="tl-entities">' + entitiesList.join(' • ') + '</span>';
				}

				// Append list of digital objects to HTML
				if (digObjList) {
					textToAppend += '<h5>Digital Objects</h5><span class="digObjList">'
						+ digObjList + '</span>';
				}

				// Set final event text
				if (textToAppend) {
					event.text.text += textToAppend;
				}

				return event;
			}
		);

		var slides = {"slides": narra.slides};

		var storymap_options = {

			"map_type" : "osm:standard",
			"calculate_zoom" : true

		};

	//////////////////////
	//Color marker switch//
	//////////////////////

	var leafletMarkerIcon = $( ".leaflet-marker-icon:eq("+currentSlide+")" );

 	// Button NEXT. show next slide. Hide slide +1 and -1
	$(document).on('click','.vco-slidenav-next',function(){

		// remove class active for this old marker
		leafletMarkerIcon.removeClass('activeMarker');

		currentSlide++;

		// add class active for actual new marker
		leafletMarkerIcon.addClass('activeMarker');

	});

	// Button PREVIUS: show previous slide. Hide slide +1 and -1
	$(document).on('click','.vco-slidenav-previous',function(){

		// remove class active for this old marker
		leafletMarkerIcon.removeClass('activeMarker');

		currentSlide--;

		// add class active for actual new marker
		leafletMarkerIcon.addClass('activeMarker');

	});

	// Button Beginning: show first slide. hide the previous
	$(document).on('click','.vco-menubar-button:eq(1)',function(){

		// remove class active for this old marker
		leafletMarkerIcon.removeClass('activeMarker');

		// add class active for first new marker
		$( ".leaflet-marker-icon:eq(0)" ).addClass('activeMarker');

		currentSlide=0;

	});

	// when map is loaded, create array of slides, and put click on the markers
	var checkExist = setInterval(function() {
		if ($('.leaflet-marker-icon').length) {
			console.log("map loaded");

			//append div legend on map
			$('.vco-map-display').append('<div class="slideLegend" > <div class="legendRow"> <div class="ContainerLegenttext"><p><span style="color:#c34528">&#9632;</span> Current event</p></div>     <div class="ContainerLegenttext"><p><span style="color:#e6e600">&#9632;</span> Historical event</p></div>   <div class="ContainerLegenttext"><p><span style="color:#2eb82e">&#9632;</span> Natural event</p></div>   <div class="ContainerLegenttext"><p><span style="color:#ff9900">&#9632;</span> Valorisation event</p></div> <div class="ContainerLegenttext"><p><span style="color:#0000CD">&#9632;</span> Descriptive event</p></div> </div></div>');

			// create array of slides
			$('.vco-slider-item-container .vco-slide').each(function(index) {
				arraySlide[index]= $(this);
			});

			// first marker active
			$( ".leaflet-marker-icon:eq(0)" ).addClass('activeMarker');

			// put click on all markers (show slide of clicked marker and make it clickable; hide the previous)
			$('.leaflet-marker-pane .leaflet-marker-icon').each(function(index) {

				var leafletMarkerIconEq = $('.leaflet-marker-icon:eq(' +index+ ')');

				//append click on marker
				leafletMarkerIconEq.on('click', function(){

					leafletMarkerIcon.removeClass('activeMarker');

					$( ".leaflet-marker-icon:eq("+index+")" ).addClass('activeMarker');

					currentSlide = index;
				});

				// color markers
				if (storymap.data.slides[index].hasOwnProperty('mapMarkerColor')) {
					leafletMarkerIconEq.css("color", storymap.data.slides[index].mapMarkerColor);
				}

			});

		  clearInterval(checkExist);
	   }
	}, 100);

	// Create timeline object
	window.storymap = new KLStoryMap.StoryMap('mapdiv', {'storymap': slides}, storymap_options);

	window.onresize = function() {
		storymap.updateDisplay(); // this isn't automatic
	}

	// Leaflet Zoom control
	const zoomControl = L.control.zoom({ position: "topleft" });

	// grouping of controls
	const leafletControlsToAdd = [zoomControl];

	// event for when the Story Map is loaded
	storymap.on("loaded", function() {
	  // leaflet.js web map object
	  const leafletMap = storymap.map;

	  // add controls to Leaflet web map
	  leafletControlsToAdd.forEach(element => leafletMap.addControl(element));
	});

}



// Switch event image
function switchImage(value, slideID) {
    var evid = slideID.split('slide-')[1];
    narra.events[evid].media = {};
    narra.events[evid].media.url = value;
    saveObjectToDB(narra.events, evid);
    $("#" + slideID + " " + ".tl-media-image").attr("src", value);
}

// Make image selection menu
function makeImageSelect(slideID) {

	var idevent = slideID.split('slide-')[1];

	//select images only if it isn't a eventMedia
	if (narra.events[idevent].eventMedia == "") {

		console.log(narra.events[idevent].eventMedia);
		var $select = $("<select class='js-switch-image' data-slide-id='" + slideID + "'>");

		$.each(window.timeline.getSlideById(slideID).data.props, function(p) {
			var evid = slideID.split('slide-')[1];
			if (narra.items[p] && "image" in narra.items[p] && narra.items[p].image !== "") {
				var selected = "";
				var fixedImageURL = narra.items[p].image.replace('http:', 'https:').replace('Special:FilePath', 'Special:Redirect/file').replace('/wiki/', '/w/index.php?title=');
				if ("media" in narra.events[evid] && narra.events[evid].media.url === fixedImageURL) {
					selected = " selected ";
				}
				$select.append("<option value='" + fixedImageURL + "'" + selected + ">" + narra.items[p].enName + " image</option>");
			}
		});

		$("#" + slideID + " " + ".tl-media > select").remove();
		$("#" + slideID + " " + ".tl-media").append($select);

	}
}

// Hide search field
function hideSearch() {
    if ($("#searchInput").is(':visible')) {
        $('#searchInput').slideUp(200);
        $('.checkbox').slideUp(200);
    }
}

function checkIfThereAreNoEntities() {
	return $("#controls .data:visible").length == 0;
}

function manageNoEntities() {
	if (checkIfThereAreNoEntities() && $("#entities-not-selected").css("display") == "none") {
		$("#no-entities").show();
	} else {
		$("#no-entities").hide();
	}
}

// Search entities
/* function searchEntity() {

	var insertedValue = $("#searchInput").val();

	var activeClass = $("#leftNav").children(".add-button-active-entities");

	if (activeClass.length) {
		entityClass = activeClass.attr("data-class");
	} else {
		$("#allButton").toggleClass("add-button-active-entities");
	}

	if (entityClass == '' || entityClass == undefined) {
		entityClass = 'all';
	}

	var dataContainer = $("#data-container");

	// display search results
	if (dataContainer.css("display") == "none") {
		dataContainer.show();
		$("#entities-not-selected").hide();
	}
    if (insertedValue === "") {
        $("#controls .data:contains(" + insertedValue + ")").filter("[data-class='" + entityClass + "']").show();
		manageNoEntities();
    }
    else {
        $("#controls .data").hide();
    }

	// search filter based on the class chosen by the user (by clicking on it)
	if (entityClass == 'all' || entityClass == '' || entityClass == undefined) {
		$("#controls .data:contains(" + insertedValue + ")").show();
		manageNoEntities();
	} else {
		$("#controls .data:contains(" + insertedValue + ")").filter("[data-class='" + entityClass + "']").show();
		manageNoEntities();
	}

} */
function searchEntity() {
    var insertedValue = $("#searchInput").val().toLowerCase(); // lowercase per confronto case-insensitive

    var activeClass = $("#leftNav").children(".add-button-active-entities");
    var entityClass;

    if (activeClass.length) {
        entityClass = activeClass.attr("data-class");
    } else {
        $("#allButton").toggleClass("add-button-active-entities");
    }

    if (entityClass == '' || entityClass == undefined) {
        entityClass = 'all';
    }

    var dataContainer = $("#data-container");

    // mostra container se nascosto
    if (dataContainer.css("display") == "none") {
        dataContainer.show();
        $("#entities-not-selected").hide();
    }

    // prima nascondi tutti
    $("#controls .data").hide();

    // filtro basato su data-originaltitle
    $("#controls .data").filter(function() {
        var title = $(this).attr("data-originaltitle").toLowerCase();
        var classMatch = (entityClass === 'all') || entityHasType(this, entityClass);
        var textMatch = title.includes(insertedValue);
        return classMatch && textMatch;
    }).show();

    manageNoEntities();
}


// Get images from Wikimedia Commons (through Wikipedia)
function imageRequest(qid, caller) {
    var url = 'https://en.wikipedia.org/w/api.php?action=query&prop=images|imageinfo&imlimit=50&format=json&iiprop=extmetadata&titles=' + encodeURIComponent(narra.items[qid].enName.replace(/\s+/g, '_')) + '&callback=?';

    $.getJSON(url, function(data) {
        var html = "";
        if ("query" in data && "pages" in data.query) {
            var pages = data.query.pages;
            var images = pages[Object.keys(pages)[0]].images;

            if (images !== undefined) {
                for (var i = 0; i < images.length; i++) {
                    if (images[i].title.indexOf('Commons-logo') > 0) continue;
                    if (images[i].title.indexOf('Disambig') > 0) continue;
                    if (images[i].title.indexOf('Red Pencil Icon') > 0) continue;
                    if (images[i].title.indexOf('Wikisource') > 0) continue;
                    if (images[i].title.indexOf('Wikivoyage') > 0) continue;
                    if (images[i].title.indexOf('Wiktionary') > 0) continue;
                    if (images[i].title.indexOf('A_coloured_voting_box') > 0) continue;
                    if (images[i].title.indexOf('Emblem-money') > 0) continue;
                    if (images[i].title.indexOf('Folder Hexagonal') > 0) continue;
                    if (images[i].title.indexOf('.svg') > 0) continue;
                    if (images[i].title.indexOf('.ogv') > 0) continue;
                    if (images[i].title.indexOf('.ogg') > 0) continue;

					var imageURL = "https://en.wikipedia.org/w/index.php?title=Special:Redirect/file/" + encodeURIComponent(images[i].title.replace(/\s+/g, '_').split('File:')[1]) + "&width=700&type=.jpg";

					html += "<div class='square js-replace-image' style='background-image: url(" + imageURL + ")'></div>";
                }
            }
        }
		html += "<div class='square'><input class='fileInput js-upload-image-input' type='file' name='files[]' style='display: none'/><span class='js-open-file-input'>Upload from disk</span></div>";
        caller.parent().next().html(html);
    });
}

function loadImageFromFile(element) {
	var file = element.files[0];

	if (file) {
		if (file.type.match(/image.*/)) {
			var extension = file.type.split('/')[1].replace('jpeg', 'jpg');
			var fileName = narra.id_n +"-"+ narra.user  + "-image-" + Math.floor(Math.random() * 10000000) + "." + extension;

			$(element).parents('.ui-front').find('.popoverImage').hide();
			$(element).parents('.ui-front').find('.image-upload-spinner').show();

			if (file.type.indexOf('gif') > -1) {
				uploadImage(element, file, fileName);
			} else {
				ImageTools.resize(file, {
						width: 1280, // maximum width
						height: 1024 // maximum height
					}, function(blob, didItResize) {
						if (didItResize) {
							console.log(currentTime() + 'Resized image to maximum allowed size');
						}
						uploadImage(element, blob, fileName);
					}
				);
			}
		} else {
			showAlert('failed-upload-image', 'This file is not in a supported format. Please upload only JPG, PNG, or GIF images.', 'warning', 2500);
		}
	}
}

function replaceImage($element, withImage) {
	var qid = $element.parents('.ui-front').attr('data-id');
	if (withImage === undefined) {
		withImage = $element.css('background-image').split('"')[1];
	}
	$element.parents('.ui-front').find('.popoverImage').attr('src', withImage).show();
	$element.parents('.ui-front').find('.popoverImageSeparator').show();
	$element.parents('.ui-front').find('.imageLabelDiv > a').text('Change Image');
	narra.items[qid].image = withImage;
	saveObjectToDB(narra.items, qid);
}

// Ask user to confirm digital object deletion
function confirmDeleteDigObj(url) {
    showModal(
        "Delete Digital Object",
        "Are you sure you want to delete this digital object?",
        "Keep Object",
        "Delete Object",
        function() {
        },
        function() {
            $("#digobjTable .digobjPreview[data-url='" + url + "']").parents("a").remove();
        }
    );
}

// display tooltip if the text of a digital object is truncated
function displayDigObjTooltip(thisElement) {

	// the text is truncated when it shows '...'
	if (thisElement.text().indexOf("...") > -1) {
		$(thisElement).tooltip();
		$(thisElement).tooltip("show");
	}

}

// Create preview for digital object
function createDigObjPreview(urlObj, title) {
    var regex = /<title>(.*?)</;

    if ($("#digobjTable .digobjPreview[data-url='" + urlObj + "']").length === 0) {

		var $preview = $("<a target='_blank' href='" + urlObj + "'><div class='digobjPreview' data-url='" + urlObj + "'><div class='deleteButton digObjDeleteButton'><b class='x'>×</b></div><span class='truncated-value js-digobj-tooltip' data-toggle='tooltip' data-original-title='" + title + "' style='display: table-cell; vertical-align: middle; width: 100%;'>" + title + "</span><span class='hidden-true-value'>" + title + "</span></div></a>");

        $preview.find(".deleteButton").click(function(event) {
            event.preventDefault();
            event.stopPropagation();
            confirmDeleteDigObj($(this).parent().attr("data-url"));
        });

        $("#digobjTable").append($preview);

		if (title == "") {
			 $.get( "PHP//getDigitalObjectPageForCorsP.php",
					 "urlob=" + urlObj,
				  function(data) {
					  console.log(data);
					  var match = data.html.match(regex);
					  if (match !== null) {
						  // .html() decodes HTML entities
						  $("#digobjTable .digobjPreview[data-url='" + urlObj + "'] span").html(match[0].split(">")[1].split("<")[0]);
					  }
				  },
				  "JSON"
			).fail(function() {
				console.log('ajax for Digital object not loaded'); // or whatever
			});
		}

    }

	// for text resizing
	selectDigObjs();
}

// Add new digital object
function addDigitalObject(inputValue, inputValue2, auto) {
    try {
        var url = new URL(inputValue);
        $('#digobjInput').val("");
        $("#digobjInput").parents('.input-group').removeClass("has-error");
        $('#digobjTitle').val("");
		$("#digobjTitle").parents('.input-group').removeClass("has-error");

		createDigObjPreview(url, inputValue2);
    } catch (TypeError) {
        if (inputValue.indexOf("http://") < 0) {
            addDigitalObject("http://" + inputValue, inputValue2, auto);
        } else if (!auto) {
            $("#digobjInput").parents('.input-group').addClass("has-error");
			$("#digobjTitle").parents('.input-group').addClass("has-error");
        }
    }
}

// Confirm go to homepage
function confirmHome() {
    if (!workspaceIsEmpty()) {
		showModal(
			"Go to Homepage",
			"Do you want to go back to the homepage? You will lose all unsaved data.",
			"Stay Here",
			"Go to Homepage",
			function() {
			},
			function() {
				window.open(HOME_PAGE,"_self");
			}
		);
	} else {
		window.open(HOME_PAGE,"_self");
	}
}

// Show popover for digital object
function showDigObjImage(obj) {
    var url = obj.getAttribute("href");

    if (url.indexOf("europeana.eu") > -1) {
        var ids = url.split("record/")[1].split(".html")[0];
        $.getJSON("http://www.europeana.eu/api/v2/record/" + ids
        + ".json?wskey=UopBP64R3", function(data) {
            data.object.title;
            data.object.europeanaAggregation.edmPreview;
        });
    }

}



// Make query for entity
function makeQueryForDBName(qids) {
    var types = "VALUES ?type {\n wd:Q15222213 wd:Q17334923 wd:Q43229 wd:Q8436 wd:Q488383 " +
    "wd:Q7184903 wd:Q386724 wd:Q234460 wd:Q5 wd:Q186081 wd:Q1190554 " +
    "wd:Q15474042 wd:Q4167836 wd:Q41176 wd:Q8205328 wd:Q5127848\n}";

	return "PREFIX wd: <http://www.wikidata.org/entity/>\n" +
		"SELECT DISTINCT ?uri ?type ?itName ?enName ?itDesc ?enDesc " +
		"\nWHERE {\n" +
		"VALUES ?uri {wd:" + qids.join(" wd:") + "}\n" +
		types +
		"?uri wdt:P31 ?class.\n" +
		"?class wdt:P279* ?type.\n" +
		"OPTIONAL { ?uri rdfs:label ?enName filter (lang(?enName) = 'en'). }\n" +
		"OPTIONAL { ?uri schema:description ?enDesc filter (lang(?enDesc) = 'en'). }\n" + "\n\}";
}

// Perform SPARQL request for each entity
function dbNameRequest(qids) {

    var query = makeQueryForDBName(qids);

    var sparqlURL = "https://query.wikidata.org/sparql?format=json&query=" + encodeURIComponent(query);

    $.getJSON(sparqlURL, function (data) {
        var added = {};
        data = data["results"]["bindings"];
        for (var i=0; i < data.length; i++) {
            var qid = data[i].uri.value.split('/').pop();
            if (!(qid in added)) {
                $("#narratives-menu").append("<li class='narra-list-item'><a href='" + BUILDER_PAGE + "?idwiki=" + qid + "' class='data' target = '_blank'>" + titlecase(data[i].enName.value) + "</a></li>");
                added[qid] = {};
        	}
        }
    });
}



function openPopupMap(){

	window.open("HTML/searchCoordinates.html", "Search_Coordinates", "width=900,height=700");

}

function monthNameByNumber(monthNumber){

	var textMonth;

	if (narra.currentLang == "en") {

		switch(monthNumber) {
			case '1':
			case '01':
				textMonth = "January";
				break;
			case '2':
			case '02':
				textMonth = "February";
				break;
			case '3':
			case '03':
				textMonth = "March";
				break;
			case '4':
			case '04':
				textMonth = "April";
				break;
			case '5':
			case '05':
				textMonth = "May";
				break;
			case '6':
			case '06':
				textMonth = "June";
				break;
			case '7':
			case '07':
				textMonth = "July";
				break;
			case '8':
			case '08':
				textMonth = "August";
				break;
			case '9':
			case '09':
				textMonth = "September";
				break;
			case '10':
				textMonth = "October";
				break;
			case '11':
				textMonth = "November";
				break;
			case '12':
				textMonth = "December";
				break;
			default :
				textMonth = monthNumber;
				break;

		}

	} else {

		switch(monthNumber) {
			case '1':
			case '01':
				textMonth = "gennaio";
				break;
			case '2':
			case '02':
				textMonth = "febbraio";
				break;
			case '3':
			case '03':
				textMonth = "marzo";
				break;
			case '4':
			case '04':
				textMonth = "aprile";
				break;
			case '5':
			case '05':
				textMonth = "maggio";
				break;
			case '6':
			case '06':
				textMonth = "giugno";
				break;
			case '7':
			case '07':
				textMonth = "luglio";
				break;
			case '8':
			case '08':
				textMonth = "agosto";
				break;
			case '9':
			case '09':
				textMonth = "settembre";
				break;
			case '10':
				textMonth = "ottobre";
				break;
			case '11':
				textMonth = "novembre";
				break;
			case '12':
				textMonth = "dicembre";
				break;
			default :
				textMonth = monthNumber;
				break;

		}

	}

	return textMonth;

}

function getGeometryCenter(wkt) {
	wkt.includes('MULTIPOLYGON');

	// Remove the "POLYGON" or "MULTIPOLYGON" prefix from the WKT format
	var coordinates = wkt.replace(/POLYGON|MULTIPOLYGON/g, '').trim();

	// Remove spaces between the keyword and the parentheses
	coordinates = coordinates.replace(/\(\s*|\s*\)/g, '');

	// Remove spaces after commas
	coordinates = coordinates.replace(/\s*,\s*/g, ',');

	// Remove the brackets and separate the polygons
	var polygons = coordinates.split('),');

	var totalPoints = 0;
	var sumX = 0;
	var sumY = 0;

	// Calculate the average coordinates for each polygon
	polygons.forEach(function (polygon) {
		// Remove the brackets and separate the coordinates
		var coords = polygon.split(',');

		// Calculates the sum of coordinates for the current polygon
		coords.forEach(function (coord) {
		  var point = coord.trim().split(' ');
		  var x = parseFloat(point[0]);
		  var y = parseFloat(point[1]);

		  sumX += x;
		  sumY += y;
		  totalPoints++;
		});
	});

	// Calculate global average coordinates
	var centerX = sumX / totalPoints;
	var centerY = sumY / totalPoints;

	// Return latitude and longitude as numbers
	return [centerY, centerX];
}



function hideEntityPopover() {
	$("#secondChoice").css("visibility", "hidden");
	$("#entity-content").css("visibility", "hidden");
	$("#uri-div").css("visibility", "hidden");
	$("#div-entity-btn").css("visibility", "hidden");
}

function resetEntityPopover() {
	$('#newEntityName').val('');
	$('#newEntityDesc').val('');
	$('#newEntityType').prop('selectedIndex', 0);

	$("#uri-radio").prop('checked', false);
	$("#manual-radio").prop('checked', false);
}

function addEntityListener(thisSelectedInput) {
	hideEntityPopover();

	if ($(thisSelectedInput).attr("value") == "uri") {
		$("#entity-content:not(#secondChoice)").css("visibility", "visible");
		$("#uri-div").css("visibility", "visible");
	} else if ($(thisSelectedInput).attr("value") == "manual") {

		$("#entity-content").css("visibility", "visible");
		$("#secondChoice").css("visibility", "visible");
		$("#div-entity-btn").css("visibility", "visible");
	}
}

function addRadioListener(thisSelectedVideo) {
	$(thisSelectedVideo).click(function() {
		if ($(thisSelectedVideo).attr("value") == "image") {
			// switch off video section
			$(".video-caption-group").css("display", "none");

			$(".image-caption-group").css("display", "table");
			$("#add-image").css("display", "flex");
		} else {
			// switch off image section(s)
			$(".image-caption-group").css("display", "none");
			$("#add-image").css("display", "none");

			$(".video-caption-group").css("display", "block");
		}
	});
}

function addCoorsListener(thisSelectedCoors) {
	$(thisSelectedCoors).click(function() {
		if ($(thisSelectedCoors).attr("value") == "point") {
			// switch off polygon section
			$("#polygonArea").removeClass("has-error-coors");
			$("#polygon").css("display", "none");

			$("#coors-map").css("display", "flex");
		} else {
			// switch off coors section
			$("#latitud").removeClass("has-error-coors");
			$("#longitud").removeClass("has-error-coors");
			$("#coors-map").css("display", "none");

			$("#polygon").css("display", "flex");
		}
	});
}

function addTooltipListener(thisSelectedTooltip) {
	// the first serves as activator...
	$('[data-toggle="tooltip"]').tooltip({
		animated: 'fade',
		placement: 'auto',
		trigger: 'click'
	});

	// ... the second serves as listener
	$(thisSelectedTooltip).click(function() {
		$('[data-toggle="tooltip"]').tooltip({
			animated: 'fade',
			placement: 'auto',
			trigger: 'click'
		});
	});
}

// Set onchange event on image event uploading
function addBackgroundImageListener(thisSelectImage) {

	$(thisSelectImage).on("change", function(){

		var thisSelectEventLocalImage = $(thisSelectImage).siblings('.button-background-image-div').children('.selectEventLocalBackgroundImage');

		if ($(thisSelectImage).prop('files')[0] != undefined) {

			var fileType = $(thisSelectImage).prop('files')[0].type;
			var validImageTypes = ["image/gif", "image/jpeg", "image/png"];

			// if file is not an image
			if ($.inArray(fileType, validImageTypes) < 0) {

				$(thisSelectEventLocalImage).empty();
				$(thisSelectEventLocalImage).text("Upload image");
				$(thisSelectImage).val("");

				showAlert('image-type-error', 'Please select a valid image (png/jpeg).', 'warning', 1300);

			// if file is larger than 2 mb
			} else if ($(thisSelectImage).prop('files')[0].size > 2000000) {

				$(thisSelectEventLocalImage).empty();
				$(thisSelectEventLocalImage).text("Upload image");
				$(thisSelectImage).val("");

				showAlert('image-size-error', 'Please select a smaller image (Max 2 MB).', 'warning', 1300);

			} else {

				// file ok
				var imgName = $(thisSelectImage).prop('files')[0].name;
				$(thisSelectEventLocalImage).empty();
				$(thisSelectEventLocalImage).text("Upload image: " + imgName);

			}

		} else {
			$(thisSelectEventLocalImage).empty();
			$(thisSelectEventLocalImage).text("Upload image");
		}

	});
}

// Set onchange event on image event uploading
function addImageListener(thisSelectImage) {

	$(thisSelectImage).on("change", function(){

		var thisSelectEventLocalImage = $(thisSelectImage).siblings('.button-image-div').children('.selectEventLocalImage');

		console.log(thisSelectEventLocalImage, thisSelectImage);

		if ($(thisSelectImage).prop('files')[0] != undefined) {


			var fileType = $(thisSelectImage).prop('files')[0].type;
			var validImageTypes = ["image/gif", "image/jpeg", "image/png"];

			// if file is not an image
			if ($.inArray(fileType, validImageTypes) < 0) {

				$(thisSelectEventLocalImage).empty();
				$(thisSelectEventLocalImage).text("Upload image");
				$(thisSelectImage).val("");

				showAlert('image-type-error', 'Please select a valid image (png/jpeg).', 'warning', 1300);

			// if file is larger than 2 mb
			} else if ($(thisSelectImage).prop('files')[0].size > 2000000) {

				$(thisSelectEventLocalImage).empty();
				$(thisSelectEventLocalImage).text("Upload image");
				$(thisSelectImage).val("");

				showAlert('image-size-error', 'Please select a smaller image (Max 2 MB).', 'warning', 1300);

			} else {

				// file ok
				var imgName = $(thisSelectImage).prop('files')[0].name;
				$(thisSelectEventLocalImage).empty();
				$(thisSelectEventLocalImage).text("Upload image: " + imgName);

			}

		} else {
			$(thisSelectEventLocalImage).empty();
			$(thisSelectEventLocalImage).text("Upload image");
		}

	});
}

function addImageGroup(fromLoadEvent, media = '', caption = '') {
	var source = $('#image-caption-group'),
		clone = source.clone();

	// increment all IDs of divs
	clone.find('div').attr('id', function (i, val) {
		return val + countImageGroup;
	});

	// increment all IDs of inputs
	clone.find('input').attr('id', function (i, val) {
		return val + countImageGroup;
	}).val("");

	// increment all IDs of buttons
	clone.find('button').attr('id', function (i, val) {
		return val + countImageGroup;
	});

	// increment ID of main div
	clone.attr('id', function (i, val) {
		return val + countImageGroup;
	});

	// append a button (inside a span) which allows users to remove image sections
	clone.append(
		'<span class="remove-image-container" style="display: table-cell; vertical-align: middle; position: relative; width: 1%; padding: 5px 0 0 5px">' +
		'	<button class="btn btn-default remove-image" type="button"><i class="fa-solid fa-minus"></i> Remove image</button>' +
		'</span>');
	clone.find('.remove-image-container').siblings().css({"display": "table-cell", "float": "left", "position": "relative", "width": "100%"})
		.parent().css("display", "table");

	var uploadImageBtn = clone.find('.selectEventLocalImage');
	var inputImage = clone.find('.eventImageInput');

	// clear both values
	uploadImageBtn.text("Upload image");
	inputImage.val();


	uploadImageBtn.off('click').on('click', function() {
		document.getElementById(inputImage.attr('id')).click();
	});

	addImageListener(inputImage);

	// if the function is called by loadEvent() then retrieve saved values
	if (fromLoadEvent) {
		clone.find('input.eventMedia').val(media);
		clone.find('input.eventMediaCaption').val(caption);
	}

	clone.insertAfter($('.image-caption-group:last'));

	countImageGroup++;
}

function removeImage(buttonCaller) {
	$(buttonCaller).parent().parent().remove();
}

function copyToClipboard(whatToCopy, idk, thisButton, explicitValue) {

	var thisButtonSelector = $("#" + thisButton);
	var coorsFound = explicitValue || thisButtonSelector.attr("data-copy-value");

	if (!coorsFound) {
		if (whatToCopy == 'pol') {
			coorsFound = narra.items[idk].coordinatesPolygon;
		} else if (whatToCopy == 'lat') {
			coorsFound = narra.items[idk].coordinatesPoint;
			var matches = coorsFound.match(/-?\d+(\.\d+)?/g);
			if (matches && matches.length >= 2) {
				coorsFound = matches[1];
			} else {
				console.log("Latitude not found");
			}
		} else if (whatToCopy == 'long') {
			coorsFound = narra.items[idk].coordinatesPoint;
			var match = coorsFound.match(/-?\d+(\.\d+)?/);
			if (match) {
				coorsFound = match[0];
			} else {
				console.log("Longitude not found");
			}
		} else {
			return;
		}
	}

	if (coorsFound === undefined || coorsFound === null || coorsFound === "") {
		console.log("Nothing to copy for " + whatToCopy + " on " + idk);
		return;
	}

	function fallbackCopyText(text) {
		var textarea = document.createElement("textarea");
		textarea.value = text;
		textarea.setAttribute("readonly", "readonly");
		textarea.style.position = "fixed";
		textarea.style.opacity = "0";
		textarea.style.pointerEvents = "none";
		document.body.appendChild(textarea);
		textarea.focus();
		textarea.select();
		try {
			document.execCommand("copy");
		} finally {
			document.body.removeChild(textarea);
		}
	}

	// Prefer the modern Clipboard API, but keep a synchronous fallback
	// because popup interactions can lose clipboard permissions.
	if (navigator.clipboard && window.isSecureContext) {
		navigator.clipboard.writeText(coorsFound).catch(function(error) {
			console.log("Clipboard API failed, using fallback:", error);
			fallbackCopyText(coorsFound);
		});
	} else {
		fallbackCopyText(coorsFound);
	}

	// open popover that confirms the copy

	// the first serves as activator...
	thisButtonSelector.popover({
        html: true,
        placement: "auto",
        container: "body",
        trigger: "manual",
		template: "<div class=\"popover small-popover\" role=\"tooltip\"><div class='arrow' style='left: 50%;'></div><div class='popover-content'></div></div>",
		content: "Copied!"
    });

	// ... while the second opens the popover
	if (!thisButtonSelector.attr('aria-describedby')) {
		thisButtonSelector.popover({
			html: true,
			placement: "auto",
			container: "body",
			trigger: "manual",
			template: "<div class=\"popover small-popover\" role=\"tooltip\"><div class='arrow' style='left: 50%;'></div><div class='popover-content'></div></div>",
			content: "Copied!"
		});
		thisButtonSelector.popover('show');

		// set timeout for automatically closing the popover
		setTimeout(function () {
			thisButtonSelector.popover('hide');
		}, 1000);
	}
}
