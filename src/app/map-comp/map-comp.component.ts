import {Component, OnInit} from '@angular/core';
import * as L from 'leaflet';
import "leaflet.offline"
import {vectorBasemapLayer} from "esri-leaflet-vector"
import {savetiles, tileLayerOffline} from "leaflet.offline";


@Component({
  selector: 'app-map-comp',
  templateUrl: './map-comp.component.html',
  styleUrls: ['./map-comp.component.css']
})
export class MapCompComponent implements OnInit {
  private map: L.Map | undefined;
  private accessToken: string = 'AAPTxy8BH1VEsoebNVZXo8HurEk6y7SrAq1Ej5m8OdoqiCAnyiFqGoO4WMWTXinhubaP8BDm4OmiZgcasdk7kVPhcMCOb_Hcc9K90zDY45-b4E1jgQqo3eBmIdJVd8lWWpH9Vq5-rlZXrMqJwYPxDlwH9NHm5OSEvQudu_qmYDP2mZeRlGoR4JgsvuGLg2RfWaWNcTROs3bKpDy-gqYichqY5jAs9zDZQO16M-PfGW4Q_SY.AT1_eThKZYIy';

  ngOnInit() {
    this.initMap();
  }

  initMap() {
    this.map = L.map('map').setView([51.505, -0.09], 13);

    const osmOrigin = 'https://tile.openstreetmap.org/{z}/{x}/{y}.png';
    const darkGrayArcGIS = 'https://services.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}';
    const streetsArcGIS = 'https://services.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}';

    const attribution = '© OpenStreetMap contributors';
    const arcgisAttribution = 'Tiles © Esri &mdash; Esri, DeLorme, NAVTEQ';

    // Initialize offline layers
    const offlineDarkLayer = tileLayerOffline(darkGrayArcGIS, {
      attribution: arcgisAttribution,
      minZoom: 13,
      maxZoom: 19,
      crossOrigin: true
    });
    const darkLayerSaveControl = this.createSaveControl(offlineDarkLayer);

    const offlineStreetsLayer = tileLayerOffline(streetsArcGIS, {
      attribution: arcgisAttribution,
      minZoom: 13,
      maxZoom: 19,
      crossOrigin: true
    });
    const streetSaveControl = this.createSaveControl(offlineStreetsLayer);

    // Add offline layer initially
    offlineDarkLayer.addTo(this.map);
    darkLayerSaveControl.addTo(this.map);

    // Initialize Esri basemap layers
    const esriLayer = this.getV2Basemap('arcgis/dark-gray');
    const esriLightLayer = this.getV2Basemap('arcgis/light-gray');

    // Add layers to control
    const baseLayers = {
      'ArcGIS Dark Gray': esriLayer,
      'ArcGIS Light Gray': esriLightLayer,
      'Offline Dark Gray': offlineDarkLayer,
      'Offline Streets': offlineStreetsLayer,
    };

    // @ts-ignore
    L.control.layers(baseLayers, null, {collapsed: false}).addTo(this.map);

    // Handle baselayer switching and cache logic
    this.map.on('baselayerchange', (e: any) => {
      if (e.name === 'Offline Dark Gray') {
        this.addLayerWithCache(offlineDarkLayer, darkLayerSaveControl);
      } else if (e.name === 'Offline Streets') {
        this.addLayerWithCache(offlineStreetsLayer, streetSaveControl);
      } else {
        // Remove offline controls when switching to Esri layers
        this.map?.removeLayer(offlineDarkLayer);
        this.map?.removeLayer(offlineStreetsLayer);
        this.map?.removeControl(darkLayerSaveControl);
        this.map?.removeControl(streetSaveControl);
      }
    });
  }

  createSaveControl(layer: any) {
    return savetiles(layer, {
      alwaysDownload: false,
      confirm(layer: { _tilesforSave: string | any[]; }, successCallback: () => void) {
        if (window.confirm(`Save ${layer._tilesforSave.length} tiles?`)) {
          successCallback();
        }
      },
      confirmRemoval(layer: any, successCallback: () => void) {
        if (window.confirm('Remove all tiles?')) {
          successCallback();
        }
      },
      saveText: 'S',
      rmText: 'R',
    });
  }

  getV2Basemap(style: string) {
    return vectorBasemapLayer(style, {
      token: this.accessToken,
      version: 2
    });
  }

  addLayerWithCache(layer: L.TileLayer, control: any) {
    this.map?.addLayer(layer);
    this.map?.addControl(control);
  }


}
