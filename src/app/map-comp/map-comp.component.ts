import {AfterViewInit, Component} from '@angular/core';
import * as L from 'leaflet';
import {MarkerService} from "../marker.service";

@Component({
  selector: 'app-map-comp',
  templateUrl: './map-comp.component.html',
  styleUrls: ['./map-comp.component.css']
})
export class MapCompComponent implements AfterViewInit {
  private map: any;

  constructor(private markerService: MarkerService) {
  }

  ngAfterViewInit() {
    this.initMap();
    // this.markerService.makeCapitalMarkers(this.map)
    this.markerService.makeCapitalCircleMarkers(this.map)
  }


  private initMap(): void {
    this.map = L.map('map', {
      center: [39.8282, -98.5795],
      zoom: 3
    });

    const tiles = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 18,
      minZoom: 3,
      attribution: '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>'
    });

    tiles.addTo(this.map);
  }
}
