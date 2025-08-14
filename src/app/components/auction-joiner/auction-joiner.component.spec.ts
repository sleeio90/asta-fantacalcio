import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AuctionJoinerComponent } from './auction-joiner.component';

describe('AuctionJoinerComponent', () => {
  let component: AuctionJoinerComponent;
  let fixture: ComponentFixture<AuctionJoinerComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ AuctionJoinerComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(AuctionJoinerComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
