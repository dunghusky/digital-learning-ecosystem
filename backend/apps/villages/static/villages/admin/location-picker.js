/**
 * Map picker for the village admin form: search for a place, then click the map or drag the
 * pin, and the latitude / longitude inputs are filled in. Typing coordinates by hand moves
 * the pin too, so both ways of editing stay in sync.
 *
 * Labels come from data-* attributes rendered by the admin (translated server-side).
 * Place search uses OpenStreetMap Nominatim, whose usage policy allows this kind of light,
 * interactive use (one request per search click).
 */
(function () {
  "use strict";

  // Keep in sync with PROVINCE_BOUNDS in apps/villages/models.py.
  var PROVINCE_BOUNDS = [
    [16.0, 105.5],
    [18.2, 107.6],
  ];
  var MAX_BOUNDS = [
    [15.4, 104.6],
    [18.8, 108.4],
  ];
  var PICKED_ZOOM = 16;
  var DECIMALS = 6;
  var NOMINATIM_URL = "https://nominatim.openstreetmap.org/search";

  function parseCoordinate(input) {
    var value = parseFloat(String(input.value).replace(",", "."));
    return Number.isFinite(value) ? value : null;
  }

  function initPicker(container) {
    var latInput = document.getElementById(container.dataset.latInput);
    var lngInput = document.getElementById(container.dataset.lngInput);
    if (!latInput || !lngInput) {
      return;
    }
    var labels = container.dataset;

    // Esri rather than tile.openstreetmap.org: some Vietnamese ISPs' DNS do not resolve
    // openstreetmap.org domains, which left this map blank.
    var streets = L.tileLayer(
      "https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}",
      { maxZoom: 19, attribution: "Tiles &copy; Esri" }
    );
    var satellite = L.tileLayer(
      "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
      { maxZoom: 19, maxNativeZoom: 18, attribution: "Tiles &copy; Esri" }
    );

    var map = L.map(container.querySelector(".location-picker__map"), {
      layers: [streets],
      maxBounds: MAX_BOUNDS,
      minZoom: 8,
    });
    var baseLayers = {};
    baseLayers[labels.labelStreets] = streets;
    baseLayers[labels.labelSatellite] = satellite;
    L.control.layers(baseLayers).addTo(map);

    var marker = null;

    function placeMarker(lat, lng) {
      if (marker) {
        marker.setLatLng([lat, lng]);
      } else {
        marker = L.marker([lat, lng], { draggable: true }).addTo(map);
        marker.on("dragend", function () {
          var position = marker.getLatLng();
          writeInputs(position.lat, position.lng);
        });
      }
    }

    function writeInputs(lat, lng) {
      latInput.value = lat.toFixed(DECIMALS);
      lngInput.value = lng.toFixed(DECIMALS);
    }

    function syncFromInputs() {
      var lat = parseCoordinate(latInput);
      var lng = parseCoordinate(lngInput);
      if (lat !== null && lng !== null) {
        placeMarker(lat, lng);
        return true;
      }
      return false;
    }

    if (syncFromInputs()) {
      map.setView(marker.getLatLng(), PICKED_ZOOM - 2);
    } else {
      map.fitBounds(PROVINCE_BOUNDS);
    }

    map.on("click", function (event) {
      placeMarker(event.latlng.lat, event.latlng.lng);
      writeInputs(event.latlng.lat, event.latlng.lng);
    });
    latInput.addEventListener("change", syncFromInputs);
    lngInput.addEventListener("change", syncFromInputs);

    // The admin form may lay the picker out before it is visible; recompute the size then.
    setTimeout(function () {
      map.invalidateSize();
    }, 200);

    setUpSearch(container, labels, function (lat, lng) {
      map.setView([lat, lng], PICKED_ZOOM);
      placeMarker(lat, lng);
      writeInputs(lat, lng);
    });
  }

  function setUpSearch(container, labels, onPick) {
    var input = container.querySelector(".location-picker__query");
    var button = container.querySelector(".location-picker__search");
    var results = container.querySelector(".location-picker__results");

    function showMessage(text) {
      results.replaceChildren();
      var item = document.createElement("li");
      item.className = "location-picker__message";
      item.textContent = text;
      results.appendChild(item);
    }

    function search() {
      var query = input.value.trim();
      if (!query) {
        return;
      }
      showMessage(labels.labelSearching);
      var params = new URLSearchParams({
        q: query,
        format: "jsonv2",
        countrycodes: "vn",
        // Only places inside the province: viewbox is left,top,right,bottom.
        viewbox: [
          PROVINCE_BOUNDS[0][1],
          PROVINCE_BOUNDS[1][0],
          PROVINCE_BOUNDS[1][1],
          PROVINCE_BOUNDS[0][0],
        ].join(","),
        bounded: "1",
        limit: "5",
        "accept-language": "vi",
      });
      fetch(NOMINATIM_URL + "?" + params.toString())
        .then(function (response) {
          if (!response.ok) {
            throw new Error("Nominatim responded " + response.status);
          }
          return response.json();
        })
        .then(function (places) {
          if (places.length === 0) {
            showMessage(labels.labelNoResults);
            return;
          }
          results.replaceChildren();
          places.forEach(function (place) {
            var item = document.createElement("li");
            var choose = document.createElement("button");
            choose.type = "button";
            choose.textContent = place.display_name;
            choose.addEventListener("click", function () {
              results.replaceChildren();
              onPick(parseFloat(place.lat), parseFloat(place.lon));
            });
            item.appendChild(choose);
            results.appendChild(item);
          });
        })
        .catch(function () {
          showMessage(labels.labelSearchFailed);
        });
    }

    button.addEventListener("click", search);
    input.addEventListener("keydown", function (event) {
      // Enter would otherwise submit (and save) the whole admin form.
      if (event.key === "Enter") {
        event.preventDefault();
        search();
      }
    });
  }

  document.addEventListener("DOMContentLoaded", function () {
    document.querySelectorAll(".location-picker").forEach(initPicker);
  });
})();
