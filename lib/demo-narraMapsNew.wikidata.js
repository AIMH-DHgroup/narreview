"use strict";

// Builder Wikidata/Wikipedia module.
// Owns subject/entity bootstrap and remote fetch helpers.

function continueAfterEmptyWikipediaSearch(lang, linksArray, subjectName) {
	if (narra.otherLang && lang !== narra.otherLang) {
		console.log("0 results in Wikipedia " + lang + "; search in Wikipedia " + narra.otherLang);
		wikipediaRequest("", narra.otherLang, linksArray, subjectName);
		return;
	}

	console.log("No related Wikipedia pages found; continuing with Wikidata entities.");
	finalizeBootstrapEntityLoad(true);
}

// Initial Wikipedia API request
function wikipediaRequest(url, lang, linksArray, subjectName) {

	var wikipediaURL = url != "" ? url : "https://" + lang + ".wikipedia.org/w/api.php?action=query&titles=" + encodeURIComponent(subjectName) +
	"&prop=redirects|pageprops&rawcontinue&generator=links&callback=?&redirects=&gpllimit=500&format=json";

	console.log(currentTime() + "Wikipedia request");
	console.log("URL wikipedia:     " + wikipediaURL);
	if (bootstrapProgressIsActive()) {
		setBootstrapProgress(70, "Loading related entities from Wikipedia and Wikidata...");
	}

	if (url.indexOf("pageimages") < 0) $.getJSON(wikipediaURL, function (links) {

		// if there are results in wikipedia in current language
		if ( Object.keys(links).length > 0 ) {

			if (narra.subjectID != "") {
				if (links.query !== undefined && links.query.pages !== undefined) {
					for (var property in links.query.pages) {
						linksArray.push(links.query.pages[property]);
					}
				}
				else {
					console.log(currentTime() + wikipediaURL);
				}
			}
			if ("query-continue" in links && "links" in links["query-continue"]) {
				url =     "https://" + lang + ".wikipedia.org/w/api.php?action=query&titles=" + encodeURIComponent(subjectName) +    "&prop=redirects|pageprops&rawcontinue&generator=links&callback=?&redirects=&gpllimit=500&format=json&gplcontinue=" + links["query-continue"]["links"]["gplcontinue"];
				wikipediaRequest(url, lang, linksArray, subjectName);
			}
			else {
				var qids = [];
				var i;

				for (i = 0; i < linksArray.length; i++) {
					if ("pageprops" in linksArray[i] && "wikibase_item" in linksArray[i]["pageprops"] && qids.indexOf(linksArray[i]["pageprops"]["wikibase_item"]) < 0) {
						qids.push(linksArray[i]["pageprops"]["wikibase_item"]);
					}
				}

				if (qids.length > 0) {
					requestQidChunks(qids, undefined, undefined, undefined, true);
				} else {
					continueAfterEmptyWikipediaSearch(lang, linksArray, subjectName);
				}
			}

		// search other language on Wikipedia if there aren't results in current language
		} else {
			continueAfterEmptyWikipediaSearch(lang, linksArray, subjectName);

		}

	});
}

// More detailed query for subject of narrative
var subjectQuery = "OPTIONAL { ?uri p:P26 ?marriage. ?marriage ps:P26 ?spouse. OPTIONAL{?marriage pq:P580 ?marriageDate.} OPTIONAL{?marriage pq:P2842 ?marriagePlace.}}\n" +
	"OPTIONAL { ?uri wdt:P25 ?mother. }\n" +
	"OPTIONAL { ?uri wdt:P22 ?father. }\n" +
	"OPTIONAL { ?uri wdt:P26 ?child. }\n" +
	"OPTIONAL { ?uri wdt:P40 ?sister. }\n" +
	"OPTIONAL { ?uri wdt:P7 ?brother. }\n" +
	"OPTIONAL { ?uri wdt:P19 ?birthPlace. }\n" +
	"OPTIONAL { ?uri wdt:P20 ?deathPlace. }\n";

var subjectExtract = " ?spouse ?marriageDate ?mother ?father ?child ?sister ?brother ?birthPlace ?deathPlace";

var SPARQL_CHUNK_SIZE = 200;
var SPARQL_MAX_RETRIES = 2;
var SPARQL_RETRY_DELAY_MS = 1200;

function finalizeBootstrapEntityLoad(withoutArrow) {
	if (bootstrapProgressIsActive()) {
		setBootstrapProgress(95, "Rendering entities and finishing setup...");
	}
	$(".spinner-loader").remove();
	$("#controls .data").remove();
	makeEntities(narra.items, withoutArrow);
	finalLoad();
}

function uniqueValues(values) {
	return Array.from(new Set(values.filter(function(value) {
		return value !== undefined && value !== null && value !== "";
	})));
}

function pushUnique(array, value) {
	if (value !== undefined && array.indexOf(value) < 0) {
		array.push(value);
	}
}

function extractEntityId(value) {
	if (value !== undefined && value.indexOf("entity/") > -1) {
		return value.split("entity/")[1];
	}
	return value;
}

function getWikidataBindingValues(bindings, field) {
	return uniqueValues(bindings.map(function(binding) {
		return binding[field] && binding[field].value;
	}));
}

function getWikidataBindingQids(bindings, field) {
	return getWikidataBindingValues(bindings, field)
		.map(extractEntityId)
		.filter(function(qid) {
			return /^Q[1-9][0-9]*$/.test(qid);
		});
}

function updateHistoricalEntityFields(entity, bindings) {
	var periodsByQid = {};
	bindings.forEach(function(binding) {
		var periodUri = binding.historicalPeriod && binding.historicalPeriod.value;
		if (!periodUri) {
			return;
		}
		var qid = extractEntityId(periodUri);
		if (!periodsByQid[qid]) {
			periodsByQid[qid] = {
				qid: qid,
				label: binding.historicalPeriodLabel && binding.historicalPeriodLabel.value || null
			};
		} else if (!periodsByQid[qid].label && binding.historicalPeriodLabel) {
			periodsByQid[qid].label = binding.historicalPeriodLabel.value;
		}
	});

	entity.historicalPeriods = Object.keys(periodsByQid).map(function(qid) {
		return periodsByQid[qid];
	});
	entity.historicalPeriod = entity.historicalPeriods[0] || null;

	var physicalSpecificTypes = [
		"Q34379", "Q187947", "Q16970", "Q16560", "Q33506",
		"Q3947", "Q23413", "Q44613", "Q1640824", "Q42195"
	];
	if (!entity.wikidataTypes.some(function(type) {
		return physicalSpecificTypes.indexOf(type) > -1;
	})) {
		entity.timeSpan = null;
		return;
	}

	var constructionStarts = getWikidataBindingValues(bindings, "constructionStart");
	var constructionEnds = getWikidataBindingValues(bindings, "constructionEnd");
	var foundations = getWikidataBindingValues(bindings, "foundation");
	entity.timeSpan = {
		start: constructionStarts[0] || foundations[0] || null,
		end: constructionEnds[0] || null,
		startSource: constructionStarts.length ? "P793/P580" : (foundations.length ? "P571" : null),
		endSource: constructionEnds.length ? "P793/P582" : null
	};
}

function entityHasAnyType(entity, types) {
	return types.some(function(type) {
		return entity.wikidataTypes.indexOf(type) > -1;
	});
}

function updateLocatedIn(entity, bindings) {
	var buildingTypes = ["Q41176", "Q33506", "Q16970", "Q3947", "Q16560", "Q23413", "Q44613"];
	var locations = getWikidataBindingQids(bindings, "locatedIn");
	if (entityHasAnyType(entity, buildingTypes) && locations.length) {
		entity.locatedIn = locations[0];
	}
}

function linkedWikidataEntities(bindings, uriField, itLabelField, enLabelField) {
	var found = {};
	bindings.forEach(function(binding) {
		var uri = binding[uriField] && binding[uriField].value || "";
		var qid = extractEntityId(uri);
		if (!/^Q[1-9][0-9]*$/.test(qid)) {
			return;
		}
		var label = binding[itLabelField] && binding[itLabelField].value
			|| binding[enLabelField] && binding[enLabelField].value
			|| qid;
		if (!found[qid] || found[qid].label === qid) {
			found[qid] = {
				qid: qid,
				label: label,
				url: "https://www.wikidata.org/wiki/" + qid
			};
		}
	});
	return Object.keys(found).map(function(qid) {
		return found[qid];
	});
}

function fetchAdditionalEntityFields(qid, entity, callback) {
	var epigraphTypes = ["Q1640824"];
	var archaeologicalSiteTypes = ["Q839954", "Q120964921"];
	var tasks = [];

	if (entityHasAnyType(entity, epigraphTypes)) {
		tasks.push({
			name: "epigraph details",
			query: "SELECT DISTINCT ?inscriptionText ?inscriptionDedicatedTo " +
				"?inscriptionWork ?workItLabel ?workEnLabel ?inscriptionClient " +
				"?clientItLabel ?clientEnLabel WHERE { " +
				"OPTIONAL { wd:" + qid + " wdt:P1684 ?inscriptionText. } " +
				"OPTIONAL { wd:" + qid + " wdt:P825 ?inscriptionDedicatedTo. } " +
				"OPTIONAL { wd:" + qid + " wdt:P1574 ?inscriptionWork. " +
					"OPTIONAL { ?inscriptionWork rdfs:label ?workItLabel. FILTER(LANG(?workItLabel) = 'it') } " +
					"OPTIONAL { ?inscriptionWork rdfs:label ?workEnLabel. FILTER(LANG(?workEnLabel) = 'en') } } " +
				"OPTIONAL { wd:" + qid + " wdt:P88 ?inscriptionClient. " +
					"OPTIONAL { ?inscriptionClient rdfs:label ?clientItLabel. FILTER(LANG(?clientItLabel) = 'it') } " +
					"OPTIONAL { ?inscriptionClient rdfs:label ?clientEnLabel. FILTER(LANG(?clientEnLabel) = 'en') } } " +
				"} LIMIT 5000",
			apply: function(bindings) {
				var texts = getWikidataBindingValues(bindings, "inscriptionText");
				var dedicatees = getWikidataBindingQids(bindings, "inscriptionDedicatedTo");
				var works = linkedWikidataEntities(bindings, "inscriptionWork", "workItLabel", "workEnLabel");
				var clients = linkedWikidataEntities(bindings, "inscriptionClient", "clientItLabel", "clientEnLabel");
				if (texts.length) entity.inscriptionText = texts.length === 1 ? texts[0] : texts;
				if (dedicatees.length) entity.inscriptionDedicatedTo = dedicatees.length === 1 ? dedicatees[0] : dedicatees;
				if (works.length) entity.inscriptionWorkReference = works;
				if (clients.length) entity.inscriptionClient = clients;
			}
		});
	}

	if (entityHasAnyType(entity, archaeologicalSiteTypes)) {
		tasks.push({
			name: "archaeological site parts",
			query: "SELECT DISTINCT ?part ?partItLabel ?partEnLabel WHERE { " +
				"{ wd:" + qid + " wdt:P9047 ?part. } UNION " +
				"{ wd:" + qid + " wdt:P527 ?part. } UNION " +
				"{ ?part wdt:P361 wd:" + qid + ". } " +
				"FILTER(STRSTARTS(STR(?part), 'http://www.wikidata.org/entity/Q')) " +
				"OPTIONAL { ?part rdfs:label ?partItLabel. FILTER(LANG(?partItLabel) = 'it') } " +
				"OPTIONAL { ?part rdfs:label ?partEnLabel. FILTER(LANG(?partEnLabel) = 'en') } " +
				"} LIMIT 5000",
			apply: function(bindings) {
				var parts = linkedWikidataEntities(bindings, "part", "partItLabel", "partEnLabel");
				if (parts.length) entity.partsOfSite = parts;
			}
		});
	}

	if (tasks.length === 0) {
		callback();
		return;
	}

	var pending = tasks.length;
	tasks.forEach(function(task) {
		$.getJSON(buildWikidataSparqlUrl(
			"PREFIX wd: <http://www.wikidata.org/entity/> " +
			"PREFIX wdt: <http://www.wikidata.org/prop/direct/> " +
			"PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#> " +
			task.query
		)).done(function(data) {
			task.apply(data.results.bindings);
		}).fail(function(jqXHR, textStatus, errorThrown) {
			console.error("Wikidata " + task.name + " request failed for " + qid + ":", textStatus, errorThrown);
		}).always(function() {
			pending -= 1;
			if (pending === 0) {
				callback();
			}
		});
	});
}

function normalizeWikidataDate(value) {
	return value.replace("+", "").split("T")[0].split("-01-01")[0];
}

function buildWikidataSparqlUrl(query) {
	return "https://query.wikidata.org/sparql?format=json&query=" + encodeURIComponent(query);
}

function requestQidChunks(qids, lastRun, callback, force, withoutArrow) {
	var normalizedQids = uniqueValues(qids);
	var computedLastRun = lastRun !== undefined ? lastRun : narra.counter + Math.floor(normalizedQids.length / SPARQL_CHUNK_SIZE) + 1;

	for (var i = 0; i < normalizedQids.length; i += SPARQL_CHUNK_SIZE) {
		sparqlRequest(normalizedQids.slice(i, i + SPARQL_CHUNK_SIZE), computedLastRun, callback, force, withoutArrow);
	}

	return computedLastRun;
}

function enrichSubjectRelations(item, newItem, newItemsToLoad) {
	var relationFields = ["father", "mother", "brother", "sister", "spouse", "birthPlace", "deathPlace", "marriagePlace"];
	for (var i = 0; i < relationFields.length; i++) {
		var field = relationFields[i];
		if (field in item) {
			newItem[field] = extractEntityId(item[field]["value"]);
			pushUnique(newItemsToLoad, newItem[field]);
		}
	}
}

// Add role to global array of roles
function addRole(role) {
	if (role !== undefined) {
		role = extractEntityId(role);
	}
	if (!(role in narra.roles)) {
		narra.roles[role] = {};
	}
	return role;
}

// Convert result of SPARQL query to JavaScript object
function sparqlToItem(item, force) {
	var qid = extractEntityId(item["uri"]["value"]);
	var newItemsToLoad = [];

	if (!(qid in narra.items)) {

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
		newItem.wikidataTypes = [];
		newItem.specificType = [];
		newItem.occupationType = [];
		newItem.historicalPeriod = null;
		newItem.historicalPeriods = [];
		newItem.timeSpan = null;

		// Extract basic data from each entity
		if("multiName" in item){
			newItem["itName"] = item["multiName"]["value"];
			newItem["enName"] = item["multiName"]["value"];
		} else {
			if ("itName" in item) {newItem["itName"] = item["itName"]["value"];}
			if ("enName" in item) {newItem["enName"] = item["enName"]["value"];}
		}
		if ("itDesc" in item) newItem["itDesc"] = item["itDesc"]["value"];
		if ("enDesc" in item) newItem["enDesc"] = item["enDesc"]["value"];
		if ("image" in item) newItem["image"] = item["image"]["value"];
		if ("coordinatesPoint" in item) newItem["coordinatesPoint"] = item["coordinatesPoint"]["value"];
		if ("birth" in item) newItem["birth"] = normalizeWikidataDate(item["birth"]["value"]);
		if ("death" in item) newItem["death"] = normalizeWikidataDate(item["death"]["value"]);
		if ("foundation" in item) newItem["foundation"] = normalizeWikidataDate(item["foundation"]["value"]);
		if ("foundation2" in item) newItem["foundation2"] = normalizeWikidataDate(item["foundation2"]["value"]);
		if ("completion" in item) newItem["completion"] = normalizeWikidataDate(item["completion"]["value"]);

		// Extract more data for subject of the narrative
		if (qid == narra.subjectID) {
			if ("marriageDate" in item) newItem["marriageDate"] = normalizeWikidataDate(item["marriageDate"]["value"]);
			enrichSubjectRelations(item, newItem, newItemsToLoad);
		}

		var newRole;

		// Extract roles of the entity
		if ("occupation" in item) {
			newRole = extractEntityId(item["occupation"]["value"]);
			pushUnique(newItem["role"], addRole(newRole));
		}
		if ("position" in item) {
			newRole = extractEntityId(item["position"]["value"]);
			pushUnique(newItem["role"], addRole(newRole));
		}

		// Extract type of the entity
		if ("type" in item) {
			pushUnique(newItem["type"], extractEntityId(item["type"]["value"]));
		} else if (force) {
			pushUnique(newItem["type"], "other");
		}

		narra.items[qid] = newItem;
	} else {
		try {
			// Extract additional types and roles
			if ("type" in item && "type" in narra.items[qid]) pushUnique(narra.items[qid].type, extractEntityId(item["type"]["value"]));
			if ("occupation" in item && "role" in narra.items[qid]) pushUnique(narra.items[qid].role, addRole(item["occupation"]["value"]));
			if ("position" in item && "role" in narra.items[qid]) pushUnique(narra.items[qid].role, addRole(item["position"]["value"]));
		} catch(e) {
			console.log(currentTime() + "Error in sparqlToItem: " + narra.items[qid]);
		}
	}

	var entity = narra.items[qid];
	if (!Array.isArray(entity.type)) entity.type = [];
	if (!Array.isArray(entity.wikidataTypes)) entity.wikidataTypes = [];
	if (!Array.isArray(entity.specificType)) entity.specificType = [];
	if (!Array.isArray(entity.occupationType)) entity.occupationType = [];
	if ("type" in item) {
		var typeQid = extractEntityId(item.type.value);
		pushUnique(entity.wikidataTypes, typeQid);
	}
	if ("specificType" in item) {
		var specificTypeQid = extractEntityId(item.specificType.value);
		pushUnique(entity.specificType, specificTypeQid);
		pushUnique(entity.wikidataTypes, specificTypeQid);
	}
	if ("occupationType" in item) {
		var occupationTypeQid = extractEntityId(item.occupationType.value);
		pushUnique(entity.occupationType, occupationTypeQid);
		pushUnique(entity.wikidataTypes, occupationTypeQid);
	}

	return newItemsToLoad;
}

// Make query for entity
function makeQuery(qids, isSubject, force) { 
	var types = "VALUES ?type {\n wd:Q15222213 wd:Q17334923 wd:Q43229 wd:Q8436 wd:Q488383 " +
	"wd:Q7184903 wd:Q386724 wd:Q234460 wd:Q5 wd:Q186081 wd:Q1190554 wd:Q35120 " +
	"wd:Q15474042 wd:Q4167836 wd:Q41176 wd:Q8205328 wd:Q5127848 wd:Q27096213\n}";
	var specificTypes = "VALUES ?specificType {\n wd:Q34379 wd:Q110295396 wd:Q187947 wd:Q33506 " +
		"wd:Q16970 wd:Q3947 wd:Q16560 wd:Q23413 wd:Q44613 wd:Q1640824 " +
		"wd:Q42195 wd:Q839954 wd:Q120964921 wd:Q4271324 wd:Q95074\n}";
	var occupationTypes = "VALUES ?occupationType { wd:Q1294787 wd:Q639669 }";

	return "PREFIX wd: <http://www.wikidata.org/entity/>\n" +
		"PREFIX wdt: <http://www.wikidata.org/prop/direct/>\n" +
		"PREFIX p: <http://www.wikidata.org/prop/>\n" +
		"PREFIX ps: <http://www.wikidata.org/prop/statement/>\n" +
		"PREFIX pq: <http://www.wikidata.org/prop/qualifier/>\n" +
		"PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>\n" +
		"PREFIX schema: <http://schema.org/>\n" +
		"SELECT DISTINCT ?uri ?type ?specificType ?occupationType ?itName ?enName ?multiName ?itDesc ?enDesc ?image " +
		"?birth ?death ?foundation ?foundation2 ?completion ?occupation ?position ?coordinatesPoint " +
		"?locatedIn ?constructionStart ?constructionEnd ?historicalPeriod ?historicalPeriodLabel" +
		(isSubject ? subjectExtract : "") +
		"\nWHERE {\n" +
		"VALUES ?uri {wd:" + qids.join(" wd:") + "}\n" +
		(force ? "" : types) +
		(force ? "OPTIONAL {?uri wdt:P31 ?class.\n}" : "?uri wdt:P31 ?class.\n") +
		(force ? "OPTIONAL {?class wdt:P279* ?type.\n " + types + "}" : "?class wdt:P279* ?type.\n") +
		"OPTIONAL {?uri wdt:P31/wdt:P279* ?specificType.\n " + specificTypes + "}\n" +
		"OPTIONAL {?uri wdt:P106/wdt:P279* ?occupationType.\n " + occupationTypes + "}\n" +
		"OPTIONAL { ?uri wdt:P18 ?image. }\n" +
		"OPTIONAL { ?uri wdt:P569 ?birth. }\n" +
		"OPTIONAL { ?uri wdt:P570 ?death. }\n" +
		"OPTIONAL { ?uri wdt:P571 ?foundation. }\n" +
		"OPTIONAL { ?uri wdt:P580 ?foundation2. }\n" +
		"OPTIONAL { ?uri wdt:P1619 ?completion. }\n" +
		"OPTIONAL { ?uri wdt:P106 ?occupation. }\n" +
		"OPTIONAL { ?uri wdt:P39 ?position. }\n" +
		"OPTIONAL { ?uri wdt:P625 ?coordinatesPoint. }\n" +
		"OPTIONAL { ?uri wdt:P131 ?locatedIn. }\n" +
		"OPTIONAL { ?uri p:P793 ?constructionStatement. " +
			"?constructionStatement ps:P793 wd:Q385378. " +
			"OPTIONAL { ?constructionStatement pq:P580 ?constructionStart. } " +
			"OPTIONAL { ?constructionStatement pq:P582 ?constructionEnd. } }\n" +
		"OPTIONAL { ?uri wdt:P2348 ?historicalPeriod. " +
			"OPTIONAL { ?historicalPeriod rdfs:label ?historicalPeriodLabel. " +
			"FILTER(LANG(?historicalPeriodLabel) = 'en') } }\n" +
		(isSubject ? subjectQuery : "") +
		"OPTIONAL { ?uri rdfs:label ?itName filter (lang(?itName) = 'it'). }\n" +
		"OPTIONAL { ?uri rdfs:label ?enName filter (lang(?enName) = 'en'). }\n" +
		"OPTIONAL { ?uri rdfs:label ?multiName filter (lang(?multiName) = 'mul'). }\n" +
		"OPTIONAL { ?uri schema:description ?itDesc filter (lang(?itDesc) = 'it'). }\n" +
		"OPTIONAL { ?uri schema:description ?enDesc filter (lang(?enDesc) = 'en'). }\n" + "\n\} limit 50000";
}

// Perform SPARQL request for each entity
function sparqlRequest(qids, lastRun, callback, force, withoutArrow=false, retryCount=0) {
	qids = uniqueValues(qids);
	if (qids.length === 0) {
		return;
	}
	if (bootstrapProgressIsActive()) {
		var isSubjectRequest = qids[0] == narra.subjectID;
		var initialPercent = isSubjectRequest ? 35 : 55;
		var progressGain = Math.min(15, Math.max(3, qids.length / 12));
		setBootstrapProgress(initialPercent + progressGain, isSubjectRequest ? "Loading main subject data..." : "Loading related entities...");
	}
	console.log(currentTime() + "Wikidata request");

	// If requesting main subject entity, make special query
	var query = makeQuery(qids, qids[0] == narra.subjectID, force);

	console.log("Query:       " + query);

	var sparqlURL = buildWikidataSparqlUrl(query);

	console.log("URLL for query result:       " + sparqlURL);

	$.getJSON(sparqlURL)
		.done(function (data) {
			if (bootstrapProgressIsActive()) {
				var isSubjectRequest = qids[0] == narra.subjectID;
				var estimatedPercent = isSubjectRequest ? 48 : 68;
				if (lastRun && narra.counter > 0) {
					estimatedPercent = Math.min(90, estimatedPercent + Math.round((narra.counter / lastRun) * 12));
				}
				setBootstrapProgress(estimatedPercent, isSubjectRequest ? "Subject loaded. Fetching related entities..." : "Saving fetched entities...");
			}
			if(data["results"]["bindings"] != ""){

				narra.counter += 1;
				data = data["results"]["bindings"];

				var i;
				var qidsToSave = [];
				var bindingsByQid = {};

				for (i=0; i < data.length; i++) {
					var bindingQid = extractEntityId(data[i].uri.value);
					if (!bindingsByQid[bindingQid]) bindingsByQid[bindingQid] = [];
					bindingsByQid[bindingQid].push(data[i]);
					var newItemsToLoad = uniqueValues(sparqlToItem(data[i], force));
					if (newItemsToLoad.length > 0) sparqlRequest(newItemsToLoad, narra.counter + 1, function(){}, undefined, true);
				}

				var shouldFinishRequest = false;
				for (i=0; i < qids.length; i++) {
					var qid = qids[i];

					if (qid in narra.items) {
						qidsToSave.push(qid);
					}

					if (i == qids.length - 1 && narra.counter == lastRun) {
						shouldFinishRequest = true;
					}
				}

				var qidsToEnrich = qidsToSave.filter(function(qid) {
					return bindingsByQid[qid] && bindingsByQid[qid].length;
				});
				var pendingEnrichments = qidsToEnrich.length;
				var enrichmentsComplete = function() {
					saveObjectsBatchToDB(narra.items, qidsToSave);

					if (shouldFinishRequest) {
						var finalQid = qids[qids.length - 1];
						console.log("Last run of sparql request");
						console.log(qids);
						updateTitle();

						if (callback !== undefined) {
							callback(narra.items[finalQid]);
						} else if (qids.length > 1) {
							finalizeBootstrapEntityLoad(withoutArrow);
						}
					}

					if (qids[0] == narra.subjectID) {
						if (bootstrapProgressIsActive()) {
							setBootstrapProgress(60, "Fetching related links from Wikipedia...");
						}
						getWikipediaTitle(narra.subjectID, narra.currentLang, function(title) {
							if(title) {
								var subjectName = title.replace(/ /g, "_");
								console.log("Wikipedia title: " + subjectName);
								wikipediaRequest("", narra.currentLang, [], subjectName);
							} else {
								console.log("Wikipedia title not found for " + narra.subjectID);
								var subjectName = narra.items[narra.subjectID][narra.currentLang + "Name"];
								wikipediaRequest("", narra.currentLang, [], subjectName);
							}
						});
					}
				};

				if (pendingEnrichments === 0) {
					enrichmentsComplete();
				} else {
					qidsToEnrich.forEach(function(qid) {
						var entity = narra.items[qid];
						var bindings = bindingsByQid[qid];
						updateLocatedIn(entity, bindings);
						updateHistoricalEntityFields(entity, bindings);
						fetchAdditionalEntityFields(qid, entity, function() {
							pendingEnrichments -= 1;
							if (pendingEnrichments === 0) {
								enrichmentsComplete();
							}
						});
					});
				}
			} else {
				window.history.replaceState(null, '', HOME_PAGE);

				apiJsonRequest({
					type: "POST",
					url: API.deleteNarration,
					data: getNarrativeRequestData({id: narra.id_n}),
					success: function() {},
					error: logAjaxError
				});

				showModal(
					"Entity not found",
					'this entity has no class in wikidata. Please insert property "instance of" in the <a target="_blank" href="https://www.wikidata.org/wiki/' + narra.subjectID + '">wikidata page</a> or report this error to <a href="mailto:emanuele.lenzi@isti.cnr.it?subject=NBVT%20Entity_Error_' + narra.subjectID + '">emanuele.lenzi@isti.cnr.it</a>',
					"Back",
					"Confirm",
					function() {
						window.location.href = HOME_PAGE;
					},
					function() {
						window.location.href = HOME_PAGE;
					}
				);
			}
		}).fail(function(jqXHR, textStatus, errorThrown){
			var isTransientFailure = jqXHR.status === 0 || jqXHR.status === 429 || jqXHR.status >= 500 || textStatus === "timeout";

			console.log(currentTime() + "SPARQL request failed: " + textStatus + " status=" + jqXHR.status + " error=" + errorThrown);

			if (isTransientFailure && retryCount < SPARQL_MAX_RETRIES) {
				setTimeout(function() {
					sparqlRequest(qids, lastRun, callback, force, withoutArrow, retryCount + 1);
				}, SPARQL_RETRY_DELAY_MS * (retryCount + 1));
				return;
			}

			if (callback === undefined && narra.subjectID in narra.items) {
				showAlert('partial-entity-load', 'Some related entities could not be loaded from Wikidata right now. Continuing with the available data.', 'warning', 3500);
				finalizeBootstrapEntityLoad(withoutArrow);
				return;
			}

			$(".spinner").hide();
			hideBootstrapProgress();
			$(".spinner-loader").remove();

			showModal(
				"Entity not found",
				"there is an error with this wikidata entity. Please search another entity and report this error to <a href='mailto:emanuele.lenzi@isti.cnr.it?subject=NBVT%20Entity_Error_" + narra.subjectID + "'>emanuele.lenzi@isti.cnr.it</a>",
				"Back",
				"Confirm",
				function() {},
				function() {}
			);
		});
}

function getWikipediaTitle(qid, lang, callback) {
	var query = `
		SELECT ?title WHERE {
		  ?article schema:about wd:${qid} ;
				   schema:isPartOf <https://${lang}.wikipedia.org/> ;
				   schema:name ?title .
		  FILTER(LANG(?title) = "${lang}")
		} LIMIT 1
	`;

	var sparqlURL = buildWikidataSparqlUrl(query);

	$.getJSON(sparqlURL)
	 .done(function(data) {
		 if(data.results.bindings.length > 0) {
			 var fullTitle = data.results.bindings[0].title.value;
			 callback(fullTitle);
		 } else {
			 callback(null);
		 }
	 })
	 .fail(function() {
		 callback(null);
	 });
}

// Request for new entities added by the user
function newEntityRequest(title, lang) {
	var url = "https://wikidata.org/w/api.php?action=wbgetentities&props=labels|claims|sitelinks|descriptions&callback=?&titles=" +
		title + "&sites=" + lang + "wiki&languages=it|en&format=json";
	console.log(currentTime() + url);
	$.getJSON(url, function (data) {
		console.log(currentTime() + "Loading new entity");
		data = data["entities"];
		var qidsToLoad = [];
		for (var key in data) {
			data[key]["_id"] = key;
			data[key]["id"] = key;
			qidsToLoad.push(key);
		}
		requestQidChunks(qidsToLoad, narra.counter + 1, undefined, true, true);
	});
}
