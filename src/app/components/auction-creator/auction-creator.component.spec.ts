import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AuctionCreatorComponent } from './auction-creator.component';

describe('AuctionCreatorComponent', () => {
  let component: AuctionCreatorComponent;
  let fixture: ComponentFixture<AuctionCreatorComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ AuctionCreatorComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(AuctionCreatorComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
