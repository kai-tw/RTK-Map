"use strict";
(function(){
	/* Constant */
	const DEFAULT_WEIGHT = 3;
	const DEFAULT_RADIUS = 15;
	const FOCUS_WEIGHT = 5;
	const FOCUS_RADIUS = 20;
	const FOCUS_COLOR = "#351932";
	
	/* State var define */
	let prevClickedMarker = null;
	
	/* ID card odd or even */
	oddEvenUpdator();
	
	/* Load leaflet script from CDN */
	let script = document.createElement("script");
	script.src = "//unpkg.com/leaflet@1.8.0/dist/leaflet.js";
	script.defer = true;
	script.addEventListener("load", function() {
		/* Start to draw the map */
		let map = L.map("app", {
			renderer: L.canvas(),
			preferCanvas: true,
			zoomControl: false,
			center: [23.973875, 120.982024],
			zoom: 7,
			minZoom: 6,
			maxZoom: 18,
			maxBounds: L.latLngBounds(L.latLng(16, 111), L.latLng(30, 131))
		});
		L.tileLayer("https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png").addTo(map);
		
		/* Load geo JSON */
		let xhr = new XMLHttpRequest();
		xhr.addEventListener("load", function() {
			/* Load successfully */
			if (xhr.readyState == 4 && xhr.status == 200) {
				let dataLayer = L.geoJSON(JSON.parse(xhr.responseText), {
					pointToLayer: function(feature, latLng) {
						/* Define the style of markers */
						let markerOption = {
							alt: feature.properties.name,
							radius: DEFAULT_RADIUS,
							color: markerColorDecision(feature),
							fillColor: markerColorDecision(feature),
							weight: DEFAULT_WEIGHT,
							opacity: 1,
							fillOpacity: 0.75
						};
						let marker = L.circleMarker(latLng, markerOption);	/* Create circle marker */
						marker.on("click", function(event) {				/* Marker click event binding */
							informationUpdate(event.target.feature.properties);
							if (!info.classList.contains("show")) {
								info.classList.add("show");
							}
							info.dataset.pharmacyId = event.target.feature.properties.id;
							if (prevClickedMarker) {
								prevClickedMarker.setStyle({color: markerColorDecision(prevClickedMarker.feature), radius: DEFAULT_RADIUS, weight: DEFAULT_WEIGHT});
							}
							event.target.setStyle({color: FOCUS_COLOR, radius: FOCUS_RADIUS, weight: FOCUS_WEIGHT});
							prevClickedMarker = event.target;
						});
						return marker;
					}
				}).addTo(map);
				
				/* Periodic update */
				window.setInterval(function() {
					oddEvenUpdator();
					let client = new XMLHttpRequest();
					client.addEventListener("load", function() {
						if (client.readyState == 4 && client.status == 200) {
							let data = JSON.parse(client.responseText);
							let info = document.getElementById("info");
							let tags = ["address", "phone", "brand", "stock", "updateTime", "note"];
							/* Information panel update */
							if (info.dataset.pharmacyId) {
								data.features.forEach(function(feature) {
									let properties = feature.properties;
									if (info.dataset.pharmacyId === properties.id) {
										informationUpdate(properties);
										return;
									}
								});
							}
							/* Markers update */
							map.eachLayer(function(layer) {
								if (layer.feature) {
									let markerProperties = layer.feature.properties;
									let updated = false;
									data.features.forEach(function(feature) {
										let properties = feature.properties;
										if (markerProperties.id === properties.id) {
											for (let i = 0; i < tags.length; i++) {
												markerProperties[tags[i]] = properties[tags[i]];
											}
											updated = true;
											return;
										}
									});
									if (!updated) {
										layer.remove();	// remove the pharmacy which was out of stock
									}
								}
							});
						}
					});
					client.open("get", "fetch.php");
					client.send();
				}, 30 * 1000);
			}
		});
		xhr.open("get", "fetch.php");
		xhr.send();
		
		/* Buttons event listener binding */
		document.getElementById("infoPanelClose").addEventListener("click", function() {
			let info = document.getElementById("info");
			if (info.classList.contains("show")) {
				info.classList.remove("show");
			}
			if (prevClickedMarker) {
				prevClickedMarker.setStyle({color: markerColorDecision(prevClickedMarker.feature), radius: DEFAULT_RADIUS, weight: DEFAULT_WEIGHT});
				prevClickedMarker = null;
			}
		});
		document.getElementById("mapZoomIn").addEventListener("click", function() {
			map.zoomIn();
		});
		document.getElementById("mapZoomOut").addEventListener("click", function() {
			map.zoomOut();
		});
		document.getElementById("panelToggle").addEventListener("click", function() {
			document.getElementById("panel").classList.toggle("hidden");
			this.classList.toggle("active");
		});
	});
	document.body.appendChild(script);
}());

function informationUpdate(properties) {
	let info = document.getElementById("info");
	document.getElementById("pharmacyName").innerText = properties.name;
	let rows = info.getElementsByClassName("row");
	let tags = ["address", "phone", "brand", "stock", "updateTime", "note"];
	for (let i = 0; i < rows.length; i++) {
		rows[i].getElementsByClassName("content")[0].innerText = properties[tags[i]];
	}
}
function markerColorDecision(feature) {
	const DAILY_MAX_STOCK = 78;
	if (feature.properties.stock >= 0.5 * DAILY_MAX_STOCK) {
		return "#107879";
	}
	else if (feature.properties.stock >= 0.2 * DAILY_MAX_STOCK) {
		return "#e67f22";
	}
	else {
		return "#e91e3a";
	}
}
function oddEvenUpdator() {
	let today = new Date();
	if (today.getDay() === 0) {
		document.getElementById("limitText").innerText = "無限制";
	}
	else if (today.getDay() % 2 === 1) {
		document.getElementById("limitText").innerText = "單號";
	}
	else {
		document.getElementById("limitText").innerText = "雙號";
	}
}