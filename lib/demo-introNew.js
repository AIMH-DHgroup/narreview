
// Use ECMAScript strict mode
"use strict";

// Remote database
var db = {};
var HOME_PAGE = "SMBVT_2.0.html";
var BUILDER_PAGE = "toolNew.html";
var SEARCH_PAGE = "Search/?dataset=narratives";

// Keep the home search and the JSON import fallback on the same Wikidata configuration.
function createWikidataSuggestions() {
	return new Bloodhound({
		datumTokenizer: function(results) {
			return Bloodhound.tokenizers.whitespace(results);
		},
		queryTokenizer: Bloodhound.tokenizers.whitespace,
		remote: {
			url: 'https://www.wikidata.org/w/api.php?action=wbsearchentities&search=%QUERY&language=en&limit=10&format=json&callback=?',
			wildcard: '%QUERY',
			filter: function(response) {
				return response.search;
			}
		}
	});
}

function wikidataSuggestionLabel(suggestion) {
	var description = suggestion.description;
	return suggestion.label + (description !== undefined ? ' (' + description + ')' : '');
}

$(document).ready(function() {
    
    // Set click event on home button
    $("#home").click(function() {
        confirmLogout();
    });

    // Reuse the existing click action for visible, named menu div controls.
    var iconSpacePressed = new WeakSet();
    $(document).on('keydown keyup', '#narratives-menu div.deleteButton[role="button"]', function(event) {
        if (event.target !== this || (event.key !== 'Enter' && event.key !== ' ')) {
            return;
        }
        event.preventDefault();
        event.stopPropagation();
        var disabled = $(this).attr('aria-disabled') === 'true' || $(this).hasClass('disabledButton');
        if (disabled) {
            iconSpacePressed.delete(this);
            return;
        }
        if (event.repeat || (event.originalEvent && event.originalEvent.repeat)) {
            return;
        }
        if (event.key === ' ' && event.type === 'keydown') {
            iconSpacePressed.add(this);
        } else if (event.key === ' ' && iconSpacePressed.delete(this)) {
            this.click();
        } else if (event.key === 'Enter' && event.type === 'keydown') {
            this.click();
        }
    });
    $(document).on('focusout', '#narratives-menu div.deleteButton[role="button"]', function() {
        iconSpacePressed.delete(this);
    });
	
    
	$.ajax({
		type: "GET",
		//url: "conn.php", 
		url: "PHP/session.php", 
		dataType: "JSON",					
		data: {},
		success: function(resp) {
			console.log(resp.username)
			if(resp.username != ""){
				
				
				$("#userName").text(resp.usernameToDisplayInMenu.toUpperCase());
               
				

				$("#userName").css("display","table");
				$("#home").css("display","table");
				$("#userMenu").css("display","table");
				
				$('#userMenu').css({ 'right' : $('#userName').width() + 10 })
				$('.dropdown-menu-right').css({ 'right' : $('#userName').width() + 10 })
				$('.dropdown-menu-right').css({ 'top' : $('#userName').height() +10})
				
				// Keep legacy VRE users readable in the UI, but always use the current builder.
				if( resp.username != resp.usernameToDisplayInMenu){
					$("#home").hide()
					$("#account-menu").hide()
				}
				var toolHtmlPageName= BUILDER_PAGE;
				
				console.log(currentTime() + "Logged in successfully as \"" + resp.usernameToDisplayInMenu + "\""); 
                
				
				var htmlTable=""
				htmlTable += "<thead> <tr> <th>Id</th> <th>Title</th> <th>Delete</th> </tr> </thead> <tbody>"				
				for(var i = 0; i < resp.jsonData.length; i ++) {
					

					htmlTable += "<tr>"
					htmlTable += "<td style='width:10%'>"+resp.jsonData[i][0]+"</td> <td style='width:80%'><a href='"+toolHtmlPageName+"?idwiki=" + resp.jsonData[i][2].toUpperCase() + "&idnar="+resp.jsonData[i][0]+"'>" + resp.jsonData[i][1] + "</a></td>"
					
					
  					var escapeTrash= resp.jsonData[i][1].replace(/'/g,"&rsquo;");
					escapeTrash= escapeTrash.replace(/-/g,"&ndash;");
					escapeTrash= escapeTrash.replace(/"/g,"&quot;"); 
					
					if(resp.jsonData[i][3]==null){
						htmlTable += "<td style='width:10%'> <button class='narrative-delete-control' type='button' aria-label='Delete narrative' title='Delete narrative' id='"+resp.jsonData[i][0]+"-"+resp.jsonData[i][2]+"-"+resp.username+"-"+escapeTrash+"' onclick='deleteNarrative(this.id)'> <i class='fa fa-trash' aria-hidden='true'></i> </button></td>"
					
					} else {
					
						htmlTable += "<td style='width:10%'>can't delete</td>"
					} 
					
					htmlTable += "</tr>"
					
					
					$("#narratives-menu").append("<div class='narra-list-item' id='storyMenu"+i+"'><a href='toolNew.html?idwiki=" + resp.jsonData[i][2].toUpperCase() + "&idnar="+resp.jsonData[i][0]+"' class='data' target = '_blank'>" + resp.jsonData[i][1] + "</a><div class='deleteButton' role='button' tabindex='0' aria-label='Delete narrative' title='Delete narrative' id='"+resp.jsonData[i][0]+"-"+resp.jsonData[i][2]+"-"+resp.username+"-"+escapeTrash+"' onclick='deleteNarrative(this.id)'> <b class='x' aria-hidden='true'><i class='fa fa-trash'></i></b></div></div>");
					

					if(resp.jsonData[i][3]==null){
						$("#storyMenu" + i).mouseenter(function() {
							$(this).find('.deleteButton').fadeToggle("fast");
						});
						$("#storyMenu" + i).mouseleave(function() {
							$(this).find('.deleteButton').fadeToggle("fast");
						});
					}
				
				}
				htmlTable += "</tbody>"
				$("#dataTable").append(htmlTable)
				$("#dataTable").DataTable({
					order: [0, 'desc'],
					oLanguage: {
						sSearch: "Search your Narratives:"
					},
					language: {
						  emptyTable: "No narratives found in database"
					}
				})
				
				$("#narratives-menu").append('<a href="' + SEARCH_PAGE + '"><li  class="dropdown-header">Search Other Narratives</li></a>')
				
				if (resp.jsonData.length > 0) {
					$("#userDBs").show();
				}
				
				$("#emptyDiv, #auth-div").hide();
				$("#introDiv").show();
					
					
			} else {
				$('#auth-div').show(); 
	
			}

					

					
			},
		error: function(response){
				var a= JSON.stringify(response)
				alert(a)

			}
		
	});

    
    $("#auth-form").bind("submit", function (event) {
        event.preventDefault();
        authenticate($("#inputName").val(), $("#inputPassword").val());
    });
    
    // Set click event on logout button
    /*
    $("#userMenu").click(function() {
        showUserMenu();
    });
    */
    
    var suggestions = createWikidataSuggestions();

    suggestions.initialize();

    $('.typeahead').typeahead({
      hint: false,
      highlight: false,
      minLength: 3,
    }, {
      name: 'suggestions',
        limit: 10,
      displayKey: wikidataSuggestionLabel,
      source: suggestions.ttAdapter()
    });
    
    $('.typeahead').bind('typeahead:select', function(ev, suggestion) {
        $(this).blur();
        $(this).val('');
        $('#back').css('visibility', 'hidden');
        document.getElementById('topDiv').style.height = '56%';            
        window.open(BUILDER_PAGE + '?idwiki=' + suggestion.id, "_self");
    });

	// Native button activation handles Enter/Space; there is no label default click.
	$('#json-file-button').on('click', function() {
		document.getElementById('json-narrative-file').click();
	});

	$('#json-narrative-file').on('change', function() {
		var fileName = this.files && this.files.length ? this.files[0].name : '';
		$('#json-import-status').text(fileName);
	});

	// Read the envelope locally so a subject popup is shown only when the export does not provide one.
	$('#json-import-form').on('submit', function(event) {
		event.preventDefault();
		var fileInput = document.getElementById('json-narrative-file');
		if (!fileInput.files.length) {
			$('#json-import-status').text('Select a JSON file.');
			return;
		}

		var file = fileInput.files[0];
		var reader = new FileReader();
		$('#json-import-button').prop('disabled', true);
		$('#json-import-status').text('Reading JSON...');

		reader.onerror = function() {
			$('#json-import-status').text('The JSON file could not be read.');
			$('#json-import-button').prop('disabled', false);
		};
		reader.onload = function() {
			var payload;
			try {
				payload = JSON.parse(reader.result);
			} catch (error) {
				$('#json-import-status').text('The selected file is not valid JSON.');
				$('#json-import-button').prop('disabled', false);
				return;
			}

			// Downloaded exports use `narra`; published slide.json files use `A1`.
			var metadata = payload && typeof payload.narra === 'object'
				? payload.narra
				: payload && typeof payload.A1 === 'object' ? payload.A1 : null;
			var subjectId = metadata && typeof metadata.subject === 'string'
				? $.trim(metadata.subject).toUpperCase()
				: '';

			if (/^Q[1-9][0-9]*$/.test(subjectId)) {
				uploadNarrativeJson(file, subjectId);
				return;
			}

			showJsonSubjectModal(function(selectedSubjectId) {
				uploadNarrativeJson(file, selectedSubjectId);
			}, function() {
				$('#json-import-status').text(file.name);
				$('#json-import-button').prop('disabled', false);
			});
		};
		reader.readAsText(file);
	});
});

function uploadNarrativeJson(file, subjectId) {
	var formData = new FormData();
	formData.append('subjectId', subjectId);
	formData.append('jsonFile', file);
	$('#json-import-button').prop('disabled', true);
	$('#json-import-status').text('Importing...');

	// Send one multipart request so creation of the narration and all JSONB records stays atomic.
	$.ajax({
		type: 'POST',
		url: 'PHP/importNarrative.php',
		data: formData,
		dataType: 'JSON',
		processData: false,
		contentType: false,
		success: function(response) {
			window.location.href = response.redirect;
		},
		error: function(response) {
			var message = response.responseJSON && response.responseJSON.message
				? response.responseJSON.message
				: 'The narrative could not be imported.';
			$('#json-import-status').text(message);
			$('#json-import-button').prop('disabled', false);
		}
	});
}

// Ask for the missing subject with the same Wikidata typeahead used by the main home search.
function showJsonSubjectModal(callbackSelect, callbackCancel) {
	var selectedSubjectId = '';
	var $modal = $(
		"<div class='modal fade json-subject-modal' tabindex='-1' role='dialog' aria-modal='true' aria-label='Select the narrative subject'>" +
			"<div class='modal-dialog'><div class='modal-content'>" +
				"<div class='modal-header'>" +
					"<button type='button' class='close' data-dismiss='modal' aria-label='Close'><span aria-hidden='true'>&times;</span></button>" +
					"<h5 class='modal-title'>Select the narrative subject</h5>" +
				"</div>" +
				"<div class='modal-body'>" +
					"<p>The JSON does not contain a valid subject. Search Wikidata and select one of the results.</p>" +
					"<input class='json-subject-search' type='text' autocomplete='off' aria-label='Search Wikidata' placeholder='Search Wikidata'>" +
				"</div>" +
				"<div class='modal-footer'>" +
					"<button type='button' class='btn btn-secondary' data-dismiss='modal'>Cancel</button>" +
					"<button type='button' class='btn btn-primary json-subject-confirm' disabled>Create narrative</button>" +
				"</div>" +
			"</div></div>" +
		"</div>"
	);
	var $input = $modal.find('.json-subject-search');
	var suggestions = createWikidataSuggestions();

	suggestions.initialize();
	$input.typeahead({
		hint: false,
		highlight: false,
		minLength: 3
	}, {
		name: 'json-subject-suggestions',
		limit: 10,
		displayKey: wikidataSuggestionLabel,
		source: suggestions.ttAdapter()
	});

	$input.on('typeahead:select', function(event, suggestion) {
		selectedSubjectId = suggestion.id;
		$modal.find('.json-subject-confirm').prop('disabled', false);
	});
	// Editing the label after selection invalidates the previously selected QID.
	$input.on('input', function() {
		selectedSubjectId = '';
		$modal.find('.json-subject-confirm').prop('disabled', true);
	});
	$modal.find('.json-subject-confirm').on('click', function() {
		if (!/^Q[1-9][0-9]*$/.test(selectedSubjectId)) {
			return;
		}
		$modal.data('subject-selected', true);
		$modal.modal('hide');
		callbackSelect(selectedSubjectId);
	});
	$modal.on('shown.bs.modal', function() {
		$input.focus();
	});
	$modal.on('hidden.bs.modal', function() {
		if (!$modal.data('subject-selected')) {
			callbackCancel();
		}
		$modal.remove();
	});
	$modal.modal({backdrop: 'static', keyboard: true});
}

function confirmLogout() {
    showModal(
        "Logout",
        "Do you really want to logout?",
        "Don't Logout",
        "Logout",
        function() {
        },
        function() {
/*             db.logout().then(function () {
                console.log(currentTime() + "Successfully logged out");
                window.open(HOME_PAGE,"_self");
                $("#userMenu").hide();
            }); */
			
			
			$.ajax({
				type: "POST",
				url: "PHP/sessionClose.php", 
				dataType: "JSON",					
				data: {},
				success: function(resp) {
					console.log(resp.msg)
					console.log(currentTime() + "Successfully logged out");
					window.open(HOME_PAGE,"_self");
				},
				error: function(response){
					var a= JSON.stringify(response)
					alert(a)

				}
				
			})
			
			
        }
    );
}

// Create modal dialogs
function showModal(title, text, btnCancel, btnOK, callbackCancel, callbackOK, confirmVariant) {
    var $modal = $("<div class='modal fade' tabindex='-1' role='dialog' aria-modal='true'>" +
      "<div class='modal-content'>" +
      "<div class='modal-header'>" +
    "<button type='button' class='close' data-dismiss='modal' aria-label='Close'><span aria-hidden='true'>&times;</span></button>" +
      "<h5 class='modal-title'>" + title +"</h5>" +
      "</div>" +
      "<div class='modal-body'>" +
      "<p class='modal-text'>" + text + "</p>" +
      "</div>" +
      "<div class='modal-footer'>" +
      "<button type='button' class='btn btn-secondary' data-dismiss='modal'>" + btnCancel + "</button>" +
    "<button type='button' class='btn btn-primary' data-dismiss='modal'>" + btnOK + "</button>" +
    "</div></div></div></div>");
    $modal.attr('aria-label', title);
    $modal.find(".btn-primary").toggleClass('nr-confirm-danger', confirmVariant === 'danger');
    $modal.find(".btn-secondary").click(callbackCancel);
    $modal.find(".btn-primary").click(callbackOK);
    $modal.modal("show");
}

// Authenticate user to database
function authenticate(user, pw) {   

   	
	$.ajax({
		type: "GET",
		//url: "conn.php", 
		url: "PHP/conn2.php", 
		dataType: "JSON",					
		data: {username: user, passwor: pw},
		success: function(resp) {

				if(resp.error == ""){
				
				$("#userName").text(resp.usernameToDisplayInMenu.toUpperCase());
               
				

				$("#userName").css("display","table");
				$("#home").css("display","table");
				$("#userMenu").css("display","table");
				
				$('#userMenu').css({ 'right' : $('#userName').width() + 10 })
				$('.dropdown-menu-right').css({ 'right' : $('#userName').width() + 10 })
				$('.dropdown-menu-right').css({ 'top' : $('#userName').height() +10})
				
				
				var htmlTable=""
				htmlTable += "<thead> <tr> <th>Id</th> <th>Title</th> <th>Delete</th> </tr> </thead> <tbody>"
 				for(var i = 0; i < resp.jsonData.length; i ++) {
					
					htmlTable += "<tr>"
					htmlTable += "<td style='width:10%'>"+resp.jsonData[i][0]+"</td> <td style='width:80%'><a href='toolNew.html?idwiki=" + resp.jsonData[i][2].toUpperCase() + "&idnar="+resp.jsonData[i][0]+"'>" + resp.jsonData[i][1] + "</a></td>"
   
    				var escapeTrash= resp.jsonData[i][1].replace(/'/g,"&rsquo;");
					escapeTrash= escapeTrash.replace(/-/g,"&ndash;");
					escapeTrash= escapeTrash.replace(/"/g,"&quot;"); 
					
					if(resp.jsonData[i][3]==null){
						htmlTable += "<td style='width:10%'> <button class='narrative-delete-control' type='button' aria-label='Delete narrative' title='Delete narrative' id='"+resp.jsonData[i][0]+"-"+resp.jsonData[i][2]+"-"+resp.username+"-"+escapeTrash+"' onclick='deleteNarrative(this.id)'> <i class='fa fa-trash' aria-hidden='true'></i> </button></td>"
					
					} else {
					
						htmlTable += "<td style='width:10%'>can't delete</td>"
					} 
					
					htmlTable += "</tr>"
					
					$("#narratives-menu").append("<li class='narra-list-item'><a href='toolNew.html?idwiki=" + resp.jsonData[i][2].toUpperCase() + "&idnar="+resp.jsonData[i][0]+"' class='data' target = '_blank'>" + resp.jsonData[i][1] + "</a></li>");
					
					
				
				} 
				htmlTable += "</tbody>"
				$("#dataTable").append(htmlTable)
				$("#dataTable").DataTable({
					order: [0, 'desc'],
					oLanguage: {
						sSearch: "Search your Narratives:"
					},
					language: {
						  emptyTable: "No narratives found in database"
					}
				})
				
				$("#narratives-menu").append('<a href="' + SEARCH_PAGE + '"><li  class="dropdown-header">Search Other Narratives</li></a>')
				
				if (resp.jsonData.length > 0) {
					$("#userDBs").show();
				}
				
				$("#emptyDiv, #auth-div").hide();
				$("#introDiv").show();
					 
					
				} else {
					
					alert(resp.error)
				
				}
					

					
			},
		error: function(response){
				var a= JSON.stringify(response)
				alert(a)

			}
		
	});
 
    return false;
}

// Return current time
function currentTime() {
    var d = new Date();
    return d.toISOString().split("T")[1].replace("Z", "") + " -- ";
}

// Make query for entity
function makeQuery(qids) {
    var types = "VALUES ?type {\n wd:Q15222213 wd:Q17334923 wd:Q43229 wd:Q8436 wd:Q488383 " +
    "wd:Q7184903 wd:Q386724 wd:Q234460 wd:Q5 wd:Q186081 wd:Q1190554 " +
    "wd:Q15474042 wd:Q41176 wd:Q8205328 wd:Q5127848\n}";
    
    var query = "PREFIX wd: <http://www.wikidata.org/entity/>\n" +
        "SELECT DISTINCT ?uri ?type ?itName ?enName ?itDesc ?enDesc ?image " +
        "?birth ?death ?foundation ?foundation2 ?completion ?occupation ?position" +
        "\nWHERE {\n" +
        "VALUES ?uri {wd:" + qids.join(" wd:") + "}\n" +
        types +
        "?uri wdt:P31 ?class.\n" +
        "?class wdt:P279* ?type.\n" +
        "OPTIONAL { ?uri rdfs:label ?enName filter (lang(?enName) = 'en'). }\n" +
    "OPTIONAL { ?uri schema:description ?enDesc filter (lang(?enDesc) = 'en'). }\n" +  "\n\}";
    return query;
}

// Perform SPARQL request for each entity
function sparqlRequest(qids) {
    console.log(currentTime() + "Wikidata request");

    // If requesting main subject entity, make special query
    var query = makeQuery(qids);

    var sparqlURL = "https://query.wikidata.org/sparql?format=json&query=" + encodeURIComponent(query);

    //console.log("\n" + query + "\n");        
    //console.log(sparqlURL);

    $.getJSON(sparqlURL, function (data) {
                
        data = data["results"]["bindings"];
        
        var added = [];
        
        for (var i=0; i < data.length; i++) {
            var item = sparqlToItem(data[i]);

            if (added.indexOf(item._id) < 0) {
                    $("#userDBs").append("<a href='toolNew.html?" + item._id + "' class='data userDB'>" + titlecase(item.enName) + "</a>");
                    $("#narratives-menu").append("<li class='narra-list-item'><a href='toolNew.html?" + item._id + "' class='data' target = '_blank'>" + titlecase(item.enName) + "</a></li>");
                    added.push(item._id);
            }
        };
        
        if (data.length > 0) {
            $("#userDBs").show();
        }
        
        $("#emptyDiv, #auth-div").hide();
        $("#introDiv").show();
    });
}

// Convert result of SPARQL query to JavaScript object
function sparqlToItem(item, force) {
    var qid = item["uri"]["value"].split("entity/")[1];

    var newItem = {};

    newItem._id = qid;
    newItem._rev = undefined;
    newItem.itName = "";
    newItem.enName = "";
    newItem.itDesc = "";
    newItem.enDesc = "";
    newItem.image = "";
    newItem.type = [];
    newItem.role = [];

    // Extract basic data from each entity
    if ("itName" in item) newItem["itName"] = item["itName"]["value"];
    if ("enName" in item) newItem["enName"] = item["enName"]["value"];
    if ("itDesc" in item) newItem["itDesc"] = item["itDesc"]["value"];
    if ("enDesc" in item) newItem["enDesc"] = item["enDesc"]["value"];
    if ("image" in item) newItem["image"] = item["image"]["value"];
    if ("birth" in item) newItem["birth"] = item["birth"]["value"].replace("+", "").split("T")[0].split("-01-01")[0];
    if ("death" in item) newItem["death"] = item["death"]["value"].replace("+", "").split("T")[0].split("-01-01")[0];
    if ("foundation" in item) newItem["foundation"] = item["foundation"]["value"].replace("+", "").split("T")[0].split("-01-01")[0];
    if ("foundation2" in item) newItem["foundation2"] = item["foundation2"]["value"].replace("+", "").split("T")[0].split("-01-01")[0];
    if ("completion" in item) newItem["completion"] = item["completion"]["value"].replace("+", "").split("T")[0].split("-01-01")[0];

    // Extract type of the entity
    if ("type" in item) {
        newItem["type"].push(item["type"]["value"].split("entity/")[1]);
    }

    return newItem;
}

// Capitalize all words in a string
function titlecase(str) {
    return str.replace(/\w\S*/g, function(txt){return txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase();});
}

function deleteNarrative(ids){
	// e.g. arrayOfidsForDeleting[0]=idNarra [1]=subject [2]=userTable [3]=title of narr
	const arrayOfidsForDeleting = ids.split("-");

    showModal(
        "DELETE NARRATIVE",
        "</br><b>WARNING: </b> you are about to permanently delete the narration <i>"+arrayOfidsForDeleting[3]+"</i> from database. Do you want to continue?",
        "Don't delete",
        "Delete",
        function() {
        },
        function() {

		$.ajax({
			type: "POST", 
			url: "PHP/deleteNarration.php", 
			dataType: "JSON",					
			data: {subject: arrayOfidsForDeleting[1], user: arrayOfidsForDeleting[2], id: arrayOfidsForDeleting[0] },
			success: function(resp) {
				
				window.location.href ="SMBVT_2.0.html";
			
			},
			error: function(response){
					var a= JSON.stringify(response)
					alert(a)

			}
		
		});
		},
		'danger'
    );
	
}
