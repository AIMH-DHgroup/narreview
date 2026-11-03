
  
  
var url = new URL(window.location);
var user = url.searchParams.get("user");
var id = url.searchParams.get("id");
var startFromEvent= url.searchParams.get("start");
var preview = url.searchParams.get("preview")
var sketchfabApis = {};
var map= L.map($(".storymap-map")[0], {zoomControl: false, scrollWheelZoom: false}).setView([44, -120], 4);

function resolveStorymapImageUrl(imageUrl) {
	if (typeof imageUrl !== "string" || imageUrl === "") return imageUrl;

	var relativePath = imageUrl.replace(/^\.\//, "");
	return relativePath.indexOf("images/") === 0 ? "../" + relativePath : imageUrl;
}

function getAtonSID(atonId) {
	if (!atonId) return "";
	if (atonId.indexOf("/") !== -1) return atonId;
	return "vhlab/" + atonId;
}

function getModelDomId(modelId) {
	return String(modelId || '').replace(/[^A-Za-z0-9_-]/g, '_');
}

function hasEventPointGeometry(event) {
	return event && event.latitud !== undefined && event.longitud !== undefined && event.latitud !== "" && event.longitud !== "";
}

function hasEventPolygonGeometry(event) {
	return event && event.polygon !== undefined && event.polygon !== "";
}

function sendAtonViewpoint(section) {
	if (!section || section.length === 0) return;
	if (section.attr("data-modeltype") !== "aton") return;

	var atonId = section.attr("data-atonid");
	var modelDomId = section.attr("data-modeldomid") || getModelDomId(atonId);
	var viewpoint = section.attr("data-coordinate3d");
	var customCamera = section.attr("data-coordinate3d-custom");
	var iframe = document.getElementById("api-frame" + modelDomId);

	if (!iframe || !iframe.contentWindow || (!viewpoint && !customCamera)) return;

	$(".sketchfab-embed-wrapper").css("display", "none");
	$("#sketchfab-embed-wrapper-" + modelDomId).css("display", "block");

	if (customCamera) {
		var parsedCustomCamera = null;
		try {
			parsedCustomCamera = JSON.parse(decodeURIComponent(customCamera));
		} catch (error) {
			parsedCustomCamera = null;
		}

		if (!parsedCustomCamera) return;

		iframe.contentWindow.postMessage({
			type: "aton-goto-custom-camera",
			camera: parsedCustomCamera
		}, "*");
		return;
	}

	iframe.contentWindow.postMessage({
		type: "aton-goto-pov",
		pov: viewpoint
	}, "*");
}

function sendAtonViewpointForNextSection() {
	sendAtonViewpoint($(".storymap-story .sectionSlide.visible").next(".sectionSlide"));
}

function sendAtonViewpointForPreviousSection() {
	sendAtonViewpoint($(".storymap-story .sectionSlide.visible").prev(".sectionSlide"));
}

function sendSketchfabSelection(section) {
	if (!section || section.length === 0) return;
	if (section.attr("data-modeltype") !== "sketchfab") return;

	var modelDomId = section.attr("data-modeldomid") || getModelDomId(section.attr("data-sketchfabid"));
	var api = sketchfabApis[modelDomId];
	if (!api) return;

	var customCamera = section.attr("data-coordinate3d-custom");
	if (customCamera) {
		var parsedCustomCamera = null;
		try {
			parsedCustomCamera = JSON.parse(decodeURIComponent(customCamera));
		} catch (error) {
			parsedCustomCamera = null;
		}

		if (!parsedCustomCamera) return;

		api.setCameraLookAt(parsedCustomCamera.position, parsedCustomCamera.target, 1.0, function() {});
		if (typeof parsedCustomCamera.fov === 'number') {
			api.setFov(parsedCustomCamera.fov, function() {});
		}
		return;
	}

	var annotationIndex = section.attr("data-coordinate3d");
	if (annotationIndex === undefined || annotationIndex === "") return;

	api.gotoAnnotation(annotationIndex, {preventCameraAnimation: false, preventCameraMove: false}, function() {});
	api.showAnnotationTooltip(annotationIndex, function() {});
}

$(document).on("click", ".storymap-scroll-down1, #arrowDown", sendAtonViewpointForNextSection);
$(document).on("click", ".storymap-scroll-top1, #arrowUp", sendAtonViewpointForPreviousSection);
$(document).on("click", ".storymap-navwidget li", function() {
	var sceneId = $(this).find("a").attr("data-goTosceneId");
	if (!sceneId) return;

	setTimeout(function() {
		sendAtonViewpoint($("#" + sceneId));
	}, 0);
});
//L.tileLayer('http://mt0.google.com/vt/lyrs=s&hl=en&x={x}&y={y}&z={z}', {
L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>'
}).addTo(map);

var layers = {
		layerOSM:{
			//http://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}
			layer: L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png'),
			legend: '<i style="background: #CB2B3E; opacity: 1"></i><p><b>Current event</b></p> <i style="background: #FFD326; opacity: 1"></i><p><b>Historical event</b></p> <i style="background: #2AAD27; opacity: 1"></i><p><b>Natural event</b></p> <i style="background: #CB8427; opacity: 1"></i><p><b>Valorisation event</b></p> <i style="background: #2A81CB; opacity: 1"></i><p><b>Descriptive event</b></p>'
		},
		layerArcGis: {
			layer:  L.tileLayer('http://mt0.google.com/vt/lyrs=s&hl=en&x={x}&y={y}&z={z}')
		}
	}


 // get json data (slides of events) based on user and id narrative OR data from DB for previews
/*  if(url.searchParams.get("preview")){
	 var ajaxData= {dbusername_: url.searchParams.get("preview")}
	 var ajaxUrl= "index4.php"
	 } else {
	  var ajaxData= ""
	  var ajaxUrl= "../storymaps/"+user+"/"+id+"/slide.json"
	} */
 

if(preview==1){
	var urlAjax= "../TempJson/"+user+"-"+id+"-slide.json"
} else {
	var urlAjax= "../storymaps/"+user+"/"+id+"/slide.json"
}

$.ajax({
    dataType: "json",
    url: urlAjax,
	//url: ajaxUrl,
	//data: ajaxData,
    mimeType: "application/json",
    success: function(result){
		
		//////////// If is a preview////////////
/* 		if(url.searchParams.get("preview")){
			//parse json of events/entities
			var events = result.events.map(JSON.parse);
			var info= JSON.parse(result.info)
			var entitysArray = result.entitys.map(str => JSON.parse(str));
			//create key id for obj entities
			var entitys = entitysArray.reduce((acc, obj) => {
				acc[obj._id] = obj;
				return acc;
			}, {});	
		
		
		} */
		/////////////////////////////////////////
		
		
		// order object by events position
		var sort_by_position = function( a , b){
			a = result.events[a].position;
			b = result.events[b].position;
			if(a > b) return 1;
			if(a < b) return -1;
			return 0;
		}
		var events = Object.keys(result.events).sort(sort_by_position)
		
		

		var scenes= {}
		
		var numberScene=2
		
		
		scenes["scene1"] = {"lat" : 46.78203732560553, "lng": 12.82666424871100, "zoom": 5, "name": 'Intro', layers: []}

		console.log(result)
		if(result.hasOwnProperty("A1")){
			console.log(result.A1.name)
			$("#titleSlide").append(result.A1.name)
			
			if(result.A1.hasOwnProperty("coverImg")){
			$("#scene1").attr("data-background", resolveStorymapImageUrl(result.A1.coverImg));
			}
			

		}
		
		// list to attach to HTML only a unique sketchfab model for each events
		var list3DModels =[];
		
		// loop all story events ordered by position
		result.events = events.map(
			function (i) {
				
				//////////////OLD Media of event (mediaEvent=string) eventMedia can be an image or a video
				if(result.events[i].hasOwnProperty('eventMedia') && typeof result.events[i].eventMedia === "string" && result.events[i].eventMedia != ""){
					
					//media caption
					if(result.events[i].hasOwnProperty('eventMediaCaption') && result.events[i].eventMediaCaption != ""){var mediaCaption = result.events[i].eventMediaCaption } else {var mediaCaption= ""}
						
					//event video
					if(result.events[i].eventMedia.includes("www.youtube.com")){
						
						
						var divImageStory= convertYouTubeLinkToIframe(result.events[i].eventMedia)
						divImageStory += "</br><i>" + mediaCaption + "</i>"
						
						
					//event image
					} else {

						//media caption
						if(result.events[i].hasOwnProperty('eventMediaCaption') && result.events[i].eventMediaCaption != ""){var mediaCaption = result.events[i].eventMediaCaption } else {var mediaCaption= ""}
						
						var eventMediaUrl = resolveStorymapImageUrl(result.events[i].eventMedia);
						
						var divImageStory= '<span class="imgContent"><a href="'+eventMediaUrl+'" target="_blank"><img class="sectionImage" src="'+eventMediaUrl+'"></a> </br><i>' + mediaCaption + '</i></span></br>'
						//divImageStory += "</br><i>" + mediaCaption + "</i>"
					
					}
				
				///////////////NEW Media of event (images [object] and video (string) are separated)
				//event images
				} else if(result.events[i].hasOwnProperty('eventMedia') && Array.isArray(result.events[i].eventMedia)){
					
					var divImageStory="";
					for(var iImg=0; iImg<result.events[i].eventMedia.length; iImg++){
						var eventMediaUrl = resolveStorymapImageUrl(result.events[i].eventMedia[iImg]);
						divImageStory += '<span class="imgContent"><a href="'+eventMediaUrl+'" target="_blank"><img class="sectionImage" src="'+eventMediaUrl+'"></a> </br><i>' + result.events[i].eventMediaCaption[iImg] + '</i></span></br>'
						//divImageStory += "</br><i>" + result.events[i].eventMediaCaption[iImg] + "</i></br>"				
					}
				
				//event video
				} else if(result.events[i].hasOwnProperty('eventVideo') && result.events[i].eventVideo != ""){

					//media caption
					if(result.events[i].hasOwnProperty('eventVideoCaption') && result.events[i].eventVideoCaption != ""){var mediaCaption = result.events[i].eventVideoCaption } else {var mediaCaption= ""}

						var divImageStory= convertYouTubeLinkToIframe(result.events[i].eventVideo)
						divImageStory += "</br><span class='sectionImageCaption'><i>" + mediaCaption + "</i></span></br></br>"						
				
				
				/////////////// Images in the old library (media.url)
				} else if(result.events[i].hasOwnProperty('media') && result.events[i].media.url != "") {
					
					var mediaUrl = resolveStorymapImageUrl(result.events[i].media.url);
					var divImageStory= '<span class="imgContent"><a href="'+mediaUrl+'" target="_blank"><img class="sectionImage" src="'+mediaUrl+'"></a></span>'
				
				////////////// No Media event
				} else {
					var divImageStory= "";
				}
			
			
			////////Type of slides///////////
			
			// Type MAP: if there are coordinate points or polygon
			if((result.events[i].hasOwnProperty('formType') && result.events[i].formType == "map" || result.events[i].hasOwnProperty('latitud') && result.events[i].latitud != "") || (result.events[i].hasOwnProperty('polygon') &&  result.events[i].polygon != "")){

				// attach element (title, img, description...) to slide
				$(".storymap-story").append(""+
					'<section data-number-scene="'+numberScene+'" data-scene="scene'+numberScene+'" data-ev-id="'+result.events[i]._id+'" class="sectionSlide eventSlide eventSlide--map geoMapSlide" id="scene'+numberScene+'">' +
					'<h2 class="sectionTitle">'+ result.events[i].text.headline +'</h2>' +
					divImageStory +
					'<p class="sectionDescription">' + result.events[i].text.text + '</p>' +
					'</section>'
				
				)
				
							
				
				var allGeometry= [];
				var entityNameForEventGeometry= "";
				var idEntChosen= "";
				var entityNameForEventGeometryFound = false;
				var hasEventPolygon = hasEventPolygonGeometry(result.events[i]);
				var hasEventPoint = hasEventPointGeometry(result.events[i]);
				
				// get all entity geometries
				for(var idEnt of Object.keys(result.events[i].props)){
					
					// if user wants to show polygon
					//if(result.items[idEnt].hasOwnProperty('showOnMap') && result.items[idEnt].showOnMap == "showPol"){
					if(result.events[i].props[idEnt].hasOwnProperty('showOnMap') && result.events[i].props[idEnt].showOnMap == "showPol"){

						var PolygonSingleEntity= result.items[idEnt].coordinatesPolygon
						if(PolygonSingleEntity===undefined){PolygonSingleEntity=""}

						if(PolygonSingleEntity != ""){
							
							if(PolygonSingleEntity == result.events[i].polygon && !entityNameForEventGeometryFound){
								entityNameForEventGeometryFound = true
								entityNameForEventGeometry = result.items[idEnt].enName
								idEntChosen= idEnt
							}
						
							var wicket = new Wkt.Wkt();
							var readGeometry = wicket.read(PolygonSingleEntity);
							var geometry= readGeometry.toJson()
							
							var polygon = {
								"type": "Feature",
								"properties": {
									"popupcontent": "",
									"id": idEnt,
									"name": result.items[idEnt].enName,
									"isEventGeometry": false
								},
								geometry
							};
							
							allGeometry.push(polygon);
						
						}
						
					// if user wants to show point
					} else if(result.events[i].props[idEnt].hasOwnProperty('showOnMap') && result.events[i].props[idEnt].showOnMap == "showPoint"){
							

						var PointSingleEntity= result.items[idEnt].coordinatesPoint
						if(PointSingleEntity===undefined){PointSingleEntity=""}	
						
						if(PointSingleEntity != ""){
							
							if(PointSingleEntity == "Point("+result.events[i].longitud + " " + result.events[i].latitud +")" && !entityNameForEventGeometryFound){
								entityNameForEventGeometryFound = true
								entityNameForEventGeometry = result.items[idEnt].enName
								idEntChosen= idEnt
							}

							var wicket = new Wkt.Wkt();
							var readGeometry = wicket.read(PointSingleEntity);
							var geometry= readGeometry.toJson()
							
							var point = {
								"type": "Feature",
								"properties": {
									"popupcontent": "",
									"id": idEnt,
									"name": result.items[idEnt].enName,
									"isEventGeometry": false
								},
								geometry
							};						
							
							allGeometry.push(point);	
						}							
					
					}

				}
				
				

				// event polygon
				if(hasEventPolygon){
						console.log("Ecco il polig")
						console.log(result.events[i].polygon)
						var wicket = new Wkt.Wkt();
						var readGeometry = wicket.read(result.events[i].polygon);
						var geometry= readGeometry.toJson()

						
						if(result.events[i].hasOwnProperty('eventPlaceLabel')){entityNameForEventGeometry= result.events[i].eventPlaceLabel}
						var polygonEv = {
							"type": "Feature",
							"properties": {"name": entityNameForEventGeometry, "id":"evPolygon"+result.events[i]._id, "isEventGeometry": true},
							geometry
						};
						
						allGeometry.push(polygonEv);
						console.log(allGeometry)

				// event point
				} else if (hasEventPoint) {
					
					var eventPoint= "POINT("+result.events[i].longitud+" "+ result.events[i].latitud+")"
					var wicket = new Wkt.Wkt();
					var readGeometry = wicket.read(eventPoint);
					var geometry= readGeometry.toJson()
							
					if(result.events[i].hasOwnProperty('eventPlaceLabel')){entityNameForEventGeometry= result.events[i].eventPlaceLabel}
					var point = {
						"type": "Feature",
						"properties": {
							"popupcontent": "",
							"id": "evPoint" + result.events[i]._id,
							"name": entityNameForEventGeometry,
							"isEventGeometry": true
						},
						geometry
					};						
							
					allGeometry.push(point);
					
				}
				
							
				// build the layer with all the geometries	
				var layerobject= {layer:""}
				layers["layerPoligonEv"+numberScene]=layerobject
				layers["layerPoligonEv"+numberScene].layer = L.geoJSON(allGeometry, {
				  pointToLayer: function(feature, latlng) {
					var isEventGeometry = feature.properties && feature.properties.isEventGeometry;
					var iconUrl = isEventGeometry ? 'markerO.png' : 'markerB.png';
					return L.marker(latlng, {
						icon: L.icon({
							iconUrl: iconUrl,
							iconSize: [25, 41],
							iconAnchor: [12, 41],
							popupAnchor: [1, -34]
						})
					});
				  },
				  onEachFeature: function (feature, layer) {
					  var coordinatesofEvent= feature.properties.id.startsWith("evP")
					  if(!coordinatesofEvent){
						layer.bindPopup('<a target="_blank" href="https://www.wikidata.org/wiki/'+feature.properties.id+'"><p>'+feature.properties.name+'</p></a>');
					  } else {
						layer.bindPopup('<p>'+feature.properties.name+'</p>');
					  }
				  },
				  style: function(feature) {
					if (feature.properties && feature.properties.isEventGeometry) {
						return {
							"color": "#ff7800",
							"weight": 5,
							"opacity": 0.65
						};
					}

					return {
						"color": "#3388ff",
						"weight": 4,
						"opacity": 0.8,
						"fillOpacity": 0.2
					};
				  }
				})
				
				
				
				if(result.events[i].hasOwnProperty('mapZoom') && result.events[i].mapZoom != "") {
				//not auto zoom
				console.log(result.events[i].mapZoom)

					
					scenes["scene"+numberScene] = {"lat" : layers["layerPoligonEv"+numberScene].layer.getBounds().getCenter().lat, "lng" : layers["layerPoligonEv"+numberScene].layer.getBounds().getCenter().lng, "zoom" : result.events[i].mapZoom, "name" : result.events[i].text.headline, layers : [layers.layerOSM, layers["layerPoligonEv"+numberScene]]}

				// auto zoom
				} else {
					
					var boundsPolygon= layers["layerPoligonEv"+numberScene].layer.getBounds()
					var autozoomOnPolygon = map.getBoundsZoom(boundsPolygon);			
					scenes["scene"+numberScene] = {"lat" : layers["layerPoligonEv"+numberScene].layer.getBounds().getCenter().lat, "lng" : layers["layerPoligonEv"+numberScene].layer.getBounds().getCenter().lng, "zoom" : autozoomOnPolygon-1, "name" : result.events[i].text.headline, layers : [layers.layerOSM, layers["layerPoligonEv"+numberScene]]}

				}
				
				
				numberScene ++
			
			
			// type SKETCHFAB: if there is a 3d model )
			}  else if(result.events[i].hasOwnProperty('sketchfabid') && result.events[i].sketchfabid != ""){
				var sketchfabDomId = getModelDomId(result.events[i].sketchfabid);
					
					
				// API SKETCHFAB
			
				if (!list3DModels.includes(result.events[i].sketchfabid ))	{		
					
				
					$(".storymap-map").append('<div class="sketchfab-embed-wrapper" id="sketchfab-embed-wrapper-'+sketchfabDomId+'"> <iframe class="api-frame" id="api-frame'+sketchfabDomId+'" title="" frameborder="0" allowfullscreen mozallowfullscreen="true" webkitallowfullscreen="true" allow="autoplay; fullscreen; xr-spatial-tracking" xr-spatial-tracking execution-while-out-of-viewport execution-while-not-rendered web-share src="https://sketchfab.com/models/'+result.events[i].sketchfabid+'/embed?camera=0"> </iframe> </div>')

					var iframe = document.getElementById( 'api-frame'+sketchfabDomId);
					var uid = result.events[i].sketchfabid
					var client = new Sketchfab( iframe );
					
					client.init( uid, {
						success: function onSuccess( api ){
							api.start();
							sketchfabApis[sketchfabDomId] = api;
							api.addEventListener( 'viewerready', function() {
								
								//hide all annotations at the beginning
								api.getAnnotationList(function(err, annotations) {
									if (!err) {
										window.console.log(annotations);
										for(var ann=0; ann < annotations.length; ann++){

											api.hideAnnotation(ann, function(err, index) {
												if (!err) {
													window.console.log('Hiding annotation', index + 1);
												}
											});		
										
										}
									}
								});								

									
								// next and previus annotation associated with slide arrows
								$("#arrowDown").on("click", function(){
								
									var currentVisibleSectionId3D = $(".storymap-story .sectionSlide.visible").next(".sectionSlide");
									
									if (currentVisibleSectionId3D.attr('data-coordinate3d') !== undefined && currentVisibleSectionId3D.attr('data-modeltype') !== 'aton') {
										
										api.gotoAnnotation(currentVisibleSectionId3D.attr('data-coordinate3d'),  {preventCameraAnimation: false, preventCameraMove: false}, function(err, index) {
											if (!err) {
												window.console.log('Going to annotation', index + 1);
											}
										});
										
										api.showAnnotationTooltip(currentVisibleSectionId3D.attr('data-coordinate3d'), function(err) {
											if (!err) {
												window.console.log('Showing annotation tooltip');
											}
										});
									}
									
								}) 
								
								$(".storymap-scroll-down1").on("click", function(){

							

								
									var currentVisibleSectionId3D = $(".storymap-story .sectionSlide.visible").next(".sectionSlide");
									
									if (currentVisibleSectionId3D.attr('data-coordinate3d') !== undefined && currentVisibleSectionId3D.attr('data-modeltype') !== 'aton') {
										
										$(".sketchfab-embed-wrapper").css( "display","none" ); //nasconde tutti i modelli 3d
										$("#sketchfab-embed-wrapper-"+currentVisibleSectionId3D.attr('data-sketchfabid')).css( "display","block" ); //visualizza solo quello corrente		

/*  										api.hideAnnotation(Number(currentVisibleSectionId3D.attr('data-coordinate3d'))-1, function(err, index) {
											if (!err) {
												window.console.log('hide annotation', index + 1);
											}
										}); */	 

 										api.getAnnotationList(function(err, annotations) {
											if (!err) {
												window.console.log(annotations);
												for(var ann=0; ann < annotations.length; ann++){
													if(ann != Number(currentVisibleSectionId3D.attr('data-coordinate3d'))){
													api.hideAnnotation(ann, function(err, index) {
														if (!err) {
															window.console.log('Hiding annotation', index + 1);
														}
													});	
													}											
												
												}
											}
										});	 									


										api.showAnnotation(currentVisibleSectionId3D.attr('data-coordinate3d'), function(err, index) {
											if (!err) {
												window.console.log('Show annotation', index + 1);
											}
										});	

																				
										api.gotoAnnotation(currentVisibleSectionId3D.attr('data-coordinate3d'),  {preventCameraAnimation: false, preventCameraMove: false}, function(err, index) {
											if (!err) {
												window.console.log('Going to annotation', index + 1);
												
											
/* 												setTimeout(function (){
												api.getCameraLookAt(function(err, camera) {
													window.console.log(camera.position[1]); // [x, y, z]
													window.console.log(camera.target); // [x, y, z]
																			
 													api.setCameraLookAt([camera.position[0], camera.position[1], camera.position[2]], [camera.target[0]+1, camera.target[1], camera.target[2]], 1, function(err) {
														if (!err) {
															window.console.log('Camera moved');

														}
													});  
												});	
												},1000) */
											
											}

										
										});
										
										api.showAnnotationTooltip(currentVisibleSectionId3D.attr('data-coordinate3d'), function(err) {
											if (!err) {
												window.console.log('Showing annotation tooltip');
											}
										});
										
										api.getAnnotation(currentVisibleSectionId3D.attr('data-coordinate3d'), function(err, information) {
											if (!err) {
												window.console.log(information);
											}
										});
										
									
										
									}
									
								})
															
								$("#arrowUp").on("click", function(){
								
									var currentVisibleSectionId3D = $(".storymap-story .sectionSlide.visible").prev(".sectionSlide");
									
									if (currentVisibleSectionId3D.attr('data-coordinate3d') !== undefined && currentVisibleSectionId3D.attr('data-modeltype') !== 'aton') {
										
										
										api.gotoAnnotation(currentVisibleSectionId3D.attr('data-coordinate3d'),  {preventCameraAnimation: false, preventCameraMove: false}, function(err, index) {
											if (!err) {
												window.console.log('Going to annotation', index + 1);
											}
										});
										
										api.showAnnotationTooltip(currentVisibleSectionId3D.attr('data-coordinate3d'), function(err) {
											if (!err) {
												window.console.log('Showing annotation tooltip');
											}
										});	
										
									}
									
								})
								
								$(".storymap-scroll-top1").on("click", function(){
								
									var currentVisibleSectionId3D = $(".storymap-story .sectionSlide.visible").prev(".sectionSlide");
									
									if (currentVisibleSectionId3D.attr('data-coordinate3d') !== undefined && currentVisibleSectionId3D.attr('data-modeltype') !== 'aton') {
										
										$(".sketchfab-embed-wrapper").css( "display","none" ); //nasconde tutti i modelli 3d
										$("#sketchfab-embed-wrapper-"+currentVisibleSectionId3D.attr('data-sketchfabid')).css( "display","block" ); //visualizza solo quello corrente
										
/*  										api.hideAnnotation(Number(currentVisibleSectionId3D.attr('data-coordinate3d'))+1, function(err, index) {
											if (!err) {
												window.console.log('hide annotation', index + 1);
											}
										});	 */ 
										
 										api.getAnnotationList(function(err, annotations) {
											if (!err) {
												window.console.log(annotations);
												for(var ann=0; ann < annotations.length; ann++){
													if(ann != Number(currentVisibleSectionId3D.attr('data-coordinate3d'))){
													api.hideAnnotation(ann, function(err, index) {
														if (!err) {
															window.console.log('Hiding annotation', index + 1);
														}
													});	
													}											
												
												}
											}
										}); 	
					

										api.showAnnotation(currentVisibleSectionId3D.attr('data-coordinate3d'), function(err, index) {
											if (!err) {
												window.console.log('Show annotation', index + 1);
											}
										});	
										

										api.gotoAnnotation(currentVisibleSectionId3D.attr('data-coordinate3d'),  {preventCameraAnimation: false, preventCameraMove: false}, function(err, index) {
											if (!err) {
												window.console.log('Going to annotation', index + 1);
											}
										});
										
										api.showAnnotationTooltip(currentVisibleSectionId3D.attr('data-coordinate3d'), function(err) {
											if (!err) {
												window.console.log('Showing annotation tooltip');
											}
										});	
										
										
									}
									
								})
							
							});	


						

							
							//annotation associated with left menu 
							$(".storymap-navwidget li").on("click", function(){
									var aElement = $(this).find("a");

									var currentVisibleSectionId3DID = aElement.attr("data-goTosceneId");
									var currentVisibleSectionId3D= $("#"+currentVisibleSectionId3DID)
									
									if (currentVisibleSectionId3D.attr('data-coordinate3d') !== undefined && currentVisibleSectionId3D.attr('data-modeltype') !== 'aton') {

										api.getAnnotationList(function(err, annotations) {
											if (!err) {
												window.console.log(annotations);
												for(var ann=0; ann < annotations.length; ann++){
													if(ann != Number(currentVisibleSectionId3D.attr('data-coordinate3d'))){
													api.hideAnnotation(ann, function(err, index) {
														if (!err) {
															window.console.log('Hiding annotation', index + 1);
														}
													});	
													}											
												
												}
											}
										});	
					

										api.showAnnotation(currentVisibleSectionId3D.attr('data-coordinate3d'), function(err, index) {
											if (!err) {
												window.console.log('Show annotation', index + 1);
											}
										});	
										

										api.gotoAnnotation(currentVisibleSectionId3D.attr('data-coordinate3d'),  {preventCameraAnimation: false, preventCameraMove: false}, function(err, index) {
											if (!err) {
												window.console.log('Going to annotation', index + 1);
											}
										});
										
										api.showAnnotationTooltip(currentVisibleSectionId3D.attr('data-coordinate3d'), function(err) {
											if (!err) {
												window.console.log('Showing annotation tooltip');
											}
										});	

									
									}
							})
							
						},
						error: function onError() {
							console.log( 'Viewer error' );
						},
						annotation_tooltip_visible: 1,

						annotations_visible: 1,
						camera :0

					})
					
					list3DModels.push(result.events[i].sketchfabid)
					
			}
				
				// end API SKETCHFAB


				var event = result.events[i]; 
			

				
				// attach element (title, img, description...) to slide
				$(".storymap-story").append(""+
					
				'<section data-modeltype="sketchfab" data-sketchfabid="'+result.events[i].sketchfabid+'" data-modeldomid="'+sketchfabDomId+'" data-number-scene="'+numberScene+'" data-scene="scene'+numberScene+'" data-ev-id="'+result.events[i]._id+'" class="sectionSlide eventSlide eventSlide--model threeDModelSection" id="scene'+numberScene+'" data-background="model3D" data-coordinate3d="'+(result.events[i].annotationNumber3DModelCustom ? '' : (parseInt(result.events[i].annotationNumber3DModel) - 1))+'" data-coordinate3d-custom="'+encodeURIComponent(result.events[i].annotationNumber3DModelCustom ? JSON.stringify(result.events[i].annotationNumber3DModelCustom) : '')+'">' +
					'<div class="threeDModel">'+

					'<h2 class="sectionTitle">'+ result.events[i].text.headline +'</h2>' +
					divImageStory +
					'<p class="sectionDescription">' + result.events[i].text.text + '</p>' +

					'</div>'+
					'</section>'
					
				
				)

				//attach link of the model to button bottomleft
				if($('.controlsDown .general-controls').find('#credits-'+sketchfabDomId).length == 0) {
					$(".controlsDown .general-controls").append('<div class="3dcredits credits3d" id="credits-'+sketchfabDomId+'"><a target="_blank" href="https://sketchfab.com/3d-models/'+result.events[i].sketchfabid+'">Model on Sketchfab</a></div>')
				}				

				scenes["scene"+numberScene] = {"lat" : 46.78203732560553, "lng": 12.82666424871100, "zoom": 5, "name" : result.events[i].text.headline, layers : []}
			
				numberScene ++
			
			// Type Aton
			} else if(result.events[i].hasOwnProperty('Atonid') && result.events[i].Atonid != ""){
				var atonDomId = getModelDomId(result.events[i].Atonid);
				var atonCustomCamera = result.events[i].annotationNumber3DModelCustom ? JSON.stringify(result.events[i].annotationNumber3DModelCustom) : '';
				var atonFrameSrc = 'aton-viewer.html?sid='+encodeURIComponent(getAtonSID(result.events[i].Atonid));
				if (result.events[i].annotationNumber3DModelCustom) {
					atonFrameSrc += '&camera=' + encodeURIComponent(JSON.stringify(result.events[i].annotationNumber3DModelCustom));
				} else {
					atonFrameSrc += '&pov=' + encodeURIComponent(result.events[i].annotationNumber3DModel || '');
				}

				if (!list3DModels.includes(result.events[i].Atonid ))	{		
					
				
					$(".storymap-map").append('<div class="sketchfab-embed-wrapper" id="sketchfab-embed-wrapper-'+atonDomId+'"> <iframe class="api-frame" id="api-frame'+atonDomId+'" title="" frameborder="0" allowfullscreen mozallowfullscreen="true" webkitallowfullscreen="true" allow="autoplay; fullscreen; xr-spatial-tracking" xr-spatial-tracking execution-while-out-of-viewport execution-while-not-rendered web-share src="'+atonFrameSrc+'"> </iframe> </div>')
				
					list3DModels.push(result.events[i].Atonid)
				}
				
				var event = result.events[i]; 
			

				
				// attach element (title, img, description...) to slide
				$(".storymap-story").append(""+
					
					'<section data-modeltype="aton" data-atonid="'+result.events[i].Atonid+'" data-sketchfabid="'+result.events[i].Atonid+'" data-modeldomid="'+atonDomId+'" data-number-scene="'+numberScene+'" data-scene="scene'+numberScene+'" data-ev-id="'+result.events[i]._id+'" class="sectionSlide eventSlide eventSlide--model threeDModelSection" id="scene'+numberScene+'" data-background="model3D" data-coordinate3d="'+(result.events[i].annotationNumber3DModel || '')+'" data-coordinate3d-custom="'+encodeURIComponent(atonCustomCamera)+'">' +
					'<div class="threeDModel">'+

					'<h2 class="sectionTitle">'+ result.events[i].text.headline +'</h2>' +
					divImageStory +
					'<p class="sectionDescription">' + result.events[i].text.text + '</p>' +

					'</div>'+
					'</section>'
					
				
				)
			

				scenes["scene"+numberScene] = {"lat" : 46.78203732560553, "lng": 12.82666424871100, "zoom": 5, "name" : result.events[i].text.headline, layers : []}
			
				numberScene ++
			
			}
			// Type slide
			else {

				var event = result.events[i]; 
				
				var slidePositionClass = 'backgroundSlideLayout--start';
				if(result.events[i].hasOwnProperty("slidePosition") && result.events[i].slidePosition == "center"){
					slidePositionClass = 'backgroundSlideLayout--center';
				}
				
				//////// per violini sfondo nero
				var slideContentClass = 'backgroundSlideContent';
				if(result.events[i].text.headline == "La viola da gamba a Montecastelli Pisano" || result.events[i].text.headline == "La viola a Montecastelli Pisano"){
					slideContentClass += ' backgroundSlideContent--overlay';
				}
			
				// set default slide background
 				if(result.events[i].backgroundImg == "" || result.events[i].backgroundImg == undefined){
					var backgrImg= "../images/slideBlack.png"
					
				} else {
					var backgrImg=resolveStorymapImageUrl(result.events[i].backgroundImg)
				}
							
				// attach element (title, img, description...) to slide
				$(".storymap-story").append(""+
					
					'<section data-number-scene="'+numberScene+'" data-scene="scene'+numberScene+'" data-ev-id="'+result.events[i]._id+'" id="scene'+numberScene+'" data-background="'+ backgrImg +'" class="sectionSlide eventSlide eventSlide--background backgroundSlide">' +
					'<div class="fullscreen2 text-center backgroundSlideLayout '+slidePositionClass+'">'+
					'<div class="contentSlideFullscreen '+slideContentClass+'">' +
					'<h1 class="display-4 d-flex justify-content-center backgroundSlideTitle" id="titleSlide">'+ result.events[i].text.headline +'</h1>' +
					'<p class="d-flex justify-content-center backgroundSlideText">'+ result.events[i].text.text +'</p>'+
					divImageStory +
					'</div>'+
					'</div>'+
					'</section>'
					
				
				)	

				scenes["scene"+numberScene] = {"lat" : 46.78203732560553, "lng": 12.82666424871100, "zoom": 5, "name" : result.events[i].text.headline, layers : []}
			
				numberScene ++
			
			
			}
			
			
		
		})
		

		$('#storymap').storymap({
			scenes: scenes,
			layers: layers,
			baselayer: layers.layerOSM,
			legend: false,
			mapinteraction: true,
			loader: true,
			flyto: true,
			credits: "<b><a href='https://github.com/EmanueleLenzi92/SMBVT'>SMBVT</a></b>, based on <a href='https://github.com/jakobzhao/storymap'>Storymap.js</a> | <a href='https://leafletjs.com/'>Leaflet</a> | © <a href='https://www.openstreetmap.org/#map=12/55.5725/-2.5339'>OpenStreetMap</a> and contributors | © Google",
			scalebar: false,
			scrolldown: false,
			progressline: true,
			navwidget: true,
			createMap: function () {
/* 				map = L.map($(".storymap-map")[0], {zoomControl: false, scrollWheelZoom: false}).setView([44, -120], 7);
				basemap = this.baselayer.layer.addTo(map); */

				L.control.zoom({
					position: 'bottomright'
				}).addTo(map);
				

				//add an miniglobe
				new L.Control.GlobeMiniMap({
					marker: 'red',
					position: 'bottomright'
				}).addTo(map);

				return map;
			}
		});
		
		//disable scroll zoom
		map.scrollWheelZoom.disable()

		
		// scrollbar always on top after refresh page
		
			window.onbeforeunload = function () {
			window.scrollTo(0, 0);
			}
		
		
		//add buttons to other visualisations / search page
/* 		$('.otherVisual-content').append(""+
		"<a href='../storymaps/" + user + "/" +id+ "/?visualization=map'>Storymap</a>" +
		"<a href='../storymaps/" + user + "/" +id+ "/?visualization=timeline'>Timeline</a>" +
		//"<a href='#'>Event with related entities</a>"
		""
		) */
		



		const container = document.querySelector('.storymap-story');

		function applyResponsiveSceneState(currentVisibleSectionId) {
			var currentSection = $('#'+currentVisibleSectionId);
			var sketchfabidslide = currentSection.data('sketchfabid');
			var modelDomId = currentSection.data('modeldomid');
			var isMobile = $(window).width() <= 575;

			if(currentVisibleSectionId == "scene1"){
				$(".controlsUp").css("display", "none");
			} else {
				$(".controlsUp").css("display", "flex");
			}

			if (typeof sketchfabidslide !== 'undefined') {
				$(".sketchfab-embed-wrapper").css("display","none");
				$(".leaflet-right").css("display","none");
				$("#sketchfab-embed-wrapper-"+(modelDomId || getModelDomId(sketchfabidslide))).css("display","block");
				$(".leaflet-map-pane").css("opacity","0");
				$(".3dcredits").hide();
				$("#credits-"+(modelDomId || getModelDomId(sketchfabidslide))).css("display","flex");
				sendSketchfabSelection(currentSection);
				sendAtonViewpoint(currentSection);
			} else {
				$(".sketchfab-embed-wrapper").css("display","none");
				$(".leaflet-right").css("display","block");
				$(".leaflet-map-pane").css("opacity","1");
				$(".3dcredits").hide();
			}

			if (isMobile) {
				var hasFullscreenCover = currentSection.children('.fullscreen, .fullscreen2').length > 0;
				if (currentSection.hasClass('eventSlide--background') || hasFullscreenCover) {
					$(".storymap-map").css("z-index", "1000");
				} else {
					$(".storymap-map").css("z-index", "1001");
				}
			} else {
				// Remove the inline mobile override so desktop layout falls back to CSS.
				$(".storymap-map").css("z-index", "");
			}
		}

		// Opzioni per l'osservatore
		const observerConfig = { childList: true, subtree: true, attributes: true };
		
		// Variabile per memorizzare l'ID della sezione visibile precedente (pin primo evento rosso)
		  let previousVisibleSectionId = $(".storymap-story .sectionSlide.visible").attr("id");
		  $(".leaflet-marker-pane .scene1").attr("src","markerR.png")

		

		// Callback per l'osservatore delle mutazioni
		const observerCallback = function(mutationsList) {
		  for (let mutation of mutationsList) {
			if (mutation.type === 'attributes' && mutation.attributeName === 'class') {
			 
	
				const currentVisibleSectionId = $(".storymap-story .sectionSlide.visible").attr("id");

			 
				if (previousVisibleSectionId !== currentVisibleSectionId) {
						  console.log("La sezione visibile è cambiata da " + previousVisibleSectionId + " a " + currentVisibleSectionId);
						  previousVisibleSectionId = currentVisibleSectionId;
						  
						  $(".leaflet-marker-pane ." + currentVisibleSectionId).attr("src","markerR.png")
						  $(".leaflet-marker-pane ." + currentVisibleSectionId).addClass("zindexTop")
						  
/* 						  var classesPreviusMarker= $(".leaflet-marker-pane ." + previousVisibleSectionId).attr("class");
						  console.log(classesPreviusMarker) */
				}
				
				console.log(currentVisibleSectionId)
				applyResponsiveSceneState(currentVisibleSectionId);

				  
			}
		  }
		};

		// Crea un osservatore delle mutazioni
		const observer = new MutationObserver(observerCallback);

		// Avvia l'osservatore delle mutazioni
		observer.observe(container, observerConfig);

		$(window).on('resize', function() {
			var currentVisibleSectionId = $(".storymap-story .sectionSlide.visible").attr("id") || "scene1";
			applyResponsiveSceneState(currentVisibleSectionId);
		});

		
		
		if(startFromEvent != null){
			console.log(result)
			javascript:window.scrollBy(0, $("section[data-ev-id='"+startFromEvent+"']").offset().top  - $(window).scrollTop() - 10)
			var actualSection= $("section[data-ev-id='" + startFromEvent +"']");
			console.log(actualSection)
			actualScene= parseInt(actualSection.attr("data-number-scene"));
			
			//console.log(actualScene)
			
		}

		applyResponsiveSceneState(previousVisibleSectionId || "scene1");
		
		$("#storymap").css("visibility", "visible")

	
	}
	
	
  
	}); 


/*  function clickOnIfrButton(id){
	$("#"+id).css("pointer-events", "none");
	//$("#"+id).click();
	console.log(id)
	
}  */

/* function showHideSketchfabButtons(){
	
	if($(".controlToHid").css("pointer-events") == "auto"){
		$(".controlToHid").css("pointer-events", "none")
		$("#controlbuttonShowHide button").css("background-color","red")
	} else {
	
		$(".controlToHid").css("pointer-events", "auto")
		$("#controlbuttonShowHide button").css("background-color","buttonface")
	}
} */

    function convertYouTubeLinkToIframe(url) {
        // Estrai l'ID del video e il tempo di inizio dall'URL
        const urlParams = new URLSearchParams(new URL(url).search);
        const videoId = urlParams.get('v');
        let startTime = urlParams.get('t');

        // Crea l'URL per l'iframe
        let iframeUrl = `https://www.youtube.com/embed/${videoId}`;
        if (startTime) {
			let startTimesoloNumeri = startTime.replace(/[^\d]/g, '');
            iframeUrl += "?start=" + startTimesoloNumeri;
        }

        // Crea l'elemento iframe
        const iframe = document.createElement('iframe');
        iframe.width = '560';
        iframe.height = '315';
        iframe.src = iframeUrl;
        iframe.frameBorder = '0';
        iframe.allow = 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture';
        iframe.allowFullscreen = true;

        return iframe.outerHTML
    }












