import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PlayerAuctionDetailComponent } from './player-auction-detail.component';

describe('PlayerAuctionDetailComponent', () => {
  let component: PlayerAuctionDetailComponent;
  let fixture: ComponentFixture<PlayerAuctionDetailComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ PlayerAuctionDetailComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(PlayerAuctionDetailComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
