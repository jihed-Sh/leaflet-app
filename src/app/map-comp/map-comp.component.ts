import {Component, OnInit} from '@angular/core';
// import * as L from 'leaflet';
// import "leaflet.offline"
declare const L: any;
import {savetiles, tileLayerOffline} from "leaflet.offline";
import 'node_modules/leaflet-draw/dist/leaflet.draw-src.js';
import {geojsonToWKT, wktToGeoJSON} from "@terraformer/wkt"
import {geoJSON} from "leaflet";
import {logMessages} from "@angular-devkit/build-angular/src/tools/esbuild/utils";
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

  ngOnInit() {

    this.initMap();

  }

  initMap() {
    this.map = L.map('map').setView([51.505, -0.09], 13);


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
    const mapInstance=this.map;
    const darkLayerSaveControl = savetiles(offlineDarkLayer, {
      alwaysDownload: false,
      confirm(layer: { _tilesforSave: string | any[]; }, successCallback: () => void) {
        const zoomLevel = mapInstance!.getZoom(); // Get current zoom level
        if (zoomLevel >= 10 && zoomLevel <= 13) {
          if (window.confirm(`Save ${layer._tilesforSave.length} tiles?`)) {
            successCallback();
          }
        } else {
          alert('Zoom level must be 13 or above to cache tiles.');
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

    // Add the dark gray layer initially
    offlineDarkLayer.addTo(this.map!);
    darkLayerSaveControl.addTo(this.map!);

    // Layer control for switching
    const baseLayers = {
      'ArcGIS Dark Gray': offlineDarkLayer,
      'Esri Premium Imagery': premiumEsriLayer
    };

    // @ts-ignore
    L.control.layers(baseLayers, null, { collapsed: false }).addTo(this.map);
    //handle loading the tile event for esri layer
    premiumEsriLayer.on('tileloadstart', async (event: any) => {
      const zoomLevel=mapInstance?.getZoom();
      if(zoomLevel && zoomLevel >= 10 && zoomLevel <= 13){
        const url = event.tile.src;  // URL of the tile being loaded

        try {
          // Try to get the tile from the cache
          const cachedTile = await this.getTileFromCache(url);

          if (cachedTile) {
            // Use the cached tile (create a Blob URL or use the blob directly)
            console.log("boy it is fucking working");
            const blobUrl = URL.createObjectURL(cachedTile);
            event.tile.src = blobUrl;  // Set the tile's source to the cached blob
          } else {
            // Tile was not found in cache, fetch it from the network
            console.log('Tile not found in cache, fetching from network:', url);

            // Fetch the tile from the network
            const response = await fetch(url);
            if (!response.ok) {
              throw new Error('Network response was not ok');
            }
            const blob = await response.blob();

            // Cache the tile
            await this.cacheEsriTile(url, blob);

            // Create a Blob URL for the fetched tile and set it
            const blobUrl = URL.createObjectURL(blob);
            event.tile.src = blobUrl;  // Set the tile's source to the fetched blob
          }
        } catch (error) {
          console.error('Error during tile load:', error);
        }
      }

    });
    // Handle layer switching and cache logic
    if (this.map) {
      this.map.on('baselayerchange', (e: any) => {
        if (e.name === 'ArcGIS Dark Gray') {
          this.map!.removeLayer(premiumEsriLayer);
          offlineDarkLayer.addTo(this.map!);
          darkLayerSaveControl.addTo(this.map!);
        } else if (e.name === 'Esri Premium Imagery') {
          this.map!.removeLayer(offlineDarkLayer);
          this.map!.removeControl(darkLayerSaveControl);
          premiumEsriLayer.addTo(this.map!);
        }
      });
    }
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
        rectangle: {
          shapeOptions: {
            color: 'yellow' // Change rectangle color to yellow
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
      edit: {
        featureGroup: new L.FeatureGroup()
      }
    });
    this.map?.addControl(drawControl);
    this.map?.on(L.Draw.Event.CREATED, (event: any) => {
      const {layerType, layer} = event;

      // For rectangle, calculate area
      if (layerType === "rectangle") {
        const bounds = layer.getBounds();  // Get the bounds of the rectangle
        const southWest = bounds.getSouthWest();
        const northEast = bounds.getNorthEast();
        const area = this.calculateRectangleArea(southWest, northEast);
        alert(`Rectangle Area: ${area.toFixed(2)} square kilometers`);
      }

      // For polyline, calculate total distance
      if (layerType === "polyline") {
        const latlngs = layer.getLatLngs();
        const totalDistance = this.calculateDistance(latlngs);
        const geoJSON=layer.toGeoJSON().geometry;
        // console.log(geojsonToWKT(geoJSON));
        // console.log(wktToGeoJSON("POINT (-122.6764 45.5165)"));
        alert(`Total distance: ${totalDistance.toFixed(2)} kilometers`);
      }

      // For polygon, calculate area
      if (layerType === 'polygon') {
        const latlngs = layer.getLatLngs()[0];  // Use the first array of latlngs
        const area = L.GeometryUtil.geodesicArea(latlngs);  // Area in square meters
        const geoJSON=layer.toGeoJSON().geometry;
        // console.log(geojsonToWKT(geoJSON));
        alert(`Polygon Area: ${(area / 1000000).toFixed(2)} square kilometers`);
      }

      // For circle, calculate area
      if (layerType === 'circle') {

        const radius = layer.getRadius();  // Radius in meters
        const area = Math.PI * Math.pow(radius, 2);  // Area of the circle (πr²)
        const geoJSON=layer.toGeoJSON();
        const geoJSONGeometry=geoJSON.geometry;
        console.log(geoJSON)
        console.log(geojsonToWKT(geoJSONGeometry));
        alert(`Circle Area: ${(area / 1000000).toFixed(2)} square kilometers`);
      }

      // Add the layer to the map
      this.map?.addLayer(layer);
    });
  }
  calculateRectangleArea(southWest: L.LatLng, northEast: L.LatLng): number {
    const width = southWest.distanceTo(new L.LatLng(southWest.lat, northEast.lng));  // Distance between the two points
    const height = southWest.distanceTo(new L.LatLng(northEast.lat, southWest.lng));
    const area = (width * height) / 1000000;  // Convert area from square meters to square kilometers
    return area;
  }
  calculateDistance(latlngs: L.LatLng[]): number {
    let totalDistance = 0;
    for (let i = 0; i < latlngs.length - 1; i++) {
      totalDistance += latlngs[i].distanceTo(latlngs[i + 1]);  // Calculates distance in meters
    }
    return totalDistance / 1000;
  }
// 4. Save tile to IndexedDB
  async cacheEsriTile(tileUrl: string, blob: Blob) {
    try {
      // Open the IndexedDB and store the tile
      const db = await this.openIndexedDb();
      const transaction = db.transaction('tileStore', 'readwrite');
      const store = transaction.objectStore('tileStore');

      // Calculate total storage size within the transaction
      let totalSize = await this.calculateTotalStorageSize(store);
      console.log(`Current total size: ${(totalSize / (1024 * 1024)).toFixed(2)} MB`);

      const tileData = {
        url: tileUrl,
        blob: blob,
        timestamp: Date.now()
      };

      // If the total size exceeds the limit, evict oldest tiles
      if (totalSize > MAX_STORAGE_SIZE) {
        console.log('Max storage limit exceeded. Evicting oldest tiles...');
        await this.evictOldestTiles(store);  // Pass the store to avoid transaction issues
      }

      // After eviction (if needed), put the new tile in the same transaction
      const request = store.put(tileData);  // Use 'put' to add or update the tile

      request.onsuccess = () => {
        console.log('Tile cached:', tileUrl);
      };

      request.onerror = () => {
        console.error('Error caching tile:', tileUrl);
      };

      // Ensure the transaction is complete
      await new Promise((resolve, reject) => {
        transaction.oncomplete = () => resolve(null);
        transaction.onerror = () => reject('Transaction failed');
      });

    } catch (error) {
      console.error('Error caching tile:', error);
    }
  }

// Modify calculateTotalStorageSize to accept a store as a parameter
  async calculateTotalStorageSize(store: IDBObjectStore): Promise<number> {
    return new Promise((resolve, reject) => {
      let totalSize = 0;
      const cursorRequest = store.openCursor();

      cursorRequest.onsuccess = (event: any) => {
        const cursor = event.target.result;
        if (cursor) {
          const tile = cursor.value;
          totalSize += tile.blob.size;  // Add the size of each tile's blob
          cursor.continue();
        } else {
          resolve(totalSize);  // Return the total size once all tiles are counted
        }
      };

      cursorRequest.onerror = (event) => {
        reject('Error calculating storage size');
      };
    });
  }

  async evictOldestTiles(store: IDBObjectStore) {
    return new Promise((resolve, reject) => {
      console.log(store.index('timestamp'))
      const index = store.index('timestamp');  // Assuming there's an index on 'timestamp'
      const cursorRequest = index.openCursor(null, 'next');  // Iterate over tiles in order of oldest first

      cursorRequest.onsuccess = (event: any) => {
        const cursor = event.target.result;
        if (cursor) {
          store.delete(cursor.primaryKey);  // Delete the oldest tile
          cursor.continue();  // Continue to the next tile (FIFO)
        } else {
          resolve('Eviction complete');
        }
      };

      cursorRequest.onerror = (event) => {
        reject('Error evicting tiles');
      };
    });
  }

  async getTileFromCache(url: string): Promise<Blob | null> {
    const db = await this.openIndexedDb();

    return new Promise((resolve, reject) => {
      const transaction = db.transaction('tileStore', 'readonly');
      const store = transaction.objectStore('tileStore');

      const request = store.get(url);  // Use 'url' as the key

      request.onsuccess = (event) => {
        const result = request.result;
        if (result) {
          resolve(result.blob);  // Return the tile's blob data
        } else {
          resolve(null);  // Tile not found in cache
        }
      };

      request.onerror = () => {
        reject('Error retrieving tile from cache');
      };
    });
  }

  async openIndexedDb(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open('tileDB', 1);

      request.onupgradeneeded = (event: any) => {
        const db = event.target.result;
        if (!db.objectStoreNames.contains('tileStore')) {
          const tileStore = db.createObjectStore('tileStore', { keyPath: 'url' });
          tileStore.createIndex('timestamp', 'timestamp', { unique: false });  // Create an index on 'timestamp'
        }
      };

      request.onsuccess = (event:any) => {
        resolve(event.target.result);
      };

      request.onerror = (event) => {
        reject('Error opening IndexedDB');
      };
    });
  }

  // async calculateTotalStorageSize(): Promise<number> {
  //   const db = await this.openIndexedDb();
  //   return new Promise((resolve, reject) => {
  //     const transaction = db.transaction('tileStore', 'readonly');
  //     const store = transaction.objectStore('tileStore');
  //
  //     let totalSize = 0;
  //     const cursorRequest = store.openCursor();
  //
  //     cursorRequest.onsuccess = (event: any) => {
  //       const cursor = event.target.result;
  //       if (cursor) {
  //         const tile = cursor.value;
  //         totalSize += tile.blob.size;  // Add the size of each tile's blob
  //         cursor.continue();
  //       } else {
  //         resolve(totalSize);  // Return the total size once all tiles are counted
  //       }
  //     };
  //
  //     cursorRequest.onerror = (event) => {
  //       reject('Error calculating storage size');
  //     };
  //   });
  // }


}
