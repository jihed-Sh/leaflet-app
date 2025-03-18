import {Component, OnInit} from '@angular/core';
import {tileLayerOffline} from "leaflet.offline";
import 'node_modules/leaflet-draw/dist/leaflet.draw-src.js';
import {geojsonToWKT} from "@terraformer/wkt";
// import * as L from 'leaflet';
// import "leaflet.offline"
declare const L: any;
// Define a maximum storage limit (in bytes) for IndexedDB
const MAX_STORAGE_SIZE = 2 * 1024 * 1024; // 2MB for testing


@Component({
  selector: 'app-map-comp',
  templateUrl: './map-comp.component.html',
  styleUrls: ['./map-comp.component.css']
})
export class MapCompComponent implements OnInit {
  private map: L.Map | undefined;
  private accessToken: string = 'AAPTxy8BH1VEsoebNVZXo8HurEk6y7SrAq1Ej5m8OdoqiCAnyiFqGoO4WMWTXinhubaP8BDm4OmiZgcasdk7kVPhcMCOb_Hcc9K90zDY45-b4E1jgQqo3eBmIdJVd8lWWpH9Vq5-rlZXrMqJwYPxDlwH9NHm5OSEvQudu_qmYDP2mZeRlGoR4JgsvuGLg2RfWaWNcTROs3bKpDy-gqYichqY5jAs9zDZQO16M-PfGW4Q_SY.AT1_eThKZYIy';
  activeLayerUrl: string = "";
  wkt: string="";

  ngOnInit() {
    this.initMap();
  }

  initMap() {
    this.map = L.map('map').setView([51.505, -0.09], 13);
    (window as any).leafletMap = this.map;
    // 1. Esri Premium Basemap Layer
    const premiumEsriUrl = `https://services.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}?token=${this.accessToken}`;
    const premiumEsriLayer = L.tileLayer(premiumEsriUrl, {
      attribution: 'Tiles © Esri',
      maxZoom: 19,
      minZoom: 5,
      crossOrigin: true
    });

    // 2. Define Dark Gray layer for offline caching
    const darkGrayArcGIS = 'https://services.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}';
    const offlineDarkLayer = tileLayerOffline(darkGrayArcGIS, {
      attribution: '© OpenStreetMap contributors, Esri',
      subdomains: 'abc',
      minZoom: 5,
      maxZoom: 19,
      crossOrigin: true
    });
    const mapInstance = this.map;
    // Add the dark gray layer initially
    offlineDarkLayer.addTo(this.map!);

    // Layer control for switching
    const baseLayers = {
      'ArcGIS Dark Gray': offlineDarkLayer,
      'Esri Premium Imagery': premiumEsriLayer
    };
    this.activeLayerUrl = darkGrayArcGIS; // Default to initial layer
    // @ts-ignore
    const layersControl = L.control.layers(baseLayers, null, {collapsed: false}).addTo(this.map);
    // Store the currently active layer


    // Listen for layer changes and update the activeLayerUrl
    this.map!.on('baselayerchange', (event: any) => {
      this.activeLayerUrl = event.layer._url; // Get the URL of the active layer
    });

    // Add Print Button to the map controls
    const printButton = L.control({position: 'topright'});


    printButton.onAdd = (map: L.Map) => {
      const button = L.DomUtil.create('button', 'leaflet-bar leaflet-control leaflet-control-custom');
      button.innerHTML = 'Print';  // Text for the button

      // Prevent click event from propagating to the map
      L.DomEvent.on(button, 'click', (e: any) => {
        e.stopPropagation();
        this.handlePrint(map, layersControl);
      });

      return button;
    };

    printButton.addTo(this.map); // Add the button to the map

    let drawControl = new L.Control.Draw({
      draw: {
        polyline: {
          shapeOptions: {
            color: 'yellow' // Change polyline color to yellow
          }
        },
        polygon: {
          allowIntersection: false,
          shapeOptions: {
            color: 'yellow' // Change polygon color to yellow
          }
        },
        circle: {
          shapeOptions: {
            color: 'yellow' // Change circle color to yellow
          }
        },
        circlemarker: false, // Disable circle marker if not needed
        marker: false // Disable markers if not needed
      },
    });
    this.map?.addControl(drawControl);


    this.map?.on(L.Draw.Event.CREATED, (event: any) => {
      const {layerType, layer} = event;


      if (layerType === 'rectangle' || layerType === 'polygon' || layerType === 'polyline') {
        const geoJSON = layer.toGeoJSON().geometry; // Convert to GeoJSON
        this.wkt = geojsonToWKT(geoJSON);
      } else if (layerType === 'circle') {
        // Circles are not supported in WKT natively, so convert them to a Polygon approximation
        const center = layer.getLatLng();
        const radius = layer.getRadius();
        this.wkt = `CIRCLE(${center.lng} ${center.lat}, ${radius})`; // Not standard WKT, but useful
      }

      if (this.wkt) {
        console.log("Generated WKT:", this.wkt);
      }

      this.map?.addLayer(layer); // Add drawn shape to map
    });

  }

  // Method to handle the print logic
  handlePrint(map: L.Map, layersControl: L.Control.Layers) {
    // Get current zoom level
    const zoomLevel = map.getZoom();

    // Get the current active layer URL
    const activeLayerUrl = this.activeLayerUrl
    // Send the zoom level and active layer info to the print server
    this.sendToPrintServer(zoomLevel, activeLayerUrl);
  }

  // Method to send zoom level and layer to the print server
  sendToPrintServer(zoomLevel: number, activeLayerUrl: string) {
    console.log('Sending to print server:', {zoomLevel, activeLayerUrl});

    const encodedLayerUrl = encodeURIComponent(activeLayerUrl); // Encode URL safely
    const encodedWKT = encodeURIComponent(this.wkt); // Encode WKT safely
    const printUrl = `http://localhost:3000/print?zoom=${zoomLevel}&layer=${encodedLayerUrl}&wkt=${encodedWKT}`;
    console.log(activeLayerUrl)
    console.log(printUrl)
    console.log(printUrl)
    // fetch(printUrl, {
    //   method: 'GET',
    // })
    //   .then(response => response.blob())
    //   .then(blob => {
    //     // Create a download link for the PDF
    //     const url = window.URL.createObjectURL(blob);
    //     const a = document.createElement('a');
    //     a.href = url;
    //     a.download = 'map.pdf';
    //     document.body.appendChild(a);
    //     a.click();
    //     document.body.removeChild(a);
    //   })
    //   .catch(error => {
    //     console.error('Error sending print request:', error);
    //   });
  }


}
