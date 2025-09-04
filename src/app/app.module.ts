import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { HttpClientModule } from '@angular/common/http';

// Firebase imports
import { AngularFireModule } from '@angular/fire/compat';
import { AngularFireDatabaseModule } from '@angular/fire/compat/database';
import { AngularFireAuthModule } from '@angular/fire/compat/auth';
import { environment } from '../environments/environment';

import { AppRoutingModule } from './app-routing.module';
import { AppComponent, ConfirmDeleteDialogComponent } from './app.component';
import { HomeComponent } from './components/home/home.component';
import { LoginComponent } from './components/login/login.component';
import { CalciatoriTableComponent } from './components/calciatori-table/calciatori-table.component';
import { TeamManagerComponent } from './components/team-manager/team-manager.component';
import { AuctionCreatorComponent } from './components/auction-creator/auction-creator.component';
import { AuctionJoinerComponent } from './components/auction-joiner/auction-joiner.component';
import { AdminAuctionManagerComponent } from './components/admin-auction-manager/admin-auction-manager.component';
import { AuctionTableComponent } from './components/auction-table/auction-table.component';
import { TeamDetailComponent } from './components/team-detail/team-detail.component';
import { PlayerAuctionDetailComponent } from './components/player-auction-detail/player-auction-detail.component';
import { EmailVerificationComponent } from './components/email-verification/email-verification.component';
import { PlayerActionDialogComponent } from './components/player-action-dialog/player-action-dialog.component';

// Material Modules
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatDialogModule } from '@angular/material/dialog';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatListModule } from '@angular/material/list';
import { MatMenuModule } from '@angular/material/menu';
import { MatPaginatorModule } from '@angular/material/paginator';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSelectModule } from '@angular/material/select';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { MatSortModule } from '@angular/material/sort';
import { MatTableModule } from '@angular/material/table';
import { MatTabsModule } from '@angular/material/tabs';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { MatChipsModule } from '@angular/material/chips';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatDividerModule } from '@angular/material/divider';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { ClipboardModule } from '@angular/cdk/clipboard';

@NgModule({
  declarations: [
    AppComponent,
    ConfirmDeleteDialogComponent,
    HomeComponent,
    LoginComponent,
    CalciatoriTableComponent,
    TeamManagerComponent,
    AuctionCreatorComponent,
    AuctionJoinerComponent,
    AdminAuctionManagerComponent,
    AuctionTableComponent,
    TeamDetailComponent,
    PlayerAuctionDetailComponent,
    EmailVerificationComponent,
    PlayerActionDialogComponent
  ],
  imports: [
    BrowserModule,
    AppRoutingModule,
    FormsModule,
    ReactiveFormsModule,
    BrowserAnimationsModule,
    HttpClientModule,
    AngularFireModule.initializeApp(environment.firebase),
    AngularFireDatabaseModule,
    AngularFireAuthModule,
    MatButtonModule,
    MatCardModule,
    MatDialogModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatListModule,
    MatMenuModule,
    MatPaginatorModule,
    MatProgressSpinnerModule,
    MatSelectModule,
    MatSnackBarModule,
    MatSortModule,
    MatTableModule,
    MatTabsModule,
    MatToolbarModule,
    MatTooltipModule,
    MatAutocompleteModule,
    MatExpansionModule,
    MatChipsModule,
    MatProgressBarModule,
    MatDividerModule,
    MatButtonToggleModule,
    ClipboardModule
  ],
  providers: [],
  bootstrap: [AppComponent]
})
export class AppModule { }
