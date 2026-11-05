"use strict";

var narraMapEditor = (function() {
	var state = {
		initialized: false,
		active: false,
		map: null,
		drawControl: null,
		eventLayerGroup: null,
		entityLayerGroup: null,
		drawnItems: null,
		manualGeometry: null,
		observer: null,
		suppressMapInteraction: false,
		lastVisibleGeometryCount: 0
	};

	function init() {
		if (state.initialized) {
			return;
		}

		ensureMap();
		bindEvents();
		state.initialized = true;
	}

	function ensureMap() {
		if (state.map) {
			return;
		}

		state.map = L.map("map-editor-canvas", { zoomControl: true }).setView([45.096672679532816, 12.084825739866487], 3);
		L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
			attribution: '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>'
		}).addTo(state.map);

		state.entityLayerGroup = L.featureGroup().addTo(state.map);
		state.eventLayerGroup = L.featureGroup().addTo(state.map);
		state.drawnItems = new L.FeatureGroup().addTo(state.map);

		state.drawControl = new L.Control.Draw({
			draw: {
				polygon: {
					shapeOptions: getEventPolygonStyle()
				},
				polyline: false,
				rectangle: false,
				circle: false,
				circlemarker: false,
				marker: {
					icon: createEventMarkerIcon()
				}
			},
			edit: {
				featureGroup: state.drawnItems,
				remove: true
			}
		});
		state.map.addControl(state.drawControl);

		state.map.on(L.Draw.Event.CREATED, function(event) {
			var hadGeometryBefore = state.lastVisibleGeometryCount > 0;
			setManualGeometryFromLayer(event.layer);
			renderAll({ autoFit: hadGeometryBefore });
		});

		state.map.on('draw:edited', function(event) {
			event.layers.eachLayer(function(layer) {
				setManualGeometryFromLayer(layer);
			});
			renderAll({ autoFit: false });
		});

		state.map.on('draw:deleted', function() {
			state.manualGeometry = null;
			renderAll({ autoFit: false });
		});

		state.map.on('zoomend moveend', function() {
			if (!state.active || state.suppressMapInteraction) {
				return;
			}

			if (getVisibleGeometryCount() === 0) {
				return;
			}

			$("#mapZoomInput").val(String(state.map.getZoom()));
		});
	}

	function bindEvents() {
		$(document).on('change', 'input[name^="show-entity"]', function() {
			if (!state.active) {
				return;
			}

			var hadGeometryBefore = state.lastVisibleGeometryCount > 0;
			renderAll({ autoFit: hadGeometryBefore });
		});

		$(document).on('input', '#placeLabel', function() {
			if (state.active) {
				renderAll({ autoFit: false });
			}
		});

		var inputDiv = document.getElementById('inputDiv');
		if (inputDiv && !state.observer) {
			state.observer = new MutationObserver(function() {
				if (state.active) {
					renderAll({ autoFit: false });
				}
			});
			state.observer.observe(inputDiv, { childList: true, subtree: false });
		}
	}

	function setFormType(formType) {
		init();
		state.active = normalizeEventFormType(formType) === 'map';
		$("#map-editor-group").toggle(state.active);

		if (state.active) {
			invalidateSizeSoon();
			renderAll({ autoFit: false });
		} else {
			setStatus("");
		}
	}

	function reset() {
		if (!state.initialized) {
			return;
		}

		state.manualGeometry = null;
		setHiddenGeometryFields(null);
		$("#placeLabel").val('');
		$("#mapZoomInput").val('');
		clearLayers();
		state.lastVisibleGeometryCount = 0;
		setStatus('Draw one event geometry (point or polygon), or select one geometry from an entity.');
	}

	function loadFromEvent(event) {
		if (!event || normalizeEventFormType(event.formType) !== 'map') {
			return;
		}

		setFormType('map');
		state.manualGeometry = geometryFromEvent(event);
		$("#mapZoomInput").val(event.mapZoom || '');
		renderAll({ autoFit: !event.mapZoom, preserveLoadedZoom: !!event.mapZoom });
		window.setTimeout(function() {
			renderAll({ autoFit: !event.mapZoom, preserveLoadedZoom: !!event.mapZoom });
		}, 160);
	}

	function hasEventGeometry() {
		return !!getEffectiveEventGeometry(getSelectedEntityGeometries());
	}

	function getSelectionData() {
		return {
			mapZoom: $("#mapZoomInput").val().trim()
		};
	}

	function refresh() {
		if (!state.active) {
			return;
		}
		renderAll({ autoFit: false });
	}

	function refreshAfterEntityLoad() {
		if (!state.active) {
			return;
		}

		var savedZoom = $("#mapZoomInput").val().trim();
		renderAll({ autoFit: !savedZoom, preserveLoadedZoom: !!savedZoom });
	}

	function renderAll(options) {
		options = options || {};
		clearLayers();

		var selectedEntityGeometries = getSelectedEntityGeometries();
		var eventGeometry = getEffectiveEventGeometry(selectedEntityGeometries);
		if (!state.manualGeometry && eventGeometry && !$("#placeLabel").val().trim()) {
			$("#placeLabel").val(eventGeometry.label || '');
		}
		setHiddenGeometryFields(eventGeometry);
		renderEntityGeometries(selectedEntityGeometries);
		renderEventGeometry(eventGeometry, selectedEntityGeometries);
		updateStatus(eventGeometry, selectedEntityGeometries);

		var shouldAutoFit = !!options.autoFit && getVisibleGeometryCount() > 0;
		if (shouldAutoFit) {
			fitToVisibleGeometries();
			$("#mapZoomInput").val('');
		} else if (options.preserveLoadedZoom && $("#mapZoomInput").val().trim() !== '' && eventGeometry) {
			applySavedZoom(eventGeometry);
		} else {
			if (eventGeometry && $("#mapZoomInput").val().trim() === '') {
				$("#mapZoomInput").val(String(state.map.getZoom()));
			}
			invalidateSizeSoon();
		}

		state.lastVisibleGeometryCount = getVisibleGeometryCount();
	}

	function getEffectiveEventGeometry(selectedEntityGeometries) {
		if (state.manualGeometry) {
			return cloneGeometry(state.manualGeometry);
		}

		if (selectedEntityGeometries.length > 0) {
			return cloneGeometry(selectedEntityGeometries[0]);
		}

		return null;
	}

	function setManualGeometryFromLayer(layer) {
		state.drawnItems.clearLayers();
		state.drawnItems.addLayer(layer);
		state.manualGeometry = geometryFromLeafletLayer(layer);
		$("#mapZoomInput").val('');
	}

	function renderEntityGeometries(geometries) {
		geometries.forEach(function(geometry) {
			var layer = leafletLayerFromGeometry(geometry, false);
			if (!layer) {
				return;
			}

			layer.bindPopup('<p>' + escapeHtml(geometry.label || '') + '</p>');
			state.entityLayerGroup.addLayer(layer);
		});
	}

	function renderEventGeometry(eventGeometry, entityGeometries) {
		state.drawnItems.clearLayers();
		if (!eventGeometry) {
			return;
		}

		var overlapsEntity = entityGeometries.some(function(entityGeometry) {
			return geometriesOverlap(eventGeometry, entityGeometry);
		});

		if (state.manualGeometry) {
			var editableLayer = leafletLayerFromGeometry(eventGeometry, true);
			if (editableLayer) {
				if (editableLayer.setStyle && overlapsEntity) {
					editableLayer.setStyle({ opacity: 0, fillOpacity: 0 });
				}
				state.drawnItems.addLayer(editableLayer);
			}
			return;
		}

		if (overlapsEntity) {
			return;
		}

		var displayLayer = leafletLayerFromGeometry(eventGeometry, true);
		if (!displayLayer) {
			return;
		}

		displayLayer.bindPopup('<p>' + escapeHtml($("#placeLabel").val().trim() || 'Event geometry') + '</p>');
		state.eventLayerGroup.addLayer(displayLayer);
	}

	function getSelectedEntityGeometries() {
		var evid = $("#workspace").attr("data-evid");
		var selected = [];

		$("#inputDiv .data").each(function() {
			var qid = $(this).attr("data-id");
			if (!qid || !(qid in narra.items)) {
				return;
			}

			var showMode = getEntityShowOnMapMode($(this), evid, qid);
			if (showMode !== 'showPoint' && showMode !== 'showPol') {
				return;
			}

			var geometry = geometryFromEntity(qid, showMode);
			if (!geometry) {
				return;
			}

			selected.push(geometry);
		});

		return selected;
	}

	function getEntityShowOnMapMode($entity, evid, qid) {
		var popoverId = $entity.attr('aria-describedby');
		if (popoverId) {
			var radioValue = $('#' + popoverId).find('.radioButtons:checked').val();
			if (radioValue) {
				return radioValue;
			}
		}

		if (evid && narra.events[evid] && narra.events[evid].props && narra.events[evid].props[qid]) {
			return narra.events[evid].props[qid].showOnMap;
		}

		return '';
	}

	function geometryFromEntity(qid, showMode) {
		var item = narra.items[qid];
		if (!item) {
			return null;
		}

		if (showMode === 'showPoint' && item.coordinatesPoint) {
			return parsePointWKT(item.coordinatesPoint, item.enName || item.itName || qid, qid);
		}

		if (showMode === 'showPol' && item.coordinatesPolygon) {
			return parsePolygonWKT(item.coordinatesPolygon, item.enName || item.itName || qid, qid);
		}

		return null;
	}

	function geometryFromEvent(event) {
		if (event.polygon) {
			return parsePolygonWKT(event.polygon, event.eventPlaceLabel || event.title || 'Event geometry', 'event');
		}

		if (event.latitud !== '' && event.longitud !== '') {
			return {
				type: 'point',
				lat: Number(event.latitud),
				lng: Number(event.longitud),
				label: event.eventPlaceLabel || event.title || 'Event geometry',
				sourceId: 'event',
				rawValue: 'Point(' + event.longitud + ' ' + event.latitud + ')'
			};
		}

		return null;
	}

	function geometryFromLeafletLayer(layer) {
		if (layer instanceof L.Marker) {
			var latLng = layer.getLatLng();
			return {
				type: 'point',
				lat: Number(latLng.lat),
				lng: Number(latLng.lng),
				label: $("#placeLabel").val().trim() || 'Event geometry',
				sourceId: 'event',
				rawValue: 'Point(' + latLng.lng + ' ' + latLng.lat + ')'
			};
		}

		if (layer instanceof L.Polygon) {
			var latLngs = layer.getLatLngs()[0] || [];
			var coordinates = latLngs.map(function(latLng) {
				return latLng.lng + ' ' + latLng.lat;
			});
			if (coordinates.length > 0 && coordinates[0] !== coordinates[coordinates.length - 1]) {
				coordinates.push(coordinates[0]);
			}
			return {
				type: 'polygon',
				latLngs: latLngs.map(function(latLng) { return [Number(latLng.lat), Number(latLng.lng)]; }),
				label: $("#placeLabel").val().trim() || 'Event geometry',
				sourceId: 'event',
				rawValue: 'POLYGON((' + coordinates.join(',') + '))'
			};
		}

		return null;
	}

	function leafletLayerFromGeometry(geometry, isEventGeometry) {
		if (!geometry) {
			return null;
		}

		if (geometry.type === 'point') {
			return L.marker([geometry.lat, geometry.lng], {
				icon: isEventGeometry ? createEventMarkerIcon() : createEntityMarkerIcon()
			});
		}

		if (geometry.type === 'polygon') {
			return L.polygon(geometry.latLngs, isEventGeometry ? getEventPolygonStyle() : getEntityPolygonStyle());
		}

		return null;
	}

	function setHiddenGeometryFields(geometry) {
		if (!geometry) {
			$("#latitud").val('');
			$("#longitud").val('');
			$("#polygonArea").val('');
			return;
		}

		if (geometry.type === 'point') {
			$("#latitud").val(String(geometry.lat));
			$("#longitud").val(String(geometry.lng));
			$("#polygonArea").val('');
		} else {
			$("#latitud").val('');
			$("#longitud").val('');
			$("#polygonArea").val(geometry.rawValue);
		}
	}

	function clearLayers() {
		state.eventLayerGroup.clearLayers();
		state.entityLayerGroup.clearLayers();
	}

	function fitToVisibleGeometries() {
		var bounds = getVisibleGeometryBounds();
		if (!bounds) {
			invalidateSizeSoon();
			return;
		}

		applyViewportUpdate(function() {
			var autoZoomOnBounds = state.map.getBoundsZoom(bounds);
			state.map.setView(bounds.getCenter(), autoZoomOnBounds - 1);
		});
	}

	function applySavedZoom(eventGeometry) {
		invalidateSizeSoon();
		var bounds = getVisibleGeometryBounds();
		if (!bounds) {
			return;
		}

		applyViewportUpdate(function() {
			state.map.setView(bounds.getCenter(), Number($("#mapZoomInput").val()));
		});
	}

	function getVisibleGeometryBounds() {
		var group = L.featureGroup();
		state.entityLayerGroup.eachLayer(function(layer) { group.addLayer(layer); });
		state.eventLayerGroup.eachLayer(function(layer) { group.addLayer(layer); });
		state.drawnItems.eachLayer(function(layer) { group.addLayer(layer); });

		if (group.getLayers().length === 0) {
			return null;
		}

		return group.getBounds();
	}

	function applyViewportUpdate(callback) {
		state.suppressMapInteraction = true;
		invalidateSizeSoon();
		window.setTimeout(function() {
			if (state.map && state.active) {
				callback();
			}
		}, 0);
		window.setTimeout(function() {
			if (state.map && state.active) {
				state.map.invalidateSize();
				callback();
			}
			state.suppressMapInteraction = false;
		}, 140);
	}

	function getVisibleGeometryCount() {
		return state.entityLayerGroup.getLayers().length + state.eventLayerGroup.getLayers().length + state.drawnItems.getLayers().length;
	}

	function getTotalGeometryCount() {
		var entityCount = getSelectedEntityGeometries().length;
		var eventCount = state.manualGeometry ? 1 : 0;
		return entityCount + eventCount;
	}

	function updateStatus(eventGeometry, entityGeometries) {
		if (!eventGeometry) {
			setStatus('Draw one event geometry (point or polygon), or select one geometry from an entity.');
			return;
		}

		if (!state.manualGeometry && entityGeometries.length > 0) {
			setStatus('Event geometry is currently inherited from the selected entity geometry.');
			return;
		}

		setStatus('Event geometry ready. Entity geometries on the map update in real time.');
	}

	function invalidateSizeSoon() {
		window.setTimeout(function() {
			if (state.map && state.active) {
				state.map.invalidateSize();
			}
		}, 0);
	}

	function parsePointWKT(wkt, label, sourceId) {
		var matches = String(wkt).match(/-?\d+(?:\.\d+)?/g);
		if (!matches || matches.length < 2) {
			return null;
		}

		return {
			type: 'point',
			lat: Number(matches[1]),
			lng: Number(matches[0]),
			label: label,
			sourceId: sourceId,
			rawValue: 'Point(' + matches[0] + ' ' + matches[1] + ')'
		};
	}

	function parsePolygonWKT(wkt, label, sourceId) {
		var normalized = String(wkt).trim();
		var polygonMatch = normalized.match(/POLYGON\s*\(\((.*)\)\)/i);
		var multiPolygonMatch = normalized.match(/MULTIPOLYGON\s*\(\(\((.*)\)\)\)/i);
		var coordinateString = polygonMatch ? polygonMatch[1] : (multiPolygonMatch ? multiPolygonMatch[1] : '');
		if (!coordinateString) {
			return null;
		}

		var latLngs = coordinateString.split(',').map(function(pair) {
			var coords = pair.trim().split(/\s+/);
			return [Number(coords[1]), Number(coords[0])];
		}).filter(function(coords) {
			return !isNaN(coords[0]) && !isNaN(coords[1]);
		});

		if (latLngs.length === 0) {
			return null;
		}

		return {
			type: 'polygon',
			latLngs: latLngs,
			label: label,
			sourceId: sourceId,
			rawValue: normalized
		};
	}

	function geometriesOverlap(left, right) {
		if (!left || !right || left.type !== right.type) {
			return false;
		}

		if (left.type === 'point') {
			return left.rawValue === right.rawValue;
		}

		return normalizePolygonRaw(left.rawValue) === normalizePolygonRaw(right.rawValue);
	}

	function normalizePolygonRaw(rawValue) {
		return String(rawValue || '').replace(/\s+/g, '').toUpperCase();
	}

	function cloneGeometry(geometry) {
		return geometry ? JSON.parse(JSON.stringify(geometry)) : null;
	}

	function createEventMarkerIcon() {
		return new L.Icon({
			iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-orange.png',
			shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
			iconSize: [25, 41],
			iconAnchor: [12, 41],
			popupAnchor: [1, -34],
			shadowSize: [41, 41]
		});
	}

	function createEntityMarkerIcon() {
		return new L.Icon({
			iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-blue.png',
			shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
			iconSize: [25, 41],
			iconAnchor: [12, 41],
			popupAnchor: [1, -34],
			shadowSize: [41, 41]
		});
	}

	function getEventPolygonStyle() {
		return {
			color: '#ff7800',
			weight: 5,
			opacity: 0.65
		};
	}

	function getEntityPolygonStyle() {
		return {
			color: '#3388ff',
			weight: 3,
			opacity: 0.8,
			fillOpacity: 0.2
		};
	}

	function setStatus(message) {
		$("#map-editor-status").text(message || '');
	}

	function escapeHtml(text) {
		return String(text || '').replace(/[&<>"']/g, function(char) {
			return {
				'&': '&amp;',
				'<': '&lt;',
				'>': '&gt;',
				'"': '&quot;',
				"'": '&#39;'
			}[char];
		});
	}

	return {
		init: init,
		setFormType: setFormType,
		reset: reset,
		loadFromEvent: loadFromEvent,
		hasEventGeometry: hasEventGeometry,
		getSelectionData: getSelectionData,
		refresh: refresh,
		refreshAfterEntityLoad: refreshAfterEntityLoad
	};
})();
