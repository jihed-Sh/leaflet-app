import {Component, OnInit} from '@angular/core';
import * as L from 'leaflet';
import "leaflet.offline"
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

    // 1. Esri Premium Basemap Layer
    const premiumEsriUrl = `https://services.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}?token=${this.accessToken}`;
    const premiumEsriLayer = L.tileLayer(premiumEsriUrl, {
      attribution: 'Tiles © Esri',
      maxZoom: 19,
      minZoom: 13,
      crossOrigin: true
    });

    // 2. Define Dark Gray layer for offline caching
    const darkGrayArcGIS = 'https://services.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}';
    const offlineDarkLayer = tileLayerOffline(darkGrayArcGIS, {
      attribution: '© OpenStreetMap contributors, Esri',
      subdomains: 'abc',
      minZoom: 13,
      maxZoom: 19,
      crossOrigin: true
    });

    const darkLayerSaveControl = savetiles(offlineDarkLayer, {
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

    // Add the dark gray layer initially
    offlineDarkLayer.addTo(this.map);
    darkLayerSaveControl.addTo(this.map);

    // Layer control for switching
    const baseLayers = {
      'ArcGIS Dark Gray': offlineDarkLayer,
      'Esri Premium Imagery': premiumEsriLayer
    };

    // @ts-ignore
    L.control.layers(baseLayers, null, { collapsed: false }).addTo(this.map);
    //handle loading the tile event for esri layer
    premiumEsriLayer.on('tileloadstart', async (event: any) => {

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
  }



// 4. Save tile to IndexedDB
  async cacheEsriTile(tileUrl: string, blob: Blob) {
    try {
      // Open the IndexedDB and store the tile
      const db = await this.openIndexedDb();
      const transaction = db.transaction('tileStore', 'readwrite');
      const store = transaction.objectStore('tileStore');

      const tileData = {
        url: tileUrl,
        blob: blob,
        timestamp: Date.now()
      };

      const request = store.put(tileData);  // Use 'put' to add or update the tile

      request.onsuccess = () => {
        console.log('Tile cached:', tileUrl);
      };

      request.onerror = () => {
        console.error('Error caching tile:', tileUrl);
      };

    } catch (error) {
      console.error('Error caching tile:', error);
    }
  }


// 5. Retrieve tile from IndexedDB
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



// 6. Initialize IndexedDB
  async openIndexedDb(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open('tileDB', 1);

      request.onupgradeneeded = (event: any) => {
        const db = event.target.result;
        if (!db.objectStoreNames.contains('tileStore')) {
          // Create object store with 'url' as the key
          db.createObjectStore('tileStore', { keyPath: 'url' });
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

}
