import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';

import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { MapCompComponent } from './map-comp/map-comp.component';
import {MarkerService} from "./marker/marker.service";
import {HttpClientModule} from "@angular/common/http";
import {PopupService} from "./popup/popup.service";
import {ShapeService} from "./shape/shape.service";

@NgModule({
  declarations: [
    AppComponent,
    MapCompComponent
  ],
  imports: [
    BrowserModule,
    AppRoutingModule,
    HttpClientModule
  ],
  providers: [MarkerService,PopupService,ShapeService],
  bootstrap: [AppComponent]
})
export class AppModule { }
