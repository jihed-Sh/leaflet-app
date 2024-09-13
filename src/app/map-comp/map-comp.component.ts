import { AfterViewInit, Component } from '@angular/core';
import * as L from 'leaflet';
import * as esri from 'esri-leaflet';
import * as Vector from 'esri-leaflet-vector';
import {vectorBasemapLayer} from "esri-leaflet-vector";

@Component({
  selector: 'app-map-comp',
  templateUrl: './map-comp.component.html',
  styleUrls: ['./map-comp.component.css']
})
export class MapCompComponent implements AfterViewInit {
  private map: L.Map | undefined;
  private accessToken: string = 'AAPTxy8BH1VEsoebNVZXo8HurEk6y7SrAq1Ej5m8OdoqiCAnyiFqGoO4WMWTXinhubaP8BDm4OmiZgcasdk7kVPhcMCOb_Hcc9K90zDY45-b4E1jgQqo3eBmIdJVd8lWWpH9Vq5-rlZXrMqJwYPxDlwH9NHm5OSEvQudu_qmYDP2mZeRlGoR4JgsvuGLg2RfWaWNcTROs3bKpDy-gqYichqY5jAs9zDZQO16M-PfGW4Q_SY.AT1_eThKZYIy';
  private basemapEnum: string = 'arcgis/streets';

  ngAfterViewInit(): void {
    this.initMap();


  }

  private initMap(): void {
    this.map = L.map('map', {
      center: [34.02, -118.805],
      zoom: 13,
      minZoom: 2
    });
    const basemapLayers = {

      "arcgis/outdoor": this.getV2Basemap("arcgis/outdoor").addTo(this.map),
      "arcgis/community": this.getV2Basemap("arcgis/community"),
      "arcgis/navigation": this.getV2Basemap("arcgis/navigation"),
      "arcgis/streets": this.getV2Basemap("arcgis/streets"),
      "arcgis/streets-relief": this.getV2Basemap("arcgis/streets-relief"),
      "arcgis/imagery": this.getV2Basemap("arcgis/imagery"),
      "arcgis/oceans": this.getV2Basemap("arcgis/oceans"),
      "arcgis/topographic": this.getV2Basemap("arcgis/topographic"),
      "arcgis/light-gray": this.getV2Basemap("arcgis/light-gray"),
      "arcgis/dark-gray": this.getV2Basemap("arcgis/dark-gray"),
      "arcgis/human-geography": this.getV2Basemap("arcgis/human-geography"),
      "arcgis/charted-territory": this.getV2Basemap("arcgis/charted-territory"),
      "arcgis/nova": this.getV2Basemap("arcgis/nova"),
      "osm/standard": this.getV2Basemap("osm/standard"),
      "osm/navigation": this.getV2Basemap("osm/navigation"),
      "osm/streets": this.getV2Basemap("osm/streets"),
      "osm/blueprint": this.getV2Basemap("osm/blueprint")
    };
    // Initialize the map

    // @ts-ignore
    L.control.layers(basemapLayers, null, { collapsed: false }).addTo(this.map);
    // Add the Esri vector basemap layer using the token and vectorBasemapLayer function
    // const vectorLayer = vectorBasemapLayer(this.basemapEnum, {
    //   token: this.accessToken,
    //   version: 2
    // });
    //
    // vectorLayer.addTo(this.map);
  }

  getV2Basemap(style: string) {
    return vectorBasemapLayer(style, {
      token: this.accessToken,
      version:2
    })
  }
}
