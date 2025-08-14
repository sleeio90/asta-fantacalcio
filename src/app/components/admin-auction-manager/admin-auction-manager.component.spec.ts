import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AdminAuctionManagerComponent } from './admin-auction-manager.component';

describe('AdminAuctionManagerComponent', () => {
  let component: AdminAuctionManagerComponent;
  let fixture: ComponentFixture<AdminAuctionManagerComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ AdminAuctionManagerComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(AdminAuctionManagerComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
